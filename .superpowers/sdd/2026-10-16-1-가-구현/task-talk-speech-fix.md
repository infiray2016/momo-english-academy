# 브리프: iPad 사파리 '결과 없음' 처리 고침 N1~N4(구현자 · Opus · high, 2026-10-29)

바탕: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(feature/1a-p13d-teacher). **앞선 구현자(impl-talk-greeting-fix, 브리프 `task-talk-greeting-fix.md`)가 끝난 뒤에 시작한다** — 같은 워크트리의 turn.ts · tori.tsx 를 둘 다 만지므로 그 고침 위에서 작업한다. 분석 보고 `task-talk-speech-analysis-report.md`(같은 폴더) 1 · 2 · 3 · 4.1 · 5.3 · 7 · 8 · 9절을 먼저 읽는다. 보고는 `task-talk-speech-fix-report.md`.

## 확정된 사실(컨트롤러 DB 대조 2026-10-29)
- 요청자 기기는 iPad Safari 27.0 이다. 10-24 09:43:34 · 10-26 08:03:25 에 parent_alerts `mic_stalled`(code no-result)가 남았다 — '마이크가 잘 안 돼요' 화면까지 갔다. 10-26 은 인사 뒤 '오늘 쓸 말' 첫 낱말에서 결과 없음 3번(08:03:14 건너뜀) 뒤 11초 만에 멈췄다. 선생님 목소리는 들렸으므로(요청자가 인사 되풀이를 들음) 무음 모드는 아니다.
- 10-26 아이 턴 1 · 2 의 '모름'은 단추일 가능성이 높다(체감 대기 − 첫 문장 ≈ 1.1초 · 1.9초 < 3초 문턱).

## 컨트롤러 결정(요청자 위임 규칙, 13절에 C148 · C149 로 적는다 — 정본 반영은 컨트롤러가 문서 가지에, p13d 의 specs/ 사본은 구현자가 같은 글로 맞춘다)
- **C148(D1 가)**: iPad WebKit 이 말소리 없는 듣기를 'aborted · No speech detected'(앱 판정 결과 없음)로 끝내면, 모은 글이 없을 때 듣기 층에서 no-speech 로 읽는다. 그러면 C22 대로 세션 여섯 번 셈에서 빠지고 '말소리가 잘 안 들려요'(무음 모드 줄 포함) 안내로 간다. 아이 차례의 '결과 없음' 갈래는 정본 3.3 막힘 문단(no-speech 만 셈)과 맞게 뺀다. 7절 오류 행 · 3.3 막힘 문단에 한 줄.
- **C149(D2 가)**: 회화 아이 턴에 듣기 사건 요약 칸 `client_listen`(jsonb, 글 · 소리 없음)을 두고, 따라 말하기 시도 꼴(attempts.input jsonb, 마이그레이션 없음)에도 같은 선택 칸을 둔다. 값은 보고 4.1(src · br · r3d · listens[] · mf). 더하기만 하는 마이그레이션 0005. 5절 talk_turns 행에 칸 한 줄.

## 고칠 것(보고 5.3 그대로)
- **N1 [Important]** `src/core/speech/listen.ts:164-171, 449-454` · `src/lib/speech/browser.ts:272-278` · `src/components/conversation/child-turn.tsx:257-259`: 'aborted + No speech detected' 이면서 모은 글이 없으면 no-speech 오류로. chunk 다시 시작 길은 그대로. 말하기 세션도 같은 판정 함수(`src/core/speaking/judge.ts`)라 함께 지켜지는지 본다.
- **N2 [Important]** `src/server/conversation/turn.ts:135-151, 201-245` · `src/db/schema/learning.ts`(talk_turns.client_listen jsonb) · 마이그레이션 `drizzle/0005_*.sql` · `src/core/conversation/attempt.ts:25-31` · `src/components/conversation/talk-frame.tsx:351`(browser.ts 기록 사건을 회화 틀에도 넘김) · `src/components/conversation/follow-along.tsx`(시도에 listens 요약). 화면이 이미 보내는 nospeech 표시(src)를 저장한다. 글 · 소리 · 개인 정보는 넣지 않는다.
- **N3 [Minor]** `src/components/conversation/tori.tsx:284-290, 325-331` · `child-turn.tsx:339-357` · `talk-frame.tsx:1009-1031`: 듣는 중에는 다시 듣기 · 답 듣기 · 힌트 문장 듣기 단추를 끈다.
- **N4 [Minor]** `child-turn.tsx:209`: 결과 없음 · 오류로 끝난 듣기는 endedAt 을 듣기 끝 그대로(3초 덧붙음 없앰). N2 와 함께.
- 정본 사본(p13d `specs/`): 13절 C148 · C149 두 줄, 7절 오류 행 한 줄, 3.3 막힘 문단 한 줄, 5절 talk_turns 칸, 12절 바뀌는 설정 없음. `pnpm check:ids`(table-mismatch) · `pnpm spec:trace` 가 통과해야 한다.

## 시험(먼저 쓰고 실패를 본 뒤 고친다)
- N1 단위: 단추 stop · 상한 stop 뒤 'aborted · No speech detected' + 빈 글 → no-speech. e2e: WebKit 꼴 흉내(start → audiostart → stop → aborted 'No speech detected' → end, `tests/e2e/talk.ts:334-342` 옆)로 AC-15g(두 번 → '모름') · AC-N3(세 질문 → 말소리 막힘, 마이크 멈춤 아님)을 다시 돈다.
- N2 단위: 기록 사건 → 요약 꼴. 통합: 아이 행에 칸이 저장되고 글이 들지 않는다. 따라 말하기 시도에 listens 가 든다.
- N3 e2e: 듣는 중 세 단추가 꺼져 있다. N4 단위: 말소리 없음 '모름' 뒤 체감 대기 = 첫 문장 − 마지막 듣기 끝.
- 관문: `export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH` 뒤 `pnpm test` · `pnpm test:int` · `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm check:deps` · `pnpm check:ids` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` 통과. e2e 는 CI 에 맡긴다(시험 코드만).

## 지키는 것
- p13d 안에서만. 시드 · 다른 워크트리는 손대지 않는다. 커밋하지 않는다. 설계 숫자를 코드에 박지 않는다. 녹음하지 않는다. 아이 이름 · 비밀값 금지. 범위 밖 결함은 보고에만.
- 보고: 고친 파일 · 줄, 시험 이름 · 결과, 마이그레이션 적용 명령(개발용 DB 에는 컨트롤러가 적용), 남은 우려. 마지막 답은 상태와 보고 경로만.
