# fix 1 보고: P6b 작업 2 스크립트 · 규격(impl-p06b, 2026-10-17)

상태: DONE. 검토 `review-p06b.md` 의 I-1 · M-1~M-4 를 모두 고쳤다(ADDRESSED 5 · NOT ADDRESSED 0). 같은 워크트리 `.claude/worktrees/p06b`, 커밋 없음, 네트워크 없음.

시험을 먼저 더해 실패를 봤다. 실패한 시험은 셋이다. 하나는 .DS_Store 때문에 0 대신 1, 하나는 빈 카탈로그에서 0 대신 2, 하나는 `javascript:` href 에서 문제 0 이었다. 그 뒤 고쳐 통과시켰다.

시험 수: 164 → 165(새 시험 "그림 카탈로그: 행이 없으면 그림 폴더가 없어도 통과한다" 하나, 나머지는 기존 시험에 사례 추가).

## 지적마다

| 번호 | 판정 | 고친 곳(파일:줄) | 시험(파일:줄) |
|---|---|---|---|
| I-1 | ADDRESSED | `scripts/vocab-images.ts:196~214`. 그림 폴더가 없을 때 2 는 행이 있을 때만이다(206). 행이 0 이면 빈 파일 목록으로 보고 계속한다(214). 출력은 `vocab-images check: 행 0 · 파일 0 · 위반 0` 이다. | `tests/unit/vocab-images.test.ts:226` 새 시험. 빈 카탈로그와 폴더 없음은 0이고 출력 줄도 단언한다. 실제 없는 폴더를 읽어도 0이다. 행이 있는데 폴더가 없으면 2이다. 행이 없는데 파일이 있으면 1이다. |
| M-1 | ADDRESSED | `scripts/vocab-images.ts:73~87`. href 규칙을 허용 목록으로 바꿨다(`href\s*=(?!\s*["']?\s*#)`, 80~83). 이 규칙이 예전 'http 바깥 주소' href 규칙을 품는다. `attributeName` 이 href · xlink:href 인 animate · set 도 금지한다(84~87). | `tests/unit/vocab-images.test.ts:271~277`. javascript: href, data: xlink:href, animate attributeName="href", set attributeName="xlink:href" 의 네 사례가 있다. 기존 `xlink:href="#a"` · `url(#a)` · xmlns 통과 단언은 그대로 지난다. |
| M-2 | ADDRESSED(시험만) | 코드는 바꾸지 않았다. | `tests/unit/vocab-images.test.ts:196~202`. `old/` 폴더가 있으면 1이고, 줄에 `images/vocab/old/` 가 든다. 확인한 뒤 폴더를 지운다. |
| M-3 | ADDRESSED | `scripts/vocab-images.ts:157~160`. `parseCatalog(text, root)` 가 `join(root, "seed", "images.json")` 을 낸다. `runCheck` 는 `root` 를 받는다(선택, 기본 `.`). 폴더 없음 글도 `join(root, "public/images/vocab")` 이다(209). `main` 과 `runFetch` 는 resolve 한 뿌리를 넘긴다(296 · 373). | `tests/unit/vocab-images.test.ts:216~224`. 잘못된 뿌리(`<임시>/seed`)를 주면 두 오류 글에 `<임시>/seed/seed/images.json` · `<임시>/seed/public/images/vocab` 이 든다. |
| M-4 | ADDRESSED | `scripts/vocab-images.ts:261~262` 의 `SKIPPED_FILES = [".DS_Store"]` 항목은 건너뛴다(272). 그 밖 숨은 파일은 그대로 카탈로그 밖이다. | `tests/unit/vocab-images.test.ts:203~210`. `.DS_Store` 만 있으면 0이다. `.hidden` 이 있으면 1이고, 줄에 `images/vocab/.hidden` 이 든다. |

검토가 받은 '더한 것' 1~6 은 그대로 두었다. 다만 4의 href 바깥 주소 규칙은 M-1 의 허용 목록 규칙에 포함되도록 바꿨다.

## CLI 확인(임시 폴더, 네트워크 없음, 뒤에 지움)

```
seed/images.json = {"images":[]}, public/ 없음
$ pnpm images:check --root <임시>
vocab-images check: 행 0 · 파일 0 · 위반 0
exit 0
$ pnpm images:check --root <임시>/seed
vocab-images: 카탈로그가 없다: <임시 절대 경로>/seed/seed/images.json
exit 2
```

## 마무리 명령(워크트리, node v24.22.0)

| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm exec biome ci .` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm test` | exit 0, 17 파일 · 165 통과 |
| `pnpm check:deps` | exit 0, no dependency violations found (22 modules, 64 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | exit 0, `unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 58` |
| `pnpm check:bundle` | exit 0, 위반 0 |
| 비밀값 grep(바뀐 스크립트 · 시험) | 0 |
| `tests/.tmp` 남은 것 | 0 |

## 남긴 것

- 검토의 I-1 '어떻게'에는 plan 의 '폴더 없음 → 2' 문구를 '행이 있는데 폴더 없음'으로 고치라는 말이 있다. 이것은 plan 수정이라 구현자 범위 밖이므로 컨트롤러 몫으로 남긴다(plan-p06b '스크립트' 표 check 행).
- 스크립트 머리 주석 6줄의 종료 2 설명을 '행이 있는데 그림 폴더 없음'으로 고쳤다.
