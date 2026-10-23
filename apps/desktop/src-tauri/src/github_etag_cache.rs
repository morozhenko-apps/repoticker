//! Conditional GitHub API responses, process-local and credential-bound.
//! Contains only projected allowlisted JSON and an ETag, never credentials.
//! A 304 can use cached JSON ONLY with the same auth/scope generation.
use std::{collections::VecDeque, sync::Mutex};
use serde_json::Value;

const MAX_ENTRIES: usize = 64;
const MAX_ITEM_BYTES: usize = 64 * 1024;
const MAX_ETAG_BYTES: usize = 128;

#[derive(Clone)]
struct CacheItem {
    path: String,
    etag: String,
    projection: Value,
}

#[derive(Default)]
struct CacheState {
    generation: u64,
    entries: VecDeque<CacheItem>,
}

#[derive(Default)]
pub struct GitHubETagCache {
    inner: Mutex<CacheState>,
}

pub struct CacheLookup {
    pub generation: u64,
    pub etag: Option<String>,
}

fn valid_etag(etag: &str) -> bool {
    let tag = etag.strip_prefix("W/").unwrap_or(etag);
    etag.len() <= MAX_ETAG_BYTES
        && tag.len() >= 2
        && tag.starts_with('"')
        && tag.ends_with('"')
        && etag.bytes().all(|ch| ch.is_ascii_graphic())
}

fn cacheable(path: &str) -> bool {
    // Billing contains sensitive, changing usage data: always fetch it live.
    !path.contains("/settings/billing/")
}

impl GitHubETagCache {
    pub fn snapshot(&self, path: &str) -> CacheLookup {
        let state = self.inner.lock().unwrap_or_else(|err| err.into_inner());
        let etag = if cacheable(path) {
            state.entries.iter().find(|entry| entry.path == path)
                .map(|entry| entry.etag.clone())
        } else {
            None
        };
        CacheLookup { generation: state.generation, etag }
    }

    pub fn unchanged(&self, generation: u64) -> bool {
        self.inner.lock().unwrap_or_else(|err| err.into_inner()).generation == generation
    }

    pub fn not_modified(&self, path: &str, lookup: &CacheLookup) -> Option<Value> {
        let state = self.inner.lock().unwrap_or_else(|err| err.into_inner());
        if state.generation != lookup.generation {
            return None;
        }
        let tag = lookup.etag.as_deref()?;
        state.entries.iter()
            .find(|entry| entry.path == path && entry.etag == tag)
            .map(|entry| entry.projection.clone())
    }

    /// Invalidates even in-flight GETs from previous auth/scope generations.
    pub fn invalidate(&self) {
        let mut state = self.inner.lock().unwrap_or_else(|err| err.into_inner());
        state.generation = state.generation.wrapping_add(1);
        state.entries.clear();
    }

    /// A successful 200 without a suitable ETag evicts the old path entry.
    /// Do not store potentially stale JSON if auth/scope changed mid-request.
    pub fn save(&self, path: &str, generation: u64, etag: Option<&str>, value: &Value) {
        let mut state = self.inner.lock().unwrap_or_else(|err| err.into_inner());
        if state.generation != generation {
            return;
        }
        state.entries.retain(|entry| entry.path != path);
        let Some(etag) = etag.filter(|etag| valid_etag(etag)) else {
            return;
        };
        if !cacheable(path) || serde_json::to_vec(value)
            .map_or(true, |bytes| bytes.len() > MAX_ITEM_BYTES)
        {
            return;
        }
        if state.entries.len() == MAX_ENTRIES {
            state.entries.pop_front();
        }
        state.entries.push_back(CacheItem {
            path: path.to_owned(),
            etag: etag.to_owned(),
            projection: value.clone(),
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn only_matching_conditional_entry_can_supply_304() {
        let cache = GitHubETagCache::default();
        let path = "/user/installations?per_page=100&page=1";
        let fresh = cache.snapshot(path);
        assert!(cache.not_modified(path, &fresh).is_none());
        cache.save(path, fresh.generation, Some("W/\"abc\""), &json!({"installations": []}));
        let saved = cache.snapshot(path);
        assert_eq!(saved.etag.as_deref(), Some("W/\"abc\""));
        assert_eq!(cache.not_modified(path, &saved), Some(json!({"installations": []})));
        assert!(cache.not_modified("/user/installations?per_page=100&page=2", &saved).is_none());
    }

    #[test]
    fn generation_change_blocks_in_flight_and_old_cached_private_data() {
        let cache = GitHubETagCache::default();
        let path = "/user/installations?per_page=100&page=1";
        let old = cache.snapshot(path);
        cache.save(path, old.generation, Some("\"private\""), &json!({"installations": [1]}));
        cache.invalidate();
        assert!(!cache.unchanged(old.generation));
        assert!(cache.not_modified(path, &old).is_none());
        cache.save(path, old.generation, Some("\"private\""), &json!({"installations": [1]}));
        assert!(cache.snapshot(path).etag.is_none());
    }

    #[test]
    fn cap_and_etag_validation_prevent_unbounded_or_malformed_cache() {
        let cache = GitHubETagCache::default();
        let generation = cache.snapshot("/user").generation;
        for index in 0..=MAX_ENTRIES {
            cache.save(&format!("/user?page={index}"), generation,
                Some("\"safe\""), &json!({"login": "user"}));
        }
        assert!(cache.snapshot("/user?page=0").etag.is_none());
        assert_eq!(cache.snapshot("/user?page=64").etag.as_deref(), Some("\"safe\""));
        cache.save("/user", generation, Some("x\nInjected: secret"), &json!({}));
        assert!(cache.snapshot("/user").etag.is_none());
        cache.save("/user", generation, Some("\"large\""),
            &json!({"payload": "x".repeat(MAX_ITEM_BYTES)}));
        assert!(cache.snapshot("/user").etag.is_none());
        cache.save("/organizations/team/settings/billing/usage/summary?year=2026&month=10",
            generation, Some("\"billing\""), &json!({"usageItems": []}));
        assert!(cache.snapshot("/organizations/team/settings/billing/usage/summary?year=2026&month=10")
            .etag.is_none());
    }
}
