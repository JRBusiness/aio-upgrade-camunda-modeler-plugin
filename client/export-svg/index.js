import { query as domQuery } from 'min-dom';
import { innerSVG } from 'tiny-svg';

const STYLE_ID = 'rp-export-svg-style';

// Animation CSS embedded into the exported SVG. Mirrors the rule the
// flow-animation module injects into the page so that connections carrying
// the `rp-flow-animated` class keep animating when the .svg is opened
// standalone in a browser.
const EMBEDDED_CSS =
  '@keyframes rp-flow-dash { to { stroke-dashoffset: -24; } }\n' +
  '.rp-flow-animated .djs-visual path { stroke-dasharray: 6 6; animation: rp-flow-dash 0.6s linear infinite; }';

class ExportSvg {
  constructor(canvas, palette) {
    this._canvas = canvas;

    this._injectStyle();
    palette.registerProvider(this);
  }

  _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.rp-icon-export::before { content: "\\2913"; font-style: normal; font-weight: bold; }';
    document.head.appendChild(style);
  }

  /**
   * Build the diagram SVG string, replicating bpmn-js BaseViewer#saveSVG
   * (bpmn-js 17, node_modules/bpmn-js/lib/BaseViewer.js) but driven off the
   * injected canvas rather than a Viewer instance.
   *
   * @return {string|null} the SVG string, or null if there is no content
   */
  _buildSvg() {
    const canvas = this._canvas;

    const contentNode = canvas.getActiveLayer(),
          defsNode = domQuery(':scope > defs', canvas._svg);

    if (!contentNode) return null;

    const bbox = contentNode.getBBox();

    // guard: empty diagram -> nothing to export
    if (!bbox || (bbox.width === 0 && bbox.height === 0)) return null;

    const contents = innerSVG(contentNode),
          defs = defsNode ? '<defs>' + innerSVG(defsNode) + '</defs>' : '';

    const svg =
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<!-- created with bpmn-js / http://bpmn.io -->\n' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'width="' + bbox.width + '" height="' + bbox.height + '" ' +
      'viewBox="' + bbox.x + ' ' + bbox.y + ' ' + bbox.width + ' ' + bbox.height + '" version="1.1">' +
      defs + contents +
      '</svg>';

    return svg;
  }

  /**
   * Splice the embedded <style> block immediately after the opening <svg> tag.
   *
   * @param {string} svg
   *
   * @return {string}
   */
  _embedAnimationCss(svg) {
    const svgTagStart = svg.indexOf('<svg');
    if (svgTagStart === -1) return svg;

    const openTagEnd = svg.indexOf('>', svgTagStart);
    if (openTagEnd === -1) return svg;

    const styleBlock =
      '<style type="text/css"><![CDATA[\n' + EMBEDDED_CSS + '\n]]></style>';

    const insertAt = openTagEnd + 1;
    return svg.slice(0, insertAt) + styleBlock + svg.slice(insertAt);
  }

  exportSvg() {
    let svg = this._buildSvg();

    // guard: no content / empty bbox -> do nothing, no throw
    if (!svg) return;

    svg = this._embedAnimationCss(svg);

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram-animated.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getPaletteEntries() {
    const self = this;
    return {
      'export-animated-svg': {
        group: 'tools',
        className: 'rp-icon-export',
        title: 'Export animated SVG',
        action: {
          click: function () { self.exportSvg(); }
        }
      }
    };
  }
}

ExportSvg.$inject = ['canvas', 'palette'];

export default {
  __init__: ['resizePlusExportSvg'],
  resizePlusExportSvg: ['type', ExportSvg]
};
