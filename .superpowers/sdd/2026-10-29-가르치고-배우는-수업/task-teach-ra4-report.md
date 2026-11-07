# 구현 보고: 가르치고 배우는 수업 묶음 라-4, 결과 첫머리 되짚기 · 오늘 만난 말 · 칩 단 문장 틀(2026-10-30 03:3x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d이고 커밋은 하지 않았다. 손대지 않는 파일 목록(사 recap.ts · 라-1 teach 기존 조각 · 라-2 · 바 · 5-나 · 회화 틀 · 시드 · specs · globals.css)은 읽기만 했다.

## 바뀐 파일
- `src/server/session/result.ts`
  - 머리 주석 :7 · :12~15
  - `ResultView.speech`(:79): 결과마다 싣는 음성 설정이다.
  - `ResultView.recapView?`(:93)
  - 형 `TeachRecap`(:97) · `RecapView`(:105)
  - 순수 함수 `recapViewOf`(:120): 다시 하기 · recap 없음 · teach 없음이면 undefined다. line 이 closeKo 면 closeKo, 아니면 closeKoPracticed 글을 고른다.
  - `recapOf`(:191): 고른 줄과 함께 teach.recap 을 돌려준다.
  - `resultSpeechOf`(:242): SPEECH_SETTING_KEYS 와 speechSettingsFrom 을 세션 틀과 같은 읽기로 쓴다.
  - `loadResultView`(:320~335): 다시 하기가 아니면 recapView 를 싣는다. 선생님은 `readHouseholdTeacher({ db })` 를 다시 쓴다. 사의 `recap` 칸은 그대로다.
- 신규 `src/components/session/teach/recap.tsx`(120줄)
  - `RecapData`(:27)
  - `recapPartsOf`(:35): 읽는 차례는 마무리 teacher_ko → 단원 단어 teacher_en → 문장 틀 teacher_en 이다.
  - `useRecap`(:48): 라-1 useTeachLine 위에 얹었고 onLineEnd 를 넘기지 않는다(무음 모드 줄 셈 없음). listen 은 잠금을 푼 뒤 voicedSpeech 로 읽는다.
  - `RecapHead`(:76): 라-1 TeacherLine 을 그대로 쓴다.
  - `RecapFrame`(:93): ChipSentence 와 SmallButton '다시 듣기'(TEACH_TEXT.listenAgain)다. 읽는 동안 흐리다.
- `src/components/session/reward.tsx`
  - REWARD_TEXT(:20~27): `metWords` 를 '오늘 만난 말'로 바꿨다. `metWordsTalk` '오늘 만난 단어'와 `listenWord` '단어 듣기'를 더했다.
  - `MetWordCards`(:76): `label` · `onListen` · `listenOff` · `children` prop 을 더했다. 소리 단추는 :113~133 이다. 단어가 없어도 children 이 있으면 그린다.
  - RewardStar 는 바꾸지 않았다.
- `src/app/(child)/result/[id]/result-view.tsx`
  - 머리 주석 :18~23
  - 음성 접점(:176~186): 렌더 뒤 createBrowserSpeech 와 pacedSpeech(speech.rate.<구간>)로 만든다.
  - `useRecap`(:188)
  - 본 열 맨 위 `RecapHead`(:241~248)
  - MetWordCards 에 소리 단추와 RecapFrame children 을 붙였다(:255~270).
  - 판 꼴(두 열 · flex-row-reverse · 별 열 · 단추 줄)은 그대로다.
- 시험
  - 신규 `tests/unit/result-recap.test.ts`(9)
  - 신규 `tests/unit/teach-recap-piece.test.ts`(11)
  - 신규 e2e(정적) `tests/e2e/teach-result.spec.ts`(4)
  - 수정 `tests/unit/ux-progress.test.ts`: RESULT_SPEECH(:310) · :322, 시험 이름 :340
  - 수정 `tests/unit/ux-screen-feedback.test.ts`: RESULT_SPEECH(:197) · :209, 시험 이름 :239, '오늘 만난 말' 단언 :260~262, 주석 :267

## 설계와 다르게 한 것
1. **음성 설정 칸.** 음성 설정을 recapView 안이 아니라 ResultView 맨 위 `speech` 에 실었다. 정본 03:26 은 오늘 만난 말의 소리 단추를 teach 없는 수업 결과에도 두라고 한다. 그 단추에 음성 접점이 있어야 해서다. teach 없는 결과의 낱말 소리는 기본 목소리(선생님 null)로 읽는다.
2. **화면 차례.** 화면 차례는 브리프대로 '되짚기 첫머리 → 제목 → 오늘 만난 말 → 단추'다. 문장 틀(RecapFrame)은 정본 03:26 이 오늘 만난 말 칸 안에 두라고 하므로, 첫머리 조각이 아니라 MetWordCards 의 children 으로 같은 칸 아래에 붙였다. 그래서 recap.tsx 는 조각 하나가 아니라 셋(useRecap · RecapHead · RecapFrame)이다. 보이는 차례와 들리는 차례(마무리 → 단어 → 틀)가 같다.
3. **쓰기 결과의 빠르기.** 쓰기 결과도 선생님 영어를 speech.rate.<구간>으로 읽는다. 가르치고 spec 설계 4 목소리 표를 따른 것이다. 세션 틀은 쓰기를 감싸지 않는다.
4. **소리 단추 이름.** 낱말 소리 단추의 이름(aria-label)은 회화 마무리의 '단어 듣기'(CLOSING_TEXT.listenWord)를 그대로 다시 썼다. 가르치고 spec 문구 표에는 이 글이 없다. 새 글을 만들지 않으려고 앱에 이미 있는 같은 기능의 글을 골랐다. 화면 검토에서 볼 것이다.
5. **단어 카드의 안쪽 배치.** 소리 단추를 넣으려고 단어 카드의 안쪽 배치를 '세로 한 열'에서 '글 열 + 오른쪽 단추'로 바꿨다. 카드 꼴(노랑 둥근 종이 · 종이 테 · 기울기 · 글자 크기)은 그대로다. 흐린 단추는 board 의 흐림 토큰(ink-off-edge · ink-off)을 쓴다.
6. **읽는 동안의 단추.** 되짚기를 읽는 동안 소리 단추와 '다시 듣기'는 흐리다. '다음 수업'은 읽기와 상관없이 늘 누를 수 있다. 정본 4절의 '단추가 읽기 뒤 밝아짐'은 오늘 배울 것 · 보여 주기 · '왜'에만 해당하기 때문이다.
7. **e2e 파일.** e2e 는 브리프가 든 reading · writing · speaking.spec.ts 가 아니라 새 파일 teach-result.spec.ts 에 썼다. teach.spec.ts 는 아직 없고, 라-2 가 만들 파일과 겹치지 않게 하려는 것이다.

## 시험(모두 정본 15절 AC 이름으로 시작)
- **result-recap**
  - 'AC-6g 결과 화면 자료는 서버가 고른 줄(recap.line)의 시드 글을 싣는다 …': 세 영역 시드로 확인한다.
  - 'AC-6f 되짚기 자료의 문장 틀 · 칩은 시드 teach.recap 그대로 …'
  - 'AC-6f 다시 하기 결과 · 줄을 고르지 않은 결과 … 되짚기 자료가 없다'
  - 'AC-6f 본 열 맨 위에 초상 · 마무리 한 줄 … 단추 줄 차례다'
  - 'AC-6f 되짚기는 본 열 안이고 별 자리는 그 앞 … 판 꼴 그대로다'
  - 'AC-6f 첫 그림(읽기 전)에는 소리 단추 · '다시 듣기'가 흐리고 …'
  - 'AC-6f 되짚기 없는 결과(teach 없는 수업)는 … 소리 단추가 있으며 바로 누를 수 있다'
  - 'AC-6f 다시 하기 · 쓰기 초고 결과에는 되짚기도 오늘 만난 말도 없다 …'
  - 'AC-6f 아이 화면에 점수 · 퍼센트 · 근거 수가 없다 …'
- **teach-recap-piece**
  - 읽는 차례: 세 영역에서 ko-KR → 선생님 높이 순서를 확인한다.
  - 고르기 전 기본 목소리
  - 들려주지 못함: 멈춤 · 밝음 · '소리가 안 나와서 글로 봐요.'를 확인한다.
  - skipped 이어 읽기
  - 자료 없음이면 바로 밝음
  - 첫머리 그림(초상 · 이름표 · 시드 글)
  - 문장 틀: 칩 수 · 칩 이름 · '다시 듣기' 흐림 · 밝음을 확인한다.
  - 소리 단추(있음 · 없음 · 카드 꼴 · 흐림)
  - children 만 있는 칸
  - 칸 이름 둘 · 단추 이름: TEACH_TEXT.recapWords · CLOSING_TEXT 와 같음을 확인한다.
  - 3D 없음 · 줄 고르기 다시 셈 없음
- **teach-result.spec(정적)**
  - 'AC-6f <영역> 결과 첫머리 …' 세 영역: 초상 · 이름표 '미나 선생님' · closeKoPracticed 를 본다. 세로에서 첫머리가 제목 위인지 본다. '오늘 만난 말' 단어 차례 · '단어 듣기' 수, 칩 수 · '다시 듣기', 들린 차례 마무리 → 단어 → 틀, 다시 듣기 · 낱말 다시 읽기, '홈'도 본다.
  - 'AC-6f 다시 하기 결과는 '다시 했어요'이고 …'
- **AC-6h.** 검증기 몫이라 이 묶음의 파일 밖이다. 이미 `tests/unit/seed-validator-teach.test.ts` 가 델타 번호 'AC-7c' 이름으로 덮는다. spec:trace 는 AC-6h 를 missing-test 로 세지 않았다(아래 관문).

## 관문(p13d, Node 24, 03:3x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 종료 1(오류 6). 모두 라-2 가 작업 중인 `src/components/answer/tiles.tsx:297` · `src/server/session/index.ts:14` · `tests/unit/teach-frame.test.ts:6` 이다. 이 묶음 파일 아홉은 `pnpm biome ci` 가 깨끗하다 |
| pnpm exec tsc --noEmit | 종료 0 |
| 새 시험 둘 | 20 통과 |
| pnpm test(전체 단위) | 121 파일 · 1426 통과 · 6 todo |
| pnpm check:deps | 위반 0(271 모듈) |
| pnpm check:ids(보고 모드) | 종료 0. 규칙 위반 0, design-number 47(기준 49, 이 묶음 파일 0건), design-color 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0. unknown-ac 0, missing-test 16(P12, 전과 같음) |

## 요청하는 변경
- **통합 시험 단언.** 공용 파일 변경은 요청하지 않는다. 다만 사 fix 1 의 `tests/integration/session-flow.test.ts:789`('AC-3e 가르치는 수업 짝')에 `result.recapView` 단언을 더하면 recapOf → teach.recap · readHouseholdTeacher · resultSpeechOf 서버 길을 통합으로 덮을 수 있다. 기대는 lineKo = teach.recap.closeKo, frameEn, teacher null 이다. 이 파일은 브리프 허용 밖이라 두었다. 컨트롤러가 정해 주면 붙인다.

## 남은 우려
1. **서버 길 확인.** recapView 를 싣는 서버 길(SQL · 선생님 읽기 · 음성 설정 읽기)과 e2e 는 이 기기에서 돌려 보지 못했다. 11-01 뒤 CI 에서 확인해야 한다. e2e 는 혼자 문항 시도 없이 넣으므로 closeKoPracticed 만 본다. closeKo 갈래는 단위 시험이 덮는다.
2. **잠금 풀기.** 결과 화면은 들어오자마자 읽는다. iPad 에서 잠금 풀기가 세션의 마지막 누름에서 이어지는지는 정한 것 11 과 같은 추측이다. 안 이어져도 감시가 단추를 밝힌다. 음성 점검에서 확인해야 한다.
3. **결과 화면 그림 층.** TeacherLine 이 teacher-window(그림 층 모듈)를 가져오는 라-1 우려 5 가 결과 화면 묶음에도 닿는다. avatar-3d 는 동적 import 라 첫 JS 밖이다. 빌드로 첫 JS 3D 0 을 확인해야 한다.
4. **같은 시험 파일의 다른 손.** 작업 중에 `tests/unit/ux-progress.test.ts` 의 줄 번호가 백 줄쯤 늘었다. 다른 손(라-2 로 보임)이 같은 파일을 고치고 있다. 내 변경은 결과 자료 견본 두 줄과 시험 이름 하나뿐이다.
5. **선생님 시점.** 되짚기 선생님은 결과를 여는 때 집이 고른 선생님이다. 세션 처음 스냅숏의 선생님이 아니다. 1-가에는 바꾸는 길이 없어 지금은 같지만, 1-나에서 바꾸기가 생기면 다시 봐야 한다.
