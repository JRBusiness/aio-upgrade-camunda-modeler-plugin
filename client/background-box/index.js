import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { append as svgAppend, create as svgCreate, attr as svgAttr } from 'tiny-svg';
import { getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { isBackgroundBox, BACKGROUND_ATTR } from '../shared/background';

// Render above bpmn-js's own renderer (default priority 1000) so our background
// boxes draw as a plain filled rectangle instead of a dashed group.
const RENDER_PRIORITY = 1500;

const DEFAULT_FILL = '#f5f5f5';
const DEFAULT_STROKE = '#bbbbbb';

const ICON_CSS = '.rp-icon-bg::before { content: "\\25AD"; font-style: normal; }';

/**
 * Draws aio:background groups as a clean filled rectangle and keeps them at the
 * back of the z-order.
 *
 * Z-order is handled HERE, in the renderer, rather than via a one-off reorder on
 * create/import. diagram-js redraws every element on a full re-render (e.g. when
 * a Camunda Modeler tab is re-activated), and a one-off reorder doesn't survive
 * that -- the opaque box came back on top and hid everything. Because drawShape
 * runs on every (re)render of the box, moving its graphics group to the front of
 * its container here (= back of the paint order) self-heals on every redraw.
 */
class BackgroundBoxRenderer extends BaseRenderer {
  constructor(eventBus) {
    super(eventBus, RENDER_PRIORITY);
  }

  canRender(element) {
    return isBackgroundBox(element);
  }

  drawShape(parentGfx, element) {
    const fill = getFillColor(element, DEFAULT_FILL);
    const stroke = getStrokeColor(element, DEFAULT_STROKE);

    const rect = svgCreate('rect');
    svgAttr(rect, {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      fill: fill,
      stroke: stroke,
      strokeWidth: 1
    });
    svgAppend(parentGfx, rect);

    sendGfxToBack(parentGfx);

    return rect;
  }

  getShapePath(shape) {
    const x = shape.x, y = shape.y, w = shape.width, h = shape.height;
    return `M${x},${y}l${w},0l0,${h}l${-w},0z`;
  }
}

BackgroundBoxRenderer.$inject = ['eventBus'];

// Given the .djs-visual passed to drawShape, climb to the element's outer
// .djs-group wrapper and move it to the front of its sibling container, so the
// box paints first (behind everything else in that container).
function sendGfxToBack(parentGfx) {
  const elementGfx = parentGfx && parentGfx.parentNode;     // .djs-element
  const groupGfx = elementGfx && elementGfx.parentNode;     // .djs-group wrapper
  if (!groupGfx || !groupGfx.classList || !groupGfx.classList.contains('djs-group')) {
    return;
  }
  const container = groupGfx.parentNode;                    // parent's .djs-children
  if (container && container.firstChild !== groupGfx) {
    container.insertBefore(groupGfx, container.firstChild);
  }
}

/**
 * Adds a "Background box" palette tool that drops a flagged bpmn:Group you can
 * size and place anywhere (standard bpmn-js create flow).
 */
class BackgroundBoxPalette {
  constructor(palette, create, elementFactory, bpmnFactory) {
    this._create = create;
    this._elementFactory = elementFactory;
    this._bpmnFactory = bpmnFactory;

    this._injectStyle();
    palette.registerProvider(this);
  }

  _injectStyle() {
    if (document.getElementById('rp-background-box-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-background-box-style';
    style.textContent = ICON_CSS;
    document.head.appendChild(style);
  }

  _start(event) {
    const businessObject = this._bpmnFactory.create('bpmn:Group');
    businessObject.set(BACKGROUND_ATTR, true);

    const shape = this._elementFactory.createShape({
      type: 'bpmn:Group',
      businessObject: businessObject,
      width: 400,
      height: 240
    });

    this._create.start(event, shape);
  }

  getPaletteEntries() {
    const self = this;
    return {
      'create-background-box': {
        group: 'artifact',
        className: 'rp-icon-bg',
        title: 'Create background box',
        action: {
          dragstart: function (event) { self._start(event); },
          click: function (event) { self._start(event); }
        }
      }
    };
  }
}

BackgroundBoxPalette.$inject = ['palette', 'create', 'elementFactory', 'bpmnFactory'];

export default {
  __init__: ['rpBackgroundBoxRenderer', 'rpBackgroundBoxPalette'],
  rpBackgroundBoxRenderer: ['type', BackgroundBoxRenderer],
  rpBackgroundBoxPalette: ['type', BackgroundBoxPalette]
};
