# 보고: 묶음 0-나 fix 1(검토 M2 · M3, 구현자 · Opus · high, 2026-10-30)

상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋 안 함. M1(check:bundle)은 지시대로 손대지 않았다. 0-가 · 0-라 · 0-다 파일은 건드리지 않았다.

## 바뀐 파일
- `src/components/session/app-trouble.tsx`(10~12 · 78~79 · 106~139): M2. 훅 없는 `AppErrorBoard({ onRetry, retrying })` 를 떼고, `AppErrorPanel` 이 useTransition 안에서 retry 를 부른다. 다시 읽는 동안 '다시 해 볼래요'를 흐리게 두고(disabled) 표지 data-trouble-retrying 을 단다. 새 문구는 없다.
- `src/core/session/destination.ts`(신규, 39줄): M3. 순수 함수 `sessionDestinationOf(id, place)` 와 `resultDestinationOf(place)` 가 갈 곳을 돌려준다. 갈 곳은 없는 주소 판 또는 다른 주소이고, 홈('/')은 없다.
- `src/app/(child)/session/[id]/page.tsx`(5 · 12~15 · 31 · 44 · 50~53): 닫힌 회화와 세션 갈래 모두 그 함수의 결과로 notFound · redirect 만 한다(작은 도우미 `go`).
- `src/app/(child)/result/[id]/page.tsx`(4 · 7 · 20~24): 같은 방식.
- 계획과 다른 점: 닫힌 회화의 `/talk/lessons` 도 같은 함수를 지나게 했다(place 를 회화 · 끝나지 않음으로 넘김). 결과는 전과 같다.

## 시험
- `tests/unit/app-trouble.test.ts`: '누르면 받은 다시 그리기를 한 번 부른다'를 AppErrorBoard 로 옮겼다(흐리지 않음 · 표지 없음 확인 추가). 'R-52 앱 오류 판: 다시 읽는 동안 … 흐리고 … 표지가 붙으며 새 문구는 없다'를 새로 더했다(9건).
- `tests/unit/session-destination.test.ts`(신규, 5건, 'N-16 …' · 'R-52 어느 갈래도 홈('/')으로 보내지 않는다'): 없음 · 끝남 · 닫힘(네 영역) · 끝난 회화 · 결과 주소에서 못 여는 세션을 본다.

## 관문(p13d, Node 24)
lint 0(463 파일) · tsc 0 · test 103 파일 1135 통과 · 6 todo · check:deps 위반 0 · check:ids 규칙 0, design-number 49 · spec:trace 종료 0, unknown-ac 0

## 남은 우려(1)
1. 흐림이 다시 그리기 끝까지 이어지는지는 확인하지 못했다. 이것은 React 19 가 한 이벤트의 전환들을 같은 차선으로 묶는 동작에 기댄다. 즉 Next retry 안의 startTransition 과 우리 전환이 함께 끝나야 한다. 단위 시험은 흐린 그림과 처음 그림만 보므로, 실제 흐름은 0-마 e2e 가 data-trouble-retrying 으로 재야 한다.
