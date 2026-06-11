import { query as domQuery } from 'min-dom';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const STYLE_ID = 'rp-export-gif-style';
const ICON_CSS = '.rp-icon-gif::before { content: "GIF"; font-style: normal; font-weight: bold; font-size: 11px; }';

// Balanced preset. Duration is two dot cycles (2 x 2.2s) so the dot loops
// seamlessly; the short dash pattern's seam is imperceptible.
const DOT_PERIOD = 2.2;   // seconds, matches flow-visual addDot
const DASH_PERIOD = 0.6;  // seconds, matches flow-visual one-way dash
const DURATION = 4.4;     // seconds of animation captured (two dot cycles)
const FPS = 12;           // frames sampled per second of animation
const SPEED = 1.5;        // playback speed-up (>1 = faster); shortens frame delay
const MAX_SIDE = 1000;    // px; longest diagram side is scaled to this

// Static styling for the rendered frames: just the dot's colour. The motion is
// baked into each frame, so no @keyframes are needed.
const FRAME_CSS = '.rp-flow-dot { fill: #20d0ff; filter: drop-shadow(0 0 3px #20d0ff); }';

class ExportGif {
  constructor(canvas, palette) {
    this._canvas = canvas;
    this._busy = false;

    this._injectStyle();
    palette.registerProvider(this);
  }

  _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = ICON_CSS;
    document.head.appendChild(style);
  }

  async exportGif() {
    if (this._busy) return;

    const canvas = this._canvas;
    const contentNode = canvas.getActiveLayer();
    const defsNode = domQuery(':scope > defs', canvas._svg);
    if (!contentNode) return;

    const bbox = contentNode.getBBox();
    if (!bbox || (bbox.width === 0 && bbox.height === 0)) return;

    this._busy = true;
    const overlay = showOverlay('Saving GIF…');
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(bbox.width, bbox.height));
      const outW = Math.max(1, Math.round(bbox.width * scale));
      const outH = Math.max(1, Math.round(bbox.height * scale));

      const defs = defsNode ? '<defs>' + defsNode.innerHTML + '</defs>' : '';

      // Clone the live layer; we mutate the clone per frame and keep the live
      // line paths (still in the document) for measuring the dot position.
      const clone = contentNode.cloneNode(true);
      const dashPaths = collectDashPaths(clone);
      const dotEntries = collectDots(clone, contentNode);

      const frames = Math.round(DURATION * FPS);
      const delay = Math.round(1000 / (FPS * SPEED)); // shorter delay => faster playback

      const gif = GIFEncoder();

      for (let i = 0; i < frames; i++) {
        const t = i / FPS;
        bakeFrame(t, dashPaths, dotEntries);

        const svg =
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
          'width="' + outW + '" height="' + outH + '" ' +
          'viewBox="' + bbox.x + ' ' + bbox.y + ' ' + bbox.width + ' ' + bbox.height + '">' +
          '<style type="text/css">' + FRAME_CSS + '</style>' +
          defs + clone.innerHTML +
          '</svg>';

        const imageData = await rasterize(svg, outW, outH);

        const palette = quantize(imageData.data, 256);
        const indexed = applyPalette(imageData.data, palette);
        gif.writeFrame(indexed, outW, outH, i === 0 ? { palette, delay, repeat: 0 } : { palette, delay });

        overlay.textContent = 'Saving GIF… ' + Math.round(((i + 1) / frames) * 100) + '%';
      }

      gif.finish();
      download(new Blob([gif.bytes()], { type: 'image/gif' }), 'diagram-animated.gif');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[aio-upgrade] GIF export failed', e);
    } finally {
      removeOverlay(overlay);
      this._busy = false;
    }
  }

  getPaletteEntries() {
    const self = this;
    return {
      'export-animated-gif': {
        group: 'tools',
        className: 'rp-icon-gif',
        title: 'GIF',
        action: {
          click: function () { self.exportGif(); }
        }
      }
    };
  }
}

ExportGif.$inject = ['canvas', 'palette'];

// --- frame baking -----------------------------------------------------------

function collectDashPaths(clone) {
  return Array.from(clone.querySelectorAll('.djs-visual > path'))
    .filter((p) => p.style && p.style.animationName === 'rp-flow-dash');
}

function collectDots(clone, liveLayer) {
  return Array.from(clone.querySelectorAll('.rp-flow-dot'))
    .map((dot) => {
      const connGfx = dot.closest('[data-element-id]');
      const id = connGfx && connGfx.getAttribute('data-element-id');
      const sel = id ? '[data-element-id="' + cssEscape(id) + '"] .djs-visual > path' : null;
      const liveLine = sel ? liveLayer.querySelector(sel) : null;
      let len = 0;
      try { len = liveLine ? liveLine.getTotalLength() : 0; } catch (e) { /* not measurable */ }
      return { dot: dot, liveLine: liveLine, len: len };
    })
    .filter((e) => e.liveLine && e.len > 0);
}

function bakeFrame(t, dashPaths, dotEntries) {
  const dashOffset = -24 * ((t / DASH_PERIOD) % 1);
  dashPaths.forEach((p) => {
    p.style.animation = 'none';
    p.style.strokeDashoffset = String(dashOffset);
  });

  dotEntries.forEach(({ dot, liveLine, len }) => {
    const phase = (t / DOT_PERIOD) % 1;
    const frac = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // triangle 0->1->0
    const pt = liveLine.getPointAtLength(len * frac);
    dot.style.animation = 'none';
    dot.style.offsetPath = 'none';
    dot.style.transform = 'translate(' + round(pt.x) + 'px, ' + round(pt.y) + 'px)';
  });
}

// --- rendering / output -----------------------------------------------------

function rasterize(svgString, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  });
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showOverlay(text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText =
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100000;' +
    'background:rgba(0,0,0,0.8);color:#fff;padding:12px 18px;border-radius:6px;' +
    'font:13px sans-serif;pointer-events:none;';
  document.body.appendChild(el);
  return el;
}

function removeOverlay(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

export default {
  __init__: ['resizePlusExportGif'],
  resizePlusExportGif: ['type', ExportGif]
};
