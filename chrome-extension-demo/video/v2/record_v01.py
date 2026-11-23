import asyncio, random, time, json
from playwright.async_api import async_playwright
random.seed(3)
CURSOR = """addEventListener('DOMContentLoaded',()=>{const c=document.createElement('div');c.style.cssText='position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
c.innerHTML='<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg>';document.body.appendChild(c);addEventListener('mousemove',e=>c.style.transform=`translate(${e.clientX-3}px,${e.clientY-2}px)`,true);});"""
cur=[640,360]; T0=None; ev=[]
async def glide(pg,x,y,dur):
    n=max(1,int(dur/16)); sx,sy=cur
    for i in range(1,n+1):
        k=i/n; e=k*k*(3-2*k); await pg.mouse.move(sx+(x-sx)*e+random.uniform(-2,2), sy+(y-sy)*e+random.uniform(-2,2)); await pg.wait_for_timeout(16)
    cur[0],cur[1]=x,y
def mark(n): ev.append((n, round(time.time()-T0,2))); print(ev[-1])
async def main():
    global T0
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=False)
        ctx=await b.new_context(viewport={'width':1280,'height':1000},record_video_dir='v01raw',record_video_size={'width':1280,'height':1000})
        await ctx.add_init_script(CURSOR); pg=await ctx.new_page(); T0=time.time()
        await pg.goto('http://127.0.0.1:8766/NeuroAdaptive-AI-v0.1/index.html'); await pg.wait_for_timeout(1500); mark('intro')
        bb=await pg.locator('#btnStart').bounding_box(); await glide(pg,bb['x']+40,bb['y']+15,700); await pg.mouse.click(cur[0],cur[1]); await pg.wait_for_timeout(1200)
        bb=await pg.locator('#btnBeginTask').bounding_box(); await glide(pg,bb['x']+60,bb['y']+15,700); await pg.mouse.click(cur[0],cur[1]); await pg.wait_for_timeout(800); await pg.evaluate("document.getElementById('taskArena').scrollIntoView({block:'end'})"); await pg.wait_for_timeout(300); mark('task')
        for i in range(45):
            sz=await pg.locator('#startZone').bounding_box()
            await glide(pg,sz['x']-120,sz['y']-150,150); await pg.wait_for_timeout(60); await glide(pg,sz['x']+sz['width']/2,sz['y']+sz['height']/2,200)
            # wait for target
            for _ in range(100):
                if await pg.locator('#targetButton:not(.hidden)').count(): break
                await pg.wait_for_timeout(25)
            cue=await pg.locator('#cueDisplay').get_attribute('class')
            nogo = 'nogo' in (cue or '')
            if not nogo:
                tb=await pg.locator('#targetButton').bounding_box()
                if not tb: continue
                await glide(pg,tb['x']+tb['width']/2,tb['y']+tb['height']/2,random.choice([250,350,450]))
                await pg.mouse.click(cur[0],cur[1])
            else:
                await pg.wait_for_timeout(1300)
            await pg.wait_for_timeout(200)
            if await pg.locator('#screenResults.active').count(): break
        await pg.wait_for_timeout(2000); mark('results')
        await pg.mouse.wheel(0,500); await pg.wait_for_timeout(1500); mark('scroll1')
        await pg.mouse.wheel(0,600); await pg.wait_for_timeout(1500); mark('scroll2')
        await pg.screenshot(path='v01_results.png')
        await ctx.close(); await b.close()
    json.dump(ev,open('v01_events.json','w'))
asyncio.run(main())
