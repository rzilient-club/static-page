#!/usr/bin/env bash
# ===========================================================================
#  fetch-status.sh — Pulls live data from Honeybadger API and writes
#  a static status-data.json consumed by status.html
#
#  Usage:
#    chmod +x fetch-status.sh
#    ./fetch-status.sh
#
#  Cron (every 5 min):
#    */5 * * * * /path/to/fetch-status.sh
#
#  Env vars:
#    HB_TOKEN      — Honeybadger auth token (required)
#    OUTPUT_DIR    — Where to write status-data.json (default: script dir)
# ===========================================================================

set -euo pipefail

HB_TOKEN="${HB_TOKEN:?Error: HB_TOKEN environment variable is required}"
HB_BASE="https://app.honeybadger.io/v2"
OUTPUT_DIR="${OUTPUT_DIR:-$(dirname "$0")}"
OUTPUT_FILE="${OUTPUT_DIR}/status-data.json"
TMP_FILE="${OUTPUT_FILE}.tmp"

PROJECTS=(79525 80270)

auth_header="$(echo -n "${HB_TOKEN}:" | base64)"

hb_get() {
  curl -sf \
    -H "Accept: application/json" \
    -H "Authorization: Basic ${auth_header}" \
    "${HB_BASE}${1}"
}

# Collect all sites from all projects
sites_json="[]"
for pid in "${PROJECTS[@]}"; do
  project_json=$(hb_get "/projects/${pid}")

  # Extract sites and enrich with projectId
  project_sites=$(echo "$project_json" | jq --argjson pid "$pid" '
    [.sites[] | {
      id: .id,
      projectId: $pid,
      name: .name,
      url: .url,
      state: .state,
      last_checked_at: .last_checked_at
    }]
  ')

  sites_json=$(echo "$sites_json $project_sites" | jq -s '.[0] + .[1]')
done

# Measure response time for each site by curling its actual URL
site_count=$(echo "$sites_json" | jq 'length')
for i in $(seq 0 $((site_count - 1))); do
  url=$(echo "$sites_json" | jq -r ".[$i].url")

  # Curl the real endpoint, capture total time in ms
  response_ms=$(curl -so /dev/null -w '%{time_total}' --max-time 10 "$url" 2>/dev/null || echo "0")
  # Convert seconds to integer milliseconds
  response_ms=$(echo "$response_ms" | awk '{printf "%d", $1 * 1000}')

  # Inject response_ms into the site object
  sites_json=$(echo "$sites_json" | jq --argjson i "$i" --argjson ms "$response_ms" '
    .[$i].response_ms = $ms
  ')
done

# Fetch outages for each site
outages_json="[]"
site_count=$(echo "$sites_json" | jq 'length')

for i in $(seq 0 $((site_count - 1))); do
  site=$(echo "$sites_json" | jq ".[$i]")
  pid=$(echo "$site" | jq -r '.projectId')
  sid=$(echo "$site" | jq -r '.id')
  name=$(echo "$site" | jq -r '.name')

  site_outages=$(hb_get "/projects/${pid}/sites/${sid}/outages" 2>/dev/null || echo '{"results":[]}')

  enriched=$(echo "$site_outages" | jq --arg name "$name" --arg sid "$sid" '
    [(.results // [])[] | {
      site_id: $sid,
      site_name: $name,
      down_at: .down_at,
      up_at: (.up_at // .down_at),
      status: .status,
      reason: (.reason // "Unknown" | split("\n")[0])
    }]
  ')

  outages_json=$(echo "$outages_json $enriched" | jq -s '.[0] + .[1]')
done

# Assemble final JSON
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq -n \
  --arg fetched_at "$now" \
  --argjson sites "$sites_json" \
  --argjson outages "$outages_json" \
  '{
    fetched_at: $fetched_at,
    sites: $sites,
    outages: $outages
  }' > "$TMP_FILE"

# Atomic move
mv "$TMP_FILE" "$OUTPUT_FILE"

echo "[$(date)] ✓ status-data.json updated ($(echo "$sites_json" | jq 'length') sites, $(echo "$outages_json" | jq 'length') outages)"