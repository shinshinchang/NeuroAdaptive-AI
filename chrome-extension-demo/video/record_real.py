"""錄製真實擴充功能運作畫面（Playwright + 載入未封裝擴充）。輸出 video/raw/*.webm 與 video/events.json"""
import asyncio, random, math, json, time, glob, os, shutil
from playwright.async_api import async_playwright
EXT = '/workspace/neuroadaptive/extension-demo/extension'
URL = 'http://127.0.0.1:8765/demo-site/index.html'
random.seed(7)
CURSOR = """
addEventListener('DOMContentLoaded',()=>{const c=document.createElement('div');c.setAttribute('data-na-keep','');
c.style.cssText='position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
c.innerHTML='<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg>';
document.body.appendChild(c);addEventListener('mousemove',e=>c.style.transform=`translate(${e.clientX-3}px,${e.clientY-2}px)`,true);
addEventListener('mousedown',()=>{c.animate([{scale:1},{scale:.7},{scale:1}],{duration:300})},true);});
"""
ev = []; T0 = None; cur = [640, 360]
def mark(name, **kw):
    t = time.time() - T0; ev.append(dict(name=name, t=round(t, 2), **kw)); print(f'{t:6.2f} {name} {kw}')
async def state(pg): return await pg.evaluate("JSON.parse(document.documentElement.dataset.naState||'null')")
async def glide(pg, x, y, dur, jitter=0):
    n = max(1, int(dur / 16)); sx, sy = cur
    for i in range(1, n + 1):
        k = i / n; e = k * k * (3 - 2 * k)
        await pg.mouse.move(sx + (x - sx) * e + random.uniform(-jitter, jitter), sy + (y - sy) * e + random.uniform(-jitter, jitter))
        await pg.wait_for_timeout(16)
    cur[0], cur[1] = x, y
async def calm(pg, secs, y0=300):
    end = time.time() + secs; x = 300; y = y0
    while time.time() < end:
        await glide(pg, 760, y, 1400); await glide(pg, 300, y + 26, 500); y += 26
        if y > 480: y = y0
async def erratic(pg, secs):
    end = time.time() + secs; i = 0
    while time.time() < end:
        i += 1
        await glide(pg, random.randint(60, 1220), random.randint(90, 690), random.choice([60, 90, 120, 200, 450]), jitter=random.choice([0, 0, 6]))
        await pg.wait_for_timeout(random.choice([0, 30, 120, 300]))
        if i % 3 == 0: await pg.mouse.wheel(0, random.choice([-350, 350]))
async def cmd(pg, c, v=None, settings=None):
    d = {'cmd': c, 'value': v}
    if settings: d['settings'] = settings
    await pg.evaluate("d=>document.dispatchEvent(new CustomEvent('na-cmd',{detail:d}))", d)

async def main():
    global T0
    shutil.rmtree('video/raw', ignore_errors=True); shutil.rmtree('/tmp/na-prof2', ignore_errors=True)
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context('/tmp/na-prof2', headless=False, viewport={'width': 1280, 'height': 720},
            record_video_dir='video/raw', record_video_size={'width': 1280, 'height': 720},
            args=[f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'])
        await ctx.add_init_script(CURSOR)
        pg = ctx.pages[0] if ctx.pages else await ctx.new_page()
        T0 = time.time()
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await cmd(pg, 'reset', settings={'demoMode': True, 'trail': False, 'sensitivity': 1.5})
        mark('noisy_start')
        await calm(pg, 3.0)
        await pg.mouse.wheel(0, 250); await calm(pg, 2.5, 260); await glide(pg, 1050, 250, 600)  # 停在廣告上
        await pg.wait_for_timeout(900); await pg.mouse.wheel(0, -250)
        s = await state(pg); mark('noisy_end', score=s['score'])
        await pg.screenshot(path='screenshots/01_before_cluttered.png')
        await cmd(pg, 'details', True, settings={'trail': True}); mark('trail_start', score=(await state(pg))['score'])
        scores = []
        t_end = time.time() + 9
        while time.time() < t_end:
            await erratic(pg, 1.0); s = await state(pg); scores.append(s['score'])
            if s['level'] == 'High' and len(scores) > 6: break
        mark('trail_peak', score=s['score'], scores=scores)
        await pg.screenshot(path='screenshots/02_score_rising.png')
        # 等提示卡（持續 High）
        for _ in range(20):
            await erratic(pg, 0.4)
            vis = await pg.evaluate("1")
            sh = await pg.locator('#na-root >> #prompt.show').count()
            if sh: break
        await cmd(pg, 'details', False)
        s = await state(pg); mark('prompt_shown', score=s['score'])
        await glide(pg, 700, 400, 400)
        box = await pg.locator('#na-root >> #yes').bounding_box()
        await glide(pg, box['x'] + box['width'] / 2, box['y'] + box['height'] / 2, 900)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='screenshots/03_prompt.png')
        s = await state(pg); mark('click', score=s['score'])
        await pg.mouse.down(); await pg.mouse.up()
        await cmd(pg, 'noop', settings={'trail': False})
        await pg.wait_for_timeout(5200); mark('layers_done', score=(await state(pg))['score'])
        await glide(pg, 640, 300, 600)
        await cmd(pg, 'ruler', True); mark('ruler_on')
        cur_y = 200
        for i in range(4):
            await glide(pg, 300, cur_y, 250); await glide(pg, 900, cur_y, 900); cur_y += 40
        await pg.screenshot(path='screenshots/04_after_ruler.png')
        await cmd(pg, 'ruler', False); await cmd(pg, 'chunk', True); mark('chunk_on', score=(await state(pg))['score'])
        for i in range(3):
            await calm(pg, 1.2, 330)
            await pg.keyboard.press('ArrowRight')
        await pg.screenshot(path='screenshots/05_after_chunk.png')
        await cmd(pg, 'chunk', False)
        await calm(pg, 3.0, 300)
        s = await state(pg); mark('calm_end', score=s['score'])
        await pg.screenshot(path='screenshots/06_after_focus_calm.png')
        await cmd(pg, 'details', True); await calm(pg, 1.5, 300); mark('end', score=(await state(pg))['score'])
        await cmd(pg, 'break'); await pg.wait_for_timeout(2500); await pg.screenshot(path='screenshots/07_break_reminder.png'); mark('break_shown')
        await ctx.close()
    vids = glob.glob('video/raw/*.webm'); print(vids)
    json.dump(ev, open('video/events.json', 'w'), ensure_ascii=False, indent=1)
if __name__ == "__main__": asyncio.run(main())
