import asyncio, json, subprocess, sys, os
sys.path.insert(0, '.'); from script import SEGMENTS, ORDER
import edge_tts
VOICE = 'en-US-AndrewNeural'
async def main():
    os.makedirs('vo', exist_ok=True); meta = []
    for seg in ORDER:
        for si, (chunks, pause) in enumerate(SEGMENTS[seg]):
            text = ' '.join(en for _, en in chunks); f = f'vo/{seg}_{si}.mp3'
            await edge_tts.Communicate(text, VOICE, rate='+0%').save(f)
            d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
            meta.append(dict(seg=seg, i=si, file=f, dur=d, pause=pause, chunks=chunks, text=text))
            print(seg, si, round(d, 2), text[:50])
    json.dump(meta, open('vo/meta.json', 'w'), ensure_ascii=False, indent=1)
asyncio.run(main())
