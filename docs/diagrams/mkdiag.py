# 볼트 그림 6장 생성기. 실행: python3 docs/diagrams/mkdiag.py, 렌더 확인: exrender.mjs
#   node ~/.claude/skills/vault-diagram/scripts/exrender.mjs "<그림>.excalidraw.md" out.png
# 인자로 폴더를 주면 그 폴더에 쓴다(시험 렌더용). 안 주면 볼트 그림 폴더 G 에 덮어쓴다.
# 2026-10-15 K-07 손질: 타일 아래 글자를 화살표가 가로지르지 않게 배치를 고쳤다
#   (시스템-구성 · 문서-관계), 표 넘침(데이터-모델), Intent 아이콘(Comment → Lex).
import sys; sys.path.insert(0, '/Users/hikaru/.claude/skills/vault-diagram/scripts')
from exgen import Draw
G="/Users/hikaru/Library/Mobile Documents/iCloud~md~obsidian/Documents/infiray/90_AI/프로젝트/momo-english-academy/그림/"
OUT = (sys.argv[1].rstrip('/') + '/') if len(sys.argv) > 1 else G
BL,GR,OR,PU,RD,GY,TE='#1971c2','#2f9e44','#d9480f','#9c36b5','#e03131','#495057','#0b7285'
BLb,GRb,ORb,PUb,RDb,GYb,TEb='#e7f5ff','#ebfbee','#fff4e6','#f8f0fc','#fff5f5','#f1f3f5','#e3fafc'
fails = []
def done(name, d, fname):
    r = d.check(); print(name, r)
    if any(r.values()): fails.append(name)
    d.save(OUT + fname)

# ───────────── 1. 시스템 구성 (아키텍처)
# 타일(104px) 아래에 이름 · 설명이 있으므로 화살표는 타일 옆에서 나가고 들어간다.
#   3 · 4: 서버 타일 오른쪽에서 나가 Vercel 과 Supabase 사이 통로(x=930)로 내려가 Sonnet · Opus 로 갈라진다
#   5: 음성 타일 오른쪽에서 나가 설명 글자 오른쪽(x=355)으로 내려가 음성 인식 공급자 타일 오른쪽으로 들어간다
d=Draw(hand=False)
d.text("h",40,24,"시스템 구성 — 가정 기기에서 Anthropic 까지",28)
d.text("h2",40,62,"검토 1회차 반영본 spec 5 · 6 · 7 · 10절 기준. 번호는 아래 흐름 설명과 같다",15,GY)
d.region("rA",40,130,340,440,"가정 기기 · 태블릿과 PC",BL,BLb,dashed=False,tab=True)
d.icon_node("dev",80,190,260,150,"Device","브라우저 화면","Next.js 앱, 한 화면에 행동 하나",color=BL,tile=True)
d.icon_node("spk",80,400,260,150,"Microphone","Web Speech API","인식과 읽어 주기, 녹음 없음",color=BL,tile=True)
d.region("rB",440,130,460,440,"Vercel · 서울",GY,GYb,dashed=False,tab=True)
d.icon_node("srv",480,190,390,150,"Server","Next.js 서버","서버 액션 · Route Handler, 키는 여기만",color=GY,tile=True)
d.icon_node("cron",480,400,170,150,"Scheduler","Cron 하루 1회","배치 회수 · 원문 삭제",color=GY,tile=True)
d.icon_node("acc",700,400,170,150,"Key","접근 제어","가족 쿠키 · 부모 PIN",color=GY,tile=True)
d.region("rC",960,130,300,250,"Supabase · 서울",GR,GRb,dashed=False,tab=True)
d.icon_node("pg",1000,190,220,150,"Database","Postgres","23 테이블, RLS 전부 거부",color=GR,tile=True)
d.region("rD",440,620,820,250,"Anthropic",OR,ORb,dashed=False,tab=True)
d.icon_node("son",560,680,230,150,"Chatbot","Sonnet 5.5 · 실시간","확인 · 말하기 평가 · 대화",color=OR,tile=True)
d.icon_node("opu",1000,680,220,150,"Model","Opus 5.5 · 배치","수업 생성 · 첨삭 · 평가",color=OR,tile=True)
d.region("rE",40,620,340,250,"앱 밖",GY,GYb,dashed=True,tab=True)
d.icon_node("stt",80,680,260,150,"Cloud","음성 인식 공급자","Chrome 은 Google 서버로",color=GY,tile=True)
d.region("rF",1320,130,340,440,"GitHub",PU,PUb,dashed=False,tab=True)
d.icon_node("gh",1360,190,260,150,"Backup","Actions 주간 백업","암호화 pg_dump 4주분",color=PU,tile=True)
d.icon_node("img",1360,400,260,150,"Image","그림 묶음","CC0 · CC-BY, 정적 자산으로 배포",color=PU,tile=True)
def tile(i):                      # 타일 사각형의 변과 중심
    e=next(e for e in d.el if e["id"]==i)
    return dict(l=e["x"],r=e["x"]+e["width"],t=e["y"],b=e["y"]+e["height"],cx=e["x"]+e["width"]/2,cy=e["y"]+e["height"]/2)
SRV,SON,OPU,SPK,STT=tile("srv"),tile("son"),tile("opu"),tile("spk"),tile("stt")
d.arrow("a1","dev","srv",color=BL); d.badge("b1",410,SRV["cy"],1,BL)
d.arrow("a2","srv","pg",color=GR);  d.badge("b2",1010,SRV["cy"],2,GR)
y34=SRV["cy"]+32                  # 서버 타일 오른쪽 아래쪽에서 나간다 (2 번 선과 32px 띄움)
d.orth("a3",[(SRV["r"]+6,y34),(930,y34),(930,SON["cy"]),(SON["r"]+6,SON["cy"])],color=OR)
d.orth("a4",[(SRV["r"]+6,y34),(930,y34),(930,OPU["cy"]),(OPU["l"]-6,OPU["cy"])],color=OR)
d.badge("b3",(SON["r"]+930)/2,SON["cy"],3,OR); d.badge("b4",(930+OPU["l"])/2-4,OPU["cy"],4,OR)
d.orth("a5",[(SPK["r"]+6,SPK["cy"]),(355,SPK["cy"]),(355,STT["cy"]),(STT["r"]+6,STT["cy"])],color=GY)
d.badge("b5",355,595,5,GY)
d.arrow("a6","gh","pg",color=PU); d.badge("b6",1290,SRV["cy"],6,PU)
d.text("lg",40,900,"1 세션 진행과 답 제출   2 Drizzle 서버 연결로만 읽고 쓴다   3 아이가 기다리는 짧은 호출   4 첨삭과 배치 제출 · 회수\n5 음성은 앱을 거치지 않고 브라우저가 공급자 서버로 보낸다   6 매주 백업하고 비활성 정지를 막는다",15,GY)
done('arch',d,"시스템-구성.excalidraw.md")

# ───────────── 2. 데이터 모델 (ERD)
# 표 모서리 반경 10 · 아래 여백 8 (마지막 줄무늬 행이 둥근 모서리를 덮어 넘쳐 보이던 것),
# unit_progress 폭 180 → 240 (첫 행 글자가 오른쪽 테두리를 넘던 것). 그 줄과 영역 폭을 다시 맞췄다.
d=Draw(hand=False)
d.text("h",40,24,"데이터 모델 — 핵심 테이블 15개와 관계",28)
d.text("h2",40,62,"23개 가운데 흐름을 이루는 것만. 전체 목록은 데이터-모델 쪽의 표",15,GY)
TB=dict(rowh=30,headh=42,ns=17,rs=14,foot=8,radius=10)
d.region("r1",40,120,820,330,"규격 · 시드",TE,TEb,dashed=False,tab=True)
d.tablebox("ls",70,170,170,"level_specs",["area · level","can_do","규격 JSON"],color=TE,keys={0:"PK"},**TB)
d.tablebox("us",270,170,170,"unit_specs",["area · level · unit","학습 요소","목표 어휘 30"],color=TE,keys={0:"PK"},**TB)
d.tablebox("vo",470,170,160,"vocab",["id","band","image_key"],color=TE,keys={0:"PK"},**TB)
d.tablebox("im",660,170,170,"images",["key","출처 · 라이선스","대응 단어"],color=TE,keys={0:"PK"},**TB)
d.region("r2",900,120,620,390,"프로필 · 설정",BL,BLb,dashed=False,tab=True)
d.tablebox("pf",930,170,200,"profiles",["id","name · avatar","관심 주제"],color=BL,keys={0:"PK"},**TB)
d.tablebox("pt",1160,170,250,"profile_tracks",["profile_id · area","level · unit","졸업 · 대체 횟수"],color=BL,keys={0:"PK"},**TB)
d.tablebox("st",930,350,200,"settings",["key · scope","profile_id","value · 판"],color=BL,keys={1:"FK"},**TB)
d.region("r3",40,550,1480,250,"학습 기록",GR,GRb,dashed=False,tab=True)
d.tablebox("se",70,590,210,"sessions",["id","profile_id · area","level · unit · 번호","종류 · 상태 · 점수"],color=GR,keys={0:"PK",1:"FK"},**TB)
d.tablebox("at",330,590,210,"attempts",["id (기기 생성)","session_id","입력 · 피드백 · 점수"],color=GR,keys={0:"PK",1:"FK"},**TB)
d.tablebox("vp",580,590,220,"vocab_progress",["profile_id · vocab_id","상태(알아봄 · 씀)","연속 정답 · 다음 복습"],color=GR,keys={0:"PK"},**TB)
d.tablebox("up",840,590,240,"unit_progress",["profile · area · level · unit","보강 횟수","부모 확인 · 통과"],color=GR,keys={0:"PK"},**TB)
d.tablebox("lt",1120,590,160,"level_tests",["id","종류 · 회차","문항 · 점수"],color=GR,keys={0:"PK"},**TB)
d.tablebox("ds",1310,590,180,"daily_sentences",["profile_id · 학습일","문장","출처 attempt"],color=GR,keys={0:"PK"},**TB)
d.region("r4",40,840,1480,250,"운영 · 기록",OR,ORb,dashed=False,tab=True)
d.tablebox("gj",70,890,280,"generation_jobs",["batch_id · custom_id","상태(제출 · 성공 · 오류 …)","재시도 횟수"],color=OR,keys={0:"PK"},**TB)
d.tablebox("ai",400,890,280,"ai_calls",["session_id · 목적 · 모델","토큰 · 비용 · 지연","결과 상태"],color=OR,keys={0:"FK"},**TB)
d.tablebox("pe",730,890,280,"progress_events",["종류 · 대상","이전 값 · 새 값","주체 · 시각"],color=OR,**TB)
d.tablebox("sl",1060,890,280,"star_ledger",["profile_id · 학습일","영역 · 세션","이유 · 개수"],color=OR,keys={0:"FK"},**TB)
d.arrow("e1","ls","us",color=TE); d.arrow("e2","us","vo",color=TE); d.arrow("e2b","vo","im",color=TE)
d.arrow("e3","pf","pt",color=BL); d.arrow("e4","pf","st",side="v",color=BL)
d.arrow("e5","se","at",color=GR); d.arrow("e6","us","se",side="v",color=TE)
d.orth("e7",[(930,236),(880,236),(880,530),(750,530),(750,590)],color=BL)   # vocab → vocab_progress 화살촉(가운데 690)과 겹치지 않게
d.arrow("e8","vo","vp",side="v",color=TE)
d.orth("e9",[(1360,310),(1360,530),(960,530),(960,590)],color=BL)
d.arrow("e10","gj","se",side="v",color=OR); d.arrow("e11","ai","at",side="v",color=OR); d.arrow("e12","pe","up",side="v",color=OR); d.arrow("e13","sl","ds",side="v",color=OR)
N1="배치 결과는 검증을 거쳐 sessions 에 '준비'로 저장된다. 최근 성적 · 숙달률은 저장하지 않고 순수 함수로 계산한다"
d.text("n1",1520-Draw._inkw(N1,13),1110,N1,13,GY)   # 영역 오른쪽 끝에 맞춘다 (예전엔 영역 밖으로 200 나갔다)
done('erd',d,"데이터-모델.excalidraw.md")

# ───────────── 3. 수업 생성 파이프라인
d=Draw(hand=False)
d.text("h",40,24,"수업 생성 파이프라인 — 단원 N 에 들어가면 단원 N+1 을 미리 만든다",28)
d.text("h2",40,62,"spec 6.3 · 6.4 · 6.5. 영역마다 세션 13회 이상의 버퍼를 유지한다",15,GY)
d.band("bd1",40,120,1620,250,"정규 경로 · Batch API",bg='#f8f9fa',color=GY,tab=True)
X=[70,400,730,1060,1390]; Y=170; W=260; H=170
d.card("c1",X[0],Y,W,H,1,"계기","단원 진입 · 부모 조정\n재생성 · 첫 실행",chip="spec 6.3",accent=BL,icon="Event")
d.card("c2",X[1],Y,W,H,2,"배치 제출","수업마다 요청 하나\nOpus 5.5 · medium",chip="generation_jobs",accent=OR,icon="Batch")
d.card("c3",X[2],Y,W,H,3,"회수","홈 진입 · 세션 종료\n남은 것은 Cron 이",chip="최대 24시간",accent=OR,icon="Scheduler")
d.card("c4",X[3],Y,W,H,4,"검증","분량 · 어휘 · 밴드 · 정답\n그림 · 글로서리 · 금지어",chip="spec 6.4",accent=PU,icon="Rule")
d.card("c5",X[4],Y,W,H,5,"저장","sessions 에 준비 상태로\n부모가 미리 보고 바꾼다",chip="버퍼 13회",accent=GR,icon="Database")
for a,b in [("c1","c2"),("c2","c3"),("c3","c4"),("c4","c5")]: d.arrow("a"+a+b,a,b,color=GY)
d.band("bd2",40,430,1620,250,"예외 경로",bg='#fff9db',color='#e67700',tab=True)
d.card("c6",X[0],480,W,H,6,"실시간 대체","준비 수업이 없으면\n1회분을 바로 만든다",chip="단원 생성을 다시 건다",accent=RD,icon="Lambda")
d.card("c7",X[2],480,W,H,7,"재생성","오류 · 만료 · 검증 실패는\n그 수업만 2회까지",chip="generation.max_retries",accent=RD,icon="Error")
d.card("c8",X[4],480,W,H,8,"생성 실패","비워 두고 부모 화면에\n다시 만들기 버튼",chip="spec 8절",accent=RD,icon="Alarm")
d.arrow("x1","c1","c6",side="v",color=RD,dashed=True)
d.arrow("x2","c4","c7",side="v",color=RD,dashed=True)
d.arrow("x3","c7","c8",color=RD,dashed=True)
d.orth("x4",[(730,565),(700,565),(700,420),(520,420),(520,340)],color=RD,dashed=True)
d.text("n1",540,395,"다시 제출",13,RD)
done('pipe',d,"수업-생성-파이프라인.excalidraw.md")

# ───────────── 4. 개발 방법론 (AI-SDLC)
# Intent 카드 아이콘 Comment → Lex (Comment 는 285px 짜리 선 하나라 줄이면 선이 0.2px 로 흐려지고,
# 라이브러리의 선언 범위가 실제 점과 달라 카드 위로 어긋났다). 아래 설명 글이 띠 밖으로 나가지 않게 띠를 20 늘렸다.
d=Draw(hand=False)
d.text("h",40,24,"개발 방법론 — AI-Native SDLC 와 설계 검토 루프",28)
d.text("h2",40,62,"사람은 의도와 승인, 에이전트는 분석 · 설계 · 구현 · 검토. 산출물은 전부 저장소 파일이다",15,GY)
d.band("ln1",40,120,1620,110,"요청자",bg='#fff5f5',color=RD,tab=True)
d.icon_node("u1",330,125,180,100,"User","의도를 준다",color=RD,isize=40)
d.icon_node("u2",660,125,180,100,"User","spec 승인",color=RD,isize=40)
d.icon_node("u3",990,125,180,100,"User","plan 승인",color=RD,isize=40)
d.band("ln2",40,250,1620,250,"산출물",bg='#f8f9fa',color=GY,tab=True)
X=[70,400,730,1060,1390]; Y=300; W=260; H=170
d.card("s1",X[0],Y,W,H,1,"Intent","문제 · 기대 결과 · 제약\nintent/01_제품/",chip="intent-capture",accent=RD,icon="Lex")
d.card("s2",X[1],Y,W,H,2,"Spec","설계 1~13절 · 요구사항 · AC\nspecs/ 정본",chip="spec-design",accent=BL,icon="Documents")
d.card("s3",X[2],Y,W,H,3,"Plan","구현 계획 묶음\nplans/",chip="plan-build",accent=PU,icon="Task")
d.card("s4",X[3],Y,W,H,4,"Build","코드 · 테스트\n구현자와 검토자 분리",chip="implementer · reviewer",accent=GR,icon="CodeBuild")
d.card("s5",X[4],Y,W,H,5,"지식 기록","원자료 ingest · 위키 갱신\n옵시디언 볼트",chip="ingest · query · lint",accent=TE,icon="Notebook")
for a,b in [("s1","s2"),("s2","s3"),("s3","s4"),("s4","s5")]: d.arrow("a"+a+b,a,b,color=GY)
d.band("ln3",40,520,1620,270,"에이전트 · Opus xhigh",bg='#fff4e6',color=OR,tab=True)
d.card("g1",X[1],570,W,H,6,"검토자 둘","A 학습 설계 · 사용자\nB 기술 · 데이터 · AI · 운영",chip="analyst · 읽기 전용",accent=OR,icon="Agent")
d.card("g2",X[2],570,W,H,7,"편집자","지적을 spec 에 반영\n변경 기록을 남긴다",chip="회차마다 새로",accent=OR,icon="Agent")
d.card("g3",X[3],570,W,H,8,"구현 · 검토","implementer 가 만들고\ncode-reviewer 가 본다",chip="동시 2~3개",accent=OR,icon="Agent")
d.arrow("l1","s2","g1",side="v",color=OR); d.arrow("l2","g1","g2",color=OR); d.arrow("l3","g2","s2",side="v",color=OR)
d.arrow("l4","g3","s4",side="v",color=OR)
d.arrow("l5","u1","s1",side="v",color=RD); d.arrow("l6","u2","s2",side="v",color=RD); d.arrow("l7","u3","s3",side="v",color=RD)
d.text("n1",400,758,"검토 루프: 심각한 지적이 없을 때까지 반복하고 세 회차마다 요청자에게 보고한다",14,OR)
done('sdlc',d,"AI-SDLC-워크플로우.excalidraw.md")

# ───────────── 5. 문서 관계
# 세로 사슬(Intent → Spec → Plan, 원자료 → 위키 → index)이 타일 아래 글자를 가로질러서,
# 가운데 줄(y=r2)을 출처 → Spec → 원자료 → 위키 → index · log 의 가로 본선으로 놓고
# 나머지는 타일 옆에서 나가 다른 타일 위(또는 옆)로 들어가는 ㄱ자 연결로 바꿨다.
#   Intent · 검토 보고 → Spec 은 Spec 위로 양쪽에서, Spec → Plan · Build 는 오른쪽 아래로,
#   검토 보고 → 원자료는 원자료 위로, 그림 → 위키는 위키 위로, 출처 원문 → 원자료는 그림 아래를 돌아 원자료 왼쪽으로.
d=Draw(hand=False)
d.text("h",40,24,"문서 관계 — 출처에서 정본을 거쳐 지식 저장소로",28)
d.text("h2",40,62,"저장소가 정본이고 볼트는 지식이다. 같은 내용을 두 곳에 손으로 쓰지 않는다",15,GY)
R1,R2,R3=200,380,560                       # 타일 윗변 (타일 76px, 이름 · 설명은 그 아래 137px 까지)
cA,cB,cC,cD,cE,cF,cG=200,510,730,950,1230,1450,1670   # 열 중심
NW=220
def N(i,cx,row,icon,title,sub,c):
    d.icon_node(i,cx-NW/2,row,NW,130,icon,title,sub,color=c,tile=True,isize=48)
d.region("q1",40,140,300,620,"출처",GY,GYb,dashed=False,tab=True)
N("o1",cA,R1,"User","요청자 대화 · 지시",None,GY)
N("o2",cA,R2,"Internet","조사 · 리얼 아카데미",None,GY)
N("o3",cA,R3,"Image","목업 캔버스",None,GY)
d.region("q2",400,140,650,620,"저장소 · 정본",BL,BLb,dashed=False,tab=True)
N("i1",cB,R1,"Lex","Intent","intent/",RD)
N("i2",cC,R2,"Documents","Spec","specs/ · 1~15절",BL)
N("i3",cD,R3,"CodeBuild","Plan · Build","plans/ · 코드",PU)
N("i4",cD,R1,"Agent","검토 보고","회차별 지적 · 반영 기록",OR)
d.region("q3",1120,140,640,620,"옵시디언 볼트 · 지식",GR,GRb,dashed=False,tab=True)
N("v1",cE,R2,"Folder","원자료","사본과 포인터, 불변",GR)
N("v2",cF,R2,"Notebook","위키","LLM 이 통합해 관리",GR)
N("v3",cG,R2,"Documents","index · log","목차와 변천",GR)
N("v4",cG,R1,"Canvas","그림","위키에 임베드",GR)
T=lambda row: row+38                       # 타일 중심 y
H2=38; gap=6
d.arrow("f1","o1","i1",color=GY); d.arrow("f2","o2","i2",color=GY)
d.orth("f3",[(cA+H2+gap,T(R3)),(cB,T(R3)),(cB,T(R2)+22),(cC-H2-gap,T(R2)+22)],color=GY)
d.orth("f4",[(cB+H2+gap,T(R1)),(cC-14,T(R1)),(cC-14,R2-gap)],color=BL)
d.orth("f6",[(cD-H2-gap,T(R1)),(cC+14,T(R1)),(cC+14,R2-gap)],color=OR)
d.orth("f5",[(cC+H2+gap,T(R2)+18),(840,T(R2)+18),(840,T(R3)),(cD-H2-gap,T(R3))],color=BL)
d.arrow("f7","i2","v1",color=GR)
d.orth("f8",[(cD+H2+gap,T(R1)),(cE,T(R1)),(cE,R2-gap)],color=OR)
d.orth("f9",[(cA,760),(cA,790),(1085,790),(1085,T(R2)+22),(cE-H2-gap,T(R2)+22)],color=GY,dashed=True)
d.text("n1",420,797,"출처 원문도 그대로 원자료로 들어간다",13,GY)
d.arrow("f10","v1","v2",color=GR); d.arrow("f11","v2","v3",color=GR)
d.orth("f12",[(cG-H2-gap,T(R1)),(cF,T(R1)),(cF,R2-gap)],color=GR)
done('rel',d,"문서-관계.excalidraw.md")

# ───────────── 6. 소개 영상 제작
d=Draw(hand=False)
d.text("h",40,24,"소개 영상 제작 — 목업에서 4K 시연 영상까지",28)
d.text("h2",40,62,"남에게 보여 주려고 만든 소개 자료. 제품 코드와 무관하며 docs/media 의 스크립트로 다시 만든다",15,GY)
d.band("bd",40,120,1620,250,"docs/media/*.py",bg='#f8f9fa',color=GY,tab=True)
X=[70,400,730,1060,1390]; Y=170; W=260; H=170
d.card("v1",X[0],Y,W,H,1,"상태 캡처","목업을 상태별로 찍고\n버튼 좌표를 뽑는다",chip="Playwright",accent=BL,icon="Camera")
d.card("v2",X[1],Y,W,H,2,"렌더","포인터가 버튼을 누르면\n화면이 바뀐다, 줌 없음",chip="Pillow · 24fps",accent=PU,icon="Image")
d.card("v3",X[2],Y,W,H,3,"내레이션","맥 음성 Yuna 로\n대본을 읽는다",chip="say -v Yuna",accent=OR,icon="Sound")
d.card("v4",X[3],Y,W,H,4,"4K 조립","프레임과 음성을 묶고\n1440p 웹용 판도 낸다",chip="imageio-ffmpeg",accent=GR,icon="Video")
d.card("v5",X[4],Y,W,H,5,"전송","30MiB 한도라\n웹용 판만 보낸다",chip="git 제외",accent=GY,icon="Email")
for a,b in [("v1","v2"),("v2","v3"),("v3","v4"),("v4","v5")]: d.arrow("a"+a+b,a,b,color=GY)
d.text("n1",40,400,"1판은 ffmpeg zoompan 으로 줌을 넣어 화면이 떨렸고 시연 느낌이 없었다. 2판부터 줌을 없애고 포인터 이동과 상태 전환으로 시연한다",14,GY)
done('video',d,"영상-제작-파이프라인.excalidraw.md")

print("검사 실패:", fails or "없음")
