// Goblin Haven: game data and rules. No DOM here, so the balance simulator can share it.
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ tuning
  const K = {
    HP_BASE: 10,
    HP_GROWTH: 1.6,        // per stage (10 stages per region)
    GOLD_RATIO: 0.1,       // shinies per kill as a share of the adventurer's HP
    UNIT_KILLS: 20,        // a new unit tier costs about this many kills at the start of its region
    UNIT_EFF0: 0.07,       // damage per shiny of the first unit
    UNIT_EFF: 0.15,         // each later unit is this much less efficient per shiny
    UP_KILLS: 40,          // general upgrades cost about this many kills at their unlock stage
    HAVEN: 0.1,            // +10% shinies per conquered region
    XP_BASE: 1.6,
    XP_GROWTH: 1.17,
    SPAWN_DELAY: 0.7,      // seconds for the next adventurer to walk in
    BOSS_HP: 9,
    BOSS_GOLD: 15,
    BOSS_XP: 12,
    BOSS_TIME: 30,
    RAID_HP: 14,
    RAID_GOLD: 30,
    RAID_TIME: 40,
    RAID_STEAL: 0.15,
    TAP_BASE: 2,
    TAP_TIER: 4,           // hero tap multiplier per evolution tier
    TAP_LEVEL: 0.25,       // hero tap +25% per level within a form
    DPS_TIER: 2.2,         // warband damage multiplier per evolution tier (command)
    DPS_LEVEL: 0.03,
    NEED_BASE: 6,          // xp needed for goblin level 2
    NEED_LEVEL: 1.3,
    NEED_TIER: 6,
    CODEX_BONUS: 0.1,
    SHARD_BONUS: 0.1,
    SHARD_BASE: 1,
    SHARD_GROWTH: 1.55,
    COST_RATE: 1.15,
    OFFLINE_CAP: 86400,
  };

  // ------------------------------------------------------------------ evolution forms
  // col/row place each form on the tree like the reference chart.
  // fx: tap / dps / gold / xp multipliers, crit chance + crit multiplier, boss (+seconds),
  //     raid (+seconds), offline multiplier, hp (adventurer HP multiplier).
  const FORMS = [
    { id: 'goblin', name: 'Goblin', fam: 'goblin', cr: '1/4', tier: 0, parents: [], col: 1, row: 0,
      fx: {}, perk: 'A starter-zone mob. Weak, but unlike the others, you can think.',
      look: { h: 11, skin: '#7FA650', ears: 3, weapon: 'club' } },
    { id: 'nilbog', name: 'Nilbog', fam: 'goblin', cr: '1', tier: 1, parents: ['goblin'], col: 0, row: 0,
      fx: { crit: 0.2, critX: 5, gold: 1.3 }, perk: 'Topsy-turvy luck: 20% of taps hit five times as hard, and adventurers drop 30% more shinies.',
      look: { h: 12, skin: '#8DB85A', ears: 3, hat: 'jester', weapon: 'club' } },
    { id: 'mephit', name: 'Mephit', fam: 'goblin', cr: '1/4–1/2', tier: 1, parents: ['goblin'], col: 0, row: 1,
      fx: { tap: 2, xp: 1.5 }, perk: 'Elemental burst: taps hit twice as hard and you gain 50% more XP.',
      look: { h: 11, skin: '#E0794A', ears: 2, wings: '#F2B05E', weapon: 'none', glow: '#FFD27A' } },
    { id: 'boss', name: 'Goblin Boss', fam: 'goblin', cr: '1', tier: 1, parents: ['goblin', 'nilbog'], col: 1, row: 1,
      fx: { dps: 2 }, perk: 'Boss of the warband: your warband fights twice as hard.',
      look: { h: 13, skin: '#79A048', ears: 3, hat: 'crown', weapon: 'sword', armor: '#6E5A44' } },
    { id: 'barghest', name: 'Barghest', fam: 'goblin', cr: '4', tier: 2, parents: ['boss'], col: 1, row: 2,
      fx: { tap: 2.5, xp: 2.5 }, perk: 'Soul devourer: taps ×2.5 and XP ×2.5. Barghests never evolve further.',
      look: { h: 13, skin: '#6A6472', ears: 4, beast: true, glow: '#FF7A3D', weapon: 'claws' } },

    { id: 'bugbear', name: 'Bugbear', fam: 'bugbear', cr: '1', tier: 2, parents: ['boss'], col: 2, row: 0,
      fx: { tap: 3, crit: 0.1, critX: 5 }, perk: 'Ambusher: taps ×3, and 10% of taps hit five times as hard.',
      look: { h: 16, skin: '#9C7A4E', fur: '#7A5A36', ears: 2, weapon: 'morningstar' } },
    { id: 'bugchief', name: 'Bugbear Chief', fam: 'bugbear', cr: '3', tier: 3, parents: ['bugbear'], col: 3, row: 0,
      fx: { tap: 2.5, dps: 1.5, crit: 0.1, critX: 5 }, perk: 'Chief of the ambush: taps ×2.5, warband ×1.5, 10% crits.',
      look: { h: 17, skin: '#9C7A4E', fur: '#6B4A2A', ears: 2, hat: 'headdress', weapon: 'morningstar' } },
    { id: 'yeti', name: 'Yeti', fam: 'bugbear', cr: '3', tier: 4, parents: ['bugchief'], col: 4, row: 0,
      fx: { tap: 3, boss: 10, crit: 0.1, critX: 5 }, perk: 'Freezing breath: taps ×3, and raid leaders give you 10 extra seconds.',
      req: { region: 5 }, look: { h: 19, skin: '#B8C8D8', fur: '#E8EEF2', ears: 0, weapon: 'claws', glow: '#9FE6FF' } },
    { id: 'abominable', name: 'Abominable Yeti', fam: 'bugbear', cr: '9', tier: 5, parents: ['yeti'], col: 5, row: 0,
      fx: { tap: 5, boss: 15, crit: 0.15, critX: 6 }, perk: 'Avalanche: taps ×5, 15 extra seconds against raid leaders, 15% crits.',
      req: { region: 5 }, look: { h: 22, skin: '#A8BCD0', fur: '#F4F8FA', ears: 0, weapon: 'claws', glow: '#6FD3FF', horns: 1 } },

    { id: 'hobgoblin', name: 'Hobgoblin', fam: 'hob', cr: '1/2', tier: 2, parents: ['boss'], col: 2, row: 1,
      fx: { dps: 2.5 }, perk: 'Drillmaster: your warband fights 2.5× as hard.',
      look: { h: 15, skin: '#D2793F', ears: 2, armor: '#5B3A2A', weapon: 'sword' } },
    { id: 'hobcaptain', name: 'Hob Captain', fam: 'hob', cr: '3', tier: 3, parents: ['hobgoblin'], col: 3, row: 1,
      fx: { dps: 3.5 }, perk: 'Captain: your warband fights 3.5× as hard.',
      req: { unit: [0, 50] }, look: { h: 16, skin: '#CF6E35', ears: 2, armor: '#7A2E24', hat: 'plume', weapon: 'sword' } },
    { id: 'warlord', name: 'Hob Warlord', fam: 'hob', cr: '6', tier: 4, parents: ['hobcaptain'], col: 5, row: 1,
      fx: { dps: 7, raid: 15 }, perk: 'Warlord: your warband fights 7× as hard and holds raids 15 seconds longer.',
      look: { h: 18, skin: '#C9652F', ears: 2, armor: '#3F2A2A', hat: 'hornhelm', weapon: 'axe', cape: '#8E2B2B' } },
    { id: 'ironshadow', name: 'Hob Iron Shadow', fam: 'hob', cr: '2', tier: 3, parents: ['hobgoblin'], col: 4, row: 1.5,
      fx: { crit: 0.3, critX: 8, gold: 1.5 }, perk: 'Shadow strike: 30% of taps hit eight times as hard, and 50% more shinies.',
      look: { h: 15, skin: '#B8603A', ears: 2, hood: '#2A2630', weapon: 'dagger', glow: '#B58CFF' } },
    { id: 'devastator', name: 'Hob Devastator', fam: 'hob', cr: '4', tier: 3, parents: ['hobgoblin'], col: 3, row: 2,
      fx: { tap: 2, dps: 2.5 }, perk: 'Battle mage: taps ×2 and warband ×2.5.',
      req: { unit: [5, 25] }, look: { h: 15, skin: '#D2793F', ears: 2, robe: '#3B3F7A', weapon: 'staff', glow: '#FF8A3D' } },

    { id: 'orc', name: 'Orc', fam: 'orc', cr: '1/2', tier: 2, parents: ['boss'], col: 2, row: 2,
      fx: { tap: 2, dps: 1.5 }, perk: 'Raider: taps ×2 and warband ×1.5.',
      look: { h: 15, skin: '#7E8F5A', ears: 2, tusks: true, weapon: 'axe' } },
    { id: 'nurtured', name: 'Nurtured One', fam: 'orc', cr: '1/2', tier: 3, parents: ['orc'], col: 0, row: 3,
      fx: { hp: 0.8, xp: 1.5 }, perk: 'Plague-bearer: adventurers arrive with 20% less health, and you gain 50% more XP.',
      look: { h: 15, skin: '#9AA67A', ears: 2, tusks: true, weapon: 'claws', pox: '#C8D45A' } },
    { id: 'orog', name: 'Orog', fam: 'orc', cr: '2', tier: 3, parents: ['orc'], col: 1, row: 3,
      fx: { tap: 2.5, dps: 1.75 }, perk: 'Deep-dweller: taps ×2.5 and warband ×1.75.',
      look: { h: 17, skin: '#5E6E45', ears: 2, tusks: true, armor: '#3A3A44', weapon: 'axe' } },
    { id: 'eye', name: 'Eye of Gruumsh', fam: 'orc', cr: '2', tier: 3, parents: ['orc'], col: 2, row: 3,
      fx: { tap: 2, xp: 2 }, perk: 'Zealot: taps ×2 and double XP.',
      look: { h: 16, skin: '#7E8F5A', ears: 2, tusks: true, eyepatch: true, weapon: 'spear', glow: '#FF4F4F' } },
    { id: 'hand', name: 'Hand of Yurtrus', fam: 'orc', cr: '2', tier: 4, parents: ['orog', 'nurtured'], dashed: ['nurtured'], col: 0, row: 4,
      fx: { hp: 0.65, dps: 2 }, perk: 'Touch of rot: adventurers arrive with 35% less health, and your warband fights twice as hard.',
      req: { region: 4 }, look: { h: 16, skin: '#C9C2A8', ears: 2, tusks: true, robe: '#E8E2D0', weapon: 'claws', glow: '#B6FF8A' } },
    { id: 'claw', name: 'Claw of Luthic', fam: 'orc', cr: '2', tier: 4, parents: ['orog'], col: 1, row: 4,
      fx: { offline: 2, dps: 2, raid: 10 }, perk: 'Cave mother’s blessing: double earnings while you’re away, warband ×2, raids last 10 seconds longer.',
      look: { h: 16, skin: '#7A8656', ears: 2, tusks: true, robe: '#5A3F2E', weapon: 'claws', glow: '#E8C46A' } },
    { id: 'redfang', name: 'Red Fang', fam: 'orc', cr: '3', tier: 4, parents: ['eye'], col: 2, row: 4,
      fx: { offline: 3, gold: 2, crit: 0.15, critX: 5 }, perk: 'Night hunter: triple earnings while you’re away, double shinies, 15% crits.',
      look: { h: 16, skin: '#5B5E4A', ears: 2, tusks: true, hood: '#3A1418', weapon: 'dagger', glow: '#FF3B3B' } },
    { id: 'blade', name: 'Blade of Ilneval', fam: 'orc', cr: '4', tier: 4, parents: ['eye'], col: 3, row: 3,
      fx: { tap: 3, crit: 0.15, critX: 5 }, perk: 'Warblade: taps ×3 and 15% crits.',
      look: { h: 17, skin: '#7E8F5A', ears: 2, tusks: true, armor: '#4A4A52', weapon: 'greatsword' } },
    { id: 'warchief', name: 'Orc War Chief', fam: 'orc', cr: '4', tier: 5, parents: ['blade'], col: 4, row: 3,
      fx: { dps: 5, tap: 2 }, perk: 'Warchief: your warband fights 5× as hard, taps ×2.',
      req: { goblins: 400 }, look: { h: 19, skin: '#738450', ears: 2, tusks: true, armor: '#5A2A22', hat: 'hornhelm', weapon: 'axe', cape: '#2E2E2E' } },
    { id: 'tanarukk', name: 'Tanarukk', fam: 'orc', cr: '5', tier: 6, parents: ['warchief'], col: 5, row: 3,
      fx: { tap: 5, dps: 3 }, perk: 'Demon-blooded rage: taps ×5 and warband ×3.',
      req: { region: 6 }, look: { h: 20, skin: '#A8423A', ears: 2, tusks: true, horns: 2, weapon: 'greataxe', glow: '#FFB23D' } },

    { id: 'ogre', name: 'Ogre', fam: 'ogre', cr: '2', tier: 5, parents: ['claw'], col: 1, row: 5,
      fx: { tap: 4, dps: 1.5 }, perk: 'Huge: taps ×4 and warband ×1.5.',
      look: { h: 22, skin: '#C9A27A', ears: 1, belly: true, weapon: 'greatclub' } },
    { id: 'chainbrute', name: 'Ogre Chain Brute', fam: 'ogre', cr: '3', tier: 6, parents: ['ogre'], col: 2, row: 5,
      fx: { tap: 6, dps: 2, boss: 10 }, perk: 'Chain sweep: taps ×6, warband ×2, 10 extra seconds against raid leaders.',
      look: { h: 23, skin: '#C29A70', ears: 1, belly: true, armor: '#5C5C66', weapon: 'chain' } },
    { id: 'oni', name: 'Oni', fam: 'oni', cr: '7', tier: 6, parents: ['ogre'], col: 1, row: 6,
      fx: { gold: 3, dps: 3, tap: 2 }, perk: 'Shapeshifter: triple shinies, warband ×3, taps ×2.',
      req: { region: 8 }, look: { h: 22, skin: '#5A86C9', ears: 1, horns: 1, robe: '#2B2B48', weapon: 'glaive', glow: '#9FD8FF' } },

    { id: 'troll', name: 'Troll', fam: 'troll', cr: '5', tier: 5, parents: ['orog'], dashed: ['orog'], col: 4, row: 4, secret: true,
      fx: { offline: 2, dps: 2.5, tap: 2.5 }, perk: 'Regeneration: taps ×2.5, warband ×2.5, double earnings while you’re away.',
      req: { region: 3 }, look: { h: 21, skin: '#5F8A4A', ears: 2, nose: true, weapon: 'claws', lanky: true } },
    { id: 'diretroll', name: 'Dire Troll', fam: 'troll', cr: '13', tier: 6, parents: ['troll'], col: 4, row: 5, secret: true,
      fx: { tap: 4, dps: 4, offline: 2 }, perk: 'Unkillable: taps ×4, warband ×4, double earnings while you’re away.',
      req: { region: 7 }, look: { h: 24, skin: '#4A7240', ears: 2, nose: true, weapon: 'claws', lanky: true, tusks: true } },
  ];
  const FORM = {};
  FORMS.forEach((f) => { FORM[f.id] = f; f.children = []; });
  FORMS.forEach((f) => f.parents.forEach((p) => FORM[p].children.push(f.id)));
  const MAX_LV = [10, 15, 20, 25, 30, 35, 40];
  FORMS.forEach((f) => { f.final = f.children.length === 0; f.maxLv = f.final ? Infinity : MAX_LV[f.tier]; });

  const FAMILY = {
    goblin: { name: 'Goblin', color: '#9BC46A' },
    bugbear: { name: 'Bugbear', color: '#8FB0DA' },
    hob: { name: 'Hobgoblin', color: '#E0898A' },
    orc: { name: 'Orc', color: '#C9BD8F' },
    ogre: { name: 'Ogre', color: '#A8A8A8' },
    oni: { name: 'Oni', color: '#6FC9EC' },
    troll: { name: 'Troll', color: '#6E9A45' },
  };

  // ------------------------------------------------------------------ world
  const REGIONS = [
    { name: 'Mudhollow', sub: 'Starter zone. Your village.', boss: 'GobboFarmer99', guild: 'XP Farmers', bossCls: 'warrior',
      sky: ['#2B3A4A', '#5E7A86'], hills: '#33452E', ground: '#4A3B28', fx: 'fireflies' },
    { name: 'Whisperwood', sub: 'Old forest on the starter road.', boss: 'Ranger_Elowen', guild: 'Leaf Wardens', bossCls: 'ranger',
      sky: ['#1E2E28', '#3F6050'], hills: '#1F3A26', ground: '#33402A', fx: 'leaves' },
    { name: 'Brightvale Farms', sub: 'Human farmland and its militia.', boss: 'Captain Harrow', guild: 'Brightvale Militia', bossCls: 'warrior', npc: true,
      sky: ['#4A5E86', '#C9A97A'], hills: '#5E7340', ground: '#6A5332', fx: 'none' },
    { name: 'Bogmire Fens', sub: 'Swamp. Something regenerates here.', boss: 'SwampDaddy', guild: 'Bog Lords', bossCls: 'cleric',
      sky: ['#1E2A26', '#4A5A44'], hills: '#2A3A2C', ground: '#2E3A28', fx: 'rain' },
    { name: 'Hollow Catacombs', sub: 'Undead dungeon, popular with grinders.', boss: 'Necro_Nate', guild: 'Grave Shift', bossCls: 'mage',
      sky: ['#14121C', '#2E2840'], hills: '#211D2C', ground: '#2A2630', fx: 'wisps' },
    { name: 'Frostfang Peaks', sub: 'Snowfields. Yetis were spotted once.', boss: 'Brrrian', guild: 'Frostbite', bossCls: 'warrior',
      sky: ['#5A7090', '#C8D8E6'], hills: '#9AB0C4', ground: '#DCE6EE', fx: 'snow' },
    { name: 'Ashen Wastes', sub: 'Volcanic badlands. Demons nearby.', boss: 'Pyre_Queen', guild: 'Cinder Pact', bossCls: 'mage',
      sky: ['#2A1414', '#7A3A22'], hills: '#3A1E18', ground: '#3E2A22', fx: 'ash' },
    { name: 'Highmoor Keep', sub: 'A royal fortress and its knights.', boss: 'Lord Castellan Vey', guild: 'Highmoor Guard', bossCls: 'warrior', npc: true,
      sky: ['#3A4256', '#8A8FA0'], hills: '#4A4F5E', ground: '#5A5550', fx: 'none' },
    { name: 'Port Kingsreach', sub: 'The capital. Full of players.', boss: 'KingOfKingsreach', guild: 'Crown Traders', bossCls: 'rogue',
      sky: ['#1E2C4A', '#5A7AA0'], hills: '#2C3A52', ground: '#4E4A44', fx: 'none' },
    { name: 'Sky Citadel', sub: 'Floating fortress of the paladin order.', boss: 'Seraphine', guild: 'Silver Wing', bossCls: 'cleric',
      sky: ['#6A8AC0', '#E6D6B8'], hills: '#B8C4DA', ground: '#D6D0C0', fx: 'none' },
    { name: 'Hall of Eternal Dawn', sub: 'Headquarters of the #1 ranked guild.', boss: 'Valkor', guild: 'Eternal Dawn', bossCls: 'warrior',
      sky: ['#3A2A1A', '#C08A3A'], hills: '#4A3A28', ground: '#5A4A36', fx: 'none' },
    { name: 'The Admin Spire', sub: 'Where the Game Masters watch everything.', boss: 'GM_Aldric', guild: 'Game Master', bossCls: 'gm',
      sky: ['#0A0E1A', '#1A2A4A'], hills: '#101830', ground: '#1A2234', fx: 'glitch' },
  ];
  const FINAL_REGION = REGIONS.length - 1;
  function region(r) {
    if (r < REGIONS.length) return REGIONS[r];
    const n = r - FINAL_REGION;
    return { name: `Uncharted Shard ${n}`, sub: 'A server shard the admins never finished.', boss: `PATCH_${String(600 + n * 7)}`, guild: 'Unknown', bossCls: 'gm',
      sky: ['#120A1A', '#3A1A4A'], hills: '#241430', ground: '#2A1E34', fx: 'glitch' };
  }

  // ------------------------------------------------------------------ village
  const UNITS = [
    { name: 'Pointy-Stick Goblins', one: 'Pointy-stick goblin', blurb: 'A goblin and a sharpened stick. The classics.' },
    { name: 'Rock Slingers', one: 'Rock slinger', blurb: 'Rocks are free. Accuracy is optional.' },
    { name: 'Spike Trappers', one: 'Spike trapper', blurb: 'Pit traps along every path into Mudhollow.' },
    { name: 'Wolf Riders', one: 'Wolf rider', blurb: 'Fast, bitey, and very hard to kite.' },
    { name: 'Boom Barrel Crews', one: 'Boom barrel crew', blurb: 'Roll barrel. Light fuse. Run.' },
    { name: 'Goblin Shamans', one: 'Goblin shaman', blurb: 'Mushroom smoke and real hexes.' },
    { name: 'Scrap Catapults', one: 'Scrap catapult', blurb: 'Built from looted player gear. Flings more of it.' },
    { name: 'Defector Players', one: 'Defector player', blurb: 'Players who switched sides. They respawn, too.' },
    { name: 'Gyro-Gobblers', one: 'Gyro-gobbler', blurb: 'Flying contraptions. Mostly flying.' },
    { name: 'Glitch Swarms', one: 'Glitch swarm', blurb: 'Your corruption, spreading on purpose.' },
    { name: 'Wyvern Riders', one: 'Wyvern rider', blurb: 'Someone finally tamed a raid mount.' },
    { name: 'Exploit Engines', one: 'Exploit engine', blurb: 'Machines that run on unpatched bugs.' },
  ];
  const UNIT_UP_NAMES = [
    ['Fire-hardened tips', 'Longer sticks', 'Stick formation'],
    ['Pointier rocks', 'Double slings', 'Rock quarry'],
    ['Rusty spikes', 'Hidden pits', 'Spike gardens'],
    ['Bigger wolves', 'Pack howl', 'Dire wolves'],
    ['Shorter fuses', 'Barrel chains', 'Nitro mushrooms'],
    ['Stronger mushrooms', 'Hex circles', 'Spirit drums'],
    ['Counterweights', 'Flaming scrap', 'Siege row'],
    ['Goblin tabards', 'Shared respawn point', 'Guild charter'],
    ['Pedal power', 'Bomb bays', 'Sky squadron'],
    ['Packet loss', 'Desync storms', 'Memory leak'],
    ['Wyvern saddles', 'Venom tails', 'Brood mothers'],
    ['Infinite loops', 'Overflow cannons', 'Zero-day core'],
  ];
  const UP_REQ = [10, 25, 50];
  const UP_COST = [12, 90, 700];

  // General upgrades unlock at an adventurer stage; cost = kills at that stage × weight.
  const UP_DEFS = [
    ['t1', 'Sharpened bone', 'Your taps hit twice as hard.', { stage: 2 }, { t: 'tap', m: 2 }, 0.5],
    ['t2', 'Rusty shiv', 'Your taps hit twice as hard.', { stage: 6 }, { t: 'tap', m: 2 }, 1],
    ['t3', 'Pack tactics', 'Each tap also deals 1% of your warband’s damage per second.', { stage: 12 }, { t: 'tapPct', p: 0.01 }, 1],
    ['t4', 'Dirty fighting', 'Taps deal another 2% of your warband’s damage per second.', { stage: 28 }, { t: 'tapPct', p: 0.02 }, 1],
    ['t5', 'Glitch strike', 'Taps deal another 3% of your warband’s damage per second.', { stage: 48 }, { t: 'tapPct', p: 0.03 }, 1],
    ['t6', 'Hitbox exploit', 'Taps deal another 4% of your warband’s damage per second.', { stage: 75 }, { t: 'tapPct', p: 0.04 }, 1],
    ['g1', 'War drums', 'Your whole warband fights 50% harder.', { stage: 9 }, { t: 'dps', m: 1.5 }, 1],
    ['g2', 'Mud fort pride', 'Your whole warband fights twice as hard.', { stage: 22 }, { t: 'dps', m: 2 }, 1],
    ['g3', 'Goblin anthem', 'Your whole warband fights twice as hard.', { stage: 40 }, { t: 'dps', m: 2 }, 1],
    ['g4', 'Haven banners', 'Your whole warband fights twice as hard.', { stage: 60 }, { t: 'dps', m: 2 }, 1],
    ['g5', 'Unpatched fury', 'Your whole warband fights three times as hard.', { stage: 85 }, { t: 'dps', m: 3 }, 1],
    ['g6', 'World-eater war band', 'Your whole warband fights three times as hard.', { stage: 105 }, { t: 'dps', m: 3 }, 1],
    ['s1', 'Shiny sniffers', 'Adventurers drop 50% more shinies.', { stage: 8 }, { t: 'gold', m: 1.5 }, 1],
    ['s2', 'Pickpockets', 'Adventurers drop 50% more shinies.', { stage: 20 }, { t: 'gold', m: 1.5 }, 1],
    ['s3', 'Rigged loot tables', 'Adventurers drop twice as many shinies.', { stage: 38 }, { t: 'gold', m: 2 }, 1],
    ['s4', 'Duplication glitch', 'Adventurers drop twice as many shinies.', { stage: 64 }, { t: 'gold', m: 2 }, 1],
    ['x1', 'Grudge journal', 'You gain 50% more XP.', { stage: 7 }, { t: 'xp', m: 1.5 }, 0.5],
    ['x2', 'Elder’s stories', 'You gain twice as much XP.', { stage: 24 }, { t: 'xp', m: 2 }, 1],
    ['x3', 'Speedrun notes', 'You gain twice as much XP.', { stage: 46 }, { t: 'xp', m: 2 }, 1],
    ['d1', 'Mud palisade', 'Raids give you 10 more seconds to fight back.', { region: 0 }, { t: 'raid', s: 10 }, 0.5],
    ['d2', 'Hidden hoard', 'Raiders who win steal half as much.', { region: 1 }, { t: 'hoard' }, 0.5],
    ['d3', 'Watchtower', 'Raids give you 10 more seconds to fight back.', { region: 3 }, { t: 'raid', s: 10 }, 0.5],
    ['b1', 'Taunting banner', 'Raid leaders give you 5 more seconds.', { region: 0 }, { t: 'boss', s: 5 }, 0.5],
    ['b2', 'Ambush tunnels', 'Raid leaders give you 5 more seconds.', { region: 4 }, { t: 'boss', s: 5 }, 0.5],
    ['o1', 'Night shift', 'Your warband earns twice as much while you’re away.', { region: 2 }, { t: 'offline', m: 2 }, 0.5],
  ];

  let UPGRADES = [];
  // Costs follow the adventurer curve, so they stay meaningful if the tuning changes.
  function rebuild() {
    const nice = (x) => { const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
    UNITS.forEach((u, i) => {
      u.cost = i === 0 ? 15 : nice(goldAt(10 * i) * K.UNIT_KILLS);
      u.dps = i === 0 ? 1 : nice(u.cost * K.UNIT_EFF0 * Math.pow(K.UNIT_EFF, i));
    });
    const list = [];
    UNITS.forEach((u, i) => {
      UP_REQ.forEach((n, k) => {
        list.push({ id: `u${i}_${k}`, name: UNIT_UP_NAMES[i][k], desc: `${u.name} hit twice as hard.`,
          cost: nice(u.cost * UP_COST[k]), req: { unit: [i, n] }, fx: { t: 'unit', i, m: 2 } });
      });
    });
    for (const [id, name, desc, req, fx, w] of UP_DEFS) {
      const st = req.stage != null ? req.stage : req.region * 10 + 10;
      list.push({ id, name, desc, cost: nice(goldAt(st) * K.UP_KILLS * w), req, fx });
    }
    list.sort((a, b) => a.cost - b.cost);
    UPGRADES.length = 0;
    list.forEach((u) => UPGRADES.push(u));
    api.UPGRADES = UPGRADES;
  }

  // ------------------------------------------------------------------ math
  const stageOf = (r, k) => r * 10 + Math.min(9, k);
  const hp = (s) => K.HP_BASE * Math.pow(K.HP_GROWTH, s);
  const goldAt = (s) => hp(s) * K.GOLD_RATIO;
  const xpAt = (s) => K.XP_BASE * Math.pow(K.XP_GROWTH, s);
  const xpNeed = (tier, lv) => K.NEED_BASE * Math.pow(K.NEED_TIER, tier) * Math.pow(K.NEED_LEVEL, lv - 1);

  // ×2 at 25, 50 and 100 owned, then at every further 100.
  function milestones(n) {
    let m = 0;
    if (n >= 25) m++;
    if (n >= 50) m++;
    if (n >= 100) m += Math.floor(n / 100);
    return m;
  }
  // Each ×2 checkpoint is also a rank, and each rank has its own look.
  const RANKS = [
    { name: 'Recruits', at: 0, color: '#B9AE98' },
    { name: 'Regulars', at: 25, color: '#EFE6D2' },
    { name: 'Veterans', at: 50, color: '#9BC46A' },
    { name: 'Elites', at: 100, color: '#7FE0F5' },
    { name: 'Champions', at: 200, color: '#F2C14E' },
    { name: 'Legends', at: 300, color: '#FF4F8B' },
  ];
  const rankOf = (n) => Math.min(RANKS.length - 1, milestones(n));
  function rankName(n) {
    const m = milestones(n), r = rankOf(n);
    return m > r ? `${RANKS[r].name} +${m - r}` : RANKS[r].name;
  }
  function nextMilestone(n) {
    if (n < 25) return 25;
    if (n < 50) return 50;
    return 100 * (Math.floor(n / 100) + 1);
  }
  const unitCost = (i, owned) => UNITS[i].cost * Math.pow(K.COST_RATE, owned);
  const costFor = (i, owned, k) => unitCost(i, owned) * (Math.pow(K.COST_RATE, k) - 1) / (K.COST_RATE - 1);
  function maxAfford(i, owned, money) {
    const c = unitCost(i, owned);
    if (money < c) return 0;
    let k = Math.floor(Math.log(money * (K.COST_RATE - 1) / c + 1) / Math.log(K.COST_RATE));
    while (k > 1 && costFor(i, owned, k) > money) k--;
    return Math.max(1, k);
  }

  function goblinCount(S) { let t = 0; for (const n of S.owned) t += n; return t; }

  function reqMet(req, S) {
    if (!req) return true;
    if (req.region != null && S.conquered <= req.region) return false;
    if (req.unit && S.owned[req.unit[0]] < req.unit[1]) return false;
    if (req.goblins && goblinCount(S) < req.goblins) return false;
    if (req.stage != null && S.best < req.stage) return false;
    return true;
  }
  function reqText(req) {
    if (!req) return '';
    const parts = [];
    if (req.region != null) parts.push(`conquer ${REGIONS[req.region].name}`);
    if (req.unit) parts.push(`have ${req.unit[1]} ${UNITS[req.unit[0]].name}`);
    if (req.goblins) parts.push(`have ${req.goblins} goblins in your warband`);
    if (req.stage != null) parts.push(`reach adventurer level ${req.stage + 1}`);
    return parts.join(' and ');
  }

  function shardsFor(conquered) {
    let s = 0;
    for (let r = 0; r < conquered; r++) s += Math.floor(K.SHARD_BASE * Math.pow(K.SHARD_GROWTH, r));
    return s;
  }
  const ROLLBACK_AT = 3; // regions conquered before a rollback is offered
  // Root access (from server wipes) makes each piece of corrupted data count for more, and rollbacks give more of it.
  const rootAccess = (S) => (S && S.meta && S.meta.ra) || 0;
  const shardPct = (S) => K.SHARD_BONUS * (1 + rootAccess(S));
  const runGain = (S, conquered) => Math.floor(shardsFor(conquered) * (1 + 0.25 * rootAccess(S)));

  // Everything that depends on purchases, form and level. Recompute after any change.
  function derive(S) {
    const unitMult = UNITS.map(() => 1);
    let tapM = 1, tapPct = 0, dpsM = 1, goldM = 1, xpM = 1, raidS = 0, bossS = 0, offM = 1, hoard = 1;
    for (const u of UPGRADES) {
      if (!S.ups[u.id]) continue;
      const f = u.fx;
      if (f.t === 'unit') unitMult[f.i] *= f.m;
      else if (f.t === 'tap') tapM *= f.m;
      else if (f.t === 'tapPct') tapPct += f.p;
      else if (f.t === 'dps') dpsM *= f.m;
      else if (f.t === 'gold') goldM *= f.m;
      else if (f.t === 'xp') xpM *= f.m;
      else if (f.t === 'raid') raidS += f.s;
      else if (f.t === 'boss') bossS += f.s;
      else if (f.t === 'offline') offM *= f.m;
      else if (f.t === 'hoard') hoard = 0.5;
    }
    // the town: technology, buildings, guards and how happy everyone is
    const TF = api.Town && S.town && S.challenge !== 'lockout' ? api.Town.fx(S) : null; // Town Lockout: the town can't help
    if (TF) { dpsM *= TF.warband; tapM *= TF.tap; goldM *= TF.gold; xpM *= TF.xp; bossS += TF.boss; offM *= TF.offline; }
    // exploits, feats and anything else that lasts between runs
    const MF = api.Meta && S.meta ? api.Meta.fx(S) : null;
    if (MF) { dpsM *= MF.warband; tapM *= MF.tap; goldM *= MF.gold; xpM *= MF.xp; bossS += MF.boss; offM *= MF.offline; }
    const form = FORM[S.form];
    const fx = form.fx;
    const codex = Object.keys(S.codex).length;
    const all = (1 + K.CODEX_BONUS * codex) * (1 + shardPct(S) * S.shards) * (TF ? TF.all : 1) * (MF ? MF.all : 1);
    const haven = 1 + K.HAVEN * S.conquered; // tribute from conquered regions

    const command = Math.pow(K.DPS_TIER, form.tier) * (fx.dps || 1) * (1 + K.DPS_LEVEL * (S.level - 1));
    const unitDps = UNITS.map((u, i) => u.dps * unitMult[i] * Math.pow(2, milestones(S.owned[i])) * dpsM * command * all);
    let dps = 0;
    for (let i = 0; i < UNITS.length; i++) dps += S.owned[i] * unitDps[i];

    const heroTap = K.TAP_BASE * Math.pow(K.TAP_TIER, form.tier) * (1 + K.TAP_LEVEL * (S.level - 1)) * (fx.tap || 1) * tapM * all;

    const crit = Math.min(0.9, (fx.crit || 0) + (MF ? MF.crit : 0));
    return {
      unitDps, dps, heroTap, tapPct,
      crit, critX: crit > 0 ? Math.max(fx.critX || 1, 3) : 1,
      rallyTime: 60 + (MF ? MF.rally : 0),
      raidGoldM: MF ? MF.raidGold : 1,
      goldM: goldM * (fx.gold || 1) * all * haven,
      xpM: xpM * (fx.xp || 1),
      hpM: fx.hp || 1,
      bossTime: K.BOSS_TIME + bossS + (fx.boss || 0),
      raidTime: K.RAID_TIME + raidS + (fx.raid || 0),
      raidSteal: K.RAID_STEAL * hoard * (TF ? TF.steal : 1),
      offM: offM * (fx.offline || 1),
      offCap: K.OFFLINE_CAP * (TF ? TF.offCap : 1) + (MF ? MF.offCap : 0),
      guardFight: TF ? TF.guardFight : 1,
      all, codex, command,
    };
  }
  // Average damage of one tap, with crits folded in (used by the simulator and stats).
  function tapAvg(D) {
    const base = D.heroTap + D.dps * D.tapPct;
    return base * (1 + D.crit * (D.critX - 1));
  }

  function fresh(now) {
    now = now || Date.now();
    return {
      v: 1, name: '', introDone: false,
      gold: 0, goldRun: 0, goldEver: 0,
      region: 0, threat: 0, conquered: 0, best: 0, bestRegionEver: 0,
      form: 'goblin', level: 1, xp: 0,
      owned: UNITS.map(() => 0), ups: {},
      codex: { goblin: 1 }, shards: 0, rollbacks: 0, won: false,
      kills: 0, killsEver: 0, taps: 0, raidsWon: 0, raidsLost: 0, played: 0,
      autoBoss: true, vibrate: true, buyMode: 1, tab: 'hero',
      nextRaid: now + 6 * 60e3, saved: now, started: now,
      town: api.Town ? api.Town.freshTown() : null,
      meta: api.Meta ? api.Meta.freshMeta() : null,
      runStart: now, runConq0: 0, regionAt: [], rbCancel: 0,
      tricks: {}, challenge: null,
    };
  }

  const api = { K, FORMS, FORM, FAMILY, REGIONS, FINAL_REGION, region, UNITS, UPGRADES, UP_REQ,
    stageOf, hp, goldAt, xpAt, xpNeed, milestones, nextMilestone, RANKS, rankOf, rankName, unitCost, costFor, maxAfford,
    goblinCount, reqMet, reqText, shardsFor, shardPct, runGain, ROLLBACK_AT, derive, tapAvg, fresh, rebuild };
  rebuild();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GH = api;
})(typeof window !== 'undefined' ? window : globalThis);
