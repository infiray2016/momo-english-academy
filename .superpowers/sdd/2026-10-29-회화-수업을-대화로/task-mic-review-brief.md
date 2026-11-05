# 검토 브리프: 마이크 묶음(감지 · 기록 칸 · 쪽지 되돌아감 · 관찰 쪽 /dev/mic-probe) — 가벼운 루프, 범위 한정(2026-11-06 08:4x)

## 맥락
- 닿는 결정: 7절(녹음 안 함 · 32줄 '막힌 그 낱말'), C53 (5) · S7, C148, C201, 설정값 규칙, 13절 C205(잠정, 컨트롤러가 적는 중: iOS WebKit 에서 '못 듣는 마이크'(audiostart 가 speech.deaf_audiostart_ms 안 + speech.deaf_silence_ms 동안 소리 · 결과 없음)를 아이의 말소리 없음으로 세지 않고 안내만, 기록 칸 여섯, 재시작 수는 설정 0).
- 왜: 요청자 iPad(Safari 27) 회화 듣기 10 중 7 실패(분석 `task-ipad-listen-analysis-report.md`, 조사 `docs/research/2026-11-06-iPad-사파리-음성-인식-no-speech-조사.md`). e2e 분류 `task-e2e-webkit-triage.md` (나) 앱 결함 U4-5(쪽지 둘째 낱말 막힘 복귀 뒤 첫 낱말로 되돌아감).
- 구현 보고: `task-mic-1-report.md`(impl-mic-1, fix 1 iOS 한정 설정 포함) · `task-mic-probe-report.md`(impl-mic-probe). 브리프 `task-mic-1.md` · `task-mic-probe.md`.
- **11-06 00:05 배포는 서버가 읽는 설정 키가 목록에서 빠져 모든 회화 턴이 실패했다(장부 T-157).** 이번 묶음은 새 설정 키 넷(speech.deaf_audiostart_ms · deaf_silence_ms · deaf_retry_max · deaf_detect)을 더하므로 seed/settings.json · tests/fixtures/settings.ts · tests/fixtures/speech/settings.json · SPEECH_SETTING_KEYS · 09절 다섯 곳이 모두 맞는지가 첫째 점검이다. 컨트롤러가 배포 전 seed:load 로 넣는다.
- 같은 워크트리에서 impl-talk-prompt-1 이 고침 3 fix 2 를 하고 있다(`question-check.ts` · `talk-lesson.ts` · `lesson-turn.ts` · `lesson-flow.ts` · `talk-prompt-fix3.test.ts`). 그 파일들은 이 검토 범위 밖이다.

## 범위(diff `scratchpad/diff-mic.patch`)
seed/settings.json, specs/09-설정값.md, src/app/dev/speech-probe/speech-probe.tsx, src/components/conversation/{child-turn,follow-along,talk-frame}.tsx, src/core/conversation/{client-listen,listen}.ts, src/core/speaking/judge.ts, src/core/speech/{listen,script}.ts, src/lib/speech/{browser,listen-log,types}.ts, tests/e2e/talk.ts, tests/fixtures/settings.ts, tests/fixtures/speech/settings.json, tests/unit/{conversation-listen,talk-listen-log,talk-mic-deaf,mic-probe}.test.ts, tests/e2e/mic-probe.spec.ts, src/app/dev/mic-probe/*(새 파일 넷).

## 판정할 것
1. 설정 키 다섯 곳 일치(Critical 점검) · 서버 · 클라이언트가 키를 읽는 길에서 키 없을 때의 실패 꼴.
2. 감지 규칙이 분석의 실패 꼴(as 31~158ms · 소리 없음)만 잡고 성공 꼴(as 278ms 이상)과 '아이가 늦게 말함'을 잡지 않는지 — iOS 한정(speech.deaf_detect "ios")이 UA 판별과 맞는지, 데스크톱에서는 옛 흐름 그대로인지.
3. deaf 가 셈(talk.nospeech_dontknow_count · 쪽지 건너뜀 · 턴 보냄 · attempts)에 들지 않는 것이 서버 · 클라이언트 양쪽에서 일관되는지(서버 Zod 가 `deaf` 와 새 칸 여섯을 받고 옛 기록도 읽히는지).
4. 쪽지 되돌아감(U4-5): 막힘 복귀 뒤 '막힌 그 낱말'부터 이어지는지, 서버 attempts 와 화면 상태의 불일치가 다른 자리(정리 따라 말하기)에도 있는지.
5. 관찰 쪽: 녹음 · getUserMedia 없음, DB 쓰기 없음, 접근 제어(가족 쿠키) · dev 전용 노출, 전략 A~E 가 브리프대로인지, 복사 글에 비밀값 · 이름이 안 들어가는지, sessionStorage 기록의 크기 상한.
6. e2e `tests/e2e/talk.ts` webkitSilentRun 400ms 변경이 시험의 뜻을 바꾸지 않는지.

## 출력
`task-mic-review.md` — 심각도(Critical · Important · Minor)와 근거(파일 · 줄). 코드 수정 · 실호출 없음. 관문은 구현자가 0 이라 했으니 다시 돌리지 않아도 된다. 새로 본 것만 담는다.
