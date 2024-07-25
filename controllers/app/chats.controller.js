const Message = require("../../models/message.model");
const Conversation = require("../../models/conversation.model");
const User = require("../../models/user.model");
const { ApiError } = require("../../utils/ApiError.utils");
const { ApiResponse } = require("../../utils/ApiResponse.utils");
const { getReciverSocketId, io } = require("../../socket/socket");
const { isValidObjectId } = require("mongoose");

const sendMessage = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user credentials");

    const { reciverId } = req.params;
    const senderId = req.user?._id;

    if (!isValidObjectId(reciverId))
      throw new ApiError(400, "invalid reciver user's _id");

    if (!isValidObjectId(senderId))
      throw new ApiError(400, "invalid sender user's _id");

    let { message } = req.body;

    const reciverExists = await User.findById(reciverId).select("_id userId");

    if (!reciverExists)
      throw new ApiError(404, "user with reciverId not found in the system");

    // if chat exists
    let convo = await Conversation.findOne({
      participants: { $all: [senderId, reciverId] },
    });

    if (!convo) {
      convo = await Conversation.create({
        participants: [senderId, reciverId],
      });
    }

    const newMsg = await Message.create({
      senderId,
      reciverId,
      message,
    });

    convo.messages.push(newMsg?._id);
    await convo.save();

    // socket
    const reciverSocketId = getReciverSocketId(reciverId);
    if (reciverSocketId) {
      io.to(reciverSocketId).emit("newMsg", newMsg);
    }

    return res
      .status(201)
      .send(
        new ApiResponse(
          201,
          { from: senderId, to: reciverId, message },
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
    const senderId = req.user?._id;

    const chatExists = await Conversation.findOne({
      participants: [senderId, reciverId],
    }).populate("messages");

    return res
      .status(200)
      .send(
        new ApiResponse(
          200,
          { messages: chatExists.messages },
          "messages recived successfully"
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

const updateMessageSecondApproach = async (req, res) => {
  try {
    if (req.user || !req.user?._id)
      throw new ApiError(401, "invalid user creds");

    const senderId = req.user?._id;
    const { reciverId } = req.params;
    const { message_id } = req.params;
    const { message } = req.body;

    if (!message || !reciverId || message == "" || reciverId == "")
      throw new ApiError(400, "message or reciverId not sent");

    const chats = await Chats.findOne({ senderId, reciverId });
    let count = 0;
    for (let i = 0; i < chats.length; i++) {
      if (chats[i]?._id == message_id) count = i;
    }

    const reciverSocketId = getReciverSocketId(reciverId);

    if (reciverSocketId) {
      io.to(reciverSocketId).emit("updtMsg", message);

      chats[count] = { message, isSeen: true };
    } else {
      chats[count] = { message, isSeen: false };
    }

    await chats.save();

    return res
      .status(200)
      .send(new ApiResponse(200, message, "message updated successfully"));
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
  updateMessageSecondApproach,
  deleteMessage,
  blockUser,
};
