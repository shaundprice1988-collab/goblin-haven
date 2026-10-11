import json, sys
from playwright.sync_api import sync_playwright
import os; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots') + os.sep
UA='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
W=int(sys.argv[1]) if len(sys.argv)>1 else 393
def closeaway(pg):
    if pg.evaluate("document.querySelector('#awayDlg').open"): pg.locator('#awayOk').tap(); pg.wait_for_timeout(250)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':W,'height':851}, device_scale_factor=2.75, is_mobile=True, has_touch=True, user_agent=UA)
    pg=ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e} {e.stack}'))
    # 1) a v3-style save with no meta: migration
    pg.goto('http://localhost:8770/'); pg.wait_for_timeout(500)
    old = {"v":1,"name":"Shaun","introDone":True,"gold":5e9,"goldRun":8e9,"goldEver":3e10,"region":4,"threat":6,"conquered":4,"best":46,"bestRegionEver":6,
           "form":"orc","level":12,"xp":0,"owned":[150,120,80,50,26,12,5,2,0,0,0,0],"ups":{"t1":1,"t2":1,"g1":1},"codex":{"goblin":1,"boss":1,"orc":1},
           "shards":20,"rollbacks":5,"won":False,"kills":500,"killsEver":4200,"taps":2300,"raidsWon":14,"raidsLost":2,"played":20000,"autoBoss":True,"vibrate":True,
           "buyMode":1,"tab":"hero","nextRaid":9e15,"saved":0,"started":1.7e12}
    pg.evaluate("s=>{__gh.App.S = __gh.App.parseSave(JSON.stringify(Object.assign(s,{saved:Date.now()-5000}))); __gh.App.S.meta = undefined; localStorage.setItem('goblinhaven.save.v1', JSON.stringify(__gh.App.S)); window.addEventListener('pagehide', e=>e.stopImmediatePropagation(), true); }", old)
    pg.reload(); pg.wait_for_timeout(2600)
    closeaway(pg)
    st = pg.evaluate("(()=>{const s=__gh.state; return {feats:Object.keys(s.meta.feats).length, ep:s.meta.ep, runStart:!!s.runStart, notation:s.meta.notation}})()")
    print('migrated', st)
    print('feat dot visible', pg.evaluate("!document.querySelector('#dotFeats').hidden"))
    pg.screenshot(path=OUT+f'a_hero_{W}.png')
    # 2) feats sheet
    pg.locator('#featBtn').tap(); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+f'b_feats_{W}.png')
    chips = pg.locator('#featDlg .chip').count()
    print('title chips', chips)
    pg.locator('#featDlg [data-close]').tap(); pg.wait_for_timeout(200)
    # 3) world tab
    pg.evaluate("__gh.setTab('world')"); pg.wait_for_timeout(500)
    pg.screenshot(path=OUT+f'c_world_{W}.png', full_page=False)
    print('rollback window', pg.evaluate("document.querySelector('#rollbackWin').innerText.slice(0,400)"))
    print('metabar', pg.evaluate("document.querySelector('#metaBar').innerText.slice(0,200)"))
    # roll back through the button and confirm
    pg.locator('#rollbackBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#confirmNo').tap(); pg.wait_for_timeout(200)
    print('cancel counted', pg.evaluate('__gh.state.rbCancel'))
    pg.evaluate("__gh.setTab('world')"); pg.wait_for_timeout(300)
    pg.locator('#rollbackBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#confirmYes').tap(); pg.wait_for_timeout(600)
    st = pg.evaluate("(()=>{const s=__gh.state; return {rb:s.rollbacks, shards:s.shards, ep:s.meta.ep, runs:s.meta.runs.length, gold:s.gold, conq:s.conquered, ups:Object.keys(s.ups)}})()")
    print('after rollback', st)
    pg.screenshot(path=OUT+f'd_after_rb_{W}.png')
    # 4) exploit tree
    pg.evaluate("__gh.setTab('world')"); pg.wait_for_timeout(300)
    pg.locator('#openEx').tap(); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+f'e_ex_{W}.png')
    dps0 = pg.evaluate("__gh.App.D.dps")
    print('bots locked', pg.evaluate("document.querySelector('#exDlg [data-ex=bots]').disabled"))
    pg.locator('#exDlg [data-ex="dupe"]').tap(); pg.wait_for_timeout(200)
    pg.locator('#exDlg [data-ex="bots"]').tap(); pg.wait_for_timeout(200)
    print('ex', pg.evaluate("JSON.stringify(__gh.state.meta.ex)"), 'ep', pg.evaluate('__gh.state.meta.ep'), 'dps', dps0, '->', pg.evaluate("__gh.App.D.dps"))
    pg.screenshot(path=OUT+f'e_ex2_{W}.png')
    pg.locator('#exDlg [data-respec]').tap(); pg.wait_for_timeout(300)
    pg.locator('#confirmYes').tap(); pg.wait_for_timeout(300)
    print('after respec', pg.evaluate("JSON.stringify(__gh.state.meta.ex)"), 'ep', pg.evaluate('__gh.state.meta.ep'))
    pg.locator('#exDlg [data-close]').tap(); pg.wait_for_timeout(200)
    # 5) raid log + patches
    pg.locator('#openLog').tap(); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+f'f_log_{W}.png')
    pg.locator('#logDlg [data-close]').tap(); pg.wait_for_timeout(200)
    pg.locator('#metaBar summary').tap(); pg.wait_for_timeout(300)
    pg.locator('#metaBar summary').scroll_into_view_if_needed()
    pg.screenshot(path=OUT+f'g_patches_{W}.png')
    # 6) bots: recruit + upgrade, bind
    pg.evaluate("(()=>{const s=__gh.state; s.meta.bots.recruit=true; s.meta.bots.upgrade=true; s.gold=1e9; __gh.derive();})()")
    pg.evaluate("__gh.setTab('village')"); pg.wait_for_timeout(2500)
    print('bot owned', pg.evaluate("__gh.state.owned.join(',')"), 'ups', pg.evaluate("Object.keys(__gh.state.ups).length"), 'gold', pg.evaluate("__gh.state.gold"))
    pg.screenshot(path=OUT+f'h_village_{W}.png')
    pg.evaluate("__gh.setTab('ups')"); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+f'i_ups_{W}.png')
    pg.locator('#bindBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#pickDlg [data-bind]').first.tap(); pg.wait_for_timeout(200)
    print('binds', pg.evaluate("JSON.stringify(__gh.state.meta.binds)"))
    pg.screenshot(path=OUT+f'j_bind_{W}.png')
    pg.locator('#pickDlg [data-close]').tap(); pg.wait_for_timeout(200)
    # 7) settings: notation, export, import
    pg.locator('#menuBtn').tap(); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+f'k_menu_{W}.png')
    pg.locator('#notationSel').select_option('sci'); pg.wait_for_timeout(300)
    print('gold text sci', pg.evaluate("document.querySelector('#gold').textContent"))
    pg.locator('#notationSel').select_option('letters'); pg.wait_for_timeout(200)
    pg.locator('#menuExtra').evaluate("e=>e.scrollIntoView()")
    pg.screenshot(path=OUT+f'k_menu2_{W}.png')
    pg.locator('#exportBtn').tap(); pg.wait_for_timeout(300)
    code = pg.evaluate("document.querySelector('#xferCode').value")
    print('export code', code[:40], len(code))
    pg.screenshot(path=OUT+f'l_export_{W}.png')
    pg.locator('#xferDlg [data-close]').tap(); pg.wait_for_timeout(200)
    # change name then import the earlier code
    pg.evaluate("(()=>{__gh.state.name='Changed'; __gh.save();})()")
    pg.locator('#menuBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#importBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#xferIn').fill('garbage'); pg.locator('#doImport').tap(); pg.wait_for_timeout(200)
    print('bad import msg', pg.evaluate("document.querySelector('#xferMsg').textContent"))
    pg.locator('#xferIn').fill(code); pg.locator('#doImport').tap(); pg.wait_for_timeout(300)
    pg.locator('#confirmYes').tap(); pg.wait_for_timeout(2500)
    closeaway(pg)
    print('after import name', pg.evaluate('__gh.state.name'), 'rb', pg.evaluate('__gh.state.rollbacks'))
    # 8) damaged save -> backup
    pg.evaluate("localStorage.setItem('goblinhaven.backup.v1', JSON.stringify({at:Date.now()-60000, data: JSON.stringify(__gh.state)}))")
    pg.evaluate("(()=>{ window.removeEventListener; localStorage.setItem('goblinhaven.save.v1','{broken'); })()")
    pg.goto('about:blank'); pg.goto('http://localhost:8770/'); pg.wait_for_timeout(2200)
    closeaway(pg)
    print('restored', pg.evaluate('__gh.state.name'), pg.evaluate("document.querySelector('#systack').innerText"))
    # 9) shadow feats: poke + rename GM
    for i in range(11): pg.locator('#unitframe').tap(); pg.wait_for_timeout(60)
    pg.wait_for_timeout(300)
    pg.locator('#menuBtn').tap(); pg.wait_for_timeout(300)
    pg.locator('#renameBtn').tap(); pg.wait_for_timeout(200)
    pg.locator('#renameIn').fill('GM_Bob'); pg.locator('#renameOk').tap(); pg.wait_for_timeout(300)
    print('shadow', [k for k in pg.evaluate("Object.keys(__gh.state.meta.feats)") if k.startswith('s_')], 'name', pg.evaluate('__gh.state.name'))
    pg.screenshot(path=OUT+f'm_shadow_{W}.png')
    print('errors', errs)
    b.close()
