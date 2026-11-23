import asyncio, random, math, sys
from playwright.async_api import async_playwright
EXT='/workspace/neuroadaptive/extension-demo/extension'
async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context('/tmp/na-prof', headless=False, viewport={'width':1280,'height':720},
            args=[f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'])
        pg = await ctx.new_page(); await pg.goto('http://127.0.0.1:8765/demo-site/index.html'); await pg.wait_for_timeout(1500)
        print('loaded', await pg.evaluate("!!document.getElementById('na-root')"))
        await pg.evaluate("document.dispatchEvent(new CustomEvent('na-cmd',{detail:{settings:{demoMode:true,trail:true}}}))")
        # calm reading
        for i in range(40):
            await pg.mouse.move(300+i*8, 300+math.sin(i/5)*10, steps=3); await pg.wait_for_timeout(60)
        print('calm', await pg.evaluate("JSON.parse(document.documentElement.dataset.naState||'null')"))
        x,y=600,400
        for i in range(70):
            nx,ny=random.randint(50,1230),random.randint(80,700)
            await pg.mouse.move(nx,ny,steps=random.choice([1,2,3,8,15])); await pg.wait_for_timeout(random.choice([10,20,40,150]))
            if i%6==0: await pg.mouse.wheel(0, random.choice([-300,300]))
        st=await pg.evaluate("JSON.parse(document.documentElement.dataset.naState||'null')"); print('erratic', st['score'], st['level'], st['comps'])
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path='/tmp/t_prompt.png')
        await pg.click('#na-root >> #yes'); await pg.wait_for_timeout(5000)
        await pg.evaluate("document.dispatchEvent(new CustomEvent('na-cmd',{detail:{cmd:'ruler',value:true}}))")
        await pg.mouse.move(640,300); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/t_after.png')
        await pg.click('#na-root >> #undo'); await pg.wait_for_timeout(800)
        print('after undo', await pg.evaluate("document.documentElement.className"), await pg.evaluate("document.querySelectorAll('.na-gone').length"))
        await pg.screenshot(path='/tmp/t_undo.png')
        await ctx.close()
asyncio.run(main())
