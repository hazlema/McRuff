import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, canOccupy } from '../dist/src/game.js';
import { LEVELS } from '../dist/src/levels.js';

function setup(roll=.5){
  const g=new Game('normal',()=>roll);
  g.map=['########','#......#','#......#','#......#','#......#','#......#','########'];
  g.player={x:2.5,y:3.5,angle:0,health:50,armor:0,stamina:100};
  g.props=[{type:'bin',x:4.5,y:3.5,peek:0,peekProgress:0,shake:0}];
  g.enemies=[];g.pickups=[];g.cats=[];g.events=[];g.exit={x:6.5,y:5.5};
  return g;
}
function advance(g,time){for(let t=0;t<time;t+=.02)g.update(.02);}
function barkAgain(g){g.barkCooldown=0;g.bark();}

test('the grouch remembers the first warning and escalates the second, counting only successful barks',()=>{
  const g=setup(),bin=g.props[0];g.bark();
  assert.equal(bin.grouchBarks,1);assert.equal(bin.grouchLine,'SCRAM!');
  assert.equal(g.bark(),false);assert.equal(bin.grouchBarks,1,'cooldown prevents repeat annoyance');
  advance(g,6.2);g.bark();assert.equal(bin.grouchBarks,2);assert.equal(bin.grouchLine,'I TOLD YOU, SCRAM!');
  assert.equal(g.pickups.length,0);assert.equal(g.cats.length,0);
});

test('the third bark winds up then throws one bone, steak, or cat toward the dog',()=>{
  for(const [roll,kind] of [[0,'treatBone'],[.5,'health'],[.99,'cat']]){
    const g=setup(roll),bin=g.props[0];g.bark();barkAgain(g);barkAgain(g);
    assert.equal(bin.grouchBarks,3);assert.equal(g.pickups.length+g.cats.length,0,'wait until the throwing motion');
    advance(g,.6);
    const objects=kind==='cat'?g.cats:g.pickups;assert.equal(objects.length,1);
    const item=objects[0];if(kind!=='cat')assert.equal(item.type,kind);
    assert.ok(item.height>0,'the gift must visibly fly, not just spawn on the floor');
    assert.ok(item.vx*(g.player.x-bin.x)+item.vy*(g.player.y-bin.y)>0,'aim toward Buster');
    assert.ok(g.events.some(e=>e.type==='grouchThrow'));
    advance(g,2);assert.equal(item.height,0);assert.ok(canOccupy(g.map,item.x,item.y,.14));
    assert.equal(objects.length,1,'each grouch throws only once');
  }
});

test('thrown treats become normal pickups on landing without inflating the six hidden golden bones',()=>{
  for(const [roll,health,score] of [[0,50,100],[.5,85,0]]){
    const g=setup(roll);g.bark();barkAgain(g);barkAgain(g);advance(g,.6);
    const item=g.pickups[0];assert.ok(item,'a treat should be in flight');
    assert.equal(g.player.health,50);assert.equal(g.score,0,'airborne treats are not collected');
    advance(g,2);assert.equal(item.collected,true);assert.equal(g.player.health,health);assert.equal(g.score,score);
    assert.equal(g.bones,0);advance(g,1);assert.equal(g.score,score,'pickups pay out once');
  }
});

test('the fourth bark ends in a permanent flop and later barks never revive or farm the grouch',()=>{
  const g=setup(.99),bin=g.props[0];g.bark();barkAgain(g);barkAgain(g);advance(g,2);
  barkAgain(g);assert.equal(bin.grouchDead,true);assert.equal(bin.grouchBarks,4);
  advance(g,.12);assert.ok(bin.grouchFlop>0&&bin.grouchFlop<1,'the flop should animate');
  advance(g,8);barkAgain(g);advance(g,.4);
  assert.equal(bin.grouchFlop,1);assert.equal(bin.grouchBarks,4);assert.equal(bin.grouchDead,true);
  assert.equal(g.cats.length,1);assert.equal(g.totalArrests,0);assert.equal(g.player.health,50);
  assert.equal(g.events.filter(e=>e.type==='grouchCollapse').length,1);
});

test('grouch annoyance is local to each can and resets in a fresh case',()=>{
  const g=setup();g.props.push({type:'bin',x:6.5,y:5.5,peek:0,peekProgress:0});
  g.player.x=1.5;g.bark();assert.equal(g.props[0].grouchBarks,1);assert.equal(g.props[1].grouchBarks||0,0);
  const fresh=new Game();assert.equal(fresh.props.find(p=>p.type==='bin').grouchBarks,0);
  assert.equal(LEVELS[0].props.find(p=>p.type==='bin').grouchBarks,undefined);
});
