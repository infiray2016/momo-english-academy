# fix 1 보고: P4a 시드 규격 · 글 도구(implementer · Opus · high, 같은 워크트리)

상태: DONE
I-1 · I-2 · I-3 · M-1 · M-2 · M-3 · M-5 · M-6 · M-7 과 끝맺음 조건의 역할(검토 '범위 밖 관찰' 1)을 고쳤다. 브리프대로 M-4 는 코드를 바꾸지 않았다(C58). 고친 파일은 P4a 의 열 파일 안이고, 공용 파일 변화는 0, git 쓰기도 0 이다.

## 지적마다

1. **I-1 ADDRESSED.**
   - `src/core/seed/text.ts:92~116`: 낱말 갈래 앞에 `SENTENCE_END_ABBREVIATIONS` 로 만든 줄임말 갈래를 두었다. 대소문자를 가리지 않고, 긴 것을 먼저 맞추며, 뒤에 영문자가 오면 줄임말로 보지 않는다. 수 갈래에는 서수 꼬리 `(?:st|nd|rd|th)?` 를 더했다.
   - `glossaryKey`(:407)는 토큰을 그대로 받으므로 고치지 않았다.
   - 시험을 더했다(이름은 그대로, 내용만 더함). "3.6 문장 길이: …"에 `I get up at 7 a.m.` = 6, `Mrs.` · `Mr.` · `P.M.` 한 토큰, `May 3rd` · `21st` 는 수, `a.mx` 는 줄임말이 아님. "6.4 글로서리: …"에 `Mr.` · `a.m.` 을 적으면 빠짐 0, 안 적으면 `Mr.` 이 빠짐.
2. **I-2 ADDRESSED.** `src/core/seed/schema/lesson.ts:457`: `wordBox` 의 역할을 piece 에서 option 으로 바꿨다. 글 조각 시험의 `ROLE_OF` 가 이 역할을 확인한다.
3. **I-3 ADDRESSED.**
   - `src/core/seed/text.ts:520~550`: `stemPieces` 를 더했다. 토큰의 소유격 · 축약형을 뗀 줄기(불규칙 축약형은 펼친 낱말)를 하이픈으로 나눈다. 이때 `withoutPossessive` · `CONTRACTION_SUFFIXES` · `IRREGULAR_CONTRACTIONS` 를 다시 쓴다.
   - 영어 금지어는 토큰 그대로와 조각 열에서 모두 찾는다.
   - 시험을 더했다("6.4 금지 내용: …"): `You stupid-head.` · `That stupid's toy.` 가 걸리고, `shut-up` 이 `shut up` 에 걸린다. `stupidly` 는 걸리지 않는다.
4. **M-1 ADDRESSED.**
   - `structure.ts:318~319`: `TEXT_ROLES` 에 `gloss` 를 더했다. 주석은 '영어 범위 · 길이 검사 밖, 금지어 검사 안'이다.
   - `lesson.ts:427~428`: 글로서리 `surface` · `lemma` 를 `gloss` 로 낸다. 함수 주석도 고쳤다.
   - 글 조각 시험에서 빼는 칸에서 surface · lemma 를 지웠다.
5. **M-2 ADDRESSED.** `text.ts:11`: `ᄀ-ᇿ㄰-㆏가-힣` 이스케이프로 바꿨다. 같은 까닭으로 :13 굽은 따옴표와 :28~29 닫는 · 여는 따옴표도 이스케이프로 바꿨다. 첫 판에서 날 글자가 된 까닭은 이 환경의 도구 층이 명령 · 파일 글의 `\uXXXX` 를 글자로 바꾸기 때문이다. 이번에는 백슬래시를 따로 만들어 썼고, 바이트로 확인했다.
6. **M-3 ADDRESSED.** "6.3 시드 규격: 글 조각 목록이 견본의 모든 글 칸을 담는다"(`tests/unit/seed-schema.test.ts:692~`).
   - 빼는 칸을 마지막 칸 이름이 아니라 경로 전체 정규식(`^…$`, 21개)으로 적었다.
   - 쟁점 칸의 역할 확인 `ROLE_OF`(wordBox → option, 글로서리 → gloss, endCondition → ko)를 더하고, 셋 모두 실제로 확인됐는지 센다.
   - 시험 안에서만 쓰는 갈래 견본을 더했고, 각 견본은 규격을 먼저 통과시킨다. 더한 갈래:
     - 쓰기 2단계 dictation · build-tiles · assemble-phrase
     - 읽기 그림 평가 문항
     - 쓰기 단계 평가 fill-blank · fix-sentence · dictation(해설 포함) · composition
     - 말하기 단계 평가 repeat · listening 그림 · question · presentation
     - 읽기 배치 picture · fact, 쓰기 배치 fill-blank · fix-sentence · build-tiles
   - builders.ts 에는 더하지 않았다(시험 안에서만 쓰는 견본이라).
7. **M-5 ADDRESSED.** `structure.ts:33` 의 `BANDS` 를 `BAND_INFOS` 로 바꿨다. 쓰는 곳은 structure.ts 안 다섯 곳과 seed-schema.test.ts 이다. `BAND_NAMES` · `Band` · `bandOf` 는 그대로다.
8. **M-6 ADDRESSED.** `tests/fixtures/seed/builders.ts:1011~1050` 의 단가를 고쳤다.
   - 정본 6.6 값: Opus 입력 4 · 출력 20, Sonnet 2 · 10, Haiku 0.10 · 0.50. 캐시는 Sonnet 쓰기 2.50 · 읽기 0.10, Haiku 0.125 · 0.01.
   - Opus 캐시 단가는 정본에 없다. 그래서 Sonnet 과 같은 비율(쓰기 1.25배 · 읽기 0.05배)로 셈한 쓰기 5 · 읽기 0.2 를 넣고, 그 사실을 주석에 적었다.
9. **M-7 ADDRESSED.** `src/core/seed/schema/reference.ts:33`: `Text` 를 `z.string().regex(/\S/)` 로 바꿨다(변환 없음). 이 때문에 깨진 견본은 없었다.
10. **끝맺음 조건 ADDRESSED.**
    - `src/core/seed/schema/talk.ts:202`: 역할을 prompt 에서 ko 로 바꿨다.
    - 견본 `builders.ts:1918` 을 한국어 '대화 턴을 모두 마치면 정리로 간다.'로 바꿨다(P8 이 한국어로 쓴다는 결정).
    - 글 조각 시험의 `ROLE_OF` 가 이 역할을 확인한다.

## 설계와 다르게 한 것

- 줄임말 토큰은 정본 목록 다섯(Mr. · Mrs. · Dr. · a.m. · p.m.)만 받는다. 그래서 `U.S.` · `e.g.` 같은 다른 줄임말은 지금처럼 쪼개진다. 바꾸려면 상수를 늘려야 하는데, 그러면 문장 자르기에도 영향이 간다.
- 금지어 조각 비교는 축약형의 펼친 쪽(`n't` → not 등)은 넣지 않고 줄기만 본다. 불규칙 축약형만은 펼친 낱말(can · will · shall · am · not)을 본다. 활용형(killed)은 P6 목록 몫으로 두었다(브리프).

## 바뀐 파일:줄

| 파일 | 고친 곳 |
|---|---|
| `src/core/seed/structure.ts` | :33 BAND_INFOS(그리고 :51 · :67 · :73 · :454 · :597), :318~319 gloss |
| `src/core/seed/text.ts` | :11 · :13 · :28~29 이스케이프, :92~116 TOKEN, :520~550 stemPieces · forbiddenHits 와 그 주석 |
| `src/core/seed/schema/reference.ts` | :33 Text |
| `src/core/seed/schema/lesson.ts` | :427~428 gloss, :457 option, :509~510 주석 |
| `src/core/seed/schema/talk.ts` | :202 endCondition ko |
| `tests/fixtures/seed/builders.ts` | :1011~1050 단가, :1918 끝맺음 조건 |
| `tests/unit/seed-schema.test.ts` | BAND_INFOS, 글 조각 시험 :692~ |
| `tests/unit/seed-text.test.ts` | :130~ · :277~ · :357~ 사례 더함 |

schema/assessment.ts · schema/records.ts 는 바뀌지 않았다.

## 명령 출력(PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin)

- `pnpm lint`: Checked 33 files, No fixes applied
- `pnpm test`: Test Files 7 passed, Tests 74 passed. 시험 수는 그대로이고 사례만 더했다. 증명 표 이름 22개와 더한 셋도 그대로다.
- `pnpm check:deps`: ✔ no dependency violations found (14 modules, 21 dependencies cruised)
- `pnpm build`: Compiled successfully in 390ms, Finished TypeScript in 1557ms, 정적 3/3
- `pnpm check:bundle`: 파일 25, 위반 0
- `pnpm spec:trace`(인자 없음): unknown-ac 0, plan-ac-not-in-spec 0, missing-test 66(같음)
- `pnpm exec tsc --noEmit`: 오류 0

## P4b 가 알아야 할 이름 변화

- `BANDS` 는 `BAND_INFOS` 로 바뀌었다(구간 · 첫 · 끝 · CEFR 객체 배열). `BAND_NAMES` · `Band` · `bandOf` · `bandInfo` · `cefrOf` 는 그대로다.
- 역할 `gloss` 가 새로 생겼다. 글로서리 표기형 · 원형에 쓰고, 영어 범위 · 길이 · 형태 검사의 role 모음에 넣지 않는다. 금지어 검사(모든 조각)에는 든다.
- 쓰기 단어 상자는 이제 `option` 이다. 학습 요소 검사와 P4c 보강 덮기에 들어간다.
- 회화 `endCondition` 은 이제 `ko` 다. P4c 회화 학습 요소 검사 대상에서 빠진다.
- `Text` 는 공백만 있는 글을 거부한다.
- `tokenize` 는 이제 줄임말을 `word` 토큰 하나(`a.m.`)로, 서수를 `number` 토큰 하나(`3rd`)로 낸다.
