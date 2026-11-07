# 묶음 1 — 흐름 · 고정부(talk-lesson.ts 고정부 · lesson-flow.ts · child-kind.ts)

브리프: 컨트롤러 · 2026-11-07 07:0x · 구현자 Opus high → code-reviewer Opus xhigh → fix(전체 루프)

## 맥락(열 줄 안)
- 닿는 결정: 13절 C205(답 자리) · C206(장면 여는 질문) · C209 '나' · C211 (1)~(4)(자기 이야기 참고값 · 지어내기 금지 · 수치는 검증 기준 · 말 길이 아이 중심 · 기술 오류 책임 구분) · C202 · C203 · C204 · C19 · C188. 요청자 최종 목표: '아이가 정해진 대본을 따라가는 것이 아니라 실제 선생님과 영어로 이야기한다고 느끼는 것'.
- plan `intent/2026-11-06-회화-AI-몫-넓힘/plan.md`(approved): 바뀌는 파일 표 1 행(53~59줄, 사본 `_rows-1.txt`), '옮겨 적는 문구' 절(25~38줄: 고정부에 넣을 영어 규칙 글 그대로), 정한 것 1(새 규칙은 1~3단계만 — **4단계 골든(시스템 프롬프트 · 사용자 메시지 세 꼴)이 글자까지 같아야 함, 첫 단계는 고치기 전 골든 뜨기**) · 2 · 3, 작업 순서 6번, 위험 3 · 6(옛 시험의 고정 문구 29개 — 내 소유 시험만 고치고 다른 묶음 소유는 Edit 로 줄만).
- 넘겨받은 것: 0-가 의 rules 칸(`TALK_PROMPT_SETTING_SCHEMAS`, 키 둘) · 0-나 의 sceneOpener 꼴(`src/core/seed/schema/talk.ts`). 보고 `task-0ga-report.md` · `task-0na-report.md` 를 읽는다.
- spec 판 4(`intent/2026-11-06-회화-AI-몫-넓힘/spec.md`) 설계 1(자리별 몫) · 2(인사 · 끝인사) · 3(대화 규칙 · 말 길이 · 자기 이야기) · 4(답 자리) · 5(장면 여는 질문) · 수용 기준 AC-2 (가)(나 계획)(라) · AC-3 (가)(나)(다) · AC-4 (가)(나) · AC-5 (나 흐름). 정본 02-2 3.3(`specs/02-2-세션과-단계표.md` 194~212 안팎) · 05(`specs/05-AI-호출.md` 사용자 메시지 문단).
- 손대지 않는 것: `src/server/conversation/lesson-turn.ts` · 새 core 모듈(situation · cue-line · made-up, 묶음 2) · 화면 · `src/core/speech/*` · 대본 도구 · 시드 목록 · 카드.

## 할 것(plan 1 행 그대로)
- `src/core/ai/calls/talk-lesson.ts` 고정부: commonRules 의 받침(Support stage) · 들리지 않음 · 인사 끝 세 줄을 단계로 가름(4단계부터 글자 그대로) · 1~3단계 규칙 글(말 길이 · 자기 이야기 참고값 · 지어내기 금지 · 따라가기 '이번 차례에 돌아오기' 알림) · 사용자 메시지 칸.
- `src/core/conversation/lesson-flow.ts` firstQuestionPlan: 1~3 이고 카드에 sceneOpener 가 있으면 수업 첫 대화 질문을 그것으로(질문 줄 role "scene" 등 plan 행대로) · returnNow · greetingFallback · appAsked.scene 계획 칸.
- `src/core/conversation/child-kind.ts` childSaidMoreOf(글, 느낌 낱말, lemmaOf).
- 시험: `tests/fixtures/talk-prompt-l4-before.txt`(고치기 전 4단계 골든 — **먼저 뜸**) · `tests/unit/talk-ai-scope-prompt.test.ts` · `talk-ai-scope-flow.test.ts` 신규(AC-2 (가)(라) · AC-3 (다) · AC-4 (나) · 4단계 골든 같음) · `tests/fixtures/talk-lesson.ts` 시험 카드 둘 더함(CARD3_SCENE · CARD3_GREET2, CARD3 그대로) · 옛 시험(talk-lesson-call · talk-prompt-fix2 457 근처 · talk-prompt-fix3 257 근처 · talk-l… plan 행대로)의 고정부 단언 줄만 고침.
- 완료 조건: 관문 0(lint · tsc · 단위) · 4단계 골든 같음 · talk-output-schema 그대로. 남의 진행 중 파일(4-가 talk-observe, 3 check-talk · 카드 · 목록, 4-나 metrics) 탓 관문 막힘은 BLOCKED 규칙(plan 정한 것 10).

## 지킬 것
- 워크트리 · 서브셸 명령(`( cd …/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && … )`) · 스크래치패드 `ai-scope-1-*.txt` · 커밋 금지. 영어 규칙 글은 plan '옮겨 적는 문구' 그대로(고치지 않음). 숫자는 설정값(새 키 둘)으로.
- 보고: `task-1-report.md`(바뀐 파일 · 골든 같음 증거 · 시험 수 · 관문 · 못 한 것 · 다른 묶음 시험에 손댄 줄). 저에게는 요지 세 줄.
