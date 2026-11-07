# 구현 브리프: 개발용 DB 에 회화 1단계 견본 수업 넣기 — 시험용 시드 나무 · 적재 길(implementer impl-p13-2 이어 보기 · Opus · high, 2026-10-23 01:0x, 가벼운 루프)

## 왜
회화 1단계가 홈부터 끝까지 프리뷰에 올라갔는데(차례 6 커밋 746a0e7), Supabase 개발용 DB 에는 회화 수업 행이 없어 요청자가 눌러 볼 수 없다(홈 회화 카드 → 수업 목록이 빈 채). 장부 48행은 '회화 적재 `--areas talk`'를 1-나 몫으로 적었지만 C85 로 회화가 1-가에 당겨졌으니 지금 한다. 시험용 시드(C75 — 진짜 시드 P8 전까지)의 꼴로.

## 할 것(워크트리 p13, HEAD 220a51c)
1. `tests/fixtures/seed/dev-tree.ts` `DEV_SEED_AREAS` 에 `"talk"` 를 더하고, `loadableSeed()` 나무에 회화 1단계 단원 1 카드가 없으면 견본 빌더(`tests/fixtures/seed/builders.ts` `talkCard` · `talkUnitCards` — e2e `talk.ts` `fullTalkLesson` 이 쓰는 다섯 토막 견본과 같은 꼴: 인사 · 오늘 쓸 말 · 말해 보기 · 대화(목표 턴 · 더 이야기할 거리 2) · 정리, 1단계 답 두 개 · 힌트 단 · 그림 키 없음)로 **단원 1 수업 셋(대화 1 · 2 · 3, 정규 — 다지기 1 은 있으면 좋음)** 을 나무에 둔다. 시드 검증(`pnpm seed:validate` — 회화 카드 검사 · 완전성 1단계) 통과. 토리 이야기는 넣지 않는다(검증기 story-field-missing 이 회화 카드 자체에는 안 걸리는지 확인 — 걸리면 '정할 것').
2. `pnpm seed:load --areas talk` 길이 회화 카드를 lessons 행(area talk · `card` 칸 · listTitle '회화 1단계 대화 n')으로 넣는지(P7a 적재기 — `src/server/seed/load.ts`), 안 되면 적재기의 회화 갈래를 작게 고친다(5절 lessons 행 꼴 · 차례 4 `startUnsafe` 가 읽는 `LESSON_SCHEMAS.talk` · `.card`).
3. 로컬 `pnpm db:dev --reset`(embedded Postgres)으로 적재해 회화 1단계 단원 1 에 수업 셋이 들어가고 `/talk/lessons` 가 목록을 보이는지(단위 또는 통합 하나 — 적재 뒤 `readLessonList({ area: "talk" })` 가 셋을 돌려줌) 확인. **Supabase 개발용 DB 에는 넣지 않는다**(컨트롤러가 요청자 허용 뒤 `pnpm seed:load --areas talk …` 로 넣는다 — 보고에 그 명령 한 줄(접속 문자열 없이)과 지울 때 명령도).
4. P10 · P11 · P13 e2e 가 그대로 초록인지(회화 카드가 시험용 시드에 들어가면 e2e 집 넣기 · 목록 시험이 바뀔 수 있음 — `tests/e2e/lessons.ts` · `talk.ts` 가 직접 넣던 수업 행과 겹치지 않게).

## 지킬 것
CLAUDE.md 전부. 시험용 시드 규칙(C68 · C70 · C75 — 무작위 · 아이 이름 · 연락처 꼴 없음, 지어낸 낱말 bababa 꼴 그대로). 설계 숫자 없음. 커밋 없음. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`.

## 보고
`task-p13-report.md` '개발용 시드 회화' 절(바뀐 파일 · 검증 결과 · 적재 명령 · 지움 명령 · 로컬 확인 · e2e 영향) · SendMessage 한 줄 → 컨트롤러 CI → 가벼운 검토(code-reviewer high · 범위 한정) → 커밋 → 요청자 허용 뒤 개발용 DB 적재.
