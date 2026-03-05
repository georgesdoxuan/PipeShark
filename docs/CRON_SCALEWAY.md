# Run the email queue cron on Scaleway

The **process-email-queue** cron (every minute) is disabled on Netlify. You run it from your Scaleway server instead, so Netlify is not called every minute.

## 1. Copy the script to Scaleway

From your laptop:

```bash
scp scripts/cron-process-queue-scaleway.sh georgesdoxuan@<IP_SERVEUR_SCALEWAY>:~/cron-process-queue.sh
ssh georgesdoxuan@<IP_SERVEUR_SCALEWAY> "chmod +x ~/cron-process-queue.sh"
```

## 2. Set environment variables on Scaleway

SSH into the server, then set (once):

```bash
# Replace with your real values
export APP_URL="https://www.pipeshark.io"   # or your Netlify URL
export CRON_SECRET="your-CRON_SECRET-value" # same as in Netlify env vars
```

To persist them for cron (which runs without your shell env), add to crontab or use a wrapper:

**Option A – export in crontab (same line):**

```bash
crontab -e
```

Add:

```
* * * * * APP_URL=https://www.pipeshark.io CRON_SECRET=your-secret-here /home/georgesdoxuan/cron-process-queue.sh >> /tmp/cron-queue.log 2>&1
```

**Option B – wrapper script that sources env:**

Create `~/cron-queue-wrapper.sh`:

```bash
#!/bin/bash
export APP_URL="https://www.pipeshark.io"
export CRON_SECRET="your-CRON_SECRET"
exec /home/georgesdoxuan/cron-process-queue.sh "$@"
```

Then in crontab:

```
* * * * * /home/georgesdoxuan/cron-queue-wrapper.sh >> /tmp/cron-queue.log 2>&1
```

## 3. Verify

- Wait one minute, then check: `tail -f /tmp/cron-queue.log`
- You should see lines like: `OK 200 {"processed":0,...}` (or processed > 0 when there are emails to send)

## 4. Netlify

The schedule for `cron-process-queue` is commented out in `netlify.toml`, so Netlify no longer runs it. Only Scaleway triggers the endpoint every minute.
