import { is } from 'bpmn-js/lib/util/ModelUtil';

import { injectFlowVisualStyle, ensureBackMarker, applyFlowVisual } from '../shared/flow-visual';

const CSS = `
.rp-icon-flow::before { content: "\\2192"; font-style: normal; font-weight: bold; }
`;

class FlowAnimation {
  constructor(contextPad, elementRegistry, modeling, canvas, selection, eventBus) {
    this._elementRegistry = elementRegistry;
    this._modeling = modeling;
    this._canvas = canvas;
    this._selection = selection;
    this._animated = new Set();

    this._injectStyle();
    injectFlowVisualStyle();
    ensureBackMarker(canvas);
    contextPad.registerProvider(this);

    // Toggle animation on the selected flow(s) with Ctrl+Shift+L. We listen on
    // the document in the capture phase and scope to this canvas, because the
    // diagram-js keyboard service did not reliably deliver this combo.
    this._onKeyDown = (event) => this._handleKey(event);
    document.addEventListener('keydown', this._onKeyDown, true);

    eventBus.on('diagram.destroy', () => {
      document.removeEventListener('keydown', this._onKeyDown, true);
    });

    eventBus.on([
      'element.changed',
      'elements.changed',
      'shape.added',
      'connection.added',
      'commandStack.changed',
      'import.done',
      'import.render.complete'
    ], () => this._reapply());

    // Hydrate the animated set from the model on import so persisted
    // animations re-apply when the file is reopened.
    eventBus.on(['import.done', 'import.render.complete'], () => {
      ensureBackMarker(canvas);
      this._elementRegistry.filter((el) => this._isFlow(el)).forEach((el) => {
        if (this._isAnimated(el)) {
          this._animated.add(el.id);
        }
        this._apply(el); // force solid on every flow; animate the animated ones
      });
    });
  }

  _injectStyle() {
    if (document.getElementById('rp-flow-animation-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-flow-animation-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _handleKey(event) {
    if (!event.ctrlKey || !event.shiftKey) return;
    if ((event.key || '').toLowerCase() !== 'l') return;

    // Only act when the keystroke belongs to this canvas (supports multiple open diagrams).
    const container = this._canvas.getContainer && this._canvas.getContainer();
    if (container && event.target && !container.contains(event.target)) return;

    const flows = this._selection.get().filter((el) => this._isFlow(el));
    if (!flows.length) return;

    event.preventDefault();
    flows.forEach((el) => this.toggle(el));
  }

  _isFlow(element) {
    return is(element, 'bpmn:SequenceFlow') || is(element, 'bpmn:MessageFlow');
  }

  _isAnimated(element) {
    const bo = element.businessObject;
    const v = bo && typeof bo.get === 'function' ? bo.get('aio:animated') : undefined;
    return v === true || v === 'true';
  }

  _isTwoWay(element) {
    const bo = element.businessObject;
    const v = bo && typeof bo.get === 'function' ? bo.get('aio:twoWay') : undefined;
    return v === true || v === 'true';
  }

  _apply(element) {
    const gfx = this._elementRegistry.getGraphics(element);
    if (!gfx) return;
    applyFlowVisual(gfx, {
      animated: this._animated.has(element.id),
      twoWay: this._isTwoWay(element),
      id: element.id
    });
  }

  _reapply() {
    // Apply to ALL flows, not just the animated ones: non-animated, non-two-way
    // flows are forced solid (covers message flows, dashed by BPMN default).
    this._elementRegistry.filter((el) => this._isFlow(el)).forEach((el) => this._apply(el));
  }

  toggle(element) {
    if (this._animated.has(element.id)) {
      this._animated.delete(element.id);
    } else {
      this._animated.add(element.id);
    }
    this._apply(element);

    // Persist to the model so the animation survives save/reload.
    const on = this._animated.has(element.id);
    try {
      this._modeling.updateProperties(element, { 'aio:animated': on ? true : undefined });
    } catch (e) { /* ignore if extension unavailable */ }
  }

  getContextPadEntries(element) {
    if (!this._isFlow(element)) return {};
    const self = this;
    return {
      'toggle-flow-animation': {
        group: 'edit',
        className: 'rp-icon-flow',
        title: 'Toggle flow animation (Ctrl+Shift+L)',
        action: {
          click: function () { self.toggle(element); }
        }
      }
    };
  }
}

FlowAnimation.$inject = ['contextPad', 'elementRegistry', 'modeling', 'canvas', 'selection', 'eventBus'];

export default {
  __init__: ['resizePlusFlowAnimation'],
  resizePlusFlowAnimation: ['type', FlowAnimation]
};
