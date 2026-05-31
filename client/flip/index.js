const CSS = `
.rp-icon-flip-h::before { content: "\\21C6"; font-style: normal; font-weight: bold; }
.rp-icon-flip-v::before { content: "\\21C5"; font-style: normal; font-weight: bold; }
`;

function isFlippableShape(el) {
  return el
    && typeof el.x === 'number'
    && typeof el.width === 'number'
    && !el.waypoints      // exclude connections
    && !el.labelTarget    // exclude labels
    && el.type !== 'label'
    && !!el.parent;       // exclude the root
}

class Flip {
  constructor(palette, selection, modeling) {
    this._selection = selection;
    this._modeling = modeling;

    this._injectStyle();
    palette.registerProvider(this);
  }

  _injectStyle() {
    if (document.getElementById('rp-flip-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-flip-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  flip(axis) {
    const shapes = this._selection.get().filter(isFlippableShape);
    if (shapes.length < 2) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    });

    // Compute all deltas from the original snapshot first, then apply.
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

  getPaletteEntries() {
    const self = this;
    return {
      'flip-horizontal': {
        group: 'tools',
        className: 'rp-icon-flip-h',
        title: 'Flip selected horizontally',
        action: { click: function () { self.flip('h'); } }
      },
      'flip-vertical': {
        group: 'tools',
        className: 'rp-icon-flip-v',
        title: 'Flip selected vertically',
        action: { click: function () { self.flip('v'); } }
      }
    };
  }
}

Flip.$inject = ['palette', 'selection', 'modeling'];

export default {
  __init__: ['resizePlusFlip'],
  resizePlusFlip: ['type', Flip]
};
