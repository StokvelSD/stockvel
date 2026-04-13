const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const groupRoutes = require("./routes/groups");

const app = express();

const corsOptions = {
  origin: [/^http:\/\/localhost:\d+$/, "https://stokvel-b920c.web.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Handle preflight FIRST, before any other middleware
app.options("*", cors(corsOptions));

// ✅ Apply CORS with the same config to all routes
app.use(cors(corsOptions));

app.use(express.json());
app.use("/api/groups", groupRoutes);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
