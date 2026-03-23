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

// 🔹 URL pública Render
const PUBLIC_URL = "https://technnlmodsbot.onrender.com";

/* =========================
   🔹 CONFIGURACIÓN
========================= */

const GROUP_ID = -1003262837658;
const CHANNEL_ID = -1001827364410;
const TIMEZONE_OFFSET = -6;

const bot = new TelegramBot(TOKEN, {
  webHook: true
});

let nightMessageId = null;

/* =========================
   🔒 MODERACIÓN (ANTI-SPAM)
========================= */

const spamMap = {};

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
  } catch {
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

bot.on("message", async (msg) => {

  if (!msg.new_chat_members) return;
  if (!msg.chat) return;
  if (msg.chat.id !== GROUP_ID) return;

  for (const user of msg.new_chat_members) {

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
          inline_keyboard: [[{
            text: "📺 Canal de YouTube",
            url: "https://youtube.com/@technnl?si=gg9_mkCh00kTDCyA"
          }]]
        }
      }
    );
  }

});

/* =========================
   🔒 ANTI ENLACES + MODO NOCHE + ANTI-SPAM
========================= */

bot.on("message", async (msg) => {

  if (!msg.chat) return;
  if (msg.chat.id !== GROUP_ID) return;
  if (msg.from?.is_bot) return;

  const text = msg.text || msg.caption || "";
  const userId = msg.from?.id;

  const member = userId
    ? await bot.getChatMember(GROUP_ID, userId)
    : null;

  const isAdmin = member && (member.status === "administrator" || member.status === "creator");

  /* ===== ANTI-SPAM ===== */

  if (!isAdmin && text && userId) {

    if (!spamMap[userId]) {
      spamMap[userId] = { last: text, count: 1 };
    } else {
      if (spamMap[userId].last === text) {
        spamMap[userId].count++;
      } else {
        spamMap[userId] = { last: text, count: 1 };
      }
    }

    if (spamMap[userId].count >= 3) {

      const until = Math.floor(Date.now() / 1000) + (48 * 60 * 60);

      await bot.restrictChatMember(msg.chat.id, userId, {
        until_date: until,
        permissions: { can_send_messages: false }
      });

      await bot.sendMessage(msg.chat.id, "🚫 Usuario silenciado por spam (48h)");

      spamMap[userId].count = 0;
      return;
    }
  }

  /* ===== PERMITIR CANAL ===== */

  if (msg.sender_chat && msg.sender_chat.id === CHANNEL_ID) {
    return;
  }

  /* ===== ANTI LINKS ===== */

  const urlRegex = /(https?:\/\/[^\s]+)/gi;

  if (urlRegex.test(text)) {

    const allowed = text.includes("play.google.com");

    if (!allowed) {

      if (isAdmin) return;

      await bot.deleteMessage(msg.chat.id, msg.message_id);
      return;
    }
  }

  /* ===== MODO NOCHE ===== */

  if (isNightTime()) {

    if (isAdmin) return;

    await bot.deleteMessage(msg.chat.id, msg.message_id);
  }

});

/* =========================
   🔇 /mute
========================= */

bot.onText(/\/mute/, async (msg) => {

  if (!msg.reply_to_message) {
    return bot.sendMessage(msg.chat.id, "❌ Responde al mensaje del usuario");
  }

  let isAdmin = false;

  if (msg.sender_chat) {
    isAdmin = true;
  } else {
    const admin = await bot.getChatMember(msg.chat.id, msg.from.id);
    isAdmin = admin.status === "administrator" || admin.status === "creator";
  }

  if (!isAdmin) {
    return bot.sendMessage(msg.chat.id, "❌ Solo admins pueden usar este comando");
  }

  const userId = msg.reply_to_message.from?.id;

  try {

    const target = await bot.getChatMember(msg.chat.id, userId);

    if (target.status === "administrator" || target.status === "creator") {
      return bot.sendMessage(msg.chat.id, "❌ No puedes mutear a un admin");
    }

    const until = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    await bot.restrictChatMember(msg.chat.id, userId, {
      until_date: until,
      permissions: { can_send_messages: false }
    });

    await bot.sendMessage(msg.chat.id, "🔇 Usuario silenciado por 24 horas");

  } catch (err) {
    console.log(err);
    bot.sendMessage(msg.chat.id, "❌ Error al mutear");
  }

});

/* =========================
   🔊 /unmute (FIX REAL FINAL)
========================= */

bot.onText(/\/unmute/, async (msg) => {

  if (!msg.reply_to_message) {
    return bot.sendMessage(msg.chat.id, "❌ Responde al mensaje del usuario");
  }

  let isAdmin = false;

  if (msg.sender_chat) {
    isAdmin = true;
  } else {
    const admin = await bot.getChatMember(msg.chat.id, msg.from.id);
    isAdmin = admin.status === "administrator" || admin.status === "creator";
  }

  if (!isAdmin) {
    return bot.sendMessage(msg.chat.id, "❌ Solo admins pueden usar este comando");
  }

  const userId = msg.reply_to_message.from.id;

  try {

    await bot.restrictChatMember(msg.chat.id, userId, {
      until_date: 0,
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_invite_users: true
      }
    });

    await bot.sendMessage(msg.chat.id, "🔊 Usuario desmuteado correctamente");

  } catch (err) {
    console.log(err);
    bot.sendMessage(msg.chat.id, "❌ Error al desmutear");
  }

});

/* =========================
   🌒 MODO NOCHE AUTOMÁTICO
========================= */

setInterval(async () => {

  const now = getLocalTime();
  const hour = now.getHours();
  const minute = now.getMinutes();

  try {

    if (hour === 23 && minute === 0 && !nightMessageId) {

      const msg = await bot.sendMessage(
        GROUP_ID,
`🌒 <b>MODO NOCHE ACTIVADO</b>

El grupo entra en descanso nocturno.

⏳ No se podrán enviar mensajes hasta las 6:00 AM.`,
        { parse_mode: "HTML" }
      );

      nightMessageId = msg.message_id;
    }

    if (hour === 6 && minute === 0 && nightMessageId) {

      await bot.deleteMessage(GROUP_ID, nightMessageId).catch(()=>{});

      await bot.sendMessage(
        GROUP_ID,
`🌅 <b>FIN MODO NOCHE</b>

✅ Ya puedes enviar mensajes.`,
        { parse_mode: "HTML" }
      );

      nightMessageId = null;
    }

  } catch {}

}, 60000);

console.log("Bot running...");
