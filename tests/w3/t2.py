import sys, datetime
from playwright.sync_api import sync_playwright
import os; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots') + os.sep
UA='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
PORT=sys.argv[1] if len(sys.argv)>1 else '8770'
def ev(pg, js): return pg.evaluate(js)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':393,'height':851}, device_scale_factor=2.75, is_mobile=True, has_touch=True, user_agent=UA)
    pg=ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e} {e.stack}'))
    pg.clock.install(time=datetime.datetime(2026, 10, 18, 12, 10, 0))
    pg.goto(f'http://localhost:{PORT}/'); pg.clock.resume(); pg.wait_for_timeout(900)
    print('date in page', ev(pg, "new Date().toString().slice(0,24)"), 'season', ev(pg, "GH.Town.season().name"))
    ev(pg, """(()=>{const S=__gh.state; S.introDone=true; S.name='Pip'; S.rollbacks=5; S.conquered=3; S.region=3; S.bestRegionEver=5; S.owned[0]=60; S.owned[1]=30;
      S.town.unlocked=true; S.town.pop=12; S.town.tech.masonry=1; S.town.bld.hall=1; S.town.res.wood=1e5; __gh.derive(); __gh.save(); document.querySelector('#intro').hidden=true; __gh.render(true);})()""")
    pg.locator('.tabs [data-tab="world"]').tap(); pg.wait_for_timeout(500)
    print('portal chips', ev(pg, "[...document.querySelectorAll('[data-portal]')].map(b=>b.textContent+(b.disabled?'(off)':''))"))
    pg.evaluate("document.querySelector('#worldExtra').scrollIntoView()"); pg.wait_for_timeout(200)
    pg.screenshot(path=OUT+'m_portal.png')
    pg.locator('[data-portal="hallow"]').tap(); pg.wait_for_timeout(300)
    pg.locator('#confirmYes').tap(); pg.wait_for_timeout(600)
    print('event now', ev(pg, "JSON.stringify(GH.Meta.eventNow(__gh.state))")[:120], 'gold mult', ev(pg, "GH.Meta.fx(__gh.state).gold"))
    print('portal at', ev(pg, "Math.round(GH.Meta.portalWait(__gh.state)/3600)"), 'h; card', ev(pg, "document.querySelector('.eventcard h3').textContent"))
    pg.locator('.tabs [data-tab="hero"]').tap(); pg.wait_for_timeout(300)
    ev(pg, "window.__sp=[]; GH.on('enemySpawn', e=>window.__sp.push([e.name, e.look&&e.look.hat, !!GH.Meta.eventNow(__gh.state)]))")
    hats=[]
    for i in range(5):
        ev(pg, "(()=>{const A=__gh.App; A.setFight(null); A.setEnemy(null); A.spawnAt(0);})()"); pg.wait_for_timeout(250); hats.append(ev(pg, "__gh.App.enemy && __gh.App.enemy.look.hat"))
    print('hats', hats, ev(pg, "JSON.stringify(window.__sp)"))
    pg.wait_for_timeout(700)
    pg.screenshot(path=OUT+'n_pumpkin.png', clip={'x':0,'y':0,'width':393,'height':470})
    # corruption locked under 4 rollbacks? (rb=5 so open) - check Rites edict asleep
    pg.locator('.tabs [data-tab="town"]').tap(); pg.wait_for_timeout(300)
    pg.locator('#subHall').tap(); pg.wait_for_timeout(300)
    print('rites locked', ev(pg, "document.querySelector('[data-enact=\"rites\"]').disabled"))
    ev(pg, "__gh.state.meta.corrupt=1; GH.World.renderHall(true)"); pg.wait_for_timeout(200)
    pg.locator('[data-enact="rites"]').tap(); pg.wait_for_timeout(300)
    print('rites on', ev(pg, "GH.Town.edictOn(__gh.state,'rites')"), 'warband mult', ev(pg, "GH.Town.edictMul(__gh.state,'warband')"))
    ev(pg, "__gh.state.meta.corrupt=0; GH.World.renderHall(true)"); pg.wait_for_timeout(200)
    print('rites asleep', ev(pg, "GH.Town.edictOn(__gh.state,'rites')"), ev(pg, "document.querySelector('.row.edict.on .name').textContent"))
    # time passes: portal closes after an hour
    pg.clock.fast_forward("01:01:00"); pg.wait_for_timeout(1500)
    print('after an hour', ev(pg, "GH.Meta.eventNow(__gh.state)"), 'season', ev(pg, "GH.Town.season().name"))
    print('ERRORS', [e for e in errs if 'vibrate' not in e])
    b.close()
