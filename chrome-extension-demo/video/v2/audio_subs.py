import json, subprocess
m = json.load(open('vo/meta.json')); LEAD = .6; TOTAL = 129.9; CLICK = 79.0
t = LEAD; cues = []; inputs = []; delays = []
for k, x in enumerate(m):
    x['start'] = t; inputs += ['-i', x['file']]; delays.append(f"[{k}:a]adelay={int(t*1000)}|{int(t*1000)}[d{k}]")
    tot = sum(len(en) for _, en in x['chunks']); c0 = t
    for zh, en in x['chunks']:
        d = x['dur'] * len(en) / tot; cues.append((c0, c0 + d, zh, en)); c0 += d
    t += x['dur'] + x['pause']
# extend each cue a bit into the pause (min 1.5 s on screen) without overlapping next
for i in range(len(cues)):
    s, e, zh, en = cues[i]; nxt = cues[i+1][0] if i+1 < len(cues) else TOTAL
    cues[i] = (s, min(max(e + .25, s + 1.5), nxt - .02), zh, en)
fmt = lambda s: f"{int(s//3600):02}:{int(s%3600//60):02}:{int(s%60):02},{int(round(s%1*1000)):03}".replace(',1000', ',999')
for lang, idx in [('zh-Hant', 2), ('en', 3)]:
    with open(f'../../NeuroAdaptive_demo_v2.{lang}.srt', 'w') as f:
        for i, c in enumerate(cues): f.write(f"{i+1}\n{fmt(c[0])} --> {fmt(c[1])}\n{c[idx]}\n\n")
ass_t = lambda s: f"{int(s//3600)}:{int(s%3600//60):02}:{s%60:05.2f}"
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ZH,Noto Sans CJK TC,54,&H00FFFFFF,&H00FFFFFF,&H70201A16,&H70201A16,-1,0,0,0,100,100,1,0,3,14,0,2,80,80,118,1
Style: EN,Noto Sans CJK TC,34,&H00E6E6E6,&H00FFFFFF,&H70201A16,&H70201A16,0,0,0,0,100,100,0,0,3,10,0,2,80,80,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open('subs.ass', 'w') as f:
    f.write(hdr)
    for s, e, zh, en in cues:
        f.write(f"Dialogue: 0,{ass_t(s)},{ass_t(e)},ZH,,0,0,0,,{zh}\n")
        f.write(f"Dialogue: 0,{ass_t(s)},{ass_t(e)},EN,,0,0,0,,{en}\n")
n = len(m)
fc = ';'.join(delays) + ';' + ''.join(f'[d{k}]' for k in range(n)) + f'amix=inputs={n}:normalize=0,apad,atrim=0:{TOTAL}[vo]'
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', fc, '-map', '[vo]', '-ar', '44100', '-ac', '2', 'vo_track.wav'], check=True)
subprocess.run(['python3', 'music.py', str(CLICK), '1.0', str(TOTAL - CLICK - 1.0), 'music.wav'], check=True)
# 混音：配樂整體壓低，旁白出現時再 sidechain ducking
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'vo_track.wav', '-i', 'music.wav', '-filter_complex',
  "[0:a]asplit=2[v1][v2];[1:a]volume=0.22[mu];[mu][v2]sidechaincompress=threshold=0.015:ratio=6:attack=40:release=500[duck];[v1]volume=1.0[vv];[vv][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[out]",
  '-map', '[out]', '-ar', '48000', 'mix.wav'], check=True)
json.dump(cues, open('cues.json', 'w'), ensure_ascii=False)
print('cues', len(cues))
