const pool = require("../config/db");

// Create a new room
const createRoom = async (req, res) => {
  try {
    const { room_size, entry_fee } = req.body;

    const result = await pool.query(
      "INSERT INTO rooms (room_size, entry_fee) VALUES ($1, $2) RETURNING *",
      [room_size, entry_fee]
    );

    res.status(201).json({ success: true, room: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Database error" });
  }
};

// Join a room
const joinRoom = async (req, res) => {
  try {
    const { room_id, user_id, is_bot = false } = req.body;

    // Check if room exists
    const room = await pool.query("SELECT * FROM rooms WHERE id = $1", [
      room_id,
    ]);
    if (room.rows.length === 0)
      return res.status(404).json({ success: false, error: "Room not found" });

    // Add player
    const result = await pool.query(
      "INSERT INTO room_players (room_id, user_id, is_bot) VALUES ($1, $2, $3) RETURNING *",
      [room_id, user_id, is_bot]
    );

    res.status(200).json({ success: true, player: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Database error" });
  }
};

// Get all active rooms
const getRooms = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rooms ORDER BY created_at DESC");
    res.status(200).json({ success: true, rooms: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Database error" });
  }
};

module.exports = { createRoom, joinRoom, getRooms };
