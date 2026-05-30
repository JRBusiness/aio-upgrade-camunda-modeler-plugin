import { sizeKeyForElement } from '../shared/element-key.js';
import { clampToMin } from '../shared/sizes.mjs';

const STEP = 10;
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

class KeyboardResize {
  constructor(keyboard, selection, modeling) {
    this._modeling = modeling;
    this._selection = selection;

    keyboard.addListener(2000, (context) => this._handle(context));
  }

  _handle(context) {
    const event = context.keyEvent;

    if (!event.ctrlKey || !event.shiftKey) return;
    if (!ARROWS.includes(event.key)) return;

    const selected = this._selection.get();
    if (selected.length !== 1) return;

    const element = selected[0];
    const key = sizeKeyForElement(element);
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
