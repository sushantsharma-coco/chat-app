const {
  sendMessage,
  getMessages,
} = require("../../controllers/app/chats.controller");
const { auth } = require("../../middlewares/auth.middleware");

const router = require("express").Router();

router.use(auth);

router.route("/:reciverId").post(sendMessage).get(getMessages);

module.exports = { router };
