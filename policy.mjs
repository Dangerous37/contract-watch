import { isDeepStrictEqual as equal } from 'node:util';

const methods = new Set(['get','put','post','delete','options','head','patch','trace']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pointer = (base, key) => base + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1');

function validate(doc) {
  if (!object(doc) || !/^3\.0\.\d+$/.test(doc.openapi) || !object(doc.info) ||
      typeof doc.info.title !== 'string' || typeof doc.info.version !== 'string' || !object(doc.paths)) {
    throw new Error('Expected an OpenAPI 3.0 JSON document with info and paths');
  }
  for (const [path, item] of Object.entries(doc.paths)) {
    if (path.startsWith('x-')) continue;
    if (!path.startsWith('/') || !object(item)) throw new Error('Invalid path item');
    for (const [key, op] of Object.entries(item)) {
      if (methods.has(key) && (!object(op) || !object(op.responses) || !Object.keys(op.responses).length)) {
        throw new Error('Operation requires a responses map');
      }
    }
  }
}

export function compare(oldDoc, newDoc) {
  validate(oldDoc);
  validate(newDoc);
  const findings = [];
  const report = (kind, path, reason) => findings.push({ kind, path, reason });
  function walk(before, after, at, level) {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      const path = pointer(at, key);
      const old = before[key], current = after[key];
      if (equal(old, current) && Object.hasOwn(before,key) === Object.hasOwn(after,key)) continue;
      if ((level === 'info' && ['title','description','version'].includes(key)) ||
          (['item','operation'].includes(level) && ['summary','description'].includes(key)) ||
          (level === 'response' && key === 'description')) continue;
      let child;
      if (level === 'root' && ['info','paths'].includes(key)) child = key;
      if (level === 'paths' && key.startsWith('/')) child = 'item';
      if (level === 'item' && methods.has(key)) child = 'operation';
      if (level === 'operation' && key === 'responses') child = 'responses';
      if (level === 'responses' && !key.startsWith('x-')) child = 'response';
      if (level === 'response' && key === 'content') child = 'content';
      if (child && object(old) && object(current)) {
        walk(old, current, path, child);
      } else if (!Object.hasOwn(after,key) && (['operation','response','content'].includes(child) || level === 'content' ||
          (child === 'item' && Object.keys(old).some(k => methods.has(k))))) {
        report('breaking', path, 'Removed from the baseline contract');
      } else if (!Object.hasOwn(before,key) && (child === 'operation' || (child === 'item' && !Object.hasOwn(current,'$ref')))) {
        report('compatible', path, 'Added endpoint');
      } else {
        report('review', path, 'Changed contract requires consumer review');
      }
    }
  }
  walk(oldDoc, newDoc, '', 'root');
  const kinds = findings.map(row => row.kind);
  return { verdict: kinds.includes('breaking') ? 'breaking' : kinds.includes('review') ? 'review' : 'compatible', findings };
}
