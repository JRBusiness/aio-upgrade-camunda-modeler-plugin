// Ordered: most specific first. CallActivity and SubProcess must be checked
// before Task/Activity so they don't collapse into 'task'.
const RULES = [
  { key: 'callactivity', type: 'bpmn:CallActivity' },
  { key: 'subprocess',   type: 'bpmn:SubProcess' },   // Transaction & AdHocSubProcess extend this
  { key: 'dataobject',   type: 'bpmn:DataObjectReference' },
  { key: 'datastore',    type: 'bpmn:DataStoreReference' },
  { key: 'group',        type: 'bpmn:Group' },
  { key: 'annotation',   type: 'bpmn:TextAnnotation' },
  { key: 'participant',  type: 'bpmn:Participant' },
  { key: 'task',         type: 'bpmn:Task' }           // most generic activity, checked last
];

// Task subtypes used in bpmn-js that extend bpmn:Task but may appear
// without 'bpmn:Task' in the isType check (e.g. concrete element queries).
const TASK_SUBTYPES = [
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:ManualTask',
  'bpmn:BusinessRuleTask',
  'bpmn:ScriptTask'
];

// isType: (typeString) => boolean  — mirrors element.businessObject.$instanceOf(type)
export function resolveSizeKey(isType) {
  for (const { key, type } of RULES) {
    if (isType(type)) return key;
  }
  // Fallback: concrete task subtypes that extend bpmn:Task
  for (const subtype of TASK_SUBTYPES) {
    if (isType(subtype)) return 'task';
  }
  return null;
}

export function isResizable(isType) {
  return resolveSizeKey(isType) !== null;
}
