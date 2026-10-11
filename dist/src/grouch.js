import { launchCat } from './cats.js';

export function botherGrouch(game,bin){
  if(bin.grouchDead)return;
  bin.grouchBarks=(bin.grouchBarks||0)+1;
  if(bin.grouchBarks===4){
    bin.grouchDead=true;bin.grouchFlop=0;bin.grouchThrow=0;bin.grouchLine='';
    game.emit('grouchCollapse');return;
  }
  bin.peek=3.2;
  bin.grouchLine=['SCRAM!','I TOLD YOU, SCRAM!','THAT DOES IT!'][bin.grouchBarks-1];
  if(bin.grouchBarks===3)bin.grouchThrow=.5;
  game.emit('grouchPeek');
}

export function updateGrouch(game,bin,dt){
  if(bin.grouchDead){
    bin.grouchFlop=Math.min(1,(bin.grouchFlop||0)+dt*2.5);
    return;
  }
  bin.peek=Math.max(0,(bin.peek||0)-dt);
  bin.peekProgress=Math.max(0,Math.min(1,(bin.peekProgress||0)+dt*(bin.peek>0?4:-3)));
  bin.throwPose=Math.max(0,(bin.throwPose||0)-dt);
  if(bin.grouchThrow>0){
    bin.grouchThrow=Math.max(0,bin.grouchThrow-dt);
    if(bin.grouchThrow===0){
      // The arc aims at Buster's position now; moving afterward can dodge it.
      const kind=['treatBone','health','cat'][Math.floor(game.random()*3)];
      const vx=(game.player.x-bin.x)/.8,vy=(game.player.y-bin.y)/.8;
      if(kind==='cat')launchCat(game,bin,vx,vy,.6,2.45);
      else game.pickups.push({x:bin.x,y:bin.y,type:kind,collected:false,height:.6,vz:2.45,vx,vy});
      bin.throwPose=.3;game.emit('grouchThrow',{kind});
      if(kind==='cat')game.emit('catMeow');
    }
  }
}
