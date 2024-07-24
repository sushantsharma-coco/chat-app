const {
  getAllUsers,
  getUsersInContact,
} = require("../../controllers/app/allUsers.controller");
const { auth } = require("../../middlewares/auth.middleware");

const router = require("express").Router();

router.use(auth);

router.route("/all").get(getAllUsers);
router.route("/in-contact").get(getUsersInContact);

module.exports = { router };
