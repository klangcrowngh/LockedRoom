// LOCKED ROOM — библиотека звуков и пресеты

// ---------- библиотека звуков ----------
const LIB = [
  { id:'kick808', name:'808 Kick',    cat:'Kicks' }, { id:'kick',    name:'Techno Kick', cat:'Kicks' },
  { id:'hardkick',name:'Hard Kick',   cat:'Kicks' }, { id:'boom',    name:'Boom',        cat:'Kicks' },
  { id:'snare',   name:'Snare',       cat:'Drums' }, { id:'clap',    name:'Clap',        cat:'Drums' },
  { id:'rim',     name:'Rimshot',     cat:'Drums' }, { id:'tom',     name:'Tom',         cat:'Drums' },
  { id:'hat808',  name:'808 Hat',     cat:'Drums' }, { id:'ohat',    name:'Open Hat',    cat:'Drums' },
  { id:'hat',     name:'Noise Hat',   cat:'Drums' }, { id:'ride',    name:'Ride',        cat:'Drums' },
  { id:'tick',    name:'Tick',        cat:'Perc'  }, { id:'shaker',  name:'Shaker',      cat:'Perc'  },
  { id:'perc',    name:'Perc',        cat:'Perc'  }, { id:'cowbell', name:'Cowbell',     cat:'Perc'  },
  { id:'conga',   name:'Conga',       cat:'Perc'  }, { id:'metal',   name:'Metal',       cat:'Perc'  },
  { id:'ebm',     name:'EBM Bass',    cat:'Bass'  }, { id:'rumble',  name:'Rumble',      cat:'Bass'  },
  { id:'bass',    name:'Pulse Bass',  cat:'Bass'  }, { id:'sub',     name:'Sub',         cat:'Bass'  },
  { id:'reese',   name:'Reese',       cat:'Bass'  }, { id:'fmbass',  name:'FM Bass',     cat:'Bass'  },
  { id:'acid303', name:'Acid 303',    cat:'Synth' }, { id:'acid',    name:'Acid Soft',   cat:'Synth' },
  { id:'stab',    name:'Stab',        cat:'Synth' }, { id:'chord',   name:'Dark Chord',  cat:'Synth' },
  { id:'hoover',  name:'Hoover',      cat:'Synth' }, { id:'pluck',   name:'Pluck',       cat:'Synth' },
  { id:'bell',    name:'FM Bell',     cat:'Synth' }, { id:'vox',     name:'Vox',         cat:'Synth' },
  { id:'zap',     name:'Zap',         cat:'FX'    }, { id:'laser',   name:'Laser',       cat:'FX'    },
  { id:'glitch',  name:'Glitch',      cat:'FX'    }, { id:'noiz',    name:'Noise Hit',   cat:'FX'    },
  { id:'crash',   name:'Crash',       cat:'FX'    },
  { id:'strings', name:'Strings',     cat:'Orchestra' }, { id:'brass',   name:'Brass',       cat:'Orchestra' },
  { id:'timpani', name:'Timpani',     cat:'Orchestra' }, { id:'glock',   name:'Glockenspiel',cat:'Orchestra' },
  { id:'deepkick',name:'Deep Kick',   cat:'Kicks' }, { id:'gabber',  name:'Gabber Kick', cat:'Kicks' }, { id:'lofikick',name:'Lo-Fi Kick',  cat:'Kicks' },
  { id:'snare909',name:'Snare 909',   cat:'Drums' }, { id:'snap',    name:'Snap',        cat:'Drums' }, { id:'bigclap', name:'Big Clap',    cat:'Drums' },
  { id:'clave',   name:'Clave',       cat:'Perc'  }, { id:'wood',    name:'Woodblock',   cat:'Perc'  }, { id:'bongo',   name:'Bongo',       cat:'Perc'  },
  { id:'triangle',name:'Triangle',    cat:'Perc'  }, { id:'tamb',    name:'Tambourine',  cat:'Perc'  }, { id:'click',   name:'Click',       cat:'Perc'  },
  { id:'wobble',  name:'Wobble Bass', cat:'Bass'  }, { id:'sqbass',  name:'Square Bass', cat:'Bass'  }, { id:'moog',    name:'Moog Bass',   cat:'Bass'  },
  { id:'supersaw',name:'Supersaw',    cat:'Synth' }, { id:'blip',    name:'Arp Blip',    cat:'Synth' }, { id:'siren',   name:'Siren',       cat:'Synth' },
  { id:'organ',   name:'House Organ', cat:'Keys & Pads' }, { id:'epiano', name:'E-Piano', cat:'Keys & Pads' },
  { id:'pad',     name:'Dark Pad',    cat:'Keys & Pads' }, { id:'choir',  name:'Choir',   cat:'Keys & Pads' },
  { id:'sweepup', name:'Sweep Up',    cat:'FX'    }, { id:'sweepdown',name:'Sweep Down', cat:'FX'    }, { id:'impact',  name:'Impact',      cat:'FX'    },
  { id:'crackle', name:'Vinyl Hit',   cat:'FX'    },
];
const CAT_ORDER = ['Kicks','Drums','Perc','Bass','Synth','Keys & Pads','Orchestra','FX'];
LIB.sort((a,b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
const LIBM = Object.fromEntries(LIB.map(x=>[x.id,x]));
const label = v => (LIBM[v] ? LIBM[v].name : v).toUpperCase();
const MELODIC  = ['bass','sub','ebm','acid','acid303','stab','pluck','rumble','reese','fmbass','chord','hoover','bell','vox','strings','brass','timpani','glock','wobble','sqbass','moog','supersaw','blip','siren','organ','epiano','pad','choir'];
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
  { genre:'Originals', ref:'locked room', name:'ACID TECHNO', bpm:138, acc:'#c8ff1a', root:33, drive:4, grit:1.2, cut:2800,
    voices:['kick','acid303','clap','hat808','ohat','ride','sub','cowbell'], pat:{
    kick:'x...x...x...x...', acid303:'xx.x.xx.x.xxx.x.', clap:'....x.......x...', hat808:'xxxxxxxxxxxxxxxx',
    ohat:'..x...x...x...x.', ride:'x.x.x.x.x.x.x.x.', sub:'..x...x...x...x.', cowbell:'...x..x....x..x.' },
    notes:{ acid303:[0,12,0,0,3,0,12,15,0,7,0,10], sub:[0,0,0,-2] },
    sc:{ acid303:0.3, sub:0.6 },
    tune:{ acid303:{ res:0.88, dly:0.22, dlyT:3, dlyFb:0.45, drive:0.25 }, hat808:{ vol:0.55 }, ride:{ vol:0.45, rev:0.2 },
           clap:{ rev:0.35 }, cowbell:{ vol:0.5, dly:0.3, dlyT:3 } } },
  { genre:'Originals', ref:'locked room', name:'HARD TECHNO', bpm:152, acc:'#ff7a1a', root:29, drive:9, grit:3, cut:2400,
    voices:['hardkick','rumble','clap','hat','ohat','metal','hoover','noiz'], pat:{
    hardkick:'x...x...x...x...', rumble:'..xx..xx..xx..xx', clap:'....x.......x...', hat:'xxxxxxxxxxxxxxxx',
    ohat:'..x...x...x...x.', metal:'.......x......x.', hoover:'x.........x.....', noiz:'..............xx' },
    notes:{ rumble:[0,0,0,0,0,0,-2,0], hoover:[0,3] },
    sc:{ rumble:0.75, hoover:0.45, ohat:0.2 },
    tune:{ hat:{ vol:0.45 }, clap:{ rev:0.3, drive:0.3 }, hoover:{ rev:0.3, dly:0.2, dlyT:3 }, metal:{ rev:0.3, drive:0.4 }, noiz:{ dly:0.3, dlyT:2 } } },
  { genre:'Originals', ref:'locked room', name:'MINIMAL DARK', bpm:124, acc:'#8b5cff', root:26, drive:2, grit:0.6, cut:1400,
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

  { genre:'Detroit / Techno', ref:'after Rhythim Is Rhythim · 1987', name:'STRINGS OF LIFE', bpm:124, acc:'#ffd23d', root:36, drive:2, grit:0.4, cut:2000,
    voices:['kick','clap','ohat','hat','chord','ride','conga'], pat:{
    kick:'x...x...x...x...', clap:'....x.......x...', ohat:'..x...x...x...x.', hat:'x.x.x.x.x.x.x.x.',
    chord:'x..x..x...x..x..', ride:'x.x.x.x.x.x.x.x.', conga:'...x..x.....x.x.' },
    notes:{ chord:[0,0,0,5,5,3,3,7] },
    tune:{ chord:{ rev:0.45, tone:0.8, vol:1.1 }, ride:{ vol:0.4 }, hat:{ vol:0.5 }, conga:{ rev:0.15 } } },
  { genre:'Detroit / Techno', ref:'after Jeff Mills · Blue Potential (orchestral)', name:'THE BELLS', fx:'rings',
    bpm:136, acc:'#4dd2ff', root:33, drive:3, grit:0.5, cut:2000,
    voices:['kick','glock','hat','ohat','timpani','strings','brass','crash'], pat:{
    kick:'x...x...x...x...', glock:'xxxxxxxxxxxxxxxx', hat:'xxxxxxxxxxxxxxxx', ohat:'..x...x...x...x.',
    timpani:'x.......x.....x.', strings:'x.......x.......', brass:'......x.......x.', crash:'x...............' },
    notes:{ glock:[0,7,12,7,3,7,10,7,0,7,12,15,12,10,7,3], timpani:[0,0,-5], strings:[0,-4], brass:[0,3,0,-2] },
    sc:{ strings:0.25, glock:0.15 },
    tune:{ glock:{ vol:0.8, rev:0.3, dly:0.12, dlyT:3, dlyFb:0.3 }, hat:{ vol:0.35, tone:0.85 }, ohat:{ vol:0.6 },
           timpani:{ vol:1, rev:0.3 }, strings:{ vol:1.1, rev:0.45 }, brass:{ vol:0.9, rev:0.3 }, crash:{ vol:0.5, rev:0.3 } } },
  { genre:'Detroit / Techno', ref:'after Second Phase · 1991', name:'MENTASM', bpm:135, acc:'#ff7a1a', root:29, drive:7, grit:2, cut:2400,
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

  { genre:'EBM / Electro', ref:'after Nitzer Ebb · 1987', name:'JOIN THE CHANT', bpm:125, acc:'#ff2e3a', root:28, drive:6, grit:2.4, cut:2000,
    voices:['kick','snare','ebm','metal','hat808','vox'], pat:{
    kick:'x...x...x...x...', snare:'....x.......x...', ebm:'xxxxxxxxxxxxxxxx', metal:'..x.......x.....',
    hat808:'..x...x...x...x.', vox:'x.......x.......' },
    notes:{ ebm:[0,0,0,0,12,0,0,0,0,0,0,0,10,0,12,0] }, sc:{ ebm:0.35 },
    tune:{ ebm:{ vol:1 }, metal:{ rev:0.4, drive:0.4 }, vox:{ pitch:-12, drive:0.6, rev:0.4 }, snare:{ rev:0.3 } } },
  { genre:'EBM / Electro', ref:'after Cybotron · 1983', name:'CLEAR', bpm:126, acc:'#3d6bff', root:31, drive:3, grit:0.8, cut:2000,
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

  { genre:'Detroit / Techno', ref:'after DJ Rolando · 1999', name:'KNIGHTS OF THE JAGUAR', bpm:130, acc:'#3dffb5', root:33, drive:3, grit:0.6, cut:2000, fx:'rings',
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

  { genre:'EBM / Electro', ref:'after Afrika Bambaataa · 1982', name:'PLANET ROCK', bpm:127, acc:'#ff3df0', root:28, drive:3, grit:0.8, cut:2000, fx:'tunnel',
    voices:['kick808','snare','hat808','cowbell','stab','zap','sub'], pat:{
    kick808:'x......x..x.....', snare:'....x.......x...', hat808:'x.x.x.x.x.x.x.x.', cowbell:'..x...x...xx..x.',
    stab:'x.....x...x.....', zap:'..............x.', sub:'x......x..x.....' },
    notes:{ stab:[0,0,3] },
    tune:{ stab:{ rev:0.4, vol:1.1 }, cowbell:{ vol:0.4 }, hat808:{ vol:0.55 } } },
  { genre:'EBM / Electro', ref:'after Kraftwerk · 1981', name:'NUMBERS', bpm:117, acc:'#7cf0ff', root:31, drive:2, grit:0.5, cut:2000, fx:'warp',
    voices:['kick808','snare','sqbass','blip','perc','vox'], pat:{
    kick808:'x.....x.x.......', snare:'....x.......x...', sqbass:'x.x.x.x.x.x.x.x.', blip:'..x...x..x...x..',
    perc:'...x.......x....', vox:'x...............' },
    notes:{ sqbass:[0,0,12,0,0,0,10,0], blip:[12,15,19,17] },
    tune:{ vox:{ pitch:-7, drive:0.5, rev:0.3 }, blip:{ dly:0.25, dlyT:3 } } },
  { genre:'Cinematic', ref:'locked room', name:'NEON GRID', bpm:120, acc:'#00e5ff', root:28, drive:3, grit:1.2, cut:2200, fx:'tunnel',
    voices:['kick','moog','blip','supersaw','snare909','hat808','ohat','vox'], pat:{
    kick:'x...x...x...x...', moog:'x..x..x...x.x..x', blip:'x.x.x.x.x.x.x.x.', supersaw:'x.......x.......',
    snare909:'....x.......x...', hat808:'..x...x...x...x.', ohat:'.......x.......x', vox:'x...............' },
    notes:{ moog:[0,0,12,0,-2,10], blip:[12,7,3,7,12,15,12,7], supersaw:[0,-4], vox:[0] },
    sc:{ supersaw:0.75, moog:0.4, blip:0.25 },
    tune:{ moog:{ vol:1, drive:0.35 }, blip:{ dly:0.3, dlyT:3, dlyFb:0.35, vol:0.8 }, supersaw:{ vol:1, decay:2.2, tone:0.7, rev:0.35, duckRel:0.32 },
           snare909:{ rev:0.25 }, hat808:{ vol:0.5 }, vox:{ pitch:-12, drive:0.5, rev:0.3, dly:0.25, dlyT:4 } } },
  { genre:'Cinematic', ref:'locked room', name:'SYSTEM CRASH', bpm:135, acc:'#00e5ff', root:33, drive:4, grit:1.4, cut:2000, fx:'tunnel',
    voices:['kick','sqbass','blip','clap','hat808','ohat','strings','zap'], pat:{
    kick:'x...x...x...x...', sqbass:'xxxxxxxxxxxxxxxx', blip:'x.x.x.x.x.x.x.x.', clap:'....x.......x...',
    hat808:'x.xxx.xxx.xxx.xx', ohat:'..x...x...x...x.', strings:'x...............', zap:'..............x.' },
    notes:{ sqbass:[0,12,0,12,0,12,0,12,-2,10,-2,10,3,15,3,15], blip:[0,3,7,12,7,3,0,-5], strings:[0] }, sc:{ sqbass:0.45, strings:0.3 },
    tune:{ sqbass:{ drive:0.6, vol:1.1 }, blip:{ dly:0.25, dlyT:3, vol:0.9 }, strings:{ rev:0.5, vol:1 }, hat808:{ vol:0.45 } } },
  { genre:'Cinematic', ref:'locked room', name:'CRIMSON CUT', bpm:128, acc:'#ff1a1a', root:29, drive:7, grit:2, cut:2600, fx:'tunnel',
    voices:['hardkick','reese','fmbass','bigclap','snare909','hat808','laser','sweepup'], pat:{
    hardkick:'x...x...x...x...', reese:'..x...x...x...xx', fmbass:'.x...x.x.x...x.x', bigclap:'....x.......x...',
    snare909:'............x.x.', hat808:'..x...x...x...x.', laser:'.......x.......x', sweepup:'........x.......' },
    notes:{ reese:[0,0,0,-2,3], fmbass:[12,12,10,12,15,12] },
    sc:{ reese:0.7, fmbass:0.55, laser:0.3 },
    tune:{ reese:{ drive:0.75, vol:1.1, tone:0.85 }, fmbass:{ drive:0.6, vol:0.9 }, bigclap:{ rev:0.35, drive:0.3 },
           snare909:{ vol:0.7 }, hat808:{ vol:0.5 }, laser:{ dly:0.3, dlyT:3, rev:0.3 }, sweepup:{ vol:0.7 } } },
];
// порядок жанров в списке Tracks
const GENRE_ORDER = ['Originals','Acid','Detroit / Techno','House','Trance','Minimal / Dub','EBM / Electro','Cinematic'];
PRESETS.sort((a, b) => GENRE_ORDER.indexOf(a.genre) - GENRE_ORDER.indexOf(b.genre));
