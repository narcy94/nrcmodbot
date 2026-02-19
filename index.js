const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// 🔹 ID de tu grupo
const GROUP_ID = -1003262837658;

// 🔹 Zona horaria Nicaragua (UTC-6)
const TIMEZONE_OFFSET = -6;

// 🔹 Crear bot SIN polling
const bot = new TelegramBot(process.env.TOKEN);

// 🔹 Configurar webhook cuando el servidor inicia
const webhookUrl = process.env.RENDER_EXTERNAL_URL + "/bot" + process.env.TOKEN;

bot.setWebHook(webhookUrl)
  .then(() => console.log("Webhook configurado"))
  .catch(err => console.log("Error webhook:", err.message));

// 🔹 Endpoint que recibe actualizaciones de Telegram
app.post('/bot' + process.env.TOKEN, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 🔹 Ruta base
app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

/* =========================
   🔹 BIENVENIDA
========================= */

bot.on('new_chat_members', async (msg) => {
  if (msg.chat.id !== GROUP_ID) return;

  msg.new_chat_members.forEach(async (user) => {
    await bot.sendMessage(GROUP_ID,
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

setInterval(async () => {
  const now = getLocalTime();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const today = now.toDateString();

  // 🕚 23:00
  if (hour === 23 && minute === 0 && lastNightAnnouncement !== today) {
    lastNightAnnouncement = today;

    await bot.sendMessage(GROUP_ID,
`🌒 *MODO NOCHE ACTIVADO*

El grupo entra en descanso nocturno.

⏳ No se podrán enviar mensajes hasta las 6:00 AM.

Gracias por tu comprensión.`,
      { parse_mode: "Markdown" }
    );
  }

  // 🕕 06:00
  if (hour === 6 && minute === 0 && lastMorningAnnouncement !== today) {
    lastMorningAnnouncement = today;

    await bot.sendMessage(GROUP_ID,
`🌅 *FIN MODO NOCHE*

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
