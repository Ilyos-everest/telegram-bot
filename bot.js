require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi! .env faylni tekshiring.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🤖 Bot ishga tushdi...");

// ── /start ──────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "Foydalanuvchi";

  bot.sendMessage(chatId, `👋 Salom, *${name}*!\n\nKomandalar:\n/start — Boshlash\n/help — Yordam\n/info — Ma'lumot\n/menu — Menyu\n\nYoki biror narsa yozing — men takrorlayman 🔁`, {
    parse_mode: "Markdown",
  });
});

// ── /help ───────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🆘 *Yordam*\n\n• /start — Qayta boshlash\n• /help — Yordam\n• /info — Bot holati\n• /menu — Interaktiv menyu\n• /echo matn — Matnni takrorlash`,
    { parse_mode: "Markdown" }
  );
});

// ── /info ───────────────────────────────────────────
bot.onText(/\/info/, (msg) => {
  const uptime = Math.floor(process.uptime());
  const min = Math.floor(uptime / 60);
  const sec = uptime % 60;
  const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  bot.sendMessage(msg.chat.id,
    `ℹ️ *Bot ma'lumotlari*\n\n🟢 Holat: Ishlayapti\n⏱ Uptime: ${min} min ${sec} sec\n💾 Xotira: ${mem} MB\n🔧 Node: ${process.version}`,
    { parse_mode: "Markdown" }
  );
});

// ── /menu ───────────────────────────────────────────
bot.onText(/\/menu/, (msg) => {
  bot.sendMessage(msg.chat.id, "📋 *Asosiy menyu:*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "ℹ️ Ma'lumot", callback_data: "info" },
          { text: "🆘 Yordam",   callback_data: "help" },
        ],
        [
          { text: "📊 Statistika", callback_data: "stats" },
          { text: "⚙️ Sozlamalar", callback_data: "settings" },
        ],
      ],
    },
  });
});

// ── /echo ───────────────────────────────────────────
bot.onText(/\/echo (.+)/, (msg, match) => {
  bot.sendMessage(msg.chat.id, `🔁 *Echo:*\n${match[1]}`, { parse_mode: "Markdown" });
});

// ── Inline keyboard callback ─────────────────────────
bot.on("callback_query", (cq) => {
  const chatId = cq.message.chat.id;
  const msgId  = cq.message.message_id;
  bot.answerCallbackQuery(cq.id);

  const responses = {
    info:     "ℹ️ Bu test bot. Node.js bilan yozilgan.",
    help:     "🆘 Yordam uchun /help yozing.",
    stats:    `📊 Uptime: ${Math.floor(process.uptime())} sec\n💾 Xotira: ${Math.round(process.memoryUsage().heapUsed/1024/1024)} MB`,
    settings: "⚙️ Sozlamalar hozircha mavjud emas.",
  };

  bot.editMessageText(responses[cq.data] || "❓ Noma'lum", {
    chat_id: chatId,
    message_id: msgId,
    reply_markup: {
      inline_keyboard: [[{ text: "⬅️ Orqaga", callback_data: "back" }]],
    },
  });
});

// ── Rasm ────────────────────────────────────────────
bot.on("photo", (msg) => {
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  bot.sendMessage(msg.chat.id, `📸 Rasm qabul qilindi!\nFile ID: \`${fileId}\``, { parse_mode: "Markdown" });
});

// ── Hujjat ──────────────────────────────────────────
bot.on("document", (msg) => {
  const doc = msg.document;
  bot.sendMessage(msg.chat.id,
    `📄 Hujjat qabul qilindi!\nNom: \`${doc.file_name}\`\nHajm: ${Math.round(doc.file_size/1024)} KB`,
    { parse_mode: "Markdown" }
  );
});

// ── Echo (oddiy matn) ────────────────────────────────
bot.on("message", (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  bot.sendMessage(msg.chat.id, `🔁 "${msg.text}"`, {
    reply_to_message_id: msg.message_id,
  });
});

// ── Xatolar ─────────────────────────────────────────
bot.on("polling_error", (err) => console.error("❌ Polling xatosi:", err.message));
process.on("SIGINT", () => { bot.stopPolling(); process.exit(0); });
