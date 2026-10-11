from playwright.sync_api import sync_playwright
import os; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots') + os.sep
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':600,'height':300})
    pg.goto('http://localhost:8770/'); pg.wait_for_timeout(800)
    pg.evaluate("""(()=>{document.body.innerHTML=''; const c=document.createElement('canvas'); c.width=120; c.height=40; c.style.cssText='width:600px;height:200px;image-rendering:pixelated;background:#4a6a8a';
      document.body.appendChild(c); const g=c.getContext('2d');
      ['party','pumpkin','santa','flower'].forEach((h,i)=>{ const L=Object.assign(GHArt.adventurerLook(['warrior','mage','cleric','rogue'][i], 7+i, false), {hat:h, hood:null}); GHArt.humanoid(g, 15+i*28, 34, L, {}); });
      const big=document.createElement('canvas'); big.width=120; big.height=40; big.style.cssText='width:600px;height:200px;image-rendering:pixelated;background:#2a2a2a'; document.body.appendChild(big);
      const g2=big.getContext('2d'); ['hall','camp','vault'].forEach((id,i)=>{ const img=new Image(); img.src=GHArt.bldIcon(id,40); img.onload=()=>g2.drawImage(img, 10+i*40, 0, 40, 40); });
    })()""")
    pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'o_hats.png', full_page=True)
    b.close()
