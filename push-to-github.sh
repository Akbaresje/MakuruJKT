#!/usr/bin/env bash
# Push the makuru repo to GitHub using the deploy key in .ssh/.
# Re-creates the git remote each run because .git/config is not snapshotted.
set -euo pipefail
cd "$(dirname "$0")"
REPO="${REPO:-git@github.com:Akbaresje/MakuruJKT.git}"

chmod 700 .ssh 2>/dev/null || true
chmod 600 .ssh/makuru_deploy 2>/dev/null || true

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git config user.name  "Akbaresje"
git config user.email "183284808+Akbaresje@users.noreply.github.com"

export GIT_SSH_COMMAND="ssh -i $PWD/.ssh/makuru_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/tmp/known_hosts -F /dev/null"
exec git push -u origin main "$@"
