# 브리프: 회화 턴 프롬프트 · 흐름 규칙 고침 1 — '답부터 들려줌 · 카드 질문 연쇄 · 뜻 없음 · 두 번 읽힘'(구현자 · Opus · high, 2026-11-05 22:5x, 전체 루프 · 검토 xhigh)

## 맥락
- 첫 프리뷰(11-05)에서 요청자가 "설계한 대로 되지 않았다 · 일방통행 · 1단계와 똑같다 · 한글 해석 없음 · 두 번씩 말함"이라 했고, 분석 `task-talk-design-gap.md`(반드시 1 · 2 · 4 · 5 · 6절을 먼저 읽는다)가 원인을 가렸다. 실제 기록은 `preview-1-session-transcript.md`. 정본: `specs/02-2-세션과-단계표.md` 3.3(156 · 162 · 169 · 177 · 180 · 184 · 188 · 192 · 204 · 241 · 271 · 328줄), `specs/05-AI-호출.md` 49줄, 13절 C125 · C161 · C194, 설정 `specs/09-설정값.md` 74 · 79 · 88줄. 변경 spec `intent/2026-10-29-회화-수업을-대화로/spec.md` 263 · 267줄, plan 정한 것 9 · 20.
- 컨트롤러 결정(잠정 — 요청자 결정 D1 · D2 · D4 · D6 는 정할 것 쪽에서 따로): D1 은 잠정 (나) '2~3단계 AI 차례는 처음 · 다시 묻는 질문에 선택지 · 따라 할 말을 쓰지 않고 이어 묻는 예 · 아니요 질문에만 쓴다', D8 은 (가) 프롬프트 규칙, D3 은 (가) 반응만 고침, D5 는 (가) 카드 글(다른 담당). 5.2 3 '뜻을 문장마다'는 plan 정한 것 9 를 바꾸는 컨트롤러 판단으로 한다. 13절 C202(컨트롤러 잠정)에 talk.wait_line_seconds 1.5 → 3 과 이 잠정 규칙들을 적어 두었다.
- 증명은 단위 시험 + **실호출 대본 대조**(T-131 규칙 (3)): 고친 뒤 `talk:observe`(다른 구현자가 같은 시각에 만드는 중, `scripts/talk-observe.ts`)가 준비되면 컨트롤러가 돌린다 — 이 브리프에서는 돌리지 않는다.

## 맡는 파일
`src/core/ai/calls/talk-lesson.ts` · `src/server/conversation/lesson-turn.ts` · `src/server/conversation/lesson-input.ts` · `src/core/conversation/lesson-flow.ts` · `src/core/conversation/spoken.ts` · `src/server/ai/talk.ts`(겹침 없애기) · `src/components/conversation/tori.tsx` · `talk-log.tsx`(문장별 뜻 표시가 필요할 때만) · `seed/settings.json`(talk.wait_line_seconds 만) · `tests/fixtures/settings.ts` · 닿는 단위 시험(`tests/unit/talk-lesson-call.test.ts` · `talk-lesson-turn.test.ts` · `talk-spoken.test.ts` · `talk-stream-call.test.ts` · `talk-bubble.test.ts` 등). 스키마(talk_turns.tori_ko 칸 꼴)를 바꿔야 하면 마이그레이션 없이 jsonb 안 꼴로(칸 추가 금지) — 안 되면 보고.

## 할 것(분석 5.1 · 5.2 번호 그대로)
1. **5.1 1 — 1~3단계 고정부 다시 쓰기**(talk-lesson.ts 725~735): 따라 할 말은 받침 1 · 3, 들리지 않음, 'Chances, new words to introduce' 낱말을 꺼낼 때만. 이미 물었거나 짧은 준비에서 보인 낱말을 노린 질문에는 따라 할 말 · 선택지 없음(02-2:271). 한 턴에 둘을 함께 쓰지 않음. 3단계는 답을 들려주는 대신 힌트 단추에 맡김(02-2:328). '고르기 꼴 자주'(727)는 잠정 (나) 규칙으로.
2. **5.1 2 — 이어 묻기 먼저**(689 뒤): '아이가 카드 질문에 답한 다음 차례는 그 답에 이어 묻는다. 다음 카드 기회는 아이 말이 닿을 때 꺼낸다.'
3. **5.1 3 — 장면 단정 금지**(691 뒤): 'You are thirsty.' 같은 아이 상태 · 행동 단정 금지, 카드 질문 앞 장면 문장은 물건 말이나 묻는 꼴로 바꿔 말함.
4. **5.1 4 — 인사 끝 · 인사 반응**(703 · 687): 인사 끝 예 'Let's learn some new words!' 되살림, 사용자 메시지에 다음 토막 한 줄, 인사 답에는 되받기('you are fine') 대신 사람처럼 반응, 되풀이 규칙은 대화 토막의 틀린 말 · 짧은 답에만.
5. **5.1 5 — 한국어 뜻 알리기**(490 · 714 · 가변부): 'Korean meaning: yes/no'(spec.koMeaning) 한 줄, 칸 설명 '이 단계면 tori_en 의 모든 문장 뜻을 쓴다'.
6. **5.1 6 — 선택지 오답도 말이 되게**(732), 1단계 장난 오답은 그대로.
7. **5.1 7 — 맞장구 시간**: talk.wait_line_seconds 기본값 3(seed/settings.json · fixtures, 13절 C202).
8. **5.2 1 — 소리 줄 거름**(talk-lesson.ts 1214~1244 · lesson-turn.ts 1037~1041): 다시 묻는 턴(노린 낱말을 이 대화에서 물었거나 짧은 준비에서 보였거나 앞 세션에서 만남)과 받침 0 에서 '꺼낼 새 단어' 밖 낱말의 따라 할 말 · 선택지를 버린다(02-2:180 · 271). 따라 할 말이 선택지 하나와 같으면 따라 할 말을 버린다(C125 넓힘, A4). 단계 규격 choices 를 읽어 거른다(3단계 false). 꺼낸 새 단어는 '꺼낼 새 단어' 안만(A8).
9. **5.2 2 — 사용자 메시지 두 줄**(865~917, 셈은 lesson-flow.ts): '앞 차례가 카드 기회였는가' · '마지막 이어 묻기 뒤 AI 차례 수'.
10. **5.2 3 — 뜻을 문장마다**: tori_ko 를 문장 배열로 받아 빠진 문장의 뜻만 뺀다(스키마 · 저장 · 흘려 보내기 · 화면). 옛 한 글 꼴도 읽히게(하위 호환).
11. **5.2 4 — Minor 셋**: 선생님 문장 수 초과를 talk_turns 길이 초과에(A7), '이미 만난 낱말'에서 인식 실패로 건너뛴 준비 낱말 빼기(lesson-input.ts 116, A9), 인사 끝의 다음 토막 줄.
12. 단위 시험: 거름 규칙(다시 묻는 턴 · 받침 0 · 따라 할 말 = 선택지 · choices false) · 사용자 메시지 두 줄 · 문장별 뜻 · 프롬프트 고정부 문장(스냅숏이 아니라 규칙 문장 포함 여부) · wait_line_seconds 값. 관문 0.

## 지키는 것
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD f4ec058). 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. 관문 biome ci · tsc · `vitest run --project unit` · check:ids 0. 시험 먼저(새 규칙은 먼저 실패 확인). 커밋 · push 금지(컨트롤러). 개발 DB 쓰기 · 환경 파일 값 출력 금지. 다른 구현자가 같은 시각에 다른 파일을 고친다 — **맡은 파일 밖은 건드리지 않는다**(필요하면 보고에 적는다). 설계 숫자는 설정값. 아이 화면 글은 한국어 해요체. 긴 출력은 스크래치패드 파일로.

## 보고
`task-talk-prompt-1-report.md`: 항목별 바꾼 줄 · 대조한 정본 줄, 프롬프트 고정부 전문(바뀐 부분), 거름 규칙 표, talk:observe 로 볼 것, 우려. 답은 요지 다섯 줄 안.
