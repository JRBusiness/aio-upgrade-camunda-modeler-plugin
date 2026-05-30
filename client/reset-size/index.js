import { sizeKeyForElement } from '../shared/element-key.js';
import { getDefault } from '../shared/sizes.mjs';

class ResetSize {
  constructor(contextPad, modeling, editorActions, selection) {
    this._modeling = modeling;
    this._selection = selection;

    contextPad.registerProvider(this);

    editorActions.register({
      resetSize: () => {
        selection.get().forEach((el) => this.reset(el));
      }
    });
  }

  reset(element) {
    const key = sizeKeyForElement(element);
    if (!key) return;

    const def = getDefault(key);
    this._modeling.resizeShape(element, {
      x: element.x,
      y: element.y,
      width: def.width,
      height: def.height
    });
  }

  getContextPadEntries(element) {
    if (!sizeKeyForElement(element)) return {};
    const self = this;
    return {
      'reset-size': {
        group: 'edit',
        className: 'rp-icon-reset',
        title: 'Reset to default size',
        action: {
          click: function () { self.reset(element); }
        }
      }
    };
  }
}

ResetSize.$inject = ['contextPad', 'modeling', 'editorActions', 'selection'];

export default {
  __init__: ['resizePlusResetSize'],
  resizePlusResetSize: ['type', ResetSize]
};
