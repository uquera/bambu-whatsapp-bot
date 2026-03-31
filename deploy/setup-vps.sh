#!/bin/bash
set -e

APP_DIR="/var/www/bambu-whatsapp-bot"
NGINX_AVAILABLE="/etc/nginx/sites-available/bambu-whatsapp-bot"
NGINX_ENABLED="/etc/nginx/sites-enabled/bambu-whatsapp-bot"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Bambu WhatsApp Bot — Setup VPS             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

echo "==> [1/7] Preparando directorios..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/prisma"

echo "==> [2/7] Instalando dependencias npm..."
cd "$APP_DIR"
npm install --legacy-peer-deps

echo "==> [3/7] Generando cliente Prisma..."
npx prisma generate

echo "==> [4/7] Inicializando base de datos SQLite..."
DATABASE_URL="file:$APP_DIR/prisma/prod.db" npx prisma db push

echo "==> [5/7] Compilando Next.js..."
npm run build

echo "==> [6/7] Configurando Nginx..."
cp "$APP_DIR/deploy/nginx.conf" "$NGINX_AVAILABLE"
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
nginx -t && systemctl reload nginx
echo "    Nginx configurado correctamente."

echo "==> [7/7] Iniciando aplicación con PM2..."
pm2 start "$APP_DIR/ecosystem.config.js" --env production
pm2 save

echo ""
echo "✅ Setup completado."
echo ""
echo "Próximos pasos:"
echo "  1. Configura el archivo .env.local con las variables de producción"
echo "  2. certbot --nginx -d bot.bambu.hypnosapps.com"
echo "  3. Apunta el subdominio bot.bambu.hypnosapps.com al IP del VPS: 31.97.86.247"
echo "  4. Configura el webhook en Meta Developer Console"
