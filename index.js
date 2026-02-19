const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
app.use(express.json());

// 🔐 Validación obligatoria
if (!process.env.TOKEN) {
  console.error("ERROR: TOKEN no definido en variables de entorno");
  process.exit(1);
}

if (!process.env.PORT) {
  console.error("ERROR: PORT no definido");
  process.exit(1);
}

const PORT = process.env.PORT;
const TOKEN = process.env.TOKEN;

// 🔹 ID de tu grupo
const GROUP_ID = -1003262837658;

// 🔹 Zona horaria Nicaragua (UTC-6)
const TIMEZONE_OFFSET = -6;

// 🔹 Crear bot SIN polling
const bot = new TelegramBot(TOKEN);

/* =========================
   🔹 ENDPOINT WEBHOOK
========================= */

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* =========================
   🔹 RUTA BASE
========================= */

app.get('/', (req, res) => {
  res.send('Bot is running');
});

/* =========================
   🔹 INICIAR SERVIDOR
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* =========================
   🔹 FUNCIONES HORARIO
========================= */

function getLocalTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * TIMEZONE_OFFSET));
}

function isNightTime() {
  const hour = getLocalTime().getHours();
  return hour >= 23 || hour < 6;
}

/* =========================
   🔹 MENSAJES
========================= */

bot.on("message", async (msg) => {

  if (!msg.chat) return;
  if (msg.chat.id !== GROUP_ID) return;
  if (msg.from?.is_bot) return;

  // 🔹 BIENVENIDA
  if (msg.new_chat_members) {
    for (const user of msg.new_chat_members) {
      try {
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
      } catch (err) {
        console.log("Error enviando bienvenida:", err.message);
      }
    }
    return;
  }

  // 🔒 BLOQUEO MODO NOCHE
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

/* =========================
   🌒 MODO NOCHE AUTOMÁTICO
========================= */

let lastNightAnnouncement = null;
let lastMorningAnnouncement = null;

setInterval(async () => {

  const now = getLocalTime();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const today = now.toDateString();

  try {

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

    if (hour === 6 && minute === 0 && lastMorningAnnouncement !== today) {
      lastMorningAnnouncement = today;

      await bot.sendMessage(GROUP_ID,
`🌅 *FIN MODO NOCHE*

✅ El grupo vuelve a estar activo.

Ahora puedes enviar mensajes con normalidad.`,
        { parse_mode: "Markdown" }
      );
    }

  } catch (err) {
    console.log("Error en modo noche:", err.message);
  }

}, 60000);

console.log("Bot running...");
