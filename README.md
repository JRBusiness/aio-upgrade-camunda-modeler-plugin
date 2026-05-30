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
