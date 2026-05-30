import { registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

import resizeRules from './resize-rules';

registerBpmnJSPlugin({
  __depends__: [resizeRules]
});
