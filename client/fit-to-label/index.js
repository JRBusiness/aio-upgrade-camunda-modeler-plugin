import { sizeKeyForElement } from '../shared/element-key.js';
import { getMin } from '../shared/sizes.mjs';
import { computeFitBounds } from './compute.mjs';
import TextUtil from 'diagram-js/lib/util/Text';

const PADDING = { top: 7, right: 5, bottom: 7, left: 5 };

class FitToLabel {
  constructor(contextPad, modeling, textRenderer, editorActions, selection) {
    this._modeling = modeling;
    this._selection = selection;
    this._textUtil = new TextUtil({ style: textRenderer.getDefaultStyle() });

    contextPad.registerProvider(this);

    editorActions.register({
      fitToLabel: () => {
        const selected = selection.get();
        selected.forEach((el) => this.fit(el));
      }
    });
  }

  fit(element) {
    const key = sizeKeyForElement(element);
    if (!key) return;

    const name = element.businessObject && element.businessObject.name;
    if (!name) return;

    const dims = this._textUtil.getDimensions(name, {
      box: { width: element.width, height: element.height }
    });

    const bounds = computeFitBounds(
      { x: element.x, y: element.y, width: element.width, height: element.height },
      dims,
      PADDING,
      getMin(key)
    );

    if (!bounds) return;

    this._modeling.resizeShape(element, bounds);
  }

  getContextPadEntries(element) {
    if (!sizeKeyForElement(element)) return {};
    const self = this;
    return {
      'fit-to-label': {
        group: 'edit',
        className: 'rp-icon-fit',
        title: 'Fit to label',
        action: {
          click: function () { self.fit(element); }
        }
      }
    };
  }
}

FitToLabel.$inject = ['contextPad', 'modeling', 'textRenderer', 'editorActions', 'selection'];

export default {
  __init__: ['resizePlusFitToLabel'],
  resizePlusFitToLabel: ['type', FitToLabel]
};
