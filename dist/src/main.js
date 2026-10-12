import { Game } from './game.js';
import { CAT_TYPES, isCatContainer } from './cats.js';
import { Renderer } from './renderer.js';
import { AudioEngine } from './audio.js';
import { drawDog } from './art.js';
import { ACTIONS, DEFAULT_BINDINGS, normalizeBindings, rebind, actionForKey, keyboardInput, keyLabel } from './bindings.js';
const $=id=>document.getElementById(id);
const surface=$('world'),renderer=new Renderer(surface),audio=new AudioEngine();
const defaults={difficulty:'normal',sensitivity:1,muted:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
let stored={};try{stored=JSON.parse(localStorage.getItem('mcruff-options')||'{}')||{};}catch{}
const options={...defaults,...stored};if(!['easy','normal','hard'].includes(options.difficulty))options.difficulty='normal';options.sensitivity=Math.min(2.5,Math.max(.4,Number(options.sensitivity)||1));
options.bindings=normalizeBindings(stored.bindings);
let game=null,mode='title',overlayBack='title',keys=new Set(),mouseDown=false,middleDown=false,lastTouchAt=-1e9,lastTime=0,toastUntil=0,dispatchUntil=0,lastFootstep=0,locked=false,best=0;
let captureAction=null,bindingReturn='settings',tally=null;
let touchMove={x:0,y:0},lookTouch=null,joystickTouch=null,joystickOrigin=null;
try{best=Number(localStorage.getItem('mcruff-best'))||0;}catch{}
function saveOptions(){try{localStorage.setItem('mcruff-options',JSON.stringify(options));}catch{}applyOptions();}
const bindingLabel=action=>keyLabel(options.bindings[action]);
function applyOptions(){audio.setMuted(options.muted);renderer.reducedMotion=options.reducedMotion;document.querySelectorAll('.audio-toggle').forEach(b=>{b.querySelector('span').textContent=options.muted?'OFF':'ON';b.setAttribute('aria-label',options.muted?'Unmute audio':'Mute audio');});updateBindingHints();}
function updateBindingHints(){
  $('move-keys').textContent=`${bindingLabel('forward')} ${bindingLabel('backward')}`;
  $('strafe-keys').textContent=`${bindingLabel('strafeLeft')} ${bindingLabel('strafeRight')}`;
  $('look-keys').textContent=`MOUSE / ${bindingLabel('lookLeft')} ${bindingLabel('lookRight')}`;
  $('bite-key').textContent=`CLICK / ${bindingLabel('bite')}`;
  $('sprint-key').textContent=bindingLabel('sprint');$('map-key').textContent=bindingLabel('map');
  $('pause-key').textContent=`ESC / ${bindingLabel('pause')}`;$('bark-key').textContent=bindingLabel('bark');
  $('map-close-key').textContent=`${bindingLabel('map')} TO CLOSE`;$('map-button').title=`Scent map (${bindingLabel('map')})`;
  surface.setAttribute('aria-label',`First-person view of New Bark City. ${bindingLabel('forward')}/${bindingLabel('backward')} move, ${bindingLabel('strafeLeft')}/${bindingLabel('strafeRight')} strafe, ${bindingLabel('lookLeft')}/${bindingLabel('lookRight')} turn, ${bindingLabel('bite')} bites, ${bindingLabel('bark')} barks. Escape pauses.`);
}
function clearInput(){keys.clear();mouseDown=false;middleDown=false;touchMove={x:0,y:0};joystickTouch=null;lookTouch=null;$('joystick-knob').style.transform='';}
function unlock(){if(document.pointerLockElement)document.exitPointerLock();}
function lock(){
  if(matchMedia('(pointer:coarse)').matches)return;
  const hint=()=>toast(`${bindingLabel('lookLeft')} / ${bindingLabel('lookRight')} TO LOOK · ${bindingLabel('bite')} TO BITE`,4);
  try{const request=surface.requestPointerLock?.();request?.catch?.(hint);}catch{hint();}
}
function syncBest(){if(best>0)$('best-score').textContent=`BEST: ${String(best).padStart(6,'0')}`;}
function start(){
  clearInput();tally=null;game=new Game(options.difficulty);mode='playing';lastFootstep=0;$('title-screen').classList.add('hidden');$('game-screen').classList.remove('hidden');$('overlay').classList.add('hidden');$('intermission').classList.add('hidden');$('map-panel').classList.add('hidden');$('combo').textContent='';audio.init();audio.playing=true;surface.focus({preventScroll:true});lock();refreshLevel();toast('YOU ARE BUSTER. BITE THE CRIME.',3.5);
}
function refreshLevel(){
  $('district-number').textContent=`DISTRICT ${game.level.district}`;$('district-name').textContent=game.level.name;$('suspect-count').textContent=game.enemies.length;
}
function toast(text,seconds=2){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=performance.now()+seconds*1000;}
function showOverlay(kicker,title,copy,content,actions){
  clearInput();captureAction=null;unlock();audio.playing=false;
  document.querySelector('.overlay-panel').classList.toggle('bindings-panel',mode==='bindings');
  document.querySelector('.overlay-panel').classList.toggle('collection-panel',mode==='collection');
  document.querySelector('.overlay-panel').classList.toggle('menu-panel',mode==='paused');
  $('overlay-kicker').textContent=kicker;$('overlay-title').textContent=title.replace(/\.$/,'');document.querySelector('.overlay-body').scrollTop=0;$('overlay-copy').textContent=copy;$('overlay-content').innerHTML=content;$('overlay-actions').replaceChildren();
  actions.forEach(({label,action,primary})=>{const b=document.createElement('button');b.textContent=label;b.className=`action-button${primary?' primary':''}`;b.addEventListener('click',()=>{audio.play('click');action();});$('overlay-actions').append(b);});
  $('overlay').classList.remove('hidden');$('overlay-actions').querySelector('button')?.focus({preventScroll:true});
}
function pause(){if(mode!=='playing')return;mode='paused';pauseMenu();}
function pauseMenu(){mode='paused';showOverlay('OFFICER ON A BREAK','Taking a breather.','Even good boys need a minute. Your case is right where you left it.','',[
  {label:'Back to the beat',action:resume,primary:true},{label:'Cat collection',action:()=>catCollection()},{label:'Key bindings',action:()=>keyBindings('paused','pause')},{label:'Options',action:()=>settings('paused')},{label:'Main menu',action:menu}
]);}
function resume(){if(!game||game.status!=='playing')return;mode='playing';$('overlay').classList.add('hidden');clearInput();audio.init();audio.playing=true;surface.focus({preventScroll:true});lock();}
function menu(){mode='title';tally=null;clearInput();unlock();audio.playing=false;$('overlay').classList.add('hidden');$('intermission').classList.add('hidden');$('game-screen').classList.add('hidden');$('title-screen').classList.remove('hidden');syncBest();$('start-button').focus({preventScroll:true});}
function closeInfo(){if(overlayBack==='paused')pauseMenu();else{mode='title';$('overlay').classList.add('hidden');$('start-button').focus({preventScroll:true});}}
function controls(){overlayBack='title';mode='controls';showOverlay('FIELD MANUAL','Good cop. Bad bite.','Clear every suspect, then find the green extraction beacon. Your map shows the way.',
  `<div class="control-list">${ACTIONS.map(a=>`<div>${a.label}<kbd>${bindingLabel(a.id)}</kbd></div>`).join('')}</div><p class="tip">Mouse look, left-click bite, right-click bark, and hold middle-click to move forward also work. Escape always pauses. Change your keys in Options → Key bindings.<br><br>Get close to bite. A raised newspaper means a swat is coming: backstep or press ${bindingLabel('bark')} to interrupt it. Bites only interrupt a raised paper on Easy. Bark also knocks bottles out of the air. Steak restores 35 health. On Normal and Hard, arrests give no healing and health carries between districts with a small patch-up. Find two golden bones in each district for bonus points.<br><br>CAT PATROL: Bark near a sealed oil drum or wooden crate to hear it rattle. Bite it to launch 1–4 cats! Chase them and use your bite for a gentle grab at close range. Barking makes cats meow and bolt; it never stuns them. Rarer coats earn bigger bonuses. Check Cat collection while paused. This side game is optional. Bark at a garbage can for a grumpy surprise.<br><br>On touchscreens: left stick to move, drag the right half to look, tap BITE or BARK.</p>`,
  [{label:'Got it',action:closeInfo,primary:true}]);}
function catCollection(){
  overlayBack='paused';mode='collection';
  const roaming=game.cats.filter(cat=>!cat.captured).length,unopened=game.props.filter(prop=>isCatContainer(prop)&&!prop.opened).length;
  showOverlay('K-9 DIVISION / FELINE AFFAIRS','Cat patrol.',`${game.catsCaptured} ${game.catsCaptured===1?'cat':'cats'} safely captured · ${game.catPoints.toLocaleString()} bonus points this case.`,
    `<div class="cat-collection">${Object.entries(CAT_TYPES).map(([type,info])=>`<div class="cat-card" style="--cat-color:${info.color}"><canvas data-cat="${type}" width="80" height="64" aria-label="${info.name}"></canvas><div><span class="cat-rarity">${info.rarity}</span><h3>${info.name}</h3><p>${info.value.toLocaleString()} POINTS EACH</p></div><b>×${game.catCollection[type]}</b></div>`).join('')}</div><p class="tip">THIS DISTRICT: ${roaming} cats on the loose · ${unopened} unopened drums / crates.<br>Bark at drums or crates. Bite to open. Chase a cat, then press ${bindingLabel('bite')} for a gentle grab. Barking makes cats meow and run away—never stunned!<br><br>Your collection carries across all three districts in this case. Extraction is always available once the criminals are collared.</p>`,
    [{label:'Back',action:pauseMenu},{label:'Back to the beat',action:resume,primary:true}]);
  document.querySelectorAll('[data-cat]').forEach(canvas=>canvas.getContext('2d').drawImage(renderer.art.cats[canvas.dataset.cat][0],0,0));
}
function settings(back='title'){
  overlayBack=back;mode='settings';showOverlay('PRECINCT PREFERENCES','Your kind of ruff.','Easy forgives. Normal fights back. Hard means it. Difficulty applies to your next case.',
    `<label class="option-row"><span>Difficulty</span><select id="difficulty"><option value="easy">Good boy · Easy</option><option value="normal">Street dog · Normal</option><option value="hard">Unleashed · Hard</option></select></label><label class="option-row"><span>Look sensitivity</span><input id="sensitivity" aria-label="Look sensitivity" type="range" min="0.4" max="2.5" step="0.1"></label><label class="option-row"><span>Sound & music</span><input id="sound-enabled" type="checkbox"></label><label class="option-row"><span>Reduce screen motion</span><input id="reduce-motion" type="checkbox"></label>`,
    [{label:'Key bindings',action:()=>keyBindings(back)},{label:'Done',action:closeInfo,primary:true}]);
  $('difficulty').value=options.difficulty;$('sensitivity').value=options.sensitivity;$('sound-enabled').checked=!options.muted;$('reduce-motion').checked=options.reducedMotion;
  $('difficulty').onchange=e=>{options.difficulty=e.target.value;saveOptions();};$('sensitivity').oninput=e=>{options.sensitivity=Number(e.target.value);saveOptions();};$('sound-enabled').onchange=e=>{options.muted=!e.target.checked;saveOptions();audio.init();};$('reduce-motion').onchange=e=>{options.reducedMotion=e.target.checked;saveOptions();};
}
function keyBindings(back='title',returnTo='settings'){
  overlayBack=back;bindingReturn=returnTo;mode='bindings';
  showOverlay('YOUR KEYS. YOUR BEAT.','Key bindings.','Choose an action, then press its new key. Changes save automatically.',
    `<p class="binding-message" id="binding-message" role="status" aria-live="polite">Tab to an action and press Enter to change it. Esc cancels.</p><div class="binding-grid">${ACTIONS.map(a=>`<button type="button" class="binding-row" data-action="${a.id}"><span>${a.label}</span><kbd></kbd></button>`).join('')}</div><p class="tip">Shared keys swap actions. Escape always pauses. Mouse controls still work.</p>`,
    [{label:'Restore defaults',action:()=>{captureAction=null;clearInput();options.bindings={...DEFAULT_BINDINGS};saveOptions();refreshBindingButtons();$('binding-message').textContent='Defaults restored: A/D turn, Q/E strafe, W/S move.';}},{label:'Done',action:closeBindings,primary:true}]);
  document.querySelectorAll('.binding-row').forEach(button=>button.onclick=()=>{
    clearInput();captureAction=button.dataset.action;refreshBindingButtons();
    const action=ACTIONS.find(a=>a.id===captureAction);$('binding-message').textContent=`Press a key for ${action.label.toLowerCase()}. Esc cancels.`;
  });
  refreshBindingButtons();document.querySelector('.binding-row').focus({preventScroll:true});
}
function refreshBindingButtons(){
  document.querySelectorAll('.binding-row').forEach(button=>{
    const id=button.dataset.action,label=ACTIONS.find(a=>a.id===id).label,listening=id===captureAction;
    button.classList.toggle('listening',listening);button.querySelector('kbd').textContent=listening?'…':bindingLabel(id);
    button.setAttribute('aria-label',`${label}: ${listening?'press a key':bindingLabel(id)+'. Change key'}`);
  });
}
function closeBindings(){captureAction=null;if(bindingReturn==='pause')pauseMenu();else settings(overlayBack);}
function captureBinding(event){
  const action=captureAction;
  if(event.code==='Tab'||event.code==='Escape'){
    captureAction=null;refreshBindingButtons();$('binding-message').textContent='Key change canceled.';
    if(event.code==='Tab')return false;
    event.preventDefault();return true;
  }
  event.preventDefault();event.stopPropagation();if(event.repeat)return true;
  if(event.ctrlKey||event.metaKey||event.altKey){$('binding-message').textContent='Press one key without Ctrl, Alt, or Command.';return true;}
  const result=rebind(options.bindings,action,event.code);
  if(result.error){$('binding-message').textContent=result.error;return true;}
  options.bindings=result.bindings;captureAction=null;clearInput();saveOptions();refreshBindingButtons();
  const name=ACTIONS.find(a=>a.id===action).label;
  $('binding-message').textContent=`${name} is now ${bindingLabel(action)}.${result.swapped?` ${ACTIONS.find(a=>a.id===result.swapped).label} moved to ${bindingLabel(result.swapped)}.`:''} Saved.`;
  return true;
}
function finish(){
  if(mode!=='playing')return;mode='result';
  if(game.score>best){best=game.score;try{localStorage.setItem('mcruff-best',String(best));}catch{}}
  intermission(game.status);
}
// End screens: stats count up one at a time, Doom style. Input is ignored briefly and continuing
// needs a fresh press after the tally, so a held or mashed bite key can't skip past the results.
const ENDINGS={
  cleared:{art:'complete',next:'Next district',caption:()=>game.level.name},
  won:{art:'complete',next:'Walk the beat again',caption:()=>'Big Lou collared · City saved'},
  dead:{art:'down',next:'Try again',caption:()=>`Down in ${game.level.name.replace(/^The /,'the ')}`},
};
function intermission(kind){
  mode='intermission';clearInput();captureAction=null;unlock();audio.playing=false;
  const r=game.districtReport(),ending=ENDINGS[kind],fmt=n=>n.toLocaleString(),district=kind==='cleared';
  $('intermission').dataset.art=ending.art;$('intermission-title').textContent=kind==='dead'?'Officer down':kind==='won'?'Case closed':'District complete';
  $('intermission-district').textContent=ending.caption();$('intermission-next-label').textContent=ending.next;
  $('case-total').textContent=String(r.caseScore).padStart(6,'0');$('intermission-key').textContent=bindingLabel('bite');
  // A district shows what was earned there; a finished case (won or lost) shows the whole run.
  const stats=district?[['Time',0,Math.floor(r.time),formatTime],['Score',0,r.score,fmt],['Arrests',r.arrestsBefore,r.arrests,n=>`${n} / ${r.suspects}`],['Bonus',0,r.bonus,n=>`+${fmt(n)}`]]
    :[['Time',0,Math.floor(game.elapsed),formatTime],['Score',0,r.caseScore,fmt],['Arrests',0,r.arrests,n=>`${n} / ${r.suspects}`],['Bones',0,game.bones,n=>`${n} / 6`]];
  const now=performance.now(),rows=[...document.querySelectorAll('.tally-row')];
  tally={kind,rows:stats.map(([label,from,to,format],i)=>({el:rows[i],label,from,to,format})),index:0,rowStart:now+600,lastTick:0,shownAt:now,readyAt:Infinity,ready:false};
  for(const row of tally.rows){row.el.classList.remove('shown');row.el.querySelector('dt').textContent=row.label;row.el.querySelector('dd').textContent=row.format(row.from);}
  for(const id of ['intermission-next','intermission-menu'])$(id).disabled=true;
  $('intermission').classList.remove('ready','hidden');$('intermission').focus({preventScroll:true});
}
function updateTally(now){
  if(!tally)return;
  if(tally.index<tally.rows.length&&now>=tally.rowStart){
    const row=tally.rows[tally.index],duration=row.to===row.from?200:700,p=Math.min(1,(now-tally.rowStart)/duration);
    row.el.classList.add('shown');row.el.querySelector('dd').textContent=row.format(Math.round(row.from+(row.to-row.from)*p));
    if(p<1&&now-tally.lastTick>70){audio.play('tally');tally.lastTick=now;}
    if(p===1){audio.play('tallyHit');tally.index++;tally.rowStart=now+300;if(tally.index===tally.rows.length)tally.readyAt=Math.max(now+700,tally.shownAt+2500);}
  }
  if(!tally.ready&&now>=tally.readyAt){
    tally.ready=true;audio.play('tallyReady');$('intermission').classList.add('ready');
    for(const id of ['intermission-next','intermission-menu'])$(id).disabled=false;
  }
}
function skipTally(now){
  if(!tally||tally.index===tally.rows.length||now-tally.shownAt<900)return;
  for(const row of tally.rows){row.el.classList.add('shown');row.el.querySelector('dd').textContent=row.format(row.to);}
  tally.index=tally.rows.length;tally.readyAt=Math.max(now+700,tally.shownAt+2500);audio.play('tallyHit');
}
function proceed(){
  if(!tally?.ready)return;const kind=tally.kind;tally=null;audio.play('click');
  if(kind==='won'){start();return;}
  if(kind==='dead')game.retryLevel();else game.nextLevel();
  refreshLevel();mode='playing';clearInput();$('intermission').classList.add('hidden');audio.init();audio.playing=true;lastFootstep=0;surface.focus({preventScroll:true});lock();
}
function formatTime(seconds){return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function updateHud(){
  const p=game.player;$('health').textContent=Math.ceil(p.health);$('health-meter').style.width=`${p.health}%`;$('health').style.color=p.health<30?'#e67c56':'';$('armor').textContent=Math.ceil(p.armor);$('score').textContent=String(game.score).padStart(6,'0');$('arrest-count').textContent=game.arrests;$('stamina-meter').style.width=`${p.stamina}%`;$('bark-meter').style.width=`${(1-game.barkCooldown/6)*100}%`;$('bark-status').textContent=game.barkCooldown>0?`${game.barkCooldown.toFixed(1)}s`:'READY';
  $('objective-label').textContent=game.enemies.every(e=>e.hp<=0)?`FIND THE GREEN EXIT · ${bindingLabel('map')} FOR MAP`:'CLEAN UP THE STREETS';
  $('cat-count').textContent=game.catsCaptured;
  $('cat-roaming').textContent=`${game.cats.filter(cat=>!cat.captured).length} ON THE LOOSE`;
  $('drum-count').textContent=`${game.props.filter(prop=>isCatContainer(prop)&&!prop.opened).length} HIDING SPOTS · CAT COLLECTION ↗`;
  const portrait=$('portrait').getContext('2d');portrait.clearRect(0,0,90,90);portrait.imageSmoothingEnabled=false;drawDog(portrait,45,46,1.28,game.biteAnimation,p.health,true);
  if(!$('map-panel').classList.contains('hidden'))renderer.map(game,$('map'));
}
function events(now){
  for(const e of game.events.splice(0)){
    if(e.type!=='hurt'||e.source!=='newspaper')audio.play(e.type);
    if(e.type==='dispatch'){$('dispatch-text').textContent=e.text;$('dispatch').classList.add('visible');dispatchUntil=now+8500;}
    if(e.type==='arrest'){toast(e.boss?'BIG LOU: COLLARED.':['SIT. STAY. ARRESTED.','SUSPECT COLLARED.','TAKE A BITE OUT OF CRIME.','GOOD DOG. BAD DAY.'][game.totalArrests%4]);if(e.combo>1)$('combo').textContent=`${e.combo}× BITE STREAK`;}
    if(e.type==='crateRattle')toast('THIS CRATE IS FULL OF CATTITUDE. BITE TO OPEN!',3);
    if(e.type==='drumRattle')toast('THAT DRUM HAS A PURR-BLEM. BITE TO OPEN!',3);
    if(e.type==='catLaunch')toast(`${e.count} CATS LAUNCHED! CHASE & BITE TO CATCH`,3.5);
    if(e.type==='catCapture'){const info=CAT_TYPES[e.kind];toast(`${info.rarity} · ${info.name.toUpperCase()} CAUGHT! +${e.value}`,3);}
    if(e.type==='pickup')toast(e.kind==='bone'?'GOLDEN BONE · +500':e.kind==='treatBone'?'CHEW BONE · +100':e.kind==='health'?'STEAK-OUT · HEALTH RESTORED':'GOOD BOY VEST · +50 ARMOR');
    if(e.type==='clear'){toast('DISTRICT CLEAR · FIND THE EXIT',5);$('dispatch-text').textContent=`Nice work, Buster. Follow the green beacon. Press ${bindingLabel('map')} to check your scent map.`;$('dispatch').classList.add('visible');dispatchUntil=now+8500;$('map-panel').classList.remove('hidden');}
    if(e.type==='locked')toast('CLEAR ALL SUSPECTS BEFORE EXTRACTION',3);
  }
}
function frame(now){
  const dt=Math.min(.05,(now-lastTime)/1000||.016);lastTime=now;
  if(game){
    if(mode==='playing'){
      const input=keyboardInput(options.bindings,keys);
      input.forward=Math.max(-1,Math.min(1,input.forward+(middleDown?1:0)))-touchMove.y;input.strafe+=touchMove.x;input.bite||=mouseDown;
      game.update(dt,input);events(now);
      if(game.distanceWalked-lastFootstep>.9){audio.play('step');lastFootstep=game.distanceWalked;}
      if(game.comboTimer<=0)$('combo').textContent='';
      if(game.status!=='playing')finish();
    }
    if(mode==='intermission')updateTally(now);
    else if(mode!=='title'){renderer.render(game,now/1000);updateHud();}
  }
  if(now>toastUntil)$('toast').classList.remove('visible');if(now>dispatchUntil)$('dispatch').classList.remove('visible');
  requestAnimationFrame(frame);
}
function toggleMap(){$('map-panel').classList.toggle('hidden');}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{if(mode==='playing')toast('FULLSCREEN UNAVAILABLE IN THIS VIEW',3);}}
$('start-button').onclick=start;$('controls-button').onclick=controls;$('settings-button').onclick=()=>settings('title');$('pause-button').onclick=pause;$('fullscreen-title').onclick=fullscreen;
$('map-button')?.addEventListener('click',toggleMap);
$('intermission-next').onclick=proceed;$('intermission-menu').onclick=()=>{if(tally?.ready){audio.play('click');menu();}};
$('intermission').addEventListener('pointerdown',e=>{if(!e.target.closest('button'))skipTally(performance.now());});
$('cat-tracker').onclick=()=>{if(mode==='playing')catCollection();};
document.querySelector('.precinct-mark').onclick=e=>e.preventDefault();
document.querySelectorAll('.audio-toggle').forEach(b=>b.onclick=()=>{options.muted=!options.muted;saveOptions();audio.init();});
document.addEventListener('keydown',e=>{
  if(captureAction&&captureBinding(e))return;
  if(mode==='intermission'){
    // Keys never reach the buttons directly: a bite released over a focused button must not click it.
    const confirm=e.code==='Space'||e.code==='Enter'||e.code===options.bindings.bite;
    if(e.code==='Tab'){e.preventDefault();if(tally?.ready)(document.activeElement===$('intermission-next')?$('intermission-menu'):$('intermission-next')).focus();return;}
    if(!confirm||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(e.repeat||!tally)return;
    if(!tally.ready)skipTally(performance.now());else if(document.activeElement===$('intermission-menu'))$('intermission-menu').click();else proceed();
    return;
  }
  if(e.code==='Tab'&&!$('overlay').classList.contains('hidden')){const elements=[...$('overlay').querySelectorAll('button,input,select')];const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
  if(e.code==='Escape'){
    e.preventDefault();if(e.repeat)return;
    if(mode==='playing')pause();else if(mode==='paused')resume();else if(mode==='bindings')closeBindings();else if(mode==='settings'||mode==='controls'||mode==='collection')closeInfo();return;
  }
  if(mode==='title'&&e.code==='Enter'&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();start();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const action=actionForKey(options.bindings,e.code);
  // The pause menu is a vertical list: arrows (or move keys) step through it, Doom style.
  const step=e.code==='ArrowUp'||action==='forward'?-1:e.code==='ArrowDown'||action==='backward'?1:0;
  if(mode==='paused'&&step){
    e.preventDefault();const items=[...$('overlay-actions').querySelectorAll('button')],at=items.indexOf(document.activeElement);
    items[(at+step+items.length)%items.length].focus();audio.play('tally');return;
  }
  if(mode==='paused'&&action==='pause'){e.preventDefault();if(!e.repeat)resume();return;}
  if(mode!=='playing')return;
  if(!action)return;e.preventDefault();keys.add(e.code);if(e.repeat)return;
  if(action==='bite')game.bite();if(action==='bark')game.bark();if(action==='map')toggleMap();if(action==='fullscreen')fullscreen();if(action==='pause')pause();
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(mode==='intermission'&&(e.code==='Space'||e.code==='Enter'))e.preventDefault();});
// Mouse buttons use mouse events: pointer events report a second held button only as a move,
// so holding middle (walk forward) and then clicking left (bite) would never register.
surface.addEventListener('mousedown',e=>{
  if(mode!=='playing'||performance.now()-lastTouchAt<1000)return;
  if(e.button===0){mouseDown=true;game.bite();audio.init();if(document.pointerLockElement!==surface)lock();}
  else if(e.button===1){e.preventDefault();middleDown=true;}else if(e.button===2){e.preventDefault();game.bark();}
});
document.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;else if(e.button===1)middleDown=false;});
surface.addEventListener('auxclick',e=>e.preventDefault());
surface.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousemove',e=>{if(mode==='playing'&&document.pointerLockElement===surface)game.player.angle+=e.movementX*.0028*options.sensitivity;});
document.addEventListener('pointerlockchange',()=>{const wasLocked=locked;locked=document.pointerLockElement===surface;if(wasLocked&&!locked&&mode==='playing')pause();});
window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
// Touch: independent pointer IDs support moving, looking and biting together.
const joystick=$('joystick');joystick.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();joystickTouch=e.pointerId;joystickOrigin={x:e.clientX,y:e.clientY};joystick.setPointerCapture(e.pointerId);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId!==joystickTouch)return;const dx=e.clientX-joystickOrigin.x,dy=e.clientY-joystickOrigin.y,d=Math.max(35,Math.hypot(dx,dy));touchMove={x:dx/d,y:dy/d};$('joystick-knob').style.transform=`translate(${touchMove.x*30}px,${touchMove.y*30}px)`;});
function releaseJoystick(){joystickTouch=null;touchMove={x:0,y:0};$('joystick-knob').style.transform='';}
joystick.addEventListener('pointerup',releaseJoystick);joystick.addEventListener('pointercancel',releaseJoystick);
surface.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')lastTouchAt=performance.now();if(e.pointerType==='touch'&&mode==='playing'){lookTouch={id:e.pointerId,x:e.clientX};surface.setPointerCapture(e.pointerId);}});
surface.addEventListener('pointermove',e=>{if(lookTouch?.id===e.pointerId&&mode==='playing'){game.player.angle+=(e.clientX-lookTouch.x)*.006*options.sensitivity;lookTouch.x=e.clientX;}});
surface.addEventListener('pointerup',e=>{if(lookTouch?.id===e.pointerId)lookTouch=null;});surface.addEventListener('pointercancel',()=>lookTouch=null);
$('touch-bite').addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='playing'){mouseDown=true;game.bite();$('touch-bite').setPointerCapture(e.pointerId);}});for(const name of ['pointerup','pointercancel'])$('touch-bite').addEventListener(name,()=>mouseDown=false);
$('touch-bark').addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='playing')game.bark();});
applyOptions();syncBest();requestAnimationFrame(frame);
