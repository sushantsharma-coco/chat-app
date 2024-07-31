const { app, server } = require("./socket/socket");

const env = require("dotenv");
const cors = require("cors");

const authRouter = require("./routes/auth/auth.routes");
const chatRouter = require("./routes/app/chats.routes");
const allUsersRouter = require("./routes/app/allUsers.routes");

const { dbConnect } = require("./db/dbConnect.db");
const { json, urlencoded } = require("express");

env.config({ path: "./secret.env" });

dbConnect();

app.use(
  cors({
    origin: ["*", "http://localhost:5173"],
  })
);
app.use(json());
app.use(urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res
    .status(200)
    .send({
      message: "home page",
      statusCode: 200,
      github: "https://github.com/sushant81074",
    });
});

app.use("/api/v1/auth", authRouter.router);
app.use("/api/v1/chat", chatRouter.router);
app.use("/api/v1/users", allUsersRouter.router);

server.listen(process.env.PORT, () => {
  console.log("server running on port:", process.env.PORT);
});
