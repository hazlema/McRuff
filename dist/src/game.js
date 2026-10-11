import { LEVELS } from './levels.js';
import { TAU, angleDifference, solid, canOccupy, lineOfSight, moveEntity, moveAirborne } from './world.js';
export { TAU, angleDifference, solid, canOccupy, lineOfSight, moveEntity } from './world.js';
import { CAT_TYPES, isCatContainer, launchCats, barkAtCats, updateCats, captureCat } from './cats.js';
import { botherGrouch, updateGrouch } from './grouch.js';
const enemyStats = {thug:{hp:3,speed:1.5,damage:14},thrower:{hp:2,speed:1.05,damage:12},brute:{hp:5,speed:1.1,damage:22},boss:{hp:16,speed:1.3,damage:28}};
const difficultyRules = {
  easy:{damage:.6,speed:.8,barkStun:2.5,arrestHeal:5,districtHeal:100,biteInterrupt:true},
  normal:{damage:1,speed:1,barkStun:1.25,arrestHeal:0,districtHeal:20,biteInterrupt:false},
  hard:{damage:1.35,speed:1.15,barkStun:.9,arrestHeal:0,districtHeal:10,biteInterrupt:false},
};
export class Game {
  constructor(difficulty='normal',random=Math.random) {
    this.random=random;this.catsCaptured=0;this.catPoints=0;this.catsReleased=0;this.catCollection=Object.fromEntries(Object.keys(CAT_TYPES).map(type=>[type,0]));
    this.difficulty=Object.hasOwn(difficultyRules,difficulty)?difficulty:'normal';this.rules=difficultyRules[this.difficulty];this.score=0;this.totalArrests=0;this.bones=0;this.elapsed=0;this.events=[];this.combo=0;this.comboTimer=0;
    this.loadLevel(0);
  }
  loadLevel(index) {
    const level=LEVELS[index];this.levelIndex=index;this.level=level;this.map=level.map;
    this.player={...level.spawn,health:Math.min(100,(this.player?.health??100)+this.rules.districtHeal),armor:this.player?.armor||0,stamina:100};
    this.enemies=level.enemies.map((e,i)=>({...e,hp:enemyStats[e.type].hp,maxHp:enemyStats[e.type].hp,active:false,cooldown:.6+i*.13,stun:0,hurt:0,dead:0,phase:i*1.7,attackWindup:0,attackSwing:0}));
    this.pickups=level.pickups.map(p=>({...p,collected:false}));this.props=level.props.map(p=>({...p,opened:false,shake:0,peek:0,peekProgress:0,grouchBarks:0,grouchDead:false,grouchFlop:0,grouchThrow:0,throwPose:0}));this.cats=[];this.exit=level.exit;
    this.arrests=0;this.status='playing';this.biteCooldown=0;this.biteAnimation=0;this.barkCooldown=0;this.barkWave=0;this.hurt=0;this.paperImpact=0;this.invulnerable=0;this.projectiles=[];this.particles=[];this.distanceWalked=0;this.fieldTimer=0;this.field=null;this.levelTime=0;this.exitHint=0;
    this.events.push({type:'dispatch',text:level.briefing});
  }
  nextLevel(){if(this.status==='cleared'&&this.levelIndex<LEVELS.length-1)this.loadLevel(this.levelIndex+1);}
  emit(type,detail={}){this.events.push({type,...detail});}
  bite(){
    if(this.status!=='playing'||this.biteCooldown>0)return false;
    this.biteCooldown=.42;this.biteAnimation=.3;this.emit('bite');
    const p=this.player;
    const targets=[
      ...this.enemies.filter(e=>e.hp>0).map(entity=>({entity,kind:'enemy',reach:1.65})),
      ...this.props.filter(e=>isCatContainer(e)&&!e.opened).map(entity=>({entity,kind:'container',reach:1.65})),
      ...this.cats.filter(e=>!e.captured&&e.height===0).map(entity=>({entity,kind:'cat',reach:1.2})),
    ].filter(({entity:e,reach})=>Math.hypot(e.x-p.x,e.y-p.y)<reach&&Math.abs(angleDifference(Math.atan2(e.y-p.y,e.x-p.x),p.angle))<.9&&lineOfSight(this.map,p.x,p.y,e.x,e.y));
    targets.sort((a,b)=>Math.hypot(a.entity.x-p.x,a.entity.y-p.y)-Math.hypot(b.entity.x-p.x,b.entity.y-p.y));
    if(targets.length){
      const {entity:e,kind}=targets[0];
      if(kind==='container')launchCats(this,e);
      else if(kind==='cat')captureCat(this,e);
      else {e.hp=Math.max(0,e.hp-1);e.hurt=.22;
      // On tougher settings a raised paper is committed: dodge it or spend a bark.
      // Short bite flinches only delay an enemy that has not started swinging yet.
      if(this.rules.biteInterrupt){e.stun=Math.max(e.stun,.36);e.attackWindup=0;e.attackSwing=0;}
      else if(!(e.attackWindup>0)&&!(e.attackSwing>0))e.stun=Math.max(e.stun,.12);
      e.active=true;this.emit('hit',{x:e.x,y:e.y});
      const a=Math.atan2(e.y-p.y,e.x-p.x),knockback=this.rules.biteInterrupt?.16:.1;moveEntity(this.map,e,Math.cos(a)*knockback,Math.sin(a)*knockback);
      if(e.hp===0){this.arrests++;this.totalArrests++;this.combo=this.comboTimer>0?this.combo+1:1;this.comboTimer=4;this.score+=(e.type==='boss'?1000:e.type==='brute'?250:100)*Math.min(this.combo,4);p.health=Math.min(100,p.health+this.rules.arrestHeal);this.emit('arrest',{combo:this.combo,boss:e.type==='boss'});if(this.enemies.every(e=>e.hp<=0))this.emit('clear');}
      }
    }
    moveEntity(this.map,p,Math.cos(p.angle)*.24,Math.sin(p.angle)*.24);
    return true;
  }
  bark(){
    if(this.status!=='playing'||this.barkCooldown>0)return false;
    this.barkCooldown=6;this.barkWave=.6;this.emit('bark');
    for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x-this.player.x,e.y-this.player.y)<5&&lineOfSight(this.map,this.player.x,this.player.y,e.x,e.y)){
      e.stun=this.rules.barkStun*(e.type==='boss'?.5:1);e.attackWindup=0;e.attackSwing=0;e.active=true;const a=Math.atan2(e.y-this.player.y,e.x-this.player.x);moveEntity(this.map,e,Math.cos(a)*.45,Math.sin(a)*.45);
    }
    for(const prop of this.props)if(Math.hypot(prop.x-this.player.x,prop.y-this.player.y)<5&&lineOfSight(this.map,this.player.x,this.player.y,prop.x,prop.y)){
      if(isCatContainer(prop)&&!prop.opened){prop.shake=1;this.emit(prop.type==='crate'?'crateRattle':'drumRattle');}
      else if(prop.type==='bin')botherGrouch(this,prop);
    }
    barkAtCats(this);
    this.projectiles=this.projectiles.filter(b=>Math.hypot(b.x-this.player.x,b.y-this.player.y)>5);
    return true;
  }
  damage(amount,source='impact'){
    if(this.invulnerable>0||this.status!=='playing')return false;
    const p=this.player;amount*=this.rules.damage;
    const absorbed=Math.min(p.armor,amount*.65);p.armor-=absorbed;p.health=Math.max(0,p.health-(amount-absorbed));this.hurt=.5;this.invulnerable=.55;this.emit('hurt',{source});
    if(p.health<=0){this.status='dead';this.emit('dead');}
    return true;
  }
  update(dt,input={}){
    if(this.status!=='playing')return;
    // Simulate long gaps in stable pieces; the UI pauses on tab/focus loss.
    if(dt>.05){let remaining=Math.min(dt,.5);while(remaining>0){const step=Math.min(.05,remaining);this.update(step,input);remaining-=step;}return;}
    this.elapsed+=dt;this.levelTime+=dt;
    for(const k of ['biteCooldown','biteAnimation','barkCooldown','barkWave','hurt','paperImpact','invulnerable','comboTimer','exitHint'])this[k]=Math.max(0,this[k]-dt);
    const p=this.player;p.angle+=((input.turn||0)*2.4)*dt;
    let f=input.forward||0,s=input.strafe||0;const magnitude=Math.hypot(f,s);if(magnitude>1){f/=magnitude;s/=magnitude;}
    const running=input.sprint&&p.stamina>5&&magnitude>0;const speed=running?4.2:2.6;
    p.stamina=Math.max(0,Math.min(100,p.stamina+dt*(running?-25:19)));
    const oldX=p.x,oldY=p.y;
    moveEntity(this.map,p,(Math.cos(p.angle)*f-Math.sin(p.angle)*s)*speed*dt,(Math.sin(p.angle)*f+Math.cos(p.angle)*s)*speed*dt);
    this.distanceWalked+=Math.hypot(p.x-oldX,p.y-oldY);
    if(input.bite)this.bite();if(input.bark)this.bark();
    this.fieldTimer-=dt;if(this.fieldTimer<=0){this.buildField();this.fieldTimer=.45;}
    for(const e of this.enemies){
      if(e.hp<=0){e.dead+=dt;continue;}
      e.hurt=Math.max(0,e.hurt-dt);e.cooldown-=dt;e.phase+=dt*7;e.attackSwing=Math.max(0,(e.attackSwing||0)-dt);
      if(e.stun>0){e.attackWindup=0;e.attackSwing=0;e.stun-=dt;continue;}
      const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy),visible=d<10&&lineOfSight(this.map,e.x,e.y,p.x,p.y);
      if(visible&&d<9.5)e.active=true;if(!e.active)continue;
      const stats=enemyStats[e.type];
      if(e.attackWindup>0){
        e.attackWindup=Math.max(0,e.attackWindup-dt);
        if(e.attackWindup===0){
          e.attackSwing=.28;e.cooldown=(e.type==='boss'?.8:.95)/this.rules.speed;this.emit('paperSwing');
          // Resolve range and cover on impact, so backing away can dodge a committed swat.
          if(d<1.6&&visible&&this.damage(stats.damage,'newspaper')){this.paperImpact=.4;this.emit('paperHit');}
        }
        continue;
      }
      if(e.attackSwing>0)continue;
      // Keep the warning readable on every setting; pressure comes from pursuit and recovery.
      if(d<1.4&&visible&&e.cooldown<=0){e.attackWindup=e.type==='boss'||e.type==='brute'?.65:.52;this.emit('paperRustle');continue;}
      else if(e.type==='thrower'&&visible&&d>2.1&&d<9&&e.cooldown<=0){const speed=4.5*this.rules.speed;this.projectiles.push({x:e.x,y:e.y,vx:dx/d*speed,vy:dy/d*speed,life:4});e.cooldown=1.8/this.rules.speed;this.emit('throw');}
      if(d>.7&&!(e.type==='thrower'&&visible&&d<5&&d>2.3)){
        let tx=p.x,ty=p.y;
        if(!visible){const cx=Math.floor(e.x),cy=Math.floor(e.y);let best=this.field?.[cy]?.[cx]??9999;
          for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]){const v=this.field?.[cy+oy]?.[cx+ox];if(v!==undefined&&v<best){best=v;tx=cx+ox+.5;ty=cy+oy+.5;}}
        }
        const a=Math.atan2(ty-e.y,tx-e.x);let mx=Math.cos(a)*stats.speed*this.rules.speed*dt,my=Math.sin(a)*stats.speed*this.rules.speed*dt;
        for(const other of this.enemies){if(other===e||other.hp<=0)continue;const ox=e.x-other.x,oy=e.y-other.y,od=Math.hypot(ox,oy);if(od<.55&&od>.01){mx+=ox/od*dt*.65;my+=oy/od*dt*.65;}}
        moveEntity(this.map,e,mx,my,.19);
      }
    }
    for(const prop of this.props){
      prop.shake=Math.max(0,(prop.shake||0)-dt);
      if(prop.type==='bin')updateGrouch(this,prop,dt);
    }
    if(this.status==='playing')updateCats(this,dt);
    for(const b of this.projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(solid(this.map,b.x,b.y))b.life=0;else if(Math.hypot(b.x-p.x,b.y-p.y)<.3){this.damage(12);b.life=0;}}
    this.projectiles=this.projectiles.filter(b=>b.life>0);
    for(const item of this.pickups)if(!item.collected&&item.height>0)moveAirborne(this.map,item,dt);
    for(const item of this.pickups)if(!item.collected&&!(item.height>0)&&Math.hypot(item.x-p.x,item.y-p.y)<.6){
      if(item.type==='health'&&p.health>=100)continue;if(item.type==='armor'&&p.armor>=100)continue;
      item.collected=true;if(item.type==='health')p.health=Math.min(100,p.health+35);else if(item.type==='armor')p.armor=Math.min(100,p.armor+50);else if(item.type==='treatBone')this.score+=100;else{this.bones++;this.score+=500;}
      this.emit('pickup',{kind:item.type});
    }
    if(this.status!=='playing')return;
    if(Math.hypot(p.x-this.exit.x,p.y-this.exit.y)<.7){
      if(this.enemies.every(e=>e.hp<=0)){this.score+=Math.max(100,Math.floor(1200-this.levelTime*5));this.status=this.levelIndex===LEVELS.length-1?'won':'cleared';this.emit(this.status);}
      else if(this.exitHint<=0){this.emit('locked');this.exitHint=4;}
    }
  }
  buildField(){
    const rows=this.map.length,cols=this.map[0].length;this.field=Array.from({length:rows},()=>Array(cols).fill(9999));
    const px=Math.floor(this.player.x),py=Math.floor(this.player.y);this.field[py][px]=0;const queue=[[px,py]];
    for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(this.map[ny]?.[nx]==='.'&&this.field[ny][nx]===9999){this.field[ny][nx]=this.field[y][x]+1;queue.push([nx,ny]);}}}
  }
}
