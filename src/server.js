const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const roomRoutes = require("./routes/roomRoutes");
app.use("/rooms", roomRoutes);

// Test DB route
app.get("/test-db", async (req, res) => {
  const pool = require("./config/db");
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows);
});

// Create HTTP server (needed for Socket.IO)
const http = require("http");
const { Server } = require("socket.io");
const { startGame } = require("./services/gameEngine");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Export io so gameEngine can emit events
module.exports.io = io;

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on("join_room", ({ roomId, userId }) => {
    socket.join(`room:${roomId}`);
    console.log(`User ${userId} joined room ${roomId}`);
  });

  // Start game manually for testing
  socket.on("start_game", ({ roomId, roomData }) => {
    startGame(roomId, roomData);
  });

// Sample test socket 
socket.on("start_game", ({ roomId }) => {
  const roomData = {
    gameId: 1, // dummy game id
    players: [
      { userId: 1, card: generateDummyCard(), isBot: false },
      { userId: 2, card: generateDummyCard(), isBot: true },
    ],
  };
  startGame(roomId, roomData);
});

function generateDummyCard() {
  const card = [];
  for (let i = 0; i < 5; i++) {
    const row = [];
    while (row.length < 5) {
      let n = Math.floor(Math.random() * 75) + 1;
      if (!row.includes(n)) row.push(n);
    }
    card.push(row);
  }
  card[2][2] = "FREE"; // center free space
  return card;
}
});



// Only this listens — remove app.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));