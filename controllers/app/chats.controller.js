const Chats = require("../../models/chats.model");
const User = require("../../models/user.model");
const { randomUUID } = require("crypto");
const { ApiError } = require("../../utils/ApiError.utils");
const { ApiResponse } = require("../../utils/ApiResponse.utils");
const { getReciverSocketId, io } = require("../../index");

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

    // socket
    const reciverSocketId = getReciverSocketId(reciverId);
    if (reciverSocketId) {
      io.to(reciverSocketId).emit("newMsg", message);
    }

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

const deleteMessage = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user credentials");

    const senderId = req.user?.userId;
    const { reciverId } = req.params;
    const { message_id } = req.params;

    const messages = Chats.findOne({ senderId, reciverId }).select("messages");

    for (let i = 0; i < messages.length; i++) {
      if (messages[i]?._id == message_id) {
        delete messages[i];
      }
    }

    await messages.save();

    const reciverSocketId = getReciverSocketId(reciverId);
    if (reciverSocketId) io.to(reciverSocketId).emit("delMsg", messages);

    return res
      .status(200)
      .send(new ApiResponse(200, { messages }, "message deleted successfully"));
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
