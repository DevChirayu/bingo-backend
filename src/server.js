const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bingo Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/test-db", async (req, res) => {
  const pool = require("./config/db");

  const result = await pool.query("SELECT NOW()");
  res.json(result.rows);
});

const roomRoutes = require("./routes/roomRoutes");
app.use("/rooms", roomRoutes);
