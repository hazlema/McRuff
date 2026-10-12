// Run through Playwright's browser_run_code_unsafe filename option with npm start active.
async (page)=>{
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const ctx=await page.context().browser().newContext({viewport:{width:1280,height:800}});
  const errors=[];
  try{
    const p=await ctx.newPage();p.on('pageerror',error=>errors.push(error.message));
    await p.route('**/src/main.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\nwindow.__mouseQA={get game(){return game}};'});
    });
    await p.goto('http://localhost:4173/');
    await p.getByRole('button',{name:'HIT THE STREETS'}).click();
    const at=()=>p.evaluate(()=>{const g=window.__mouseQA.game;return {x:g.player.x,y:g.player.y,bite:g.biteAnimation};});
    await p.evaluate(()=>{const g=window.__mouseQA.game;g.enemies=[];});
    await p.mouse.move(640,300);
    const before=await at();
    // Holding the middle button walks forward (spawn faces north, so y falls).
    await p.mouse.down({button:'middle'});await p.waitForTimeout(500);
    const walking=await at();
    assert(before.y-walking.y>.6,`middle button did not walk forward: ${before.y} -> ${walking.y}`);
    // A left click while middle is held still bites.
    await p.mouse.down({button:'left'});const biting=await at();await p.mouse.up({button:'left'});
    assert(biting.bite>0,'left click while holding middle did not bite');
    await p.mouse.up({button:'middle'});await p.waitForTimeout(100);
    const stopped=await at();await p.waitForTimeout(300);const still=await at();
    assert(Math.abs(stopped.y-still.y)<.01,'kept walking after middle release');
    assert(!errors.length,errors.join('\n'));
    return {ok:true,walked:before.y-walking.y};
  }finally{await ctx.close();}
}
