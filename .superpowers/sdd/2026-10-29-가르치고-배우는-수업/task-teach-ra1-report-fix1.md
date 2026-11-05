# 구현 보고 fix 1: 가르치고 배우는 수업 묶음 라-1 자리 조각(2026-10-30 03:1x, 구현자 Opus · high)
상태: DONE. 워크트리 p13d이고 커밋은 하지 않았다. 고친 곳은 `src/components/session/teach/*` 와 `tests/unit/teach-pieces.test.ts` 뿐이며, 세션 틀 · 활동 조각 · 선생님 창 · 음성 층은 손대지 않았다.

## 지적별
| 지적 | 판정 | 고친 곳 |
|---|---|---|
| I1 무음 모드 줄 셈 콜백 | ADDRESSED | 읽기 차례를 React 밖 함수 `readTeachLine`(teacher-line.tsx:189)으로 꺼내 `TeachLineEnd`(:182)를 돌리게 했다. useTeachLine 은 이 함수를 부른다(:267). 여섯 조각에 `onLineEnd?: (end: TeachLineEnd) => void` 를 내고 `onEnd` 에 이었다: today.tsx:78·86, show.tsx:173·181(새 단어) · 327·337(본보기), together.tsx:170·179(옛 `() => void` 를 바꿈), why-bubble.tsx:70·78, spare-intro.tsx:40·48 |
| M1 같이 해 보기 글 목소리 | ADDRESSED | together.tsx:59 textEn 을 teacher_en 으로 바꿨다(이야기 storyEn 은 material 그대로). 머리 주석의 읽는 차례도 고쳤다 |
| M3 칩 문장의 lang | ADDRESSED | chips.tsx ChipSentence `<p>` 에서 lang="en" 을 빼고 영어 덩어리 span(:70 · :164)에만 en 을 달았다. 칩 이름표 span(:82)에는 lang="ko" 를 달았다 |
| M4 열 넘는 새 단어 수 | ADDRESSED | teacher-line.tsx:66 `koreanCountOf`: 1~99 를 우리말 수(열하나 · 스물 · 스물셋 …)로 읽는다. 조사는 끝 글자 받침으로 고른다. 100 이상은 숫자 글이다(닿지 않는 값) |
| M2 움직임 시범 | 이번에 안 고침 | 컨트롤러 지시대로 화면 검토 판정 항목으로 장부에 둔다 |

## 더한 · 고친 시험(teach-pieces, 모두 AC 이름으로 시작)
- 'AC-N20 오늘 배울 것이 들려주지 못함(not_played)이면 onLineEnd 가 notice true 로 한 번 불리고 영어 토막은 읽지 않는다'
- 'AC-N20 오늘 배울 것을 다 읽으면(played) onLineEnd 가 notice false 로 한 번 불리고, 한국어 줄 → 영어 토막 차례다': 영어 토막에 lang 이 없고 선생님 높이가 실리는지도 본다.
- 'AC-N20 '왜'가 들려주지 못함이면 notice true, 다 읽으면 notice false, 읽지 않음(skipped)이면 notice false 로 한 번씩 불린다'
- 'AC-N20 화면이 바뀌면(alive 거짓) 알림 없이 그만둔다'
- 'AC-N20 선생님 줄을 읽는 조각 여섯(…)이 onLineEnd 를 읽기 끝에 잇는다': 소스에서 `onEnd: onLineEnd` 가 이은 수를 잰다.
- 'AC-3g 영어 덩어리만 lang en 이고 칩 이름표는 lang ko 다'(M3)
- 고친 시험 'AC-3g 새 단어 한 줄의 수는 …': 11 · 20 · 23 의 우리말 수를 더 본다(M4).
- 고친 시험 'AC-3g 읽기 같이 해 보기는 …': textEn 의 목소리를 teacher_en 으로 맞췄다(M1).
가짜 음성 접점(fakeSpeech)은 시험 파일 안에 두었다. 앱 코드는 시험용 가짜 음성을 가져오지 않는다.

## 관문(p13d, Node 24, 03:1x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 517 파일, No fixes applied(종료 0) |
| pnpm exec tsc --noEmit | 종료 0 |
| teach-line · teach-pieces 단위 시험 | 53 통과(전 47, 새 6) |
| pnpm test(전체) | 117 파일 · 1366 통과 · 6 todo |
| pnpm check:deps | 위반 0(268 모듈) |
| pnpm check:ids(보고 모드) | 규칙 위반 0, design-number 47(기준 49, 이 묶음 파일 0건), design-color 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |

## 남은 우려
1. 여섯 조각이 onLineEnd 를 잇는지는 소스 훑기로 본다. 효과를 서버 그림에서 돌릴 수 없어서다(이 저장소에는 DOM 그림 도구가 없음). 실제 불림은 라-2 의 e2e(AC-N20 Playwright 몫)가 덮는다.
