# 브리프: 회화 plan 묶음 13 — 실호출 표본 평가 도구 `talk:observe`(구현자 · Opus · high, 2026-11-05 22:5x, 가벼운 루프)

## 맥락
- plan `intent/2026-10-29-회화-수업을-대화로/plan.md` 묶음 13 행(30줄) · 파일 표 187줄: `scripts/talk-observe.ts` · `package.json`(talk:observe) · `tests/fixtures/talk-observe/*.json` · `tests/unit/talk-observe.test.ts`, 'ai:observe 꼴: --yes 없으면 계획 · 예상 비용만. 대본은 3단계 넷(낱말 답 · 아이가 꺼낸 이야기 · 막힘 셋 · 말소리 없음)과 4단계 하나. 보고는 턴마다 갈래 · 카드 자리 까닭 · 되돌림 · 같은 질문 · 사람 판정 칸 · 토큰 · 비용'. AC-15o(정본 11절). 본보기 `scripts/ai-observe.ts`(src/server 안 가져옴, 순수 함수 내보냄, 실행 때만 네트워크 · 파일).
- 왜 지금(C197 은 첫 프리뷰 뒤였으나 앞당김 — 컨트롤러 결정 T-131): 요청자 시험에서 대화가 설계와 어긋났고(`task-talk-design-gap.md` 1절), 앞으로 프롬프트 · 규칙 · 카드를 고칠 때마다 실호출 대본으로 설계 예시와 대조하는 관문을 둔다. 대본에 이번 기록 장면(`preview-1-session-transcript.md`: 준비 인식 실패 → 첫 질문 막힘 둘 → 쉬운 질문 답 → 카드 답)을 하나 더한다(분석 5.2 5). 비용 어림 한 바퀴 약 1.2달러.
- 설계: 턴 흐름은 앱의 순수 함수(`src/core/conversation/*` · `src/core/ai/calls/talk-lesson.ts`)를 그대로 써 DB 없이 메모리 상태로 돌린다(세션 · 회차 · 기록을 흉내 내는 최소 상태 — 서버 모듈 `src/server/*` 은 가져오지 않는다, ai:observe 와 같은 제약). 실제 AI 호출은 `src/core/ai/*` 호출 층(키는 .env.local 에서 읽되 값 출력 금지). 아이 답은 대본의 글(인식 결과 흉내). 다른 구현자가 같은 시각에 talk-lesson.ts · lesson-turn.ts 등 프롬프트 · 거름 규칙을 고치는 중이니 그 파일은 건드리지 않고, 공개 함수 서명이 바뀌면 보고에 적는다.

## 맡는 파일(신규만)
`scripts/talk-observe.ts` · `package.json`(scripts 한 줄) · `tests/fixtures/talk-observe/*.json`(대본 여섯: 3단계 낱말 답 · 아이가 꺼낸 이야기 · 막힘 셋 · 말소리 없음 · 이번 기록 장면, 4단계 하나) · `tests/unit/talk-observe.test.ts`(순수 함수: 대본 읽기 · 계획 · 비용 어림 · 보고 꼴 · 판정 칸).

## 할 것
1. `pnpm talk:observe [--yes] [--script <이름>] [--level 3] [--effort low|medium] [--out <폴더>]`: --yes 없으면 계획(대본 · 턴 수 · 예상 호출 · 비용)만. --effort 로 D7(low vs medium) 견줌.
2. 대본 꼴(JSON): 카드(세션 시작 자료 — 개발 시드 `seed/lessons/talk/3/1.json` 의 카드 한 장을 읽어 씀) · 아이 답 차례(글 또는 dont_know · nospeech) · 기대 칸(사람 판정용: '이어 묻기였는가' · '카드 질문을 맥락 없이 끼웠는가' · '답을 먼저 들려줬는가' · '한국어 뜻 있는가' · '장면 단정 문장' · '같은 소리 두 번').
3. 보고(markdown + json, 스크래치패드나 --out): 턴마다 선생님 말 · tori_ko · 소리 줄(따라 할 말 · 선택지) · 갈래 · 카드 자리 까닭 · 되돌림 · 같은 질문 · 사람 판정 칸 · 토큰 · 첫 문장 시간 · 비용, 끝에 합계와 설계 예시 대조용 '나란히' 표(대본의 기대 칸 옆에 실제).
4. 단위 시험은 순수 함수만(네트워크 없음). 관문 0.

## 지키는 것
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD f4ec058). 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. 관문 biome ci · tsc · `vitest run --project unit` · check:ids 0. 시험 먼저(새 규칙은 먼저 실패 확인). 커밋 · push 금지(컨트롤러). 개발 DB 쓰기 · 환경 파일 값 출력 금지. 다른 구현자가 같은 시각에 다른 파일을 고친다 — **맡은 파일 밖은 건드리지 않는다**(필요하면 보고에 적는다). 설계 숫자는 설정값. 아이 화면 글은 한국어 해요체. 긴 출력은 스크래치패드 파일로.

## 보고
`task-talk-13-report.md`: 쓰는 법, 대본 여섯, 메모리 상태가 흉내 낸 것과 못 낸 것(서버 규칙 가운데 빠지는 것 — 예: 세션 저장 · 끝맺음), 예상 비용, 우려. 답은 요지 다섯 줄 안.
