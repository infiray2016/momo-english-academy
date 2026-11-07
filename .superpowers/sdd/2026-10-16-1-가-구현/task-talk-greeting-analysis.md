# 브리프: 회화 1단계 인사 토막 '인사만 반복' · {NAME} 자리표 — 서버 흐름 분석(읽기 전용, 2026-10-29)

바탕 가지 p13d(`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, 1e44de5 — 3D 선생님 프리뷰 판). 고치지 않는다. 보고는 `task-talk-greeting-analysis-report.md`(같은 폴더).

## 요청자 말(10-26, 3D 프리뷰 · 진짜 1단계 회화 자료)
(1) "처음 대화가 인사만 계속 반복하는 것" (3) "처음 인사를 진행하고 나선 단어를 말하는데 말하기와 회화의 차이가 없음" (4) "대화를 한다는 느낌은 전혀 안 듦". 이 브리프는 (1)과 자리표를 본다. (3)(4)는 설계 몫(C143 · C145 변경 단위)이라 사실만 적는다.

## 개발용 DB 기록(읽기 전용으로 뽑음, 아이 이름 가림): `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/talk/talk-dump.md`
- 10-26 08:02 세션 eb16ecf4(1단계 단원 1, 선생님 mina): 아이 턴 셋이 모두 input_mode=dont_know(힌트 english0 · english0 · english2, heard_help two_answers). 선생님 턴 2 본문: "That's okay! Say, I am fine. Or I am okay. You can do it! I am fine. Hello, {NAME}! How are you? I am fine. Or I am okay." — 격려 + 모범 답 + 되풀이(recast "I am fine.") + 인사 질문 전체가 다시 붙음. 턴 3 도 같고, 셋째 아이 턴의 보낸 말에 Segment: greeting_end → 턴 4 "That's okay! Let's learn some new words!" 로 today_words 로 넘어감.
- 10-24 09:43 세션 33838d48 도 같은 꼴(dont_know 둘, 질문 전체 되풀이). 10-24 09:42 세션 f2c26a00 은 아이가 "I'm good today" 를 말해(speech, 듣기끝 3s) 한 턴 만에 today_words 로 넘어감. 첫 줄이 "Hello, {NAME}! …" 인 세션과 "Hello! How are you? …" 인 세션이 섞여 있음.
- 선생님 text 칸에 `{NAME}` 이 글자 그대로 남아 있음(sent_user_message 에도).

## 물음(각각 파일:줄 근거로 답한다)
1. `{NAME}` 자리표: 어디서 만들어지고(시드 카드 greeting.firstLine? src/core/conversation/flow.ts greetingQuestion?) 어디서 아이 이름으로 바뀌어야 하는가(서버? 클라이언트 화면 · TTS 읽기 전?). 지금 코드에서 화면 글자와 읽어 주는 소리에 `{NAME}` 이 그대로 나가는지, 또는 영어 이름(profiles.english_name)이 비어서 그런지, 아니면 저장만 자리표로 하는 설계인지 판정. 1단계 카드(seed/ 의 회화 1단계 단원 1 카드 greeting 부분 — p13d 또는 p08 seed/)의 원문도 인용.
2. 인사 토막 규칙: 1단계 인사 턴 수(card.greetingTurns), dont_know 때 같은 질문을 다시 묻는지(ask_kind first 가 셋 다인 까닭), 'greeting_end' 판정, 몇 번까지 되묻고 넘어가는지. 정본 3절 회화(specs/02-3*.md 또는 README 지도) · 13절 C19 · C36 · C101 · C103 · C127 과 대조해 '설계대로'인지 '결함'인지 가른다.
3. 선생님 턴 2 · 3 의 본문 구성: 어느 부분이 앱이 붙인 것(되풀이 · 질문 재부착 · 답 두 개 들려주기)이고 어느 부분이 AI 가 쓴 것인가(src/server/conversation/turn.ts · src/server/ai/talk.ts · src/core/ai/calls/talk.ts 의 프롬프트 · 합치기). 모범 답이 "Say, I am fine. … You can do it! I am fine. Hello, {NAME}! How are you? I am fine. Or I am okay." 처럼 네 번 겹쳐 나오는 원인(앱 재부착 + AI 되풀이 + recast 겹침?)을 짚는다.
4. 결론: 요청자가 '인사만 계속 반복'으로 느낀 원인을 (가) 설계 그대로인 부분 (나) 결함인 부분으로 가르고, 결함이면 고칠 자리(파일 · 함수)와 최소 변경 · 시험(단위 · 통합 · e2e 어느 것) 제안. 설계 몫이면 어느 결정(C143 등)에 걸리는지만 적는다.

## 지키는 것
- 사실과 가설을 가른다(systematic-debugging 1단계: 근거 없는 고침 제안 금지). 심각도(Critical · Important · Minor)와 근거(파일:줄 · 기록의 턴)를 적는다.
- 아이 이름 · 비밀값을 보고에 적지 않는다. DB 에 접속하지 않는다(기록은 위 파일).
- 보고는 한국어. 300줄 안.
