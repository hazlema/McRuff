import { canOccupy, lineOfSight, moveEntity, moveAirborne } from './world.js';

export const CAT_TYPES=Object.freeze({
  tabby:{name:'Alley Tabby',rarity:'COMMON',value:100,chance:.6,color:'#dcaa72',coat:'#c78548',shade:'#85512f'},
  tuxedo:{name:'Sir Pounce',rarity:'UNCOMMON',value:250,chance:.25,color:'#a7d9c7',coat:'#404b58',shade:'#212c35'},
  lilac:{name:'Lilac Loafer',rarity:'RARE',value:600,chance:.12,color:'#d6b0ff',coat:'#ac85cd',shade:'#675078'},
  golden:{name:'The Great Catsby',rarity:'LEGENDARY',value:1500,chance:.03,color:'#ffe078',coat:'#e7b54b',shade:'#ad742e'},
});
export const isCatContainer=prop=>prop.type==='barrel'||prop.type==='crate';

function rollType(random){
  let roll=random();
  for(const [type,info] of Object.entries(CAT_TYPES)){roll-=info.chance;if(roll<0)return type;}
  return 'golden';
}

export function launchCat(game,origin,vx,vy,height=.5,vz=2.2){
  game.cats.push({x:origin.x,y:origin.y,type:rollType(game.random),height,vz,vx,vy,
    angle:Math.atan2(vy,vx),phase:game.catsReleased*1.9,turnTimer:.4,flee:1.3,meow:1,captured:false});
  game.catsReleased++;
}

export function launchCats(game,container){
  if(container.opened)return;
  container.opened=true;container.shake=.5;
  if(container.type==='crate')game.emit('crateBreak');
  const count=1+Math.floor(game.random()*4);
  const offset=Math.atan2(container.y-game.player.y,container.x-game.player.x)+(game.random()-.5)*.5;
  for(let i=0;i<count;i++){
    const angle=offset+(count===1?0:(i/(count-1)-.5)*2.4),speed=3+game.random()*1.2;
    launchCat(game,container,Math.cos(angle)*speed,Math.sin(angle)*speed,.5,2+game.random()*.4);
  }
  game.emit('catLaunch',{count});
}

export function barkAtCats(game){
  const p=game.player;
  for(const cat of game.cats)if(!cat.captured&&Math.hypot(cat.x-p.x,cat.y-p.y)<5&&lineOfSight(game.map,p.x,p.y,cat.x,cat.y)){
    cat.flee=3;cat.meow=1;cat.turnTimer=0;cat.angle=Math.atan2(cat.y-p.y,cat.x-p.x);
    game.emit('catMeow');
  }
}

export function captureCat(game,cat){
  if(cat.captured||cat.height>0)return;
  const info=CAT_TYPES[cat.type];cat.captured=true;
  game.catsCaptured++;game.catCollection[cat.type]++;game.catPoints+=info.value;game.score+=info.value;
  game.emit('catCapture',{kind:cat.type,value:info.value});
}

export function updateCats(game,dt){
  const p=game.player;
  for(const cat of game.cats){
    if(cat.captured)continue;
    cat.phase+=dt*(cat.flee>0?17:6);cat.meow=Math.max(0,cat.meow-dt);cat.flee=Math.max(0,cat.flee-dt);
    if(cat.height>0){
      // Outward velocity and gravity make this a launch, with wall-safe landings.
      moveAirborne(game.map,cat,dt);
      if(cat.height===0)cat.flee=Math.max(cat.flee,1.3);
      continue;
    }
    const distance=Math.hypot(cat.x-p.x,cat.y-p.y);
    if(distance<2.8&&lineOfSight(game.map,p.x,p.y,cat.x,cat.y))cat.flee=Math.max(cat.flee,1.3);
    cat.turnTimer-=dt;
    if(cat.flee>0)cat.angle=Math.atan2(cat.y-p.y,cat.x-p.x);
    else if(cat.turnTimer<=0){cat.angle+=(game.random()-.5)*2.4;cat.turnTimer=.8+game.random()*1.7;}
    const speed=cat.flee>1.4?2.65:cat.flee>0?2.05:.55;
    // Look ahead, then steer along a wall instead of running into it forever.
    const offsets=[0,.55,-.55,1.1,-1.1,Math.PI/2,-Math.PI/2,2.4,-2.4,Math.PI];
    const heading=offsets.map(offset=>cat.angle+offset).find(angle=>canOccupy(game.map,cat.x+Math.cos(angle)*.4,cat.y+Math.sin(angle)*.4,.14));
    if(heading!==undefined){cat.angle=heading;moveEntity(game.map,cat,Math.cos(heading)*speed*dt,Math.sin(heading)*speed*dt,.14);}
  }
}
