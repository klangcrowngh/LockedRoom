// LOCKED ROOM — инструмент разработчика: замеры звуков и сведения (в приложении не подключается).
// Подключить в консоли:  await import('/tools/analyze.js')  → window.LRA
// ------------------------------------------------------------
//  LRA.profileAll()        — громкость и спектр каждого звука библиотеки (для автосведения)
//  LRA.genreReport(n)      — сгенерировать n треков каждого жанра, отрендерить и замерить сведение
// ------------------------------------------------------------
const SR = 44100;
const db = x => x > 0 ? 20 * Math.log10(x) : -99;

// максимальная громкость в окне 50 мс
function stLoud(d){ const W = Math.round(SR * 0.05); let best = 0;
  for (let s = 0; s + W <= d.length; s += W >> 1){ let ss = 0; for (let i = s; i < s + W; i++) ss += d[i] * d[i]; best = Math.max(best, Math.sqrt(ss / W)); }
  return best; }
const energy = d => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return s; };

// буфер → энергии полос (фильтрами в офлайн-контексте)
async function bands(buf){
  const edges = [['sub', 0, 60], ['low', 60, 250], ['lowmid', 250, 800], ['mid', 800, 3000], ['high', 3000, 9000], ['air', 9000, 22000]];
  const off = new OfflineAudioContext(edges.length + 1, buf.length, SR), src = off.createBufferSource(), mg = off.createChannelMerger(edges.length + 1);
  src.buffer = buf; src.connect(mg, 0, 0);
  edges.forEach(([, lo, hi], k) => { let n = src;
    if (lo > 0){ for (let j = 0; j < 2; j++){ const f = off.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = lo; n.connect(f); n = f; } }
    if (hi < 22000){ for (let j = 0; j < 2; j++){ const f = off.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = hi; n.connect(f); n = f; } }
    n.connect(mg, 0, k + 1); });
  mg.connect(off.destination); src.start();
  const r = await off.startRendering(), e = edges.map((_, k) => energy(r.getChannelData(k + 1))), tot = e.reduce((x, y) => x + y, 0) || 1e-12, out = {};
  edges.forEach(([nm], k) => out[nm] = e[k] / tot);   // доли от суммы полос
  return out;
}

// один звук: громкость «сухого» сигнала (без мастера и эффектов) и доли низа/верха
async function measureSound(v, note = 0){
  const off = new OfflineAudioContext(1, SR * 2.5, SR), live = engineSnapshot(); RENDERING = true;
  try {
    ac = off; buildGraph(true);
    bus = off.createGain(); bus.connect(off.destination); revIn = off.createGain(); dlyIn = off.createGain();   // мимо мастера и эффектов
    hit({ v, params: defParams(v), notes: [note], pat: [true] }, 0.05, 0, 1);
    const buf = await off.startRendering(), d = buf.getChannelData(0), b = await bands(buf);
    const pk = stLoud(d);
    return { loud: +db(pk).toFixed(1), dur: +(energy(d) / ((pk * pk || 1e-12) * SR)).toFixed(3), low: +(b.sub + b.low).toFixed(3), mid: +(b.lowmid + b.mid).toFixed(3), high: +(b.high + b.air).toFixed(3) };
  } finally { engineRestore(live); RENDERING = false; }
}
async function profileAll(from = 0, to = LIB.length, out = {}){
  const sc = P.scale; P.scale = 'minor';
  for (const s of LIB.slice(from, to)) out[s.id] = await measureSound(s.id);
  P.scale = sc; return out;
}

// текущая сцена → 2 повтора офлайн (через рендер песни приложения)
async function renderLoop(){
  const keep = arr, so = songOn; arr = [{ s: scene, b: 2 }];
  try { return await renderSong(); } finally { arr = keep; songOn = so; }
}
async function analyzeTrack(){
  const buf = await renderLoop(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length - SR * 3;   // без хвоста
  let ss = 0, pk = 0, side = 0; for (let i = 0; i < n; i++){ const m = (L[i] + R[i]) / 2, s = (L[i] - R[i]) / 2; ss += m * m; side += s * s; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
  const rms = Math.sqrt(ss / n), mono = new AudioBuffer({ length: n, sampleRate: SR, numberOfChannels: 1 }); const md = mono.getChannelData(0); for (let i = 0; i < n; i++) md[i] = (L[i] + R[i]) / 2;
  const b = await bands(mono);
  return { rms: +db(rms).toFixed(1), crest: +(db(pk) - db(rms)).toFixed(1), width: +(Math.sqrt(side / n) / (rms || 1e-9)).toFixed(2), ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, +(v * 100).toFixed(1)])) };
}
async function genreReport(n = 2, genres = GENRES.map(g => g.id)){
  const rows = [];
  for (const id of genres) for (let k = 0; k < n; k++){
    genGenre(id); genRun(null); const est = typeof estLoud === 'function' ? +estLoud().toFixed(1) : 0; const a = await analyzeTrack(); rows.push({ genre: id, est, ...a });
  }
  const avg = f => +(rows.reduce((s, r) => s + r[f], 0) / rows.length).toFixed(1), sd = f => { const m = avg(f); return +Math.sqrt(rows.reduce((s, r) => s + (r[f] - m) ** 2, 0) / rows.length).toFixed(1); };
  return { rows, summary: Object.fromEntries(['rms','est','crest','width','sub','low','lowmid','mid','high','air'].map(f => [f, avg(f) + ' ±' + sd(f)])) };
}
window.LRA = { measureSound, profileAll, renderLoop, analyzeTrack, genreReport, bands };
export default window.LRA;

// ------------------------------------------------------------
//  ТЕМБР: «отпечаток» звука и поиск похожих
// ------------------------------------------------------------
function fft(re, im){ const n = re.length;
  for (let i = 1, j = 0; i < n; i++){ let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j){ [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1){ const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len){ let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++){ const ur = re[i+k], ui = im[i+k], vr = re[i+k+len/2] * cr - im[i+k+len/2] * ci, vi = re[i+k+len/2] * ci + im[i+k+len/2] * cr;
      re[i+k] = ur + vr; im[i+k] = ui + vi; re[i+k+len/2] = ur - vr; im[i+k+len/2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
const NBANDS = 24, BAND = [...Array(NBANDS + 1)].map((_, k) => 40 * Math.pow(16000 / 40, k / NBANDS));
async function renderDry(v, note = 0, sec = 1.5){
  const off = new OfflineAudioContext(1, Math.round(SR * sec), SR), live = engineSnapshot(); RENDERING = true;
  try { ac = off; buildGraph(true); bus = off.createGain(); bus.connect(off.destination); revIn = off.createGain(); dlyIn = off.createGain();
    hit({ v, params: defParams(v), notes: [note], pat: [true] }, 0.01, 0, 1); return (await off.startRendering()).getChannelData(0);
  } finally { engineRestore(live); RENDERING = false; }
}
// отпечаток: форма спектра (24 полосы, дБ относительно среднего), «шумность», огибающая (10 отрезков по 60 мс)
async function features(v){
  const d = await renderDry(v), N = 1024, H = 512, w = [...Array(N)].map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  const spec = new Float64Array(NBANDS), env = new Float64Array(10); let flat = 0, fw = 0, tot = 0;
  for (let s = 0; s + N <= d.length; s += H){
    const re = new Float64Array(N), im = new Float64Array(N); let e = 0;
    for (let i = 0; i < N; i++){ re[i] = d[s + i] * w[i]; e += d[s + i] * d[s + i]; }
    const seg = Math.floor(s / (SR * 0.06)); if (seg < 10) env[seg] += e;
    if (e < 1e-7) continue; fft(re, im); tot += e;
    let lg = 0, ar = 0, cnt = 0;
    for (let k = 1; k < N / 2; k++){ const p = re[k] * re[k] + im[k] * im[k], f = k * SR / N; lg += Math.log(p + 1e-12); ar += p; cnt++;
      for (let b = 0; b < NBANDS; b++) if (f >= BAND[b] && f < BAND[b + 1]){ spec[b] += p * e; break; } }
    flat += (Math.exp(lg / cnt) / (ar / cnt + 1e-12)) * e; fw += e;
  }
  const sp = [...spec].map(x => 10 * Math.log10(x + 1e-20)), mx = Math.max(...sp), spn = sp.map(x => Math.max(-60, x - mx) / 10);
  const em = Math.max(...env) || 1, en = [...env].map(x => Math.max(-6, Math.log10(x / em + 1e-6)));
  return { v, spec: spn, env: en, flat: fw ? flat / fw : 0 };
}
const fdist = (a, b) => { let s = 0; for (let i = 0; i < NBANDS; i++) s += (a.spec[i] - b.spec[i]) ** 2; for (let i = 0; i < 10; i++) s += 0.6 * (a.env[i] - b.env[i]) ** 2; s += 4 * (Math.sqrt(a.flat) - Math.sqrt(b.flat)) ** 2; return Math.sqrt(s); };
async function featuresAll(out = {}, from = 0, to = LIB.length){ const sc = P.scale; P.scale = 'minor'; for (const s of LIB.slice(from, to)) out[s.id] = await features(s.id); P.scale = sc; return out; }
// по категориям: ближайший сосед каждого звука; двойники — расстояние меньше порога
function similarity(F, thr = 1.2){
  const res = {};
  for (const cat of CAT_ORDER){
    const ids = LIB.filter(s => s.cat === cat && F[s.id]).map(s => s.id), nn = [];
    for (const a of ids){ let best = 1e9, who = ''; for (const b of ids) if (a !== b){ const d = fdist(F[a], F[b]); if (d < best){ best = d; who = b; } } nn.push([a, who, best]); }
    const ds = nn.map(x => x[2]).sort((x, y) => x - y);
    res[cat] = { n: ids.length, median: +ds[ds.length >> 1].toFixed(2), twins: nn.filter(x => x[2] < thr).map(x => x[0] + '~' + x[1] + ' ' + x[2].toFixed(2)) };
  }
  return res;
}
Object.assign(window.LRA, { features, featuresAll, similarity, fdist, renderDry });
