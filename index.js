const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;

  msg.new_chat_members.forEach(async (user) => {
    await bot.sendMessage(chatId, 
      `🎉 Bienvenido ${user.first_name} a TechnNL Mods 🚀

📌 Reglas:
1️⃣ Respeto
2️⃣ No Spam

Disfruta el grupo.`,
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

console.log("Bot running...");
