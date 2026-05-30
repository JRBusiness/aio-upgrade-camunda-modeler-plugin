import { isExpanded } from 'bpmn-js/lib/util/DiUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';

// The collapsed sub-process "+" marker is drawn by bpmn-js' BpmnRenderer as a
// path with attribute data-marker="sub-process" (see BpmnRenderer.js
// 'SubProcessMarker' -> drawMarker('sub-process', ...)). It is the only marker
// rendered for a *collapsed* sub-process, so the attribute selector below is
// an exact, unambiguous match.
const MARKER_SELECTOR = '[data-marker="sub-process"]';

// bpmn-js draws a 14x14 marker rect; the visible plus glyph sits inside it.
// We treat the marker footprint as ~14px for corner positioning.
const MARKER_SIZE = 14;

// bpmn-js default transform for the marker:
//   translate(element.width / 2 - 7.5, element.height - 20)
// 'bottom-center' below reproduces this exactly so index 0 + shown == no-op.
const POSITIONS = [
  'bottom-center',
  'bottom-right',
  'top-right',
  'top-left',
  'bottom-left'
];

const STYLE_ID = 'rp-marker-control-style';

const CSS = `
.rp-icon-marker-toggle::before { content: "\\2296"; font-style: normal; font-weight: bold; }
.rp-icon-marker-move::before   { content: "\\2922"; font-style: normal; font-weight: bold; }
`;

class MarkerControl {
  constructor(palette, elementRegistry, eventBus) {
    this._elementRegistry = elementRegistry;

    this._hidden = false;
    this._positionIndex = 0;

    this._injectStyle();
    palette.registerProvider(this);

    // These events all fire AFTER the default render, so the marker element
    // exists in the DOM when we sweep. Re-render (resize/move) resets the
    // marker transform/visibility, so we must re-apply our visual state.
    eventBus.on([
      'element.changed',
      'elements.changed',
      'shape.added',
      'commandStack.changed',
      'import.done',
      'import.render.complete'
    ], () => this._applyAll());
  }

  _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Compute the translate (tx, ty) for a given position name relative to the
  // element's geometry. 'bottom-center' matches bpmn-js' own default exactly.
  _translateFor(position, element) {
    const w = element.width;
    const h = element.height;
    const s = MARKER_SIZE;
    const pad = 5;

    switch (position) {
    case 'bottom-center':
      return { tx: w / 2 - 7.5, ty: h - 20 };
    case 'bottom-right':
      return { tx: w - s - pad, ty: h - 20 };
    case 'top-right':
      return { tx: w - s - pad, ty: pad };
    case 'top-left':
      return { tx: pad, ty: pad };
    case 'bottom-left':
      return { tx: pad, ty: h - 20 };
    default:
      return { tx: w / 2 - 7.5, ty: h - 20 };
    }
  }

  _targets() {
    return this._elementRegistry.filter(
      (el) => is(el, 'bpmn:SubProcess') && !isExpanded(el)
    );
  }

  _applyMarker(element) {
    const gfx = this._elementRegistry.getGraphics(element);
    if (!gfx) return;

    const markerEl = gfx.querySelector(MARKER_SELECTOR);
    if (!markerEl) return;

    if (this._hidden) {
      markerEl.style.display = 'none';
      return;
    }

    markerEl.style.display = '';

    const position = POSITIONS[this._positionIndex];
    const { tx, ty } = this._translateFor(position, element);
    markerEl.setAttribute('transform', 'translate(' + tx + ',' + ty + ')');
  }

  _applyAll() {
    this._targets().forEach((el) => this._applyMarker(el));
  }

  getPaletteEntries() {
    const self = this;
    return {
      'toggle-subprocess-marker': {
        group: 'tools',
        className: 'rp-icon-marker-toggle',
        title: 'Hide/show sub-process + marker',
        action: {
          click: function () {
            self._hidden = !self._hidden;
            self._applyAll();
          }
        }
      },
      'cycle-subprocess-marker': {
        group: 'tools',
        className: 'rp-icon-marker-move',
        title: 'Cycle sub-process + marker position',
        action: {
          click: function () {
            self._positionIndex = (self._positionIndex + 1) % POSITIONS.length;
            self._applyAll();
          }
        }
      }
    };
  }
}

MarkerControl.$inject = ['palette', 'elementRegistry', 'eventBus'];

export default {
  __init__: ['resizePlusMarkerControl'],
  resizePlusMarkerControl: ['type', MarkerControl]
};
