# 브리프: P4b 어휘 배정 · 칸 검사(implementer impl-p04a · Opus · high, 같은 워크트리 이어 하기)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04b-배정-칸-검사.md`(approved 컨트롤러 15:5x, 결정 C54 · C58)를 구현한다. plan 이 유일한 설계이고 이 브리프는 범위 · 허용 파일 · 명령 · 보고 자리를 정한다. P4a 가 끝난 같은 워크트리에서 이어 한다(P4a 코드는 그대로 두고 그 위에 쌓는다). 메인 저장소의 plan 파일을 읽는다(워크트리 사본은 옛 판): `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/`.

## 먼저 할 것(P4a 재검토 Minor 둘, `review-p04a-2.md` '새 지적')
1. **M-8** `src/core/seed/text.ts` `endsWithAbbreviation`: 영문자 · 점이 아닌 글자에서 거슬러 보기를 멈춰 토큰 갈래와 같은 왼쪽 경계를 쓴다. 시험 "5절 문장 끝: …"에 `We eat at 7a.m. every day.`(한 문장) · `Tori—Mr. Kim's dog—runs fast.`(한 문장) · `Hi,Mr. Kim. Bye.`(두 문장) 사례를 더한다.
2. **M-9** TOKEN 수 갈래의 서수 꼬리를 `(?:(?:st|nd|rd|th)(?![A-Za-z]))?` 로 둔다(꼬리 전체에 부정 앞보기를 걸면 `7am` 의 `7` 이 사라진다). 시험 "3.6 문장 길이: …"에 `100steps` → 100 · steps, `3rdx` → 3 · rdx(또는 3rd 가 아님), `7am` 은 수 하나 + am 사례를 더한다.
둘 다 P4a 파일을 고치는 일이라 보고의 'P4a 파일 변경' 절에 따로 적는다.

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리. git 쓰기 금지. 명령은 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(`$HOME` 이 막히면 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`). `pnpm spec:trace` 는 인자 없이.
- 이스케이프(`\uXXXX`)는 도구 층이 글자로 바꿀 수 있으니 쓴 뒤 바이트로 확인한다(P4a fix 1 의 M-2 교훈).

## 먼저 읽을 것(순서)
1. `.claude/CLAUDE.md`. 2. plan-p04b 전부(목표 · 바뀌는 파일 · 배정 함수 · 규격 파일 정합 · 칸 검사 세 표 · 작업 순서 · 위험 · 증명 표). 3. plan-p04a 의 '규격 칸' · '상수(structure.ts)' · '글 도구(text.ts)' · '글 조각 목록' 절과 '컨트롤러 결정' 문단(15:5x 승인 · 18:5x 해석 수용 · 19:1x 검토 뒤 결정). 4. 워크트리의 fix 1 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04a-fix1-report.md` '이름 변화' 절(`BAND_INFOS` · 역할 `gloss` · 단어 상자 `option` · 끝맺음 조건 `ko` · `tokenize` 동작)과 메인 저장소의 `review-p04a-2.md`(M-8 · M-9). 5. 정본 `specs/02-1-영역-단원-승급.md` 3.2(배정 · 관계 표 · 단원 틀 표) · `specs/02-2-세션과-단계표.md` 3.3 · 3.4 · 3.6 · `specs/06-시드-생성.md` 6.3 · 6.4 검사 표 · `specs/09-설정값.md` 12절 unit.* · seed.* 키 · `specs/11-요구사항과-수용-기준.md` AC-3a · 3b · 5b · 5g · 5h · 7c · `specs/10-결정-기록.md` C54 · C58.

## 허용 파일
- plan-p04b '바뀐는 파일' 표의 아홉: 새 파일 `src/core/vocab/allocate.ts` · `src/core/seed/reference-index.ts` · `src/core/seed/check-lesson.ts` · `tests/unit/{vocab-allocate,seed-validator-reading,seed-validator-image,seed-validator-speaking,seed-validator-writing}.test.ts`, 수정 `tests/fixtures/seed/builders.ts`(견본 내용만, 함수 이름 · 돌려주는 모양은 그대로).
- 먼저 할 것 둘을 위한 `src/core/seed/text.ts` · `tests/unit/seed-text.test.ts`.
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04b-report.md`.
- 그 밖(P4a 의 다른 파일 · 공용 파일 · `scripts/` · `src/app` · `src/server`)은 손대지 않는다. P4a 규격 파일을 고쳐야 할 것 같으면 멈추고 NEEDS_CONTEXT(규격은 승인된 설계다). 새 패키지 없음.

## 지킬 것
- 시험을 먼저 쓰고 실패를 본 뒤 구현한다(plan 작업 순서 1~6). 시험 이름은 증명 표를 글자 그대로(AC-7c · AC-3a · AC-3b · AC-5b · AC-5g · AC-5h 접두 그대로, 접두 없는 것 그대로). 시험 이름의 숫자는 설명이고 값은 `defaultSettings()` · 단계 규격 견본에서 읽는다.
- 설계 숫자를 코드 · 시험에 박지 않는다. 설정 키는 12절 이름 그대로 `index` 의 설정값 읽기로.
- 부동소수 비교는 plan 의 `V − L ≥ V × 비율` 꼴과 `FLOAT_TOLERANCE`(P4a 상수).
- 영어 검사의 role 모음은 plan 칸 검사 표 그대로(`passage` · `script` · `prompt` · `option` · `answer` · `example` · `hint`). `gloss` · `ko` · `piece` · `scene` 은 영어 길이 · 범위 검사 밖이고, 금지어 검사는 모든 글 조각이다.
- 글로서리 검사는 기능어(vocab 품사 `function`)를 빼고, 범위 밖 비율은 기능어도 단계로 판정한다(C58, P4a `glossaryMissing` · `offbandRatio` 그대로 쓴다).
- 학습 요소 범위는 3.6 글자대로(C54 ㅅ: 수업은 앞 단계 전부 + 이번 단원, 평가 · 배치는 그 단계까지, 토리 이야기는 구간 첫 단계 앞까지). 규격 파일 정합은 모두 오류(ㄹ).
- 다지기 · 보강 수업의 `newWords` 는 빈 목록이어야 한다(`vocab-allocation` 검사, P4a 가 규격에서 막지 않은 규칙).
- `src/core` 는 db · next · react · fs · `src/server` 를 가져오지 않는다(`pnpm check:deps`). 순수 함수만.
- 견본(builders.ts)을 고치면 P4a 시험도 그대로 통과해야 한다(작업 7).
- 모호하면 지어내지 말고 보고 '요청하는 변경'에 적는다. 정본과 다르게 해야 하면 멈추고 NEEDS_CONTEXT.

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace`(인자 없이, missing-test 66 → 60) · `pnpm check:bundle`(build 뒤). 보고 `task-p04b-report.md`: 바뀐 파일:줄(P4a 파일 변경은 따로 절로 — text.ts · seed-text.test.ts · builders.ts), 설계와 다르게 한 것과 이유, 요청하는 변경, 시험 이름 전부, 명령과 출력(통과 수 · spec-trace 요약), c 가 쓸 내보내기(`index` 꼴 · 검사 결과 꼴 · `checkLessonCommon`), 남은 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝낼 때 Stop 관문이 `biome ci` 와 단위 시험을 돈다. 실패하면 시험을 지우지 말고 고친다.
