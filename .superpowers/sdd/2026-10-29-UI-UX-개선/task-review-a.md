# 검토 브리프 A: 불편 1차 묶음 — 음성 · 듣기 피드백(code-reviewer · Opus · xhigh, 2026-10-29 18:3x)

작업 자리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(머리 0c664c3 위, 커밋 전 변경). 같은 작업 트리에 구현자 B(화면 피드백 · 보상)의 변경도 함께 있다. **이 검토의 범위는 A 의 파일이다**(아래 목록). B 의 파일은 A 와 맞닿는 곳(talk-frame.tsx · session-frame.tsx · 설정 셋 · e2e 셋)만 본다. 쉘 작업 디렉터리를 옮기지 말고 `git -C <작업 자리>` · 절대 경로로 읽는다. 고치지 않는다.

## 읽을 것(차례대로)
1. 구현 브리프 `.superpowers/sdd/2026-10-29-UI-UX-개선/task-ux-fix-a.md` 와 구현 보고 `task-ux-fix-a-report.md`(설계와 다르게 한 것 7 · 요청하는 변경 · 남은 우려 4).
2. 근거: UX 검토 3판 `ux-review-report.md` 의 2절 ⑤ ⑥ ⑦, 4절 (다), 5절 R1 · R2 · R6, 불편 장면 4 · 5 · 6 · 9 · 10 · 11 · 12. 13절 C166(`specs/10-결정-기록.md`) · C53 (2)(대화 턴 읽는 중 단추) · C148 · C149 · C22 · C36 · C37 · C72. 정본 7절(`specs/07-음성과-오류.md` 말하기 버튼 · 읽어 주기 · 오류 · 마이크 행) · 4절 회화 세션 표(`specs/03-화면.md`) · 3.3 막힘 문단(`specs/02-2-세션과-단계표.md` 129줄).
3. 열린 장부 `ledger-open.md`(L-1~L-6, 잠정 값). 닫힌 장부는 없다.

## A 의 파일(검토 범위)
src/core/speech/listen.ts · pace.ts · script.ts, src/lib/speech/browser.ts · types.ts, src/components/answer/speak-button.tsx · repeat.tsx, src/components/session/mic-blocked.tsx · speaking.tsx, src/components/conversation/follow-along.tsx · child-turn.tsx · talk-frame.tsx(A 몫: 아이 차례 여는 효과 · 아이 말풍선 상태 · 막힘 retry · data-talk-reading) · session-frame.tsx(막힘 retry), seed/settings.json · specs/09-설정값.md · tests/fixtures/settings.ts · tests/fixtures/speech/settings.json(새 키 넷), tests/unit/speech-feedback.test.ts · speech-speak.test.ts · speech-pace.test.ts · mic-check.test.ts, tests/e2e/speech-feedback.spec.ts · conversation.spec.ts · teacher-window.spec.ts · speaking.spec.ts. 추가로 child-turn.tsx 의 `<HintLoadingDots />` 와 follow-along.tsx 의 `<SilentModeNote />` 꽂은 줄(조각 자체는 B 몫).

## 판정할 것
- 설계 준수: 브리프 항목 1~7 이 빠짐 · 넘침 · 잘못 이해 없이 됐는가. R1(대화 턴 읽는 중 단추 보이고 누르면 읽기 멈춤, C53 (2)) · R2(따라 말하기 읽는 중 흐림, 끄지 않음) · R6(막힘 화면 '다시 해 볼래요' → 마이크 다시 확인 → 같은 자리) · U5-1 감시 타이머(시작 안 옴 · 끝 안 옴 → ended, synth.cancel) · U4-2 · U4-4 · U5-4 · U5-3 · U5-9.
- 위험한 곳 둘을 특히: (가) 감시 타이머가 정상 발화를 끊지 않는가(긴 읽기 지문, 느린 기기, 시작 알림이 늦는 iPad — C148 관찰과 맞대어) · 끊은 뒤 상태 정리(ended 중복 호출 · 다음 듣기 시작과의 경합 · 기록 speak-event 'timeout'). (나) R1 로 아이 차례가 읽는 중 열릴 때의 경합: 누르면 읽기 멈춤 → 듣기 시작 차례, 1~3단계 바로 보내는 턴, '더 이야기할래?' 고르기, 정리 다시 읽기, e2e 기다림(untilChildTurn · data-talk-reading · :not([data-speak-waiting])).
- 설정값 원칙: 새 키 넷(speech.speak_start_timeout_seconds · speak_end_timeout_extra_seconds · speak_chars_per_second · skip_notice_seconds)이 코드에 숫자 없이 읽히는가, 12절 사본 · 고정본과 같은가, 없을 때 던지는 것이 알맞은가(개발 DB 적재 전 화면이 던진다는 보고 — 더 나은 길이 있는가는 Important 이하로만).
- 아이 화면 원칙(한 화면 한 행동 · 해요체 · 큰 글자): 새 문구 넷('듣고 있어요' · '다 읽은 뒤 눌러요' · '이건 다음에 다시 해요' · '잘 안 들려서 다음으로 가요' · '다시 해 볼래요' · '아무 말이나 한마디 해 주세요')과 안내 줄 크기.
- 시험: 먼저 쓴 시험이 실제로 그 행동을 잠그는가(통과만 하는 시험 · 구현을 되읽는 시험은 지적). e2e 8건과 기다림 고침은 돌리지 못했으니 정적으로 읽어 깨질 곳을 짚는다(이 Mac 에서는 내장 Postgres 가 뜨지 않으니 돌리지 않는다).
- 브리프 밖 파일(types.ts · repeat.tsx · session-frame.tsx · e2e 셋)의 변경이 필요한 최소였는가.

## 보고
`.superpowers/sdd/2026-10-29-UI-UX-개선/review-a-report.md` 에 한국어로. 지적마다 심각도(Critical · Important · Minor)와 근거(파일:줄 · 정본 절 · 줄 · 결정 번호)를 적는다. 근거 없는 지적은 넣지 않는다. 장부 L-4 · L-5 는 닫힘 · 아직 열림을 판정한다. 맨 위에 판정(Approved · Changes requested)과 Critical · Important · Minor 수. 마지막 답은 판정과 보고 경로만.
