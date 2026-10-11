import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, lineOfSight } from '../dist/src/game.js';

function waypoint(map, start, target) {
  const sx=Math.floor(start.x),sy=Math.floor(start.y),tx=Math.floor(target.x),ty=Math.floor(target.y);
  const queue=[[sx,sy]],parents=new Map([[`${sx},${sy}`,null]]);
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];if(x===tx&&y===ty){let k=`${x},${y}`,last=k;while(parents.get(k)!==null){last=k;k=parents.get(k);}const [wx,wy]=last.split(',').map(Number);return {x:wx+.5,y:wy+.5};}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(map[ny]?.[nx]==='.'&&!parents.has(k)){parents.set(k,`${x},${y}`);queue.push([nx,ny]);}}
  }
  throw new Error('No route to target');
}

for(const difficulty of ['easy','normal','hard'])test(`${difficulty}: a player can clear every district using movement, bites, bark and backsteps`, t => {
  const game=new Game(difficulty,()=>.5);const completed=[];let lowestHealth=100,hits=0;
  for(let frame=0;frame<36000;frame++){
    if(game.status==='won')break;
    assert.notEqual(game.status,'dead',`Player fell in district ${game.levelIndex+1} after ${game.totalArrests} arrests`);
    if(game.status==='cleared'){completed.push(game.levelIndex);game.nextLevel();continue;}
    const p=game.player;const live=game.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
    const nearby=live.filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<4&&lineOfSight(game.map,p.x,p.y,e.x,e.y));
    let target=live[0]||game.exit;
    if(p.health<65&&!nearby.length){const food=game.pickups.filter(i=>i.type==='health'&&!i.collected).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(food)target=food;}
    const visible=lineOfSight(game.map,p.x,p.y,target.x,target.y),distance=Math.hypot(target.x-p.x,target.y-p.y);
    const goal=visible?target:waypoint(game.map,p,target);
    p.angle=Math.atan2(goal.y-p.y,goal.x-p.x);
    // Allow 200 ms to notice the raised paper, then bark or backstep until the swing ends.
    // This uses ordinary controls and leaves every enemy and pickup unmodified.
    const warning=target.hp>0&&visible&&target.attackWindup>0&&target.attackWindup<(target.type==='brute'||target.type==='boss'?.65:.52)-.2;
    if((warning||nearby.length>1&&distance<2.4)&&game.barkCooldown<=0)game.bark();
    const dodge=warning&&target.attackWindup>0;
    game.update(1/60,{forward:dodge?(distance<1.9?-1:0):target.hp>0&&distance<1.2&&visible?0:1,bite:!dodge&&target.hp>0&&distance<1.65&&visible});
    lowestHealth=Math.min(lowestHealth,game.player.health);hits+=game.events.filter(e=>e.type==='hurt').length;game.events=[];
  }
  assert.equal(game.status,'won');assert.deepEqual(completed,[0,1]);assert.equal(game.totalArrests,21);assert.ok(game.player.health>0);
  t.diagnostic(`${difficulty}: 21 arrests; lowest health ${Math.round(lowestHealth)}%; ${hits} hits taken`);
});
