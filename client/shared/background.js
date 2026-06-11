// Identifies "background box" elements: a bpmn:Group flagged with aio:background.
import { is, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

export const BACKGROUND_ATTR = 'aio:background';

export function isBackgroundBox(element) {
  if (!element || !is(element, 'bpmn:Group')) return false;
  const bo = getBusinessObject(element);
  const v = bo && typeof bo.get === 'function' ? bo.get(BACKGROUND_ATTR) : undefined;
  return v === true || v === 'true';
}
