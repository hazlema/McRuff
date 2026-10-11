const build = (width, height, rooms, pillars = []) => {
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  for (const [x1, y1, x2, y2] of rooms) for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) grid[y][x] = '.';
  for (const [x, y, w, h] of pillars) for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) grid[y + dy][x + dx] = '#';
  return grid.map(row => row.join(''));
};
const thug = (x, y, type = 'thug') => ({ x, y, type });
const treat = (x, y, type = 'health') => ({ x, y, type });
export const LEVELS = [
  {
    name: 'The Backstreets', subtitle: 'Every dog has his beat.', district: '01', theme: 'street',
    briefing: 'The Bone Street gang is shaking down the neighborhood. Clear the streets and get to the extraction beacon.',
    map: build(24, 21, [[1,1,6,19],[6,4,21,8],[9,8,14,18],[14,13,22,18],[17,1,22,13]], [[10,5,2,2],[18,14,2,2],[3,2,2,3]]),
    spawn: { x: 3.5, y: 17.5, angle: -Math.PI / 2 },
    enemies: [thug(3.5,11.5),thug(5,6.5),thug(13.5,6.5,'thrower'),thug(11.5,13.5),thug(19.5,5.5),thug(20.5,16.5,'brute')],
    pickups: [treat(2.5,14.5),treat(2.5,1.5,'bone'),treat(12.5,9.5,'armor'),treat(21.5,2.5,'bone'),treat(15.5,16.5)],
    props: [{x:5.8,y:14.5,type:'bin'},{x:1.5,y:8.5,type:'lamp'},{x:8.5,y:4.7,type:'barrel'},{x:17.6,y:9.5,type:'lamp'},{x:13.5,y:17.5,type:'barrel'}],
    exit: { x: 21.5, y: 17.5 },
  },
  {
    name: 'The Meatpacking District', subtitle: 'Something smells criminal.', district: '02', theme: 'warehouse',
    briefing: 'Stolen treats. Shady deals. Very suspicious sausages. Shut down the gang’s warehouse operation.',
    map: build(25, 22, [[1,1,7,20],[7,3,22,7],[10,7,15,18],[7,15,22,20],[18,7,23,15]], [[3,5,2,3],[3,13,2,3],[12,4,2,2],[11,11,2,2],[18,17,2,2]]),
    spawn: { x: 3.5, y: 19.5, angle: -Math.PI / 2 },
    enemies: [thug(5.5,13.5),thug(3.5,10.5,'thrower'),thug(5.5,3.5),thug(10.5,5.5,'brute'),thug(14.5,10.5),thug(21.5,5.5,'thrower'),thug(21.5,12.5,'brute'),thug(15.5,18.5)],
    pickups: [treat(1.5,17.5),treat(1.5,1.5,'bone'),treat(6.5,8.5,'armor'),treat(14.5,3.5),treat(19.5,9.5,'bone'),treat(12.5,17.5)],
    props: [{x:1.6,y:10.5,type:'barrel'},{x:6.5,y:4.5,type:'crate'},{x:10.5,y:8.5,type:'barrel'},{x:22.5,y:8.5,type:'crate'},{x:8.5,y:19.5,type:'crate'}],
    exit: { x: 21.5, y: 19.5 },
  },
  {
    name: 'The Docks', subtitle: 'Time to collar the kingpin.', district: '03', theme: 'docks',
    briefing: 'Big Lou is making a run for it. Bring down his crew, bite the boss, and put this case to bed.',
    map: build(25, 23, [[1,15,9,21],[3,8,8,15],[3,3,21,9],[11,8,22,21],[8,16,12,20]], [[6,4,3,2],[13,4,3,2],[13,11,2,3],[19,11,2,3],[14,18,2,2]]),
    spawn: { x: 3.5, y: 19.5, angle: -Math.PI / 2 },
    enemies: [thug(6.5,15.5,'brute'),thug(5.5,9.5,'thrower'),thug(10.5,5.5),thug(19.5,6.5,'thrower'),thug(12.5,15.5),thug(21.5,15.5,'brute'),thug(18,18,'boss')],
    pickups: [treat(1.5,16.5,'armor'),treat(4.5,3.5,'bone'),treat(7.5,11.5),treat(21.5,3.5,'bone'),treat(11.5,10.5,'armor'),treat(22,20.5),treat(11.5,20.5)],
    props: [{x:8.5,y:20.5,type:'crate'},{x:3.6,y:6.5,type:'lamp'},{x:18.5,y:3.5,type:'crate'},{x:17,y:12.5,type:'barrel'},{x:21.5,y:9.5,type:'lamp'}],
    exit: { x: 20.5, y: 20.5 },
  },
];
