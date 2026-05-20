require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const questions = require("./questions");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) { console.error("❌ BOT_TOKEN topilmadi!"); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🤖 Bot ishga tushdi...");

http.createServer((req, res) => { res.writeHead(200); res.end("Bot ishlayapti!"); }).listen(process.env.PORT || 3000);

const sessions = {};
const timers = {}; // har bir foydalanuvchi uchun timer

const TIMEOUT_SEC = 30;

// ── Savol yuborish ───────────────────────────────────
function sendQuestion(chatId) {
  const session = sessions[chatId];
  if (!session) return;

  const allQ = questions[session.subject];
  const q = allQ[session.index];

  const text =
    `⏱ *Vaqt: ${TIMEOUT_SEC} soniya*\n\n` +
    `📝 *${session.index + 1}/${allQ.length} - savol:*\n\n${q.question}`;

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: q.options[0], callback_data: "ans_A" }],
        [{ text: q.options[1], callback_data: "ans_B" }],
        [{ text: q.options[2], callback_data: "ans_C" }],
        [{ text: q.options[3], callback_data: "ans_D" }],
      ],
    },
  }).then((sentMsg) => {
    // Eski timerni o'chirish
    clearTimeout(timers[chatId]);

    // 30 soniya timeout
    timers[chatId] = setTimeout(async () => {
      const s = sessions[chatId];
      if (!s || s.index !== session.index) return; // allaqachon javob berilgan

      const correct = q.answer;
      const letters = ["A", "B", "C", "D"];
      const rightText = q.options[letters.indexOf(correct)];

      // Tugmalarni o'chirish
      try {
        await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
          chat_id: chatId,
          message_id: sentMsg.message_id,
        });
      } catch (e) {}

      await bot.sendMessage(chatId,
        `⏰ *Vaqt tugadi!*\n\n✅ To'g'ri javob: *${rightText}*`,
        { parse_mode: "Markdown" }
      );

      s.index++;
      setTimeout(() => {
        if (s.index < allQ.length) sendQuestion(chatId);
        else sendResult(chatId);
      }, 1200);

    }, TIMEOUT_SEC * 1000);
  });
}

// ── Natija ───────────────────────────────────────────
function sendResult(chatId) {
  clearTimeout(timers[chatId]);
  const session = sessions[chatId];
  const total = questions[session.subject].length;
  const score = session.score;
  const percent = Math.round((score / total) * 100);

  let emoji, comment;
  if (percent >= 90)      { emoji = "🏆"; comment = "Mukammal! Siz professionsiz!"; }
  else if (percent >= 80) { emoji = "🥇"; comment = "Ajoyib natija!"; }
  else if (percent >= 70) { emoji = "🥈"; comment = "Yaxshi! Biroz mashq qiling!"; }
  else if (percent >= 60) { emoji = "🥉"; comment = "O'rtacha. Ko'proq o'qing!"; }
  else if (percent >= 40) { emoji = "📚"; comment = "Kuchli tayyorgarlik kerak!"; }
  else                    { emoji = "😔"; comment = "Qayta o'rganing va sinab ko'ring!"; }

  const filled = Math.round(percent / 10);
  const bar = "🟩".repeat(filled) + "⬜".repeat(10 - filled);
  const subjectName = session.subject === "business_english"
    ? "Business English" : "Raqamli biznesni boshqarish";

  bot.sendMessage(chatId,
    `${emoji} *Test yakunlandi!*\n\n` +
    `📚 Fan: *${subjectName}*\n` +
    `✅ To'g'ri: *${score}/${total}*\n` +
    `📊 Natija: *${percent}%*\n\n` +
    `${bar}\n\n` +
    `💬 _${comment}_`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Qayta boshlash", callback_data: "restart" }],
          [{ text: "📋 Bosh menyu", callback_data: "main_menu" }],
        ],
      },
    }
  );
  delete sessions[chatId];
  delete timers[chatId];
}

// ── /start ───────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  clearTimeout(timers[chatId]);
  delete sessions[chatId];
  const name = msg.from.first_name || "Foydalanuvchi";
  bot.sendMessage(chatId,
    `👋 Salom, *${name}*!\n\nQuyidagi fanlardan birini tanlang:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🇬🇧 Business English (100 savol)", callback_data: "subject_business_english" }],
          [{ text: "💻 Raqamli biznesni boshqarish", callback_data: "subject_raqamli_biznes" }],
        ],
      },
    }
  );
});

// ── /stop ────────────────────────────────────────────
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  clearTimeout(timers[chatId]);
  delete sessions[chatId];
  delete timers[chatId];
  bot.sendMessage(chatId, "⛔ Test to'xtatildi. /start bilan qayta boshlang.");
});

// ── /score ───────────────────────────────────────────
bot.onText(/\/score/, (msg) => {
  const chatId = msg.chat.id;
  const s = sessions[chatId];
  if (!s) return bot.sendMessage(chatId, "Faol test yo'q. /start bilan boshlang.");
  bot.sendMessage(chatId, `📊 Joriy natija: *${s.score}/${s.index}* to'g'ri`, { parse_mode: "Markdown" });
});

// ── /help ────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🆘 *Yordam*\n\n/start — Testni boshlash\n/stop — Testni to'xtatish\n/score — Joriy natija\n\n⏱ Har bir savolga *${TIMEOUT_SEC} soniya* vaqt beriladi.\nJavob bermasangiz, savol avtomatik o'tadi.`,
    { parse_mode: "Markdown" }
  );
});

// ── Callback ─────────────────────────────────────────
bot.on("callback_query", async (cq) => {
  const chatId = cq.message.chat.id;
  const data = cq.data;
  bot.answerCallbackQuery(cq.id);

  // Fan tanlash
  if (data.startsWith("subject_")) {
    clearTimeout(timers[chatId]);
    const subject = data.replace("subject_", "");
    const total = questions[subject].length;
    const name = subject === "business_english" ? "Business English" : "Raqamli biznesni boshqarish";
    sessions[chatId] = { subject, index: 0, score: 0 };
    bot.sendMessage(chatId,
      `✅ *${name}* tanlandi!\n📝 Jami: *${total}* ta savol\n⏱ Har savolga *${TIMEOUT_SEC} soniya* vaqt\n\nTayyor bo'lsangiz boshlang! 🚀`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "▶️ Boshlash!", callback_data: "start_quiz" }]] },
      }
    );
    return;
  }

  if (data === "start_quiz") { sendQuestion(chatId); return; }

  // Javob
  if (data.startsWith("ans_")) {
    const session = sessions[chatId];
    if (!session) return;

    // Timerni darhol o'chirish
    clearTimeout(timers[chatId]);

    const userAns = data.replace("ans_", "");
    const allQ = questions[session.subject];
    const q = allQ[session.index];
    const correct = q.answer;
    const letters = ["A", "B", "C", "D"];
    const userText  = q.options[letters.indexOf(userAns)];
    const rightText = q.options[letters.indexOf(correct)];

    // Tugmalarni o'chirish
    try {
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: cq.message.message_id,
      });
    } catch (e) {}

    if (userAns === correct) {
      session.score++;
      await bot.sendMessage(chatId,
        `🎉✨ *To'g'ri!* ✨🎉\n\n✅ ${rightText}`,
        { parse_mode: "Markdown" }
      );
    } else {
      await bot.sendMessage(chatId,
        `❌ *Noto'g'ri!*\n\nSizning javobingiz: ${userText}\n✅ To'g'ri javob: *${rightText}*`,
        { parse_mode: "Markdown" }
      );
    }

    session.index++;
    setTimeout(() => {
      if (session.index < allQ.length) sendQuestion(chatId);
      else sendResult(chatId);
    }, 1200);
    return;
  }

  // Restart
  if (data === "restart" || data === "main_menu") {
    clearTimeout(timers[chatId]);
    delete sessions[chatId];
    bot.sendMessage(chatId, "Fan tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🇬🇧 Business English (100 savol)", callback_data: "subject_business_english" }],
          [{ text: "💻 Raqamli biznesni boshqarish", callback_data: "subject_raqamli_biznes" }],
        ],
      },
    });
  }
});

bot.on("polling_error", (err) => console.error("❌", err.message));
process.on("SIGINT", () => {
  Object.values(timers).forEach(clearTimeout);
  bot.stopPolling();
  process.exit(0);
});
