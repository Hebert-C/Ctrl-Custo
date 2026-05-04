#!/usr/bin/env bash
# Ctrl-Custo — primeira execução após setup.sh
# Configura nginx HTTP, instala deps, migra banco, build web e sobe PM2
set -euo pipefail

DOMAIN="ctrlcusto.duckdns.org"
VM_IP="163.176.42.49"
APP_DIR="/home/deploy/ctrl-custo"

echo "==> [1/6] Configurando nginx HTTP-only"
cat > /etc/nginx/sites-available/ctrl-custo << NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${VM_IP};

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_pass_header Set-Cookie;
    }

    location / {
        root ${APP_DIR}/apps/web/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX

ln -sf /etc/nginx/sites-available/ctrl-custo /etc/nginx/sites-enabled/ctrl-custo
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "    nginx OK"

echo "==> [2/6] Atualizando .env da API"
ENV_FILE="${APP_DIR}/apps/api/.env"
sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://${DOMAIN},http://${VM_IP}|" "${ENV_FILE}"
sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "${ENV_FILE}"
echo "    .env atualizado:"
grep -E "^(ALLOWED_ORIGINS|NODE_ENV)=" "${ENV_FILE}"

echo "==> [3/6] Instalando dependências (como deploy)"
sudo -u deploy bash -c "
  export NVM_DIR=\"/home/deploy/.nvm\"
  source \"\${NVM_DIR}/nvm.sh\"
  cd ${APP_DIR}
  git pull origin main
  pnpm install --frozen-lockfile
"

echo "==> [4/6] Rodando migração do banco"
sudo -u deploy bash -c "
  export NVM_DIR=\"/home/deploy/.nvm\"
  source \"\${NVM_DIR}/nvm.sh\"
  cd ${APP_DIR}
  pnpm --filter @ctrl-custo/api db:migrate
"

echo "==> [5/6] Build do frontend React"
sudo -u deploy bash -c "
  export NVM_DIR=\"/home/deploy/.nvm\"
  source \"\${NVM_DIR}/nvm.sh\"
  cd ${APP_DIR}
  pnpm --filter web build
"

echo "==> [6/6] Subindo API com PM2"
sudo -u deploy bash -c "
  export NVM_DIR=\"/home/deploy/.nvm\"
  source \"\${NVM_DIR}/nvm.sh\"
  mkdir -p /home/deploy/logs
  cd ${APP_DIR}
  pm2 start apps/api/ecosystem.config.js --env production || pm2 restart ctrl-custo-api
  pm2 save
  pm2 status
"

echo ""
echo "==> Deploy completo! Testando endpoints..."
sleep 3

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/api/health" || echo "000")
echo "    GET /api/health → HTTP ${HTTP_CODE}"

if [ "${HTTP_CODE}" = "200" ]; then
    echo "    API online em http://${DOMAIN}/api/health"
else
    echo "    API ainda não responde — verifique: pm2 logs ctrl-custo-api"
fi

echo "    Frontend em: http://${DOMAIN}"
