판정: Changes requested — Critical 0 · Important 1 · Minor 4 (rev-p06b, 가벼운 루프 · 범위 한정, 2026-10-17 01:0x)

# 코드 검토: P6b 그림 카탈로그 작업 2 — 스크립트 · 규격

대상: 워크트리 `.claude/worktrees/p06b`(feature/1a-p06b-vocab-images, 바탕 6bd6015, 커밋 없음). 기준: plan-p06b(approved, 컨트롤러 결정 H7 1안 · C65), 13절 C54 · C60 · C65, 5절 images 행과 `specs/04-데이터.md:9` '한 장 100KB 이하', 10절 그림 행, 구현 브리프 task-p06b.md, P6a plan 32줄(`seed/images.json` = `{ "images": [] }`).
한 일: diff · 새 파일 두 개 전부 읽음, 시험 파일 하나(`tests/unit/vocab-images.test.ts`) 실행 4 통과 · `tests/.tmp` 비워짐 확인, 스크래치패드 임시 뿌리에서 `images:check` 두 번(네트워크 없음), `checkSvg` 를 tsx 로 직접 불러 꼴 열 가지 확인. 저장소 · 워크트리 파일은 고치지 않았다.

## 1. 설계 준수

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 1 규격 한 줄 | ✅ | `src/core/seed/schema/reference.ts:345` 정규식이 plan '바뀌는 파일' 글자 그대로. 키 ≠ 파일 이름은 같은 파일 superRefine(358~364)이 거부하고, 시험 `tests/unit/seed-schema.test.ts:610~629` 이 svg 통과 · other.svg 거부 · gif 거부를 단언. 164 = 159 + 5 는 컨트롤러 재확인 값 |
| 2 IMAGE_MAX_BYTES | ✅ | `src/core/seed/structure.ts:288~289`, 5절 문장 주석. 12절 키도 level_specs 칸도 아닌 구조 수라 C54 (2) 자리가 맞다. 시험은 상수에서 읽음(`vocab-images.test.ts:147 · 158 · 194`) |
| 3 순수 함수 넷 | ✅ | `parseSource`(42) · `twemojiUrl`(67, 주소 글자 그대로, 시험 66~68) · `checkSvg`(92, plan 목록 + 넓힘) · `checkCatalogFiles`(110, 있음 · 이름 = 키 · ≤ 상한 · 밖 파일). 모듈 꼭대기는 상수와 `isDirectRun` 가드뿐(358~373). 종료 0 · 1 · 2. `src/` · seed-validate · spec-trace · check-bundle 에서 `vocab-images` grep 0줄. fetch 는 쓰기 전에 checkSvg · 상한으로 거름(307~314) |
| 3 종료 코드의 뜻 | ❌ | 빈 카탈로그 + 그림 폴더 없음이 2 → CI 가 깨진다(I-1) |
| 4 더한 것 1~6 | ✅ | 아래 표. 모두 받되 1 · 4 · 6 에 Minor 하나씩 |
| 5 공용 변경 | ✅ | `package.json:21~22` 두 줄 · `.github/workflows/ci.yml:103~104` 한 단계가 plan '요청하는 공용 변경' 글자 그대로(P4c hashFiles 꼴, 들여쓰기 같음) |
| 6 시험 | ✅ / Minor | 이름 다섯이 plan 증명 표와 글자 그대로(grep -F 로 각 1건). fetch 를 부르지 않음(runFetch 는 내보내지 않음). 임시 폴더 afterAll 로 지움(23~25, 실행 뒤 비워짐 확인). 바깥 주소 변형 · xmlns 예외는 지나감. 하위 폴더 갈래는 시험이 없다(M-2) |
| 7 우려 1 | 기록 | 아래 '우려 1' |

## 2. 잘한 점

- `parseSource` 가 코드 꼴을 `[0-9a-f]+(-[0-9a-f]+)*` 로, 판을 `\d+.\d+.\d+` 로 묶어(33) 주소 · 경로에 `../` 나 대문자가 끼지 못한다. 시험이 `../1f34e` · `1F34E` · `1f34e.svg` · 끝 하이픈 · 앞 공백까지 거부를 단언한다(83~104).
- self-made 날짜를 실제 달력으로 검사한다(49~58, 2026-02-30 거부 시험 100줄).
- fetch 가 받은 글을 쓰기 전에 같은 `checkSvg` · 상한으로 거르고, 쓰는 경로는 규격을 지난 `file` 로만 만든다(315). 바깥에서 온 글이 저장소에 바로 들어가지 않는다(plan 위험 3).
- 상한 경계를 정확히 시험한다. `IMAGE_MAX_BYTES` 는 통과, `+1` 은 위반(147 · 158).
- check 를 `runCheck({ catalog, files })` 로 순수하게 떼어 내 종료 0 · 1 · 2 를 파일 없이 시험했고, 실제 폴더 읽기도 임시 폴더로 한 번 지난다(176~200).
- seed-validate 의 `isDirectRun` · 출력 꼴(2 는 stderr)을 그대로 따랐다(353 · 358~366).

## 3. 지적

### Important

**I-1. 빈 카탈로그에 그림 폴더가 없으면 check 가 2 로 끝나 CI seed-validate 작업이 깨진다.**
- 무엇이: `scripts/vocab-images.ts:192~197` 은 그림 폴더가 없으면 행 수와 상관없이 종료 2 다.
- 왜: P6a 묶음 0 이 `seed/images.json` 을 `{ "images": [] }` 로 만든다(plan-p06a 32줄 · 작업 순서 2). git 은 빈 폴더를 싣지 않으므로 첫 SVG 를 커밋하기 전 CI checkout 에는 `public/images/vocab/` 가 없다(지금 워크트리에도 `public/` 없음). plan-p06b 머리는 '작업 2 는 P6a 커밋 뒤 컨트롤러가 합친다'이고 작업 3(첫 SVG)은 P6a 묶음 1 뒤다. 그 사이 모든 PR 에서 `ci.yml:103~104` 단계가 돌고(ci.yml 1~5줄 `on: pull_request`) 2 로 실패한다. 스크래치패드에서 재현했다.

```
seed/images.json = {"images":[]}, public/ 없음
$ pnpm images:check --root <임시>
vocab-images: 그림 폴더가 없다: public/images/vocab
exit=2
```

- 근거의 성격: 구현은 plan 스크립트 표 check 행('2 입력 오류(… 폴더 없음)') 글자 그대로다. plan 과 P6a 의 빈 카탈로그가 만나서 생기는 빈틈이라 구현자 잘못은 아니지만, 고치기 전에는 합친 브랜치의 공용 게이트를 믿을 수 없다.
- 어떻게: 행이 0 이고 폴더가 없으면 파일 목록을 빈 것으로 보고 0 으로 끝낸다(행이 있는데 폴더가 없으면 지금처럼 2). `vocab-images.test.ts:196~200` 의 입력 오류 묶음 옆에 `runCheck({ catalog: catalogText([]), files: null }).code === 0` 한 줄을 더한다. 세 줄 안팎이라 컨트롤러가 직접 고쳐도 된다. plan 의 '폴더 없음 → 2' 문구도 '행이 있는데 폴더 없음'으로 한 낱말 고친다.

### Minor

**M-1. checkSvg 가 `javascript:` · `data:` 링크와 href 를 바꾸는 애니메이션을 놓친다.**
- 무엇이: `scripts/vocab-images.ts:79~86` 의 href 규칙은 `http(s)://` · `//` 로 시작하는 값만 잡는다. tsx 로 확인한 결과는 아래와 같다.

```
<a href="javascript:alert(1)">                         → []
<a xlink:href="javascript:alert(1)">                   → []
<use href="data:image/svg+xml;base64,…#a"/>            → []
<a><animate attributeName="href" values="javascript:…"/> → []
<a><set attributeName="href" to="javascript:…"/>       → []
```

- 왜: plan 금지 목록 글자에는 없으므로 설계 위반은 아니다. 다만 plan 위험 3(SVG 안의 스크립트)의 뜻에는 걸린다. 앱은 `<img>` 로만 보이므로 실제 위험은 낮지만, `/images/vocab/*.svg` 를 주소창으로 직접 열면 같은 출처의 문서로 그려진다. 출처가 Twemoji 와 Claude 그림뿐이라 Minor 로 둔다.
- 어떻게: 자체 그림 지침이 '도형만'이므로 href 를 허용 목록으로 바꾼다. 값이 `#` 로 시작할 때만 받고, `<animate` · `<set` 의 `attributeName="href"` 는 금지한다. 예:

```ts
{ pattern: /href\s*=\s*(?!["']?\s*#)/i, message: "href 가 안쪽(#) 참조가 아니다" },
{ pattern: /attributeName\s*=\s*["']?\s*(?:xlink:)?href/i, message: "href 를 바꾸는 애니메이션이 있다" },
```

**M-2. 하위 폴더 갈래에 시험이 없다.**
- 무엇이: `scripts/vocab-images.ts:254` 의 '하위 폴더 → 이름/ → 카탈로그 밖' 갈래(더한 것 6)를 어떤 시험도 지나지 않는다. 브리프 볼 것 6 이 이 갈래를 짚었다.
- 어떻게: `vocab-images.test.ts:189~191` 근처에 `mkdirSync(join(dir, "old"))` → `runCheck` 가 1 이고 줄에 `images/vocab/old/` 가 드는지 단언하고 지운다.

**M-3. `--root` 를 잘못 주었을 때 오류 글이 실제로 본 경로를 보이지 않는다.**
- 무엇이: `scripts/vocab-images.ts:153~154 · 195` 의 메시지는 뿌리를 뺀 상대 경로다. seed-validate 습관대로 `--root seed` 를 주면 실제로는 `seed/seed/images.json` 을 찾는데 글은 `seed/images.json` 이 없다고 한다(재현 아래).

```
$ pnpm images:check --root seed
vocab-images: 카탈로그가 없다: seed/images.json
exit(--root seed)=2
```

- 왜: 더한 것 1 로 `--root` 의 뜻이 seed-validate(`DEFAULT_ROOT = "seed"`, `scripts/seed-validate.ts:29`)와 다르다. 크게 실패하므로 조용한 오판은 없지만, 글이 틀린 곳을 가리킨다.
- 어떻게: `main` 이 `resolve` 한 뿌리를 두 메시지에 붙이거나, 메시지 끝에 '(--root 는 저장소 뿌리)'를 덧붙인다.

**M-4. macOS 의 `.DS_Store` 가 로컬 check 를 1 로 만든다.**
- 무엇이: `scripts/vocab-images.ts:251~258` 이 숨은 파일도 카탈로그 밖 파일로 센다(구현 보고 '남긴 것' 4).
- 왜: `.gitignore` 가 `.DS_Store` 를 빼므로 CI · 배포에는 없다. 그런데 plan 작업 3 · 4 · 7 의 완료 조건 `pnpm images:check` 0 은 macOS 로컬에서 돈다. Finder 로 폴더를 한 번 열면 걸린다.
- 어떻게: 이름이 `.DS_Store` 인 항목은 건너뛴다. 받지 않으면 그대로 두고 작업 3 · 4 메모로 넘겨도 된다.

## 4. '계획과 다르게 한 것 · 더한 것' 판정

| 번호 | 내용 | 판정 | 근거 |
|---|---|---|---|
| 1 | `--root` = 저장소 뿌리(기본 `.`) | 받음 + M-3 | 이 명령은 `seed/` 와 `public/` 을 함께 봐야 해서 뿌리가 맞다. 머리 주석 3줄에 적었다. 잘못 쓰면 2 로 크게 실패하고 조용히 통과하지 않는다(재현). 메시지 경로만 고친다 |
| 2 | `void main().then(...)` | 받음 | fetch 가 기다려야 한다. 처리 안 된 거절은 Node 24 기본으로 스택과 함께 종료 1 이고, 다른 스크립트의 동기 throw 와 결과가 같다 |
| 3가 | 출처 · 라이선스 짝 검사 | 받음 | plan 'images.json 행' 표(twemoji → cc_by, self-made → generated)와 C60 값 그대로다. 위험 6 을 값싸게 막는다. 시험 `vocab-images.test.ts:116~128` |
| 3나 | Zod 꼴 틀림 → 2 | 받음 | 꼴이 틀리면 행을 믿고 파일을 볼 수 없으니 plan 의 '입력 오류' 뜻 안이다. 시험 199줄 |
| 4 | 바깥 주소 범위 넓힘 | 받음 + M-1 | plan 목록을 모두 품는 넓힘이다. xmlns · `xlink:href="#a"` · `url(#a)` 예외가 시험으로 지난다(204~210). 남은 빈틈은 M-1 |
| 5 | fetch 가 받은 글을 거름 | 받음 | 위험 3 과 C65 '100KB 이하'를 쓰기 전에 지킨다. runFetch 는 네트워크라 단위 시험이 없고 실기 보고로만 확인된다 |
| 6 | 하위 폴더 → 카탈로그 밖 | 받음 + M-2 | 동작은 맞다. 시험이 없다 |

## 5. 증명 표 행마다

| plan 증명 행 | 시험 |
|---|---|
| 규격 "6.3 시드 규격: 그림 파일 꼴 svg 를 받는다" | 있음(`tests/unit/seed-schema.test.ts:610`) |
| 스크립트 "그림 카탈로그: Twemoji 출처 글에서 고정 판 주소를 만든다" | 있음(`tests/unit/vocab-images.test.ts:60`) |
| 스크립트 "그림 카탈로그: 출처 글 꼴이 틀리면 거부한다" | 있음(83) |
| 스크립트 "그림 카탈로그: 파일이 없거나 상한을 넘거나 카탈로그 밖 파일이 있으면 잡는다" | 있음(144) |
| 스크립트 "그림 카탈로그: script · foreignObject · 바깥 주소 · 이벤트 속성이 든 SVG 를 잡는다" | 있음(203) |
| 카탈로그 `images:check` 0 · `seed:validate` 0 | 없음(작업 7 몫, 이 작업 범위 밖) |
| 그림 품질(design-reviewer) | 없음(작업 5 몫, 범위 밖) |
| 공통 lint · build · test · check:deps 0, spec-trace 58 | 구현 보고와 컨트롤러 재확인(00:5x)으로 있음 |

## 6. 우려 1(실기 fetch 두 번) 기록

브리프는 `images:fetch` 한 번이었고 구현자는 '같은 내용이면 건너뜀'을 보려고 같은 주소를 두 번 받았다(jsDelivr 1f34e 한 장). 받은 것은 공개 CDN 의 고정 판 파일 하나이고 비밀값 · 개인 정보가 오가지 않았다. 코드 문제가 아니라 기록만 한다.

## 7. 판정

Changes requested. I-1 만 고치면 Approved 다. I-1 은 세 줄 안팎이라 컨트롤러가 직접 고쳐도 된다. Minor 넷은 컨트롤러 몫이다(M-4 는 넘겨도 된다).

## 작업 3~4 에 넘길 메모

- check 는 Twemoji 판을 고정하지 않고 attribution 글도 비교하지 않는다. 규격은 cc_by 에 attribution 이 있는지만 본다. 행을 만들 때 plan 'images.json 행' 표의 판(v17.0.3)과 attribution 글을 글자 그대로 옮긴다.
- `parseSource` 는 twemoji · self-made 만 받는다. cc0 출처(13절 2안)를 나중에 넣으려면 13절 한 줄과 함께 출처 꼴을 넓혀야 한다.
- 자체 그림의 링크는 `#` 안쪽 참조만 쓴다(M-1 을 받으면 check 가 강제한다). `<animate>` · `<set>` 은 쓰지 않는다.
- 이 보고 파일 이름 `review-p06b.md` 는 plan 증명 표의 '그림 품질 · design-reviewer 보고' 파일 이름과 같다. 작업 5 보고는 다른 이름(예 `review-p06b-design.md`)으로 두어 덮어쓰지 않게 한다.
