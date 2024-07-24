const Chats = require("../../models/chats.model");
const User = require("../../models/user.model");
const { randomUUID } = require("crypto");
const { ApiError } = require("../../utils/ApiError.utils");
const { ApiResponse } = require("../../utils/ApiResponse.utils");

const sendMessage = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user credentials");

    const { reciverId } = req.params;
    const senderId = req.user.userId;
    let message = req.body;

    const reciverExists = await User.findOne({ userId: reciverId }).select(
      "_id userId"
    );

    if (!reciverExists)
      throw new ApiError(404, "user with reciverId not found in the system");

    if (reciverExists?.userId == req.user?.userId) message.isSeen = true;

    // if chat exists
    const chatExists = await Chats.findOne({ reciverId, senderId });
    if (chatExists) {
      chatExists.messages.push({ ...message });

      await chatExists.save();

      return res
        .status(201)
        .send(
          new ApiResponse(
            201,
            { from: senderId, to: reciverId, ...message },
            "message sent successfully"
          )
        );
    }

    // if chat doesn't exists
    const chatId = randomUUID();
    const newChat = await Chats.create({
      chatId,
      senderId,
      senderRef: req.user?._id,
      reciverId,
      reciverRef: reciverExists?._id,
      messages: [message],
    });

    if (!newChat) throw new ApiError(500, "unable to send message to reciver");

    return res
      .status(201)
      .send(
        new ApiResponse(
          201,
          { from: senderId, to: reciverId, ...message },
          "message sent successfully"
        )
      );
  } catch (error) {
    console.error("error occured :", error?.message);

    return res
      .status(error?.statusCode || 500)
      .send(
        new ApiError(
          error?.statusCode || 500,
          error?.message || "internal server error",
          error?.errors
        )
      );
  }
};

const getMessages = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user credentials");

    const { reciverId } = req.params;
    const senderId = req.user.userId;

    const chatExists = await Chats.findOne({ senderId, reciverId });

    if (!chatExists)
      throw new ApiError(
        404,
        "chat between you and  user with reciverId doesn't exists"
      );

    return res
      .status(200)
      .send(
        new ApiResponse(
          200,
          { messages: chatExists.messages },
          "message sent successfully"
        )
      );
  } catch (error) {
    console.error("error occured :", error?.message);

    return res
      .status(error?.statusCode || 500)
      .send(
        new ApiError(
          error?.statusCode || 500,
          error?.message || "internal server error",
          error?.errors
        )
      );
  }
};

module.exports = { sendMessage, getMessages };
