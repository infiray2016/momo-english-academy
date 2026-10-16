# 볼트 그림 2장(지식저장소-구성 · 기록-파이프라인) 생성기. 실행: python3 docs/diagrams/mkdiag_kb.py, 렌더 확인: node ~/.claude/skills/vault-diagram/scripts/exrender.mjs <파일> out.png
import sys
sys.path.insert(0, '/Users/hikaru/.claude/skills/vault-diagram/scripts')
from exgen import Draw
OUT = sys.argv[1]
BL, BLb = '#1971c2', '#e7f5ff'; GR, GRb = '#2f9e44', '#ebfbee'
OR, ORb = '#e8590c', '#fff4e6'; PU, PUb = '#9c36b5', '#f8f0fc'; RD = '#e03131'
TW, TH = 220, 170          # 타일 노드 폭 · 높이
SQ = 118.8                 # 타일 사각형 한 변(isz 74.8 + pad 22*2)
def sqc(x, y):             # 타일 사각형의 중심 · 변
    return dict(cx=x+TW/2, cy=y+SQ/2, left=x+(TW-SQ)/2, right=x+(TW+SQ)/2, top=y, bottom=y+SQ)

# ───────────── 그림 A: 지식 저장소 구성
d = Draw(hand=False)
d.text("h", 20, 20, "지식 저장소 구성 — 저장소 · 세션 · 볼트 · 옵시디언", 30)
d.text("h2", 20, 66, "저장소가 정본, 볼트는 지식. 훅이 자동으로 쓰는 것과 Claude 가 세 때에 정리하는 것을 가른다", 16, "#495057")
y1, y2, y3 = 200, 420, 640
RY, RH = 130, 720
d.region("S", 20, RY, 300, RH, "Claude Code 세션", OR, ORb, dashed=False, tab=True)
d.region("R", 360, RY, 320, RH, "저장소 .claude", BL, BLb, dashed=False, tab=True)
d.region("V", 720, RY, 580, RH, "옵시디언 볼트 (iCloud)", GR, GRb, dashed=False, tab=True)
d.region("O", 1340, RY, 300, RH, "옵시디언 앱", PU, PUb, dashed=False, tab=True)
T = lambda i, x, y, ic, t, s, c: d.icon_node(i, x, y, TW, TH, ic, t, s, color=c, tile=True, tint=c)
T("ev", 60, y1, "Event", "세션 이벤트", "여섯 사건마다 훅", OR)
T("cl", 60, y2, "Agent", "Claude", "정리는 세 때에", OR)
T("hk", 410, y1, "Settings", "훅", "vault_check.py", BL)
T("rl", 410, y3, "Rule", "규약 · 스킬", "CLAUDE.md · 스킬 7", BL)
T("raw", 770, y1, "Folder", "원자료", "대화는 훅이 자동", GR)
T("hand", 1030, y1, "Link", "이어하기", "자동 절은 훅이", GR)
T("wiki", 770, y2, "Notebook", "위키", "5분류 · LLM 관리", GR)
T("hub", 1030, y2, "Documents", "index · log", "목차와 변천", GR)
T("jr", 770, y3, "Document", "일지", "교육용 이야기", GR)
T("fig", 1030, y3, "Image", "그림", "위키에 임베드", GR)
T("gv", 1380, y1, "Network", "그래프 뷰", "폴더별 색 8", PU)
T("sy", 1380, y2, "DataSync", "동기화", "iCloud + LiveSync", PU)
T("ex", 1380, y3, "Canvas", "Excalidraw", "그림 렌더", PU)
d.arrow("a1", "ev", "hk", OR);  d.badge("b1", (sqc(60,y1)['right']+sqc(410,y1)['left'])/2, sqc(60,y1)['cy'], 1, OR)
d.arrow("a2", "hk", "raw", BL); d.badge("b2", (sqc(410,y1)['right']+sqc(770,y1)['left'])/2, sqc(410,y1)['cy'], 2, BL)
hk, hd = sqc(410,y1), sqc(1030,y1)
d.orth("a3", [(hk['cx'], hk['top']-4), (hk['cx'], 172), (hd['cx'], 172), (hd['cx'], hd['top']-4)], BL)
d.badge("b3", 960, 172, 3, BL)
d.arrow("a4", "cl", "wiki", OR); d.badge("b4", (sqc(60,y2)['right']+sqc(770,y2)['left'])/2, sqc(60,y2)['cy'], 4, OR)
d.arrow("a5", "wiki", "hub", GR); d.badge("b5", (sqc(770,y2)['right']+sqc(1030,y2)['left'])/2, sqc(770,y2)['cy'], 5, GR)
rl, cl = sqc(410,y3), sqc(60,y2)
d.orth("a6", [(rl['left']-4, rl['cy']), (340, rl['cy']), (340, 395), (cl['cx'], 395), (cl['cx'], cl['top']-4)], BL)
d.badge("b6", 255, 395, 6, BL)
d.arrow("a7", "hub", "sy", GR); d.badge("b7", (sqc(1030,y2)['right']+sqc(1380,y2)['left'])/2, sqc(1030,y2)['cy'], 7, GR)
d.text("l1", 20, 880, "1 세션 시작 · 지시 · 도구 쓰기 · 답 끝 · 압축 직전 · 세션 끝마다 훅을 부른다   2 요청자 메시지와 답 전문을 그날 세션기록에 덧붙인다   3 압축 · 종료 때 이어하기의 자동 절을 쓰고, 시작 때 다시 읽어 넣는다", 15, "#495057")
d.text("l2", 20, 906, "4 Claude 가 이정표 · 마무리에 원자료를 위키로 정리한다(ingest). 다음 세션 시작은 알림만   5 같은 때 index · log · 일지를 고친다   6 규약 · 스킬이 절차를 정하고 Stop 훅이 검사한다   7 iCloud 와 LiveSync 가 폰 · 다른 기기와 맞춘다", 15, "#495057")
print("A 검사:", d.check())
d.save(OUT + "/지식저장소-구성.excalidraw.md")

# ───────────── 그림 B: 기록 파이프라인
d = Draw(hand=False)
d.text("h", 20, 20, "기록 파이프라인 — 훅이 자동으로 쓰고, Claude 가 세 때에 정리한다", 30)
d.text("h2", 20, 66, "위 줄은 Claude Code 의 여섯 사건, 아래 줄은 정리하는 세 때. 점선은 사건이 일어날 때만", 16, "#495057")
CW, CH, GAP = 300, 210, 42
xs = [40 + k*(CW+GAP) for k in range(6)]
cy1, cy2 = 230, 570
d.region("A", 20, 110, 2050, 390, "세션 안 · 훅이 자동으로 (vault_check.py)", BL, BLb, dashed=False, tab=True)
d.region("B", 20, 520, 2050, 330, "정리 · Claude 가 세 때에", GR, GRb, dashed=False, tab=True)
C = lambda i, x, y, n, t, s, ch, ac, ic: d.card(i, x, y, CW, CH, n, t, s, ch, accent=ac, icon=ic)
C("c1", xs[0], cy1, 1, "세션 시작", "규칙 · 이어하기 · 밀린 일지", "SessionStart --start", BL, "Start / End")
C("c2", xs[1], cy1, 2, "지시", "턴 시각과 메시지를 적는다", "UserPromptSubmit --prompt", BL, "User")
C("c2b", xs[2], cy1, 3, "도구 쓰기", "Claude 가 쓴 파일을 적는다", "PostToolUse --touch", BL, "Document")
C("c3", xs[3], cy1, 4, "답 끝", "세션기록 덧붙임 · 검사 · 차단", "Stop --stop", RD, "Decision")
C("c4", xs[4], cy1, 5, "압축 직전", "세션기록 보충 · 이어하기 절", "PreCompact --compact", PU, "Backup")
C("c5", xs[5], cy1, 6, "세션 끝", "이어하기 자동 절 · 밀린 일지", "SessionEnd --end", PU, "Off-page Connector")
C("c6", xs[0], cy2, 7, "다음 세션 시작", "미처리 원자료를 알린다", "--start 알림만", GR, "Timer")
C("c7", xs[3], cy2, 8, "이정표", "커밋 · 회차 반영 · 승인 때", "원자료 · 위키 · log · 일지", GR, "Artifact")
C("c8", xs[5], cy2, 9, "마무리", "세션을 끝내기 전에 정리", "/wrap-up → --mark-ingest", GR, "Task")
d.arrow("s1", "c1", "c2", BL); d.arrow("s1b", "c2", "c2b", BL); d.arrow("s2", "c2b", "c3", BL)
d.arrow("s3", "c3", "c4", PU, dashed=True)
cx = lambda k: xs[k] + CW/2
# 3 → 5 (/clear · 종료): 카드 4 밑으로 돌아간다
d.orth("s4", [(cx(3)+60, cy1+CH+4), (cx(3)+60, 470), (cx(5)-70, 470), (cx(5)-70, cy1+CH+4)], PU, dashed=True)
d.text("t4", cx(4)-60, 448, "/clear · 종료", 13, "#868e96")
# 위로 도는 고리들
d.orth("r1", [(cx(3), cy1-4), (cx(3), 195), (cx(1), 195), (cx(1), cy1-4)], BL, dashed=True)
d.text("tr1", cx(2)-80, 178, "다음 지시 (턴 반복)", 13, "#868e96")
d.orth("r2", [(cx(4), cy1-4), (cx(4), 175), (cx(0)+15, 175), (cx(0)+15, cy1-4)], PU, dashed=True)
d.text("tr2", cx(4)-250, 158, "압축 뒤 SessionStart 가 다시 돈다", 13, "#868e96")
d.orth("r3", [(cx(5), cy1-4), (cx(5), 155), (cx(0)-15, 155), (cx(0)-15, cy1-4)], PU, dashed=True)
d.text("tr3", cx(5)-200, 138, "/clear · 종료 뒤 새 세션", 13, "#868e96")
# 세로 점선: 사건 ↔ 정리
d.orth("v1", [(cx(0)+115, cy1+CH+4), (cx(0)+115, cy2-4)], GR, dashed=True)   # 영역 B 의 탭 라벨을 피해 오른쪽으로
d.text("tv1", cx(0)+127, 505, "미처리 원자료가 있으면 알린다", 13, "#868e96")
d.orth("v2", [(cx(3)-60, cy1+CH+4), (cx(3)-60, cy2-4)], RD, dashed=True)
d.text("tv2", cx(3)-48, 505, "이정표 턴이면 끝내기 전에 요구(차단)", 13, "#868e96")
d.orth("v3", [(cx(5)+70, cy2-4), (cx(5)+70, cy1+CH+4)], GR, dashed=True)
d.text("tv3", cx(5)+82, 505, "마무리 뒤 /clear", 13, "#868e96")
d.text("l1", 20, 880, "4 → 5 점선은 컨텍스트가 찰 때만. 훅은 여섯 사건마다 돌지만 기록을 요구하는 것은 이정표 · 설계 문서 · 커밋 · Claude 가 고친 볼트 · 코드 작업 45분 간격뿐이다. 자동 기록(세션기록 · 이어하기 자동 절)은 Claude 도 사람도 손대지 않는다.", 15, "#495057")
print("B 검사:", d.check())
d.save(OUT + "/기록-파이프라인.excalidraw.md")
