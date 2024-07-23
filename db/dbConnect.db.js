const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    const connectionObj = await mongoose.connect(process.env.DB_URL, {});

    if (!connectionObj)
      throw new ApiError(500, "unable to connect with mongodb database");

    console.log("db connection successful");
  } catch (error) {
    console.error("error occured during mongo connection", error?.message);

    process.exit(1);
  }
};

module.exports = { dbConnect };
