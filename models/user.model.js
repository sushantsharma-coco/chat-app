const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    isBlocked: [
      {
        userId: { type: String, trim: true },
        userRef: {
          type: mongoose.Schema.Types.ObjectId,
          trim: true,
        },
      },
    ],
  },
  { timestamps: true }
);

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userId: this.userId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );
};

module.exports = mongoose.model("User", userSchema);
