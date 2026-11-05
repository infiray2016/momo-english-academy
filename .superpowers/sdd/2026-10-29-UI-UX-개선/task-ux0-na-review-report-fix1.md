# 재검토 보고: UI · UX 묶음 0-나 fix 1(검토자 · Opus · xhigh, 2026-10-30 01:1x, fix 라운드 1/3)

판정: **Approved** · ADDRESSED 2 · NOT ADDRESSED 0 · 새로 깨뜨린 것 없음. 범위는 M2 · M3 를 고친 줄뿐이다(M1 check:bundle · M4 plan 문장은 지시대로 이 라운드 밖). 시험은 다시 돌리지 않았다.

## 지적별
- **M2 ADDRESSED.** AppErrorPanel 이 useTransition 안에서 경계의 retry 를 부르고(app-trouble.tsx:124-135), 다시 읽는 동안 '다시 해 볼래요'를 disabled 로 흐리며 data-trouble-retrying 을 단다(:78-79). 진행 중 다시 누름도 막는다(:130). 훅 없는 AppErrorBoard(:106-118)로 떼어 흐린 그림 · 처음 그림을 단위로 단언한다(app-trouble.test.ts:96-121). 오류 경계 둘은 여전히 retry 를 그대로 넘기고, 새 문구는 없다.
- **M3 ADDRESSED.** 갈 곳을 core/session/destination.ts 의 순수 함수 둘(sessionDestinationOf :24-32 · resultDestinationOf :35-39)이 고르고, 쪽 둘은 그 결과로 notFound · redirect 만 한다(session page.tsx:31 · :44 · :50-53, result page.tsx:19-25). 시험 다섯(session-destination.test.ts)이 없음 · 끝남 · 네 영역 닫힘 · 끝난 회화 · 결과 주소 갈래와 '어느 갈래도 / 아님'을 단언한다. 갈래 결과는 fix 전과 같다. 닫힌 회화도 같은 함수를 지나지만 결과는 그대로 /talk/lessons 이고, 회화 completed 거르기(:29)는 readSessionPlace 가 이미 회화를 completed 거짓으로 주므로(server/session/index.ts:1452) 겹쳐 지키는 줄일 뿐이다. 새 파일은 core 의 형만 읽어 의존 규칙에 맞다.

## 구현자 우려(흐림이 다시 그리기 끝까지 이어지는가)
- **타당하고, 0-마 e2e 에서 재는 것이 맞다.** Next retry 는 안에서 React.startTransition 으로 refresh · reset 을 부르고(next 16.4.2 error-boundary.js retry), 우리 useTransition 은 같은 누름에서 그 바깥 전환을 연다. React 문서는 진행 중인 전환 여럿을 지금은 함께 묶는다고 적으므로(startTransition 주의 사항), isPending 은 refresh 자료가 오고 reset 이 함께 커밋될 때까지 참으로 남는 것이 지금 동작이다. 다시 그리기가 또 실패하면 경계가 오류 조각을 새로 그려 흐림이 풀린다.
- 이 기댐이 틀려도 결과는 '단추가 조금 일찍 다시 켜짐'뿐이고 다시 누르면 다시 읽기를 한 번 더 할 뿐이라 위험이 낮다. 0-마 required-recovery.spec 의 N-15 갈래에 'data-trouble-retrying 이 판이 바뀌기 전까지 남는다' 단언을 넣도록 0-마 브리프에 적길 권한다.

## 판정
**Approved**(fix 라운드 1 에서 닫힘). 남은 일은 0-마 브리프 한 줄(위)과 앞 보고의 M1 · M4(다른 묶음 · 문서 몫)다.
