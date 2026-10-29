# 보고: P8 시드 본 생성 준비 — 본 생성용 정의 · 생성 브리프 두 벌 · 표본 계획(cur-p08, 2026-10-22)

상태: DONE_WITH_CONCERNS — 파일 셋(정의 · 브리프 두 벌 + 틀 · 표본 계획)을 p08 워크트리에 만들었다. 표본(10-23) 전에 P6b · P5a 가지 합침이 꼭 필요하고(1절), 정본 빈틈 · 제안 값 19건을 '정할 것'에 모았다(4절).

## 1. 만든 파일(워크트리 `.claude/worktrees/p08`, 커밋 안 함)

| 파일 | 줄 | 내용 |
|---|---|---|
| `.claude/agents/seed-generator.md` | 39 | 본 생성용 정의. curriculum-designer 에서 갈라 브리프 하나만 읽게 함. `model: opus`, effort 키 없음 + 본문 "effort 는 호출이 정한다". 규칙 10개(Zod 1:1 · 6.4 검사 · 그림 짝 · C67 (5) · C67 (7) · C84 · 주제 겹침 · {NAME} · 설계 숫자 · 안전), 순서 6단계, 보고 꼴 |
| `seed/prompts/_template.md` | 33 | 브리프 틀 — 절 0~17 과 절마다 담을 것 · 옮길 곳, 영역마다 더 담을 것 |
| `seed/prompts/reading-1.md` | 533 | 읽기 1단계 브리프(단원 0 알파벳 포함 여섯 단원) |
| `seed/prompts/speaking-1.md` | 522 | 말하기 1단계 브리프(단원 1~5) |
| `seed/prompts/README.md` | 154 | 표본 계획 — 선행 조건 · 표본 절차와 명령 · 재는 표 · manifest 꼴 · 요청자 표본 읽기 · H11 · 1~6단계 묶음 순서 · H10 뒤 할 일 |

브리프 6 · 7 · 9절 표(배정표 · 1단계 어휘 183 · 그림 낱말 128)는 손으로 옮기지 않고 시드 파일에서 스크립트로 뽑았다. 배정표는 앱 배정 함수(`buildReferenceIndex().allocation`)를 실제로 불러 얻었다. 12절 예시 수업 JSON 둘(읽기 단원 2 배정 1 변형 1 · 말하기 단원 2 배정 1 변형 2)은 표본 단원(1)과 겹치지 않는 칸으로 골랐고, 브리프에서 꺼낸 그대로 검증기에 넣어 오류 0 · 경고 0 을 확인했다(임시 뿌리 = p08 규격 + P6b vocab · images, 해시 0 채움, svg 확장자만 png 로 바꿈 — p08 규격 정규식이 svg 를 아직 모른다).

`pnpm seed:validate` 확인: p08 에 node_modules 가 없어 본 저장소의 tsx 로 같은 스크립트를 p08 에서 돌렸다. 작업 전 · 뒤 모두 종료 0, '칸 0 · 실패 0 · 빈 칸 4892 · 경고 0 · 규격 파일 오류 0' 으로 같다(`seed/prompts/` 는 걷지 않는 폴더).

## 2. 브리프에 옮긴 사실의 출처

| 사실 | 출처 |
|---|---|
| can-do · 문장 상한 5 · 목표 시간 · 지문 1~3문장 · 문제 picture 5 / 따라 말하기 5 + 5 · 듣기 3 picture · 질문 4(modelAnswer · acceptedMin 3 · koMeaning) | `seed/level-specs.json` reading 1 · speaking 1 |
| 단원 틀 25 · 5 · 10 · 3 · 2 · 보강 덮기 1 · 범위 밖 0.05 · 고침 2 · 답 일치 0.8 | `seed/settings.json`(C66) |
| 단원 학습 요소 · 주제 · 단원 단어 | `seed/unit-specs.json` |
| 배정표 · 수업 번호 규칙 | `src/core/vocab/allocate.ts` · `check-lesson.ts` checkLayout |
| 1단계 어휘(기능어 32 · 내용어 151, 뜻 · 활용형) · 윗단계 흔한 낱말의 단계 | `seed/vocab.json` |
| 그림 키 207 · 그림과 맞는 예문 | P6b 가지 7767df0 `seed/vocab.json` · `images.json` |
| 그림 색 · 모습 | P6b `tests/.tmp/p06b/example_fixes.py`(고친 까닭 35) · `task-p06b-report.md` 110 · 115 · 123~144줄 · 그 낱말 자신의 P6b 예문 · images.json source 의 Unicode 이름 |
| 헷갈리는 짝(같은 단원 · 단원 밖) | `review-p06b-5.md` I-4 표 · `review-p06b-5b.md` N-4 · ledger-open 'P8 그림 문항 규칙' |
| 그림 붙는 문장은 그림 색 · 모습과 맞춤 | ledger-open 'P8 수업 · 평가 시드 문장 규칙' |
| 형태 표 58 · 1단계에서 걸리는 꼴 | `seed/lists/forms.json` · `text.ts` formsIn(후보 문장 40개를 실제로 대조) |
| 1단계 문장 꼴 근거(be · like · thank, it 검출 제외) | `docs/research/2026-10-16-seed-reference-basis.md` 150 · 674줄 |
| 금지어 · 정규식 · 메타 문장 · 동음이의어 | `seed/lists/forbidden.json` · `meta-sentences.json` · `homophones.json` |
| 출력 필드 이름 · 꼴 | `src/core/seed/schema/lesson.ts` · `reference.ts` · `structure.ts`(lessonFilePath · LESSON_KINDS · READING_OPTIONS) |
| 6.4 검사 규칙(배정 · 단원 단어 · 범위 밖 · 글로서리 · 그림 · 정답 · 말하기 수 · 변형 · 보강 덮기 · 관계 경고) | `check-lesson.ts` · `check-cross.ts` · `text.ts` |
| 허용 답 일치율 꼴 | `src/core/speech/match-rate.ts` · `src/core/speaking/judge.ts` · 정본 6.2 · C38 |
| 질문 한국어 뜻 1~4단계 · 그림 없이 답할 질문 | C67 (5) · (7) · C39 |
| 조립 카드 소문자 · 고유 명사 · I | C84 |
| 변형 번호 = 주제 묶음 id · 묶음 내용 | `src/core/profile/start.ts` TOPIC_BUNDLES(C54 (3)) · 정본 6.3 |
| 지문 옆 그림 = 새 단어 그림 최대 4 · 문제 활동엔 그림 줄 없음 | C67 (6) · `session-frame.tsx` pictureWords · task-p11-2 결정(ledger-open 41줄) |
| {NAME} 을 채우는 화면 없음 | `src/core/ai/mask.ts` fillName — 부르는 곳 0 |
| 근거 성취기준 · CEFR | P6a 근거 문서 can-do 표 312 · 336줄 |
| 회화 묶음 순서 | 본 저장소 정본 13절 C85(p08 가지에는 아직 없음) |

## 3. 단계표와 대조

| 항목 | 단계표 · 규격 | 브리프 | 결과 |
|---|---|---|---|
| 읽기 1 분량 | 3.3 '단어와 짧은 문장 1~3개', level-specs passage.sentences 1~3 | 5 · 12절 1~3문장 | 같음 |
| 읽기 1 문제 | 그림 고르기 5 | picture 5, 보기 4(READING_OPTIONS) | 같음 |
| 말하기 1 분량 | 단어 5 + 짧은 문장 5 · 듣고 그림 고르기 3 · 질문에 단어로 답하기 4 | 5 · 12절 | 같음(듣기 보기 수는 정본에 없어 제안 4) |
| 문장 길이 | 3.6 1단계 5 | 모든 영어 문장 5 이하 | 같음 |
| 문법 초점 | 3.6 1단계 다섯 요소 | unit-specs learningElement 와 같은 차례, 8절 단원별 꼴 | 같음(꼴 표는 제안) |
| 단원 단어 수 | C66 1~3구간 25 | 25(단원 0 은 26, C54) | 같음. 브리프 지시문의 '30'은 4단계부터 값이라 설정값대로 25 를 썼다 |
| 쓰기 1~3 | 고르기 · 베끼기 · 조립 | 정의 규칙 6 · 틀의 쓰기 줄 | 이번 브리프 밖, 정의에 둠 |

## 4. 정할 것(19)

표본 전에 꼭(선행):

1. **P6b(7767df0) · P5a(2c31bee)가 p08 가지에 없다** — p08 vocab 에 그림 키가 없고 images.json 이 비어 그림 문제 · 듣기 보기 전부가 `image` 오류가 된다. P6b 의 규격 코드(svg 그림 꼴, C65)도 함께 와야 한다. `pnpm seed:check` 도 P5a 에만 있다. P6b 합침은 H7(그림 승인) 뒤다. 컨트롤러 · 요청자.
2. **H9**(seed/ 를 볼트 기록 훅에서 뺄지)는 6.3 이 '첫 표본 생성 전에' 정하라고 한다. 요청자.
3. **브리프 지시문의 폴더 꼴과 코드가 다르다** — 지시문은 `seed/lessons/<영역>/<단계>/<단원>/` 폴더, 코드(`structure.ts` lessonFilePath)는 `lessons/<영역>/<단계>/<단원>.json` 파일 하나다. 코드대로 썼다. 확인만.

정본 빈틈 · 제안 값(컨트롤러 판정, 설계를 바꾸는 것은 13절 한 줄):

4. **effort 기록**: 6.3 은 'effort 는 에이전트 정의 파일의 값으로 기록'(B4-M-07)인데 이번 정의는 H10 전이라 effort 가 없다. 제안: H10 뒤 프런트매터에 effort 를 적고(정의 해시 · 판이 바뀜), 표본 단원은 본 묶음에 넣지 않고 새 판으로 다시 만든다.
5. **1단계 질문 꼴**: 3.6 은 1단계에 의문문 요소가 없다(What · Where · Who 3-5, Is it · Do you 2-5, How many 5-4). 3.3 은 말하기 1단계에 질문 4개를 둔다. 제안 꼴 'What is ~?' · 'What color ~?' · 'What is big?' · 'How many ~?'(단원 5)만 쓰고, 근거 문장을 질문 안에 먼저 둔다(C67 (5) 대응). 13절 한 줄이 필요해 보인다.
6. **1단계 단원별 문장 꼴**: 형태 표에 1단계 요소 검출기가 없어 C64 (1)(같은 단계 앞 단원까지)을 생성자가 지켜야 한다. 브리프 8절 표를 제안했다. 'It is ~'(2-2 요소와 겹침)와 명사 and 명사(5-3 과 겹칠 수 있음)를 단원 1부터 허용했다 — 근거는 P6a 근거 문서 674줄(it 검출 일부러 뺌) · 150줄(1단계 예문 be · like). 
7. **알파벳 단원(단원 0) 수업 꼴**: 정본은 kind alphabet 과 단원 틀만 정했다. 글자(B 등)를 지문에 넣으면 범위 밖 비율에 걸린다. 제안: 지문은 새 단어를 쉼표로 이은 줄, 문제 prompt 는 글자 짝 'B b', 정답은 그 소리가 든 낱말 그림(X 는 끝소리 box), 해설에서 글자 이름 · 소리를 한국어로.
8. **듣기 이해 보기 수**: level-specs 는 보기 꼴만 정한다. 제안 4(읽기 보기 수 · 시험용 견본과 같음).
9. **보강 수업이 몰아 다룰 단어 묶음**: 6.3 '몰아서 다룰 단원 어휘 묶음'의 나누는 법이 없다. 제안: 보강 1 = 배정 1 · 2, 보강 2 = 배정 3 · 4, 보강 3 = 배정 5 + 그림 없는 단어.
10. **`targetWords` 의 뜻**: 6.3 은 '목표 단어'라고만 한다. 제안: 지문에 나온 단원 단어 가운데 그 수업이 다루는 것(배정은 새 단어). 앱은 강조 표시에만 쓴다.
11. **등장인물**: 정본에 목록이 없다. 제안 Momo · Tori 둘(C84 의 예). 1단계는 he · she · 3인칭 -s 를 못 써 'Momo is ~' 만 된다.
12. **읽기 · 말하기의 {NAME}**: fillName 을 부르는 화면이 없어 쓰면 '{NAME}' 글자가 보인다. 정의 · 브리프는 '회화 카드만 {NAME}'으로 했다. progress 10-22 15:0x 의 P11b 검토 '{NAME} 채우기' 지적 결과가 읽기 · 말하기 화면에도 닿으면 다시 본다.
13. **검증기가 못 막는 시드 규칙 셋** — (가) C84: `check-lesson.ts` 702줄이 문장 조립 카드의 대문자를 모두 `writing-cards` 오류로 낸다. C84 대로 'I' · 'Momo' 카드를 쓰면 걸린다(쓰기 3단계 묶음 전에 고쳐야 함). (나) 말하기 5단계 이상 질문의 `ko` 를 막지 않는다(ledger-open 30줄, C67 (7)). (다) 말하기 칸의 어휘 범위 밖 비율을 세지 않는다(6.4 는 지문만이라 정본과는 맞음). 지금은 정의 · 브리프 규칙으로 메웠다. P4 수정 시점.
14. **생성자 스스로 검증 · 고침**: 묶음 plan 워크플로는 '검증(코드) → 실패 칸만 생성으로 되돌림(코드)'이다. 정의는 생성자가 검증을 돌려 첫 결과를 보고하고 오류 칸만 고치게 했다(seed.max_retries 까지, 고친 칸 generation.retries). S10 첫 통과율은 생성 보고의 '첫 검증'으로 센다. 워크플로 점과 맞는지 판정.
15. **manifest 꼴과 표본 뿌리 폴더**: 정본은 칸 목록만 있다. 제안 `seed/manifest/<영역>-<단계>.jsonl`(start · unit · warning-decision · load 줄). 표본은 `tests/.tmp/p08-samples/<effort>/`(규격 사본, 커밋 안 됨, SEED_VIEWER_ROOT · `--root` 로 본다).
16. **실시드 첫 적재 개정 번호**: 개발용 DB 에 시험용 시드(revision 1)가 있다. 정의는 호출 값(기본 1)을 적게 했다. 적재 전에 컨트롤러가 정한다(ledger-open 37 · 47줄).
17. **표본 비교 묶음**: 6.3 은 '성격이 다른 두 묶음, 예: 읽기 4 · 회화 2'다. 이번은 읽기 1 · 말하기 1 이다(일정). 요청자 확인.
18. **배치 평가 가 벌 순서**: 정본 순서는 (3) 배치 → (4-가) 수업이다. 일정은 읽기 1 묶음이 먼저다. 제안: 평가 브리프를 따로 만들어 1단계 묶음과 나란히.
19. **금지어 목록 밖 내용 기준과 표본 읽기 방식**: 무서운 장면 · 상표 · 실제 인물 · 종교 · 정치 금지, 표본 읽기를 가 · 나 블라인드로 · effort 마다 같은 두 칸(배정 1 변형 1 · 보강 1 변형 2) · 아이 눈 질문 넷은 모두 제안이다.

## 5. 근거가 약한 항목

- 5 · 6번의 1단계 꼴은 3.6 을 엄격히 읽으면 넘는 부분이 있다(What 의문문 · How many · It is · and). 검출기는 잡지 않는다.
- 그림 색은 자료가 있는 낱말만 적었다. cat · dog · pig · car · fish 등 Twemoji 그림의 색은 출처 문서에 없어 '색을 붙이지 않는다'로 두었다. 생성 글에 색이 줄어 단원 3(색) 수업은 색이 적힌 낱말(apple · bird · bike · kite · rose · snake · fox · plane · tooth · cap · shoe · jacket · sock · shirt · swing · top · lake · jam · cheese · pen · fan 등)에 기대야 한다.
- 알파벳 단원 꼴(7번)은 읽기 화면에 글자 · 소리 전용 활동이 없다는 전제의 우회다. 화면 쪽 설계가 따로 있으면 바꾼다.
- 정의 줄 수는 39줄(긴 줄)이다. 지시문의 '60줄 안팎' 보다 짧지만 규칙 10개와 순서 · 보고를 모두 담았다.

## 6. 표본 때 컨트롤러 명령 순서(10-23)

1. 선행: H9 결정 · H7 승인 → p08 에 P6b(7767df0) · P5a(2c31bee) 합침 → `pnpm install --frozen-lockfile`(Node 24) → `pnpm seed:validate` 종료 0 · 규격 파일 오류 0. H4 키가 `.env.local` 에 있는지.
2. 뿌리 폴더 둘: `tests/.tmp/p08-samples/{xhigh,high}` 에 `seed/*.json` · `seed/lists/*.json` 사본.
3. 판 해시: `shasum -a 256 seed/prompts/reading-1.md seed/prompts/speaking-1.md .claude/agents/seed-generator.md`.
4. manifest 첫 줄을 뿌리마다 `manifest/reading-1.jsonl` · `manifest/speaking-1.jsonl` 에(README 4절 꼴, 모델 ID 는 생성자 보고 뒤 대조).
5. 생성 호출 넷(R-x · R-h · S-x · S-h): `Agent(subagent_type: seed-generator, model: opus, effort: xhigh | high)`, 호출 글은 README 2절 꼴. 동시 3개까지, 호출 시작 · 끝 시각을 잰다.
6. 최종 검증: `pnpm -s seed:validate --root tests/.tmp/p08-samples/<effort> --areas reading,speaking --json --stats > …/validate.json`.
7. 풀이 검사: `pnpm seed:check --root … --file lessons/reading/1/1.json --dry-run` 뒤 `--json`, 말하기 파일도 같게.
8. 크기: `wc -c tests/.tmp/p08-samples/*/lessons/*/1/1.json`. 토큰은 한 수업을 count_tokens 로 재어 비율을 정한다(제안).
9. README 3절 재는 표를 채운다.
10. 요청자 표본 읽기: `SEED_VIEWER_ROOT=tests/.tmp/p08-samples/xhigh pnpm dev` · `… high pnpm dev --port 3001` → 접근 코드 → `/dev/seed-viewer?file=lessons%2Freading%2F1%2F1.json`. 판정을 뿌리마다 `reviews/` 에.
11. H10: effort 결정 → 정의 프런트매터에 effort(4번 정할 것) → 브리프 반영 → 읽기 1 묶음(10-24) 시작.
