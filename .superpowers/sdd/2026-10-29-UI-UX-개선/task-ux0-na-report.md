# 보고: UI · UX plan 묶음 0-나 — 앱 오류 화면 · 없는 주소(구현자 · Opus · high, 2026-10-30 00:1x)

상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋하지 않음. 0-가 파일 · `src/core/seed/**` · `specs/` · 시드는 건드리지 않았다.

## 바뀐 파일(워크트리 기준)
- `src/components/session/app-trouble.tsx`(신규, 1~113): 문구 `APP_TROUBLE_TEXT`(설계 6 표 그대로, '다시 해 볼래요' · '홈'은 `MIC_BLOCKED_TEXT` 를 그대로 씀), 순수 함수 `troubleButtonsOf`(앱 오류 = `stuckButtonsOf("blocked")` 큰 다시 · 작은 홈, 없는 주소 = 큰 홈 하나), `AppErrorPanel`(data-app-error · data-app-retry) · `NotFoundPanel`(data-not-found). 판은 ChildScreen + 종이 PostIt 한 장에 h1 안내 → 큰 단추 → 작은 단추. 루트 경계가 (child) 틀 밖에서 그리므로 틀 · 선생님 공유 값에 기대지 않는다. "use client" 다(아래 까닭 1).
- `src/app/(child)/error.tsx` · `src/app/error.tsx`(신규): 둘 다 `<AppErrorPanel onRetry={retry} />`. 루트 쪽이 (child) 틀의 오류를 받는다(plan 위험 9).
- `src/app/(child)/not-found.tsx` · `src/app/not-found.tsx`(신규): `<NotFoundPanel />`.
- `src/app/(child)/session/[id]/page.tsx`(수정, 머리 주석 3~5 · import 8 · 41~42): 그 프로필에서 찾지 못한 세션은 `notFound()`(전에는 '/'), 끝난 세션은 결과, 닫힌 세션은 그 영역 수업 목록(그대로).
- `src/app/(child)/result/[id]/page.tsx`(수정, 주석 2~4 · import 5 · 9 · 18~22): 결과를 못 여는 경우 `readSessionPlace` 로 갈라, 못 찾으면 `notFound()`, 찾았으면(진행 · 닫힘 · 회화) 그 영역 수업 목록. **계획과 다름 2.**

## 설계와 다르게 한 것과 까닭
1. **'다시 해 볼래요'는 Next 의 `retry` prop 을 넘긴다**(손으로 router.refresh + reset 을 부르지 않음). 설치판 Next 16.4.2 문서(`error.md`: v16.3 에서 retry 안정)와 소스(`client/components/error-boundary.js` 43~46줄: `startTransition(() => { context.refresh(); reset(); })`)를 확인했다. plan 위험 9 가 정한 동작과 같고, 옛 판 꼴을 쓰지 않는다(묶음 위험 19). 단위 시험이 reset 이 아니라 retry 를 넘기는지 본다.
2. **결과 주소의 '찾았지만 못 여는 세션'은 홈 대신 그 영역 수업 목록으로** 보낸다. 브리프 '닫힌 세션 · 남의 세션은 지금처럼 그 영역 수업 목록으로'를 결과 쪽에도 같은 갈래로 맞췄다(지금 결과 쪽은 모두 '/' 였다 — AC-U7 의 '/' 0회와 맞춤).
3. **'남의 세션'(다른 프로필 · 다른 가족의 세션)은 없는 주소 판**이다. `readSessionPlace` 가 프로필로 걸러 지금도 목록이 아니라 '/'로 갔고(목록으로 보낸 적 없음), 영역을 알려면 다른 가족의 세션 행을 읽어야 해 그러지 않았다. spec N-16 '열 수 없는 세션'과 맞다. 브리프 문장과 글자가 달라 적는다.
- app-trouble.tsx 를 "use client" 로 둔 까닭: 서버 조각(not-found)이 클라이언트 모듈(mic-blocked.tsx)의 함수 · 상수를 바로 부르면 클라이언트 참조가 되어 서버에서 못 쓴다. 판 전체를 클라이언트 조각으로 두면 0-가 의 단추 차례 · 문구를 고치지 않고 그대로 쓴다.

## 시험
- 단위 `tests/unit/app-trouble.test.ts`(신규, 7건): 'R-52 문구 …' · 'R-52 단추 차례 …' · 'R-52 앱 오류 판: 안내 줄 뒤 큰 …' · 'R-52 앱 오류 판: '다시 해 볼래요'를 누르면 …' · 'R-52 없는 주소 판 …' · 'R-52 오류 경계: (child) · 루트 둘 다 … retry 를 넘긴다' · 'R-52 없는 주소: (child) · 루트 not-found …'. p13d 사본에 AC-23g 가 없어 이름을 AC 로 시작하지 않았다(unknown-ac 방지).
- e2e `tests/e2e/app-trouble.spec.ts`(신규, 3건, 정적 · 돌리지 않음): 모르는 주소 · 모르는 영역 → 없는 주소 판과 큰 '홈' 하나, '홈' 누르면 홈 / 없는 id · 꼴 틀린 id 의 세션 · 결과 주소 → 주소 그대로 없는 주소 판 / 진행 중 세션의 결과 주소 → 읽기 수업 목록.
- 앱 오류 e2e(N-15, plan 정한 것 6)는 필수 경로 나 와 겹쳐 **0-마(required-recovery.spec.ts) 몫으로 두었다.** 기존 e2e 에 모르는 세션 → 홈 단언이 없어(grep) 고친 기존 시험은 없다.

## 관문(p13d, Node 24)
| 명령 | 결과 |
|---|---|
| `pnpm lint` | 460 파일, 고칠 것 없음 |
| `pnpm exec tsc --noEmit` | 종료 0 |
| `pnpm test` | 102 파일 · 1100 통과 · 6 todo(전 1093 → +7) |
| `pnpm check:deps` | 위반 없음(237 모듈) |
| `pnpm check:ids` | 규칙 모두 0, design-number 49(기준 49, 늘지 않음) |
| `pnpm spec:trace --fail-on unknown-ac` | 종료 0, unknown-ac 0(missing-test 16 은 보고만, 전부터 있던 P12 등) |

## 남은 우려(4)
1. e2e 3건은 정적이다(plan 위험 7). notFound 의 응답 코드가 스트리밍 시작 뒤면 200 일 수 있어 코드는 단언하지 않았다.
2. 루트 오류 경계는 부모용 (setup) 화면(접근 코드 · 첫 실행)과 /dev 쪽 오류도 같은 아이 판으로 받는다. 루트 틀(layout.tsx, 글꼴) 자체의 오류는 global-error 가 없어 기본 화면이다(범위 밖).
3. 결과 · 세션 주소의 '남의 세션'이 목록이 아니라 없는 주소 판이 된 점(위 3)은 브리프 문장과 다르므로 검토자 판단이 필요하다.
4. 없는 주소 판 클라이언트 묶음에 mic-blocked.tsx 의존(mic-state · device 판정)이 함께 실린다(작음, check:bundle 은 돌리지 않음).
