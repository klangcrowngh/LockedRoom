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
