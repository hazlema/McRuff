// Run through Playwright's browser_run_code_unsafe filename option with npm start active.
async (page)=>{
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const ctx=await page.context().browser().newContext({viewport:{width:1280,height:850},hasTouch:true});
  const errors=[];
  try{
    const p=await ctx.newPage();p.on('pageerror',error=>errors.push(error.message));
    await p.route('**/src/main.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\nwindow.__catQA={get game(){return game},get mode(){return mode},renderer};'});
    });
    await p.goto('http://localhost:4173/');
    await p.getByRole('button',{name:'HIT THE STREETS'}).click();
    await p.evaluate(()=>{
      const g=window.__catQA.game,d=g.props.find(p=>p.type==='barrel');g.enemies=[];
      g.player.x=d.x;g.player.y=d.y+1.6;g.player.angle=-Math.PI/2;g.random=()=>.99;
    });
    await p.keyboard.press('r');
    assert(await p.evaluate(()=>window.__catQA.game.props.find(p=>p.type==='barrel').shake>0),'Bark should rattle the drum');
    const quickTap=await p.evaluate(()=>{
      const g=window.__catQA.game;
      // Press and release between frames: a quick tap must still act once.
      document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));
      document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));
      return {opened:g.props.find(p=>p.type==='barrel').opened,count:g.cats.length};
    });
    assert(quickTap.opened&&quickTap.count===4,'A quick bite tap must launch four cats for this seeded roll');
    await p.waitForFunction(()=>window.__catQA.game.cats.every(c=>c.height===0));
    await p.evaluate(()=>{
      const g=window.__catQA.game,c=g.cats[0];
      // Open test space preserves the live entities and their AI while avoiding a wall fixture.
      g.map=['##########','#........#','#........#','#........#','#........#','#........#','##########'];
      g.player.x=3;g.player.y=3;g.player.angle=0;g.exit={x:8.5,y:5.5};g.cats=[c];
      c.x=5;c.y=3;g.barkCooldown=0;
    });
    await p.keyboard.press('r');
    assert(await p.evaluate(()=>{const c=window.__catQA.game.cats[0];return c.flee>2&&c.meow>0&&!c.stun;}),'Bark must cause a meow and flight, never stun');
    const before=await p.evaluate(()=>window.__catQA.game.cats[0].x);
    await p.waitForTimeout(200);
    assert(await p.evaluate(x=>window.__catQA.game.cats[0].x>x+.2,before),'Barked-at cat must keep moving');
    await p.evaluate(()=>{const g=window.__catQA.game,c=g.cats[0];g.player.x=c.x-.7;g.player.y=c.y;g.player.angle=0;g.biteCooldown=0;});
    await p.keyboard.press('Space');
    await p.waitForFunction(()=>document.getElementById('cat-count').textContent==='1');
    const capture=await p.evaluate(()=>({points:window.__catQA.game.catPoints,collection:window.__catQA.game.catCollection.golden,arrests:window.__catQA.game.totalArrests}));
    assert(capture.points===1500&&capture.collection===1&&capture.arrests===0,'Capture should grant cat points without an arrest');
    await p.keyboard.press('p');await p.getByRole('button',{name:'Cat collection',exact:true}).click();
    assert((await p.locator('#overlay-copy').innerText()).includes('1 cat safely captured'),'Collection should show the capture');
    const elapsed=await p.evaluate(()=>window.__catQA.game.elapsed);await p.waitForTimeout(120);
    assert(await p.evaluate(t=>window.__catQA.game.elapsed===t,elapsed),'Collection must pause the simulation');
    await p.keyboard.press('Escape');await p.getByRole('button',{name:'Key bindings',exact:true}).click();
    await p.locator('[data-action="bite"]').click();await p.keyboard.press('z');
    await p.getByRole('button',{name:'Done',exact:true}).click();await p.getByRole('button',{name:'Back to the beat',exact:true}).click();
    await p.evaluate(()=>{const g=window.__catQA.game,c=g.cats[0];c.captured=false;c.x=4;c.y=3;g.player.x=3.3;g.player.y=3;g.biteCooldown=0;});
    await p.keyboard.press('Space');
    assert(await p.evaluate(()=>!window.__catQA.game.cats[0].captured),'Old bite key must stop acting after remap');
    await p.keyboard.press('z');
    assert(await p.evaluate(()=>window.__catQA.game.cats[0].captured),'Remapped key must capture cats');
    await p.keyboard.press('p');await p.getByRole('button',{name:'Cat collection',exact:true}).click();
    for(const [width,height] of [[390,844],[320,568]]){
      await p.setViewportSize({width,height});
      assert(await p.evaluate(()=>{const panel=document.querySelector('.overlay-panel');return panel.scrollWidth<=panel.clientWidth&&document.documentElement.scrollWidth<=innerWidth;}),`Collection must fit at ${width}px`);
      await p.getByRole('button',{name:'Back to the beat',exact:true}).focus();
      await p.keyboard.press('Tab');
      assert(await p.evaluate(()=>document.activeElement.textContent==='Back'),'Keyboard focus should stay in the collection menu');
    }
    await p.setViewportSize({width:390,height:844});
    await p.screenshot({path:'/home/frosty/Dev/ai/McRuff/screenshots/cat-collection-mobile.png'});
    // Touch uses the same gentle grab, including a brief tap.
    await p.getByRole('button',{name:'Back to the beat',exact:true}).click();
    await p.evaluate(()=>{
      const g=window.__catQA.game,c=g.cats[0];c.captured=false;c.x=4;c.y=3;g.player.x=3.3;g.player.y=3;g.biteCooldown=0;
    });
    await p.locator('#touch-bite').tap();
    const touch=await p.evaluate(()=>window.__catQA.game.cats[0].captured);
    assert(touch,'Touch bite should capture immediately');
    assert(errors.length===0,errors.join('\n'));
    return {passed:true,quickTap,capture,mobileWidths:[390,320],errors};
  }finally{await ctx.close();}
}
