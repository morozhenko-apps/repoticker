//! Cross-thread admission barrier for an explicit graceful application Quit.
//! The first caller starts shutdown; operations admitted afterwards fail
//! before initiating any Git work. No blocking waits or background polling.
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Default)]
pub struct ShutdownSignal(AtomicBool);

impl ShutdownSignal {
    /// True for the one caller that owns the shutdown sequence.
    pub fn begin(&self) -> bool {
        !self.0.swap(true, Ordering::AcqRel)
    }

    pub fn is_requested(&self) -> bool {
        self.0.load(Ordering::Acquire)
    }
}

#[cfg(test)]
mod tests {
    use super::ShutdownSignal;
    use std::sync::{mpsc, Arc, Barrier, Mutex};
    use std::thread;

    #[test]
    fn multiple_quit_requests_have_exactly_one_owner() {
        let state = Arc::new(ShutdownSignal::default());
        let barrier = Arc::new(Barrier::new(9));
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let state = Arc::clone(&state);
                let barrier = Arc::clone(&barrier);
                thread::spawn(move || {
                    barrier.wait();
                    state.begin()
                })
            })
            .collect();
        barrier.wait();
        let winners = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .filter(|won| *won)
            .count();
        assert_eq!(winners, 1);
        assert!(state.is_requested());
        assert!(!state.begin());
    }

    #[test]
    fn queued_operation_cannot_start_after_quit_is_requested() {
        let state = Arc::new(ShutdownSignal::default());
        let lock = Arc::new(Mutex::new(()));
        let running = lock.lock().unwrap();
        let (tx, rx) = mpsc::channel();
        let operation = {
            let lock = Arc::clone(&lock);
            let state = Arc::clone(&state);
            thread::spawn(move || {
                let _guard = lock.lock().unwrap();
                tx.send(!state.is_requested()).unwrap();
            })
        };
        assert!(state.begin());
        drop(running);
        assert!(!rx.recv().unwrap(), "queued operation must be rejected");
        operation.join().unwrap();
    }

    #[test]
    fn shutdown_signal_stays_set_for_fetch_registration_race() {
        let signal = ShutdownSignal::default();
        assert!(!signal.is_requested());
        assert!(signal.begin());
        assert!(signal.is_requested());
        assert!(!signal.begin());
        assert!(signal.is_requested());
    }
}
