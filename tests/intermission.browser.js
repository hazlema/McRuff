// Run through Playwright's browser_run_code_unsafe filename option with npm start active.
async (page)=>{
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const ctx=await page.context().browser().newContext({viewport:{width:1280,height:800}});
  const errors=[];
  try{
    const p=await ctx.newPage();p.on('pageerror',error=>errors.push(error.message));
    await p.route('**/src/main.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\nwindow.__intermissionQA={get game(){return game},get mode(){return mode}};'});
    });
    await p.goto('http://localhost:4173/');
    await p.getByRole('button',{name:'HIT THE STREETS'}).click();
    const mode=()=>p.evaluate(()=>window.__intermissionQA.mode);
    // Hold bite while walking onto the exit, the way a player finishes a fight.
    await p.keyboard.down('Space');
    await p.evaluate(()=>{const g=window.__intermissionQA.game;g.enemies.forEach(e=>e.hp=0);g.totalArrests=g.arrests=g.enemies.length;g.score+=500;Object.assign(g.player,{x:g.exit.x,y:g.exit.y});});
    await p.waitForFunction(()=>window.__intermissionQA.mode==='intermission');
    await p.keyboard.up('Space');
    for(let i=0;i<6;i++){await p.keyboard.press('Space');await p.waitForTimeout(60);}
    assert(await mode()==='intermission','Space released or mashed during the tally skipped the screen');
    assert(await p.locator('#intermission-next').isDisabled(),'continue enabled too early');
    await p.waitForFunction(()=>!document.querySelector('#intermission-next').disabled,null,{timeout:6000});
    const rows=await p.locator('.tally-row').evaluateAll(rows=>rows.map(r=>[r.querySelector('dt').textContent,r.querySelector('dd').textContent,getComputedStyle(r).opacity]));
    assert(rows.length===4&&rows.every(r=>r[2]==='1'),`rows not all shown: ${JSON.stringify(rows)}`);
    assert(rows[2][1]==='6 / 21',`arrests: ${rows[2][1]}`);
    assert(rows[3][1].startsWith('+')&&Number(rows[3][1].replace(/\D/g,''))>=600,`bonus: ${rows[3][1]}`);
    await p.keyboard.press('Space');
    await p.waitForFunction(()=>window.__intermissionQA.mode==='playing');
    const level=await p.evaluate(()=>window.__intermissionQA.game.levelIndex);
    assert(level===1,`expected district 2, got index ${level}`);
    assert(await p.locator('#intermission').isHidden(),'intermission still visible');
    assert(!errors.length,errors.join('\n'));
    return {ok:true,rows};
  }finally{await ctx.close();}
}
