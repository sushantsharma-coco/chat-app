const User = require("../../models/user.model");
const { ApiError } = require("../../utils/ApiError.utils");
const { ApiResponse } = require("../../utils/ApiResponse.utils");

const getAllUsers = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user creds");

    const users = await User.find({ _id: { $ne: req.user?._id } }).select(
      "userId email"
    );

    return res
      .status(200)
      .send(new ApiResponse(200, users, "all users fetched successfully"));
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

const getUsersInContact = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "invalid user creds");

    const users = await User.aggregate([
      {
        $match: {
          userId: req.user.userId,
        },
      },
      {
        $lookup: {
          from: "chats",
          localField: "userId",
          foreignField: "senderId",
          as: "result",
        },
      },
      {
        $project: {
          "result.reciverId": 1,
          "result.reciverRef": 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "result.reciverId",
          foreignField: "userId",
          as: "alpha",
        },
      },
      {
        $project: {
          "alpha.name": 1,
          "alpha.email": 1,
          _id: 0,
        },
      },
    ]);

    return res
      .status(200)
      .send(new ApiResponse(200, users, "all users fetched successfully"));
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

module.exports = { getAllUsers, getUsersInContact };
