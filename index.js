const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
app.use(express.json());

/* =========================
   🔐 VALIDACIONES
========================= */

if (!process.env.TOKEN) {
  console.error("ERROR: TOKEN no definido");
  process.exit(1);
}

if (!process.env.PORT) {
  console.error("ERROR: PORT no definido");
  process.exit(1);
}

const PORT = process.env.PORT;
const TOKEN = process.env.TOKEN;

// 🔹 URL pública Railway
const PUBLIC_URL = "https://nrcmodbot-production-caf5.up.railway.app";

/* =========================
   🔹 CONFIGURACIÓN
========================= */

const GROUP_ID = -1003262837658;
const TIMEZONE_OFFSET = -6;

const bot = new TelegramBot(TOKEN);

/* =========================
   🔹 CONFIGURAR WEBHOOK
========================= */

bot.setWebHook(`${PUBLIC_URL}/bot${TOKEN}`)
  .then(() => console.log("Webhook configurado correctamente"))
  .catch(err => console.log("Error configurando webhook:", err.message));

/* =========================
   🔹 ENDPOINT WEBHOOK
========================= */

app.post(`/bot${TOKEN}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error procesando update:", error);
    res.sendStatus(500);
  }
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
   🎉 BIENVENIDA
========================= */

bot.on("new_chat_members", async (msg) => {

  if (!msg.chat) return;
  if (msg.chat.id !== GROUP_ID) return;

  for (const user of msg.new_chat_members) {
    try {

      const now = getLocalTime();
      const fecha = now.toLocaleDateString("es-NI");
      const hora = now.toLocaleTimeString("es-NI", {
        hour: "2-digit",
        minute: "2-digit"
      });

      await bot.sendMessage(GROUP_ID,
`🎉 Bienvenid@ a TechnNL Mods ⚙️
👤 Nombre : ${user.first_name}
👤 ID : ${user.id}
📑 Fecha : ${fecha}
🕘 Hora : ${hora}

📌 Reglas:
1️⃣ Respeto
2️⃣ No Spam
3️⃣ No enlaces de otros grupos
4️⃣ ✅ Preguntar de manera cortés y amable.

[‎](https://lnk.ua/RVd5836N3)`,
        {
          disable_web_page_preview: false,
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

});

/* =========================
   🔒 BLOQUEO MODO NOCHE
========================= */

bot.on("message", async (msg) => {

  if (!msg.chat) return;
  if (msg.chat.id !== GROUP_ID) return;
  if (msg.from?.is_bot) return;

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
