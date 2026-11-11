#!/usr/bin/env python3
"""Studio-grade stereo BGM + 35ms lookahead sidechain ducking + frame-locked foley/SFX mixer for Style 2 (lineless).
Eliminates digital dead-air pauses and normalizes output via 2-pass EBU R128 to -14.0 LUFS / <= -1.5 dBTP.

Usage:
  python3 mix_soundtrack.py --vo narration.wav --cues sound_cues.json --out master_-14LUFS.wav [--dur 751.46]
"""
import argparse, json, os, subprocess, wave
import numpy as np

SR = 48000
_KS_CACHE = {}


def load_vo(path: str, dur_s: float | None = None) -> np.ndarray:
    tmp = path + "._tmp48k.wav"
    cmd = ["ffmpeg", "-y", "-v", "quiet"]
    if dur_s is not None:
        cmd += ["-t", f"{dur_s:.3f}"]
    cmd += ["-i", path, "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", tmp]
    subprocess.run(cmd, check=True)
    try:
        with wave.open(tmp, "rb") as wf:
            raw = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    stereo = raw.reshape(-1, 2)
    if dur_s is not None:
        target_n = int(round(dur_s * SR))
        if len(stereo) < target_n:
            stereo = np.pad(stereo, ((0, target_n - len(stereo)), (0, 0)))
        else:
            stereo = stereo[:target_n]
    return stereo


def add_stereo(mix: np.ndarray, sig_mono: np.ndarray, t_start: float, gain: float = 1.0, pan: float = 0.0):
    n_total = len(mix)
    i0 = int(round(t_start * SR))
    if i0 >= n_total or gain == 0.0:
        return
    if i0 < 0:
        sig_mono = sig_mono[-i0:]
        i0 = 0
    i1 = min(n_total, i0 + len(sig_mono))
    if i1 <= i0:
        return
    seg = sig_mono[:i1 - i0]
    angle = (np.clip(pan, -1.0, 1.0) + 1.0) * (np.pi / 4.0)
    mix[i0:i1, 0] += seg * (np.cos(angle) * gain)
    mix[i0:i1, 1] += seg * (np.sin(angle) * gain)


def fft_bandpass(x: np.ndarray, f_lo: float, f_hi: float) -> np.ndarray:
    n = len(x)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, d=1.0 / SR)
    hp = 1.0 / np.sqrt(1.0 + (np.maximum(f_lo, 1.0) / np.maximum(freqs, 1e-3)) ** 6)
    lp = 1.0 / np.sqrt(1.0 + (freqs / max(f_hi, 10.0)) ** 6)
    return np.fft.irfft(spec * hp * lp, n=n).astype(np.float32)


def lp_filter(x: np.ndarray, f_cut: float, order: int = 3) -> np.ndarray:
    n = len(x)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, d=1.0 / SR)
    lp = 1.0 / np.sqrt(1.0 + (freqs / max(f_cut, 10.0)) ** (2 * order))
    return np.fft.irfft(spec * lp, n=n).astype(np.float32)


def bp_noise(dur_s: float, f_lo: float, f_hi: float, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = max(16, int(round(dur_s * SR)))
    x = rng.standard_normal(n).astype(np.float32)
    y = fft_bandpass(x, f_lo, f_hi)
    rms = float(np.sqrt(np.mean(y ** 2)) + 1e-8)
    return (y * (0.28 / rms)).astype(np.float32)


def karplus_strong(freq: float, dur_s: float, decay: float = 0.994, brightness: float = 0.45, seed: int = 7) -> np.ndarray:
    key = (round(freq, 2), round(dur_s, 2), round(decay, 4), round(brightness, 2), seed % 8)
    if key in _KS_CACHE:
        return _KS_CACHE[key]
    n = int(round(dur_s * SR))
    period = max(4, int(round(SR / freq)))
    rng = np.random.default_rng(seed)
    buf = np.convolve(rng.uniform(-1.0, 1.0, period).astype(np.float32), np.ones(5) / 5.0, mode="same").astype(np.float32)
    out = np.zeros(n, dtype=np.float32)
    idx, prev = 0, 0.0
    for i in range(n):
        val = buf[idx]
        out[i] = val
        buf[idx] = ((1.0 - brightness) * val + brightness * prev) * decay
        prev = val
        idx = (idx + 1) % period
    out = 0.72 * out + 0.45 * fft_bandpass(out, 95.0, 340.0)
    out *= np.exp(-np.linspace(0, 4.2, n)).astype(np.float32)
    out *= np.minimum(1.0, np.arange(n, dtype=np.float32) / (0.006 * SR))
    res = out.astype(np.float32)
    _KS_CACHE[key] = res
    return res


def bowed_cello_note(freq: float, dur_s: float, detune_cents: float = 0.0) -> np.ndarray:
    n = max(64, int(round(dur_s * SR)))
    t = np.arange(n, dtype=np.float64) / SR
    f = freq * (2.0 ** (detune_cents / 1200.0))
    vib = 1.0 + 0.0028 * np.sin(2 * np.pi * 4.6 * t) * np.minimum(1.0, t / 0.5)
    phase = 2 * np.pi * np.cumsum(f * vib) / SR
    sig = np.zeros_like(t)
    for h in range(1, 8):
        sig += (1.0 / (h ** 1.38)) * np.sin(h * phase)
    sig = lp_filter(sig.astype(np.float32), 440.0, order=3)
    att = np.minimum(1.0, t / 0.32)
    rel = np.minimum(1.0, np.maximum(0.0, (dur_s - t) / 0.35))
    return (sig * att * rel * 0.34).astype(np.float32)


# ---- Foley & Transient SFX Library ------------------------------------------
def make_sfx(kind: str, dur: float = 0.3, seed: int = 11) -> np.ndarray:
    if kind == "sabre_draw":
        d = max(0.28, dur)
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        scrape = bp_noise(d, 1800, 6800, seed) * np.exp(-t * 14.0) * np.minimum(1.0, t / 0.015)
        ring = (
            0.45 * np.sin(2 * np.pi * (1920 + 280 * np.exp(-t * 18)) * t) * np.exp(-t * 7.5)
            + 0.30 * np.sin(2 * np.pi * 3140 * t) * np.exp(-t * 9.5)
            + 0.22 * np.sin(2 * np.pi * 4890 * t) * np.exp(-t * 12.0)
        ) * np.minimum(1.0, t / 0.006)
        return (0.55 * scrape + 0.48 * ring).astype(np.float32)
    if kind == "sword_whoosh":
        d = max(0.22, dur)
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        air = bp_noise(d, 650, 3800, seed)
        return (air * (np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2) * np.exp(-t * 4.0) * 0.75).astype(np.float32)
    if kind == "marker_slash":
        d = max(0.18, dur)
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        bristle = bp_noise(d, 900, 4400, seed)
        env = (np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.65) * np.exp(-t * 3.2)
        thump = np.sin(2 * np.pi * (150 * np.exp(-t * 24) + 55) * t) * np.exp(-t * 20) * 0.45
        return (bristle * env * 0.65 + thump).astype(np.float32)
    if kind == "fate_boom":
        d = max(1.1, dur)
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        phase = 2 * np.pi * np.cumsum(42.0 + 58.0 * np.exp(-t * 16.0)) / SR
        sub = np.sin(phase) * np.exp(-t * 2.9) * np.minimum(1.0, t / 0.008)
        skin = bp_noise(d, 80, 380, seed) * np.exp(-t * 14.0) * 0.45
        return (sub * 0.85 + skin).astype(np.float32)
    if kind == "chalk":
        d = max(0.45, dur)
        n = int(round(d * SR))
        t = np.arange(n, dtype=np.float32) / SR
        grain = bp_noise(d, 1750, 5600, seed)
        strokes = np.zeros(n, dtype=np.float32)
        for c in np.linspace(0.06 * d, 0.90 * d, 6):
            strokes += np.exp(-0.5 * ((t - c) / 0.04) ** 2)
        tap = bp_noise(d, 600, 1900, seed + 1) * np.exp(-t * 35.0) * 0.45
        return (grain * np.clip(strokes, 0, 1.15) * 0.52 + tap).astype(np.float32)
    if kind in ("stamp_thud", "gavel_slam"):
        d = max(0.28, dur)
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        f0 = 78 if kind == "gavel_slam" else 62
        body = np.sin(2 * np.pi * (f0 + 105 * np.exp(-t * 28)) * t) * np.exp(-t * 12.5)
        slap = bp_noise(d, 450, 3200, seed) * np.exp(-t * 32.0) * 0.72
        return ((0.78 * body + slap) * np.minimum(1.0, t / 0.003)).astype(np.float32)
    if kind == "paper_whoosh":
        d = max(0.16, dur)
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        return (bp_noise(d, 240, 1250, seed) * (np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.4) * 0.45).astype(np.float32)
    if kind == "watch_tick":
        d = 0.045
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        return (0.55 * np.sin(2 * np.pi * 2450 * t) * np.exp(-t * 140.0) + 0.45 * bp_noise(d, 1600, 5200, seed) * np.exp(-t * 170.0)).astype(np.float32)
    if kind == "detector_ping":
        d = max(0.32, dur)
        t = np.arange(int(round(d * SR)), dtype=np.float32) / SR
        return (np.sin(2 * np.pi * 1320.0 * t) * np.exp(-t * 8.5) * np.minimum(1.0, t / 0.005) * 0.42).astype(np.float32)
    if kind == "hoof_bed":
        d = max(0.8, dur)
        n = int(round(d * SR))
        out = np.zeros(n, dtype=np.float32)
        rng = np.random.default_rng(seed)
        t_cur, step = 0.04, 0
        hn = int(0.09 * SR)
        ht = np.arange(hn, dtype=np.float32) / SR
        templates = [
            bp_noise(0.09, 95, 420, seed + k) * np.exp(-ht * 42.0) + np.sin(2 * np.pi * (88 + (k % 3) * 9) * ht) * np.exp(-ht * 36.0) * 0.35
            for k in range(6)
        ]
        while t_cur < d - 0.12:
            dt = (1.0 / 3.7) * (0.42 if step % 2 == 0 else 0.58) + rng.uniform(-0.012, 0.012)
            i0 = int(t_cur * SR)
            i1 = min(n, i0 + hn)
            out[i0:i1] += templates[step % 6][:i1 - i0] * (0.65 + 0.35 * (step % 2))
            t_cur += max(0.08, dt)
            step += 1
        fi = np.minimum(1.0, np.arange(n, dtype=np.float32) / (0.22 * SR))
        fo = np.minimum(1.0, np.arange(n, dtype=np.float32)[::-1] / (0.25 * SR))
        return (out * fi * fo).astype(np.float32)
    if kind == "wind_amb":
        d = max(1.0, dur)
        n = int(round(d * SR))
        w = lp_filter(bp_noise(d, 120, 820, seed), 580.0) * 0.065
        fi = np.minimum(1.0, np.arange(n, dtype=np.float32) / (0.45 * SR))
        fo = np.minimum(1.0, np.arange(n, dtype=np.float32)[::-1] / (0.45 * SR))
        return (w * fi * fo).astype(np.float32)
    return np.zeros(64, dtype=np.float32)


def build_bgm_sections(n_total: int, sections: list[dict]) -> np.ndarray:
    bgm = np.zeros((n_total, 2), dtype=np.float32)
    prog_chords = [(73.42, 110.00), (58.27, 87.31), (65.41, 98.00), (55.00, 82.41)]  # Dm - Bb - C - Am

    for sec_idx, sec in enumerate(sections):
        t0, t1 = float(sec["t0"]), float(sec["t1"])
        mode = sec.get("mode", "investigation")
        if t1 <= t0 + 0.15:
            continue

        if mode == "dusk_hook":
            dur = t1 - t0
            for f, pan, g_amp, det in [(73.42, -0.25, 0.50, -1.5), (73.42, 0.25, 0.50, 1.5), (110.00, -0.38, 0.34, 2.0), (146.83, 0.36, 0.22, -2.0)]:
                note = bowed_cello_note(f, dur, det) * np.linspace(0.76, 1.20, int(round(dur * SR))).astype(np.float32)
                add_stereo(bgm, note, t0, gain=g_amp, pan=pan)
            for k, tp in enumerate(np.arange(t0 + 0.12, t1 - 0.15, 0.44)):
                add_stereo(bgm, karplus_strong(73.42 if k % 2 == 0 else 110.0, 0.55, 0.992, 0.48, k), float(tp), 0.21, -0.15 if k % 2 == 0 else 0.15)

        elif mode in ("investigation", "verdict_finale"):
            bar_len = 3.20
            t_cur = t0
            b_idx = 0
            while t_cur < t1 - 0.25:
                d_bar = min(bar_len + 0.06, t1 - t_cur)
                f_lo, f_5 = prog_chords[b_idx % len(prog_chords)]
                add_stereo(bgm, bowed_cello_note(f_lo, d_bar, -1.2), t_cur, gain=0.33, pan=-0.30)
                add_stereo(bgm, bowed_cello_note(f_5, d_bar, 1.4), t_cur, gain=0.23, pan=0.30)
                pat = [f_lo, f_5, f_lo * 2.0, f_5, f_lo, f_5, f_lo * 1.5, f_5]
                for s_i, fp in enumerate(pat):
                    tn = t_cur + s_i * 0.40
                    if tn >= t1 - 0.08:
                        break
                    plk = karplus_strong(fp, 0.48, 0.993, 0.44, b_idx + s_i)
                    add_stereo(bgm, plk, tn, gain=0.23 if s_i % 2 == 0 else 0.16, pan=-0.22 if s_i % 2 == 0 else 0.22)
                t_cur += bar_len
                b_idx += 1

        elif mode == "march_tension":
            bar_len = 3.60
            t_cur = t0
            b_idx = 0
            chords = [(65.41, 98.00), (73.42, 110.00), (58.27, 87.31), (55.00, 82.41)]
            while t_cur < t1 - 0.25:
                d_bar = min(bar_len + 0.08, t1 - t_cur)
                f_lo, f_5 = chords[b_idx % len(chords)]
                add_stereo(bgm, bowed_cello_note(f_lo, d_bar, -1.5), t_cur, gain=0.38, pan=-0.32)
                add_stereo(bgm, bowed_cello_note(f_5, d_bar, 1.5), t_cur, gain=0.26, pan=0.32)
                for s_i in range(6):
                    tn = t_cur + s_i * 0.60
                    if tn >= t1 - 0.1:
                        break
                    plk = karplus_strong(f_lo if s_i % 2 == 0 else f_5, 0.58, 0.994, 0.40, b_idx + s_i)
                    add_stereo(bgm, plk, tn, gain=0.19, pan=-0.16 if s_i % 2 == 0 else 0.16)
                t_cur += bar_len
                b_idx += 1

        elif mode == "solemn_ridge":
            # Dignified sparse fifth drones + subtle wind, zero bouncy ostinato!
            bar_len = 5.50
            t_cur = t0
            b_idx = 0
            drones = [(73.42, 110.00, 146.83), (65.41, 98.00, 130.81), (58.27, 87.31, 130.81)]
            while t_cur < t1 - 0.30:
                d_bar = min(bar_len + 0.25, t1 - t_cur)
                f1, f2, f3 = drones[b_idx % len(drones)]
                add_stereo(bgm, bowed_cello_note(f1, d_bar, -1.6), t_cur, gain=0.40, pan=-0.34)
                add_stereo(bgm, bowed_cello_note(f2, d_bar, 1.6), t_cur, gain=0.30, pan=0.34)
                add_stereo(bgm, bowed_cello_note(f3, d_bar, 0.6), t_cur, gain=0.18, pan=0.0)
                t_cur += bar_len
                b_idx += 1
            add_stereo(bgm, make_sfx("wind_amb", t1 - t0, seed=700 + sec_idx), t0, gain=0.85, pan=0.0)

    return bgm


def apply_sidechain_duck_fast(bgm: np.ndarray, vo: np.ndarray) -> np.ndarray:
    """Fast 1kHz control-rate lookahead sidechain ducking interpolated cleanly to 48kHz."""
    n = len(vo)
    step = 48  # 1 ms control rate at 48 kHz
    n_ctrl = (n + step - 1) // step
    vo_pad = np.pad(0.5 * (np.abs(vo[:, 0]) + np.abs(vo[:, 1])), (0, n_ctrl * step - n))
    rms_1ms = np.sqrt(np.mean(vo_pad.reshape(n_ctrl, step) ** 2, axis=1) + 1e-12)
    env = np.convolve(rms_1ms, np.ones(45) / 45.0, mode="same")
    env_la = np.pad(env[35:], (0, 35))

    gain_ctrl = np.ones(n_ctrl, dtype=np.float32)
    g_cur = 1.0
    att_c = float(np.exp(-1.0 / 35.0))
    rel_c = float(np.exp(-1.0 / 320.0))
    for i in range(n_ctrl):
        target = 0.43 if env_la[i] > 0.015 else 0.84
        c = att_c if target < g_cur else rel_c
        g_cur = c * g_cur + (1.0 - c) * target
        gain_ctrl[i] = g_cur

    x_ctrl = np.arange(n_ctrl, dtype=np.float32) * step
    gain_full = np.interp(np.arange(n, dtype=np.float32), x_ctrl, gain_ctrl).astype(np.float32)
    return bgm * gain_full[:, None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vo", required=True)
    ap.add_argument("--cues", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--dur", type=float, default=None)
    args = ap.parse_args()

    vo = load_vo(args.vo, args.dur)
    n_total = len(vo)
    spec = json.loads(open(args.cues, "r", encoding="utf-8").read())

    bgm = build_bgm_sections(n_total, spec.get("bgm_sections", []))
    bgm_ducked = apply_sidechain_duck_fast(bgm, vo)

    sfx = np.zeros((n_total, 2), dtype=np.float32)
    for idx, ev in enumerate(spec.get("sfx_events", [])):
        sig = make_sfx(ev["kind"], float(ev.get("dur", 0.3)), int(ev.get("seed", 100 + idx)))
        add_stereo(sfx, sig, float(ev["t"]), float(ev.get("gain", 0.20)), float(ev.get("pan", 0.0)))

    tail_n = min(n_total, int(0.45 * SR))
    tail_env = np.linspace(1.0, 0.05, tail_n).astype(np.float32)[:, None]
    bgm_ducked[-tail_n:] *= tail_env

    mix = vo * 0.88 + bgm_ducked * 0.25 + sfx * 0.60
    peak = float(np.max(np.abs(mix)))
    if peak > 0.92:
        mix *= (0.92 / peak)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    pre_wav = args.out + "._pre.wav"
    pcm16 = np.clip(mix * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(pre_wav, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm16.tobytes())

    p1 = subprocess.run(["ffmpeg", "-y", "-i", pre_wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"],
                        capture_output=True, text=True, check=True)
    j0, j1 = p1.stderr.rfind("{"), p1.stderr.rfind("}") + 1
    st = json.loads(p1.stderr[j0:j1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
          f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", pre_wav, "-af", ln, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", args.out], check=True)
    os.remove(pre_wav)

    with wave.open(args.out, "rb") as wf:
        fin = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32).reshape(-1, 2) / 32768.0
    win = int(0.05 * SR)
    nw = len(fin) // win
    db = 20.0 * np.log10(np.sqrt(np.mean(fin[:nw * win].reshape(nw, win, 2) ** 2, axis=(1, 2)) + 1e-15))
    print(f"Mastered {args.out}: len={len(fin)/SR:.2f}s, min_50ms={np.min(db):.1f}dBFS, dead_air(<-55dB)={100*np.mean(db<-55):.2f}%")


if __name__ == "__main__":
    main()
