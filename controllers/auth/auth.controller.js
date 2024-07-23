const User = require("../../models/user.model");
const { ApiError } = require("../../utils/ApiError.utils");
const { ApiResponse } = require("../../utils/ApiResponse.utils");

const loginUser = async (req, res) => {
  try {
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
