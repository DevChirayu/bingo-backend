function getRandomNumbers(start, end, count) {
  const nums = [];

  while (nums.length < count) {
    const n = Math.floor(Math.random() * (end - start + 1)) + start;
    if (!nums.includes(n)) nums.push(n);
  }

  return nums;
}

function generateRandomCard() {

  const B = getRandomNumbers(1, 15, 5);
  const I = getRandomNumbers(16, 30, 5);
  const N = getRandomNumbers(31, 45, 5);
  const G = getRandomNumbers(46, 60, 5);
  const O = getRandomNumbers(61, 75, 5);

  const card = [];

  for (let i = 0; i < 5; i++) {
    card.push([B[i], I[i], N[i], G[i], O[i]]);
  }

  card[2][2] = "FREE";

  return card;
}

function generateTestCard() {

  return [
    [1,16,31,46,61],
    [2,17,32,47,62],
    [3,18,"FREE",48,63],
    [4,19,33,49,64],
    [5,20,34,50,65]
  ];

}

module.exports = {
  generateRandomCard,
  generateTestCard
};