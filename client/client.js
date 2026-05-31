import { registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

import resizeRules from './resize-rules';
import fitToLabel from './fit-to-label';
import resetSize from './reset-size';
import keyboardResize from './keyboard-resize';
import aspectLock from './aspect-lock';
import flowAnimation from './flow-animation';
import markerControl from './marker-control';
import exportSvg from './export-svg';

const style = document.createElement('style');
style.textContent = `
  .rp-icon-fit::before { content: "\\21F2"; font-style: normal; }
  .rp-icon-reset::before { content: "\\21BA"; font-style: normal; }
`;
document.head.appendChild(style);

registerBpmnJSPlugin({
  __depends__: [
    resizeRules,
    fitToLabel,
    resetSize,
    keyboardResize,
    aspectLock,
    flowAnimation,
    markerControl,
    exportSvg
  ]
});
