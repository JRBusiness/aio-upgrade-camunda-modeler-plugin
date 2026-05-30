import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import { resolveSizeKey } from '../shared/types.mjs';
import { belowMin } from '../shared/sizes.mjs';

const HIGH_PRIORITY = 2000;

class ResizeRules extends RuleProvider {
  constructor(eventBus) {
    super(eventBus);
  }

  init() {
    this.addRule('shape.resize', HIGH_PRIORITY, ({ shape, newBounds }) => {
      const isType = (t) => is(shape, t);
      let key = resolveSizeKey(isType);

      if (key === null) {
        return; // not ours — let default bpmn rules decide (events/gateways stay fixed)
      }

      // A collapsed sub-process behaves like a task-sized box; use task minimums.
      if (key === 'subprocess' && !isExpanded(shape)) {
        key = 'task';
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
