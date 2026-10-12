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

  { id:'hardtechno', name:'Hard Techno', bpm:[145,155], swing:[0,0], drive:9, grit:3, legacy:'techno',
    scales:{ dark:['phrygian','harmonic'], mid:['minor','phrygian'], bright:['minor'] },
    kit:{ kick:['hardkick','distkick','gabber','rumblekick'], snare:['clap909','bigclap','steel'], hat:['hat909','hat','tick'], ohat:['ohat909','ride'], perc:['metal','indhit','tom909'] },
    snd:{ bass:['rumble','reese','buzz','growl'], lead:['hoover','darksaw','siren','acid'], chords:['ravestab','diststab','stab'], fx:['impact','sweepup','boom','crash'] },
    kick:L(GK4, '0000000000000025', [0,1]), snare:L(GBB, '0000000200020013', [0,2]),
    hat:L(GOFF, '3232323232323232', [2,12]), ohat:L(GOFF), perc:L(['..x..x....x..x..', '...x..x....x..x.'], '1111111111111111', [0,3]),
    bass:L(['.xxx.xxx.xxx.xxx', '.x.x.x.x.x.x.x.x'], '0000000000000000', [0,0], { kick:'avoid', notes:'root' }),
    lead:{ rhythm:'synco', range:1 }, chords:{ style:'stab', m:'0030300303003030', n:[1,3], prog:'dark', rate:1 },
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
    snd:{ bass:['sub','dubbass','bass808'], lead:['marimba','kalimba','bell','blip','glock'], chords:['dubchord','deepchord','epiano'], fx:['crackle','glitch','zap'] },
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
    lead:{ rhythm:'straight', range:1 }, chords:{ style:'pad', prog:'dark', rate:1 },
    parts:{ lead:'new', chords:'off', fx:'off' } },

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
  acid:'techno', minimal:'minimal', dubtechno:'dub', electro:'broken', ebm:'techno', breaks:'broken', dnb:'broken', dubstep:'half', ukg:'ukg', trap:'half',
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
const GEN_DEF = () => ({ genre:'techno', bpm:0, key:-1, scale:'auto', energy:1, mood:1, cx:1, make:'scene', tab:'track', part:'drums', scMain:-1, scTarget:-1, scType:'break', scVar:'auto',
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
  const n = Math.max(...DRUM_ROLES.map(r => G.kit[r].length)), out = [];
  for (let k=0;k<n;k++) out.push(Object.fromEntries(DRUM_ROLES.map(r => [r, G.kit[r][k % G.kit[r].length]])));
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
function twoBars(bar1, knob, spec){
  const p = bar1.concat(bar1);
  if (knob >= 1 && spec && Math.random() < 0.6){
    const extra = [...Array(16).keys()].filter(i => !bar1[i] && W9(spec.m, i) > 0);
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
  if (mi === 'dark' && G.chords.prog !== 'dark' && Math.random() < 0.3) fams = PROGS.dark;
  const p = rate === 2 ? pickR(fams.p4).slice() : (x => [x[0], x[0], x[1], x[1]])(pickR(fams.p2));
  // уменьшённые и увеличенные аккорды (квинта не чистая) меняем на соседние «чистые» ступени
  const sc = scaleOf(), pure = d => ((sc[(d + 4) % 7] + (d + 4 >= 7 ? 12 : 0)) - sc[d]) === 7;
  return p.map(d => pure(d) ? d : [5, 3, 0, 4, 6].find(x => x !== d && pure(x)) ?? 0);
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
  out.kick = twoBars(kick.p, cx, G.kick);
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
    const perc = best([...Array(10)].map(() => laneBar(G.perc, Math.max(dens, cx), { avoid: snare.p })), c => c.fit - hits(c.p.map((x, i) => x && snare.p[i])) * 2 + (cur && cur.perc ? Math.min(3, ham(c.p, cur.perc.slice(0, 16))) * 0.5 : 0));
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
function genLead(G, S, bars, harm, curP, avoidP, up = 0){
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
  for (let i=0;i<n;i++) if (c.p[i]){ let s = degSemi(harm[slotOf(i)]); if (s > 6) s -= 12; notes[i] = s; vel[i] = style === 'pad' ? 0.9 : i % 4 === 0 ? 0.95 : 0.85; }
  // сложность: иногда аккорд-предвосхищение на «и» перед сменой
  if (S.cx === 2 && style !== 'pad') for (let s=1;s<2*bars;s++) if (harm[s] !== harm[s - 1] && Math.random() < 0.5){ const i = s * 8 - 1; c.p[i] = true; let x = degSemi(harm[s]); if (x > 6) x -= 12; notes[i] = x; vel[i] = 0.8; }
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
  ebm:{ bass:1, rev:0.7 }, breaks:{ snare:1, rev:0.9 }, dnb:{ snare:1.5, bass:1, kick:-1, duck:0.5 }, dubstep:{ bass:2, snare:1, duck:0.6 },
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
  specBalance(auto);
  const g = Math.pow(10, Math.max(-6, Math.min(6, LOUD_TARGET - estLoud())) / 20);
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
const resolveSound = (p, G, S) => {
  const list = soundList(p, G);
  if (S.sound !== 'auto' && list.includes(S.sound)) return S.sound;
  return pickMood(G.snd[p].filter(v => SYNTH[v]).length ? G.snd[p].filter(v => SYNTH[v]) : list);
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
function setGlobals(G, whole){
  const S = GEN;
  if (whole){
    const mood = ['dark','mid','bright'][S.mood];
    P.scale = S.scale !== 'auto' && SCALES[S.scale] ? S.scale : pickR(G.scales[mood]);
    P.root = S.key >= 0 ? 24 + S.key : 24 + rint(0, 11);
  } else if (!P.scale) P.scale = S.scale !== 'auto' && SCALES[S.scale] ? S.scale : 'minor';   // пресет без лада: тональность не трогаем
  if (whole){
    bpm = S.bpm || rint(G.bpm[0], G.bpm[1]);
    const sw = G.swing, d = GEN.parts.drums.swing;
    swing = d === 0 ? 0 : Math.round((d === 2 ? Math.min(0.4, sw[1] + 0.12) : rnd(sw[0], sw[1])) * 100) / 100;
    P.drive = Math.max(0, G.drive + (S.energy - 1)); P.grit = G.grit; P.genKey = G.legacy; P.genre = G.name; P.genName = G.name;
    if (busSh){ busSh.curve = curve(P.grit); busComp.gain.value = 1/(1+P.grit*0.6); }
    $('bpm').innerHTML = '<b>'+bpm+'</b> BPM'; showSwing();
  }
}
// одна партия → звуки и рисунки в текущей сцене
function applyPart(p, G, bars, whole){
  const S = GEN.parts[p], n = 16 * bars, have = partTracks(p);
  if (S.mode === 'off'){ have.forEach(dropTrack); return; }
  if (p === 'drums'){
    const kits = kitList(G), kit = S.sound !== 'auto' && /^kit\d+$/.test(S.sound) ? kits[+S.sound.slice(3) % kits.length] : null;
    const byRole = {}; for (const t of have){ const r = t.role && DRUM_ROLES.includes(t.role) ? t.role : drumRole(t.v); (byRole[r] = byRole[r] || []).push(t); }
    // целиком новый трек со звуком «auto» — новый набор ударных из жанра
    if (whole && S.sound === 'auto'){ have.forEach(dropTrack); for (const r in byRole) delete byRole[r]; }
    const cur = {}; for (const r in byRole) cur[r] = byRole[r][0].pat.slice(0, n);
    const res = genDrums(G, S, bars, Object.keys(cur).length ? cur : null);
    for (const r of DRUM_ROLES){
      if (!res[r]) { (byRole[r] || []).forEach(t => writeRow(t, { p:[] }, n)); continue; }
      let ts = byRole[r];
      if ((!ts || !ts.length) && !hits(res[r].p)) continue;   // пустая партия — звук не добавляем
      if (!ts || !ts.length){ const v = kit ? kit[r] : pickMood(G.kit[r]); const t = newPartTrack(v, 'drums', r); if (!t) continue; ts = [t]; }
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
    if (p === 'bass') r = genBass(G, S, bars, genHarm, kick ? kick.pat.slice(0, 16) : null, cur);
    else if (p === 'lead'){
      const ch = partTracks('chords').find(x => x.role !== 'pad'), chP = ch ? ch.pat.slice(0, n) : null;
      const up = partTracks('chords').length && (BASE[t.v] ?? 36) <= 36 && !/acid/.test(t.v) && (S.range === 'auto' ? G.lead.range : +S.range) < 3 ? 12 : 0;   // лид — на октаву выше аккордов
      r = genLead(G, S, bars, genHarm, cur, chP, up);
    }
    else if (p === 'chords'){ const bs = partTracks('bass')[0]; r = genChords(G, S, bars, genHarm, t.v, cur, bs ? bs.pat.slice(0, n) : null); t.role = r.style === 'pad' ? 'pad' : 'mel'; }
    else r = genFx(G, S, bars, t.v);
    if (!MELODIC.includes(t.v)) r.notes = null;
    writeRow(t, r, n);
  }
}
const PART_ORDER = ['drums','bass','chords','lead','fx'];
// ---------- главный вход: весь трек или одна партия ----------
// ползунки дают дробные значения 0…2; каждый прогон берёт соседний уровень с нужной вероятностью
// (70 % между Mid и High → чаще High, иногда Mid), а количества ударов считаются по точному значению
const qz = v => { v = Math.max(0, Math.min(2, +v || 0)); const f = Math.floor(v); return Math.min(2, f + (Math.random() < v - f ? 1 : 0)); };
function genRun(only){
  const keep = { mood:GEN.mood, energy:GEN.energy, cx:GEN.cx, parts:PARTS.map(p => [GEN.parts[p].dens, GEN.parts[p].cx]) };
  GEN.mood = qz(GEN.mood); GEN.energy = qz(GEN.energy); GEN.cx = qz(GEN.cx);
  PARTS.forEach(p => { GEN.parts[p].dens = qz(GEN.parts[p].dens); GEN.parts[p].cx = qz(GEN.parts[p].cx); });
  try { genRunCore(only); }
  finally {
    GEN.mood = keep.mood; GEN.energy = keep.energy; GEN.cx = keep.cx;
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
  $('genSub').textContent = G.name + ' · ' + bpm + ' bpm' + (key ? ' · ' + key : '');
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
    : GEN.part === 'lead' ? row('Rhythm', seg('p.rhythm', [['auto','Auto'],['straight','Straight'],['synco','Synco'],['arp','Arp']].concat(G.lead.rhythm === 'acid' ? [['acid','Acid']] : []), S.rhythm)) + row('Range', seg('p.range', [['auto','Auto'],[1,'1 oct'],[2,'2 oct'],[3,'3 oct']], S.range))
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
    : GEN.tab === 'scenes' ? '✦ Make scene ' + 'ABCD'[scTarget()] + ' · ' + SC_TYPES.find(x => x[0] === GEN.scType)[1].toLowerCase()
    : '✦ Generate ' + PART_NAMES[GEN.part].toLowerCase();
  if (genGenresOpen) $('genGenres').classList.add('open');
}
let genGenresOpen = false;
// ============================================================
//  SCENES: отдельные сцены из другой сцены (вся песня собирается в Song → Build)
// ============================================================
const SC_TYPES = [['intro','Intro'],['groove','Groove'],['build','Build-up'],['break','Break'],['var','Drop 2'],['copy','Copy']];
const SC_L = 'ABCD';
// главная часть (дроп): выбранная, иначе текущая сцена, иначе первая непустая
function scMain(){ let m = GEN.scMain >= 0 ? GEN.scMain : scene; if (sceneEmpty(m)){ const f = [0,1,2,3].find(k => !sceneEmpty(k)); if (f !== undefined) m = f; } return m; }
function scTarget(){ const m = scMain(); let t = GEN.scTarget >= 0 ? GEN.scTarget : -1; if (t < 0 || t === m) t = [0,1,2,3].find(k => k !== m && sceneEmpty(k)) ?? [0,1,2,3].find(k => k !== m); return t; }
function renderScenesPane(){
  const box = $('genScenes'); if (!box) return;
  const m = scMain(), t = scTarget();
  const sseg = (k, val, dis) => '<div class="gseg" data-k="' + k + '">' + [0,1,2,3].map(i => '<button data-v="' + i + '"' + (i === val ? ' class="on"' : '') + (dis(i) ? ' disabled' : '') + '>' + SC_L[i] + '</button>').join('') + '</div>';
  const vars = SCENE_VARIANTS[GEN.scType] || [];
  box.innerHTML =
    row('From scene · source', sseg('sc.main', m, i => sceneEmpty(i))) +
    row('Make scene', sseg('sc.target', t, i => i === m)) +
    row('As', '<div class="gseg gtypes" data-k="sc.type">' + SC_TYPES.map(([v, n]) => '<button data-v="' + v + '"' + (v === GEN.scType ? ' class="on"' : '') + '>' + n + '</button>').join('') + '</div>') +
    (vars.length ? row('Variant', '<div class="gseg" data-k="sc.var">' + [['auto','Auto']].concat(vars.map((n, i) => [i, n])).map(([v, n]) => '<button data-v="' + v + '"' + (String(v) === String(GEN.scVar) ? ' class="on"' : '') + '>' + n + '</button>').join('') + '</div>') : '') +
    '<div class="ehint">Scene ' + SC_L[t] + ' is made from scene ' + SC_L[m] + ' · Auto picks a new variant on every tap · whole song — <b>Song → Build</b></div>';
}
function genSet(k, v){
  if (k === 'energy'){ GEN.energy = +v; for (const p of PARTS) GEN.parts[p].dens = +v; }
  else if (k === 'cx'){ GEN.cx = +v; for (const p of PARTS) GEN.parts[p].cx = +v; GEN.parts.drums.fills = +v < 0.5 ? 0 : Math.min(1, GEN.parts.drums.fills || 1); }   // Busy — только вручную
  else if (k === 'mood') GEN.mood = +v;
  else if (k === 'make') GEN.make = v;
  else if (k === 'sc.main'){ GEN.scMain = +v; if (GEN.scTarget === +v) GEN.scTarget = -1; }
  else if (k === 'sc.target') GEN.scTarget = +v;
  else if (k === 'sc.type'){ GEN.scType = v; GEN.scVar = 'auto'; }
  else if (k === 'sc.var') GEN.scVar = v === 'auto' ? 'auto' : +v;
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
// жанр: подставляем его обычные режимы партий (например, у Acid нет аккордов)
function genGenre(id){
  const G = GENM[id]; if (!G) return;
  GEN.genre = id; GEN.bpm = 0;
  for (const p of PARTS){ const m = (G.parts || {})[p]; if (m) GEN.parts[p].mode = m; else if (p === 'drums' || p === 'bass') GEN.parts[p].mode = 'new'; GEN.parts[p].sound = 'auto'; }
  GEN.parts.lead.rhythm = 'auto'; GEN.parts.chords.rhythm = 'auto';
  GEN.parts.drums.rolls = id === 'trap' ? 2 : 1;   // трэп-роллы — часть жанра, в остальных дробь редкая
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
    if (b.dataset.g){ genGenre(b.dataset.g); return; }
    if (b.dataset.p){ GEN.part = b.dataset.p; genSave(); genRender(); haptic('select'); return; }
    const sg = b.closest('.gseg[data-k]'); if (sg && b.dataset.v !== undefined){ genSet(sg.dataset.k, b.dataset.v); return; }
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
