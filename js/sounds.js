// LOCKED ROOM — расширенная библиотека: параметрические синтезаторы + пресеты
// ============================================================
//  Каждый звук здесь — строка «движок + параметры». Движков несколько: бочка, малый, хлопок, хэт,
//  перкуссия, тональный (бас / лид / клавиши / аккорды / пэды / оркестр), голос (форманты) и FX.
//  У звука есть теги жанров — по ним GEN подбирает звуки под жанр.
// ============================================================
const SND_META = {};
const stepSec = () => 60 / (typeof bpm === 'number' && bpm > 0 ? bpm : 128) / 4;

// огибающая громкости: атака (линейная, если медленная) → удержание → спад. Возвращает длину звука.
function envAmp(g, t, peak, a, h, d){
  d *= DK; h = (h || 0) * DK;
  g.gain.setValueAtTime(0.0001, t);
  if (a > 0.02) g.gain.linearRampToValueAtTime(peak, t + a); else g.gain.exponentialRampToValueAtTime(peak, t + Math.max(0.001, a));
  if (h) g.gain.setValueAtTime(peak, t + a + h);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + d);
  return a + h + d;
}
function loopNoise(t, dur){ const s = ac.createBufferSource(); s.buffer = NB; s.loop = true; s.playbackRate.value = Math.pow(2, PIT/12); s.start(t, Math.random()*0.5); s.stop(t + dur + 0.05); return s; }
const VOWELS = { a:[730,1090,2440], e:[530,1840,2480], i:[270,2290,3010], o:[570,840,2410], u:[300,870,2240] };

// ---------- собственные волновые формы (гармоники) ----------
const WAVE_DEF = {
  organ:  [0, 1, 1, 0.8, 0, 0.5, 0, 0, 0.4, 0, 0, 0, 0.2, 0, 0, 0, 0.15],
  hollow: [...Array(24)].map((_, n) => n % 2 ? 1 / n : 0),
  buzz:   [...Array(40)].map((_, n) => n ? 1 / Math.sqrt(n) : 0),
  reed:   [0, 1, 0.8, 0.6, 0.35, 0.5, 0.2, 0.3, 0.1, 0.15, 0.05, 0.08],
  vocal:  [0, 0.3, 0.5, 1, 0.9, 0.6, 0.25, 0.15, 0.3, 0.35, 0.15, 0.05, 0.05],
  glass:  [0, 1, 0, 0.1, 0.5, 0, 0, 0, 0.35, 0, 0, 0, 0, 0, 0, 0, 0.2],
  pulse25:[...Array(32)].map((_, n) => n ? 2 / (n * Math.PI) * Math.sin(n * Math.PI * 0.25) : 0),
  pulse12:[...Array(32)].map((_, n) => n ? 2 / (n * Math.PI) * Math.sin(n * Math.PI * 0.125) : 0),
  digital:[0, 1, 0.15, 0.85, 0.1, 0.6, 0.05, 0.7, 0, 0.4, 0, 0.45, 0, 0.3, 0, 0.35],
  soft:   [0, 1, 0.25, 0.08, 0.03],
  nasal:  [0, 0.4, 0.3, 0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.2, 0.1],
};
const waveCache = new WeakMap();
function getWave(name){
  let m = waveCache.get(ac); if (!m){ m = {}; waveCache.set(ac, m); }
  if (!m[name]){ const h = WAVE_DEF[name] || WAVE_DEF.soft, re = new Float32Array(h.length), im = new Float32Array(h.length); h.forEach((a, k) => im[k] = a); m[name] = ac.createPeriodicWave(re, im); }
  return m[name];
}
// ---------- обработка внутри звука: дробление разрядности, фолдинг, кольцевая модуляция, гребёнка, хорус ----------
const fxCurves = {};
function crushCurve(bits){ const k = 'c' + bits; if (fxCurves[k]) return fxCurves[k]; const n = 2048, c = new Float32Array(n), q = Math.pow(2, bits - 1); for (let i=0;i<n;i++){ const x = i * 2 / n - 1; c[i] = Math.round(x * q) / q; } return fxCurves[k] = c; }
function foldCurve(a){ const k = 'f' + a; if (fxCurves[k]) return fxCurves[k]; const n = 2048, c = new Float32Array(n); for (let i=0;i<n;i++){ const x = i * 2 / n - 1; c[i] = Math.sin(x * a * Math.PI / 2); } return fxCurves[k] = c; }
function procChain(node, p, t, L, fr){
  const later = (fn, sec) => setTimeout(fn, (sec + 1) * 1000 + Math.max(0, (t - ac.currentTime)) * 1000);
  if (p.fold){ const s = ac.createWaveShaper(); s.curve = foldCurve(p.fold); node.connect(s); node = s; }
  if (p.crush){ const s = ac.createWaveShaper(); s.curve = crushCurve(p.crush); node.connect(s); node = s; }
  if (p.ring){ const rg = ac.createGain(), ro = ac.createOscillator(); rg.gain.value = 0; ro.frequency.value = p.ringHz || (fr || 200) * p.ring; ro.connect(rg.gain); node.connect(rg); ro.start(t); ro.stop(t + L + 0.1); node = rg; }
  if (p.comb){ const d = ac.createDelay(0.2), fb = ac.createGain(), mix = ac.createGain(); d.delayTime.value = p.comb / 1000; fb.gain.value = p.cfb ?? 0.7;
    node.connect(mix); node.connect(d); d.connect(fb); fb.connect(d); d.connect(mix); later(() => { fb.disconnect(); }, L); node = mix; }
  if (p.chorus){ const d = ac.createDelay(0.1), lf = ac.createOscillator(), lg = ac.createGain(), mix = ac.createGain(); d.delayTime.value = 0.014; lf.frequency.value = 0.7; lg.gain.value = 0.004 * p.chorus;
    lf.connect(lg); lg.connect(d.delayTime); node.connect(mix); node.connect(d); d.connect(mix); lf.start(t); lf.stop(t + L + 0.2); node = mix; }
  if (p.hp){ const f = filt('highpass', p.hp, 0.7); node.connect(f); node = f; }
  if (p.bp2){ const f = filt('bandpass', p.bp2, p.bq ?? 1.5); node.connect(f); node = f; }
  return node;
}
// ---------- модальный синтез: негармонические обертоны с разным затуханием ----------
// [отношение частоты, громкость, множитель длины]
const MODES = {
  bar:      [[1,1,1],[3.93,0.45,0.45],[10.2,0.2,0.25]],
  xylo:     [[1,1,1],[3,0.5,0.5],[6.3,0.25,0.3],[9.9,0.12,0.2]],
  glass:    [[1,1,1],[2.32,0.6,0.8],[4.25,0.4,0.6],[6.63,0.25,0.5]],
  bell:     [[0.5,0.6,1.4],[1,1,1],[1.19,0.7,0.8],[1.5,0.5,0.7],[2,0.45,0.6],[2.74,0.35,0.5],[3,0.3,0.4],[4.07,0.2,0.3]],
  tube:     [[1,1,1],[2.76,0.4,0.6],[5.4,0.2,0.4],[8.93,0.12,0.3]],
  membrane: [[1,1,1],[1.59,0.6,0.6],[2.14,0.45,0.45],[2.3,0.35,0.4],[2.65,0.3,0.35],[2.92,0.25,0.3]],
  plate:    [[1,1,1],[1.41,0.8,0.9],[2.24,0.6,0.7],[2.92,0.5,0.6],[3.16,0.4,0.5],[4.12,0.3,0.4],[5,0.2,0.3]],
  kalimba:  [[1,1,1],[5.4,0.3,0.25],[6,0.2,0.2]],
  metalbar: [[1,1,1],[2.76,0.7,0.7],[5.4,0.5,0.5],[8.93,0.35,0.4],[13.3,0.2,0.3]],
  gong:     [[1,1,1.2],[1.07,0.8,1.1],[1.62,0.6,0.9],[2.3,0.5,0.8],[2.8,0.4,0.7],[3.5,0.3,0.6],[4.1,0.25,0.5]],
};
// ---------- щипковая струна (Karplus-Strong): буфер считается один раз на высоту ----------
const ksCache = new Map();
function ksBuffer(fr, damp, bright, dur){
  const sr = ac.sampleRate, N = Math.max(2, Math.round(sr / fr - 0.5)), key = sr + '|' + N + '|' + damp + '|' + bright + '|' + dur;
  let b = ksCache.get(key);
  if (!b){
    const len = Math.round(sr * dur), d = new Float32Array(len); let y = 0;
    for (let i=0;i<N && i<len;i++){ y += bright * ((Math.random() * 2 - 1) - y); d[i] = y; }
    for (let i=N;i<len;i++) d[i] = damp * 0.5 * (d[i - N] + (i - N - 1 >= 0 ? d[i - N - 1] : 0));
    let pk = 0; for (let i=0;i<len;i++) pk = Math.max(pk, Math.abs(d[i])); if (pk) for (let i=0;i<len;i++) d[i] /= pk;
    b = ac.createBuffer(1, len, sr); b.getChannelData(0).set(d);
    if (ksCache.size > 96) ksCache.delete(ksCache.keys().next().value);
    ksCache.set(key, b);
  }
  return { buf: b, rate: fr / (sr / (N + 0.5)) };
}

const ENG = {
  // ---------- бочка: синус со спадом высоты, щелчок, перегруз ----------
  kick(t, p){
    const f0 = p.f0 ?? 160, f1 = p.f1 ?? 50, sw = p.sw ?? 0.05;
    const o = osc(); o.type = p.w || 'sine';
    const g = ac.createGain(), l = ac.createGain(); l.gain.value = p.lvl ?? 0.75;
    const L = envAmp(g, t, 1, 0.002, p.h ?? 0.05, p.d ?? 0.3);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + sw); o.frequency.exponentialRampToValueAtTime(f1 * (p.f2 ?? 0.85), t + L);
    o.connect(g); let node = g;
    const k = (p.k ?? 1.5) + (p.drv ? P.drive * 0.25 : 0);
    if (k > 0){ const s = shaper(k); node.connect(s); node = s; }
    if (p.lp){ const f = filt('lowpass', p.lp, 0.7); node.connect(f); node = f; }
    node = procChain(node, p, t, L, f1); node.connect(l); l.connect(out(p.rev || 0, 0, L + 0.1)); o.start(t); o.stop(t + L + 0.05);
    if (p.c){ const n = noise(t, 0.02), hp = filt('highpass', p.cf || 2500), cg = ac.createGain(); decay(cg, t, p.c, p.cd || 0.01); n.connect(hp); hp.connect(cg); cg.connect(out(0, 0, 0.1)); }
  },
  // ---------- малый: тон + шумовой «хвост» ----------
  snare(t, p){
    const l = ac.createGain(); l.gain.value = p.lvl ?? 0.45; let dst = l;
    if (p.k){ const s = shaper(p.k); s.connect(l); dst = s; }
    const nd = p.nd ?? 0.2;
    procChain(l, p, t, nd + 0.2, p.ft ?? 220).connect(out(p.rev ?? 0.2, p.del || 0, nd + 0.3));
    if (p.ta !== 0){
      const o = osc(), ft = p.ft ?? 220; o.type = p.tw || 'triangle';
      o.frequency.setValueAtTime(ft, t); o.frequency.exponentialRampToValueAtTime(ft * (p.fd ?? 0.72), t + 0.08);
      const og = ac.createGain(); decay(og, t, p.ta ?? 0.6, p.td ?? 0.09); o.connect(og); og.connect(dst); o.start(t); o.stop(t + ((p.td ?? 0.09) + 0.06) * DK);
    }
    const n = noise(t, nd + 0.1), f = filt(p.nt || 'bandpass', p.nf ?? 2600, p.nq ?? 0.6), ng = ac.createGain();
    decay(ng, t, p.na ?? 0.9, nd); n.connect(f); f.connect(ng); ng.connect(dst);
  },
  // ---------- хлопок: несколько коротких шумовых ударов + хвост ----------
  clap(t, p){
    const n = p.n ?? 3, sp = p.sp ?? 0.011, d = p.d ?? 0.3, s = noise(t, d + n * sp + 0.1), f = filt('bandpass', p.f ?? 1300, p.q ?? 0.9), g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    for (let i=0;i<n;i++){ g.gain.setValueAtTime(0.7, t + i*sp); g.gain.linearRampToValueAtTime(0.08, t + i*sp + sp*0.8); }
    g.gain.setValueAtTime(0.7, t + n*sp); g.gain.exponentialRampToValueAtTime(0.001, t + n*sp + d*DK);
    const l = ac.createGain(); l.gain.value = p.lvl ?? 1; s.connect(f); f.connect(g); g.connect(l);
    let node = l; if (p.k){ const sh = shaper(p.k); l.connect(sh); node = sh; }
    node.connect(out(p.rev ?? 0.35, p.del || 0, d + 0.2));
  },
  // ---------- хэт: металл (808-квадраты) или шум ----------
  hat(t, p){
    const d = p.d ?? 0.05, lvl = p.lvl ?? 0.22;
    if (p.m === 'noise'){
      const s = noise(t, d + 0.05), f = filt('highpass', p.f ?? 7500, p.q ?? 1), g = ac.createGain(); decay(g, t, lvl, d);
      s.connect(f); f.connect(g); let node = g;
      if (p.bp){ const b = filt('bandpass', p.bp, 1); g.connect(b); node = b; }
      procChain(node, p, t, d, 8000).connect(out(p.rev ?? 0.05, 0, d + 0.1)); return;
    }
    metallic(t, d, lvl, p.rev ?? 0.03, p.mult ?? 1.4, p.bpf ?? 10000);
  },
  // ---------- перкуссия: тон со спадом высоты, FM, второй обертон, шумовой щелчок ----------
  perc(t, p){
    const f = p.f ?? 400, d = p.d ?? 0.15, o = osc(); o.type = p.w || 'sine';
    o.frequency.setValueAtTime(f * (p.pd ?? 1.5), t); o.frequency.exponentialRampToValueAtTime(f, t + (p.pt ?? 0.02));
    if (p.pe) o.frequency.exponentialRampToValueAtTime(f * p.pe, t + d * DK);
    const g = ac.createGain(), l = ac.createGain(); l.gain.value = p.lvl ?? 0.45; decay(g, t, 1, d, p.a ?? 0.001);
    if (p.fm){ const m = osc(), mg = ac.createGain(); m.frequency.value = f * p.fm; mg.gain.setValueAtTime(f * (p.fi ?? 2), t); mg.gain.exponentialRampToValueAtTime(1, t + d * DK); m.connect(mg); mg.connect(o.frequency); m.start(t); m.stop(t + d * DK + 0.05); }
    if (p.o2){ const o2 = osc(); o2.type = p.w || 'sine'; o2.frequency.value = f * p.o2; o2.connect(g); o2.start(t); o2.stop(t + d * DK + 0.05); }
    o.connect(g); let node = g;
    if (p.bp){ const b = filt('bandpass', p.bp, p.q ?? 2); g.connect(b); node = b; }
    if (p.k){ const s = shaper(p.k); node.connect(s); node = s; }
    node = procChain(node, p, t, d * DK, f); node.connect(l); l.connect(out(p.rev ?? 0.15, p.del || 0, d + 0.2)); o.start(t); o.stop(t + d * DK + 0.05);
    if (p.nz){ const n = noise(t, (p.nd ?? 0.03) + 0.02), hp = filt('highpass', p.nf ?? 3000), ng = ac.createGain(); decay(ng, t, p.nz, p.nd ?? 0.03); n.connect(hp); hp.connect(ng); ng.connect(l); }
  },
  // ---------- тональный: осцилляторы (унисон, аккорд по ладу, FM, глайд) → фильтр с огибающей → перегруз ----------
  tone(t, n, p){
    const ivs = p.ch ? CH(p.ch, n) : [0], ws = Array.isArray(p.w) ? p.w : [p.w || 'sawtooth'], u = p.u || 1;
    const base = P.root + (p.o ?? 36) + noteOf(n);
    const g = ac.createGain(), l = ac.createGain();
    const L = envAmp(g, t, 1, p.a ?? 0.004, p.h ?? 0, p.d ?? 0.3);
    l.gain.value = (p.lvl ?? 0.2) / Math.sqrt(ivs.length * u * ws.length);
    const fc = p.f ?? 3000, f = filt(p.ft || 'lowpass', fc, p.q ?? 1);
    if (p.fe){ f.frequency.setValueAtTime(Math.min(18000, fc * p.fe), t); f.frequency.exponentialRampToValueAtTime(fc, t + (p.fd ?? 0.15) * DK); }
    if (p.wob){ const lf = ac.createOscillator(), lg = ac.createGain(); lf.type = p.wobw || 'sine'; lf.frequency.value = 1 / (stepSec() * p.wob); lg.gain.value = fc * (p.wd ?? 0.9); lf.connect(lg); lg.connect(f.frequency); lf.start(t); lf.stop(t + L + 0.05); }
    f.connect(g); let node = g;
    if (p.k){ const s = shaper(p.k); g.connect(s); node = s; }
    node = procChain(node, p, t, L, mtof(base)); node.connect(l); l.connect(out(p.rev ?? 0.1, p.del ?? 0, L + 0.2));
    let vib = null;
    if (p.vib){ const lf = ac.createOscillator(); vib = ac.createGain(); lf.frequency.value = p.vr ?? 5.5; vib.gain.value = p.vib; lf.connect(vib); lf.start(t); lf.stop(t + L + 0.05); }
    for (const iv of ivs) for (let v=0; v<u; v++) ws.forEach((w, wi) => {
      const o = osc(); if (p.wave) o.setPeriodicWave(getWave(p.wave)); else o.type = w; const fr = mtof(base + iv);
      o.detune.value += u > 1 ? (v / (u - 1) - 0.5) * 2 * (p.dt ?? 12) : ws.length > 1 ? (wi % 2 ? 1 : -1) * (p.dt ?? 0) : 0;
      if (p.gl){ o.frequency.setValueAtTime(mtof(base + iv + p.gl), t); o.frequency.exponentialRampToValueAtTime(fr, t + (p.glt ?? 0.08)); } else o.frequency.value = fr;
      if (p.fm){ const m = osc(), mg = ac.createGain(), idx = fr * (p.fi ?? 1.5); m.frequency.value = fr * p.fm; mg.gain.setValueAtTime(idx, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * (p.fs ?? 0.1)), t + (p.fmd ?? 0.3) * DK); m.connect(mg); mg.connect(o.frequency); m.start(t); m.stop(t + L + 0.05); }
      if (vib) vib.connect(o.detune);
      o.connect(f); o.start(t); o.stop(t + L + 0.05);
    });
    if (p.sub){ const s = osc(), sg = ac.createGain(); s.frequency.value = mtof(base - 12); sg.gain.value = p.sub; s.connect(sg); sg.connect(g); s.start(t); s.stop(t + L + 0.05); }
    if (p.nz){ const nn = noise(t, Math.min(L, p.nd ?? 0.05) + 0.02), nf = filt('bandpass', p.nf ?? 3000, 0.8), ng = ac.createGain(); decay(ng, t, p.nz, p.nd ?? 0.05); nn.connect(nf); nf.connect(ng); ng.connect(g); }
  },
  // ---------- модальный: бруски, стекло, колокола, мембраны, пластины ----------
  modal(t, n, p){
    const set = MODES[p.m || 'bar'], ivs = p.ch ? CH(p.ch, n) : [0], d = p.d ?? 0.6, br = p.br ?? 0.8;
    const l = ac.createGain(), sum = ac.createGain(); l.gain.value = (p.lvl ?? 0.3) / Math.sqrt(ivs.length);
    let Lmax = 0;
    for (const iv of ivs){
      const fr = p.f ? p.f * Math.pow(2, (PIT + iv) / 12) : mtof(P.root + (p.o ?? 48) + noteOf(n) + iv);
      set.forEach(([r, a, dm], k) => {
        const f = fr * r; if (f > 16000) return;
        const o = osc(), g = ac.createGain(), len = d * dm;
        if (p.pd){ o.frequency.setValueAtTime(f * p.pd, t); o.frequency.exponentialRampToValueAtTime(f, t + (p.pt ?? 0.03)); } else o.frequency.value = f;
        decay(g, t, a * Math.pow(br, k), len, p.a ?? 0.001); o.connect(g); g.connect(sum); o.start(t); o.stop(t + len * DK + 0.05); Lmax = Math.max(Lmax, len * DK);
      });
      if (p.nz){ const nn = noise(t, 0.03), nf = filt('bandpass', Math.min(12000, fr * (p.nr ?? 3)), 1), ng = ac.createGain(); decay(ng, t, p.nz, p.nd ?? 0.012); nn.connect(nf); nf.connect(ng); ng.connect(sum); }
    }
    procChain(sum, p, t, Lmax, p.f || mtof(P.root + (p.o ?? 48))).connect(l); l.connect(out(p.rev ?? 0.2, p.del ?? 0, Lmax + 0.2));
  },
  // ---------- щипковая струна (Karplus-Strong) ----------
  pluck(t, n, p){
    const ivs = p.ch ? CH(p.ch, n) : [0], d = p.d ?? 1.2, l = ac.createGain(), sum = ac.createGain();
    l.gain.value = (p.lvl ?? 0.35) / Math.sqrt(ivs.length);
    ivs.forEach((iv, k) => {
      const fr = mtof(P.root + (p.o ?? 36) + noteOf(n) + iv), kb = ksBuffer(fr, p.damp ?? 0.996, p.bright ?? 0.6, Math.min(3, d + 0.2));
      const s = ac.createBufferSource(), g = ac.createGain(), tt = t + k * (p.strum ?? 0);
      s.buffer = kb.buf; s.playbackRate.value = kb.rate * Math.pow(2, PIT / 12);
      g.gain.setValueAtTime(1, tt); g.gain.setTargetAtTime(0.0001, tt + d * DK * 0.7, d * DK * 0.15);
      s.connect(g); g.connect(sum); s.start(tt); s.stop(tt + d * DK + 0.3);
    });
    let node = sum;
    if (p.f){ const f = filt('lowpass', p.f, p.q ?? 0.8); node.connect(f); node = f; }
    if (p.k){ const sh = shaper(p.k); node.connect(sh); node = sh; }
    node = procChain(node, p, t, d * DK, mtof(P.root + (p.o ?? 36)));
    node.connect(l); l.connect(out(p.rev ?? 0.15, p.del ?? 0, d + 0.4));
  },
  // ---------- голос: пила/шум через три форманты гласной (можно «переход» гласных) ----------
  vox(t, n, p){
    const ivs = p.ch ? CH(p.ch, n) : [0], u = p.u || 1, base = P.root + (p.o ?? 36) + noteOf(n);
    const g = ac.createGain(), l = ac.createGain();
    const L = envAmp(g, t, 1, p.a ?? 0.02, p.h ?? 0.05, p.d ?? 0.3);
    l.gain.value = (p.lvl ?? 1.4) / Math.sqrt(ivs.length * u);
    const src = ac.createGain(), v1 = VOWELS[p.v || 'a'], v2 = VOWELS[p.v2 || p.v || 'a'];
    [0, 1, 2].forEach(k => {
      const b = filt('bandpass', v1[k], p.q ?? 7), bg = ac.createGain(); bg.gain.value = [1, 0.55, 0.3][k];
      if (p.v2){ b.frequency.setValueAtTime(v1[k], t); b.frequency.exponentialRampToValueAtTime(v2[k], t + L * 0.8); }
      src.connect(b); b.connect(bg); bg.connect(g);
    });
    let node = g; if (p.k){ const s = shaper(p.k); g.connect(s); node = s; }
    node = procChain(node, p, t, L, mtof(base));   // общая обработка (полоса «мегафона», дробление и т. п.)
    node.connect(l); l.connect(out(p.rev ?? 0.25, p.del ?? 0, L + 0.2));
    if (p.m === 'noise'){ const nn = loopNoise(t, L); nn.connect(src); return; }
    let vib = null;
    if (p.vib !== 0){ const lf = ac.createOscillator(); vib = ac.createGain(); lf.frequency.value = 5; vib.gain.value = p.vib ?? 12; lf.connect(vib); lf.start(t); lf.stop(t + L + 0.05); }
    for (const iv of ivs) for (let v=0; v<u; v++){
      const o = osc(); o.type = p.w || 'sawtooth'; o.frequency.value = mtof(base + iv);
      if (u > 1) o.detune.value += (v / (u - 1) - 0.5) * 2 * (p.dt ?? 10);
      if (vib) vib.connect(o.detune);
      o.connect(src); o.start(t); o.stop(t + L + 0.05);
    }
    if (p.nz){ const nn = noise(t, 0.06), hp = filt('highpass', 3000), ng = ac.createGain(); decay(ng, t, p.nz, 0.04); nn.connect(hp); hp.connect(ng); ng.connect(g); }
  },
  // ---------- FX: райзеры, падения, удары, тарелки, глитчи ----------
  fx(t, p){
    const ss = stepSec(), lvl = p.lvl ?? 0.3, m = p.m, d = (p.d ?? 0.5) * DK;
    const end = (node, len) => node.connect(out(p.rev ?? 0.3, p.del ?? 0, len + 0.3));
    if (m === 'rise' || m === 'down' || m === 'swell'){
      const Ln = (p.L ?? 8) * ss, up = m !== 'down', s = loopNoise(t, Ln), g = ac.createGain();
      const f = filt(m === 'swell' ? 'highpass' : 'bandpass', p.f0 ?? (up ? 300 : 8000), m === 'swell' ? 0.7 : 1.5);
      if (m !== 'swell'){ f.frequency.setValueAtTime(p.f0 ?? (up ? 300 : 8000), t); f.frequency.exponentialRampToValueAtTime(p.f1 ?? (up ? 9000 : 200), t + Ln); }
      g.gain.setValueAtTime(up ? 0.0001 : lvl, t); g.gain.exponentialRampToValueAtTime(up ? lvl : 0.0001, t + Ln);
      if (up) g.gain.setTargetAtTime(0.0001, t + Ln, 0.015);
      s.connect(f); f.connect(g); end(g, Ln);
      if (p.tone){ const o = osc(), og = ac.createGain(), lp = filt('lowpass', 3000); o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(P.root + 24), t); o.frequency.exponentialRampToValueAtTime(mtof(P.root + 60), t + Ln);
        og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(lvl * 0.25, t + Ln); og.gain.setTargetAtTime(0.0001, t + Ln, 0.015);
        o.connect(lp); lp.connect(og); end(og, Ln); o.start(t); o.stop(t + Ln + 0.1); }
      return;
    }
    if (m === 'impact' || m === 'subdrop'){
      const o = osc(), g = ac.createGain(), f = p.f ?? 70; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.35, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl * 2, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      let node = g; if (p.k){ const s = shaper(p.k); g.connect(s); node = s; }
      o.connect(g); end(node, d); o.start(t); o.stop(t + d + 0.05);
      if (m === 'impact'){ const n = noise(t, 0.6), lp = filt('lowpass', 1200), ng = ac.createGain(); decay(ng, t, lvl, 0.5); n.connect(lp); lp.connect(ng); end(ng, 0.6); }
      return;
    }
    if (m === 'zap'){ const o = osc(), g = ac.createGain(); o.type = p.w || 'square'; o.frequency.setValueAtTime(p.f0 ?? 2500, t); o.frequency.exponentialRampToValueAtTime(p.f1 ?? 80, t + d); decay(g, t, lvl, p.d ?? 0.1); o.connect(g); end(g, d); o.start(t); o.stop(t + d + 0.05); return; }
    if (m === 'noise'){ const n = noise(t, (p.d ?? 0.3) + 0.05), f = filt('bandpass', p.f ?? 3000, 0.7), g = ac.createGain(); decay(g, t, lvl, p.d ?? 0.3); n.connect(f); f.connect(g); end(g, d); return; }
    if (m === 'bit'){
      const o = osc(), g = ac.createGain(), s = shaper(8), dt = p.slow ? 0.05 : 0.018; o.type = 'square';
      for (let x=0; x<d; x+=dt) o.frequency.setValueAtTime(200 + Math.random() * 2400, t + x);
      decay(g, t, lvl * 0.5, p.d ?? 0.2); o.connect(g); g.connect(s); end(s, d); o.start(t); o.stop(t + d + 0.05); return;
    }
    if (m === 'stop'){ const o = osc(), g = ac.createGain(), lp = filt('lowpass', 2000); o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(P.root + 36), t); o.frequency.exponentialRampToValueAtTime(20, t + d);
      g.gain.setValueAtTime(lvl * 0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp); lp.connect(g); end(g, d); o.start(t); o.stop(t + d + 0.05); return; }
    if (m === 'siren'){
      const o = osc(), lf = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), f = p.f ?? 900; o.type = p.sq ? 'square' : 'sawtooth'; o.frequency.value = f;
      lf.type = p.sq ? 'square' : 'sine'; lf.frequency.value = p.rate ?? 3; lg.gain.value = f * 0.35; lf.connect(lg); lg.connect(o.frequency);
      envAmp(g, t, lvl * 0.4, 0.05, (p.d ?? 1) * 0.6, (p.d ?? 1) * 0.4); const lp = filt('lowpass', 3500); o.connect(lp); lp.connect(g); end(g, d);
      o.start(t); o.stop(t + d + 0.1); lf.start(t); lf.stop(t + d + 0.1); return;
    }
    if (m === 'scratch'){
      const n = noise(t, (p.d ?? 0.25) + 0.05), f = filt('bandpass', 1500, 3), lf = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
      lf.type = 'triangle'; lf.frequency.value = 9; lg.gain.value = 1100; lf.connect(lg); lg.connect(f.frequency); decay(g, t, lvl, p.d ?? 0.25);
      n.connect(f); f.connect(g); end(g, d); lf.start(t); lf.stop(t + d + 0.1); return;
    }
    if (m === 'vinyl'){
      const Ln = (p.L ?? 16) * ss, hiss = loopNoise(t, Ln), hf = filt('bandpass', 3000, 0.5), hg = ac.createGain(); hg.gain.setValueAtTime(lvl * 0.08, t); hg.gain.setTargetAtTime(0.0001, t + Ln, 0.05);
      hiss.connect(hf); hf.connect(hg); end(hg, Ln);
      for (let k=0; k<14; k++){ const tt = t + Math.random() * Ln, c = noise(tt, 0.01), hp = filt('highpass', 2500), cg = ac.createGain(); decay(cg, tt, lvl * (0.2 + Math.random() * 0.6), 0.004); c.connect(hp); hp.connect(cg); end(cg, 0.05); }
      return;
    }
    if (m === 'air' || m === 'thunder'){
      const n = loopNoise(t, d), f = filt(m === 'air' ? 'highpass' : 'lowpass', m === 'air' ? 5000 : 260, 0.7), g = ac.createGain();
      envAmp(g, t, lvl, m === 'air' ? 0.4 : 0.04, 0.1, p.d ?? 2); n.connect(f); let node = f;
      if (m === 'thunder'){ const s = shaper(3); f.connect(s); node = s; }
      node.connect(g); end(g, d); return;
    }
    if (m === 'metal'){
      const f = p.f ?? 300, g = ac.createGain(); decay(g, t, lvl, p.d ?? 1.5); end(g, d);
      [[1, 1], [2.76, 0.6], [5.4, 0.4], [8.93, 0.25]].forEach(([r, a]) => { const o = osc(), og = ac.createGain(); o.frequency.value = f * r; og.gain.value = a * 0.5; o.connect(og); og.connect(g); o.start(t); o.stop(t + d + 0.05); });
      return;
    }
    if (m === 'cym'){
      metallic(t, p.d ?? 1.5, lvl * 0.6, p.rev ?? 0.2, p.mult ?? 1.7, p.bpf ?? 8000);
      const n = noise(t, (p.d ?? 1.5) + 0.05), hp = filt('highpass', p.f ?? 6000), g = ac.createGain(); decay(g, t, lvl * 0.5, p.d ?? 1.5); n.connect(hp); hp.connect(g); end(g, d); return;
    }
  },
};

// ---------- теги жанров: короткие группы ----------
const TAG_GROUPS = {
  '4x4': 'techno melodic deephouse house techhouse proghouse trance acid minimal dubtechno',
  house4: 'deephouse house techhouse ukg', dark: 'hardtechno ebm electropunk dubstep trap', brk: 'breaks dnb electro', chill: 'ambient dubtechno idm deephouse',
};
const expandTags = s => [...new Set((s || '').split(/\s+/).filter(Boolean).flatMap(x => (TAG_GROUPS[x] || x).split(/\s+/)))];

// подстройка громкости (дБ) по замеру офлайн-рендером (пиковая громкость в окне 50 мс):
// новые звуки — в пределах ±4 дБ от медианы старых своей категории, поправка не больше 8 дБ
const TRIM = {
  kick_click:0.5, sn_noise:2.5, sn_rimclick:8, sn_sidestick:8, sn_brush:8, sn_lofirim:5.5, sn_short:8, cl_dirty:-4.5,
  cl_finger:4, hat_garage:-1, hat_noise:-3, hat_metal:-2.5, hat_shaker:-2.5, hat_crisp:8, ohat_house:-6, ride_dark:-5,
  ride_bright:-8, ride_bell:-8, tom_low:-8, tom_mid:-8, tom_high:-7, tom_electro:-8, tom_syn:-4.5, conga_low:-3.5,
  conga_high:-1, timbale:-2, logdrum:-8, tabla:-2, djembe:-3, udu:-5.5, anvil:-1, snap_perc:1,
  click_perc:6, cabasa:5.5, shaker2:8, sub_sine:-3, bass_808glide:-3, bass_808dist:-1.5, bass_saw2:5.5, bass_square:1.5,
  bass_pluck:7.5, bass_funk:5, bass_organ:-1, bass_dubsub:-2.5, bass_rolling:7.5, bass_trance:6, rumble2:-1.5, bass_hoover:0.5,
  bass_detuned:3, bass_glidesub:-2, lead_square:-0.5, lead_sync2:3.5, lead_chip:4.5, arp_chip:7.5, pluck_bright:1, lead_rave:0.5,
  hoover2:0.5, lead_whistle:-3, lead_flute:-6, lead_laser:4.5, lead_vintage:0.5, lead_porta:1.5, lead_detuned:2.5, arp_square:3,
  arp_saw:7, stab_house:1.5, stab_organ:-4.5, stab_trance:0.5, stab_hoover:4.5, stab_glitch:2.5, piano_bright:-0.5, organ_church:-2,
  harpsichord:5, toy_piano:0.5, clav2:2, pad_analog:-1, pad_ice:-1.5, pad_pwm:-0.5, pad_ambient:-5.5, pad_dream:-2,
  pad_organ:-3.5, pad_bell:-1, pad_subdrone:-7, choir_pad:-7.5, vox_ah:-9, vox_oh:-6.5, chop_hi:-7, choir_ah:-9,
  choir_oh:-11, vox_robot:-10, vox_hey:-6.5, vox_vocoder:-8, chant_low:-9.5, orch_hit:2, bowed_glass:-2, crash_short:1.5,
  china:0.5, riser_bar:2.5, riser_half:6, uplifter:8, downlifter:4.5, impact_big:-8, sub_drop:-8, noise_hit:2.5,
  laser2:2.5, zap2:0.5, glitch2:-5, bitcrush:-8, scratch:5.5, vinyl_noise:8, drop_boom:-12, vox_ee:-6,
  vox_oo:-6, chop_lo:-6, vox_whisper:-5, vox_breath:-3, sn_dnb:-2.5, hat_dusty:5.5, ohat_trance:-3.5, bass_monosaw:2,
  kick_tunnel:-0.5, sn_bit:4, sn_ring:6.5, sn_tube:2, ohat_phase:-5.5, ride_plate:-6, steelpan_hit:-3.5, glass_hit:-0.5,
  gong:-7.5, tube_hit:-1, membrane_low:-6, kalimba_hit:-3, bass_ring:1.5, bass_crush:4, lead_vocal:-2, lead_digibell:1,
  lead_pulse12:5, lead_ring:2, glass_mallet:-1.5, chord_ring:5, chord_bell:-1, pad_organ2:-4, gong_hit:-6.5, bass_squelch:3,
};
// регистрация: звук появляется в библиотеке, синтезаторе и (по тегам) в жанрах GEN
function addSounds(cat, eng, list){
  for (const [id, name, p, tags] of list){
    if (SYNTH[id]){ console.warn('duplicate sound', id); continue; }
    const e = ENG[eng];
    const tonal = eng === 'tone' || eng === 'vox' || eng === 'pluck' || (eng === 'modal' && !p.f);
    const g = Math.pow(10, (TRIM[id] || 0) / 20), run = tonal || eng === 'modal' ? (t, n) => e(t, n, p) : t => e(t, p);
    SYNTH[id] = g === 1 ? run : (t, n) => { const v0 = VEL; VEL *= g; try { run(t, n); } finally { VEL = v0; } };
    const item = { id, name, cat }; LIB.push(item); LIBM[id] = item;
    SND_META[id] = { g: expandTags(tags), chord: !!p.ch, len: p.L || 0, m: p.m || '' };
    if (tonal){ MELODIC.push(id); BASE[id] = p.o ?? (eng === 'modal' ? 48 : 36); }
  }
}
const C3 = [0,3,7], C4 = [0,3,7,10], C9 = [0,3,7,10,14];

addSounds('Kicks', 'kick', [
  ['kick_berlin', 'Berlin Kick', { f0:175, f1:52, sw:0.04, h:0.05, d:0.27, k:2, c:0.25, comb:9, cfb:0.5 }, 'techno melodic minimal'],
  ['kick_warehouse', 'Warehouse Kick', { f0:200, f1:48, sw:0.05, h:0.06, d:0.35, k:3, c:0.2, rev:0.05 }, 'techno hardtechno'],
  ['kick_peak', 'Peak Kick', { f0:220, f1:52, sw:0.035, h:0.05, d:0.25, k:4, c:0.35, drv:1 }, 'techno hardtechno trance'],
  ['kick_industrial', 'Industrial Kick', { f0:240, f1:45, sw:0.05, h:0.07, d:0.38, k:9, c:0.3, lp:6000 }, 'hardtechno ebm'],
  ['kick_rave', 'Rave Kick', { f0:260, f1:55, sw:0.03, h:0.08, d:0.3, k:6, fold:2, c:0.4, lvl:0.6 }, 'hardtechno breaks'],
  ['kick_hardstyle', 'Hardstyle Kick', { f0:300, f1:60, sw:0.06, h:0.12, d:0.35, k:20, c:0.3, lp:4500, w:'triangle', lvl:0.55 }, 'hardtechno'],
  ['kick_trance', 'Trance Kick', { f0:180, f1:50, sw:0.04, h:0.06, d:0.32, k:2.5, c:0.3 }, 'trance proghouse'],
  ['kick_house', 'House Kick', { f0:140, f1:55, sw:0.06, h:0.07, d:0.24, k:1, w:'triangle', lp:2200, c:0.12 }, 'house deephouse techhouse ukg'],
  ['kick_disco', 'Disco Kick', { f0:130, f1:55, sw:0.05, h:0.03, d:0.22, k:1, c:0.15, lp:3000 }, 'house deephouse'],
  ['kick_thump', 'Deep Thump', { f0:120, f1:45, sw:0.06, h:0.05, d:0.4, k:1, c:0.08, lp:1500 }, 'deephouse dubtechno minimal ambient'],
  ['kick_soft', 'Soft Kick', { f0:110, f1:48, sw:0.05, h:0.02, d:0.25, k:0.5, c:0.05, lp:1200 }, 'ambient idm dubtechno'],
  ['kick_sub', 'Sub Kick', { f0:90, f1:40, sw:0.05, h:0.1, d:0.6, k:1, c:0.05 }, 'dubstep trap ambient'],
  ['kick_808long', '808 Long', { f0:130, f1:45, sw:0.08, h:0.1, d:1.1, k:3, c:0.25, f2:0.9, lvl:0.65 }, 'trap electro'],
  ['kick_808boom', '808 Boom', { f0:120, f1:40, sw:0.1, h:0.2, d:1.4, k:6, c:0.2, lvl:0.55 }, 'trap dubstep'],
  ['kick_trap', 'Trap Kick', { f0:200, f1:50, sw:0.03, h:0.04, d:0.22, k:5, c:0.45 }, 'trap'],
  ['kick_dnb', 'DnB Kick', { f0:210, f1:55, sw:0.025, h:0.03, d:0.18, k:3, c:0.5, cf:4000 }, 'dnb breaks'],
  ['kick_break', 'Break Kick', { f0:180, f1:58, sw:0.03, h:0.02, d:0.16, k:4, c:0.4, lp:5000 }, 'breaks dnb'],
  ['kick_garage', 'Garage Kick', { f0:160, f1:50, sw:0.04, h:0.04, d:0.24, k:2, c:0.3 }, 'ukg house'],
  ['kick_electro', 'Electro Kick', { f0:150, f1:50, sw:0.06, h:0.05, d:0.4, k:1, fold:2.2, c:0.25 }, 'electro synthwave'],
  ['kick_synthwave', 'Synthwave Kick', { f0:170, f1:52, sw:0.04, h:0.05, d:0.3, k:2, c:0.35, rev:0.15 }, 'synthwave'],
  ['kick_gated', 'Gated Kick', { f0:180, f1:50, sw:0.04, h:0.12, d:0.08, k:3, c:0.3, rev:0.3 }, 'synthwave breaks'],
  ['kick_tape', 'Tape Kick', { f0:140, f1:50, sw:0.05, h:0.04, d:0.28, k:2.5, c:0.12, lp:2000 }, 'idm ambient deephouse'],
  ['kick_glitch', 'Glitch Kick', { f0:400, f1:60, sw:0.015, h:0.01, d:0.12, k:6, c:0.5, cf:6000 }, 'idm minimal'],
  ['kick_click', 'Click Thump', { f0:250, f1:65, sw:0.02, h:0.01, d:0.14, k:1, c:0.6, cf:5000 }, 'minimal idm techhouse'],
  ['kick_dub', 'Dub Kick', { f0:140, f1:44, sw:0.06, h:0.05, d:0.45, k:1.5, c:0.1, rev:0.12 }, 'dubtechno dubstep'],
]);

addSounds('Snares', 'snare', [
  ['sn_dnb', 'DnB Snare', { ft:260, ta:0.8, td:0.07, nf:3800, nq:0.9, na:1, nd:0.16, k:3, fold:1.8, rev:0.15 }, 'dnb breaks'],
  ['sn_jungle', 'Jungle Snare', { ft:280, ta:0.6, td:0.06, nf:4000, nq:0.5, na:0.9, nd:0.12, k:10, rev:0.1, lvl:0.35 }, 'dnb breaks'],
  ['sn_break', 'Break Snare', { ft:200, ta:0.6, td:0.1, nf:2400, na:0.9, nd:0.22, k:5, rev:0.18 }, 'breaks electro'],
  ['sn_trap', 'Trap Snare', { ft:210, ta:0.5, td:0.07, nf:3500, nq:0.8, na:0.9, nd:0.16, k:3, rev:0.25 }, 'trap'],
  ['sn_gated', 'Gated Snare', { ft:190, ta:0.6, nf:2200, na:1, nd:0.3, k:2, rev:0.6 }, 'synthwave'],
  ['sn_synthwave', 'Synthwave Snare', { ft:180, ta:0.7, td:0.12, nf:2000, na:1, nd:0.35, rev:0.5, lvl:0.4 }, 'synthwave'],
  ['sn_tight', 'Tight Snare', { ft:300, ta:0.5, td:0.05, nf:5000, nq:1, na:0.8, nd:0.08, k:4, rev:0.08 }, 'techhouse minimal dnb'],
  ['sn_fat', 'Fat Snare', { ft:170, ta:0.8, td:0.13, nf:1800, na:1, nd:0.3, k:7, rev:0.2, lvl:0.38 }, 'dubstep breaks hardtechno'],
  ['sn_noise', 'Noise Snare', { ta:0, nf:3000, nt:'highpass', nq:0.5, na:0.9, nd:0.2, rev:0.2 }, 'techno electro idm'],
  ['sn_electro', 'Electro Snare', { ft:250, ta:0.7, td:0.07, nf:4500, nq:1.2, na:0.8, nd:0.12, k:3, rev:0.15 }, 'electro ebm'],
  ['sn_rimclick', 'Rim Click', { ft:900, tw:'square', ta:0.5, td:0.02, nf:4000, nq:2, na:0.3, nd:0.02, rev:0.1, lvl:0.35 }, 'minimal techhouse deephouse dubtechno'],
  ['sn_sidestick', 'Side Stick', { ft:600, ta:0.6, td:0.025, nf:2500, nq:3, na:0.4, nd:0.03, rev:0.15, lvl:0.35 }, 'deephouse ukg idm'],
  ['sn_piccolo', 'Piccolo Snare', { ft:420, ta:0.6, td:0.06, nf:6000, na:0.8, nd:0.1, k:3, rev:0.12 }, 'dnb idm'],
  ['sn_industrial', 'Industrial Snare', { ft:160, ta:0.8, td:0.1, nf:1500, na:1, nd:0.25, k:16, rev:0.25, lvl:0.32 }, 'ebm hardtechno'],
  ['sn_dub', 'Dub Snare', { ft:200, ta:0.6, td:0.08, nf:2200, na:0.8, nd:0.18, k:2, rev:0.4, del:0.35 }, 'dubtechno dubstep'],
  ['sn_clapsnare', 'Clap Snare', { ft:220, ta:0.5, td:0.07, nf:1400, nq:0.9, na:1, nd:0.25, k:3, rev:0.3 }, 'house trance proghouse'],
  ['sn_brush', 'Brush', { ta:0, nf:5000, nt:'highpass', na:0.5, nd:0.25, rev:0.15, lvl:0.4 }, 'ambient idm deephouse'],
  ['sn_lofirim', 'Lo-Fi Rim', { ft:700, tw:'square', ta:0.4, td:0.03, nf:2000, nq:2, na:0.3, nd:0.04, k:4, lvl:0.3 }, 'idm ambient minimal'],
  ['sn_short', 'Short Snare', { ft:260, ta:0.4, td:0.04, nf:3500, na:0.8, nd:0.06, rev:0.1 }, 'trance techno dnb'],
]);

addSounds('Claps', 'clap', [
  ['cl_trap', 'Trap Clap', { n:3, sp:0.008, d:0.22, f:1500, q:1, rev:0.25 }, 'trap'],
  ['cl_house', 'House Clap', { n:4, sp:0.012, d:0.3, f:1200, rev:0.35 }, 'house deephouse techhouse'],
  ['cl_wide', 'Wide Clap', { n:5, sp:0.015, d:0.55, f:700, q:0.5, rev:0.5 }, 'trance proghouse synthwave'],
  ['cl_dry', 'Dry Clap', { n:3, sp:0.01, d:0.15, f:1400, rev:0.05 }, 'techno minimal techhouse'],
  ['cl_verb', 'Reverb Clap', { n:3, sp:0.011, d:0.4, f:1300, rev:0.8 }, 'dubtechno ambient melodic'],
  ['cl_snap', 'Snap Clap', { n:2, sp:0.006, d:0.12, f:2200, q:1.5, rev:0.2 }, 'ukg deephouse trap'],
  ['cl_garage', 'Garage Clap', { n:4, sp:0.01, d:0.26, f:1600, rev:0.3 }, 'ukg'],
  ['cl_dirty', 'Dirty Clap', { n:3, sp:0.012, d:0.3, f:1000, k:8, rev:0.2, lvl:0.6 }, 'hardtechno ebm techno'],
  ['cl_finger', 'Finger Snap', { n:1, sp:0.005, d:0.08, f:2800, q:2, rev:0.2, lvl:0.9 }, 'deephouse ukg trap ambient'],
  ['cl_group', 'Group Clap', { n:8, sp:0.009, d:0.35, f:1700, q:0.8, rev:0.4 }, 'house techhouse'],
  ['cl_short', 'Short Clap', { n:3, sp:0.008, d:0.1, f:1500, rev:0.1 }, 'electro minimal idm'],
  ['cl_gated', 'Gated Clap', { n:4, sp:0.02, d:0.6, f:900, q:0.6, rev:0.9 }, 'synthwave breaks'],
]);

addSounds('Hats & Cymbals', 'hat', [
  ['hat_soft', 'Soft Hat', { m:'noise', f:2500, bp:5000, d:0.07, chorus:1, lvl:0.18 }, 'deephouse ambient dubtechno'],
  ['hat_trap', 'Trap Hat', { d:0.04, lvl:0.22, mult:1.3, bpf:9000 }, 'trap'],
  ['hat_garage', 'Garage Hat', { m:'noise', f:7000, d:0.06, lvl:0.24 }, 'ukg house'],
  ['hat_dnb', 'DnB Hat', { d:0.04, lvl:0.22, mult:1.9, bpf:9000 }, 'dnb breaks'],
  ['hat_noise', 'Noise Hat', { m:'noise', f:6000, q:0.7, d:0.08, lvl:0.22 }, 'techno electro'],
  ['hat_metal', 'Metal Hat', { d:0.06, lvl:0.2, mult:2.1, bpf:8000 }, 'hardtechno ebm idm'],
  ['hat_dusty', 'Dusty Hat', { m:'noise', f:4000, bp:6000, d:0.06, crush:3, lvl:0.25 }, 'idm ambient deephouse'],
  ['hat_shaker', 'Shaker Hat', { m:'noise', f:5500, bp:6500, d:0.07, lvl:0.25 }, 'house deephouse techhouse ukg'],
  ['hat_crisp', 'Crisp Hat', { m:'noise', f:10000, d:0.025, lvl:0.25 }, 'dnb minimal idm'],
  ['ohat_long', 'Long Open Hat', { d:0.5, lvl:0.16, rev:0.1 }, 'techno trance proghouse'],
  ['ohat_short', 'Short Open Hat', { d:0.16, lvl:0.18 }, 'house techhouse ukg'],
  ['ohat_trance', 'Trance Open Hat', { m:'noise', f:9000, d:0.35, comb:0.6, cfb:0.6, lvl:0.18, rev:0.15 }, 'trance proghouse'],
  ['ohat_house', 'House Open Hat', { m:'noise', f:6500, d:0.22, lvl:0.2 }, 'house deephouse'],
  ['ohat_sizzle', 'Sizzle Hat', { d:0.7, lvl:0.12, mult:1.9, rev:0.15 }, 'melodic dubtechno ambient'],
  ['ride_dark', 'Dark Ride', { d:0.9, lvl:0.1, mult:1.15, bpf:7000, rev:0.15 }, 'dnb techno dubtechno'],
  ['ride_bright', 'Bright Ride', { d:0.7, lvl:0.12, mult:3.2, bpf:9000 }, 'trance dnb house'],
]);
addSounds('Hats & Cymbals', 'perc', [
  ['ride_bell', 'Ride Bell', { w:'square', f:1600, pd:1, d:0.6, fm:1.47, fi:1.2, bp:3000, q:1, lvl:0.12, rev:0.15 }, 'house techhouse dnb'],
]);

addSounds('Toms & Perc', 'perc', [
  ['tom_low', 'Low Tom', { f:90, pd:1.8, pt:0.15, d:0.4, k:1.5, lvl:0.6, rev:0.15 }, 'breaks dnb synthwave'],
  ['tom_mid', 'Mid Tom', { f:140, pd:1.8, pt:0.12, d:0.32, k:1.5, lvl:0.55, rev:0.15 }, 'breaks dnb synthwave techno'],
  ['tom_high', 'High Tom', { f:210, pd:1.7, pt:0.1, d:0.26, k:1.5, lvl:0.5, rev:0.15 }, 'breaks synthwave techno'],
  ['tom_electro', 'Electro Tom', { f:110, pd:2.5, pt:0.2, d:0.4, w:'triangle', k:3, lvl:0.5, rev:0.2 }, 'electro synthwave ebm'],
  ['tom_syn', 'Syn Tom', { f:160, pd:3, pt:0.25, d:0.35, nz:0.2, lvl:0.5, rev:0.25 }, 'synthwave idm'],
  ['conga_low', 'Low Conga', { f:200, pd:1.3, pt:0.02, d:0.22, lvl:0.5, nz:0.15, nd:0.01 }, 'house deephouse techhouse'],
  ['conga_high', 'High Conga', { f:330, pd:1.25, pt:0.015, d:0.16, lvl:0.45, nz:0.15, nd:0.01 }, 'house deephouse techhouse'],
  ['bongo_high', 'High Bongo', { f:480, pd:1.2, pt:0.01, d:0.1, lvl:0.42, nz:0.1, nd:0.008 }, 'house techhouse minimal'],
  ['timbale', 'Timbale', { f:520, pd:1.1, d:0.25, w:'triangle', o2:1.5, lvl:0.35, rev:0.2 }, 'house techhouse'],
  ['cowbell2', 'Cowbell 2', { f:560, pd:1, d:0.18, w:'square', o2:1.48, bp:1200, q:3, lvl:0.25 }, 'electro house trap'],
  ['agogo', 'Agogo', { f:900, pd:1, d:0.15, w:'triangle', o2:1.5, lvl:0.3 }, 'house deephouse'],
  ['woodblock', 'Woodblock', { f:1000, pd:1.1, d:0.05, bp:1200, q:4, lvl:0.6 }, 'minimal idm deephouse'],
  ['clave_hi', 'High Clave', { f:2500, pd:1, d:0.04, lvl:0.4 }, 'minimal techhouse'],
  ['logdrum', 'Log Drum', { f:110, pd:2, pt:0.04, pe:0.9, d:0.45, o2:2.01, k:2, lvl:0.55 }, 'deephouse techhouse'],
  ['tabla', 'Tabla', { f:300, pd:1.6, pt:0.06, pe:1.25, d:0.25, fm:2.3, fi:0.6, lvl:0.4 }, 'idm minimal deephouse'],
  ['djembe', 'Djembe', { f:180, pd:1.5, pt:0.03, d:0.2, nz:0.3, nd:0.02, nf:2000, lvl:0.5 }, 'techhouse deephouse'],
  ['udu', 'Udu', { f:130, pd:0.7, pt:0.08, d:0.3, lvl:0.5, rev:0.2 }, 'idm ambient'],
  ['metal_ping', 'Metal Ping', { f:1300, pd:1, d:0.4, fm:3.5, fi:2, lvl:0.18, rev:0.3, del:0.2 }, 'techno melodic idm'],
  ['anvil', 'Anvil', { f:800, pd:1, d:0.5, fm:2.76, fi:4, k:3, lvl:0.15, rev:0.25 }, 'hardtechno ebm'],
  ['pipe', 'Pipe', { f:600, pd:1, d:0.3, w:'triangle', o2:2.76, lvl:0.25, rev:0.2 }, 'idm minimal'],
  ['snap_perc', 'Snap Perc', { f:2000, pd:2, pt:0.005, d:0.03, nz:0.5, nd:0.015, nf:4000, lvl:0.35 }, 'techhouse minimal idm'],
  ['zap_perc', 'Zap Perc', { f:200, pd:20, pt:0.06, d:0.1, w:'square', fold:2, lvl:0.2 }, 'electro idm'],
  ['click_perc', 'Click Perc', { f:3000, pd:1, d:0.012, w:'square', lvl:0.25 }, 'minimal idm'],
  ['triangle_long', 'Long Triangle', { f:2600, pd:1, d:1.2, o2:2.76, lvl:0.1, rev:0.2 }, 'ambient trance'],
  ['glass_perc', 'Glass', { f:1800, pd:1, d:0.35, fm:3.01, fi:1, lvl:0.15, rev:0.3 }, 'idm ambient melodic'],
]);
addSounds('Toms & Perc', 'hat', [
  ['cabasa', 'Cabasa', { m:'noise', f:4000, bp:5000, d:0.09, lvl:0.25 }, 'house deephouse ukg'],
  ['shaker2', 'Shaker 2', { m:'noise', f:6000, bp:8000, d:0.05, lvl:0.25 }, 'techhouse minimal ukg'],
]);

addSounds('Bass', 'tone', [
  ['sub_sine', 'Sub Sine', { w:'sine', o:12, a:0.005, h:0.1, d:0.3, f:400, lvl:0.7, k:0.5 }, 'dubstep trap dnb ukg deephouse ambient'],
  ['sub_pulse', 'Sub Pulse', { w:'square', o:12, d:0.2, f:250, q:0.7, lvl:0.45 }, 'techno electro'],
  ['bass_808glide', '808 Glide', { w:'sine', o:12, h:0.15, d:0.8, f:600, k:2, gl:7, glt:0.08, lvl:0.65 }, 'trap ukg'],
  ['bass_808dist', '808 Distorted', { w:'sine', o:12, h:0.1, d:0.7, f:2000, k:8, lvl:0.45 }, 'trap dubstep'],
  ['bass_808short', '808 Short', { w:'sine', o:12, d:0.25, f:800, k:3, gl:5, glt:0.04, lvl:0.6 }, 'trap electro ukg'],
  ['reese_wide', 'Wide Reese', { w:'sawtooth', u:2, dt:18, o:12, a:0.01, h:0.2, d:0.3, f:900, q:1, lvl:0.35, sub:0.4 }, 'dnb breaks dubstep'],
  ['reese_dark', 'Dark Reese', { w:'sawtooth', u:3, dt:15, o:12, a:0.01, h:0.2, d:0.35, f:500, q:2, k:2, lvl:0.32, sub:0.3 }, 'dnb techno hardtechno'],
  ['bass_neuro', 'Neuro Bass', { w:['sawtooth','square'], dt:9, o:12, d:0.25, f:400, fe:8, fd:0.12, q:6, k:6, lvl:0.25 }, 'dnb dubstep'],
  ['wobble_slow', 'Slow Wobble', { w:'sawtooth', u:2, dt:10, o:12, h:0.3, d:0.3, f:500, q:6, wob:4, wd:0.85, k:3, lvl:0.3, sub:0.3 }, 'dubstep'],
  ['wobble_fast', 'Talking Wobble', { wave:'vocal', o:12, h:0.3, d:0.3, f:900, q:5, wob:2, wd:0.9, fold:1.5, lvl:0.3, sub:0.3 }, 'dubstep trap'],
  ['growl2', 'Growl 2', { w:['sawtooth','square'], o:12, d:0.3, f:700, q:8, fm:1.5, fi:2, fmd:0.3, k:5, lvl:0.25 }, 'dubstep'],
  ['bass_acid', 'Acid Bass', { w:'square', o:12, d:0.16, f:300, fe:9, fd:0.08, q:16, k:5, lvl:0.28 }, 'acid techno'],
  ['bass_squelch', 'Squelch', { wave:'nasal', o:12, d:0.2, f:400, fe:8, fd:0.1, q:10, k:3, lvl:0.28, sub:0.5 }, 'acid electro'],
  ['bass_saw2', 'Saw Bass 2', { w:'sawtooth', o:12, d:0.22, f:1200, fe:2, fd:0.1, q:2, lvl:0.32, sub:0.3 }, 'trance proghouse synthwave'],
  ['bass_square', 'Square Bass', { w:'square', o:12, d:0.2, f:900, q:1, lvl:0.32, sub:0.2 }, 'electro synthwave'],
  ['bass_pluck', 'Pluck Bass', { w:'sawtooth', o:12, d:0.12, f:500, fe:6, fd:0.05, q:3, lvl:0.35 }, 'techhouse house deephouse'],
  ['bass_funk', 'Funk Bass', { w:'sawtooth', o:12, d:0.25, f:350, fe:5, fd:0.12, q:6, lvl:0.32 }, 'house deephouse ukg'],
  ['bass_garage', 'Garage Bass', { w:'sine', o:12, d:0.35, f:800, fm:1, fi:1.2, fmd:0.2, k:2, lvl:0.5 }, 'ukg'],
  ['bass_organ', 'Organ Bass', { w:['sine','square'], o:12, h:0.1, d:0.2, f:1500, lvl:0.35 }, 'ukg house'],
  ['bass_dubsub', 'Dub Sub', { w:'sine', o:12, a:0.01, h:0.2, d:0.5, f:300, lvl:0.7, del:0.1 }, 'dubtechno dubstep'],
  ['bass_rubber', 'Rubber Bass', { w:'triangle', o:12, d:0.18, f:700, gl:-5, glt:0.04, lvl:0.5, k:1.5 }, 'techhouse minimal electro'],
  ['bass_fm2', 'FM Bass 2', { w:'sine', o:12, d:0.2, fm:2, fi:3, fmd:0.15, f:2500, lvl:0.45 }, 'electro techhouse minimal'],
  ['bass_electro', 'Electro Bass', { w:'square', o:12, d:0.15, f:600, fe:4, fd:0.06, q:4, k:2, lvl:0.3 }, 'electro ebm'],
  ['bass_stab', 'Stab Bass', { w:'triangle', o:12, d:0.12, fold:2.5, f:2500, lvl:0.35 }, 'techno hardtechno'],
  ['bass_rolling', 'Rolling Bass', { w:'sawtooth', o:12, d:0.11, f:800, fe:2.5, fd:0.06, q:2, lvl:0.35, sub:0.4 }, 'techno melodic trance'],
  ['bass_trance', 'Trance Bass', { w:'sawtooth', u:2, dt:6, o:12, d:0.12, f:1100, q:1.5, lvl:0.3, sub:0.35 }, 'trance proghouse'],
  ['rumble2', 'Rumble 2', { w:'sine', o:12, h:0.05, d:0.25, f:180, k:6, lvl:0.5, rev:0.25 }, 'techno hardtechno'],
  ['bass_hoover', 'Hoover Bass', { w:'sawtooth', u:3, dt:25, o:12, d:0.3, f:2000, gl:-12, glt:0.12, k:2, lvl:0.25 }, 'hardtechno breaks'],
  ['bass_monosaw', 'Reed Bass', { wave:'reed', o:12, d:0.25, f:2500, chorus:1, lvl:0.35 }, 'ebm electro synthwave'],
  ['bass_detuned', 'Detuned Bass', { w:'sawtooth', u:2, dt:30, o:12, d:0.25, f:700, q:2, lvl:0.32 }, 'melodic dnb'],
  ['bass_juno', 'Juno Bass', { w:'square', u:2, dt:5, o:12, d:0.3, f:600, fe:3, fd:0.15, lvl:0.3, sub:0.4 }, 'synthwave deephouse'],
  ['bass_moog2', 'Moog Low', { w:'sawtooth', o:12, d:0.3, f:250, fe:4, fd:0.12, q:5, k:2, lvl:0.38 }, 'techno melodic synthwave'],
  ['bass_tape', 'Tape Bass', { w:'triangle', o:12, d:0.3, f:500, k:3, lvl:0.5 }, 'idm ambient deephouse'],
  ['bass_glidesub', 'Glide Sub', { w:'sine', o:12, h:0.1, d:0.4, gl:-12, glt:0.06, lvl:0.65 }, 'dnb dubstep trap'],
]);

addSounds('Leads & Arps', 'tone', [
  ['lead_saw2', 'Saw Lead 2', { w:'sawtooth', u:2, dt:10, d:0.3, h:0.05, f:4000, q:1, lvl:0.2 }, 'trance proghouse synthwave'],
  ['lead_superwide', 'Wide Supersaw', { w:'sawtooth', u:3, dt:25, a:0.01, h:0.1, d:0.4, f:6000, lvl:0.16, rev:0.25 }, 'trance proghouse'],
  ['lead_square', 'Square Lead', { w:'square', d:0.25, h:0.05, f:3000, lvl:0.16, vib:8 }, 'synthwave electro'],
  ['lead_pulse', 'Pulse Lead', { w:['square','sawtooth'], dt:6, d:0.22, f:2500, lvl:0.15 }, 'electro idm'],
  ['lead_sync2', 'Sync Lead 2', { w:'sawtooth', d:0.25, f:2500, fe:3, fd:0.1, q:6, lvl:0.15 }, 'synthwave electro trance'],
  ['lead_chip', 'Chip Lead', { w:'square', o:48, d:0.15, f:8000, lvl:0.1, vib:15, vr:7 }, 'idm electro'],
  ['arp_chip', 'Chip Arp', { w:'square', o:48, d:0.07, f:8000, lvl:0.11 }, 'idm synthwave'],
  ['pluck_soft', 'Soft Pluck', { w:'triangle', d:0.25, f:2000, fe:2, fd:0.05, lvl:0.3, rev:0.25 }, 'deephouse ambient melodic'],
  ['pluck_bright', 'Bright Pluck', { w:'sawtooth', u:2, dt:8, d:0.15, f:1500, fe:6, fd:0.04, lvl:0.2, del:0.2 }, 'trance proghouse'],
  ['lead_mallet', 'Mallet', { w:'sine', o:48, d:0.3, fm:4, fi:2, fmd:0.05, f:6000, lvl:0.3, rev:0.25 }, 'idm ambient minimal'],
  ['lead_trance', 'Trance Lead', { w:'sawtooth', u:3, dt:15, h:0.1, d:0.3, f:5000, lvl:0.15, rev:0.3, del:0.2 }, 'trance'],
  ['lead_rave', 'Rave Lead', { w:['sawtooth','square'], u:2, dt:20, d:0.2, f:3000, k:3, lvl:0.15 }, 'hardtechno breaks'],
  ['hoover2', 'Hoover 2', { w:'sawtooth', u:3, dt:35, d:0.4, f:2500, gl:-7, glt:0.15, k:2, lvl:0.14 }, 'hardtechno breaks'],
  ['lead_screech', 'Screech', { w:'square', d:0.2, f:1500, q:15, fe:4, fd:0.1, k:6, lvl:0.1 }, 'hardtechno dubstep'],
  ['lead_whistle', 'Whistle', { w:'sine', o:48, a:0.02, h:0.1, d:0.2, vib:12, lvl:0.25, rev:0.3 }, 'trance ambient'],
  ['lead_flute', 'Flute', { w:'sine', a:0.04, h:0.1, d:0.25, vib:10, nz:0.15, nd:0.1, nf:2000, lvl:0.35, rev:0.3 }, 'ambient deephouse'],
  ['lead_brass', 'Brass Lead', { w:'sawtooth', a:0.03, h:0.1, d:0.25, f:1200, fe:2.5, fd:0.08, lvl:0.2 }, 'synthwave house'],
  ['arp_sine', 'Sine Arp', { w:'sine', o:48, d:0.12, lvl:0.3, del:0.25 }, 'melodic ambient trance'],
  ['arp_glass', 'Glass Arp', { w:'triangle', o:48, d:0.18, fm:3, fi:1, fmd:0.1, lvl:0.25, rev:0.3, del:0.2 }, 'melodic idm ambient'],
  ['lead_bell', 'Bell Lead', { w:'sine', o:48, d:0.6, fm:3.5, fi:3, fmd:0.4, lvl:0.25, rev:0.3 }, 'trap ambient melodic'],
  ['bell_fm2', 'FM Bell 2', { w:'sine', o:48, d:0.9, fm:1.4, fi:4, fmd:0.6, lvl:0.2, rev:0.35 }, 'ambient idm dubtechno'],
  ['lead_digital', 'Digital Lead', { w:'square', d:0.2, fm:2, fi:1, f:5000, lvl:0.15 }, 'idm electro'],
  ['lead_laser', 'Laser Lead', { w:'sawtooth', d:0.2, gl:12, glt:0.05, f:3000, lvl:0.15 }, 'electro breaks'],
  ['lead_acid', 'Acid Lead', { w:'sawtooth', o:24, d:0.18, f:500, fe:7, fd:0.1, q:14, k:2, lvl:0.2 }, 'acid'],
  ['lead_acidsq', 'Acid Square', { w:'square', o:24, d:0.16, f:450, fe:8, fd:0.08, q:15, k:3, lvl:0.18 }, 'acid'],
  ['lead_dark', 'Dark Lead', { w:'sawtooth', u:2, dt:12, d:0.3, f:900, q:3, k:2, lvl:0.18 }, 'ebm techno dubstep'],
  ['lead_vintage', 'Vintage Lead', { w:'sawtooth', d:0.3, f:1800, q:2, vib:6, lvl:0.2 }, 'synthwave house'],
  ['lead_porta', 'Portamento Lead', { w:'sawtooth', d:0.3, gl:-3, glt:0.06, f:2500, lvl:0.18 }, 'trance synthwave'],
  ['lead_detuned', 'Detuned Lead', { w:'sawtooth', u:2, dt:30, d:0.3, f:3000, lvl:0.16 }, 'techno melodic'],
  ['arp_square', 'Square Arp', { w:'square', d:0.1, f:2500, fe:2, fd:0.05, lvl:0.15, del:0.2 }, 'trance synthwave'],
  ['arp_saw', 'Saw Arp', { w:'sawtooth', d:0.1, f:2000, fe:3, fd:0.05, lvl:0.16, del:0.2 }, 'trance melodic proghouse'],
  ['lead_chime', 'Chime', { w:'sine', o:48, d:1.2, fm:5.4, fi:1, fmd:0.2, lvl:0.18, rev:0.4 }, 'ambient'],
  ['music_box', 'Music Box', { w:'sine', o:60, d:0.6, fm:4, fi:0.5, lvl:0.2, rev:0.3 }, 'ambient idm'],
  ['harp_pluck', 'Harp Pluck', { w:'triangle', d:0.6, f:3000, fe:2, fd:0.02, lvl:0.3, rev:0.3 }, 'ambient melodic'],
]);

addSounds('Chords & Stabs', 'tone', [
  ['stab_rave2', 'Rave Stab 2', { ch:C4, w:['sawtooth','square'], d:0.25, f:2500, fe:2, fd:0.05, k:2, lvl:0.25 }, 'hardtechno breaks'],
  ['stab_house', 'House Stab', { ch:C4, w:'sawtooth', d:0.18, f:1800, fe:2, fd:0.05, lvl:0.25, rev:0.2 }, 'house techhouse'],
  ['stab_dub', 'Dub Stab', { ch:C4, w:'sawtooth', d:0.25, f:900, q:2, lvl:0.25, rev:0.4, del:0.45 }, 'dubtechno minimal'],
  ['chord_techno', 'Techno Chord', { ch:C3, w:'sawtooth', u:2, dt:8, d:0.3, f:1200, q:2, lvl:0.22, del:0.3 }, 'techno melodic'],
  ['stab_organ', 'Organ Stab', { ch:C3, w:['sine','square'], d:0.2, h:0.05, f:3000, lvl:0.22 }, 'house ukg'],
  ['stab_brass', 'Brass Stab', { ch:C3, w:'sawtooth', a:0.01, d:0.25, f:1500, fe:2.5, fd:0.07, lvl:0.25 }, 'house synthwave'],
  ['chord_detroit', 'Detroit Chord', { ch:C9, w:'sawtooth', u:2, dt:6, a:0.01, d:0.5, f:1600, lvl:0.2, rev:0.3, del:0.2 }, 'techno deephouse melodic'],
  ['stab_trance', 'Trance Stab', { ch:C3, w:'sawtooth', u:3, dt:18, d:0.25, f:4000, lvl:0.18, rev:0.3, del:0.2 }, 'trance'],
  ['chord_garage', 'Garage Chord', { ch:C4, w:['sine','triangle'], d:0.3, f:3000, lvl:0.3, rev:0.2 }, 'ukg deephouse'],
  ['chord_pluck', 'Glass Chord', { ch:C3, wave:'glass', d:0.3, f:7000, lvl:0.25, rev:0.3, del:0.2 }, 'melodic proghouse trance'],
  ['chord_saw', 'Saw Chord', { ch:C3, w:'sawtooth', u:2, dt:10, d:0.4, f:2500, lvl:0.18 }, 'proghouse synthwave'],
  ['chord_square', 'Square Chord', { ch:C3, w:'square', d:0.3, f:2000, lvl:0.18 }, 'electro synthwave idm'],
  ['chord_fm', 'FM Chord', { ch:C4, w:'sine', d:0.5, fm:2, fi:1.5, fmd:0.3, lvl:0.25, rev:0.3 }, 'deephouse idm ambient'],
  ['stab_jungle', 'Jungle Stab', { ch:C4, wave:'organ', d:0.35, f:3000, lvl:0.2, rev:0.4, comb:4, cfb:0.4 }, 'dnb breaks'],
  ['stab_hoover', 'Hoover Stab', { ch:[0,7,12], w:'sawtooth', u:3, dt:30, d:0.35, gl:-5, glt:0.1, k:2, lvl:0.14 }, 'hardtechno breaks'],
  ['stab_deep', 'Deep Stab', { ch:C9, w:'triangle', d:0.35, f:1500, lvl:0.25, rev:0.3, del:0.3 }, 'deephouse dubtechno'],
  ['chord_filter', 'Filter Chord', { ch:C4, w:'sawtooth', d:0.4, f:400, fe:6, fd:0.25, q:4, lvl:0.2 }, 'techhouse acid techno'],
  ['stab_glitch', 'Glitch Stab', { ch:C3, w:'square', d:0.08, f:3000, k:5, lvl:0.15 }, 'idm electro'],
]);

addSounds('Keys', 'tone', [
  ['piano_bright', 'Bright Piano', { w:['triangle','sine'], d:0.9, f:4000, fe:2, fd:0.3, fm:2, fi:0.4, fmd:0.4, lvl:0.35 }, 'house deephouse ukg'],
  ['piano_soft', 'Soft Piano', { w:'sine', d:1, fm:2, fi:0.3, f:2500, lvl:0.4, rev:0.25 }, 'ambient deephouse'],
  ['piano_dark', 'Dark Piano', { w:'triangle', o:24, d:1, f:1500, lvl:0.4, rev:0.3 }, 'ambient melodic'],
  ['epiano2', 'E-Piano 2', { w:'sine', d:0.8, fm:1, fi:2, fmd:0.15, lvl:0.35, rev:0.2 }, 'deephouse ukg'],
  ['suitcase', 'Suitcase', { w:'sine', d:1, fm:1, fi:1.2, fmd:0.3, vib:6, vr:4.5, lvl:0.35, rev:0.2 }, 'deephouse house'],
  ['organ_rock', 'Rock Organ', { w:['sine','square'], h:0.15, d:0.15, f:4000, k:2, vib:5, lvl:0.2 }, 'house ukg'],
  ['organ_church', 'Church Organ', { w:['sine','triangle','square'], a:0.03, h:0.3, d:0.4, f:3000, lvl:0.18, rev:0.5 }, 'ambient ebm'],
  ['harpsichord', 'Harpsichord', { w:'sawtooth', d:0.35, f:5000, fe:1.5, fd:0.02, q:1, lvl:0.18 }, 'idm synthwave'],
  ['celesta', 'Celesta', { w:'sine', o:48, d:0.7, fm:4, fi:0.6, lvl:0.25, rev:0.3 }, 'ambient idm'],
  ['vibraphone', 'Vibraphone', { w:'sine', o:48, d:1, vib:20, vr:5, fm:4, fi:0.3, lvl:0.25, rev:0.3 }, 'deephouse ambient'],
  ['steel_drum', 'Steel Drum', { w:'sine', o:48, d:0.5, fm:1.5, fi:1.2, fmd:0.2, lvl:0.25, rev:0.2 }, 'house idm'],
  ['toy_piano', 'Toy Piano', { w:'triangle', o:48, d:0.4, fm:3.6, fi:0.8, lvl:0.25 }, 'idm'],
  ['keys_lofi', 'Lo-Fi Keys', { w:'triangle', d:0.7, f:1200, k:1.5, vib:8, vr:0.8, lvl:0.35 }, 'idm ambient deephouse'],
  ['clav2', 'Clavinet 2', { w:'square', d:0.2, f:1500, fe:3, fd:0.03, q:3, lvl:0.18 }, 'house ukg'],
]);

addSounds('Pads', 'tone', [
  ['pad_dark', 'Dark Pad', { ch:C3, w:'sawtooth', u:2, dt:10, a:0.6, h:0.8, d:1.5, f:600, lvl:0.16, rev:0.5 }, 'techno ebm dubstep'],
  ['pad_strings', 'String Pad', { ch:[0,7,12,15], w:'sawtooth', u:2, dt:12, a:0.4, h:1, d:1.2, f:2200, vib:6, lvl:0.12, rev:0.4 }, 'trance melodic synthwave'],
  ['pad_analog', 'Analog Pad', { ch:C3, w:['sawtooth','square'], a:0.3, h:1, d:1, f:1500, lvl:0.14, rev:0.4 }, 'synthwave'],
  ['pad_ice', 'Ice Pad', { ch:[0,7,12,14], w:'triangle', u:2, dt:8, a:0.5, h:1, d:1.5, fm:3, fi:0.3, lvl:0.18, rev:0.6 }, 'ambient idm'],
  ['pad_drone', 'Drone', { ch:[0,7,12], w:'sawtooth', u:2, dt:5, a:1, h:2, d:2, f:400, q:2, lvl:0.16, rev:0.5 }, 'ambient dubtechno'],
  ['pad_sweep', 'Sweep Pad', { ch:C3, w:'sawtooth', u:2, dt:12, a:0.5, h:1, d:1.2, f:1200, wob:16, wd:0.8, lvl:0.14, rev:0.5 }, 'melodic proghouse'],
  ['pad_pwm', 'PWM Pad', { ch:C3, w:'square', u:2, dt:15, a:0.4, h:1, d:1, f:2000, lvl:0.12, rev:0.4 }, 'synthwave deephouse'],
  ['pad_saw', 'Saw Pad', { ch:C3, w:'sawtooth', u:3, dt:15, a:0.3, h:1, d:1, f:3000, lvl:0.1, rev:0.4 }, 'trance proghouse'],
  ['pad_ambient', 'Ambient Pad', { ch:[0,7,14], w:'sine', u:2, dt:6, a:1, h:1.5, d:2, lvl:0.25, rev:0.7, del:0.3 }, 'ambient melodic'],
  ['pad_dream', 'Dream Pad', { ch:C4, w:'triangle', u:2, dt:10, a:0.6, h:1, d:1.5, vib:8, lvl:0.2, rev:0.6 }, 'ambient idm deephouse'],
  ['pad_evolve', 'Evolving Pad', { ch:C3, w:'sawtooth', u:2, dt:8, a:0.8, h:1.5, d:1.5, f:800, q:3, wob:32, wd:0.7, lvl:0.15, rev:0.5 }, 'melodic dubtechno'],
  ['pad_organ', 'Organ Pad', { ch:C3, w:['sine','triangle'], a:0.2, h:1, d:0.8, lvl:0.18, rev:0.4 }, 'house deephouse'],
  ['pad_bell', 'Bell Pad', { ch:[0,7,12], w:'sine', a:0.01, h:0.2, d:2, fm:3.5, fi:1.5, fmd:1, lvl:0.18, rev:0.6 }, 'ambient melodic'],
  ['pad_noise', 'Noise Pad', { ch:[0], w:'sawtooth', a:0.6, h:1, d:1.2, f:2000, nz:0.3, nd:2, lvl:0.12, rev:0.6 }, 'ambient idm'],
  ['pad_subdrone', 'Sub Drone', { ch:[0,7], w:'sine', o:24, a:1, h:2, d:2, lvl:0.35, rev:0.3 }, 'ambient dubstep'],
]);
addSounds('Pads', 'vox', [
  ['choir_pad', 'Choir Pad', { ch:C3, v:'a', v2:'o', u:2, a:0.5, h:1, d:1.5, rev:0.6, lvl:1.2 }, 'trance ambient melodic'],
]);

addSounds('Vocals', 'vox', [
  ['vox_ah', 'Vox Ah', { v:'a', a:0.02, h:0.1, d:0.25 }, 'house trance techno'],
  ['vox_oh', 'Vox Oh', { v:'o', a:0.02, h:0.1, d:0.25 }, 'house deephouse melodic'],
  ['vox_ee', 'Vox Ee', { v:'i', a:0.02, h:0.1, d:0.25 }, 'trance proghouse'],
  ['vox_oo', 'Vox Oo', { v:'u', a:0.03, h:0.1, d:0.3 }, 'deephouse ambient dubtechno'],
  ['chop_hi', 'Vocal Chop Hi', { v:'a', v2:'e', o:48, a:0.005, h:0.03, d:0.12 }, 'house ukg techhouse trance'],
  ['chop_lo', 'Vocal Chop Lo', { v:'o', v2:'a', a:0.005, h:0.05, d:0.15 }, 'techhouse house dnb'],
  ['choir_ah', 'Choir Ah', { ch:C3, v:'a', u:2, a:0.3, h:0.8, d:1, rev:0.5 }, 'trance ambient ebm'],
  ['choir_oh', 'Choir Oh', { ch:C3, v:'o', u:2, a:0.3, h:0.8, d:1, rev:0.5 }, 'ambient melodic dubstep'],
  ['vox_robot', 'Robot Vox', { v:'e', v2:'o', w:'square', d:0.3, k:3, vib:0, lvl:0.9 }, 'electro ebm idm'],
  ['vox_whisper', 'Whisper', { m:'noise', v:'a', v2:'i', d:0.3, rev:0.4, lvl:2 }, 'techno dubtechno ambient'],
  ['vox_hey', 'Hey!', { v:'e', v2:'i', o:48, d:0.18, k:4, nz:0.4, vib:0, lvl:0.9 }, 'house techhouse breaks'],
  ['vox_vocoder', 'Vocoder', { ch:[0,7,12], w:'sawtooth', v:'o', v2:'a', d:0.4, vib:0 }, 'electro synthwave'],
  ['vox_breath', 'Breath', { m:'noise', v:'u', a:0.1, d:0.4, lvl:2 }, 'ambient idm'],
  ['chant_low', 'Low Chant', { v:'o', o:24, u:3, a:0.1, h:0.3, d:0.5, rev:0.5 }, 'ebm hardtechno dubtechno'],
]);

addSounds('Orchestra', 'tone', [
  ['pizz', 'Pizzicato', { w:'sawtooth', d:0.2, f:2000, fe:2, fd:0.03, lvl:0.25, rev:0.3 }, 'trance idm'],
  ['cello', 'Cello', { w:'sawtooth', o:24, a:0.08, h:0.3, d:0.4, f:1500, vib:10, lvl:0.2, rev:0.3 }, 'ambient melodic'],
  ['violin', 'Violin', { w:'sawtooth', o:48, a:0.08, h:0.3, d:0.4, f:3500, vib:14, lvl:0.15, rev:0.35 }, 'trance ambient'],
  ['horn', 'Horn', { w:'sawtooth', a:0.05, h:0.2, d:0.4, f:900, fe:1.5, fd:0.1, lvl:0.22, rev:0.35 }, 'synthwave ambient'],
  ['brass_section', 'Brass Section', { ch:C3, w:'sawtooth', u:2, dt:8, a:0.03, h:0.15, d:0.3, f:1400, fe:2, fd:0.08, lvl:0.15, rev:0.3 }, 'house synthwave'],
  ['orch_hit', 'Orchestra Hit', { ch:[0,7,12,15], w:'sawtooth', u:2, dt:10, d:0.4, f:3000, nz:0.4, nd:0.05, lvl:0.15, rev:0.5 }, 'breaks hardtechno dnb'],
  ['harp', 'Harp', { w:'triangle', o:48, d:0.8, f:4000, fe:2, fd:0.02, lvl:0.3, rev:0.4 }, 'ambient trance'],
  ['bowed_glass', 'Bowed Glass', { w:'sine', o:48, a:0.3, h:0.5, d:1, fm:2, fi:0.3, vib:5, lvl:0.2, rev:0.5 }, 'ambient'],
]);

addSounds('FX', 'fx', [
  ['crash_long', 'Crash Long', { m:'cym', d:2.2, f:5000, lvl:0.35 }, 'techno trance proghouse house dnb'],
  ['crash_short', 'Crash Short', { m:'cym', d:0.8, lvl:0.35 }, 'breaks electro synthwave'],
  ['china', 'China', { m:'cym', d:1, mult:1.1, bpf:4000, f:3500, lvl:0.35 }, 'dnb breaks hardtechno'],
  ['reverse_cym', 'Reverse Cymbal', { m:'swell', L:8, f0:6000, lvl:0.25 }, 'trance proghouse house synthwave'],
  ['riser_bar', 'Riser 1 Bar', { m:'rise', L:16, f0:200, f1:9000, tone:1, lvl:0.25 }, 'trance proghouse techno melodic dubstep'],
  ['riser_half', 'Riser ½ Bar', { m:'rise', L:8, f0:400, f1:9000, lvl:0.25 }, 'techno house techhouse dnb'],
  ['uplifter', 'Uplifter', { m:'rise', L:16, f0:1000, f1:12000, lvl:0.2 }, 'trance proghouse ukg'],
  ['downlifter', 'Downlifter', { m:'down', L:8, f0:8000, f1:200, lvl:0.25 }, 'techno trance dubstep'],
  ['impact_big', 'Big Impact', { m:'impact', d:1.5, f:70, lvl:0.4, rev:0.5 }, 'dubstep trap trance hardtechno'],
  ['sub_drop', 'Sub Drop', { m:'subdrop', d:1.6, f:90, lvl:0.45, rev:0.1 }, 'trap dubstep dnb'],
  ['swell', 'Reverse Swell', { m:'swell', L:8, f0:3000, lvl:0.25 }, 'ambient melodic dubtechno'],
  ['noise_hit', 'White Noise Hit', { m:'noise', d:0.3, f:3000, lvl:0.3 }, 'techno electro'],
  ['laser2', 'Laser 2', { m:'zap', d:0.25, f0:4000, f1:200, w:'sawtooth', lvl:0.2 }, 'electro breaks'],
  ['zap2', 'Zap 2', { m:'zap', d:0.08, f0:2500, f1:60, lvl:0.25 }, 'electro idm'],
  ['glitch2', 'Glitch 2', { m:'bit', d:0.2, lvl:0.3 }, 'idm minimal'],
  ['bitcrush', 'Bitcrush Hit', { m:'bit', d:0.4, slow:1, lvl:0.3 }, 'idm electro'],
  ['tape_stop', 'Tape Stop', { m:'stop', d:0.7, lvl:0.35 }, 'dubstep trap breaks'],
  ['siren_fx', 'Siren FX', { m:'siren', d:1.5, f:900, lvl:0.3, rev:0.4 }, 'dnb dubstep hardtechno'],
  ['alarm', 'Alarm', { m:'siren', d:0.8, f:1400, sq:1, rate:8, lvl:0.25 }, 'hardtechno ebm'],
  ['scratch', 'Scratch', { m:'scratch', d:0.25, lvl:0.4 }, 'breaks house'],
  ['vinyl_noise', 'Vinyl Noise', { m:'vinyl', L:32, lvl:0.4, rev:0 }, 'deephouse idm ambient'],
  ['air', 'Air', { m:'air', d:2, lvl:0.2, rev:0.6 }, 'ambient melodic'],
  ['thunder', 'Thunder', { m:'thunder', d:3, lvl:0.35, rev:0.5 }, 'ambient dubstep'],
  ['metal_hit', 'Metal Hit', { m:'metal', d:1.5, f:300, lvl:0.3, rev:0.5 }, 'hardtechno ebm techno'],
  ['drop_boom', 'Drop Boom', { m:'impact', d:2.5, f:55, k:4, lvl:0.4, rev:0.4 }, 'dubstep trap'],
]);

// ============================================================
//  РАЗНООБРАЗИЕ: звуки на других способах синтеза — модальном, струнном (Karplus-Strong), своих волнах,
//  дроблении разрядности, фолдинге, кольцевой модуляции, гребёнке и хорусе
// ============================================================
addSounds('Kicks', 'kick', [
  ['kick_crush', 'Crushed Kick', { f0:190, f1:50, sw:0.04, h:0.05, d:0.28, k:2, c:0.3, crush:4 }, 'idm hardtechno ebm'],
  ['kick_fold', 'Folded Kick', { f0:160, f1:48, sw:0.05, h:0.08, d:0.35, k:1, fold:3, c:0.2 }, 'dubstep trap electro'],
  ['kick_ring', 'Ring Kick', { f0:170, f1:55, sw:0.04, h:0.04, d:0.25, k:1.5, ring:0.5, c:0.3 }, 'idm techno'],
  ['kick_tunnel', 'Tunnel Kick', { f0:180, f1:50, sw:0.045, h:0.05, d:0.3, k:2, comb:14, cfb:0.65, c:0.2 }, 'techno dubtechno hardtechno'],
]);
addSounds('Kicks', 'modal', [
  ['kick_drum', 'Drum Kick', { m:'membrane', f:58, pd:2.2, pt:0.04, d:0.35, br:0.5, nz:0.4, nd:0.008, nr:20, lvl:0.9 }, 'breaks synthwave idm'],
]);
addSounds('Snares', 'modal', [
  ['sn_garage', 'Garage Snare', { m:'membrane', f:240, d:0.12, nz:0.9, nd:0.12, nr:12, br:0.9, lvl:0.5, rev:0.25 }, 'ukg house'],
  ['sn_metal', 'Metal Snare', { m:'plate', f:330, d:0.18, nz:1, nd:0.1, nr:9, br:0.85, lvl:0.4, rev:0.2 }, 'hardtechno ebm industrial idm'],
]);
addSounds('Snares', 'snare', [
  ['sn_bit', 'Bit Snare', { ft:230, ta:0.6, td:0.08, nf:3000, na:0.9, nd:0.16, crush:4, rev:0.15 }, 'idm electro breaks'],
  ['sn_ring', 'Ring Snare', { ft:200, ta:0.7, td:0.1, nf:2500, na:0.8, nd:0.18, ring:1.7, rev:0.2 }, 'idm techno'],
  ['sn_tube', 'Tube Snare', { ft:250, ta:0.5, td:0.06, nf:3500, na:0.9, nd:0.14, comb:3, cfb:0.7, rev:0.15 }, 'techno minimal dubtechno'],
]);
addSounds('Hats & Cymbals', 'perc', [
  ['hat_tight', 'Ring Hat', { w:'square', f:3200, pd:1, d:0.035, ring:1.47, hp:6000, lvl:0.35 }, 'techno techhouse minimal'],
]);
addSounds('Hats & Cymbals', 'hat', [
  ['hat_bit', 'Bit Hat', { m:'noise', f:5000, d:0.05, crush:3, lvl:0.22 }, 'idm electro'],
  ['ohat_phase', 'Phaser Open Hat', { m:'noise', f:6000, d:0.4, comb:1.2, cfb:0.7, lvl:0.16, rev:0.1 }, 'techno dubtechno minimal'],
]);
addSounds('Hats & Cymbals', 'modal', [
  ['ride_plate', 'Plate Ride', { m:'plate', f:2400, d:1.2, br:0.9, nz:0.3, nd:0.01, nr:2, lvl:0.12, rev:0.2 }, 'dnb deephouse techno'],
]);
addSounds('Toms & Perc', 'modal', [
  ['steelpan_hit', 'Steel Pan Hit', { m:'bar', f:600, d:0.5, br:0.7, lvl:0.4, rev:0.25 }, 'house deephouse idm'],
  ['glass_hit', 'Glass Hit', { m:'glass', f:1400, d:0.6, br:0.8, lvl:0.25, rev:0.3 }, 'idm ambient melodic'],
  ['gong', 'Gong', { m:'gong', f:110, d:3, br:0.95, nz:0.2, nr:4, lvl:0.3, rev:0.4 }, 'ambient dubtechno ebm'],
  ['tube_hit', 'Tube Hit', { m:'tube', f:500, d:0.35, br:0.7, lvl:0.35, rev:0.2 }, 'minimal idm techno'],
  ['membrane_low', 'Low Membrane', { m:'membrane', f:90, pd:1.5, pt:0.05, d:0.4, br:0.6, nz:0.3, nr:6, lvl:0.6 }, 'deephouse techhouse breaks'],
  ['kalimba_hit', 'Kalimba Hit', { m:'kalimba', f:700, d:0.5, lvl:0.4, rev:0.2 }, 'deephouse minimal idm'],
]);
addSounds('Bass', 'pluck', [
  ['bass_string', 'String Bass', { o:12, d:0.7, damp:0.993, bright:0.4, f:1200, lvl:0.6 }, 'deephouse house ukg breaks'],
]);
addSounds('Bass', 'tone', [
  ['bass_fold', 'Fold Bass', { w:'sine', o:12, d:0.25, h:0.05, fold:3, f:3000, lvl:0.35 }, 'dubstep trap electro dnb'],
  ['bass_ring', 'Ring Bass', { w:'sawtooth', o:12, d:0.22, f:1500, ring:0.5, lvl:0.4, sub:0.4 }, 'idm electro techno'],
  ['bass_organ2', 'Organ Bass 2', { wave:'organ', o:12, h:0.08, d:0.2, f:2500, lvl:0.4 }, 'house ukg deephouse'],
  ['bass_hollow', 'Hollow Bass', { wave:'hollow', o:12, d:0.22, f:600, fe:4, fd:0.08, q:3, lvl:0.4 }, 'techno minimal electro'],
  ['bass_crush', 'Crushed Bass', { w:'sawtooth', o:12, d:0.2, f:1800, crush:4, lvl:0.3, sub:0.3 }, 'idm hardtechno breaks'],
]);
addSounds('Leads & Arps', 'pluck', [
  ['pluck2', 'String Pluck', { o:36, d:0.8, damp:0.994, bright:0.7, f:5000, lvl:0.4, rev:0.2, del:0.15 }, 'melodic proghouse trance'],
  ['guitar_pluck', 'Guitar Pluck', { o:36, d:1.2, damp:0.997, bright:0.8, f:6000, lvl:0.4, rev:0.2 }, 'deephouse house synthwave'],
  ['nylon', 'Nylon', { o:36, d:1, damp:0.995, bright:0.35, f:3000, lvl:0.45, rev:0.25 }, 'ambient deephouse idm'],
]);
addSounds('Leads & Arps', 'tone', [
  ['lead_reed', 'Reed Lead', { wave:'reed', a:0.02, h:0.1, d:0.25, f:4000, vib:8, lvl:0.3 }, 'house synthwave ambient'],
  ['lead_vocal', 'Vocal Lead', { wave:'vocal', a:0.03, h:0.1, d:0.3, f:5000, vib:12, chorus:1, lvl:0.35 }, 'trance house deephouse'],
  ['lead_digibell', 'Digital Bell', { wave:'digital', o:48, d:0.5, fm:3, fi:1.5, fmd:0.3, lvl:0.25, rev:0.25 }, 'idm trap ambient'],
  ['lead_pulse12', 'Thin Pulse', { wave:'pulse12', o:48, d:0.15, f:9000, lvl:0.3 }, 'idm electro synthwave'],
  ['lead_ring', 'Ring Lead', { w:'sawtooth', d:0.25, f:4000, ring:1.5, lvl:0.25 }, 'idm techno electro'],
]);
addSounds('Leads & Arps', 'modal', [
  ['glass_mallet', 'Glass Mallet', { m:'glass', o:48, d:0.7, br:0.75, lvl:0.3, rev:0.3 }, 'ambient melodic idm'],
]);
addSounds('Chords & Stabs', 'pluck', [
  ['chord_strum', 'Strum Chord', { ch:C3, o:36, d:1, damp:0.995, bright:0.6, strum:0.018, f:4000, lvl:0.45, rev:0.25 }, 'deephouse house synthwave'],
]);
addSounds('Chords & Stabs', 'tone', [
  ['chord_organ', 'Organ Chord', { ch:C3, wave:'organ', h:0.08, d:0.25, f:4000, lvl:0.25 }, 'house ukg deephouse'],
  ['chord_hollow', 'Hollow Chord', { ch:C4, wave:'hollow', d:0.4, f:2500, chorus:1, lvl:0.25, rev:0.3 }, 'dubtechno minimal deephouse'],
  ['chord_ring', 'Ring Chord', { ch:C3, w:'sawtooth', d:0.3, f:3000, ring:2, lvl:0.22 }, 'idm techno'],
]);
addSounds('Chords & Stabs', 'modal', [
  ['chord_bell', 'Bell Chord', { ch:[0,7,12], m:'bell', o:36, d:1.2, br:0.8, lvl:0.25, rev:0.35 }, 'ambient melodic trance'],
]);
addSounds('Keys', 'modal', [
  ['marimba2', 'Marimba 2', { m:'bar', o:48, d:0.6, br:0.6, nz:0.2, lvl:0.4, rev:0.15 }, 'deephouse house idm'],
  ['xylophone', 'Xylophone', { m:'xylo', o:60, d:0.35, br:0.8, nz:0.3, lvl:0.35, rev:0.15 }, 'idm minimal'],
  ['kalimba2', 'Kalimba 2', { m:'kalimba', o:48, d:0.6, lvl:0.4, rev:0.2 }, 'deephouse ambient trap'],
]);
addSounds('Keys', 'pluck', [
  ['harp2', 'Harp 2', { o:48, d:1.4, damp:0.997, bright:0.5, f:6000, lvl:0.4, rev:0.35 }, 'ambient trance melodic'],
]);
addSounds('Pads', 'tone', [
  ['pad_vocal', 'Vocal Pad', { ch:C3, wave:'vocal', u:2, dt:8, a:0.6, h:1, d:1.4, chorus:2, lvl:0.18, rev:0.6 }, 'ambient trance deephouse'],
  ['pad_organ2', 'Organ Pad 2', { ch:C3, wave:'organ', a:0.3, h:1, d:1, chorus:2, lvl:0.18, rev:0.4 }, 'house deephouse ebm'],
  ['pad_comb', 'Comb Pad', { ch:C3, w:'sawtooth', a:0.5, h:1, d:1.4, f:2000, comb:5, cfb:0.8, lvl:0.1, rev:0.5 }, 'techno dubtechno idm'],
]);
addSounds('FX', 'modal', [
  ['gong_hit', 'Gong Hit', { m:'gong', f:70, d:4, br:0.95, nz:0.3, nr:5, lvl:0.35, rev:0.5 }, 'ambient ebm hardtechno'],
  ['metal_rattle', 'Metal Rattle', { m:'plate', f:900, d:0.8, br:0.9, ring:1.3, lvl:0.25, rev:0.3 }, 'hardtechno idm ebm'],
]);
addSounds('FX', 'tone', [
  ['bit_glitch', 'Bit Glitch', { w:'square', o:48, d:0.15, gl:24, glt:0.1, crush:2, lvl:0.2 }, 'idm electro'],
]);

// ---------- электропанк (в духе Locked Club): грязные, короткие, напористые; низ — главный, верх — тёмный ----------
Object.assign(TRIM, { hat_fuzz:7, hat_trash:8, ohat_trash:4, perc_clang:6, lead_fuzz:5, lead_scream:6, lead_buzzsaw:4, stab_power:6, stab_punk:6,
  vox_megaphone:8, bass_ebm2:5, bass_roll:3, sn_trash:2, sn_gated:2 });   // выровнять к медиане своей категории (замер)
addSounds('Kicks', 'kick', [
  ['kick_punk', 'Punk Kick', { f0:210, f1:50, sw:0.035, h:0.04, d:0.22, k:6, c:0.35, lp:7000 }, 'electropunk ebm hardtechno'],
  ['kick_fuzz', 'Fuzz Kick', { f0:240, f1:46, sw:0.045, h:0.05, d:0.28, k:12, c:0.25, lp:5000, lvl:0.6 }, 'electropunk hardtechno'],
  ['kick_tight', 'Tight Drive Kick', { f0:180, f1:55, sw:0.03, h:0.03, d:0.16, k:4, c:0.45, drv:1 }, 'electropunk electro ebm'],
]);
addSounds('Snares', 'snare', [
  ['sn_punk', 'Punk Snare', { ft:210, ta:0.7, td:0.07, nf:3200, nq:0.7, na:1, nd:0.17, k:8, rev:0.08 }, 'electropunk ebm'],
  ['sn_trash', 'Trash Snare', { ft:240, ta:0.5, td:0.05, nf:2600, na:1, nd:0.13, k:5, crush:3, rev:0.05 }, 'electropunk hardtechno'],
  ['sn_gated', 'Gated Noise Snare', { ft:190, ta:0.6, td:0.06, nf:2000, nq:0.5, na:1, nd:0.09, k:10, rev:0.12 }, 'electropunk ebm synthwave'],
]);
addSounds('Claps', 'clap', [
  ['cl_punk', 'Punk Clap', { n:4, sp:0.009, d:0.18, f:1400, q:0.8, k:6, rev:0.1 }, 'electropunk ebm'],
  ['cl_dirty2', 'Dirty Clap', { n:3, sp:0.011, d:0.24, f:1100, q:0.6, k:10, rev:0.08 }, 'electropunk hardtechno'],
]);
addSounds('Hats & Cymbals', 'hat', [
  ['hat_fuzz', 'Fuzz Hat', { m:'noise', f:6000, d:0.04, crush:2, lvl:0.18 }, 'electropunk ebm'],
  ['hat_trash', 'Trash Hat', { m:'noise', f:4500, bp:6000, d:0.05, crush:3, lvl:0.16 }, 'electropunk hardtechno'],
  ['ohat_trash', 'Trash Open Hat', { m:'noise', f:5000, d:0.22, crush:2.5, lvl:0.12 }, 'electropunk'],
]);
addSounds('Toms & Perc', 'perc', [
  ['perc_clang', 'Clang', { w:'square', f:420, pd:1, d:0.12, fm:2.7, fi:3, bp:1800, q:2, k:4, lvl:0.2, rev:0.1 }, 'electropunk ebm hardtechno'],
]);
addSounds('Bass', 'tone', [
  ['bass_punk', 'Punk Bass', { w:'sawtooth', o:12, d:0.14, h:0.03, f:850, q:1.2, fe:1.6, fd:0.05, k:2.5, sub:0.6, lvl:0.4 }, 'electropunk ebm'],
  ['bass_fuzz', 'Fuzz Bass', { w:'square', o:12, d:0.16, h:0.04, f:1000, k:5, sub:0.7, lvl:0.32 }, 'electropunk hardtechno'],
  ['bass_ebm2', 'Gritty Seq Bass', { w:'sawtooth', u:2, dt:8, o:12, d:0.11, f:750, q:2.5, fe:2.5, fd:0.04, k:2, sub:0.5, lvl:0.36 }, 'electropunk ebm electro'],
  ['bass_roll', 'Rolling Drive Bass', { w:['sawtooth','square'], o:12, d:0.09, f:900, q:1.8, fe:2, fd:0.03, k:3.5, sub:0.6, lvl:0.36 }, 'electropunk hardtechno techno'],
]);
addSounds('Bass', 'pluck', [
  ['bass_chug', 'Chug Bass', { o:12, d:0.25, damp:0.985, bright:0.6, f:1800, k:6, lvl:0.6 }, 'electropunk breaks'],
]);
addSounds('Leads & Arps', 'tone', [
  ['lead_fuzz', 'Fuzz Lead', { w:'sawtooth', u:2, dt:14, d:0.22, h:0.05, f:3200, q:1, k:8, lvl:0.14 }, 'electropunk ebm hardtechno'],
  ['lead_scream', 'Scream Lead', { w:'square', u:2, dt:20, a:0.005, d:0.3, h:0.08, f:4000, k:6, vib:6, lvl:0.12 }, 'electropunk hardtechno'],
  ['lead_buzzsaw', 'Buzzsaw Riff', { w:'sawtooth', d:0.18, h:0.04, f:2400, q:4, fe:2, fd:0.06, k:10, lvl:0.13 }, 'electropunk electro'],
]);
addSounds('Leads & Arps', 'pluck', [
  ['lead_punkriff', 'Punk Riff', { o:36, d:0.35, damp:0.99, bright:0.85, f:4000, k:10, lvl:0.35 }, 'electropunk breaks'],
]);
addSounds('Chords & Stabs', 'tone', [
  ['stab_power', 'Power Chord', { ch:[0,7,12], w:'sawtooth', u:2, dt:10, d:0.22, h:0.04, f:2600, k:9, lvl:0.18 }, 'electropunk ebm hardtechno'],
  ['stab_punk', 'Punk Stab', { ch:[0,3,7], w:['sawtooth','square'], d:0.16, f:2000, fe:2, fd:0.05, k:7, lvl:0.18 }, 'electropunk'],
]);
addSounds('Vocals', 'vox', [
  ['vox_shout', 'Shout', { v:'a', v2:'o', a:0.004, h:0.06, d:0.16, k:6, lvl:0.8 }, 'electropunk ebm'],
  ['vox_oi', 'Oi!', { v:'o', v2:'i', a:0.003, h:0.04, d:0.14, k:5, lvl:0.8 }, 'electropunk'],
  ['vox_megaphone', 'Megaphone Vox', { v:'e', v2:'a', w:'square', d:0.22, k:4, vib:0, bp2:1500, bq:2, lvl:0.9 }, 'electropunk ebm electro'],
]);
addSounds('FX', 'fx', [
  ['noise_burst', 'Noise Burst', { m:'impact', d:0.4, f:900, lvl:0.3, rev:0.15 }, 'electropunk hardtechno ebm'],
]);

// библиотека: категории по порядку, внутри — как добавлены
LIB.sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
