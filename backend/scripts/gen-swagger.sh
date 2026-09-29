#!/usr/bin/env bash
# Regenerates API docs from swag annotations.
#
# 1. swag init parses @-annotations across the codebase and emits Swagger 2.0
#    (docs/docs.go, docs/swagger.json, docs/swagger.yaml).
# 2. swagger2openapi converts that 2.0 spec into OpenAPI 3.1
#    (docs/openapi.json, docs/openapi.yaml) — swag itself has no 3.x output.
#
# Requirements: `go install github.com/swaggo/swag/cmd/swag@latest` (on PATH),
# and Node/npx available for swagger2openapi (fetched on demand via npx).
set -euo pipefail
cd "$(dirname "$0")/.."

swag init -g cmd/api/main.go -d ./ --parseDependency --parseInternal -o ./docs

npx --yes swagger2openapi docs/swagger.json --targetVersion 3.1.0 -y -o docs/openapi.yaml
npx --yes swagger2openapi docs/swagger.json --targetVersion 3.1.0 -y -o docs/openapi.json

echo "Done: docs/swagger.{json,yaml} (2.0), docs/openapi.{json,yaml} (3.1)"
