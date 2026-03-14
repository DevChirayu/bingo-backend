const express = require("express");
const router = express.Router();
const { createRoom, joinRoom, getRooms } = require("../controllers/roomController");

router.post("/create", createRoom);
router.post("/join", joinRoom);
router.get("/", getRooms);

module.exports = router;