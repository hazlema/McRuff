import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, canOccupy } from '../dist/src/game.js';
import { LEVELS } from '../dist/src/levels.js';

const arena=['##########','#........#','#........#','#........#','#........#','#........#','#........#','##########'];
function setup(random=()=>.5){
  const g=new Game('normal',random);
  g.map=arena;g.player={x:2.5,y:3.5,angle:0,health:100,armor:0,stamina:100};
  g.enemies=[];g.pickups=[];g.props=[];g.cats=[];g.exit={x:8.5,y:6.5};g.events=[];
  return g;
}
const drum=(x=3.5,y=3.5)=>({type:'barrel',x,y,opened:false,shake:0});
function cat(overrides={}){
  return {x:5.5,y:3.5,type:'tabby',height:0,vx:0,vy:0,vz:0,angle:0,phase:0,turnTimer:1,flee:0,meow:0,captured:false,...overrides};
}
function advance(g,seconds,input={}){for(let t=0;t<seconds;t+=.02)g.update(.02,input);}

test('barking rattles only unopened drums within earshot and line of sight',()=>{
  const g=setup();g.map=['##########','#........#','#..#.....#','#..#.....#','#..#.....#','#........#','#........#','##########'];
  g.props=[drum(2.5,2.5),drum(4.5,3.5),drum(8.5,3.5),{...drum(2.5,4.5),opened:true}];
  g.bark();
  assert.ok(g.props[0].shake>0,'a nearby unopened drum should rattle');
  assert.deepEqual(g.props.slice(1).map(p=>p.shake),[0,0,0]);
  assert.equal(g.cats.length,0,'barking must not release cats');
  advance(g,1.2);assert.equal(g.props[0].shake,0,'rattle settles');
});

test('a drum launches one to four cats once, with real airborne and outward motion',()=>{
  for(const [roll,count] of [[0,1],[.26,2],[.51,3],[.99,4]]){
    const g=setup(()=>roll),barrel=drum();g.props=[barrel];g.bite();
    assert.equal(g.cats.length,count);assert.equal(barrel.opened,true);
    assert.ok(g.cats.every(c=>c.height>0&&c.vz>0&&Math.hypot(c.vx,c.vy)>2));
    const positions=g.cats.map(c=>[c.x,c.y,c.height]);advance(g,.12);
    assert.ok(g.cats.every((c,i)=>Math.hypot(c.x-positions[i][0],c.y-positions[i][1])>.1&&c.height>positions[i][2]));
    g.biteCooldown=0;g.bite();assert.equal(g.cats.length,count,'holding bite cannot farm the drum');
    advance(g,2);assert.ok(g.cats.every(c=>c.height===0&&canOccupy(g.map,c.x,c.y,.14)));
  }
});

test('drum bites respect facing, range, cover, and a nearer criminal',()=>{
  for(const p of [drum(1.5,3.5),drum(5.5,3.5)]){
    const g=setup();g.props=[p];g.bite();assert.equal(p.opened,false);
  }
  const g=setup();g.map=['##########','#........#','#........#','#..#.....#','#........#','#........#','#........#','##########'];
  g.player.x=2.8;const hidden=drum(4.2,3.5);g.props=[hidden];g.bite();assert.equal(hidden.opened,false);
  g.map=arena;g.player.x=2.5;const blocked=drum(3.7,3.5);g.props=[blocked];
  g.enemies=[{x:3.1,y:3.5,type:'thug',hp:2,stun:0}];g.biteCooldown=0;g.bite();
  assert.equal(g.enemies[0].hp,1);assert.equal(blocked.opened,false);
});

test('drum use belongs to a run and never mutates the level templates',()=>{
  const first=new Game(),barrel=first.props.find(p=>p.type==='barrel');
  barrel.opened=true;barrel.shake=1;
  const second=new Game();assert.equal(second.props.find(p=>p.type==='barrel').opened,false);
  assert.equal(LEVELS[0].props.find(p=>p.type==='barrel').opened,undefined);
});

test('cats wander when left alone, and flee a visible approaching dog',()=>{
  const g=setup(),c=cat({x:6.5});g.cats=[c];const start=c.x;advance(g,.3);
  assert.ok(Math.hypot(c.x-start,c.y-3.5)>.05,'idle cats still wander');
  g.player.x=c.x-1.5;g.player.y=c.y;const before=c.x-g.player.x;advance(g,.3);
  assert.ok(c.x-g.player.x>before+.3,'nearby cats flee faster than wandering');
});

test('barking makes cats meow and flee immediately without stunning or damaging them',()=>{
  const g=setup(),c=cat();g.cats=[c];g.bark();
  assert.ok(c.flee>0&&c.meow>0);assert.ok(!c.stun);assert.equal(c.captured,false);
  const x=c.x;advance(g,.2);assert.ok(c.x>x+.25);
  assert.ok(g.events.some(e=>e.type==='catMeow'));
  assert.equal(g.player.health,100);
});

test('cats do not hear barks or detect the dog through a wall',()=>{
  const g=setup();g.map=['##########','#........#','#..#.....#','#..#.....#','#..#.....#','#........#','#........#','##########'];
  const c=cat({x:4.5});g.cats=[c];g.bark();g.update(.02);
  assert.equal(c.flee,0);assert.equal(c.meow,0);
});

test('airborne and fleeing cats remain inside walkable space even near wall corners',()=>{
  const g=setup(),c=cat({x:8.7,y:1.3,height:.5,vz:4,vx:5,vy:-5});g.cats=[c];
  for(let i=0;i<500;i++){g.update(.02);assert.ok(canOccupy(g.map,c.x,c.y,.14));}
  assert.equal(c.height,0);
});

test('cats require a close facing bite to capture, reward their rarity once, and never count as arrests',()=>{
  for(const [type,points] of [['tabby',100],['tuxedo',250],['lilac',600],['golden',1500]]){
    const g=setup(),c=cat({x:3.1,type});g.cats=[c];g.update(.02);
    assert.equal(c.captured,false,'contact alone must not capture');
    g.bite();assert.equal(c.captured,true);assert.equal(g.score,points);
    assert.equal(g.catsCaptured,1);assert.equal(g.catCollection[type],1);
    assert.equal(g.totalArrests,0);assert.ok(g.events.some(e=>e.type==='catCapture'));
    g.biteCooldown=0;g.bite();assert.equal(g.score,points);
  }
});

test('gentle grabs cannot catch cats behind the dog, in the air, out of reach, or through walls',()=>{
  for(const c of [cat({x:1.7}),cat({x:3.1,height:1}),cat({x:4})]){
    const g=setup();g.cats=[c];g.bite();assert.equal(c.captured,false);
  }
  const g=setup();g.map=['##########','#........#','#........#','#..#.....#','#........#','#........#','#........#','##########'];
  g.player.x=2.85;const c=cat({x:4.01});g.cats=[c];g.bite();assert.equal(c.captured,false);
});

test('cat rewards survive district transitions, while cats and opened drums reset for the new district',()=>{
  const g=setup();g.cats=[cat({x:3.1,type:'lilac'})];g.bite();
  assert.equal(g.catsCaptured,1);g.status='cleared';g.nextLevel();
  assert.equal(g.catsCaptured,1);assert.equal(g.catCollection.lilac,1);assert.equal(g.score,600);
  assert.equal(g.cats.length,0);assert.ok(g.props.filter(p=>p.type==='barrel').every(p=>!p.opened));
  const fresh=new Game();assert.equal(fresh.catsCaptured,0);
});

test('optional uncaught cats and unopened drums never block district extraction',()=>{
  const g=setup();g.cats=[cat()];g.props=[drum()];g.player.x=8.5;g.player.y=6.5;
  g.update(.02);assert.equal(g.status,'cleared');
});

test('wooden crates rattle, launch one to four cats on bite, and stay empty afterward',()=>{
  for(const [roll,count] of [[0,1],[.26,2],[.51,3],[.99,4]]){
    const g=setup(()=>roll),crate={...drum(),type:'crate'};g.props=[crate];
    g.bark();assert.ok(crate.shake>0);assert.equal(g.cats.length,0);
    g.bite();assert.equal(crate.opened,true);assert.equal(g.cats.length,count);
    assert.ok(g.cats.every(c=>c.height>0&&c.vz>0&&Math.hypot(c.vx,c.vy)>2));
    advance(g,2);g.biteCooldown=0;g.bite();assert.equal(g.cats.length,count);
    g.barkCooldown=0;g.bark();assert.equal(crate.shake,0,'opened crates no longer rattle');
    assert.ok(g.cats.every(c=>canOccupy(g.map,c.x,c.y,.14)));
  }
});

test('barking makes a nearby garbage-can resident rise, linger, and retreat without launching cats',()=>{
  const g=setup(),bin={type:'bin',x:3.5,y:3.5,peek:0,peekProgress:0,shake:0};g.props=[bin];
  g.bark();assert.ok(bin.peek>0);assert.equal(g.cats.length,0);
  advance(g,.12);assert.ok(bin.peekProgress>0&&bin.peekProgress<1,'peek should rise, not pop into place');
  advance(g,.4);assert.equal(bin.peekProgress,1);
  advance(g,1);assert.equal(bin.peekProgress,1,'give the grouch time to stare');
  advance(g,3);assert.equal(bin.peek,0);assert.equal(bin.peekProgress,0);
  assert.equal(g.score,0);assert.equal(g.player.health,100);
  assert.ok(g.events.some(e=>e.type==='grouchPeek'));
});

test('garbage-can residents cannot hear barking through walls or across the whole level',()=>{
  const g=setup();g.map=['##########','#........#','#..#.....#','#..#.....#','#..#.....#','#........#','#........#','##########'];
  g.props=[{type:'bin',x:4.5,y:3.5,peek:0,peekProgress:0},{type:'bin',x:8.5,y:3.5,peek:0,peekProgress:0}];
  g.bark();advance(g,.5);assert.ok(g.props.every(p=>p.peek===0&&p.peekProgress===0));
});

test('a garbage can reacts to later barks but never releases cats when bitten',()=>{
  const g=setup(),bin={type:'bin',x:3.5,y:3.5,peek:0,peekProgress:0,shake:0};g.props=[bin];
  g.bite();assert.equal(g.cats.length,0);assert.equal(bin.peek,0);
  g.bark();advance(g,6.2);g.bark();advance(g,.4);
  assert.equal(bin.peekProgress,1);assert.equal(g.events.filter(e=>e.type==='grouchPeek').length,2);
});
