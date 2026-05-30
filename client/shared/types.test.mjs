import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSizeKey, isResizable } from './types.mjs';

const isTypeFrom = (types) => (t) => types.includes(t);

test('task subtypes resolve to task', () => {
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:UserTask', 'bpmn:Task'])), 'task');
});

test('subprocess resolves before task (transaction is a subprocess)', () => {
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:Transaction', 'bpmn:SubProcess'])), 'subprocess');
});

test('call activity resolves to callactivity, not task', () => {
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:CallActivity'])), 'callactivity');
});

test('data object / store / group / annotation / participant', () => {
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:DataObjectReference'])), 'dataobject');
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:DataStoreReference'])), 'datastore');
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:Group'])), 'group');
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:TextAnnotation'])), 'annotation');
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:Participant'])), 'participant');
});

test('events and gateways are not resizable', () => {
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:StartEvent', 'bpmn:Event'])), null);
  assert.equal(resolveSizeKey(isTypeFrom(['bpmn:ExclusiveGateway', 'bpmn:Gateway'])), null);
  assert.equal(isResizable(isTypeFrom(['bpmn:StartEvent'])), false);
  assert.equal(isResizable(isTypeFrom(['bpmn:UserTask'])), true);
});
