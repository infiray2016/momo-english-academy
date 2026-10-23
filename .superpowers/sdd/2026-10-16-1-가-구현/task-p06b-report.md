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

---

# 작업 3: 그림 낱말 고르기 1~2단계 + 알파벳(cd-p06b, 2026-10-17)

상태: DONE_WITH_CONCERNS(우려는 아래 '결정이 필요한 것' — 뜻이 갈릴 수 있는 Twemoji 몇 장과 그림 색 ↔ vocab 예문 색 어긋남 18)

워크트리 `.claude/worktrees/p06b`(feature/1a-p06b-vocab-images, 바탕 d3bc9fe). 커밋하지 않았고 코드 파일은 건드리지 않았다.

## 만든 · 바꾼 파일

| 파일 | 무엇 |
|---|---|
| `seed/images.json` | 0 → 207행. Twemoji 162(source `twemoji v17.0.3 <코드>` · license `cc_by` · attribution 은 plan 글 그대로) · 자체 그림 45(source `self-made 2026-10-17` · license `generated` · attribution 없음). vocab 차례, 한 행 한 줄(vocab.json 과 같은 꼴, seed JSON 은 biome 밖) |
| `seed/vocab.json` | 207항목 줄 끝에 `"imageKey"` 만 더함. imageKey 를 지우면 HEAD 와 바이트가 같다(cmp) |
| `public/images/vocab/*.svg` | Twemoji 162장, 받은 그대로. 가장 큰 것 run.svg 6,518바이트(상한 IMAGE_MAX_BYTES 100,000) |
| `tests/.tmp/p06b/to-draw.json` | 그릴 낱말 45: 키 · 낱말 · 뜻 · 단계 · 알파벳 여부 · 틀 · 그릴 모습 · 구별할 그림 키(differFrom) · 쓰이는 단원 |
| `tests/.tmp/p06b/sheet.html` | 모아 보기 초안(작업 5 몫): 알파벳 26 · 1단계 102 · 2단계 79 칸(키 · 낱말 · 뜻 · 그림 120px · 출처 · 라이선스 · 판단 메모)과 뺀 낱말 69 표. 자체 그림 칸은 점선, 그리기 전에는 '그릴 그림' 자리 표시. `node tests/.tmp/p06b/shot.mjs <html> <사진 앞이름> [높이]` 로 찍는다 |
| 일회 도구(tests/.tmp/p06b/, gitignore) | `choices.py`(낱말마다 판정 표 — 코드 · 메모 · 그릴 모습 · 뺀 까닭) · `build.py`(덮음 · 겹침 · 금지어 · 키 꼴 검사 뒤 위 넷 생성, `python3 -I tests/.tmp/p06b/build.py <뿌리> [--write]`) · `cand_list.py` · `cand/`(후보 · 대안 224장과 견주기 쪽 — 작업 5 가 대안을 볼 때 쓴다) |

## 수

| 묶음 | 범위 | 그림 | Twemoji | 그릴 | 뺌 |
|---|---|---|---|---|---|
| 알파벳 대표 낱말 | 26 | 26 | 22 | 4 | 0 |
| 1단계(알파벳 밖) | 125 | 102 | 84 | 18 | 23 |
| 2단계 | 125 | 79 | 56 | 23 | 46 |
| 합 | 276 | 207 | 162 | 45 | 69 |

build.py 검사: 범위 낱말 276 모두 판정 한 번씩 · Twemoji 코드 겹침 0(한 그림 두 뜻 없음) · 금지어 목록 낱말 0 · 키 꼴 `^[a-z0-9-]+$` 위반 0 · 알파벳 뺌 0.

## 고른 규칙(plan '고를 낱말'을 이렇게 적용)

- 넣음: 구체 명사 · 동작어 · 색(Twemoji 색 동그라미) · 수 1~10(키캡) · 표정이 분명한 감정과 몸 상태 · 알파벳 26 전부.
- 뺌: plan 의 추상 · 크기 비교(기능어는 범위 밖)에 더해, 범주 낱말 · 관계 낱말 · 같은 그림이 되는 낱말 · 동작이 아닌 동사(아래 표).
- 뜻이 둘인 낱말은 수업에서 쓰일 뜻(단원 주제 · 예문)을 그린다. 정해지지 않으면 Twemoji 가 바로 그린 뜻이다. orange 는 주황 동그라미(색 단원 셋), chicken 은 닭(동물 단원 둘), fan 은 부채 🪭, brush 는 붓 🖌️, pot 은 냄비 그림(예문 The pot is hot.), top 은 팽이 그림.
- 동물은 Twemoji 에 온몸 그림이 있으면 온몸(cat · dog · pig · cow · tiger · monkey · horse · rabbit), 없으면 얼굴(bear · lion · fox · frog · zebra).
- 한 그림이 두 낱말에 맞으면 한쪽에만 주고 다른 쪽을 그린다: soccer ⚽ · ball 그림, jacket 🧥 · coat 그림, doctor 🧑‍⚕️ · nurse 그림, jeans 👖 · pants 그림. cake 는 🍰 이고 🎂 는 3단계 birthday 몫으로 남겼다.
- 사람 그림은 Twemoji 기본 피부(피부색 수식 코드 없음)이고, 성별 없는 🧑 꼴이 있으면 그것(cook · doctor · farmer · student · teacher).
- 후보 견주기: 고른 것과 대안 224장을 임시 뿌리에 받아 Playwright 사진으로 보고 바꾼 것이 아홉이다. shop 🏪 은 편의점에 간판 '24'라 그림으로, sing 🧑‍🎤 은 번개 화장(실제 가수를 본뜬 꼴)이라 그림으로 돌렸다. sleepy 😪 은 콧물 방울이 눈물처럼 보여 같은 단원 sad 와 헷갈려 🥱 로, coat 🧥 은 짧은 패딩이라 jacket 으로 옮겼다. phone 📱(빈 네모)은 ☎️ 로, happy 😄 은 smile 😊 과 꼴을 가르려 😀 로 바꿨다. dance 💃 는 빨간 드레스가 같은 단원 dress 와 헷갈려 🕺 로, whale 🐋 은 같은 단원 dolphin 과 갈리게 🐳 로, bath 🛀 은 사람이 작아 🛁 로 바꿨다.
- 자체 그림 색은 vocab 예문과 맞췄다(skirt 파랑 · swing 빨강 · top 빨강 · lake 파랑).

## 그릴 낱말 45

틀: 따로(물건 하나) · 동작(사람 하나가 동작, 얼굴 단순) · 가리키기(아이 몸 그림에서 그 부분을 빨간 점선 동그라미로) · 색. 모두 plan '자체 그림 지침'(viewBox 0 0 36 36 · 평면 채색 · 글자 · 숫자 · 상표 · 실제 인물 없음 · 도형만)을 따른다. 사람 피부는 Twemoji 기본 노랑. 구별할 그림 키는 to-draw.json 의 differFrom.

| 키 | 낱말 | 뜻 | 단계 | 틀 | 그릴 모습 |
|---|---|---|---|---|---|
| `fork` | fork | 포크 | 알파벳 | 따로 | 세워 놓은 포크 하나(나이프 없음) |
| `insect` | insect | 곤충 | 알파벳 | 따로 | 머리 · 가슴 · 배 세 마디와 다리 여섯 · 더듬이 둘이 또렷한 초록 곤충 한 마리(위에서 본 모습, 개미 · 무당벌레 꼴 아님) |
| `nurse` | nurse | 간호사 | 알파벳 | 따로 | 간호사 모자를 쓰고 분홍 간호복을 입은 사람의 윗몸(빨간 십자 표장 · 청진기 없음) |
| `queen` | queen | 여왕 | 알파벳 | 따로 | 왕관을 쓰고 긴 머리에 보라 드레스를 입은 동화 속 여왕의 윗몸 |
| `arm` | arm | 팔 | 1 | 따로 | 어깨에서 손끝까지 곧게 뻗은 팔 하나(🦵 leg 처럼 떼어 낸 모양, 피부 Twemoji 기본 노랑) |
| `ball` | ball | 공 | 1 | 따로 | 빨강 · 파랑 · 노랑 띠를 두른 둥근 고무공 하나(축구공 · 야구공 · 농구공 · 테니스공 무늬 아님) |
| `cup` | cup | 컵 | 1 | 따로 | 손잡이 달린 빈 머그컵 하나(김 · 음료 없음) |
| `desk` | desk | 책상 | 1 | 따로 | 서랍 달린 학생 책상 하나(위에 아무것도 없음) |
| `dish` | dish | 접시, 요리 | 1 | 따로 | 음식이 없는 둥근 흰 접시 하나(포크 · 나이프 없음, 비스듬히 위에서 본 모습) |
| `doll` | doll | 인형 | 1 | 따로 | 실 머리카락 · 단추 눈 · 바느질 자국이 있는 헝겊 인형 하나(사람 아이와 달리 천으로 만든 몸) |
| `face` | face | 얼굴 | 1 | 따로 | 앞을 보는 아이 얼굴 하나(짧은 머리카락, 다문 입의 무표정, 목 · 몸 없음) |
| `jam` | jam | 잼 | 1 | 따로 | 빨간 잼이 든 뚜껑 덮인 유리병 하나(글자 · 상표 · 과일 그림 없음) |
| `king` | king | 왕 | 1 | 따로 | 왕관을 쓰고 수염이 난 동화 속 왕의 윗몸(빨간 망토) |
| `lake` | lake | 호수 | 1 | 따로 | 풀과 나무로 둘러싸인 잔잔한 파란 호수(바다 · 강 꼴 아님, 산 없음) |
| `lamp` | lamp | 램프, 전등 | 1 | 따로 | 갓이 달린 책상 스탠드 등 하나(불이 켜져 아래로 빛) |
| `neck` | neck | 목 | 1 | 가리키기 | 아이 머리 · 목 · 어깨 윗몸에서 목을 빨간 점선 동그라미로 둘러쌈 |
| `pink` | pink | 분홍의, 분홍색 | 1 | 색 | Twemoji 색 동그라미와 같은 크기 · 꼴의 분홍 동그라미 |
| `pot` | pot | 냄비, 화분 | 1 | 따로 | 손잡이 둘 달린 빈 냄비 하나(뚜껑 덮음, 음식 · 김 없음) |
| `sand` | sand | 모래 | 1 | 따로 | 작은 점 무늬의 연노랑 모래 더미 하나(장난감 · 바다 없음) |
| `shop` | shop | 가게, 쇼핑하다 | 1 | 따로 | 줄무늬 차양과 진열창이 있는 작은 가게 건물(간판 글자 · 숫자 없음) |
| `swing` | swing | 그네, 흔들다 | 1 | 따로 | 나무 틀에 줄 두 개로 매달린 빨간 자리의 빈 그네 하나(예문 The swing is red.) |
| `top` | top | 팽이, 꼭대기 | 1 | 따로 | 빨간 나무 팽이 하나(돌고 있음을 보이는 짧은 곡선) |
| `catch` | catch | 잡다 | 2 | 동작 | 두 손을 앞으로 내밀어 날아오는 공을 받는 아이(공은 손 바로 앞, 움직임 선) |
| `coat` | coat | 외투, 코트 | 2 | 따로 | 무릎까지 오는 갈색 긴 코트 하나(깃 · 단추 두 줄) |
| `draw` | draw | 그리다 | 2 | 동작 | 앉아서 종이에 크레용으로 구불구불한 색 선을 긋는 아이(종이에 물건 그림 · 글자 없음) |
| `finger` | finger | 손가락 | 2 | 가리키기 | 편 손(✋ 꼴)에서 검지 하나를 빨간 점선 동그라미로 둘러쌈 |
| `fly` | fly | 날다 | 2 | 동작 | 구름 위로 날개를 활짝 펴고 날아가는 새 한 마리와 바람 선(bird 그림의 빨간 새와 다른 색 · 자세) |
| `hair` | hair | 머리카락 | 2 | 따로 | 뒤에서 본 긴 갈색 머리카락과 리본 하나(얼굴 · 몸 없음) |
| `head` | head | 머리 | 2 | 가리키기 | 옆을 보는 아이 윗몸에서 머리 전체를 빨간 점선 동그라미로 둘러쌈 |
| `hungry` | hungry | 배고픈 | 2 | 동작 | 빈 그릇 앞에서 두 손으로 배를 감싸고 입을 벌린 아이(배 옆에 꼬르륵 물결 선) |
| `jump` | jump | 뛰다, 점프하다 | 2 | 동작 | 두 팔을 위로 뻗고 두 발이 땅에서 떠 높이 뛰어오른 아이(발 아래 그림자) |
| `kick` | kick | 차다 | 2 | 동작 | 한 발로 땅 위의 공을 차는 아이(발끝에 닿은 공, 움직임 선) |
| `knee` | knee | 무릎 | 2 | 가리키기 | 굽힌 다리 하나(🦵 꼴)에서 무릎을 빨간 점선 동그라미로 둘러쌈 |
| `pants` | pants | 바지 | 2 | 따로 | 갈색 긴 바지 하나(청바지 색 · 박음질 무늬 아님) |
| `read` | read | 읽다 | 2 | 동작 | 펼친 책을 두 손으로 들고 들여다보는 아이(책에 글자 없음) |
| `shoulder` | shoulder | 어깨 | 2 | 가리키기 | 아이 윗몸에서 두 어깨를 빨간 점선 동그라미로 둘러쌈 |
| `sing` | sing | 노래하다 | 2 | 동작 | 입을 크게 벌리고 노래하는 아이와 입 옆 음표 둘(마이크 없음) |
| `skate` | skate | 스케이트를 타다 | 2 | 동작 | 얼음 위에서 한 발로 미끄러지는 스케이트 탄 아이(목도리 없음) |
| `skirt` | skirt | 치마 | 2 | 따로 | 파란 주름치마 하나(예문 My skirt is blue.) |
| `sweater` | sweater | 스웨터 | 2 | 따로 | 목이 둥근 빨간 긴소매 뜨개 스웨터 하나(가로 뜨개 무늬) |
| `table` | table | 탁자, 식탁 | 2 | 따로 | 다리 넷 달린 갈색 나무 식탁 하나(서랍 없음, 위에 아무것도 없음) |
| `thirsty` | thirsty | 목마른 | 2 | 동작 | 땀방울을 흘리며 혀를 내밀고 빈 물컵을 든 아이 |
| `throw` | throw | 던지다 | 2 | 동작 | 한 팔을 머리 위에서 앞으로 휘둘러 공을 던지는 아이(손을 떠난 공, 움직임 선) |
| `toe` | toe | 발가락 | 2 | 가리키기 | 발(🦶 꼴)에서 발가락들을 빨간 점선 동그라미로 둘러쌈 |
| `water` | water | 물 | 2 | 따로 | 맑은 물이 담긴 투명한 유리컵 하나(파란 물결, 빨대 · 얼음 없음) |

## 뺀 낱말과 까닭(표본, 69 전부는 sheet.html 아래 표)

| 낱말 | 까닭 |
|---|---|
| big · small · little · long · short · tall · thick · thin · old · young · fast · slow · new | 크기 · 길이 · 나이 · 빠르기 — 비교가 있어야 함 |
| hot · cold | 🥵 · 🥶 은 더워하는 · 추워하는 얼굴이라 예문 뜻(The pizza is hot. 뜨거운 · The milk is cold. 차가운)과 다름 |
| color · game · song · music · animal · food · fruit · toy · snack · pet · lunch · room | 범주 · 추상 · 장면 — 그림 하나가 그 안의 한 가지로 읽힘(🎮 비디오 게임 · 🎵 음표 · 🍱 도시락) |
| mom · dad · mother · father · brother · sister · aunt · uncle · cousin · friend | 관계 — 그림이 man · woman · boy · girl 과 갈리지 않음 |
| home · puppy · glad | house 🏠 · dog · happy 와 같은 그림이 됨 |
| like · thank · have · want · need · know · help · play | 동작이 아니거나 사람 둘의 장면이 있어야 함 · 뜻이 넓음 |
| cute · nice · pretty · beautiful · good · bad · fine · great · kind · smart · cool · fun · funny · busy · ready · sorry | 평가 · 성품 · 상태 — 표정 하나로 안 됨 |
| very · really · here · now | 부사 |

## 명령 결과(워크트리, node v24.22.0)

| 명령 | 결과 |
|---|---|
| `pnpm images:fetch` | exit 0, `vocab-images fetch: Twemoji 행 162 · 씀 162 · 같아서 건너뜀 0 · 실패 0` |
| `pnpm images:check` | exit 1, `vocab-images check: 행 207 · 파일 162 · 위반 45` — 45줄 모두 '파일이 없다'이고 to-draw.json 의 45 키와 같다. 그 밖 문제 0(출처 · 라이선스 짝 · 크기 · 카탈로그 밖 파일 · SVG 안전) |
| `pnpm seed:validate` | exit 0, `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0`(reference-image 0) |
| `pnpm test` | exit 0, 17 파일 · 167 통과 |

## 다르게 한 것

1. **네트워크 세 번**: 모두 `pnpm images:fetch`(jsDelivr Twemoji v17.0.3)다. 후보 견주기용 임시 뿌리(`--root tests/.tmp/p06b/cand`)에 224행을 두 번 돌렸다. 첫 번은 146장을 쓴 뒤 종료 코드 144 로 끊겼고(출력 없음, 까닭 모름), 둘째는 '같아서 건너뜀 146 · 씀 78 · 실패 0'이었다. 본 받기 162장이 한 번이다. 본 파일 162장은 견주기 때 본 후보와 바이트가 같다.
2. **자체 그림 행의 날짜**: `self-made 2026-10-17`(오늘)로 넣었다. 작업 4 가 다른 날 그리면 그날로 고친다.
3. **뺀 낱말 갈래를 넓힘**: 범주 · 관계 · 같은 그림 · 동작 아닌 동사를 plan 의 '빼는 것'에 더했다(위 규칙).
4. **감정 낱말을 넓힘**: happy · sad · angry 밖에 sick 🤒 · sleepy 🥱 · tired 😫 은 Twemoji 얼굴로, hungry · thirsty 는 그림(몸짓 · 표정)으로 넣었다. 단원 '오늘 내 기분'(읽기 2-1 등)의 그림 문제 자리를 늘리려는 것이다.
5. **insect**: 범주 낱말이지만 '알파벳 대표 낱말 전부' 규칙으로 넣고 일반 곤충을 그린다. 🪲 beetle · 🐞 ladybug 는 종이 정해진 그림이라 쓰지 않았다.
6. **가리키기 틀**: 따로 떼어 그릴 수 없는 몸 부분(neck · head · shoulder · knee · toe · finger)에 제안했다. 도형만이라 plan 지침 안이다.

## 결정이 필요한 것

1. **그림 색 ↔ vocab 예문 색 어긋남 18**(Twemoji): bike 빨강(It is a pink bike.) · bird 빨강(blue) · bus 회색(yellow) · chair 갈색(red) · door 갈색(red) · duck 청둥오리(yellow) · fan 빨강(white) · flower 흰 꽃잎(yellow) · grape 보라(green) · hat 밀짚(red) · kite 파랑(red) · octopus 보라(red) · rabbit 회색(white) · shell 회백(pink) · shirt 파랑(white) · sock 파랑 · 노랑(white) · wing 회백(blue) · dress 파랑(pink). 그림 옆에 vocab 예문을 함께 보이는 화면(미리보기 · 단어장)이 생기면 어긋난다. 길은 둘이다. vocab 예문을 그림 색에 맞추거나 색을 빼서 고치는 것(P6a 몫), 또는 P8 시드 브리프에 '그림이 붙는 문장은 그림의 색 · 모습과 맞춘다(sheet.html 참고)'를 넣는 것이다. 수업 시드 문장에는 뒤의 것이 어느 쪽이든 필요하다.
2. **hot · cold**: 지금은 뺐다. 읽기 2-1 '오늘 내 기분'에서 I'm cold 로 쓰면 🥶(추워하는 얼굴)을 둘 수 있다. 예문을 '추운' 뜻으로 바꿀지(P6a 몫) 지금처럼 뺄지 정한다.
3. **뜻이 갈릴 수 있는 Twemoji**(작업 5 화면 검토 · 작업 6 H7 표본에서 볼 것): student 🧑‍🎓(학사모라 '졸업'), tired 😫(속상), family 👪(파란 표지판 꼴), strong 💪(알통 — 팔로 읽힘), glasses 👓(파란 렌즈 — 선글라스), white ⚪(아주 연한 회색), bank 🏦(기둥 건물), piano 🎹(건반), boy · girl · man · woman(한 단원에서 아이 · 어른 얼굴 가르기), grandmother · grandfather 👵 👴(Unicode 이름 older woman · man, 우리말 할머니 · 할아버지).
4. **doctor · nurse**: 🧑‍⚕️(health worker)를 2단계 정규 단원 낱말 doctor 에 주고 알파벳 nurse 를 그린다. 반대로 해도 된다.
5. **가리키기 틀**이 아이에게 한 뜻으로 읽히는지: head · hair · face 가 서로 헷갈릴 위험이 가장 크다. 작업 4 · 5 에서 안 되면 head 를 빼는 길이 있다(plan 위험 2).
6. **그림 대신 Twemoji 대안**(작업 5 가 cand/ 로 볼 수 있음): lamp 🪔(기름 램프 — 아이에게 '램프'로 덜 읽힘) · doll 🪆(마트료시카) · pot 🪴 · 🍲(화분 · 음식 담긴 냄비) · insect 🪲 · king · queen 🫅(성별 없는 왕관 쓴 사람) · skate ⛸️(스케이트 신 — 동작 아님). fan 은 Twemoji 부채로 했으나 첫 뜻은 선풍기다.
7. **작업 7(3~4단계)로 넘기는 겹침**: airplane(3) = plane ✈️ · store(3) ↔ shop · soup(3) ↔ 🍲 · sleep(3) ↔ sleepy · crayon · paint(3) ↔ draw · brush · birthday(3) 🎂(남겨 둠) · touch · point(4) 판정.

## 보충 — 예문 18(cd-p06b, 2026-10-17, 브리프 task-p06b-3b)

상태: DONE. 컨트롤러 판정대로 vocab 예문을 그림에 맞췄다. 색을 그림 색에 맞추거나(그 단계 vocab 의 색만) 색을 뺐다. 207 그림 낱말 예문을 다시 훑어 그림과 어긋나는 17개를 더 고쳐 모두 35개다. 뜻 · 품사 · forms 는 그대로다. HEAD 와 견주면 예문 35 와 imageKey 207 밖에 바뀐 칸이 0 이다. 옛 예문은 docs · seed · specs · src · tests 의 다른 파일에 인용된 곳이 없다.

### 컨트롤러가 정한 18(그림 색)

| 낱말 | 단계 | 전 | 후 | 까닭 |
|---|---|---|---|---|
| bike | 1 | It is a pink bike. | It is a red bike. | 그림은 빨간 자전거 |
| bird | 1 | The bird is blue. | The bird is red. | 그림은 빨간 새 |
| bus | 1 | The bus is yellow. | It is a big bus. | 그림은 회색 · 파랑 버스, 색을 뺌 |
| chair | 1 | The chair is red. | This is my chair. | 그림은 갈색 나무 의자(brown 은 1단계 밖), 색을 뺌 |
| door | 1 | The door is red. | The door is big. | 그림은 갈색 문, 색을 뺌 |
| duck | 1 | The duck is yellow. | This is a duck. | 그림은 청둥오리(초록 머리 · 갈색 몸), 색을 뺌 |
| fan | 1 | The fan is white. | The fan is red. | 그림은 빨간 부채 |
| flower | 1 | This flower is yellow. | This flower is white. | 그림은 흰 꽃잎 |
| grape | 1 | I like green grapes. | I like grapes. | 그림은 보라 포도(purple 은 범위 밖), 색을 뺌 |
| hat | 1 | It is a red hat. | This is my hat. | 그림은 밀짚모자, 색을 뺌 |
| kite | 1 | It is a red kite. | It is a blue kite. | 그림은 파란 연 |
| octopus | 1 | The octopus is red. | It is an octopus. | 그림은 보라 문어, 색을 뺌(an 쓰임은 남김) |
| rabbit | 1 | The rabbit is white. | The rabbit is cute. | 그림은 회색 토끼, 색을 뺌 |
| shell | 1 | This shell is pink. | I like this shell. | 그림은 회백 소라 껍데기, 색을 뺌 |
| shirt | 1 | My shirt is white. | My shirt is blue. | 그림은 파란 티셔츠 |
| sock | 1 | My socks are white. | My socks are blue. | 그림은 파란 양말(노란 줄) |
| wing | 1 | The bird wings are blue. | The bird wings are big. | 그림은 회백 날개, 색을 뺌 |
| dress | 2 | The dress is pink. | The dress is blue. | 그림은 파란 드레스 |

### 다시 훑어 더 고친 17(수 · 크기 · 상황 · 뜻)

| 낱말 | 단계 | 전 | 후 | 까닭 |
|---|---|---|---|---|
| cow | 1 | The cow is white. | The cow is big. | 그림은 흰 바탕에 검은 점이라 '흰'은 반만 맞음, 색을 뺌 |
| ear | 1 | Rabbit ears are long. | My ears are big. | 그림은 사람 귀 |
| leg | 1 | Duck legs are short. | My legs are long. | 그림은 사람 다리 |
| face | 1 | My face is red. | This is my face. | 그림은 무표정 얼굴(빨갛지 않음) |
| orange | 1 | I like orange juice. | My cat is orange. | 그림은 주황 동그라미(색 뜻), 예문은 과일 뜻이었음 |
| chicken | 1 | I like chicken. | This is a chicken. | 그림은 살아 있는 닭(동물 뜻), 예문은 닭고기 뜻이었음 |
| climb | 2 | Can you climb a tree? | Can you climb the rock? | 그림은 바위 벽을 오르는 사람 |
| cook | 2 | My grandmother can cook. | Can you cook? | 그림은 요리사 모자를 쓴 젊은 사람(할머니 아님) |
| dance | 2 | She can dance. | He can dance. | 그림은 춤추는 남자(🕺) |
| draw | 2 | I can draw a cat. | I can draw. | 그림은 색 선을 긋는 아이(고양이를 그리지 않음) |
| family | 2 | My family is big. | This is my family. | 그림은 세 사람이라 '큰 가족'과 어긋남 |
| hair | 2 | My hair is short. | My hair is long. | 그림은 긴 머리카락 |
| jump | 2 | Frogs can jump. | I can jump. | 그림은 뛰어오르는 아이(개구리 아님) |
| knee | 2 | My knee is red. | This is my knee. | 그림의 무릎은 빨갛지 않음 |
| sad | 2 | The puppy is sad. | I am sad. | 그림은 사람 얼굴(강아지 아님) |
| sick | 2 | My cat is sick. | I am sick. | 그림은 사람 얼굴(고양이 아님) |
| walk | 2 | The baby can walk. | I can walk. | 그림은 걷는 어른(아기 아님) |

훑었으나 고치지 않은 것: sleepy(The baby is sleepy.) · tired(My dad is tired.) · angry(Is your mom angry?)는 Twemoji 얼굴이 누구인지 정하지 않아 어긋나지 않는다. car(This is a toy car.) · clock(It is a big clock.) · cake(The cake is big.) · finger(I have ten fingers.) · man(That man is a doctor.)도 그림과 맞서는 말은 아니라 두었다. 자체 그림 쪽은 예문에 맞췄다: table 은 옆으로 긴 식탁이고, skirt · swing 은 앞서 맞췄다.

### 컨트롤러 판정 반영(그릴 낱말 45 → 48)

student · white · glasses 를 Twemoji 에서 자체 그림으로 옮겼다. 그릴 모습은 셋이다.
- student: 파란 책가방을 메고 책 한 권을 안은 아이(학사모 · 교복 없음).
- white: 가는 회색 테두리가 있는 흰 동그라미(Twemoji 색 동그라미와 같은 꼴).
- glasses: 투명한 렌즈의 검은 테 안경.

images.json 의 세 행은 `self-made 2026-10-17` · `generated` 이고, 받아 둔 Twemoji 파일 셋(student · white · glasses.svg)은 지웠다. 수는 Twemoji 162 → 159, 그릴 낱말 45 → 48 이다(알파벳 0 · 1단계 +1 · 2단계 +2). to-draw.json · sheet.html 도 다시 만들었다. 다른 판정(hot · cold 뺌, doctor 🧑‍⚕️ · nurse 그림)은 이미 그대로다.

### 검사(워크트리, node v24.22.0)

| 검사 | 결과 |
|---|---|
| `pnpm exec tsx tests/.tmp/p06b/check_examples.ts 1,2`(P6a 에서 복사, 보조 파일 provisional-lexicon · later-forms 도 복사, 경로만 p06 → p06b) | 검사한 예문 1단계 183 · 2단계 137, RESULT 0(고치기 전 기준도 0) |
| `pnpm exec tsx tests/.tmp/p06b/check_lists.ts`(시험 문장) | RESULT 0 |
| `pnpm exec tsx tests/.tmp/p06b/check_unit_words.ts`(맞대기) | 단원 242 · 단원 단어 6952, RESULT 0 |
| `pnpm seed:validate` | exit 0, `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0` |
| `pnpm images:check` | exit 1, `행 207 · 파일 159 · 위반 48` — 48줄 모두 '파일이 없다'이고 to-draw.json 48 키와 같다. 그 밖 문제 0 |
| `pnpm test` | 17 파일 · 167 통과 |

일회 파일: `tests/.tmp/p06b/example_fixes.py`(낱말 · 전 · 후 · 까닭 표, 위 표의 원본).

# 작업 4: 자체 그림 SVG 48장(impl-p06b, 2026-10-17, 브리프 task-p06b-4)

상태: DONE_WITH_CONCERNS. 그림 48장을 그렸다. `images:check` · `seed:validate` · `test` 는 완료 조건대로다. `pnpm lint` 는 1 이다(아래 '우려 1'). 원인은 Biome 의 SVG 제목 규칙이 그림 207장 모두에 걸리는 것이다. Twemoji 159장도 똑같이 걸리므로 작업 3 뒤부터 이미 1이었다. 고치려면 공용 설정 `biome.json` 을 바꿔야 한다. 코드 · 설정 · 커밋 없음, 네트워크 없음.

## 만든 · 바꾼 파일

| 파일 | 무엇을 |
|---|---|
| `public/images/vocab/<키>.svg` 48장 | 새 자체 그림. 가장 작은 것 113바이트, 가장 큰 것 2,629바이트, 평균 1,225바이트. 상한 100,000바이트의 3% 아래 |
| `seed/images.json` | 바꾼 것 없음. 자체 그림 48행의 출처가 이미 `self-made 2026-10-17`(그린 날과 같음) · `generated` 다. student · white · glasses 셋은 보충 때 자체 그림 행으로 옮겨져 있었고 attribution 이 없다. 받은 Twemoji 파일도 이미 없었다 |
| `tests/.tmp/p06b/draw/`(git 무시) | 일회 생성기 `lib.py`(색 · 도형 · 아이 몸 틀 · 가리키기 점선) · `level1.py` · `level2.py` · `render.py`(미리보기). 고쳐 그리기 라운드에서 다시 쓴다 |
| `tests/.tmp/p06b/shot4-0.png` ~ `shot4-9.png` | 모아 보기 사진. 작업 3 의 `sheet.html` 틀을 그대로 쓰고, 점선 칸이 이제 그림으로 찬다 |

## 그린 48장

색은 Twemoji 값을 따랐다. 피부는 #FFDC5D, 그늘은 #EF9645, 눈은 #662113, 입은 #C1694F 이다. 아이 몸은 하나의 틀(머리 r5 · 몸통 · 팔다리 선)로 그려 동작 그림끼리 같은 사람으로 보인다.

| 키 | 모습 | 바이트 |
|---|---|---|
| fork | 세워 놓은 은색 포크 하나, 갈래 넷 | 702 |
| insect | 위에서 본 초록 곤충. 머리 · 가슴 · 배 세 마디, 다리 여섯, 더듬이 둘 | 1,987 |
| nurse | 흰 간호사 모자(분홍 띠) · 분홍 간호복 · 흰 V 깃의 윗몸. 십자 · 청진기 없음 | 1,260 |
| queen | 금관 · 긴 갈색 머리 · 보라 드레스 · 목걸이 점의 윗몸 | 1,353 |
| arm | 어깨에서 손끝까지 옆으로 뻗은 팔 하나, 팔꿈치 주름 | 818 |
| ball | 노랑 공에 빨강 · 파랑 띠 둘, 빛 반사 | 453 |
| cup | 손잡이 달린 파란 머그, 안은 비어 있음 | 512 |
| desk | 왼쪽에 서랍 둘이 달린 갈색 책상, 위는 빔 | 796 |
| dish | 비스듬히 본 빈 흰 접시, 회색 테 | 451 |
| doll | 주황 실 머리 · 단추 눈 · 바느질 입 · 기운 천 조각 · 줄무늬 다리의 헝겊 인형 | 2,337 |
| face | 앞을 보는 아이 얼굴, 짧은 갈색 머리, 다문 입. 목 · 몸 없음 | 639 |
| jam | 금빛 뚜껑의 유리병에 빨간 잼. 글자 · 그림 없음 | 903 |
| king | 금관 · 갈색 수염 · 빨간 망토 · 흰 털 깃의 윗몸 | 1,873 |
| lake | 풀밭과 나무 셋에 둘러싸인 파란 호수, 물결 셋 | 1,026 |
| lamp | 파란 갓의 스탠드 등이 켜져 아래로 연노랑 빛을 비춤 | 538 |
| neck | 아이 윗몸, 목에 빨간 점선 동그라미 | 918 |
| pink | Twemoji 색 동그라미와 같은 크기의 분홍 동그라미(#F4ABBA) | 113 |
| pot | 손잡이 둘에 뚜껑 덮인 빨간 냄비 | 651 |
| sand | 점 무늬가 있는 연노랑 모래 더미 | 1,267 |
| shop | 빨강 · 흰 줄무늬 차양, 진열창, 문이 있는 가게. 간판 글자 없음 | 1,635 |
| swing | 갈색 A자 틀에 줄 둘로 매단 빨간 자리의 빈 그네 | 939 |
| top | 빨강 · 노랑 띠의 나무 팽이, 양옆에 도는 곡선 | 824 |
| white | 흰 동그라미에 가는 회색 테두리 | 151 |
| catch | 두 손을 앞위로 내밀어 공을 받는 아이. 공은 두 손에 닿고, 날아온 쪽에 움직임 선 | 2,303 |
| coat | 깃과 단추 두 줄이 있는 무릎 길이 갈색 코트 | 1,158 |
| draw | 책상의 종이에 크레용으로 빨강 · 파랑 · 초록 구불선을 긋는 아이 | 2,040 |
| finger | 편 손에서 엄지 옆 검지를 빨간 점선 동그라미로 짚음 | 1,194 |
| fly | 날개를 편 파란 새가 구름 위로 날고 뒤에 바람 선 | 1,311 |
| glasses | 검은 테 안경, 옅은 투명 렌즈에 흰 빛 반사 | 949 |
| hair | 뒤에서 본 긴 갈색 머리카락과 빨간 리본 | 1,098 |
| head | 오른쪽을 보는 아이 윗몸의 옆모습, 머리 전체를 빨간 점선 동그라미로 둘러쌈 | 823 |
| hungry | 처진 눈썹에 입을 벌리고 두 손으로 배를 감싼 아이. 옆에 꼬르륵 물결, 앞에 빈 그릇 | 2,629 |
| jump | 두 팔을 위로 뻗고 다리를 굽혀 떠오른 아이, 아래에 그림자 | 1,747 |
| kick | 한 발로 땅 위 공을 차는 아이, 팔로 균형, 공 뒤에 움직임 선 | 2,313 |
| knee | 굽힌 다리(파란 반바지 끝)에서 무릎을 빨간 점선 동그라미로 짚음 | 821 |
| pants | 허리띠 · 앞 여밈 · 주머니 선이 있는 갈색 긴 바지 | 657 |
| read | 펼친 빨간 책을 두 손으로 들고 내려다보는 아이. 책장에 글자 없음 | 2,200 |
| shoulder | 아이 윗몸, 두 어깨에 빨간 점선 동그라미 | 985 |
| sing | 눈을 감고 입을 크게 벌린 아이와 옆에 음표 둘. 마이크 없음 | 1,405 |
| skate | 얼음 위에서 한 발로 미끄러지고 다른 발과 두 팔을 펼친 아이. 목도리 없음 | 2,173 |
| skirt | 허리띠가 있는 파란 주름치마 | 695 |
| student | 파란 책가방(어깨끈 · 손잡이)을 메고 빨간 책을 안은 아이. 학사모 · 교복 없음 | 2,324 |
| sweater | 가로 뜨개 무늬가 있는 목 둥근 빨간 긴소매 스웨터 | 1,215 |
| table | 다리 넷 달린 옆으로 긴 갈색 식탁. 서랍 없고 위는 빔 | 509 |
| thirsty | 땀방울 둘에 입을 벌리고 혀를 내민 아이가 빈 유리컵을 듦 | 2,166 |
| throw | 한 팔을 위로 휘둘러 공을 던진 아이. 공은 손을 떠났고 그 사이에 움직임 선 | 2,296 |
| toe | 위에서 본 발, 발가락 다섯을 빨간 점선 타원으로 둘러쌈 | 1,105 |
| water | 투명 유리컵에 파란 물, 물결 진 수면. 빨대 · 얼음 없음 | 553 |

## 지침 대조

| 지침 | 결과 |
|---|---|
| 칸 크기 | 48장 모두 `viewBox="0 0 36 36"` 이고 `<svg xmlns="http://www.w3.org/2000/svg">` 하나다 |
| 바탕 · 꼴 | 바탕은 투명이다. 평면 채색이고 가운데 놓았다. 그레이디언트 · 필터는 쓰지 않았다 |
| 글자 · 상표 · 실제 인물 | 쓰지 않았다. `<text>` 와 글꼴이 없다. 음표는 기호 도형이다 |
| 쓴 요소 | path · circle · ellipse · rect · g 만 쓴다. ball 만 defs 안의 clipPath 하나를 `url(#c)` 안쪽 참조로 쓴다. 회전에는 transform 을 쓴다. href 는 없다 |
| 안전 | `pnpm images:check` 의 checkSvg 문제 0 |
| 무섭거나 다치는 모습 | 없다. 다친 표정도 없다. 배고픔 · 목마름은 처진 눈썹 · 땀방울 정도로 그렸다 |
| 동작어 | 사람 하나가 그 동작을 한다. 얼굴은 눈 둘 · 입 하나로 단순하게 그렸다 |
| 피부색 | Twemoji 기본 #FFDC5D 를 썼고, 헝겊 인형만 천 색 #FCE3C5 이다 |
| 가리키기 틀 | head · neck · shoulder · finger · knee · toe 여섯 장이다. 몸 그림 위에 빨간 점선 동그라미(#DD2E44, 굵기 1.3, 점선 2.2 · 1.5)를 둘렀다 |
| 크기 | 가장 큰 것이 2,629바이트로 상한 100,000바이트 아래다 |

`differFrom` 의 짝끼리는 이렇게 갈랐다.
- **cup · water**: 불투명 머그와 물이 찬 투명 유리컵이다.
- **desk · table**: 서랍 달린 책상과 서랍 없는 긴 식탁이다.
- **king · queen**: 수염 · 빨간 망토와 긴 머리 · 보라 드레스다.
- **catch · throw · kick**: 공이 두 손에 닿음, 손을 떠남, 발끝에 닿음으로 갈랐다.
- **draw · read**: 책상 위 종이의 색 선과 두 손에 든 책이다.
- **hungry · thirsty**: 배 감싸기와 빈 그릇, 빈 컵과 땀방울이다.
- **hair · head**: 뒤에서 본 머리카락뿐인 그림과 윗몸 옆모습에 머리를 짚은 그림이다.
- **pink · white**: 분홍 칠과 흰 칠에 회색 테두리다.

## 어려웠던 낱말과 대안

- **toe**: 위에서 본 발이 길쭉해 병이나 장갑처럼 볼 수 있다. 발가락을 키워 고쳤지만 가장 약한 그림이다. 대안은 옆에서 본 발(Twemoji 🦶 꼴)의 앞쪽을 짚는 것이다.
- **head**: 지침대로 옆모습에 머리 전체를 짚었다. 그래도 face 나 hair 와 헷갈릴 수 있다. 작업 5 에서 안 읽히면 컨트롤러가 head 를 뺀다는 브리프 방침대로 둔다.
- **arm**: 떼어 낸 팔이라 어색할 수 있어서 Twemoji 🦵 leg 와 같은 방식으로 그렸다. 대안은 아이 몸에서 팔을 짚는 가리키기 틀이다.
- **student**: 정면 그림이라 책가방이 몸 양옆과 어깨 위로만 보인다. 대안은 옆으로 돌아 책가방을 다 보이는 그림이다.
- **knee**: 반바지 끝이 다리 위쪽에 짧은 파란 막대로 보인다.
- **sand**: 치즈와 헷갈리지 않게 구멍을 두지 않고 점 무늬 더미로 그렸다.

## 사진

모아 보기는 `tests/.tmp/p06b/sheet.html` 이고, `node tests/.tmp/p06b/shot.mjs` 로 열 장을 찍었다.
`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b/tests/.tmp/p06b/shot4-0.png` ~ `shot4-9.png`
첫 장(알파벳 대표 낱말)에서 fork · insect · nurse · queen 이 점선 칸에 보이는 것을 확인했다. 미리보기용 48장 한 쪽 사진(흰 바탕 · 코르크 색 바탕 작은 크기)은 그리는 동안 스크래치패드에서 보며 고쳤다. 고친 것은 이렇다.
- **목 길이**: 목이 길어 기린처럼 보여 어깨를 올렸다.
- **간호사 모자**: 흰 바탕에 묻혀 회색 테두리를 줬다.
- **왕의 깃**: 흰 털 깃이 흰 바탕에 묻혀 회색 테두리를 줬다.
- **여왕 입술**: 입술 점을 뺐다.
- **잡기**: 공을 손에 닿게 옮겼다.
- **배고픔**: 눈썹을 화남 꼴에서 처짐 꼴로 바꿨다.
- **학생**: 책가방이 어깨 위로 보이게 했다.
- **발가락**: 크기를 키웠다.

## 명령 결과(워크트리, node v24.22.0)

| 명령 | 결과 |
|---|---|
| `pnpm images:check`(첫 묶음 1단계 23장 넣은 뒤) | exit 1, `행 207 · 파일 182 · 위반 25`. 25줄 모두 아직 안 넣은 2단계 그림의 '파일이 없다'다 |
| `pnpm images:check`(둘째 묶음 2단계 25장 넣은 뒤) | exit 0, `행 207 · 파일 207 · 위반 0` |
| `pnpm seed:validate` | exit 0, `칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0` |
| `pnpm test` | exit 0, 17 파일 · 167 통과 |
| `pnpm lint` | **exit 1**, `Checked 259 files … Found 207 errors`. 207건 모두 `lint/a11y/noSvgWithoutTitle` 이고 `public/images/vocab/*.svg` 207장 전부다 |
| `pnpm exec biome check --skip=a11y/noSvgWithoutTitle` | exit 0. 그 밖 위반은 없다 |

## 우려 · 요청하는 공용 변경

1. **lint 1(공용 설정 필요)**: Biome 기본 규칙 `a11y/noSvgWithoutTitle` 이 `public/` 의 SVG 파일 자체를 검사한다. 받은 Twemoji 159장은 plan 대로 바꾸지 않고 쓰므로, 작업 3 에서 그림을 받은 뒤부터 lint 가 이미 1이었다. 자체 그림에 `<title>` 을 넣어도 Twemoji 159장은 그대로 걸린다. 앱은 그림을 `<img alt>` 로 보이므로(plan 위험 3 · 8), 파일 안 제목은 접근성에 쓰이지 않는다. 컨트롤러에게 `biome.json` 고치기를 요청한다. 둘 가운데 하나를 고르면 된다.
   - `files.includes` 에 `"!public/images/vocab"` 한 줄을 더한다(받은 · 그린 그림 파일을 Biome 이 보지 않는다).
   - 또는 `overrides` 에 `{ "includes": ["public/images/vocab/**"], "linter": { "rules": { "a11y": { "noSvgWithoutTitle": "off" } } } }` 를 더한다.
   CI 의 `biome ci .` 도 같은 까닭으로 실패하므로 합치기 전에 고쳐야 한다.
2. **이 보고 절의 뜻**: 그림 품질 판정은 작업 5(design-reviewer)와 H7 표본 확인이 한다. 이 절은 구현자의 자기 확인이다.

# 작업 5 fix 1: 화면 검토 반영(impl-p06b, 2026-10-17)

상태: DONE. 브리프는 `task-p06b-5-fix1.md` 이고, 기준은 검토 보고 `review-p06b-5.md`(Changes requested, I 5 · M 11)다. 처음에는 컨트롤러 메시지의 요지로 시작했고, 정정 메시지 뒤 이 브리프와 대조했다. 내용은 같았다. 다른 점은 둘이었다. 사진 다섯 장의 이름을 `shot5-0~4.png` 로 맞췄고, 이 절의 이름과 표 꼴을 바꿨다. 코드 · 설정 · 커밋은 없고, 네트워크도 쓰지 않았다. `biome.json` 은 컨트롤러가 이미 고쳐 두었다(`!public/images/vocab`).

'전 사진'의 앞부분은 검토자 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/rv/` 이다. '후 사진'의 앞부분은 워크트리 `tests/.tmp/p06b/` 이다.

## 지적마다

| 지적 | 판정 | 전 | 후 | 사진(전 · 후) |
|---|---|---|---|---|
| I-1 catch | ADDRESSED | 한 팔을 머리 옆으로 든 아이와 오른쪽 위 공. 먼 쪽 팔이 머리 뒤로 숨어 throw 와 같은 꼴 | 정면 아이가 두 팔을 가슴 앞으로 모아 두 손으로 빨간 공을 받는다. 공은 두 손 사이에 있고, 움직임 선 셋이 공 뒤 오른쪽 위에서 손 쪽을 향한다. 팔을 머리 위로 들지 않는다. throw 는 그대로, 2,232바이트 | rv/zoom-0 · shot5-0, shot5-3(2-5 줄) |
| I-2 hungry | ADDRESSED | 빈 그릇이 다리 앞에 겹쳐 대야에 선 아이로 읽힘. 양옆 물결이 떨림으로 읽힘 | 아이는 왼쪽에 서서 두 손을 배에 대고, 처진 눈썹에 입을 벌렸다. 배 앞에 고르게 감긴 흰 나선 하나를 두었다. '@'나 '6'으로 보이지 않게 1.6바퀴로 그렸다. 물결은 뺐고, 빈 그릇과 숟가락은 옆 탁자에 따로 두었다. 3,196바이트 | rv/zoom-0 · shot5-1, shot5-3(2-1 줄) |
| I-3 toe | ADDRESSED | 위에서 본 발이 노란 원통처럼 보이고, 발가락이 왕관 · 옥수수알처럼 보임 | foot 과 같은 옆모습 발이 칸 너비를 채운다. 앞쪽 발가락 다섯을 크게 그리고 발톱을 그렸다. 발가락 사이는 짧은 선으로 나눴다. 점선 타원은 발가락 쪽만 짚는다. 1,957바이트 | rv/zoom-0 · shot5-1, shot5-3(2-1 줄) |
| I-4 헷갈리는 짝 | 해당 없음 | — | 검토가 컨트롤러 몫(장부 · P8 브리프)으로 둔 항목이고, 브리프 '고르기 몫'에 따라 컨트롤러가 넣었다 | — |
| I-5 CREDITS.md | ADDRESSED | 파일 없음 | 저장소 뿌리에 `CREDITS.md` 를 새로 만들었다. 내용은 아래 'CREDITS.md' 표다 | — |
| M-1 arm | ADDRESSED | 칸의 20% 높이인 가는 가로 막대, 손이 벙어리장갑 꼴, 팔꿈치 주름이 긁힌 자국 꼴 | 칸 대각선을 채우는 굵기로 그렸다. 어깨 끝에 파란 짧은 소매와 소매 단을 두고, 엄지가 또렷한 편 손을 그렸다. 주름은 뺐다. 1,221바이트 | rv/zoom-0 · shot5-0 |
| M-2 neck | ADDRESSED | 점선이 목에 붙어 빨강 · 흰 줄 목걸이처럼 보임 | 목 둘레에 둥근 고리(가로 6.8 · 세로 5.6)를 둘러 양옆이 빈 곳에 오게 했다. 926바이트 | rv/small-0 · shot5-0, shot5-2 |
| M-2 shoulder | ADDRESSED | 점선이 몸에 붙어 견장처럼 보임 | 어깨 끝을 중심으로 한 동그라미 둘이라 반쯤이 몸 밖에 있다. 1,020바이트 | rv/small-0 · shot5-1, shot5-3(2-5 줄) |
| M-3 student | ADDRESSED | 정면이라 책가방이 몸 뒤 파란 덩어리로만 보임 | 오른쪽으로 걸어가는 아이의 옆모습이다. 덮개 · 주머니 · 어깨끈이 있는 파란 책가방이 등 전체를 덮는다. 학사모 · 교복은 없다. 1,966바이트 | rv/pairs-0 · shot5-1, shot5-3(2-2 줄) |
| M-4 nurse | ADDRESSED | 회색 테두리 사다리꼴 모자가 종이컵 · 양동이 꼴 | 양옆이 접힌 흰 간호사 모자 실루엣에 분홍 띠를 둘렀다. 십자 · 청진기는 없다. 1,686바이트 | rv/self1-0 · shot5-0 |
| M-5 white | ADDRESSED | 흰 칸에서 회색 고리뿐이라 빈 고리 · 숫자 0 으로 보임 | 안쪽 오른쪽 아래에 옅은 회색 초승달 그늘을 넣어 흰 원판으로 읽히게 했다. 248바이트 | rv/self1-0 · shot5-0, shot5-2 |
| M-6 skate | ADDRESSED | 날이 회색 테두리 네모라 상자처럼 보임 | 테두리 네모를 없앴다. 흰 부츠 아래 받침 둘과 가는 은색 날 한 줄을 두고, 날 앞을 살짝 말았다. 2,544바이트 | rv/self2-0 · shot5-1 |
| M-7 doll | ADDRESSED | 칸 너비의 절반이라 작게는 여자아이로 읽힘 | 칸 높이와 너비를 채우는 앉은 인형으로 그렸다. 단추 눈을 크게, 바느질을 굵게 하고 다리를 앞으로 뻗었다. 2,541바이트 | rv/small-0 · shot5-0, shot5-2 |
| M-8 knee | NOT ADDRESSED | Z 꼴 자세 | 검토가 '선택'으로 두었고 브리프의 다듬기 여덟에 없다 | — |
| M-9 모아 보기 쪽 | ADDRESSED | 낡은 머리글, 노랑 빗금 바탕, fan 옛 예문 | 아래 'sheet.html' | 작업 4 의 shot4-0 · sheet5-0 |
| M-10 예문 | NOT ADDRESSED | dish · shop · phone 예문이 그림과 조금 어긋남 | vocab 수정이라 이번 범위 밖이다. 검토도 '선택'으로 두었다 | — |
| M-11 teacher 메모 | ADDRESSED | 유지한 까닭이 sheet 에 없음 | sheet 메모에 유지한 까닭 한 줄을 넣었다 | sheet5-* |

나머지 자체 그림 37장은 생성기를 다시 돌려도 파일과 바이트가 같은 것을 확인했다. 생성기는 `tests/.tmp/p06b/draw/` 에 있고, `level1.py` · `level2.py` 위에 `fix1.py` 를 덮어쓰는 꼴이다.

## CREDITS.md

plan 'CREDITS.md' 절의 차례대로 썼다.

| 절 | 내용 |
|---|---|
| 1. 그림 · Twemoji 159장 | images.json 의 attribution 글 그대로, 라이선스 주소 https://creativecommons.org/licenses/by/4.0/, 받은 곳(jsDelivr 고정 판 v17.0.3). 받은 SVG 를 바꾸지 않고 쓰고 파일 이름만 키로 바꾸었다고 적었다. `source` 칸의 코드가 원래 파일 이름이라는 것도 적었다 |
| 1. 그림 · 자체 48장 | 이 프로젝트가 만든 그림(`generated` · `self-made <만든 날>`)과 키 48개 |
| 2. 어휘 | 2022 개정 기본 어휘 목록(교육부 고시 제2022-33호 [별책 14] [별표 3] pp. 254-290, KICE Word Lister 안내서에서 읽음). 참고 CEFR-J Wordlist Version 1.5(저작권 TUFS Tono Laboratory, 받은 곳 · 날짜, 단계 대조에만 씀). 한국어 뜻 · 예문 · 활용형은 이 프로젝트가 썼고 근거 문서를 가리킨다 |
| 3. 앱 안 표시 | 부모 화면 '정보' 쪽은 2차 |

수(159 · 48)는 images.json 의 license 칸을 세어 확인했다.

## sheet.html(M-9 · M-11)

- **머리글**: '작업 3 초안 … 작업 4 가 그리기 전에는 빈칸'을 '작업 4 자체 그림 · fix 1 반영'으로 바꿨다. 점선 칸 아래 글이 '그린 모습'이라고 고쳤다.
- **빗금 바탕**: 자체 그림 칸의 노랑 빗금 바탕을 흰 바탕으로 바꿨다. 앱 보기 칸처럼 보이게 하려는 것이다. 점선 테두리는 남겨 자체 그림을 가린다.
- **fan 메모**: 옛 예문 'The fan is white.'를 지금 예문 'The fan is red.'로 바꿨다.
- **teacher 메모**: 칠판 셈이 선생님의 표지라 유지했고, shop 🏪 은 간판 숫자가 표지가 아니라 뺐다는 한 줄을 넣었다.
- **다시 그린 그림의 메모**: catch · hungry · toe · student 네 장의 메모를 그린 모습에 맞췄다.
- 같은 머리글 · 바탕 · fan 글은 `build.py` · `choices.py` 에도 맞춰 두었다. build.py 는 다시 돌리지 않았다. 다시 돌리면 시드 파일도 다시 쓰기 때문이다.
- 다시 찍은 모아 보기는 `tests/.tmp/p06b/sheet5-0.png` ~ `sheet5-9.png` 다. `shot5-*` 이름은 브리프대로 아래 사진 다섯에 썼다.

## 작업 6(H7) 사진 다섯(`shot5-*.png`)

검토 5절의 '요청자 표본 묶음 권고'를 따랐다. 같은 사진이 `tests/.tmp/p06b/h7/` 에도 있고, 쪽 원본(`.html`)도 그 폴더에 있다.

| 사진 | 무엇 |
|---|---|
| `tests/.tmp/p06b/shot5-0.png` | 자체 그림 1~24, 200px, 흰 바탕. 이번에 고친 그림에 빨간 '고침' 표시 |
| `tests/.tmp/p06b/shot5-1.png` | 자체 그림 25~48, 같은 꼴 |
| `tests/.tmp/p06b/shot5-2.png` | 자체 그림 48, 64px, 노랑 포스트잇 바탕 |
| `tests/.tmp/p06b/shot5-3.png` | 단원 보기 묶음, 보기 칸 110px. 읽기 2-2 우리 가족(그림 13), 2-1 오늘 내 기분(14), 2-5 이게 뭘까 퀴즈(22). 단원 규격의 낱말 가운데 imageKey 가 있는 것 전부 |
| `tests/.tmp/p06b/shot5-4.png` | Twemoji 표본 아홉(tired · family · strong · bank · piano · boy · girl · man · woman), 180px |

워크트리 절대 경로 앞부분은 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b/` 다.

## 명령 결과(워크트리, node v24.22.0)

| 명령 | 결과 |
|---|---|
| `pnpm images:check` | exit 0, `행 207 · 파일 207 · 위반 0` |
| `pnpm seed:validate` | exit 0, 규격 파일 오류 0 |
| `pnpm test` | exit 0, 167 통과 |
| `pnpm lint` | exit 0, `Checked 52 files … No fixes applied.` |
| `pnpm exec biome ci .` | exit 0 |

## 남긴 것

- **CEFR-J 인용 글**: 근거 문서(`docs/research/2026-10-16-seed-reference-basis.md` 19줄)에는 README 가 '데이터를 바르게 인용하는 조건'이라고만 적혀 있다. 그 README 의 정해진 인용 문장은 네트워크 없이 다시 보지 못했다. CREDITS.md 의 CEFR-J 줄은 근거 문서에 있는 사실(판 1.5 · 저작권자 · 받은 곳 · 받은 날)로만 썼다. 커밋 전에 README 의 인용 꼴과 맞춰 볼 것을 권한다.
- **toe**: 고친 그림도 발가락이 작게는 덩어리로 보일 수 있다. 64px 사진에서 다시 볼 곳이다.
- **neck**: 점선 고리를 키웠지만, 목에 두르는 꼴이라 여전히 목걸이를 떠올릴 수 있다.
- **to-draw.json · choices.py 메모**: 다시 그린 그림의 '그릴 모습' 글은 고치지 않았다. sheet.html 메모만 고쳤다.
