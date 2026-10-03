// LOCKED ROOM — логика: модель трека, секвенсор, визуал, управление, сохранение, Telegram
// ============================================================
//  ОДНО ПРАВИЛО: связь «точка времени → звук» = звук играет в этот момент.
//  В центре 16 или 32 точки времени. По краю — звуки (вершины).
//  У каждого звука 4 сцены (A–D); у каждого шага — нота, сила, шанс и дробь.
// ============================================================
const MAXS = 32, S_R = 0.86, MAX_SOUNDS = 12, SCENES = 4;
let T_R = 0.26;               // радиус кольца времени (доля RAD) — подбирается под экран в resize()
let STEPS = 16;
// адрес серверной части бота (Cloudflare Worker из server/worker.js). Пусто — файлы просто скачиваются.
const BOT_SEND_URL = 'https://locked-room-bot.klangcrown.workers.dev';
let P, presetIdx = 0, bpm = 134, tracks = [], uid = 1;
let scene = 0, queuedScene = -1, swing = 0, curProj = null;
let linkFlash = {};          // "trackId:step" -> время срабатывания

// ---------- модель ----------
const newScene = () => ({ pat:Array(MAXS).fill(false), notes:Array(MAXS).fill(0), vel:Array(MAXS).fill(1), prob:Array(MAXS).fill(1), rat:Array(MAXS).fill(1) });
const cloneScene = s => ({ pat:s.pat.slice(), notes:s.notes.slice(), vel:s.vel.slice(), prob:s.prob.slice(), rat:s.rat.slice() });
const STEP_KEYS = ['pat','notes','vel','prob','rat'];
// tr.pat / tr.notes / … всегда указывают на массивы текущей сцены
function bindScene(tr){ const s = tr.scn[scene]; for (const k of STEP_KEYS) tr[k] = s[k]; }
function makeTrack(v, patStr=''){
  const tr = { id:uid++, v, mute:false, flash:-9, born:{}, spawn:performance.now(), a:null, ch:null, scSrc:null,
    params: defParams(v), scn: Array.from({length:SCENES}, newScene) };
  [...patStr].slice(0, MAXS).forEach((c,i) => { if (c === 'x') tr.scn[0].pat[i] = true; });
  bindScene(tr);
  return tr;
}
const sceneHas = k => tracks.some(tr => tr.scn[k].pat.some((on,i) => on && i < STEPS));

function applyPreset(i){
  presetIdx = (i + PRESETS.length) % PRESETS.length;
  P = PRESETS[presetIdx];
  document.documentElement.style.setProperty('--acc', P.acc);
  if (busSh){ busSh.curve = curve(P.grit||0); busComp.gain.value = 1/(1+(P.grit||0)*0.6); }
  closePanel(); tracks.forEach(dropChain);
  if (ac) releasePads();
}
function loadPreset(i){
  applyPreset(i);
  bpm = P.bpm; swing = P.swing || 0; STEPS = 16; scene = 0; queuedScene = -1; curProj = null; undoStack = [];
  tracks = (P.voices || KIT_TECHNO).map(v => makeTrack(v, P.pat[v]||''));
  for (const tr of tracks){
    const seq = (P.notes && P.notes[tr.v]) || (FILTERED.includes(tr.v) ? P.seq : tr.v === 'ebm' ? P.bseq : null);
    if (seq){ let k = 0; tr.pat.forEach((on,i)=>{ if (on) tr.notes[i] = seq[k++ % seq.length]; }); }
  }
  // сцены по умолчанию: B — вариация, C — брейк без бочки и баса, D — копия A
  for (const tr of tracks){ tr.scn[1] = cloneScene(tr.scn[0]); tr.scn[3] = cloneScene(tr.scn[0]);
    tr.scn[2] = ['Kicks','Bass'].includes((LIBM[tr.v]||{}).cat) ? newScene() : cloneScene(tr.scn[0]); }
  if (!P.blank){ scene = 1; tracks.forEach(bindScene); variate(3, true); scene = 0; } tracks.forEach(bindScene); dying = [];
  tracks.forEach(buildChain);
  arr = tplArr(P.tpl || 'club'); setSongOn(false, true);
  linkFlash = {}; makeSprites(); if (!fxUser) setFx(defaultFx(P)); updateUI(); renderLib(); renderBlocks();
}

function firstStep(tr){ const i = tr.pat.indexOf(true); return i < 0 ? 0 : i; }
function hit(tr, t, step = firstStep(tr), vel = 1){
  curT = t; if (tr.id && !RENDERING) { tr.flash = t; vq.push({tr, t}); if (vq.length > 200) vq.shift(); }
  CUR = tr; PIT = tr.params.pitch; DK = tr.params.decay; STEP = step; VEL = vel;
  try { SYNTH[tr.v](t, tr); } finally { CUR = null; PIT = 0; DK = 1; STEP = 0; VEL = 1; }
}

// ============================================================
//  SEQUENCER
// ============================================================
let playing = false, step = 0, nextT = 0, stepLog = [], dlyBpm = 0, rollReq = 0, roll = null;
const stepDur = () => 60/bpm/4;

// ---------- сайдчейн: источник глушит звук на каждом своём ударе ----------
function scSource(tr){
  if (tr.scSrc && tracks.includes(tr.scSrc) && tr.scSrc !== tr) return tr.scSrc;
  return tracks.find(x => x !== tr && x.v.includes('kick')) || null;
}
function duckAt(tr, t){
  const d = tr.params.duck, r = tr.params.duckRel;
  tr.duckT = t;
  if (!tr.ch) return;
  const gn = tr.ch.duck.gain;
  gn.cancelScheduledValues(t);
  gn.setTargetAtTime(1 - d*0.97, t, 0.003);          // быстрое приглушение
  gn.setTargetAtTime(1, t + 0.012, r/3);             // плавный возврат
}
function processStep(s, t){
  if (songOn && s % STEPS === 0){                                     // аранжировка: сцены по блокам
    songBar = songBar < 0 ? 0 : songBar + 1;
    const total = arrTotal();
    if (songBar >= total){
      if (songLoop) songBar = 0;
      else { songBar = total - 1; songEnded = true; setTimeout(() => { if (playing) setPlaying(false); }, Math.max(0, (t - ac.currentTime)*1000)); }
    }
    const blk = blockAt(songBar).blk;
    if (blk && blk.s !== scene) applyScene(blk.s);
  }
  if (songEnded) return;
  if (queuedScene >= 0 && s % STEPS === 0) applyScene(queuedScene);   // сцена меняется с начала такта
  let i = s % STEPS;
  if (rollReq && !roll) roll = { len:rollReq, s0:s, base:i - (i % rollReq) };
  if (roll) i = (roll.base + ((s - roll.s0) % roll.len)) % STEPS;         // дробь: повтор куска такта
  stepLog.push({s, t, i}); if (stepLog.length > 32) stepLog.shift();
  const sd = stepDur(), fired = [];
  for (const tr of tracks){
    if (!tr.pat[i] || tr.mute || (solo && solo !== tr)) continue;
    if (tr.prob[i] < 1 && Math.random() > tr.prob[i]) continue;          // шанс срабатывания
    const sw = (i % 2 === 1) ? Math.min(0.75, swing + (tr.params.swing||0)) * sd * 0.5 : 0;
    const th = t + sw, r = tr.rat[i] || 1;
    for (let k=0;k<r;k++) hit(tr, th + k*sd/r, i, tr.vel[i] * (k ? 0.8 : 1));
    linkFlash[tr.id+':'+i] = th; fired.push([tr, th]);
  }
  for (const [src, th] of fired) for (const tr of tracks) if (tr.params.duck > 0 && scSource(tr) === src) duckAt(tr, th);
}
function scheduler(){
  if (!playing) return;
  const ahead = IS_MOBILE ? 0.3 : 0.15;
  while (nextT < ac.currentTime + ahead){ processStep(step, nextT); step++; nextT += stepDur(); }
  if (dlyBpm !== bpm){ dlyBpm = bpm; dly.delayTime.setTargetAtTime(stepDur()*3, ac.currentTime, 0.05);
    washDly.delayTime.setTargetAtTime(stepDur()*3, ac.currentTime, 0.05); tracks.forEach(applyParams); }
}
setInterval(scheduler, IS_MOBILE ? 25 : 20);

function setPlaying(v){
  playing = v;
  if (v){ ac.resume(); step = 0; stepLog = []; nextT = ac.currentTime+0.06; roll = null; songBar = -1; songEnded = false; }
  else if (typeof releasePads === 'function') releasePads();
}

// ---------- сцены и длина ----------
function applyScene(k){
  scene = k; queuedScene = -1; tracks.forEach(bindScene);
  if (sel){ buildSteps(sel); buildNotes(sel); }
  updatePerform();
}
function setScene(k){
  if (songOn && !copyArm){ setSongOn(false); toast('song mode off · manual scenes'); }
  if (copyArm){ for (const tr of tracks) tr.scn[k] = cloneScene(tr.scn[scene]); copyArm = false; toast('scene '+'ABCD'[scene]+' → '+'ABCD'[k]); applyScene(k); haptic('medium'); return; }
  if (playing && k !== scene){ queuedScene = k; updatePerform(); haptic('light'); }
  else applyScene(k);
}
function setLength(n){
  if (n === STEPS) return;
  if (n === 32) for (const tr of tracks) for (const sc of tr.scn){       // вторая половина = копия первой, если пусто
    if (sc.pat.slice(16).some(Boolean)) continue;
    for (let i=0;i<16;i++) for (const k of STEP_KEYS) sc[k][i+16] = sc[k][i];
  }
  STEPS = n; stepLog = [];
  if (sel){ buildSteps(sel); buildNotes(sel); }
  updatePerform(); toast(n + ' steps');
}

// ---------- генератор вариаций и отмена ----------
let undoStack = [], copyArm = false;
function pushUndo(){
  undoStack.push({ scene, ids:tracks.map(t=>t.id), data:tracks.map(t=>cloneScene(t.scn[scene])) });
  if (undoStack.length > 30) undoStack.shift();
}
function undo(){
  const u = undoStack.pop(); if (!u){ toast('nothing to undo'); return; }
  tracks.forEach(tr => { const k = u.ids.indexOf(tr.id); if (k >= 0) tr.scn[u.scene] = u.data[k]; });
  tracks.forEach(bindScene); if (sel){ buildSteps(sel); buildNotes(sel); }
  toast('undo'); haptic('light');
}
const pickR = a => a[Math.random()*a.length|0];
function moveStep(tr, i, j){
  for (const k of STEP_KEYS) tr[k][j] = tr[k][i];
  tr.pat[i] = false; tr.vel[i] = 1; tr.prob[i] = 1; tr.rat[i] = 1; tr.born[j] = performance.now();
  dying.push({ i, tr, t:performance.now() });
}
// аккуратно меняет 2–3 детали текущей сцены; сильные доли бочки не трогает
function variate(n = 2 + (Math.random()*2|0), quiet = false){
  if (!quiet) pushUndo();
  const cand = tracks.filter(t => !t.v.includes('kick') && t.v !== 'boom');
  let done = 0, guard = 0;
  while (done < n && guard++ < 60 && cand.length){
    const tr = pickR(cand), on = [];
    for (let i=0;i<STEPS;i++) if (tr.pat[i]) on.push(i);
    const op = pickR(['shift','ghost','drop','ratchet','note','chance']);
    if (op === 'shift' && on.length){
      const i = pickR(on), j = (i + (Math.random()<0.5 ? -1 : 1) + STEPS) % STEPS;
      if (!tr.pat[j] && i % 4 !== 0){ moveStep(tr, i, j); done++; }
    } else if (op === 'ghost' && on.length >= 2){
      const free = []; for (let i=1;i<STEPS;i+=2) if (!tr.pat[i]) free.push(i);
      if (free.length){ const j = pickR(free); tr.pat[j] = true; tr.born[j] = performance.now(); tr.vel[j] = 0.45; tr.prob[j] = 0.75; tr.notes[j] = tr.notes[on[0]]; done++; }
    } else if (op === 'drop' && on.length >= 5){
      const c = on.filter(x => x % 4 !== 0);
      if (c.length){ const i = pickR(c); tr.pat[i] = false; dying.push({ i, tr, t:performance.now() }); done++; }
    } else if (op === 'ratchet' && on.length && /hat|tick|shaker|snare|clap|perc|rim|tom|conga/.test(tr.v)){
      const late = on.filter(i => i >= STEPS*0.75);
      if (late.length){ const i = pickR(late); tr.rat[i] = tr.rat[i] >= 3 ? 1 : tr.rat[i]+1; done++; }
    } else if (op === 'note' && on.length && MELODIC.includes(tr.v)){
      const i = pickR(on); tr.notes[i] = pickR(SCALE) - (Math.random()<0.25 ? 12 : 0); done++;
    } else if (op === 'chance' && on.length >= 3){
      const i = pickR(on.filter(x => x % 4 !== 0).concat([-1])); if (i >= 0){ tr.prob[i] = tr.prob[i] < 1 ? 1 : 0.6; done++; }
    }
  }
  if (!quiet){ if (sel){ buildSteps(sel); buildNotes(sel); } toast('variation · ' + done + ' changes'); haptic('medium'); }
}

// ============================================================
//  GEOMETRY
// ============================================================
const $ = id => document.getElementById(id);
const cv = $('field'), g = cv.getContext('2d');
let W, H, DPR, C = {x:0,y:0}, RAD = 300, hover = null, drag = null, gateT = 0;

function resize(){
  DPR = Math.min(IS_MOBILE ? 1.5 : 2, window.devicePixelRatio||1); W = innerWidth; H = innerHeight;
  cv.width = W*DPR; cv.height = H*DPR;
  const top = $('top').offsetHeight, bot = $('bottom').offsetHeight;
  document.documentElement.style.setProperty('--topH', top+'px');
  C = {x:W/2, y: top + (H-top-bot)/2};
  RAD = W < 700 ? Math.max(80, Math.min(W*0.5-34, (H-top-bot)*0.5-38)) : Math.max(80, Math.min(W*0.5-56, (H-top-bot)*0.5-40));
  // кольцо времени: на телефоне крупнее, чтобы по точкам было легко попадать пальцем
  T_R = W < 700 ? Math.min(0.5, Math.max(0.38, 92/RAD)) : Math.min(0.4, Math.max(0.26, 70/RAD));
  makeGrid(); makeFB();
}
addEventListener('resize', resize);

const now = () => ac ? ac.currentTime : 0;
const pad = n => String(n).padStart(2,'0');
const tAng = i => -Math.PI/2 + i/STEPS*Math.PI*2;
const targetAng = k => -Math.PI/2 + (k+0.5)/tracks.length*Math.PI*2;
const tPt = i => ({ x:C.x+Math.cos(tAng(i))*T_R*RAD, y:C.y+Math.sin(tAng(i))*T_R*RAD });
const sPt = tr => ({ x:C.x+Math.cos(tr.a)*S_R*RAD, y:C.y+Math.sin(tr.a)*S_R*RAD });
function pathPt(i, tr, u){
  const th = tAng(i); let d = tr.a - th; d = Math.atan2(Math.sin(d), Math.cos(d));
  const e = u*u*(3-2*u), r = (T_R + (S_R-T_R)*(1-(1-u)*(1-u)))*RAD, an = th + d*e;
  return { x:C.x+Math.cos(an)*r, y:C.y+Math.sin(an)*r };
}
function tracePath(i, tr, u0=0, u1=1, N=28){
  g.beginPath();
  for (let k=0;k<=N;k++){ const p = pathPt(i, tr, u0+(u1-u0)*k/N); k ? g.lineTo(p.x,p.y) : g.moveTo(p.x,p.y); }
}
// позиция воспроизведения в шагах (логическая — с учётом дроби)
function playPos(){
  if (!playing || !stepLog.length) return -1;
  const t = now(); let e = null; for (const x of stepLog) if (x.t <= t) e = x;
  return e ? e.i + Math.min(0.999, (t - e.t)/stepDur()) : -1;
}
function easeAngles(){
  tracks.forEach((tr,k) => {
    const tg = targetAng(k);
    if (tr.a === null) { tr.a = tg; return; }
    let d = tg - tr.a; d = Math.atan2(Math.sin(d), Math.cos(d)); tr.a += d*0.14;
  });
}

// ============================================================
//  VISUAL FX
// ============================================================
let fbA = null, fbB = null, wave = null, bands = { b:0, m:0, h:0 }, roseK = 3, roseP = 0, kickPoly = 0;
function makeFB(){
  const w = Math.max(1, W|0), h = Math.max(1, H|0);
  fbA = document.createElement('canvas'); fbA.width = w; fbA.height = h;
  fbB = document.createElement('canvas'); fbB.width = w; fbB.height = h;
}
let vq = [], rings = [], parts = [], glowS = null, grid = null, level = 0, kickGlow = 0;
function makeSprites(){
  const mk = (r,gg,b) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0,`rgba(${r},${gg},${b},1)`); gr.addColorStop(0.25,`rgba(${r},${gg},${b},.35)`); gr.addColorStop(1,`rgba(${r},${gg},${b},0)`);
    x.fillStyle = gr; x.fillRect(0,0,128,128); return c; };
  const h = P.acc;
  glowS = { acc: mk(parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)), white: mk(255,255,255) };
}
function makeGrid(){
  grid = document.createElement('canvas'); grid.width = Math.max(1, W*DPR|0); grid.height = Math.max(1, H*DPR|0);
  const x = grid.getContext('2d'); x.scale(DPR,DPR); const st = 26;
  for (let yy = (C.y%st); yy < H; yy += st) for (let xx = (C.x%st); xx < W; xx += st){
    const d = Math.hypot(xx-C.x, yy-C.y)/(RAD*1.4); const a = Math.max(0, 0.14 - d*0.09);
    x.fillStyle = `rgba(255,255,255,${a})`; x.fillRect(xx, yy, 1, 1);
  }
}
function makeGrain(){
  const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), im = x.createImageData(160,160);
  for (let i=0;i<im.data.length;i+=4){ const v = Math.random()*255; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
  x.putImageData(im,0,0); $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

// ---------- режимы фона ----------
const FX_MODES = ['tunnel','rings','flow','warp','off'];
let fxMode = 'tunnel', fxUser = false, kicks = [], hist = [], histTick = 0, flowP = [];
function defaultFx(pr){
  return pr.fx || ({ 'ACID TECHNO':'flow', 'HARD TECHNO':'tunnel', 'MINIMAL DARK':'warp' })[pr.name]
    || ({ 'Acid':'flow', 'Detroit / Techno':'rings', 'Minimal / Dub':'warp', 'EBM / Electro':'tunnel' })[pr.genre] || 'tunnel';
}
function setFx(m){
  fxMode = m; $('fxName').textContent = m[0].toUpperCase() + m.slice(1);
  if (fbA){ for (const c of [fbA, fbB]) c.getContext('2d').clearRect(0,0,c.width,c.height); }
  flowP = []; hist = []; tShapes = [];
}
$('fxBtn').onclick = ()=>{ fxUser = true; setFx(FX_MODES[(FX_MODES.indexOf(fxMode)+1) % FX_MODES.length]); toast('background · ' + fxMode); };

function runFX(pn){
  const dim = sel ? 0.45 : 1;
  if (fxMode === 'tunnel'){ drawTunnel(pn, dim); }
  else if (fxMode === 'flow'){ stepFlow(pn); g.globalAlpha = 0.85*dim; g.drawImage(fbA, 0, 0, W, H); g.globalAlpha = 1; }
  else if (fxMode === 'rings'){ drawRings(pn, dim); }
  else if (fxMode === 'warp'){ drawWarp(pn, dim); }
  if (fxMode !== 'warp' && grid && grid.width){ g.globalAlpha = 0.7; g.drawImage(grid, 0, 0, W, H); g.globalAlpha = 1; }
  // эффекты не мешают интерфейсу: внутри круга мягко темнее, центр закрыт
  if (fxMode !== 'off'){
    const rS = S_R*RAD, m1 = g.createRadialGradient(C.x, C.y, rS*0.3, C.x, C.y, rS*1.22);
    m1.addColorStop(0, 'rgba(5,5,5,0.5)'); m1.addColorStop(0.75, 'rgba(5,5,5,0.32)'); m1.addColorStop(1, 'rgba(5,5,5,0)');
    g.fillStyle = m1; g.beginPath(); g.arc(C.x, C.y, rS*1.22, 0, Math.PI*2); g.fill();
    const r0 = T_R*RAD + 10, m2 = g.createRadialGradient(C.x, C.y, r0*0.6, C.x, C.y, r0 + 36);
    m2.addColorStop(0, 'rgba(5,5,5,1)'); m2.addColorStop(0.55, 'rgba(5,5,5,0.92)'); m2.addColorStop(1, 'rgba(5,5,5,0)');
    g.fillStyle = m2; g.beginPath(); g.arc(C.x, C.y, r0 + 36, 0, Math.PI*2); g.fill();
  }
}

// FLOW: частицы рождаются у круга и разлетаются наружу по спирали
function stepFlow(pn){
  if (!fbA) return;
  const x = fbA.getContext('2d'), w = fbA.width, h = fbA.height, cx = C.x, cy = C.y, T = pn/4000, acc = P.acc;
  const r0 = S_R*RAD + 36, rMax = Math.hypot(w, h)/2 + 40;
  x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation = 'source-over';
  x.fillStyle = 'rgba(5,5,5,0.12)'; x.fillRect(0,0,w,h);
  const N = Math.min(380, (w*h/3200)|0);
  const spawn = q => { const a = Math.random()*Math.PI*2, r = r0 + Math.random()*40; q.x = cx+Math.cos(a)*r; q.y = cy+Math.sin(a)*r; q.a = Math.random()<0.08; };
  while (flowP.length < N){ const q = {}; spawn(q); const a = Math.random()*Math.PI*2, r = r0 + Math.random()*(rMax-r0); q.x = cx+Math.cos(a)*r; q.y = cy+Math.sin(a)*r; flowP.push(q); }
  const kick = kicks.length ? Math.exp(-(pn - kicks[kicks.length-1])/250) : 0;
  const sp = 0.6 + bands.b*1.8 + kick*1.5;
  x.lineWidth = 1;
  for (const q of flowP){
    const rx = q.x - cx, ry = q.y - cy, rr = Math.hypot(rx, ry) || 1, ux = rx/rr, uy = ry/rr;
    const wob = Math.sin(rr*0.015 - T*3 + Math.atan2(ry, rx)*3)*0.35;
    const dx = ux*(1 + kick*0.5) + (-uy)*(0.8 + wob), dy = uy*(1 + kick*0.5) + ux*(0.8 + wob);
    const nx = q.x + dx*sp, ny = q.y + dy*sp, fade = Math.min(1, (rr - r0)/120);
    x.strokeStyle = q.a ? acc : '#fff'; x.globalAlpha = (q.a ? 0.35 : 0.1 + bands.h*0.12)*fade;
    x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(nx, ny); x.stroke();
    q.x = nx; q.y = ny;
    if (rr > rMax) spawn(q);
  }
  x.globalAlpha = 1;
}

// TUNNEL (векторный): формы рождаются у круга, увеличиваются и поворачиваются, оставаясь чёткими
let tShapes = [], tTick = 0;
function drawTunnel(pn, dim){
  const acc = P.acc, maxR = Math.hypot(W, H)/2 + 60;
  if ((tTick++ % 5) === 0){
    roseK += ((3 + bands.m*7) - roseK)*0.06; roseP += 0.012 + bands.h*0.05;
    const rose = [];
    for (let k=0;k<=180;k++){ const th = k/180*Math.PI*2, r = RAD*(0.98 + 0.08*(0.5+0.5*Math.cos(roseK*th+roseP)) + bands.b*0.04);
      rose.push(Math.cos(th)*r, Math.sin(th)*r); }
    tShapes.unshift({ pts:rose, born:pn, col:'#fff', a:0.1 + bands.m*0.35, r:RAD*1.06 });
    if (wave && playing){
      const wv = [], N = wave.length;
      for (let k=0;k<=N;k+=2){ const v = (wave[k%N]-128)/128, th = k/N*Math.PI*2, r = RAD*(1.02 + v*0.1); wv.push(Math.cos(th)*r, Math.sin(th)*r); }
      tShapes.unshift({ pts:wv, born:pn, col:acc, a:0.2 + bands.b*0.4, r:RAD*1.12 });
    }
    if (tShapes.length > 40) tShapes.length = 40;
  }
  if (kickPoly > 0.9){
    const n = Math.max(3, tracks.length), pl = [];
    for (let k=0;k<=n;k++){ const th = -Math.PI/2 + k/n*Math.PI*2; pl.push(Math.cos(th)*RAD*0.98, Math.sin(th)*RAD*0.98); }
    tShapes.unshift({ pts:pl, born:pn, col:acc, a:0.7, r:RAD*0.98, kick:true }); kickPoly = 0.5;
  }
  kickPoly *= 0.6;
  const LIFE = 2600;
  tShapes = tShapes.filter(sh => pn - sh.born < LIFE);
  for (const sh of tShapes){
    const age = (pn - sh.born)/1000, sc = Math.exp(age*(sh.kick ? 0.45 : 0.32)), k = (pn - sh.born)/LIFE;
    if (sh.r*sc > maxR) continue;
    g.save(); g.translate(C.x, C.y); g.rotate(age*0.22); g.scale(sc, sc);
    g.lineWidth = 1/sc; g.strokeStyle = sh.col; g.globalAlpha = sh.a*(1-k)*(1-k)*dim;
    g.beginPath(); const q = sh.pts;
    g.moveTo(q[0], q[1]); for (let i=2;i<q.length;i+=2) g.lineTo(q[i], q[i+1]);
    g.stroke(); g.restore();
  }
  g.globalAlpha = 1; g.lineWidth = 1;
}

// RINGS: спектральные кольца — свежее рождается у круга и расходится к краям экрана
function drawRings(pn, dim){
  if (spec && playing && (histTick++ % 3 === 0)){ hist.unshift(Array.from(spec.slice(0, 64))); if (hist.length > 28) hist.pop(); }
  if (!hist.length) return;
  const base = S_R*RAD + 64, maxR = Math.hypot(W, H)/2 + 40, n = 28, stp = (maxR - base)/n, acc = P.acc, M = 160;
  for (let k = hist.length-1; k >= 0; k--){
    const row = hist[k], r = base + k*stp, rot = pn/24000 + k*0.035;
    g.beginPath();
    for (let j = 0; j <= M; j++){
      const th = j/M*Math.PI*2, u = Math.abs(((th/Math.PI) % 2) - 1);          // зеркально слева/справа
      const v = row[2 + Math.floor(u*40)]/255, rr = r + Math.pow(v, 1.5)*stp*2.4;
      const a = th + rot, px = C.x + Math.cos(a)*rr, py = C.y + Math.sin(a)*rr;
      j ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.strokeStyle = k === 0 ? acc : '#fff';
    g.globalAlpha = (k === 0 ? 0.7 : 0.32*(1 - k/n)) * dim; g.lineWidth = k === 0 ? 1.4 : 1;
    g.stroke();
  }
  g.globalAlpha = 1; g.lineWidth = 1;
}

// WARP: точечная сетка на весь экран, рябь от бочек и дыхание от баса
function drawWarp(pn, dim){
  const st = 24, acc = P.acc, rr = kicks.map(t0 => (pn - t0)/1000).filter(a => a < 2.2);
  for (let y = (C.y % st); y < H; y += st) for (let x = (C.x % st); x < W; x += st){
    const dx = x - C.x, dy = y - C.y, d = Math.hypot(dx, dy) || 1;
    let off = Math.sin(d*0.025 - pn*0.0025) * (1.5 + bands.b*8);
    for (const a of rr){ const r = a*620; off += Math.exp(-Math.abs(d - r)/28) * 14 * Math.exp(-a*1.4); }
    const px = x + dx/d*off, py = y + dy/d*off, e = Math.min(1, Math.abs(off)/12);
    const fade = Math.min(1, d/(S_R*RAD*1.1));
    g.globalAlpha = (0.12 + e*0.6) * fade * dim;
    g.fillStyle = e > 0.55 ? acc : '#fff';
    const sz = 1 + e*1.5; g.fillRect(px - sz/2, py - sz/2, sz, sz);
  }
  g.globalAlpha = 1;
}

function spawnFx(ev){
  const tr = ev.tr; if (!tracks.includes(tr)) return;
  const p = sPt(tr), isKick = tr.v.includes('kick');
  rings.push({ tr, x:p.x, y:p.y, t0:performance.now(), dur:520, r0:10, r1:isKick?70:46, w:1.5 });
  const n = isKick ? 10 : 5;
  for (let k=0;k<n;k++){ const a = Math.random()*Math.PI*2, sp = 0.6+Math.random()*1.8;
    parts.push({ tr, x:p.x, y:p.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, s:1+Math.random()*2 }); }
  if (isKick){ kickGlow = 1; kickPoly = 1; kicks.push(performance.now()); if (kicks.length > 6) kicks.shift(); }
  if (parts.length > 260) parts.splice(0, parts.length-260);
}

// ============================================================
//  RENDER
// ============================================================
let frameN = 0;
function draw(){
  if (!RENDERING) try { drawFrame(); } catch (err) { console.warn(err); }
  requestAnimationFrame(draw);
}
function drawFrame(){
  const t = now(), acc = P.acc, pos = playPos(), cur = pos<0 ? -1 : Math.floor(pos)%STEPS, pn = performance.now();
  easeAngles();
  while (vq.length && vq[0].t <= t) spawnFx(vq.shift());
  if (an){ an.getByteFrequencyData(spec); an.getByteTimeDomainData(wave);
    let s = 0; for (let i=0;i<48;i++) s += spec[i]; level += ((s/48/255) - level)*0.05;
    const avg = (a,b) => { let q = 0; for (let i=a;i<b;i++) q += spec[i]; return q/(b-a)/255; };
    bands.b += (avg(0,4) - bands.b)*0.2; bands.m += (avg(4,24) - bands.m)*0.1; bands.h += (avg(40,90) - bands.h)*0.2; }
  kickGlow *= 0.9;

  g.setTransform(DPR,0,0,DPR,0,0);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#050505'; g.fillRect(0,0,W,H);
  runFX(pn);

  // центральное свечение от уровня звука
  if (glowS){ g.globalCompositeOperation = 'lighter'; const r = RAD*0.75;
    g.globalAlpha = 0.04 + level*0.08; g.drawImage(glowS.acc, C.x-r, C.y-r, r*2, r*2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }

  // спектр-кольцо
  if (an){
    const N = 64, r0 = S_R*RAD + 34;
    g.lineWidth = 2;
    for (let k=0;k<N;k++){
      const v = spec[Math.floor(k*0.75)]/255, len = Math.pow(v,1.6)*RAD*0.16 + 1;
      for (const sgn of [1,-1]){
        const a = -Math.PI/2 + sgn*(k+0.5)/N*Math.PI;
        g.strokeStyle = v > 0.72 ? acc : `rgba(255,255,255,${0.08+v*0.35})`;
        g.beginPath(); g.moveTo(C.x+Math.cos(a)*r0, C.y+Math.sin(a)*r0); g.lineTo(C.x+Math.cos(a)*(r0+len), C.y+Math.sin(a)*(r0+len)); g.stroke();
      }
    }
    g.lineWidth = 1;
  }

  // внешняя орбита — вращается медленно
  const rot = pn/9000;
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.setLineDash([2,10]); g.lineDashOffset = -rot*60;
  g.beginPath(); g.arc(C.x,C.y,S_R*RAD,0,Math.PI*2); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = 'rgba(255,255,255,.12)';
  for (let k=0;k<4;k++){ const a = rot + k*Math.PI/2; g.beginPath(); g.arc(C.x,C.y,S_R*RAD+16, a, a+0.35); g.stroke(); }

  // связи
  const focusTr = drag && drag.type==='s' ? drag.tr : hover && hover.type==='s' ? hover.tr : sel;
  const focusI = drag && drag.type==='t' ? drag.idx : hover && hover.type==='t' ? hover.idx : -1;
  const anyFocus = !!focusTr || focusI >= 0;
  for (const tr of tracks) for (let i=0;i<STEPS;i++){
    if (!tr.pat[i]) continue;
    const lf = linkFlash[tr.id+':'+i] ?? -9;
    const f = lf <= t ? Math.exp(-(t-lf)*7) : 0;
    const born = tr.born[i] ? Math.min(1, (pn-tr.born[i])/250) : 1;
    const lh = hover && hover.type==='l' && hover.i===i && hover.tr===tr;
    const muted = tr.mute || (solo && solo!==tr);
    const focus = tr===focusTr || i===focusI, bg = anyFocus && !focus;   // bg = фоновая связь, когда что-то выбрано
    const velA = 0.35 + 0.65*tr.vel[i];
    if (lh){ g.strokeStyle = acc; g.lineWidth = 2.5; }
    else if (f > 0.05 && !muted){ g.strokeStyle = acc; g.globalAlpha = (bg ? 0.04+0.1*f : 0.3+0.7*f)*velA; g.lineWidth = bg ? 1 : 1+f; }
    else { g.strokeStyle = focus ? 'rgba(255,255,255,.85)' : muted ? 'rgba(255,255,255,.04)' : bg ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.15)'; g.globalAlpha = velA; }
    if (tr.prob[i] < 1) g.setLineDash([3,4]);                        // пунктир = срабатывает не всегда
    tracePath(i, tr, 0, born); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; g.lineWidth = 1;
    if (tr.rat[i] > 1 && !bg){ g.fillStyle = muted ? 'rgba(255,255,255,.3)' : acc;   // точки у основания = дробь
      for (let k=0;k<tr.rat[i];k++){ const q = pathPt(i, tr, 0.07 + k*0.05); g.fillRect(q.x-1.5, q.y-1.5, 3, 3); } }
    // комета: выходит за шаг до удара, приходит точно в момент звука
    if (pos >= 0 && !muted && !bg){
      const d = (i - (pos % STEPS) + STEPS) % STEPS;
      if (d < 1){
        const u = 1-d;
        for (let k=5;k>=0;k--){ const q = pathPt(i, tr, Math.max(0, u - k*0.05)), s = 2.6-k*0.35;
          g.fillStyle = acc; g.globalAlpha = (1-k/6)*0.9*velA; g.fillRect(q.x-s, q.y-s, s*2, s*2); }
        g.globalAlpha = 1;
        const q = pathPt(i, tr, u);
        g.globalCompositeOperation='lighter'; g.globalAlpha = 0.6*velA; g.drawImage(glowS.acc, q.x-10, q.y-10, 20, 20); g.globalAlpha = 1; g.globalCompositeOperation='source-over';
      }
    }
  }

  // исчезающие связи
  dying = dying.filter(d => pn-d.t < 350 && tracks.includes(d.tr));
  for (const d of dying){ const k = 1-(pn-d.t)/350;
    g.strokeStyle = acc; g.globalAlpha = k; g.setLineDash([3,5]); tracePath(d.i, d.tr); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }

  // тянем новую связь
  if (drag && drag.moved && drag.type !== 'l'){
    const a = drag.type==='t' ? tPt(drag.idx) : sPt(drag.tr);
    const tgt = drag.target, b = tgt ? (tgt.type==='t' ? tPt(tgt.idx) : sPt(tgt.tr)) : drag.p;
    g.strokeStyle = acc; g.setLineDash([4,4]); g.lineWidth = 1.5; g.lineDashOffset = -pn/30;
    g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke(); g.setLineDash([]); g.lineWidth = 1;
    if (tgt){
      const [i,tr] = drag.type==='t' ? [drag.idx,tgt.tr] : [tgt.idx,drag.tr];
      tag(tr.pat[i] ? '− UNLINK' : '+ LINK', (a.x+b.x)/2, (a.y+b.y)/2 - 14, acc);
    }
  }

  // кольцо времени
  const big = STEPS > 16;
  g.font = '9px JetBrains Mono, monospace'; g.textAlign = 'center';
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(C.x,C.y,T_R*RAD,0,Math.PI*2); g.stroke();
  if (pos >= 0){ // дуга прогресса паттерна
    const a = -Math.PI/2 + (pos%STEPS)/STEPS*Math.PI*2;
    g.strokeStyle = acc; g.globalAlpha = 0.5; g.lineWidth = 2; g.beginPath(); g.arc(C.x,C.y,T_R*RAD+12,-Math.PI/2,a); g.stroke(); g.globalAlpha = 1; g.lineWidth = 1;
  }
  for (let i=0;i<STEPS;i++){
    const p = tPt(i), beat = i%4===0, on = i===cur, used = tracks.some(tr=>tr.pat[i]);
    const hl = (hover && hover.type==='t' && hover.idx===i) || (drag && ((drag.type==='t'&&drag.idx===i) || (drag.target&&drag.target.type==='t'&&drag.target.idx===i)));
    const mob = W < 700, s = beat ? (big ? 4 : mob ? 6 : 5) : (big ? (mob ? 3 : 2.4) : (mob ? 4.5 : 3.5));
    if (on){ g.globalCompositeOperation='lighter'; g.drawImage(glowS.acc, p.x-18, p.y-18, 36, 36); g.globalCompositeOperation='source-over'; }
    g.fillStyle = on || hl ? acc : used ? '#fff' : 'rgba(255,255,255,.3)';
    if (beat) g.fillRect(p.x-s,p.y-s,s*2,s*2); else { g.beginPath(); g.arc(p.x,p.y,s,0,Math.PI*2); g.fill(); }
    if (sel && sel.pat[i]){ g.strokeStyle = acc; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x,p.y,big?7:9,0,Math.PI*2); g.stroke(); g.lineWidth = 1; }
    if (hl){ g.strokeStyle = acc; g.beginPath(); g.arc(p.x,p.y,big?9:12,0,Math.PI*2); g.stroke(); }
    if (beat){ const q = { x:C.x+Math.cos(tAng(i))*(T_R*RAD-17), y:C.y+Math.sin(tAng(i))*(T_R*RAD-17) };
      g.fillStyle = on ? acc : 'rgba(255,255,255,.45)'; g.fillText(String(i/4+1), q.x, q.y+3); }
  }
  // стрелка и ядро
  if (pos >= 0){
    const a = -Math.PI/2 + (pos%STEPS)/STEPS*Math.PI*2, r = T_R*RAD-28;
    g.strokeStyle = acc; g.lineWidth = 1.5; g.beginPath(); g.moveTo(C.x,C.y); g.lineTo(C.x+Math.cos(a)*r, C.y+Math.sin(a)*r); g.stroke(); g.lineWidth = 1;
  }
  g.save(); g.translate(C.x, C.y);
  if (playing){
    const s = 6 + kickGlow*2;
    g.rotate(pos>=0 ? (pos%STEPS)/STEPS*Math.PI*2 : 0);
    g.rotate(Math.PI/4); g.fillStyle = kickGlow > 0.5 ? acc : '#fff'; g.fillRect(-s/2,-s/2,s,s);
  } else { g.fillStyle = acc; g.beginPath(); g.moveTo(-6,-9); g.lineTo(9,0); g.lineTo(-6,9); g.closePath(); g.fill(); }
  g.restore();
  // буква сцены под ядром
  g.font = '700 10px JetBrains Mono, monospace'; g.textAlign = 'center';
  g.fillStyle = queuedScene >= 0 ? acc : 'rgba(255,255,255,.35)';
  g.fillText(queuedScene >= 0 ? 'ABCD'[scene]+'→'+'ABCD'[queuedScene] : 'ABCD'[scene], C.x, C.y + 22);

  // ударные волны
  rings = rings.filter(r => pn - r.t0 < r.dur);
  for (const r of rings){ const k = (pn - r.t0)/r.dur, e = 1-Math.pow(1-k,3);
    g.strokeStyle = acc; g.globalAlpha = (1-k)*0.8*(focusTr && r.tr && r.tr!==focusTr ? 0.15 : 1); g.lineWidth = r.w*(1-k)+0.5;
    g.beginPath(); g.arc(r.x, r.y, r.r0 + (r.r1-r.r0)*e, 0, Math.PI*2); g.stroke(); }
  g.globalAlpha = 1; g.lineWidth = 1;
  // частицы
  g.globalCompositeOperation = 'lighter'; g.fillStyle = acc;
  for (const q of parts){ q.x += q.vx; q.y += q.vy; q.vx *= 0.96; q.vy *= 0.96; q.life -= 0.022;
    if (q.life > 0){ g.globalAlpha = q.life*(focusTr && q.tr!==focusTr ? 0.15 : 1); g.fillRect(q.x-q.s/2, q.y-q.s/2, q.s, q.s); } }
  parts = parts.filter(q => q.life > 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  // сайдчейн выбранного звука: дуга по орбите от источника
  if (sel && sel.params.duck > 0){
    const src = scSource(sel);
    if (src){
      let d = sel.a - src.a; d = Math.atan2(Math.sin(d), Math.cos(d));
      const r = S_R*RAD + 22, e = sel.duckT !== undefined && t >= sel.duckT ? Math.exp(-(t-sel.duckT)/(sel.params.duckRel/2.2)) : 0;
      g.strokeStyle = acc; g.globalAlpha = 0.35 + 0.65*e; g.setLineDash([2,4]); g.lineDashOffset = -pn/40;
      g.beginPath(); g.arc(C.x, C.y, r, src.a, src.a + d, d < 0); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      const ps = sPt(src); tag('SC', ps.x + Math.cos(src.a)*-30, ps.y + Math.sin(src.a)*-30, acc);
    }
  }

  // звуки (вершины)
  for (const tr of tracks){
    const p = sPt(tr), f = tr.flash <= t ? Math.exp(-(t-tr.flash)*9) : 0;
    const spawn = Math.min(1, (pn - tr.spawn)/400), sc = 1 - Math.pow(1-spawn, 3);
    const isSel = tr===sel, muted = tr.mute || (solo && solo!==tr);
    const hl = isSel || (hover && hover.type==='s' && hover.tr===tr) || (drag && ((drag.type==='s'&&drag.tr===tr) || (drag.target&&drag.target.type==='s'&&drag.target.tr===tr)));
    const dimN = (focusTr && focusTr !== tr) ? 0.2 : 1;
    if (f > 0.02 && !muted){ g.globalCompositeOperation='lighter'; const r = 30 + f*30; g.globalAlpha = f*dimN; g.drawImage(glowS.acc, p.x-r, p.y-r, r*2, r*2); g.globalAlpha = 1; g.globalCompositeOperation='source-over'; }
    let duckE = 0;
    if (tr.params.duck > 0 && tr.duckT !== undefined && t >= tr.duckT) duckE = tr.params.duck * Math.exp(-(t - tr.duckT)/(tr.params.duckRel/2.2));
    const R = 10*sc*(1 - 0.45*duckE);
    g.beginPath(); g.arc(p.x,p.y,R,0,Math.PI*2);
    g.fillStyle = f > 0.3 && !muted ? acc : '#050505'; g.fill();
    g.strokeStyle = muted ? 'rgba(255,255,255,.3)' : hl ? acc : '#fff'; g.lineWidth = hl ? 2 : 1.2; g.stroke(); g.lineWidth = 1;
    if (isSel){ // вращающаяся рамка выбора
      g.save(); g.translate(p.x,p.y); g.rotate(pn/700); g.strokeStyle = acc;
      for (let k=0;k<4;k++){ g.rotate(Math.PI/2); g.beginPath(); g.arc(0,0,17,0,0.9); g.stroke(); }
      g.restore();
    }
    const a = tr.a, mob = W < 700;
    let lx = p.x + Math.cos(a)*24, ly = p.y + Math.sin(a)*24, oy = Math.sin(a) > 0.5 ? 8 : Math.sin(a) < -0.5 ? -4 : 3;
    g.textAlign = Math.cos(a) < -0.3 ? 'right' : Math.cos(a) > 0.3 ? 'left' : 'center';
    if (mob){ g.textAlign = 'center'; lx = p.x; oy = 0; ly = Math.sin(a) < -0.15 ? p.y - 32 : p.y + 26; }
    g.globalAlpha = sc;
    g.font = '700 11px JetBrains Mono, monospace'; g.fillStyle = muted ? 'rgba(255,255,255,.35)' : hl ? acc : '#fff';
    g.shadowColor = 'rgba(0,0,0,.95)'; g.shadowBlur = 8;
    g.fillText(label(tr.v), lx, ly+oy);
    g.font = '9px JetBrains Mono, monospace';
    let n = 0; for (let i=0;i<STEPS;i++) if (tr.pat[i]) n++;
    g.fillStyle = (tr.mute || solo===tr) ? acc : solo ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.4)';
    g.fillText(solo===tr ? 'SOLO' : tr.mute ? 'MUTE' : n ? n+' / '+STEPS : 'no links', lx, ly+oy+12);
    g.shadowBlur = 0;
    g.globalAlpha = 1;
  }

  // подсказка: выбран звук, наведена точка времени
  if (sel && hover && hover.type==='t' && !drag){ const p = tPt(hover.idx), a = tAng(hover.idx);
    tag(sel.pat[hover.idx] ? '× UNLINK' : '+ LINK', p.x+Math.cos(a)*34, p.y+Math.sin(a)*34, acc); }
  // подсказка удаления связи
  if (hover && hover.type==='l' && !drag) tag('× REMOVE', hover.p.x+46, hover.p.y-14, acc);

  if (sel) renderSteps(cur);
  if (noteCells.length && sel){ noteCells.forEach((c,i)=>{ c.classList.toggle('cur', i===cur); if (c.classList.contains('off') === sel.pat[i]) c.render(); }); }
  if ((frameN++ % 12) === 0) updatePerform();
}
function tag(txt, x, y, col){
  g.font = '700 10px JetBrains Mono, monospace'; const w = g.measureText(txt).width + 12;
  g.fillStyle = '#050505'; g.fillRect(x-w/2, y-9, w, 17); g.strokeStyle = col; g.strokeRect(x-w/2, y-9, w, 17);
  g.fillStyle = col; g.textAlign = 'center'; g.fillText(txt, x, y+3);
}

// ============================================================
//  INPUT
// ============================================================
function pick(x, y){
  for (const tr of tracks){ const p=sPt(tr); if (Math.hypot(x-p.x,y-p.y) < 24) return {type:'s', tr}; }
  let best=null, bd=Math.min(W < 700 ? 22 : 16, Math.PI*T_R*RAD/STEPS);   // зона попадания ≈ половина шага между точками
  for (let i=0;i<STEPS;i++){ const p=tPt(i), d=Math.hypot(x-p.x,y-p.y); if (d<bd){bd=d; best={type:'t', idx:i};} }
  return best;
}
function segDist(px,py,a,b){ const dx=b.x-a.x, dy=b.y-a.y, L=dx*dx+dy*dy||1;
  const u=Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/L)); return Math.hypot(px-(a.x+dx*u), py-(a.y+dy*u)); }
function pickLink(x, y, tol){
  let best=null, bd=tol;
  for (const tr of tracks) for (let i=0;i<STEPS;i++){ if (!tr.pat[i]) continue;
    const a=tPt(i), b=sPt(tr); if (Math.hypot(x-a.x,y-a.y)<=14 || Math.hypot(x-b.x,y-b.y)<=18) continue;
    let prev = pathPt(i,tr,0), d = 1e9;
    for (let k=1;k<=20;k++){ const q = pathPt(i,tr,k/20); d = Math.min(d, segDist(x,y,prev,q)); prev = q; }
    if (d<bd){ bd=d; best={type:'l', i, tr}; } }
  return best;
}
let dying = [];
function removeLink(i, tr){ tr.pat[i] = false; dying.push({i, tr, t:performance.now()}); haptic('light'); }
function toggle(i, tr){
  if (tr.pat[i]) return removeLink(i, tr);
  tr.pat[i] = true; tr.vel[i] = 1; tr.prob[i] = 1; tr.rat[i] = 1; tr.born[i] = performance.now();
  hit(tr, ac.currentTime+0.01, i); linkFlash[tr.id+':'+i] = ac.currentTime; haptic('light');
}

cv.addEventListener('pointerdown', e=>{
  if (!ac || performance.now()-gateT < 400) return;
  cv.setPointerCapture(e.pointerId);
  const x = e.clientX, y = e.clientY;
  if (Math.hypot(x-C.x, y-C.y) < T_R*RAD-22){ setPlaying(!playing); haptic('medium'); return; }
  const h = pick(x,y) || pickLink(x, y, e.pointerType==='touch' ? 14 : 8);
  if (!h){ closePanel(); closeLib(); closeDrawer(); if (document.body.classList.contains('pads-open')) setPadsOpen(false); if (document.body.classList.contains('song-open')) setSongOpen(false); }
  if (h) drag = { ...h, x, y, p:{x,y}, moved:false, target:null };
});
cv.addEventListener('pointermove', e=>{
  const x = e.clientX, y = e.clientY;
  hover = pick(x,y) || (!drag && pickLink(x, y, 8));
  if (hover && hover.type==='l') hover.p = {x,y};
  cv.style.cursor = drag ? 'grabbing' : (hover || Math.hypot(x-C.x,y-C.y) < T_R*RAD-22) ? 'pointer' : 'default';
  if (!drag) return;
  if (!drag.moved && Math.hypot(x-drag.x, y-drag.y) > 6) drag.moved = true;
  drag.p = {x,y};
  if (drag.type==='l') return;
  drag.target = hover && hover.type !== 'l' && hover.type !== drag.type ? hover : null;
});
cv.addEventListener('pointerup', e=>{
  if (drag){
    if (drag.moved && drag.target){
      const [i,tr] = drag.type==='t' ? [drag.idx, drag.target.tr] : [drag.target.idx, drag.tr];
      toggle(i, tr);
    } else if (!drag.moved && drag.type==='t' && sel){ toggle(drag.idx, sel);
    } else if (!drag.moved && drag.type==='l'){ removeLink(drag.i, drag.tr); hover = null;
    } else if (!drag.moved && drag.type==='s'){ openPanel(drag.tr); hit(drag.tr, ac.currentTime+0.01); }
  }
  drag = null;
  if (e.pointerType === 'touch') hover = null;     // на телефоне нет наведения
});
cv.addEventListener('pointerleave', ()=>{ hover = null; });

// ============================================================
//  ПАНЕЛЬ ЗВУКА
// ============================================================
function openPanel(tr){
  sel = tr; noteCells = [];
  if (solo && solo !== tr) setSolo(tr);
  $('pSolo').classList.toggle('on', solo === tr);
  $('panel').classList.add('show'); document.body.classList.add('panel-open');
  $('pName').innerHTML = '<span>'+pad(tracks.indexOf(tr)+1)+'</span> '+label(tr.v)+'<em>'+(LIBM[tr.v]||{}).cat+'</em>';
  $('pMute').classList.toggle('on', tr.mute);
  $('pRemove').disabled = tracks.length <= 1;
  const box = $('knobs'); box.innerHTML = '';
  for (const K of KNOBS){
    if (K.only && !K.only.includes(tr.v)) continue;
    const el = document.createElement('div'); el.className = 'knob';
    el.innerHTML = '<div class="row"><span>'+K.name+'</span><b></b></div><input type="range" min="'+K.min+'" max="'+K.max+'" step="'+K.step+'">';
    const inp = el.querySelector('input'), b = el.querySelector('b');
    const show = () => { const val = tr.params[K.k]; b.textContent = K.fmt(val); inp.style.setProperty('--p', ((val-K.min)/(K.max-K.min)*100)+'%'); };
    inp.value = tr.params[K.k]; show();
    inp.oninput = () => { tr.params[K.k] = +inp.value; applyParams(tr); show(); };
    inp.onchange = () => { if (!playing) hit(tr, ac.currentTime+0.01); };
    inp.ondblclick = () => { tr.params[K.k] = defParams(tr.v)[K.k]; inp.value = tr.params[K.k]; applyParams(tr); show(); };
    box.appendChild(el);
  }
  // источник сайдчейна
  const el = document.createElement('div'); el.className = 'knob';
  const auto = tracks.find(x => x !== tr && x.v.includes('kick'));
  el.innerHTML = '<div class="row"><span>SC Source</span></div><select></select>';
  const sl = el.querySelector('select');
  sl.innerHTML = '<option value="">Auto'+(auto ? ' · '+label(auto.v) : ' · none')+'</option>' +
    tracks.filter(x => x !== tr).map(x => '<option value="'+x.id+'">'+label(x.v)+'</option>').join('');
  sl.value = tr.scSrc && tracks.includes(tr.scSrc) ? String(tr.scSrc.id) : '';
  sl.onchange = () => { tr.scSrc = tracks.find(x => String(x.id) === sl.value) || null; };
  box.appendChild(el);
  const mel = MELODIC.includes(tr.v); $('pTabNotes').style.display = mel ? '' : 'none';
  if (!mel && document.body.dataset.pt === 'notes') setPanelTab('steps');
  buildSteps(tr);
  $('nText').value = ''; $('nMsg').textContent = '';
  buildNotes(tr);
  resize(); updateBack();
}
function setSolo(tr){ solo = tr; tracks.forEach(applyParams); $('pSolo').classList.toggle('on', !!tr); }
function closePanel(){ if (!sel) return; sel = null; noteCells = []; stepCells = []; setSolo(null); $('panel').classList.remove('show'); document.body.classList.remove('panel-open'); resize(); updateBack(); }
$('pSolo').onclick = ()=>setSolo(solo === sel ? null : sel);
$('pClose').onclick = closePanel;
$('pMute').onclick = ()=>{ sel.mute = !sel.mute; applyParams(sel); $('pMute').classList.toggle('on', sel.mute); };
$('pReset').onclick = ()=>{ sel.params = defParams(sel.v); applyParams(sel); openPanel(sel); hit(sel, ac.currentTime+0.01); };
$('pSwap').onclick = ()=>openLib({ type:'swap', tr:sel });
$('pRemove').onclick = ()=>{
  if (tracks.length <= 1) return;
  const tr = sel; closePanel(); dropChain(tr);
  const p = sPt(tr); rings.push({ x:p.x, y:p.y, t0:performance.now(), dur:500, r0:10, r1:60, w:2 });
  tracks.forEach(x => { if (x.scSrc === tr) x.scSrc = null; });
  tracks.splice(tracks.indexOf(tr), 1); renderLib();
};

// ---------- строка шагов: Link / Velocity / Chance / Ratchet ----------
let stepCells = [], stMode = 'link';
const ST_HINT = { link:'· tap = link / unlink', vel:'· drag across = loudness of each hit', prob:'· drag across = chance the hit plays', rat:'· tap = 1 → 2 → 3 → 4 hits per step' };
function buildSteps(tr){
  const box = $('steps'); box.innerHTML = ''; stepCells = [];
  box.style.setProperty('--n', STEPS);
  box.classList.toggle('tall', stMode === 'vel' || stMode === 'prob');
  box.classList.toggle('rat', stMode === 'rat');
  for (let i=0;i<STEPS;i++){
    const c = document.createElement('div'); c.className = 'st' + (i%4===0 ? ' beat' : '');
    c.innerHTML = '<div class="fill"></div><span>'+(i+1)+'</span>';
    box.appendChild(c); stepCells.push(c);
  }
  $('stHint').textContent = ST_HINT[stMode];
  renderSteps(-1);
}
function renderSteps(cur){
  if (!sel || !stepCells.length) return;
  stepCells.forEach((c,i) => {
    const on = !!sel.pat[i]; c.classList.toggle('on', on); c.classList.toggle('cur', i===cur);
    if (stMode === 'vel' || stMode === 'prob'){
      const v = stMode === 'vel' ? sel.vel[i] : sel.prob[i];
      c.firstChild.style.height = (v*100)+'%'; c.lastChild.textContent = on ? Math.round(v*100) : i+1;
    } else if (stMode === 'rat') c.lastChild.textContent = on && sel.rat[i] > 1 ? '×'+sel.rat[i] : i+1;
    else c.lastChild.textContent = i+1;
  });
}
(function stepsInput(){
  const box = $('steps'); let painting = false, lastI = -1;
  const at = e => {
    const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest('.st');
    const i = c ? stepCells.indexOf(c) : -1;
    if (i < 0) return { i:-1, v:0 };
    const r = c.getBoundingClientRect();
    return { i, v: Math.max(0.05, Math.min(1, 1 - (e.clientY - r.top)/r.height)) };
  };
  box.addEventListener('pointerdown', e => {
    if (!sel) return; const { i, v } = at(e); if (i < 0) return;
    if (stMode === 'link'){ toggle(i, sel); return; }
    if (stMode === 'rat'){ if (sel.pat[i]){ sel.rat[i] = sel.rat[i] >= 4 ? 1 : sel.rat[i]+1; haptic('select'); if (!playing) hit(sel, ac.currentTime+0.01, i); } return; }
    box.setPointerCapture(e.pointerId); painting = true; lastI = -1; paint(i, v);
  });
  box.addEventListener('pointermove', e => { if (painting){ const { i, v } = at(e); if (i >= 0) paint(i, v); } });
  const end = () => { painting = false; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  function paint(i, v){
    if (!sel.pat[i]) return;
    (stMode === 'vel' ? sel.vel : sel.prob)[i] = Math.round(v*20)/20;
    if (i !== lastI){ haptic('select'); lastI = i; }
  }
})();
document.querySelectorAll('#stTabs button').forEach(b => b.onclick = () => {
  stMode = b.dataset.m; document.querySelectorAll('#stTabs button').forEach(x => x.classList.toggle('on', x === b));
  if (sel) buildSteps(sel);
});
$('sAll').onclick = ()=>{ for (let i=0;i<STEPS;i++) if (!sel.pat[i]){ sel.pat[i] = true; sel.vel[i] = 1; sel.prob[i] = 1; sel.rat[i] = 1; sel.born[i] = performance.now(); } };
$('sNone').onclick = ()=>{ pushUndo(); for (let i=0;i<STEPS;i++) if (sel.pat[i]) removeLink(i, sel); };

// ---------- редактор нот ----------
const N_MIN = -12, N_MAX = 24;
let noteCells = [];
function buildNotes(tr){
  const wrap = $('notesWrap'), box = $('notes');
  const mel = MELODIC.includes(tr.v);
  wrap.classList.toggle('show', mel); box.innerHTML = ''; noteCells = [];
  box.style.setProperty('--n', STEPS);
  if (!mel) return;
  const zeroY = (N_MAX/(N_MAX-N_MIN))*100;
  for (let i=0;i<STEPS;i++){
    const c = document.createElement('div'); c.className = 'cell';
    c.innerHTML = '<div class="zero" style="top:'+zeroY+'%"></div><div class="bar"></div><div class="nv"></div><div class="ix">'+(i+1)+'</div>';
    const render = () => {
      const v = tr.notes[i], y = ((N_MAX - v)/(N_MAX-N_MIN))*100, bar = c.querySelector('.bar');
      bar.style.top = Math.min(y, zeroY)+'%'; bar.style.height = Math.max(1.5, Math.abs(y-zeroY))+'%';
      c.querySelector('.nv').textContent = tr.pat[i] ? (v>0?'+':'')+v : '';
      c.classList.toggle('off', !tr.pat[i]);
    };
    c.render = render; render();
    c.onpointerdown = e => {
      if (!tr.pat[i]) return;
      c.setPointerCapture(e.pointerId);
      const y0 = e.clientY, v0 = tr.notes[i]; let moved = false;
      c.onpointermove = ev => { const d = Math.round((y0 - ev.clientY)/5); if (d) moved = true;
        const nv = Math.max(N_MIN, Math.min(N_MAX, v0 + d)); if (nv !== tr.notes[i]){ tr.notes[i] = nv; haptic('select'); } render(); };
      c.onpointerup = () => { c.onpointermove = null; c.onpointerup = null;
        if (!moved || !playing) hit(tr, ac.currentTime+0.01, i); };
    };
    c.ondblclick = () => { tr.notes[i] = 0; render(); };
    box.appendChild(c); noteCells.push(c);
  }
}

// ---------- ввод нот текстом ----------
function parseTok(tok, base){
  if (tok === '-' || tok === '.' || tok === '_') return null;
  const m = tok.match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (m){ let midi = 12*(+m[3]+1) + NOTE_IX[m[1].toUpperCase()] + (m[2]==='#' ? 1 : m[2]==='b' ? -1 : 0);
    let v = midi - base; while (v > N_MAX) v -= 12; while (v < N_MIN) v += 12; return v; }
  if (/^[+-]?\d+$/.test(tok)) return Math.max(N_MIN, Math.min(N_MAX, +tok));
  return undefined;
}
function applyText(){
  const tr = sel; if (!tr) return;
  const toks = $('nText').value.trim().split(/[\s,]+/).filter(Boolean);
  const base = P.root + (BASE[tr.v] ?? 36);
  const vals = toks.map(t => parseTok(t, base));
  const bad = toks.filter((t,i) => vals[i] === undefined);
  if (!toks.length || bad.length){ $('nMsg').textContent = bad.length ? 'unknown: ' + bad.slice(0,3).join(' ') : ''; return; }
  pushUndo();
  if (vals.length === STEPS){            // весь паттерн: ноты + связи по шагам
    vals.forEach((v,i) => { if (v === null){ if (tr.pat[i]) removeLink(i, tr); } else { if (!tr.pat[i]){ tr.pat[i] = true; tr.born[i] = performance.now(); } tr.notes[i] = v; } });
  } else {                               // иначе — по очереди на шаги, где уже есть связи
    let k = 0; for (let i=0;i<STEPS;i++){ if (tr.pat[i] && vals.length){ const v = vals[k++ % vals.length]; if (v !== null) tr.notes[i] = v; } }
  }
  noteCells.forEach(c => c.render()); $('nMsg').textContent = 'applied ' + toks.length;
  if (!playing) hit(tr, ac.currentTime+0.01);
}
$('nApply').onclick = applyText;
$('nText').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') applyText(); });
$('nRand').onclick = ()=>{ pushUndo(); for (let i=0;i<STEPS;i++) if (sel.pat[i]) sel.notes[i] = pickR(SCALE) - (Math.random()<0.2?12:0); noteCells.forEach(c=>c.render()); };
$('nFlat').onclick = ()=>{ pushUndo(); sel.notes.fill(0); noteCells.forEach(c=>c.render()); };

// ============================================================
//  БИБЛИОТЕКА
// ============================================================
let libMode = { type:'add' };
function openLib(mode){ libMode = mode; renderLib(); $('lib').classList.add('open'); updateBack(); }
function closeLib(){ $('lib').classList.remove('open'); updateBack(); }
function preview(v){ if (!ac) return; hit({ v, params:defParams(v), notes:null, pat:[] }, ac.currentTime+0.01); }
function renderLib(){
  const swap = libMode.type === 'swap' && tracks.includes(libMode.tr);
  if (!swap) libMode = { type:'add' };
  $('libTitle').textContent = swap ? 'SWAP SOUND' : 'LIBRARY';
  $('libSub').textContent = swap ? 'replace '+label(libMode.tr.v)+' · links stay' : 'click a sound to listen';
  const full = tracks.length >= MAX_SOUNDS;
  const box = $('libList'); box.innerHTML = '';
  let cat = '';
  for (const s of LIB){
    if (s.cat !== cat){ cat = s.cat; const h = document.createElement('div'); h.className = 'cat'; h.textContent = cat; box.appendChild(h); }
    const used = tracks.filter(tr=>tr.v===s.id).length;
    const row = document.createElement('div'); row.className = 'item';
    row.innerHTML = '<button class="play">▶</button><span class="nm">'+s.name+(used?'<small>● on field</small>':'')+'</span>';
    const b = document.createElement('button'); b.className = 'add acc';
    b.textContent = swap ? 'Use' : '+ Add'; b.disabled = !swap && full;
    b.onclick = e => { e.stopPropagation(); swap ? swapSound(libMode.tr, s.id) : addSound(s.id); };
    row.appendChild(b);
    row.onclick = () => preview(s.id);
    box.appendChild(row);
  }
  $('libFoot').textContent = 'vertices '+tracks.length+' / '+MAX_SOUNDS + (full && !swap ? ' · field is full' : '');
}
function addSound(v){
  if (!ac || tracks.length >= MAX_SOUNDS) return;
  const tr = makeTrack(v); tracks.push(tr);
  tr.a = targetAng(tracks.length-1);
  buildChain(tr); hit(tr, ac.currentTime+0.01);
  renderLib(); openPanel(tr); haptic('medium');
}
function swapSound(tr, v){
  tr.v = v; tr.params = defParams(v); applyParams(tr); tr.spawn = performance.now();
  hit(tr, ac.currentTime+0.01); closeLib(); openPanel(tr); renderLib();
}
$('libBtn').onclick = ()=>{ $('lib').classList.contains('open') && libMode.type==='add' ? closeLib() : openLib({ type:'add' }); };
$('libClose').onclick = closeLib;

// ============================================================
//  ЖИВАЯ ПАНЕЛЬ: сцены, длина, свинг, вариации, мастер-эффекты
// ============================================================
function updatePerform(){
  document.querySelectorAll('.scn').forEach(b => { const k = +b.dataset.s;
    b.classList.toggle('on', k === scene); b.classList.toggle('q', k === queuedScene); b.classList.toggle('has', sceneHas(k)); });
  $('scCopy').classList.toggle('on', copyArm);
  document.querySelectorAll('.lenBtn').forEach(b => b.textContent = STEPS + ' steps');
  updateSongProgress();
}
document.querySelectorAll('.scn').forEach(b => b.onclick = () => setScene(+b.dataset.s));
$('scCopy').onclick = ()=>{ copyArm = !copyArm; updatePerform(); if (copyArm) toast('tap a scene to paste '+'ABCD'[scene]); };
document.querySelectorAll('.lenBtn').forEach(b => b.onclick = () => setLength(STEPS === 16 ? 32 : 16));
document.querySelectorAll('.swingIn').forEach(inp => inp.oninput = e => { swing = +e.target.value; showSwing(); });
function showSwing(){
  document.querySelectorAll('.swingIn').forEach(inp => { inp.value = swing; inp.style.setProperty('--p', (swing/0.75*100)+'%'); });
  document.querySelectorAll('.swingV').forEach(b => b.textContent = Math.round(swing*100)+'%');
}
// телефон: выдвижная панель с эффектами
function setPadsOpen(on){ document.body.classList.toggle('pads-open', on); $('padsBtn').classList.toggle('on', on); resize(); updateBack(); }
$('padsBtn').onclick = () => setPadsOpen(!document.body.classList.contains('pads-open'));
$('padsClose').onclick = () => setPadsOpen(false);
// телефон: вкладки панели звука
function setPanelTab(t){ document.body.dataset.pt = t; document.querySelectorAll('#pTabs button').forEach(b => b.classList.toggle('on', b.dataset.pt === t)); $('panel').scrollTop = 0; if (W) resize(); }
document.querySelectorAll('#pTabs button').forEach(b => b.onclick = () => setPanelTab(b.dataset.pt));
setPanelTab('steps');
$('varBtn').onclick = ()=>variate();
$('undoBtn').onclick = undo;

const PAD_ON = {};
function padSet(fx, on){
  if (!ac || PAD_ON[fx] === on) return;
  PAD_ON[fx] = on;
  document.querySelector('.pad[data-fx="'+fx+'"]').classList.toggle('on', on);
  if (fx === 'roll4' || fx === 'roll8'){ rollReq = on ? (fx === 'roll4' ? 4 : 2) : 0; if (!on) roll = null; }
  else perfSet(fx, on);
  if (on) haptic('rigid');
}
// отпустить все кнопки эффектов (если палец «потерялся», окно свернули, остановили воспроизведение)
function releasePads(){
  for (const fx in PAD_ON) if (PAD_ON[fx]){ PAD_ON[fx] = false; const b = document.querySelector('.pad[data-fx="'+fx+'"]'); if (b) b.classList.remove('on'); }
  rollReq = 0; roll = null; perfReset();
}
addEventListener('blur', releasePads);
document.querySelectorAll('.pad[data-fx]').forEach(b => {
  const fx = b.dataset.fx;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); padSet(fx, true); });
  for (const ev of ['pointerup','pointercancel','lostpointercapture']) b.addEventListener(ev, () => padSet(fx, false));
  b.addEventListener('contextmenu', e => e.preventDefault());
});

// ============================================================
//  АРАНЖИРОВКА (Song): цепочка блоков «сцена × тактов», сцены переключаются сами
// ============================================================
const BAR_OPTS = [1, 2, 4, 8, 16];
let arr = [], selBlk = 0, songOn = false, songLoop = true, songBar = -1, songEnded = false, RENDERING = false, expFmt = 'mp3';
const TEMPLATES = {
  club:  [[2,4],[0,8],[1,8],[2,4],[3,8],[0,4]],      // интро-брейк → основа → вариация → брейк → дроп → аутро
  short: [[0,4],[1,4],[2,2],[0,4]],
  loop:  [[0,1]],
};
const tplArr = k => TEMPLATES[k].map(([s, b]) => ({ s, b }));
const arrTotal = () => arr.reduce((a, x) => a + x.b, 0) || 1;
function blockAt(bar){
  let acc = 0;
  for (let k=0;k<arr.length;k++){ if (bar < acc + arr[k].b) return { idx:k, blk:arr[k], start:acc }; acc += arr[k].b; }
  return { idx:arr.length-1, blk:arr[arr.length-1], start:acc - (arr.length ? arr[arr.length-1].b : 0) };
}
const fmtTime = sec => Math.floor(sec/60) + ':' + String(Math.round(sec%60)).padStart(2, '0');

function setSongOn(on, quiet){
  songOn = on; songBar = -1; songEnded = false; queuedScene = -1;
  $('songOn').classList.toggle('on', on); $('songOn').textContent = on ? '■ Song mode on' : '▶ Song mode';
  $('songBtn').classList.toggle('on', on);
  if (!quiet){ toast(on ? 'song mode · scenes follow the arrangement' : 'song mode off'); haptic('medium'); }
  if (on && !playing && ac) applyScene(arr[0] ? arr[0].s : 0);
  renderBlocks();
}
function setSongOpen(on){
  document.body.classList.toggle('song-open', on);
  if (on && document.body.classList.contains('pads-open')) setPadsOpen(false);
  renderBlocks(); resize(); updateBack();
}
function renderBlocks(){
  const box = $('blocks'); if (!box) return;
  selBlk = Math.max(0, Math.min(arr.length - 1, selBlk));
  box.innerHTML = '';
  arr.forEach((b, k) => {
    const el = document.createElement('div'); el.className = 'blk'; el.dataset.s = b.s;
    el.style.width = (58 + Math.min(16, b.b)*5) + 'px';
    if (k === selBlk) el.classList.add('sel');
    el.innerHTML = '<div class="sc">' + 'ABCD'[b.s] + '<small>' + b.b + (b.b === 1 ? ' bar' : ' bars') + '</small></div><div class="bar"></div>';
    el.onclick = () => { selBlk = k; renderBlocks(); haptic('select'); };   // тап — выбрать блок
    box.appendChild(el);
  });
  // панель выбранного блока
  const b = arr[selBlk];
  document.querySelectorAll('#edScene button').forEach(x => x.classList.toggle('on', b && +x.dataset.v === b.s));
  document.querySelectorAll('#edBars button').forEach(x => x.classList.toggle('on', b && +x.dataset.v === b.b));
  $('edLeft').disabled = selBlk <= 0; $('edRight').disabled = selBlk >= arr.length - 1; $('edDel').disabled = arr.length <= 1;
  const sec = arrTotal()*STEPS*stepDur();
  $('songLen').textContent = arrTotal() + ' bars · ' + fmtTime(sec);
  $('songLoop').classList.toggle('on', songLoop);
  updateSongProgress();
}
function updateSongProgress(){
  const els = document.querySelectorAll('#blocks .blk'); if (!els.length) return;
  const pos = playPos();
  let cur = -1, frac = 0;
  if (songOn && playing && songBar >= 0){
    const r = blockAt(songBar); cur = r.idx;
    frac = Math.min(1, ((songBar - r.start) + (pos >= 0 ? (pos % STEPS)/STEPS : 0)) / r.blk.b);
  }
  els.forEach((el, k) => { el.classList.toggle('cur', k === cur); el.lastChild.style.width = k === cur ? (frac*100) + '%' : (k < cur ? '100%' : '0'); });
}
$('songBtn').onclick = () => setSongOpen(!document.body.classList.contains('song-open'));
$('songClose').onclick = () => setSongOpen(false);
$('songOn').onclick = () => setSongOn(!songOn);
$('songLoop').onclick = () => { songLoop = !songLoop; renderBlocks(); toast(songLoop ? 'loop on' : 'stops at the end'); };
// новый блок — сразу после выбранного (следующая сцена, та же длина)
function addBlock(copy){
  if (arr.length >= 32){ toast('max 32 blocks'); return; }
  const b = arr[selBlk] || { s:0, b:4 };
  arr.splice(selBlk + 1, 0, { s: copy ? b.s : (b.s + 1) % 4, b: b.b }); selBlk++;
  renderBlocks(); scrollToSel(); haptic('select');
}
function scrollToSel(){ const el = document.querySelectorAll('#blocks .blk')[selBlk]; if (el) el.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' }); }
$('blkAdd').onclick = () => addBlock(false);
$('edDup').onclick = () => addBlock(true);
$('edDel').onclick = () => {
  if (arr.length <= 1){ toast('at least one block'); return; }
  arr.splice(selBlk, 1); selBlk = Math.min(selBlk, arr.length - 1); renderBlocks(); haptic('light');
};
$('edLeft').onclick = () => { if (selBlk > 0){ [arr[selBlk-1], arr[selBlk]] = [arr[selBlk], arr[selBlk-1]]; selBlk--; renderBlocks(); scrollToSel(); } };
$('edRight').onclick = () => { if (selBlk < arr.length - 1){ [arr[selBlk+1], arr[selBlk]] = [arr[selBlk], arr[selBlk+1]]; selBlk++; renderBlocks(); scrollToSel(); } };
document.querySelectorAll('#edScene button').forEach(x => x.onclick = () => { if (arr[selBlk]){ arr[selBlk].s = +x.dataset.v; renderBlocks(); haptic('select'); } });
document.querySelectorAll('#edBars button').forEach(x => x.onclick = () => { if (arr[selBlk]){ arr[selBlk].b = +x.dataset.v; renderBlocks(); haptic('select'); } });
document.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => { arr = tplArr(b.dataset.tpl); selBlk = 0; songBar = -1; renderBlocks(); toast('template · ' + b.textContent); });
$('scCopy2').onclick = () => $('scCopy').click();

// ============================================================
//  ЭКСПОРТ: офлайн-рендер аранжировки → WAV / MP3 → скачать или отправить в чат бота
// ============================================================
function renderStep(i, t){
  const sd = stepDur(), fired = [];
  for (const tr of tracks){
    if (!tr.pat[i] || tr.mute) continue;
    if (tr.prob[i] < 1 && Math.random() > tr.prob[i]) continue;
    const sw = (i % 2 === 1) ? Math.min(0.75, swing + (tr.params.swing||0)) * sd * 0.5 : 0;
    const th = t + sw, r = tr.rat[i] || 1;
    for (let k=0;k<r;k++) hit(tr, th + k*sd/r, i, tr.vel[i] * (k ? 0.8 : 1));
    fired.push([tr, th]);
  }
  for (const [src, th] of fired) for (const tr of tracks) if (tr.params.duck > 0 && scSource(tr) === src) duckAt(tr, th);
}
async function renderSong(onProgress){
  const sd = stepDur(), barDur = sd*STEPS, bars = arrTotal(), SR = 44100;
  const barScene = []; for (const b of arr) for (let k=0;k<b.b;k++) barScene.push(b.s);
  const off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil((bars*barDur + 3)*SR), SR);
  if (playing) setPlaying(false); releasePads();
  const live = engineSnapshot(), liveCh = tracks.map(t => t.ch), liveScene = scene, liveSolo = solo;
  RENDERING = true; solo = null;
  try {
    ac = off; buildGraph(true); tracks.forEach(tr => { tr.ch = null; buildChain(tr); });
    const scheduleBar = b => { scene = barScene[b]; tracks.forEach(bindScene); for (let i=0;i<STEPS;i++) renderStep(i, b*barDur + i*sd); };
    scheduleBar(0); if (bars > 1) scheduleBar(1);
    // планируем по такту на шаг вперёд, приостанавливая рендер — так не копится лишняя нагрузка, и видно прогресс
    for (let b = 1; b < bars; b++){
      const bb = b;
      off.suspend(bb*barDur).then(() => { if (bb + 1 < bars) scheduleBar(bb + 1); onProgress && onProgress(bb/bars); off.resume(); });
    }
    return await off.startRendering();
  } finally {
    engineRestore(live); tracks.forEach((tr, k) => tr.ch = liveCh[k]); scene = liveScene; tracks.forEach(bindScene);
    solo = liveSolo; RENDERING = false;
  }
}
function toWav(buf){
  const n = buf.length, L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const ab = new ArrayBuffer(44 + n*4), v = new DataView(ab);
  const str = (o, t) => { for (let i=0;i<t.length;i++) v.setUint8(o+i, t.charCodeAt(i)); };
  str(0,'RIFF'); v.setUint32(4, 36 + n*4, true); str(8,'WAVE'); str(12,'fmt ');
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,2,true); v.setUint32(24,buf.sampleRate,true);
  v.setUint32(28,buf.sampleRate*4,true); v.setUint16(32,4,true); v.setUint16(34,16,true); str(36,'data'); v.setUint32(40,n*4,true);
  let o = 44;
  for (let i=0;i<n;i++){ const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i]));
    v.setInt16(o, l*32767, true); v.setInt16(o+2, r*32767, true); o += 4; }
  return new Blob([ab], { type:'audio/wav' });
}
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
async function toMp3(buf, onProgress){
  if (!window.lamejs) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js');
  const enc = new lamejs.Mp3Encoder(2, buf.sampleRate, 192), n = buf.length, B = 1152, out = [];
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const l16 = new Int16Array(B), r16 = new Int16Array(B);
  for (let i=0, k=0; i<n; i+=B, k++){
    const m = Math.min(B, n - i);
    for (let j=0;j<m;j++){ l16[j] = Math.max(-1, Math.min(1, L[i+j]))*32767; r16[j] = Math.max(-1, Math.min(1, R[i+j]))*32767; }
    const d = enc.encodeBuffer(m < B ? l16.subarray(0, m) : l16, m < B ? r16.subarray(0, m) : r16);
    if (d.length) out.push(new Uint8Array(d));
    if (k % 150 === 0){ onProgress && onProgress(i/n); await new Promise(r => setTimeout(r, 0)); }
  }
  const e = enc.flush(); if (e.length) out.push(new Uint8Array(e));
  return new Blob(out, { type:'audio/mpeg' });
}
const trackName = () => ((curProj ? curProj.name : P.name) || 'locked room').replace(/[^\w\- ]+/g, '').trim() || 'locked-room';
function requestWrite(){
  return new Promise(res => { if (!tg.requestWriteAccess || !tg.isVersionAtLeast('6.9')) return res(true); try { tg.requestWriteAccess(ok => res(ok)); } catch (e) { res(true); } });
}
async function deliver(blob, ext){
  const name = trackName(), fname = name + '.' + ext;
  if (inTG && BOT_SEND_URL){
    if (!(await requestWrite())) throw new Error('allow the bot to message you');
    const fd = new FormData(); fd.append('initData', tg.initData); fd.append('title', name); fd.append('file', blob, fname);
    const r = await fetch(BOT_SEND_URL, { method:'POST', body:fd });
    const j = await r.json().catch(() => ({ ok:false }));
    if (!r.ok || !j.ok) throw new Error(j.error || 'send failed');
    return 'sent to the bot chat';
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  return inTG ? 'saved · bot server not configured' : 'downloaded · ' + fname;
}
document.querySelectorAll('.fmt button').forEach(b => b.onclick = () => { expFmt = b.dataset.fmt; document.querySelectorAll('.fmt button').forEach(x => x.classList.toggle('on', x === b)); });
$('renderBtn').onclick = async () => {
  if (!ac || RENDERING) return;
  const btn = $('renderBtn'), msg = $('renderMsg'), set = t => { msg.textContent = t; };
  btn.disabled = true;
  try {
    set('rendering 0%');
    const buf = await renderSong(p => set('rendering ' + Math.round(p*100) + '%'));
    set(expFmt === 'mp3' ? 'encoding mp3…' : 'encoding wav…');
    const blob = expFmt === 'mp3' ? await toMp3(buf, p => set('encoding mp3 ' + Math.round(p*100) + '%')) : toWav(buf);
    set((inTG && BOT_SEND_URL ? 'sending ' : 'saving ') + (blob.size/1048576).toFixed(1) + ' MB…');
    const res = await deliver(blob, expFmt);
    set(res); toast(res); haptic('success');
  } catch (e) { console.warn(e); set('error · ' + (e.message || e)); haptic('error'); }
  finally { btn.disabled = false; }
};

// ============================================================
//  СОХРАНЕНИЕ: проекты, автосохранение, код для обмена
// ============================================================
const r3 = x => Math.round(x*1000)/1000;
function encScene(s){
  const a = []; for (let i=0;i<MAXS;i++) if (s.pat[i]) a.push(i);
  if (!a.length) return 0;
  const o = { a }, n = a.map(i=>s.notes[i]), e = a.map(i=>Math.round(s.vel[i]*100)), c = a.map(i=>Math.round(s.prob[i]*100)), r = a.map(i=>s.rat[i]);
  if (n.some(x=>x)) o.n = n; if (e.some(x=>x!==100)) o.e = e; if (c.some(x=>x!==100)) o.c = c; if (r.some(x=>x!==1)) o.r = r;
  return o;
}
function decScene(o){
  const s = newScene(); if (!o || !o.a) return s;
  o.a.forEach((i,k) => { if (i >= MAXS) return; s.pat[i] = true; if (o.n) s.notes[i] = o.n[k]; if (o.e) s.vel[i] = o.e[k]/100; if (o.c) s.prob[i] = o.c[k]/100; if (o.r) s.rat[i] = o.r[k]; });
  return s;
}
function serialize(){
  return { v:2, preset:P.name, bpm, swing:r3(swing), steps:STEPS, scene, fx:fxMode, arr:arr.map(b => [b.s, b.b]), song:songOn ? 1 : 0, loop:songLoop ? 1 : 0,
    tracks: tracks.map(tr => ({ v:tr.v, m:tr.mute ? 1 : 0, sc: tr.scSrc ? tracks.indexOf(tr.scSrc) : -1,
      p: Object.fromEntries(Object.entries(tr.params).map(([k,x]) => [k, r3(x)])), s: tr.scn.map(encScene) })) };
}
function deserialize(d){
  if (!d || !Array.isArray(d.tracks) || !d.tracks.length) throw new Error('bad project');
  applyPreset(Math.max(0, PRESETS.findIndex(p => p.name === d.preset)));
  bpm = Math.max(60, Math.min(200, +d.bpm || P.bpm)); swing = +d.swing || 0; STEPS = d.steps === 32 ? 32 : 16;
  scene = Math.max(0, Math.min(SCENES-1, d.scene|0)); queuedScene = -1; undoStack = [];
  arr = Array.isArray(d.arr) && d.arr.length ? d.arr.slice(0, 32).map(([s, b]) => ({ s:Math.max(0, Math.min(3, s|0)), b:BAR_OPTS.includes(b) ? b : 4 })) : tplArr('club');
  songLoop = d.loop !== 0; setSongOn(!!d.song, true);
  tracks = d.tracks.slice(0, MAX_SOUNDS).map(x => {
    const tr = makeTrack(SYNTH[x.v] ? x.v : 'perc'); tr.mute = !!x.m; Object.assign(tr.params, x.p || {});
    tr.scn = Array.from({length:SCENES}, (_,k) => decScene(x.s && x.s[k])); bindScene(tr); return tr; });
  d.tracks.forEach((x,k) => { if (tracks[k] && x.sc >= 0 && tracks[x.sc] && x.sc !== k) tracks[k].scSrc = tracks[x.sc]; });
  tracks.forEach(buildChain);
  linkFlash = {}; makeSprites(); if (d.fx && FX_MODES.includes(d.fx)) setFx(d.fx); showSwing(); updateUI(); renderLib(); renderBlocks();
}

// ---------- хранилище: Telegram CloudStorage (если внутри Telegram) + localStorage ----------
const tg = (window.Telegram && window.Telegram.WebApp) || null;
const inTG = !!(tg && tg.initData);
const useCloud = !!(inTG && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9'));
const cloud = {
  set: (k, v) => new Promise((res, rej) => tg.CloudStorage.setItem(k, v, (e, ok) => e ? rej(e) : res(ok))),
  get: k => new Promise((res, rej) => tg.CloudStorage.getItem(k, (e, v) => e ? rej(e) : res(v))),
  getMany: ks => new Promise((res, rej) => tg.CloudStorage.getItems(ks, (e, v) => e ? rej(e) : res(v))),
  del: ks => new Promise((res, rej) => tg.CloudStorage.removeItems(ks, (e, ok) => e ? rej(e) : res(ok))),
};
const local = {
  set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} },
  get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } },
  del(k){ try { localStorage.removeItem(k); } catch (e) {} },
};
const CHUNK = 3500;   // у CloudStorage лимит 4096 символов на значение — режем на части
async function kvSet(key, str){
  local.set(key, str);
  if (!useCloud) return;
  const n = Math.max(1, Math.ceil(str.length/CHUNK));
  for (let k=0;k<n;k++) await cloud.set(key+'_'+k, str.slice(k*CHUNK, (k+1)*CHUNK));
  await cloud.set(key+'_n', String(n));
}
async function kvGet(key){
  if (useCloud){
    try { const n = +(await cloud.get(key+'_n'));
      if (n){ const ks = Array.from({length:n}, (_,k) => key+'_'+k), m = await cloud.getMany(ks); return ks.map(k => m[k] || '').join(''); }
    } catch (e) {}
  }
  return local.get(key);
}
async function kvDel(key){
  local.del(key);
  if (!useCloud) return;
  try { const n = +(await cloud.get(key+'_n')) || 0; await cloud.del([key+'_n', ...Array.from({length:n}, (_,k) => key+'_'+k)]); } catch (e) {}
}

let projIndex = [];
async function loadIndex(){ try { projIndex = JSON.parse(await kvGet('lr_idx') || '[]'); } catch (e) { projIndex = []; } }
const saveIndex = () => kvSet('lr_idx', JSON.stringify(projIndex));
async function saveProject(name){
  name = (name || '').trim().slice(0, 40) || (curProj ? curProj.name : 'Track ' + pad(projIndex.length+1));
  let id = curProj && curProj.name === name ? curProj.id : null;
  if (!id){ const same = projIndex.find(p => p.name === name); id = same ? same.id : Date.now().toString(36); }
  try {
    await kvSet('lr_p'+id, JSON.stringify(serialize()));
    projIndex = projIndex.filter(p => p.id !== id); projIndex.unshift({ id, name, ts:Date.now() });
    if (projIndex.length > 40) projIndex.length = 40;
    await saveIndex(); curProj = { id, name }; updateUI(); renderDrawer(); toast('saved · ' + name); haptic('success');
  } catch (e) { toast('save failed'); haptic('error'); }
}
async function openProject(p){
  try { const s = await kvGet('lr_p'+p.id); deserialize(JSON.parse(s)); curProj = { id:p.id, name:p.name }; updateUI(); renderDrawer(); toast('loaded · ' + p.name); }
  catch (e) { toast('cannot load'); }
}
async function deleteProject(p){
  await kvDel('lr_p'+p.id); projIndex = projIndex.filter(x => x.id !== p.id); await saveIndex();
  if (curProj && curProj.id === p.id) curProj = null;
  renderDrawer(); updateUI(); toast('deleted');
}

// код проекта: сжатый JSON в base64url (подходит для сообщения или ссылки)
const b64u = bytes => { let s = ''; for (let i=0;i<bytes.length;i+=0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
const unb64u = str => { const s = atob(str.replace(/-/g,'+').replace(/_/g,'/')); const b = new Uint8Array(s.length); for (let i=0;i<s.length;i++) b[i] = s.charCodeAt(i); return b; };
async function encodeProject(){
  const json = JSON.stringify(serialize());
  if (window.CompressionStream){
    const buf = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'LR1' + b64u(new Uint8Array(buf));
  }
  return 'LR0' + b64u(new TextEncoder().encode(json));
}
async function decodeProject(code){
  code = code.trim().replace(/^.*#p=/, '');
  const kind = code.slice(0,3), bytes = unb64u(code.slice(3));
  if (kind === 'LR1') return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
  if (kind === 'LR0') return JSON.parse(new TextDecoder().decode(bytes));
  throw new Error('not a LOCKED ROOM code');
}
async function copyText(txt){
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) { return false; }
}

// автосохранение текущей сессии: { ts, cur, d } — с меткой времени, чтобы при запуске взять самую свежую копию
let lastAuto = '';
async function autosave(force){
  const body = JSON.stringify({ cur:curProj, d:serialize() });
  if (!force && body === lastAuto) return;
  lastAuto = body;
  const s = JSON.stringify({ ts:Date.now(), cur:curProj, d:JSON.parse(body).d });
  local.set('lr_auto', s);                                      // локально — сразу и синхронно
  if (useCloud) try { await kvSet('lr_auto', s); } catch (e) {}  // облако — следом
}
setInterval(autosave, 10000);
let lastSession = null;
function restoreLastSession(){
  if (!lastSession) return;
  try { deserialize(lastSession.d); curProj = lastSession.cur || null; updateUI(); toast('last session restored'); }
  catch (e) { toast('cannot restore'); }
}
async function loadAutosave(){
  const parse = v => { try { const o = JSON.parse(v); return o && o.d ? o : (o && o.tracks ? { ts:0, d:o } : null); } catch (e) { return null; } };
  const loc = parse(local.get('lr_auto'));
  let cl = null; if (useCloud) try { cl = parse(await kvGet('lr_auto')); } catch (e) {}
  return [loc, cl].filter(Boolean).sort((a, b) => (b.ts||0) - (a.ts||0))[0] || null;
}

// свернули приложение / заблокировали экран: музыка стоп, сессия сохранена
function onHide(){
  releasePads();
  if (playing) setPlaying(false);
  if (ac && ac.state === 'running') ac.suspend().catch(()=>{});
  autosave();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); });
addEventListener('pagehide', onHide);

// ============================================================
//  ПАНЕЛЬ «TRACKS»: мои треки + пресеты
// ============================================================
let delArm = null, showCode = false;
function renderDrawer(){
  const box = $('pre'); box.innerHTML = '';
  const H = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; box.appendChild(d); return d; };
  H('dhead', '<b>TRACKS</b><button id="drClose"><svg class="ic"><use href="#i-x"/></svg></button>').querySelector('button').onclick = closeDrawer;
  H('pg', 'My tracks' + (useCloud ? ' · telegram cloud' : ''));
  const act = H('pact', '<input id="pjName" placeholder="track name" maxlength="40"><button id="pjSave" class="acc">Save</button>');
  act.querySelector('#pjName').value = curProj ? curProj.name : '';
  act.querySelector('#pjName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') saveProject(e.target.value); });
  act.querySelector('#pjSave').onclick = () => saveProject($('pjName').value);
  if (lastSession && lastSession.d){
    const r = document.createElement('div'); r.className = 'pr';
    const nm = lastSession.cur ? lastSession.cur.name : lastSession.d.preset;
    const when = lastSession.ts ? new Date(lastSession.ts) : null;
    r.innerHTML = '<div class="t">↺ Last session<small>' + escapeHtml(nm || '') + (when ? ' · ' + when.toLocaleDateString() + ' ' + when.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '') + '</small></div>';
    r.onclick = () => { restoreLastSession(); closeDrawer(); };
    box.appendChild(r);
  }
  if (!projIndex.length) H('pempty', 'no saved tracks yet');
  for (const p of projIndex){
    const r = document.createElement('div'); r.className = 'pr' + (curProj && curProj.id === p.id ? ' cur' : '');
    const d = new Date(p.ts);
    r.innerHTML = '<div class="t">'+escapeHtml(p.name)+'<small>'+d.toLocaleDateString()+' '+d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})+'</small></div><button class="x'+(delArm===p.id?' arm':'')+'">'+(delArm===p.id?'delete?':'×')+'</button>';
    r.onclick = () => { delArm = null; openProject(p); closeDrawer(); };
    r.querySelector('.x').onclick = e => { e.stopPropagation(); if (delArm === p.id){ delArm = null; deleteProject(p); } else { delArm = p.id; renderDrawer(); } };
    box.appendChild(r);
  }
  const share = H('pact', '<button id="pjCopy">Copy code</button><button id="pjPaste">Paste code</button>' + (location.protocol.startsWith('http') ? '<button id="pjLink">Copy link</button>' : ''));
  share.querySelector('#pjCopy').onclick = async () => { const c = await encodeProject(); if (await copyText(c)) toast('code copied'); else { showCode = c; renderDrawer(); } };
  share.querySelector('#pjPaste').onclick = () => { showCode = ''; renderDrawer(); };
  const lk = share.querySelector('#pjLink');
  if (lk) lk.onclick = async () => { const c = await encodeProject(), url = location.origin + location.pathname + '#p=' + c; if (await copyText(url)) toast('link copied'); else { showCode = url; renderDrawer(); } };
  if (showCode !== false){
    const ta = H('pact', '<textarea id="pjCode" spellcheck="false" placeholder="paste a LOCKED ROOM code here"></textarea><button id="pjImport" class="acc">Import</button><button id="pjHide">Close</button>');
    const t = ta.querySelector('textarea'); t.value = showCode || ''; t.addEventListener('keydown', e => e.stopPropagation());
    if (showCode) { t.focus(); t.select(); }
    ta.querySelector('#pjImport').onclick = async () => { try { deserialize(await decodeProject(t.value)); curProj = null; showCode = false; renderDrawer(); updateUI(); toast('imported'); closeDrawer(); } catch (e) { toast('bad code'); } };
    ta.querySelector('#pjHide').onclick = () => { showCode = false; renderDrawer(); };
  }
  let gen = '';
  PRESETS.forEach((pr, i) => {
    if (pr.genre !== gen){ gen = pr.genre; H('pg', gen); }
    const r = document.createElement('div'); r.className = 'pr' + (!curProj && i===presetIdx ? ' cur' : '');
    r.innerHTML = '<div class="t">'+pr.name+'<small>'+pr.ref+'</small></div><div class="b">'+pr.bpm+'</div>';
    r.onclick = () => { loadPreset(i); closeDrawer(); };
    box.appendChild(r);
  });
}
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function openDrawer(){ delArm = null; renderDrawer(); $('pre').classList.add('open'); updateBack(); }
function closeDrawer(){ $('pre').classList.remove('open'); showCode = false; updateBack(); }
$('preBtn').onclick = $('titleBtn').onclick = ()=>{ $('pre').classList.contains('open') ? closeDrawer() : openDrawer(); };

// ============================================================
//  UI
// ============================================================
// название трека на телефоне: шрифт уменьшается, пока название не влезет целиком
function fitTitle(){
  const b = $('titleName'); if (!b || !b.offsetParent) return;
  b.classList.remove('two'); $('titleBtn').classList.remove('two');
  let fs = 12; b.style.fontSize = fs + 'px'; b.style.letterSpacing = '';
  while (b.scrollWidth > b.clientWidth + 1 && fs > 9.5){ fs -= 0.5; b.style.fontSize = fs + 'px'; if (fs < 10.5) b.style.letterSpacing = '.06em'; }
  if (b.scrollWidth > b.clientWidth + 1){            // всё равно не влезло — в две строки, подпись жанра прячем
    b.classList.add('two'); $('titleBtn').classList.add('two'); b.style.fontSize = '11px'; b.style.letterSpacing = '.06em';
  }
}
addEventListener('resize', fitTitle);
function updateUI(){
  if ($('pre').classList.contains('open')) renderDrawer();
  $('titleCap').textContent = curProj ? 'MY TRACK' : (P.genre === 'Originals' ? 'PRESET' : P.genre);
  $('titleName').textContent = curProj ? curProj.name : P.name;
  fitTitle();
  $('presetName').innerHTML = curProj ? 'TRACK / <b>' + escapeHtml(curProj.name) + '</b> · ' + P.name
    : 'PRESET / <b>' + P.name + '</b>' + (P.ref && P.genre !== 'Originals' ? ' · ' + P.ref : '');
  $('bpm').innerHTML = '<b>'+bpm+'</b> BPM'; if (bpmOpen()) showBpmSlider();
  showSwing(); updatePerform();
}
let toastT = 0;
function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1600); }
// темп: тап по BPM открывает ползунок
function bpmOpen(){ return $('bpmPop').classList.contains('open'); }
function showBpmSlider(){ const s = $('bpmSlider'); s.value = bpm; s.style.setProperty('--p', ((bpm-60)/140*100)+'%'); $('bpmPopV').textContent = bpm; }
function openBpm(){
  const r = $('bpm').getBoundingClientRect(), pop = $('bpmPop');
  pop.classList.add('open'); $('bpm').classList.add('on'); showBpmSlider();
  const w = pop.offsetWidth;
  pop.style.top = (r.bottom + 8) + 'px';
  pop.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left + r.width/2 - w/2)) + 'px';
  updateBack();
}
function closeBpm(){ $('bpmPop').classList.remove('open'); $('bpm').classList.remove('on'); updateBack(); }
$('bpm').onclick = e => { e.stopPropagation(); bpmOpen() ? closeBpm() : openBpm(); };
$('bpmSlider').oninput = e => { bpm = +e.target.value; showBpmSlider(); $('bpm').innerHTML = '<b>'+bpm+'</b> BPM'; };
$('bpmSlider').addEventListener('keydown', e => e.stopPropagation());
document.addEventListener('pointerdown', e => { if (bpmOpen() && !e.target.closest('#bpmPop') && !e.target.closest('#bpm')) closeBpm(); }, true);
addEventListener('resize', () => { if (bpmOpen()) closeBpm(); });
const clearScene = ()=>{ pushUndo(); for (const tr of tracks) for (let i=0;i<STEPS;i++) if (tr.pat[i]) removeLink(i, tr); toast('scene '+'ABCD'[scene]+' cleared · undo to restore'); };
document.querySelectorAll('.clearBtn').forEach(b => b.onclick = clearScene);
const PAD_KEYS = { z:'lpf', x:'hpf', c:'kill', v:'wash', b:'roll4', n:'roll8', m:'build' };
addEventListener('keydown', e=>{
  if (!ac || e.repeat) return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.code==='Space'){ e.preventDefault(); setPlaying(!playing); }
  if (e.key==='Escape'){ closeBpm(); closePanel(); closeLib(); closeDrawer(); }
  if (e.key==='ArrowRight') loadPreset(presetIdx+1);
  if (e.key==='ArrowLeft') loadPreset(presetIdx-1);
  if ('1234'.includes(e.key)) setScene(+e.key - 1);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); saveProject(curProj ? curProj.name : ''); return; }
  if (e.key.toLowerCase() === 'g') variate();
  const fx = PAD_KEYS[e.key.toLowerCase()]; if (fx && !e.ctrlKey && !e.metaKey) padSet(fx, true);
});
addEventListener('keyup', e=>{ const fx = PAD_KEYS[e.key.toLowerCase()]; if (fx) padSet(fx, false); });

// ============================================================
//  TELEGRAM MINI APP
// ============================================================
function haptic(kind){
  if (!inTG || !tg.HapticFeedback) return;
  try {
    if (kind === 'select') tg.HapticFeedback.selectionChanged();
    else if (kind === 'success' || kind === 'error') tg.HapticFeedback.notificationOccurred(kind);
    else tg.HapticFeedback.impactOccurred(kind);
  } catch (e) {}
}
function updateBack(){
  if (!inTG || !tg.BackButton) return;
  const any = sel || bpmOpen() || document.body.classList.contains('pads-open') || document.body.classList.contains('song-open') || $('lib').classList.contains('open') || $('pre').classList.contains('open');
  any ? tg.BackButton.show() : tg.BackButton.hide();
}
function applySafeArea(){
  if (!inTG) return;
  const sa = tg.safeAreaInset || {}, ca = tg.contentSafeAreaInset || {};
  document.documentElement.style.setProperty('--sat', ((sa.top||0) + (ca.top||0)) + 'px');
  document.documentElement.style.setProperty('--sab', ((sa.bottom||0) + (ca.bottom||0)) + 'px');
}
if (inTG){
  try {
    tg.ready(); tg.expand();
    if (tg.isVersionAtLeast('7.7') && tg.disableVerticalSwipes) tg.disableVerticalSwipes();   // свайп по полю не закрывает приложение
    if (tg.isVersionAtLeast('6.1')){ tg.setHeaderColor('#050505'); tg.setBackgroundColor('#050505'); }
    if (tg.isVersionAtLeast('7.10') && tg.setBottomBarColor) tg.setBottomBarColor('#050505');
    tg.BackButton.onClick(() => {
      if (bpmOpen()) closeBpm();
      else if ($('lib').classList.contains('open')) closeLib();
      else if ($('pre').classList.contains('open')) closeDrawer();
      else if (sel) closePanel();
      else if (document.body.classList.contains('pads-open')) setPadsOpen(false);
      else if (document.body.classList.contains('song-open')) setSongOpen(false);
    });
    applySafeArea();
    for (const ev of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged']) tg.onEvent(ev, () => { applySafeArea(); resize(); });
    tg.onEvent('deactivated', onHide);
    $('gate').querySelector('p').textContent = 'tap to start · sound on';
  } catch (e) { console.warn(e); }
}

// ============================================================
//  СТАРТ
// ============================================================
// ============================================================
//  ЗАГРУЗОЧНЫЙ ЭКРАН: эмблема собирается, кольцо засечек = прогресс
// ============================================================
let gateReady = false, gateProg = 0, gateTarget = 0.1, gateShown = 0;
(function gateIntro(){
  const t = $('gateTitle'), html = [];
  let k = 0;
  for (const ch of 'LOCKED/ROOM'){
    const inner = ch === '/' ? '<i>/</i>' : ch;
    html.push('<span style="animation-delay:'+(0.25 + k++*0.06).toFixed(2)+'s">'+inner+'</span>');
  }
  t.innerHTML = html.join('');
  const cv = $('gateCv'), x = cv.getContext('2d'), t0 = performance.now();
  const accOf = () => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#ff2e3a';
  function frame(){
    if (!document.body.contains(cv)) return;
    const D = cv.clientWidth || 260, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(D*dpr) || cv.height !== Math.round(D*dpr)){ cv.width = cv.height = Math.round(D*dpr); }
    const T = (performance.now() - t0)/1000, acc = accOf(), c = D/2;
    gateShown += (gateProg - gateShown)*0.08;
    x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,D,D);
    const Rt = D*0.17, Rn = D*0.36, Ro = D*0.43, ease = v => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
    // свечение
    const gr = x.createRadialGradient(c, c, 0, c, c, Rn*1.1); gr.addColorStop(0, acc + '33'); gr.addColorStop(1, 'transparent');
    x.fillStyle = gr; x.fillRect(0,0,D,D);
    // кольцо засечек = прогресс загрузки
    const NT = 72, rot = T*0.15;
    for (let k=0;k<NT;k++){
      const a = -Math.PI/2 + k/NT*Math.PI*2 + rot, on = k/NT < gateShown;
      const L = on ? D*0.03 + Math.sin(T*6 + k*0.5)*D*0.008*(gateReady?1:0.4) : D*0.015;
      x.strokeStyle = on ? acc : 'rgba(255,255,255,.14)'; x.lineWidth = on ? 2 : 1.2;
      x.beginPath(); x.moveTo(c+Math.cos(a)*Ro, c+Math.sin(a)*Ro); x.lineTo(c+Math.cos(a)*(Ro+L), c+Math.sin(a)*(Ro+L)); x.stroke();
    }
    // спиральные связи прорастают
    const tA = i => -Math.PI/2 + i/16*Math.PI*2, nA = k => -Math.PI/2 + (k+0.5)/6*Math.PI*2;
    const L = [[0,0],[4,0],[8,0],[12,0],[2,3],[6,3],[10,3],[14,3],[3,1],[11,2],[7,4],[13,5]];
    L.forEach(([i,k], n) => {
      const grow = ease((T - 0.7 - n*0.07)/0.9); if (grow <= 0) return;
      const th = tA(i); let d = nA(k) - th; d = Math.atan2(Math.sin(d), Math.cos(d));
      x.strokeStyle = k === 0 || k === 3 ? acc : 'rgba(255,255,255,.35)'; x.lineWidth = k === 0 || k === 3 ? 1.6 : 1;
      x.beginPath();
      for (let j=0;j<=40*grow;j++){ const u = j/40, e = u*u*(3-2*u), r = Rt + (Rn-Rt)*(1-(1-u)*(1-u)), an = th + d*e;
        const px = c+Math.cos(an)*r, py = c+Math.sin(an)*r; j ? x.lineTo(px,py) : x.moveTo(px,py); }
      x.stroke();
    });
    // кольцо времени: точки загораются по очереди
    x.strokeStyle = 'rgba(255,255,255,.15)'; x.lineWidth = 1; x.beginPath(); x.arc(c, c, Rt, 0, Math.PI*2); x.stroke();
    const beat = (T*2) % 1;
    for (let i=0;i<16;i++){
      const ap = ease((T - 0.15 - i*0.035)/0.3); if (ap <= 0) continue;
      const a = tA(i), px = c+Math.cos(a)*Rt, py = c+Math.sin(a)*Rt, cur = gateReady && Math.floor(T*8) % 16 === i;
      x.fillStyle = cur ? acc : '#fff'; x.globalAlpha = ap;
      if (i % 4 === 0){ const s = 3.6*ap; x.fillRect(px-s, py-s, s*2, s*2); } else { x.beginPath(); x.arc(px, py, 2.4*ap, 0, Math.PI*2); x.fill(); }
    }
    x.globalAlpha = 1;
    // вершины звуков
    for (let k=0;k<6;k++){
      const ap = ease((T - 1.0 - k*0.08)/0.4); if (ap <= 0) continue;
      const a = nA(k), px = c+Math.cos(a)*Rn, py = c+Math.sin(a)*Rn, hot = k === 0 || k === 3, r = 6*ap;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI*2);
      if (hot){ x.fillStyle = acc; x.fill(); } else { x.fillStyle = '#050505'; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.2; x.stroke(); }
    }
    // ромб в центре пульсирует в темп
    const s = 6 + (1 - beat)*3*(gateReady ? 1 : 0.3);
    x.save(); x.translate(c, c); x.rotate(Math.PI/4 + T*0.5); x.fillStyle = acc; x.fillRect(-s/2, -s/2, s, s); x.restore();
    gateProg += (gateTarget - gateProg)*0.06;
    $('gatePct').textContent = Math.round(gateShown*100) + '%';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
// этапы загрузки: шрифты → сохранения → готово (не быстрее 1.6 с, чтобы анимация успела собраться)
let bootDone; const bootP = new Promise(r => bootDone = r);
(async function gateLoad(){
  const t0 = performance.now(), step = (v, txt) => { gateTarget = v; $('gateTxt').textContent = txt; };
  step(0.25, 'loading fonts');
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  step(0.6, 'restoring session'); await bootP;
  step(0.9, 'tuning synths'); await new Promise(r => setTimeout(r, Math.max(250, 1600 - (performance.now() - t0))));
  step(1, 'ready'); gateProg = 1;
  setTimeout(() => { gateReady = true; $('gate').classList.add('ready'); }, 450);
})();
$('gate').onpointerup = e=>{
  e.stopPropagation();
  if (!gateReady || $('gate').classList.contains('out')) return;
  gateT = performance.now(); initAudio();
  $('gate').classList.add('out'); setTimeout(() => $('gate').remove(), 750);
  if (!local.get('lr_coach')) document.body.classList.add('coach');
  ac.resume().catch(()=>{});            // звук включён, но старт — тапом по центру
  resize(); haptic('medium');
};
$('coachOk').onclick = ()=>{ document.body.classList.remove('coach'); local.set('lr_coach', '1'); resize(); };

const START_POOL = PRESETS.map((p, i) => i).filter(i => !PRESETS[i].blank);
const FIRST_PRESET = START_POOL[Math.floor(Math.random()*START_POOL.length)];   // каждый запуск — случайный пресет
makeGrain(); loadPreset(FIRST_PRESET); resize(); requestAnimationFrame(draw);
(async function boot(){
  await loadIndex();
  try {
    if (location.hash.startsWith('#p=')){ deserialize(await decodeProject(location.hash)); toast('track from link'); history.replaceState(null, '', location.pathname); return; }
    lastSession = await loadAutosave();      // запоминаем — откроется из Tracks → Last session
    lastAuto = JSON.stringify({ cur:curProj, d:serialize() });   // нетронутый случайный пресет не затирает прошлую сессию
  } catch (e) { console.warn('restore failed', e); loadPreset(FIRST_PRESET); }
  finally { bootDone(); }
})();
