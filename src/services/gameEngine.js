const { redisClient } = require("../config/redis");
const { io } = require("../server"); // We’ll export io from server.js
const pool = require("../config/db");

// Store currently running rooms in memory
const runningRooms = new Map(); // key: roomId, value: room state

// Generate next bingo number
function generateNextNumber(roomId) {
  const roomState = runningRooms.get(roomId);
  let number;
  do {
    number = Math.floor(Math.random() * 75) + 1;
  } while (roomState.numbersCalled.includes(number));

  roomState.numbersCalled.push(number);
  return number;
}

// Check if anyone has won (simplified)
async function checkWinner(io, roomId) {
  const roomState = runningRooms.get(roomId);
  if (!roomState) return;

  // Example: full house = 24 numbers (skip FREE)
  for (let player of roomState.players) {
    const cardNumbers = player.card.flat().filter(n => n !== "FREE");
    const matched = cardNumbers.filter(n =>
      roomState.numbersCalled.includes(n),
    );

    // Full house check (24 numbers + FREE)
    if (matched.length === 24) {
      // winner!
      roomState.status = "finished";

      // ✅ Update winner in DB
      await pool.query(
        "UPDATE games SET winner_id = $1, status = 'finished' WHERE id = $2",
        [player.userId, roomState.gameId],
      );

      // Notify clients
      io.to(`room:${roomId}`).emit("winner_announce", {
        winner: player.userId,
        roomId,
      });

      // Stop the game loop
      stopGame(roomId);
      break;
    }
  }
}

// Start game loop for a room
function startGame(io, roomId, roomData) {
  const roomState = {
    roomId,
    gameId: roomData.gameId,
    players: roomData.players, // { userId, card, isBot }
    numbersCalled: [],
    status: "running",
    intervalId: null,
  };

  runningRooms.set(roomId, roomState);

  const intervalId = setInterval(async () => {
    if (roomState.status !== "running") return;
    const result = await pool.query(
      `INSERT INTO games (room_id, status, total_pool, platform_cut) 
      VALUES ($1, 'running', $2, $3) RETURNING id`,
      [roomId, 0, 0],
    );

    roomData.gameId = result.rows[0].id; // attach to room
    const nextNumber = generateNextNumber(roomId);
    roomState.numbersCalled.push(nextNumber);
    // Update Redis
    await redisClient.hSet(
      `room:${roomId}`,
      "numbers_called",
      JSON.stringify(roomState.numbersCalled),
    );

    // Update DB (append number to numbers_sequence)
    await pool.query("UPDATE games SET numbers_sequence = $1 WHERE id = $2", [
      JSON.stringify(roomState.numbersCalled),
      roomState.gameId,
    ]);

    // Emit via socket
    io.to(`room:${roomId}`).emit("number_called", nextNumber);

    // Check winners
    await checkWinner(roomId);
  }, 3000);

  roomState.intervalId = intervalId;
  runningRooms.set(roomId, roomState);
}

// Stop game and cleanup
function stopGame(roomId) {
  const roomState = runningRooms.get(roomId);
  if (!roomState) return;
  clearInterval(roomState.intervalId);
  runningRooms.delete(roomId);
}

module.exports = { startGame, stopGame };