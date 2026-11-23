import asyncio, sys, time, json
sys.path.insert(0, '/workspace/neuroadaptive/extension-demo/video'); import record_real as R
from playwright.async_api import async_playwright
import shutil
async def main():
    shutil.rmtree('undoraw', ignore_errors=True); shutil.rmtree('/tmp/na-prof4', ignore_errors=True)
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context('/tmp/na-prof4', headless=False, viewport={'width':1280,'height':720},
            record_video_dir='undoraw', record_video_size={'width':1280,'height':720}, args=[f'--disable-extensions-except={R.EXT}', f'--load-extension={R.EXT}'])
        await ctx.add_init_script(R.CURSOR); pg = ctx.pages[0]; T0=time.time()
        await pg.goto(R.URL); await pg.wait_for_timeout(1000)
        await R.cmd(pg, 'focusInstant', True, settings={'demoMode': True, 'autoPrompt': False}); await pg.wait_for_timeout(300)
        await R.glide(pg, 640, 400, 300); t_on = time.time()-T0
        await pg.wait_for_timeout(1500)
        bb = await pg.locator('#na-root >> #undo').bounding_box()
        await R.glide(pg, bb['x']+bb['width']/2, bb['y']+bb['height']/2, 1100); await pg.wait_for_timeout(400)
        t_click = time.time()-T0; await pg.mouse.down(); await pg.mouse.up()
        await pg.wait_for_timeout(3500)
        await pg.screenshot(path='undo_after.png')
        await ctx.close()
    json.dump({'on': t_on, 'click': t_click}, open('undo_events.json','w')); print(t_on, t_click)
asyncio.run(main())
