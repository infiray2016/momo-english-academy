Approved(C 0 · I 0 · M 2)

# 재검토: P4a fix 1(code-reviewer rev-p04a · Opus · xhigh, 범위 한정, 2026-10-16)

대상은 같은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3` 다. 코드 파일:줄은 이 워크트리 기준이고, 정본 · plan 줄은 메인 저장소 기준이다. fix 1 보고의 '바뀐 파일:줄' 표에 적힌 줄을 모두 읽었다. 고친 함수는 tsx 로 직접 불러 경계 사례를 재현했다. `git status --short --untracked-files=all` 은 허용 파일 열과 보고 둘뿐이고 추적 파일 변화는 0 이다. 시험 전체는 다시 돌리지 않았다(컨트롤러 19:2x: lint 0 · test 74 · deps 0 · build · bundle 0 · missing-test 66).

## 표 1. 지적별 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| I-1 줄임말 · 서수 토큰 | ADDRESSED | text.ts:92~116 이 `SENTENCE_END_ABBREVIATIONS` 로 줄임말 갈래(점 포함, 대소문자 무시, 긴 것 먼저, 뒤에 영문자면 아님)를 만들고 수 갈래에 서수 꼬리를 더했다. RegExp 생성자에 앞보기만 써 ES2018 문법이 없다(plan-p04a:264). 재현: `7 a.m.` 은 6낱말, `MR.` · `P.M.` 은 한 토큰, 글로서리에 `Mr.` · `a.m.` 을 적으면 빠짐 0. 시험 seed-text.test.ts:130~145 · 277~295. 경계 두 곳은 새 지적 M-8 · M-9 |
| I-2 단어 상자 role | ADDRESSED | lesson.ts:457 이 `option` 이다. 글 조각 시험의 ROLE_OF(seed-schema.test.ts:723)가 확인한다 |
| I-3 금지어 합성어 · 소유격 · 축약형 | ADDRESSED | text.ts:520~550 `stemPieces` 와 토큰 · 조각 두 열 비교. 재현: `Stupid-head's toy.` · `stupid'll` · `Shut-up now.` 가 걸리고 `stupidly` 는 걸리지 않는다. 시험 seed-text.test.ts:357~370 |
| M-1 글로서리 금지어 검사 | ADDRESSED | structure.ts:318~319 `gloss` 역할, lesson.ts:427~428 이 표기형 · 원형을 `gloss` 로 낸다. plan-p04a:261 의 gloss 줄(19:1x)과 맞다. plan-p04b:69 의 영어 검사 role 모음에 gloss 가 없어 길이 · 범위 검사 밖이고, plan-p04b:70 '모든 글 조각' 금지어 검사 안이다 |
| M-2 이스케이프 | ADDRESSED | 바이트로 확인했다. text.ts:11 `[ᄀ-ᇿ㄰-㆏가-힣]`, :13 `[‘’]`, :28 `”’»`, :29 `“‘«` 가 모두 ASCII 이스케이프다 |
| M-3 글 조각 시험 | ADDRESSED | seed-schema.test.ts:696~720 이 빼는 칸을 `^…$` 경로 정규식 21개로 적는다. 이제 같은 이름의 칸이 다른 자리에 생기면 시험이 걸린다. 빼는 칸을 늘리려면 경로를 글자로 적어야 하므로 diff 에서 보인다. 시험 안 견본(쓰기 2단계 셋, 단계 평가 읽기 그림 · 쓰기 넷 · 말하기 넷, 배치 읽기 둘 · 쓰기 셋)은 `expectValid` · `.parse` 로 규격을 먼저 통과한다(:810 · :917 · :997). 첫 검토에서 빠졌던 갈래가 이제 모두 견본에 있다. ROLE_OF 셋이 실제로 확인됐는지 센다(:1005) |
| M-5 BANDS 이름 | ADDRESSED | structure.ts:33 `BAND_INFOS`. 쓰는 곳 다섯(:51 · :67 · :73 · :456 · :599)과 시험(seed-schema.test.ts:51 · 265~268)만 바뀌었다. `BAND_NAMES` · `Band` · `bandOf` 는 그대로라 합칠 때 가져오기 두 줄로 끝난다 |
| M-6 견본 단가 | ADDRESSED | builders.ts:1011~1050 의 Sonnet · Haiku 입력 · 출력 · 캐시와 Opus 입력 · 출력이 05-AI-호출.md:72 · 96 과 같다. Opus 캐시 쓰기 5 · 읽기 0.2 는 정본에 없어 Sonnet 비율로 셈한 견본 값이고, 그 사실이 주석(:1011)에 있다. 아래 '판정 (라)' 참조 |
| M-7 공백만 있는 글 | ADDRESSED | reference.ts:33 이 `z.string().regex(/\S/)` 다. 변환이 없고 빈 글도 막는다. `fill-letters` 의 `Text.regex(/_/)` 는 두 검사가 함께 걸린다 |
| 끝맺음 조건 역할 | ADDRESSED | talk.ts:202 가 `ko` 이고 견본 builders.ts:1918 이 한국어다. plan-p04a:260 의 ko 줄(19:1x)과 :249 prompt 줄에서 끝맺음 조건이 빠진 것과 맞다. ROLE_OF(:725)가 확인한다 |
| M-4 기능어 문구 | 닫힘 | 04-데이터.md:26 이 '기능어는 글로서리에서 빼는 표시이고 범위 밖 비율은 기능어도 단계로 판정한다'로 바뀌었다(C58, 10-결정-기록.md:208). `offbandWords` 는 기능어 표시를 보지 않고 단계로만 판정하며(text.ts 의 offbandWords, 바뀌지 않음), `glossaryMissing` 은 기능어를 뺀다. 둘 다 새 문구와 맞다 |

## 새 지적

### M-8 Minor — 문장 자르기와 줄임말 토큰의 왼쪽 경계가 달라, 줄임말 앞에 붙은 글자가 있으면 문장을 잘못 자른다

- 어디: text.ts:35~45(`endsWithAbbreviation` 은 공백 · 여는 따옴표까지만 거슬러 본다) 대 text.ts:92~116(새 줄임말 갈래는 영문자가 아닌 어떤 글자 뒤에서도 줄임말로 잡는다).
- 재현: 토큰은 셋 모두 `a.m.` · `Mr.` 를 한 낱말로 본다. 그런데 `splitSentences` 는 줄임말 뒤에서 문장을 자른다.
  - `We eat at 7a.m. every day.` → `["We eat at 7a.m.", "every day."]`
  - `Tori—Mr. Kim's dog—runs fast.` → `["Tori—Mr.", "Kim's dog—runs fast."]`
  - `Hi,Mr. Kim. Bye.` → `["Hi,Mr.", "Kim.", "Bye."]`
- 근거: 5절 04-데이터.md:62 'Mr. · Mrs. · Dr. · a.m. · p.m. 과 숫자 사이의 점은 문장 끝이 아니다'. 잘린 조각은 짧아져 문장 길이 검사가 느슨해진다. 이런 꼴은 드물어 막을 일은 아니다.
- 고치는 법: `endsWithAbbreviation` 이 영문자 · 점이 아닌 글자에서 거슬러 보기를 멈추게 해 토큰 갈래와 같은 경계를 쓴다. 위 세 사례를 '5절 문장 끝' 시험에 더한다.

### M-9 Minor — 서수 꼬리에 오른쪽 경계가 없어 숫자에 붙은 낱말을 잘못 자른다

- 어디: text.ts 의 TOKEN 수 갈래 `(\d+(?:[.,]\d+)*(?:st|nd|rd|th)?)`(:92~116 안).
- 재현:
  - `100steps` → `100st` · `eps`. 고치기 전에는 `100` · `steps` 였다. `eps` 는 범위 밖 · 글로서리 빠짐이 된다.
  - `3rdx` → `3rd` · `x`.
  - `2ND` → `2` · `ND`.
- 근거: 브리프 판정할 것 2 (가). 숫자에 낱말을 붙여 쓰는 것은 오타 꼴이라 영향은 작다.
- 고치는 법: 꼬리를 `(?:(?:st|nd|rd|th)(?![A-Za-z]))?` 로 둔다. 꼬리 전체에 부정 앞보기를 걸면 `7am` 의 `7` 이 사라지므로 이 꼴이어야 한다. 대문자 서수는 필요하면 꼬리를 대소문자 무시로 둔다.

## 판정할 것 2~4

- (가) 줄임말 갈래: 대소문자(`MR.` · `P.M.`)와 뒤 영문자(`a.mx` → `a` · `mx`, `a.m.x` → `a` · `m` · `x`, `Mrs.Kim` → `Mrs` · `Kim`)는 맞다. 문장 자르기와의 어긋남은 M-8, 서수는 M-9.
- (나) `stemPieces`: 거짓 양성 꼴은 '그 낱말이 글에 나옴'과 같다. 예를 들어 `can't` 는 금지어 `can` 에, `die-cast` 는 `die` 에 걸린다. 맨 낱말 `can` · `die` 도 원래 걸리므로 새 종류는 아니다. 불규칙 축약형만 펼쳐 `can't` 는 `not` 에 걸리고 `don't` 는 걸리지 않는다. 펼친 쪽은 not · am · will 같은 기능어라 금지어 목록에 오지 않으므로 실제 차이는 없다. 거짓 음성은 `can't-stop` 처럼 합성어 안의 불규칙 축약형이 펼쳐지지 않는 것뿐이고, 역시 금지어와 무관하다.
- (다) 경로 정규식은 실제로 좁아졌다(표 1 M-3).
- (라) Opus 캐시 단가: 규격이 네 칸을 모두 요구하므로 견본에는 값이 있어야 한다. 셈한 값임을 주석에 밝힌 지금 꼴이 맞다. P6(실제 model-prices.json)과 P9(비용 셈)에 '견본의 Opus 캐시 값을 옮기지 말고 출처 있는 값을 쓴다'를 메모로 넘길 것. 6.6 의 빈칸은 컨트롤러 기록 몫이다.
- (마) 이스케이프 바이트: 표 1 M-2 대로 맞다.
- 구현자가 '설계와 다르게 둔 것' 둘은 수용한다.
  - 줄임말 다섯만 받는 것: 5절(04-데이터.md:62)이 다섯을 정했고, 문장 자르기와 같은 상수를 쓰므로 늘리면 둘이 함께 바뀐다. `U.S.` · `e.g.` 를 쓰려면 13절 한 줄로 상수를 늘린다.
  - 불규칙 축약형만 펼치는 것: (나)의 까닭으로 수용한다.
- 증명 표 이름 22개는 글자 그대로이고 더한 셋도 그대로다. 새 시험 이름은 없고(사례만 더함) AC 접두도 없다. 허용 파일 밖 변화는 0 이다.
- P4b 가 알아야 할 이름 변화(BAND_INFOS · gloss · option · 끝맺음 조건 ko · Text · tokenize 동작)는 fix 1 보고 '이름 변화' 절에 다 있다.

## 범위 밖 관찰

- 줄임말이 이제 점까지 한 토큰이라, vocab · 글로서리 표기형 · 고유 명사에 `Mr` 처럼 점 없이 적으면 지문의 `Mr.` 과 맞지 않는다(재현: vocab `Mr` 은 `Mr.` 토큰을 못 찾음, vocab `a.m.` 은 찾음). P6 · P8 브리프에 '줄임말은 점까지 적는다'를 넘길 것.

## 판정

Approved(C 0 · I 0 · M 2). 열 항목은 모두 ADDRESSED 이고 M-4 는 닫혔다. 새 Minor 둘(M-8 · M-9)은 각각 한 줄 고침이라 컨트롤러가 직접 고치거나 P4b 시작 전 작은 고침으로 넣으면 된다. 막지 않는다.
