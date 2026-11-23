import asyncio, os, shutil, json, sys
from playwright.async_api import async_playwright
FPS = 12
SC = json.loads(sys.argv[1])  # {"name":dur}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':720}, device_scale_factor=1.5)
        await pg.goto('file://' + os.path.abspath('anim.html')); await pg.wait_for_timeout(400)
        await pg.evaluate("d=>{window.SD=d;window.NOCAP=1}", json.load(open('scripted_data.json')))
        for name, dur in SC.items():
            if name == 'scripted': await pg.evaluate(f"window.SDUR={dur}")
            d = f'frames2/{name}'; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
            for i in range(max(1, round(dur * FPS))):
                await pg.evaluate(f"renderFrame('{name}',{i / FPS})"); await pg.screenshot(path=f'{d}/{i:04d}.png', timeout=120000)
            print(name, i + 1, flush=True)
        await b.close()
asyncio.run(main())
