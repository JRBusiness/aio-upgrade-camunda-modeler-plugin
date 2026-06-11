import { is } from 'bpmn-js/lib/util/ModelUtil';

import { injectFlowVisualStyle, ensureBackMarker, applyFlowVisual } from '../shared/flow-visual';

const CSS = `
.rp-icon-twoway::before { content: "\\21C4"; font-style: normal; font-weight: bold; }
`;

class TwoWay {
  constructor(contextPad, elementRegistry, modeling, canvas, eventBus) {
    this._elementRegistry = elementRegistry;
    this._modeling = modeling;
    this._canvas = canvas;
    this._twoWay = new Set();

    this._injectStyle();
    injectFlowVisualStyle();
    ensureBackMarker(canvas);
    contextPad.registerProvider(this);

    eventBus.on([
      'element.changed', 'elements.changed', 'shape.added', 'connection.added',
      'commandStack.changed', 'import.done', 'import.render.complete'
    ], () => this._reapply());

    eventBus.on(['import.done', 'import.render.complete'], () => {
      ensureBackMarker(canvas);
      this._elementRegistry.filter((el) => this._isFlow(el)).forEach((el) => {
        if (this._isTwoWay(el)) {
          this._twoWay.add(el.id);
          this._apply(el);
        }
      });
    });
  }

  _injectStyle() {
    if (document.getElementById('rp-two-way-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-two-way-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _isFlow(element) {
    return is(element, 'bpmn:SequenceFlow') || is(element, 'bpmn:MessageFlow');
  }

  _isTwoWay(element) {
    const bo = element.businessObject;
    const v = bo && typeof bo.get === 'function' ? bo.get('aio:twoWay') : undefined;
    return v === true || v === 'true';
  }

  _isAnimated(element) {
    const bo = element.businessObject;
    const v = bo && typeof bo.get === 'function' ? bo.get('aio:animated') : undefined;
    return v === true || v === 'true';
  }

  _apply(element) {
    this._ensureMarker();
    const gfx = this._elementRegistry.getGraphics(element);
    if (!gfx) return;
    applyFlowVisual(gfx, {
      animated: this._isAnimated(element),
      twoWay: this._twoWay.has(element.id),
      id: element.id
    });
  }

  _ensureMarker() {
    ensureBackMarker(this._canvas);
  }

  _reapply() {
    this._twoWay.forEach((id) => {
      const el = this._elementRegistry.get(id);
      if (el) this._apply(el);
    });
  }

  toggle(element) {
    if (this._twoWay.has(element.id)) {
      this._twoWay.delete(element.id);
    } else {
      this._twoWay.add(element.id);
    }
    this._apply(element);

    const on = this._twoWay.has(element.id);
    try {
      this._modeling.updateProperties(element, { 'aio:twoWay': on ? true : undefined });
    } catch (e) { /* ignore if extension unavailable */ }
  }

  getContextPadEntries(element) {
    if (!this._isFlow(element)) return {};
    const self = this;
    return {
      'toggle-two-way': {
        group: 'edit',
        className: 'rp-icon-twoway',
        title: 'Toggle two-way line',
        action: { click: function () { self.toggle(element); } }
      }
    };
  }
}

TwoWay.$inject = ['contextPad', 'elementRegistry', 'modeling', 'canvas', 'eventBus'];

export default {
  __init__: ['resizePlusTwoWay'],
  resizePlusTwoWay: ['type', TwoWay]
};
