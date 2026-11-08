//! Operator relay secret custody. Secret values never cross WebView IPC or events.
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Manager};

const SERVICE: &str = "com.morozhenko.repoticker.relay";
const ACCOUNT: &str = "personal-hybrid-client-v1";

#[derive(Default)]
pub struct RelayPromptGate(AtomicBool);

// A Settings-only native draft. No secret is serialized or exposed to WebView.
// Replacing or dropping a draft zeroizes any owned credential buffer.
#[derive(Default)]
pub struct RelaySecretDraftState(Mutex<Option<RelaySecretDraft>>);

enum RelaySecretDraft {
    Set(SensitiveSecret),
    Remove,
}

fn lock_draft(
    state: &RelaySecretDraftState,
) -> std::sync::MutexGuard<'_, Option<RelaySecretDraft>> {
    state.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

pub(crate) fn discard_draft(app: &AppHandle) {
    let state = app.state::<RelaySecretDraftState>();
    let _discarded = lock_draft(&state).take();
}

pub(crate) fn has_pending_draft(app: &AppHandle) -> bool {
    let state = app.state::<RelaySecretDraftState>();
    let draft = lock_draft(&state);
    draft.is_some()
}

struct PromptLease(Arc<RelayPromptGate>);
impl Drop for PromptLease {
    fn drop(&mut self) {
        self.0 .0.store(false, Ordering::Release);
    }
}

fn enter_prompt(app: &AppHandle) -> Result<PromptLease, String> {
    let gate = Arc::clone(&app.state::<Arc<RelayPromptGate>>());
    gate.0
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .map_err(|_| "Relay secret dialog is already open.".to_owned())?;
    Ok(PromptLease(gate))
}

fn valid_secret(value: &str) -> bool {
    (32..=256).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, ACCOUNT)
        .map_err(|_| "System credential store unavailable.".to_owned())
}

pub(crate) fn read_secret() -> Result<Option<SensitiveSecret>, String> {
    match entry()?.get_password() {
        Ok(secret) => {
            let secret = SensitiveSecret(secret);
            if valid_secret(&secret.0) {
                Ok(Some(secret))
            } else {
                Err("Stored relay credential is invalid.".into())
            }
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("System credential store unavailable.".into()),
    }
}

/// Wipe the application's owned ASCII buffer after the keyring write.
/// The OS credential backend manages its separate copy.
pub(crate) fn wipe(value: &mut String) {
    // SAFETY: valid_secret restricts input to ASCII. All replacements are ASCII
    // zero bytes and cannot violate String's UTF-8 invariant.
    unsafe {
        for byte in value.as_mut_vec() {
            std::ptr::write_volatile(byte, 0);
        }
    }
    std::sync::atomic::compiler_fence(Ordering::SeqCst);
}

/// Memory custody for both valid and rejected credentials, including early
/// returns or unwinding from an OS wallet backend.
pub(crate) struct SensitiveSecret(String);

impl SensitiveSecret {
    pub(crate) fn as_str(&self) -> &str {
        &self.0
    }
}

impl Drop for SensitiveSecret {
    fn drop(&mut self) {
        wipe(&mut self.0);
    }
}

fn store_secret(secret: &SensitiveSecret) -> Result<(), String> {
    if !valid_secret(secret.as_str()) {
        return Err("Relay secret must be 32-256 base64url characters.".into());
    }
    entry()?
        .set_password(secret.as_str())
        .map_err(|_| "System credential store unavailable.".to_owned())
}

fn remove_secret() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("System credential store unavailable.".to_owned()),
    }
}

fn settings_only(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "settings" {
        return Err("Relay credentials can only be managed in Settings.".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn relay_secret_status(window: tauri::WebviewWindow) -> Result<bool, String> {
    settings_only(&window)?;
    if let Some(value) = {
        let app = window.app_handle();
        let state = app.state::<RelaySecretDraftState>();
        let draft = lock_draft(&state);
        draft.as_ref().map(|change| matches!(change, RelaySecretDraft::Set(_)))
    } {
        return Ok(value);
    }
    tauri::async_runtime::spawn_blocking(|| {
        let credential = read_secret()?;
        Ok(credential.is_some())
    })
    .await
    .map_err(|_| "System credential store unavailable.".to_owned())?
}

/// This command deliberately accepts no WebView-supplied secret argument.
/// A completed native dialog only stages a volatile secret; OK commits it.
#[tauri::command]
pub async fn relay_prompt_secret(
    app: AppHandle,
    window: tauri::WebviewWindow,
) -> Result<bool, String> {
    settings_only(&window)?;
    let _lease = enter_prompt(&app)?;
    let secret = prompt_native(&app).await?;
    let Some(secret) = secret else {
        return Ok(false);
    };
    let candidate = SensitiveSecret(secret);
    if !valid_secret(candidate.as_str()) {
        return Err("Relay secret must be 32-256 base64url characters.".into());
    }
    // A late OS prompt must not stage a candidate after Settings was closed.
    if !window.is_visible().unwrap_or(false) {
        return Err("Settings window is no longer open.".into());
    }
    let state = app.state::<RelaySecretDraftState>();
    *lock_draft(&state) = Some(RelaySecretDraft::Set(candidate));
    Ok(true)
}

/// Disconnect is a reversible Settings change until the owner presses OK.
#[tauri::command]
pub async fn relay_clear_secret(
    app: AppHandle,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    settings_only(&window)?;
    let _lease = enter_prompt(&app)?;
    let state = app.state::<RelaySecretDraftState>();
    *lock_draft(&state) = Some(RelaySecretDraft::Remove);
    Ok(())
}

/// Apply the native draft only after nonsecret Settings validation/save succeeds.
/// On Keyring failure, keep the in-memory candidate for another explicit OK.
#[tauri::command]
pub async fn relay_commit_secret_draft(
    app: AppHandle,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
    settings_only(&window)?;
    let _lease = enter_prompt(&app)?;
    if !window.is_visible().unwrap_or(false) {
        return Err("Settings window is no longer open.".into());
    }
    let change = {
        let state = app.state::<RelaySecretDraftState>();
        lock_draft(&state).take()
    };
    let Some(change) = change else { return Ok(()); };
    let (outcome, candidate) = tauri::async_runtime::spawn_blocking(move || {
        let result = match &change {
            RelaySecretDraft::Set(secret) => store_secret(secret),
            RelaySecretDraft::Remove => remove_secret(),
        };
        (result, change)
    })
    .await
    .map_err(|_| "System credential store unavailable.".to_owned())?;
    if let Err(error) = outcome {
        let state = app.state::<RelaySecretDraftState>();
        *lock_draft(&state) = Some(candidate);
        return Err(error);
    }
    // Dropping the candidate wipes plaintext. A successful Keyring operation
    // is the only reason the native transport is restarted.
    drop(candidate);
    crate::relay_transport::restart(&app);
    Ok(())
}

#[cfg(target_os = "linux")]
async fn prompt_native(app: &AppHandle) -> Result<Option<String>, String> {
    use gtk::prelude::*;

    let (sender, receiver) = tokio::sync::oneshot::channel();
    let app_for_dialog = app.clone();
    app.run_on_main_thread(move || {
        // GTK windows must only be accessed from the main thread. Make the
        // system prompt transient to Settings so Wayland keeps its modal
        // focus and stacking owned by the correct application window.
        let parent = app_for_dialog
            .get_webview_window("settings")
            .and_then(|window| window.gtk_window().ok());
        let dialog = gtk::Dialog::with_buttons(
            Some("RepoTicker relay secret"),
            parent.as_ref(),
            gtk::DialogFlags::MODAL,
            &[
                ("Cancel", gtk::ResponseType::Cancel),
                ("Save secret", gtk::ResponseType::Accept),
            ],
        );
        dialog.set_modal(true);
        dialog.set_resizable(false);
        dialog.set_default_response(gtk::ResponseType::Accept);
        let entry = gtk::Entry::new();
        entry.set_visibility(false);
        entry.set_input_purpose(gtk::InputPurpose::Password);
        entry.set_max_length(256);
        entry.set_activates_default(true);
        entry.set_placeholder_text(Some("Personal relay client secret"));
        dialog.content_area().add(&entry);
        dialog.show_all();
        let selected = if dialog.run() == gtk::ResponseType::Accept {
            Some(entry.text().to_string())
        } else {
            None
        };
        entry.set_text("");
        dialog.close();
        let _ = sender.send(selected);
    })
    .map_err(|_| "Native secret dialog unavailable.".to_owned())?;
    receiver
        .await
        .map_err(|_| "Native secret dialog unavailable.".to_owned())
}

#[cfg(target_os = "windows")]
async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(win32::prompt)
        .await
        .map_err(|_| "Native secret dialog unavailable.".to_owned())?
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
async fn prompt_native(_app: &AppHandle) -> Result<Option<String>, String> {
    Err("Native relay dialog is not supported on this platform.".into())
}

#[cfg(target_os = "windows")]
mod win32 {
    use std::{ffi::c_void, mem::size_of};

    #[repr(C)]
    struct CredUiInfo {
        size: u32,
        parent: isize,
        message: *const u16,
        caption: *const u16,
        banner: isize,
    }

    #[link(name = "Credui")]
    unsafe extern "system" {
        fn CredUIPromptForCredentialsW(
            info: *const CredUiInfo,
            target_name: *const u16,
            reserved: *const c_void,
            auth_error: u32,
            user_name: *mut u16,
            user_capacity: u32,
            password: *mut u16,
            password_capacity: u32,
            save: *mut i32,
            flags: u32,
        ) -> u32;
    }

    const CREDUI_FLAGS_DO_NOT_PERSIST: u32 = 0x0000_0002;
    const CREDUI_FLAGS_ALWAYS_SHOW_UI: u32 = 0x0000_0080;
    const CREDUI_FLAGS_GENERIC_CREDENTIALS: u32 = 0x0004_0000;
    const CREDUI_FLAGS_PASSWORD_ONLY_OK: u32 = 0x0000_0200;
    const ERROR_CANCELLED: u32 = 1223;

    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub(super) fn prompt() -> Result<Option<String>, String> {
        let target = wide("RepoTicker Personal Relay");
        let caption = wide("RepoTicker relay secret");
        let message = wide("Paste the personal relay client secret in the Password field.");
        let info = CredUiInfo {
            size: size_of::<CredUiInfo>() as u32,
            parent: 0,
            message: message.as_ptr(),
            caption: caption.as_ptr(),
            banner: 0,
        };
        let mut username = [0_u16; 513];
        let label = wide("RepoTicker Relay");
        username[..label.len()].copy_from_slice(&label);
        let mut password = [0_u16; 257];
        let mut save = 0_i32;
        let outcome = unsafe {
            CredUIPromptForCredentialsW(
                &info,
                target.as_ptr(),
                std::ptr::null(),
                0,
                username.as_mut_ptr(),
                username.len() as u32,
                password.as_mut_ptr(),
                password.len() as u32,
                &mut save,
                CREDUI_FLAGS_DO_NOT_PERSIST
                    | CREDUI_FLAGS_ALWAYS_SHOW_UI
                    | CREDUI_FLAGS_GENERIC_CREDENTIALS
                    | CREDUI_FLAGS_PASSWORD_ONLY_OK,
            )
        };
        // Decode *before* wiping, but delay propagation of any error until
        // all native buffers have been securely cleared.
        let extracted = if outcome == 0 {
            let len = password
                .iter()
                .position(|ch| *ch == 0)
                .unwrap_or(password.len());
            Some(
                String::from_utf16(&password[..len])
                    .map_err(|_| "Native secret dialog returned invalid text.".to_owned()),
            )
        } else {
            None
        };
        for slot in &mut password {
            unsafe { std::ptr::write_volatile(slot, 0) };
        }
        for slot in &mut username {
            unsafe { std::ptr::write_volatile(slot, 0) };
        }
        std::sync::atomic::compiler_fence(std::sync::atomic::Ordering::SeqCst);
        match outcome {
            0 => extracted.transpose(),
            ERROR_CANCELLED => Ok(None),
            _ => Err("Native secret dialog unavailable.".into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relay_credential_isolated_from_github_auth_record() {
        assert_ne!(SERVICE, "com.morozhenko.repoticker.github");
        assert_ne!(ACCOUNT, "github-app-user-token-v1");
    }

    #[test]
    fn strict_base64url_secret_policy_does_not_accept_untrusted_bytes() {
        for invalid in [
            "",
            "a",
            "passphrase with spaces",
            "https://relay.example/token",
            "a/b",
            "abcd=1234",
            "☃",
        ] {
            assert!(!valid_secret(invalid));
        }
        assert!(!valid_secret(&"a".repeat(31)));
        assert!(valid_secret(&"A".repeat(32)));
        assert!(valid_secret(&"z".repeat(256)));
        assert!(!valid_secret(&"x".repeat(257)));
    }

    #[test]
    fn replacing_draft_wipes_candidate_without_keyring_write() {
        let state = RelaySecretDraftState::default();
        *lock_draft(&state) = Some(RelaySecretDraft::Set(
            SensitiveSecret("A".repeat(32))
        ));
        assert!(matches!(lock_draft(&state).as_ref(), Some(RelaySecretDraft::Set(_))));
        *lock_draft(&state) = Some(RelaySecretDraft::Remove);
        assert!(matches!(lock_draft(&state).as_ref(), Some(RelaySecretDraft::Remove)));
        assert!(lock_draft(&state).take().is_some());
        assert!(lock_draft(&state).is_none());
    }

    #[test]
    fn wipes_owned_secret_buffer() {
        let mut secret = "relAy0123456789_-".to_owned();
        let len = secret.len();
        wipe(&mut secret);
        assert_eq!(secret.as_bytes(), vec![0; len]);
    }
}
