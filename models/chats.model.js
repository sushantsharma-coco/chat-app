const mongoose = require("mongoose");

const chatsSchema = new mongoose.Schema(
  {
    chatId: {},
    senderId: {},
    reciverId: {},
    chatId: {},
    message: {},
    isSeen: {},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chats", chatsSchema);
