// Run through Playwright's browser_run_code_unsafe filename option with npm start active.
async (page)=>{
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const ctx=await page.context().browser().newContext({viewport:{width:1280,height:850}});
  const errors=[];
  try{
    const p=await ctx.newPage();p.on('pageerror',error=>errors.push(error.message));
    await p.route('**/src/main.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\nwindow.__difficultyQA={get game(){return game},get mode(){return mode}};'});
    });
    await p.goto('http://localhost:4173/');
    await p.getByRole('button',{name:'HIT THE STREETS'}).click();
    const prepare=async()=>p.evaluate(()=>{
      const g=window.__difficultyQA.game;g.loadLevel(0);
      const e=g.enemies[0];Object.assign(e,{x:4.2,y:4,active:true,cooldown:0});g.enemies=[e];
      g.map=['##########','#........#','#........#','#........#','#........#','#........#','#........#','##########'];
      Object.assign(g.player,{x:3.5,y:4,angle:0,health:100,armor:0});g.pickups=[];g.props=[];g.exit={x:8.5,y:6.5};
    });
    await prepare();
    await p.keyboard.down('Space');
    await p.waitForFunction(()=>window.__difficultyQA.game.arrests===1);
    await p.keyboard.up('Space');
    const recklessHealth=await p.evaluate(()=>window.__difficultyQA.game.player.health);
    assert(recklessHealth===86,'Holding bite should take one newspaper hit and receive no arrest healing');
    await p.screenshot({path:'/home/frosty/Dev/ai/McRuff/screenshots/difficulty-combat.png'});
    await prepare();
    await p.waitForFunction(()=>window.__difficultyQA.game.enemies[0].attackWindup>0);
    await p.keyboard.press('r');await p.waitForTimeout(300);
    assert(await p.evaluate(()=>{const g=window.__difficultyQA.game;return g.player.health===100&&g.enemies[0].stun>0;}),'Keyboard bark should interrupt the swing');
    await prepare();
    await p.waitForFunction(()=>window.__difficultyQA.game.enemies[0].attackWindup>0);
    await p.keyboard.down('s');await p.waitForTimeout(500);await p.keyboard.up('s');await p.waitForTimeout(180);
    assert(await p.evaluate(()=>window.__difficultyQA.game.player.health===100),'Keyboard backstep should dodge the swing');
    await p.keyboard.press('p');await p.getByRole('button',{name:'Options',exact:true}).click();
    await p.locator('#difficulty').selectOption('hard');
    await p.getByRole('button',{name:'Done',exact:true}).click();
    await p.getByRole('button',{name:'Main menu',exact:true}).click();
    await p.getByRole('button',{name:'HIT THE STREETS'}).click();
    assert(await p.evaluate(()=>window.__difficultyQA.game.difficulty==='hard'),'Selected difficulty should apply to the new case');
    await p.evaluate(()=>{const g=window.__difficultyQA.game;g.enemies.forEach(e=>e.hp=0);Object.assign(g.player,{...g.exit,health:30});});
    await p.waitForFunction(()=>window.__difficultyQA.mode==='result');
    assert((await p.locator('#overlay-copy').innerText()).includes('10 health'),'District screen must explain the limited Hard patch-up');
    await p.getByRole('button',{name:'Next district',exact:true}).click();
    const patchedHealth=await p.evaluate(()=>window.__difficultyQA.game.player.health);
    assert(patchedHealth===40,'Hard district transition must add only 10 health');
    await p.keyboard.press('p');await p.getByRole('button',{name:'Main menu',exact:true}).click();
    await p.getByRole('button',{name:'How to bite',exact:true}).click();
    assert((await p.locator('#overlay-content').innerText()).includes('Bites only interrupt a raised paper on Easy'),'Field manual must explain the new combat rule');
    await p.setViewportSize({width:390,height:844});
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Updated field manual must fit on mobile');
    assert(errors.length===0,errors.join('\n'));
    return {passed:true,recklessHealth,patchedHealth,barkInterrupt:true,backstepDodge:true,errors};
  }finally{await ctx.close();}
}
