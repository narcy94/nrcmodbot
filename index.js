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

      const fullName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;

      const usernameLine = user.username
        ? `👤 Usuario : @${user.username}`
        : `👤 Usuario : No tiene`;

      await bot.sendMessage(
        GROUP_ID,
`🎉 Bienvenid@ a TechnNL Mods ⚙️
👤 Nombre : <a href="tg://user?id=${user.id}">${fullName}</a>
${usernameLine}
👤 ID : ${user.id}
📑 Fecha : ${fecha}
🕘 Hora : ${hora}

📌 Reglas:
1️⃣ Respeto
2️⃣ No Spam
3️⃣ No enlaces de otros grupos
4️⃣ ✅ Preguntar de manera cortés y amable.<a href="https://lnk.ua/RVd5836N3">&#8203;</a>`,
        {
          parse_mode: "HTML",
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

    } catch (err) {}
  }

});

/* =========================
   🔒 ANTI ENLACES + MODO NOCHE
========================= */

bot.on("message", async (msg) => {

  if (!msg.chat) return;
  if (msg.chat.id !== GROUP_ID) return;
  if (msg.from?.is_bot) return;

  const text = msg.text || msg.caption || "";

  /* ===== ANTI LINKS ===== */

  const urlRegex = /(https?:\/\/[^\s]+)/gi;

  if (urlRegex.test(text)) {

    const allowedDomains = [
      "play.google.com"
    ];

    const allowed = allowedDomains.some(domain => text.includes(domain));

    if (!allowed) {

      try {

        const member = await bot.getChatMember(GROUP_ID, msg.from.id);

        if (member.status === "administrator" || member.status === "creator") {
          return;
        }

        await bot.deleteMessage(msg.chat.id, msg.message_id);
        return;

      } catch (err) {}
    }
  }

  /* ===== MODO NOCHE ===== */

  if (isNightTime()) {
    try {

      const member = await bot.getChatMember(GROUP_ID, msg.from.id);

      if (member.status === "administrator" || member.status === "creator") {
        return;
      }

      await bot.deleteMessage(msg.chat.id, msg.message_id);

    } catch (err) {}
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

      await bot.sendMessage(
        GROUP_ID,
`🌒 <b>MODO NOCHE ACTIVADO</b>

El grupo entra en descanso nocturno.

⏳ No se podrán enviar mensajes hasta las 6:00 AM.

Gracias por tu comprensión.`,
        { parse_mode: "HTML" }
      );
    }

    if (hour === 6 && minute === 0 && lastMorningAnnouncement !== today) {
      lastMorningAnnouncement = today;

      await bot.sendMessage(
        GROUP_ID,
`🌅 <b>FIN MODO NOCHE</b>

✅ El grupo vuelve a estar activo.

Ahora puedes enviar mensajes con normalidad.`,
        { parse_mode: "HTML" }
      );
    }

  } catch (err) {}

}, 300000); // ⬅ ahora cada 5 minutos

console.log("Bot running...");
