const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const groupRoutes = require("./routes/groups");

const app = express();
app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/, "https://stokvel-b920c.web.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use("/api/groups", groupRoutes);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
