# Consumer compatibility gate
Compare two trusted, valid OpenAPI 3.0 JSON documents from the perspective of clients of the baseline. Exit 0 means no breaking change under the policy below, 1 means breaking change, 2 means review required or unreadable input. Findings use JSON Pointer paths.

Removing an operation, response status or response media type is breaking. Adding an operation is compatible. A change to an existing response schema, input parameters, server, security policy or shared components requires review. New status codes and response media types also require review because client behavior may vary. Only title, summary, description and release metadata at explicitly documented locations are ignored. Unrecognized changes default to review. When mixed with known breakage the report retains all findings and exits 1. Invalid input exits 2 without a report.

This is a structural diff policy, not a full OpenAPI validator. Validate the inputs separately. Local and external references are compared as text. Changing an external file without changing its reference is outside the comparison; bundle contracts before comparison.
