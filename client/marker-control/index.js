import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

const MARKER_SELECTOR = '[data-marker="sub-process"]';

const POSITIONS = ['bottom-center', 'bottom-right', 'top-right', 'top-left', 'bottom-left'];

const CSS = `
.rp-icon-marker-toggle::before { content: "\\2296"; font-style: normal; font-weight: bold; }
.rp-icon-marker-move::before { content: "\\21BB"; font-style: normal; font-weight: bold; }
`;

class MarkerControl {
  constructor(contextPad, elementRegistry, modeling, eventBus) {
    this._elementRegistry = elementRegistry;
    this._modeling = modeling;
    this._state = {}; // element.id -> { hidden, positionIndex }

    this._injectStyle();
    contextPad.registerProvider(this);

    eventBus.on([
      'element.changed',
      'elements.changed',
      'shape.added',
      'commandStack.changed',
      'import.done',
      'import.render.complete'
    ], () => this._reapply());

    eventBus.on(['import.done', 'import.render.complete'], () => {
      this._elementRegistry.filter((el) => this._isCollapsedSubProcess(el)).forEach((el) => {
        if (this._state[el.id]) return; // already tracked this session
        const bo = el.businessObject;
        if (!bo || typeof bo.get !== 'function') return;
        const hidden = bo.get('aio:markerHidden');
        const pos = bo.get('aio:markerPosition');
        const hiddenOn = hidden === true || hidden === 'true';
        const posNum = (pos === undefined || pos === null) ? 0 : Number(pos);
        if (hiddenOn || posNum) {
          this._state[el.id] = { hidden: hiddenOn, positionIndex: (posNum >= 0 && posNum < 5) ? posNum : 0 };
          this._applyMarker(el);
        }
      });
    });
  }

  _injectStyle() {
    if (document.getElementById('rp-marker-control-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-marker-control-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _isCollapsedSubProcess(element) {
    return is(element, 'bpmn:SubProcess') && !isExpanded(element);
  }

  _stateFor(element) {
    let s = this._state[element.id];
    if (!s) {
      s = { hidden: false, positionIndex: 0 };
      this._state[element.id] = s;
    }
    return s;
  }

  _translateFor(position, element) {
    const w = element.width, h = element.height, s = 14, pad = 5;
    switch (position) {
      case 'bottom-center': return { tx: w / 2 - 7.5, ty: h - 20 };
      case 'bottom-right': return { tx: w - s - pad, ty: h - 20 };
      case 'top-right': return { tx: w - s - pad, ty: pad };
      case 'top-left': return { tx: pad, ty: pad };
      case 'bottom-left': return { tx: pad, ty: h - 20 };
      default: return { tx: w / 2 - 7.5, ty: h - 20 };
    }
  }

  _applyMarker(element) {
    const gfx = this._elementRegistry.getGraphics(element);
    if (!gfx) return;
    const pathEl = gfx.querySelector(MARKER_SELECTOR);
    if (!pathEl) return;
    const prevEl = pathEl.previousElementSibling;
    const box = (prevEl && prevEl.tagName && prevEl.tagName.toLowerCase() === 'rect') ? prevEl : null;

    const state = this._state[element.id];
    if (!state) return;

    if (state.hidden) {
      pathEl.style.display = 'none';
      if (box) box.style.display = 'none';
      return;
    }
    pathEl.style.display = '';
    if (box) box.style.display = '';

    const defX = element.width / 2 - 7.5;
    const defY = element.height - 20;
    const { tx, ty } = this._translateFor(POSITIONS[state.positionIndex], element);
    if (box) box.setAttribute('transform', `translate(${tx}, ${ty})`);
    pathEl.setAttribute('transform', `translate(${tx - defX}, ${ty - defY})`);
  }

  _reapply() {
    Object.keys(this._state).forEach((id) => {
      const element = this._elementRegistry.get(id);
      if (element && this._isCollapsedSubProcess(element)) this._applyMarker(element);
    });
  }

  toggleHidden(element) {
    const s = this._stateFor(element);
    s.hidden = !s.hidden;
    this._applyMarker(element);
    this._persist(element);
  }

  cyclePosition(element) {
    const s = this._stateFor(element);
    s.positionIndex = (s.positionIndex + 1) % POSITIONS.length;
    this._applyMarker(element);
    this._persist(element);
  }

  _persist(element) {
    const s = this._state[element.id];
    try {
      this._modeling.updateProperties(element, {
        'aio:markerHidden': s.hidden ? true : undefined,
        'aio:markerPosition': s.positionIndex !== 0 ? s.positionIndex : undefined
      });
    } catch (e) { /* ignore if extension unavailable */ }
  }

  getContextPadEntries(element) {
    if (!this._isCollapsedSubProcess(element)) return {};
    const self = this;
    return {
      'toggle-subprocess-marker': {
        group: 'edit',
        className: 'rp-icon-marker-toggle',
        title: 'Hide/show sub-process + marker',
        action: { click: function () { self.toggleHidden(element); } }
      },
      'cycle-subprocess-marker': {
        group: 'edit',
        className: 'rp-icon-marker-move',
        title: 'Cycle sub-process + marker position',
        action: { click: function () { self.cyclePosition(element); } }
      }
    };
  }
}

MarkerControl.$inject = ['contextPad', 'elementRegistry', 'modeling', 'eventBus'];

export default {
  __init__: ['resizePlusMarkerControl'],
  resizePlusMarkerControl: ['type', MarkerControl]
};
