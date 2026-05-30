const ANIMATED_CLASS = 'rp-flow-animated';

const CSS = `
@keyframes rp-flow-dash {
  to { stroke-dashoffset: -24; }
}
.${ANIMATED_CLASS} .djs-connection[data-element-id^="Flow"] .djs-visual > path,
.${ANIMATED_CLASS} .djs-connection[data-element-id^="MessageFlow"] .djs-visual > path,
.${ANIMATED_CLASS} g.djs-connection .djs-visual > path[marker-end] {
  stroke-dasharray: 6 6;
  animation: rp-flow-dash 0.6s linear infinite;
}
.rp-icon-flow::before { content: "→"; font-style: normal; font-weight: bold; }
`;

class FlowAnimation {
  constructor(palette, canvas) {
    this._canvas = canvas;
    this._on = false;

    this._injectStyle();
    palette.registerProvider(this);
  }

  _injectStyle() {
    if (document.getElementById('rp-flow-animation-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-flow-animation-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  toggle() {
    this._on = !this._on;
    const container = this._canvas.getContainer();
    container.classList.toggle(ANIMATED_CLASS, this._on);
  }

  getPaletteEntries() {
    const self = this;
    return {
      'toggle-flow-animation': {
        group: 'tools',
        className: 'rp-icon-flow',
        title: 'Toggle flow animation',
        action: {
          click: function () { self.toggle(); }
        }
      }
    };
  }
}

FlowAnimation.$inject = ['palette', 'canvas'];

export default {
  __init__: ['resizePlusFlowAnimation'],
  resizePlusFlowAnimation: ['type', FlowAnimation]
};
