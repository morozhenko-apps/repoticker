use repoticker_core::git::{github_origin_url, github_remote_to_browser_url};
use std::{
    fs,
    path::PathBuf,
    process::Command,
    sync::atomic::{AtomicU64, Ordering},
};
static NEXT_ID: AtomicU64 = AtomicU64::new(0);

struct Checkout(PathBuf);
impl Checkout {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "repoticker-gh-link-{}-{}",
            std::process::id(),
            NEXT_ID.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&root).unwrap();
        let output = Command::new("git")
            .arg("-C")
            .arg(&root)
            .args(["init", "-b", "dev"])
            .output()
            .unwrap();
        assert!(output.status.success(), "{:?}", output);
        Self(root)
    }
    fn remote(&self, url: &str) {
        let mut args = vec!["remote", "add", "origin", url];
        let output = Command::new("git")
            .arg("-C")
            .arg(&self.0)
            .args(&args)
            .output()
            .unwrap();
        if !output.status.success() {
            args[1] = "set-url";
            let output = Command::new("git")
                .arg("-C")
                .arg(&self.0)
                .args(&args)
                .output()
                .unwrap();
            assert!(output.status.success());
        }
    }
}
impl Drop for Checkout {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn canonicalizes_supported_https_scp_and_ssh_github_remotes() {
    for origin in [
        "https://github.com/morozhenko-apps/repoticker.git",
        "git@github.com:morozhenko-apps/repoticker.git",
        "ssh://git@github.com/morozhenko-apps/repoticker",
    ] {
        assert_eq!(
            github_remote_to_browser_url(origin).as_deref(),
            Some("https://github.com/morozhenko-apps/repoticker")
        );
    }
}

#[test]
fn rejects_untrusted_hosts_credentials_extra_paths_and_url_tricks() {
    for origin in [
        "https://github.com.evil.example/a/b",
        "https://attacker@github.com/a/b",
        "https://github.com/a/b?x=1",
        "https://github.com/a/b#evil",
        "https://github.com/a/b/other",
        "https://github.com/a/../b",
        "https://github.com/a/%2F",
        "https://github.com/a/.git",
        "git@github.com.evil.example:a/b",
        "ssh://root@github.com/a/b",
        "file:///tmp/repo",
        "javascript:alert(1)",
        "https://github.com/a",
        "",
    ] {
        assert_eq!(github_remote_to_browser_url(origin), None, "{origin}");
    }
}

#[test]
fn resolves_real_local_git_origin_without_network_or_worktree_changes() {
    let checkout = Checkout::new();
    assert!(github_origin_url(&checkout.0).is_err());
    checkout.remote("git@github.com:org/repo.git");
    assert_eq!(
        github_origin_url(&checkout.0).unwrap(),
        "https://github.com/org/repo"
    );
    checkout.remote("https://gitlab.com/org/repo.git");
    assert!(github_origin_url(&checkout.0).is_err());
}
