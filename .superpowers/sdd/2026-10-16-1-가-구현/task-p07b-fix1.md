# Minor 라운드 브리프: P7b 검토의 Minor 다섯(implementer impl-p07b 이어 보기 · Opus · high)

`review-p07b.md`(rev-p07b, **Approved** — C 0 · I 0 · M 5)의 Minor 를 고친다. 가벼운 루프라 재검토 없이 컨트롤러가 검사로 확인한다(C52). 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p07`(가지 feature/1a-p07b-ci-ids), 커밋하지 않는다. 고치는 법은 보고 3절 그대로.

## 고칠 것
1. **M-1** `scripts/check-ids.ts` `tableRows`(199~215): 12절에 같은 머리의 표가 둘 이상이면 모두 읽는다(머리 줄마다 그 표의 끝까지). 시험: 견본 정본에 같은 머리 표를 둘 두고 뒤 표의 키가 펼친 키에 드는지.
2. **M-2** `readSeed`(791~792): **명시한** `--seed-root` 가 없으면 종료 2 · 오류 한 줄(기본 `seed` 가 없을 때만 '건너뜀' 종료 0). 시험 하나.
3. **M-3** 교정 상한 대조(646~683): 사전에 있는 단계 외에, **AI 를 쓰지 않는 쓰기 1~3단계 규격에 `maxCorrections` 가 있으면 max-corrections 위반**(4~5단계는 그대로 뺌). 시험: 쓰기 2단계에 값이 있으면 잡힘 · 4단계 1 은 통과.
4. **M-4** `tests/unit/ci-workflows.test.ts`: `stepsOf` 가 `run: |` 뿐 아니라 `run: |-` · `run: >` · `run: >-` 블록을 읽고, 금지 글은 공백 유무와 무관하게(`${{\s*inputs\.` · `${{\s*secrets\.` · `toJSON(secrets)`) 본다. 시험 문장 더해 거짓 통과가 잡히는지.
5. **M-5** `tests/unit/check-ids.test.ts`: 첫 시험 견본 `ROWS` 에 `ai.effort.<호출>` 행을 더해 이름대로 넷 펼침을 증명하고, 설계 숫자 시험에 맨 위 대문자 상수가 아닌 자리의 허용 이름(`PASSAGE_PICTURE_UNTIL_LEVEL` 꼴)이 허용 목록으로만 빠지는 사례를 더한다.

## 완료 판정 · 보고
biome 0 · build · `pnpm test`(239 → 늘어남) · `pnpm test:int` 59 + 1 · check:deps 0 · spec:trace 51 · check:bundle 0 · `pnpm check:ids --specs <메인 specs>` 종료 0 · `--seed-root /nonexistent` 종료 2 · 비밀값 grep 0. 보고 `task-p07b-report.md` 끝에 'Minor 라운드' 절(지적마다 파일:줄 · 시험, 고치기 전 실패). 끝나면 요지 3줄 SendMessage. 그 뒤 컨트롤러 확인 → plan-p07b 완료 보고 → 커밋 요청.
