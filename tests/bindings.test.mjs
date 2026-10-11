import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BINDINGS, normalizeBindings, rebind, actionForKey, keyboardInput, keyLabel } from '../dist/src/bindings.js';

const input = (bindings, ...keys) => keyboardInput(bindings,new Set(keys));

test('the default one-hand layout turns with A/D and strafes with Q/E', () => {
  for(const [key,turn,strafe] of [['KeyA',-1,0],['KeyD',1,0],['KeyQ',0,-1],['KeyE',0,1]]){
    assert.deepEqual(input(DEFAULT_BINDINGS,key),{forward:0,strafe,turn,sprint:false,bite:false});
  }
  assert.equal(input(DEFAULT_BINDINGS,'KeyW').forward,1);
  assert.equal(input(DEFAULT_BINDINGS,'KeyS').forward,-1);
  assert.equal(input(DEFAULT_BINDINGS,'Space').bite,true);
  assert.equal(actionForKey(DEFAULT_BINDINGS,'KeyR'),'bark');
});

test('rebinding an occupied key swaps actions instead of firing both', () => {
  const result=rebind(DEFAULT_BINDINGS,'lookLeft','KeyQ');
  assert.equal(result.swapped,'strafeLeft');
  assert.equal(input(result.bindings,'KeyQ').turn,-1);
  assert.equal(input(result.bindings,'KeyQ').strafe,0);
  assert.equal(input(result.bindings,'KeyA').strafe,-1);
  assert.equal(input(DEFAULT_BINDINGS,'KeyA').turn,-1,'the defaults must not be mutated');
});

test('custom bite and bark bindings take effect and their old keys stop firing', () => {
  let bindings=rebind(DEFAULT_BINDINGS,'bite','KeyZ').bindings;
  bindings=rebind(bindings,'bark','KeyX').bindings;
  assert.equal(input(bindings,'KeyZ').bite,true);
  assert.equal(input(bindings,'Space').bite,false);
  assert.equal(actionForKey(bindings,'KeyX'),'bark');
  assert.equal(actionForKey(bindings,'KeyR'),null);
});

test('saved custom keys survive serialization while corrupt bindings recover safely', () => {
  let custom=rebind(DEFAULT_BINDINGS,'lookLeft','KeyQ').bindings;
  custom=rebind(custom,'bite','KeyZ').bindings;
  assert.deepEqual(normalizeBindings(JSON.parse(JSON.stringify(custom))),custom);
  for(const corrupt of [null,[],17,'wrong',{lookLeft:'Escape',bite:'NotAKey'},{lookLeft:'KeyZ',lookRight:'KeyZ'}]){
    const bindings=normalizeBindings(corrupt);
    assert.equal(new Set(Object.values(bindings)).size,Object.keys(DEFAULT_BINDINGS).length);
    assert.equal(actionForKey(bindings,'Escape'),'pause');
  }
});

test('Escape and Tab stay available for menus instead of becoming gameplay binds', () => {
  for(const code of ['Escape','Tab','MetaLeft','ControlLeft','AltLeft','F5','']){
    const result=rebind(DEFAULT_BINDINGS,'bite',code);
    assert.ok(result.error);assert.deepEqual(result.bindings,DEFAULT_BINDINGS);
  }
});

test('arrow alternatives do not double turn and an explicit arrow binding wins', () => {
  assert.equal(input(DEFAULT_BINDINGS,'KeyA','ArrowLeft').turn,-1);
  assert.equal(input(DEFAULT_BINDINGS,'KeyA','KeyD').turn,0);
  assert.equal(input(DEFAULT_BINDINGS,'ArrowUp').forward,1);
  const bindings=rebind(DEFAULT_BINDINGS,'bark','ArrowLeft').bindings;
  assert.equal(actionForKey(bindings,'ArrowLeft'),'bark');
  assert.equal(input(bindings,'ArrowLeft').turn,0);
});

test('both Shift keys work as one binding, including after reassignment', () => {
  assert.equal(input(DEFAULT_BINDINGS,'ShiftLeft').sprint,true);
  assert.equal(input(DEFAULT_BINDINGS,'ShiftRight').sprint,true);
  const bindings=rebind(DEFAULT_BINDINGS,'bite','ShiftRight').bindings;
  assert.equal(input(bindings,'ShiftLeft').bite,true);
  assert.equal(input(bindings,'ShiftRight').sprint,false);
  assert.equal(keyLabel(bindings.bite),'SHIFT');
});
