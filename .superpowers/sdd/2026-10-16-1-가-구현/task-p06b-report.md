# 구현 보고: P6b 그림 카탈로그 작업 2 — 스크립트 · 규격(impl-p06b, 2026-10-17)

상태: DONE_WITH_CONCERNS(우려는 아래 '남긴 것' 1: 실기 네트워크 요청이 브리프의 한 번이 아니라 두 번)

워크트리 `.claude/worktrees/p06b`(브랜치 feature/1a-p06b-vocab-images, 바탕 6bd6015). 커밋하지 않았다.

## 바뀐 파일

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `src/core/seed/schema/reference.ts` | 344~345 | 그림 파일 꼴 정규식에 `svg` 더함(`images/vocab/<키>.(png|webp|jpg|svg)`), 주석 한 줄 |
| `src/core/seed/structure.ts` | 288~289 | `IMAGE_MAX_BYTES = 100000`(5절 '한 장 100KB 이하') |
| `tests/unit/seed-schema.test.ts` | 610~629 | "6.3 시드 규격: 그림 파일 꼴 svg 를 받는다"(svg 통과 · 키와 다른 svg 이름 거부 · gif 거부) |
| `scripts/vocab-images.ts` | 신규 373줄 | fetch · check 명령. 순수 함수 `parseSource`(42) · `twemojiUrl`(67) · `checkSvg`(92) · `checkCatalogFiles`(110), 도움 함수 `parseCatalog`(152) · `runCheck`(185) · `parseArgs`(222) · `readImageFiles`(245), 직접 실행 때만 `runFetch`(270) · `main`(339) |
| `tests/unit/vocab-images.test.ts` | 신규 237줄 | plan 증명 표의 시험 넷(60 · 83 · 144 · 203줄) |
| `package.json` | 21~22 | 공용 변경: `images:fetch` · `images:check` |
| `.github/workflows/ci.yml` | 103~104 | 공용 변경: seed-validate 작업 끝 `if: hashFiles('seed/images.json') != ''` → `pnpm images:check` |

`src/core` 와 `scripts/seed-validate.ts` 는 `vocab-images` 를 가져오지 않는다(grep 0줄). 스크립트는 `src/core` 의 규격 · 상수만 가져온다.

## 시험 수

159 → 164(+5: 규격 1 · 스크립트 4). 덮는 시험 이름(글자 그대로):
- 6.3 시드 규격: 그림 파일 꼴 svg 를 받는다
- 그림 카탈로그: Twemoji 출처 글에서 고정 판 주소를 만든다
- 그림 카탈로그: 출처 글 꼴이 틀리면 거부한다
- 그림 카탈로그: 파일이 없거나 상한을 넘거나 카탈로그 밖 파일이 있으면 잡는다
- 그림 카탈로그: script · foreignObject · 바깥 주소 · 이벤트 속성이 든 SVG 를 잡는다

시험을 먼저 쓰고 실패를 봤다(규격 시험은 svg 정규식 거부로 실패, 스크립트 시험은 모듈 없음으로 실패). 상한 값은 `IMAGE_MAX_BYTES` 에서 읽고, 임시 폴더는 `tests/.tmp/vocab-images-<난수>`(afterAll 에서 지움). 시험은 네트워크를 쓰지 않는다.

## 실기(임시 뿌리 `tests/.tmp/p06b/`, Twemoji 1f34e 행 하나)

```
check(그림 폴더 없음)  → vocab-images: 그림 폴더가 없다: public/images/vocab        exit 2
fetch                  → vocab-images fetch: Twemoji 행 1 · 씀 1 · 같아서 건너뜀 0 · 실패 0   exit 0   (apple.svg 446바이트)
fetch(다시)            → vocab-images fetch: Twemoji 행 1 · 씀 0 · 같아서 건너뜀 1 · 실패 0   exit 0
check                  → vocab-images check: 행 1 · 파일 1 · 위반 0                     exit 0
check(파일 지움)       → vocab-images check: 행 1 · 파일 0 · 위반 1 / apple: 파일이 없다: apple.svg   exit 1
check(행 없는 dog.svg) → vocab-images check: 행 1 · 파일 2 · 위반 1 / 카탈로그 밖 파일이 있다: images/vocab/dog.svg   exit 1
check --root(값 없음)  → vocab-images: --root 다음에 폴더가 없다                       exit 2
```

받은 SVG 는 `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">` 로 시작하고 checkSvg 문제 0. 임시 폴더는 지웠다.

## 마무리 명령(모두 워크트리, node v24.22.0)

| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm exec biome ci .` | exit 0(52 파일, 고칠 것 없음) |
| `pnpm build` | exit 0(TypeScript 통과) |
| `pnpm test` | exit 0, 17 파일 · 164 통과 |
| `pnpm check:deps` | exit 0, no dependency violations found (22 modules, 64 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | exit 0, `15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 52 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 58` |
| `pnpm check:bundle` | exit 0, `파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0` |
| 비밀값 grep(Anthropic 키 꼴 · 자격 든 DB 주소, 바뀐 파일 일곱) | 0 |

## 계획과 다르게 한 것 · 더한 것

1. **`--root` 의 뜻**: seed-validate 의 `--root` 는 시드 폴더지만, 이 명령은 `seed/images.json` 과 `public/images/vocab/` 를 함께 봐야 해서 저장소 뿌리(기본 `.`)로 두었다. 인자 꼴(`--root <폴더>`)은 같다.
2. **`main` 이 비동기**: fetch 가 네트워크를 기다려야 해서 `process.exitCode = main()` 대신 `main().then((code) => { process.exitCode = code })` 꼴이다. check 도 같은 main 을 탄다.
3. **check 에 더한 규칙 둘**: (가) 출처와 라이선스 짝(twemoji → `cc_by`, self-made → `generated`, plan 'images.json 행' 표 그대로). 위험 6(저작자 표시)을 막는 값싼 검사라 넣었다. (나) 카탈로그를 `ImagesFileSchema` 로 읽고 꼴이 틀리면 입력 오류 2. plan 의 '카탈로그 JSON 깨짐 → 2' 를 꼴 틀림까지 넓혔다.
4. **checkSvg 바깥 주소 범위**: plan 의 `href="http` · `url(http` 에 더해 작은따옴표 · 따옴표 없음 · 앞 공백 · `xlink:href` · 프로토콜 생략(`//host`)도 잡는다. 대소문자 무시. 안쪽 참조(`url(#a)` · `href="#a"`)와 `xmlns` 는 걸리지 않는다(시험에 넣음).
5. **fetch 의 안전**: 받은 글이 checkSvg 문제가 있거나 상한을 넘으면 쓰지 않고 실패로 센다. Twemoji 행의 file 이 `.svg` 가 아니면 실패.
6. **그림 폴더의 하위 폴더**: 이름 뒤에 `/` 를 붙여 '카탈로그 밖 파일'로 잡는다.

## 남긴 것 · 우려

1. **실기 네트워크 요청이 두 번**: 브리프는 `images:fetch` 한 번이었는데, '같은 내용이면 건너뜀'을 보려고 fetch 를 한 번 더 돌렸다(jsDelivr 에 1f34e 한 장, 같은 주소 두 번). 다른 네트워크 사용은 없다.
2. 하지 않은 것(브리프대로): 그림 고르기 · 자체 그림 · CREDITS.md · images.json · vocab imageKey(작업 3~4), 정본 · plan 수정.
3. 견본(`tests/fixtures/seed/builders.ts`)의 그림 행은 여전히 `.png` · `source: "momo-fixture"` 다. seed-validate 는 파일 꼴 · 출처 글을 보지 않으므로 P4 시험에 영향이 없고, 이 견본을 `images:check` 에 넣는 시험은 없다.
4. macOS 의 `.DS_Store` 같은 숨은 파일이 그림 폴더에 생기면 '카탈로그 밖 파일'로 1 이 된다(의도대로지만 로컬에서 걸릴 수 있다. `.gitignore` 에 있으면 CI 에는 없다).
5. P5 · P7 · P10 · P11 에 'svg 그림'을 넘기는 메모(plan 위험 7 · 8)는 컨트롤러 몫으로 남긴다.
