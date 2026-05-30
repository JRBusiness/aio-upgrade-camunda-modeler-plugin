# Camunda ResizePlus

A plugin for the Camunda Modeler (5.x) that makes BPMN elements resizable and
adds a few related editing conveniences.

Out of the box the Camunda Modeler only lets you resize pools and expanded
sub-processes. This plugin extends resizing to most other shapes and throws in
keyboard resizing, fit-to-label, an aspect-ratio lock, an animated flow line,
and some control over the collapsed sub-process marker.

## What it does

Resizing

- Tasks (every task type), sub-processes, transactions, ad-hoc sub-processes,
  call activities, data objects, data stores, groups, text annotations and
  participants can be resized by dragging their handles.
- Events and gateways are deliberately left at their fixed BPMN sizes so
  diagrams stay portable across tools.
- Each element type has a minimum size, so a shape can't be collapsed to
  nothing by accident.

Editing helpers

- Fit to label: select a shape and use the "Fit to label" button in the context
  pad to grow it until the whole label fits.
- Reset size: the "Reset to default size" button in the context pad puts a shape
  back to its standard dimensions.
- Keyboard resize: with a shape selected, Ctrl+Shift+Arrow grows it; hold Alt as
  well to shrink.
- Aspect-ratio lock: hold Shift while dragging a resize handle to keep the
  original width-to-height ratio.

Connections

- Flow animation: a palette button toggles an animated dashed line along
  sequence and message flows. It is a viewing aid only.

Collapsed sub-process marker

- Two palette buttons let you hide or show the "+" marker on collapsed
  sub-processes and cycle its position between bottom-center and the four
  corners.

Every size change goes through the modeler's command stack, so all of them can
be undone with Ctrl+Z. The flow animation and marker options are display only
and are not written to the BPMN XML.

## Building

    npm install
    npm test
    npm run bundle

`npm test` runs the unit tests for the plugin's pure logic with Node's built-in
test runner. `npm run bundle` builds `client/client-bundle.js` with webpack.

## Installing

On Windows:

    npm run deploy

That copies the plugin into `%APPDATA%\camunda-modeler\plugins`. On macOS or
Linux, copy the plugin folder (the one containing `index.js`) into the Camunda
Modeler plugins directory by hand. Restart the Modeler afterwards, since plugins
are only loaded at startup.

## License

MIT
