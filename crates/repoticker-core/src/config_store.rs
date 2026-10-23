//! Atomic, schema-agnostic persistence for the non-secret desktop JSON
//! preferences. The caller owns the schema, defaults and synchronization.

use serde::{de::DeserializeOwned, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

static NEXT_STAGING_ID: AtomicU64 = AtomicU64::new(0);

fn backup_path(path: &Path) -> PathBuf {
    path.with_file_name(format!(
        "{}.bak",
        path.file_name().unwrap_or_default().to_string_lossy()
    ))
}

fn sibling_name(path: &Path, suffix: &str) -> PathBuf {
    path.with_file_name(format!(
        "{}.{suffix}.{}.{}",
        path.file_name().unwrap_or_default().to_string_lossy(),
        std::process::id(),
        NEXT_STAGING_ID.fetch_add(1, Ordering::Relaxed)
    ))
}

fn create_private(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(path)
}

struct StagingFile(PathBuf);

impl Drop for StagingFile {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

fn sync_directory(parent: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        File::open(parent)?.sync_all()?;
    }
    #[cfg(not(unix))]
    {
        let _ = parent;
    }
    Ok(())
}

fn atomic_replace(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let parent = path.parent().ok_or_else(|| io::Error::other("Missing config parent"))?;
    fs::create_dir_all(parent)?;
    let (temporary, mut file) = loop {
        let name = sibling_name(path, "tmp");
        match create_private(&name) {
            Ok(file) => break (StagingFile(name), file),
            Err(err) if err.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(err) => return Err(err),
        }
    };
    file.write_all(bytes)?;
    file.sync_all()?;
    drop(file);
    fs::rename(&temporary.0, path)?;
    sync_directory(parent)
}

fn load(path: &Path) -> Result<Option<Vec<u8>>, String> {
    match fs::read(path) {
        Ok(raw) => Ok(Some(raw)),
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(format!("Cannot read {}: {err}", path.display())),
    }
}

fn quarantine_corrupt(path: &Path, raw: &[u8]) -> Result<(), String> {
    loop {
        let name = sibling_name(path, "corrupt");
        let mut file = match create_private(&name) {
            Ok(file) => file,
            Err(err) if err.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(err) => return Err(format!("Cannot preserve corrupt config: {err}")),
        };
        let guard = StagingFile(name);
        file.write_all(raw)
            .and_then(|_| file.sync_all())
            .map_err(|err| format!("Cannot preserve corrupt config: {err}"))?;
        drop(file);
        // The copy survives a failed repair for independent diagnosis.
        std::mem::forget(guard);
        return Ok(());
    }
}

/// A valid primary is authoritative. A valid backup repairs an absent or
/// invalid primary; invalid user bytes are quarantined before replacement.
/// A damaged file never silently turns into an empty default configuration.
pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {
    let primary = load(path)?;
    if let Some(raw) = &primary {
        if let Ok(value) = serde_json::from_slice::<T>(raw) {
            return Ok(Some(value));
        }
    }
    let backup = backup_path(path);
    let previous = load(&backup)?;
    let Some(bytes) = previous else {
        if primary.is_some() {
            return Err(format!(
                "Config {} is invalid and no recovery backup exists",
                path.display()
            ));
        }
        return Ok(None);
    };
    let recovered = serde_json::from_slice::<T>(&bytes).map_err(|err| {
        format!(
            "Config {} cannot be recovered: backup {} is invalid ({err})",
            path.display(),
            backup.display()
        )
    })?;
    if let Some(corrupt) = &primary {
        quarantine_corrupt(path, corrupt)?;
    }
    atomic_replace(path, &bytes)
        .map_err(|err| format!("Cannot restore {} from backup: {err}", path.display()))?;
    Ok(Some(recovered))
}

/// Atomically replace a verified config. Its last valid primary is written
/// to .bak before the new value becomes visible. A backup is not rotated on
/// recovery and cannot be replaced by invalid primary JSON.
pub fn save_json<T: Serialize + DeserializeOwned>(
    path: &Path,
    value: &T,
) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|err| format!("Cannot serialize config: {err}"))?;
    let _ = read_json::<T>(path)?;
    if let Some(previous) = load(path)? {
        atomic_replace(&backup_path(path), &previous)
            .map_err(|err| format!("Cannot update config backup: {err}"))?;
    }
    atomic_replace(path, &bytes)
        .map_err(|err| format!("Cannot save config {}: {err}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_ID: AtomicU64 = AtomicU64::new(0);

    #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
    struct Preferences {
        roots: Vec<String>,
        #[serde(default = "default_language")]
        language: String,
    }

    fn default_language() -> String {
        "en".into()
    }

    struct Fixture {
        dir: PathBuf,
        path: PathBuf,
    }

    impl Fixture {
        fn new() -> Self {
            let dir = std::env::temp_dir().join(format!(
                "repoticker-config-test-{}-{}",
                std::process::id(),
                TEST_ID.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&dir).expect("fresh fixture");
            let path = dir.join("config.json");
            Self { dir, path }
        }

        fn pref(language: &str) -> Preferences {
            Preferences { roots: vec!["/repo".into()], language: language.into() }
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.dir);
        }
    }

    #[test]
    fn missing_config_and_backup_return_none_for_caller_defaults() {
        let f = Fixture::new();
        assert_eq!(read_json::<Preferences>(&f.path).unwrap(), None);
    }

    #[test]
    fn atomic_save_preserves_previous_valid_snapshot() {
        let f = Fixture::new();
        save_json(&f.path, &Fixture::pref("en")).unwrap();
        assert!(!backup_path(&f.path).exists());
        save_json(&f.path, &Fixture::pref("ru")).unwrap();
        assert_eq!(read_json::<Preferences>(&f.path).unwrap(), Some(Fixture::pref("ru")));
        assert_eq!(
            serde_json::from_slice::<Preferences>(&fs::read(backup_path(&f.path)).unwrap()).unwrap(),
            Fixture::pref("en")
        );
    }

    #[test]
    fn invalid_primary_recovers_prior_config_and_quarantines_original_bytes() {
        let f = Fixture::new();
        save_json(&f.path, &Fixture::pref("en")).unwrap();
        save_json(&f.path, &Fixture::pref("ru")).unwrap();
        let damage = b"{invalid broken config";
        fs::write(&f.path, damage).unwrap();
        assert_eq!(read_json::<Preferences>(&f.path).unwrap(), Some(Fixture::pref("en")));
        assert_eq!(read_json::<Preferences>(&f.path).unwrap(), Some(Fixture::pref("en")));
        let quarantine: Vec<_> = fs::read_dir(&f.dir).unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|p| p.file_name().unwrap().to_string_lossy().starts_with("config.json.corrupt."))
            .collect();
        assert_eq!(quarantine.len(), 1);
        assert_eq!(fs::read(&quarantine[0]).unwrap(), damage);
    }

    #[test]
    fn missing_primary_recovers_from_valid_backup() {
        let f = Fixture::new();
        save_json(&f.path, &Fixture::pref("en")).unwrap();
        save_json(&f.path, &Fixture::pref("ru")).unwrap();
        fs::remove_file(&f.path).unwrap();
        assert_eq!(read_json::<Preferences>(&f.path).unwrap(), Some(Fixture::pref("en")));
        assert!(f.path.exists());
    }

    #[test]
    fn two_invalid_copies_fail_closed_without_overwriting_files() {
        let f = Fixture::new();
        fs::write(&f.path, b"{broken").unwrap();
        fs::write(backup_path(&f.path), b"{broken backup").unwrap();
        assert!(read_json::<Preferences>(&f.path).unwrap_err().contains("backup"));
        assert_eq!(fs::read(&f.path).unwrap(), b"{broken");
        assert_eq!(fs::read(backup_path(&f.path)).unwrap(), b"{broken backup");
    }

    #[test]
    fn invalid_primary_without_backup_never_resets_preferences() {
        let f = Fixture::new();
        fs::write(&f.path, b"{damaged").unwrap();
        assert!(save_json(&f.path, &Fixture::pref("ru")).is_err());
        assert_eq!(fs::read(&f.path).unwrap(), b"{damaged");
    }

    #[test]
    fn backup_write_error_leaves_original_primary_unchanged() {
        let f = Fixture::new();
        save_json(&f.path, &Fixture::pref("en")).unwrap();
        fs::create_dir(backup_path(&f.path)).unwrap();
        assert!(save_json(&f.path, &Fixture::pref("ru")).is_err());
        assert_eq!(read_json::<Preferences>(&f.path).unwrap(), Some(Fixture::pref("en")));
    }

    #[test]
    fn stale_temporary_file_does_not_override_valid_config() {
        let f = Fixture::new();
        save_json(&f.path, &Fixture::pref("en")).unwrap();
        fs::write(f.dir.join("config.json.tmp.0000"), b"stale").unwrap();
        save_json(&f.path, &Fixture::pref("ru")).unwrap();
        assert_eq!(read_json::<Preferences>(&f.path).unwrap(), Some(Fixture::pref("ru")));
    }

    #[test]
    fn old_schema_with_omitted_default_field_is_still_supported() {
        let f = Fixture::new();
        fs::write(&f.path, br#"{"roots":["/old"]}"#).unwrap();
        assert_eq!(
            read_json::<Preferences>(&f.path).unwrap(),
            Some(Preferences { roots: vec!["/old".into()], language: "en".into() })
        );
    }
}
