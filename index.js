const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;

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

console.log("Bot running...");
