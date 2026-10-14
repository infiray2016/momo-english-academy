import subprocess, re, math, json, os
from pathlib import Path
ROOT = Path(__file__).resolve().parent
FF = subprocess.check_output([str(ROOT.parent/"venv/bin/python"), "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"], text=True).strip()
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for d in ["frames", "audio", "clips"]: (ROOT/d).mkdir(exist_ok=True)

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Fredoka:wght@500;700&family=Gowun+Dodum&display=swap">'
BASE = """<style>
body{margin:0;background:#8A6134;font-family:'Gowun Dodum','Jua',sans-serif;color:#2B2B2B}
.stage{position:relative;width:1920px;height:1080px;overflow:hidden;background:#8A6134}
.cork{position:absolute;inset:28px;background:#D2A86B}
.jua{font-family:'Jua',sans-serif}.fre{font-family:'Fredoka',sans-serif}
.paper{background:#FFFDF7;box-shadow:5px 7px 0 rgba(0,0,0,.16)}
.tape{position:absolute;top:-16px;left:50%;width:160px;height:34px;margin-left:-80px;background:rgba(255,255,255,.55)}
.y{background:#FFE566}.b{background:#9FD8FF}.p{background:#FFB3C7}
.sub{position:absolute;left:60px;right:60px;bottom:70px;background:rgba(43,43,43,.86);color:#FFFDF7;font-size:30px;line-height:1.5;padding:18px 32px;border-radius:14px}
.tag{position:absolute;top:52px;left:60px;background:#FFFDF7;padding:10px 22px;font-size:24px;box-shadow:3px 4px 0 rgba(0,0,0,.16)}
.tag b{font-family:'Jua',sans-serif;font-size:28px;font-weight:400}
.shot{position:absolute;left:160px;top:118px;width:1600px;height:1112px;transform:scale(.78);transform-origin:top left;border:14px solid #2B2B2B;border-radius:28px;box-shadow:8px 12px 0 rgba(0,0,0,.2);overflow:hidden}
.shot img{display:block;width:1600px;height:1112px}
.center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
</style>"""

def shot_frame(tag, png, sub):
    return f"""<div class="stage"><div class="cork"></div>
<div class="shot" style="left:322px;top:40px;width:1600px;height:1112px;transform:scale(.78)"><img src="../shots/{png}.png"></div>
<div class="tag">{tag}</div><div class="sub">{sub}</div></div>"""

def intro(body, sub):
    return f'<div class="stage"><div class="cork"></div>{body}<div class="sub">{sub}</div></div>'

S = []  # (id, narration, html)

S.append(("s01", "모모 잉글리시 아카데미를 소개합니다. 초등 4학년부터 중학교 수준까지, 집에서 태블릿으로 혼자 배우는 영어 학습 앱입니다. 이 영상은 설계 단계의 목업을 바탕으로 만들었습니다.",
 intro("""<div class="center"><div class="paper" style="position:relative;width:1180px;padding:90px 80px 70px;text-align:center;transform:rotate(-1deg)">
<div class="tape"></div>
<div class="jua" style="font-size:104px;line-height:1.1">모모 잉글리시 아카데미</div>
<div class="fre" style="font-size:38px;font-weight:700;color:#6B5B45;margin-top:8px">Momo English Academy</div>
<div style="display:flex;justify-content:center;gap:28px;margin-top:48px">
<div class="y jua" style="padding:16px 36px;font-size:40px;transform:rotate(-3deg);box-shadow:3px 5px 0 rgba(0,0,0,.16)">읽기</div>
<div class="b jua" style="padding:16px 36px;font-size:40px;transform:rotate(2deg);box-shadow:3px 5px 0 rgba(0,0,0,.16)">쓰기</div>
<div class="p jua" style="padding:16px 36px;font-size:40px;transform:rotate(-1deg);box-shadow:3px 5px 0 rgba(0,0,0,.16)">말하기</div></div>
<div style="font-size:34px;margin-top:48px">초등 4학년부터 · 하루 20분 · 아이 혼자서</div>
<div style="font-size:22px;color:#6B5B45;margin-top:18px">소개와 시연 영상 · 설계 단계 목업 기준 · 2026년 10월</div></div></div>""",
 "초등 4학년부터 중학교 수준까지, 집에서 태블릿으로 혼자 배우는 영어 학습 앱입니다.")))

def sticky(cls, rot, icon, title, lines):
    li = "".join(f'<div style="font-size:28px;line-height:1.5">{l}</div>' for l in lines)
    return f"""<div class="{cls}" style="position:relative;width:500px;padding:70px 44px 44px;transform:rotate({rot}deg);box-shadow:5px 7px 0 rgba(0,0,0,.16)">
<div class="tape"></div><div class="jua" style="font-size:64px;line-height:1">{title}</div>
<div class="fre" style="font-size:26px;font-weight:700;color:#6B5B45;margin:6px 0 26px">{icon}</div>{li}</div>"""

S.append(("s02", "읽기, 쓰기, 말하기를 독립된 트랙으로 나누었습니다. 트랙마다 단계와 승급이 따로 돌아가서, 읽기는 잘하지만 말하기가 약한 아이도 자기 수준에서 시작할 수 있습니다. 한 세션은 5분에서 8분이고, 세 트랙을 다 해도 하루 20분입니다.",
 intro(f"""<div class="center" style="gap:56px;align-items:flex-start;padding-top:60px">
{sticky('y',-2.5,'Reading','읽기',['지문 읽고 문제 풀기','단어 누르면 뜻','1단계 그림 · 단어 → 12단계 300단어'])}
{sticky('b',1.5,'Writing','쓰기',['고르기 → 조립 → 문장 틀','6단계부터 자유 작문과 첨삭','문법은 설명 대신 카드로'])}
{sticky('p',-1,'Speaking','말하기',['듣고 따라 말하기','질문에 답하기','5단계부터 AI 역할극'])}</div>
<div class="paper jua" style="position:absolute;left:50%;transform:translateX(-50%) rotate(1deg);bottom:150px;padding:16px 40px;font-size:34px">트랙마다 단계 · 유닛 · 승급이 따로 · 세션 5~8분</div>""",
 "읽기 · 쓰기 · 말하기는 독립된 트랙입니다. 트랙마다 단계와 승급이 따로 돌아갑니다.")))

S.append(("s03", "단계는 유럽 공통 기준인 CEFR 에 맞춰 12단계입니다. 한 단계 안에는 문법 요소 하나와 어휘 서른 개를 묶은 유닛이 다섯 개 있습니다. 수업 횟수가 아니라, 어휘 숙달률과 과제 성적이 기준을 넘어야 유닛을 통과합니다. 다섯 유닛을 마치면 단계 평가를 보고 올라갑니다.",
 intro("""<div class="center"><div class="paper" style="position:relative;width:1300px;padding:60px 70px 50px;transform:rotate(-.6deg)"><div class="tape"></div>
<div class="jua" style="font-size:56px;margin-bottom:26px">12단계 사다리 · 트랙마다 따로</div>
<table style="width:100%;border-collapse:collapse;font-size:32px">
<tr style="font-family:'Jua';font-size:30px;color:#6B5B45"><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">앱 단계</td><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">CEFR</td><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">학교 수준</td><td style="padding:10px 14px;border-bottom:3px solid #2B2B2B">단계 안</td></tr>
<tr><td style="padding:14px"><span class="y jua" style="padding:4px 16px">1 ~ 3</span></td><td style="padding:14px" class="fre">Pre-A1</td><td style="padding:14px">초등 4~5</td><td style="padding:14px;color:#6B5B45" rowspan="4">유닛 5개<br>유닛 = 문법 1 + 어휘 30<br>수업 8~10회<br><br>통과 = 어휘 숙달 80%<br>+ 최근 5회 80%</td></tr>
<tr><td style="padding:14px"><span class="b jua" style="padding:4px 16px">4 ~ 6</span></td><td style="padding:14px" class="fre">A1</td><td style="padding:14px">초등 6 ~ 중 1</td></tr>
<tr><td style="padding:14px"><span class="p jua" style="padding:4px 16px">7 ~ 9</span></td><td style="padding:14px" class="fre">A2</td><td style="padding:14px">중 2~3</td></tr>
<tr><td style="padding:14px"><span class="jua" style="padding:4px 16px;background:#D7F5C6">10 ~ 12</span></td><td style="padding:14px" class="fre">B1</td><td style="padding:14px">중 3 ~ 고 1</td></tr></table>
<div style="font-size:26px;color:#6B5B45;margin-top:22px">첫 실행 때 트랙별 배치 평가로 시작 단계를 정하고, 부모가 언제든 조정할 수 있어요</div></div></div>""",
 "CEFR 기준 12단계. 유닛 통과는 횟수가 아니라 숙달 기준입니다.")))

S.append(("s04", "쓰기는 특히 조심스럽게 설계했습니다. 처음 세 단계에서는 문장을 직접 만들지 않습니다. 그림을 보고 단어를 고르고, 베끼고, 단어 카드를 순서대로 놓으면서 문장의 모양을 익힙니다. 문법 설명과 첨삭은 6단계부터 시작합니다.",
 intro("""<div class="center" style="flex-direction:column;gap:30px">
<div class="paper jua" style="padding:14px 40px;font-size:50px;transform:rotate(-1deg)">쓰기 사다리 · 문장은 만들지 않고 시작해요</div>
<div style="display:flex;gap:40px">
<div class="y" style="position:relative;width:480px;padding:60px 36px 36px;transform:rotate(-1.5deg);box-shadow:5px 7px 0 rgba(0,0,0,.16)"><div class="tape"></div><div class="jua" style="font-size:44px">1 ~ 3단계</div><div class="fre" style="font-size:24px;color:#6B5B45;margin-bottom:18px">Pre-A1</div><div style="font-size:28px;line-height:1.6">그림 보고 단어 고르기<br>빠진 글자 채우기 (b_ll)<br>단어 카드 순서대로 놓기<br><b>AI 없이 정답 비교</b></div></div>
<div class="b" style="position:relative;width:480px;padding:60px 36px 36px;transform:rotate(1deg);box-shadow:5px 7px 0 rgba(0,0,0,.16)"><div class="tape"></div><div class="jua" style="font-size:44px">4 ~ 5단계</div><div class="fre" style="font-size:24px;color:#6B5B45;margin-bottom:18px">A1</div><div style="font-size:28px;line-height:1.6">문장 틀 + 단어 상자<br>예시 보고 바꿔 쓰기<br>같은 화면에서 확인<br><b>고칠 곳 최대 1개</b></div></div>
<div class="p" style="position:relative;width:480px;padding:60px 36px 36px;transform:rotate(-.5deg);box-shadow:5px 7px 0 rgba(0,0,0,.16)"><div class="tape"></div><div class="jua" style="font-size:44px">6단계부터</div><div class="fre" style="font-size:24px;color:#6B5B45;margin-bottom:18px">A1 → B1</div><div style="font-size:28px;line-height:1.6">생각 꺼내기 대화 → 자유 작문<br>칭찬 1 · 교정 최대 2 · 모범 답안<br>고쳐 쓰기 → 내 문장 말하기<br><b>첨삭은 여기서부터</b></div></div></div></div>""",
 "처음 세 단계는 고르기 · 베끼기 · 조립만. 문법 설명과 첨삭은 6단계부터.")))

S.append(("s05", "수업 내용은 AI 가 만듭니다. 단계 규격에 맞춰 유닛 단위로 미리 생성해 두고, 첨삭과 말하기 평가만 실시간으로 합니다. 하루 세 트랙을 다 해도 API 비용은 한 달에 5달러 안팎입니다.",
 intro("""<div class="center" style="gap:44px">
<div class="paper" style="position:relative;width:520px;padding:60px 40px 40px;transform:rotate(-1deg)"><div class="tape" style="background:rgba(255,229,102,.8)"></div><div class="jua" style="font-size:44px;margin-bottom:14px">수업은 미리 만들어요</div><div style="font-size:27px;line-height:1.6">사람이 설계한 단계 · 유닛 규격에 맞춰<br>AI 가 유닛 하나(수업 12회)를 한 번에 생성<br>다음 유닛은 늘 준비된 상태<br>부모가 미리 보고 다시 만들 수 있음</div></div>
<div class="paper" style="position:relative;width:520px;padding:60px 40px 40px;transform:rotate(1deg)"><div class="tape" style="background:rgba(159,216,255,.8)"></div><div class="jua" style="font-size:44px;margin-bottom:14px">실시간은 셋뿐</div><div style="font-size:27px;line-height:1.6">쓰기 확인 · 첨삭<br>말하기 평가 · 역할극<br>생각 꺼내기 대화<br>1~3단계 쓰기와 읽기 문제는 AI 없이 채점</div></div>
<div class="paper" style="position:relative;width:520px;padding:60px 40px 40px;transform:rotate(-.5deg)"><div class="tape" style="background:rgba(255,179,199,.8)"></div><div class="jua" style="font-size:44px;margin-bottom:14px">비용과 안전</div><div style="font-size:27px;line-height:1.6">API 비용 월 5달러 안팎<br>키는 서버에만, 아동용 내용 기준<br>하루 호출 상한, 녹음은 90일 뒤 삭제<br>Next.js 16 · Supabase · Claude API</div></div></div>""",
 "수업은 유닛 단위로 미리 생성, 첨삭과 평가만 실시간. API 비용은 월 5달러 안팎.")))

demo = [
 ("s06","B_Profile","시연 1 / 13 · 프로필 선택","이제 화면을 보겠습니다. 첫 화면에서 아이가 자기 이름표를 고릅니다. 형제가 같은 태블릿을 써도 진도가 섞이지 않습니다.","첫 화면에서 아이가 자기 이름표를 고릅니다. 형제가 같은 태블릿을 써도 진도가 섞이지 않습니다."),
 ("s07","B_Sticky","시연 2 / 13 · 홈","홈은 코르크판에 붙인 포스트잇입니다. 트랙마다 지금 단계, 유닛 진행 별 다섯 개, 연속 학습 일수가 보이고, 복습할 단어가 있으면 2분 복습 버튼이 뜹니다.","트랙마다 단계 · 유닛 진행 · 연속 일수. 복습할 단어가 있으면 2분 복습 버튼."),
 ("s08","B_Reading","시연 3 / 13 · 읽기 세션","읽기 세션입니다. 지문을 읽어 주고, 노란 단어를 누르면 뜻이 보입니다. 오른쪽에서 이해 문제를 풀고, 틀리면 해설을 봅니다. 3단계 지문은 65단어 정도입니다.","지문 읽어 주기, 노란 단어는 누르면 뜻. 오른쪽에서 문제를 풀고 해설을 봅니다."),
 ("s09","B_W1_Words","시연 4 / 13 · 쓰기 1단계","쓰기 1단계입니다. 그림을 보고, 빠진 글자를 골라 단어를 완성합니다. 정답은 앱이 바로 비교하고, 틀리면 정답을 보여 준 뒤 한 번 더 합니다.","그림을 보고 빠진 글자를 골라 단어를 완성. 틀리면 정답을 보여 주고 한 번 더."),
 ("s10","B_W3_Order","시연 5 / 13 · 쓰기 3단계","3단계에서는 우리말 뜻을 듣고 단어 카드를 순서대로 놓아 문장을 만듭니다. 대문자 카드와 마침표 카드에도 자리가 있어서, 문장의 모양이 저절로 몸에 익습니다.","우리말 뜻을 듣고 단어 카드를 순서대로. 대문자와 마침표 카드에도 자리가 있습니다."),
 ("s11","B_Writing","시연 6 / 13 · 쓰기 4단계","4단계부터 문장 틀에 단어를 넣어 자기 이야기를 씁니다. 단어 상자에서 고르거나 자판으로 직접 쳐도 됩니다.","문장 틀에 단어를 넣어 자기 이야기를. 단어 상자에서 고르거나 자판으로 직접."),
 ("s12","B_Writing2","시연 7 / 13 · 쓰기 확인 단계","다 쓰면 같은 화면에서 바로 확인합니다. 맞은 문장에는 동그라미, 고칠 곳은 하나만 말풍선으로 알려 주고, 버튼 한 번으로 고칩니다. 모범 답안도, 고쳐 쓰기 단계도 없습니다.","같은 화면에서 확인. 고칠 곳은 하나만 말풍선으로, 버튼 한 번으로 고칩니다."),
 ("s13","B_Writing3","시연 8 / 13 · 쓰기 6단계 첨삭","6단계부터는 자유 작문과 첨삭입니다. 칭찬 하나, 고칠 곳 최대 두 개와 이유, 모범 답안을 보여 주고 고쳐 쓰기로 이어집니다.","6단계부터 첨삭. 칭찬 1개, 교정 최대 2개와 이유, 모범 답안, 고쳐 쓰기."),
 ("s14","B_Speaking","시연 9 / 13 · 말하기 세션","말하기 세션입니다. 문장을 듣고 따라 말하면 브라우저가 음성을 글자로 바꾸고, 빠진 단어만 빨간 점선으로 보여 줍니다. 5단계부터는 AI 가 상대역을 맡는 역할극이 열립니다.","듣고 따라 말하면 음성을 글자로 바꿔 빠진 단어만 표시. 5단계부터 AI 역할극."),
 ("s15","B_Result","시연 10 / 13 · 세션 결과","세션이 끝나면 별과 오늘 얻은 단어, 유닛 스티커 진행을 보여 줍니다. 모은 별로 아바타를 꾸미고, 부모가 등록한 실물 보상도 목표로 보입니다.","별 · 오늘 얻은 단어 · 유닛 스티커. 모은 별로 아바타를 꾸미고 실물 보상도 목표로."),
 ("s16","B_Review","시연 11 / 13 · 복습","복습은 플래시카드입니다. 세 트랙에서 만난 단어가 한 단어장에 모이고, 서로 다른 날 세 번 연속 맞히면 안다 도장이 찍힙니다.","세 트랙의 단어가 한 단어장에. 다른 날 세 번 연속 맞히면 '안다' 도장."),
 ("s17","B_LevelTest","시연 12 / 13 · 단계 평가","유닛 다섯 개를 통과하면 단계 평가가 열립니다. 스무 문제 중 열여섯 개를 맞히면 다음 단계로 올라가고, 못 넘어도 약한 유닛을 복습하고 다시 볼 수 있습니다.","유닛 5개를 통과하면 단계 평가. 20문제 중 16개면 승급, 못 넘어도 복습 후 재시험."),
 ("s18","B_Parent","시연 13 / 13 · 부모 화면","부모 화면입니다. 트랙별 진도와 약점, 다음 유닛 미리보기, AI 사용량과 설정값을 한눈에 보고, 단계를 직접 조정할 수 있습니다.","트랙별 진도와 약점, 다음 유닛 미리보기, AI 사용량, 설정값. 단계를 직접 조정."),
]
for sid, png, tag, nar, sub in demo:
    S.append((sid, nar, shot_frame(tag, png, sub)))

S.append(("s19", "구현은 세 차수로 나눕니다. 1차에서 세 트랙 세션을 끝까지 돌리고, 2차에서 복습과 승급, 평가, 부모 화면을, 3차에서 프로필과 설치형 앱을 더합니다. 설계 문서와 목업은 저장소에 있습니다. 고맙습니다.",
 intro("""<div class="center" style="flex-direction:column;gap:34px">
<div class="paper jua" style="padding:14px 44px;font-size:52px;transform:rotate(-1deg)">다음 단계</div>
<div style="display:flex;gap:40px">
<div class="y" style="position:relative;width:470px;padding:60px 36px 36px;transform:rotate(-1.5deg);box-shadow:5px 7px 0 rgba(0,0,0,.16)"><div class="tape"></div><div class="jua" style="font-size:42px;margin-bottom:12px">1차</div><div style="font-size:27px;line-height:1.6">프로필 1개<br>홈 · 세 트랙 세션 · 결과<br>유닛 수업 생성과 검증<br>단계 · 유닛 규격 초안 216개</div></div>
<div class="b" style="position:relative;width:470px;padding:60px 36px 36px;transform:rotate(1deg);box-shadow:5px 7px 0 rgba(0,0,0,.16)"><div class="tape"></div><div class="jua" style="font-size:42px;margin-bottom:12px">2차</div><div style="font-size:27px;line-height:1.6">단어장 · 간격 반복 복습<br>숙달 기준 승급 · 단계 평가<br>배치 평가 · 보강 수업<br>부모 화면 · 오늘의 한 문장</div></div>
<div class="p" style="position:relative;width:470px;padding:60px 36px 36px;transform:rotate(-.5deg);box-shadow:5px 7px 0 rgba(0,0,0,.16)"><div class="tape"></div><div class="jua" style="font-size:42px;margin-bottom:12px">3차</div><div style="font-size:27px;line-height:1.6">프로필 2~3개<br>설치형 앱(PWA)<br>연습지 PDF · 타자 게임<br>음성 엔진 교체 접점</div></div></div>
<div class="paper" style="padding:14px 40px;font-size:26px;color:#6B5B45;transform:rotate(.5deg)">설계 문서 · 조사 기록 · 목업 캔버스 → momo-english-academy 저장소 docs/</div></div>""",
 "1차 세 트랙 세션, 2차 복습 · 승급 · 평가 · 부모 화면, 3차 프로필과 설치형 앱.")))

# 1) frames
for sid, nar, html in S:
    page = f'<!doctype html><html lang="ko"><head><meta charset="utf-8">{FONTS}{BASE}</head><body>{html}</body></html>'
    (ROOT/"frames"/f"{sid}.html").write_text(page, encoding="utf-8")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--window-size=1920,1080", "--virtual-time-budget=12000",
                    f"--screenshot={ROOT/'frames'/sid}.png", f"file://{ROOT/'frames'/sid}.html"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
print("frames done")

# 2) audio
durs = {}
for sid, nar, _ in S:
    aiff = ROOT/"audio"/f"{sid}.aiff"
    subprocess.run(["say", "-v", "Yuna", "-r", "172", "-o", str(aiff), nar], check=True)
    out = subprocess.check_output(["afinfo", str(aiff)], text=True)
    durs[sid] = float(re.search(r"estimated duration: ([\d.]+)", out).group(1))
print("audio done", {k: round(v,1) for k,v in durs.items()})

# 3) clips
lst = []
for sid, _, _ in S:
    T = durs[sid] + 1.1
    fo = max(T - 0.6, 0.1)
    vf = (f"scale=1920:1080,zoompan=z='min(1+0.00015*on,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,"
          f"fade=t=in:st=0:d=0.45,fade=t=out:st={fo:.2f}:d=0.6,format=yuv420p")
    af = f"apad=pad_dur=2,afade=t=out:st={max(T-0.5,0.1):.2f}:d=0.5"
    clip = ROOT/"clips"/f"{sid}.mp4"
    subprocess.run([FF, "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", str(ROOT/"frames"/f"{sid}.png"),
                    "-i", str(ROOT/"audio"/f"{sid}.aiff"), "-t", f"{T:.2f}",
                    "-filter_complex", f"[0:v]{vf}[v];[1:a]{af}[a]", "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30",
                    "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart", str(clip)], check=True)
    lst.append(f"file '{clip}'")
(ROOT/"clips"/"list.txt").write_text("\n".join(lst)+"\n")
final = ROOT/"momo-english-academy-intro-demo.mp4"
subprocess.run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(ROOT/"clips"/"list.txt"),
                "-c", "copy", "-movflags", "+faststart", str(final)], check=True)
total = sum(durs[s]+1.1 for s,_,_ in S)
print("final", final, "total sec", round(total,1), "size MB", round(final.stat().st_size/1e6,1))
