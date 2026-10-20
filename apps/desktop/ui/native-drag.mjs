/** Serialize native start/end around the same Wayland input seat.
 * This never samples coordinates or drives motion: physical relative motion
 * is delivered directly by the compositor to the GTK event handler.
 */
export function createNativeDragGesture({ start, stop, onError }) {
  let session = null;
  let queued = Promise.resolve();

  function enqueue(action) {
    const pending = queued.then(action);
    queued = pending.catch(() => {});
    return pending;
  }

  return {
    begin(id) {
      if (session !== null) return false;
      const mine = { id };
      session = mine;
      void enqueue(start).catch(error => {
        if (session === mine) session = null;
        onError(error);
      });
      return true;
    },
    end(id = null) {
      if (session === null || (id !== null && session.id !== id)) return;
      session = null;
      // Stop is ordered AFTER start even when the pointer was released
      // before GTK acknowledged protocol activation.
      void enqueue(stop).catch(onError);
    }
  };
}
