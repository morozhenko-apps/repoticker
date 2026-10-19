/** Stable KDE Layer Shell drag correction in WebView-local coordinates.
 * Every move is a current anchor correction, not an accumulated screen delta.
 */
export function dragCorrection(originX, originY, currentX, currentY) {
  const bound = value => Math.max(-150, Math.min(150, Math.round(value)));
  return { dx: bound(currentX - originX), dy: bound(currentY - originY) };
}

export function createCardDragController({
  apply, persist, onError, scheduleFrame, cancelFrame
}) {
  let session = null;
  let pendingFrame = null;
  let inFlight = false;
  let dirty = false;
  let persistAfterFlight = false;

  function persistIfDirty() {
    if (!dirty) return;
    dirty = false;
    void Promise.resolve().then(persist).catch(onError);
  }

  function end() {
    if (pendingFrame !== null) {
      cancelFrame(pendingFrame);
      pendingFrame = null;
    }
    if (!session) return;
    session = null;
    if (inFlight) persistAfterFlight = true;
    else persistIfDirty();
  }

  async function flush() {
    const current = session;
    if (!current?.active || inFlight) return;
    const { dx, dy } = dragCorrection(
      current.originX, current.originY, current.x, current.y
    );
    if (!dx && !dy) return;
    inFlight = true;
    try {
      await apply(dx, dy);
      dirty = true;
    } catch (error) {
      onError(error);
      end();
    } finally {
      inFlight = false;
      if (persistAfterFlight) {
        persistAfterFlight = false;
        persistIfDirty();
      }
      // Intentionally do NOT replay current.x/y here: it was sampled before
      // the compositor moved the WebView, so it is now stale. A new pointer
      // event is the only authority for the next correction.
    }
  }

  function schedule() {
    if (!session?.active || inFlight || pendingFrame !== null) return;
    pendingFrame = scheduleFrame(() => {
      pendingFrame = null;
      void flush();
    });
  }

  return {
    begin(id, x, y) {
      if (session || inFlight) return false;
      session = { id, active: false, originX: x, originY: y, x, y };
      dirty = false;
      persistAfterFlight = false;
      return true;
    },
    activate(id) {
      if (session?.id !== id) return;
      session.active = true;
      schedule();
    },
    move(id, x, y) {
      if (session?.id !== id) return;
      session.x = x;
      session.y = y;
      schedule();
    },
    end
  };
}
