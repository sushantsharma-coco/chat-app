const Chats = require("../../models/chats.model");
const User = require("../../models/user.model");
const { randomUUID } = require("crypto");
const { ApiError } = require("../../utils/ApiError.utils");
const { ApiResponse } = require("../../utils/ApiResponse.utils");
const { getReciverSocketId, io } = require("../../socket/socket");

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

const updateMessage = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user credentials");

    const senderId = req.user?.userId;
    const { reciverId } = req.params;
    const { message_id } = req.params;

    let message = req.body;

    const messages = await Chats.findOne({ senderId, reciverId });

    messages.forEach((element) => {
      if (element?._id == message_id) {
        element.message = message;
        element.isSeen = false;

        message = element;
      }
    });

    const reciverSocketId = getReciverSocketId(reciverId);
    if (reciverSocketId) {
      io.to("updtMsg", { messages, updatedMessage: message, isSeen: true });

      messages.forEach((element) => {
        if (element?._id == message_id) {
          element.isSeen = true;
        }
      });
    }

    await messages.save();

    return res
      .status(200)
      .send(
        new ApiResponse(
          200,
          { message, isSeen: false },
          "message updated successfully"
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

const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const userExists = await User.findOne({ userId }).select("userId _id");

    if (!userExists) throw new ApiError(404, "user with userId not found");

    const you = User.findByIdAndUpdate(
      req.user?._id,
      {
        $push: {
          isBlockedByUser: {
            userId: userExists.userId,
            userRef: userExists?._id,
          },
        },
      },
      { new: true }
    );

    if (!you) throw new ApiError(500, "unable to block user");

    const reciverSocketId = getReciverSocketId(userExists.userId);
    if (reciverSocketId)
      io.to(reciverSocketId).emit("blocked", `${you.userId} blocked you`);

    return res
      .status(200)
      .send(
        new ApiResponse(
          200,
          { blockedUser: isBlockedByUser[userId] },
          "user with sent userId blocked successfully"
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

module.exports = {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  blockUser,
};
