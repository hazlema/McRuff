import { CAT_TYPES } from './cats.js';
export function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const random=(seed)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function polygon(ctx,color,points){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function rect(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
export function makeTextures(){
  return Array.from({length:6},(_,index)=>{
    const c=canvas(64,64),ctx=c.getContext('2d'),rand=random(index+94);
    const bases=[[100,74,59],[67,79,78],[92,94,83],[89,61,48],[51,67,69],[88,76,58]];
    const base=bases[index];
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){const noise=(rand()-.5)*25;ctx.fillStyle=`rgb(${base[0]+noise},${base[1]+noise},${base[2]+noise})`;ctx.fillRect(x,y,1,1);}
    if(index===0||index===3){
      for(let y=0;y<64;y+=12){rect(ctx,'#342f2b',0,y,64,2);rect(ctx,'#b19773',0,y+2,64,1);for(let x=(y%24===0?0:16);x<64;x+=32){rect(ctx,'#3b332c',x,y,2,12);rect(ctx,'#79604b',x+2,y+3,1,9);}}
      if(index===3){rect(ctx,'#192c30',6,19,51,23);rect(ctx,'#a99b70',6,19,51,2);rect(ctx,'#a99b70',6,40,51,2);ctx.font='bold 9px monospace';ctx.fillStyle='#d8c797';ctx.fillText('BONE ST',10,34);}
    }else if(index===1||index===4){
      for(let y=0;y<64;y+=8){rect(ctx,'#243435',0,y,64,2);rect(ctx,'#849084',0,y+2,64,1);}
      rect(ctx,'#232d2e',2,0,3,64);rect(ctx,'#8c8c74',5,0,2,64);rect(ctx,'#232d2e',58,0,4,64);
      for(let y=5;y<64;y+=24){rect(ctx,'#bcb59a',4,y,2,2);rect(ctx,'#141c20',59,y,2,2);}
      if(index===4){ctx.globalAlpha=.8;for(let x=-32;x<96;x+=20)polygon(ctx,'#a78036',[[x,51],[x+9,51],[x-4,63],[x-13,63]]);ctx.globalAlpha=1;}
    }else{
      rect(ctx,'#343b37',0,0,64,2);rect(ctx,'#a7a68e',0,2,64,1);rect(ctx,'#343b37',0,61,64,3);
      rect(ctx,'#484e44',32,0,1,64);
      for(let i=0;i<12;i++){let x=rand()*64,y=rand()*64;rect(ctx,'#505247',x,y,1,rand()*18);}
    }
    // Grime and a low stone foundation ground each wall.
    ctx.globalAlpha=.24;for(let i=0;i<120;i++)rect(ctx,'#111a1b',rand()*64,rand()*64,1+rand()*4,rand()*7);ctx.globalAlpha=1;
    rect(ctx,'#293130',0,57,64,7);rect(ctx,'#727368',0,57,64,1);
    return c;
  });
}
function newspaper(g,x,y,angle,thick=false){
  const width=thick?20:14,length=thick?41:35;
  g.save();g.translate(x,y);g.rotate(angle);
  rect(g,'#37403a',-width/2-1,-length-1,width+2,length+3);
  rect(g,'#a4aa91',-width/2,-length,width,length);
  rect(g,'#e9e4cc',-width/2+2,-length,width-4,length-2);
  rect(g,'#fcf3d8',-width/2+2,-length,2,length-2);
  rect(g,'#8b9585',width/2-3,-length+1,2,length-1);
  g.fillStyle='#364742';g.font='bold 4px monospace';g.fillText(thick?'SUNDAY':'NEWS',-width/2+2,-length+7);
  rect(g,'#46574c',-width/2+3,-length+10,width-6,2);
  for(let row=0;row<4;row++){
    rect(g,'#758070',-width/2+3,-length+15+row*3,3+(row%2),1);
    rect(g,'#758070',2,-length+15+row*3,thick?5:2,1);
  }
  rect(g,'#ad5a43',-width/2,-8,width,3);
  rect(g,'#ece9d2',-width/2+1,0,width-2,2);
  rect(g,'#697569',-width/2+3,0,width-6,1);
  g.restore();
}
function enemySprite(type,frame){
  const c=canvas(80,112),g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const boss=type==='boss',brute=type==='brute',thrower=type==='thrower';
  const dark=boss?'#4c352b':thrower?'#1d353b':brute?'#333831':'#502b28';
  const mid=boss?'#a69068':thrower?'#3b6370':brute?'#69705c':'#985144';
  const light=boss?'#d0ba8b':thrower?'#628c94':brute?'#95977b':'#bf7860';
  const step=frame===1?3:frame===2?-3:0;const wide=boss||brute?5:0;
  g.fillStyle='#050b0d88';g.beginPath();g.ellipse(40,106,29,5,0,0,7);g.fill();
  polygon(g,'#121c21',[[25-wide,64],[55+wide,64],[55+step,101],[42+step,101],[39,78],[35-step,102],[21-step,102]]);
  rect(g,'#344348',26-wide,73,8,25-step);rect(g,'#485456',28-wide,75,3,17);rect(g,'#344348',44,75,7,23+step);
  rect(g,'#0b1519',18-step,98,18,7);rect(g,'#0b1519',43+step,98,18,7);rect(g,'#727776',18-step,103,18,2);rect(g,'#727776',43+step,103,18,2);
  // Silhouette, coat, sleeves and collar.
  polygon(g,'#12181a',[[24-wide,32],[55+wide,32],[frame>=3?55+wide:63+wide,44],[frame>=3?54+wide:65+wide,70],[54,74],[24,74],[12-wide,68],[16-wide,43]]);
  polygon(g,mid,[[25-wide,35],[55+wide,35],[59+wide,50],[53+wide,73],[24-wide,73],[20-wide,50]]);
  polygon(g,dark,[[20-wide,39],[29-wide,39],[26-wide,64],[19-wide,67],[13-wide,61]]);
  polygon(g,light,[[25-wide,35],[36,39],[31,55],[24-wide,55]]);
  polygon(g,dark,[[40,39],[52+wide,35],[54+wide,73],[42,73]]);
  if(frame<3)polygon(g,light,[[55+wide,39],[61+wide,46],[62+wide,61],[56+wide,64],[52+wide,47]]);
  rect(g,'#202327',37,40,3,31);rect(g,'#d3b68b',38,46,1,21);
  if(boss){polygon(g,'#e7d9b6',[[32,34],[48,34],[40,58]]);polygon(g,'#9d302e',[[38,37],[43,37],[44,57],[39,63],[36,55]]);}
  else {rect(g,'#c1a979',27-wide,55,7,2);rect(g,dark,26-wide,57,9,7);}
  rect(g,'#232627',24-wide,70,30+wide*2,5);rect(g,'#a8a484',36,71,7,4);
  // Neck and shaded angular face.
  rect(g,'#946749',34,28,14,13);polygon(g,'#4e392e',[[27,13],[50,13],[54,24],[49,36],[34,37],[26,28]]);
  polygon(g,'#bc9167',[[29,16],[49,16],[49,29],[43,35],[34,33],[29,26]]);
  rect(g,'#e3b586',30,19,8,8);rect(g,'#97694d',44,22,6,9);rect(g,'#e4b589',39,25,6,4);
  if(!boss){rect(g,'#172329',27,8,25,11);rect(g,thrower?'#4f7277':'#303638',30,6,19,5);rect(g,'#101a20',25,16,30,4);rect(g,'#767c6d',28,16,23,2);}
  else {polygon(g,'#2b2725',[[26,18],[27,10],[33,6],[49,8],[54,16],[50,20],[47,14],[30,13]]);rect(g,'#c5bba1',29,11,3,9);}
  rect(g,'#241c1a',29,21,9,3);rect(g,'#241c1a',43,21,7,3);rect(g,'#eee3bf',33,22,3,1);rect(g,'#eee3bf',44,22,2,1);
  rect(g,'#392826',34,31,10,2);rect(g,'#e5c28c',37,31,6,1);
  rect(g,'#bc9167',13-wide,62,9,10);rect(g,'#e0b88b',13-wide,63,3,6);if(frame<3)rect(g,'#bc9167',57+wide,62,8,10);
  if(thrower){rect(g,'#162c25',14,50,7,20);rect(g,'#6da080',15,54,4,12);rect(g,'#b3c791',16,48,3,6);rect(g,'#dcce9f',15,60,5,5);}
  if(frame===3){
    polygon(g,dark,[[53,37],[63,36],[67,24],[74,28],[70,47],[58,52]]);
    polygon(g,light,[[57,39],[65,41],[69,29],[72,31],[67,47],[58,47]]);
    newspaper(g,66,36,-.24,boss);
    rect(g,'#c89a70',61,32,9,8);rect(g,'#eed0a0',62,33,3,5);
  }else if(frame===4){
    polygon(g,dark,[[52,38],[62,43],[58,64],[47,68],[39,55]]);
    polygon(g,light,[[53,43],[57,47],[53,59],[45,61],[43,55]]);
    newspaper(g,56,65,-1.04,boss);
    rect(g,'#c89a70',52,61,9,8);rect(g,'#eed0a0',52,61,3,5);
    for(const [x,y,w] of [[8,30,12],[3,38,10],[6,47,8]])rect(g,'#e5e3bd',x,y,w,2);
  }else{
    newspaper(g,63+wide*.4,68,.12,boss);
    rect(g,'#c89a70',59+wide*.4,63,8,8);rect(g,'#eed0a0',59+wide*.4,64,2,5);
  }
  if(boss){rect(g,'#ad7b47',45,31,13,3);rect(g,'#f3954e',57,31,2,3);}
  return c;
}
function pickupSprite(type){
  const c=canvas(48,48),g=c.getContext('2d');
  g.fillStyle='#e5bc6a22';g.beginPath();g.ellipse(24,39,19,5,0,0,7);g.fill();
  if(type==='health'){
    polygon(g,'#3b261c',[[9,19],[17,12],[34,15],[41,24],[33,34],[14,34],[6,28]]);polygon(g,'#b65c45',[[10,20],[18,15],[33,17],[37,25],[30,30],[15,30],[10,27]]);polygon(g,'#e3a37a',[[15,19],[20,17],[32,20],[31,22],[21,20],[16,26],[13,24]]);rect(g,'#e7d3ac',24,24,8,4);rect(g,'#f4e2bb',26,22,4,8);
  }else if(type==='bone'||type==='treatBone'){
    const chew=type==='treatBone';
    polygon(g,chew?'#8a8b78':'#8e6834',[[10,10],[18,12],[22,19],[30,25],[36,24],[41,29],[40,36],[33,39],[27,34],[18,27],[13,24],[6,23],[5,16]]);polygon(g,chew?'#e4dfc9':'#f2cb75',[[10,10],[16,12],[17,19],[31,29],[36,26],[40,30],[37,35],[31,34],[16,23],[10,22],[7,18]]);rect(g,chew?'#fff8e5':'#fff0ae',9,13,4,4);rect(g,chew?'#fff8e5':'#fff0ae',33,29,4,3);
  }else if(type==='armor'){
    polygon(g,'#253c49',[[11,8],[20,12],[28,12],[38,8],[41,20],[36,34],[24,41],[12,34],[7,20]]);polygon(g,'#6e9ca6',[[13,13],[23,17],[35,13],[36,24],[31,32],[24,36],[16,30],[12,23]]);polygon(g,'#dbcca1',[[24,19],[27,24],[32,24],[28,28],[29,33],[24,30],[19,33],[20,27],[16,24],[22,24]]);
  }else{rect(g,'#e7bb68',20,14,8,18);rect(g,'#af7645',22,8,4,8);}
  return c;
}
function drawGrouchFlop(g,amount){
  // The shoulders stay hooked over the rim while the head and arms fall forward.
  polygon(g,'#30462a',[[15,47],[20,37],[38,35],[49,43],[52,60],[42,72],[21,66],[12,58]]);
  polygon(g,'#7e9946',[[19,47],[24,40],[37,39],[45,46],[46,60],[36,65],[21,60]]);
  const handY=54+amount*22;
  polygon(g,'#334c2d',[[14,47],[21,49],[17,handY],[9,handY+4],[7,handY-1]]);
  polygon(g,'#7b9642',[[14,50],[18,51],[14,handY],[10,handY+1]]);
  polygon(g,'#334c2d',[[45,47],[52,48],[57,handY-1],[54,handY+4],[47,handY]]);
  polygon(g,'#8aa34f',[[47,51],[50,51],[53,handY],[50,handY+1]]);
  g.save();g.translate(33,33+amount*31);g.rotate(amount*.2);
  polygon(g,'#293d27',[[-20,-7],[-18,-17],[-11,-18],[-7,-22],[0,-18],[7,-21],[11,-16],[18,-17],[21,-9],[18,-4],[21,4],[15,12],[7,16],[-7,14],[-17,9],[-20,2]]);
  polygon(g,'#829d48',[[-16,-7],[-14,-15],[-6,-16],[0,-13],[7,-16],[15,-12],[16,-5],[14,2],[17,5],[9,12],[-5,11],[-13,6]]);
  polygon(g,'#654831',[[-15,-10],[-9,-12],[-3,-8],[-4,-6],[-10,-8],[-16,-7]]);
  polygon(g,'#654831',[[3,-8],[9,-12],[15,-10],[16,-7],[10,-8],[4,-6]]);
  for(const x of [-10,8])polygon(g,'#1a2923',[[x-5,-4],[x-2,-1],[x+2,-1],[x+5,-4],[x+4,-1],[x+1,2],[x-2,2],[x-5,-1]]);
  rect(g,'#b0be6e',-3,1,7,4);
  polygon(g,'#24332a',[[-7,7],[7,7],[9,11],[5,16],[-5,15],[-8,11]]);
  polygon(g,'#d67e86',[[0,11],[6,11],[8,22],[5,27],[0,26],[-2,21]]);
  rect(g,'#edabb1',1,14,2,9);rect(g,'#9a565c',4,15,1,8);
  rect(g,'#a7b762',-15,2,3,4);rect(g,'#a7b762',12,2,3,4);g.restore();
}

function propSprite(type,peek=0,flop=null,throwing=false){
  const c=canvas(64,112),g=c.getContext('2d');
  if(type==='lamp'){
    rect(g,'#141e23',29,20,7,88);rect(g,'#6b6c58',29,20,2,88);rect(g,'#354345',20,102,25,7);rect(g,'#1a2428',19,11,27,23);rect(g,'#e3b877',23,15,19,15);rect(g,'#fff2c1',28,17,8,11);rect(g,'#384043',18,9,29,5);rect(g,'#1a2428',30,1,4,10);
  }else if(type==='bin'){
    polygon(g,'#142c2c',[[7,48],[58,48],[53,106],[11,106]]);rect(g,'#3e5b4f',10,52,43,48);rect(g,'#567060',12,55,4,42);for(let x=20;x<52;x+=10)rect(g,'#213e37',x,59,3,37);rect(g,'#141c1e',15,104,8,6);rect(g,'#141c1e',44,104,8,6);
    if(peek>0&&flop===null){
      rect(g,'#0c1c20',9,43,47,8);
      g.save();g.beginPath();g.rect(0,0,64,49);g.clip();g.translate(0,Math.round((1-peek)*31));
      polygon(g,'#253e28',[[12,45],[15,30],[12,28],[17,23],[16,18],[22,19],[26,14],[32,18],[39,14],[42,20],[49,19],[47,25],[53,29],[49,34],[53,43],[47,54],[18,54]]);
      polygon(g,'#759541',[[16,43],[20,31],[18,26],[23,26],[23,20],[29,22],[34,18],[39,23],[46,22],[44,28],[49,32],[45,37],[48,47],[39,53],[22,49]]);
      for(const [x,y,w,h] of [[20,38,3,7],[25,44,3,6],[40,39,3,9],[33,19,2,6],[46,30,3,4]])rect(g,'#a0b35c',x,y,w,h);
      g.fillStyle='#f1e9cc';for(const x of [25,39]){g.beginPath();g.ellipse(x,30,7,8,0,0,7);g.fill();}
      rect(g,'#1b2421',25,28,3,6);rect(g,'#1b2421',36,28,3,6);
      polygon(g,'#654831',[[16,20],[23,20],[32,26],[30,29],[22,25],[17,26]]);
      polygon(g,'#654831',[[33,26],[41,20],[48,20],[47,26],[41,25],[34,29]]);
      rect(g,'#ab8251',19,21,5,2);rect(g,'#ab8251',41,21,4,2);
      polygon(g,'#263426',[[25,43],[30,39],[37,39],[42,43],[36,42],[30,42]]);
      rect(g,'#b1be6d',30,35,7,3);g.restore();
      rect(g,'#597659',7,48,51,4);
      if(peek>.5){rect(g,'#8ba54e',14,46,9,8);rect(g,'#8ba54e',43,46,9,8);for(const x of [16,19,45,48])rect(g,'#536c35',x,49,1,5);}
    }
    const lidY=flop===null?43-Math.round(peek*35):8+Math.round(flop*89);
    polygon(g,'#1e3834',[[4,lidY+2],[13,lidY-1],[53,lidY-1],[61,lidY+3],[59,lidY+10],[5,lidY+10]]);
    rect(g,'#8a9d80',8,lidY+2,49,3);rect(g,'#4e6a55',10,lidY+6,46,2);rect(g,'#152c2a',27,lidY-4,13,4);rect(g,'#8a9d80',29,lidY-5,9,2);
    if(throwing){polygon(g,'#304b2c',[[46,47],[43,39],[49,32],[51,22],[60,21],[61,28],[56,42],[52,49]]);polygon(g,'#8aa34b',[[48,45],[47,40],[52,35],[54,26],[58,25],[55,39],[51,45]]);rect(g,'#a8b861',51,20,10,7);rect(g,'#536d35',54,21,1,5);rect(g,'#536d35',57,21,1,5);}
    if(flop!==null)drawGrouchFlop(g,flop);
  }else if(type==='crate'||type==='crateOpen'){
    rect(g,'#302b22',5,53,54,54);rect(g,'#806948',8,55,48,49);for(let x=9;x<55;x+=10){rect(g,'#af9466',x,56,2,48);rect(g,'#4b412e',x+8,56,2,48);}rect(g,'#a3885c',8,60,48,6);rect(g,'#a3885c',8,94,48,6);polygon(g,'#ab8e60',[[11,68],[17,66],[53,92],[47,94]]);
  }else{
    polygon(g,'#312820',[[13,50],[49,50],[54,57],[54,99],[48,107],[15,107],[9,100],[9,58]]);rect(g,'#986346',12,55,39,47);rect(g,'#bb8954',15,56,5,46);rect(g,'#674d38',40,54,10,49);rect(g,'#242c2c',10,64,43,5);rect(g,'#8c9380',10,64,43,2);rect(g,'#242c2c',10,92,43,5);rect(g,'#8c9380',10,92,43,2);rect(g,'#42423a',14,49,35,5);
  }
  if(type==='barrelOpen'){
    polygon(g,'#c49b69',[[10,49],[20,44],[47,44],[55,49],[49,56],[18,56]]);
    polygon(g,'#0c191c',[[15,49],[23,47],[44,47],[50,50],[44,53],[22,53]]);
    polygon(g,'#4b5349',[[45,47],[49,28],[56,20],[61,27],[55,48]]);
    polygon(g,'#9eaa8b',[[49,43],[52,29],[56,25],[58,28],[53,44]]);
    rect(g,'#17292b',23,73,16,14);rect(g,'#b8ac88',26,79,10,2);
  }
  if(type==='crateOpen'){
    polygon(g,'#b89b69',[[5,54],[15,47],[48,47],[59,54],[51,62],[14,62]]);
    polygon(g,'#142125',[[11,54],[18,51],[45,51],[53,55],[47,59],[17,59]]);
    polygon(g,'#4f412d',[[4,56],[2,33],[8,29],[12,37],[9,42],[15,53]]);
    polygon(g,'#b49969',[[4,51],[4,36],[7,33],[10,39],[7,42],[12,52]]);
    polygon(g,'#5f4a31',[[46,50],[50,34],[48,29],[53,22],[59,29],[60,49],[55,56]]);
    polygon(g,'#c7a779',[[51,49],[54,35],[51,30],[54,27],[57,31],[56,49]]);
    polygon(g,'#182426',[[25,68],[29,75],[34,71],[32,86],[37,94],[28,98],[30,87],[24,81]]);
    polygon(g,'#b09560',[[7,101],[1,104],[3,109],[21,107],[18,103]]);
    polygon(g,'#9b8054',[[43,106],[54,101],[62,106],[59,110],[46,109]]);
  }
  return c;
}

function catSprite(type,frame){
  const c=canvas(80,64),g=c.getContext('2d'),info=CAT_TYPES[type],flying=frame===2;
  const step=frame===1?4:0,light=type==='tuxedo'?'#ece5d2':type==='lilac'?'#e6c9ef':type==='golden'?'#fff0a2':'#eed4a2';
  const poly=(color,points)=>polygon(g,color,points),r=(color,x,y,w,h)=>rect(g,color,x,y,w,h);
  // A raised hooked tail, pointed ears, and whiskers stay legible at raycaster scale.
  poly('#142126',[[26,39],[12,34],[6,22],[7,12],[15,9],[21,14],[18,21],[14,18],[14,24],[29,29]]);
  poly(info.coat,[[25,35],[15,30],[11,21],[11,14],[15,13],[18,16],[15,17],[14,23],[20,28],[29,31]]);
  poly('#142126',[[23,27],[49,25],[63,33],[65,48],[58,54],[25,53],[18,44],[19,32]]);
  poly(info.coat,[[25,30],[48,28],[59,35],[61,46],[55,50],[27,49],[22,43],[23,34]]);
  poly(info.shade,[[24,41],[39,44],[57,41],[60,47],[52,51],[26,50]]);
  if(flying){
    poly('#142126',[[24,42],[28,45],[18,60],[9,57]]);poly(info.coat,[[24,44],[25,47],[17,57],[13,55]]);
    poly('#142126',[[44,44],[50,42],[65,55],[64,61],[56,60]]);poly(light,[[48,46],[58,55],[62,56],[61,58],[57,56]]);
    r(info.coat,26,18,5,13);r(light,25,17,7,4);r(info.coat,60,33,12,5);r(light,69,29,5,8);
    for(const [x,y,w] of [[0,37,10],[2,43,7],[0,50,9]])r('#cbd9d0',x,y,w,2);
  }else{
    r('#142126',25-step,45,9,16);r(info.coat,27-step,46,5,12);r(light,23-step,57,10,3);
    r('#142126',48+step,43,9,18);r(info.coat,50+step,45,5,13);r(light,47+step,57,10,3);
  }
  poly('#142126',[[45,28],[44,9],[56,15],[63,15],[73,7],[75,29],[72,43],[61,47],[49,43]]);
  poly(info.coat,[[48,28],[48,15],[56,20],[64,19],[70,14],[71,29],[69,39],[61,43],[52,40]]);
  poly('#d48e88',[[49,18],[49,26],[55,24]]);poly('#d48e88',[[68,18],[64,25],[70,24]]);
  if(type==='tuxedo')poly(light,[[60,26],[65,35],[70,38],[62,44],[52,39],[56,35]]);
  else{r(light,52,35,18,5);r(info.shade,56,21,3,7);r(info.shade,64,20,3,6);}
  r('#152126',51,28,7,5);r('#152126',64,27,7,5);r('#d1f2a1',53,29,3,2);r('#d1f2a1',65,28,3,2);
  r('#754848',60,34,4,3);r('#263237',61,38,2,3);
  for(const y of [35,39]){r('#e0ddc8',43,y,9,1);r('#e0ddc8',70,y-1,8,1);}
  if(type==='tabby')for(const x of [29,37,44]){r(info.shade,x,30,3,9);r(light,x+1,30,1,3);}
  if(type==='lilac'){r(light,29,35,3,3);r(light,38,39,3,3);r(light,43,32,3,3);}
  if(type==='golden'){
    poly('#a56a31',[[49,16],[46,4],[54,8],[60,1],[65,8],[74,3],[71,16]]);
    poly('#ffe879',[[51,14],[50,8],[56,11],[60,6],[65,11],[70,7],[69,14]]);r('#fff7bf',54,13,13,2);r('#bc6956',59,11,3,3);
  }
  return c;
}

export function createArt(){
  const art={textures:makeTextures(),enemies:{},items:{},props:{},cats:{}};
  for(const t of ['thug','thrower','brute','boss'])art.enemies[t]=[0,1,2,3,4].map(f=>enemySprite(t,f));
  for(const t of ['health','armor','bone','treatBone','bottle'])art.items[t]=pickupSprite(t);
  for(const t of ['lamp','bin','barrel','barrelOpen','crate','crateOpen'])art.props[t]=propSprite(t);
  art.binPeek=Array.from({length:9},(_,frame)=>propSprite('bin',frame/8));
  art.binThrow=propSprite('bin',1,null,true);
  art.binFlop=Array.from({length:9},(_,frame)=>propSprite('bin',1,frame/8));
  for(const type of Object.keys(CAT_TYPES)){
    const frames=[0,1,2].map(frame=>catSprite(type,frame));
    art.cats[type]=[...frames,...frames.map(original=>{const flipped=canvas(80,64),g=flipped.getContext('2d');g.translate(80,0);g.scale(-1,1);g.drawImage(original,0,0);return flipped;})];
  }
  const exit=canvas(64,112),g=exit.getContext('2d');rect(g,'#152b2d',7,23,50,84);rect(g,'#7eaf9d',10,27,44,4);rect(g,'#395c53',12,34,40,67);rect(g,'#112e2a',16,38,32,42);g.fillStyle='#cfffc5';g.font='bold 12px monospace';g.fillText('EXIT',17,59);polygon(g,'#cfffc5',[[25,65],[40,65],[40,61],[48,70],[40,79],[40,74],[25,74]]);rect(g,'#c9d5a5',27,87,10,4);art.exit=exit;
  return art;
}
export function drawDog(g,x,y,scale=1,bite=0,health=100,portrait=false){
  g.save();g.translate(x,y);g.scale(scale,scale);
  const poly=(c,p)=>polygon(g,c,p),r=(c,x,y,w,h)=>rect(g,c,x,y,w,h);
  if(portrait){
    poly('#241e1b',[[-22,-5],[-25,-39],[-9,-28],[10,-28],[25,-39],[24,-4],[19,22],[-18,22]]);
    poly('#aa7850',[[-19,-9],[-21,-31],[-8,-18],[9,-18],[22,-30],[19,2],[14,23],[-14,23]]);
    poly('#d3a570',[[-19,-5],[-7,-11],[1,0],[7,-11],[19,-5],[16,13],[5,23],[-9,20],[-17,9]]);
    poly('#302a25',[[-15,-10],[-4,-8],[0,2],[5,-8],[16,-10],[11,-18],[-12,-18]]);
    r('#171e21',-15,-2,9,5);r('#171e21',7,-2,9,5);r(health<30?'#dd663f':'#e3b958',-12,0,4,2);r('#e3b958',8,0,4,2);
    poly('#131e22',[[-7,9],[8,9],[10,14],[1,19],[-9,14]]);r('#9aaca2',-4,10,6,2);r('#34241f',-9,21,20,3);
  }else{
    // Two forepaws and a broad canine muzzle anchor the first-person view.
    poly('#4c3527',[[-137,80],[-115,39],[-97,31],[-77,53],[-65,93]]);poly('#a7774c',[[-129,82],[-111,43],[-98,39],[-88,52],[-82,93]]);
    poly('#4c3527',[[137,80],[115,39],[97,31],[77,53],[65,93]]);poly('#a7774c',[[129,82],[111,43],[98,39],[88,52],[82,93]]);
    for(const side of [-1,1])for(let i=0;i<3;i++)poly('#e3d7b1',[[side*(96+i*7),43+i*3],[side*(93+i*7),53+i*3],[side*(101+i*7),50+i*3]]);
    const gap=bite*28;
    poly('#392c24',[[-84,93],[-74,49],[-59,26-gap],[-35,14-gap],[35,14-gap],[59,26-gap],[74,49],[84,93]]);
    poly('#ae8153',[[-73,88],[-63,45],[-43,24-gap],[-14,29-gap],[0,36-gap],[15,29-gap],[43,24-gap],[64,45],[74,89]]);
    poly('#d4b37b',[[-61,55-gap],[-48,37-gap],[-17,34-gap],[0,40-gap],[17,34-gap],[48,37-gap],[61,55-gap],[39,69-gap],[-39,69-gap]]);
    if(bite>.1){poly('#221b1c',[[-59,58-gap],[59,58-gap],[49,85],[-49,85]]);poly('#9b5b52',[[-34,82],[-25,65],[25,65],[34,82]]);for(let i=-2;i<=2;i++)poly('#f0e4bf',[[i*19-7,56-gap],[i*19+7,56-gap],[i*19,72-gap]]);for(let i=-2;i<=2;i++)poly('#ddceab',[[i*18-6,83],[i*18+6,83],[i*18,71]]);}
    poly('#1a2426',[[-27,32-gap],[-21,25-gap],[21,25-gap],[29,32-gap],[23,46-gap],[0,54-gap],[-22,46-gap]]);r('#586560',-16,28-gap,24,3);r('#0e181c',-21,37-gap,10,4);r('#0e181c',12,37-gap,10,4);
    for(const side of [-1,1])for(let i=0;i<3;i++)r('#74543b',side*(33+i*6),46-gap+i%2*5,2,2);
  }
  g.restore();
}
