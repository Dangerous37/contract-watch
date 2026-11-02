# Contract Watch

A booking service keeps its GET route but switches its successful response from JSON to plain text. An endpoint inventory would miss the change. This CLI compares two OpenAPI 3.0 JSON snapshots and shows which part of the client contract changed.

## Reproduce the incident

Use Node.js 24 and run `npm ci --offline`, then `npm test`. Run `node cli.mjs baseline.json candidate.json` for the sample release. It intentionally returns exit code 1. The report points to the removed media type at `/paths/~1bookings/get/responses/200/content/application~1json`. Comparing the baseline with itself returns 0.

## Use in release checks

Pass the last deployed snapshot as the first argument and the proposed snapshot as the second. Exit 0 allows the release under this policy. Exit 1 flags a breaking removal. Exit 2 asks for review or signals an input error. Valid comparisons write JSON to stdout. Errors write to stderr. A schema change goes to review because compatibility depends on direction and client expectations.

Use validated, bundled OpenAPI 3.0 JSON as input. The tool compares files in memory and does not fetch references, parse YAML, validate the full specification or infer server behavior. Documentation-only edits inside schemas can trigger manual review. See [the policy](CONTRACT.md).

## Resumen en español

Compara dos contratos de una API antes de publicar una versión. Distingue la retirada de una operación o formato de respuesta, la incorporación de una ruta y los cambios que requieren revisión humana.
