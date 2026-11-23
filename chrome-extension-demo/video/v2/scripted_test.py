"""程式模擬輸入測試：同一頁、同設定，分別餵入「躁動」與「平穩」兩段腳本滑鼠動作，各 10 秒，讀擴充功能即時分數。"""
import asyncio, json, random, sys, time
sys.path.insert(0, '/workspace/neuroadaptive/extension-demo/video'); import record_real as R
from playwright.async_api import async_playwright
EXT = R.EXT
async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context('/tmp/na-prof3', headless=False, viewport={'width':1280,'height':720},
            args=[f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'])
        pg = ctx.pages[0]; await pg.goto(R.URL); await pg.wait_for_timeout(1200)
        await pg.evaluate("window.__pts=[];addEventListener('mousemove',e=>__pts.push([e.clientX,e.clientY]))")
        out = {}
        for name, fn in [('restless', R.erratic), ('steady', R.calm)]:
            await R.cmd(pg, 'reset', settings={'demoMode': True, 'sensitivity': 1.5, 'autoPrompt': False})
            await pg.evaluate("window.__pts=[]"); random.seed(11)
            series = []
            for _ in range(10):
                await fn(pg, 1.0); s = await R.state(pg); series.append(s['score'])
            pts = await pg.evaluate("__pts.slice(-600)")
            out[name] = {'final': series[-1], 'series': series, 'comps': s['comps'], 'points': pts}
            print(name, series)
        json.dump(out, open('scripted_test.json', 'w'))
        await ctx.close()
asyncio.run(main())
