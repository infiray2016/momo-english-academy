# 구현 브리프: 회화 선생님 시드 쪽 — 작은 손질 2(implementer 새로 · Opus · high, 2026-10-23 10:4x)

까닭: fix 1 재검토(`review-teacher-seed-side-fix1-code.md`) Approved 뒤 남은 Minor N-1 · N-2 · N-4 와, 범위 밖 관찰 1 을 받은 컨트롤러 결정 **C135**(13절 — 회화 단계 규격의 '대화 방식'(mode) 칸도 '선생님 이름' 검사를 받는다. p13 `src/core/ai/calls/talk.ts` 가 `["Conversation mode", spec.mode]` 로 AI 프롬프트에 넣는 AI 가변부라서다). 네 가지뿐이고 그 밖은 손대지 않는다.

자리: 워크트리 p08(`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p08`, 가지 feature/1a-p08-seed-generation). 커밋 없음. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 정본 6.4 '선생님 이름' 행과 13절 C135 는 컨트롤러가 고친다(코드 주석은 당신 몫). 같은 시간에 이 워크트리의 `seed/` 에서 시드 생성자가 `pnpm -s seed:validate` 를 돌리니, `src/core/seed/` 파일은 문법이 깨진 채로 저장해 두지 않는다(고침은 한 번에 쓴다).

1. **N-1** `src/core/seed/check-teacher.ts` `KO_NAME_WORD_EXCEPTIONS` 에서 `'토리이'` · `'미나토'` 를 뺀다(앞부분 일치라 '토리이야기' · '토리이야' · '토리이랑' 을 가린다). `tests/unit/seed-teacher.test.ts` 의 '안 걸림' 목록에서 `'토리이 앞에서'` · `'미나토 구'` 를 '걸림' 목록으로 옮기고, '토리이야기' · '토리이랑' 도 걸림에 더한다. 주석(C132 (1) 설명)의 예시도 맞춘다.
2. **N-2** 같은 파일 `nameAt`: 이름 마지막 음절에 받침이 없을 때 받는 줄임 받침은 **ㄴ(받침 번호 4) · ㄹ(8)** 뿐이다(토린 · 토릴). 지금은 모든 받침을 받아 '미남' · '미납' · '토림' · '리온' 이 걸린다. 받침 번호 둘은 이름 붙인 상수로(유니코드 한글 음절 표의 받침 차례라 설계 숫자가 아님 — `HANGUL_FINALS` 주석 꼴). 시험: '미남이야' · '미납' · '토림' · '리온이' → 안 걸림, '토린 좋아' · '토릴 불러.' → 걸림(그대로).
3. **C135** `checkTeacherNamesInSpecs` 가 회화 행의 `mode` 칸(`levelSpecs.<i>.mode`, role `ko`)도 본다 — can-do 조각 바로 뒤에 같은 꼴로. 입력 타입에 `mode: string` 을 더하고 `reference-index.ts` 호출 자리가 그대로 맞는지 본다(levelSpecs 행에 `mode` 가 있음 — `schema/reference.ts` 264). 파일 머리 주석 (1) 의 'C132 (2)' 문장에 '대화 방식(C135)' 을 더한다. 시험(`seed-teacher.test.ts` 'AC-19e 회화 영역의 단원 규격 주제와 단계 규격 can-do 글에 …' it): 회화 행 `mode` 에 '토리가 상대역' 을 넣어 `["teacher-name", SEED_FILES.levelSpecs, "levelSpecs.<i>.mode"]` 가 나오고, 읽기 행 `mode` 에 넣은 것은 안 나오는 단언을 더한다(기대 배열 차례는 코드가 내는 차례대로).
4. **N-4** C134 를 단언하는 시험 셋을 `seed-teacher.test.ts` 의 'C132 (3) …' it 옆에 더한다(기존 fix 1 코드가 이미 그렇게 동작한다 — 시험만 더하고, 안 맞으면 보고에 적고 코드는 고치지 않는다):
   - (가) 회화 카드 예상 흐름(`card.flow[0]`)에 금지어(`seed/lists/forbidden.json` 의 낱말 하나 — 시험용 나무의 forbidden 목록에서 고른다)를 넣으면 금지어 규칙 오류가 난다(예상 흐름도 금지어 · 선생님 이름 검사는 받는다).
   - (나) 5단계 회화 카드의 미션 영어(role prompt 인 다른 칸)는 문장 길이 상한을 그대로 받는다(C134 '미션 영어 등 다른 prompt 역할 글은 지금 검사 그대로') — 5단계 카드 견본이 시험용 나무에 없으면 4단계 이상 카드의 미션 칸으로.
   - (다) 예상 흐름에만 나온 단원 단어는 보강 덮기 '나옴' 세기와 단원 단어 확인에서 세지 않는다(check-cross.ts 덮기 58-68 · 400-406, check-lesson.ts 339 — fix 1 재검토 2 절 3 항 참고). 단원 단어 하나를 모든 아이에게 보이는 칸에서 빼고 예상 흐름에만 두면 '단원 단어 안 나옴' 쪽 오류가 나는 것으로 단언한다.
   - `src/core/seed/check-talk.ts` 28줄 주석을 C134 다섯(문장 길이 · 형태 범위 · 단원 단어 · 문장 통계 · 보강 덮기 세기에서 빠지고 금지어 · 선생님 이름은 받음)으로.

관문: `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test`(단위) · `pnpm -s seed:validate`(실시드 오류 0 — 442칸 그대로) · `pnpm check:ids --specs ../../../specs`(지난번과 같음 — spec-setting-missing 다섯 · setting-default 하나는 p13 설정 몫이라 그대로, 새 어긋남 없음).

보고: `task-teacher-seed-side-fix2-report.md`(같은 폴더) — 바뀐 파일 · 줄 · 시험 이름 · 관문 결과 · N-4 (나) · (다) 에서 코드가 기대와 달랐으면 그 사실. 마지막 답장 한 줄 요약.
