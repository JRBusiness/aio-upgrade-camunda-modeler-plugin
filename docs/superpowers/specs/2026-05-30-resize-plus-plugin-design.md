# Camunda Modeler Plugin: Resize Plus — Design

**Date:** 2026-05-30
**Status:** Approved (pending spec review)
**Supersedes:** `camunda-modeler-plugin-resize-tasks` (philippfromme, 2019)

## Summary

A modern, ground-up rewrite and expansion of the "resize tasks" plugin for
Camunda Modeler 5.47. The original (~15 lines, webpack 4 / bpmn-js 3.x, 2019)
only made `bpmn:Task` shapes resizable. This plugin keeps that capability and
adds: more resizable element types, on-demand auto-fit-to-label, keyboard
resizing, per-type minimum sizes, reset-to-default size, aspect-ratio lock, and
a toggleable flowing-dashes ("marching ants") animation on directional
connections.

All built on current tooling (webpack 5 + Babel) targeting the bpmn-js shipped
in Modeler 5.47 and `camunda-modeler-plugin-helpers` 4.x.

## Goals

1. Resize a portable, BPMN-conventional set of elements.
2. Auto-fit a shape to its label on demand.
3. Pleasant resize UX: keyboard resize, sensible minimums, reset, aspect lock.
4. Modern, maintainable, future-compatible build.
5. Flowing-dashes flow animation on sequence/message flows (toggleable).

## Non-Goals

- Resizing events and gateways (kept fixed-size for portability / BPMN
  convention). No opt-in toggle for them in this version.
- Animated token simulation / process execution (out of scope — flow animation
  is purely a cosmetic flowing-dash effect, no execution-order logic).
- Persisted configuration across sessions (toggles are per-session).
- DMN / CMMN editors. BPMN only.

## Architecture

A single client bundle (`client/client-bundle.js`) loaded by the Modeler via
`index.js` → `registerBpmnJSPlugin`. The bundle wires a set of small,
independent diagram-js modules through `client/client.js`. Each module has one
responsibility, is dependency-injected, and can be reasoned about in isolation.

```
index.js                      -> { name, script: client/client-bundle.js }
client/client.js              -> registerBpmnJSPlugin(combined module)
client/
  resize-rules/               -> shape.resize rules
  min-bounds/                 -> per-type minimum size enforcement
  fit-to-label/               -> measure label, resize to fit (on-demand)
  reset-size/                 -> restore canonical default dimensions
  keyboard-resize/            -> Ctrl+Shift+Arrow resize
  aspect-lock/                -> modifier-held aspect-ratio constraint during drag
  flow-animation/             -> toggleable flowing-dash animation
  shared/
    sizes.js                  -> per-type { default, min } size table (single source of truth)
    resizable.js              -> isResizable(element) predicate (shared by modules)
```

### Modules

| Module | Responsibility | Surface |
|---|---|---|
| `resize-rules` | Add `shape.resize` rule (priority `Infinity`) allowing the resizable set; defer to `bpmnRules.canResize` otherwise. | diagram-js `RuleProvider` |
| `min-bounds` | Clamp resize so shapes can't go below per-type minimum (from `shared/sizes.js`). | `shape.resize` rule returning min-bounds object |
| `fit-to-label` | Measure label via `textRenderer.getDimensions`, compute bounds that fit text + padding, apply via `modeling.resizeShape`. | context-pad entry + editor action `fitToLabel` |
| `reset-size` | Resize element back to canonical default from `shared/sizes.js`. | context-pad entry + editor action `resetSize` |
| `keyboard-resize` | On Ctrl+Shift+Arrow, grow/shrink active resizable selection by a grid step via `modeling.resizeShape`. | diagram-js `keyboard` listener + editor action |
| `aspect-lock` | While a resize drag is active and a modifier (Shift) is held, constrain `resize.move` deltas to preserve original w:h ratio. | `eventBus` `resize.move` listener |
| `flow-animation` | Toggle a `bjs-flow-animated` class on the canvas container; injected CSS animates `stroke-dashoffset` on sequence/message-flow paths. | palette entry (toggle) + editor action `toggleFlowAnimation` |

### Resizable element set

Resizable (from `shared/resizable.js`):
- `bpmn:Task` and all subtypes (UserTask, ServiceTask, ScriptTask, etc.)
- `bpmn:SubProcess`, `bpmn:AdHocSubProcess`, `bpmn:Transaction`, `bpmn:CallActivity`
- `bpmn:DataObjectReference`, `bpmn:DataStoreReference`
- `bpmn:Group`
- `bpmn:TextAnnotation`
- `bpmn:Participant` (already resizable by default; covered so min/reset apply)

Explicitly NOT resizable: `bpmn:Event` (all), `bpmn:Gateway` (all). The
`resize-rules` rule does not allow these; default bpmn-js behavior (fixed) wins.

### Per-type size table (`shared/sizes.js`)

Single source of truth used by `min-bounds`, `reset-size`, and `keyboard-resize`.
Defaults match bpmn-js canonical sizes where one exists:

| Type | default (w×h) | min (w×h) |
|---|---|---|
| Task family | 100×80 | 60×50 |
| SubProcess / Transaction / AdHoc | 350×200 | 100×80 |
| CallActivity | 100×80 | 60×50 |
| DataObjectReference | 36×50 | 36×50 |
| DataStoreReference | 50×50 | 36×36 |
| Group | 300×300 | 80×80 |
| TextAnnotation | 100×30 | 50×20 |
| Participant | 600×250 | 200×60 |

(Exact min values finalized during implementation against the live canvas; the
table is the authority and easy to tune.)

## Data Flow

Every size mutation — drag-handle resize, keyboard resize, fit-to-label,
reset-size — resolves to a single call to `modeling.resizeShape(shape, newBounds)`.
This guarantees:
- One undoable command on the command stack per logical action.
- Connected sequence flows re-layout via bpmn-js's normal resize behavior.
- Consistency: all paths share the same min-bounds clamping through the rule.

Flow animation mutates no model state — it only toggles a CSS class on the
container; it is invisible to the command stack and to the saved `.bpmn` XML.

## Keybindings

- **Keyboard resize:** `Ctrl+Shift+Arrow` (grow toward the pressed direction;
  `Ctrl+Shift+Alt+Arrow` or a paired combo to shrink — finalized in impl).
  Chosen to avoid diagram-js defaults: bare arrows (move element/canvas),
  `Ctrl+Z/C/V`.
- **Fit-to-label / Reset-size:** context-pad buttons (no global key) plus
  registered editor actions, so keys can be bound later without code changes.
- **Flow animation:** palette entry (toggle) plus `toggleFlowAnimation` editor
  action.

## Error Handling

- Each action guards preconditions: selection is resizable? element has a label
  (fit-to-label)? If not, the action is a silent no-op — never throws into the
  canvas render loop.
- `min-bounds` clamps rather than rejects: an over-small drag stops at the
  minimum instead of being refused.
- `fit-to-label` falls back to leaving the shape unchanged if `textRenderer`
  returns zero/NaN dimensions (e.g. empty label).
- `flow-animation` toggle is idempotent and safe if invoked with no diagram open.

## Build & Tooling

- `webpack` 5 + `babel-loader` (`@babel/preset-env`), `mode: production` for the
  shipped bundle (the original shipped a `development` bundle).
- Dependencies bundled in: `diagram-js`, `bpmn-js` (for base classes / utils),
  `inherits` if needed. `camunda-modeler-plugin-helpers` ^4 as the registration
  bridge.
- Scripts: `npm run bundle` (build), `npm run bundle:watch`, `npm test`.
- Output: `client/client-bundle.js` referenced by `index.js`.

## Deployment

- Dev project: `C:\Users\dildev\camunda-modeler-plugin-resize-plus\`.
- Install target: `%APPDATA%\camunda-modeler\plugins\camunda-modeler-plugin-resize-plus\`
  (user-data dir; survives Modeler re-extraction/upgrade).
- **Replaces** the existing `camunda-modeler-plugin-resize-tasks` folder there to
  avoid duplicate `shape.resize` rules.
- Activation requires a full Modeler restart.

## Testing

**Automated (bpmn-js test harness, headless):**
- `shared/sizes.js` table integrity (every resizable type has default+min, min ≤ default).
- `min-bounds` clamping math (returns correct floor for sub-min bounds).
- `resizable.js` predicate (correct true/false per type, incl. events/gateways false).
- `fit-to-label` dimension computation given a mocked `textRenderer`.
- `reset-size` produces the table default for a given element.

**Manual (live Modeler — gesture/keyboard/visual, not automatable here):**
- Drag-handle resize appears on each resizable type, absent on events/gateways.
- Ctrl+Shift+Arrow resizes selection; single undo reverts it.
- Fit-to-label and reset-size context-pad buttons behave.
- Aspect-lock holds ratio while Shift held during drag.
- Palette toggle starts/stops flowing dashes on sequence + message flows; off by default; saved XML unchanged.

The implementation report will state explicitly which checks were run
automatically vs verified manually.

## Risks / Open Details

- **Aspect-lock** is the trickiest piece: it intercepts `resize.move` and
  rewrites the delta. Risk of fighting diagram-js's own resize math. Mitigation:
  adjust the context delta only, keep the reference corner fixed, fall back to
  unconstrained resize if the computation is degenerate.
- **Keyboard-resize shrink direction** binding may need iteration against live
  defaults to avoid conflicts; editor action makes rebinding cheap.
- **Flow animation CSS specificity:** must target bpmn-js connection paths
  without overriding selection/hover styling. Scope all rules under the
  container class.
