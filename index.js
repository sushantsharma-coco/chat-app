const app = require("express")();
const http = require("http");
const { Server } = require("socket.io");

const env = require("dotenv");
const cors = require("cors");

const authRouter = require("./routes/auth/auth.routes");
const chatRouter = require("./routes/app/chats.routes");
const allUsersRouter = require("./routes/app/allUsers.routes");

const { dbConnect } = require("./db/dbConnect.db");
const { json, urlencoded } = require("express");

env.config({ path: "./secret.env" });

dbConnect();

const server = http.createServer(app);
const io = new Server(server);

app.use(
  cors({
    origin: ["*", "http://localhost:5173"],
  })
);
app.use(json());
app.use(urlencoded({ extended: true }));

io.on("connection", (socket) => {
  console.log("user connected via socket :", socket.id);

  socket.on("msg", (msg) => {
    console.log(msg);
    io.emit("resp_msg", `Hi 😁${msg}`);
  });

  socket.broadcast.emit("all", `${socket.id} is online`);

  socket.on("disconnect", () => {
    socket.broadcast.emit("all", `${socket.id} is offline`);
    console.log("user disconnected");
  });
});

app.get("/", (req, res) => {
  return res.status(200).send({ message: "home page", statusCode: 200 });
});

app.use("/api/v1/auth", authRouter.router);
app.use("/api/v1/chat", chatRouter.router);
app.use("/api/v1/users", allUsersRouter.router);

server.listen(process.env.PORT, () => {
  console.log("server running on port:", process.env.PORT);
});
