// LOCKED ROOM — звуковой движок, синтезаторы, цепочки звуков и мастер-эффекты

// ============================================================
//  AUDIO ENGINE
// ============================================================
let curT = 0, fxRet, pLP, pHP, pKill, washIn, washDly, washFb, riser = null, ac, master, bus, busSh, busComp, revIn, dlyIn, dly, NB, an, spec;
let PIT = 0, DK = 1, CUR = null, STEP = 0, VEL = 1;   // контекст текущего удара
const curves = {};
function curve(k){ if (curves[k]) return curves[k]; const n=1024, c=new Float32Array(n);
  for (let i=0;i<n;i++){ const x=i*2/n-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); } return curves[k]=c; }
function osc(){ const o=ac.createOscillator(); o.detune.value=PIT*100; return o; }
const mtof = m => 440*Math.pow(2,(m-69)/12);

function initAudio(){
  ac = new (window.AudioContext||window.webkitAudioContext)();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
  master = ac.createGain(); master.gain.value = 0.85;
  an = ac.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.75; spec = new Uint8Array(an.frequencyBinCount); wave = new Uint8Array(an.fftSize);
  comp.connect(master); master.connect(ac.destination); master.connect(an);
  const hp = filt('highpass', 28); hp.connect(comp);
  fxRet = ac.createGain(); fxRet.connect(comp);
  busSh = shaper(P.grit||0); busComp = ac.createGain(); busComp.gain.value = 1/(1+(P.grit||0)*0.6);
  bus = ac.createGain(); bus.connect(busSh); busSh.connect(busComp);
  // живые мастер-эффекты: фильтры, срез низа, «смыв» в эхо
  pLP = filt('lowpass', 20000, 0.7); pHP = filt('highpass', 10, 0.7); pKill = filt('highpass', 10, 0.7);
  busComp.connect(pLP); pLP.connect(pHP); pHP.connect(pKill); pKill.connect(hp);
  washIn = ac.createGain(); washIn.gain.value = 0; washDly = ac.createDelay(2); washDly.delayTime.value = 0.33;
  washFb = ac.createGain(); washFb.gain.value = 0; const wlp = filt('lowpass', 2600), whp = filt('highpass', 300);
  pKill.connect(washIn); washIn.connect(washDly); washDly.connect(wlp); wlp.connect(whp); whp.connect(washFb); washFb.connect(washDly); whp.connect(fxRet);
  const len = ac.sampleRate*2.4, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c=0;c<2;c++){ const d = ir.getChannelData(c); for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); }
  const conv = ac.createConvolver(); conv.buffer = ir;
  revIn = ac.createGain(); const rv = ac.createGain(); rv.gain.value = 0.6;
  const rhp = filt('highpass', 350); revIn.connect(rhp); rhp.connect(conv); conv.connect(rv); rv.connect(comp);
  dlyIn = ac.createGain(); dly = ac.createDelay(2); const fb = ac.createGain(); fb.gain.value = 0.38;
  const dlp = filt('lowpass', 2400); const dw = ac.createGain(); dw.gain.value = 0.5;
  dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dw); dw.connect(comp);
  NB = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = NB.getChannelData(0); for (let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
  tracks.forEach(buildChain);
}

function out(rev=0, del=0, life=1){
  const g = ac.createGain(); g.gain.value = VEL; g.connect(CUR && CUR.ch ? CUR.ch.in : bus);
  life *= DK;
  setTimeout(()=>g.disconnect(), (life+0.5)*1000 + Math.max(0,(curT-ac.currentTime))*1000);
  if (rev){ const s=ac.createGain(); s.gain.value=rev; g.connect(s); s.connect(revIn); }
  if (del){ const s=ac.createGain(); s.gain.value=del; g.connect(s); s.connect(dlyIn); }
  return g;
}
function noise(t, dur){ const s=ac.createBufferSource(); s.buffer=NB; s.playbackRate.value=Math.pow(2,PIT/12); s.start(t, Math.random()*0.5); s.stop(t+dur*DK); return s; }
function filt(type, f, q=1){ const b=ac.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q; return b; }
function decay(g, t, peak, d, a=0.002){ d *= DK; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
function shaper(k){ const s=ac.createWaveShaper(); s.curve=curve(k); return s; }
const noteOf = tr => (tr && tr.notes) ? (tr.notes[STEP] || 0) : 0;
const cutHz = tr => 250*Math.pow(28, tr.params.cut);
const resQ  = tr => 1 + tr.params.res*24;
const HAT808 = [205.3, 304.4, 369.6, 522.7, 540, 800];
function metallic(t, dur, peak, rev, mult=1.4, bpf=10000){
  const bp = filt('bandpass', bpf, 1), hp = filt('highpass', 7000), g = ac.createGain();
  decay(g, t, peak, dur); bp.connect(hp); hp.connect(g); g.connect(out(rev, 0, dur+0.1));
  for (const f of HAT808){ const o = osc(); o.type = 'square'; o.frequency.value = f*mult; o.connect(bp); o.start(t); o.stop(t+(dur+0.05)*DK); }
}

const SYNTH = {
  // ---- drums ----
  kick(t){ const o=osc(), g=ac.createGain(), s=shaper(1.5+P.drive*0.25), l=ac.createGain(); l.gain.value=0.75;
    o.frequency.setValueAtTime(190,t); o.frequency.exponentialRampToValueAtTime(58,t+0.045); o.frequency.exponentialRampToValueAtTime(46,t+0.25);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.002); g.gain.setValueAtTime(1,t+0.06); g.gain.exponentialRampToValueAtTime(0.0001,t+0.3*DK);
    o.connect(g); g.connect(s); s.connect(l); l.connect(out(0,0,0.4)); o.start(t); o.stop(t+0.32*DK);
    const n=noise(t,0.012), h=filt('highpass',2500), cg=ac.createGain(); decay(cg,t,0.3,0.008); n.connect(h); h.connect(cg); cg.connect(out(0,0,0.1)); },
  kick808(t){ const o=osc(), g=ac.createGain(), s=shaper(4), l=ac.createGain(); l.gain.value=0.7;
    o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(50,t+0.07); o.frequency.exponentialRampToValueAtTime(44,t+0.5);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.002); g.gain.setValueAtTime(1,t+0.08); g.gain.exponentialRampToValueAtTime(0.0001,t+0.55*DK);
    o.connect(g); g.connect(s); s.connect(l); l.connect(out(0,0,0.6)); o.start(t); o.stop(t+0.6*DK);
    const n=noise(t,0.015), h=filt('highpass',1800), cg=ac.createGain(); decay(cg,t,0.35,0.01); n.connect(h); h.connect(cg); cg.connect(out(0,0,0.1)); },
  tom(t){ const o=osc(), g=ac.createGain(), s=shaper(2), l=ac.createGain(); l.gain.value=0.5;
    o.frequency.setValueAtTime(210,t); o.frequency.exponentialRampToValueAtTime(95,t+0.22);
    decay(g,t,1,0.32); o.connect(g); g.connect(s); s.connect(l); l.connect(out(0.15,0,0.4)); o.start(t); o.stop(t+0.4*DK); },
  snare(t){ const s=shaper(9), l=ac.createGain(); l.gain.value=0.42; s.connect(l); l.connect(out(0.22,0,0.4));
    const o=osc(); o.type='triangle'; o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(160,t+0.08);
    const og=ac.createGain(); decay(og,t,0.6,0.09); o.connect(og); og.connect(s); o.start(t); o.stop(t+0.15*DK);
    const n=noise(t,0.3), bp=filt('bandpass',2600,0.6), ng=ac.createGain(); decay(ng,t,0.9,0.2); n.connect(bp); bp.connect(ng); ng.connect(s); },
  clap(t){ const s=noise(t,0.35), f=filt('bandpass',1300,0.9), g=ac.createGain();
    g.gain.setValueAtTime(0,t); for (let i=0;i<3;i++){ g.gain.setValueAtTime(0.7,t+i*0.011); g.gain.linearRampToValueAtTime(0.08,t+i*0.011+0.009); }
    g.gain.setValueAtTime(0.7,t+0.034); g.gain.exponentialRampToValueAtTime(0.001,t+0.3*DK);
    s.connect(f); f.connect(g); g.connect(out(0.35)); },
  hat808(t){ metallic(t, 0.045, 0.22, 0.02); },
  ohat(t){ metallic(t, 0.32, 0.18, 0.1); },
  hat(t){ const s=noise(t,0.3), f=filt('highpass',7500), g=ac.createGain(); decay(g,t,0.28,0.2);
    s.connect(f); f.connect(g); g.connect(out(0.08)); },
  tick(t){ const s=noise(t,0.06), f=filt('highpass',9500), g=ac.createGain(); decay(g,t,0.25,0.035);
    s.connect(f); f.connect(g); g.connect(out(0.03)); },
  perc(t){ const f=filt('bandpass',2900,3), g=ac.createGain(); decay(g,t,0.35,0.07); f.connect(g); g.connect(out(0.2));
    for (const fr of [523,797]){ const o=osc(); o.type='square'; o.frequency.value=fr; o.connect(f); o.start(t); o.stop(t+0.1*DK); } },
  metal(t){ const f=filt('bandpass',1800,2.5), s=shaper(6), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.3;
    decay(g,t,1,0.14); f.connect(s); s.connect(g); g.connect(l); l.connect(out(0.3,0.18,0.3));
    for (const fr of [540,800,1263]){ const o=osc(); o.type='square'; o.frequency.value=fr; o.connect(f); o.start(t); o.stop(t+0.18*DK); } },
  // ---- bass ----
  ebm(t,n){ const note = P.root + 12 + noteOf(n);
    const f=filt('lowpass',300,7), g=ac.createGain(), s=shaper(14), hp=filt('highpass',55), l=ac.createGain(); l.gain.value=0.26;
    f.frequency.setValueAtTime(2600,t); f.frequency.exponentialRampToValueAtTime(260,t+0.11);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.003); g.gain.setValueAtTime(1,t+0.07); g.gain.exponentialRampToValueAtTime(0.0001,t+0.1*DK);
    f.connect(g); g.connect(s); s.connect(hp); hp.connect(l); l.connect(out(0,0,0.2));
    for (const [type,dt] of [['sawtooth',-7],['square',7]]){ const o=osc(); o.type=type; o.frequency.value=mtof(note); o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+0.13*DK); } },
  bass(t,n){ const o=osc(); o.type='triangle'; o.frequency.value=mtof(P.root+12+noteOf(n));
    const f=filt('lowpass',900,1), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.5;
    decay(g,t,1,0.11,0.003); o.connect(f); f.connect(g); g.connect(l); l.connect(out(0,0,0.2)); o.start(t); o.stop(t+0.15*DK); },
  sub(t,n){ const o=osc(); o.frequency.value=mtof(P.root+12+noteOf(n));
    const g=ac.createGain(), s=shaper(1.2), l=ac.createGain(); l.gain.value=0.7;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.006); g.gain.setValueAtTime(1,t+0.12); g.gain.exponentialRampToValueAtTime(0.0001,t+0.35*DK);
    o.connect(g); g.connect(s); s.connect(l); l.connect(out(0,0,0.4)); o.start(t); o.stop(t+0.4*DK); },
  // ---- synth ----
  acid303(t,n){ const note = P.root+24+noteOf(n);
    const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(note);
    const f=filt('lowpass',200,resQ(n)), g=ac.createGain(), s=shaper(8), l=ac.createGain(); l.gain.value=0.16;
    const peak = cutHz(n);
    f.frequency.setValueAtTime(220,t); f.frequency.exponentialRampToValueAtTime(peak,t+0.006); f.frequency.exponentialRampToValueAtTime(240,t+0.15);
    decay(g,t,1,0.15,0.003); o.connect(f); f.connect(g); g.connect(s); s.connect(l); l.connect(out(0.04,0.3,0.3)); o.start(t); o.stop(t+0.3*DK); },
  acid(t,n){ const note = P.root+24+noteOf(n);
    const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(note);
    const f=filt('lowpass',160,resQ(n)), g=ac.createGain(), s=shaper(2), l=ac.createGain(); l.gain.value=0.22;
    const peak = cutHz(n);
    f.frequency.setValueAtTime(160,t); f.frequency.exponentialRampToValueAtTime(peak,t+0.008); f.frequency.exponentialRampToValueAtTime(170,t+0.19);
    decay(g,t,1,0.2,0.003); o.connect(f); f.connect(g); g.connect(s); s.connect(l); l.connect(out(0.05,0.28)); o.start(t); o.stop(t+0.25*DK); },
  stab(t,n){ const f=filt('lowpass',1700,2), g=ac.createGain(); decay(g,t,0.09,0.5,0.004); f.connect(g); g.connect(out(0.5,0.22));
    for (const s of [0,3,7,10]) for (const dt of [-9,9]){ const o=osc(); o.type='sawtooth';
      o.frequency.value=mtof(P.root+36+s+noteOf(n)); o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+0.6*DK); } },
  pluck(t,n){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(P.root+36+noteOf(n));
    const f=filt('lowpass',500,4), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.16;
    f.frequency.setValueAtTime(5200,t); f.frequency.exponentialRampToValueAtTime(420,t+0.14);
    decay(g,t,1,0.22,0.002); o.connect(f); f.connect(g); g.connect(l); l.connect(out(0.15,0.3,0.3)); o.start(t); o.stop(t+0.3*DK); },
  // ---- fx ----
  zap(t){ const o=osc(); o.type='sawtooth'; const g=ac.createGain(), s=shaper(10), f=filt('lowpass',5000,4), l=ac.createGain(); l.gain.value=0.16;
    o.frequency.setValueAtTime(3200,t); o.frequency.exponentialRampToValueAtTime(70,t+0.22);
    decay(g,t,1,0.24); o.connect(f); f.connect(g); g.connect(s); s.connect(l); l.connect(out(0.35,0.35,0.3)); o.start(t); o.stop(t+0.28*DK); },
  crash(t){ const s=noise(t,1.4), f=filt('highpass',5500), g=ac.createGain(); decay(g,t,0.2,1.1);
    s.connect(f); f.connect(g); g.connect(out(0.3,0,1.3)); },
  noiz(t){ const s=noise(t,0.2), f=filt('bandpass',1200,0.5), sh=shaper(8), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.3;
    decay(g,t,1,0.12); s.connect(f); f.connect(sh); sh.connect(g); g.connect(l); l.connect(out(0.2,0.2,0.2)); },

  // ---- оркестр ----
  strings(t,n){ const base = P.root+36+noteOf(n), f=filt('lowpass',2300,0.7), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.05;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.16); g.gain.setTargetAtTime(0.0001,t+0.25,0.7*DK);
    f.connect(g); g.connect(l); l.connect(out(0.5,0.08,2.8));
    const lfo=osc(); lfo.frequency.value=5.2; const lg=ac.createGain(); lg.gain.value=5; lfo.connect(lg); lfo.start(t); lfo.stop(t+2.6*DK);
    for (const sm of [0,7,12,15]) for (const dt of [-12,12]){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(base+sm); o.detune.value+=dt;
      lg.connect(o.detune); o.connect(f); o.start(t); o.stop(t+2.6*DK); } },
  brass(t,n){ const fr=mtof(P.root+36+noteOf(n)), f=filt('lowpass',400,2), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.11;
    f.frequency.setValueAtTime(400,t); f.frequency.exponentialRampToValueAtTime(3200,t+0.06); f.frequency.exponentialRampToValueAtTime(1300,t+0.4);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.035); g.gain.exponentialRampToValueAtTime(0.0001,t+0.6*DK);
    f.connect(g); g.connect(l); l.connect(out(0.35,0,0.7));
    for (const [sm,dt] of [[0,-8],[0,8],[7,0]]){ const o=osc(); o.type='sawtooth'; o.frequency.value=fr*Math.pow(2,sm/12); o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+0.65*DK); } },
  timpani(t,n){ const fr=mtof(P.root+24+noteOf(n)), o=osc(), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.6;
    o.frequency.setValueAtTime(fr*1.06,t); o.frequency.exponentialRampToValueAtTime(fr,t+0.12);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.004); g.gain.exponentialRampToValueAtTime(0.0001,t+1.0*DK);
    o.connect(g); g.connect(l); l.connect(out(0.35,0,1.1)); o.start(t); o.stop(t+1.1*DK);
    const ns=noise(t,0.08), bp=filt('bandpass',320,1.2), ng=ac.createGain(); decay(ng,t,0.5,0.06); ns.connect(bp); bp.connect(ng); ng.connect(out(0.3,0,0.2)); },
  glock(t,n){ const fr=mtof(P.root+48+noteOf(n)), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.16;
    decay(g,t,1,0.5,0.001); g.connect(l); l.connect(out(0.3,0.1,0.7));
    for (const [m,a] of [[1,1],[2.76,0.35],[5.4,0.12]]){ const o=osc(); o.frequency.value=fr*m; const og=ac.createGain(); og.gain.value=a; o.connect(og); og.connect(g); o.start(t); o.stop(t+0.6*DK); } },

  // ---- новые звуки ----
  hardkick(t){ const o=osc(), g=ac.createGain(), s=shaper(22), lp=filt('lowpass',5000), l=ac.createGain(); l.gain.value=0.5;
    o.frequency.setValueAtTime(320,t); o.frequency.exponentialRampToValueAtTime(62,t+0.035); o.frequency.exponentialRampToValueAtTime(48,t+0.3);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.002); g.gain.setValueAtTime(1,t+0.1); g.gain.exponentialRampToValueAtTime(0.0001,t+0.36*DK);
    o.connect(g); g.connect(s); s.connect(lp); lp.connect(l); l.connect(out(0,0,0.45)); o.start(t); o.stop(t+0.4*DK);
    const k=osc(); k.type='square'; k.frequency.value=1400; const kg=ac.createGain(); decay(kg,t,0.25,0.012); k.connect(kg); kg.connect(out(0,0,0.1)); k.start(t); k.stop(t+0.03); },
  boom(t){ const o=osc(), g=ac.createGain(), s=shaper(2), l=ac.createGain(); l.gain.value=0.75;
    o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(32,t+0.9);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.004); g.gain.exponentialRampToValueAtTime(0.0001,t+1.1*DK);
    o.connect(g); g.connect(s); s.connect(l); l.connect(out(0.15,0,1.2)); o.start(t); o.stop(t+1.2*DK); },
  rim(t){ const f=filt('highpass',600), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.35; decay(g,t,1,0.035); f.connect(g); g.connect(l); l.connect(out(0.1));
    const a=osc(); a.type='triangle'; a.frequency.value=1700; const b=osc(); b.type='square'; b.frequency.value=455;
    a.connect(f); b.connect(f); a.start(t); b.start(t); a.stop(t+0.06*DK); b.stop(t+0.06*DK); },
  ride(t){ metallic(t, 0.7, 0.11, 0.15, 2.3, 8000); },
  shaker(t){ const s=noise(t,0.12), f=filt('bandpass',6500,1.4), g=ac.createGain();
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35,t+0.018); g.gain.exponentialRampToValueAtTime(0.0001,t+0.08*DK);
    s.connect(f); f.connect(g); g.connect(out(0.05)); },
  cowbell(t){ const f=filt('bandpass',2600,1.2), s=shaper(3), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.22;
    decay(g,t,1,0.22); f.connect(s); s.connect(g); g.connect(l); l.connect(out(0.12));
    for (const fr of [587,845]){ const o=osc(); o.type='square'; o.frequency.value=fr; o.connect(f); o.start(t); o.stop(t+0.3*DK); } },
  conga(t){ const o=osc(), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.45;
    o.frequency.setValueAtTime(380,t); o.frequency.exponentialRampToValueAtTime(300,t+0.05);
    decay(g,t,1,0.18); o.connect(g); g.connect(l); l.connect(out(0.12)); o.start(t); o.stop(t+0.25*DK); },
  rumble(t,n){ const f=filt('lowpass',190,2.5), s=shaper(6), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.45;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2*DK);
    s.connect(f); f.connect(g); g.connect(l); l.connect(out(0,0,0.3));
    for (const dt of [0,14]){ const o=osc(); o.frequency.value=mtof(P.root+12+noteOf(n)); o.detune.value+=dt; o.connect(s); o.start(t); o.stop(t+0.25*DK); } },
  reese(t,n){ const f=filt('lowpass',700,2), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.2;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.01); g.gain.setValueAtTime(1,t+0.12); g.gain.exponentialRampToValueAtTime(0.0001,t+0.32*DK);
    f.connect(g); g.connect(l); l.connect(out(0,0,0.4));
    for (const dt of [-18,18]){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(P.root+12+noteOf(n)); o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+0.35*DK); } },
  fmbass(t,n){ const fr=mtof(P.root+12+noteOf(n)), c=osc(), m=osc(), mg=ac.createGain(), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.5;
    c.frequency.value=fr; m.frequency.value=fr*2; m.detune.value=c.detune.value;
    mg.gain.setValueAtTime(fr*3,t); mg.gain.exponentialRampToValueAtTime(1,t+0.12);
    m.connect(mg); mg.connect(c.frequency); decay(g,t,1,0.18,0.003); c.connect(g); g.connect(l); l.connect(out(0,0,0.25));
    c.start(t); m.start(t); c.stop(t+0.25*DK); m.stop(t+0.25*DK); },
  chord(t,n){ const f=filt('lowpass',1100,1), g=ac.createGain(); decay(g,t,0.07,0.7,0.01); f.connect(g); g.connect(out(0.5,0.3,0.9));
    for (const sm of [0,3,7,10,14]){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(P.root+36+sm+noteOf(n)); o.connect(f); o.start(t); o.stop(t+0.8*DK); } },
  hoover(t,n){ const f=filt('lowpass',2600,1.5), s=shaper(3), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.11;
    decay(g,t,1,0.38,0.01); f.connect(s); s.connect(g); g.connect(l); l.connect(out(0.25,0.15,0.5));
    const fr=mtof(P.root+36+noteOf(n));
    for (const dt of [-25,0,25]){ const o=osc(); o.type='sawtooth'; o.detune.value+=dt;
      o.frequency.setValueAtTime(fr/2,t); o.frequency.exponentialRampToValueAtTime(fr,t+0.08); o.connect(f); o.start(t); o.stop(t+0.45*DK); } },
  bell(t,n){ const fr=mtof(P.root+48+noteOf(n)), c=osc(), m=osc(), mg=ac.createGain(), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.16;
    c.frequency.value=fr; m.frequency.value=fr*3.5; m.detune.value=c.detune.value;
    mg.gain.setValueAtTime(fr*2,t); mg.gain.exponentialRampToValueAtTime(1,t+1.0);
    m.connect(mg); mg.connect(c.frequency); decay(g,t,1,0.9,0.002); c.connect(g); g.connect(l); l.connect(out(0.3,0.2,1.1));
    c.start(t); m.start(t); c.stop(t+1.1*DK); m.stop(t+1.1*DK); },
  vox(t,n){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(P.root+36+noteOf(n));
    const v=osc(); v.frequency.value=5.5; const vg=ac.createGain(); vg.gain.value=6; v.connect(vg); vg.connect(o.frequency);
    const f1=filt('bandpass',720,7), f2=filt('bandpass',1150,8), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.5;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+0.35*DK);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(l); l.connect(out(0.3,0.15,0.5));
    o.start(t); v.start(t); o.stop(t+0.4*DK); v.stop(t+0.4*DK); },
  laser(t){ const o=osc(); o.type='square'; const f=filt('bandpass',1500,2), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.12;
    o.frequency.setValueAtTime(260,t); o.frequency.exponentialRampToValueAtTime(2600,t+0.12);
    decay(g,t,1,0.14); o.connect(f); f.connect(g); g.connect(l); l.connect(out(0.2,0.4,0.3)); o.start(t); o.stop(t+0.18*DK); },
  glitch(t){ const s=noise(t,0.12), f=filt('highpass',1800), sh=shaper(12), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.22;
    g.gain.setValueAtTime(0,t); let x=t; for (let k=0;k<6;k++){ const d=0.006+Math.random()*0.012; g.gain.setValueAtTime(k%2?0:1,x); x+=d*DK; } g.gain.setValueAtTime(0,x);
    s.connect(f); f.connect(sh); sh.connect(g); g.connect(l); l.connect(out(0.1,0.25,0.2)); },

  // ================= расширение библиотеки =================
  // ---- kicks ----
  deepkick(t){ const o=osc(), g=ac.createGain(), s=shaper(1.5), l=ac.createGain(); l.gain.value=0.8;
    o.frequency.setValueAtTime(115,t); o.frequency.exponentialRampToValueAtTime(42,t+0.12); o.frequency.exponentialRampToValueAtTime(38,t+0.7);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.003); g.gain.setValueAtTime(1,t+0.1); g.gain.exponentialRampToValueAtTime(0.0001,t+0.75*DK);
    o.connect(g); g.connect(s); s.connect(l); l.connect(out(0,0,0.8)); o.start(t); o.stop(t+0.8*DK); },
  gabber(t){ const o=osc(), g=ac.createGain(), s=shaper(40), lp=filt('lowpass',3500), l=ac.createGain(); l.gain.value=0.38;
    o.frequency.setValueAtTime(420,t); o.frequency.exponentialRampToValueAtTime(70,t+0.03); o.frequency.exponentialRampToValueAtTime(52,t+0.35);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.002); g.gain.setValueAtTime(1,t+0.15); g.gain.exponentialRampToValueAtTime(0.0001,t+0.4*DK);
    o.connect(g); g.connect(s); s.connect(lp); lp.connect(l); l.connect(out(0.05,0,0.5)); o.start(t); o.stop(t+0.45*DK); },
  lofikick(t){ const o=osc(), g=ac.createGain(), lp=filt('lowpass',900), l=ac.createGain(); l.gain.value=0.8;
    o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(50,t+0.08);
    decay(g,t,1,0.28,0.003); o.connect(g); g.connect(lp); lp.connect(l); l.connect(out(0,0,0.35)); o.start(t); o.stop(t+0.35*DK);
    const n=noise(t,0.04), f=filt('lowpass',600), ng=ac.createGain(); decay(ng,t,0.3,0.03); n.connect(f); f.connect(ng); ng.connect(out(0,0,0.1)); },
  // ---- drums ----
  snare909(t){ const s=shaper(3), l=ac.createGain(); l.gain.value=0.4; s.connect(l); l.connect(out(0.2,0,0.3));
    for (const fr of [185,330]){ const o=osc(); o.type='triangle'; o.frequency.value=fr; const og=ac.createGain(); decay(og,t,0.5,0.07); o.connect(og); og.connect(s); o.start(t); o.stop(t+0.12*DK); }
    const n=noise(t,0.25), hp=filt('highpass',1200), ng=ac.createGain(); decay(ng,t,0.9,0.18); n.connect(hp); hp.connect(ng); ng.connect(s); },
  snap(t){ const n=noise(t,0.08), f=filt('bandpass',3500,2), g=ac.createGain(); decay(g,t,0.9,0.04,0.001); n.connect(f); f.connect(g); g.connect(out(0.15)); },
  bigclap(t){ const s=noise(t,0.7), f=filt('bandpass',1100,0.8), g=ac.createGain();
    g.gain.setValueAtTime(0,t); for (let i=0;i<4;i++){ g.gain.setValueAtTime(0.75,t+i*0.012); g.gain.linearRampToValueAtTime(0.08,t+i*0.012+0.01); }
    g.gain.setValueAtTime(0.75,t+0.048); g.gain.exponentialRampToValueAtTime(0.001,t+0.5*DK);
    s.connect(f); f.connect(g); g.connect(out(0.6,0,0.7)); },
  // ---- perc ----
  clave(t){ const o=osc(), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.35; o.frequency.value=2500; decay(g,t,1,0.03,0.001);
    o.connect(g); g.connect(l); l.connect(out(0.15)); o.start(t); o.stop(t+0.06*DK); },
  wood(t){ const f=filt('bandpass',1000,3), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.6; decay(g,t,1,0.06,0.001); f.connect(g); g.connect(l); l.connect(out(0.15));
    const a=osc(); a.frequency.setValueAtTime(820,t); a.frequency.exponentialRampToValueAtTime(760,t+0.04); const b=osc(); b.type='triangle'; b.frequency.value=1250;
    a.connect(f); b.connect(f); a.start(t); b.start(t); a.stop(t+0.09*DK); b.stop(t+0.09*DK); },
  bongo(t){ const o=osc(), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.45;
    o.frequency.setValueAtTime(440,t); o.frequency.exponentialRampToValueAtTime(360,t+0.04);
    decay(g,t,1,0.12); o.connect(g); g.connect(l); l.connect(out(0.12)); o.start(t); o.stop(t+0.18*DK); },
  triangle(t){ const g=ac.createGain(), l=ac.createGain(); l.gain.value=0.08; decay(g,t,1,0.9,0.001); g.connect(l); l.connect(out(0.3,0,1));
    for (const [m,a] of [[1,1],[2.4,0.5],[3.9,0.25]]){ const o=osc(); o.frequency.value=2600*m; const og=ac.createGain(); og.gain.value=a; o.connect(og); og.connect(g); o.start(t); o.stop(t+1*DK); } },
  tamb(t){ const n=noise(t,0.3), hp=filt('highpass',6000), bp=filt('bandpass',9000,1), g=ac.createGain();
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3,t+0.004); g.gain.exponentialRampToValueAtTime(0.06,t+0.05); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2*DK);
    n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out(0.1)); },
  click(t){ const o=osc(); o.type='square'; o.frequency.value=4000; const g=ac.createGain(), l=ac.createGain(); l.gain.value=0.25;
    decay(g,t,1,0.005,0.0005); o.connect(g); g.connect(l); l.connect(out(0.05)); o.start(t); o.stop(t+0.02); },
  // ---- bass ----
  wobble(t,n){ const fr=mtof(P.root+12+noteOf(n)), f=filt('lowpass',300,8), g=ac.createGain(), s=shaper(4), l=ac.createGain(); l.gain.value=0.22;
    const lfo=osc(); lfo.detune.value=0; lfo.frequency.value=1/(2*stepDur()); const lg=ac.createGain(); lg.gain.value=1300; lfo.connect(lg); lg.connect(f.frequency);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.01); g.gain.setValueAtTime(1,t+0.3); g.gain.exponentialRampToValueAtTime(0.0001,t+0.45*DK);
    f.connect(g); g.connect(s); s.connect(l); l.connect(out(0,0,0.5)); lfo.start(t); lfo.stop(t+0.5*DK);
    for (const [ty,dt] of [['sawtooth',-6],['square',6]]){ const o=osc(); o.type=ty; o.frequency.value=fr; o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+0.5*DK); } },
  sqbass(t,n){ const o=osc(); o.type='square'; o.frequency.value=mtof(P.root+12+noteOf(n));
    const f=filt('lowpass',1200,2), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.22;
    f.frequency.setValueAtTime(1600,t); f.frequency.exponentialRampToValueAtTime(300,t+0.12);
    decay(g,t,1,0.16,0.003); o.connect(f); f.connect(g); g.connect(l); l.connect(out(0,0,0.2)); o.start(t); o.stop(t+0.2*DK); },
  moog(t,n){ const fr=mtof(P.root+12+noteOf(n)), f=filt('lowpass',3000,8), g=ac.createGain(), s=shaper(2), l=ac.createGain(); l.gain.value=0.26;
    f.frequency.setValueAtTime(3000,t); f.frequency.exponentialRampToValueAtTime(180,t+0.2);
    decay(g,t,1,0.25,0.004); f.connect(g); g.connect(s); s.connect(l); l.connect(out(0,0,0.3));
    for (const dt of [-5,5]){ const o=osc(); o.type='sawtooth'; o.frequency.value=fr; o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+0.3*DK); } },
  // ---- synth ----
  supersaw(t,n){ const fr=mtof(P.root+36+noteOf(n)), f=filt('lowpass',5000,0.7), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.05;
    decay(g,t,1,0.35,0.005); f.connect(g); g.connect(l); l.connect(out(0.3,0.2,0.5));
    for (const dt of [-30,-20,-10,0,10,20,30]){ const o=osc(); o.type='sawtooth'; o.frequency.value=fr; o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+0.45*DK); } },
  blip(t,n){ const o=osc(); o.type='square'; const fr=mtof(P.root+48+noteOf(n)); o.frequency.setValueAtTime(fr*2,t); o.frequency.exponentialRampToValueAtTime(fr,t+0.01);
    const g=ac.createGain(), l=ac.createGain(); l.gain.value=0.1; decay(g,t,1,0.06,0.001); o.connect(g); g.connect(l); l.connect(out(0.15,0.3,0.15)); o.start(t); o.stop(t+0.09*DK); },
  siren(t,n){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(P.root+48+noteOf(n));
    const lfo=osc(); lfo.detune.value=0; lfo.frequency.value=2.2; const lg=ac.createGain(); lg.gain.value=450; lfo.connect(lg); lg.connect(o.detune);
    const f=filt('lowpass',2500), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.07; decay(g,t,1,1.0,0.02);
    o.connect(f); f.connect(g); g.connect(l); l.connect(out(0.3,0.3,1.1)); o.start(t); lfo.start(t); o.stop(t+1.1*DK); lfo.stop(t+1.1*DK); },
  // ---- keys & pads ----
  organ(t,n){ const f=filt('lowpass',2500,0.8), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.05;
    decay(g,t,1,0.22,0.002); f.connect(g); g.connect(l); l.connect(out(0.2,0.1,0.3));
    for (const sm of [0,3,7,10]){ const o=osc(); o.type='square'; o.frequency.value=mtof(P.root+36+sm+noteOf(n)); o.connect(f); o.start(t); o.stop(t+0.3*DK); } },
  epiano(t,n){ const g=ac.createGain(), l=ac.createGain(); l.gain.value=0.07; decay(g,t,1,0.8,0.002); g.connect(l); l.connect(out(0.3,0.1,0.9));
    for (const sm of [0,3,7]){ const fr=mtof(P.root+36+sm+noteOf(n)), c=osc(), m=osc(), mg=ac.createGain();
      c.frequency.value=fr; m.frequency.value=fr; m.detune.value=c.detune.value; mg.gain.setValueAtTime(fr*1.6,t); mg.gain.exponentialRampToValueAtTime(1,t+0.5);
      m.connect(mg); mg.connect(c.frequency); c.connect(g); c.start(t); m.start(t); c.stop(t+0.9*DK); m.stop(t+0.9*DK); } },
  pad(t,n){ const f=filt('lowpass',600,0.5), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.045;
    f.frequency.setValueAtTime(600,t); f.frequency.exponentialRampToValueAtTime(1600,t+1.2);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.5); g.gain.setTargetAtTime(0.0001,t+0.7,0.8*DK);
    f.connect(g); g.connect(l); l.connect(out(0.6,0.1,3.2));
    for (const sm of [0,3,7,12]) for (const dt of [-10,10]){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(P.root+36+sm+noteOf(n)); o.detune.value+=dt; o.connect(f); o.start(t); o.stop(t+3*DK); } },
  choir(t,n){ const f1=filt('bandpass',420,6), f2=filt('bandpass',820,7), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.35;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.12); g.gain.exponentialRampToValueAtTime(0.0001,t+0.9*DK);
    f1.connect(g); f2.connect(g); g.connect(l); l.connect(out(0.6,0.1,1));
    for (const dt of [-12,0,12]){ const o=osc(); o.type='sawtooth'; o.frequency.value=mtof(P.root+36+noteOf(n)); o.detune.value+=dt; o.connect(f1); o.connect(f2); o.start(t); o.stop(t+1*DK); } },
  // ---- fx ----
  sweepup(t){ const n=noise(t,1.1), f=filt('bandpass',400,1.2), g=ac.createGain();
    f.frequency.setValueAtTime(400,t); f.frequency.exponentialRampToValueAtTime(7000,t+1.0*DK);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3,t+0.95*DK); g.gain.exponentialRampToValueAtTime(0.0001,t+1.05*DK);
    n.connect(f); f.connect(g); g.connect(out(0.3,0,1.2)); },
  sweepdown(t){ const n=noise(t,1.3), f=filt('bandpass',6000,1.2), g=ac.createGain();
    f.frequency.setValueAtTime(6000,t); f.frequency.exponentialRampToValueAtTime(300,t+1.2*DK);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+1.2*DK);
    n.connect(f); f.connect(g); g.connect(out(0.35,0,1.3));
    const o=osc(), og=ac.createGain(); o.frequency.setValueAtTime(400,t); o.frequency.exponentialRampToValueAtTime(60,t+1.0*DK); decay(og,t,0.2,1.0,0.01); o.connect(og); og.connect(out(0.2,0,1.1)); o.start(t); o.stop(t+1.1*DK); },
  impact(t){ const o=osc(), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.75;
    o.frequency.setValueAtTime(90,t); o.frequency.exponentialRampToValueAtTime(30,t+1.2);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(1,t+0.003); g.gain.exponentialRampToValueAtTime(0.0001,t+1.3*DK);
    o.connect(g); g.connect(l); l.connect(out(0.5,0,1.4)); o.start(t); o.stop(t+1.3*DK);
    const n=noise(t,0.5), lp=filt('lowpass',900), ng=ac.createGain(); decay(ng,t,0.5,0.4); n.connect(lp); lp.connect(ng); ng.connect(out(0.6,0,0.6)); },
  crackle(t){ const n=noise(t,0.35), f=filt('bandpass',2200,0.6), g=ac.createGain(), l=ac.createGain(); l.gain.value=0.25;
    g.gain.setValueAtTime(0,t); let x=t; for (let k=0;k<14;k++){ x += (0.008+Math.random()*0.02)*DK; g.gain.setValueAtTime(Math.random()*0.9,x); g.gain.setValueAtTime(0,x+0.002); }
    n.connect(f); f.connect(g); g.connect(l); l.connect(out(0.1,0,0.4)); },
};

// ============================================================
//  НАСТРОЙКИ КАЖДОГО ЗВУКА
// ============================================================
const toneHz = v => 150*Math.pow(120, v);
const KNOBS = [
  { k:'vol',   name:'Volume',    min:0,   max:1.5, step:0.01, def:0.9,  fmt:v=>Math.round(v*100)+'%' },
  { k:'pitch', name:'Pitch',     min:-12, max:12,  step:1,    def:0,    fmt:v=>(v>0?'+':'')+v+' st' },
  { k:'decay', name:'Length',    min:0.3, max:3,   step:0.01, def:1,    fmt:v=>'×'+v.toFixed(2) },
  { k:'tone',  name:'Tone',      min:0,   max:1,   step:0.01, def:1,    fmt:v=>v>=0.999?'open':Math.round(toneHz(v))+' Hz' },
  { k:'drive', name:'Drive',     min:0,   max:1,   step:0.01, def:0,    fmt:v=>v<=0?'off':'+'+Math.round(v*30)+' dB' },
  { k:'rev',   name:'Reverb',     min:0,   max:1,   step:0.01, def:0,    fmt:v=>v<=0?'off':Math.round(v*100)+'%' },
  { k:'dly',   name:'Delay',      min:0,   max:1,   step:0.01, def:0,    fmt:v=>v<=0?'off':Math.round(v*100)+'%' },
  { k:'dlyT',  name:'Delay Time', min:1,   max:8,   step:1,    def:3,    fmt:v=>DLY_NAMES[v] },
  { k:'dlyFb', name:'Feedback',   min:0,   max:0.9, step:0.01, def:0.4,  fmt:v=>Math.round(v*100)+'%' },
  { k:'cut',   name:'Cutoff',    min:0,   max:1,   step:0.01, def:0.75, fmt:v=>Math.round(250*Math.pow(28,v))+' Hz', only:FILTERED },
  { k:'res',   name:'Resonance', min:0,   max:1,   step:0.01, def:0.75, fmt:v=>Math.round(v*100)+'%', only:FILTERED },
  { k:'duck',    name:'Sidechain',  min:0,    max:1,   step:0.01, def:0,    fmt:v=>v<=0?'off':'−'+Math.round(v*100)+'%', sc:true },
  { k:'duckRel', name:'SC Release', min:0.03, max:0.6, step:0.01, def:0.18, fmt:v=>Math.round(v*1000)+' ms', sc:true },
  { k:'swing',   name:'Swing +',    min:0,    max:0.75, step:0.01, def:0,   fmt:v=>v<=0?'global':'+'+Math.round(v*100)+'%' },
];
const defParams = v => { const p = Object.fromEntries(KNOBS.map(k=>[k.k,k.def]));
  if (FILTERED.includes(v) && P) p.cut = Math.log(P.cut*0.75/250)/Math.log(28);
  if (P && P.sc && P.sc[v]) p.duck = P.sc[v];
  if (P && P.tune && P.tune[v]) Object.assign(p, P.tune[v]);
  return p; };
let sel = null, solo = null;
const TANH_K = 8, TANH = (()=>{ const n=4096, c=new Float32Array(n); for (let i=0;i<n;i++){ const x=i*2/(n-1)-1; c[i]=Math.tanh(x*TANH_K); } return c; })();

function buildChain(tr){
  if (!ac) return;
  const c = tr.ch = {};
  c.in = ac.createGain(); c.pre = ac.createGain(); c.drv = ac.createWaveShaper(); c.drv.oversample = '4x'; c.comp = ac.createGain();
  c.lp = filt('lowpass', 20000, 0.7); c.vol = ac.createGain(); c.rev = ac.createGain(); c.dly = ac.createGain();
  c.in.connect(c.pre); c.pre.connect(c.drv); c.drv.connect(c.comp); c.comp.connect(c.lp); c.duck = ac.createGain(); c.lp.connect(c.duck); c.duck.connect(c.vol); c.vol.connect(bus);
  c.vol.connect(c.rev); c.rev.connect(revIn);
  c.dl = ac.createDelay(2); c.dlp = filt('lowpass', 3200); c.dhp = filt('highpass', 180); c.dfb = ac.createGain();
  c.vol.connect(c.dly); c.dly.connect(c.dl); c.dl.connect(c.dlp); c.dlp.connect(c.dhp); c.dhp.connect(c.dfb); c.dfb.connect(c.dl); c.dhp.connect(fxRet);
  applyParams(tr);
}
function dropChain(tr){ if (tr.ch){ const v = tr.ch.vol; v.gain.setTargetAtTime(0, ac.currentTime, 0.02); const c = tr.ch; setTimeout(()=>{ v.disconnect(); }, 1500); setTimeout(()=>{ c.dhp.disconnect(); c.dfb.disconnect(); }, 6000); tr.ch = null; } }
function applyParams(tr){
  const c = tr.ch, p = tr.params; if (!c) return;
  const T = ac.currentTime;
  if (p.drive <= 0){ c.drv.curve = null; c.pre.gain.setTargetAtTime(1, T, 0.02); c.comp.gain.setTargetAtTime(1, T, 0.02); }
  else {
    // tanh: громкость примерно постоянна, растёт только плотность и «грязь»
    const pre = Math.pow(10, p.drive*30/20);
    c.drv.curve = TANH; c.pre.gain.setTargetAtTime(pre/TANH_K, T, 0.02);
    c.comp.gain.setTargetAtTime(0.5/Math.tanh(pre*0.5), T, 0.02);
  }
  c.lp.frequency.setTargetAtTime(p.tone>=0.999 ? 20000 : toneHz(p.tone), T, 0.02);
  const silent = tr.mute || (solo && solo !== tr);
  c.vol.gain.setTargetAtTime(silent ? 0 : p.vol, T, 0.02);
  c.rev.gain.setTargetAtTime(p.rev*0.8, T, 0.02);
  c.dly.gain.setTargetAtTime(p.dly*0.8, T, 0.02); c.dfb.gain.setTargetAtTime(p.dlyFb, T, 0.02);
  c.dl.delayTime.setTargetAtTime(stepDur()*p.dlyT, T, 0.03);
}

// ============================================================
//  ЖИВЫЕ МАСТЕР-ЭФФЕКТЫ (держишь кнопку — эффект работает)
// ============================================================
function perfSet(fx, on){
  if (!ac) return;
  const T = ac.currentTime;
  if (fx === 'lpf'){ pLP.frequency.cancelScheduledValues(T); pLP.frequency.setTargetAtTime(on ? 320 : 20000, T, on ? 0.35 : 0.12); pLP.Q.setTargetAtTime(on ? 1.6 : 0.7, T, 0.1); }
  if (fx === 'hpf'){ pHP.frequency.cancelScheduledValues(T); pHP.frequency.setTargetAtTime(on ? 1400 : 10, T, on ? 0.35 : 0.1); pHP.Q.setTargetAtTime(on ? 1.2 : 0.7, T, 0.1); }
  if (fx === 'kill') pKill.frequency.setTargetAtTime(on ? 300 : 10, T, 0.01);
  if (fx === 'wash'){            // пока держишь — эхо копится; отпустил — хвост гаснет за 1–2 с
    washIn.gain.cancelScheduledValues(T); washFb.gain.cancelScheduledValues(T);
    washIn.gain.setTargetAtTime(on ? 1 : 0, T, on ? 0.02 : 0.04);
    washFb.gain.setTargetAtTime(on ? 0.62 : 0, T, on ? 0.05 : 0.35);
  }
  if (fx === 'build'){ on ? startRiser() : stopRiser(true); }
}
function startRiser(){
  if (riser) return;
  const T = ac.currentTime, s = ac.createBufferSource(); s.buffer = NB; s.loop = true;
  const bp = filt('bandpass', 300, 0.7), g = ac.createGain();
  g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(0.14, T + 8);
  bp.frequency.setValueAtTime(300, T); bp.frequency.exponentialRampToValueAtTime(5000, T + 8);
  s.connect(bp); bp.connect(g); g.connect(pKill); s.start(T);
  pHP.frequency.cancelScheduledValues(T); pHP.frequency.setTargetAtTime(600, T, 2.5);
  riser = { s, g };
}
function stopRiser(drop){
  if (!riser) return;
  const T = ac.currentTime;
  riser.g.gain.cancelScheduledValues(T); riser.g.gain.setTargetAtTime(0.0001, T, 0.03); riser.s.stop(T + 0.3); riser = null;
  pHP.frequency.cancelScheduledValues(T); pHP.frequency.setTargetAtTime(10, T, 0.02);
  if (drop) for (const v of ['crash', 'boom']) hit({ v, params:defParams(v), notes:null, pat:[] }, T + 0.02);
}

// аварийный сброс: все мастер-эффекты в исходное состояние
function perfReset(){
  if (!ac) return;
  const T = ac.currentTime;
  for (const p of [pLP.frequency, pLP.Q, pHP.frequency, pHP.Q, pKill.frequency, washIn.gain, washFb.gain]) p.cancelScheduledValues(T);
  pLP.frequency.setTargetAtTime(20000, T, 0.05); pLP.Q.setTargetAtTime(0.7, T, 0.05);
  pHP.frequency.setTargetAtTime(10, T, 0.05); pHP.Q.setTargetAtTime(0.7, T, 0.05);
  pKill.frequency.setTargetAtTime(10, T, 0.02);
  washIn.gain.setTargetAtTime(0, T, 0.02); washFb.gain.setTargetAtTime(0, T, 0.15);
  stopRiser(false);
}
