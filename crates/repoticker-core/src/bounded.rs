//! Bounded, independent work units. The caller's completion callback runs on
//! the coordinating thread while workers may finish out of order.
use std::sync::mpsc;

/// Maintain up to `limit` active workers, replacing each completed task
/// immediately. Both callbacks execute on the coordinating thread.
pub fn bounded_map<T, R, Work, Start, Complete>(
    tasks: Vec<T>,
    limit: usize,
    work: Work,
    mut started: Start,
    mut completed: Complete,
) -> Vec<R>
where
    T: Send,
    R: Send,
    Work: Fn(T) -> R + Sync,
    Start: FnMut(&T, usize, usize),
    Complete: FnMut(&R, usize, usize),
{
    let total = tasks.len();
    let mut pending = tasks.into_iter();
    let mut results = Vec::with_capacity(total);
    let parallelism = limit.max(1).min(total);
    std::thread::scope(|scope| {
        let (sender, receiver) = mpsc::channel();
        let work = &work;
        // The producer keeps a sender until all tasks have been submitted.
        // Every worker also reports caught panics so a missing result
        // cannot leave the coordinator blocked on that sender.
        let mut start_next = |done: usize| -> bool {
            let Some(task) = pending.next() else {
                return false;
            };
            started(&task, done, total);
            let tx = sender.clone();
            scope.spawn(move || {
                let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| work(task)));
                let _ = tx.send(outcome);
            });
            true
        };
        let mut running = 0;
        for _ in 0..parallelism {
            if start_next(0) {
                running += 1;
            }
        }
        while running > 0 {
            let outcome = receiver
                .recv()
                .expect("A scheduled worker must report a result or panic");
            running -= 1;
            let value = match outcome {
                Ok(value) => value,
                Err(panic) => std::panic::resume_unwind(panic),
            };
            let done = results.len() + 1;
            completed(&value, done, total);
            results.push(value);
            if start_next(done) {
                running += 1;
            }
        }
    });
    results
}

#[cfg(test)]
mod tests {
    use super::bounded_map;
    use std::{
        sync::atomic::{AtomicUsize, Ordering},
        sync::Arc,
        thread,
        time::Duration,
    };

    #[test]
    fn limits_parallelism_and_completes_every_task() {
        let active = Arc::new(AtomicUsize::new(0));
        let max_active = Arc::new(AtomicUsize::new(0));
        let mut started = 0;
        let mut finished = Vec::new();
        let results = bounded_map(
            (0..12).collect(),
            4,
            |i| {
                let n = active.fetch_add(1, Ordering::SeqCst) + 1;
                max_active.fetch_max(n, Ordering::SeqCst);
                thread::sleep(Duration::from_millis(5));
                active.fetch_sub(1, Ordering::SeqCst);
                i * 2
            },
            |_, _, total| {
                started += 1;
                assert_eq!(total, 12);
            },
            |_, done, total| {
                finished.push(done);
                assert_eq!(total, 12);
            },
        );
        assert_eq!(started, 12);
        assert_eq!(finished, (1..=12).collect::<Vec<_>>());
        assert_eq!(results.len(), 12);
        assert!(max_active.load(Ordering::SeqCst) <= 4);
        assert_eq!(active.load(Ordering::SeqCst), 0);
        let mut ordered = results;
        ordered.sort();
        assert_eq!(ordered, (0..12).map(|i| i * 2).collect::<Vec<_>>());
    }

    #[test]
    fn empty_tasks_and_zero_limit_are_safe() {
        let no_results: Vec<i32> = bounded_map(
            Vec::new(),
            4,
            |value| value,
            |_, _, _| panic!("no task should start"),
            |_, _, _| panic!("no task should complete"),
        );
        assert!(no_results.is_empty());

        let mut done = 0;
        let values = bounded_map(
            vec![1, 2, 3],
            0,
            |v| v,
            |_, _, _| {},
            |_, completed, _| done = completed,
        );
        assert_eq!(values, vec![1, 2, 3]);
        assert_eq!(done, 3);
    }
    #[test]
    fn blocked_worker_does_not_hold_available_slots_idle() {
        use std::sync::{mpsc, Condvar, Mutex};
        let gate = Arc::new((Mutex::new(false), Condvar::new()));
        let worker_gate = Arc::clone(&gate);
        let (tx, rx) = mpsc::channel();
        let coordinator = thread::spawn(move || {
            bounded_map(
                (0..6).collect(),
                4,
                move |value| {
                    tx.send(value).expect("start receiver");
                    if value == 0 {
                        let (lock, release) = &*worker_gate;
                        let guard = lock.lock().unwrap();
                        drop(release.wait_while(guard, |ready| !*ready).unwrap());
                    }
                    value
                },
                |_, _, _| {},
                |_, _, _| {},
            )
        });

        let mut started = Vec::new();
        while started.len() < 6 {
            match rx.recv_timeout(Duration::from_secs(10)) {
                Ok(value) => started.push(value),
                Err(_) => break,
            }
        }
        // Always release the blocking worker before asserting; otherwise
        // a regression in rolling admission would strand the test.
        let (lock, release) = &*gate;
        *lock.lock().unwrap() = true;
        release.notify_all();
        let mut results = coordinator.join().expect("coordinator");
        started.sort_unstable();
        results.sort_unstable();
        assert_eq!(
            started,
            (0..6).collect::<Vec<_>>(),
            "Later tasks must start before the blocked first task exits"
        );
        assert_eq!(results, (0..6).collect::<Vec<_>>());
    }

    #[test]
    fn callbacks_remain_on_the_coordinator_with_monotonic_counts() {
        use std::cell::Cell;
        let caller = thread::current().id();
        let done = Cell::new(0usize);
        let mut starts = 0;
        let mut result = bounded_map(
            (0..9).collect(),
            3,
            |value| value,
            |_, already_done, total| {
                assert_eq!(thread::current().id(), caller);
                assert_eq!(total, 9);
                assert_eq!(already_done, done.get());
                starts += 1;
            },
            |_, completed, total| {
                assert_eq!(thread::current().id(), caller);
                assert_eq!(total, 9);
                assert_eq!(completed, done.get() + 1);
                done.set(completed);
            },
        );
        assert_eq!(starts, 9);
        assert_eq!(done.get(), 9);
        result.sort_unstable();
        assert_eq!(result, (0..9).collect::<Vec<_>>());
    }

    #[test]
    fn a_worker_panic_propagates_without_orphaned_workers() {
        let outcome = std::panic::catch_unwind(|| {
            bounded_map(
                vec![0, 1, 2],
                2,
                |value| {
                    if value == 1 {
                        panic!("expected test failure");
                    }
                    value
                },
                |_, _, _| {},
                |_, _, _| {},
            )
        });
        assert!(outcome.is_err());
    }
}
