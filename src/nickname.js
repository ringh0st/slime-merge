// A first nickname for a new player, like "HappyMochi42": friendly words only, and it fits the name rules
// (nameProblem in records.js). With the number there are about 50,000 of them, so two players rarely share one.
const FIRST = ['Happy', 'Jolly', 'Sunny', 'Bouncy', 'Wobbly', 'Fluffy', 'Giggly', 'Sparky', 'Dizzy', 'Cozy', 'Peppy', 'Zippy', 'Lucky', 'Merry', 'Snappy', 'Bubbly', 'Jumpy', 'Silly', 'Breezy', 'Dreamy', 'Fizzy', 'Perky', 'Rosy', 'Minty'];
const SECOND = ['Blob', 'Drip', 'Puff', 'Jelly', 'Mochi', 'Gloop', 'Otter', 'Panda', 'Koala', 'Bunny', 'Kitty', 'Puppy', 'Duck', 'Fox', 'Bee', 'Owl', 'Frog', 'Seal', 'Lamb', 'Pony', 'Star', 'Moon', 'Cloud', 'Berry'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const randomNickname = () => `${pick(FIRST)}${pick(SECOND)}${10 + Math.floor(Math.random() * 90)}`;
