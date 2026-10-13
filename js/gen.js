// LOCKED ROOM — GEN: генератор треков по жанру
// ============================================================
//  Жанр задаёт всё: темп, свинг, лады, наборы звуков, «карты» ритма для каждой партии,
//  гармонию и сведение. Генератор строит несколько кандидатов на партию и выбирает лучший:
//  ближе к жанру, к заданной плотности/сложности и не повторяет то, что уже звучит.
//
//  Ритм партии (дорожки) — { a:[опорные рисунки], m:'карта весов 0–9 на 16 шагов', n:[мин, макс] доп. ударов }.
//  Опорные удары есть всегда (кик на долю, бэкбит…), дополнительные выбираются по карте: чем выше
//  плотность/сложность, тем их больше. Так рисунок разный каждый раз, но всегда в рамках жанра.
// ============================================================
const GK4 = 'x...x...x...x...', GOFF = '..x...x...x...x.', GBB = '....x.......x...';
const L = (a, m = '0000000000000000', n = [0, 0], o = {}) => Object.assign({ a: Array.isArray(a) ? a : [a], m, n }, o);

// прогрессии: ступени лада, 2 аккорда (по такту) или 4 (по полтакта)
const PROGS = {
  static:    { p2:[[0,0],[0,5],[0,3],[0,6]],     p4:[[0,0,0,5],[0,0,3,3],[0,5,0,6]] },
  emotional: { p2:[[0,5],[5,6],[0,3],[3,4]],     p4:[[0,5,2,6],[0,5,3,4],[5,3,0,4],[0,6,5,6],[0,3,5,4]] },
  house:     { p2:[[0,3],[1,4],[0,4],[5,4]],     p4:[[0,3,4,3],[1,4,0,5],[0,5,3,4],[3,4,0,0]] },
  deep:      { p2:[[0,3],[1,4],[0,6],[1,0]],     p4:[[1,4,0,5],[0,3,1,4],[5,1,4,0]] },
  pop:       { p2:[[0,4],[5,3],[0,5]],           p4:[[0,4,5,3],[5,3,0,4],[0,5,3,4]] },
  dark:      { p2:[[0,1],[0,5],[0,0],[0,6]],     p4:[[0,1,0,5],[0,5,1,0],[0,6,5,1]] },
  dreamy:    { p2:[[0,3],[3,0],[0,1]],           p4:[[0,3,4,1],[0,4,3,1],[0,1,3,4]] },
  punk:      { p2:[[0,0],[0,1],[0,0],[1,0]],     p4:[[0,0,1,0],[0,1,0,0],[0,0,0,1]] },
  menace:    { p2:[[0,5],[0,1],[0,4],[0,0]],     p4:[[0,5,1,4],[0,0,5,4],[0,1,0,4]] },   // i–♭VI–♭II–V, всегда от тоники   // тоника ↔ ♭II: тёмный полутон, без мажорных VI/VII
};

const GENRES = [
  { id:'techno', name:'Techno', bpm:[128,134], swing:[0,0.05], drive:5, grit:1.4, legacy:'techno',
    scales:{ dark:['phrygian','minor'], mid:['minor','dorian'], bright:['dorian'] },
    kit:{ kick:['kick','kick909','rumblekick','punchkick'], snare:['clap909','clap','snare909'], hat:['hat909','hat','hat808'], ohat:['ohat909','ride','ohat'], perc:['metal','rim707','perc','click','tom909'] },
    snd:{ bass:['rumble','sub','reese','fmbass','mono'], lead:['pluck','darksaw','bell','blip','hoover'], chords:['stab','chord','diststab','dubchord'], fx:['sweepup','impact','noiz','crash'] },
    kick:L(GK4, '0000000100010013', [0,1]), snare:L(GBB, '0000000300030023', [0,2]),
    hat:L(GOFF, '4343434343434343', [0,12]), ohat:L([GOFF, '......x.......x.']), perc:L(['...x.....x....x.', '..x..x....x..x..', '.......x.......x'], '0102010301020103', [0,3]),
    bass:L(['..x...x...x...x.', '.xxx.xxx.xxx.xxx', '.x.x.x.x.x.x.x.x'], '0303030303030303', [0,3], { kick:'avoid', notes:'root' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0040300403004030', n:[1,4], prog:'static', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },

  { id:'hardtechno', name:'Hard Techno', bpm:[145,155], swing:[0,0], drive:7.5, grit:2.2, legacy:'techno',
    scales:{ dark:['phrygian','harmonic'], mid:['minor','phrygian'], bright:['minor'] },
    kit:{ kick:['hardkick','distkick','gabber','rumblekick'], snare:['clap909','bigclap','steel'], hat:['hat909','hat','tick'], ohat:['ohat909','ohat_phase'], perc:['metal','indhit','tom909'] },
    snd:{ bass:['rumble','reese','buzz','growl'], lead:['hoover','darksaw','siren','acid'], chords:['ravestab','diststab','stab'], fx:['impact','sweepup','boom','crash'] },
    kick:L(GK4, '0000000000000025', [0,1]), snare:L(GBB, '0000000200020013', [0,2]),
    hat:L(GOFF, '3232323232323232', [2,12]), ohat:L(GOFF), perc:L(['..x.......x.....', '......x.......x.'], '0101010101010101', [0,2]),   // на 150 BPM перкуссия — редкие акценты, иначе каша
    bass:L(['.xxx.xxx.xxx.xxx', '.x.x.x.x.x.x.x.x'], '0000000000000000', [0,0], { kick:'avoid', notes:'root' }),
    lead:{ rhythm:'synco', range:1, riff:true }, chords:{ style:'stab', m:'0030300303003030', n:[1,3], prog:'dark', rate:1 },
    parts:{ lead:'new', chords:'off', fx:'new' } },

  { id:'melodic', name:'Melodic Techno', bpm:[120,126], swing:[0,0.04], drive:3, grit:0.8, legacy:'techno',
    scales:{ dark:['minor','harmonic','phrygian'], mid:['minor','dorian'], bright:['dorian','major'] },
    kit:{ kick:['kick','deepkick','kick909'], snare:['clap','snare909','roomclap','rim'], hat:['hat909','shaker','crisphat'], ohat:['ohat909','ride'], perc:['perc','click','clave','tom'] },
    snd:{ bass:['sawbass','moog','reese','sub','mono'], lead:['tpluck','pluck','sawlead','bell','synclead','supersaw'], chords:['junopad','warmpad','airpad','glasspad','polysynth','strings'], fx:['sweepup','impact','crash'] },
    kick:L(GK4, '0000000000000012', [0,1]), snare:L(GBB, '0000000200000012', [0,1]),
    hat:L(GOFF, '2131213121312131', [0,8]), ohat:L(GOFF), perc:L(['......x.......x.', '...x.......x....'], '0101020101010201', [0,3]),
    bass:L(['.xxx.xxx.xxx.xxx', '.x.x.x.x.x.x.x.x', '..x...x...x...x.'], '0202020202020202', [0,2], { kick:'avoid', notes:'root' }),
    lead:{ rhythm:'arp', range:2 }, chords:{ style:'pad', prog:'emotional', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },

  { id:'deephouse', name:'Deep House', bpm:[118,124], swing:[0.1,0.2], drive:2, grit:0.4, legacy:'house',
    scales:{ dark:['minor','dorian'], mid:['dorian','minor'], bright:['major','mixolydian','dorian'] },
    kit:{ kick:['kick909','deepkick','kick808','lofikick'], snare:['clap','snap','rim','clap808'], hat:['shaker','hat707','hat909','crisphat'], ohat:['ohat909','ohat808'], perc:['conga','bongo','rim','wood','clave'] },
    snd:{ bass:['dubbass','bass','moog','sub','offbass'], lead:['kalimba','marimba','bell','rhodes','vox','sinelead'], chords:['deepchord','dubchord','epiano','organ','warmpad','housepiano'], fx:['crackle','sweepup','crash'] },
    kick:L(GK4, '0000000000000010', [0,1]), snare:L(GBB, '0000000100100001', [0,2]),
    hat:L(GOFF, '1312131213121312', [0,10]), ohat:L(GOFF), perc:L(['...x.x.....x.x..', '.x.x..x..x.x..x.', '...x.......x....'], '1212121212121212', [0,3]),
    bass:L(['x..x..x...x..x..', '..x...x...x...x.', 'x.....x...x.....', '...x..x....x..x.'], '2121212121212121', [0,3], { kick:'free', notes:'line' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'1031103110311031', n:[2,5], prog:'deep', rate:1 },
    parts:{ lead:'off', chords:'new', fx:'off' } },

  { id:'house', name:'House', bpm:[120,126], swing:[0.06,0.16], drive:2, grit:0.5, legacy:'house',
    scales:{ dark:['minor','dorian'], mid:['dorian','mixolydian'], bright:['major','mixolydian'] },
    kit:{ kick:['kick909','punchkick','kick808'], snare:['clap909','clap808','clap','roomclap'], hat:['hat909','hat707','shaker','tamb'], ohat:['ohat909','ohat808'], perc:['conga','bongo','cowbell','tamb','clave'] },
    snd:{ bass:['offbass','bass','moog','bass808','dubbass'], lead:['rhodes','piano','vox','bell','wurli','clav'], chords:['housepiano','organ','epiano','chord','polysynth'], fx:['crash','sweepup','impact'] },
    kick:L(GK4), snare:L(GBB, '0000000000000012', [0,1]),
    hat:L(GOFF, '2121212121212121', [0,8]), ohat:L(GOFF), perc:L(['...x.x.....x.x..', '..x....x..x....x', '.x.x..x..x.x..x.'], '1212121212121212', [0,3]),
    bass:L(['..x...x...x...x.', '.x.x..x..x.x..x.', 'x..x..x...x..x..'], '0313031303130313', [0,3], { kick:'free', notes:'line' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0030302003030020', n:[2,6], prog:'house', rate:2 },
    parts:{ lead:'off', chords:'new', fx:'off' } },

  { id:'techhouse', name:'Tech House', bpm:[124,128], swing:[0.08,0.18], drive:3, grit:0.7, legacy:'house',
    scales:{ dark:['minor','phrygian'], mid:['minor','dorian'], bright:['dorian','mixolydian'] },
    kit:{ kick:['punchkick','kick909','kick','deepkick'], snare:['clap','snap','tightclap','clap909'], hat:['hat909','shaker','pedalhat','hat707'], ohat:['ohat909','ohat'], perc:['rim','bongo','conga','perc','click','wood'] },
    snd:{ bass:['bass808','moog','sub','fmbass','offbass','mono'], lead:['vox','blip','sinelead','pluck'], chords:['stab','dubchord','organ'], fx:['crash','sweepup','glitch','noiz'] },
    kick:L(GK4, '0000000000000013', [0,1]), snare:L(GBB, '0001000100010003', [0,2]),
    hat:L(GOFF, '1313131313131313', [2,10]), ohat:L(GOFF), perc:L(['...x..x....x..x.', '..x..x...x..x...', '.x...x.x.x...x..'], '2222222222222222', [1,4]),
    bass:L(['x..x..x...x.x...', '...x..x....x.x..', '.x.x..xx.x.x..x.', 'x.xx..x...xx..x.'], '1212121212121212', [0,3], { kick:'free', notes:'root' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0030020030020030', n:[1,3], prog:'static', rate:1 },
    parts:{ lead:'new', chords:'off', fx:'off' } },

  { id:'proghouse', name:'Progressive House', bpm:[122,128], swing:[0,0.04], drive:2, grit:0.5, legacy:'trance',
    scales:{ dark:['minor'], mid:['minor','major'], bright:['major','lydian'] },
    kit:{ kick:['kick909','punchkick','kick'], snare:['clap909','roomclap','bigclap'], hat:['hat909','hat','shaker'], ohat:['ohat909','ride'], perc:['tamb','shaker','perc','click'] },
    snd:{ bass:['offbass','sawbass','moog','sub'], lead:['tpluck','pluck','supersaw','sawlead','bell'], chords:['junopad','polysynth','warmpad','glasspad','strings','chord'], fx:['sweepup','crash','impact'] },
    kick:L(GK4), snare:L(GBB, '0000000000000001', [0,1]),
    hat:L(GOFF, '1212121212121212', [0,8]), ohat:L(GOFF), perc:L(['x.x.x.x.x.x.x.x.', GOFF], '1111111111111111', [0,2]),
    bass:L(['..x...x...x...x.', '.xxx.xxx.xxx.xxx', '.xx..xx..xx..xx.'], '0101010101010101', [0,1], { kick:'avoid', notes:'root' }),
    lead:{ rhythm:'arp', range:2 }, chords:{ style:'pad', prog:'emotional', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'new' } },

  { id:'trance', name:'Trance', bpm:[136,140], swing:[0,0], drive:3, grit:0.6, legacy:'trance',
    scales:{ dark:['minor','harmonic'], mid:['minor'], bright:['major','minor'] },
    kit:{ kick:['kick909','punchkick','kick'], snare:['clap909','roomclap','bigclap'], hat:['hat909','hat'], ohat:['ohat909'], perc:['tamb','ride','shaker'] },
    snd:{ bass:['offbass','sawbass','sub'], lead:['tpluck','supersaw','pluck','sawlead','hoover'], chords:['junopad','polysynth','glasspad','strings','choir'], fx:['sweepup','crash','impact'] },
    kick:L(GK4), snare:L(GBB),
    hat:L(GOFF, '1212121212121212', [0,8]), ohat:L(GOFF), perc:L([GOFF, 'x.x.x.x.x.x.x.x.']),
    bass:L(['.xxx.xxx.xxx.xxx', '..x...x...x...x.', '.xx..xx..xx..xx.'], '0000000000000000', [0,0], { kick:'avoid', notes:'root' }),
    lead:{ rhythm:'arp', range:2 }, chords:{ style:'pad', prog:'emotional', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'new' } },

  { id:'acid', name:'Acid', bpm:[128,136], swing:[0,0.08], drive:4, grit:1.2, legacy:'acid',
    scales:{ dark:['phrygian','minor'], mid:['minor','dorian'], bright:['dorian','mixolydian'] },
    kit:{ kick:['kick909','kick','kick808'], snare:['clap909','snare909','clap','rim'], hat:['hat909','hat808'], ohat:['ohat909','ohat808'], perc:['cowbell','rim','clave','tom909'] },
    snd:{ bass:['sub','bass808','rumble'], lead:['acid303','acid'], chords:['stab','chord'], fx:['sweepup','zap','crash'] },
    kick:L(GK4, '0000000000000013', [0,1]), snare:L(GBB, '0000000100000013', [0,2]),
    hat:L([GOFF, 'x.x.x.x.x.x.x.x.'], '1212121212121212', [0,8]), ohat:L(GOFF), perc:L(['......x.......x.', '..x..x.....x..x.'], '1111111111111111', [0,2]),
    bass:L(['x.......x.......', 'x.....x...x.....'], '1010101010101010', [0,1], { kick:'free', notes:'root' }),
    lead:{ rhythm:'acid', range:2 }, chords:{ style:'stab', m:'0030003000300030', n:[1,2], prog:'static', rate:1 },
    parts:{ bass:'off', lead:'new', chords:'off', fx:'off' } },

  { id:'minimal', name:'Minimal', bpm:[122,128], swing:[0.1,0.2], drive:2, grit:0.4, legacy:'minimal',
    scales:{ dark:['minor','phrygian'], mid:['dorian','minor'], bright:['dorian','mixolydian'] },
    kit:{ kick:['deepkick','clickkick','kick','lofikick'], snare:['rim','snap','tightclap','rim707'], hat:['shaker','tick','crisphat','pedalhat'], ohat:['ride','ohat909'], perc:['clave','wood','click','bongo','triangle'] },
    snd:{ bass:['sub','dubbass','bass808'], lead:['blip','lead_ring','tpluck','lead_dark','marimba','kalimba'], chords:['dubchord','deepchord','epiano'], fx:['crackle','glitch','zap'] },
    kick:L(GK4, '0000000000100001', [0,1]), snare:L([GBB, '..x..x....x..x..', '.....x.......x..'], '0101010101010101', [0,2]),
    hat:L([GOFF, 'x.x.x.x.x.x.x.x.'], '1212121212121212', [0,6]), ohat:L(GOFF), perc:L(['.....x.......x..', '.x.x...x.x.x....', '..x....x.x....x.'], '2222222222222222', [1,5]),
    bass:L(['..x...x...x...x.', '..x.....x.x.....', '.x.....x.x......'], '1111111111111111', [0,2], { kick:'free', notes:'root' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0010001000100010', n:[1,3], prog:'static', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },

  { id:'dubtechno', name:'Dub Techno', bpm:[116,124], swing:[0,0.08], drive:1, grit:0.3, legacy:'minimal',
    scales:{ dark:['minor'], mid:['minor','dorian'], bright:['dorian'] },
    kit:{ kick:['deepkick','kick','lofikick'], snare:['rim','snap','lofisnare'], hat:['hat909','shaker','tick'], ohat:['ohat909','ride'], perc:['click','wood','clave'] },
    snd:{ bass:['sub','dubbass'], lead:['bell','sinelead'], chords:['dubchord','deepchord','chord'], fx:['crackle','noiz'] },
    kick:L(GK4), snare:L([GBB, '.......x.......x'], '0000000100000001', [0,1]),
    hat:L(GOFF, '1111111111111111', [0,4]), ohat:L(GOFF), perc:L('...x.......x....', '1111111111111111', [0,2]),
    bass:L(['x.......x.......', 'x.....x.x.......', '..x.......x.....'], '1010101010101010', [0,1], { kick:'free', notes:'root' }),
    lead:{ rhythm:'straight', range:1 }, chords:{ style:'stab', a:['...x.......x....', '..x.......x.....', '...x..x....x..x.'], m:'0010001000100010', n:[0,2], prog:'static', rate:1 },
    parts:{ lead:'off', chords:'new', fx:'off' } },

  { id:'electro', name:'Electro', bpm:[120,130], swing:[0,0.08], drive:3, grit:0.8, legacy:'electro',
    scales:{ dark:['phrygian','minor'], mid:['minor'], bright:['dorian'] },
    kit:{ kick:['kick808','kick707','kick606'], snare:['snare808','clap808','snare707'], hat:['hat808','hat707','hat606'], ohat:['ohat808'], perc:['cowbell','rim707','clave','tom'] },
    snd:{ bass:['fmbass','sqbass','mono','bass808'], lead:['blip','sqlead','pwm','sawlead','synclead','vox'], chords:['polysynth','stab','chord'], fx:['zap','laser','glitch'] },
    kick:L(['x......x..x.....', 'x.....x...x..x..', 'x..x......x.....', 'x.......x.x.....'], '0010001001100100', [0,2]), snare:L(GBB, '0000000000000012', [0,1]),
    hat:L('x.x.x.x.x.x.x.x.', '0101010101010101', [0,8]), ohat:L('......x.......x.'), perc:L(['..x...x...xx..x.', '.......x.......x', '.....x.......x..'], '1111111111111111', [0,2]),
    bass:L(['x..x..x...x..x..', '..x..x....x..xx.', 'x.x...x.x.x...x.'], '2222222222222222', [0,3], { kick:'follow', notes:'line' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0030020030020030', n:[1,3], prog:'dark', rate:1 },
    parts:{ lead:'new', chords:'off', fx:'new' } },

  { id:'ebm', name:'EBM / Dark Electro', bpm:[118,128], swing:[0,0], drive:6, grit:2, legacy:'dark',
    scales:{ dark:['phrygian','harmonic'], mid:['minor','phrygian'], bright:['minor'] },
    kit:{ kick:['distkick','hardkick','kick909','kick'], snare:['darksnare','steel','snare909'], hat:['hat808','tick','hat'], ohat:['ohat808'], perc:['metal','indhit','steel'] },
    snd:{ bass:['ebm','buzz','mono','reese'], lead:['darksaw','chant','vox','siren','hoover'], chords:['diststab','ravestab','pad','choir'], fx:['impact','boom','noiz'] },
    kick:L(GK4, '0000000000000020', [0,1]), snare:L(GBB, '0000000000000013', [0,1]),
    hat:L([GOFF, 'x.x.x.x.x.x.x.x.'], '1111111111111111', [0,6]), ohat:L(GOFF), perc:L(['..x.......x..x..', '.......x.......x'], '1111111111111111', [0,2]),
    bass:L(['.xxx.xxx.xxx.xxx', '.x.x.x.x.x.x.x.x'], '0000000000000000', [0,0], { kick:'avoid', notes:'seq' }),
    lead:{ rhythm:'straight', range:1, riff:true }, chords:{ style:'pad', prog:'dark', rate:1 },
    parts:{ lead:'new', chords:'off', fx:'off' } },
  // тёмное техно в духе Gesaffelstein (замер трёх треков): две зоны темпа ~102 и ~134 BPM, прямой кик, бас — главный (73–94 % энергии),
  // играет вместе с киком; хроматика вокруг тоники (полутон вверх/вниз, тритон), гармонический минор; очень тёмный верх
  { id:'darktechno', name:'Dark Techno', bpm:[100,135], bpmZones:[[100,106],[126,135]], swing:[0,0], drive:6, grit:1.6, legacy:'dark',
    scales:{ dark:['harmonic','phrygian'], mid:['harmonic','harmonic','phrygian'], bright:['harmonic','minor'] },
    kit:{ kick:['kick_cold','kick_menace','kick_industrial','kick_warehouse','distkick','kick909'], snare:['cl_cold','cl_metal','sn_whip','clap909','sn_industrial','darksnare'], hat:['hat_cold','hat909','tick','hat_metal'], ohat:['ohat909','ohat_phase','ohat_trash'], perc:['perc_chain','metal','indhit','cl_metal'] },
    snd:{ bass:['bass_menace','bass_hornet','bass_brute','bass_coldseq','ebm','reese_dark','buzz'], lead:['lead_abyss','lead_dread','lead_tar','lead_wraith','lead_bend','lead_dark','hoover','darksaw'], chords:['stab_abyss','stab_tritone','stab_cluster','stab_menace','pad_dark','pad_cold'], fx:['fx_rumblehit','fx_metalsweep','impact','metal_hit'] },
    kick:L(GK4, '0000000000000001', [0,1]), snare:L(GBB, '0000000000000012', [0,1]),
    hat:L(['..x...x...x...x.', 'x.x.x.x.x.x.x.x.'], '0101010101010101', [0,6]), ohat:L(GOFF), perc:L(['.......x.......x', '...x...........x'], '0001000100010001', [0,2]),
    bass:L(['x...x...x...x...', 'xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx', 'x.x.x.x.x.x.x.x.'], '0000000000000000', [0,0], { kick:'follow', notes:'chroma' }),
    lead:{ rhythm:'straight', range:1, riff:'menace', oct:-12 }, chords:{ style:'stab', m:'0030020030020030', n:[1,2], prog:'menace', rate:1, oct:-12 },
    parts:{ lead:'new', chords:'new', fx:'new' } },
  // электропанк (в духе Locked Club; замер трёх треков: 123–145 BPM, прямой кик на четверти, бас вместе с киком —
  // четвертями, парами 16-х или катящимися 16-ми, фригийская полутоновая краска, низ громкий, верх тёмный)
  { id:'electropunk', name:'Electro Punk', bpm:[122,146], swing:[0,0], drive:8, grit:2.2, legacy:'dark',
    scales:{ dark:['phrygian'], mid:['phrygian','phrygian','harmonic'], bright:['phrygian','minor'] },
    kit:{ kick:['kick_punk','kick_fuzz','kick_tight','distkick','kick909'], snare:['sn_punk','cl_punk','sn_trash','sn_gated','cl_dirty2','snare909'], hat:['hat_fuzz','hat_trash','hat909','tick'], ohat:['ohat_trash','ohat909'], perc:['perc_clang','metal','indhit','rim707'] },
    snd:{ bass:['bass_punk','bass_roll','bass_fuzz','bass_ebm2','buzz','ebm'], lead:['lead_grind','lead_darksq','lead_fuzz','lead_buzzsaw','darksaw','acid'], chords:['stab_power','diststab'], fx:['noise_burst','impact','vox_shout'] },
    kick:L(GK4, '0000000000000001', [0,1]), snare:L([GBB, '......x.....x...'], '0000000000000012', [0,1]),
    hat:L(['..x...x...x...x.', 'x.x.x.x.x.x.x.x.'], '1111111111111111', [0,8]), ohat:L(GOFF), perc:L(['......x.......x.', '...x.......x....'], '1111111111111111', [0,2]),
    bass:L(['xx..xx..xx..xx..', 'xxxxxxxxxxxxxxxx', 'x...x...x...x...', 'x.xxx.xxx.xxx.xx'], '0000000000000000', [0,0], { kick:'follow', notes:'seq' }),
    lead:{ rhythm:'drive', range:1, riff:'hammer', oct:-12 }, chords:{ style:'stab', m:'0030300303003030', n:[1,3], prog:'punk', rate:1, oct:-12 },
    parts:{ lead:'new', chords:'new', fx:'new' } },

  { id:'breaks', name:'Breakbeat', bpm:[128,138], swing:[0,0.08], drive:4, grit:1, legacy:'electro',
    scales:{ dark:['minor','phrygian'], mid:['minor','dorian'], bright:['dorian'] },
    kit:{ kick:['kick909','punchkick','kick808','kick'], snare:['crispsnare','snare909','snare','bigclap'], hat:['hat909','hat','hat808'], ohat:['ohat909','ride'], perc:['tom909','conga','cowbell','tamb'] },
    snd:{ bass:['reese','fmbass','sawbass','sub','moog'], lead:['hoover','pluck','blip','sawlead','vox'], chords:['ravestab','stab','chord','polysynth'], fx:['sweepup','crash','impact','zap'] },
    kick:L(['x.........x.....', 'x......x..x.....', 'x.x.......x.....', 'x.........xx....'], '0010001001100010', [0,2]), snare:L(GBB, '0000000101010013', [0,3]),
    hat:L(['x.x.x.x.x.x.x.x.', GOFF], '1111111111111111', [0,8]), ohat:L(['......x.......x.', '..x.......x.....']), perc:L(['..x.......x..x..', '...x.....x...x..'], '1111111111111111', [0,2]),
    bass:L(['x.........x.....', 'x..x......x..x..', 'x.....x...x.....'], '1111111111111111', [0,3], { kick:'follow', notes:'line' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0030020030020030', n:[1,3], prog:'static', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },

  { id:'dnb', name:'Drum & Bass', bpm:[170,176], swing:[0,0], drive:4, grit:1, legacy:'electro',
    scales:{ dark:['minor','phrygian'], mid:['minor','dorian'], bright:['dorian','major'] },
    kit:{ kick:['punchkick','kick909','kick','clickkick'], snare:['crispsnare','snare909','snare','steel'], hat:['hat909','hat','crisphat'], ohat:['ride','ohat909'], perc:['shaker','tamb','rim','click'] },
    snd:{ bass:['reese','sub','sawbass','growl','fmbass'], lead:['pluck','bell','sinelead','sawlead','vox'], chords:['airpad','warmpad','glasspad','strings','epiano'], fx:['sweepup','crash','impact','sweepdown'] },
    kick:L(['x.........x.....', 'x.........x..x..', 'x.x.......x.....'], '0010000000100100', [0,1]), snare:L(GBB, '0000000201010013', [0,3]),
    hat:L(['x.x.x.x.x.x.x.x.', GOFF], '1111111111111111', [0,8]), ohat:L(['x...x...x...x...', '......x.......x.']), perc:L(['x.x.x.x.x.x.x.x.', GOFF], '1111111111111111', [0,4]),
    bass:L(['x...............', 'x.........x.....', 'x.....x...x.....'], '1010001010100010', [0,2], { kick:'follow', notes:'root' }),
    lead:{ rhythm:'straight', range:2 }, chords:{ style:'pad', prog:'emotional', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },

  { id:'dubstep', name:'Dubstep', bpm:[138,142], swing:[0,0.05], drive:6, grit:2, legacy:'dark',
    scales:{ dark:['phrygian','minor'], mid:['minor'], bright:['minor','dorian'] },
    kit:{ kick:['punchkick','kick','hardkick','distkick'], snare:['bigclap','crispsnare','snare','steel'], hat:['hat','hat909','tick'], ohat:['ohat909','ride'], perc:['metal','tom','indhit','click'] },
    snd:{ bass:['wobble','growl','reese','sub','buzz'], lead:['siren','hoover','sawlead','vox'], chords:['pad','choir','strings','diststab'], fx:['impact','boom','sweepup','laser'] },
    kick:L(['x...............', 'x.........x.....', 'x......x..x.....', 'x.........xx....'], '0000000100110000', [0,1]), snare:L('........x.......', '0000000000000010', [0,1]),
    hat:L([GOFF, 'x.x.x.x.x.x.x.x.'], '1111111111111111', [0,6]), ohat:L('......x.......x.'), perc:L(['......x.......x.', '...x......x.....'], '1111111111111111', [0,2]),
    bass:L(['x..x..x...x.....', 'x.....x...x..x..', 'x.x...x.x...x...', 'x..x....x..x.x..'], '2222222222222222', [0,3], { kick:'free', notes:'root', rat:true }),
    lead:{ rhythm:'straight', range:1 }, chords:{ style:'pad', prog:'dark', rate:1 },
    parts:{ lead:'off', chords:'new', fx:'new' } },

  { id:'ukg', name:'UK Garage', bpm:[130,134], swing:[0.15,0.28], drive:3, grit:0.7, legacy:'house',
    scales:{ dark:['minor','dorian'], mid:['dorian','minor'], bright:['major','dorian'] },
    kit:{ kick:['kick909','punchkick','kick808'], snare:['clap','snare909','rim','snap'], hat:['hat909','shaker','hat707'], ohat:['ohat909','ohat808'], perc:['rim','tamb','click','bongo'] },
    snd:{ bass:['bass808','sub','moog','fmbass','offbass'], lead:['vox','bell','rhodes','piano','sqlead'], chords:['organ','epiano','deepchord','chord','housepiano'], fx:['sweepup','crash','zap'] },
    kick:L(['x.........x.....', 'x......x..x.....', 'x.........x..x..'], '0000000100100100', [0,1]), snare:L(GBB, '0000000100000101', [0,2]),
    hat:L([GOFF, 'x.xxx.xxx.xxx.xx'], '1313131313131313', [0,8]), ohat:L(GOFF), perc:L(['...x.......x....', '..x..x....x..x..'], '1111111111111111', [0,2]),
    bass:L(['x.........x..x..', 'x..x......x.....', 'x.....x...x..x..'], '1111111111111111', [0,3], { kick:'follow', notes:'line' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0030020300200302', n:[1,4], prog:'deep', rate:2 },
    parts:{ lead:'off', chords:'new', fx:'off' } },

  { id:'trap', name:'Trap / Bass', bpm:[136,150], swing:[0,0.06], drive:5, grit:1.6, legacy:'dark',
    scales:{ dark:['phrygian','harmonic'], mid:['minor','harmonic'], bright:['minor','dorian'] },
    kit:{ kick:['kick808','punchkick','kick'], snare:['clap808','snare808','bigclap','snap'], hat:['hat808','hat606','tick'], ohat:['ohat808'], perc:['rim','cowbell','click','tom'] },
    snd:{ bass:['bass808','sub','growl'], lead:['bell','pluck','vox','glock','sinelead'], chords:['choir','strings','pad','airpad'], fx:['impact','laser','sweepup'] },
    kick:L(['x......x..x.....', 'x.........x..x..', 'x.....x...x.....'], '0010001001100100', [0,2]), snare:L('........x.......', '0000000000000001', [0,1]),
    hat:L(['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx'], '1111111111111111', [0,6], { rat:[2,3,4] }), ohat:L('..............x.'), perc:L(['...x.......x....', '......x.......x.'], '1111111111111111', [0,2]),
    bass:L(['x......x..x.....'], '0000000000000000', [0,2], { kick:'copy', notes:'root' }),
    lead:{ rhythm:'straight', range:1 }, chords:{ style:'pad', prog:'dark', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },

  { id:'synthwave', name:'Synthwave', bpm:[96,116], swing:[0,0], drive:2, grit:0.5, legacy:'electro',
    scales:{ dark:['minor','dorian'], mid:['minor','major'], bright:['major','lydian','mixolydian'] },
    kit:{ kick:['kick707','kick909','punchkick','kick606'], snare:['roomclap','bigclap','snare707','snare'], hat:['hat707','hat909','hat606'], ohat:['ohat808','ohat909'], perc:['tom','tamb','cowbell'] },
    snd:{ bass:['sawbass','sqbass','moog','mono'], lead:['sawlead','sqlead','pwm','synclead','brass','bell'], chords:['polysynth','junopad','strings','warmpad'], fx:['sweepup','crash','impact'] },
    kick:L(['x.......x.......', GK4], '0000000000100000', [0,1]), snare:L(GBB),
    hat:L(['x.x.x.x.x.x.x.x.', GOFF], '1111111111111111', [0,8]), ohat:L('......x.......x.'), perc:L(['............x.x.', '..........x.x.x.'], '0000000000001111', [0,2]),
    bass:L(['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx'], '0000000000000000', [0,0], { kick:'free', notes:'octave' }),
    lead:{ rhythm:'straight', range:2 }, chords:{ style:'pad', prog:'pop', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },

  { id:'idm', name:'IDM / Glitch', bpm:[100,130], swing:[0,0.15], drive:3, grit:1, legacy:'minimal',
    scales:{ dark:['phrygian','minor'], mid:['dorian','lydian'], bright:['lydian','major'] },
    kit:{ kick:['clickkick','lofikick','kick707','kick808'], snare:['lofisnare','snap','rim','steel'], hat:['tick','crisphat','pedalhat'], ohat:['ride'], perc:['click','wood','metal','clave','triangle'] },
    snd:{ bass:['sub','fmbass','sqbass','mono'], lead:['kalimba','glock','bell','blip','marimba'], chords:['glasspad','airpad','epiano','deepchord'], fx:['glitch','zap','laser','crackle'] },
    kick:L(['x.....x...x.....', 'x..x....x.....x.', 'x.......x..x....'], '1212121212121212', [0,3]), snare:L([GBB, '.....x.....x....'], '1111111111111111', [0,4]),
    hat:L(['x..x.x..x..x.x..', 'x.x..x.x..x.x..x'], '2222222222222222', [0,8], { rat:[2,3,4] }), ohat:L('......x.......x.'), perc:L(['..x..x.x..x.x...', '.x...x...x..x..x'], '2222222222222222', [1,5]),
    bass:L(['x.....x...x.....', 'x..x......x..x..', '..x...x..x...x..'], '1111111111111111', [0,3], { kick:'free', notes:'line' }),
    lead:{ rhythm:'synco', range:2 }, chords:{ style:'pad', prog:'dreamy', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'new' } },

  { id:'ambient', name:'Ambient Techno', bpm:[110,122], swing:[0,0.05], drive:1, grit:0.2, legacy:'minimal',
    scales:{ dark:['minor'], mid:['dorian','major'], bright:['lydian','major'] },
    kit:{ kick:['deepkick','lofikick','kick'], snare:['rim','snap'], hat:['shaker','crisphat','tick'], ohat:['ride'], perc:['click','triangle','wood'] },
    snd:{ bass:['sub','dubbass'], lead:['bell','glock','kalimba','sinelead'], chords:['airpad','glasspad','warmpad','strings','choir'], fx:['crackle','sweepup'] },
    kick:L([GK4, 'x.......x.......']), snare:L(['.......x.......x', '............x...'], '0000000100000001', [0,1]),
    hat:L(GOFF, '1111111111111111', [0,6]), ohat:L(GOFF), perc:L('...x.......x....', '1111111111111111', [0,3]),
    bass:L(['x.......x.......', 'x.........x.....'], '1010101010101010', [0,1], { kick:'free', notes:'root' }),
    lead:{ rhythm:'straight', range:2 }, chords:{ style:'pad', prog:'dreamy', rate:1 },
    parts:{ lead:'new', chords:'new', fx:'off' } },
];
// хэты: обычные для жанра рисунки по плотности (0/1/2), сложность добавляет 0–2 удара по карте
const HATS = {
  techno: { 0:[GOFF], 1:['x.x.x.x.x.x.x.x.', '..xx..xx..xx..xx', GOFF], 2:['xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx'] },
  hard:   { 0:[GOFF], 1:[GOFF, 'x.x.x.x.x.x.x.x.'], 2:['xxxxxxxxxxxxxxxx'] },
  house:  { 0:[GOFF], 1:['x.xxx.xxx.xxx.xx', '..x...x...x...x.', '.xxx.xxx.xxx.xxx'], 2:['xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx'] },
  ukg:    { 0:[GOFF], 1:['x.xxx.xxx.xxx.xx', '..xx..xx..xx..xx'], 2:['xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx'] },
  minimal:{ 0:[GOFF], 1:['x.x.x.x.x.x.x.x.', '..xx..xx..xx..xx', 'x.xxx.xxx.xxx.xx'], 2:['x.xxx.xxx.xxx.xx', 'xxxxxxxxxxxxxxxx'] },
  dub:    { 0:[GOFF], 1:[GOFF, '..xx..xx..xx..xx'], 2:['x.xxx.xxx.xxx.xx'] },
  broken: { 0:['x.x.x.x.x.x.x.x.'], 1:['x.x.x.x.x.x.x.x.', 'x.xxx.x.x.xxx.x.'], 2:['xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx'] },
  half:   { 0:['x.x.x.x.x.x.x.x.'], 1:['x.x.x.x.x.x.x.x.', 'x.xxx.x.x.xxx.x.'], 2:['xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xx'] },
  idm:    { 0:['x..x.x..x..x.x..'], 1:['x.x..x.x..x.x..x', 'xx.x.xx.x.xx.x.x'], 2:['xxxxxxxxxxxxxxxx', 'xx.xxx.xx.xxx.xx'] },
};
const HAT_STYLE = { techno:'techno', hardtechno:'hard', melodic:'minimal', deephouse:'house', house:'house', techhouse:'house', proghouse:'techno', trance:'techno',
  acid:'techno', minimal:'minimal', dubtechno:'dub', electro:'broken', ebm:'techno', electropunk:'techno', darktechno:'techno', breaks:'broken', dnb:'broken', dubstep:'half', ukg:'ukg', trap:'half',
  synthwave:'broken', idm:'idm', ambient:'minimal' };
for (const g of GENRES){ g.hat.h = HATS[HAT_STYLE[g.id]] || HATS.techno; g.hat.n = [0, 2]; }
const GENM = Object.fromEntries(GENRES.map(g => [g.id, g]));
const PARTS = ['drums','bass','lead','chords','fx'];
const PART_NAMES = { drums:'Drums', bass:'Bass', lead:'Lead', chords:'Chords', fx:'FX' };
const DRUM_ROLES = ['kick','snare','hat','ohat','perc'];
// аккордовые звуки (сами играют аккорд) и пэды
const CHORDY = ['stab','diststab','chord','organ','polysynth','ravestab','dubchord','deepchord','epiano','housepiano','strings','choir','pad','warmpad','junopad','glasspad','airpad'];
const PADLIKE = /pad|strings|choir/;

// ---------- настройки GEN (запоминаются на устройстве) ----------
const GEN_DEF = () => ({ genre:'techno', bpm:0, key:-1, scale:'auto', energy:1, mood:1, cx:1, make:'scene', tab:'track', part:'drums', scMain:-1, scTarget:-1, scType:'break', scVar:1, scEnergy:1, scChange:1, touched:{},
  parts:{ drums:{ mode:'new', sound:'auto', dens:1, cx:1, swing:1, fills:1, rolls:1 }, bass:{ mode:'new', sound:'auto', dens:1, cx:1, oct:1 },
          lead:{ mode:'new', sound:'auto', dens:1, cx:1, rhythm:'auto', range:'auto' }, chords:{ mode:'new', sound:'auto', dens:1, cx:1, rhythm:'auto', rate:'auto' },
          fx:{ mode:'off', sound:'auto', dens:0, cx:1 } } });
let GEN = GEN_DEF();
try { const s = JSON.parse(localStorage.getItem('lr_gen') || 'null'); if (s && GENM[s.genre] && s.parts){ const d = GEN_DEF(); GEN = Object.assign(d, s); for (const p of PARTS) GEN.parts[p] = Object.assign(d.parts[p], s.parts[p] || {}); } } catch (e) {}
const genSave = () => { try { localStorage.setItem('lr_gen', JSON.stringify(GEN)); } catch (e) {} };
let genHarm = null;   // гармония последней генерации: корни аккордов (ступени) по полутактам

// ---------- мелкие помощники ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const lerp3 = (n, k) => { const x = n[0] + (n[1] - n[0]) * k / 2, f = Math.floor(x); return f + (Math.random() < x - f ? 1 : 0); };   // knob 0/1/2 → между мин и макс
const W9 = (m, i) => +(m[i % 16] || 0);
const strPat = s => [...s].map(c => c === 'x');
const hits = p => p.reduce((a, x) => a + (x ? 1 : 0), 0);
const ham = (a, b) => { let d = 0; for (let i=0;i<a.length;i++) if (!!a[i] !== !!b[i]) d++; return d; };
function weightedPick(ws){ const s = ws.reduce((a, w) => a + w, 0); if (s <= 0) return -1; let r = Math.random() * s; for (let i=0;i<ws.length;i++){ r -= ws[i]; if (r < 0) return i; } return ws.length - 1; }
// лучший из кандидатов (чуть случайно среди трёх лучших — чтобы не было одного и того же)
function best(cands, score){
  const sc = cands.map(c => [c, score(c)]).sort((a, b) => b[1] - a[1]);
  const top = sc.slice(0, Math.min(3, sc.length)), w = top.map((x, k) => [1, 0.45, 0.2][k]);
  return top[weightedPick(w)][0];
}
const scaleOf = () => SCALES[P.scale] || SCALES.minor;
const degSemi = d => { const sc = scaleOf(), k = ((d % 7) + 7) % 7; return sc[k] + 12 * Math.floor(d / 7); };

// ---------- роли и партии звуков ----------
function partOf(t){
  if (t.part) return t.part;
  const c = (LIBM[t.v] || {}).cat;
  if (c === 'FX' || t.v === 'crash') return 'fx';
  if (c === 'Bass') return 'bass';
  if (CHORDY.includes(t.v) || (SND_META[t.v] || {}).chord) return 'chords';
  if (MELODIC.includes(t.v) || c === 'Vocals') return 'lead';
  return 'drums';
}
const drumRole = v => { const r = roleOfGen(v); return DRUM_ROLES.includes(r) ? r : 'perc'; };
const partTracks = p => tracks.filter(t => partOf(t) === p);
// классика жанра (то, что прописано в GENRES) — у неё выше приоритет при автоподборе, чем у звуков, добавленных по тегам
for (const G of GENRES) G.core = new Set([...Object.values(G.kit).flat(), ...Object.values(G.snd).flat()]);
// новые звуки библиотеки попадают в жанры по своим тегам (в конец списков: жанровая классика — первой)
for (const [id, m] of Object.entries(SND_META)) for (const gid of m.g){
  const G = GENM[gid]; if (!G) continue;
  const part = partOf({ v:id });
  if (part === 'drums'){ const r = drumRole(id); if (G.kit[r] && !G.kit[r].includes(id)) G.kit[r].push(id); }
  else if (G.snd[part] && !G.snd[part].includes(id)) G.snd[part].push(id);
}
// звуки для партии: сначала жанровые, потом остальные того же типа
function soundList(p, G){
  if (p === 'drums') return kitList(G).map((k, i) => 'kit' + i);
  const own = G.snd[p] || [];
  const all = LIB.map(x => x.id).filter(v => partOf({ v }) === p && SYNTH[v]);
  return own.filter(v => SYNTH[v]).concat(all.filter(v => !own.includes(v)));
}
// наборы ударных: kick/snare/hat/… по очереди из жанровых списков
function kitList(G){
  // в тёмных жанрах в готовые наборы «настроенный» металл не попадает
  const L = r => { const l = G.kit[r].filter(v => SYNTH[v]); const c = DARK_G.has(G.id) ? l.filter(v => !RINGING.test(v)) : l; return c.length ? c : l; };
  const n = Math.max(...DRUM_ROLES.map(r => L(r).length)), out = [];
  for (let k=0;k<n;k++) out.push(Object.fromEntries(DRUM_ROLES.map(r => [r, L(r)[k % L(r).length]])));
  return out;
}
const kitName = kit => label(kit.kick) + ' · ' + label(kit.snare);

// ============================================================
//  РИТМ: одна дорожка (1 такт) по жанровой карте
// ============================================================
// knob — 0/1/2 (плотность или сложность), avoid — шаги, где удар нежелателен, boost — где желателен
function laneBar(spec, knob, opt = {}){
  const anchors = opt.anchor || pickR(knob === 0 && spec.a.length > 1 && Math.random() < 0.5 ? [spec.a[0]] : spec.a);
  const p = strPat(anchors);
  if (opt.avoid) for (let i=0;i<16;i++) if (opt.avoid[i] && opt.strictAvoid) p[i] = false;
  let n = lerp3(spec.n, knob) + (spec.n[1] > 2 ? rint(-1, 1) : 0);
  n = Math.max(0, n);
  const ws = [...Array(16).keys()].map(i => {
    if (p[i]) return 0;
    let w = W9(spec.m, i);
    if (opt.avoid && opt.avoid[i]) w *= opt.strictAvoid ? 0 : 0.15;
    if (opt.boost && opt.boost[i]) w = w * 2 + 2;
    return w;
  });
  let fit = 0;
  for (let k=0;k<n;k++){ const i = weightedPick(ws); if (i < 0) break; p[i] = true; fit += ws[i]; ws[i] = 0; }
  return { p, fit, anchors };
}
// два такта: второй — копия первого с небольшой разницей (на сложности выше)
function twoBars(bar1, knob, spec, minKnob = 1){
  const p = bar1.concat(bar1);
  if (knob >= minKnob && spec && Math.random() < 0.6){
    const extra = [...Array(16).keys()].filter(i => i >= 12 && !bar1[i] && W9(spec.m, i) > 0);   // подхват перед следующим «раз»
    if (extra.length){ const i = pickR(extra); p[16 + i] = true; }
  }
  return p;
}

// ============================================================
//  ГАРМОНИЯ
// ============================================================
function makeHarm(G, mood, rate){
  const fam = PROGS[G.chords.prog] || PROGS.static, mi = ['dark','mid','bright'][mood];
  let fams = fam;
  if (mi === 'dark' && !['dark','punk','menace'].includes(G.chords.prog) && Math.random() < 0.3) fams = PROGS.dark;   // у панка своя тёмная гармония — без мажорных VI/VII
  const p = rate === 2 ? pickR(fams.p4).slice() : (x => [x[0], x[0], x[1], x[1]])(pickR(fams.p2));
  // уменьшённые и увеличенные аккорды (квинта не чистая) меняем на соседние «чистые» ступени
  const sc = scaleOf(), pure = d => ((sc[(d + 4) % 7] + (d + 4 >= 7 ? 12 : 0)) - sc[d]) === 7;
  if (G.chords.prog === 'punk') return p.map(d => pure(d) ? d : 0);
  // мажорные аккорды (III, VI, VII натурального минора) звучат «эпично-радостно»: их доля ограничена,
  // лишние заменяются тёмными ступенями (III→i, VI→iv, VII→v); тёмные авторские прогрессии не трогаем
  if (G.chords.prog !== 'menace'){
    const isMaj = d => { const k = ((d % 7) + 7) % 7; return (sc[(k + 2) % 7] + (k + 2 >= 7 ? 12 : 0)) - sc[k] === 4; };
    const cap = mood === 2 ? 0.6 : (mood === 0 || DARK_G.has(G.id)) ? 0.2 : 0.35, swap = { 2: 0, 5: 3, 6: 4, 3: 0, 4: 0, 1: 0 };
    let maj = p.filter(isMaj).length;
    const order = [...p.keys()].sort(() => Math.random() - 0.5);
    for (const k of order){ if (maj / p.length <= cap) break; if (isMaj(p[k])){ const nd = swap[((p[k] % 7) + 7) % 7] ?? 0; if (!isMaj(nd) && pure(nd)){ p[k] = nd; maj--; } } }
  }   // ♭II нет в ладу (не фригийский) — остаёмся на тонике, а не уходим в мажорную VI
  return p.map(d => pure(d) ? d : (mood === 2 ? [5, 3, 0, 4, 6] : [3, 0, 4, 5, 6]).find(x => x !== d && pure(x)) ?? 0);   // замена «нечистого» аккорда — сперва минорные ступени
}
// гармонию берём из уже стоящих аккордов (если аккорды «оставить»)
function harmFromTracks(){
  const ch = partTracks('chords').concat(partTracks('bass'));
  for (const t of ch){
    const out = [];
    for (let s=0;s<4;s++){ let d = null; for (let i=s*8;i<s*8+8 && i<STEPS;i++) if (t.pat[i]){ d = t.notes[i]; break; } out.push(d); }
    if (out.some(x => x !== null)){
      const sc = scaleOf(); let last = 0;
      return out.map(n => { if (n === null) return last; const pc = ((n % 12) + 12) % 12; const k = sc.indexOf(pc); last = k < 0 ? 0 : k; return last; });
    }
  }
  return null;
}
const slotOf = i => Math.floor((i % 32) / 8);

// ============================================================
//  ПАРТИИ
// ============================================================
// ---------- ударные ----------
function genDrums(G, S, bars, cur){
  const out = {}, dens = S.dens, cx = S.cx, roles = DRUM_ROLES.filter(r => r !== 'ohat' && r !== 'perc');
  const optional = ['ohat','perc'].filter(r => G[r] && G[r].a);
  if (dens >= 1 && optional.length) roles.push(...(dens >= 2 ? optional : [pickR(optional)]));
  if (cur) for (const r of Object.keys(cur)) if (!roles.includes(r) && DRUM_ROLES.includes(r)) roles.push(r);   // уже стоящие звуки тоже получают рисунок
  // кик
  const kick = best([...Array(10)].map(() => laneBar(G.kick, cx)), c => c.fit + (cur && cur.kick ? Math.min(3, ham(c.p, cur.kick.slice(0, 16))) * 0.6 : 0));
  out.kick = twoBars(kick.p, cx, G.kick, 2);
  // снейр/клэп: призрачные удары не на кике
  const snare = best([...Array(10)].map(() => laneBar(G.snare, cx, { avoid: kick.p })), c => c.fit - hits(c.p.map((x, i) => x && kick.p[i])) * 3 + (cur && cur.snare ? Math.min(3, ham(c.p, cur.snare.slice(0, 16))) * 0.5 : 0));
  out.snare = twoBars(snare.p, cx, G.snare);
  // хэты: плотность — число 16-х, сложность — дробь и «шанс»
  // с открытым хэтом на офбитах закрытый играет между ними (иначе после «глушения» от него ничего не останется)
  const withOpen = roles.includes('ohat'), offOnly = x => [...x].filter((c, i) => c === 'x' && i % 4 !== 2).length >= 4;
  let hatPats = G.hat.h[dens];
  if (withOpen){ hatPats = hatPats.filter(offOnly); if (!hatPats.length) hatPats = dens === 2 ? ['xxxxxxxxxxxxxxxx'] : ['x.x.x.x.x.x.x.x.']; }
  const hat = best([...Array(10)].map(() => laneBar(G.hat, cx, { anchor: pickR(hatPats) })), c => c.fit + (cur && cur.hat ? Math.min(4, ham(c.p, cur.hat.slice(0, 16))) * 0.5 : 0));
  out.hat = twoBars(hat.p, cx, G.hat);
  if (roles.includes('ohat')) out.ohat = twoBars(laneBar(G.ohat, 0).p, 0);
  if (roles.includes('perc')){
    const ks = snare.p.map((x, i) => x || kick.p[i]);   // перкуссия не бьёт вместе с киком и снейром
    // перкуссия — по меньшему из плотности и сложности: не забивает ритм
    const perc = best([...Array(10)].map(() => laneBar(G.perc, Math.min(dens, cx), { avoid: ks })), c => c.fit - hits(c.p.map((x, i) => x && ks[i])) * 2 + (cur && cur.perc ? Math.min(3, ham(c.p, cur.perc.slice(0, 16))) * 0.5 : 0));
    out.perc = twoBars(perc.p, cx, G.perc);
  }
  // открытый хэт глушит закрытый на своих долях (если у закрытого что-то остаётся)
  if (out.ohat){ const left = out.hat.filter((x, i) => x && !out.ohat[i]).length; if (left >= 3) out.hat = out.hat.map((x, i) => x && !out.ohat[i]); else out.ohat = out.ohat.map((x, i) => x && !out.hat[i]); }
  // сила ударов, дробь и шанс
  const res = {};
  for (const r of Object.keys(out)){
    const p = out[r].slice(0, 16 * bars), n = p.length;
    const vel = Array(n).fill(1), rat = Array(n).fill(1), prob = Array(n).fill(1);
    const anc = strPat(r === 'kick' ? kick.anchors : r === 'snare' ? snare.anchors : r === 'hat' ? hat.anchors : '................');
    for (let i=0;i<n;i++) if (p[i]){
      if (r === 'snare') vel[i] = anc[i % 16] ? 1 : rnd(0.35, 0.55);
      else if (r === 'hat') vel[i] = i % 4 === 2 ? 1 : i % 4 === 0 ? 0.75 : rnd(0.5, 0.62);
      else if (r === 'kick') vel[i] = anc[i % 16] ? 1 : 0.8;
      else if (r === 'perc') vel[i] = i % 4 === 0 ? 0.9 : rnd(0.62, 0.8);
      else vel[i] = 0.9;
    }
    // дробь (рэтчет) — приём, а не фон: Rare — максимум одна, только как подхват в конце фразы на слабой доле;
    // Many — несколько (трэп-роллы). На средней сложности — без дробей.
    const rolls = S.rolls ?? 1;
    if (r === 'hat' && rolls > 0){
      const many = (G.hat.rat || [2]).length > 1, rats = G.hat.rat || [2];
      const tail = [n - 1, n - 3, n - 5].filter(i => p[i]);                                   // 16-е перед «раз»
      const weak = [...Array(n).keys()].filter(i => p[i] && i % 2 === 1 && i % 16 >= 8);       // слабые 16-е второй половины такта
      if (rolls === 1){ if (cx === 2 && tail.length && Math.random() < (many ? 0.8 : 0.45)) rat[tail[0]] = 2; }
      else if (cx >= 1){ const nr = rint(1, many ? 3 : 2); for (let k=0;k<nr && weak.length;k++){ const i = weak.splice(Math.random()*weak.length|0, 1)[0]; rat[i] = many ? pickR(rats) : 2; } }
    }
    if (r === 'hat' && cx === 2){
      const on = [...Array(n).keys()].filter(i => p[i] && i % 4 !== 2 && rat[i] === 1);
      for (let k=0;k<2 && on.length;k++){ const i = on.splice(Math.random()*on.length|0, 1)[0]; prob[i] = 0.7; }
    }
    res[r] = { p, vel, rat, prob, hum: r === 'hat' || r === 'ohat' || r === 'perc' };
  }
  // сбивка в конце 2-го такта
  if (bars === 2 && S.fills){
    const kinds = S.fills > 1 ? ['roll','roll','stutter'].concat(res.perc ? ['toms'] : []) : ['drop','ghost','ghost','pickup'], kind = pickR(kinds), e = 28;
    if (kind === 'roll'){ const s = res.snare; [e, e+1, e+2, e+3].forEach((i, k) => { s.p[i] = true; s.vel[i] = 0.42 + k * 0.17; s.rat[i] = k === 3 && (S.rolls ?? 1) === 2 ? 2 : 1; }); }
    else if (kind === 'toms'){ const s = res.perc; [e, e+1, e+2, e+3].forEach((i, k) => { s.p[i] = k !== 1 || cx >= 1; s.vel[i] = 0.6 + k * 0.12; }); }
    else if (kind === 'stutter'){ const s = res.kick; s.p[30] = true; s.vel[30] = 0.8; s.p[31] = true; s.vel[31] = 0.9; }
    else if (kind === 'drop'){ for (const r of ['hat','ohat','perc']) if (res[r]) for (const i of [30, 31]) res[r].p[i] = false; }
    else if (kind === 'ghost'){ const s = res.snare; for (const [i, v] of [[29, 0.38], [31, 0.5]]) if (!res.kick.p[i]){ s.p[i] = true; s.vel[i] = v; } }
    else if (kind === 'pickup'){ const k = res.kick; if (!k.p[30]){ k.p[30] = true; k.vel[30] = 0.75; } }
  }
  return res;
}

// ---------- бас ----------
function genBass(G, S, bars, harm, kickP, curP){
  const spec = G.bass, kickBar = (kickP || []).slice(0, 16);
  const mk = () => {
    if (spec.kick === 'copy'){ const p = kickBar.length ? kickBar.slice() : strPat(spec.a[0]); const ws = p.map((x, i) => x ? 0 : W9('0010010010010010', i)); for (let k=0;k<lerp3(spec.n, S.dens);k++){ const i = weightedPick(ws); if (i < 0) break; p[i] = true; ws[i] = 0; } return { p, fit:1 }; }
    return laneBar(spec, S.dens, { avoid: spec.kick === 'avoid' ? kickBar : null, strictAvoid: spec.kick === 'avoid', boost: spec.kick === 'follow' ? kickBar : null });
  };
  const bar = best([...Array(12)].map(mk), c => c.fit - (spec.kick === 'avoid' ? hits(c.p.map((x, i) => x && kickBar[i])) * 4 : 0)
    + (spec.kick === 'follow' ? hits(c.p.map((x, i) => x && kickBar[i])) * 0.8 : 0) + (curP ? Math.min(3, ham(c.p, curP.slice(0, 16))) * 0.5 : 0));
  const p = twoBars(bar.p, S.cx, spec).slice(0, 16 * bars), n = p.length;
  const notes = Array(n).fill(0), vel = Array(n).fill(1), rat = Array(n).fill(1);
  const oct = (S.oct - 1) * 12;
  const on = [...Array(n).keys()].filter(i => p[i]);
  const rootSemi = d => { let s = degSemi(d); if (s > 6) s -= 12; return s; };
  on.forEach((i, k) => {
    const r = rootSemi(harm[slotOf(i)]); let nn = r;
    const weak = i % 4 !== 0, next = on[k + 1], nextSlotChange = next !== undefined && slotOf(next) !== slotOf(i);
    if (spec.notes === 'octave'){ nn = r + (k % 2 ? 12 : 0) * (S.cx >= 1 ? 1 : 0); }
    else if (spec.notes === 'chroma'){
      // «сжатие» вокруг тоники: полутон вверх и вниз, октава, редкий тритон — на слабых долях; сильные — тоника
      if (weak && Math.random() < [0.15, 0.3, 0.45][S.cx]){ const pool = [[1, 3], [-1, 3], [12, 2], [6, 0.6], [7, 1]]; nn = r + pool[weightedPick(pool.map(x => x[1]))][0]; }
    }
    else if (spec.notes === 'seq'){ const seq = [0, 0, 1, 0, 0, 0, 3, 1]; nn = r + (S.cx >= 1 ? degSemi(seq[k % 8] + harm[slotOf(i)]) - degSemi(harm[slotOf(i)]) : 0); }
    else if (S.cx >= 1 && weak){
      const roll = Math.random();
      if (roll < (S.cx === 2 ? 0.25 : 0.12)) nn = r + 12;
      else if (roll < (S.cx === 2 ? 0.45 : 0.24) && spec.notes !== 'root') nn = r + 7;
      else if (S.cx === 2 && nextSlotChange && spec.notes === 'line'){ const tgt = rootSemi(harm[slotOf(next)]); nn = tgt + (tgt > r ? -2 : 2); nn = snapScale(nn); }
    }
    notes[i] = nn + oct;
    vel[i] = i % 4 === 0 ? 1 : i % 4 === 2 ? 0.95 : 0.8;
    if (spec.rat && S.cx === 2 && (GEN.parts.drums.rolls ?? 1) === 2 && weak && Math.random() < 0.15) rat[i] = 2;
  });
  return { p, notes, vel, rat };
}

// ---------- мелодия ----------
function leadRhythm(kind, dens, cx){
  if (kind === 'drive'){
    const p = Array(16).fill(false); for (let i=0;i<16;i+=2) p[i] = true;
    const rests = [2, 1, 0][dens] + (cx === 0 ? 1 : 0);
    for (let k=0;k<rests;k++) p[pickR([2, 6, 10, 14])] = false;            // паузы — на слабых восьмых
    if (dens === 2 || cx === 2) for (let k=0;k<rint(1, 2);k++) p[pickR([7, 11, 15, 3])] = true;   // подхваты 16-ми
    return p;
  }
  if (kind === 'arp'){
    const n = [8, 12, 16][dens], p = Array(16).fill(false);
    if (n === 16) p.fill(true); else if (n === 8) for (let i=0;i<16;i+=2) p[i] = true;
    else for (let i=0;i<16;i++) p[i] = i % 4 !== 3;
    return p;
  }
  if (kind === 'acid'){
    const n = [8, 11, 14][dens], ws = '9474847494748474'.split('').map(Number), p = Array(16).fill(false); p[0] = true;
    for (let k=1;k<n;k++){ const i = weightedPick(ws.map((w, j) => p[j] ? 0 : w)); if (i < 0) break; p[i] = true; }
    return p;
  }
  const m = kind === 'straight' ? '9151715181517151' : '3264264362642646';
  const n = kind === 'straight' ? [3, 5, 8][dens] : [3, 5, 7][dens];
  const p = Array(16).fill(false); if (kind === 'straight' || Math.random() < 0.5) p[0] = true;
  const ws = m.split('').map(Number);
  while (hits(p) < n){ const i = weightedPick(ws.map((w, j) => p[j] ? 0 : w)); if (i < 0) break; p[i] = true; }
  return p;
}
function genLead(G, S, bars, harm, curP, avoidP, up = 0, bassP = null){
  const kind = S.rhythm !== 'auto' ? S.rhythm : G.lead.rhythm, range = S.range !== 'auto' ? +S.range : G.lead.range;
  const lo = [0, -2, -4][range - 1], hi = [7, 11, 16][range - 1];
  const steps = { 0:[[0, 0.3], [1, 0.5], [2, 0.2]], 1:[[0, 0.2], [1, 0.45], [2, 0.2], [3, 0.1], [4, 0.05]], 2:[[0, 0.1], [1, 0.35], [2, 0.25], [3, 0.15], [4, 0.1], [5, 0.05]] }[S.cx];
  const chordT = s => [harm[s], harm[s] + 2, harm[s] + 4];
  const clamp = d => { while (d > hi) d -= 7; while (d < lo) d += 7; return d; };
  const make = () => {
    const r1 = leadRhythm(kind, S.dens, S.cx);
    let p = r1.concat(r1);
    if (S.cx >= 1 && kind !== 'arp' && Math.random() < 0.5){ const i = 16 + pickR([10, 12, 13, 14, 15]); p[i] = !p[i]; }
    p = p.slice(0, 16 * bars);
    const n = p.length, deg = Array(n).fill(null), on = [...Array(n).keys()].filter(i => p[i]);
    if (kind === 'arp'){
      const dir = pickR(S.cx === 0 ? ['up','up','updown'] : ['up','down','updown','random']);
      on.forEach((i, k) => {
        const ct = chordT(slotOf(i)), seq = [];
        for (let o=0;o<range;o++) for (const c of ct) seq.push(c + 7 * o);
        const L2 = seq.length, idx = dir === 'up' ? k % L2 : dir === 'down' ? L2 - 1 - (k % L2) : dir === 'updown' ? (L2 > 1 ? [...Array(L2).keys()].concat([...Array(L2 - 2).keys()].map(x => L2 - 2 - x))[k % (2 * L2 - 2)] : 0) : Math.random() * L2 | 0;
        deg[i] = clamp(seq[idx]);
      });
    } else if (G.lead.riff && kind !== 'acid'){
      // тёмный рифф: тоника, ♭2, ♭3, кварта, квинта, ♭6, ♭7 снизу (ступени лада от корня аккорда), много повторов тоники;
      // мотив первого такта повторяется во втором — как гитарный рифф
      const pool = G.lead.riff === 'hammer' ? [[0, 9], [1, 3.5], [2, 2], [4, 1.2], [-1, 1]] : G.lead.riff === 'menace' ? [[0, 8], [-1, 3.5], [1, 2.5], [4, 1.5], [2, 1.2], [5, 0.8]] : [[0, 5], [1, 3], [2, 2], [4, 2], [5, 1.2], [-1, 0.8], [3, 0.8]];
      const first = on.filter(i => i < 16), motif = first.map((i, k) => k === 0 ? 0 : pool[weightedPick(pool.map(x => x[1]))][0]);
      on.forEach((i, k) => { deg[i] = clamp(harm[slotOf(i)] + motif[k % Math.max(1, motif.length)]); });
    } else if (kind === 'acid'){
      const pool = [0, 0, 0, 2, 3, 4, 6, 7, -1];
      on.forEach(i => { let d = harm[slotOf(i)] + pickR(pool); if (Math.random() < [0.12, 0.22, 0.32][S.cx]) d += 7; deg[i] = clamp(d); });
    } else {
      // мотив «вопрос — ответ»: первая половина такта — мотив, вторая — ответ, второй такт — повтор с концовкой на тонике
      const half = on.filter(i => i < 8);
      let d = pickR(chordT(slotOf(on[0] || 0))) ; d = clamp(d);
      const motif = [];
      for (let k=0;k<Math.max(1, half.length);k++){ motif.push(d); const st = steps[weightedPick(steps.map(x => x[1]))][0]; d = clamp(d + st * (Math.random() < 0.5 ? -1 : 1)); }
      on.forEach((i, k) => {
        const pos = i % 16, s = slotOf(i);
        let dd = motif[k % motif.length];
        if (pos >= 8){ dd = motif[k % motif.length] + (S.cx === 0 ? 0 : pickR([0, 0, 1, -1, 2])); }
        if (i % 4 === 0 && Math.random() < 0.7){ const ct = chordT(s); dd = ct.reduce((b, c) => Math.abs(clamp(c) - dd) < Math.abs(clamp(b) - dd) ? c : b, ct[0]); }
        deg[i] = clamp(dd);
      });
      const last = on[on.length - 1]; if (last !== undefined && bars === 2) deg[last] = clamp(harm[slotOf(last)] + pickR([0, 0, 2, 4]));
    }
    return { p, deg };
  };
  const score = c => {
    const on = [...c.p.keys()].filter(i => c.p[i]); if (!on.length) return -99;
    let s = 0, rep = 0;
    for (let k=1;k<on.length;k++){
      const a = degSemi(c.deg[on[k-1]]), b = degSemi(c.deg[on[k]]), j = Math.abs(b - a);
      if (j > 7 && kind !== 'arp' && kind !== 'acid') s -= S.cx === 2 ? 0.5 : 2;
      if (j > 0 && j <= 4) s += 0.5;
      rep = j === 0 ? rep + 1 : 0; if (rep >= 3 && S.cx >= 1 && kind !== 'acid') s -= 1;
    }
    for (const i of on) if (i % 4 === 0 && [harm[slotOf(i)], harm[slotOf(i)] + 2, harm[slotOf(i)] + 4].some(x => ((x - c.deg[i]) % 7 + 7) % 7 === 0)) s += 0.6;
    if (curP) s += Math.min(3, ham(c.p, curP)) * 0.3;
    if (avoidP && kind !== 'arp' && kind !== 'acid') s -= on.filter(i => avoidP[i]).length * 0.4;   // не бить туда же, где аккорды
    if (bassP && kind !== 'arp') s -= on.filter(i => bassP[i]).length * (kind === 'acid' ? 0.15 : 0.35);   // и туда же, где бас
    return s;
  };
  const c = best([...Array(16)].map(make), score), n = c.p.length;
  const notes = Array(n).fill(0), vel = Array(n).fill(1), rat = Array(n).fill(1);
  for (let i=0;i<n;i++) if (c.p[i]){
    notes[i] = degSemi(c.deg[i]) + up;
    vel[i] = kind === 'acid' ? (Math.random() < 0.35 ? 1 : 0.68) : i % 4 === 0 ? 1 : i % 2 ? 0.72 : 0.85;
  }
  return { p: c.p, notes, vel, rat, hum: true };
}

// ---------- аккорды ----------
function genChords(G, S, bars, harm, sound, curP, bassP){
  const style = S.rhythm !== 'auto' ? S.rhythm : (PADLIKE.test(sound) ? 'pad' : G.chords.style);
  const mk = () => {
    let p;
    if (style === 'pad'){ p = Array(16 * bars).fill(false); for (let s=0;s<2*bars;s++) if (s === 0 || harm[s] !== harm[s - 1] || (S.dens >= 1 && s % 2 === 0)) p[s * 8] = true; if (S.dens === 2) for (let s=0;s<2*bars;s++) p[s * 8 + 6] = Math.random() < 0.4; return { p, fit:1 }; }
    if (style === 'pump'){ const b = strPat(GOFF); const ws = b.map((x, i) => x ? 0 : W9('1010101010101010', i)); for (let k=0;k<[0,2,4][S.dens];k++){ const i = weightedPick(ws); if (i < 0) break; b[i] = true; ws[i] = 0; } return { p: twoBars(b, S.cx).slice(0, 16 * bars), fit:1 }; }
    const spec = { a: G.chords.a || ['................'], m: G.chords.m || '0030303003030030', n: G.chords.n || [1, 4] };
    const r = laneBar(spec, S.dens); if (!hits(r.p)) r.p[pickR([2, 3, 6])] = true;
    return { p: twoBars(r.p, S.cx, spec).slice(0, 16 * bars), fit: r.fit };
  };
  const clash = x => bassP && style !== 'pad' ? x.p.filter((on, i) => on && bassP[i]).length : 0;   // аккорд и бас — по очереди
  const c = best([...Array(12)].map(mk), x => x.fit + (curP ? Math.min(3, ham(x.p, curP)) * 0.4 : 0) - clash(x) * 0.7);
  const n = c.p.length, notes = Array(n).fill(0), vel = Array(n).fill(1);
  for (let i=0;i<n;i++) if (c.p[i]){ let s = degSemi(harm[slotOf(i)]); if (s > 6) s -= 12; notes[i] = s + (G.chords.oct || 0); vel[i] = style === 'pad' ? 0.9 : i % 4 === 0 ? 0.95 : 0.85; }
  // сложность: иногда аккорд-предвосхищение на «и» перед сменой
  if (S.cx === 2 && style !== 'pad') for (let s=1;s<2*bars;s++) if (harm[s] !== harm[s - 1] && Math.random() < 0.5){ const i = s * 8 - 1; c.p[i] = true; let x = degSemi(harm[s]); if (x > 6) x -= 12; notes[i] = x + (G.chords.oct || 0); vel[i] = 0.8; }
  return { p: c.p, notes, vel, style };
}

// ---------- FX ----------
function genFx(G, S, bars, v){
  const n = 16 * bars, p = Array(n).fill(false), vel = Array(n).fill(1);
  const meta = SND_META[v] || {};
  if (meta.len && /rise|swell/.test(meta.m)){ p[Math.max(0, n - meta.len)] = true; }
  else if (/sweepup/.test(v)){ p[bars === 2 ? 24 : 8] = true; }
  else if (/crackle|glitch|zap|laser|noiz/.test(v)){ p[0] = true; const k = [1, 2, 4][S.dens]; for (let j=0;j<k;j++){ const i = pickR([3, 6, 7, 11, 14, 15, 19, 22, 27, 30].filter(x => x < n)); p[i] = true; vel[i] = rnd(0.5, 0.85); } }
  else { p[0] = true; if (S.dens >= 1 && bars === 2) p[16] = Math.random() < 0.5; if (S.dens === 2) p[n - 2] = true; }
  return { p, vel };
}

// ============================================================
//  ПРИМЕНЕНИЕ К ПРОЕКТУ
// ============================================================
function writeRow(t, r, n){
  const now = performance.now();
  for (let i=0;i<MAXS;i++){
    const on = i < n && !!r.p[i];
    t.pat[i] = on; t.vel[i] = on && r.vel ? Math.min(1, r.vel[i] * (r.hum ? 1 + (Math.random() - 0.5) * 0.12 : 1)) : 1; t.prob[i] = on && r.prob ? r.prob[i] : 1; t.rat[i] = on && r.rat ? r.rat[i] : 1;
    if (on && r.notes) t.notes[i] = r.notes[i];
    if (on) t.born[i] = now;
  }
}
// ============================================================
//  АВТОСВЕДЕНИЕ
// ============================================================
// Громкость каждого звука выставляется по его замеренному уровню (SND_PROF) и роли: звук громче/тише
// среднего своей роли — подтягивается к нему. Поверх — баланс ролей, срез низа, панорама, посылы
// в ревер/дилей и сайдчейн по жанру. Звуки, которые ты уже крутил руками, не трогаются.
const MIX_ROLE = {
  kick:  { vol:0.95, cut:0,   pan:0,     rev:0,    dly:0 },
  snare: { vol:0.8,  cut:120, pan:0,     rev:0.2,  dly:0 },
  hat:   { vol:0.5,  cut:400, pan:0.3,   rev:0,    dly:0 },
  ohat:  { vol:0.42, cut:300, pan:-0.25, rev:0.1,  dly:0 },
  perc:  { vol:0.55, cut:150, pan:-0.4,  rev:0.15, dly:0.2 },
  bass:  { vol:0.9,  cut:28,  pan:0,     rev:0,    dly:0,    duck:0.6,  duckRel:0.18 },
  lead:  { vol:0.75, cut:180, pan:0.15,  rev:0.3,  dly:0.25, duck:0.35, duckRel:0.15 },
  chords:{ vol:0.6,  cut:160, pan:-0.15, rev:0.25, dly:0.2,  duck:0.45, duckRel:0.2 },
  pad:   { vol:0.6,  cut:140, pan:0,     rev:0.5,  dly:0,    duck:0.7,  duckRel:0.3 },
  fx:    { vol:0.55, cut:120, pan:0.4,   rev:0.35, dly:0 },
};
// баланс ролей (дБ) — подобран по замерам спектра готовых треков (tools/analyze.js)
const MIX_BAL = { kick:-3, bass:-5, snare:5, hat:7, ohat:6, perc:5, lead:7, chords:6, pad:5, fx:2 };
// жанровые поправки: дБ к ролям, множители посылов, сайдчейна и ширины
const MIX_GENRE = {
  hardtechno:{ kick:1, rev:0.6, duck:1.1 }, melodic:{ pad:1, lead:1, rev:1.2, dly:1.2 }, deephouse:{ chords:1, hat:-1, rev:1.1, duck:0.7 },
  house:{ chords:1, duck:0.8 }, techhouse:{ perc:1, bass:1, duck:0.8 }, proghouse:{ lead:1, pad:1, rev:1.2 }, trance:{ lead:1.5, pad:1, rev:1.3, dly:1.2, duck:1.1 },
  acid:{ lead:1, rev:0.8 }, minimal:{ perc:1, rev:0.9, dly:1.2 }, dubtechno:{ chords:1.5, hat:-2, rev:1.4, dly:2 }, electro:{ bass:1, rev:0.7 },
  ebm:{ bass:1, rev:0.7 }, darktechno:{ bass:2.5, snare:1, hat:-3, ohat:-3, perc:-1, chords:-1, rev:1.1, dly:0.6, duck:0.5 }, electropunk:{ bass:1.5, snare:2, hat:-3, ohat:-3, perc:-3, chords:-1, rev:0.4, dly:0.4, duck:0.5 }, breaks:{ snare:1, rev:0.9 }, dnb:{ snare:1.5, bass:1, kick:-1, duck:0.5 }, dubstep:{ bass:2, snare:1, duck:0.6 },
  ukg:{ bass:1, duck:0.7 }, trap:{ bass:2, hat:-1, duck:0.3 }, synthwave:{ snare:1, lead:1, rev:1.4 }, idm:{ rev:1.1, width:1.3 },
  ambient:{ kick:-3, pad:2, rev:1.8, dly:1.5, duck:0.3, width:1.3 },
};
const mixRoleOf = t => { const p = partOf(t);
  if (p === 'drums') return DRUM_ROLES.includes(t.role) ? t.role : drumRole(t.v);
  if (p === 'chords') return t.role === 'pad' || PADLIKE.test(t.v) ? 'pad' : 'chords';
  return p === 'lead' ? 'lead' : p === 'bass' ? 'bass' : 'fx'; };
// средний уровень звуков каждой роли в библиотеке
const ROLE_MED = (() => { const by = {};
  for (const s of LIB){ const pr = SND_PROF[s.id]; if (!pr || pr[0] < -50) continue; const r = mixRoleOf({ v:s.id }); (by[r] = by[r] || []).push(pr[0]); }
  const out = {}; for (const r in by){ const a = by[r].sort((x, y) => x - y); out[r] = a[a.length >> 1]; } return out; })();
const lowcutV = hz => hz <= 0 ? 0 : Math.max(0, Math.min(1, Math.log(hz / 20) / Math.log(40)));
const mixKeys = ['vol','trim','lowcut','pan','rev','dly','dlyT','duck','duckRel'];
const mixSig = t => mixKeys.map(k => (+t.params[k] || 0).toFixed(3)).join(',');
// свести один звук (side: −1/+1 — в какую сторону панорама, если таких звуков несколько)
function mixTrack(t, role, side = 1){
  role = role && MIX_ROLE[role] ? role : mixRoleOf(t);
  const G = GENM[GEN.genre] || {}, gm = MIX_GENRE[G.id] || {}, b = MIX_ROLE[role], pr = SND_PROF[t.v];
  const dev = pr && ROLE_MED[role] !== undefined ? Math.max(-9, Math.min(9, ROLE_MED[role] - pr[0])) : 0;
  const dB = dev + (MIX_BAL[role] || 0) + (gm[role] || 0);
  Object.assign(t.params, defParams(t.v));
  let cut = b.cut;
  if (pr && role !== 'kick' && role !== 'bass' && pr[2] > 0.5) cut = Math.min(cut, role === 'perc' || role === 'fx' ? 40 : 80);   // звук сам по себе низкий — режем мягче
  setGain(t, b.vol * Math.pow(10, dB / 20));
  t.params.lowcut = lowcutV(cut);
  t.params.pan = Math.max(-0.8, Math.min(0.8, b.pan * side * (gm.width || 1)));
  t.params.rev = Math.min(1, b.rev * (gm.rev || 1)); t.params.dly = Math.min(1, b.dly * (gm.dly || 1)); t.params.dlyT = 3;
  t.params.duck = Math.min(1, (b.duck || 0) * (gm.duck || 1)); t.params.duckRel = b.duckRel || 0.18;
  applyParams(t); t.mixSig = mixSig(t);
}
// общий уровень звука = регулятор громкости (до 120%) × скрытый trim (остальное)
function setGain(t, g){ g = Math.max(0.02, Math.min(12, g)); t.params.vol = Math.min(1.2, g); t.params.trim = g / t.params.vol; }
const gainOf = t => t.params.vol * (t.params.trim || 1);
// энергия звука в сцене по его профилю (без мастера): удары × громкость × длина
function trackEnergy(t){
  if (t.mute) return 0;
  const pr = SND_PROF[t.v] || [ROLE_MED[mixRoleOf(t)] ?? -20, 0.1]; let e = 0;
  for (let i=0;i<STEPS;i++) if (t.pat[i]) e += (t.vel[i] ** 2) * (t.rat[i] || 1) * (t.prob[i] ?? 1);
  return e * Math.pow(10, (pr[0] + 20 * Math.log10(Math.max(1e-4, gainOf(t)))) / 10) * Math.min(1.5, pr[1]);
}
const bandsOf = t => { const pr = SND_PROF[t.v]; return pr ? [pr[2], pr[3], pr[4]] : ({ kick:[1,0,0], bass:[0.9,0.1,0], hat:[0,0,1], ohat:[0,0,1] })[mixRoleOf(t)] || [0.1,0.8,0.1]; };
// примерная громкость сцены
function estLoud(){ const loopSec = STEPS * 60 / bpm / 4; return 10 * Math.log10(tracks.reduce((a, t) => a + trackEnergy(t), 0) / loopSec + 1e-12); }
// спектральный баланс по жанру: доля низа (<250 Гц) и верха (>3 кГц) в энергии сцены
const SPEC_TARGET = { low:0.69, high:0.045 };
const SPEC_GENRE = { dubstep:{ low:0.78 }, trap:{ low:0.76 }, dnb:{ low:0.66, high:0.06 }, ambient:{ low:0.55, high:0.035 }, idm:{ low:0.6 },
  deephouse:{ low:0.72 }, dubtechno:{ low:0.72, high:0.03 }, trance:{ low:0.64, high:0.06 }, proghouse:{ low:0.65 }, synthwave:{ low:0.62, high:0.05 }, melodic:{ low:0.66 } };
function specBalance(auto){
  const G = GENM[GEN.genre] || {}, T = Object.assign({}, SPEC_TARGET, SPEC_GENRE[G.id] || {});
  // группы: «низ» (бочка, бас) не трогаем; «верх» — звуки, где больше всего верха; остальное — «середина»
  const grp = t => { const r = mixRoleOf(t); if (r === 'kick' || r === 'bass') return 'low'; const b = bandsOf(t); return b[2] > b[1] ? 'high' : 'mid'; };
  for (let pass = 0; pass < 2; pass++){
    const B = [0, 0, 0]; for (const t of tracks){ const e = trackEnergy(t), b = bandsOf(t); for (let k=0;k<3;k++) B[k] += e * b[k]; }
    const tot = B[0] + B[1] + B[2]; if (!tot || !B[0]) return;
    const wantMid = (1 - T.low - T.high) / T.low, wantHigh = T.high / T.low;   // отношения к низу
    const gMid = B[1] > 0 ? Math.sqrt(wantMid / (B[1] / B[0])) : 1, gHigh = B[2] > 0 ? Math.sqrt(wantHigh / (B[2] / B[0])) : 1;
    const lim = x => Math.max(0.5, Math.min(2, x));   // не больше ±6 дБ за проход
    for (const t of auto){ const g = grp(t); if (g === 'mid') setGain(t, gainOf(t) * lim(gMid)); else if (g === 'high') setGain(t, gainOf(t) * lim(gHigh)); }
  }
}
let LOUD_TARGET = -7.5;   // по estLoud; калибруется замером готовых треков (tools/analyze.js)
// композиционная иерархия: целевой уровень роли относительно кика (дБ, по реальной энергии в сцене).
// Ритм-основа (кик, бас) — громче всех; ведущие партии — следом; фон (пэды, перкуссия, хэты, FX) — заметно тише.
const ROLE_LEVEL = { kick:0, bass:-3, snare:-9, lead:-9, chords:-12, pad:-15, perc:-17, hat:-19, ohat:-19, fx:-20 };
// поправка модели к реальному рендеру (замер tools: соло каждого звука → RMS), дБ
const ROLE_CAL = { kick:0, bass:0, snare:-1, lead:0, chords:0, pad:1.4, perc:1.1, hat:0, ohat:0, fx:0 };   // замер 8 жанров × 2 трека
// энергия звука «на единицу громкости» — среднее по сценам, где он играет (а не только по текущей)
function unitEnergy(t){
  const g2 = Math.pow(gainOf(t), 2) || 1, keep = scene; let sum = 0, k = 0;
  for (let s = 0; s < SCENES; s++){ if (!t.scn[s].pat.some((x, i) => x && i < STEPS)) continue; scene = s; bindScene(t); sum += trackEnergy({ ...t, mute:false }); k++; }
  scene = keep; bindScene(t);
  return k ? sum / k / g2 : 0;
}
// громкость каждого звука — по его роли в композиции: доля энергии роли делится между звуками этой роли
function roleLevels(auto){
  const G = GENM[GEN.genre] || {}, gm = MIX_GENRE[G.id] || {}, n = {};
  for (const t of auto) n[mixRoleOf(t)] = (n[mixRoleOf(t)] || 0) + 1;
  for (const t of auto){
    const r = mixRoleOf(t), u = unitEnergy(t); if (!u) continue;
    const dB = (ROLE_LEVEL[r] ?? -12) + (gm[r] || 0) - (ROLE_CAL[r] || 0) - 10 * Math.log10(n[r]);
    setGain(t, Math.sqrt(Math.pow(10, dB / 10) / u) * 0.05);
  }
}
// свести все «нетронутые» звуки и выровнять общую громкость сцены
function autoMix(){
  const count = {};
  for (const t of tracks){
    if (t.mixSig && t.mixSig !== mixSig(t)) continue;            // крутили руками — не трогаем
    const r = mixRoleOf(t); count[r] = (count[r] || 0) + 1;
    mixTrack(t, r, count[r] % 2 ? 1 : -1);
  }
  const auto = tracks.filter(t => t.mixSig && t.mixSig === mixSig(t));
  if (!auto.length) return;
  roleLevels(auto);   // уровни — по роли в композиции (спектральный «подтяг» больше не поднимает фон)
  const gl = (MIX_GENRE[(GENM[GEN.genre] || {}).id] || {}).loud || 0;   // жанровая «плотность»: сильнее в компрессор и лимитер мастера
  const g = Math.pow(10, Math.max(-18, Math.min(18, LOUD_TARGET + gl - estLoud())) / 20);   // уровни ролей заданы относительно — общий уровень выравнивается здесь
  for (const t of auto){ setGain(t, gainOf(t) * g); applyParams(t); t.mixSig = mixSig(t); }
}
function newPartTrack(v, part, role){
  const t = addGenTrack(v); if (!t) return null;
  t.part = part; t.role = role === 'chords' ? (PADLIKE.test(v) ? 'pad' : 'mel') : role;
  mixTrack(t);
  return t;
}
function replaceSound(t, v){
  if (t.v === v) return;
  t.v = v; t.spawn = performance.now();
  mixTrack(t);
}
// настроение → выбор звука: Dark — из более тёмных, Bright — из более ярких (по замеру спектра)
const brightOf = v => { const pr = SND_PROF[v]; return pr ? pr[4] + 0.35 * pr[3] : 0.5; };
function pickMood(list){
  if (!list.length) return null; if (GEN.mood === 1 || list.length < 3) return pickR(list);
  const s = list.slice().sort((a, b) => brightOf(a) - brightOf(b)), half = Math.ceil(s.length * 0.6);
  return pickR(GEN.mood === 0 ? s.slice(0, half) : s.slice(s.length - half));
}
// ---------- подбор звуков, которые сочетаются друг с другом ----------
// семейство ударных: набор собирается вокруг кика из одного «семейства» (808, 909, живые, грязные…)
const FAMS = [['808', /808/], ['909', /909/], ['707', /707|606|cr78|linn/], ['hard', /hard|dist|indust|metal|steel|anvil|gabber|rave|indhit|warehouse/],
  ['acoustic', /conga|bongo|shaker|wood|clave|tabla|djembe|udu|cabasa|brush|room|snap|finger|cowbell|tamb|guiro|timbale|logdrum|kalimba/], ['lofi', /lofi|dusty|vinyl|crackle|tape|bit/]];
const famOf = v => (FAMS.find(([, re]) => re.test(v)) || ['synth'])[0];
const FAM_NEAR = { '808':['707','lofi'], '909':['707','synth','hard'], '707':['808','909','synth'], hard:['909','synth'], acoustic:['lofi','808'], lofi:['808','acoustic'], synth:['909','707','hard'] };
const famFit = (a, b) => a === b ? 1 : (FAM_NEAR[a] || []).includes(b) ? 0.5 : 0.15;
const poolW = (G, v) => G.core && G.core.has(v) ? 1 : 0.35;
// настроение: Dark — вес у более тёмных, Bright — у более ярких (ранг яркости внутри списка)
function moodRank(list){
  if (GEN.mood === 1 || list.length < 3) return () => 1;
  const s = list.slice().sort((a, b) => brightOf(a) - brightOf(b)), rk = new Map(s.map((v, i) => [v, i / (s.length - 1)]));
  return v => GEN.mood === 0 ? 1.5 - rk.get(v) : 0.5 + rk.get(v);
}
// взвешенный выбор (веса заострены — хорошие варианты выпадают заметно чаще, но не всегда)
function wPick(list, wf){ const ws = list.map(v => Math.pow(Math.max(0, wf(v)), 1.6)); const i = weightedPick(ws); return i < 0 ? pickR(list) : list[i]; }
// набор ударных вокруг кика (свой кик можно передать — тогда остальные подбираются к нему)
// «настроенный» металл (райды, треугольники, гонг, наковальня, стекло, колокол…): звенит долго и с высотой,
// которая не следует тональности трека, — в тёмных жанрах почти никогда, в остальных реже
const RINGING = /ride|triangle|gong|anvil|glass|steelpan|logdrum|bell|ping|hammer|kalimba|sizzle|tube_hit|metal_hit|chime|cowbell|agogo/;
function pickKit(G, fixed = {}){
  const kit = { ...fixed };
  for (const r of DRUM_ROLES){
    if (kit[r]) continue;
    const list = G.kit[r].filter(v => SYNTH[v]); if (!list.length) continue;
    const mr = moodRank(list), fk = kit.kick ? famOf(kit.kick) : null, fh = kit.hat ? famOf(kit.hat) : null;
    // перкуссия (конги, шейкеры…) — из любого семейства, если она жанровая: правило семейства для неё мягче
    const ff = v => { const f = fk ? famFit(fk, famOf(v)) : 1; return r === 'perc' ? 0.6 + 0.4 * f : f; };
    const ring = v => RINGING.test(v) ? (DARK_G.has(G.id) || GEN.mood < 0.5 ? 0.04 : 0.4) : 1;
    kit[r] = wPick(list, v => poolW(G, v) * mr(v) * ff(v) * ring(v) * (r === 'ohat' && fh ? famFit(fh, famOf(v)) : 1));
  }
  return kit;
}
const profOf = v => SND_PROF[v] || [0, 0.2, 0.5, 0.4, 0.1];
// длина звучания (с, до −24 дБ от пика; замер) и «занятость»: на сколько шагов сетки растягивается одна нота
const lenOf = v => (typeof SND_LEN !== 'undefined' && SND_LEN[v]) || 0.25;
const occOf = v => lenOf(v) / stepDur();
// длинный звук сам заполняет место — нот меньше (иначе каша); короткий — как есть
function densForSound(dens, v){ const occ = occOf(v); return occ <= 2 ? dens : Math.max(0, dens - Math.min(1.3, Math.log2(occ / 2) * 0.5)); }
// у очень длинного звука из жанровых рисунков берём самый редкий
const sparsest = spec => ({ ...spec, a: [spec.a.reduce((b, x) => hits(strPat(x)) < hits(strPat(b)) ? x : b, spec.a[0])] });
// мелодическая партия: жанр + настроение + то, что уже звучит (кик, аккорды)
const CUTE = /bell|kalimba|marimba|chip|toy|glass|harp|music|steelpan|whistle|flute|xylo|vibra|celest|glock|ocarina|digibell|mallet|pluck|blip|sine|chime|vox_oi|vox_hey/;
const DARK_G = new Set(['electropunk','ebm','hardtechno','dubstep','darktechno','dark']);
const NOISY = /crackle|vinyl|glitch|noiz|bitcrush|static|hiss/, NOISY_OK = new Set(['ambient','idm','dubtechno']);   // шумовые FX — к месту только в этих жанрах
function pickPartSound(p, G){
  const own = (G.snd[p] || []).filter(v => SYNTH[v]), list = own.length ? own : soundList(p, G);
  const mr = moodRank(list);
  const kick = tracks.find(t => partOf(t) === 'drums' && (t.role === 'kick' || drumRole(t.v) === 'kick'));
  const chords = partTracks('chords')[0], bass = partTracks('bass')[0];
  const dark = GEN.mood < 0.5 || DARK_G.has(G.id);
  return wPick(list, v => {
    let w = poolW(G, v) * mr(v);
    if ((p === 'lead' || p === 'chords') && CUTE.test(v)) w *= dark ? 0.04 : GEN.mood >= 2 ? 1 : ['idm','ambient'].includes(G.id) ? 0.5 : 0.15;
    if (p === 'fx' && NOISY.test(v) && !NOISY_OK.has(G.id)) w *= 0.15;
    if (p === 'lead' && G.lead.riff && (LIBM[v] || {}).cat === 'Vocals') w *= 0.08;   // рифф — инструментом; выкрики — в FX, не мелодией
    const pr = profOf(v);
    if (p === 'bass' && kick){
      // гулкий длинный кик + бас, весь в саб-басе, — каша внизу: такой бас реже
      const kp = profOf(kick.v), boom = Math.max(0, Math.min(1, (kp[1] - 0.08) / 0.15)) * kp[2];
      w *= 1 - 0.65 * boom * Math.max(0, (pr[2] - 0.6) / 0.4);
    }
    if (p === 'lead' && chords){
      if (v === chords.v) return 0;
      const bc = brightOf(chords.v), bl = brightOf(v);
      w *= bl >= bc - 0.03 ? 1 : 0.35;                                   // лид — над аккордами, а не под ними
      if (PADLIKE.test(v) && PADLIKE.test(chords.v)) w *= 0.25;          // два пэда — сливаются
    }
    if (p === 'lead' && bass && v === bass.v) return 0;
    if (p === 'chords' && bass && pr[2] > 0.75) w *= 0.4;                 // аккорды не должны сидеть в басу
    return w;
  });
}
const resolveSound = (p, G, S) => {
  const list = soundList(p, G);
  if (S.sound !== 'auto' && list.includes(S.sound)) return S.sound;
  return pickPartSound(p, G);
};
// снимок для Undo: звуки, все сцены, темп, лад, свинг, песня
function genUndo(){}   // история (Undo) снимается автоматически — см. ИСТОРИЯ в app.js
function genUndoRestore(u){
  const g = u.gen; if (!g) return;
  bpm = g.bpm; swing = g.swing; P.root = g.root; P.scale = g.scale; P.drive = g.drive; P.grit = g.grit; P.genKey = g.genKey; P.genre = g.genre; P.genName = g.genName; genHarm = g.harm;
  if (g.steps !== STEPS){ STEPS = g.steps; stepLog = []; }
  arr = g.arr.map(b => ({ ...b })); u.list.forEach((t, k) => { if (g.vs[k] && t.v !== g.vs[k]){ t.v = g.vs[k]; } if (g.ps && g.ps[k]){ t.params = { ...g.ps[k] }; t.mixSig = g.ms[k]; if (t.ch) applyParams(t); } });
  if (busSh){ busSh.curve = curve(P.grit || 0); busComp.gain.value = 1/(1+(P.grit||0)*0.6); }
  $('bpm').innerHTML = '<b>'+bpm+'</b> BPM'; showSwing(); renderBlocks(); updatePerform(); if (typeof genRender === 'function') genRender();
}
// 16 → 32 шага: вторая половина = копия первой (чтобы «оставленные» партии не опустели)
function ensure32(){
  if (STEPS === 32) return;
  for (const tr of tracks) for (const sc of tr.scn){ if (sc.pat.slice(16).some(Boolean)) continue; for (let i=0;i<16;i++) for (const k of STEP_KEYS) sc[k][i+16] = sc[k][i]; }
  STEPS = 32; stepLog = [];
}
// тёмная палитра по умолчанию: мажор/лидийский/миксолидийский — только при явно ярком Mood;
// дорийский (минор с «светлой» большой секстой) — только в хаусовых жанрах и не при тёмном Mood
const HOUSEY = new Set(['house','deephouse','techhouse','ukg','proghouse']);
function darkenScale(sc, G, mood){
  if (mood >= 2) return sc;
  if (sc === 'major' || sc === 'lydian') return 'minor';
  if (sc === 'mixolydian') return HOUSEY.has(G.id) ? 'dorian' : 'minor';
  if (sc === 'dorian' && (!HOUSEY.has(G.id) || mood === 0)) return 'minor';
  return sc;
}
function setGlobals(G, whole){
  const S = GEN;
  if (whole){
    const mood = ['dark','mid','bright'][S.mood];
    P.scale = S.scale !== 'auto' && SCALES[S.scale] ? S.scale : darkenScale(pickR(G.scales[mood]), G, S.mood);
    P.root = S.key >= 0 ? 24 + S.key : 24 + rint(0, 11);
  } else if (!P.scale) P.scale = S.scale !== 'auto' && SCALES[S.scale] ? S.scale : 'minor';   // пресет без лада: тональность не трогаем
  if (whole){
    bpm = S.bpm || S._bpm || rint(G.bpm[0], G.bpm[1]);
    const sw = G.swing, d = GEN.parts.drums.swing;
    swing = d === 0 ? 0 : Math.round((d === 2 ? Math.min(0.4, sw[1] + 0.12) : rnd(sw[0], sw[1])) * 100) / 100;
    P.drive = Math.max(0, G.drive + (S.energy - 1) * (S._eDrive ?? 1)); P.grit = G.grit; P.genKey = G.legacy; P.genre = G.name; P.genName = G.name;
    if (busSh){ busSh.curve = curve(P.grit); busComp.gain.value = 1/(1+P.grit*0.6); }
    $('bpm').innerHTML = '<b>'+bpm+'</b> BPM'; showSwing();
  }
}
// одна партия → звуки и рисунки в текущей сцене
function applyPart(p, G, bars, whole){
  let S = GEN.parts[p]; const n = 16 * bars, have = partTracks(p);
  if (S.mode === 'off'){ have.forEach(dropTrack); return; }
  if (p === 'drums'){
    const kits = kitList(G), kit = S.sound !== 'auto' && /^kit\d+$/.test(S.sound) ? kits[+S.sound.slice(3) % kits.length] : null;
    const byRole = {}; for (const t of have){ const r = t.role && DRUM_ROLES.includes(t.role) ? t.role : drumRole(t.v); (byRole[r] = byRole[r] || []).push(t); }
    // целиком новый трек со звуком «auto» — новый набор ударных из жанра
    if (whole && S.sound === 'auto'){ have.forEach(dropTrack); for (const r in byRole) delete byRole[r]; }
    const cur = {}; for (const r in byRole) cur[r] = byRole[r][0].pat.slice(0, n);
    const res = genDrums(G, S, bars, Object.keys(cur).length ? cur : null);
    const fixed = {}; for (const r in byRole) fixed[r] = byRole[r][0].v;
    const autoKit = kit || pickKit(G, fixed);   // недостающие роли подбираются к уже стоящим звукам
    for (const r of DRUM_ROLES){
      if (!res[r]) { (byRole[r] || []).forEach(t => writeRow(t, { p:[] }, n)); continue; }
      let ts = byRole[r];
      if ((!ts || !ts.length) && !hits(res[r].p)) continue;   // пустая партия — звук не добавляем
      if (!ts || !ts.length){ const v = autoKit[r] || pickMood(G.kit[r]); const t = newPartTrack(v, 'drums', r); if (!t) continue; ts = [t]; }
      else if (kit) ts.forEach(t => replaceSound(t, kit[r]));
      ts.forEach((t, k) => { t.role = r; t.part = 'drums'; writeRow(t, k === 0 ? res[r] : { p: res[r].p.map((x, i) => x && i % 4 === 2), vel: res[r].vel }, n); });
    }
    return;
  }
  // мелодические партии: один звук на партию (остальные звуки партии тоже получают рисунок)
  let ts = have;
  if (whole && ts.length > 1){ ts.slice(1).forEach(dropTrack); ts = [ts[0]]; }
  const want = (whole && S.sound === 'auto') || S.sound !== 'auto' ? resolveSound(p, G, S) : null;
  if (!ts.length){ const t = newPartTrack(want || resolveSound(p, G, S), p, p === 'bass' ? 'bass' : p === 'lead' ? 'mel' : p === 'chords' ? 'chords' : 'perc'); if (!t) return; ts = [t]; }
  else if (want){ if (p === 'chords') ts[0].role = PADLIKE.test(want) ? 'pad' : 'mel'; replaceSound(ts[0], want); }
  const kick = tracks.find(t => partOf(t) === 'drums' && (t.role === 'kick' || drumRole(t.v) === 'kick'));
  for (const t of ts){
    const cur = t.pat.slice(0, n);
    t.part = p; if (!t.role) t.role = p === 'bass' ? 'bass' : p === 'fx' ? 'perc' : 'mel';
    let r;
    // плотность под звук: длинные звуки — меньше нот; очень длинные — ещё и самый редкий жанровый рисунок
    const S0 = S; S = Object.assign({}, S0, { dens: qz(densForSound(S0.dens, t.v)) });
    const Gx = occOf(t.v) > 4 && p === 'bass' ? Object.assign({}, G, { bass: sparsest(G.bass) }) : G;
    if (p === 'bass') r = genBass(Gx, S, bars, genHarm, kick ? kick.pat.slice(0, 16) : null, cur);
    else if (p === 'lead'){
      const ch = partTracks('chords').find(x => x.role !== 'pad'), chP = ch ? ch.pat.slice(0, n) : null;
      const up = G.lead.oct !== undefined ? G.lead.oct   // жанровый регистр (электропанк — низко, без «игрушечного» верха)
        : partTracks('chords').length && (BASE[t.v] ?? 36) <= 36 && !/acid/.test(t.v) && (S.range === 'auto' ? G.lead.range : +S.range) < 3 ? 12 : 0;   // лид — на октаву выше аккордов
      const bs = partTracks('bass')[0];
      r = genLead(G, S, bars, genHarm, cur, chP, up, bs ? bs.pat.slice(0, n) : null);
    }
    else if (p === 'chords'){ const bs = partTracks('bass')[0]; r = genChords(G, S, bars, genHarm, t.v, cur, bs ? bs.pat.slice(0, n) : null); t.role = r.style === 'pad' ? 'pad' : 'mel'; }
    else r = genFx(G, S, bars, t.v);
    if (!MELODIC.includes(t.v)) r.notes = null;
    writeRow(t, r, n);
    S = S0;
  }
}
const PART_ORDER = ['drums','bass','chords','lead','fx'];
// ---------- главный вход: весь трек или одна партия ----------
// ползунки дают дробные значения 0…2; каждый прогон берёт соседний уровень с нужной вероятностью
// (70 % между Mid и High → чаще High, иногда Mid), а количества ударов считаются по точному значению
const qz = v => { v = Math.max(0, Math.min(2, +v || 0)); const f = Math.floor(v); return Math.min(2, f + (Math.random() < v - f ? 1 : 0)); };
// плотность и темп: чем быстрее трек, тем меньше нот на такт (иначе каша), на медленном — чуть плотнее.
// 1) относительно обычного темпа жанра; 2) потолок нот в секунду для мелодических партий; 3) дроби хэтов — не на быстром темпе
function tempoFitDens(G, bpmEff){
  // Energy задаёт «напор», а сколько нот реально поместится — решает темп: чем быстрее, тем меньше нот на такт
  // (число ударов в секунду остаётся разумным). 128 BPM — опорный темп; ниже 105 — чуть плотнее.
  const f = Math.min(1.15, 128 / bpmEff), kp = { drums: 1.3, bass: 1.6, lead: 2.2, chords: 2 };
  const cap = { drums: 2 - Math.max(0, bpmEff - 135) / 30, lead: 2 - Math.max(0, bpmEff - 128) / 28, bass: 2 - Math.max(0, bpmEff - 132) / 32, chords: 2 - Math.max(0, bpmEff - 135) / 35 };
  for (const p of PARTS){
    const S = GEN.parts[p]; let d = +S.dens || 0;
    if (kp[p]) d *= Math.pow(f, kp[p]);
    if (bpmEff < 105 && p !== 'chords') d += (105 - bpmEff) / 70;
    if (cap[p] !== undefined) d = Math.min(d, Math.max(0.3, cap[p]));
    S.dens = Math.max(0, Math.min(2, d));
  }
  GEN._eDrive = Math.min(1, Math.pow(f, 1.5));   // драйв от Energy на быстром темпе слабее (иначе грязь)
  if (bpmEff >= 150 && G.id !== 'trap' && (GEN.parts.drums.rolls ?? 1) > 1) GEN.parts.drums.rolls = 1;
}
// ---------- подстройка параметров под жанр — на каждую генерацию ----------
// нетронутые ползунки: около жанрового значения (±); нетронутые кнопки: выбор с жанровыми вероятностями
const RIFF_DARK = g => !!(g.lead && g.lead.riff);
function genreStyle(G){
  const id = G.id, sw = G.swing || [0, 0];
  const swing = sw[1] === 0 ? { 0: 0.85, 1: 0.15 } : sw[1] >= 0.15 ? { 1: 0.6, 2: 0.3, 0: 0.1 } : { 1: 0.7, 0: 0.15, 2: 0.15 };
  const rolls = id === 'trap' ? { 2: 0.7, 1: 0.3 } : ['idm','dnb','breaks'].includes(id) ? { 1: 0.6, 2: 0.2, 0: 0.2 }
    : ['electropunk','ebm','hardtechno','darktechno','ambient','dubtechno'].includes(id) ? { 0: 0.55, 1: 0.45 } : { 1: 0.65, 0: 0.3, 2: 0.05 };
  const lr = G.lead.rhythm, riff = RIFF_DARK(G);
  const rhythm = lr === 'drive' ? { drive: 0.7, straight: 0.2, synco: 0.1 } : lr === 'acid' ? { acid: 0.8, synco: 0.2 } : lr === 'arp' ? { arp: 0.6, synco: 0.25, straight: 0.15 }
    : lr === 'straight' ? (riff ? { straight: 0.7, synco: 0.3 } : { straight: 0.6, synco: 0.3, arp: 0.1 }) : (riff ? { synco: 0.65, straight: 0.35 } : { synco: 0.6, straight: 0.25, arp: 0.15 });
  const r0 = G.lead.range || 1, range = riff ? { 1: 0.85, 2: 0.15 } : { [r0]: 0.6, ...(r0 > 1 ? { [r0 - 1]: 0.2 } : {}), ...(r0 < 3 ? { [r0 + 1]: 0.2 } : {}) };
  const rate = { [G.chords.rate || 1]: 0.7, [(G.chords.rate || 1) === 1 ? 2 : 1]: 0.3 };
  const oct = ['acid','dubstep','electropunk'].includes(id) ? { 1: 0.65, 0: 0.3, 2: 0.05 } : { 1: 0.8, 0: 0.15, 2: 0.05 };
  return { swing, rolls, rhythm, range, rate, oct };
}
const pickW = w => { const ks = Object.keys(w), i = weightedPick(ks.map(k => w[k])); const k = ks[Math.max(0, i)]; return isNaN(+k) ? k : +k; };
const near = (v, d) => Math.round(Math.max(0, Math.min(2, v + rnd(-d, d))) * 20) / 20;   // шаг 5 %, как у ползунка
function autoTune(G, only){
  const K = GENRE_KNOBS[G.id]; if (!K) return;
  const T = GEN.touched || {}, st = genreStyle(G), free = k => !T[k], doPart = p => !only || only === p;
  if (!only){ if (free('energy')) GEN.energy = near(K.E, 0.15); if (free('mood')) GEN.mood = near(K.M, 0.15); if (free('cx')) GEN.cx = near(K.C, 0.15); }
  const base = { drums: K.d, bass: K.b, lead: K.l, chords: K.c };
  for (const p of ['drums','bass','lead','chords']) if (doPart(p)){
    const S = GEN.parts[p], b = base[p];
    if (free(p + '.dens')) S.dens = near(b[0], 0.2);
    if (free(p + '.cx')) S.cx = near(b[1], 0.2);
  }
  if (doPart('drums')){
    const D = GEN.parts.drums;
    if (free('drums.swing')) D.swing = pickW(st.swing);
    if (free('drums.fills')){ const f = K.d[3]; D.fills = pickW(f === 0 ? { 0: 0.8, 1: 0.2 } : { [f]: 0.6, ...(f > 0 ? { [f - 1]: 0.25 } : {}), ...(f < 2 ? { [f + 1]: 0.15 } : {}) }); }
    if (free('drums.rolls')) D.rolls = pickW(st.rolls);
  }
  if (doPart('bass') && free('bass.oct')) GEN.parts.bass.oct = pickW(st.oct);
  if (doPart('lead')){ if (free('lead.rhythm')) GEN.parts.lead.rhythm = pickW(st.rhythm); if (free('lead.range')) GEN.parts.lead.range = pickW(st.range); }
  if (doPart('chords') && free('chords.rate')) GEN.parts.chords.rate = pickW(st.rate);
  genSave();
}
function genRun(only){
  autoTune(GENM[GEN.genre] || GENRES[0], only);
  const keep = { mood:GEN.mood, energy:GEN.energy, cx:GEN.cx, parts:PARTS.map(p => [GEN.parts[p].dens, GEN.parts[p].cx]), rolls:GEN.parts.drums.rolls };
  const G0 = GENM[GEN.genre] || GENRES[0];
  if (!only && !GEN.bpm){ const z = G0.bpmZones ? pickR(G0.bpmZones) : G0.bpm; GEN._bpm = rint(z[0], z[1]); }   // зоны темпа (например, медленная и быстрая)   // темп выбираем заранее, чтобы плотность считалась под него
  tempoFitDens(G0, only ? bpm : (GEN.bpm || GEN._bpm));
  GEN.mood = qz(GEN.mood); GEN.energy = qz(GEN.energy); GEN.cx = qz(GEN.cx);
  PARTS.forEach(p => { GEN.parts[p].dens = qz(GEN.parts[p].dens); GEN.parts[p].cx = qz(GEN.parts[p].cx); });
  try { genRunCore(only); }
  finally {
    GEN.mood = keep.mood; GEN.energy = keep.energy; GEN.cx = keep.cx; GEN.parts.drums.rolls = keep.rolls; delete GEN._bpm; delete GEN._eDrive;
    PARTS.forEach((p, k) => { GEN.parts[p].dens = keep.parts[k][0]; GEN.parts[p].cx = keep.parts[k][1]; });
    genRender();
  }
}
function genRunCore(only){
  if (!ac) return;
  const G = GENM[GEN.genre] || GENRES[0], whole = !only;
  genUndo();
  const fresh = !tracks.length;
  if (whole) setGlobals(G, true); else setGlobals(G, false);
  ensure32();
  const bars = STEPS / 16;
  // гармония: аккорды «оставить» — берём из них; иначе новая (при новом треке или новых аккордах)
  const S = GEN.parts.chords, rate = S.rate !== 'auto' ? +S.rate : G.chords.rate;
  const keepHarm = (only && only !== 'chords') || (!only && S.mode === 'keep');
  genHarm = keepHarm ? (harmFromTracks() || genHarm || makeHarm(G, GEN.mood, rate)) : makeHarm(G, GEN.mood, rate);
  const list = only ? [only] : PART_ORDER.filter(p => GEN.parts[p].mode !== 'keep');
  if (only && GEN.parts[only].mode !== 'new') GEN.parts[only].mode = 'new';
  for (const p of list){
    if (!whole || GEN.parts[p].mode !== 'off' || partTracks(p).length) applyPart(p, G, bars, whole);
    if (tracks.length >= MAX_SOUNDS) break;
  }
  // круг: звуки по порядку партий
  tracks.sort((a, b) => PART_ORDER.indexOf(partOf(a)) - PART_ORDER.indexOf(partOf(b)) || DRUM_ROLES.indexOf(a.role) - DRUM_ROLES.indexOf(b.role));
  autoMix();
  // сайдчейн от кика
  const kick = tracks.find(t => t.role === 'kick');
  tracks.forEach(t => { if (t.scSrc && !tracks.includes(t.scSrc)) t.scSrc = null; if (kick && t !== kick && t.params.duck > 0) t.scSrc = kick; });
  if (whole){ sceneTypes = ['', '', '', '']; sceneTypes[scene] = 'peak'; }
  if (whole && GEN.make === 'song'){
    buildArrangement(scene); if (!songOn) setSongOn(true, true);
  }
  tracks.forEach(bindScene); vState = null;
  if (sel){ buildSteps(sel); buildNotes(sel); }
  renderLib(); updateUI(); renderBlocks(); updatePerform();
  if (ac) tracks.forEach(t => t.flash = ac.currentTime);
  const key = 'C C# D D# E F F# G G# A A# B'.split(' ')[((P.root % 12) + 12) % 12];
  toast((only ? PART_NAMES[only] + ' · ' : (fresh ? 'generated · ' : 'new ' + (GEN.make === 'song' ? 'song' : 'scene') + ' · ')) + G.name + ' · ' + key + ' ' + (SCALE_NAMES[P.scale] || '').toLowerCase() + ' · ' + bpm + ' bpm');
  haptic('heavy'); genRender();
}

// ============================================================
//  ПАНЕЛЬ GEN
// ============================================================
const KEYS = 'C C# D D# E F F# G G# A A# B'.split(' ');
const LV = ['Low','Mid','High'];
function seg(id, opts, val){ return '<div class="gseg" data-k="' + id + '">' + opts.map(([v, t]) => '<button data-v="' + v + '"' + (String(v) === String(val) ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>'; }
function row(lbl, html){ return '<div class="grow"><span class="lbl">' + lbl + '</span>' + html + '</div>'; }
// ползунок 0–100 % (внутри — 0…2: между соседними уровнями генератор смешивает плавно)
function slider(id, lbl, val, lo, hi){ const pc = Math.round((+val || 0) * 50);
  return '<div class="gsl" data-k="' + id + '"><div class="gslh"><span class="lbl">' + lbl + '</span><b>' + pc + '%</b></div>' +
    '<input type="range" min="0" max="100" step="1" value="' + pc + '" style="--p:' + pc + '%" aria-label="' + lbl + '">' +
    '<div class="gsle"><span>' + lo + '</span><span>' + hi + '</span></div></div>'; }
function stepper(id, txt, sub){ return '<div class="gstep" data-k="' + id + '"><button data-d="-1" aria-label="previous">‹</button><b>' + txt + (sub ? '<small>' + sub + '</small>' : '') + '</b><button data-d="1" aria-label="next">›</button></div>'; }
function partSoundName(p){
  const S = GEN.parts[p], G = GENM[GEN.genre];
  if (p === 'drums'){ const kits = kitList(G); if (S.sound !== 'auto') return kitName(kits[+S.sound.slice(3) % kits.length]); const k = partTracks('drums').find(t => t.role === 'kick' || drumRole(t.v) === 'kick'); return k ? 'Auto · ' + label(k.v) : 'Auto'; }
  if (S.sound !== 'auto') return label(S.sound);
  const t = partTracks(p)[0]; return t ? 'Auto · ' + label(t.v) : 'Auto';
}
function genRender(){
  const box = $('gen'); if (!box) return;
  const G = GENM[GEN.genre], S = GEN.parts[GEN.part];
  box.dataset.tab = GEN.tab;
  box.querySelectorAll('.gtabs button').forEach(b => b.classList.toggle('on', b.dataset.t === GEN.tab));
  const key = P && P.scale ? KEYS[((P.root % 12) + 12) % 12] + ' ' + (SCALE_NAMES[P.scale] || '').toLowerCase() : '';
  // вкладка Track
  $('genTrack').innerHTML =
    '<button class="gbig gpick" data-a="genres"><span class="lbl">Genre</span><b>' + G.name + '</b><i>▾</i></button>' +
    '<div class="ggenres" id="genGenres">' + GENRES.map(g => '<button data-g="' + g.id + '"' + (g.id === GEN.genre ? ' class="on"' : '') + '>' + g.name + '</button>').join('') + '</div>' +
    '<div class="g3">' + stepper('bpm', GEN.bpm ? GEN.bpm : 'Auto', 'BPM') + stepper('key', GEN.key < 0 ? 'Auto' : KEYS[GEN.key], 'Key') + stepper('scale', GEN.scale === 'auto' ? 'Auto' : SCALE_NAMES[GEN.scale], 'Scale') + '</div>' +
    slider('energy', 'Energy', GEN.energy, 'Low', 'High') +
    slider('mood', 'Mood', GEN.mood, 'Dark', 'Bright') +
    slider('cx', 'Complexity', GEN.cx, 'Simple', 'Complex') +
    row('Make', seg('make', [['scene','Scene ' + 'ABCD'[scene]],['song','Full song']], GEN.make)) +
    '<div class="gmodes">' + PARTS.map(p => '<span class="' + GEN.parts[p].mode + '">' + PART_NAMES[p] + '<i>' + GEN.parts[p].mode + '</i></span>').join('') + '</div>';
  // вкладка Parts
  const extra = GEN.part === 'drums' ? row('Swing', seg('p.swing', [[0,'Straight'],[1,'Genre'],[2,'Heavy']], S.swing)) + row('Fills', seg('p.fills', [[0,'Off'],[1,'Light'],[2,'Busy']], S.fills)) + row('Rolls', seg('p.rolls', [[0,'Off'],[1,'Rare'],[2,'Many']], S.rolls ?? 1))
    : GEN.part === 'bass' ? row('Octave', seg('p.oct', [[0,'−1'],[1,'0'],[2,'+1']], S.oct))
    : GEN.part === 'lead' ? row('Rhythm', seg('p.rhythm', [['auto','Auto'],['straight','Straight'],['synco','Synco'],['arp','Arp']].concat(G.lead.rhythm === 'acid' ? [['acid','Acid']] : []).concat(G.lead.rhythm === 'drive' ? [['drive','Drive']] : []), S.rhythm)) + row('Range', seg('p.range', [['auto','Auto'],[1,'1 oct'],[2,'2 oct'],[3,'3 oct']], S.range))
    : GEN.part === 'chords' ? row('Rhythm', seg('p.rhythm', [['auto','Auto'],['pad','Pad'],['stab','Stab'],['pump','Pump']], S.rhythm)) + row('Changes', seg('p.rate', [['auto','Auto'],[1,'1 / bar'],[2,'2 / bar']], S.rate))
    : '';
  $('genParts').innerHTML =
    '<div class="gseg gpart">' + PARTS.map(p => '<button data-p="' + p + '"' + (p === GEN.part ? ' class="on"' : '') + '>' + PART_NAMES[p] + '</button>').join('') + '</div>' +
    stepper('sound', partSoundName(GEN.part), GEN.part === 'drums' ? 'Kit' : 'Sound') +
    row('Mode', seg('p.mode', [['new','New'],['keep','Keep'],['off','Off']], S.mode)) +
    slider('p.dens', 'Density', S.dens, 'Sparse', 'Dense') +
    slider('p.cx', 'Complexity', S.cx, 'Simple', 'Complex') + extra;
  renderScenesPane();
  $('genGo').innerHTML = GEN.tab === 'track' ? '✦ Generate ' + (GEN.make === 'song' ? 'song' : 'scene ' + 'ABCD'[scene])
    : GEN.tab === 'scenes' ? '✦ Generate scene ' + 'ABCD'[scTarget()] + ' · ' + scVarOf().name.toLowerCase()
    : '✦ Generate ' + PART_NAMES[GEN.part].toLowerCase();
  if (genGenresOpen) $('genGenres').classList.add('open');
  if (typeof scheduleFit === 'function') scheduleFit();
}
let genGenresOpen = false;
// ============================================================
//  SCENES: отдельные сцены из другой сцены (вся песня — GEN → Track → Make: Full song)
// ============================================================
const SC_TYPES = [['intro','Intro'],['groove','Groove'],['build','Build-up'],['break','Break'],['var','Drop 2'],['copy','Copy']];
const SC_L = 'ABCD';
// главная часть (дроп): выбранная, иначе текущая сцена, иначе первая непустая
function scMain(){ let m = GEN.scMain >= 0 ? GEN.scMain : scene; if (sceneEmpty(m)){ const f = [0,1,2,3].find(k => !sceneEmpty(k)); if (f !== undefined) m = f; } return m; }
function scTarget(){ const m = scMain(); let t = GEN.scTarget >= 0 ? GEN.scTarget : -1; if (t < 0 || t === m) t = [0,1,2,3].find(k => k !== m && sceneEmpty(k)) ?? [0,1,2,3].find(k => k !== m); return t; }
// вариации сцены: тип части песни × вариант исполнения (горизонтальное меню)
const SC_VARS = (() => { const out = [];
  for (const [ty, nm] of SC_TYPES){ const vs = SCENE_VARIANTS[ty];
    if (vs) vs.forEach((vn, v) => out.push({ ty, v, name: nm, sub: vn })); else out.push({ ty, v: -1, name: nm, sub: ty === 'var' ? 'drop variation' : 'same as drop' }); }
  return out; })();
let scVarsOpen = false;   // выпадающий список вариаций раскрыт
const scVarOf = () => SC_VARS.find(x => x.ty === GEN.scType && x.v === (GEN.scVar === 'auto' ? -1 : +GEN.scVar)) || SC_VARS.find(x => x.ty === GEN.scType) || SC_VARS[0];
function renderScenesPane(){
  const box = $('genScenes'); if (!box) return;
  const m = scMain(), t = scTarget(), cur = scVarOf();
  const sseg = (k, val, dis) => '<div class="gseg" data-k="' + k + '">' + [0,1,2,3].map(i => '<button data-v="' + i + '"' + (i === val ? ' class="on"' : '') + (dis(i) ? ' disabled' : '') + '>' + SC_L[i] + '</button>').join('') + '</div>';
  box.innerHTML =
    row('Generate scene', sseg('sc.target', t, i => i === m)) +
    row('From drop', sseg('sc.main', m, i => sceneEmpty(i))) +
    '<button class="gbig gpick" data-a="scvars"><span class="lbl">Variation</span><b>' + cur.name + ' · ' + cur.sub + '</b><i>' + (scVarsOpen ? '▴' : '▾') + '</i></button>' +
    '<div class="ggenres gvars' + (scVarsOpen ? ' open' : '') + '" data-k="sc.pick">' + SC_VARS.map(x => '<button data-v="' + x.ty + '|' + x.v + '"' + (x === cur ? ' class="on"' : '') + '><b>' + x.name + '</b><small>' + x.sub + '</small></button>').join('') + '</div>' +
    slider('sc.energy', 'Energy · vs drop', GEN.scEnergy, 'Sparser', 'Fuller') +
    slider('sc.change', 'Change · vs drop', GEN.scChange, 'Close', 'New') +
    '';
}
// сцена из дропа: структура (что играет) — по вариации, затем Energy меняет плотность хэтов/перкуссии,
// Change — насколько новые рисунки ударных, мелодии и баса (гармония — дропа)
function genScene(){
  const m = scMain(), t = scTarget(); if (sceneEmpty(m)){ toast('drop scene is empty'); return; }
  const x = scVarOf(), G = GENM[GEN.genre] || GENRES[0], e = GEN.scEnergy, c = GEN.scChange, bars = STEPS / 16, n = STEPS;
  makeScene(t, m, x.ty === 'copy' && c > 0.25 ? 'var' : x.ty, x.v >= 0 ? x.v : undefined);
  const keep = scene; scene = m; tracks.forEach(bindScene);
  const harm = harmFromTracks() || genHarm || makeHarm(G, qz(GEN.mood), 1);
  scene = t; tracks.forEach(bindScene);
  const has = tr => tr.pat.slice(0, n).some(Boolean);
  if (x.ty !== 'copy' || c > 0.25){
    // ударные: хэты и перкуссия заново по плотности (только те, что в этой части играют)
    const drums = partTracks('drums').filter(has), cur = {}; drums.forEach(tr => { const r = DRUM_ROLES.includes(tr.role) ? tr.role : drumRole(tr.v); cur[r] = tr.pat.slice(0, n); });
    if (drums.length && (Math.abs(e - 1) > 0.15 || Math.random() < c / 2)){
      const res = genDrums(G, { dens: qz(e), cx: qz(c), fills: c > 1 ? 1 : 0, rolls: GEN.parts.drums.rolls ?? 1 }, bars, cur);
      for (const tr of drums){ const r = DRUM_ROLES.includes(tr.role) ? tr.role : drumRole(tr.v); if ((r === 'hat' || r === 'ohat' || r === 'perc') && res[r] && hits(res[r].p)) writeRow(tr, res[r], n); }
    }
    // мелодия и бас: с вероятностью по Change — новая фраза в гармонии дропа
    const kick = partTracks('drums').find(tr => (tr.role === 'kick' || drumRole(tr.v) === 'kick'));
    for (const tr of partTracks('lead').filter(has)) if (Math.random() < c * 0.55){ const S = Object.assign({}, GEN.parts.lead, { dens: qz(Math.min(2, e)), cx: qz(c) }); const r = genLead(G, S, bars, harm, tr.pat.slice(0, n)); writeRow(tr, r, n); }
    for (const tr of partTracks('bass').filter(has)) if (Math.random() < c * 0.35){ const S = Object.assign({}, GEN.parts.bass, { dens: qz(Math.min(2, e)), cx: qz(c) }); const r = genBass(G, S, bars, harm, kick && has(kick) ? kick.pat.slice(0, 16) : null, tr.pat.slice(0, n)); writeRow(tr, r, n); }
    // энергия: мало — уходят перкуссия и открытый хэт; много — возвращаются из дропа ударные, которые вариация убрала
    if (e < 0.6) for (const tr of partTracks('drums').filter(has)){ const r = DRUM_ROLES.includes(tr.role) ? tr.role : drumRole(tr.v); if ((r === 'perc' || r === 'ohat') && Math.random() < 1 - e) writeRow(tr, { p:[] }, n); }
    if (e > 1.4) for (const tr of partTracks('drums')) if (!has(tr) && tr.scn[m].pat.slice(0, n).some(Boolean)){ tr.scn[t] = cloneScene(tr.scn[m]); bindScene(tr); }
    // энергия ниже середины — тише хэты и перкуссия, выше — громче
    if (Math.abs(e - 1) > 0.15) for (const tr of partTracks('drums').filter(has)){ const r = DRUM_ROLES.includes(tr.role) ? tr.role : drumRole(tr.v);
      if (r === 'hat' || r === 'perc' || r === 'ohat') for (let i=0;i<n;i++) if (tr.pat[i]) tr.vel[i] = Math.max(0.25, Math.min(1, tr.vel[i] * (0.75 + e * 0.25))); }
  }
  scene = keep; tracks.forEach(bindScene); vState = null;
  renderBlocks(); updatePerform(); if (sel){ buildSteps(sel); buildNotes(sel); }
  if (ac && scene === t) tracks.forEach(tr => tr.flash = ac.currentTime);
  haptic('medium'); genRender();
  toast('scene ' + SC_L[t] + ' · ' + x.name.toLowerCase() + ' · ' + x.sub + ' · tap again for another');
}
// что пользователь задал руками — генерация это не трогает (остальное подстраивается под жанр и меняется от раза к разу)
function touch(...keys){ GEN.touched = GEN.touched || {}; for (const k of keys) GEN.touched[k] = 1; }
function genSet(k, v){
  if (k === 'energy') touch('energy', ...PARTS.map(p => p + '.dens'));
  else if (k === 'cx') touch('cx', ...PARTS.map(p => p + '.cx'), 'drums.fills');
  else if (k === 'mood') touch('mood');
  else if (k.startsWith('p.') && k !== 'p.mode' && k !== 'p.sound') touch(GEN.part + '.' + k.slice(2));
  if (k === 'energy'){ GEN.energy = +v; for (const p of PARTS) GEN.parts[p].dens = +v; }
  else if (k === 'cx'){ GEN.cx = +v; for (const p of PARTS) GEN.parts[p].cx = +v; GEN.parts.drums.fills = +v < 0.5 ? 0 : Math.min(1, GEN.parts.drums.fills || 1); }   // Busy — только вручную
  else if (k === 'mood') GEN.mood = +v;
  else if (k === 'make') GEN.make = v;
  else if (k === 'sc.main'){ GEN.scMain = +v; if (GEN.scTarget === +v) GEN.scTarget = -1; }
  else if (k === 'sc.target') GEN.scTarget = +v;
  else if (k === 'sc.pick'){ const [ty, vv] = String(v).split('|'); GEN.scType = ty; GEN.scVar = +vv; scVarsOpen = false; }
  else if (k === 'sc.energy') GEN.scEnergy = +v;
  else if (k === 'sc.change') GEN.scChange = +v;
  else if (k.startsWith('p.')){
    const f = k.slice(2), S = GEN.parts[GEN.part];
    S[f] = ['mode','rhythm'].includes(f) || v === 'auto' ? v : +v;
  }
  genSave(); genRender(); haptic('select');
}
function genStep(k, d){
  const G = GENM[GEN.genre];
  if (k === 'bpm') GEN.bpm = Math.max(60, Math.min(200, (GEN.bpm || Math.round((G.bpm[0] + G.bpm[1]) / 2)) + d * 2));
  else if (k === 'key') GEN.key = GEN.key + d < -1 ? 11 : GEN.key + d > 11 ? -1 : GEN.key + d;
  else if (k === 'scale'){ const list = ['auto'].concat(Object.keys(SCALES)); GEN.scale = list[(list.indexOf(GEN.scale) + d + list.length) % list.length]; }
  else if (k === 'sound'){
    const p = GEN.part, list = ['auto'].concat(soundList(p, G)), S = GEN.parts[p];
    S.sound = list[(list.indexOf(S.sound) + d + list.length) % list.length];
    previewSound(p);
  }
  genSave(); genRender(); haptic('select');
}
// выбранный звук сразу ставится в партию (если она уже есть) и звучит
function previewSound(p){
  if (!ac) return;
  const S = GEN.parts[p], G = GENM[GEN.genre];
  if (p === 'drums'){
    if (S.sound === 'auto') return;
    const kit = kitList(G)[+S.sound.slice(3)];
    const ts = partTracks('drums'); ts.forEach(t => { const r = t.role && DRUM_ROLES.includes(t.role) ? t.role : drumRole(t.v); replaceSound(t, kit[r]); });
    const t0 = ac.currentTime + 0.02;
    [['kick', 0], ['snare', 0.25], ['hat', 0.125], ['hat', 0.375]].forEach(([r, dt]) => { const t = ts.find(x => x.role === r) || makeTrack(kit[r]); hit(t, t0 + dt); });
    renderLib(); updateUI(); return;
  }
  if (S.sound === 'auto') return;
  const t = partTracks(p)[0];
  if (t){ if (p === 'chords') t.role = PADLIKE.test(S.sound) ? 'pad' : 'mel'; replaceSound(t, S.sound); hit(t, ac.currentTime + 0.02); renderLib(); updateUI(); }
  else { const tmp = makeTrack(S.sound); hit(tmp, ac.currentTime + 0.02); }
}
// типичные значения ползунков для жанра (0…2 = 0…100 %): E/M/C — энергия, настроение, сложность;
// d — ударные [плотность, сложность, свинг 0/1/2, сбивки 0/1/2], b/l/c — бас, лид, аккорды [плотность, сложность]
const GENRE_KNOBS = {
  techno:     { E:1.3, M:0.45, C:0.9, d:[1.3,0.9,1,1], b:[1.2,0.8], l:[0.8,0.9], c:[0.8,0.7] },
  hardtechno: { E:1.8, M:0.3, C:0.8, d:[1.6,0.8,0,1], b:[1.6,0.6], l:[1.0,0.8], c:[0.6,0.6] },
  melodic:    { E:1.1, M:0.65, C:1.2, d:[1.0,0.8,1,1], b:[1.1,0.9], l:[1.2,1.3], c:[1.0,1.0] },
  deephouse:  { E:0.8, M:0.8, C:1.1, d:[1.0,1.1,1,1], b:[0.9,1.1], l:[0.7,1.0], c:[1.1,1.2] },
  house:      { E:1.2, M:1.0, C:1.0, d:[1.2,1.0,1,1], b:[1.1,1.0], l:[0.9,1.0], c:[1.2,1.0] },
  techhouse:  { E:1.3, M:0.7, C:1.0, d:[1.4,1.1,1,1], b:[1.3,1.1], l:[0.6,0.8], c:[0.6,0.8] },
  proghouse:  { E:1.1, M:0.8, C:1.1, d:[1.1,0.9,1,1], b:[1.1,0.9], l:[1.1,1.1], c:[1.0,1.0] },
  trance:     { E:1.6, M:0.95, C:1.1, d:[1.3,0.9,0,1], b:[1.6,0.6], l:[1.5,1.1], c:[1.0,0.9] },
  acid:       { E:1.4, M:0.5, C:1.2, d:[1.2,1.0,1,1], b:[1.2,1.2], l:[1.5,1.4], c:[0.5,0.6] },
  minimal:    { E:0.7, M:0.6, C:1.3, d:[0.9,1.4,1,1], b:[0.8,1.2], l:[0.5,1.2], c:[0.5,1.0] },
  dubtechno:  { E:0.6, M:0.6, C:0.8, d:[0.8,0.8,1,0], b:[0.8,0.6], l:[0.4,0.6], c:[1.0,0.8] },
  electro:    { E:1.3, M:0.55, C:1.4, d:[1.3,1.4,0,1], b:[1.3,1.3], l:[1.1,1.2], c:[0.7,0.8] },
  ebm:        { E:1.5, M:0.4, C:0.8, d:[1.3,0.8,0,1], b:[1.7,0.6], l:[0.9,0.8], c:[0.5,0.6] },
  electropunk:{ E:1.9, M:0.1, C:0.9, d:[1.5,0.9,0,1], b:[1.6,0.8], l:[1.0,0.8], c:[0.6,0.6] },
  darktechno: { E:1.3, M:0.2, C:1.0, d:[1.0,0.9,0,1], b:[1.4,0.8], l:[0.8,0.9], c:[0.6,0.7] },
  breaks:     { E:1.4, M:0.75, C:1.5, d:[1.4,1.6,1,1], b:[1.2,1.2], l:[0.9,1.1], c:[0.9,1.0] },
  dnb:        { E:1.7, M:0.6, C:1.5, d:[1.5,1.6,1,1], b:[1.3,1.3], l:[0.8,1.0], c:[0.9,1.0] },
  dubstep:    { E:1.5, M:0.4, C:1.3, d:[0.9,1.2,1,1], b:[1.5,1.5], l:[0.6,1.0], c:[0.6,0.8] },
  ukg:        { E:1.2, M:0.95, C:1.5, d:[1.3,1.5,1,1], b:[1.2,1.3], l:[0.8,1.1], c:[1.1,1.2] },
  trap:       { E:1.2, M:0.4, C:1.4, d:[1.4,1.5,1,1], b:[1.0,1.2], l:[0.9,1.0], c:[0.7,0.8] },
  synthwave:  { E:1.1, M:1.05, C:0.9, d:[1.0,0.8,0,1], b:[1.5,0.7], l:[1.2,1.0], c:[1.1,0.9] },
  idm:        { E:1.0, M:0.75, C:1.9, d:[1.3,1.9,1,1], b:[1.0,1.6], l:[1.1,1.7], c:[0.9,1.4] },
  ambient:    { E:0.4, M:0.85, C:0.8, d:[0.3,0.6,1,0], b:[0.6,0.6], l:[0.6,0.9], c:[1.2,0.9] },
};
function applyGenreKnobs(id){
  const K = GENRE_KNOBS[id]; if (!K) return;
  GEN.energy = K.E; GEN.mood = K.M; GEN.cx = K.C;
  const D = GEN.parts.drums; [D.dens, D.cx, D.swing, D.fills] = K.d;
  [GEN.parts.bass.dens, GEN.parts.bass.cx] = K.b; [GEN.parts.lead.dens, GEN.parts.lead.cx] = K.l; [GEN.parts.chords.dens, GEN.parts.chords.cx] = K.c;
}
// жанр: подставляем его обычные режимы партий (например, у Acid нет аккордов) и типичные значения ползунков
function genGenre(id){
  const G = GENM[id]; if (!G) return;
  GEN.genre = id; GEN.bpm = 0; GEN.scale = 'auto'; GEN.touched = {};   // темп и лад — жанровые (лад можно снова выбрать вручную)
  for (const p of PARTS){ const m = (G.parts || {})[p]; if (m) GEN.parts[p].mode = m; else if (p === 'drums' || p === 'bass') GEN.parts[p].mode = 'new'; GEN.parts[p].sound = 'auto'; }
  GEN.parts.lead.rhythm = 'auto'; GEN.parts.chords.rhythm = 'auto';
  GEN.parts.drums.rolls = id === 'trap' ? 2 : 1;   // трэп-роллы — часть жанра, в остальных дробь редкая
  applyGenreKnobs(id);
  genGenresOpen = false; genSave(); genRender(); haptic('select');
}
function setGenOpen(on){
  document.body.classList.toggle('gen-open', on);
  $('genBtn').classList.toggle('on', on);
  if (on){ if (document.body.classList.contains('song-open')) setSongOpen(false); if (document.body.classList.contains('pads-open')) setPadsOpen(false); genRender(); }
  resize(); updateBack();
}
(function genInit(){
  const box = $('gen'); if (!box) return;
  $('genBtn').onclick = () => setGenOpen(!document.body.classList.contains('gen-open'));
  $('genClose').onclick = () => setGenOpen(false);
  box.querySelectorAll('.gtabs button').forEach(b => b.onclick = () => { GEN.tab = b.dataset.t; genSave(); genRender(); haptic('select'); });
  // ползунки: при движении — только подпись, при отпускании — сохранить
  box.addEventListener('input', e => {
    const sl = e.target.closest('.gsl'); if (!sl) return;
    const v = +e.target.value; e.target.style.setProperty('--p', v + '%'); sl.querySelector('b').textContent = v + '%';
  });
  box.addEventListener('change', e => { const sl = e.target.closest('.gsl'); if (sl) genSet(sl.dataset.k, +e.target.value / 50); });
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !box.contains(b)) return;
    if (b.dataset.a === 'genres'){ genGenresOpen = !genGenresOpen; $('genGenres').classList.toggle('open', genGenresOpen); return; }
    if (b.dataset.a === 'scvars'){ scVarsOpen = !scVarsOpen; genRender(); haptic('select'); return; }
    if (b.dataset.g){ genGenre(b.dataset.g); return; }
    if (b.dataset.p){ GEN.part = b.dataset.p; genSave(); genRender(); haptic('select'); return; }
    const sg = b.closest('.gseg[data-k], .gvars[data-k]'); if (sg && b.dataset.v !== undefined){ genSet(sg.dataset.k, b.dataset.v); return; }
    const st = b.closest('.gstep'); if (st && b.dataset.d){ genStep(st.dataset.k, +b.dataset.d); return; }
    if (st && b.tagName === 'B') return;
  });
  // тап по значению шагового переключателя — назад к «Auto»
  box.addEventListener('click', e => {
    const v = e.target.closest('.gstep b'); if (!v) return;
    const k = v.parentNode.dataset.k;
    if (k === 'bpm') GEN.bpm = GEN.bpm ? 0 : Math.round((GENM[GEN.genre].bpm[0] + GENM[GEN.genre].bpm[1]) / 2);
    else if (k === 'key') GEN.key = -1; else if (k === 'scale') GEN.scale = 'auto'; else if (k === 'sound') GEN.parts[GEN.part].sound = 'auto';
    genSave(); genRender(); haptic('select');
  });
  $('genGo').onclick = () => { if (GEN.tab === 'scenes') genScene(); else genRun(GEN.tab === 'parts' ? GEN.part : null); };
})();
