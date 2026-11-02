import { readFileSync } from 'node:fs';
import { compare } from './policy.mjs';

try {
  const paths = process.argv.slice(2);
  if (paths.length !== 2) throw new Error('Usage: node cli.mjs BASELINE.json CANDIDATE.json');
  const result = compare(...paths.map(path => JSON.parse(readFileSync(path, 'utf8'))));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = { compatible: 0, breaking: 1, review: 2 }[result.verdict];
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
