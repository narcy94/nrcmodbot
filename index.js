bot.on("message", async (msg) => {

  if (msg.chat.id !== GROUP_ID) return;
  if (msg.from.is_bot) return;

  // 🔹 BIENVENIDA
  if (msg.new_chat_members) {
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
