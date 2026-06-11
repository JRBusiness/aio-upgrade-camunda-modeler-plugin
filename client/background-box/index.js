import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import { append as svgAppend, create as svgCreate, attr as svgAttr } from 'tiny-svg';
import { getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import { isBackgroundBox, BACKGROUND_ATTR } from '../shared/background';

// Render above bpmn-js's own renderer (default priority 1000) so our background
// boxes draw as a plain filled rectangle instead of a dashed group.
const RENDER_PRIORITY = 1500;

const DEFAULT_FILL = '#f5f5f5';
const DEFAULT_STROKE = '#bbbbbb';

const ICON_CSS = '.rp-icon-bg::before { content: "BG"; font-style: normal; font-weight: bold; font-size: 11px; }';

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

    backElementGfx(parentGfx && parentGfx.parentNode);

    return rect;
  }

  getShapePath(shape) {
    const x = shape.x, y = shape.y, w = shape.width, h = shape.height;
    return `M${x},${y}l${w},0l0,${h}l${-w},0z`;
  }
}

BackgroundBoxRenderer.$inject = ['eventBus'];

// Move an element's outer .djs-group wrapper to the front of its sibling
// container, so it paints first (behind everything else in that container).
// `elementGfx` is the .djs-element node (what getGraphics returns / the parent
// of .djs-visual).
function backElementGfx(elementGfx) {
  const groupGfx = elementGfx && elementGfx.parentNode;     // .djs-group wrapper
  if (!groupGfx || !groupGfx.classList || !groupGfx.classList.contains('djs-group')) {
    return;
  }
  const container = groupGfx.parentNode;                    // sibling container
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

/**
 * Force background boxes to be created at the diagram ROOT, never nested inside
 * another element. bpmn-js lets a group be created against any target (BpmnRules
 * canCreate returns true for groups), so dropping a second box ONTO the first
 * box would otherwise make the first box its parent -- and that nesting corrupted
 * the first box's contents. Re-parenting to root keeps every box independent and
 * able to span the whole diagram.
 */
class BackgroundBoxParent extends CommandInterceptor {
  constructor(eventBus, canvas) {
    super(eventBus);
    this.preExecute('shape.create', 2000, (event) => {
      const shape = event.context.shape;
      if (isBackgroundBox(shape)) {
        event.context.parent = canvas.getRootElement();
      }
    });
  }
}

BackgroundBoxParent.$inject = ['eventBus', 'canvas'];

/**
 * Re-asserts the back z-order for every background box after any change. The
 * renderer self-heals on (re)draw, but a plain MOVE only translates the existing
 * graphics (no redraw) and can leave the box re-appended on top of its siblings
 * -- e.g. when a move re-parents it into a pool, hiding that pool's shapes.
 * Pushing every background box to the back on each change keeps them behind.
 */
class BackgroundBoxOrder {
  constructor(eventBus, elementRegistry) {
    this._elementRegistry = elementRegistry;
    eventBus.on(
      ['commandStack.changed', 'element.changed', 'elements.changed', 'import.render.complete'],
      () => this._reassert()
    );
  }

  _reassert() {
    this._elementRegistry
      .filter((el) => isBackgroundBox(el))
      .forEach((el) => backElementGfx(this._elementRegistry.getGraphics(el)));
  }
}

BackgroundBoxOrder.$inject = ['eventBus', 'elementRegistry'];

export default {
  __init__: [
    'rpBackgroundBoxRenderer',
    'rpBackgroundBoxPalette',
    'rpBackgroundBoxParent',
    'rpBackgroundBoxOrder'
  ],
  rpBackgroundBoxRenderer: ['type', BackgroundBoxRenderer],
  rpBackgroundBoxPalette: ['type', BackgroundBoxPalette],
  rpBackgroundBoxParent: ['type', BackgroundBoxParent],
  rpBackgroundBoxOrder: ['type', BackgroundBoxOrder]
};
