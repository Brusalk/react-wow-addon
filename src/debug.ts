export function stringify(obj: Record<string | number, any> | Function | string | boolean | number | null, depth = 1): string {
  if (typeof obj === 'string') {
    return `"${obj}"`;
  }
  if (typeof obj === 'function') {
    return `<function>`;
  }
  if (typeof obj === 'boolean' || typeof obj === 'number') {
    return `${obj}`;
  }
  if (typeof obj === 'undefined' || !obj) {
    return 'nil';
  }
  if (depth < 0) {
    return '{ ... }';
  }
  const inner = Object.keys(obj)
    .map(key => `${key}: ${stringify(obj[key], depth - 1)}`)
    .join(', ');
  return `{ ${inner} }`;
}
