const { Server } = require("socket.io");
const http = require("http");
const app = require("express")();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://chateo-wheat.vercel.app/",
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
