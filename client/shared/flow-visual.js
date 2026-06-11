// Shared rendering for the flow "effects": a solid line carrying a moving dot,
// optionally with a reverse arrowhead (two-way). Both the flow-animation and
// two-way modules call applyFlowVisual() so the look is decided in ONE place
// from BOTH flags at once -- avoiding two modules clobbering the same path.
//
// Why inline styles: bpmn-js writes stroke / markers / stroke-dasharray to the
// path's INLINE style (tiny-svg routes these SVG presentation properties to
// element.style), and inline style beats any stylesheet rule. So our overrides
// must be inline too -- which also makes them serialize straight into the
// exported SVG.
//
// Why the dot moves via `transform: translate()` keyframes (not SMIL
// <animateMotion> and not CSS offset-path): the Windows image preview runs CSS
// animations but ignores SMIL, and CSS offset-path is not reliably applied to
// SVG elements (it left the dot stuck at the origin). A plain transform-translate
// keyframe, sampled along the line, animates everywhere the dashes do AND is
// positioned correctly. The keyframe is generated per line (the points differ),
// kept in the shared <style>, and embedded verbatim into the exported SVG.

const SVG_NS = 'http://www.w3.org/2000/svg';

export const BACK_MARKER_ID = 'rp-arrow-back';

const FX_STYLE_ID = 'rp-flow-visual-style';

const BASE_CSS =
  '@keyframes rp-flow-dash { to { stroke-dashoffset: -24; } }\n' +
  '.rp-flow-dot { fill: #20d0ff; filter: drop-shadow(0 0 3px #20d0ff); pointer-events: none; }';

// elementId -> "@keyframes rp-dot-... { ... }" text for that line's dot.
const dotKeyframes = new Map();

const DOT_SAMPLES = 24; // points sampled along the line; more = smoother bends

function rebuildStyle() {
  const el = document.getElementById(FX_STYLE_ID);
  if (!el) return;
  el.textContent = BASE_CSS + '\n' + Array.from(dotKeyframes.values()).join('\n');
}

export function injectFlowVisualStyle() {
  let el = document.getElementById(FX_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = FX_STYLE_ID;
    document.head.appendChild(el);
  }
  rebuildStyle();
}

// The full stylesheet the exporter bakes into the .svg: base rules plus every
// per-line dot keyframe currently in use.
export function getFlowVisualCss() {
  const el = document.getElementById(FX_STYLE_ID);
  return el ? el.textContent : BASE_CSS;
}

// Reverse-arrow marker, in a persistent ROOT <defs> (bpmn-js wipes the per-
// connection defs on re-render). `context-stroke` makes it match the line color.
export function ensureBackMarker(canvas) {
  const svg = canvas._svg
    || (canvas.getContainer && canvas.getContainer().querySelector('svg'));
  if (!svg) return;
  if (svg.querySelector('#' + BACK_MARKER_ID)) return;
  let defs = svg.querySelector(':scope > defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', BACK_MARKER_ID);
  marker.setAttribute('viewBox', '0 0 20 20');
  marker.setAttribute('refX', '11');
  marker.setAttribute('refY', '10');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '10');
  marker.setAttribute('orient', 'auto-start-reverse');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M 1 5 L 11 10 L 1 15 Z');
  path.style.fill = 'context-stroke';
  path.style.stroke = 'context-stroke';
  path.style.strokeWidth = '1';
  marker.appendChild(path);
  defs.appendChild(marker);
}

/**
 * Render the full effect state on a connection's graphics, from both flags.
 *
 * @param {SVGElement} gfx   the connection's element graphics group
 * @param {{ animated: boolean, twoWay: boolean, id: string }} state
 */
export function applyFlowVisual(gfx, { animated, twoWay, id }) {
  const path = gfx.querySelector('.djs-visual > path');
  if (!path) return;

  // Always rebuild the dot from scratch (idempotent).
  const oldDot = gfx.querySelector('.rp-flow-dot');
  if (oldDot) oldDot.remove();
  const oldGuide = gfx.querySelector('[data-rp-motion]'); // stale guide from older versions
  if (oldGuide) oldGuide.remove();

  if (twoWay) {
    // Solid line with a FILLED arrowhead on BOTH ends. The reverse-arrow marker
    // uses orient="auto-start-reverse", so the same marker points outward at the
    // start (reversed) and at the end (auto) -- one marker, both ends filled.
    path.style.setProperty('stroke-dasharray', 'none');
    path.style.setProperty('animation', 'none');
    path.style.setProperty('marker-start', 'url(#' + BACK_MARKER_ID + ')');
    path.style.setProperty('marker-end', 'url(#' + BACK_MARKER_ID + ')');

    // When also animated: a circle that slides back and forth along the line.
    if (animated) {
      addDot(gfx, path, id);
    }
    return;
  }

  // One-way (not two-way): a single FILLED arrowhead at the target end. For a
  // sequence flow this matches its native arrow; for a message flow it replaces
  // the hollow open arrow so the head reads as solid.
  path.style.setProperty('marker-end', 'url(#' + BACK_MARKER_ID + ')');

  if (animated) {
    // Marching dashes along the line.
    path.style.setProperty('stroke-dasharray', '6 6');
    path.style.setProperty('animation', 'rp-flow-dash 0.6s linear infinite');
    return;
  }

  // Not animated: force the line SOLID. We override stroke-dasharray inline so
  // even message flows (dashed by BPMN default) render solid.
  path.style.setProperty('stroke-dasharray', 'none');
  path.style.removeProperty('animation');
}

function cssIdent(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function addDot(gfx, path, id) {
  let len = 0;
  try { len = path.getTotalLength(); } catch (e) { /* path not measurable yet */ }
  if (!len) return;

  // Sample points along the line in its own (diagram) coordinates.
  const pts = [];
  for (let i = 0; i <= DOT_SAMPLES; i++) {
    const p = path.getPointAtLength((len * i) / DOT_SAMPLES);
    pts.push(round(p.x) + 'px, ' + round(p.y) + 'px');
  }

  const name = 'rp-dot-' + cssIdent(id);

  // out (0->50%) then back (50->100%), following the sampled points.
  let kf = '@keyframes ' + name + ' {\n';
  for (let i = 0; i <= DOT_SAMPLES; i++) {
    const pct = (i / DOT_SAMPLES) * 50;
    kf += '  ' + trim(pct) + '% { transform: translate(' + pts[i] + '); }\n';
  }
  for (let i = 1; i <= DOT_SAMPLES; i++) {
    const pct = 50 + (i / DOT_SAMPLES) * 50;
    kf += '  ' + trim(pct) + '% { transform: translate(' + pts[DOT_SAMPLES - i] + '); }\n';
  }
  kf += '}';

  dotKeyframes.set(id, kf);
  rebuildStyle();

  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', 'rp-flow-dot');
  dot.setAttribute('r', '5');
  dot.style.setProperty('transform', 'translate(' + pts[0] + ')');
  dot.style.setProperty('animation', name + ' 2.2s linear infinite');

  gfx.appendChild(dot);
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function trim(n) {
  return (Math.round(n * 1000) / 1000).toString();
}
