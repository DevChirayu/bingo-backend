const redisClient = require("../config/redis");
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
async function checkWinner(roomId) {
  const roomState = runningRooms.get(roomId);

  // Example: full house = 24 numbers (skip FREE)
  for (let player of roomState.players) {
    const cardNumbers = player.card.flat().filter(n => n !== "FREE");
    const matched = cardNumbers.filter(n => roomState.numbersCalled.includes(n));

    if (matched.length === 24) {
      // winner!
      roomState.status = "finished";
      await pool.query(
        "UPDATE games SET winner_id = $1, status = 'finished' WHERE id = $2",
        [player.userId, roomState.gameId]
      );

      io.to(`room:${roomId}`).emit("winner_announce", {
        winner: player.userId,
        roomId
      });

      stopGame(roomId);
      break;
    }
  }
}

// Start game loop for a room
function startGame(roomId, roomData) {
  const roomState = {
    roomId,
    gameId: roomData.gameId,
    players: roomData.players, // { userId, card, isBot }
    numbersCalled: [],
    status: "running",
    intervalId: null
  };

  runningRooms.set(roomId, roomState);

  const intervalId = setInterval(async () => {
    if (roomState.status !== "running") return;

    const nextNumber = generateNextNumber(roomId);

    // Update Redis
    await redisClient.hSet(
      `room:${roomId}`,
      "numbers_called",
      JSON.stringify(roomState.numbersCalled)
    );

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