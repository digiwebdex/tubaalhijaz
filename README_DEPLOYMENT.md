# Tuba Al Hijaz — VPS Deployment Guide

**Production domain:** https://tubaalhijaz.com (and www.)
**VPS:** Hostinger KVM @ `187.77.144.38`
**Isolated path:** `/var/www/tubaalhijaz` — never touch any other site.
**Package manager:** Bun (project is Bun-only — `bun.lock` is the lockfile, no `package-lock.json`).

---

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 18 + Vite + Tailwind + shadcn       |
| Backend  | Node.js + Express (`/server/index.js`)    |
| DB       | Self-hosted PostgreSQL (local socket/TCP) |
| Queue    | Redis 7 + BullMQ (`tubaalhijaz-worker`)   |
| Process  | PM2 (`tubaalhijaz-api` + `tubaalhijaz-worker`, port `4002`) |
| Web      | Nginx + Certbot Let's Encrypt SSL         |

### Dependency status (verified clean)
- **No Supabase SDK remains.** `@supabase/supabase-js` removed from `package.json`.
- **No Supabase rewrite step is needed.** The `src/integrations/supabase/` directory does not exist.
- **No Supabase fallback / URL / env var** anywhere in the runtime code.
- **No `package-lock.json` is required.** Bun manages dependencies via `bun.lock`.
- **No build-time source rewrite is required.** `bun run build` works straight from a fresh clone.
- **Production runs fully on the VPS backend + local PostgreSQL.**

---

## Admin panel

- **URL:** `https://tubaalhijaz.com/auth` (login) → `/admin` (dashboard)
- **Initial credentials:** seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` on first run. Change immediately after first login from **Admin → Settings → Password**.
- **Editable from admin panel:** CMS pages, Hero banners, Services, Packages, Hotels & galleries, Catering plans, Transport orders, Umrah orders, Testimonials, FAQ, Gallery, Footer + contact, SEO, Menu/Section visibility, Currency rates, PDF/invoice settings, Signature, Notification settings, Wallets / Payment methods, Users & roles, Backups.

---

## Forms connected to backend

| Form                            | Endpoint                       | Stored in            |
|--------------------------------- |------------------------------- |--------------------- |
| Contact form                    | `POST /api/contact`            | `contact_messages`   |
| Umrah order                     | `POST /api/umrah_orders`       | `umrah_orders`       |
| Catering order                  | `POST /api/catering_orders`    | `catering_orders`    |
| Transport order                 | `POST /api/transport_orders`   | `transport_orders`   |
| Booking (multi-step)            | `POST /api/bookings`           | `bookings`           |
| Customer OTP login              | `POST /api/auth/otp/{send,verify}` | `otp_codes` / `users` |

---

## Automation workflow

- [x] Booking created → SMS + email to customer + admin
- [x] Payment completed → wallet trigger + ledger entry + receipt SMS
- [x] Daily due reminders cron
- [x] Daily admin summary SMS
- [x] Database backup → `server/backup-to-gdrive.sh` (cron daily 03:00)
- [x] Online payment IPN → `POST /api/sslcommerz/ipn`
- [x] Status change → SMS + email

---

# Deployment — Step by Step

## Step 1 — Connect from Windows PowerShell

```powershell
ssh <YOUR_SSH_USER>@187.77.144.38
```

## Step 2 — Pre-migration inspection (READ-ONLY)

```bash
ls -la /var/www
pm2 list || true
sudo ss -tulpen | grep -E ':(80|443|4002|5432)' || echo "key ports clean"
sudo ss -tulpen | grep ':4002' || echo "Port 4002 is FREE"
ls -la /etc/nginx/sites-enabled
sudo grep -R "tubaalhijaz" /etc/nginx/sites-available /etc/nginx/sites-enabled || echo "no existing tubaalhijaz nginx"
sudo systemctl status postgresql --no-pager | head -5
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='tubaalhijaz_db';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles    WHERE rolname='tubaalhijaz_user';"
node -v && pm2 -v && (bun -v || echo "bun not installed yet")
```

**Decision rules:**
- Port 4002 not free → edit `ecosystem.config.cjs` + nginx + `server/.env` to next free port.
- `tubaalhijaz_db` exists and is NOT yours → use `tubaalhijaz_db_new`.
- `tubaalhijaz_user` exists and is NOT yours → use `tubaalhijaz_user_new`.
- PM2 process `tubaalhijaz-api` belongs to someone else → rename to `tubaalhijaz-web`.

## Step 3 — Install server packages

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib certbot python3-certbot-nginx git curl unzip

# Node 20 (only required for PM2 + the Express server runtime)
node -v || (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs)

# PM2
sudo npm i -g pm2

# Bun (frontend build + install). Skip if already installed.
bun -v || (curl -fsSL https://bun.sh/install | bash && source ~/.bashrc)
bun -v
```

If `bun` is still not on PATH in a new shell, append to `~/.bashrc`:
```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

## Step 4 — Create isolated project directory

```bash
sudo mkdir -p /var/www/tubaalhijaz
sudo chown -R $USER:$USER /var/www/tubaalhijaz
cd /var/www/tubaalhijaz
```

## Step 5 — Clone the repo

```bash
git clone https://github.com/digiwebdex/tubaalhijaz.git .
mkdir -p logs server/uploads
```

## Step 6 — Create database & user

```bash
sudo -u postgres psql <<SQL
CREATE USER tubaalhijaz_user WITH PASSWORD '<YOUR_DB_PASSWORD>';
CREATE DATABASE tubaalhijaz_db OWNER tubaalhijaz_user;
GRANT ALL PRIVILEGES ON DATABASE tubaalhijaz_db TO tubaalhijaz_user;
SQL

sudo -u postgres psql -d tubaalhijaz_db -f server/schema.sql
```

## Step 7 — Backend `.env`

Generate the JWT secrets FIRST (outside the editor), copy each printed value, then paste them into `server/.env` while editing:

```bash
# Run each line, copy the printed hex value
openssl rand -hex 48   # → paste as JWT_SECRET
openssl rand -hex 48   # → paste as JWT_REFRESH_SECRET
```

Then create and edit the env file:

```bash
cp server/.env.tubaalhijaz.example server/.env
nano server/.env
# Fill in: DATABASE_URL (URL-encode the password),
# JWT_SECRET + JWT_REFRESH_SECRET (paste the values generated above),
# ADMIN_EMAIL, ADMIN_PASSWORD, BULKSMSBD_*, RESEND_API_KEY, SSLCZ_*
```

## Step 8 — Frontend `.env` + build (Bun)

> No Supabase rewrite. No `src/integrations/supabase` directory exists.
> No `package-lock.json` is needed.

```bash
cd /var/www/tubaalhijaz
echo "VITE_API_URL=/api" > .env

bun install
bun run build
```

This produces `dist/` which Nginx will serve as static files.

## Step 9 — Backend deps & start with PM2

```bash
cd /var/www/tubaalhijaz/server && bun install
cd /var/www/tubaalhijaz
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u $USER --hp $HOME    # run the printed sudo command
```

Verify: `curl -s http://127.0.0.1:4002/api/health` → JSON.

## Step 10 — Nginx (HTTP first, for Certbot)

> **Do NOT** run `rm /etc/nginx/sites-enabled/default` or disable any other vhost.
> Only ADD the `tubaalhijaz.com` symlink. Other sites on this VPS must remain untouched.

```bash
sudo cp /var/www/tubaalhijaz/nginx/tubaalhijaz.com.conf.example /etc/nginx/sites-available/tubaalhijaz.com
sudo sed -i '/listen 443 ssl/,/^}/d' /etc/nginx/sites-available/tubaalhijaz.com
sudo ln -sf /etc/nginx/sites-available/tubaalhijaz.com /etc/nginx/sites-enabled/tubaalhijaz.com
sudo nginx -t && sudo systemctl reload nginx
```

## Step 11 — Issue SSL certificates

> Cloudflare proxy (orange cloud) is ON. If `--nginx` fails HTTP-01,
> set both A records to **DNS only** (grey cloud) for ~5 min, run Certbot,
> then switch back to **Proxied**.

```bash
sudo certbot --nginx -d tubaalhijaz.com -d www.tubaalhijaz.com \
  --non-interactive --agree-tos -m admin@tubaalhijaz.com --redirect
```

Restore the full Nginx vhost (with the SSL block) and reload:

```bash
sudo cp /var/www/tubaalhijaz/nginx/tubaalhijaz.com.conf.example /etc/nginx/sites-available/tubaalhijaz.com
sudo nginx -t && sudo systemctl reload nginx
```

## Step 12 — Cloudflare SSL/TLS mode

Cloudflare dashboard → SSL/TLS → Overview → **Full (strict)**.
Re-enable the orange cloud on both A records if greyed out.

## Step 13 — Smoke tests

```bash
curl -I https://tubaalhijaz.com
curl -I https://www.tubaalhijaz.com
curl -s https://tubaalhijaz.com/api/health
```

In a browser:
1. `/` — homepage loads (hero / services / catering / transport / gallery)
2. `/auth` — sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. `/admin` — edit a CMS section, refresh homepage
4. Submit Contact form → row in `contact_messages`
5. Submit Catering order → row in `catering_orders`

## Step 14 — Logs

```bash
pm2 logs tubaalhijaz-api --lines 100
tail -f /var/www/tubaalhijaz/logs/error.log
sudo tail -f /var/log/nginx/error.log
```

## Step 15 — Troubleshooting

| Symptom                  | Fix                                                                 |
|--------------------------|---------------------------------------------------------------------|
| 502 Bad Gateway          | `pm2 restart tubaalhijaz-api` then check `pm2 logs`                 |
| API 404 for `/api/*`     | Confirm Nginx `proxy_pass` port matches `ecosystem.config.cjs`      |
| DB auth failed           | URL-encode the password in `DATABASE_URL`                           |
| Certbot HTTP-01 fails    | Grey-cloud the Cloudflare A records, retry, re-orange after         |
| `bun: command not found` | `source ~/.bashrc` or re-run the Bun installer in Step 3            |
| Admin can't log in       | Reset password in DB using `bcryptjs` (see `server/scripts/`)       |

## Step 16 — Rollback / redeploy

```bash
cd /var/www/tubaalhijaz
git pull --ff-only
bun install
bun run build
cd server && bun install
pm2 restart tubaalhijaz-api
```

Full removal:
```bash
pm2 delete tubaalhijaz-api && pm2 save
sudo rm /etc/nginx/sites-enabled/tubaalhijaz.com /etc/nginx/sites-available/tubaalhijaz.com
sudo nginx -t && sudo systemctl reload nginx
sudo -u postgres psql -c "DROP DATABASE tubaalhijaz_db;"
sudo -u postgres psql -c "DROP USER tubaalhijaz_user;"
sudo rm -rf /var/www/tubaalhijaz
```

---

## Final deployment checklist

- [ ] Inspection completed; chosen port = `4002` (or alt)
- [ ] Bun installed (`bun -v` works)
- [ ] `/var/www/tubaalhijaz` owned by deploy user only
- [ ] `server/.env` has real `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`
- [ ] `bun run build` succeeded → `dist/` exists
- [ ] `pm2 status` shows `tubaalhijaz-api` online
- [ ] `nginx -t` passes; only `tubaalhijaz.com` symlink added
- [ ] HTTPS works on both apex + www
- [ ] Cloudflare SSL/TLS mode = Full (strict)
- [ ] Admin login works and CMS edits reflect on the live site
- [ ] At least one form submission lands in the database
