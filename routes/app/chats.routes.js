const {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  blockUser,
  updateMessageSecondApproach,
  unBlockUser,
} = require("../../controllers/app/chats.controller");
const { auth } = require("../../middlewares/auth.middleware");

const router = require("express").Router();

router.use(auth);

router.route("/:reciverId").post(sendMessage).get(getMessages);
router
  .route("/:reciverId/:message_id")
  // .patch(updateMessage)
  .delete(deleteMessage);

router.route("/s/:reciverId/:message_id").patch(updateMessageSecondApproach);

router.route("/blc-usr/:user_id").patch(blockUser);
router.route("/un-blc-usr/:user_id").patch(unBlockUser);

module.exports = { router };
