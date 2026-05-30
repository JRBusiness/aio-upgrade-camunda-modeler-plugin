import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';

import { sizeKeyForElement } from '../shared/element-key.js';
import { belowMin } from '../shared/sizes.mjs';

const HIGH_PRIORITY = 2000;

class ResizeRules extends RuleProvider {
  constructor(eventBus) {
    super(eventBus);
  }

  init() {
    this.addRule('shape.resize', HIGH_PRIORITY, ({ shape, newBounds }) => {
      const key = sizeKeyForElement(shape);

      if (key === null) {
        return; // not ours — let default bpmn rules decide (events/gateways stay fixed)
      }

      if (!newBounds) {
        return true; // resize handles allowed
      }

      return !belowMin(key, newBounds);
    });
  }
}

ResizeRules.$inject = ['eventBus'];

export default {
  __init__: ['resizePlusRules'],
  resizePlusRules: ['type', ResizeRules]
};
