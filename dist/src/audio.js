export class AudioEngine {
  constructor(){this.context=null;this.muted=false;this.playing=false;this.step=0;this.timer=null;}
  async init(){
    try{
      if(!this.context){
        const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
        this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.muted?0:.38;this.master.connect(this.context.destination);
        const length=this.context.sampleRate;this.noise=this.context.createBuffer(1,length,this.context.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
        this.timer=setInterval(()=>this.musicTick(),145);
      }
      if(this.context.state==='suspended')await this.context.resume();
    }catch{/* Sound is optional; browser audio restrictions never block the game. */}
  }
  setMuted(value){this.muted=value;if(this.master)this.master.gain.setTargetAtTime(value?0:.38,this.context.currentTime,.025);}
  tone(frequency,duration,type='square',volume=.15,endFrequency=frequency,delay=0){
    if(!this.context||this.context.state!=='running')return;const t=this.context.currentTime+delay;
    const osc=this.context.createOscillator(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(10,endFrequency),t+duration);filter.type='lowpass';filter.frequency.value=2200;
    gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(filter);filter.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+duration+.03);
  }
  hiss(duration,volume=.2,frequency=600,delay=0){
    if(!this.context||this.context.state!=='running')return;const t=this.context.currentTime+delay,source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();source.buffer=this.noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.8;gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start(t);source.stop(t+duration);
  }
  play(name){
    switch(name){
      case 'bite':this.hiss(.11,.35,550);this.tone(130,.13,'sawtooth',.15,52);break;
      case 'hit':this.hiss(.12,.55,1200);this.tone(95,.13,'triangle',.4,35);break;
      case 'bark':for(const delay of [0,.15]){this.tone(155,.15,'sawtooth',.3,55,delay);this.hiss(.16,.4,450,delay);}break;
      case 'hurt':this.tone(210,.2,'sawtooth',.2,65);this.hiss(.15,.25,300);break;
      case 'paperRustle':this.hiss(.1,.09,2200);this.hiss(.09,.07,3300,.07);break;
      case 'paperSwing':this.hiss(.12,.2,1700);break;
      case 'paperHit':this.hiss(.045,.7,1100);this.tone(135,.065,'triangle',.35,55);this.hiss(.1,.3,2900,.025);this.hiss(.12,.15,4200,.07);break;
      case 'drumRattle':for(const delay of [0,.09,.2,.32]){this.tone(180,.08,'triangle',.18,70,delay);this.hiss(.06,.12,2000,delay);}break;
      case 'crateRattle':for(const delay of [0,.12,.25]){this.tone(95,.08,'triangle',.19,50,delay);this.hiss(.07,.1,550,delay);}break;
      case 'crateBreak':this.hiss(.12,.3,1600);this.tone(100,.12,'triangle',.2,35);this.hiss(.14,.16,800,.09);break;
      case 'grouchPeek':this.tone(170,.15,'sawtooth',.1,85,.12);this.tone(135,.25,'sawtooth',.1,65,.3);this.hiss(.12,.12,1200);break;
      case 'grouchThrow':this.hiss(.16,.2,1000);this.tone(170,.14,'triangle',.18,360);break;
      case 'grouchCollapse':this.tone(330,.22,'sawtooth',.1,140);this.tone(140,.36,'triangle',.18,35,.2);this.hiss(.13,.2,250,.4);break;
      case 'catLaunch':this.tone(100,.32,'triangle',.3,700);this.hiss(.16,.3,700);this.tone(590,.12,'sawtooth',.09,820,.12);this.tone(820,.25,'sawtooth',.09,330,.24);break;
      case 'catMeow':this.tone(580,.11,'sawtooth',.085,870);this.tone(870,.28,'sawtooth',.09,340,.1);this.tone(1150,.33,'sine',.055,680,.04);break;
      case 'catCapture':[660,880,1100].forEach((note,i)=>this.tone(note,.16,'triangle',.15,note,i*.085));break;
      case 'arrest':this.tone(390,.08,'square',.13,390);this.tone(585,.12,'square',.12,585,.09);this.tone(780,.2,'triangle',.16,780,.17);break;
      case 'pickup':this.tone(523,.09,'triangle',.22);this.tone(784,.18,'triangle',.2,784,.09);break;
      case 'clear':case 'cleared':case 'won':[220,277,330,440].forEach((n,i)=>this.tone(n,.4,'sawtooth',.1,n,i*.12));break;
      case 'dead':this.tone(140,.8,'sawtooth',.25,24);break;
      case 'dispatch':this.hiss(.09,.1,1600);this.tone(850,.05,'sine',.06);break;
      case 'throw':this.hiss(.16,.09,900);break;
      case 'step':this.hiss(.045,.09,150);break;
      case 'click':this.tone(180,.045,'square',.1,250);break;
    }
  }
  musicTick(){
    if(!this.context||!this.playing||this.muted||this.context.state!=='running')return;
    const n=this.step++%32,notes=[55,55,55,65.41,55,55,49,73.42,55,55,55,82.41,65.41,65.41,49,51.91];
    if(n%2===0){const root=notes[n/2];this.tone(root,.18,'sawtooth',.07,root);this.tone(root*2,.13,'triangle',.025,root*2);}
    if(n%8===0||n%8===5)this.tone(110,.12,'sine',.24,35);
    if(n%8===4){this.hiss(.12,.10,1400);this.tone(150,.06,'triangle',.04,70);}
    if(n%2===0)this.hiss(.025,.025,6500);
  }
}
