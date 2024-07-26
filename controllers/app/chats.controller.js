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

    const reciverExists = await User.findById(reciverId);
    const user = await User.findById(senderId);

    if (!reciverExists)
      throw new ApiError(404, "user with reciverId not found in the system");

    if (reciverExists.isBlockedByUser.includes({ userRef: senderId }))
      throw new ApiError(
        400,
        "you can't send message to reciver as you are blocked by the reciver"
      );

    if (user.isBlockedByUser.includes({ userRef: reciverId }))
      throw new ApiError(
        400,
        "you can't send message to reciver as you've blocked the reciver"
      );

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
      console.log("newMsg", newMsg);
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
      participants: { $all: [senderId, reciverId] },
    }).populate("messages");

    return res
      .status(200)
      .send(
        new ApiResponse(
          200,
          { messages: chatExists?.messages },
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
    console.log("update running");
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user credentials");

    const senderId = req.user?.userId;
    const { reciverId } = req.params;
    const { message_id } = req.params;

    if (!isValidObjectId(reciverId))
      throw new ApiError(400, "invalid reciver's user _id");

    if (!isValidObjectId(message_id))
      throw new ApiError(400, "invalid message's _id");

    let message = req.body;

    console.log(senderId, reciverId);

    const messages = await Conversation.findOne({
      participants: { $all: [senderId, reciverId] },
    }).populate("messages");

    console.log("messages", messages);

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

// i have two approaches this this
// one is that i directly find the message and update the it and send it in the response to the client which is more efficient
// sencond is i find the message update it and then collect all the messages with udpated message and send it to the client which is less effiecient

// NUMBER_1_APP
const updateMessageSecondApproach = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user creds");

    const { reciverId } = req.params;
    const { message_id } = req.params;
    const { message } = req.body;

    if (!message || !reciverId || message == "" || reciverId == "")
      throw new ApiError(400, "message or reciverId not sent");

    const updtMsg = await Message.findByIdAndUpdate(
      message_id,
      {
        $set: {
          message,
        },
      },
      { new: true }
    );

    console.log(updtMsg);

    const reciverSocketId = getReciverSocketId(reciverId);

    if (reciverSocketId) {
      io.to(reciverSocketId).emit("updtMsg", message);
      console.log("updtMsg", updtMsg);
    }
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

// NUMBER_2_APP
const updateMessageSecondApproach2 = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user creds");

    const { reciverId } = req.params;
    const { message_id } = req.params;
    const { message } = req.body;

    let updtMsg = await Message.findByIdAndUpdate(
      message_id,
      {
        $set: {
          message,
        },
      },
      { new: true }
    );

    if (!updtMsg) throw new ApiError(404, "message not found to update");

    const reciverSocketId = getReciverSocketId(reciverId);
    if (reciverSocketId) {
      const newMsgs = await Conversation.find({
        participants: { $all: [req.user?._id, reciverId] },
      }).populate("messages");

      io.to(reciverSocketId).emit("updtMsg", updtMsg);
      io.to(reciverSocketId).emit("newMsgs", newMsgs);

      const mySocketId = getReciverSocketId(req.user?._id);
      if (mySocketId) {
        io.to(mySocketId).emit("updtMsg", updtMsg);
        io.to(mySocketId).emit("newMsgs", newMsgs);
      }
    }
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

    const senderId = req.user?._id;
    const { reciverId } = req.params;
    const { message_id } = req.params;

    if (!isValidObjectId(reciverId))
      throw new ApiError(400, "invalid reciver's objId");

    if (!isValidObjectId(message_id))
      throw new ApiError(400, "invalid message's objId");

    const message = await Message.findByIdAndDelete(message_id);

    if (!message) throw new ApiError(404, "message not found to be updated");

    const reciverSocketId = getReciverSocketId(reciverId);
    if (reciverSocketId) {
      io.to(reciverSocketId).emit(
        "delMsgs",
        `message with message_id:${message?._id} was deleted by user with id:${senderId}`
      );
      console.log("delMsgs", message_id);

      const allMsgs = await Conversation.find({
        participants: { $all: [senderId, reciverId] },
      }).populate("messages");

      io.to(reciverSocketId).emit("allMsgs", allMsgs);
      console.log("allMsgs", allMsgs);

      const mySocketId = getReciverSocketId(senderId);

      if (mySocketId) {
        io.to(mySocketId).emit(
          "updtMsg",
          `you deleted message with message_id: ${message_id}`
        );
        console.log("updatmsg to me", message_id);

        io.to(reciverSocketId).emit("allMsgs", allMsgs);
        console.log("allMsgs to me", allMsgs);
      }
    }

    return res
      .status(200)
      .send(new ApiResponse(200, { message }, "message deleted successfully"));
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
    const { user_id } = req.params;
    const userExists = await User.findById(user_id).select("userId _id");

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
    console.log("blockUser:", you.userId);

    const sendersocketid = getReciverSocketId(req.user._id);
    if (sendersocketid)
      io.to(sendersocketid).emit("you blocked by :", reciverId);

    return res
      .status(200)
      .send(
        new ApiResponse(
          200,
          { blockedUser: isBlockedByUser[user_id] },
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
