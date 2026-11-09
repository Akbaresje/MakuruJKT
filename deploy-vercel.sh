#!/usr/bin/env bash
#
# One-shot Vercel deploy for the makuru ops app.
#
#   VERCEL_TOKEN=xxx ./deploy-vercel.sh
#
# What it does:
#   1. reads DATABASE_URL / MAKURU_PIN / MAKURU_SECRET / TOKEN_DAYS from vercel/.env.local
#   2. creates (or reuses) the Vercel project through the REST API
#   3. pushes those four variables to production / preview / development
#   4. deploys the vercel/ folder to production with the CLI
#   5. prints the production URL
#
# Nothing secret is written into the repo: the token comes from the
# environment, and .env.local is already git-ignored.

set -euo pipefail

cd "$(dirname "$0")"
ROOT="$PWD"
ENV_FILE="$ROOT/vercel/.env.local"
PROJECT="${PROJECT:-makuru}"

: "${VERCEL_TOKEN:?set VERCEL_TOKEN (vercel.com/account/tokens)}"
[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE"; exit 1; }

api() { # api METHOD PATH [BODY]
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "https://api.vercel.com$path" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "$body"
  else
    curl -sS -X "$method" "https://api.vercel.com$path" \
      -H "Authorization: Bearer $VERCEL_TOKEN"
  fi
}

json() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

echo "== 1/5  whoami =="
api GET /v2/user | json 'd.get("user",{}).get("username") or d.get("error",{}).get("message","?")'

echo "== 2/5  project '$PROJECT' =="
PROJ_JSON="$(api GET "/v9/projects/$PROJECT" || true)"
if echo "$PROJ_JSON" | grep -q '"id"'; then
  echo "   sudah ada, dipakai ulang"
else
  echo "   dibuat baru"
  api POST /v11/projects "{\"name\":\"$PROJECT\",\"framework\":null}" | json 'd.get("id") or d'
fi

echo "== 3/5  environment variables =="
# read the four keys out of .env.local
declare -A VALS=()
while IFS='=' read -r k v; do
  [[ "$k" =~ ^(DATABASE_URL|MAKURU_PIN|MAKURU_SECRET|TOKEN_DAYS)$ ]] || continue
  VALS["$k"]="$v"
done < <(sed -e 's/[[:space:]]*#.*//' -e '/^[[:space:]]*$/d' "$ENV_FILE")

for key in DATABASE_URL MAKURU_PIN MAKURU_SECRET TOKEN_DAYS; do
  [[ -n "${VALS[$key]:-}" ]] || { echo "   $key kosong di .env.local, dilewati"; continue; }
  body="$(python3 - "$key" "${VALS[$key]}" <<'PY'
import json, sys
print(json.dumps({
    "key": sys.argv[1],
    "value": sys.argv[2],
    "type": "encrypted",
    "target": ["production", "preview", "development"],
}))
PY
)"
  # replace if it already exists
  existing="$(api GET "/v9/projects/$PROJECT/env" | python3 - "$key" <<'PY'
import json, sys
key = sys.argv[1]
d = json.load(sys.stdin)
for e in d.get("envs", []):
    if e.get("key") == key:
        print(e["id"]); break
PY
)"
  if [[ -n "$existing" ]]; then
    api PATCH "/v9/projects/$PROJECT/env/$existing" "$body" >/dev/null
    echo "   $key  diperbarui"
  else
    api POST "/v10/projects/$PROJECT/env" "$body" >/dev/null
    echo "   $key  ditambahkan"
  fi
done

echo "== 4/5  deploy (production) =="
cd "$ROOT/vercel"
npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN" --name "$PROJECT" 2>&1 | tee /tmp/vercel-deploy.log | tail -6

URL="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' /tmp/vercel-deploy.log | tail -1)"
echo "== 5/5  url =="
echo "   ${URL:-lihat log di atas}"

if [[ -n "${URL:-}" ]]; then
  echo "   health: $(curl -sS "$URL/api/health" || true)"
fi
