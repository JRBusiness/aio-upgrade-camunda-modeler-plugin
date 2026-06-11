import { query as domQuery } from 'min-dom';
import { innerSVG } from 'tiny-svg';

import { getFlowVisualCss } from '../shared/flow-visual';

const STYLE_ID = 'rp-export-svg-style';

// Reverse-arrow marker, identical to the one in client/two-way/index.js so the
// exported SVG renders two-way flows the same way the editor does.
const MARKER_ID = 'rp-arrow-back';

const MARKER_HTML =
  '<marker id="' + MARKER_ID + '" viewBox="0 0 20 20" refX="11" refY="10" ' +
  'markerWidth="10" markerHeight="10" orient="auto-start-reverse">' +
  '<path d="M 1 5 L 11 10 L 1 15 Z" style="fill: context-stroke; stroke: context-stroke; stroke-width: 1;" /></marker>';

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
   * Splice the embedded <style> block (and, when missing, the reverse-arrow
   * marker defs) immediately after the opening <svg> tag.
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

    // Embed the live flow-visual stylesheet: the dash keyframes, the dot colour,
    // and the per-line dot motion keyframes generated for the animated two-way
    // flows in this diagram.
    let block =
      '<style type="text/css"><![CDATA[\n' + getFlowVisualCss() + '\n]]></style>';

    // The two-way module injects the reverse-arrow marker into the canvas defs
    // at runtime, so it may already be present in the serialized output. Only
    // add it when missing, to avoid a duplicate marker id.
    if (svg.indexOf('id="' + MARKER_ID + '"') === -1) {
      block += '<defs>' + MARKER_HTML + '</defs>';
    }

    const insertAt = openTagEnd + 1;
    return svg.slice(0, insertAt) + block + svg.slice(insertAt);
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
