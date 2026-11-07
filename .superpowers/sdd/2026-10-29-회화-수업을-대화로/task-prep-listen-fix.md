# 브리프: 짧은 준비 쪽지의 듣기 시작 — iPad 사파리 no-speech(구현자 · Opus · high, 2026-11-05 22:1x)

## 맥락
- 첫 프리뷰 iPad 시험(요청자, 사파리 27.0, 회화 3단계 단원 1 세션): **짧은 준비 쪽지에서 말해도 인식이 안 되고 '듣고 있어요' 표시도 안 뜸**. 서버 기록(talk-prep 시도 clientListen): eat · drink 각 3번 모두 `error:no-speech`, snd false(소리 들어옴 없음), d 3.8~5.3초, as(오디오 시작) 116~142ms, by button. 반면 인사 턴(ChildTurn)은 됨: snd true, fr 2146ms, as 1005ms. go 는 'Call' 로 인식(snd true, fr 2650ms). 장부 T-125. 10-29 C148(aborted · No speech detected → no-speech)과 같은 결.
- 가설: 쪽지(PrepNote, `src/components/conversation/follow-along.tsx`)는 낱말 읽어 주기(TTS) 직후 · 도중 단추를 누르면 읽어 주기를 멈추고 바로 듣기를 열어(as 116ms) iOS 가 마이크를 못 잡는다. 대화 ChildTurn(`child-turn.tsx` · `src/lib/speech/browser.ts`)은 읽어 주기 멈춤 → 짧은 쉼 → 듣기(as 1005ms)라 된다. 또 쪽지에 '듣고 있어요' 상태 표시가 없거나 늦다.
- 정본: 7절(음성과 오류) 듣기 규칙 · C148 · C149 · 설정 `speech.*`(09절). 설계 숫자는 설정값.
- 맡는 파일: `src/components/conversation/follow-along.tsx` · (필요하면) `src/lib/speech/*` 의 듣기 시작 도우미 · `src/core/speech/*` 순수 함수 · 단위 시험 `tests/unit/talk-follow.test.ts` · 새 단위 시험. 다른 구현자가 home-cards · lesson-board · board/* · e2e 를 고친다 — 건드리지 않는다. e2e 는 고치지 않는다(보고에 '다음 e2e' 로 적는다).

## 할 것
1. 쪽지와 ChildTurn 의 듣기 시작 길을 코드로 대조해 차이(읽어 주기 멈춤 뒤 쉼 유무 · 길이, 듣기 시작 표시, 자동 시작 여부)를 보고에 표로 적는다.
2. 쪽지의 듣기 시작을 ChildTurn 과 같은 길(공용 도우미)로 맞춘다: 읽어 주기 멈춤 → 설정값만큼 쉼(기존 키가 있으면 그 키, 없으면 `speech.*` 새 키 제안은 보고에 — 코드에 숫자 고정 금지) → 듣기. '듣고 있어요' 표시와 소리 들어옴 표시가 쪽지에도 보이게(ChildTurn 과 같은 표지 `data-answer-listen` 꼴은 e2e 가 읽으니 이름을 바꾸지 않는다).
3. no-speech 가 이어질 때의 길(3번 뒤 건너뜀 skipped recognition)은 그대로.
4. 단위 시험: 듣기 시작 순서(멈춤 → 쉼 → 듣기)와 표시를 순수 함수 · 조각 시험으로. 관문 0.

## 지키는 것
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD ed5d845 위 미커밋 없음). 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. e2e · 통합은 이 Mac 에서 못 돌린다(시험용 Postgres 안 뜸) — 정적으로 고치고 부르는 함수 · 표지 · 설정 키를 코드 줄로 대조해 보고에 적는다. 관문 biome ci · tsc · `vitest run --project unit` 0. 시험 파일은 있으면 Edit 로만. 커밋 · push 금지(컨트롤러). 개발 DB 쓰기 · 환경 파일 값 출력 금지. 다른 구현자가 같은 시각에 다른 파일을 고치므로 **아래 파일 밖은 건드리지 않는다**(필요하면 보고에 적는다). 긴 출력은 스크래치패드 파일로.

## 보고
`task-prep-listen-fix-report.md`: 대조 표, 바꾼 줄, 설정 키, 첫 프리뷰 뒤 iPad 에서 확인할 것. 답은 요지 다섯 줄 안.
