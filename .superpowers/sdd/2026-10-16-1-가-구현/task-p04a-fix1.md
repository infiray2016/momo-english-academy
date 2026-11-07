# fix 1 브리프: P4a 시드 규격 · 글 도구(implementer impl-p04a · Opus · high, 같은 워크트리)

검토 `.superpowers/sdd/2026-10-16-1-가-구현/review-p04a.md`(rev-p04a, Changes requested C 0 · I 3 · M 7)의 지적 가운데 **I-1 · I-2 · I-3 · M-1 · M-2 · M-3 · M-5 · M-6 · M-7** 과 '범위 밖 관찰' 1(끝맺음 조건의 역할)을 고친다. **M-4 는 코드를 바꾸지 않는다**(컨트롤러가 정본 5절 문구를 고쳤다, C58 — 범위 밖 비율은 기능어도 단계로 판정하는 지금 코드가 맞다). 검토 보고 3절의 '고치는 법'을 따르고, 컨트롤러 결정은 메인 저장소 plan-p04a 의 '컨트롤러 결정' 문단 끝 '검토 뒤 결정(19:1x)'에 있다(`/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/plan-p04a-규격.md`, 워크트리 사본은 옛 판).

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리에서 이어 한다. git 쓰기 금지. 명령은 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(`source` 는 막힌다). `pnpm spec:trace` 는 인자 없이.
- 허용 파일: P4a 의 열 파일(`src/core/seed/structure.ts` · `text.ts` · `schema/{reference,lesson,talk,assessment,records}.ts` · `tests/unit/{seed-schema,seed-text}.test.ts` · `tests/fixtures/seed/builders.ts`)과 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04a-fix1-report.md`. 공용 파일 금지. 증명 표 시험 이름 22개는 그대로, 새 시험에 AC 접두 없음.

## 지적과 고치는 법
1. **I-1**(text.ts:92~93 TOKEN, :386~388 glossaryKey, :400~406). 낱말 갈래 앞에 `SENTENCE_END_ABBREVIATIONS`(Mr. · Mrs. · Dr. · a.m. · p.m.)로 만든 갈래를 두어 점까지 한 토큰으로 잡고, 수 갈래에 서수 꼬리 `(?:st|nd|rd|th)?` 를 더한다. glossaryKey 가 그 토큰을 그대로 받게 한다. 시험 더하기: "I get up at 7 a.m." 은 6낱말(`sentenceWords`), 글로서리에 `Mr.` · `a.m.` 을 적으면 빠짐이 없다, `May 3rd` 의 `3rd` 는 수다.
2. **I-2**(lesson.ts:455). 쓰기 4단계 `sentences[].wordBox` 의 역할을 `piece` 에서 `option` 으로. 글 조각 시험 기대도 고친다.
3. **I-3**(text.ts:504~510). 영어 금지어를 견줄 때 토큰마다 토큰 자체 · 하이픈으로 나눈 조각 · 소유격과 축약형을 뗀 줄기(`withoutPossessive` · `CONTRACTION_SUFFIXES` 재사용)를 함께 본다. 시험: 목록에 stupid 가 있을 때 "You stupid-head." 와 "That stupid's toy." 가 걸린다.
4. **M-1**(lesson.ts:426~428). 글로서리 `surface` · `lemma` 를 새 역할 `gloss` 로 낸다. `structure.ts` 의 `TEXT_ROLES` 에 `gloss` 를 더하고 주석에 '영어 범위 · 길이 검사 밖, 금지어 검사 안'을 적는다. 글 조각 시험의 빼는 칸에서 surface · lemma 를 지운다.
5. **M-2**(text.ts:11). 한글 범위를 날 글자 대신 이스케이프로: `ᄀ-ᇿ` · `㄰-㆏` · `가-힣`(plan-p04a 글 도구 표의 범위 그대로).
6. **M-3**(seed-schema.test.ts:692~787, builders.ts). 글 조각 시험 안에서만 쓰는 갈래 견본을 더한다 — 쓰기 2단계 문항 셋(dictation · build-tiles · assemble-phrase), 읽기 그림 평가 문항, 쓰기 단계 평가(fill-blank · fix-sentence · composition), 말하기 단계 평가(question · presentation), 읽기 · 쓰기 배치 문항. 빼는 칸 목록은 마지막 칸 이름이 아니라 경로 정규식으로 좁힌다(이름을 더해도 시험이 저절로 통과하지 않게).
7. **M-5**(structure.ts:21~38). 구간 정보 객체 배열 `BANDS` 의 이름을 `BAND_INFOS` 로 바꾼다(쓰는 곳 전부). `BAND_NAMES` · `Band` · `bandOf` 는 그대로(합칠 때 level-band 로 바뀜).
8. **M-6**(builders.ts:1008~1051). 견본 모델 단가를 정본 6.6 값으로(`specs/05-AI-호출.md` 72줄 입력 · 출력, 96줄 캐시 읽기 · 쓰기).
9. **M-7**(reference.ts:33). `Text` 는 공백만 있는 글을 거부한다(`z.string().regex(/\S/)`, 변환 없음). 깨지는 견본이 있으면 견본을 고친다.
10. **끝맺음 조건의 역할**(talk.ts 또는 lesson.ts 의 `endCondition`, 검토 '범위 밖 관찰' 1). 역할을 `prompt` 에서 `ko` 로 바꾼다(아이에게 안 보이는 AI 입력이고 P8 이 한국어로 쓴다 — 컨트롤러 결정). 글 조각 시험 기대도 고친다.

검토 '범위 밖 관찰' 2(금지어 활용형)와 표 1 항목 9(function 표시 범위)는 P6 몫이라 고치지 않는다.

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace`(인자 없이, missing-test 66 그대로) · `pnpm check:bundle`(build 뒤). 보고 `task-p04a-fix1-report.md`: 지적 1~10 마다 ADDRESSED(파일:줄 · 더한 시험 이름) · 설계와 다르게 한 것 · 바뀐 파일:줄 · 명령 출력(시험 수) · P4b 가 알아야 할 이름 변화(`BAND_INFOS` · 역할 `gloss`). 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝낼 때 Stop 관문이 `biome ci` 와 단위 시험을 돈다.
