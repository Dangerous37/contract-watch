import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseline = fileURLToPath(new URL('./baseline.json', import.meta.url));
const cli = fileURLToPath(new URL('./cli.mjs', import.meta.url));
function run(candidate) {
  return spawnSync(process.execPath, [cli, baseline, candidate], { encoding: 'utf8' });
}
function scenario(change) {
  const doc = JSON.parse(readFileSync(baseline));
  change(doc, doc.paths['/bookings'].get.responses);
  const dir = mkdtempSync(join(tmpdir(), 'contract-watch-'));
  try {
    const path = join(dir, 'candidate.json');
    writeFileSync(path, JSON.stringify(doc));
    return run(path);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('media type removal is breaking even with a replacement', () => {
  const result = run(fileURLToPath(new URL('./candidate.json', import.meta.url)));
  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(result.stdout).findings.map(f => [f.kind,f.path]), [
    ['breaking','/paths/~1bookings/get/responses/200/content/application~1json'],
    ['review','/paths/~1bookings/get/responses/200/content/text~1plain']
  ]);
});
test('adding an operation and changing release metadata is compatible', () => {
  assert.equal(scenario(doc => { doc.info.version = '2'; doc.paths['/new'] = doc.paths['/bookings']; }).status, 0);
});
test('changed constraints and added statuses require review', () => {
  for (const change of [
    (_, responses) => { responses['200'].content['application/json'].schema.maxItems = 5; },
    (_, responses) => { responses['429'] = { description: 'Limited' }; },
    doc => { doc.security = [{ bearer: [] }]; }
  ]) assert.equal(scenario(change).status, 2);
});
test('removed endpoint breaks clients', () => {
  assert.equal(scenario(doc => { delete doc.paths['/bookings']; }).status, 1);
});
test('malformed operation fails without a report', () => {
  const result = scenario(doc => { doc.paths['/bookings'].get = {}; });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /responses/);
});
