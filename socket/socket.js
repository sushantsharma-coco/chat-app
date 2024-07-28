const { Server } = require("socket.io");
const http = require("http");
const Conversation = require("../models/conversation.model");
const { default: mongoose } = require("mongoose");
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

  socket.on("markMessageAsSeen", async ({ conversationId, userId }) => {
    try {
      await Conversation.aggregate([
        {
          $match: {
            _id: mongoose.Schema.ObjectId(conversationId),
          },
        },
        {
          $lookup: {
            from: "messages",
            localField: "messages",
            foreignField: "_id",
            as: "message",
          },
        },
        {
          $set: {
            "message.isSeen": true,
          },
        },
      ]);

      io.to(userSocketMap[userId]).emit("messageSeen", { conversationId });
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
