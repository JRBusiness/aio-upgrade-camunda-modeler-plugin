import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import { resolveSizeKey } from '../shared/types.mjs';
import { getMin } from '../shared/sizes.mjs';
import { computeFitBounds } from './compute.mjs';

const PADDING = { top: 7, right: 5, bottom: 7, left: 5 };

class FitToLabel {
  constructor(contextPad, modeling, textRenderer, editorActions, selection) {
    this._modeling = modeling;
    this._textRenderer = textRenderer;
    this._selection = selection;

    contextPad.registerProvider(this);

    editorActions.register({
      fitToLabel: () => {
        const selected = selection.get();
        selected.forEach((el) => this.fit(el));
      }
    });
  }

  _sizeKey(element) {
    let key = resolveSizeKey((t) => is(element, t));
    if (key === 'subprocess' && !isExpanded(element)) key = 'task';
    return key;
  }

  fit(element) {
    const key = this._sizeKey(element);
    if (!key) return;

    const name = element.businessObject && element.businessObject.name;
    if (!name) return;

    const dims = this._textRenderer.getDimensions(name, {
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
    if (!this._sizeKey(element)) return {};
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
