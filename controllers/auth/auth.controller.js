const User = require("../../models/user.model");
const { ApiError } = require("../../utils/ApiError.utils");
const { ApiResponse } = require("../../utils/ApiResponse.utils");

const { randomUUID } = require("crypto");

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV == "production",
};

const loginUser = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || email == "" || !name || name == "")
      throw new ApiError(400, "email or name was sent empty");

    let user = await User.findOne({ email });

    if (!user) {
      let userId = randomUUID();
      user = await User.create({ email, name, userId, isBlocked: [] });
    }

    if (!user)
      throw new ApiError(500, "user creation during login unsuccessful");

    const accessToken = await user.generateAccessToken();

    user._id = null;

    return res
      .cookie("accessToken", accessToken, options)
      .status(200)
      .send(
        new ApiResponse(
          200,
          { user, accessToken },
          "user logged-in successfully"
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

const logoutUser = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "'invalid user credentials");

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .send(new ApiResponse(200, {}, "user logged-out successfully"));
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

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user?._id)
      throw new ApiError(401, "'invalid user credentials");

    const blockedUsers = await User.findById(req.user?._id).select(
      "isBlockedByUser"
    );

    return res
      .status(200)
      .send(
        new ApiResponse(
          200,
          { user: req.user, blockedUsers },
          "current user fetched successfully"
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

module.exports = { loginUser, logoutUser, getCurrentUser };
