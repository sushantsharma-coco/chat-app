const {
  loginUser,
  logoutUser,
} = require("../../controllers/auth/auth.controller");
const { auth } = require("../../middlewares/auth.middleware");

const router = require("express").Router();

router.route("/sign-in").post(loginUser);

router.use(auth);
router.router("/sign-out").get(logoutUser);

module.exports;
