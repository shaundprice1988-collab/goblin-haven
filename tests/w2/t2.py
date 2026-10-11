import json, sys
from playwright.sync_api import sync_playwright
import os; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots') + os.sep
UA='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
PORT=sys.argv[1] if len(sys.argv)>1 else '8770'
def closeaway(pg):
    if pg.evaluate("document.querySelector('#awayDlg').open"): pg.locator('#awayOk').tap(); pg.wait_for_timeout(250)
def clear(pg):
    pg.evaluate("(()=>{const A=__gh.App; A.setFight(null); A.setEnemy(null); A.spawnAt(0);})()")
def wait_enemy(pg, ms=1500):
    pg.wait_for_timeout(ms)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':393,'height':851}, device_scale_factor=2.75, is_mobile=True, has_touch=True, user_agent=UA)
    pg=ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.goto(f'http://localhost:{PORT}/'); pg.wait_for_timeout(800)
    old = {"v":1,"name":"Shaun","introDone":True,"gold":5e9,"goldRun":8e9,"goldEver":3e10,"region":5,"threat":6,"conquered":5,"best":56,"bestRegionEver":6,
           "form":"orc","level":12,"xp":0,"owned":[300,300,200,200,100,100,50,25,0,0,0,0],"ups":{"t1":1,"t2":1,"g1":1},"codex":{"goblin":1,"boss":1,"orc":1},
           "shards":20,"rollbacks":5,"won":False,"kills":500,"killsEver":4200,"taps":2300,"raidsWon":14,"raidsLost":2,"played":20000,"autoBoss":False,"vibrate":False,
           "buyMode":1,"tab":"hero","nextRaid":9e15,"saved":0,"started":1.7e12,
           "meta":{"ep":10,"feats":{"k1":1},"runs":[],"bots":{"recruit":False}}}
    pg.evaluate("s=>{__gh.App.S = __gh.App.parseSave(JSON.stringify(Object.assign(s,{saved:Date.now()-5000}))); localStorage.setItem('goblinhaven.save.v1', JSON.stringify(__gh.App.S)); window.addEventListener('pagehide', e=>e.stopImmediatePropagation(), true); }", old)
    pg.reload(); pg.wait_for_timeout(2500); closeaway(pg); pg.wait_for_timeout(3000)
    pg.evaluate("window.__auto=0; GH.on('tap',(d,c,a)=>{ if(a) window.__auto++; })")

    # 1) tricks
    clear(pg); wait_enemy(pg)
    hp0 = pg.evaluate("__gh.App.enemy && __gh.App.enemy.hp")
    pg.locator('#trickBar [data-trick="gank"]').tap(); pg.wait_for_timeout(150)
    print('gank: hp', hp0, '->', pg.evaluate("__gh.App.enemy && (__gh.App.enemy.dead ? 'dead' : __gh.App.enemy.hp)"), 'cd', pg.evaluate("Math.round((__gh.state.tricks.gank.ready-Date.now())/1000)"))
    d0 = pg.evaluate("__gh.App.dpsNow()")
    pg.locator('#trickBar [data-trick="zerg"]').tap(); pg.wait_for_timeout(100)
    print('zerg dps x', round(pg.evaluate("__gh.App.dpsNow()")/d0, 2))
    pg.locator('#trickBar [data-trick="ninja"]').tap(); pg.wait_for_timeout(100)
    print('ninja live', pg.evaluate("JSON.stringify(__gh.App.live())"))
    pg.locator('#trickBar [data-trick="macro"]').tap(); pg.wait_for_timeout(1200)
    print('macro auto taps in 1.2s', pg.evaluate("window.__auto"))
    pg.wait_for_timeout(600)
    pg.screenshot(path=OUT+'b_tricks.png', clip={'x':0,'y':0,'width':393,'height':400})
    print('trick feat', pg.evaluate("!!__gh.state.meta.feats.tr1"), 'count', pg.evaluate("__gh.state.meta.c.tricks"))

    # 2) raid parties
    seen = {}
    for i in range(14):
        clear(pg); pg.evaluate("__gh.App.raidNow()"); pg.wait_for_timeout(120)
        r = pg.evaluate("(()=>{const e=__gh.App.enemy, f=__gh.App.fight; return e&&e.raid ? {p:e.party, hp:+(e.hp/ (window.GH.hp(e.stage)*GH.K.RAID_HP*__gh.App.D.hpM)).toFixed(2), dur:f&&f.dur, g:e.goldM, guild:e.guild} : null})()")
        if r: seen.setdefault(r['p'], r)
        if i == 3: pg.wait_for_timeout(1000); pg.screenshot(path=OUT+'c_raid.png', clip={'x':0,'y':0,'width':393,'height':470})
    print('parties', json.dumps(seen))
    # win one raid to record the party
    pg.wait_for_timeout(900)
    pg.evaluate("(()=>{const e=__gh.App.enemy; if(e) __gh.App.hitEnemy(e.hp+1)})()"); pg.wait_for_timeout(200)
    print('parties won', pg.evaluate("JSON.stringify(__gh.state.meta.c.parties)"))

    # 3) mythic leader
    pg.evaluate("(()=>{const S=__gh.state; S.region=5; S.threat=10; S.autoBoss=true; S.meta.c.mythicSeen=0;})()")
    clear(pg); pg.wait_for_timeout(1400)
    m = pg.evaluate("(()=>{const e=__gh.App.enemy; return e ? {boss:!!e.boss, mythic:e.mythic, name:e.name, guild:e.guild, hpx: +(e.maxHp/(GH.hp(GH.stageOf(5,9))*GH.K.BOSS_HP*__gh.App.D.hpM)).toFixed(2), dur: __gh.App.fight && __gh.App.fight.dur} : null})()")
    print('mythic', m)
    pg.screenshot(path=OUT+'d_mythic.png', clip={'x':0,'y':0,'width':393,'height':470})
    sh0 = pg.evaluate("__gh.state.shards")
    pg.evaluate("(()=>{const e=__gh.App.enemy; __gh.App.hitEnemy(e.hp+1)})()"); pg.wait_for_timeout(300)
    print('mythic kill shards', sh0, '->', pg.evaluate("__gh.state.shards"), 'c.mythic', pg.evaluate("__gh.state.meta.c.mythic"), 'region', pg.evaluate("__gh.state.region"))
    pg.evaluate("__gh.state.autoBoss=false")

    # 4) whales: one escapes, one gets ganked
    pg.evaluate("GH.Play.debug.whale()"); clear(pg); pg.wait_for_timeout(400)
    print('whale', pg.evaluate("(()=>{const e=__gh.App.enemy, f=__gh.App.fight; return e ? {w:e.whale, name:e.name, kind:f&&f.kind, dur:f&&f.dur} : null})()"), pg.evaluate("document.querySelector('#rbSub').textContent"))
    pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+'e_whale.png', clip={'x':0,'y':0,'width':393,'height':470})
    pg.wait_for_timeout(6500)
    print('after escape: fight', pg.evaluate("__gh.App.fight"), 'whales', pg.evaluate("__gh.state.meta.c.whales"))
    pg.evaluate("__gh.state.tricks = {}")
    pg.evaluate("GH.Play.debug.whale()"); clear(pg); pg.wait_for_timeout(900)
    pg.evaluate("(()=>{const e=__gh.App.enemy; e.hp = e.maxHp = __gh.App.dpsNow()*20;})()")
    g0 = pg.evaluate("__gh.state.gold")
    pg.locator('#trickBar [data-trick="gank"]').tap(); pg.wait_for_timeout(300)
    print('whale ganked: whales', pg.evaluate("__gh.state.meta.c.whales"), 's_ks', pg.evaluate("!!__gh.state.meta.feats.s_ks"), 'gold +', pg.evaluate("__gh.state.gold") - g0)

    # 5) world chat and a whisper
    pg.evaluate("GH.Play.debug.chat()"); pg.wait_for_timeout(1300)
    print('chat', pg.evaluate("document.querySelector('#chat').innerText"))
    pg.evaluate("GH.Play.debug.whisper()"); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'f_whisper.png', clip={'x':0,'y':0,'width':393,'height':400})
    pg.locator('#chat .whisper').tap(); pg.wait_for_timeout(400)
    print('whisper log', pg.evaluate("Object.keys(__gh.state.meta.logs).filter(k=>k[0]==='w')"), 'story open', pg.evaluate("document.querySelector('#storyDlg').open"))
    pg.screenshot(path=OUT+'g_story.png')
    pg.locator('#storyDlg [data-close]').tap(); pg.wait_for_timeout(200)

    # 6) world tab: data logs
    pg.evaluate("__gh.setTab('world')"); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'h_world.png')
    pg.locator('#openData').tap(); pg.wait_for_timeout(300)
    pg.locator('#dataDlg details').first.locator('summary').tap(); pg.wait_for_timeout(200)
    pg.screenshot(path=OUT+'i_data.png')
    pg.locator('#dataDlg [data-close]').tap(); pg.wait_for_timeout(200)

    # 7) hardcore: Ironman
    pg.locator('#openHc').tap(); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'j_hc.png')
    pg.locator('#chDlg [data-enter="ironman"]').tap(); pg.wait_for_timeout(300)
    print('confirm', pg.evaluate("document.querySelector('#confirmBody').textContent")[:160], '|', pg.evaluate("document.querySelector('#confirmYes').textContent"))
    pg.locator('#confirmYes').tap(); pg.wait_for_timeout(600)
    st = pg.evaluate("(()=>{const S=__gh.state; return {ch:S.challenge, rb:S.rollbacks, conq:S.conquered, gold:S.gold, ups:Object.keys(S.ups).length, binds:S.meta.binds.length}})()")
    print('ironman start', st)
    pg.evaluate("__gh.state.gold = 1e30")
    print('upgrade blocked', pg.evaluate("__gh.App.buyUpgrade(GH.UPGRADES[0])"), pg.evaluate("document.querySelector('#chBadge').hidden"), pg.evaluate("document.querySelector('#chBadge').textContent"))
    pg.evaluate("__gh.setTab('ups')"); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'k_ironman_ups.png')
    slots0 = pg.evaluate("GH.Meta.bindSlots(__gh.state)")
    for i in range(4): pg.evaluate("__gh.App.conquer(null)"); pg.wait_for_timeout(80)
    pg.wait_for_timeout(1300)
    print('ironman after 4', pg.evaluate("JSON.stringify(__gh.state.meta.ch)"), 'slots', slots0, '->', pg.evaluate("GH.Meta.bindSlots(__gh.state)"), 'badge', pg.evaluate("document.querySelector('#chBadge').textContent"), 'hc1', pg.evaluate("!!__gh.state.meta.feats.hc1"))
    # 7b) pacifist
    pg.evaluate("__gh.setTab('world')"); pg.wait_for_timeout(300)
    pg.locator('#openHc').tap(); pg.wait_for_timeout(300)
    pg.locator('#chDlg [data-enter="pacifist"]').tap(); pg.wait_for_timeout(200); pg.locator('#confirmYes').tap(); pg.wait_for_timeout(1800)
    hpb = pg.evaluate("__gh.App.enemy && __gh.App.enemy.hp")
    pg.evaluate("__gh.state.owned=__gh.state.owned.map(()=>0); __gh.derive()")
    hpb = pg.evaluate("__gh.App.enemy && __gh.App.enemy.hp")
    for i in range(5): pg.mouse.click(300, 300); pg.wait_for_timeout(50)
    print('pacifist ch', pg.evaluate("__gh.state.challenge"), 'hp', hpb, '->', pg.evaluate("__gh.App.enemy && __gh.App.enemy.hp"), 'gank blocked', pg.evaluate("document.querySelector('[data-trick=gank]').classList.contains('blocked')"))
    pg.screenshot(path=OUT+'l_pacifist.png', clip={'x':0,'y':0,'width':393,'height':400})
    # 7c) speedrun clock runs out
    pg.locator('#chBadge').tap(); pg.wait_for_timeout(300)
    pg.locator('#chDlg [data-enter="speed"]').tap(); pg.wait_for_timeout(200); pg.locator('#confirmYes').tap(); pg.wait_for_timeout(500)
    print('speed', pg.evaluate("__gh.state.challenge"), pg.evaluate("document.querySelector('#chBadge').textContent"))
    pg.evaluate("__gh.state.runStart = Date.now() - 1201e3"); pg.wait_for_timeout(1500)
    print('speed after limit', pg.evaluate("__gh.state.challenge"), pg.evaluate("document.querySelector('#systack').innerText.replace(/\\n/g,' ')")[:200])

    # 8) the ending
    pg.evaluate("(()=>{const S=__gh.state; S.region=11; S.threat=10; S.conquered=11; S.runWon=false;})()")
    pg.evaluate("__gh.App.conquer(null)"); pg.wait_for_timeout(1700)
    print('ending dlg', pg.evaluate("document.querySelector('#storyDlg').open"), pg.evaluate("document.querySelectorAll('#storyDlg .endcard').length"))
    pg.screenshot(path=OUT+'m_ending.png')
    pg.locator('#storyDlg [data-end="logout"]').tap(); pg.wait_for_timeout(250)
    pg.locator('#confirmYes').tap(); pg.wait_for_timeout(500)
    pg.screenshot(path=OUT+'n_epilogue.png')
    pg.locator('#storyDlg [data-close]').tap(); pg.wait_for_timeout(1300)
    print('ending', pg.evaluate("__gh.state.meta.ending"), 'feat', pg.evaluate("!!__gh.state.meta.feats.en_logout"), 'offCap h', pg.evaluate("__gh.App.D.offCap/3600"))

    # 9) raid log with challenge names, rally text
    pg.evaluate("__gh.setTab('world')"); pg.wait_for_timeout(300)
    pg.locator('#openLog').tap(); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'o_log.png')
    pg.locator('#logDlg [data-close]').tap(); pg.wait_for_timeout(200)
    pg.evaluate("(()=>{const S=__gh.state; S.rallyM=3; S.rallyUntil=Date.now()+30000;})()"); pg.wait_for_timeout(300)
    print('buff', pg.evaluate("document.querySelector('#buff').textContent"))

    # 10) sound settings
    pg.locator('#menuBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#sfxToggle').evaluate("e=>e.click()"); pg.locator('#musicToggle').evaluate("e=>e.click()"); pg.wait_for_timeout(600)
    print('sound', pg.evaluate("JSON.stringify(__gh.state.meta.sound)"))
    pg.screenshot(path=OUT+'p_menu.png')
    pg.locator('#menuClose').tap(); pg.wait_for_timeout(200)
    for i in range(6): pg.mouse.click(300, 300); pg.wait_for_timeout(60)

    # 11) autocast at 20 rollbacks
    pg.evaluate("(()=>{const S=__gh.state; S.rollbacks=20; S.meta.bots.tricks=true; S.tricks={}; S.challenge=null;})()")
    pg.evaluate("__gh.setTab('hero')"); pg.wait_for_timeout(300)
    clear(pg); pg.evaluate("__gh.App.raidNow()"); pg.wait_for_timeout(2600)
    print('autocast', pg.evaluate("Object.keys(__gh.state.tricks).join(',')"), 'cd gank', pg.evaluate("GH.Meta.trickCd(__gh.state,'gank')"))
    pg.evaluate("document.querySelector('#panel').scrollTop=9999"); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'q_autocast.png')
    print('errors', [e for e in errs if 'vibrate' not in e])
    b.close()
