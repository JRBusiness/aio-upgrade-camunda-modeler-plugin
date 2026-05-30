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
