export class MouseTracker {
  constructor(arena, onPointCount) {
    this.arena = arena;
    this.onPointCount = onPointCount;
    this.isTracking = false;
    this.currentTrial = null;
    this.points = [];
    this._moveHandler = this._moveHandler.bind(this);
    this.arena.addEventListener('pointermove', this._moveHandler, { passive: true });
  }

  beginTrial(trialIndex, trialType) {
    this.currentTrial = { trialIndex, trialType, startedAt: performance.now() };
    this.points = [];
    this.isTracking = true;
    this.onPointCount?.(0);
  }

  stopTrial() {
    this.isTracking = false;
    return [...this.points];
  }

  _moveHandler(event) {
    if (!this.isTracking) return;
    const rect = this.arena.getBoundingClientRect();
    const t = performance.now();
    const point = {
      t,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      nx: (event.clientX - rect.left) / rect.width,
      ny: (event.clientY - rect.top) / rect.height,
    };
    const last = this.points[this.points.length - 1];
    if (!last || t - last.t >= 8) {
      this.points.push(point);
      this.onPointCount?.(this.points.length);
    }
  }
}
