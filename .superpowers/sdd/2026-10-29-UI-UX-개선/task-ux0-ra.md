# 브리프: UI · UX plan 묶음 0-라 — 음성 층 감시 결과 셋(구현자 · Opus · high, 2026-10-30 00:1x)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185)의 묶음 0-라 를 구현한다. spec 은 `intent/2026-10-29-UI-UX-개선/spec.md`(2판) 설계 3 '필수 (가) 발화 표시' · 정본 변경 행 R-48(7절 읽어 주기 감시 — 들려줌 · 끝 알림 없음 · 들려주지 못함 세 갈래) · C179 보완 (2)(감시 타임아웃으로 넘어간 발화는 정상과 가르고, 설명 · 듣기 문제에서 소리가 안 났으면 다시 듣기 · 복구 안내, 기술 오류로 기록 — 화면 몫은 5-나 · 6, 여기서는 음성 층 결과 값만). 정본 7절 읽어 주기 감시 행(C180). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(커밋 전 변경 위에 고친다). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지. 통합 · e2e 는 못 돌린다.

## 범위(plan '바뀌는 파일' 묶음 0-라 표 그대로)
| 파일 | 무엇을 |
|---|---|
| `src/lib/speech/types.ts` | SpeakOutcome 'ended' 에 들려준 결과(제안 `heard: "played" \| "no_end" \| "not_played"`) |
| `src/core/speech/pace.ts` | 순수 함수(제안 `speakHeardOf`): 시작 · 끝 알림 유무로 셋을 가름 |
| `src/lib/speech/browser.ts` · `paced.ts` | browser.ts 의 감시 끝냄(giveUp no-start · no-end)과 정상 끝(onend)이 heard 를 다르게 싣는다. paced.ts 의 첫 값도 같은 꼴. 가짜 음성은 대본(utterance runs)으로 시작 알림 없음 · 끝 알림 없음을 만들고, 모자라면 `tests/.../fake-web-speech.ts` 를 고친다 |
| `tests/unit/speech-speak.test.ts` · `fake-web-speech-defaults.test.ts` | 세 갈래 시험 |

값의 뜻(spec R-48 · 설계 3): 시작 알림도 끝 알림도 온 발화는 '들려줌(played)', 시작은 왔으나 끝 알림이 없어 감시가 넘긴 발화는 '끝 알림 없음(no_end — 들려준 것으로 보되 표시)', 시작 알림이 없어 감시가 넘긴 발화는 '들려주지 못함(not_played)'. 결과를 받는 화면(C166 R1 감시 타이머 · 1차 묶음)은 지금 동작을 바꾸지 않고 값만 더 받는다(화면 몫은 5-나 · 6). 설정 키(speech.speak_start_timeout_seconds · speak_end_timeout_extra_seconds · speak_chars_per_second)는 지금 것을 그대로 읽는다. 설계 숫자 코드 금지.

## 하지 않는 것
0-가(검토 중) · 0-나(끝) · 0-다 · 0-마 · 2 이상, 회화 · 세션 화면 조각, `src/core/seed/**` · `specs/` · 시드는 손대지 않는다. 커밋하지 않는다.

## 절차 · 관문
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 기준 49) · `pnpm spec:trace --fail-on unknown-ac`. 다른 손 때문에 실패하면 고치지 말고 적는다.

## 보고(`task-ux0-ra-report.md`, 같은 폴더, 40줄 안)
바뀐 파일 · 새 순수 함수 · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
