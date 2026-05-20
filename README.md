# 🤖 Telegram Bot — Node.js

Render.com da doimiy ishlab turadigan Telegram bot.

## Xususiyatlar
- `/start` — Xush kelibsiz xabari
- `/help` — Yordam
- `/info` — Bot holati va uptime
- `/menu` — Inline keyboard menyu
- `/echo matn` — Matnni takrorlash
- Rasm va hujjat qabul qilish
- Echo — har qanday matnni takrorlaydi

## Ishga tushirish

### 1. Token olish
1. Telegramda [@BotFather](https://t.me/BotFather) ga yozing
2. `/newbot` yuboring
3. Nom va username bering
4. Token oling

### 2. Local ishga tushirish
```bash
npm install
cp .env.example .env
# .env faylga tokeningizni yozing
npm start
```

### 3. Render.com deploy
1. GitHub ga push qiling
2. render.com da yangi "Background Worker" yarating
3. Environment Variables ga `BOT_TOKEN` qo'shing
4. Deploy!
