"""程序合成配樂（自製，無版權疑慮）：A 段忙亂（116 BPM 小調撥弦＋滴答＋通知音），同意點擊時靜默，B 段平靜（84 BPM 大調鋼琴＋pad）。
用法：python3 music.py <A秒數> <靜默秒數> <B秒數> out.wav"""
import numpy as np, sys, wave
SR = 44100
A, GAP, B = map(float, sys.argv[1:4]); OUT = sys.argv[4]
rng = np.random.default_rng(1)
def note(f, dur, kind='pluck', vol=.3):
    t = np.arange(int(SR * dur)) / SR
    if kind == 'pluck':
        y = sum(np.sin(2*np.pi*f*h*t) / h**1.3 for h in range(1, 6)) * np.exp(-t * 7)
    elif kind == 'piano':
        y = sum(np.sin(2*np.pi*f*h*t) * (.6**(h-1)) for h in range(1, 5)) * np.exp(-t * 2.2) * (1 - np.exp(-t * 300))
    elif kind == 'pad':
        y = (np.sin(2*np.pi*f*t) + .5*np.sin(2*np.pi*f*1.003*t) + .3*np.sin(2*np.pi*f*2*t)) * np.minimum(1, t / .8) * np.minimum(1, (dur - t) / .8)
    return y * vol
def add(buf, y, at):
    i = int(at * SR); j = min(len(buf), i + len(y))
    if i < len(buf): buf[i:j] += y[:j - i]
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
# ---- A section ----
a = np.zeros(int(SR * A)); beat = 60 / 116
arp = [57, 60, 64, 67, 64, 60, 63, 60]  # A minor-ish with a b3/♭ tension note
for k in range(int(A / (beat / 2))):
    t0 = k * beat / 2
    add(a, note(mid(arp[k % 8] + (12 if (k // 16) % 2 else 0)), .4, 'pluck', .16), t0)
    if k % 2 == 0: add(a, rng.normal(0, 1, int(SR*.03)) * np.exp(-np.arange(int(SR*.03))/SR*120) * .05, t0)   # tick
for k in range(int(A / (beat * 4))):
    add(a, note(mid(45 if k % 2 == 0 else 43), beat * 4, 'pad', .10), k * beat * 4)
for t0 in np.arange(3.0, A - 2, 5.3):  # soft notification blips
    add(a, note(mid(84), .12, 'pluck', .07), t0); add(a, note(mid(88), .15, 'pluck', .06), t0 + .1)
fade = int(SR * .4); a[-fade:] *= np.linspace(1, 0, fade)
# ---- click + gap ----
g = np.zeros(int(SR * GAP)); add(g, note(mid(76), .9, 'piano', .18), GAP * .5)
# ---- B section ----
b = np.zeros(int(SR * B)); beat = 60 / 84
prog = [[60, 64, 67, 71], [57, 60, 64, 67], [65, 69, 72, 76], [67, 71, 74, 77]]  # Cmaj7 Am7 Fmaj7 G
for k in range(int(B / (beat * 4)) + 1):
    ch = prog[k % 4]; t0 = k * beat * 4
    add(b, sum(note(mid(m - 12), beat * 4, 'pad', .05) for m in ch), t0)
    for j, m in enumerate([ch[0], ch[2], ch[1], ch[3]]):
        add(b, note(mid(m), beat * 2, 'piano', .13), t0 + j * beat)
b[:int(SR*1.5)] *= np.linspace(0, 1, int(SR*1.5)); b[-int(SR*3):] *= np.linspace(1, 0, int(SR*3))
y = np.concatenate([a, g, b])
# simple reverb (feedback delays)
for d, gn in [(.031, .35), (.047, .3), (.083, .25), (.121, .2)]:
    n = int(d * SR); yy = y.copy(); yy[n:] += y[:-n] * gn; y = yy
y = y / np.max(np.abs(y)) * .7
st = np.stack([y, np.roll(y, 220)], 1)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('music', len(y) / SR)
