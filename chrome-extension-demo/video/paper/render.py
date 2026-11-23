import asyncio, sys, os, subprocess, shutil
from playwright.async_api import async_playwright
SCENES = [('hook', 6), ('concept', 10), ('features', 7), ('disclaimer', 6), ('end', 7), ('splitbg', 1/12)]
FPS = 12
only = sys.argv[1:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        await pg.goto('file://' + os.path.abspath('anim.html')); await pg.wait_for_timeout(500)
        for name, dur in SCENES:
            if only and name not in only: continue
            d = f'frames/{name}'; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
            for i in range(max(1, round(dur * FPS))):
                await pg.evaluate(f"renderFrame('{name}',{i / FPS})")
                await pg.screenshot(path=f'{d}/{i:04d}.png')
            print(name, 'frames', i + 1)
        await b.close()
asyncio.run(main())
