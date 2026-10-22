# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P6b 그림 카탈로그

spec: `specs/` 정본(3.3 읽기 그림 문단 · 말하기 6 · 8단계 그림 보고 말하기(C27) · 회화 1~3단계 그림 턴(C32), 5절 vocab · images · '그림 파일은 단어마다 하나, 한 장 100KB 이하', 6.3 '그림 문제의 보기는 그림 카탈로그 키가 있는 단어 id 로만', 6.4 그림 행, 10절 그림 행, 13절 'Pre-A1 그림은 CC0 · CC-BY 공개 그림 묶음 …' 잠정 행 · C60, approved 2026-10-16 06:2x) · 묶음 plan 배정표 P6 행 · [사람] H7 · 공통 사실 `plan-p06a-규격-파일.md`('어휘 시드 구성' · '정할 것' · '확인한 사실과 출처') · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: done(코드 커밋 7767df0 2026-10-22, 검토 review-p06b-5b Approved 10-17; H7 그림 승인은 요청자 확인 뒤 바탕 합침)
승인: 컨트롤러 2026-10-16 23:0x(C61, P6a '컨트롤러 결정'. 요청자는 H7 과 PR 병합 때 본다) · 브랜치 · 워크트리: `feature/1a-p06b-vocab-images`(바탕 P6a 끝 커밋. 작업 2 는 P6a 와 나란히 6bd6015 에서 시작하고 P6a 커밋 뒤 컨트롤러가 합친다) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P6 셋 가운데 둘째다. 첫째 `plan-p06a-규격-파일.md` 가 vocab 을 만든 뒤 그 낱말에 그림을 단다. 셋째 `plan-p06c-목업-맞추기.md` 와는 겹치는 파일이 없다. 정할 것 · 확인한 사실은 P6a 의 같은 이름 절에 있다(이 plan 에 닿는 것: 나 · 차 · 카, 확인한 사실 7~11).

컨트롤러 결정(2026-10-16 23:0x): 승인. 정할 것 나 · 차 · 카의 판정은 `plan-p06a-규격-파일.md` '컨트롤러 결정' 문단. H7 은 요청자에게 물었다(23:0x) — 답 뒤 13절 한 줄을 넣고 작업 2 부터 시작한다(작업 2 는 답 전에 시작할 수 있다). H7 답(요청자 2026-10-17 00:5x "1로가자", 표본 쪽 https://claude.ai/artifact/RCTBjH6VmWy5gzdQgYVEMD 을 보고): 1안 확정 → 13절 C65 · 10절 그림 행 · 5절 images 행 반영. 작업 2 는 implementer(Opus · high, 새 워크트리 `.claude/worktrees/p06b`, 바탕 6bd6015, 브리프 `task-p06b.md`)로 동시 셋 자리가 나면 시작하고, 작업 3(그림 고르기 1~2단계)은 P6a 묶음 1(H5 뒤) 의 vocab 뒤.

## 목표 (Goal)

그림 카탈로그(`seed/images.json` 과 `public/images/vocab/`)를 만들고 vocab 의 `imageKey` 를 잇는다. 범위는 1~4단계 내용어 가운데 그림 하나로 알아볼 수 있는 낱말과 알파벳 대표 낱말이다(첫 운영 배포 몫, 정할 것 카). 1-가 실시드(C50 (4))가 쓰는 1~2단계를 먼저 끝낸다.
주 묶음은 Twemoji v17.0.3(그래픽 CC-BY 4.0)이고, Twemoji 에 그 뜻의 그림이 없는 낱말만 Claude 가 SVG 로 그린다(`generated`). 13절 잠정 행의 '모자라는 단어만 이미지 생성으로 한 번 만들어 시드에 저장'을 이 길로 한다(H7, 정할 것 차).
그림 파일은 SVG 로 둔다. P4 규격의 그림 파일 꼴(`png · webp · jpg`)에 `svg` 를 더한다(정본 5절은 꼴을 정하지 않았다). 받은 Twemoji SVG 를 바꾸지 않고 쓰므로 변환 도구가 없어도 되고, 파일은 수 KB 다.
작은 스크립트 하나(`scripts/vocab-images.ts`)가 고정 판 Twemoji SVG 를 받고(fetch) 카탈로그 · 파일 · SVG 안전을 본다(check). check 는 CI 의 시드 검증 작업에서도 돈다. 그림 없는 낱말은 그림 문제에 내지 않는다(3.3) — 검증기의 `image` 규칙이 이미 막는다(AC-3b, P4).

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일 여덟과 공용 변경 둘이다. 생성물(받은 Twemoji SVG · 그린 SVG)은 수에서 뺀다(묶음 plan 위험 12).

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/schema/reference.ts` | 수정 | 그림 파일 꼴 정규식에 `svg` 를 더한다(`images/vocab/<키>.(png|webp|jpg|svg)`) |
| `src/core/seed/structure.ts` | 수정 | `IMAGE_MAX_BYTES` = 100000(5절 '한 장 100KB 이하', 1000 배수로 보수적, C54 (2) 상수) |
| `tests/unit/seed-schema.test.ts` | 수정 | svg 그림 행이 통과하는 사례 하나 |
| `scripts/vocab-images.ts` | 신규 | fetch · check 명령(아래 '스크립트') |
| `tests/unit/vocab-images.test.ts` | 신규 | 스크립트의 순수 함수 시험 |
| `seed/images.json` | 수정 | 그림 카탈로그(1~4단계 그림 낱말 · 알파벳 대표 낱말) |
| `seed/vocab.json` | 수정 | 그림 낱말에 `imageKey` |
| `CREDITS.md` | 신규 | 그림 출처 · 저작자 표시와 어휘 목록 출처 |
| `public/images/vocab/<키>.svg` | 신규(생성물) | Twemoji 받은 것과 그린 것 |

## 그림 규칙(파일별 값, 구현자가 옮겨 쓸 것)

### 고를 낱말

| 무엇 | 규칙 |
|---|---|
| 넣는 것 | 1~4단계 내용어 가운데 그림 하나로 알아볼 구체 명사 · 동작어, 색(Twemoji 색 동그라미), 수 1~10(키캡), 표정이 분명한 감정 낱말(happy · sad · angry), 알파벳 대표 낱말 전부 |
| 빼는 것 | 추상 명사, 크기 · 비교처럼 그림 하나로 안 되는 낱말, 기능어 전부 |
| 하나에 하나 | 낱말(vocab 항목) 하나에 그림 하나(5절). 키 = 낱말 소문자, 띄어쓰기는 하이픈(ice cream → `ice-cream`), `^[a-z0-9-]+$` |
| 1-가 먼저 | 1~2단계와 알파벳 대표 낱말(읽기 1~2 그림 고르기 · 쓰기 1 그림 보고 고르기 · 말하기 1~2 듣고 그림 고르기 · 회화 1~2 그림 턴 · 배치 가 벌 1~2단계 그림 문항) |
| 출처 차례 | Twemoji 에 그 뜻을 바로 그린 그림이 있으면 그것, 없으면 그린다. 비슷한 그림으로 때우지 않는다(cap 에 '실크 모자' 그림을 쓰지 않는다 — Twemoji 에 '야구 모자' 그림이 따로 있다). 사람 그림은 Twemoji 기본 피부색 그대로 |

### images.json 행

| 칸 | Twemoji | 자체 그림 |
|---|---|---|
| `key` | 위 키 | 위 키 |
| `file` | `images/vocab/<키>.svg` | `images/vocab/<키>.svg` |
| `source` | `twemoji v17.0.3 <코드>` — 코드는 Twemoji 파일 이름 그대로(예 `1f34e`, 이어진 것은 `1f9d1-200d-1f373`) | `self-made <만든 날 YYYY-MM-DD>` |
| `license` | `cc_by` | `generated` |
| `attribution` | `Twemoji v17.0.3 (github.com/jdecked/twemoji) © 2014–2021 Twitter, © 2022– Jason Sofonia & Justine De Caires, CC-BY 4.0` | 두지 않는다 |
| `word` | vocab 의 `word` 그대로 | 같다 |

vocab 의 그 항목 `imageKey` = 키. 검증기 `reference-image` 가 vocab ↔ 카탈로그를 본다(P4b).

### 자체 그림 지침

`viewBox="0 0 36 36"`(Twemoji 와 같은 칸), 투명 바탕, 평면 채색(Twemoji 와 비슷한 색 · 면 위주), 가운데 놓기. 글자 · 숫자 · 상표 · 실제 인물을 넣지 않는다. 무섭거나 다치는 모습이 없다. 동작어는 사람 하나가 그 동작을 하는 모습으로 그리고 얼굴은 단순하게 둔다. `<svg xmlns="http://www.w3.org/2000/svg" …>` 하나에 도형만 쓴다 — `<script>` · `<foreignObject>` · `<image>` · 바깥 주소(href · url()) · 이벤트 속성(on…) · 글꼴을 쓰지 않는다. 파일은 10KB 안팎이고 상한은 `IMAGE_MAX_BYTES` 다.

### 스크립트 `scripts/vocab-images.ts`

`pnpm images:fetch` · `pnpm images:check`. P1b 의 spec-trace · check-bundle 꼴로 짠다(순수 함수를 내보내고, 파일 · 네트워크 · 출력은 직접 실행될 때만, `process.exitCode = main()`). `src/core` 와 `scripts/seed-validate.ts` 가 이 파일을 가져오지 않는다(AC-7d 'API 0회' 시험의 가져오기 그래프 밖).

| 함수(제안) | 규칙 |
|---|---|
| `parseSource(글)` | `twemoji v<판> <코드>` → `{ kind: 'twemoji', version, code }`, `self-made <날짜>` → `{ kind: 'self' }`, 그 밖은 오류 |
| `twemojiUrl(판, 코드)` | `https://cdn.jsdelivr.net/gh/jdecked/twemoji@v<판>/assets/svg/<코드>.svg` |
| `checkSvg(글)` | `<script` · `<foreignObject` · `<image` · 바깥 주소(`href="http` · `url(http`) · `on<이름>=` 속성 · `@import` 가 있으면 문제 목록. `xmlns="http://www.w3.org/2000/svg"` 는 이름 공간이라 바깥 주소로 세지 않는다 |
| `checkCatalogFiles({ images, files })` | 행마다 파일 있음 · 파일 이름 = 키 · 크기 ≤ `IMAGE_MAX_BYTES`, 카탈로그 밖 파일 없음 |
| fetch | Twemoji 행마다 받아 `public/images/vocab/<키>.svg` 에 쓴다(같은 내용이면 건너뜀). 네트워크는 이 명령에서만, CI 에서는 부르지 않는다 |
| check | 위 둘을 돌린다. 종료 0 통과 · 1 위반 · 2 입력 오류(카탈로그 JSON 깨짐 · 꼴 틀림 · 행이 있는데 그림 폴더 없음). 행이 0 이면 그림 폴더가 없어도 0 — P6a 가 빈 카탈로그를 먼저 넣고 git 은 빈 폴더를 싣지 않아 CI 가 깨지지 않게(검토 review-p06b I-1, 01:0x) |

### CREDITS.md

'출처와 저작자 표시'. (1) 그림: Twemoji 그림 n장 — 위 attribution 글과 라이선스 주소(https://creativecommons.org/licenses/by/4.0/), 받은 SVG 를 바꾸지 않고 쓴다고 적는다. 자체 그림 n장 — 이 프로젝트가 만든 그림. (2) 어휘: 2022 개정 기본 어휘 목록(교육부 고시 제2022-33호 [별책 14])을 뼈대로 했고, 참고한 목록(CEFR-J 를 썼다면 그 인용 꼴)을 적는다. Twemoji 는 README · '정보' 쪽 · HTML 소스의 언급도 받는다(확인한 사실 7). 앱 안 표시(부모 화면의 '정보')는 2차 부모 화면 plan 에 넘긴다.

## 작업 순서 (Order of work)

명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다.

1. [사람] H7(묶음 plan H7). 컨트롤러가 H5 와 같은 읽기용 쪽에 붙여 묻는다: 주 묶음 Twemoji v17.0.3(CC-BY 4.0), 저작자 표시 자리(`CREDITS.md` · images.json, 앱 안은 2차), 모자란 낱말은 Claude 가 그린 SVG(`generated`), 그림 파일 꼴 svg. 다른 길(Openclipart CC0 낱장 고르기, MIT · Apache 묶음은 13절 먼저)도 함께 보인다. 완료: 요청자 답 · 13절 한 줄(정할 것 차).
2. [검증] 스크립트 · 규격(implementer · Opus · high, 시험 먼저). 규격 정규식 · `IMAGE_MAX_BYTES` · 스크립트 · 시험 둘 · 공용 변경. 가벼운 루프(C52): code-reviewer(Opus · high, 범위 한정), Minor 는 컨트롤러가 고친다. P6a 와 나란히 해도 된다(6bd6015 에서 가지, P6a 커밋 뒤 합침). 완료: 시험 통과(P4 시험 전체 포함), `pnpm lint` · `pnpm build` · `pnpm check:deps` 0.
3. [검증] 그림 낱말 고르기 1~2단계 + 알파벳(curriculum-designer · Opus · high). images.json 행 · vocab `imageKey` · 그릴 낱말 목록, `pnpm images:fetch`. 완료: `pnpm seed:validate` 0, `pnpm images:check` 의 문제는 그릴 그림 빠짐뿐.
4. [검증] 자체 그림(implementer · Opus · high). 목록의 SVG 를 지침대로 그린다(스무 장 안팎씩). 완료: `pnpm images:check` 0.
5. [검증] 화면 검토(design-reviewer · Opus · xhigh). 모아 보기 쪽(키 · 낱말 · 그림 · 출처, `tests/.tmp/p06b/sheet.html`)을 Playwright 로 찍은 사진으로 낱말 ↔ 그림, 아이 눈(한 그림 한 뜻 · 헷갈리지 않음 · 무섭지 않음), 자체 그림 품질, 라이선스 칸을 본다. fix 3회까지(고르기는 curriculum-designer, 그림은 implementer). 완료: Critical · Important 0.
6. [사람] H7 표본 확인(요청자). 같은 모아 보기 사진(자체 그림 전부 · Twemoji 표본). 완료: 승인, 고칠 그림은 4 로.
7. [검증] 3~4단계 그림(3 → 4 → 5 를 되풀이) → 마무리 명령. 완료: `pnpm images:check` 0 · `pnpm seed:validate` 0 · lint · build · test · check:deps 0 · spec-trace 58.
8. [사람] 커밋(H14). 1~2단계 몫(작업 6 까지)을 먼저 커밋해 P8 1단계 생성에 넘길 수 있다(컨트롤러 판단). 완료: 커밋.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | Twemoji 그림이 낱말 뜻과 어긋난다(문화 차이 · 겹뜻) | 아이가 그림 문제를 틀린다 | 비슷한 그림으로 때우지 않는다. 검토 · 요청자 표본에서 고친다 |
| 2 | 자체 그림 품질이 고르지 않다 | 그림 문제가 헷갈린다 | 지침 · 검토 · H7 표본, 고쳐 그리기. 끝내 안 되는 낱말은 그림을 두지 않는다(그림 문제에 안 나옴) |
| 3 | SVG 안의 스크립트 · 바깥 주소 | 보안 · 개인 정보 | `checkSvg` 와 CI 의 `images:check`. 앱은 `<img>` 로만 보인다(넘김) |
| 4 | 카탈로그와 파일이 어긋난다 | 앱에서 그림이 깨진다 | `images:check`(CI). 검증기는 파일을 보지 않는다 |
| 5 | jsDelivr 가 막히거나 판 태그가 사라진다 | 다시 받기 실패 | 받은 파일을 저장소에 둔다(앱은 바깥 주소를 쓰지 않음). 대안 `raw.githubusercontent.com/jdecked/twemoji/v17.0.3/assets/svg/` |
| 6 | 저작자 표시를 빠뜨린다 | CC-BY 조건 위반 | 규격이 cc_by 행의 attribution 을 요구, `CREDITS.md`, 앱 안 표시는 2차에 넘김 |
| 7 | P4 규격 파일을 이 브랜치에서 고친다 | P4 시험 · 뒤 P 의 그림 처리 | P4 시험 전체를 돌린다. P5 · P7 · P10 · P11 에 'svg 그림'을 메모로 넘긴다 |
| 8 | Next.js 그림 최적화가 svg 를 막는다(`next/image` 의 dangerouslyAllowSVG) (추측) | 화면 구현 때 그림이 안 보인다 | P10 · P11 은 `<img>` 를 쓴다(넘김) |
| 9 | 1-가 길목: P8 1단계 읽기 그림 고르기는 카탈로그가 있어야 만든다 | P8 시작이 늦다 | 1~2단계를 먼저 끝내 먼저 커밋할 수 있게 한다(작업 8) |

### 정할 것 · 제약 · 확인한 사실

정할 것은 P6a 의 같은 이름 절 가운데 나(역할) · 차(그림 묶음 · 꼴 · 저작자 표시, H7 · 13절) · 카(범위)가 이 plan 에 닿는다. 확인한 사실은 P6a 의 7~11 이다. 제약은 P6a 와 같고 더하여: 스크립트는 `src/core` 에 두지 않는다(core-no-io), 아이 이름 · 비밀값 없음, 그림에 실제 인물 · 상표 없음.

### 요청하는 공용 변경(컨트롤러가 합친다)

1. `package.json` scripts 에 두 줄.

```json
"images:fetch": "tsx scripts/vocab-images.ts fetch",
"images:check": "tsx scripts/vocab-images.ts check"
```

2. `.github/workflows/ci.yml` 의 seed-validate 작업 끝에 한 단계(P4c 의 `hashFiles` 꼴 그대로).

```yaml
      - if: ${{ hashFiles('seed/images.json') != '' }}
        run: pnpm images:check
```

## 증명 (Proof)

AC 시험을 더하지 않는다(AC-3b 의 규격 몫은 P4b 가 증명했다).

| 무엇 | 증명 | 파일 · 명령 |
|---|---|---|
| 규격 | 단위 "6.3 시드 규격: 그림 파일 꼴 svg 를 받는다" | `tests/unit/seed-schema.test.ts` |
| 스크립트 | 단위 "그림 카탈로그: Twemoji 출처 글에서 고정 판 주소를 만든다" · "그림 카탈로그: 출처 글 꼴이 틀리면 거부한다" · "그림 카탈로그: 파일이 없거나 상한을 넘거나 카탈로그 밖 파일이 있으면 잡는다" · "그림 카탈로그: script · foreignObject · 바깥 주소 · 이벤트 속성이 든 SVG 를 잡는다" · "그림 카탈로그: 행이 없으면 그림 폴더가 없어도 통과한다"(fix 1, 검토 I-1) · "그림 카탈로그: 그림 폴더 자리에 파일이 있거나 없음 밖의 오류면 null 로 삼키지 않는다"(재검토 N-1, 컨트롤러) | `tests/unit/vocab-images.test.ts` |
| 카탈로그 | `pnpm images:check` 0 · `pnpm seed:validate` 0(`reference-image` 오류 0) | 작업 7 |
| 그림 품질 | design-reviewer 보고(심각도 · 근거, 모아 보기 사진) Approved · H7 요청자 승인 | `review-p06b.md` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0, spec-trace missing-test 58 | 작업 7 |

시험 이름은 글자 그대로 적는다(spec-trace). 시험 안의 상한 값은 `IMAGE_MAX_BYTES` 에서 읽는다.

## 완료 보고 (Done)

(작업마다 채운다. 작업 1 · 3~6 은 아직.)

- **작업 2(스크립트 · 규격) 끝 — 커밋 3caed9c**(feature/1a-p06b-vocab-images, 바탕 6bd6015, 요청자 지시 2026-10-17 04:5x). 바뀐 파일 일곱: `scripts/vocab-images.ts`(fetch · check, 순수 함수 넷 + 도움 함수, readImageFiles 는 ENOENT 만 null) · `tests/unit/vocab-images.test.ts`(시험 다섯) · `src/core/seed/schema/reference.ts`(그림 파일 꼴 svg) · `src/core/seed/structure.ts`(IMAGE_MAX_BYTES 100000) · `tests/unit/seed-schema.test.ts`(svg 시험) · 공용 `package.json`(images:fetch · images:check) · `.github/workflows/ci.yml`(seed-validate 끝 images:check). 단위 159 → 166. 검토 `review-p06b.md` Changes requested(I 1 · M 4) → fix 1 → `review-p06b-2.md` Approved(N-1 컨트롤러 고침). 계획과 다르게 한 것: 실기 네트워크 요청이 한 번이 아니라 두 번(구현 보고 '남긴 것' 1). 남긴 것: 작업 3(그림 고르기 — P6a fix 1 뒤 4단계 그림 낱말이 바뀜, ledger-open) · 4~6, H7.
