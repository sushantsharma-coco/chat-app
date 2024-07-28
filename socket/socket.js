const { Server } = require("socket.io");
const http = require("http");
const Conversation = require("../models/conversation.model");
const mongoose = require("mongoose");
const Message = require("../models/message.model");
const app = require("express")();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const userSocketMap = {}; //{userId:socket.id}

const getReciverSocketId = (reciverId) => {
  return userSocketMap[reciverId];
};

io.on("connection", (socket) => {
  socket.broadcast.emit("all", `${socket.id}  connected`);

  const userId = socket.handshake.query.userId;

  if (userId) userSocketMap[userId] = socket.id;
  io.emit("onlineUsers", Object.keys(userSocketMap));

  socket.on("markMessageAsSeen", async ({ senderId, reciverId }) => {
    try {
      const  messages  = await Conversation.aggregate([
        {
          $match: {
            participants: {
              $all: [
                new mongoose.Types.ObjectId(senderId),
                new mongoose.Types.ObjectId(reciverId),
              ],
            },
          },
        },
        {
          $lookup: {
            from: "messages",
            localField: "messages",
            foreignField: "_id",
            as: "messages",
          },
        },
      ]);

      console.log(messages[0].messages);

      const messageIds = messages[0].messages.map((msg) => msg._id);

      await Message.updateMany(
        { _id: { $in: messageIds }, isSeen: false },
        { $set: { isSeen: true } }
      );

      io.to(userSocketMap[reciverId]).emit("messageSeen", messageIds);
    } catch (error) {
      console.error("error occured:", error?.message);
    }
  });

  socket.on("msg", (msg) => {
    socket.broadcast.emit("msg", `  from: ${socket.id}  \n message :${msg}`);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("all", `${socket.id} disconnected`);

    delete userSocketMap[userId];
    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
});

module.exports = { app, server, io, getReciverSocketId };
