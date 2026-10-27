#!/usr/bin/env bash
set -euo pipefail

PROJECT="lyrics-site"
PARALLEL="${1:-5}"

[[ "$PARALLEL" =~ ^[1-9][0-9]*$ ]] || {
  echo "Usage: $0 [parallel-workers]" >&2
  exit 1
}

# Use Wrangler's existing OAuth login.
unset CLOUDFLARE_API_TOKEN

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER="$ROOT/node_modules/.bin/wrangler"

[[ -x "$WRANGLER" ]] || {
  echo "Local Wrangler installation not found." >&2
  exit 1
}

failed=$(mktemp)
trap 'rm -f "$failed"' EXIT

prod_id=""
round=0

while :; do
  deployments=$(
    "$WRANGLER" pages deployment list \
      --project-name "$PROJECT" --json
  )

  jq -e 'type == "array"' >/dev/null <<<"$deployments" || {
    echo "Unexpected deployment list. Aborting." >&2
    exit 1
  }

  current_prod=$(
    "$WRANGLER" pages deployment list       --project-name "$PROJECT"       --environment production --json |
    jq -r '.[0].Id // empty'
  )

  [[ -n "$current_prod" ]] || {
    echo "Cannot identify production. Aborting." >&2
    exit 1
  }

  if [[ -z "$prod_id" ]]; then
    prod_id="$current_prod"
    echo "Protecting production: $prod_id"
  elif [[ "$prod_id" != "$current_prod" ]]; then
    echo "Production changed during cleanup. Aborting." >&2
    exit 1
  fi

  # Wrangler lists newest first. Reverse to oldest first.
  # Never retry IDs that Cloudflare has already refused.
  ids=$(
    jq -r --arg prod "$prod_id" \
      'reverse[] | select(.Id != $prod) | .Id' \
      <<<"$deployments" |
      grep -vxFf "$failed" || true
  )

  [[ -n "$ids" ]] || break

  ((round += 1))
  count=$(wc -l <<<"$ids")

  echo "Batch $round: $count deployments, oldest first."

  printf '%s\n' "$ids" |
    xargs -r -P "$PARALLEL" -n1 bash -c '
      wrangler="$1"
      project="$2"
      failed="$3"
      id="$4"

      if output=$(
        "$wrangler" pages deployment delete "$id" \
          --project-name "$project" --force 2>&1
      ); then
        echo "Deleted: $id"
      else
        echo "$id" >> "$failed"
        echo "Failed: $id" >&2
        printf "%s\n" "$output" | tail -n 5 >&2
      fi
    ' _ "$WRANGLER" "$PROJECT" "$failed"
done

echo
echo "Cleanup finished."
echo "Production retained: $prod_id"

failed_count=$(wc -l < "$failed")
echo "Undeletable or failed deployments: $failed_count"
