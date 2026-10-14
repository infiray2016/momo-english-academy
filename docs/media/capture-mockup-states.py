import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent
PAGES = ROOT/"pages"; OUT = ROOT/"states"
HELPER = """
window.__byText = (text, tags) => {
  const els = [...document.querySelectorAll(tags||'button,a,div,span')].filter(e => e.textContent.replace(/\\s+/g,' ').trim() === text);
  return els.filter(e => ![...e.querySelectorAll('*')].some(c => c.textContent.replace(/\\s+/g,' ').trim() === text)).pop() || null;
};
window.__has = (text, tags) => [...document.querySelectorAll(tags||'div')].filter(e => e.textContent.includes(text)).pop() || null;
window.__rect = el => { if(!el) return null; const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
"""
boxes = {}
def run(p, name, boxjs=None, states=None):
    """states: list of (state_name, js_before or None, reload_after)"""
    page.goto(f"file://{PAGES/name}.html"); page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready.then(()=>1)"); page.wait_for_timeout(600)
    page.evaluate(HELPER)
    if boxjs: boxes[name] = page.evaluate(boxjs)
    for sname, js, reload in states:
        if js: page.evaluate(js)
        page.screenshot(path=str(OUT/f"{sname}.png"))
        if reload:
            page.reload(); page.wait_for_load_state("networkidle"); page.wait_for_timeout(500); page.evaluate(HELPER)

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width":1180,"height":820}, device_scale_factor=3)

    run(page, "B_Profile", "({enter: __rect([...document.querySelectorAll('a')].find(a=>a.textContent.includes('모모')))})", [("profile", None, False)])
    run(page, "B_Sticky", """({read: __rect(document.querySelector('a[href="B_Reading.dc.html"]')), write: __rect(document.querySelector('a[href="B_W1_Words.dc.html"]')),
        speak: __rect(document.querySelector('a[href="B_Speaking.dc.html"]')), review: __rect(document.querySelector('a[href="B_Review.dc.html"]')), parent: __rect(document.querySelector('a[href="B_Parent.dc.html"]'))})""",
        [("home", None, False)])
    run(page, "B_Reading", """({tts: __rect(__byText('읽어 주기','button')), choiceB: __rect([...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('B.'))), next: __rect(document.querySelector('a[href="B_Result.dc.html"]'))})""",
        [("reading_a", "(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('B.')); b.style.background='#FFFDF7'; b.style.border='2px solid #2B2B2B'; b.style.fontWeight='500';})()", True),
         ("reading_b", None, False)])
    run(page, "B_W1_Words", """({tile_a: __rect(document.querySelectorAll('button[style*="width: 80px"]')[0]), next: __rect(document.querySelector('a[href="B_Result.dc.html"]'))})""",
        [("w1_a", """(()=>{const lb=document.querySelectorAll('div[style*="width: 72px"]')[1]; lb.textContent=''; lb.style.border='3px dashed #9A8A5A'; lb.style.background='#FFFDF7';
            const ok=__has('맞았어요','div'); ok.style.visibility='hidden'; const t=document.querySelectorAll('button[style*="width: 80px"]')[0]; t.style.background='#FFE566'; t.style.color='#2B2B2B'; t.style.border='3px solid #2B2B2B';})()""", True),
         ("w1_b", None, False)])
    run(page, "B_W3_Order", """(()=>{const slots=document.querySelector('div[style*="background: #FFF8D6"]').children; const bt=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
        return {dogs: __rect(bt('dogs')), slot3: __rect(slots[2]), dot: __rect(bt('.')), slot4: __rect(slots[3]), done: __rect(document.querySelector('a[href="B_Result.dc.html"]'))};})()""",
        [("w3_a", None, False),
         ("w3_b", """(()=>{const slots=document.querySelector('div[style*="background: #FFF8D6"]').children; const bt=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
            slots[2].style.cssText=slots[1].style.cssText; slots[2].textContent='dogs'; bt('dogs').style.visibility='hidden';})()""", False),
         ("w3_c", """(()=>{const slots=document.querySelector('div[style*="background: #FFF8D6"]').children; const bt=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
            slots[3].style.cssText=slots[1].style.cssText; slots[3].style.minWidth='64px'; slots[3].style.padding='0 16px'; slots[3].textContent='.'; bt('.').style.visibility='hidden';})()""", True)])
    run(page, "B_Writing", """({chip: __rect([...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('dogs'))), done: __rect(document.querySelector('a[href="B_Writing2.dc.html"]'))})""",
        [("w4_a", None, False),
         ("w4_b", """(()=>{const ph=__byText('단어를 골라요','span'); const ref=document.querySelector('span[style*="background: #FFF8D6"]'); ph.style.cssText=ref.style.cssText; ph.textContent='dogs';
            const c=__byText('3문장 중 2문장 완성','div'); if(c) c.textContent='3문장 다 완성!';})()""", True)])
    run(page, "B_Writing2", """({fix: __rect(__byText('dogs 로 바꾸기','button')), star: __rect(document.querySelector('a[href="B_Result.dc.html"]'))})""",
        [("chk_a", None, False),
         ("chk_b", """(()=>{const s=document.querySelector('span[style*="background: #FFE0E8"]'); s.textContent='dogs'; s.style.background='#D7F5C6'; s.style.borderBottom='3px solid #3B7A2A';
            const q=__byText('?','div'); q.style.background='#3B7A2A'; q.style.border='0'; q.style.color='#FFFDF7'; q.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            const bub=[...document.querySelectorAll('div[style*="background: #FFB3C7"]')].find(d=>d.textContent.includes('강아지가')); bub.style.visibility='hidden';
            const stars=[...document.querySelectorAll('svg[width="30"]')]; const st=stars[2]; st.setAttribute('fill','#F59E0B'); st.setAttribute('stroke','#2B2B2B'); st.setAttribute('stroke-width','1.2');
            const t=__has('두 문장 맞았어요','div'); if(t){t.childNodes.forEach(n=>{if(n.nodeType===3 && n.textContent.includes('두 문장')) n.textContent='세 문장 다 맞았어요! 별 3개!';});}
            const lb=__has('내 문장 듣기','button'); if(lb){lb.style.border='2px solid #2B2B2B'; lb.style.color='#2B2B2B';}})()""", True)])
    run(page, "B_Writing3", """({go: __rect(document.querySelector('a[href="B_Result.dc.html"]'))})""", [("w6", None, False)])
    run(page, "B_Speaking", """({mic: __rect(document.querySelector('button[aria-label="눌러서 말하기"]')), next: __rect(document.querySelector('a[href="B_Result.dc.html"]'))})""",
        [("spk_a", """(()=>{const r=[...document.querySelectorAll('div')].find(d=>d.style.borderTop.includes('dashed') && d.textContent.includes('내가 말한 것')); r.style.visibility='hidden';})()""", False),
         ("spk_b", """(()=>{const m=document.querySelector('button[aria-label="눌러서 말하기"]'); m.style.background='#DC2626'; m.style.borderColor='#FFB3C7'; m.style.boxShadow='0 0 0 14px rgba(220,38,38,0.25)';
            const a=__byText('눌러서 말하기','div'); a.textContent='듣고 있어요…'; const b=__byText('다 말하면 한 번 더 눌러요','div'); b.textContent='말이 끝나면 다시 눌러요';})()""", True),
         ("spk_c", None, False)])
    run(page, "B_Result", """({home: __rect(document.querySelector('a[href="B_Sticky.dc.html"]')), review: __rect(document.querySelector('a[href="B_Review.dc.html"]'))})""", [("result", None, False)])
    run(page, "B_Review", """({flip: __rect(__byText('뜻 보기','button')), know: __rect(__byText('알아요','button'))})""",
        [("rev_a", None, False),
         ("rev_b", """(()=>{const w=__byText('jump','div'); w.textContent='뛰어오르다'; w.style.fontFamily="'Jua',sans-serif"; w.style.fontSize='72px';
            const l=__has('발음 듣기','button'); l.style.visibility='hidden'; const f=__byText('뜻 보기','button'); f.textContent='The cat can jump high.'; f.style.fontFamily="'Fredoka',sans-serif"; f.style.fontSize='26px'; f.style.background='#FFF8D6'; f.style.border='0';})()""", True)])
    run(page, "B_LevelTest", """({fast: __rect(__byText('fast','button')), next: __rect(__byText('다음','button'))})""",
        [("lt_a", """(()=>{const b=__byText('fast','button'); b.style.background='#FFFDF7'; b.style.border='2px solid #2B2B2B'; b.style.fontWeight='500'; const s=__byText('fast','span'); if(s) s.textContent='';})()""", True),
         ("lt_b", None, False)])
    run(page, "B_Parent", """({plus: __rect(document.querySelector('button[aria-label="읽기 단계 올리기"]')), preview: __rect(__byText('미리 보기','button'))})""", [("parent", None, False)])
    browser.close()
(ROOT/"boxes.json").write_text(json.dumps(boxes, ensure_ascii=False, indent=1), encoding="utf-8")
print("states", sorted(p.name for p in OUT.glob("*.png")))
print(json.dumps(boxes, ensure_ascii=False))
