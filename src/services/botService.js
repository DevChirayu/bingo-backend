function addBotsToRoom(room) {
  const botsNeeded = room.roomSize - room.players.length;

  for (let i = 0; i < botsNeeded; i++) {
    room.players.push({
      userId: "bot_" + Math.floor(Math.random() * 10000),
      isBot: true,
      card: generateCard(),
    });
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

module.exports = { addBotsToRoom };
