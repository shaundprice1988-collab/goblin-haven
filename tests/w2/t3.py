import sys
from playwright.sync_api import sync_playwright
import os; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots') + os.sep
UA='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
PORT=sys.argv[1] if len(sys.argv)>1 else '8770'
W=int(sys.argv[2]) if len(sys.argv)>2 else 393
H=int(sys.argv[3]) if len(sys.argv)>3 else 851
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=2.75, is_mobile=True, has_touch=True, user_agent=UA)
    pg=ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.goto(f'http://localhost:{PORT}/'); pg.wait_for_timeout(800)
    # intro
    for i in range(2): pg.locator('#introBody [data-next]').tap(); pg.wait_for_timeout(200)
    pg.locator('#nameInput').fill('Newbie'); pg.locator('#introBody [data-name]').tap(); pg.wait_for_timeout(200)
    pg.locator('#introBody [data-next]').tap(); pg.wait_for_timeout(200)
    pg.locator('#introBody [data-done]').tap(); pg.wait_for_timeout(800)
    print('fresh: trickbar hidden', pg.evaluate("document.querySelector('#trickBar').hidden"), 'trickBox hidden', pg.evaluate("document.querySelector('#trickBox').hidden"), 'metaBar hidden', pg.evaluate("document.querySelector('#metaBar').hidden"))
    for i in range(30): pg.mouse.click(W*0.75, 250); pg.wait_for_timeout(40)
    pg.evaluate("__gh.App.conquer(null)"); pg.wait_for_timeout(2500)
    print('after region 1: tricks', pg.evaluate("document.querySelectorAll('#trickBar .trick').length"), 'logs', pg.evaluate("Object.keys(__gh.state.meta.logs).join(',')"))
    print('sys', pg.evaluate("document.querySelector('#systack').innerText.replace(/\\n/g,' | ')"))
    pg.wait_for_timeout(3000)
    print('sys2', pg.evaluate("document.querySelector('#systack').innerText.replace(/\\n/g,' | ')"))
    pg.screenshot(path=OUT+f'r_fresh_{W}x{H}.png')
    pg.evaluate("__gh.setTab('world')"); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+f's_fresh_world_{W}x{H}.png')
    print('metabar', pg.evaluate("document.querySelector('#metaBar').innerText.replace(/\\n/g,' | ')"))
    print('errors', [e for e in errs if 'vibrate' not in e])
    b.close()
