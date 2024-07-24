const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/ApiError.utils");

const auth = async (req, res, next) => {
  try {
    console.log("auth is running");
    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!accessToken) throw new ApiError(404, "access-token not found");

    const tokenData = await jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    if (tokenData?.exp && tokenData.exp < Date.now() / 1000)
      throw new ApiError(401, "token has been expired");

    if (!tokenData || !tokenData?._id)
      throw new ApiError(401, "invalid user creds");

    const user = await User.findById(tokenData?._id);

    if (!user) throw new ApiError(404, "user not found, try logging-in");

    req.user = user;
    next();
  } catch (error) {
    console.error("error occured :", error?.message);

    return res
      .status(error?.statusCode || 401)
      .send(
        new ApiError(
          error?.statusCode || 401,
          error?.message || "unauthorised user",
          error?.errors
        )
      );
  }
};

module.exports = { auth };
