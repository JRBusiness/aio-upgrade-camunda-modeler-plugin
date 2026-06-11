import { registerBpmnJSPlugin, registerBpmnJSModdleExtension } from 'camunda-modeler-plugin-helpers';

import resizeRules from './resize-rules';
import fitToLabel from './fit-to-label';
import resetSize from './reset-size';
import keyboardResize from './keyboard-resize';
import aspectLock from './aspect-lock';
import flowAnimation from './flow-animation';
import markerControl from './marker-control';
import exportSvg from './export-svg';
import flip from './flip';
import twoWay from './two-way';

const style = document.createElement('style');
style.textContent = `
  .rp-icon-fit::before { content: "\\21F2"; font-style: normal; }
  .rp-icon-reset::before { content: "\\21BA"; font-style: normal; }
`;
document.head.appendChild(style);

const aioUpgradeModdleDescriptor = {
  name: 'AIOUpgrade',
  uri: 'http://aio-upgrade/schema/1.0',
  prefix: 'aio',
  xml: { tagAlias: 'lowerCase' },
  types: [
    {
      name: 'AnimatedFlow',
      extends: ['bpmn:SequenceFlow', 'bpmn:MessageFlow'],
      properties: [
        { name: 'animated', isAttr: true, type: 'Boolean' },
        { name: 'twoWay', isAttr: true, type: 'Boolean' }
      ]
    },
    {
      name: 'MarkerStyle',
      extends: [ 'bpmn:SubProcess' ],
      properties: [
        { name: 'markerHidden', isAttr: true, type: 'Boolean' },
        { name: 'markerPosition', isAttr: true, type: 'Integer' }
      ]
    }
  ],
  enumerations: [],
  associations: []
};

registerBpmnJSModdleExtension(aioUpgradeModdleDescriptor);

registerBpmnJSPlugin({
  __depends__: [
    resizeRules,
    fitToLabel,
    resetSize,
    keyboardResize,
    aspectLock,
    flowAnimation,
    markerControl,
    exportSvg,
    flip,
    twoWay
  ]
});
