const app = require("express")();
const http = require("http");
const socket = require("socket.io");

const env = require("dotenv");

env.config({ path: "./secret.env" });

const server = http.createServer(app);
const io = socket(server);

io.on("connection", () => {
  console.log("user connected");

  socket.on("msg", (msg) => {
    console.log(msg);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log("server running on port:", process.env.PORT);
});
