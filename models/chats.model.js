const mongoose = require("mongoose");

const chatsSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
      trim: true,
    },
    senderId: {
      type: String,
      required: true,
      trim: true,
    },
    senderRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reciverId: {
      type: String,
      required: true,
      trim: true,
    },
    reciverRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    messages: [
      {
        message: {
          type: String,
          required: true,
          trim: true,
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chats", chatsSchema);
