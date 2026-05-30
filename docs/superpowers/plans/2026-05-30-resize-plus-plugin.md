# Resize Plus Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern Camunda Modeler 5.47 plugin that makes a portable set of BPMN elements resizable, adds auto-fit-to-label, keyboard resize, reset-to-default, aspect-ratio lock, and a toggleable flowing-dash animation on connections.

**Architecture:** A single client bundle (webpack 5 + Babel) registered via `camunda-modeler-plugin-helpers`. Pure, dependency-free logic (size tables, type resolution, fit math) lives in `.mjs` modules unit-tested with `node --test`. diagram-js "glue" modules consume that logic and are verified manually in the live Modeler. Every size mutation routes through `modeling.resizeShape` for clean undo. Min-size enforcement is folded into the resize rule (bpmn-js convention), not a competing rule provider.

**Tech Stack:** JavaScript (ESM), diagram-js / bpmn-js modules, webpack 5, @babel/preset-env, Node built-in test runner (`node --test`), camunda-modeler-plugin-helpers ^4.

---

## Project location

Dev project: `C:\Users\dildev\camunda-modeler-plugin-resize-plus\` (git already initialized; this plan lives in `docs/superpowers/plans/`).
Install target: `%APPDATA%\camunda-modeler\plugins\camunda-modeler-plugin-resize-plus\`.

## File Structure

```
package.json                       # scripts, deps
webpack.config.js                  # bundle client/client.js -> client/client-bundle.js
babel.config.json                  # @babel/preset-env
index.js                           # plugin entry: { name, script }
scripts/deploy.mjs                 # copy plugin into %APPDATA% plugins dir
client/
  client.js                        # registerBpmnJSPlugin: wires all modules
  shared/
    sizes.mjs                      # PURE: size table + getDefault/getMin/belowMin/clampToMin
    sizes.test.mjs
    types.mjs                      # PURE: resizable type list + resolveSizeKey/isResizable
    types.test.mjs
  fit-to-label/
    compute.mjs                    # PURE: computeFitBounds(currentBounds, textDims, padding, min)
    compute.test.mjs
    index.js                       # GLUE: context-pad + editorAction, uses textRenderer
  resize-rules/
    index.js                       # GLUE: RuleProvider (allow + min enforcement)
  reset-size/
    index.js                       # GLUE: context-pad + editorAction
  keyboard-resize/
    index.js                       # GLUE: keyboard listener, Ctrl+Shift+Arrow
  aspect-lock/
    index.js                       # GLUE: resize.move constraint (riskiest)
  flow-animation/
    index.js                       # GLUE: palette toggle + injected CSS
```

---

### Task 1: Project scaffolding & build pipeline

**Files:**
- Create: `package.json`, `babel.config.json`, `webpack.config.js`, `index.js`, `client/client.js`, `scripts/deploy.mjs`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "camunda-modeler-plugin-resize-plus",
  "version": "1.0.0",
  "description": "Resize BPMN elements, fit-to-label, keyboard resize, aspect lock, and flowing-dash connection animation",
  "main": "index.js",
  "scripts": {
    "bundle": "webpack",
    "bundle:watch": "webpack --watch",
    "test": "node --test",
    "deploy": "node scripts/deploy.mjs",
    "all": "npm run test && npm run bundle"
  },
  "license": "MIT",
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@babel/preset-env": "^7.24.0",
    "babel-loader": "^9.1.3",
    "camunda-modeler-plugin-helpers": "^4.0.0",
    "webpack": "^5.90.0",
    "webpack-cli": "^5.1.4"
  },
  "dependencies": {
    "bpmn-js": "^17.0.0",
    "diagram-js": "^14.0.0",
    "inherits-browser": "^0.1.0"
  }
}
```

- [ ] **Step 2: Write `babel.config.json`**

```json
{
  "presets": [
    ["@babel/preset-env", { "targets": { "chrome": "100" } }]
  ]
}
```

- [ ] **Step 3: Write `webpack.config.js`**

```js
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './client/client.js',
  output: {
    path: path.resolve(__dirname, 'client'),
    filename: 'client-bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.mjs']
  },
  devtool: 'source-map'
};
```

- [ ] **Step 4: Write `index.js`**

```js
'use strict';

module.exports = {
  name: 'Resize Plus',
  script: './client/client-bundle.js'
};
```

- [ ] **Step 5: Write a minimal `client/client.js` (modules added in later tasks)**

```js
import { registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

// Modules are added to __depends__ as they are implemented.
registerBpmnJSPlugin({
  __depends__: []
});
```

- [ ] **Step 6: Write `scripts/deploy.mjs`** (copies the plugin into the Modeler user-data plugins dir, excluding dev files)

```js
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const appData = process.env.APPDATA;
if (!appData) {
  console.error('APPDATA not set; this script targets Windows.');
  process.exit(1);
}

const pluginsDir = path.join(appData, 'camunda-modeler', 'plugins');
const dest = path.join(pluginsDir, 'camunda-modeler-plugin-resize-plus');
const root = process.cwd();

const EXCLUDE = new Set(['node_modules', '.git', 'docs', 'scripts', 'client/client-bundle.js.map']);

await mkdir(pluginsDir, { recursive: true });
if (existsSync(dest)) await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });

for (const entry of ['index.js', 'package.json', 'README.md', 'client']) {
  const from = path.join(root, entry);
  if (!existsSync(from)) continue;
  await cp(from, path.join(dest, entry), {
    recursive: true,
    filter: (src) => !src.endsWith('.map') && !src.includes(`${path.sep}node_modules${path.sep}`)
  });
}

// Remove the old superseded plugin if present.
const old = path.join(pluginsDir, 'camunda-modeler-plugin-resize-tasks');
if (existsSync(old)) await rm(old, { recursive: true, force: true });

console.log('Deployed to', dest);
```

- [ ] **Step 7: Install dependencies and build**

Run: `npm install && npm run bundle`
Expected: `client/client-bundle.js` is created with no webpack errors. (Bundle is near-empty — no modules wired yet.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold resize-plus plugin build pipeline"
```

---

### Task 2: Size table (pure) — `client/shared/sizes.mjs`

**Files:**
- Create: `client/shared/sizes.mjs`
- Test: `client/shared/sizes.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// client/shared/sizes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, getDefault, getMin, belowMin, clampToMin, KEYS } from './sizes.mjs';

test('every key has default and min, with min <= default', () => {
  for (const key of KEYS) {
    const def = getDefault(key);
    const min = getMin(key);
    assert.ok(def && def.width > 0 && def.height > 0, `default for ${key}`);
    assert.ok(min && min.width > 0 && min.height > 0, `min for ${key}`);
    assert.ok(min.width <= def.width && min.height <= def.height, `min<=default for ${key}`);
  }
});

test('belowMin true when either dimension under minimum', () => {
  assert.equal(belowMin('task', { width: 59, height: 80 }), true);
  assert.equal(belowMin('task', { width: 100, height: 49 }), true);
  assert.equal(belowMin('task', { width: 60, height: 50 }), false);
});

test('clampToMin raises sub-minimum dimensions and preserves position', () => {
  const out = clampToMin('task', { x: 10, y: 20, width: 10, height: 10 });
  assert.deepEqual(out, { x: 10, y: 20, width: 60, height: 50 });
});

test('unknown key throws', () => {
  assert.throws(() => getDefault('nope'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test client/shared/sizes.test.mjs`
Expected: FAIL — cannot find module `./sizes.mjs`.

- [ ] **Step 3: Write `client/shared/sizes.mjs`**

```js
// Per-type canonical default and minimum sizes. Single source of truth.
export const SIZES = {
  task:        { default: { width: 100, height: 80 }, min: { width: 60, height: 50 } },
  subprocess:  { default: { width: 350, height: 200 }, min: { width: 140, height: 100 } },
  callactivity:{ default: { width: 100, height: 80 }, min: { width: 60, height: 50 } },
  dataobject:  { default: { width: 36, height: 50 }, min: { width: 36, height: 50 } },
  datastore:   { default: { width: 50, height: 50 }, min: { width: 36, height: 36 } },
  group:       { default: { width: 300, height: 300 }, min: { width: 80, height: 80 } },
  annotation:  { default: { width: 100, height: 30 }, min: { width: 50, height: 20 } },
  participant: { default: { width: 600, height: 250 }, min: { width: 200, height: 60 } }
};

export const KEYS = Object.keys(SIZES);

function entry(key) {
  const e = SIZES[key];
  if (!e) throw new Error(`Unknown size key: ${key}`);
  return e;
}

export function getDefault(key) {
  return { ...entry(key).default };
}

export function getMin(key) {
  return { ...entry(key).min };
}

export function belowMin(key, bounds) {
  const min = entry(key).min;
  return bounds.width < min.width || bounds.height < min.height;
}

export function clampToMin(key, bounds) {
  const min = entry(key).min;
  return {
    ...bounds,
    width: Math.max(bounds.width, min.width),
    height: Math.max(bounds.height, min.height)
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test client/shared/sizes.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add client/shared/sizes.mjs client/shared/sizes.test.mjs
git commit -m "feat: add per-type size table with min/clamp helpers"
```

---

### Task 3: Type resolution (pure) — `client/shared/types.mjs`

**Files:**
- Create: `client/shared/types.mjs`
- Test: `client/shared/types.test.mjs`

The glue layer supplies an `isType(typeString) => boolean` predicate (backed by bpmn-js `is`). This module maps an element to its size key purely, so it is testable without bpmn-js.

- [ ] **Step 1: Write the failing test**

```js
// client/shared/types.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSizeKey, isResizable } from './types.mjs';

// Build an isType predicate from a list of types the element "is".
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test client/shared/types.test.mjs`
Expected: FAIL — cannot find module `./types.mjs`.

- [ ] **Step 3: Write `client/shared/types.mjs`**

```js
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

// isType: (typeString) => boolean
export function resolveSizeKey(isType) {
  for (const { key, type } of RULES) {
    if (isType(type)) return key;
  }
  return null;
}

export function isResizable(isType) {
  return resolveSizeKey(isType) !== null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test client/shared/types.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add client/shared/types.mjs client/shared/types.test.mjs
git commit -m "feat: add pure size-key resolution for resizable types"
```

---

### Task 4: Fit-to-label math (pure) — `client/fit-to-label/compute.mjs`

**Files:**
- Create: `client/fit-to-label/compute.mjs`
- Test: `client/fit-to-label/compute.test.mjs`

`computeFitBounds` takes the current bounds, the measured text dimensions (from `textRenderer`), padding, and a minimum size. It grows height to fit the text (width is kept — text wraps to the current width), never going below the minimum, and keeps the top-left anchored.

- [ ] **Step 1: Write the failing test**

```js
// client/fit-to-label/compute.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFitBounds } from './compute.mjs';

const min = { width: 60, height: 50 };

test('grows height to fit tall text plus padding, keeps x/y/width', () => {
  const out = computeFitBounds(
    { x: 10, y: 20, width: 100, height: 80 },
    { width: 90, height: 120 },
    { top: 5, right: 5, bottom: 5, left: 5 },
    min
  );
  assert.equal(out.x, 10);
  assert.equal(out.y, 20);
  assert.equal(out.width, 100);
  assert.equal(out.height, 130); // 120 + 5 + 5
});

test('never shrinks below minimum height', () => {
  const out = computeFitBounds(
    { x: 0, y: 0, width: 100, height: 80 },
    { width: 10, height: 10 },
    { top: 5, right: 5, bottom: 5, left: 5 },
    min
  );
  assert.equal(out.height, 50);
});

test('returns null when text dimensions are not usable', () => {
  assert.equal(
    computeFitBounds({ x: 0, y: 0, width: 100, height: 80 }, { width: 0, height: 0 }, {}, min),
    null
  );
  assert.equal(
    computeFitBounds({ x: 0, y: 0, width: 100, height: 80 }, { width: NaN, height: 10 }, {}, min),
    null
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test client/fit-to-label/compute.test.mjs`
Expected: FAIL — cannot find module `./compute.mjs`.

- [ ] **Step 3: Write `client/fit-to-label/compute.mjs`**

```js
// currentBounds: { x, y, width, height }
// textDims:      { width, height } measured by textRenderer at currentBounds.width
// padding:       { top, right, bottom, left } (any missing side treated as 0)
// min:           { width, height }
// Returns new bounds, or null if text dimensions are unusable.
export function computeFitBounds(currentBounds, textDims, padding, min) {
  if (!textDims || !Number.isFinite(textDims.height) || !Number.isFinite(textDims.width)) {
    return null;
  }
  if (textDims.width <= 0 || textDims.height <= 0) {
    return null;
  }

  const top = padding.top || 0;
  const bottom = padding.bottom || 0;

  const neededHeight = Math.max(textDims.height + top + bottom, min.height);

  return {
    x: currentBounds.x,
    y: currentBounds.y,
    width: Math.max(currentBounds.width, min.width),
    height: neededHeight
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test client/fit-to-label/compute.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add client/fit-to-label/compute.mjs client/fit-to-label/compute.test.mjs
git commit -m "feat: add pure fit-to-label bounds computation"
```

---

### Task 5: Resize rules module (glue) — `client/resize-rules/index.js`

Makes the resizable set resizable and blocks sub-minimum sizes. This is the first module wired into `client.js`; after it you can verify resizing in the live Modeler.

**Files:**
- Create: `client/resize-rules/index.js`
- Modify: `client/client.js`

- [ ] **Step 1: Write `client/resize-rules/index.js`**

```js
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
```

- [ ] **Step 2: Wire it into `client/client.js`**

```js
import { registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

import resizeRules from './resize-rules';

registerBpmnJSPlugin({
  __depends__: [resizeRules]
});
```

- [ ] **Step 3: Build, deploy, restart**

Run: `npm run bundle && npm run deploy`
Then fully close and reopen Camunda Modeler.
Expected: no build errors; `Deployed to ...` printed.

- [ ] **Step 4: Manual verification (live Modeler)**

- Open a new BPMN diagram. Add a Task, a Start Event, an Exclusive Gateway, a Data Object, a Text Annotation, an expanded Sub-Process.
- Select the Task: resize handles appear; drag to enlarge — it resizes; try to shrink past ~60×50 — it stops at the minimum.
- Select the Start Event and the Gateway: **no** resize handles (still fixed).
- Confirm Data Object, Text Annotation, Sub-Process all show handles and resize.
- Press Ctrl+Z after a resize: the resize is undone in one step.
- Open DevTools (Help → Toggle Developer Tools) → Console: no plugin errors.

- [ ] **Step 5: Commit**

```bash
git add client/resize-rules/index.js client/client.js
git commit -m "feat: make portable element set resizable with min-size enforcement"
```

---

### Task 6: Fit-to-label module (glue) — `client/fit-to-label/index.js`

Adds a context-pad button and an editor action that resize a shape to fit its label, using bpmn-js `textRenderer` to measure and the pure `computeFitBounds`.

**Files:**
- Create: `client/fit-to-label/index.js`
- Modify: `client/client.js`

- [ ] **Step 1: Write `client/fit-to-label/index.js`**

```js
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

    // Measure the label wrapped to the current width.
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
```

- [ ] **Step 2: Add the icon CSS and module wiring**

In `client/client.js`, add the import and a small injected style for the context-pad icons (defined once here; reused by reset-size in Task 7):

```js
import { registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

import resizeRules from './resize-rules';
import fitToLabel from './fit-to-label';

const style = document.createElement('style');
style.textContent = `
  .rp-icon-fit::before { content: "\\21F2"; font-style: normal; }
  .rp-icon-reset::before { content: "\\21BA"; font-style: normal; }
`;
document.head.appendChild(style);

registerBpmnJSPlugin({
  __depends__: [resizeRules, fitToLabel]
});
```

- [ ] **Step 3: Build, deploy, restart**

Run: `npm run bundle && npm run deploy`
Then fully restart Camunda Modeler.
Expected: no build errors.

- [ ] **Step 4: Manual verification**

- Create a Task and give it a very long name (e.g. paste a 60-character word).
- Select it: a "Fit to label" button (⇲ icon) appears in the context pad.
- Click it: the task grows in height so the full label fits; one Ctrl+Z reverts it.
- Select the Task and run the editor action via console: in DevTools console, the plugin's action is registered (no error). (Keybinding is added in a later iteration; context-pad button is the primary surface.)
- Try on a shape with no name: clicking does nothing, no error.

- [ ] **Step 5: Commit**

```bash
git add client/fit-to-label/index.js client/client.js
git commit -m "feat: add on-demand fit-to-label via context pad and editor action"
```

---

### Task 7: Reset-to-default-size module (glue) — `client/reset-size/index.js`

**Files:**
- Create: `client/reset-size/index.js`
- Modify: `client/client.js`

- [ ] **Step 1: Write `client/reset-size/index.js`**

```js
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import { resolveSizeKey } from '../shared/types.mjs';
import { getDefault } from '../shared/sizes.mjs';

class ResetSize {
  constructor(contextPad, modeling, editorActions, selection) {
    this._modeling = modeling;
    this._selection = selection;

    contextPad.registerProvider(this);

    editorActions.register({
      resetSize: () => {
        selection.get().forEach((el) => this.reset(el));
      }
    });
  }

  _sizeKey(element) {
    let key = resolveSizeKey((t) => is(element, t));
    if (key === 'subprocess' && !isExpanded(element)) key = 'task';
    return key;
  }

  reset(element) {
    const key = this._sizeKey(element);
    if (!key) return;

    const def = getDefault(key);
    this._modeling.resizeShape(element, {
      x: element.x,
      y: element.y,
      width: def.width,
      height: def.height
    });
  }

  getContextPadEntries(element) {
    if (!this._sizeKey(element)) return {};
    const self = this;
    return {
      'reset-size': {
        group: 'edit',
        className: 'rp-icon-reset',
        title: 'Reset to default size',
        action: {
          click: function () { self.reset(element); }
        }
      }
    };
  }
}

ResetSize.$inject = ['contextPad', 'modeling', 'editorActions', 'selection'];

export default {
  __init__: ['resizePlusResetSize'],
  resizePlusResetSize: ['type', ResetSize]
};
```

- [ ] **Step 2: Wire into `client/client.js`**

Add to imports and `__depends__`:

```js
import resetSize from './reset-size';
```

```js
registerBpmnJSPlugin({
  __depends__: [resizeRules, fitToLabel, resetSize]
});
```

- [ ] **Step 3: Build, deploy, restart**

Run: `npm run bundle && npm run deploy`
Then fully restart Camunda Modeler.

- [ ] **Step 4: Manual verification**

- Resize a Task to an odd size, then select it and click the "Reset to default size" (↺) context-pad button: it snaps back to 100×80.
- Reset a Sub-Process: snaps to 350×200.
- One Ctrl+Z reverts the reset.

- [ ] **Step 5: Commit**

```bash
git add client/reset-size/index.js client/client.js
git commit -m "feat: add reset-to-default-size via context pad and editor action"
```

---

### Task 8: Keyboard resize module (glue) — `client/keyboard-resize/index.js`

Ctrl+Shift+Arrow grows the selected resizable shape from its bottom-right corner; adding Alt shrinks it. Step = 10px (grid size). Routed through `modeling.resizeShape` for single-step undo.

**Files:**
- Create: `client/keyboard-resize/index.js`
- Modify: `client/client.js`

- [ ] **Step 1: Write `client/keyboard-resize/index.js`**

```js
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import { resolveSizeKey } from '../shared/types.mjs';
import { clampToMin } from '../shared/sizes.mjs';

const STEP = 10;
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

class KeyboardResize {
  constructor(keyboard, selection, modeling) {
    this._modeling = modeling;
    this._selection = selection;

    keyboard.addListener((context) => this._handle(context));
  }

  _sizeKey(element) {
    let key = resolveSizeKey((t) => is(element, t));
    if (key === 'subprocess' && !isExpanded(element)) key = 'task';
    return key;
  }

  _handle(context) {
    const event = context.keyEvent;

    if (!event.ctrlKey || !event.shiftKey) return;
    if (!ARROWS.includes(event.key)) return;

    const selected = this._selection.get();
    if (selected.length !== 1) return;

    const element = selected[0];
    const key = this._sizeKey(element);
    if (!key) return;

    const shrink = event.altKey;
    const delta = shrink ? -STEP : STEP;

    let width = element.width;
    let height = element.height;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      width += delta;
    } else {
      height += delta;
    }

    const bounds = clampToMin(key, {
      x: element.x,
      y: element.y,
      width,
      height
    });

    this._modeling.resizeShape(element, bounds);

    event.preventDefault();
    return true; // handled — stop other keyboard listeners
  }
}

KeyboardResize.$inject = ['keyboard', 'selection', 'modeling'];

export default {
  __init__: ['resizePlusKeyboardResize'],
  resizePlusKeyboardResize: ['type', KeyboardResize]
};
```

- [ ] **Step 2: Wire into `client/client.js`**

```js
import keyboardResize from './keyboard-resize';
```

```js
registerBpmnJSPlugin({
  __depends__: [resizeRules, fitToLabel, resetSize, keyboardResize]
});
```

- [ ] **Step 3: Build, deploy, restart**

Run: `npm run bundle && npm run deploy`
Then fully restart Camunda Modeler.

- [ ] **Step 4: Manual verification**

- Select a single Task. Press Ctrl+Shift+ArrowRight repeatedly: width grows by 10px each press. Ctrl+Shift+ArrowDown: height grows.
- Add Alt (Ctrl+Shift+Alt+ArrowRight): width shrinks, stopping at the minimum.
- Confirm bare arrow keys still move the element (our listener only fires with Ctrl+Shift).
- Confirm each press is one undo step.
- If Ctrl+Shift+Arrow conflicts with a Modeler default on your build, note it; the binding lives in one place (`_handle`) and is trivial to change.

- [ ] **Step 5: Commit**

```bash
git add client/keyboard-resize/index.js client/client.js
git commit -m "feat: add Ctrl+Shift+Arrow keyboard resize"
```

---

### Task 9: Aspect-ratio lock module (glue) — `client/aspect-lock/index.js`

**Riskiest task** (flagged in the spec). While a resize drag is active, if Shift is held, constrain the new bounds to the element's original width:height ratio. Implemented by listening to `resize.move` after diagram-js computes `context.newBounds`, then overwriting it. If it misbehaves, this module can be dropped from `client.js` without affecting any other feature.

**Files:**
- Create: `client/aspect-lock/index.js`
- Modify: `client/client.js`

- [ ] **Step 1: Write `client/aspect-lock/index.js`**

```js
const LOW_PRIORITY = 500; // run after diagram-js Resize has set context.newBounds

class AspectLock {
  constructor(eventBus) {
    eventBus.on('resize.move', LOW_PRIORITY, (event) => {
      const context = event.context;
      const original = context.shape;
      const newBounds = context.newBounds;

      // Only constrain when Shift is held during the drag.
      const oe = event.originalEvent;
      const shiftHeld = oe && (oe.shiftKey || (oe.sourceEvent && oe.sourceEvent.shiftKey));
      if (!shiftHeld || !newBounds || !original.width || !original.height) {
        return;
      }

      const ratio = original.width / original.height;

      // Pick the larger relative change as the driver to keep motion intuitive.
      const dw = Math.abs(newBounds.width - original.width);
      const dh = Math.abs(newBounds.height - original.height);

      let width = newBounds.width;
      let height = newBounds.height;

      if (dw >= dh) {
        height = Math.round(width / ratio);
      } else {
        width = Math.round(height * ratio);
      }

      // Keep the anchor corner fixed: diagram-js encodes direction in context.direction
      // (e.g. 'se','nw','ne','sw'). Adjust x/y so the opposite corner stays put.
      const dir = context.direction || 'se';
      const west = dir.indexOf('w') !== -1;
      const north = dir.indexOf('n') !== -1;

      const x = west ? (newBounds.x + newBounds.width - width) : newBounds.x;
      const y = north ? (newBounds.y + newBounds.height - height) : newBounds.y;

      context.newBounds = { x, y, width, height };
    });
  }
}

AspectLock.$inject = ['eventBus'];

export default {
  __init__: ['resizePlusAspectLock'],
  resizePlusAspectLock: ['type', AspectLock]
};
```

- [ ] **Step 2: Wire into `client/client.js`**

```js
import aspectLock from './aspect-lock';
```

```js
registerBpmnJSPlugin({
  __depends__: [resizeRules, fitToLabel, resetSize, keyboardResize, aspectLock]
});
```

- [ ] **Step 3: Build, deploy, restart**

Run: `npm run bundle && npm run deploy`
Then fully restart Camunda Modeler.

- [ ] **Step 4: Manual verification**

- Create a Task (100×80, ratio 1.25). Drag the bottom-right (SE) handle while holding **Shift**: width and height grow together keeping the 1.25 ratio.
- Drag the top-left (NW) handle with Shift: the opposite (SE) corner stays anchored.
- Drag without Shift: free resize (unconstrained), confirming the lock is opt-in.
- Open DevTools console: if `context.direction` or `event.originalEvent` shapes differ on this build, log `event` once to inspect and adjust the property reads. If the behavior fights diagram-js, remove `aspectLock` from `client.js` `__depends__`, rebuild/deploy — all other features remain intact.

- [ ] **Step 5: Commit**

```bash
git add client/aspect-lock/index.js client/client.js
git commit -m "feat: add Shift-to-lock aspect ratio during resize drag"
```

---

### Task 10: Flow animation module (glue) — `client/flow-animation/index.js`

A palette button toggles flowing dashes on sequence/message flows. Toggling adds/removes a class on the canvas container; injected CSS animates `stroke-dashoffset` on connection paths under that class. No model mutation. Default off.

**Files:**
- Create: `client/flow-animation/index.js`
- Modify: `client/client.js`

- [ ] **Step 1: Write `client/flow-animation/index.js`**

```js
const ANIMATED_CLASS = 'rp-flow-animated';

const CSS = `
@keyframes rp-flow-dash {
  to { stroke-dashoffset: -24; }
}
.${ANIMATED_CLASS} .djs-connection[data-element-id^="Flow"] .djs-visual > path,
.${ANIMATED_CLASS} .djs-connection[data-element-id^="MessageFlow"] .djs-visual > path,
.${ANIMATED_CLASS} g.djs-connection .djs-visual > path[marker-end] {
  stroke-dasharray: 6 6;
  animation: rp-flow-dash 0.6s linear infinite;
}
`;

class FlowAnimation {
  constructor(palette, canvas) {
    this._canvas = canvas;
    this._on = false;

    this._injectStyle();
    palette.registerProvider(this);
  }

  _injectStyle() {
    if (document.getElementById('rp-flow-animation-style')) return;
    const style = document.createElement('style');
    style.id = 'rp-flow-animation-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  toggle() {
    this._on = !this._on;
    const container = this._canvas.getContainer();
    container.classList.toggle(ANIMATED_CLASS, this._on);
  }

  getPaletteEntries() {
    const self = this;
    return {
      'toggle-flow-animation': {
        group: 'tools',
        className: 'bpmn-icon-connection-multi',
        title: 'Toggle flow animation',
        action: {
          click: function () { self.toggle(); }
        }
      }
    };
  }
}

FlowAnimation.$inject = ['palette', 'canvas'];

export default {
  __init__: ['resizePlusFlowAnimation'],
  resizePlusFlowAnimation: ['type', FlowAnimation]
};
```

- [ ] **Step 2: Wire into `client/client.js`** (final wiring — all seven modules)

```js
import { registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

import resizeRules from './resize-rules';
import fitToLabel from './fit-to-label';
import resetSize from './reset-size';
import keyboardResize from './keyboard-resize';
import aspectLock from './aspect-lock';
import flowAnimation from './flow-animation';

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
    flowAnimation
  ]
});
```

- [ ] **Step 3: Build, deploy, restart**

Run: `npm run bundle && npm run deploy`
Then fully restart Camunda Modeler.

- [ ] **Step 4: Manual verification**

- Draw two Tasks connected by a sequence flow, and (optionally) two pools with a message flow.
- A new "Toggle flow animation" button appears in the palette (left toolbar, tools group).
- Click it: the sequence flow (and message flow) lines show dashes flowing toward the arrowhead. Click again: animation stops.
- Save the diagram, reopen the `.bpmn` file in a text editor / Read tool: confirm the XML is unchanged by the animation toggle (no extra attributes).
- If the CSS selector doesn't match this bpmn-js build's DOM, in DevTools inspect a connection's `<g class="djs-connection">` structure and adjust the selector in `CSS`. The fallback selector (`g.djs-connection .djs-visual > path[marker-end]`) targets any directional connection and should cover sequence + message flows.

- [ ] **Step 5: Commit**

```bash
git add client/flow-animation/index.js client/client.js
git commit -m "feat: add toggleable flowing-dash connection animation"
```

---

### Task 11: README, docs, and final full verification

**Files:**
- Create: `README.md`
- Modify: (none — verification + docs only)

- [ ] **Step 1: Write `README.md`**

```markdown
# Camunda Modeler Plugin: Resize Plus

Resize BPMN elements and more, for Camunda Modeler 5.x.

## Features

- **Resizable elements:** tasks, sub-processes, transactions, ad-hoc sub-processes, call activities, data objects, data stores, groups, text annotations, participants. (Events and gateways stay fixed-size for portability.)
- **Fit to label:** select a shape and click the ⇲ context-pad button to grow it to fit its label.
- **Reset size:** ↺ context-pad button restores a shape's default dimensions.
- **Keyboard resize:** `Ctrl+Shift+Arrow` to grow, add `Alt` to shrink, the selected shape.
- **Aspect-ratio lock:** hold `Shift` while dragging a resize handle to keep the width:height ratio.
- **Flow animation:** palette button toggles flowing dashes along sequence/message flows.

## Build

    npm install
    npm test        # runs pure-logic unit tests (node --test)
    npm run bundle  # builds client/client-bundle.js

## Install (Windows)

    npm run deploy  # copies the plugin into %APPDATA%\camunda-modeler\plugins

Then fully restart Camunda Modeler.

## License

MIT
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all pure-logic tests pass (sizes, types, compute).

- [ ] **Step 3: Production build**

Run: `npm run bundle`
Expected: `client/client-bundle.js` built with no errors/warnings.

- [ ] **Step 4: Deploy and full regression in the Modeler**

Run: `npm run deploy`, restart Modeler, then run through every manual check from Tasks 5–10 once more on a single diagram. Confirm DevTools console is error-free throughout.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add README for resize-plus plugin"
```

---

## Self-Review notes

- **Spec coverage:** resizable set → Task 5; min sizes → Tasks 2 & 5; fit-to-label → Tasks 4 & 6; reset → Task 7; keyboard resize → Task 8; aspect lock → Task 9; flow animation → Task 10; modern build → Task 1; deploy/replace old plugin → Task 1 (`deploy.mjs`) ; testing split → pure (Tasks 2–4) vs manual (Tasks 5–10). All spec sections map to tasks.
- **Naming consistency:** module DI names are unique (`resizePlus*`); shared functions (`resolveSizeKey`, `belowMin`, `clampToMin`, `getDefault`, `getMin`, `computeFitBounds`) are defined in Tasks 2–4 and consumed unchanged in Tasks 5–9.
- **Known live-API risks (flagged for execution):** `textRenderer.getDimensions` option shape (Task 6), `resize.move` event/`context.direction` shape (Task 9), and the flow-animation CSS selector matching the bpmn-js DOM (Task 10). Each task includes a DevTools inspection step and the riskiest (aspect-lock) is independently removable.
```
