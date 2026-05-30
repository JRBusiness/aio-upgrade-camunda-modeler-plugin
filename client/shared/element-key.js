// Maps a bpmn element to its size key, applying the collapsed-subprocess → task
// remap. Imports bpmn-js, so this is glue (.js), not a pure module (.mjs).
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import { resolveSizeKey } from './types.mjs';

export function sizeKeyForElement(element) {
  let key = resolveSizeKey((t) => is(element, t));
  if (key === 'subprocess' && !isExpanded(element)) key = 'task';
  return key;
}
