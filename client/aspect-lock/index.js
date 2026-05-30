// Aspect-ratio lock during resize drag.
//
// When Shift is held while dragging a resize handle, this module constrains
// the new bounds so the element's original width:height ratio is preserved.
//
// Implementation notes (verified against diagram-js source):
//
//   Resize.js line 92-102: handleMove() reads context.shape, context.direction,
//   calls resizeBounds() and assigns the result to context.newBounds.
//
//   Dragging.js lines 252-259: during 'move', payload is augmented with
//   { originalEvent: event } where `event` is the raw DOM MouseEvent.
//   This payload is merged into the eventBus event object, so
//   event.originalEvent IS the raw MouseEvent and exposes .shiftKey directly.
//
//   context.direction values: 'n','s','e','w','nw','ne','sw','se'
//   (see Resize.js getCursor(), activate()).
//
//   context.newBounds shape: { x, y, width, height } (plain object from ResizeUtil).
//
// Priority 500 < diagram-js default (1000) ensures we run AFTER Resize.js
// has written context.newBounds in its own 'resize.move' listener.

const AFTER_RESIZE_PRIORITY = 500;

class AspectLock {
  constructor(eventBus) {
    eventBus.on('resize.move', AFTER_RESIZE_PRIORITY, (event) => {
      const context = event.context;
      const original = context.shape;
      const newBounds = context.newBounds;

      // event.originalEvent is the raw DOM MouseEvent (Dragging.js line 258)
      const oe = event.originalEvent;
      const shiftHeld = oe && (oe.shiftKey || (oe.srcEvent && oe.srcEvent.shiftKey));

      if (!shiftHeld || !newBounds || !original.width || !original.height) {
        return;
      }

      const ratio = original.width / original.height;

      const dw = Math.abs(newBounds.width - original.width);
      const dh = Math.abs(newBounds.height - original.height);

      let width = newBounds.width;
      let height = newBounds.height;

      // Drive off whichever dimension changed more
      if (dw >= dh) {
        height = Math.round(width / ratio);
      } else {
        width = Math.round(height * ratio);
      }

      // Recompute x/y so the fixed corner stays fixed.
      // context.direction: 'n','s','e','w','nw','ne','sw','se'
      const dir = context.direction || 'se';
      const west  = dir.indexOf('w') !== -1;
      const north = dir.indexOf('n') !== -1;

      const x = west  ? (newBounds.x + newBounds.width  - width)  : newBounds.x;
      const y = north ? (newBounds.y + newBounds.height - height) : newBounds.y;

      context.newBounds = { x, y, width, height };
    });
  }
}

AspectLock.$inject = ['eventBus'];

export default {
  __init__: ['resizePlusAspectLock'],
  resizePlusAspectLock: ['type', AspectLock]
};
