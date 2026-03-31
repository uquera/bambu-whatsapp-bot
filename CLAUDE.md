# Bambu WhatsApp Bot

Bot de WhatsApp para el **Centro Clínico Bambú** (Iquique, Chile).
Powered by Meta Business Cloud API + Claude Haiku 4.5.

## Stack
- Framework: Next.js 15 App Router + TypeScript
- BD: Prisma ORM v6 + SQLite (driver nativo)
- AI: Anthropic Claude `claude-haiku-4-5-20251001` (SDK directo)
- Mensajería: Meta WhatsApp Business Cloud API v21.0
- Deploy: VPS 31.97.86.247 · Puerto 3002 · PM2 + Nginx

## Comandos
```bash
npm run dev                              # Desarrollo (puerto 3000)
DATABASE_URL="file:./prisma/dev.db" npx prisma db push    # Sincronizar schema
DATABASE_URL="file:./prisma/dev.db" npx prisma studio     # Ver base de datos
npm run build                            # Build de producción
```

## Webhook
- `GET  /api/webhook/whatsapp` → verificación Meta (hub.challenge)
- `POST /api/webhook/whatsapp` → mensajes entrantes (retorna 200 inmediato + procesa async)

## Flujo del agente
1. Usuario nuevo → `sendWelcomeButtons()` → 2 botones interactivos
2. Click "Soy paciente" → `userType = PACIENTE` persistido en Conversation
3. Click "Soy profesional" → `userType = PROFESIONAL` persistido
4. Texto libre sin tipo → `classifyUserIntent()` → guarda tipo → botones + respuesta Claude
5. Mensajes siguientes → `runAgent()` con historial de BD (últimos 20 mensajes)

## Deduplicación
Cada mensaje se persiste con `waMessageId` de Meta. Si Meta reintenta la entrega,
el duplicado se detecta y se ignora.

## Variables de entorno requeridas
Ver `.env.example` para descripción completa:
- `ANTHROPIC_API_KEY`
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `DATABASE_URL`

## Testing local con ngrok
```bash
npx ngrok http 3000
# Configurar https://xxxx.ngrok.io/api/webhook/whatsapp en Meta Developer Console
```

## Deploy VPS
```bash
bash deploy/setup-vps.sh
certbot --nginx -d bot.bambu.hypnosapps.com
```
