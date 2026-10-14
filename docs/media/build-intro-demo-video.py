import subprocess, re, json, math, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent
FF = subprocess.check_output([str(ROOT.parent/"venv/bin/python"), "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"], text=True).strip()
FPS = 24
for d in ["dframes", "daudio"]: (ROOT/d).mkdir(exist_ok=True)
boxes = json.loads((ROOT/"boxes.json").read_text(encoding="utf-8"))
def C(page, key):  # 페이지 좌표 → 화면 좌표(1920x1080 기준)
    x, y, w, h = boxes[page][key]; cx, cy = x + w/2, y + h/2
    return [336 + cx*1248/1180, 54 + cy*867/820]

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Fredoka:wght@500;700&family=Gowun+Dodum&display=swap">'
CSS = """<style>
body{margin:0;background:#8A6134;font-family:'Gowun Dodum','Jua',sans-serif;color:#2B2B2B;overflow:hidden}
#stage{position:relative;width:1920px;height:1080px;overflow:hidden;background:#8A6134}
.cork{position:absolute;inset:28px;background:#D2A86B}
.jua{font-family:'Jua',sans-serif}.fre{font-family:'Fredoka',sans-serif}
.paper{background:#FFFDF7;box-shadow:5px 7px 0 rgba(0,0,0,.16)}
.tape{position:absolute;top:-16px;left:50%;width:160px;height:34px;margin-left:-80px;background:rgba(255,255,255,.55)}
.y{background:#FFE566}.b{background:#9FD8FF}.p{background:#FFB3C7}
.center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#scene{position:absolute;inset:0}
#tablet{position:absolute;left:322px;top:40px;width:1248px;height:867px;border:14px solid #2B2B2B;border-radius:28px;box-shadow:8px 12px 0 rgba(0,0,0,.2);overflow:hidden;background:#D2A86B}
#tablet img{position:absolute;left:0;top:0;width:1248px;height:867px}
#ptr{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(43,43,43,.5);border:3px solid #FFFDF7;box-shadow:0 3px 10px rgba(0,0,0,.35);box-sizing:border-box;pointer-events:none}
#rip{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:4px solid #FFE566;box-sizing:border-box;pointer-events:none}
#sub{position:absolute;left:60px;right:60px;bottom:70px;background:rgba(43,43,43,.86);color:#FFFDF7;font-size:30px;line-height:1.5;padding:18px 32px;border-radius:14px}
#tag{position:absolute;top:52px;left:60px;background:#FFFDF7;padding:10px 22px;font-size:24px;box-shadow:3px 4px 0 rgba(0,0,0,.16)}
</style>"""

def sticky(cls, rot, icon, title, lines):
    li = "".join(f'<div style="font-size:28px;line-height:1.5">{l}</div>' for l in lines)
    return f"""<div class="{cls} in" data-rot="rotate({rot}deg)" style="position:relative;width:500px;padding:70px 44px 44px;box-shadow:5px 7px 0 rgba(0,0,0,.16)">
<div class="tape"></div><div class="jua" style="font-size:64px;line-height:1">{title}</div>
<div class="fre" style="font-size:26px;font-weight:700;color:#6B5B45;margin:6px 0 26px">{icon}</div>{li}</div>"""
def card(cls, rot, title, subt, lines, w=480):
    return f"""<div class="{cls} in" data-rot="rotate({rot}deg)" style="position:relative;width:{w}px;padding:60px 36px 36px;box-shadow:5px 7px 0 rgba(0,0,0,.16)"><div class="tape"></div><div class="jua" style="font-size:44px">{title}</div><div class="fre" style="font-size:24px;color:#6B5B45;margin-bottom:18px">{subt}</div><div style="font-size:28px;line-height:1.6">{lines}</div></div>"""

INTRO = {}
INTRO["s01"] = """<div class="center"><div class="paper in" data-rot="rotate(-1deg)" style="position:relative;width:1180px;padding:90px 80px 70px;text-align:center"><div class="tape"></div>
<div class="jua" style="font-size:104px;line-height:1.1">모모 잉글리시 아카데미</div><div class="fre" style="font-size:38px;font-weight:700;color:#6B5B45;margin-top:8px">Momo English Academy</div>
<div style="display:flex;justify-content:center;gap:28px;margin-top:48px"><div class="y jua" style="padding:16px 36px;font-size:40px;transform:rotate(-3deg);box-shadow:3px 5px 0 rgba(0,0,0,.16)">읽기</div><div class="b jua" style="padding:16px 36px;font-size:40px;transform:rotate(2deg);box-shadow:3px 5px 0 rgba(0,0,0,.16)">쓰기</div><div class="p jua" style="padding:16px 36px;font-size:40px;transform:rotate(-1deg);box-shadow:3px 5px 0 rgba(0,0,0,.16)">말하기</div></div>
<div style="font-size:34px;margin-top:48px">초등 4학년부터 · 하루 20분 · 아이 혼자서</div><div style="font-size:22px;color:#6B5B45;margin-top:18px">소개와 시연 영상 · 설계 단계 목업 기준 · 2026년 10월</div></div></div>"""
INTRO["s02"] = f"""<div class="center" style="gap:56px;align-items:flex-start;padding-top:60px">
{sticky('y',-2.5,'Reading','읽기',['지문 읽고 문제 풀기','단어 누르면 뜻','1단계 그림 · 단어 → 12단계 300단어'])}
{sticky('b',1.5,'Writing','쓰기',['고르기 → 조립 → 문장 틀','6단계부터 자유 작문과 첨삭','문법은 설명 대신 카드로'])}
{sticky('p',-1,'Speaking','말하기',['듣고 따라 말하기','질문에 답하기','5단계부터 AI 역할극'])}</div>
<div class="paper jua in" data-rot="translateX(-50%) rotate(1deg)" style="position:absolute;left:50%;bottom:150px;padding:16px 40px;font-size:34px">영역마다 단계 · 단원 · 승급이 따로 · 세션 5~8분</div>"""
INTRO["s03"] = """<div class="center"><div class="paper in" data-rot="rotate(-.6deg)" style="position:relative;width:1300px;padding:60px 70px 50px"><div class="tape"></div>
<div class="jua" style="font-size:56px;margin-bottom:26px">12단계 사다리 · 영역마다 따로</div>
<table style="width:100%;border-collapse:collapse;font-size:32px">
<tr style="font-family:'Jua';font-size:30px;color:#6B5B45"><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">앱 단계</td><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">CEFR</td><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">학교 수준</td><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">단계 안</td></tr>
<tr><td style="padding:14px"><span class="y jua" style="padding:4px 16px">1 ~ 3</span></td><td style="padding:14px" class="fre">Pre-A1</td><td style="padding:14px">초등 4~5</td><td style="padding:14px;color:#6B5B45" rowspan="4">단원 5개<br>단원 = 문법 1 + 어휘 30<br>수업 8~10회<br><br>통과 = 어휘 숙달 80%<br>+ 최근 5회 80%</td></tr>
<tr><td style="padding:14px"><span class="b jua" style="padding:4px 16px">4 ~ 6</span></td><td style="padding:14px" class="fre">A1</td><td style="padding:14px">초등 6 ~ 중 1</td></tr>
<tr><td style="padding:14px"><span class="p jua" style="padding:4px 16px">7 ~ 9</span></td><td style="padding:14px" class="fre">A2</td><td style="padding:14px">중 2~3</td></tr>
<tr><td style="padding:14px"><span class="jua" style="padding:4px 16px;background:#D7F5C6">10 ~ 12</span></td><td style="padding:14px" class="fre">B1</td><td style="padding:14px">중 3 ~ 고 1</td></tr></table>
<div style="font-size:26px;color:#6B5B45;margin-top:22px">첫 실행 때 영역별 배치 평가로 시작 단계를 정하고, 부모가 언제든 조정할 수 있어요</div></div></div>"""
INTRO["s04"] = f"""<div class="center" style="flex-direction:column;gap:30px">
<div class="paper jua in" data-rot="rotate(-1deg)" style="padding:14px 40px;font-size:50px">쓰기 사다리 · 문장은 만들지 않고 시작해요</div>
<div style="display:flex;gap:40px">
{card('y',-1.5,'1 ~ 3단계','Pre-A1','그림 보고 단어 고르기<br>빠진 글자 채우기 (b_ll)<br>단어 카드 순서대로 놓기<br><b>AI 없이 정답 비교</b>')}
{card('b',1,'4 ~ 5단계','A1','문장 틀 + 단어 상자<br>예시 보고 바꿔 쓰기<br>같은 화면에서 확인<br><b>고칠 곳 최대 1개</b>')}
{card('p',-.5,'6단계부터','A1 → B1','생각 꺼내기 대화 → 자유 작문<br>칭찬 1 · 교정 최대 2 · 모범 답안<br>고쳐 쓰기 → 내 문장 말하기<br><b>첨삭은 여기서부터</b>')}</div></div>"""
INTRO["s05"] = f"""<div class="center" style="gap:44px">
{card('paper',-1,'수업은 미리 만들어요','','사람이 설계한 단계 · 단원 규격에 맞춰<br>AI 가 단원 하나(수업 12회)를 한 번에 생성<br>다음 단원은 늘 준비된 상태<br>부모가 미리 보고 다시 만들 수 있음',520).replace('font-size:28px','font-size:27px')}
{card('paper',1,'실시간은 셋뿐','','쓰기 확인 · 첨삭<br>말하기 평가 · 역할극<br>생각 꺼내기 대화<br>1~3단계 쓰기와 읽기 문제는 AI 없이 채점',520).replace('font-size:28px','font-size:27px')}
{card('paper',-.5,'비용과 안전','','API 비용 월 5달러 안팎<br>키는 서버에만, 아동용 내용 기준<br>하루 호출 상한, 녹음은 90일 뒤 삭제<br>Next.js 16 · Supabase · Claude API',520).replace('font-size:28px','font-size:27px')}</div>"""
INTRO["s19"] = f"""<div class="center" style="flex-direction:column;gap:34px">
<div class="paper jua in" data-rot="rotate(-1deg)" style="padding:14px 44px;font-size:52px">다음 단계</div>
<div style="display:flex;gap:40px">
{card('y',-1.5,'1차','','프로필 1개<br>홈 · 세 영역 세션 · 결과<br>단원 수업 생성과 검증<br>단계 · 단원 규격 초안 216개',470).replace('font-size:28px','font-size:27px')}
{card('b',1,'2차','','단어장 · 간격 반복 복습<br>숙달 기준 승급 · 단계 평가<br>배치 평가 · 보강 수업<br>부모 화면 · 오늘의 한 문장',470).replace('font-size:28px','font-size:27px')}
{card('p',-.5,'3차','','프로필 2~3개<br>설치형 앱(PWA)<br>연습지 PDF · 타자 게임<br>음성 엔진 교체 접점',470).replace('font-size:28px','font-size:27px')}</div>
<div class="paper in" data-rot="rotate(.5deg)" style="padding:14px 40px;font-size:26px;color:#6B5B45">설계 문서 · 조사 기록 · 목업 캔버스 → momo-english-academy 저장소 docs/</div></div>"""

# 장면 정의: (id, kind, narration, sub, tag, beats)  beats: dict(op, t(음수면 끝에서부터), ...)
SC = []
def intro(sid, nar, sub): SC.append(dict(id=sid, kind="intro", nar=nar, sub=sub, tag="", beats=[]))
def demo(sid, nar, sub, tag, beats): SC.append(dict(id=sid, kind="demo", nar=nar, sub=sub, tag=tag, beats=beats))
def mv(t, page, key, dur=0.75): return dict(op="move", t=t, to=C(page, key), dur=dur)
def tap(t): return dict(op="tap", t=t)
def img(t, src): return dict(op="img", t=t, src=f"states/{src}.png")

intro("s01", "모모 잉글리시 아카데미를 소개합니다. 초등 4학년부터 중학교 수준까지, 집에서 태블릿으로 혼자 배우는 영어 학습 앱입니다. 이 영상은 설계 단계의 목업을 바탕으로 만들었습니다.", "초등 4학년부터 중학교 수준까지, 집에서 태블릿으로 혼자 배우는 영어 학습 앱입니다.")
intro("s02", "읽기, 쓰기, 말하기를 독립된 영역으로 나누었습니다. 영역마다 단계와 승급이 따로 돌아가서, 읽기는 잘하지만 말하기가 약한 아이도 자기 수준에서 시작할 수 있습니다. 한 세션은 5분에서 8분이고, 세 영역을 다 해도 하루 20분입니다.", "읽기 · 쓰기 · 말하기는 독립된 영역입니다. 영역마다 단계와 승급이 따로 돌아갑니다.")
intro("s03", "단계는 유럽 공통 기준인 CEFR 에 맞춰 12단계입니다. 한 단계 안에는 문법 요소 하나와 어휘 서른 개를 묶은 단원이 다섯 개 있습니다. 수업 횟수가 아니라, 어휘 숙달률과 과제 성적이 기준을 넘어야 단원을 통과합니다. 다섯 단원을 마치면 단계 평가를 보고 올라갑니다.", "CEFR 기준 12단계. 단원 통과는 횟수가 아니라 숙달 기준입니다.")
intro("s04", "쓰기는 특히 조심스럽게 설계했습니다. 처음 세 단계에서는 문장을 직접 만들지 않습니다. 그림을 보고 단어를 고르고, 베끼고, 단어 카드를 순서대로 놓으면서 문장의 모양을 익힙니다. 문법 설명과 첨삭은 6단계부터 시작합니다.", "처음 세 단계는 고르기 · 베끼기 · 조립만. 문법 설명과 첨삭은 6단계부터.")
intro("s05", "수업 내용은 AI 가 만듭니다. 단계 규격에 맞춰 단원 단위로 미리 생성해 두고, 첨삭과 말하기 평가만 실시간으로 합니다. 하루 세 영역을 다 해도 API 비용은 한 달에 5달러 안팎입니다. 이제 실제 화면을 따라가 보겠습니다.", "수업은 단원 단위로 미리 생성, 첨삭과 평가만 실시간. API 비용은 월 5달러 안팎.")

demo("d01", "첫 화면에서 아이가 자기 이름표를 고릅니다. 형제가 같은 태블릿을 써도 진도가 섞이지 않습니다. 모모를 누르면 홈으로 들어갑니다.",
     "첫 화면에서 아이가 자기 이름표를 고릅니다. 모모를 누르면 홈으로.", "시연 1 · 프로필 선택",
     [img(0,"profile"), mv(0.3,"B_Profile","enter",1.0), mv(-2.2,"B_Profile","enter",0.3), tap(-1.6), img(-1.1,"home")])
demo("d02", "홈은 코르크판에 붙인 포스트잇입니다. 영역마다 지금 단계, 단원 진행 별 다섯 개, 연속 학습 일수가 보이고, 복습할 단어가 있으면 2분 복습 버튼이 뜹니다. 먼저 읽기를 열어 보겠습니다.",
     "영역마다 단계 · 단원 진행 · 연속 일수. 복습할 단어가 있으면 2분 복습 버튼.", "시연 2 · 홈",
     [mv(1.5,"B_Sticky","write",0.9), mv(5.0,"B_Sticky","review",0.8), mv(-2.4,"B_Sticky","read",0.8), tap(-1.5), img(-1.0,"reading_a")])
demo("d03", "읽기 세션입니다. 읽어 주기를 누르면 지문을 읽어 주고, 노란 단어를 누르면 뜻이 보입니다. 문제는 오른쪽에서 풉니다. Max 는 무슨 색일까요. brown and white 를 고르면 바로 맞았는지 알려 줍니다.",
     "읽어 주기, 노란 단어는 누르면 뜻. 오른쪽에서 문제를 풀면 바로 채점.", "시연 3 · 읽기 세션",
     [mv(0.8,"B_Reading","tts",0.9), tap(1.9), mv(-6.0,"B_Reading","choiceB",0.9), tap(-5.0), img(-4.7,"reading_b"), mv(-2.2,"B_Reading","next",0.7), tap(-1.5), img(-1.0,"result")])
demo("d04", "세션이 끝나면 별과 오늘 얻은 단어, 단원 스티커 진행을 보여 줍니다. 홈으로 돌아가서 이번에는 쓰기를 해 보겠습니다.",
     "별 · 오늘 얻은 단어 · 단원 스티커. 홈으로 돌아가 쓰기를 시작합니다.", "시연 4 · 세션 결과",
     [mv(1.0,"B_Result","review",0.8), mv(-3.2,"B_Result","home",0.8), tap(-2.4), img(-1.9,"home"), mv(-1.4,"B_Sticky","write",0.7), tap(-0.7), img(-0.3,"w1_a")])
demo("d05", "쓰기 1단계입니다. 공 그림을 보고, b, 빈칸, l, l 에서 빠진 글자를 고릅니다. a 를 누르면 글자가 채워지고 바로 맞았다고 알려 줍니다. 틀리면 정답을 보여 주고 한 번 더 합니다.",
     "그림을 보고 빠진 글자를 고르면 바로 채워지고 채점. 틀리면 정답을 보여 주고 한 번 더.", "시연 5 · 쓰기 1단계",
     [mv(1.2,"B_W1_Words","tile_a",1.0), mv(-7.0,"B_W1_Words","tile_a",0.3), tap(-6.2), img(-5.9,"w1_b"), mv(-2.2,"B_W1_Words","next",0.7), tap(-1.5), img(-1.0,"w3_a")])
demo("d06", "3단계는 단어 카드 조립입니다. 나는 강아지를 좋아해요, 라는 뜻이 되게 카드를 순서대로 놓습니다. dogs 카드를 빈칸에 놓고, 마침표 카드까지 놓으면 문장이 완성됩니다.",
     "뜻을 듣고 단어 카드를 순서대로. 대문자와 마침표 카드에도 자리가 있습니다.", "시연 6 · 쓰기 3단계",
     [mv(2.6,"B_W3_Order","dogs",0.8), tap(3.5), mv(3.7,"B_W3_Order","slot3",0.8), img(4.5,"w3_b"), mv(6.6,"B_W3_Order","dot",0.7), tap(7.4), mv(7.6,"B_W3_Order","slot4",0.7), img(8.3,"w3_c"), mv(-2.2,"B_W3_Order","done",0.7), tap(-1.5), img(-1.0,"w4_a")])
demo("d07", "4단계부터는 문장 틀에 단어를 넣어 자기 이야기를 씁니다. I like 뒤에 단어 상자에서 dogs 를 고르면 문장이 완성됩니다. 자판으로 직접 쳐도 됩니다.",
     "문장 틀에 단어 상자의 단어를 넣어 자기 이야기를. 자판으로 직접 쳐도 됩니다.", "시연 7 · 쓰기 4단계",
     [mv(2.5,"B_Writing","chip",0.9), tap(3.6), img(3.9,"w4_b"), mv(-2.2,"B_Writing","done",0.7), tap(-1.5), img(-1.0,"chk_a")])
demo("d08", "다 썼어요를 누르면 같은 화면에서 바로 확인합니다. 맞은 문장에는 동그라미, 고칠 곳은 하나만 말풍선으로 알려 줍니다. dogs 로 바꾸기를 누르면 바로 고쳐지고 별 세 개가 됩니다. 모범 답안도, 고쳐 쓰기 단계도 없습니다.",
     "같은 화면에서 확인. 고칠 곳은 하나만 말풍선으로, 버튼 한 번으로 고칩니다.", "시연 8 · 쓰기 확인 단계",
     [mv(1.0,"B_Writing2","fix",1.0), mv(-7.0,"B_Writing2","fix",0.3), tap(-6.2), img(-5.9,"chk_b"), mv(-2.4,"B_Writing2","star",0.7), tap(-1.7), img(-1.2,"w6")])
demo("d09", "6단계부터는 자유 작문과 첨삭입니다. 칭찬 하나, 고칠 곳 최대 두 개와 이유, 모범 답안을 보여 주고 고쳐 쓰기로 이어집니다. 이제 홈으로 가서 말하기를 보겠습니다.",
     "6단계부터 첨삭. 칭찬 1개, 교정 최대 2개와 이유, 모범 답안, 고쳐 쓰기.", "시연 9 · 쓰기 6단계 첨삭",
     [mv(1.0,"B_Writing3","go",0.9), img(-2.4,"home"), mv(-2.2,"B_Sticky","speak",0.8), tap(-1.3), img(-0.8,"spk_a")])
demo("d10", "말하기 세션입니다. 문장을 듣고, 마이크를 눌러 따라 말합니다. 말이 끝나면 브라우저가 음성을 글자로 바꾸고, 빠진 단어만 빨간 점선으로 보여 줍니다. 5단계부터는 AI 가 상대역을 맡는 역할극이 열립니다.",
     "마이크를 눌러 따라 말하면 음성을 글자로 바꿔 빠진 단어만 표시. 5단계부터 AI 역할극.", "시연 10 · 말하기 세션",
     [mv(1.0,"B_Speaking","mic",1.0), tap(2.6), img(2.8,"spk_b"), tap(6.0), img(6.3,"spk_c"), mv(-2.2,"B_Speaking","next",0.8), tap(-1.5), img(-1.0,"result")])
demo("d11", "오늘 세 영역을 다 했습니다. 모은 별로 아바타를 꾸미고, 부모가 등록한 실물 보상도 목표로 보입니다. 복습 2분을 눌러 단어 복습으로 갑니다.",
     "모은 별로 아바타를 꾸미고 실물 보상도 목표로. 복습 2분으로 단어 복습.", "시연 11 · 세션 결과",
     [mv(1.5,"B_Result","home",0.8), mv(-2.4,"B_Result","review",0.8), tap(-1.5), img(-1.0,"rev_a")])
demo("d12", "복습은 플래시카드입니다. 뜻 보기를 누르면 카드가 뒤집히고, 알아요와 몰라요로 스스로 평가합니다. 세 영역에서 만난 단어가 한 단어장에 모이고, 서로 다른 날 세 번 연속 맞히면 안다 도장이 찍힙니다.",
     "세 영역의 단어가 한 단어장에. 다른 날 세 번 연속 맞히면 '안다' 도장.", "시연 12 · 복습",
     [mv(1.2,"B_Review","flip",0.9), tap(2.4), img(2.7,"rev_b"), mv(4.6,"B_Review","know",0.8), tap(5.6), img(-0.8,"lt_a")])
demo("d13", "단원 다섯 개를 통과하면 단계 평가가 열립니다. 문맥에 맞는 단어를 고르는 문제입니다. fast 를 고르고 다음으로 넘어갑니다. 스무 문제 중 열여섯 개를 맞히면 다음 단계로 올라가고, 못 넘어도 약한 단원을 복습하고 다시 볼 수 있습니다.",
     "단원 5개를 통과하면 단계 평가. 20문제 중 16개면 승급, 못 넘어도 복습 후 재시험.", "시연 13 · 단계 평가",
     [mv(3.8,"B_LevelTest","fast",0.9), tap(5.0), img(5.3,"lt_b"), mv(6.4,"B_LevelTest","next",0.7), tap(7.3), img(-0.8,"parent")])
demo("d14", "부모 화면입니다. 영역별 진도와 약점, 다음 단원 미리보기, AI 사용량과 설정값을 한눈에 보고, 플러스 버튼으로 단계를 직접 조정할 수 있습니다.",
     "영역별 진도와 약점, 다음 단원 미리보기, AI 사용량, 설정값. 단계를 직접 조정.", "시연 14 · 부모 화면",
     [mv(1.5,"B_Parent","preview",1.0), mv(-4.5,"B_Parent","plus",0.9), tap(-3.5)])
intro("s19", "구현은 세 차수로 나눕니다. 1차에서 세 영역 세션을 끝까지 돌리고, 2차에서 복습과 승급, 평가, 부모 화면을, 3차에서 프로필과 설치형 앱을 더합니다. 설계 문서와 목업은 저장소에 있습니다. 고맙습니다.", "1차 세 영역 세션, 2차 복습 · 승급 · 평가 · 부모 화면, 3차 프로필과 설치형 앱.")

# 1) 내레이션
for s in SC:
    aiff = ROOT/"daudio"/f"{s['id']}.aiff"
    if not aiff.exists():
        subprocess.run(["say","-v","Yuna","-r","172","-o",str(aiff),s["nar"]], check=True)
    out = subprocess.check_output(["afinfo", str(aiff)], text=True)
    s["nar_dur"] = float(re.search(r"estimated duration: ([\d.]+)", out).group(1))

# 2) 타임라인 계산
t0 = 0.0; last_img = None; last_pos = [1700, 980]
for s in SC:
    base = s["nar_dur"] + 1.0
    for b in s["beats"]:
        if b["t"] < 0: b["t"] = base + b["t"]
    mx = max([b["t"] for b in s["beats"]] + [0])
    s["dur"] = max(base, mx + 1.2)
    s["start"] = t0; t0 += s["dur"]
    s["prevImg"] = last_img; s["pointerFrom"] = last_pos
    if s["kind"] == "demo":
        for b in s["beats"]:
            if b["op"] == "img": last_img = b["src"]
            if b["op"] == "move": last_pos = b["to"]
    s["html"] = INTRO.get(s["id"], "")
TOTAL = t0
print("scenes", len(SC), "total", round(TOTAL,1))

# 3) demo.html
JS = r"""
<script>
const T = TIMELINE;
function ease(p){p=Math.max(0,Math.min(1,p));return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;}
let cur=null; const scene=document.getElementById('scene'), tablet=document.getElementById('tablet'), imA=document.getElementById('imA'), imB=document.getElementById('imB');
const ptr=document.getElementById('ptr'), rip=document.getElementById('rip'), sub=document.getElementById('sub'), tag=document.getElementById('tag');
function setup(s){ cur=s; if(s.kind==='intro'){ scene.innerHTML=s.html; scene.style.display='block'; tablet.style.display='none'; } else { scene.innerHTML=''; scene.style.display='none'; tablet.style.display='block'; } }
window.render = function(t){
  const s = [...T.scenes].reverse().find(x=>t>=x.start-1e-6) || T.scenes[0]; const tl=t-s.start;
  if(s!==cur) setup(s);
  const sf = Math.min(1, tl/0.35); const sig=[s.id, sf.toFixed(2)]; let subText=s.sub;
  tag.style.display = s.tag? 'block':'none'; tag.textContent=s.tag;
  if(s.kind==='intro'){
    scene.style.opacity=sf; const els=[...scene.querySelectorAll('.in')];
    els.forEach((el,i)=>{const p=ease((tl-0.14*i)/0.55); el.style.opacity=p; el.style.transform=`translateY(${((1-p)*40).toFixed(1)}px) ${el.dataset.rot||''}`;});
    sig.push(Math.min(1, tl/(0.14*els.length+0.6)).toFixed(3)); ptr.style.display='none'; rip.style.display='none';
  } else {
    tablet.style.opacity=sf;
    const imgs=s.beats.filter(b=>b.op==='img'&&b.t<=tl); const c=imgs[imgs.length-1]; const p=imgs.length>1?imgs[imgs.length-2].src:s.prevImg;
    const fade=c?Math.min(1,(tl-c.t)/0.45):1; const curSrc=c?c.src:s.prevImg;
    imA.src=p||curSrc||''; imB.src=curSrc||''; imB.style.opacity=fade;
    const mv=s.beats.filter(b=>b.op==='move'&&b.t<=tl); let pos=null;
    if(mv.length){const m=mv[mv.length-1]; const from=mv.length>1?mv[mv.length-2].to:s.pointerFrom; const q=ease((tl-m.t)/m.dur); pos=[from[0]+(m.to[0]-from[0])*q, from[1]+(m.to[1]-from[1])*q];}
    else pos=s.pointerFrom;
    const taps=s.beats.filter(b=>b.op==='tap'&&b.t<=tl&&tl-b.t<0.5); const r=taps.length?(tl-taps[taps.length-1].t)/0.5:-1;
    const press = taps.length && r<0.18 ? 0.82 : 1;
    ptr.style.display='block'; ptr.style.left=pos[0]+'px'; ptr.style.top=pos[1]+'px'; ptr.style.transform=`scale(${press})`;
    if(r>=0){rip.style.display='block'; rip.style.left=pos[0]+'px'; rip.style.top=pos[1]+'px'; rip.style.transform=`scale(${1+r*2.2})`; rip.style.opacity=(1-r)*0.9;} else rip.style.display='none';
    sig.push(curSrc||'', fade.toFixed(2), pos.map(v=>v.toFixed(0)).join(','), r<0?'-':r.toFixed(2));
  }
  sub.textContent=subText; sig.push(subText); return sig.join('|');
};
window.preload = () => Promise.all([...new Set(T.scenes.flatMap(s=>s.beats.filter(b=>b.op==='img').map(b=>b.src)))].map(src=>new Promise(res=>{const i=new Image(); i.onload=res; i.onerror=res; i.src=src;})).concat([document.fonts.ready]));
</script>"""
html = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">{FONTS}{CSS}</head><body>
<div id="stage"><div class="cork"></div><div id="scene"></div>
<div id="tablet"><img id="imA"><img id="imB"></div>
<div id="tag"></div><div id="sub"></div><div id="rip" style="display:none"></div><div id="ptr" style="display:none"></div></div>
<script>const TIMELINE = {json.dumps({"scenes": SC}, ensure_ascii=False)};</script>{JS}</body></html>"""
(ROOT/"demo.html").write_text(html, encoding="utf-8")

# 4) 프레임 렌더
from playwright.sync_api import sync_playwright
nframes = int(math.ceil(TOTAL*FPS)); listing=[]; last_sig=None; last_file=None; uniq=0
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={"width":1920,"height":1080}, device_scale_factor=2)
    pg.goto(f"file://{ROOT/'demo.html'}"); pg.wait_for_load_state("networkidle"); pg.evaluate("preload()"); pg.wait_for_timeout(800)
    for i in range(nframes):
        t = i/FPS; sig = pg.evaluate(f"render({t:.4f})")
        if sig != last_sig:
            last_file = ROOT/"dframes"/f"f{i:06d}.jpg"; pg.screenshot(path=str(last_file), type="jpeg", quality=94); uniq += 1; last_sig = sig
        listing.append(f"file '{last_file}'\nduration {1/FPS:.6f}")
        if i % 600 == 0: print(f"frame {i}/{nframes} uniq {uniq}", flush=True)
    br.close()
listing.append(f"file '{last_file}'")
(ROOT/"dframes"/"list.txt").write_text("\n".join(listing)+"\n")
print("unique frames", uniq)

# 5) 오디오
alist=[]
for s in SC:
    wav = ROOT/"daudio"/f"{s['id']}.wav"
    subprocess.run([FF,"-y","-loglevel","error","-i",str(ROOT/"daudio"/f"{s['id']}.aiff"),"-af","apad","-t",f"{s['dur']:.4f}","-ar","44100","-ac","2",str(wav)], check=True)
    alist.append(f"file '{wav}'")
(ROOT/"daudio"/"list.txt").write_text("\n".join(alist)+"\n")
subprocess.run([FF,"-y","-loglevel","error","-f","concat","-safe","0","-i",str(ROOT/"daudio"/"list.txt"),"-c","copy",str(ROOT/"daudio"/"full.wav")], check=True)

# 6) 조립
master = ROOT/"momo-demo-4k.mp4"
subprocess.run([FF,"-y","-loglevel","error","-f","concat","-safe","0","-i",str(ROOT/"dframes"/"list.txt"),"-i",str(ROOT/"daudio"/"full.wav"),
                "-vf",f"fps={FPS},format=yuv420p","-c:v","libx264","-preset","medium","-tune","stillimage","-crf","18","-r",str(FPS),
                "-c:a","aac","-b:a","160k","-shortest","-movflags","+faststart",str(master)], check=True)
print("master", master, round(master.stat().st_size/1048576,1), "MiB")
