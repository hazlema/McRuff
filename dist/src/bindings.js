export const ACTIONS = Object.freeze([
  { id:'forward', label:'Move forward', key:'KeyW' },
  { id:'backward', label:'Move backward', key:'KeyS' },
  { id:'lookLeft', label:'Look left', key:'KeyA' },
  { id:'lookRight', label:'Look right', key:'KeyD' },
  { id:'strafeLeft', label:'Strafe left', key:'KeyQ' },
  { id:'strafeRight', label:'Strafe right', key:'KeyE' },
  { id:'bite', label:'Bite / lunge', key:'Space' },
  { id:'bark', label:'Stun bark', key:'KeyR' },
  { id:'sprint', label:'Sprint', key:'ShiftLeft' },
  { id:'map', label:'Scent map', key:'KeyM' },
  { id:'pause', label:'Pause', key:'KeyP' },
  { id:'fullscreen', label:'Fullscreen', key:'KeyF' },
]);
export const DEFAULT_BINDINGS = Object.freeze(Object.fromEntries(ACTIONS.map(a=>[a.id,a.key])));
const aliases={ArrowUp:'forward',ArrowDown:'backward',ArrowLeft:'lookLeft',ArrowRight:'lookRight'};
const labels={Space:'SPACE',ShiftLeft:'SHIFT',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Enter:'ENTER',Backspace:'BACKSPACE',Delete:'DELETE',Home:'HOME',End:'END',PageUp:'PAGE UP',PageDown:'PAGE DOWN',Insert:'INSERT',Minus:'−',Equal:'=',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',Backquote:'`',NumpadAdd:'NUM +',NumpadSubtract:'NUM −',NumpadMultiply:'NUM ×',NumpadDivide:'NUM /',NumpadDecimal:'NUM .',NumpadEnter:'NUM ENTER'};
const canonicalKey=code=>code==='ShiftRight'?'ShiftLeft':code;
const isBindable=code=>typeof code==='string'&&(/^(Key[A-Z]|Digit[0-9]|Numpad[0-9])$/.test(code)||Object.hasOwn(labels,code));

export function keyLabel(code){
  code=canonicalKey(code);
  if(Object.hasOwn(labels,code))return labels[code];
  if(/^Key[A-Z]$/.test(code))return code.slice(3);
  if(/^Digit[0-9]$/.test(code))return code.slice(5);
  if(/^Numpad[0-9]$/.test(code))return `NUM ${code.slice(6)}`;
  return '?';
}

export function rebind(current,action,code){
  const bindings={...current};code=canonicalKey(code);
  if(!Object.hasOwn(DEFAULT_BINDINGS,action)||!isBindable(code))return {bindings,error:'Choose a letter, number, arrow, Shift, or another ordinary key. Esc and Tab stay available for menus.'};
  const swapped=ACTIONS.find(a=>a.id!==action&&bindings[a.id]===code)?.id||null;
  if(swapped)bindings[swapped]=bindings[action];
  bindings[action]=code;
  return {bindings,swapped,error:null};
}

export function normalizeBindings(saved){
  let bindings={...DEFAULT_BINDINGS};
  if(!saved||typeof saved!=='object'||Array.isArray(saved))return bindings;
  for(const {id} of ACTIONS)if(Object.hasOwn(saved,id))bindings=rebind(bindings,id,saved[id]).bindings;
  return bindings;
}

export function actionForKey(bindings,code){
  if(code==='Escape')return 'pause';
  code=canonicalKey(code);
  return ACTIONS.find(a=>bindings[a.id]===code)?.id||aliases[code]||null;
}

export function keyboardInput(bindings,keys){
  const active=new Set([...keys].map(code=>actionForKey(bindings,code)));
  return {
    forward:Number(active.has('forward'))-Number(active.has('backward')),
    strafe:Number(active.has('strafeRight'))-Number(active.has('strafeLeft')),
    turn:Number(active.has('lookRight'))-Number(active.has('lookLeft')),
    sprint:active.has('sprint'),
    bite:active.has('bite'),
  };
}
