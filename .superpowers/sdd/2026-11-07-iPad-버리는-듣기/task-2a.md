# 묶음 2-가 — 음성 접점(openDiscard · synthState · 숨김, src/lib/speech/*)

브리프: 컨트롤러 · 2026-11-07 15:0x · 구현자 Opus high → code-reviewer Opus xhigh → fix(전체 루프)

## 맥락(열 줄 안)
- 결정: 13절 **C213(컨트롤러 14:4x — C212 를 대신함: 정할 것 8 · 9 · 10 은 권고안 가, 프리뷰는 개발 DB 에서 discard_mode ios 로 켬, 되돌림 off)** · C210 · C210 보완(deaf_skip_after) · C53 (2) · C166 R1 · R2 · C201 · C149 · 요청자 결정 2026-11-06 6 가(녹음 안 함 · 서버형 인식 불승인 · 기술 오류 비기록). 시드 기본 discard_mode 는 plan 대로 off(plan 머리 줄 컨트롤러 결정 (2)).
- 정본: spec `intent/2026-11-07-iPad-버리는-듣기/spec.md` 설계 1~8 과 plan `intent/2026-11-07-iPad-버리는-듣기/plan.md` 의 정한 것 · 접점 · 바뀌는 파일 표 · 작업 순서 · 위험 · 증명. 깊은 근거는 분석 보고 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/task-mic-probe-analysis-report.md` 10.20.4(F1~F12) · 10.20.7, 기록 7 · 8(`docs/research/2026-11-07-마이크-점검-기록-{7,8}-*.md`).
- 요청자 강조: iPad 마이크 안정화가 최우선이고, 녹음하지 않으며, '말하기 → 한 번 더 눌러 멈춤 → 선생님 말 → 다시 말하기'를 꼭 본다.
- 지킬 것: off · 켜지 않은 기기는 지금과 글자까지 같다(기존 시험 단언을 고치지 않음). 시점 숫자는 설정에서 읽는다(design-number 46/49). 시험 이름은 'AC-' 로 시작하지 않는다. 같은 트리에 '회화 AI 몫 넓힘' 변경 91 파일이 커밋 전으로 있다 — 그 파일은 건드리지 않는다(목록 `scratchpad/ai-scope-files.txt`).
- 일터: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(세션 cd 금지, 서브셸만), pnpm 은 PATH 앞에 `~/.nvm/versions/node/v24.22.0/bin`, 로컬은 단위만 돈다. plan 의 '손대지 않는 파일' 목록은 건드리지 않는다. 커밋 금지.
- 묶음 2-가 몫: 음성 접점은 모든 영역(읽기 · 쓰기 · 말하기 · 회화)이 쓴다. 새 길은 openDiscard 와 trace 셋뿐이고 speak · listen · 감시의 지금 길은 그대로 둔다(기존 음성 단위 시험 다섯 그대로 통과). 버림 trace 에 글 없음(수만) — 녹음 · 글 보관 없음.

## 할 것
plan 바뀌는 파일 표의 2-가 행 그대로: `src/lib/speech/types.ts`(첫 걸음 — SpeechPort 선택 칸 둘 · DiscardHandle · ListenCallbacks.started? · SpeechTraceEntry 셋, plan 접점 표) · `src/lib/speech/browser.ts`(openDiscard · synthState · 숨김 · 마이크 확인) · `src/lib/speech/fake-web-speech.ts`(spokenAt, 대본 배정 그대로) · `tests/unit/discard-browser.test.ts`. 묶음 1 이 나란히 `src/core/speech/discard.ts` 를 만든다 — types.ts 의 접점 꼴은 plan 접점 표대로 두면 맞는다. 완료 조건: 내 시험 0 · 기존 음성 시험 그대로 · biome · tsc 0 · 단위 전체 0(남의 붉음이면 BLOCKED). 보고 `.superpowers/sdd/2026-11-07-iPad-버리는-듣기/task-2a-report.md`, 요지 세 줄.
