//! Bounded, independent work units. The caller's completion callback runs on
//! the coordinating thread while workers may finish out of order.
use std::sync::mpsc;

/// Spawn no more than \`limit\` workers at once. A batch ends only after each
/// result was delivered; the following batch then starts. Never coalesce errors.
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
    Start: FnMut(&T, usize),
    Complete: FnMut(&R, usize, usize),
{
    let total = tasks.len();
    let mut pending = tasks.into_iter();
    let mut results = Vec::with_capacity(total);
    let batch_limit = limit.max(1);
    loop {
        let batch: Vec<T> = pending.by_ref().take(batch_limit).collect();
        if batch.is_empty() {
            break;
        }
        std::thread::scope(|scope| {
            let (sender, receiver) = mpsc::channel();
            for task in batch {
                started(&task, total);
                let tx = sender.clone();
                let work = &work;
                scope.spawn(move || {
                    let _ = tx.send(work(task));
                });
            }
            drop(sender);
            for result in receiver {
                let count = results.len() + 1;
                completed(&result, count, total);
                results.push(result);
            }
        });
    }
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
            |_, total| {
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
            |_, _| panic!("no task should start"),
            |_, _, _| panic!("no task should complete"),
        );
        assert!(no_results.is_empty());

        let mut done = 0;
        let values = bounded_map(
            vec![1, 2, 3],
            0,
            |v| v,
            |_, _| {},
            |_, completed, _| done = completed,
        );
        assert_eq!(values, vec![1, 2, 3]);
        assert_eq!(done, 3);
    }
}
