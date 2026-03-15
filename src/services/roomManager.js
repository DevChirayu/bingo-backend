const { io } = require("../server");
const pool = require("../config/db");
const { startGame } = require("./gameEngine");
const { addBotsToRoom } = require("./botService");

const waitingRooms = new Map();

async function joinRoom(userId) {
  // check existing waiting room
  for (let [roomId, room] of waitingRooms) {
    if (room.players.length < room.roomSize) {
      room.players.push({
        userId,
        isBot: false,
        card: generateCard(),
      });

      if (room.players.length === room.roomSize) {
        startGame(io, roomId, room);
        waitingRooms.delete(roomId);
      }

      return roomId;
    }
  }

  // create new room
  const roomSize = 5;

  const result = await pool.query(
    "INSERT INTO rooms (room_size, entry_fee) VALUES ($1,$2) RETURNING *",
    [roomSize, 100],
  );

  const roomId = result.rows[0].id;
  const gameId = result.rows[0].id;

  const room = {
    roomId,
    gameId,
    roomSize,
    players: [
      {
        userId,
        isBot: false,
        card: generateCard(),
      },
    ],
    createdAt: Date.now(),
  };

  waitingRooms.set(roomId, room);

  // schedule bot fill
  setTimeout(() => {
    fillBots(roomId);
  }, 10000);

  return roomId;
}

async function fillBots(roomId) {
  const room = waitingRooms.get(roomId);
  if (!room) return;

  if (room.players.length < room.roomSize) {
    addBotsToRoom(room);

    // create game in database
    const result = await pool.query(
      "INSERT INTO games (room_id,status) VALUES ($1,'running') RETURNING id",
      [roomId],
    );

    const gameId = result.rows[0].id;

    // attach gameId to room
    room.gameId = gameId;

    startGame(io, roomId, room);

    waitingRooms.delete(roomId);
  }
}

function generateCard() {
  const card = [];

  for (let i = 0; i < 5; i++) {
    const row = [];
    while (row.length < 5) {
      const n = Math.floor(Math.random() * 75) + 1;
      if (!row.includes(n)) row.push(n);
    }
    card.push(row);
  }

  card[2][2] = "FREE";

  return card;
}

module.exports = { joinRoom };
