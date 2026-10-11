import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, lineOfSight, canOccupy } from '../dist/src/game.js';
import { LEVELS } from '../dist/src/levels.js';

const arena = ['########', '#......#', '#......#', '#..#...#', '#......#', '#......#', '########'];
function setup(difficulty='normal') {
  const g = new Game(difficulty);
  g.map = arena;
  g.player = { x: 2.5, y: 2.5, angle: 0, health: 100, armor: 0, stamina: 100 };
  g.enemies = [];
  g.pickups = [];
  g.exit = { x: 6.5, y: 5.5 };
  return g;
}
function enemy(x, y, hp = 2) { return { x, y, hp, maxHp: hp, type: 'thug', active: false, cooldown: 1, stun: 0, hurt: 0, dead: 0, phase: 0 }; }

test('solid walls block movement even during a sprint', () => {
  const g = setup();
  for(let i=0;i<120;i++)g.update(1/60,{forward:1,sprint:true});
  assert.ok(g.player.x < 6.82);
  assert.ok(g.player.x > 6.5);
});
test('wall corners cannot be occupied and sight does not cross masonry', () => {
  assert.equal(canOccupy(arena, 3.1, 3.1), false);
  assert.equal(lineOfSight(arena, 2.5, 3.5, 4.5, 3.5), false);
  assert.equal(lineOfSight(arena, 2.5, 2.5, 5.5, 2.5), true);
});
test('a bite hits a nearby facing suspect and cooldown prevents repeated damage', () => {
  const g=setup(); const e=enemy(3.5,2.5); g.enemies=[e];
  g.bite(); assert.equal(e.hp,1); g.bite(); assert.equal(e.hp,1);
  g.update(.5,{});g.bite();assert.equal(e.hp,0);assert.equal(g.arrests,1);
});
test('bite cannot hit behind the dog, out of reach or through a wall', () => {
  const g=setup();g.player.y=3.5;
  g.enemies=[enemy(1.5,3.5),enemy(5.5,3.5),enemy(4.1,3.5)];
  g.bite();assert.deepEqual(g.enemies.map(e=>e.hp),[2,2,2]);
});
test('bark stuns visible suspects and cannot be spammed', () => {
  const g=setup();const e=enemy(4.5,2.5);g.enemies=[e];
  g.bark();assert.ok(e.stun>1);const cooldown=g.barkCooldown;
  e.stun=0;g.bark();assert.equal(e.stun,0);assert.equal(g.barkCooldown,cooldown);
});
test('health pickups heal up to 100 and are consumed only when needed', () => {
  const g=setup();g.pickups=[{x:2.5,y:2.5,type:'health',collected:false}];
  g.update(.01,{});assert.equal(g.pickups[0].collected,false);
  g.player.health=89;g.update(.01,{});assert.equal(g.player.health,100);assert.equal(g.pickups[0].collected,true);
});
test('exit requires all suspects arrested', () => {
  const g=setup();g.player.x=6.5;g.player.y=5.5;g.enemies=[enemy(1.5,1.5)];
  g.update(.01,{});assert.equal(g.status,'playing');
  g.enemies[0].hp=0;g.update(.01,{});assert.equal(g.status,'cleared');
});
test('enemy attacks can end a run and paused/end states stop simulation', () => {
  const g=setup();g.player.health=1;const e=enemy(2.9,2.5);e.active=true;e.cooldown=0;g.enemies=[e];
  g.update(.1,{});assert.equal(g.status,'playing');g.update(.5,{});assert.equal(g.status,'dead');
  const x=g.player.x;g.update(1,{forward:1});assert.equal(g.player.x,x);
});
test('all level entities and exits are reachable from the spawn', () => {
  for(const level of LEVELS){
    const rows=level.map;assert.ok(rows.every(row=>row.length===rows[0].length));
    const queue=[[Math.floor(level.spawn.x),Math.floor(level.spawn.y)]];const seen=new Set(queue.map(p=>p.join(',')));
    for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(rows[ny]?.[nx]==='.'&&!seen.has(k)){seen.add(k);queue.push([nx,ny]);}}}
    for(const p of [...level.enemies,...level.pickups,level.exit])assert.ok(seen.has(`${Math.floor(p.x)},${Math.floor(p.y)}`),`${level.name}: unreachable ${p.x},${p.y}`);
  }
});
test('advancing through the three districts preserves score and ends in victory', () => {
  const g=new Game();g.score=500;
  for(let i=0;i<3;i++){g.enemies.forEach(e=>e.hp=0);g.player.x=g.exit.x;g.player.y=g.exit.y;g.update(.01,{});if(i<2){assert.equal(g.status,'cleared');g.nextLevel();}else assert.equal(g.status,'won');}
  assert.ok(g.score>=500);assert.equal(g.levelIndex,2);
});

test('holding bite while a suspect approaches makes an arrest', () => {
  const g=new Game();
  for(let frame=0;frame<360&&g.status==='playing';frame++)g.update(1/60,{bite:true});
  assert.ok(g.arrests>=1,`Expected an arrest, got ${g.arrests}, enemies ${g.enemies.map(e=>[e.x,e.y,e.hp])}`);
});

test('newspaper attacks give warning, land one hit, and recover before another swing', () => {
  const g=setup(),e=enemy(3.2,2.5);e.active=true;e.cooldown=0;g.enemies=[e];
  g.update(.05,{});assert.equal(g.player.health,100,'raising the paper must not deal instant damage');
  g.update(.3,{});assert.equal(g.player.health,100,'the wind-up must leave time to react');
  g.update(.25,{});assert.equal(g.player.health,86);assert.equal(g.events.filter(e=>e.type==='paperHit').length,1);
  g.update(.4,{});assert.equal(g.player.health,86,'one swing cannot hit repeatedly');
});

test('backing away during the newspaper wind-up dodges the swat on every difficulty', () => {
  for(const difficulty of ['easy','normal','hard']){
    const g=setup(difficulty),e=enemy(3.2,2.5);e.active=true;e.cooldown=0;g.enemies=[e];
    g.update(.05,{});g.update(.4,{forward:-1});g.update(.15,{});
    assert.equal(g.player.health,100,difficulty);assert.equal(g.events.filter(e=>e.type==='paperHit').length,0);
  }
});

test('a newspaper swing checks walls again when it lands', () => {
  const g=setup(),e=enemy(2.79,3.5);g.player.x=2.4;g.player.y=3.5;e.active=true;e.cooldown=0;g.enemies=[e];
  g.update(.05,{});g.player.x=4.21;g.update(.5,{});
  assert.equal(g.player.health,100);assert.equal(g.events.filter(e=>e.type==='paperHit').length,0);
});

test('barking interrupts a raised newspaper before it deals damage', () => {
  const g=setup(),e=enemy(3.2,2.5);e.active=true;e.cooldown=0;g.enemies=[e];
  g.update(.05,{});g.bark();g.update(.5,{});
  assert.equal(g.player.health,100);assert.equal(g.events.filter(e=>e.type==='paperHit').length,0);
});

test('every enemy type can attack with a newspaper at close range', () => {
  for(const [type,damage] of [['thug',14],['thrower',12],['brute',22],['boss',28]]){
    const g=setup(),e=enemy(3.2,2.5);e.type=type;e.active=true;e.cooldown=0;g.enemies=[e];
    for(let i=0;i<16;i++)g.update(.05,{});
    assert.equal(g.player.health,100-damage,type);assert.equal(g.events.filter(e=>e.type==='paperHit').length,1,type);
  }
});

test('a committed newspaper swing follows through a nonlethal bite on Normal and Hard', () => {
  for(const difficulty of ['normal','hard']){
    const g=new Game(difficulty);g.map=arena;g.player={x:2.5,y:2.5,angle:0,health:100,armor:0,stamina:100};
    const e=enemy(3.2,2.5,5);e.active=true;e.cooldown=0;g.enemies=[e];g.props=[];g.pickups=[];
    g.update(.05);g.bite();
    assert.ok(e.attackWindup>0,`${difficulty}: a bite cannot cancel a raised paper`);
    g.update(.5);g.update(.1);
    assert.ok(g.player.health<100,`${difficulty}: standing in the swing must hurt`);
  }
});

test('Easy still lets a bite interrupt a raised newspaper', () => {
  const g=new Game('easy');g.player.angle=0;const p=g.player;
  const e=enemy(p.x+.7,p.y,5);e.active=true;e.cooldown=0;g.enemies=[e];g.props=[];g.pickups=[];
  g.update(.05);assert.ok(e.attackWindup>0);g.bite();assert.equal(e.attackWindup,0);g.update(.5);
  assert.equal(g.player.health,100);
});

test('holding bite against Big Lou without dodging or barking is no longer a free arrest', () => {
  const g=setup(),e=enemy(3.2,2.5,16);e.type='boss';e.cooldown=0;e.active=true;g.enemies=[e];
  for(let i=0;i<600&&g.status==='playing'&&e.hp>0;i++){
    g.player.angle=Math.atan2(e.y-g.player.y,e.x-g.player.x);
    g.update(1/60,{bite:true});
  }
  assert.ok(g.player.health<=44,`reckless bites should cost real health, got ${g.player.health}`);
  assert.ok(g.events.filter(e=>e.type==='paperHit').length>=2);
});

test('Normal and Hard arrests no longer undo damage; Easy retains arrest healing', () => {
  for(const [difficulty,health] of [['normal',40],['hard',40],['easy',45]]){
    const g=new Game(difficulty),p=g.player;p.health=40;p.angle=0;
    g.enemies=[enemy(p.x+.7,p.y,1)];g.props=[];g.bite();
    assert.equal(g.arrests,1);assert.equal(p.health,health,difficulty);
  }
});

test('district handoffs provide a limited patch-up, with full recovery on Easy', () => {
  for(const [difficulty,health] of [['normal',50],['hard',40],['easy',100]]){
    const g=new Game(difficulty);assert.equal(g.player.health,100);
    g.player.health=30;g.player.armor=15;g.status='cleared';g.nextLevel();
    assert.equal(g.player.health,health,difficulty);assert.equal(g.player.armor,15);
    g.player.health=95;g.status='cleared';g.nextLevel();assert.equal(g.player.health,100,'patch-up is capped');
  }
});

test('bark still interrupts but gives a shorter attack window on tougher settings', () => {
  const durations=[];
  for(const difficulty of ['easy','normal','hard']){
    const g=new Game(difficulty),p=g.player,e=enemy(p.x+.7,p.y,5);e.attackWindup=.3;g.enemies=[e];
    g.bark();assert.equal(e.attackWindup,0);durations.push(e.stun);
  }
  assert.ok(durations[0]>durations[1]&&durations[1]>durations[2]);
  assert.ok(durations[1]>=1&&durations[1]<=1.5,'Normal still leaves time to bite or retreat');
});

test('higher difficulty increases pursuit and bottle pressure while keeping attack warnings readable', () => {
  const pursuit=[],bottles=[],recovery=[];
  for(const difficulty of ['easy','normal','hard']){
    const g=setup(difficulty),e=enemy(5.5,2.5);e.cooldown=99;g.enemies=[e];
    g.update(.5);pursuit.push(5.5-e.x);
    e.x=5.5;e.type='thrower';e.cooldown=0;g.update(.05);
    assert.equal(g.projectiles.length,1);bottles.push(Math.hypot(g.projectiles[0].vx,g.projectiles[0].vy));recovery.push(e.cooldown);
    g.projectiles=[];e.x=3.2;e.cooldown=0;g.update(.05);
    assert.ok(e.attackWindup>=.5,'even Hard gives at least half a second of warning');
  }
  assert.ok(pursuit[0]<pursuit[1]&&pursuit[1]<pursuit[2]);
  assert.ok(bottles[0]<bottles[1]&&bottles[1]<bottles[2]);
  assert.ok(recovery[0]>recovery[1]&&recovery[1]>recovery[2]);
});
