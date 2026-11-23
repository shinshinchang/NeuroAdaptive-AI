import asyncio, os, json
from playwright.async_api import async_playwright
CAPS = {'c_noisy':'廣告在動、側欄在跳，注意力一點一點被拿走。','c_detect':'從滑鼠的微小動作，估算此刻的注意力負荷','c_prompt':'負荷偏高時，它會溫和地提醒你','c_l1':'① 藏起干擾','c_l2':'② 側欄、推薦滑走','c_l3':'③ 降低彩度、停止動畫','c_l4':'④ 放大字距、單欄閱讀',
 'c_ruler':'閱讀尺：一次只看一行','c_chunk':'分段呈現：一次只專心看一段','c_calm':'軌跡變平穩，負荷降回低檔','c_split':'同一個網頁，兩種閱讀狀態','c_real':'以下為擴充功能實機錄影（分數為即時計算）'}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':720})
        await pg.goto('file://'+os.path.abspath('anim.html')); await pg.add_style_tag(content='html,body{background:transparent!important}')
        os.makedirs('caps', exist_ok=True)
        for k,v in CAPS.items():
            await pg.evaluate("v=>{window.CAP=v;renderFrame('cap',0)}", v)
            await pg.screenshot(path=f'caps/{k}.png', omit_background=True)
        await b.close()
asyncio.run(main())
