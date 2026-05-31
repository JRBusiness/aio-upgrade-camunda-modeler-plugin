const ICON_H = '<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><line x1="11" y1="3" x2="11" y2="19" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/><path d="M8 7 L4 11 L8 15 Z" fill="currentColor"/><path d="M14 7 L18 11 L14 15 Z" fill="currentColor"/></svg>';
const ICON_V = '<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/><path d="M7 8 L11 4 L15 8 Z" fill="currentColor"/><path d="M7 14 L11 18 L15 14 Z" fill="currentColor"/></svg>';

function isFlippableShape(el) {
  return el
    && typeof el.x === 'number'
    && typeof el.width === 'number'
    && !el.waypoints      // exclude connections
    && !el.labelTarget    // exclude labels
    && el.type !== 'label'
    && !!el.parent;       // exclude the root
}

class FlipMenuProvider {
  constructor(popupMenu, modeling) {
    this._modeling = modeling;
    popupMenu.registerProvider('align-elements', 500, this);
  }

  _flip(elements, axis) {
    const shapes = elements.filter(isFlippableShape);
    if (shapes.length < 2) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    });

    const moves = shapes.map((s) => {
      let dx = 0, dy = 0;
      if (axis === 'h') {
        dx = (minX + maxX - s.x - s.width) - s.x;
      } else {
        dy = (minY + maxY - s.y - s.height) - s.y;
      }
      return { shape: s, delta: { x: dx, y: dy } };
    });

    moves.forEach((m) => {
      if (m.delta.x !== 0 || m.delta.y !== 0) {
        this._modeling.moveShape(m.shape, m.delta);
      }
    });
  }

  getPopupMenuEntries(target) {
    const elements = Array.isArray(target) ? target : [target];
    const shapes = elements.filter(isFlippableShape);
    if (shapes.length < 2) return {};

    const self = this;
    return {
      'flip-elements-horizontal': {
        group: { id: 'flip', name: 'Flip' },
        title: 'Flip horizontally',
        className: 'rp-flip-menu-entry',
        imageHtml: ICON_H,
        action: function () { self._flip(elements, 'h'); }
      },
      'flip-elements-vertical': {
        group: { id: 'flip', name: 'Flip' },
        title: 'Flip vertically',
        className: 'rp-flip-menu-entry',
        imageHtml: ICON_V,
        action: function () { self._flip(elements, 'v'); }
      }
    };
  }
}

FlipMenuProvider.$inject = ['popupMenu', 'modeling'];

export default {
  __init__: ['resizePlusFlip'],
  resizePlusFlip: ['type', FlipMenuProvider]
};
