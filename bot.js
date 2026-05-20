require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const questions = require("./questions");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi!");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
console.log("🤖 Bot ishga tushdi...");

// HTTP server (Render uchun)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot ishlayapti!");
}).listen(process.env.PORT || 3000);

// ── Foydalanuvchi holati (session) ───────────────────
// { chatId: { subject, index, score, answers } }
const sessions = {};

// ── Yordamchi funksiyalar ────────────────────────────
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function sendQuestion(chatId) {
  const session = sessions[chatId];
  const allQ = questions[session.subject];
  const q = allQ[session.index];

  const text = `📝 *${session.index + 1}/${allQ.length} - savol:*\n\n${q.question}`;

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: q.options[0], callback_data: "ans_A" }, { text: q.options[1], callback_data: "ans_B" }],
        [{ text: q.options[2], callback_data: "ans_C" }, { text: q.options[3], callback_data: "ans_D" }],
      ],
    },
  });
}

function sendResult(chatId) {
  const session = sessions[chatId];
  const total = questions[session.subject].length;
  const score = session.score;
  const percent = Math.round((score / total) * 100);

  let emoji = "😔";
  let comment = "Ko'proq o'qing!";
  if (percent >= 80) { emoji = "🏆"; comment = "Ajoyib natija!"; }
  else if (percent >= 60) { emoji = "👍"; comment = "Yaxshi, lekin yaxshilanish mumkin!"; }
  else if (percent >= 40) { emoji = "😐"; comment = "O'rtacha, ko'proq mashq qiling!"; }

  const subjectName = session.subject === "business_english" ? "Business English" : "Raqamli biznesni boshqarish";

  bot.sendMessage(chatId,
    `${emoji} *Test yakunlandi!*\n\n📚 Fan: ${subjectName}\n✅ To'g'ri: ${score}/${total}\n📊 Natija: ${percent}%\n\n💬 ${comment}`,
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
}

// ── /start ───────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "Foydalanuvchi";

  bot.sendMessage(chatId,
    `👋 Salom, *${name}*!\n\nMen test botman. Quyidagi fanlardan birini tanlang:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🇬🇧 Business English", callback_data: "subject_business_english" }],
          [{ text: "💻 Raqamli biznesni boshqarish", callback_data: "subject_raqamli_biznes" }],
        ],
      },
    }
  );
});

// ── /help ────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🆘 *Yordam*\n\n/start — Testni boshlash\n/stop — Testni to'xtatish\n/score — Joriy natija\n\nTest davomida A/B/C/D tugmalardan birini bosing.`,
    { parse_mode: "Markdown" }
  );
});

// ── /stop ────────────────────────────────────────────
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  if (sessions[chatId]) {
    delete sessions[chatId];
    bot.sendMessage(chatId, "⛔ Test to'xtatildi. /start bilan qayta boshlash mumkin.");
  } else {
    bot.sendMessage(chatId, "Hozir faol test yo'q. /start bilan boshlang.");
  }
});

// ── /score ───────────────────────────────────────────
bot.onText(/\/score/, (msg) => {
  const chatId = msg.chat.id;
  const session = sessions[chatId];
  if (!session) {
    bot.sendMessage(chatId, "Hozir faol test yo'q. /start bilan boshlang.");
    return;
  }
  const total = questions[session.subject].length;
  bot.sendMessage(chatId, `📊 Joriy natija: *${session.score}/${session.index}* to'g'ri javob`, { parse_mode: "Markdown" });
});

// ── Callback handler ─────────────────────────────────
bot.on("callback_query", (cq) => {
  const chatId = cq.message.chat.id;
  const data = cq.data;
  bot.answerCallbackQuery(cq.id);

  // Fan tanlash
  if (data.startsWith("subject_")) {
    const subject = data.replace("subject_", "");
    const total = questions[subject].length;
    const subjectName = subject === "business_english" ? "Business English" : "Raqamli biznesni boshqarish";

    sessions[chatId] = { subject, index: 0, score: 0 };

    bot.sendMessage(chatId,
      `✅ *${subjectName}* tanlandi!\n📝 Jami: ${total} ta savol\n\nBoshlaymizmi?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "▶️ Boshlash", callback_data: "start_quiz" }]],
        },
      }
    );
    return;
  }

  // Testni boshlash
  if (data === "start_quiz") {
    sendQuestion(chatId);
    return;
  }

  // Javob berish
  if (data.startsWith("ans_")) {
    const session = sessions[chatId];
    if (!session) {
      bot.sendMessage(chatId, "Test topilmadi. /start bilan qayta boshlang.");
      return;
    }

    const userAnswer = data.replace("ans_", "");
    const allQ = questions[session.subject];
    const q = allQ[session.index];
    const correct = q.answer;

    if (userAnswer === correct) {
      session.score++;
      bot.sendMessage(chatId, `✅ *To'g'ri!* ${q.options[["A","B","C","D"].indexOf(correct)]}`, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId,
        `❌ *Noto'g'ri!*\nSizning javobingiz: ${q.options[["A","B","C","D"].indexOf(userAnswer)]}\n✅ To'g'ri javob: ${q.options[["A","B","C","D"].indexOf(correct)]}`,
        { parse_mode: "Markdown" }
      );
    }

    session.index++;

    // Keyingi savol yoki natija
    setTimeout(() => {
      if (session.index < allQ.length) {
        sendQuestion(chatId);
      } else {
        sendResult(chatId);
      }
    }, 1000);
    return;
  }

  // Qayta boshlash
  if (data === "restart" || data === "main_menu") {
    bot.sendMessage(chatId, "Fan tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🇬🇧 Business English", callback_data: "subject_business_english" }],
          [{ text: "💻 Raqamli biznesni boshqarish", callback_data: "subject_raqamli_biznes" }],
        ],
      },
    });
  }
});

// ── Xatolar ─────────────────────────────────────────
bot.on("polling_error", (err) => console.error("❌", err.message));
process.on("SIGINT", () => { bot.stopPolling(); process.exit(0); });
