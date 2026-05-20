# Hospital Management System Deployment Guide

This folder contains deployment helpers for Docker, Nginx, PostgreSQL backups, and CI/CD.

## 1. Local Docker Test

From the project root:

```powershell
Copy-Item backend\.env.docker.example backend\.env.docker
docker compose up --build
```

Open:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:8000
Docs:     http://127.0.0.1:8000/docs
```

Stop:

```powershell
docker compose down
```

## 2. Production Environment Files

Create these files on the server, based on the examples:

```bash
cp .env.deploy.example .env.deploy
cp backend/.env.production.example backend/.env.production
```

Edit all passwords, domains, SMTP values, and `SECRET_KEY`.

For production:

```env
APP_ENV=production
CORS_ORIGINS=https://your-domain.com
```

## 3. Ubuntu Server Setup

On a fresh Ubuntu server:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER
```

Log out and back in so Docker permissions apply.

Clone the repo:

```bash
sudo mkdir -p /opt/hms
sudo chown -R $USER:$USER /opt/hms
cd /opt/hms
git clone <your-repo-url> Hospital-Managment-System
cd Hospital-Managment-System
```

## 4. Build Frontend For Production

If serving frontend through the production Nginx container:

```bash
cd frontend
npm ci
VITE_API_BASE_URL=https://your-domain.com npm run build
cd ..
```

## 5. Run Production Containers

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml build
docker compose --env-file .env.deploy -f docker-compose.prod.yml run --rm backend alembic upgrade head
docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d
```

For later schema changes, create and run Alembic migrations:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml run --rm backend alembic revision --autogenerate -m "describe change"
docker compose --env-file .env.deploy -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

Check:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml ps
docker compose --env-file .env.deploy -f docker-compose.prod.yml logs -f backend
```

## 6. Nginx Domain Config

Edit:

```text
deploy/nginx/hms.conf
```

Replace:

```text
your-domain.com
www.your-domain.com
```

Then restart:

```bash
docker compose --env-file .env.deploy -f docker-compose.prod.yml restart nginx
```

## 7. HTTPS

For a first production pass, easiest path is to install Nginx directly on host and use Certbot there, or extend the container setup with a certbot service.

Host-level Certbot:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

If you keep Nginx inside Docker, map certificates into the container and add an HTTPS server block.

## 8. PostgreSQL Backups

Make scripts executable:

```bash
chmod +x deploy/scripts/backup_postgres.sh deploy/scripts/restore_postgres.sh
```

Run backup:

```bash
source .env.deploy
./deploy/scripts/backup_postgres.sh
```

Add daily cron:

```bash
crontab -e
```

Example:

```cron
0 2 * * * cd /opt/hms/Hospital-Managment-System && set -a && . ./.env.deploy && set +a && ./deploy/scripts/backup_postgres.sh >> /var/log/hms-backup.log 2>&1
```

## 9. Database Optimization

Minimum production checklist:

```sql
ANALYZE;
```

Useful indexes already exist on many model columns. As traffic grows, inspect slow queries and add targeted indexes for:

- appointment date/doctor filters
- patient phone/email searches
- medicine stock/expiry reports
- audit log created date/module filters

## 10. CI/CD

CI is added in:

```text
.github/workflows/ci.yml
```

Deploy template is added as:

```text
.github/workflows/deploy.yml.example
```

To enable deploy:

1. Rename it to `deploy.yml`.
2. Add GitHub repository secrets:
   - `SERVER_HOST`
   - `SERVER_USER`
   - `SERVER_SSH_KEY`
3. Ensure the server already has the repo cloned and env files created.

## 11. Vercel / Netlify Frontend Option

If deploying frontend separately:

Set frontend env:

```text
VITE_API_BASE_URL=https://api.your-domain.com
```

Then deploy `frontend/` to Vercel or Netlify.

Backend can still run on the Ubuntu server behind Nginx at `api.your-domain.com`.
