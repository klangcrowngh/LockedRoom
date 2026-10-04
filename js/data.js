// LOCKED ROOM — библиотека звуков и пресеты

// ---------- библиотека звуков ----------
const LIB = [
  // kicks
  { id:'kick808', name:'808 Kick', cat:'Kicks' }, { id:'kick909', name:'909 Kick', cat:'Kicks' }, { id:'kick707', name:'707 Kick', cat:'Kicks' },
  { id:'kick606', name:'606 Kick', cat:'Kicks' }, { id:'kick', name:'Techno Kick', cat:'Kicks' }, { id:'hardkick', name:'Hard Kick', cat:'Kicks' },
  { id:'distkick', name:'Dist Kick', cat:'Kicks' }, { id:'punchkick', name:'Punch Kick', cat:'Kicks' }, { id:'deepkick', name:'Deep Kick', cat:'Kicks' },
  { id:'rumblekick', name:'Rumble Kick', cat:'Kicks' }, { id:'gabber', name:'Gabber Kick', cat:'Kicks' }, { id:'clickkick', name:'Click Kick', cat:'Kicks' },
  { id:'lofikick', name:'Lo-Fi Kick', cat:'Kicks' },
  // snares
  { id:'snare909', name:'909 Snare', cat:'Snares' }, { id:'snare808', name:'808 Snare', cat:'Snares' }, { id:'snare707', name:'707 Snare', cat:'Snares' },
  { id:'snare', name:'Snare', cat:'Snares' }, { id:'crispsnare', name:'Crisp Snare', cat:'Snares' }, { id:'darksnare', name:'Dark Snare', cat:'Snares' },
  { id:'steel', name:'Steel Snare', cat:'Snares' }, { id:'lofisnare', name:'Lo-Fi Snare', cat:'Snares' }, { id:'rim', name:'Rimshot', cat:'Snares' },
  { id:'rim707', name:'707 Rim', cat:'Snares' }, { id:'snap', name:'Snap', cat:'Snares' },
  // claps
  { id:'clap909', name:'909 Clap', cat:'Claps' }, { id:'clap808', name:'808 Clap', cat:'Claps' }, { id:'clap', name:'Clap', cat:'Claps' },
  { id:'tightclap', name:'Tight Clap', cat:'Claps' }, { id:'bigclap', name:'Big Clap', cat:'Claps' }, { id:'roomclap', name:'Room Clap', cat:'Claps' },
  // hats & cymbals
  { id:'hat909', name:'909 Hat', cat:'Hats & Cymbals' }, { id:'hat808', name:'808 Hat', cat:'Hats & Cymbals' }, { id:'hat707', name:'707 Hat', cat:'Hats & Cymbals' },
  { id:'hat606', name:'606 Hat', cat:'Hats & Cymbals' }, { id:'hat', name:'Noise Hat', cat:'Hats & Cymbals' }, { id:'crisphat', name:'Crisp Hat', cat:'Hats & Cymbals' },
  { id:'pedalhat', name:'Pedal Hat', cat:'Hats & Cymbals' }, { id:'tick', name:'Tick', cat:'Hats & Cymbals' }, { id:'ohat909', name:'909 Open Hat', cat:'Hats & Cymbals' },
  { id:'ohat808', name:'808 Open Hat', cat:'Hats & Cymbals' }, { id:'ohat', name:'Open Hat', cat:'Hats & Cymbals' }, { id:'ride', name:'Ride', cat:'Hats & Cymbals' },
  { id:'crash', name:'Crash', cat:'Hats & Cymbals' },
  // toms & perc
  { id:'tom909', name:'909 Tom', cat:'Toms & Perc' }, { id:'tom', name:'Tom', cat:'Toms & Perc' }, { id:'conga', name:'Conga', cat:'Toms & Perc' },
  { id:'bongo', name:'Bongo', cat:'Toms & Perc' }, { id:'cowbell', name:'Cowbell', cat:'Toms & Perc' }, { id:'clave', name:'Clave', cat:'Toms & Perc' },
  { id:'wood', name:'Woodblock', cat:'Toms & Perc' }, { id:'perc', name:'Perc', cat:'Toms & Perc' }, { id:'metal', name:'Metal', cat:'Toms & Perc' },
  { id:'indhit', name:'Industrial', cat:'Toms & Perc' }, { id:'shaker', name:'Shaker', cat:'Toms & Perc' }, { id:'tamb', name:'Tambourine', cat:'Toms & Perc' },
  { id:'triangle', name:'Triangle', cat:'Toms & Perc' }, { id:'click', name:'Click', cat:'Toms & Perc' },
  // bass
  { id:'sub', name:'Sub', cat:'Bass' }, { id:'bass808', name:'808 Bass', cat:'Bass' }, { id:'bass', name:'Pulse Bass', cat:'Bass' },
  { id:'offbass', name:'Offbeat Bass', cat:'Bass' }, { id:'dubbass', name:'Dub Bass', cat:'Bass' }, { id:'rumble', name:'Rumble', cat:'Bass' },
  { id:'sqbass', name:'Square Bass', cat:'Bass' }, { id:'mono', name:'Mono Bass', cat:'Bass' }, { id:'sawbass', name:'Saw Bass', cat:'Bass' },
  { id:'moog', name:'Moog Bass', cat:'Bass' }, { id:'ebm', name:'EBM Bass', cat:'Bass' }, { id:'buzz', name:'Buzz Bass', cat:'Bass' },
  { id:'reese', name:'Reese', cat:'Bass' }, { id:'fmbass', name:'FM Bass', cat:'Bass' }, { id:'growl', name:'Growl Bass', cat:'Bass' },
  { id:'wobble', name:'Wobble Bass', cat:'Bass' },
  // leads & arps
  { id:'acid303', name:'Acid 303', cat:'Leads & Arps' }, { id:'acid', name:'Acid Soft', cat:'Leads & Arps' }, { id:'pluck', name:'Pluck', cat:'Leads & Arps' },
  { id:'blip', name:'Arp Blip', cat:'Leads & Arps' }, { id:'darksaw', name:'Dark Saw', cat:'Leads & Arps' }, { id:'supersaw', name:'Supersaw', cat:'Leads & Arps' },
  { id:'hoover', name:'Hoover', cat:'Leads & Arps' },
  { id:'sawlead', name:'Saw Lead', cat:'Leads & Arps' }, { id:'sqlead', name:'Square Lead', cat:'Leads & Arps' }, { id:'synclead', name:'Sync Lead', cat:'Leads & Arps' },
  { id:'sinelead', name:'Sine Lead', cat:'Leads & Arps' }, { id:'pwm', name:'PWM Synth', cat:'Leads & Arps' }, { id:'tpluck', name:'Trance Pluck', cat:'Leads & Arps' }, { id:'bell', name:'FM Bell', cat:'Leads & Arps' }, { id:'siren', name:'Siren', cat:'Leads & Arps' },
  // chords & stabs
  { id:'stab', name:'Stab', cat:'Chords & Stabs' }, { id:'diststab', name:'Dist Stab', cat:'Chords & Stabs' }, { id:'chord', name:'Dark Chord', cat:'Chords & Stabs' },
  { id:'organ', name:'House Organ', cat:'Chords & Stabs' },
  { id:'polysynth', name:'Poly Synth', cat:'Chords & Stabs' }, { id:'ravestab', name:'Rave Stab', cat:'Chords & Stabs' },
  { id:'dubchord', name:'Dub Chord', cat:'Chords & Stabs' }, { id:'deepchord', name:'Deep Chord', cat:'Chords & Stabs' },
  // keys
  { id:'piano', name:'Piano', cat:'Keys' }, { id:'housepiano', name:'House Piano', cat:'Keys' }, { id:'rhodes', name:'Rhodes', cat:'Keys' },
  { id:'epiano', name:'E-Piano Chord', cat:'Keys' }, { id:'wurli', name:'Wurli', cat:'Keys' }, { id:'clav', name:'Clav', cat:'Keys' },
  { id:'marimba', name:'Marimba', cat:'Keys' }, { id:'kalimba', name:'Kalimba', cat:'Keys' },
  // pads
  { id:'warmpad', name:'Warm Pad', cat:'Pads' }, { id:'junopad', name:'Juno Pad', cat:'Pads' }, { id:'glasspad', name:'Glass Pad', cat:'Pads' },
  { id:'airpad', name:'Air Pad', cat:'Pads' }, { id:'pad', name:'Dark Pad', cat:'Pads' },
  // vocals
  { id:'vox', name:'Vox', cat:'Vocals' }, { id:'chant', name:'Chant', cat:'Vocals' }, { id:'choir', name:'Choir', cat:'Vocals' },
  // orchestra
  { id:'strings', name:'Strings', cat:'Orchestra' }, { id:'brass', name:'Brass', cat:'Orchestra' }, { id:'timpani', name:'Timpani', cat:'Orchestra' },
  { id:'glock', name:'Glockenspiel', cat:'Orchestra' },
  // fx
  { id:'impact', name:'Impact', cat:'FX' }, { id:'boom', name:'Boom', cat:'FX' }, { id:'zap', name:'Zap', cat:'FX' },
  { id:'laser', name:'Laser', cat:'FX' }, { id:'glitch', name:'Glitch', cat:'FX' }, { id:'noiz', name:'Noise Hit', cat:'FX' },
  { id:'sweepup', name:'Sweep Up', cat:'FX' }, { id:'sweepdown', name:'Sweep Down', cat:'FX' }, { id:'crackle', name:'Vinyl Hit', cat:'FX' },
];
const CAT_ORDER = ['Kicks','Snares','Claps','Hats & Cymbals','Toms & Perc','Bass','Leads & Arps','Chords & Stabs','Keys','Pads','Vocals','Orchestra','FX'];
LIB.sort((a,b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
const LIBM = Object.fromEntries(LIB.map(x=>[x.id,x]));
const label = v => (LIBM[v] ? LIBM[v].name : v).toUpperCase();
const MELODIC  = ['bass','sub','ebm','acid','acid303','stab','pluck','rumble','reese','fmbass','chord','hoover','bell','vox','strings','brass','timpani','glock','wobble','sqbass','moog','supersaw','blip','siren','organ','epiano','pad','choir','buzz','mono','darksaw','diststab','chant','offbass','dubbass','sawbass','growl','bass808','piano','housepiano','rhodes','wurli','clav','marimba','kalimba','warmpad','junopad','glasspad','airpad','sawlead','sqlead','synclead','sinelead','pwm','tpluck','polysynth','ravestab','dubchord','deepchord'];
const FILTERED = ['acid','acid303'];
const KIT_TECHNO = ['kick','bass','clap','perc','hat','tick','acid','stab'];
const DLY_NAMES = {1:'1/16',2:'1/8',3:'3/16',4:'1/4',5:'5/16',6:'3/8',7:'7/16',8:'1/2'};
const SCALE = [0,3,5,7,10,12,15];   // минорная пентатоника
// базовая октава каждого звука относительно тоники пресета
const BASE = { bass:12, sub:12, ebm:12, rumble:12, reese:12, fmbass:12, acid:24, acid303:24, timpani:24,
               stab:36, pluck:36, chord:36, hoover:36, vox:36, strings:36, brass:36, bell:48, glock:48,
               wobble:12, sqbass:12, moog:12, supersaw:36, organ:36, epiano:36, pad:36, choir:36, blip:48, siren:48 };
const NOTE_IX = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

const PRESETS = [
  // ---------- чистый лист: звуки есть, связей нет ----------
  { genre:'New', ref:'empty field · add sounds with +', name:'BLANK', bpm:128, acc:'#ff2e3a', root:31, drive:3, grit:0.6, cut:2400, fx:'warp', tpl:'loop', blank:true,
    voices:[], pat:{} },
  { genre:'Acid', ref:'locked room', name:'ACID TECHNO', bpm:138, acc:'#c8ff1a', root:33, drive:4, grit:1.2, cut:2800,
    voices:['kick','acid303','clap','hat808','ohat','ride','sub','cowbell'], pat:{
    kick:'x...x...x...x...', acid303:'xx.x.xx.x.xxx.x.', clap:'....x.......x...', hat808:'xxxxxxxxxxxxxxxx',
    ohat:'..x...x...x...x.', ride:'x.x.x.x.x.x.x.x.', sub:'..x...x...x...x.', cowbell:'...x..x....x..x.' },
    notes:{ acid303:[0,12,0,0,3,0,12,15,0,7,0,10], sub:[0,0,0,-2] },
    sc:{ acid303:0.3, sub:0.6 },
    tune:{ acid303:{ res:0.88, dly:0.22, dlyT:3, dlyFb:0.45, drive:0.25 }, hat808:{ vol:0.55 }, ride:{ vol:0.45, rev:0.2 },
           clap:{ rev:0.35 }, cowbell:{ vol:0.5, dly:0.3, dlyT:3 } } },
  { genre:'Techno', ref:'locked room', name:'HARD TECHNO', bpm:152, acc:'#ff7a1a', root:29, drive:9, grit:3, cut:2400,
    voices:['hardkick','rumble','clap','hat','ohat','metal','hoover','noiz'], pat:{
    hardkick:'x...x...x...x...', rumble:'..xx..xx..xx..xx', clap:'....x.......x...', hat:'xxxxxxxxxxxxxxxx',
    ohat:'..x...x...x...x.', metal:'.......x......x.', hoover:'x.........x.....', noiz:'..............xx' },
    notes:{ rumble:[0,0,0,0,0,0,-2,0], hoover:[0,3] },
    sc:{ rumble:0.75, hoover:0.45, ohat:0.2 },
    tune:{ hat:{ vol:0.45 }, clap:{ rev:0.3, drive:0.3 }, hoover:{ rev:0.3, dly:0.2, dlyT:3 }, metal:{ rev:0.3, drive:0.4 }, noiz:{ dly:0.3, dlyT:2 } } },
  { genre:'Minimal / Dub', ref:'locked room', name:'MINIMAL DARK', bpm:124, acc:'#8b5cff', root:26, drive:2, grit:0.6, cut:1400,
    voices:['kick','sub','rim','shaker','conga','bell','vox','glitch'], pat:{
    kick:'x...x...x...x...', sub:'..x...x...x...x.', rim:'...x.....x..x...', shaker:'x.xxx.xxx.xxx.xx',
    conga:'.....x.....x..x.', bell:'x.........x.....', vox:'...........x....', glitch:'..............x.' },
    notes:{ sub:[0,0,3,0], bell:[0,7,10,3] },
    sc:{ sub:0.55, bell:0.3 },
    tune:{ bell:{ dly:0.45, dlyT:3, dlyFb:0.55, rev:0.4 }, vox:{ rev:0.55, dly:0.3, dlyT:6 }, rim:{ dly:0.3, dlyT:3, rev:0.2 },
           conga:{ rev:0.2 }, glitch:{ dly:0.4, dlyT:2 }, shaker:{ vol:0.4 } } },

  // ---------- культовые треки: оммажи (ритм, звуки, темп), мелодии свои ----------
  { genre:'Acid', ref:'after Phuture · 1987', name:'ACID TRACKS', bpm:120, acc:'#c8ff1a', root:33, drive:3, grit:0.8, cut:1800,
    voices:['kick808','clap','hat808','ohat','acid303','rim','cowbell'], pat:{
    kick808:'x...x...x...x...', clap:'....x.......x...', hat808:'x.x.x.x.x.x.x.x.', ohat:'..x...x...x...x.',
    acid303:'x.xx.x.xx.x.x.xx', rim:'...x......x.....', cowbell:'......x.......x.' },
    notes:{ acid303:[0,0,12,0,-2,0,3,0,0,12,-5,0] }, sc:{ acid303:0.2 },
    tune:{ acid303:{ res:0.92, cut:0.5, dly:0.12, dlyT:3 }, hat808:{ vol:0.6 }, cowbell:{ vol:0.45 } } },
  { genre:'Acid', ref:'after Joey Beltram · 1990', name:'ENERGY FLASH', bpm:132, acc:'#d9ff3d', root:31, drive:4, grit:1, cut:1600,
    voices:['kick','acid303','hat808','ohat','sub','rim','vox'], pat:{
    kick:'x...x...x...x...', acid303:'x.x.x.x.x.x.x.x.', hat808:'xxxxxxxxxxxxxxxx', ohat:'..x...x...x...x.',
    sub:'..x...x...x...x.', rim:'.......x.......x', vox:'........x.......' },
    notes:{ acid303:[0,0,0,3,0,0,-2,0], sub:[0] }, sc:{ sub:0.6, acid303:0.25 },
    tune:{ acid303:{ res:0.7, cut:0.42, dly:0.3, dlyT:3, dlyFb:0.5 }, hat808:{ vol:0.5 }, vox:{ rev:0.7, dly:0.4, dlyT:6, pitch:-5 } } },
  { genre:'Acid', ref:'after Josh Wink · 1995', name:'HIGHER STATE', bpm:130, acc:'#eaff00', root:33, drive:5, grit:1.4, cut:4200,
    voices:['kick','clap','ohat','hat808','acid303','tom','crash'], pat:{
    kick:'x...x...x...x...', clap:'....x.......x...', ohat:'..x...x...x...x.', hat808:'x.xxx.xxx.xxx.xx',
    acid303:'xxxxxxxxxxxxxxxx', tom:'.............xxx', crash:'x...............' },
    notes:{ acid303:[0,0,12,0,0,0,12,0,0,0,12,0,0,10,12,15] }, sc:{ acid303:0.3 },
    tune:{ acid303:{ res:0.97, cut:0.88, drive:0.5, dly:0.15, dlyT:3 }, tom:{ vol:0.6, rev:0.2 }, crash:{ vol:0.5 } } },

  { genre:'Techno', ref:'after Rhythim Is Rhythim · 1987', name:'STRINGS OF LIFE', bpm:124, acc:'#ffd23d', root:36, drive:2, grit:0.4, cut:2000,
    voices:['kick','clap','ohat','hat','chord','ride','conga'], pat:{
    kick:'x...x...x...x...', clap:'....x.......x...', ohat:'..x...x...x...x.', hat:'x.x.x.x.x.x.x.x.',
    chord:'x..x..x...x..x..', ride:'x.x.x.x.x.x.x.x.', conga:'...x..x.....x.x.' },
    notes:{ chord:[0,0,0,5,5,3,3,7] },
    tune:{ chord:{ rev:0.45, tone:0.8, vol:1.1 }, ride:{ vol:0.4 }, hat:{ vol:0.5 }, conga:{ rev:0.15 } } },
  { genre:'Techno', ref:'after Second Phase · 1991', name:'MENTASM', bpm:135, acc:'#ff7a1a', root:29, drive:7, grit:2, cut:2400,
    voices:['kick','hoover','snare','hat','ohat','rumble','noiz'], pat:{
    kick:'x...x...x...x...', hoover:'x.....x...x.....', snare:'....x.......x...', hat:'xxxxxxxxxxxxxxxx',
    ohat:'..x...x...x...x.', rumble:'..xx..xx..xx..xx', noiz:'...............x' },
    notes:{ hoover:[0,0,-2,0,3,0], rumble:[0] }, sc:{ rumble:0.7, hoover:0.35 },
    tune:{ hoover:{ decay:1.6, rev:0.35, dly:0.2, dlyT:3, vol:1.2 }, hat:{ vol:0.4 }, snare:{ rev:0.25 } } },

  { genre:'Minimal / Dub', ref:'after Plastikman · 1993', name:'SPASTIK', bpm:130, acc:'#e8e8e8', root:31, drive:3, grit:0.6, cut:2000,
    voices:['kick','snare','tom','rim','perc','hat808'], pat:{
    kick:'x...x...x...x...', snare:'x.xxx.x.xx.xxx.x', tom:'x..x..x..x..x.x.', rim:'..x...x..x...x..',
    perc:'.x.....x.....x..', hat808:'x.x.x.x.x.x.x.x.' },
    tune:{ snare:{ tone:0.55, decay:0.5, dly:0.25, dlyT:1, dlyFb:0.3, vol:0.7 }, tom:{ pitch:-3, dly:0.2, dlyT:3, rev:0.2 },
           rim:{ dly:0.3, dlyT:3 }, perc:{ rev:0.3 }, hat808:{ vol:0.45 } } },
  { genre:'Minimal / Dub', ref:'after Basic Channel · 1993', name:'PHYLYPS TRAK', bpm:128, acc:'#5cffb0', root:28, drive:2, grit:0.5, cut:1400,
    voices:['kick','chord','hat','shaker','sub','rim'], pat:{
    kick:'x...x...x...x...', chord:'x.....x.......x.', hat:'..x...x...x...x.', shaker:'x.xxx.xxx.xxx.xx',
    sub:'..x...x...x...x.', rim:'.......x.......x' },
    notes:{ chord:[0,0,-2], sub:[0] }, sc:{ chord:0.4, sub:0.5 },
    tune:{ chord:{ tone:0.42, dly:0.65, dlyT:3, dlyFb:0.68, rev:0.45, decay:0.6, vol:1.3 }, shaker:{ vol:0.35 }, rim:{ dly:0.4, dlyT:3 }, hat:{ vol:0.4 } } },

  { genre:'Electro / EBM', ref:'after Nitzer Ebb · 1987', name:'JOIN THE CHANT', bpm:125, acc:'#ff2e3a', root:28, drive:6, grit:2.4, cut:2000,
    voices:['kick','snare','ebm','metal','hat808','vox'], pat:{
    kick:'x...x...x...x...', snare:'....x.......x...', ebm:'xxxxxxxxxxxxxxxx', metal:'..x.......x.....',
    hat808:'..x...x...x...x.', vox:'x.......x.......' },
    notes:{ ebm:[0,0,0,0,12,0,0,0,0,0,0,0,10,0,12,0] }, sc:{ ebm:0.35 },
    tune:{ ebm:{ vol:1 }, metal:{ rev:0.4, drive:0.4 }, vox:{ pitch:-12, drive:0.6, rev:0.4 }, snare:{ rev:0.3 } } },
  { genre:'Electro / EBM', ref:'after Cybotron · 1983', name:'CLEAR', bpm:126, acc:'#3d6bff', root:31, drive:3, grit:0.8, cut:2000,
    voices:['kick808','snare','hat808','fmbass','pluck','zap','conga'], pat:{
    kick808:'x......x..x.....', snare:'....x.......x...', hat808:'x.x.x.x.x.x.x.x.', fmbass:'x..x..x...x..x..',
    pluck:'..x...x...x.x...', zap:'..............x.', conga:'.....x.......x..' },
    notes:{ fmbass:[0,0,3,0,-2], pluck:[12,15,10,12] },
    tune:{ pluck:{ dly:0.35, dlyT:3, rev:0.3 }, zap:{ rev:0.3 }, hat808:{ vol:0.55 } } },
  // ---------- ещё культовые треки (оммажи: стиль, ритм, звуки; мелодии свои) ----------
  { genre:'House', ref:'after Robin S · 1993', name:'SHOW ME LOVE', bpm:120, acc:'#ff5fa2', root:26, drive:2, grit:0.5, cut:2000, fx:'warp',
    voices:['kick','organ','clap','hat','ohat','shaker'], pat:{
    kick:'x...x...x...x...', organ:'x..x..x...x..x..', clap:'....x.......x...', hat:'x.x.x.x.x.x.x.x.',
    ohat:'..x...x...x...x.', shaker:'xxxxxxxxxxxxxxxx' },
    notes:{ organ:[0,0,0,-2,-2,3,3,0] }, sc:{ organ:0.35 },
    tune:{ organ:{ pitch:-12, vol:1.3, tone:0.8 }, hat:{ vol:0.45 }, shaker:{ vol:0.3 }, clap:{ rev:0.3 } } },
  { genre:'House', ref:'after Frankie Knuckles · 1987', name:'YOUR LOVE', bpm:119, acc:'#ffb347', root:29, drive:2, grit:0.4, cut:2000, fx:'rings',
    voices:['kick808','clap','hat808','blip','pad','sqbass'], pat:{
    kick808:'x...x...x...x...', clap:'....x.......x...', hat808:'..x...x...x...x.', blip:'xxxxxxxxxxxxxxxx',
    pad:'x.......x.......', sqbass:'..x...x...x...x.' },
    notes:{ blip:[0,7,12,15,12,7,0,7,10,15,19,15,10,7,3,7], sqbass:[0,0,-2,-4], pad:[0,-4] }, sc:{ pad:0.45, sqbass:0.5 },
    tune:{ blip:{ dly:0.3, dlyT:3, rev:0.3 }, pad:{ rev:0.55 } } },
  { genre:'House', ref:'after Stardust · 1998', name:'MUSIC SOUNDS BETTER', bpm:124, acc:'#ff9e2c', root:31, drive:3, grit:0.8, cut:2000, fx:'flow',
    voices:['kick','chord','clap','hat','ohat','moog'], pat:{
    kick:'x...x...x...x...', chord:'x..x..x...x..x..', clap:'....x.......x...', hat:'x.x.x.x.x.x.x.x.',
    ohat:'..x...x...x...x.', moog:'x..x..x.x..x..x.' },
    notes:{ chord:[0,0,5,5,3,3,-2,-2], moog:[0,0,12,0,-2,-2,10,-2] }, sc:{ chord:0.55, moog:0.5 },
    tune:{ chord:{ tone:0.55, vol:1.2, rev:0.3, decay:0.5 }, moog:{ vol:0.9 }, hat:{ vol:0.5 } } },

  { genre:'Trance', ref:'after Darude · 1999', name:'SANDSTORM', bpm:136, acc:'#2ee6ff', root:35, drive:4, grit:1.2, cut:2000, fx:'tunnel',
    voices:['kick','supersaw','clap','ohat','hat808','sub','sweepup','crash'], pat:{
    kick:'x...x...x...x...', supersaw:'xxxxxxxxxxxxxxxx', clap:'....x.......x...', ohat:'..x...x...x...x.',
    hat808:'x.xxx.xxx.xxx.xx', sub:'..x...x...x...x.', sweepup:'........x.......', crash:'x...............' },
    notes:{ supersaw:[0,0,0,0,0,0,0,0,-2,-2,-2,-2,3,3,3,3] }, sc:{ supersaw:0.4, sub:0.6 },
    tune:{ supersaw:{ vol:0.9, dly:0.2, dlyT:3, rev:0.25, decay:0.6 }, hat808:{ vol:0.4 }, crash:{ vol:0.5 }, sweepup:{ vol:0.7 } } },
  { genre:'Trance', ref:'after Robert Miles · 1995', name:'CHILDREN', bpm:137, acc:'#9fd8ff', root:30, drive:2, grit:0.4, cut:2000, fx:'rings',
    voices:['kick','epiano','pad','clap','ohat','hat','sub'], pat:{
    kick:'x...x...x...x...', epiano:'x..x..x.x..x..x.', pad:'x...............', clap:'....x.......x...',
    ohat:'..x...x...x...x.', hat:'x.x.x.x.x.x.x.x.', sub:'..x...x...x...x.' },
    notes:{ epiano:[7,5,3,5,7,10,7,5] }, sc:{ pad:0.5, sub:0.6, epiano:0.2 },
    tune:{ epiano:{ rev:0.45, dly:0.3, dlyT:3, dlyFb:0.45, vol:1.2 }, pad:{ rev:0.5 }, hat:{ vol:0.35 } } },
  { genre:'Trance', ref:'after Faithless · 1995', name:'INSOMNIA', bpm:127, acc:'#c48bff', root:33, drive:3, grit:0.8, cut:2000, fx:'flow',
    voices:['kick','pluck','clap','hat','ohat','sub','pad'], pat:{
    kick:'x...x...x...x...', pluck:'x.xx.x.x.x.xx.x.', clap:'....x.......x...', hat:'xxxxxxxxxxxxxxxx',
    ohat:'..x...x...x...x.', sub:'..x...x...x...x.', pad:'x.......x.......' },
    notes:{ pluck:[0,0,3,0,7,0,5,3], pad:[0,-4] }, sc:{ pluck:0.3, pad:0.4, sub:0.6 },
    tune:{ pluck:{ dly:0.35, dlyT:3, rev:0.3, vol:1.1 }, pad:{ rev:0.5 }, hat:{ vol:0.35 } } },

  { genre:'Techno', ref:'after DJ Rolando · 1999', name:'KNIGHTS OF THE JAGUAR', bpm:130, acc:'#3dffb5', root:33, drive:3, grit:0.6, cut:2000, fx:'rings',
    voices:['kick','strings','clap','hat','ride','conga','sub'], pat:{
    kick:'x...x...x...x...', strings:'x.....x...x.....', clap:'....x.......x...', hat:'x.x.x.x.x.x.x.x.',
    ride:'..x...x...x...x.', conga:'...x..x....x..x.', sub:'..x...x...x...x.' },
    notes:{ strings:[0,0,3] }, sc:{ strings:0.3, sub:0.6 },
    tune:{ strings:{ vol:1.3, rev:0.5, decay:0.7 }, ride:{ vol:0.4 }, hat:{ vol:0.45 }, conga:{ rev:0.15 } } },

  { genre:'Minimal / Dub', ref:'after Ricardo Villalobos · 2003', name:'DEXTER', bpm:125, acc:'#b6ff6e', root:29, drive:2, grit:0.4, cut:1400, fx:'warp',
    voices:['kick','clave','wood','bongo','shaker','sub','crackle'], pat:{
    kick:'x...x...x...x...', clave:'..x..x....x..x..', wood:'.....x.......x..', bongo:'.x.x...x.x.x....',
    shaker:'x.xxx.xxx.xxx.xx', sub:'..x...x...x...x.', crackle:'.......x.......x' },
    sc:{ sub:0.5 },
    tune:{ clave:{ dly:0.3, dlyT:3, rev:0.2 }, bongo:{ pitch:-2, rev:0.2 }, wood:{ dly:0.25, dlyT:2 }, shaker:{ vol:0.3 } } },

  { genre:'Electro / EBM', ref:'after Afrika Bambaataa · 1982', name:'PLANET ROCK', bpm:127, acc:'#ff3df0', root:28, drive:3, grit:0.8, cut:2000, fx:'tunnel',
    voices:['kick808','snare','hat808','cowbell','stab','zap','sub'], pat:{
    kick808:'x......x..x.....', snare:'....x.......x...', hat808:'x.x.x.x.x.x.x.x.', cowbell:'..x...x...xx..x.',
    stab:'x.....x...x.....', zap:'..............x.', sub:'x......x..x.....' },
    notes:{ stab:[0,0,3] },
    tune:{ stab:{ rev:0.4, vol:1.1 }, cowbell:{ vol:0.4 }, hat808:{ vol:0.55 } } },
  { genre:'Electro / EBM', ref:'after Kraftwerk · 1981', name:'NUMBERS', bpm:117, acc:'#7cf0ff', root:31, drive:2, grit:0.5, cut:2000, fx:'warp',
    voices:['kick808','snare','sqbass','blip','perc','vox'], pat:{
    kick808:'x.....x.x.......', snare:'....x.......x...', sqbass:'x.x.x.x.x.x.x.x.', blip:'..x...x..x...x..',
    perc:'...x.......x....', vox:'x...............' },
    notes:{ sqbass:[0,0,12,0,0,0,10,0], blip:[12,15,19,17] },
    tune:{ vox:{ pitch:-7, drive:0.5, rev:0.3 }, blip:{ dly:0.25, dlyT:3 } } },
  { genre:'Electro / EBM', ref:'locked room', name:'NEON GRID', bpm:120, acc:'#00e5ff', root:28, drive:3, grit:1.2, cut:2200, fx:'tunnel',
    voices:['kick','moog','blip','supersaw','snare909','hat808','ohat','vox'], pat:{
    kick:'x...x...x...x...', moog:'x..x..x...x.x..x', blip:'x.x.x.x.x.x.x.x.', supersaw:'x.......x.......',
    snare909:'....x.......x...', hat808:'..x...x...x...x.', ohat:'.......x.......x', vox:'x...............' },
    notes:{ moog:[0,0,12,0,-2,10], blip:[12,7,3,7,12,15,12,7], supersaw:[0,-4], vox:[0] },
    sc:{ supersaw:0.75, moog:0.4, blip:0.25 },
    tune:{ moog:{ vol:1, drive:0.35 }, blip:{ dly:0.3, dlyT:3, dlyFb:0.35, vol:0.8 }, supersaw:{ vol:1, decay:2.2, tone:0.7, rev:0.35, duckRel:0.32 },
           snare909:{ rev:0.25 }, hat808:{ vol:0.5 }, vox:{ pitch:-12, drive:0.5, rev:0.3, dly:0.25, dlyT:4 } } },
  { genre:'Techno', ref:'locked room', name:'CRIMSON CUT', bpm:128, acc:'#ff1a1a', root:29, drive:7, grit:2, cut:2600, fx:'tunnel',
    voices:['hardkick','reese','fmbass','bigclap','snare909','hat808','laser','sweepup'], pat:{
    hardkick:'x...x...x...x...', reese:'..x...x...x...xx', fmbass:'.x...x.x.x...x.x', bigclap:'....x.......x...',
    snare909:'............x.x.', hat808:'..x...x...x...x.', laser:'.......x.......x', sweepup:'........x.......' },
    notes:{ reese:[0,0,0,-2,3], fmbass:[12,12,10,12,15,12] },
    sc:{ reese:0.7, fmbass:0.55, laser:0.3 },
    tune:{ reese:{ drive:0.75, vol:1.1, tone:0.85 }, fmbass:{ drive:0.6, vol:0.9 }, bigclap:{ rev:0.35, drive:0.3 },
           snare909:{ vol:0.7 }, hat808:{ vol:0.5 }, laser:{ dly:0.3, dlyT:3, rev:0.3 }, sweepup:{ vol:0.7 } } },
  // ---------- тёмный электро ----------
  { genre:'Dark Electro', ref:'locked room', name:'IRON CROWN', bpm:126, acc:'#d4af37', root:29, drive:7, grit:2.2, cut:2400, fx:'tunnel',
    voices:['hardkick','ebm','metal','snare909','vox','chord','hat808'], pat:{
    hardkick:'x...x...x...x...', ebm:'..xx..xx..xx..xx', metal:'....x.......x...', snare909:'............x.xx',
    vox:'x.....x.........', chord:'x..........x....', hat808:'..x...x...x...x.' },
    notes:{ ebm:[0,0,1,0,0,0,3,1], vox:[0,-2], chord:[0,1] }, sc:{ ebm:0.55, chord:0.6 },
    tune:{ ebm:{ drive:0.7, vol:1.05, tone:0.7 }, metal:{ drive:0.5, rev:0.35, vol:0.9 }, snare909:{ drive:0.4, vol:0.75 },
           vox:{ pitch:-12, drive:0.7, rev:0.25, dly:0.25, dlyT:3 }, chord:{ drive:0.5, rev:0.4, vol:0.85 }, hat808:{ vol:0.45 } } },
  { genre:'Dark Electro', ref:'locked room', name:'NOIR PROCESSION', bpm:128, acc:'#e8e8e8', root:28, drive:8, grit:2.6, cut:2800, fx:'rings',
    voices:['kick','reese','stab','bigclap','tick','laser','crash'], pat:{
    kick:'x...x...x...x...', reese:'x.x.x.xxx.x.x.xx', stab:'..x..x....x..x..', bigclap:'....x.......x...',
    tick:'xxxxxxxxxxxxxxxx', laser:'.......x........', crash:'x...............' },
    notes:{ reese:[0,0,0,0,1,0,0,-2,0,0,0,0,3,1,0,-2], stab:[12,13,12,10] }, sc:{ reese:0.65, stab:0.4 },
    tune:{ reese:{ drive:0.85, vol:1.1, tone:0.8 }, stab:{ drive:0.6, rev:0.3, dly:0.3, dlyT:3, dlyFb:0.3 }, bigclap:{ drive:0.4, rev:0.3 },
           tick:{ vol:0.35 }, laser:{ rev:0.4, dly:0.35, dlyT:3 }, crash:{ vol:0.5 } } },
  { genre:'Dark Electro', ref:'locked room', name:'CHROME SERMON', bpm:122, acc:'#b31b1b', root:26, drive:6, grit:1.8, cut:2000, fx:'warp',
    voices:['deepkick','rumble','fmbass','choir','snare','metal','click','impact'], pat:{
    deepkick:'x...x...x...x...', rumble:'..x...x...x...x.', fmbass:'x..x..x.x..x..x.', choir:'x...............',
    snare:'....x.......x...', metal:'.......x.....x..', click:'x.x.x.x.x.x.x.x.', impact:'x...............' },
    notes:{ rumble:[0], fmbass:[0,0,1,0,0,-2], choir:[0,1] }, sc:{ rumble:0.6, fmbass:0.5, choir:0.7 },
    tune:{ fmbass:{ drive:0.65, vol:0.95 }, choir:{ rev:0.5, vol:0.8, decay:2 }, snare:{ drive:0.5, rev:0.35 },
           metal:{ drive:0.4, dly:0.3, dlyT:3, rev:0.3 }, click:{ vol:0.4 }, impact:{ vol:0.6, rev:0.4 } } },
];
// порядок жанров в списке Tracks
const GENRE_ORDER = ['New','Techno','Acid','House','Trance','Minimal / Dub','Electro / EBM','Dark Electro'];
// внутри жанра: сначала классика по году, потом свои пресеты
const presetYear = p => { const m = /(\d{4})$/.exec(p.ref || ''); return m ? +m[1] : 9999; };
PRESETS.sort((a, b) => GENRE_ORDER.indexOf(a.genre) - GENRE_ORDER.indexOf(b.genre) || presetYear(a) - presetYear(b));
