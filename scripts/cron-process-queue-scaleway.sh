#!/usr/bin/env bash
# Run this on Scaleway (crontab every minute) to process the email queue.
# The app stays on Netlify; this script just calls its cron API.
#
# 1. Copy this script to your Scaleway server (e.g. /home/georgesdoxuan/cron-process-queue.sh)
# 2. chmod +x /home/georgesdoxuan/cron-process-queue.sh
# 3. Set env: export CRON_SECRET="your-secret" and export APP_URL="https://your-site.netlify.app"
#    (or put them in ~/.bashrc or a small .env file and source it from crontab)
# 4. Crontab: * * * * * /home/georgesdoxuan/cron-process-queue.sh >> /tmp/cron-queue.log 2>&1

set -e
APP_URL="${APP_URL:-https://www.pipeshark.io}"
CRON_SECRET="${CRON_SECRET}"

if [ -z "$CRON_SECRET" ]; then
  echo "$(date -Iseconds) CRON_SECRET not set" >&2
  exit 1
fi

url="${APP_URL}/api/cron/process-email-queue"
resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${CRON_SECRET}" "$url")
body=$(echo "$resp" | head -n -1)
code=$(echo "$resp" | tail -n 1)

if [ "$code" = "200" ]; then
  echo "$(date -Iseconds) OK $code $body"
else
  echo "$(date -Iseconds) FAIL $code $body" >&2
  exit 1
fi
