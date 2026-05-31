import { is } from 'bpmn-js/lib/util/ModelUtil';

const ANIMATED_CLASS = 'rp-flow-animated';

const CSS = `
@keyframes rp-flow-dash {
  to { stroke-dashoffset: -24; }
}
.${ANIMATED_CLASS} .djs-visual path {
  stroke-dasharray: 6 6;
  animation: rp-flow-dash 0.6s linear infinite;
}
.rp-icon-flow::before { content: "\\2192"; font-style: normal; font-weight: bold; }
`;

class FlowAnimation {
  constructor(contextPad, elementRegistry, eventBus) {
    this._elementRegistry = elementRegistry;
    this._animated = new Set();

    this._injectStyle();
    contextPad.registerProvider(this);

    eventBus.on([
      'element.changed',
      'elements.changed',
      'shape.added',
      'connection.added',
      'commandStack.changed',
      'import.done',
      'import.render.complete'
    ], () => this._reapply());
  }

  _injectStyle() {
    if (document.getElementById('rp-flow-animation-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-flow-animation-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _isFlow(element) {
    return is(element, 'bpmn:SequenceFlow') || is(element, 'bpmn:MessageFlow');
  }

  _apply(element) {
    const gfx = this._elementRegistry.getGraphics(element);
    if (!gfx) return;
    if (this._animated.has(element.id)) {
      gfx.classList.add(ANIMATED_CLASS);
    } else {
      gfx.classList.remove(ANIMATED_CLASS);
    }
  }

  _reapply() {
    this._animated.forEach((id) => {
      const element = this._elementRegistry.get(id);
      if (element) this._apply(element);
    });
  }

  toggle(element) {
    if (this._animated.has(element.id)) {
      this._animated.delete(element.id);
    } else {
      this._animated.add(element.id);
    }
    this._apply(element);
  }

  getContextPadEntries(element) {
    if (!this._isFlow(element)) return {};
    const self = this;
    return {
      'toggle-flow-animation': {
        group: 'edit',
        className: 'rp-icon-flow',
        title: 'Toggle flow animation',
        action: {
          click: function () { self.toggle(element); }
        }
      }
    };
  }
}

FlowAnimation.$inject = ['contextPad', 'elementRegistry', 'eventBus'];

export default {
  __init__: ['resizePlusFlowAnimation'],
  resizePlusFlowAnimation: ['type', FlowAnimation]
};
