# 구현 보고 fix 1: 가르치고 배우는 수업 묶음 라-4(2026-10-30 04:0x, 구현자 Opus · high)
상태: DONE. 워크트리 p13d이고 커밋은 하지 않았다. M3(되짚기 선생님의 시점)은 지시대로 1-나 조건으로 장부에 둔다.

## 지적별
| 지적 | 판정 | 고친 곳 |
|---|---|---|
| I1 다시 하기 결과의 되짚기 첫머리 | ADDRESSED | 아래 '고친 곳' 첫째 묶음 |
| M1 쓰기 초고 시험 이름 | ADDRESSED | 아래 '고친 곳' 둘째 묶음 |
| M2 결과 서버 길 통합 단언 | ADDRESSED(정적) | 아래 '고친 곳' 셋째 묶음 |
| M4 낱말 소리 단추의 읽히는 이름 | ADDRESSED | 아래 '고친 곳' 넷째 묶음 |

## 고친 곳
**I1 — 다시 하기 결과에도 첫머리(초상 · 마무리 한 줄)를 둔다**
- `src/server/session/result.ts`
  - 머리 주석 :12~16
  - 새 형 `RecapFrameView`, `RecapView.frame: RecapFrameView | null`(:116)
  - `recapViewOf`(:130~146): 다시 하기도 lineKo · teacher 를 싣고 frame 만 null 이다.
  - `loadResultView`: 다시 하기를 빼던 조건을 지웠다.
- `src/components/session/teach/recap.tsx`
  - `RecapData.frame` 이 null 일 수 있다(:34).
  - `recapPartsOf` 는 frame 이 없으면 문장 틀을 읽지 않는다.
- `src/app/(child)/result/[id]/result-view.tsx`
  - 다시 하기면 단어를 비우고 frame null 을 넘긴다(:193~194). 그래서 마무리 한 줄만 읽는다.
  - RecapFrame 은 `recapView.frame` 이 있을 때만 그린다.
  - 머리 주석 :18~19 도 고쳤다.
- 오늘 만난 말 칸은 지금처럼 다시 하기에서 그리지 않는다(:254).

**M1 — 쓰기 초고 시험 이름**
- 정본 03:26 이 쓰기 6단계 이상 첫 세션에 대해 정한 것은 두 가지다. 하나는 '글을 보냈어요 …'이고, 다른 하나는 '되짚기는 둘째 세션 결과에만'이다. 오늘 만난 말을 이 결과에 둘지는 정본이 따로 말하지 않는다. 델타 설계 1 은 되짚기 자리 안에 둔다.
- 그래서 시험을 둘로 나눴다. 쓰기 초고 시험은 '되짚기 첫머리 · 문장 틀이 없다'로 이름과 단언을 맞췄고, 오늘 만난 말 있음 · 없음은 단언하지 않는다. 지금 동작은 5-가 그대로 '있음'이다. 장부 판단은 검토 지적대로 컨트롤러 몫으로 남긴다.

**M2 — 통합 단언(정적)**
- `tests/integration/session-flow.test.ts` 의 'AC-3e 가르치는 수업 짝' 첫 시험(:821~850)에 단언을 더했다.
  - `result.recapView` 를 toEqual 로 본다. 기대는 lineKo = teach.recap.closeKo, frame = { frameEn, chips(글 · role) }, teacher null 이다.
  - `result.speech` 를 toMatchObject 로 본다. skipNoticeMs 는 speech.skip_notice_seconds × 1000 이고 readKo 도 본다.
  - 다시 하기 갈래도 넣었다. 같은 세션을 kind retry 로 바꿔 다시 읽으면 recapView 가 { lineKo, frame null, teacher null } 이다.
- 초 → ms 상수 MS_PER_SECOND 는 :51 에 두었다. tsc 로 타입만 맞췄고, 실행은 11-01 뒤 CI 몫이다.

**M4 — 소리 단추의 접근 이름에 낱말을 잇는다**
- `src/components/session/reward.tsx`
  - `listenWordLabel(word)`(:33)는 '단어 듣기: <낱말>' 꼴을 만든다.
  - 세 영역 결과 단추(:126)가 이것을 쓴다.
- 회화 마무리 첫 장의 같은 단추(`src/components/conversation/closing-cards.tsx:29 · :182`)도 같은 함수를 쓴다.
- 보이는 글은 없고(소리 그림만), 새 문구도 없다. e2e 의 `getByRole({ name: '단어 듣기' })` 는 부분 일치라 그대로 맞는다. 회화 e2e 는 data-word-listen 으로 찾으므로 닿지 않는다.

## 시험(바뀐 것 · 새 것)
**result-recap**
- 새 시험 'AC-6f 다시 하기 결과의 되짚기 자료는 고른 마무리 줄 · 선생님만 있고 문장 틀이 없다(오늘 만난 말을 두지 않음 — 정본 03:26)'(:153). closeKo · closeKoPracticed 두 줄을 본다.
- 이름을 고친 시험 'AC-6f 줄을 고르지 않은 결과(teach 없는 수업 · 쓰기 6~12 첫 세션)에는 되짚기 자료가 없다'(:169).
- 새 시험 'AC-6f 다시 하기('다시 했어요') 결과도 첫머리에 초상 · 마무리 한 줄이 있고, 오늘 만난 말(단어 카드 · 문장 틀)은 없다'(:254).
- 새 시험 'AC-6f 쓰기 6단계 이상 첫 세션(초고) 결과는 '글을 보냈어요 …'이고 되짚기 첫머리 · 문장 틀이 없다(되짚기는 둘째 세션 결과에만 — 정본 03:26)'(:279). M1 몫이다.
- 다른 시험은 frame 꼴에 맞췄다.

**teach-recap-piece**
- 새 시험 'AC-6f 다시 하기 결과(오늘 만난 말 없음 — 단어 비움 · 문장 틀 null)는 마무리 한 줄만 읽는다'(:219).
- 소리 단추 시험은 접근 이름 '단어 듣기: eat' · '단어 듣기: drink' 를 본다. 이름도 '(접근 이름 '단어 듣기: 낱말')'로 고쳤다.
- recapPartsOf 입력은 frame 꼴에 맞췄다.

**e2e teach-result.spec.ts(정적)**
- :218 시험을 '… 첫머리에 초상 · 마무리 한 줄이 있으며(그 줄만 읽음), 오늘 만난 말이 없다'로 고쳤다.
- 본 것은 셋이다. 이름표와 closeKoPracticed 가 보이는지, 오늘 만난 말 · 문장 틀이 없는지, 읽은 글에 마무리 줄만 있고 단어 · 문장 틀이 없는지다.

**통합 session-flow** 단언은 위 M2 와 같다.

## 관문(p13d, Node 24, 04:0x)
| 관문 | 결과 |
|---|---|
| `pnpm biome ci`(라-4 파일 열하나 — closing-cards · session-flow 포함) | No fixes applied, 오류 0 |
| pnpm exec tsc --noEmit | 종료 0 |
| 관련 단위 다섯(result-recap · teach-recap-piece · ux-progress · ux-screen-feedback · talk-follow) | 69 통과 |
| pnpm test(전체 단위) | 123 파일 · 1451 통과 · 6 todo |
| pnpm check:deps | 위반 0(271 모듈) |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(전과 같음) |

## 남은 우려
1. **실행 확인.** 통합 · e2e 고침은 이 기기에서 돌리지 못했다. 11-01 뒤 CI 에서 확인한다.
2. **회화 마무리 단추.** 회화 마무리 첫 장의 단추 접근 이름도 바뀌었다(closing-cards 는 회화 틀 파일이다). 컨트롤러 지시('쓰면 함께')를 따른 것이다. 회화 단위 · e2e 는 단추를 표지(data-word-listen)로 찾아서 깨지지 않는다(talk-follow 통과).
3. **M1 장부.** 쓰기 6단계 이상 초고 결과에 오늘 만난 말을 둘지는 장부 판단으로 남는다. 지금 동작은 5-가 그대로 '있음'이다.
