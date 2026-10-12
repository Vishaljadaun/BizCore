#!/usr/bin/env bash
# Restore only the disposable CI database. Never accepts a production URL.
set -euo pipefail
[[ "${CI:-}" == "true" && -n "${POSTGRES_CONTAINER:-}" ]] || { echo 'Run in the isolated PostgreSQL CI job.' >&2; exit 1; }
pg() { docker exec "$POSTGRES_CONTAINER" "$@"; }
backup=$(mktemp)
trap 'rm -f "$backup"' EXIT
pg pg_dump -U bizcore_e2e -d bizcore_e2e -Fc > "$backup"
pg createdb -U bizcore_e2e bizcore_restore_check
docker exec -i "$POSTGRES_CONTAINER" pg_restore -U bizcore_e2e -d bizcore_restore_check --exit-on-error < "$backup"
# Compare every application's table, including complete row values, not only counts.
tables=$(pg psql -U bizcore_e2e -d bizcore_e2e -Atc "SELECT quote_ident(schemaname)||'.'||quote_ident(tablename) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1")
count=0
while IFS= read -r table; do
  [[ -n "$table" ]] || continue
  query="SELECT count(*), md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text),'')) FROM $table t"
  original=$(pg psql -U bizcore_e2e -d bizcore_e2e -Atc "$query")
  restored=$(pg psql -U bizcore_e2e -d bizcore_restore_check -Atc "$query")
  [[ "$original" == "$restored" ]] || { echo "Restore verification failed: $table" >&2; exit 1; }
  count=$((count+1))
done <<< "$tables"
[[ "$count" -gt 0 ]]
echo "Restore verified: all rows match in $count application tables."
pg dropdb -U bizcore_e2e bizcore_restore_check
