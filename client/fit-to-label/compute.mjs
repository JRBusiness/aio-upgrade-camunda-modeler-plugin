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
