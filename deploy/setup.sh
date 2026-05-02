#!/usr/bin/env bash
# =============================================================================
# Ctrl-Custo — Oracle Cloud (Ubuntu 22.04 ARM) — One-time server setup
# Run as root: sudo bash setup.sh <domain> <repo-url>
#
# Example:
#   sudo bash setup.sh app.meudominio.com https://github.com/user/ctrl-custo.git
# =============================================================================
set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="${2:-}"

if [[ -z "${DOMAIN}" || -z "${REPO_URL}" ]]; then
  echo "Usage: sudo bash setup.sh <domain> <repo-url>"
  echo "  domain   — public domain pointing to this VM (ex: app.meudominio.com)"
  echo "  repo-url — git clone URL (ex: https://github.com/user/ctrl-custo.git)"
  exit 1
fi

DEPLOY_USER="deploy"
DB_NAME="ctrl_custo"
DB_USER="ctrl_custo_user"
APP_DIR="/home/${DEPLOY_USER}/ctrl-custo"
LOG_DIR="/home/${DEPLOY_USER}/logs"
NODE_VERSION="20"

echo "==> Updating system packages"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common ca-certificates \
  git unzip jq build-essential fail2ban ufw

# =============================================================================
# Create non-root deploy user
# =============================================================================
echo "==> Creating deploy user"
if ! id "${DEPLOY_USER}" &>/dev/null; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
  usermod -aG sudo "${DEPLOY_USER}"
fi
mkdir -p "${LOG_DIR}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${LOG_DIR}"

# =============================================================================
# PostgreSQL 16
# =============================================================================
echo "==> Installing PostgreSQL 16"
sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update -y
apt-get install -y postgresql-16

systemctl enable postgresql && systemctl start postgresql

echo "==> Creating database and user"
DB_PASS=$(openssl rand -hex 24)
sudo -u postgres psql <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
-- DML only — no DDL permissions
REVOKE ALL ON DATABASE ${DB_NAME} FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "DB_USER=${DB_USER}"
echo "DB_PASS=${DB_PASS}  <-- save this now"

# Force PostgreSQL to listen on localhost only (default)
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
sed -i "s/^#listen_addresses.*/listen_addresses = '127.0.0.1'/" "${PG_CONF}"
systemctl restart postgresql

# =============================================================================
# Node.js 20 via nvm (for deploy user)
# =============================================================================
echo "==> Installing nvm + Node.js ${NODE_VERSION} for ${DEPLOY_USER}"
sudo -u "${DEPLOY_USER}" bash -c "
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  nvm install ${NODE_VERSION}
  nvm alias default ${NODE_VERSION}
  npm install -g pnpm pm2
"

# pm2 startup generates a `sudo ...` command — run it here as root directly
PM2_STARTUP=$(sudo -u "${DEPLOY_USER}" bash -c "
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  pm2 startup systemd -u ${DEPLOY_USER} --hp /home/${DEPLOY_USER} 2>/dev/null | tail -1
")
bash -c "${PM2_STARTUP}"

# =============================================================================
# Nginx
# =============================================================================
echo "==> Installing nginx"
apt-get install -y nginx
systemctl enable nginx

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# =============================================================================
# Certbot (Let's Encrypt)
# =============================================================================
echo "==> Installing certbot"
apt-get install -y certbot python3-certbot-nginx

# =============================================================================
# UFW firewall
# =============================================================================
echo "==> Configuring ufw"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP (redirect → HTTPS)
ufw allow 443/tcp    # HTTPS
ufw --force enable

# =============================================================================
# fail2ban — SSH + API
# =============================================================================
echo "==> Configuring fail2ban"
DEPLOY_DIR="$(dirname "${BASH_SOURCE[0]}")"
cp "${DEPLOY_DIR}/fail2ban/ctrl-custo-api.conf" /etc/fail2ban/filter.d/ctrl-custo-api.conf 2>/dev/null || true
cp "${DEPLOY_DIR}/fail2ban/jail.local" /etc/fail2ban/jail.local 2>/dev/null || true
systemctl enable fail2ban && systemctl restart fail2ban

# =============================================================================
# Backup cron
# =============================================================================
echo "==> Scheduling daily backup"
install -m 750 "$(dirname "${BASH_SOURCE[0]}")/backup.sh" /usr/local/bin/ctrl-custo-backup
(crontab -u "${DEPLOY_USER}" -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/ctrl-custo-backup") \
  | crontab -u "${DEPLOY_USER}" -

# =============================================================================
# SSH hardening
# =============================================================================
echo "==> Hardening SSH"
sed -i \
  -e 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' \
  -e 's/^#\?PermitRootLogin.*/PermitRootLogin no/' \
  -e 's/^#\?X11Forwarding.*/X11Forwarding no/' \
  /etc/ssh/sshd_config
systemctl reload sshd

# =============================================================================
# Clone repository
# =============================================================================
echo "==> Cloning repository"
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "    Repo already cloned, skipping"
else
  sudo -u "${DEPLOY_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi

# =============================================================================
# Generate secrets and write .env
# =============================================================================
echo "==> Generating secrets and writing .env"
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

ENV_FILE="${APP_DIR}/apps/api/.env"
sudo -u "${DEPLOY_USER}" tee "${ENV_FILE}" > /dev/null <<ENV
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
PORT=3000
ALLOWED_ORIGINS=https://${DOMAIN}
NODE_ENV=production
ENV

chmod 600 "${ENV_FILE}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"

# =============================================================================
# Configure nginx with real domain
# =============================================================================
echo "==> Configuring nginx for domain: ${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-available/ctrl-custo"

# Replace DOMAIN_PLACEHOLDER with the real domain in every occurrence
sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" \
  "$(dirname "${BASH_SOURCE[0]}")/nginx.conf" > "${NGINX_CONF}"

ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/ctrl-custo
nginx -t

systemctl reload nginx

# =============================================================================
# SSL certificate (Let's Encrypt)
# =============================================================================
echo "==> Requesting SSL certificate for ${DOMAIN}"
certbot --nginx \
  -d "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --email "admin@${DOMAIN}" \
  --redirect

systemctl reload nginx

# =============================================================================
# Install dependencies and run migrations
# =============================================================================
echo "==> Installing dependencies"
sudo -u "${DEPLOY_USER}" bash -c "
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  cd ${APP_DIR}
  pnpm install --frozen-lockfile --prod
  pnpm --filter @ctrl-custo/api db:migrate
"

# =============================================================================
# Start API via PM2
# =============================================================================
echo "==> Starting API via PM2"
sudo -u "${DEPLOY_USER}" bash -c "
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  cd ${APP_DIR}
  pm2 start apps/api/ecosystem.config.js --env production
  pm2 save
"

echo ""
echo "==================================================================="
echo "Setup complete!"
echo ""
echo "  Domain  : https://${DOMAIN}"
echo "  API     : https://${DOMAIN}/api/health"
echo "  Logs    : pm2 logs ctrl-custo-api"
echo "  Status  : pm2 status"
echo ""
echo "  .env    : ${ENV_FILE}  (chmod 600)"
echo ""
echo "  Secrets generated (saved in .env — back them up securely):"
echo "    DB_PASS            = ${DB_PASS}"
echo "    JWT_SECRET         = ${JWT_SECRET}"
echo "    JWT_REFRESH_SECRET = ${JWT_REFRESH_SECRET}"
echo "==================================================================="
