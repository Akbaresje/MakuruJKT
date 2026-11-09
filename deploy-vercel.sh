#!/usr/bin/env bash
#
# One-shot Vercel deploy for the makuru ops app.
#
#   VERCEL_TOKEN=xxx ./deploy-vercel.sh
#
# 1. reads DATABASE_URL / MAKURU_PIN / MAKURU_SECRET / TOKEN_DAYS from vercel/.env.local
# 2. creates (or reuses) the Vercel project through the REST API
# 3. pushes those variables to production / preview / development
# 4. deploys the vercel/ folder to production with the CLI
# 5. prints the production URL and its /api/health

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

# env_val KEY -> value from .env.local (last assignment wins, quotes stripped)
env_val() {
  awk -v want="$1" '
    /^[[:space:]]*#/ { next }
    /^[[:space:]]*$/ { next }
    {
      line = $0
      eq = index(line, "=")
      if (eq == 0) next
      key = substr(line, 1, eq - 1)
      gsub(/[[:space:]]/, "", key)
      if (key != want) next
      val = substr(line, eq + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", val)
      if (val ~ /^".*"$/ || val ~ /^\047.*\047$/) val = substr(val, 2, length(val) - 2)
      print val
    }' "$ENV_FILE" | tail -1
}

echo "== 1/5  whoami =="
api GET /v2/user | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  ",d.get("user",{}).get("username") or d)'

echo "== 2/5  project '$PROJECT' =="
if api GET "/v9/projects/$PROJECT" | grep -q '"id"'; then
  echo "   sudah ada, dipakai ulang"
else
  echo "   dibuat baru"
  api POST /v11/projects "{\"name\":\"$PROJECT\",\"framework\":null}" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  ",d.get("id") or d)'
fi

echo "== 3/5  environment variables =="
for key in DATABASE_URL MAKURU_PIN MAKURU_SECRET TOKEN_DAYS; do
  val="$(env_val "$key")"
  if [[ -z "$val" ]]; then
    echo "   $key  kosong di .env.local, dilewati"
    continue
  fi

  body="$(python3 -c 'import json,sys;print(json.dumps({"key":sys.argv[1],"value":sys.argv[2],"type":"encrypted","target":["production","preview","development"]}))' "$key" "$val")"

  existing="$(api GET "/v9/projects/$PROJECT/env" \
    | python3 -c 'import json,sys;d=json.load(sys.stdin);print(next((e["id"] for e in d.get("envs",[]) if e.get("key")==sys.argv[1]),""))' "$key" 2>/dev/null || true)"

  if [[ -n "$existing" ]]; then
    api PATCH "/v9/projects/$PROJECT/env/$existing" "$body" >/dev/null
    echo "   $key  diperbarui"
  else
    resp="$(api POST "/v10/projects/$PROJECT/env" "$body")"
    if grep -q '"created"' <<<"$resp"; then
      echo "   $key  ditambahkan"
    else
      echo "   $key  GAGAL: $(head -c 200 <<<"$resp")"
    fi
  fi
done

echo "== 4/5  deploy (production) =="
cd "$ROOT/vercel"
npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN" --name "$PROJECT" 2>&1 \
  | tee /tmp/vercel-deploy.log | tail -8

URL="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' /tmp/vercel-deploy.log | tail -1 || true)"
echo "== 5/5  url =="
echo "   ${URL:-lihat /tmp/vercel-deploy.log}"
if [[ -n "${URL:-}" ]]; then
  echo "   health: $(curl -sS "$URL/api/health" || true)"
fi
