import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import { resolveSizeKey } from '../shared/types.mjs';
import { clampToMin } from '../shared/sizes.mjs';

const STEP = 10;
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

class KeyboardResize {
  constructor(keyboard, selection, modeling) {
    this._modeling = modeling;
    this._selection = selection;

    keyboard.addListener((context) => this._handle(context));
  }

  _sizeKey(element) {
    let key = resolveSizeKey((t) => is(element, t));
    if (key === 'subprocess' && !isExpanded(element)) key = 'task';
    return key;
  }

  _handle(context) {
    const event = context.keyEvent;

    if (!event.ctrlKey || !event.shiftKey) return;
    if (!ARROWS.includes(event.key)) return;

    const selected = this._selection.get();
    if (selected.length !== 1) return;

    const element = selected[0];
    const key = this._sizeKey(element);
    if (!key) return;

    const shrink = event.altKey;
    const delta = shrink ? -STEP : STEP;

    let width = element.width;
    let height = element.height;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      width += delta;
    } else {
      height += delta;
    }

    const bounds = clampToMin(key, {
      x: element.x,
      y: element.y,
      width,
      height
    });

    this._modeling.resizeShape(element, bounds);

    event.preventDefault();
    return true; // handled — stop other keyboard listeners
  }
}

KeyboardResize.$inject = ['keyboard', 'selection', 'modeling'];

export default {
  __init__: ['resizePlusKeyboardResize'],
  resizePlusKeyboardResize: ['type', KeyboardResize]
};
