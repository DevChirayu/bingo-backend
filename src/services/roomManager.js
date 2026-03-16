const pool = require("../config/db");
const { startGame } = require("./gameEngine");
const { addBotsToRoom } = require("./botService");

const waitingRooms = new Map();

const { generateRandomCard, generateTestCard } = require("./cardGenerator");

const runningRooms = new Map(); // Keep track of rooms waiting for players

// Function to create room with optional human player
async function createRoom(io, playerId, roomSize = 5) {

  const result = await pool.query(
    "INSERT INTO rooms (room_size, entry_fee) VALUES ($1,$2) RETURNING id",
    [roomSize, 100]
  );

  const roomId = result.rows[0].id;

  const room = {
    roomId,
    roomSize,
    players: [],
    createdAt: Date.now()
  };

  if (playerId) {
    room.players.push({
      userId: playerId,
      isBot: false,
      card: generateTestCard()
    });
  }

  runningRooms.set(roomId, room);

  setTimeout(() => fillBots(io, roomId), 5000);

  return roomId;
}

async function joinRoom(io, userId) {

  // Try joining existing room
  for (let [roomId, room] of waitingRooms) {

    if (room.players.length < room.roomSize) {

      room.players.push({
        userId,
        isBot: false,
        card: generateTestCard(),
      });

      // Start immediately if full
      if (room.players.length === room.roomSize) {

        const result = await pool.query(
          "INSERT INTO games (room_id,status) VALUES ($1,'running') RETURNING id",
          [roomId]
        );

        room.gameId = result.rows[0].id;

        startGame(io, roomId, room);
        waitingRooms.delete(roomId);
      }

      return roomId;
    }
  }

  // Create new room
  const roomSize = 5;

  const result = await pool.query(
    "INSERT INTO rooms (room_size, entry_fee) VALUES ($1,$2) RETURNING *",
    [roomSize, 100]
  );

  const roomId = result.rows[0].id;

  const room = {
    roomId,
    roomSize,
    players: [{
      userId,
      isBot:false,
      card: generateRandomCard()
    }],
    createdAt: Date.now()
  };

  waitingRooms.set(roomId, room);

  // Fill bots after 10 seconds
  setTimeout(() => {
    fillBots(io, roomId);
  }, 10000);

  return roomId;
}

async function fillBots(io, roomId) {

  const room = waitingRooms.get(roomId);
  if (!room) return;

  if (room.players.length < room.roomSize) {

    addBotsToRoom(room);

    const result = await pool.query(
      "INSERT INTO games (room_id,status) VALUES ($1,'running') RETURNING id",
      [roomId]
    );

    room.gameId = result.rows[0].id;

    startGame(io, roomId, room);

    waitingRooms.delete(roomId);
  }
}

module.exports = { joinRoom, createRoom };