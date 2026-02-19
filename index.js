const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// 🔹 ID de tu grupo
const GROUP_ID = -1003262837658;

// 🔹 Zona horaria Nicaragua (UTC-6)
const TIMEZONE_OFFSET = -6;

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

/* =========================
   🔹 BIENVENIDA
========================= */

bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;

  if (chatId !== GROUP_ID) return;

  msg.new_chat_members.forEach(async (user) => {
    await bot.sendMessage(chatId,
      `🎉 Bienvenid@ ${user.first_name} a TechnNL Mods 🚀

📌 Reglas:
1️⃣ Respeto
2️⃣ No Spam
3️⃣ No enlaces de otros grupos
4️⃣ ✅ Preguntar de manera cortés y amable.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📺 Canal de YouTube",
                url: "https://youtube.com/@technnl?si=gg9_mkCh00kTDCyA"
              }
            ]
          ]
        }
      }
    );
  });
});

/* =========================
   🌒 MODO NOCHE
========================= */

let lastNightAnnouncement = null;
let lastMorningAnnouncement = null;

function getLocalTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * TIMEZONE_OFFSET));
}

function isNightTime() {
  const hour = getLocalTime().getHours();
  return hour >= 23 || hour < 6;
}

// 🔹 Anuncio automático cada minuto
setInterval(async () => {
  const now = getLocalTime();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const today = now.toDateString();

  // 🕚 23:00 exacto
  if (hour === 23 && minute === 0 && lastNightAnnouncement !== today) {
    lastNightAnnouncement = today;

    await bot.sendMessage(GROUP_ID,
`🌒  *MODO NOCHE ACTIVADO*

A partir de este momento el grupo entra en descanso nocturno.

⏳ No será posible enviar mensajes hasta las 6:00 AM.

Gracias por tu comprensión.`,
      { parse_mode: "Markdown" }
    );
  }

  // 🕕 06:00 exacto
  if (hour === 6 && minute === 0 && lastMorningAnnouncement !== today) {
    lastMorningAnnouncement = today;

    await bot.sendMessage(GROUP_ID,
`🌅  *FIN MODO NOCHE*

✅ El grupo vuelve a estar activo.

Ahora puedes enviar mensajes con normalidad.`,
      { parse_mode: "Markdown" }
    );
  }

}, 60000);

/* =========================
   🔒 BLOQUEO DE MENSAJES
========================= */

bot.on("message", async (msg) => {
  if (msg.chat.id !== GROUP_ID) return;
  if (msg.from.is_bot) return;

  if (isNightTime()) {
    try {
      const member = await bot.getChatMember(GROUP_ID, msg.from.id);

      // 🔹 No borrar mensajes de admins
      if (member.status === "administrator" || member.status === "creator") {
        return;
      }

      await bot.deleteMessage(msg.chat.id, msg.message_id);

    } catch (err) {
      console.log("Error al borrar mensaje:", err.message);
    }
  }
});

console.log("Bot running...");
