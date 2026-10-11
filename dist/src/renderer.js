import { canvas, createArt, drawDog } from './art.js';
import { angleDifference, lineOfSight } from './game.js';
import { CAT_TYPES, isCatContainer } from './cats.js';
const H=400,PROJECTION=340;
export class Renderer {
  constructor(surface){
    this.canvas=surface;this.width=640;surface.width=this.width;surface.height=H;this.ctx=surface.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;
    this.art=createArt();this.depth=new Float32Array(this.width);this.floor=canvas(this.width/2,H/2);this.floorCtx=this.floor.getContext('2d');this.floorData=this.floorCtx.createImageData(this.width/2,H/2);this.sky=this.makeSky();this.reducedMotion=false;
  }
  makeSky(){
    const c=canvas(1280,220),g=c.getContext('2d');const grad=g.createLinearGradient(0,0,0,220);grad.addColorStop(0,'#101f29');grad.addColorStop(.6,'#374447');grad.addColorStop(1,'#8b7154');g.fillStyle=grad;g.fillRect(0,0,1280,220);
    let seed=7;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    g.fillStyle='#b6af87';g.beginPath();g.arc(990,58,19,0,7);g.fill();g.fillStyle='#80908444';g.beginPath();g.arc(990,58,26,0,7);g.fill();
    for(let layer=0;layer<2;layer++)for(let x=0;x<1280;){const w=25+r()*65,h=28+r()*100,y=220-h;g.fillStyle=layer?'#192b31':'#334247';g.fillRect(x,y,w,h);g.fillRect(x+w*.4,y-8,w*.2,8);if(r()>.7)g.fillRect(x+w*.6,y-35,2,35);for(let wy=y+12;wy<215;wy+=13)for(let wx=x+6;wx<x+w-6;wx+=10)if(r()>.5){g.fillStyle=r()>.5?'#b1996155':'#7c9a9355';g.fillRect(wx,wy,3,5);}x+=w+3;}
    g.strokeStyle='#14242b';g.lineWidth=2;g.beginPath();g.moveTo(0,88);g.bezierCurveTo(320,150,500,145,700,78);g.bezierCurveTo(940,133,1130,140,1280,97);g.stroke();return c;
  }
  render(game,time=0){
    const nextWidth=Math.max(200,Math.min(1000,Math.round(this.canvas.clientWidth/Math.max(1,this.canvas.clientHeight)*H/2)*2));
    if(nextWidth!==this.width){this.width=nextWidth;this.canvas.width=nextWidth;this.depth=new Float32Array(nextWidth);this.floor.width=nextWidth/2;this.floorData=this.floorCtx.createImageData(nextWidth/2,H/2);}
    const W=this.width,g=this.ctx,p=game.player;g.imageSmoothingEnabled=false;
    const bob=this.reducedMotion?0:Math.sin(game.distanceWalked*8)*1.8;
    const shake=!this.reducedMotion&&game.hurt>0?Math.sin(time*57)*game.hurt*5:0;
    const horizon=Math.floor(H*.46+bob+shake);
    if(game.level.theme==='warehouse'){g.fillStyle='#1d2829';g.fillRect(0,0,W,horizon);g.strokeStyle='#2e3b39';for(let y=12;y<horizon;y+=26){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}}
    else{let offset=((p.angle/(Math.PI*2)*1280)%1280+1280)%1280;g.drawImage(this.sky,offset,0,Math.min(W,1280-offset),220,0,0,Math.min(W,1280-offset),horizon);if(offset>1280-W)g.drawImage(this.sky,0,0,offset-(1280-W),220,1280-offset,0,offset-(1280-W),horizon);}
    const dirX=Math.cos(p.angle),dirY=Math.sin(p.angle),planeScale=W/(2*PROJECTION),planeX=-dirY*planeScale,planeY=dirX*planeScale;
    // Floor casting at half resolution gives perspective-correct asphalt cheaply.
    const fw=W/2,fh=H/2,buffer=this.floorData.data;
    for(let y=0;y<fh;y++){
      const screenY=horizon+y*2,dist=PROJECTION*.5/Math.max(1,screenY-horizon);
      const stepX=dist*planeX*2/fw,stepY=dist*planeY*2/fw;let fx=p.x+dist*(dirX-planeX),fy=p.y+dist*(dirY-planeY);
      const fog=Math.min(.86,dist/24),base=game.level.theme==='warehouse'?56:47;
      for(let x=0;x<fw;x++,fx+=stepX,fy+=stepY){
        const tx=Math.floor(fx*48),ty=Math.floor(fy*48);let noise=((tx*73856093^ty*19349663)>>>0)%17-8;
        const grid=(tx%48===0||ty%48===0)?-9:0;
        const puddle=game.level.theme!=='warehouse'&&Math.sin(fx*2.3)+Math.cos(fy*3.1)>1.1;
        let v=(base+noise+grid+(puddle?12:0))*(1-fog);const i=(y*fw+x)*4;
        buffer[i]=v+(puddle?3:0);buffer[i+1]=v+5;buffer[i+2]=v+7;buffer[i+3]=255;
      }
    }
    this.floorCtx.putImageData(this.floorData,0,0);g.drawImage(this.floor,0,horizon,W,H);
    for(let x=0;x<W;x+=2){
      const cameraX=2*x/W-1,rx=dirX+planeX*cameraX,ry=dirY+planeY*cameraX;
      let mx=Math.floor(p.x),my=Math.floor(p.y);const ddx=Math.abs(1/rx),ddy=Math.abs(1/ry),sx=rx<0?-1:1,sy=ry<0?-1:1;
      let sideX=(rx<0?p.x-mx:mx+1-p.x)*ddx,sideY=(ry<0?p.y-my:my+1-p.y)*ddy,side=0;
      for(let step=0;step<80;step++){if(sideX<sideY){sideX+=ddx;mx+=sx;side=0;}else{sideY+=ddy;my+=sy;side=1;}if(game.map[my]?.[mx]!=='.')break;}
      const dist=Math.max(.05,side===0?sideX-ddx:sideY-ddy);this.depth[x]=this.depth[x+1]=dist;
      const height=PROJECTION/dist*2.3,top=horizon-height*(1-.5/2.3);
      let wall=side===0?p.y+dist*ry:p.x+dist*rx;wall-=Math.floor(wall);let tx=Math.floor(wall*64);if((side===0&&rx>0)||(side===1&&ry<0))tx=63-tx;
      let texture=(mx*7+my*11)%9;texture=game.level.theme==='warehouse'?(texture%3===0?4:2):game.level.theme==='docks'?(texture%3===0?0:4):texture===1?3:texture<3?1:0;
      g.drawImage(this.art.textures[texture],tx,0,1,64,x,top,2,height);
      g.fillStyle=`rgba(8,19,24,${Math.min(.89,dist*.058+(side?.13:0))})`;g.fillRect(x,top,2,height+1);
      // Thin wall-cap highlight gives the alleys a crisp silhouette.
      if(height<500){g.fillStyle=`rgba(151,145,116,${Math.max(0,.35-dist*.02)})`;g.fillRect(x,top,2,1);}
    }
    const objects=[];
    for(const e of game.enemies){
      if(e.hp<=0){objects.push({...e,kind:'cuffs'});continue;}
      const frame=e.stun>0?0:e.attackWindup>0?3:e.attackSwing>0?4:e.active?1+Math.floor(e.phase*1.6)%2:0;
      objects.push({...e,kind:'enemy',image:this.art.enemies[e.type][frame]});
    }
    for(const i of game.pickups)if(!i.collected)objects.push({...i,kind:'pickup',image:this.art.items[i.type]});
    for(const i of game.props){
      let image=this.art.props[isCatContainer(i)&&i.opened?`${i.type}Open`:i.type];
      if(i.type==='bin')image=i.grouchDead?this.art.binFlop[Math.floor((i.grouchFlop||0)*8)]:i.peekProgress>.8&&(i.grouchThrow>0||i.throwPose>0)?this.art.binThrow:this.art.binPeek[Math.ceil((i.peekProgress||0)*8)];
      objects.push({...i,kind:'prop',image});
    }
    for(const cat of game.cats)if(!cat.captured){
      const frame=(cat.height>0?2:Math.floor(cat.phase)%2)+(Math.sin(cat.angle-p.angle)<0?3:0);
      objects.push({...cat,kind:'cat',image:this.art.cats[cat.type][frame]});
    }
    for(const b of game.projectiles)objects.push({...b,type:'bottle',kind:'projectile',image:this.art.items.bottle});
    objects.push({...game.exit,kind:'exit',image:this.art.exit});
    for(const o of objects){const ox=o.x-p.x,oy=o.y-p.y;const inv=1/(planeX*dirY-dirX*planeY);o.cameraX=inv*(dirY*ox-dirX*oy);o.z=inv*(-planeY*ox+planeX*oy);}
    objects.sort((a,b)=>b.z-a.z);
    for(const o of objects){
      if(o.z<.16||o.z>22)continue;
      const unit=PROJECTION/o.z;
      const center=(W/2)*(1+o.cameraX/o.z)+(o.kind==='prop'&&o.shake>0?Math.sin(time*48)*unit*.045*Math.min(1,o.shake*3):0);
      if(o.kind==='cuffs'){
        const sx=Math.round(center),sy=horizon+unit*.44;if(sx>0&&sx<W&&o.z<this.depth[sx]){g.strokeStyle='#b3bbab';g.lineWidth=Math.max(1,unit*.01);g.beginPath();g.ellipse(sx-unit*.08,sy,unit*.055,unit*.035,0,0,7);g.ellipse(sx+unit*.06,sy,unit*.055,unit*.035,0,0,7);g.moveTo(sx-unit*.025,sy);g.lineTo(sx+unit*.005,sy);g.stroke();}continue;
      }
      const factor=o.kind==='enemy'?(o.type==='boss'?1.06:.91):o.kind==='cat'?.48:o.kind==='pickup'?.28:o.kind==='projectile'?.24:o.kind==='exit'?.96:1;
      const sh=unit*factor,sw=sh*(o.image.width/o.image.height);let bottom=horizon+unit*.5;
      if(o.kind==='cat'&&center>0&&center<W&&o.z<this.depth[Math.floor(center)]){g.fillStyle='#07111770';g.beginPath();g.ellipse(center,bottom-unit*.025,unit*.17,unit*.035,0,0,Math.PI*2);g.fill();}
      if(o.kind==='pickup')bottom-=unit*(o.height>0?o.height:.045+Math.sin(time*3+o.x)*.025);
      if(o.kind==='projectile')bottom-=unit*.44;
      if(o.kind==='cat')bottom-=unit*o.height;
      if(o.kind==='enemy'&&o.active&&!o.stun&&!o.attackWindup&&!o.attackSwing&&!this.reducedMotion)bottom+=Math.sin(o.phase)*unit*.014;
      const left=center-sw/2,top=bottom-sh;
      for(let x=Math.max(0,Math.floor(left));x<Math.min(W,left+sw);x++)if(o.z<this.depth[x]){
        const sourceX=Math.min(o.image.width-1,Math.max(0,Math.floor((x-left)/sw*o.image.width)));
        g.drawImage(o.image,sourceX,0,1,o.image.height,x,top,1,sh);
      }
      const cx=Math.floor(center);
      if(cx>0&&cx<W&&o.z<this.depth[cx]){
        if(o.kind==='cat'&&o.z<9){
          const info=CAT_TYPES[o.type];g.textAlign='center';g.font=`bold ${Math.max(8,Math.min(14,unit*.1))}px monospace`;
          g.fillStyle=info.color;
          if(o.meow>0)g.fillText('MEOW!',center,Math.max(19,top-8));
          else if(o.type==='lilac'||o.type==='golden')g.fillText(info.rarity,center,Math.max(19,top-8));
          if(o.type==='golden'){g.fillStyle='#ffe89c';const pulse=this.reducedMotion?0:Math.sin(time*4)*4;g.fillRect(center-sw*.58,top+sh*.4+pulse,3,3);g.fillRect(center+sw*.52,top+sh*.65-pulse,2,2);}
        }
        if(o.kind==='prop'&&isCatContainer(o)&&!o.opened&&o.shake>0){g.textAlign='center';g.font=`bold ${Math.max(10,unit*.12)}px monospace`;g.fillStyle='#efcd89';g.fillText('?!',center,bottom-sh*.59);}
        if(o.kind==='prop'&&o.type==='bin'&&!o.grouchDead&&o.peekProgress===1&&o.z<7){
          const size=Math.max(9,Math.min(16,unit*.1)),lines=o.grouchBarks===2?['I TOLD YOU,','SCRAM!']:[o.grouchLine||'SCRAM!'];
          g.textAlign='center';g.font=`bold ${size}px monospace`;g.fillStyle='#dae8ab';g.strokeStyle='#152320';g.lineWidth=3;
          const y=Math.max(20+(lines.length-1)*size*1.2,top-6);
          lines.forEach((line,index)=>{const width=g.measureText(line).width,x=Math.max(width/2+4,Math.min(W-width/2-4,center)),ly=y-(lines.length-1-index)*size*1.2;g.strokeText(line,x,ly);g.fillText(line,x,ly);});
        }
      }
      if(o.kind==='enemy'&&cx>0&&cx<W&&o.z<this.depth[cx]){
        if(o.stun>0){g.fillStyle='#f2cf70';g.font=`bold ${Math.max(7,unit*.09)}px monospace`;g.textAlign='center';g.fillText('*  *  *',center,top-5);}
        else if(o.attackWindup>0){g.fillStyle='#ffca76';g.font=`bold ${Math.max(12,unit*.12)}px monospace`;g.textAlign='center';g.fillText('!',center,Math.max(20,top-9));}
        if(o.hurt>0){g.strokeStyle='#f6d89c';g.lineWidth=2;g.beginPath();for(let i=0;i<5;i++){let a=i*1.25;g.moveTo(center+Math.cos(a)*sw*.25,top+sh*.45+Math.sin(a)*sw*.25);g.lineTo(center+Math.cos(a)*sw*.5,top+sh*.45+Math.sin(a)*sw*.5);}g.stroke();}
        if(o.type==='boss'||o.hp<o.maxHp){g.fillStyle='#182023';g.fillRect(center-sw*.34,top-9,sw*.68,3);g.fillStyle=o.type==='boss'?'#d98652':'#d2b37d';g.fillRect(center-sw*.34,top-9,sw*.68*o.hp/o.maxHp,3);}
      }
    }
    if(game.level.theme!=='warehouse'){
      g.strokeStyle='#bdcfbd22';g.lineWidth=1;g.beginPath();
      for(let i=0;i<42;i++){const rx=(i*137.7)%W,ry=(i*67.3+(this.reducedMotion?0:time*150))%H;g.moveTo(rx,ry);g.lineTo(rx-2,ry+7);}
      g.stroke();
    }
    if(game.barkWave>0){g.strokeStyle=`rgba(209,223,189,${game.barkWave*.6})`;g.lineWidth=3;g.beginPath();g.ellipse(W/2,H*.55,(1-game.barkWave/.6)*W*.65,(1-game.barkWave/.6)*H*.65,0,0,7);g.stroke();}
    // Vignette stays gentle enough that enemies remain readable.
    const vignette=g.createRadialGradient(W/2,H*.5,H*.2,W/2,H*.5,W*.64);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#071018b0');g.fillStyle=vignette;g.fillRect(0,0,W,H);
    const biting=game.biteAnimation>0?Math.sin((.3-game.biteAnimation)/.3*Math.PI):0;
    const viewScale=Math.min(1.3,W/640);
    drawDog(g,W/2+(this.reducedMotion?0:Math.sin(game.distanceWalked*4)*3),H-84*viewScale+biting*10,(1.1+biting*.13)*viewScale,biting,p.health);
    if(game.hurt>0){g.fillStyle=`rgba(151,36,24,${game.hurt*.28})`;g.fillRect(0,0,W,H);}
    if(game.paperImpact>0){
      const progress=this.reducedMotion?.5:1-game.paperImpact/.4;
      g.save();g.translate(W*.64,H*.38);
      g.fillStyle='#ebd7a8';g.strokeStyle='#362b23';g.lineWidth=2;g.beginPath();
      for(let i=0;i<20;i++){const a=i*Math.PI/10,r=i%2===0?1:.67;const x=Math.cos(a)*57*r,y=Math.sin(a)*32*r;i?g.lineTo(x,y):g.moveTo(x,y);}
      g.closePath();g.fill();g.stroke();g.rotate(-.1);g.textAlign='center';g.textBaseline='middle';g.font='bold italic 25px monospace';g.fillStyle='#813e2c';g.fillText('WHAP!',0,1);g.restore();
      for(let i=0;i<5;i++){
        const a=i*1.7,spread=25+progress*55;
        g.save();g.translate(W*.55+Math.cos(a)*spread,H*.4+Math.sin(a)*spread+progress*18);g.rotate(a+progress*2);g.fillStyle='#d8d7bc';g.fillRect(-4,-2,8,5);g.fillStyle='#7c8777';g.fillRect(-2,-1,4,1);g.restore();
      }
    }
    const reachable=(entity,reach)=>Math.hypot(entity.x-p.x,entity.y-p.y)<reach&&Math.abs(angleDifference(Math.atan2(entity.y-p.y,entity.x-p.x),p.angle))<.7&&lineOfSight(game.map,p.x,p.y,entity.x,entity.y);
    const nearCat=game.cats.find(cat=>!cat.captured&&cat.height===0&&reachable(cat,1.2));
    const nearContainer=game.props.some(prop=>isCatContainer(prop)&&!prop.opened&&reachable(prop,1.65));
    const inRange=nearCat||nearContainer||game.enemies.some(e=>e.hp>0&&reachable(e,1.65));
    if(nearCat||nearContainer){g.textAlign='center';g.font='bold 10px monospace';g.fillStyle=nearCat?CAT_TYPES[nearCat.type].color:'#efd29b';g.fillText(nearCat?'BITE TO GENTLY CATCH':'BITE TO OPEN',W/2,horizon+24);}
    g.strokeStyle=inRange?'#efb76a':'#d7d5b099';g.lineWidth=1;const cy=horizon;g.beginPath();for(const [x,y,dx,dy]of [[W/2-6,cy-5,0,3],[W/2+6,cy-5,0,3],[W/2-6,cy+5,0,-3],[W/2+6,cy+5,0,-3]]){g.moveTo(x,y);g.lineTo(x+dx,y+dy);}g.stroke();g.fillStyle=inRange?'#efb76a':'#d7d5b099';g.fillRect(W/2-1,cy,2,1);
  }
  map(game,target){
    const g=target.getContext('2d'),scale=9;target.width=game.map[0].length*scale;target.height=game.map.length*scale;
    g.fillStyle='#101b20ec';g.fillRect(0,0,target.width,target.height);
    for(let y=0;y<game.map.length;y++)for(let x=0;x<game.map[y].length;x++)if(game.map[y][x]==='.'){g.fillStyle='#3e514f';g.fillRect(x*scale,y*scale,scale-1,scale-1);}
    for(const e of game.enemies)if(e.hp>0){g.fillStyle=e.type==='boss'?'#f2c470':'#cf674d';g.fillRect(e.x*scale-2,e.y*scale-2,4,4);}
    for(const p of game.pickups)if(!p.collected){g.fillStyle=p.type==='bone'?'#e4c681':'#b9d6b0';g.fillRect(p.x*scale-1,p.y*scale-1,3,3);}
    for(const prop of game.props)if(isCatContainer(prop)&&!prop.opened){g.strokeStyle='#dcaa72';g.strokeRect(prop.x*scale-2,prop.y*scale-2,4,4);}
    for(const cat of game.cats)if(!cat.captured){g.fillStyle=CAT_TYPES[cat.type].color;g.beginPath();g.arc(cat.x*scale,cat.y*scale,2.5,0,Math.PI*2);g.fill();}
    g.fillStyle='#a4d6b1';g.fillRect(game.exit.x*scale-3,game.exit.y*scale-3,6,6);
    const p=game.player;g.save();g.translate(p.x*scale,p.y*scale);g.rotate(p.angle);g.fillStyle='#fff0c7';g.beginPath();g.moveTo(6,0);g.lineTo(-4,-4);g.lineTo(-2,0);g.lineTo(-4,4);g.fill();g.restore();
  }
}
