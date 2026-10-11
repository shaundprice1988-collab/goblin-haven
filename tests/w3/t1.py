import json, sys
from playwright.sync_api import sync_playwright
import os; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots') + os.sep
UA='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
PORT=sys.argv[1] if len(sys.argv)>1 else '8770'
W=int(sys.argv[2]) if len(sys.argv)>2 else 393
H=int(sys.argv[3]) if len(sys.argv)>3 else 851
TAG=f'{W}'
def closeaway(pg):
    if pg.evaluate("document.querySelector('#awayDlg').open"): pg.locator('#awayOk').tap(); pg.wait_for_timeout(250)
def clear(pg):
    pg.evaluate("(()=>{const A=__gh.App; A.setFight(null); A.setEnemy(null); A.spawnAt(0);})()")
def ev(pg, js): return pg.evaluate(js)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=2.75, is_mobile=True, has_touch=True, user_agent=UA)
    pg=ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.goto(f'http://localhost:{PORT}/'); pg.wait_for_timeout(800)
    # a wave 2 save: no wave 3 fields at all
    town = {"unlocked":True,"pop":30,"hatched":20,"hatchT":0,"rescued":6,"jobs":{"forager":10,"woodcutter":7,"stonecutter":5,"miner":3,"tinkerer":4,"guard":1},
            "split":{"forager":10,"woodcutter":7,"stonecutter":5,"miner":3,"tinkerer":4,"guard":1},"auto":True,"step":1,"sub":"jobs",
            "res":{"food":90000,"wood":90000,"stone":90000,"iron":30000,"ideas":90000},"made":{"food":0,"wood":0,"stone":0,"iron":0,"ideas":0},
            "bld":{"huts":12,"farm":5,"lumber":4,"shed":4,"feast":2,"quarry":3,"mine":2,"market":2,"pit":1,"forge":1,"library":1},"tech":{"fire":1,"baskets":1,"masonry":1,"mining":1,"counting":1,"herbs":1,"writing":1,"smithing":1,"drills":1,"sticks":1},
            "feastUntil":0,"feasts":3}
    old = {"v":1,"name":"Shaun","introDone":True,"gold":5e9,"goldRun":8e9,"goldEver":3e10,"region":5,"threat":6,"conquered":5,"best":56,"bestRegionEver":13,
           "form":"orc","level":12,"xp":0,"owned":[300,300,200,200,100,100,50,25,0,0,0,0],"ups":{"t1":1,"t2":1,"g1":1},"codex":{"goblin":1,"boss":1,"orc":1},
           "shards":1450,"rollbacks":6,"won":True,"kills":500,"killsEver":4200,"taps":2300,"raidsWon":14,"raidsLost":2,"played":20000,"autoBoss":False,"vibrate":False,
           "buyMode":1,"tab":"hero","nextRaid":9e15,"saved":0,"started":1.7e12,"town":town,"runConq0":0,
           "meta":{"ep":5000,"epEver":9000,"feats":{"k1":1},"runs":[],"bots":{"recruit":False},"ending":"gm","endings":{"gm":1},"logs":{"r0":1},"logSeen":1,"ex":{"dupe":3}}}
    pg.evaluate("s=>{__gh.App.S = __gh.App.parseSave(JSON.stringify(Object.assign(s,{saved:Date.now()-5000}))); localStorage.setItem('goblinhaven.save.v1', JSON.stringify(__gh.App.S)); window.addEventListener('pagehide', e=>e.stopImmediatePropagation(), true); }", old)
    pg.reload(); pg.wait_for_timeout(2500); closeaway(pg); pg.wait_for_timeout(1500)
    print('migrated meta', ev(pg, "JSON.stringify({c:__gh.state.meta.corrupt, rk:__gh.state.meta.relicKeys, ra:__gh.state.meta.ra, ed:__gh.state.town.edicts, exp:__gh.state.town.exp})"))
    print('event now', ev(pg, "(GH.Meta.eventNow(__gh.state)||{}).name"), 'all', ev(pg, "__gh.App.D.all.toFixed(2)"))

    # --- town: build tab and new buildings
    pg.locator('.tabs [data-tab="town"]').tap(); pg.wait_for_timeout(300)
    pg.locator('.subtabs [data-sub="build"]').tap(); pg.wait_for_timeout(300)
    names = ev(pg, "[...document.querySelectorAll('#bldList .name')].map(n=>n.textContent.trim()).filter(t=>/Hall|Camp|Vault/.test(t))")
    print('new buildings listed', names, 'hint', ev(pg, "document.querySelector('#bldNext').hidden ? '' : document.querySelector('#bldNext').textContent"))
    for bid in ['hall','camp','vault']:
        ev(pg, f"(()=>{{const b=[...document.querySelectorAll('#bldList .row')].find(r=>r.querySelector('img').src===GHArt.bldIcon('{bid}',60)); b.querySelector('.buy').click();}})()")
        pg.wait_for_timeout(150)
    print('built', ev(pg, "JSON.stringify({hall:__gh.state.town.bld.hall, camp:__gh.state.town.bld.camp, vault:__gh.state.town.bld.vault})"))
    pg.evaluate("document.querySelector('#panel').scrollTop=0"); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+f'a_town_{TAG}.png')
    print('hall tab visible', ev(pg, "!document.querySelector('#subHall').hidden"))

    # --- hall: edicts
    pg.locator('#subHall').tap(); pg.wait_for_timeout(400)
    r0 = ev(pg, "__gh.Town.rates(__gh.state).wood")
    pg.locator('[data-enact="songs"]').tap(); pg.wait_for_timeout(300)
    print('edicts', ev(pg, "JSON.stringify(__gh.state.town.edicts)"), 'wood x', round(ev(pg, "__gh.Town.rates(__gh.state).wood")/r0, 3), 'wait', ev(pg, "Math.round(__gh.Town.edictWait(__gh.state))"),
          'enact disabled', ev(pg, "document.querySelector('[data-enact=\"school\"]').disabled"), 'feat edict1', ev(pg, "__gh.state.meta.c.edicts"))
    pg.screenshot(path=OUT+f'b_hall_{TAG}.png')
    # expeditions
    pg.evaluate("document.querySelector('#sub-hall .exps').scrollIntoView()"); pg.wait_for_timeout(200)
    pg.locator('[data-send="raid"]').tap(); pg.wait_for_timeout(300)
    print('expedition out', ev(pg, "JSON.stringify(__gh.state.town.exp.map(e=>e.id))"), 'home', ev(pg, "__gh.Town.home(__gh.state.town)"), 'idle', ev(pg, "__gh.Town.idle(__gh.state.town)"), 'assigned', ev(pg, "__gh.Town.assigned(__gh.state.town)"))
    pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+f'c_exp_{TAG}.png')
    ev(pg, "GH.World.debug.finishExp()"); pg.wait_for_timeout(1300)
    g0 = ev(pg, "__gh.state.gold"); w0 = ev(pg, "__gh.state.town.res.wood")
    print('dot hall/town', ev(pg, "[document.querySelector('#dotHall').hidden, document.querySelector('#dotTown').hidden]"))
    pg.locator('[data-claim="0"]').tap(); pg.wait_for_timeout(300)
    print('claimed: gold +', round(ev(pg, "__gh.state.gold")-g0), 'wood +', round(ev(pg, "__gh.state.town.res.wood")-w0), 'keys', ev(pg, "__gh.state.meta.relicKeys"), 'exp count', ev(pg, "__gh.state.meta.c.exp"), 'home', ev(pg, "__gh.Town.home(__gh.state.town)"), 'idle', ev(pg, "__gh.Town.idle(__gh.state.town)"))
    print('season chip', ev(pg, "document.querySelector('#seasonChip').textContent"))
    pg.evaluate("document.querySelector('#panel').scrollTop=0"); pg.wait_for_timeout(200)
    pg.screenshot(path=OUT+f'd_hall2_{TAG}.png')

    # --- corruption
    pg.locator('.tabs [data-tab="world"]').tap(); pg.wait_for_timeout(500)
    pg.screenshot(path=OUT+f'e_world_{TAG}.png', full_page=False)
    pg.locator('[data-corrupt="2"]').tap(); pg.wait_for_timeout(300)
    print('corrupt', ev(pg, "__gh.state.meta.corrupt"), 'warband D.dps ok', ev(pg, "__gh.App.D.dps>0"))
    for i in range(6): ev(pg, "GH.World.debug.leech()")
    print('leeches', ev(pg, "__gh.state.leeches.length"), 'buttons', ev(pg, "document.querySelectorAll('#leeches .leech').length"))
    clear(pg); pg.wait_for_timeout(1500)
    g0 = ev(pg, "__gh.state.gold")
    for i in range(5):
        ev(pg, "(()=>{const e=__gh.App.enemy; if(e && !e.dead) __gh.App.hitEnemy(e.hp+1)})()"); pg.wait_for_timeout(450)
    st = ev(pg, "__gh.state.leeches.reduce((a,l)=>a+l.store,0)")
    print('stored by leeches', round(st), 'drain', ev(pg, "GH.Meta.leechDrain(__gh.state.leeches.length)"))
    pg.locator('.tabs [data-tab="hero"]').tap(); pg.wait_for_timeout(600)
    pg.screenshot(path=OUT+f'f_leeches_{TAG}.png', clip={'x':0,'y':0,'width':W,'height':int(H*0.55)})
    g1 = ev(pg, "__gh.state.gold"); n0 = ev(pg, "__gh.state.leeches.length")
    pg.locator('#leeches .leech').first.tap(force=True); pg.wait_for_timeout(200)
    print('popped: leeches', n0, '->', ev(pg, "__gh.state.leeches.length"), 'gold +', round(ev(pg, "__gh.state.gold")-g1), 'c.leeches', ev(pg, "__gh.state.meta.c.leeches"))
    pg.screenshot(path=OUT+f'g_pop_{TAG}.png', clip={'x':0,'y':0,'width':W,'height':int(H*0.55)})
    # shiny
    ev(pg, "(()=>{const L=__gh.state.leeches; L.length=0; L.push({slot:7, store:100, shiny:1});})()"); pg.wait_for_timeout(1200)
    sh0 = ev(pg, "__gh.state.shards")
    pg.locator('#leeches .leech.shiny').first.tap(force=True); pg.wait_for_timeout(200)
    print('shiny: shards', sh0, '->', ev(pg, "__gh.state.shards"), 's_shiny', ev(pg, "!!__gh.state.meta.feats.s_shiny"))
    # turn off pops all
    pg.locator('.tabs [data-tab="world"]').tap(); pg.wait_for_timeout(300)
    pg.locator('[data-corrupt="0"]').tap(); pg.wait_for_timeout(300)
    print('off: leeches', ev(pg, "__gh.state.leeches.length"))
    pg.locator('[data-corrupt="1"]').tap(); pg.wait_for_timeout(300)

    # --- relic cache
    pg.locator('#openRelic').tap(); pg.wait_for_timeout(400)
    pg.locator('#relicDlg [data-pull]').tap(); pg.wait_for_timeout(300)
    pg.locator('#relicDlg [data-pull]').tap(); pg.wait_for_timeout(600)
    print('relics', ev(pg, "JSON.stringify(__gh.state.meta.relics)"), 'ep', ev(pg, "__gh.state.meta.ep"), 'pull', ev(pg, "document.querySelector('#relicDlg .pull b') && document.querySelector('#relicDlg .pull b').textContent"))
    pg.screenshot(path=OUT+f'h_relic_{TAG}.png')
    pg.locator('#relicDlg [data-close]').tap(); pg.wait_for_timeout(300)

    # world extras: event card, daily line, corruption card
    pg.evaluate("document.querySelector('#worldExtra').scrollIntoView()"); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+f'h2_worldx_{TAG}.png')
    # --- event hats on enemies
    pg.locator('.tabs [data-tab="hero"]').tap(); pg.wait_for_timeout(300)
    hats = []
    for i in range(6):
        clear(pg); pg.wait_for_timeout(300); hats.append(ev(pg, "__gh.App.enemy && __gh.App.enemy.look.hat"))
    print('hats', hats)
    pg.wait_for_timeout(900)
    pg.screenshot(path=OUT+f'i_hat_{TAG}.png', clip={'x':0,'y':0,'width':W,'height':int(H*0.55)})

    # --- daily boss
    pg.evaluate("(()=>{const S=__gh.state; S.threat=10; S.autoBoss=true; S.meta.dayBoss=''; S.meta.c.mythicSeen=1; window.__intro=''; GH.on('bossSpawn', e=>{ window.__intro=e.intro; });})()")
    clear(pg); pg.wait_for_timeout(1400)
    print('boss intro', ev(pg, "window.__intro"))
    g0 = ev(pg, "__gh.state.gold")
    ev(pg, "(()=>{const e=__gh.App.enemy; __gh.App.hitEnemy(e.hp+1)})()"); pg.wait_for_timeout(500)
    print('daily: dayBoss', ev(pg, "__gh.state.meta.dayBoss"), 'gold x', round(ev(pg, "__gh.state.gold")/max(1,g0), 3))
    pg.evaluate("__gh.state.autoBoss=false")

    # --- portal not shown during a live event; wipe
    pg.locator('.tabs [data-tab="world"]').tap(); pg.wait_for_timeout(500)
    ev(pg, "__gh.state.shards=1600"); pg.evaluate("__gh.App.render(true)"); pg.wait_for_timeout(300)
    print('wipe button', ev(pg, "document.querySelector('#wipeBtn') && [document.querySelector('#wipeBtn').disabled, document.querySelector('#wipeBtn').textContent]"))
    pg.evaluate("document.querySelector('.wipecard').scrollIntoView()"); pg.wait_for_timeout(200)
    pg.screenshot(path=OUT+f'j_wipe_{TAG}.png')
    pg.locator('#wipeBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#confirmYes').tap(); pg.wait_for_timeout(800)
    print('after wipe', ev(pg, "JSON.stringify({sh:__gh.state.shards, ra:__gh.state.meta.ra, wipes:__gh.state.meta.wipes, ep:__gh.state.meta.ep, ex:__gh.state.meta.ex, relics:Object.keys(__gh.state.meta.relics).length, town:__gh.state.town.bld.hall, rb:__gh.state.rollbacks, region:__gh.state.region, shardPct:GH.shardPct(__gh.state)})"))
    pg.wait_for_timeout(1500)
    print('feat wp1', ev(pg, "!!__gh.state.meta.feats.wp1"))
    pg.locator('.tabs [data-tab="hero"]').tap(); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+f'k_after_wipe_{TAG}.png')

    # --- away screen with expeditions out
    ev(pg, "(()=>{window.addEventListener('pagehide', e=>e.stopImmediatePropagation(), true); document.addEventListener('visibilitychange', e=>e.stopImmediatePropagation(), true); const S=__gh.state; S.town.exp=[{id:'scout',start:Date.now()-2e6,end:Date.now()-1e6,party:3},{id:'delve',start:Date.now()-1e6,end:Date.now()+9e6,party:8}]; S.saved=Date.now()-3*86400e3; localStorage.setItem('goblinhaven.save.v1', JSON.stringify(S)); Storage.prototype.setItem=function(){};})()")
    pg.reload(); pg.wait_for_timeout(2500)
    print('away rows', ev(pg, "[...document.querySelectorAll('#awayStats dt')].map((d,i)=>d.textContent+': '+document.querySelectorAll('#awayStats dd')[i].textContent)"))
    pg.screenshot(path=OUT+f'l_away_{TAG}.png')
    closeaway(pg)
    pg.wait_for_timeout(500)
    print('ERRORS', [e for e in errs if 'vibrate' not in e])
    b.close()
