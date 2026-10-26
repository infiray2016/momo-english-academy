# 구현 보고: P13d 묶음 d8 — 3D 선생님 그림 층(impl-teacher-d8, 2026-10-23 14:4x)

상태: DONE_WITH_CONCERNS — 관문 다섯(린트 · 형 · 단위 · 의존 · 빌드)과 번들 대조는 통과. 새 e2e(AC-19i 기본 셋)는 이 Mac 에서 e2e 를 못 돌려 형 검사까지만 했고 CI 에서 처음 돈다. 3D 실제 그리기는 컨트롤러 로컬 눈 점검(차례 6)과 d9 몫.

자리: 워크트리 `.claude/worktrees/p13d`(바탕 1174e13). 커밋 · push 없음.

## 의존 판(plan 값 15 — 시제품과 같은 판, 정확한 판 고정)

| 꾸러미 | 판 | 자리 |
|---|---|---|
| three | 0.180.0 | dependencies |
| @pixiv/three-vrm | 3.5.5 | dependencies |
| @types/three | 0.180.0 | devDependencies |

`pnpm add` 로 넣어 `pnpm-lock.yaml` 갱신(+177줄). 설치 스크립트 없는 꾸러미라 `onlyBuiltDependencies` 그대로(설치 때 확인 — esbuild 무시 경고는 전부터 있던 것).

## 바뀐 파일

신규
- `src/core/teacher/layer.ts` — 그림 층 판정(순수): `layerStep` · `acceptsLoad` · `fallbackState` · `LAYER_FALLBACKS`(다섯) · 사건 이름 `TEACHER_EVENT`(momo:teacher) · 사건 꼴 · 3D 손잡이 꼴 `TeacherAvatarHandle`(three 형을 밖에 내지 않게 core 에 둠).
- `src/components/teacher/avatar-3d.ts` — 시제품 TeacherAvatar 를 TS 로. fetch(signal) → parseAsync, onFirstFrame · onFailure(맥락 잃음 · 그리기 오류), dispose 한 번 + momo:teacher dispose, ResizeObserver, sampleMotion · blinkAt(core), 1초마다 `data-teacher-frames`, 쪽 숨김이면 안 그림. 상수는 시제품 값에 이름(PIXEL_RATIO_MAX 1.75 · BLEND_RATE 7 · 깜빡임 3~6초 …).
- `src/components/teacher/teacher-layer.tsx` — 보관 조각 `TeacherLayerHost` · 공유 값 `useTeacherLayer()` · `TeacherLayerContext`, 불러오기 차례 몸 `startTeacherLayer`(바깥 의존을 넣어 단위 시험). 차례: 설정 → WebGL 2 검사 → load-start → `import("@/components/teacher/avatar-3d")` → 그림 층 → 모델 → 첫 장, 시간 넘김은 AbortController 로 멈춤.
- `tests/unit/teacher-layer.test.ts` — 17개.

수정
- `src/components/teacher/teacher-window.tsx` — `started` 속성, 3D 칸(`data-teacher-slot`, 늘 두고 3D · 시작 뒤에만 보임), `data-teacher-render` 3d/portrait, `data-teacher-fallback`, 3D 때 초상 · 상태 표시 숨김.
- `src/components/conversation/talk-frame.tsx` — 그림 층에 상태 · 움직임 줄이기 넘김, stage closing 이면 `layer.close()`, 창에 `started`.
- `src/app/(child)/session/[id]/page.tsx` — 회화만 `<TeacherLayerHost key={id} …><TalkFrame key={talk.version} …/></TeacherLayerHost>`.
- `src/proxy.ts` — matcher 거르기 제외에 `teachers/`(+주석).
- `next.config.ts` — `headers()` `/teachers/:path*` → `Cache-Control: public, max-age=31536000, immutable`(상수 `TEACHER_ASSET_CACHE` 내보냄).
- `.dependency-cruiser.cjs` — `three-only-in-avatar` · `avatar-only-dynamic`(dependencyTypesNot ["dynamic-import"] — 갈래 이름 확인함).
- `CREDITS.md` — 3절 끝에 '3D 그리기 라이브러리' 소절(three 0.180.0 MIT · @pixiv/three-vrm 3.5.5 MIT, 저작권 줄은 각 LICENSE 그대로).
- `src/app/dev/teacher-probe/{page.preview.tsx,teacher-probe.tsx,probe-text.ts}` — '3D 보기': 명단 선생님 고르기 · 상태 단추 다섯 · 보관 조각 + 선생님 창 · 불러오기 ms · 첫 장 ms · 초당 장 수 · 대신 표시 까닭 · 지금 talk.teacher_render.
- 시험: `tests/unit/{teacher-window,dependency-rules,next-config,access-gate}.test.ts`, `tests/e2e/teacher-window.spec.ts`.

## 시험 이름

단위 `tests/unit/teacher-layer.test.ts`(AC-19i 그림 층 판정 · 늦은 결과 버림)
- 판정 6: 처음 초상 → 불러오기 → 첫 장 3D / 까닭 다섯 / 한 번 초상이면 세션 끝까지 / 지난 차례 결과 버림 / 닫은 뒤 결과 버림 / 3D 뒤 시간 넘김 버림.
- 차례 11: setting 은 코드 조각 · 모델을 안 받음 / no-webgl 은 코드 조각을 안 받음 / 코드 조각 · 모델 실패 → load-failed · 자원 풂 / load-start → first-frame(ms · loadMs) / 시간 넘김 → 받기 멈춤 · timeout · 뒤에 온 불러오기 · 첫 장 버림 / 시간 넘김 뒤 온 코드 조각으로 안 만듦 / 맥락 잃음 → context-lost · 한 번 풂 / 만들다 던지면 no-webgl / 닫기 + 사라짐 합쳐 풀기 한 번 / 보관 조각이 사라진 뒤 온 코드 조각 · 불러오기 버림 / 상태 · 움직임 줄이기를 그림 층이 생길 때 넘김.

단위 더함
- `teacher-window.test.ts` 4: 'AC-19i 그림 층이 3D 이고 시작 뒤면 render=3d · 칸 보임 · 초상 · 표시 숨김' · 'AC-19i 시작! 화면은 3D 가 되어도 초상' · 'AC-19i 까닭 다섯마다 초상 · 까닭 속성 · 상태 표시 · 오류 글 · 단추 없음' · 'AC-19c 보관 조각 밖 창은 3D 칸 없이 초상'.
- `dependency-rules.test.ts` 3 + 정규식 표: 'AC-N12 avatar-3d 밖 three · three-vrm → 위반' · 'AC-N12 avatar-3d 는 허용' · 'AC-N12 정적 가져오기 위반 · import() 허용'.
- `next-config.test.ts` 1: 'AC-N12 /teachers/ 1년 immutable 캐시'.
- `access-gate.test.ts` 'proxy matcher' 에 `/teachers/mina.1a2b3c4d.vrm` · `.webp`.

e2e 기본(`tests/e2e/teacher-window.spec.ts`, describe '선생님 창 대신 표시(차례 8)')
- 'AC-19i WebGL 없음 → no-webgl 초상 · 오류 글 · 새 단추 없음 · 대화 → 그만하기 → 정리 → 마무리 · .vrm 요청 0 · 사건은 fallback 하나'.
- 'AC-19i talk.teacher_render=portrait → setting · .vrm 요청 0 · 대화 이어짐'.
- 'AC-19i 관찰 쪽 3D 보기 — no-webgl 초상 · 까닭 칸'.
- 기존 첫 시험(AC-19c '시작!' 화면부터 초상) 단언을 `data-teacher-fallback` 없음 → `no-webgl` 로 고침(WebGL 끈 쪽은 '시작!' 화면에서 바로 대신 표시).

## 관문 결과(Node 24 PATH)

```
pnpm lint                         Checked 436 files … No fixes applied.
pnpm exec next typegen && tsc     tsc exit 0
pnpm test                         Test Files 92 passed · Tests 963 passed | 6 todo
pnpm check:deps                   ✔ no dependency violations found (225 modules, 1205 dependencies cruised)
pnpm build                        exit 0 (Next 16.4.2 Turbopack)
pnpm seed:validate                칸 922 · 통과 922 · 실패 0 (경고 1 — 전부터 있던 분포 경고)
pnpm check:bundle                 위반 0
pnpm spec:trace --fail-on …       exit 0 · unknown-ac 0 · plan-ac-not-in-spec 0
pnpm check:ids                    exit 0 (design-number 는 보고만 — 아래 우려)
```

e2e 는 돌리지 않음(이 Mac 은 로컬 e2e 불가 — 메모리). 새 e2e 는 tsc 로 형만 확인.

## 회화 밖 쪽 첫 JS 에 three 가 없다는 확인

`pnpm build` 뒤 스크래치패드 스크립트(plan 값 17 의 check-teacher-bundle 과 같은 셈 — 표지 글 `VRMC_vrm` · `THREE.WebGLRenderer` 로 3D 조각을 찾고, 경로마다 `page_client-reference-manifest.js` 의 entryJSFiles + async 아닌 clientModules 조각, `build-manifest.json` rootMainFiles 와 대조):

| 경로 | 처음 받는 조각 | 3D 조각 |
|---|---|---|
| / · 수업 목록 · 지난 수업 · 배치 · 결과 · 첫 실행 · 접근 · 음성 관찰 · 선생님 관찰 · not-found | 1~6 | 0 |
| /session/[id](회화 포함) | 7 | 0 |
| rootMainFiles | — | 0 |

3D 는 동적 조각 하나로만 있다(보관 조각의 import() 가 부름). d9 의 `scripts/check-teacher-bundle.ts` 가 같은 대조를 CI 에 올린다.

## 3D 묶음 크기

| 조각 | 압축 전 | gzip |
|---|---|---|
| static/chunks/222pc1abvq1f5.js(three · three-vrm · avatar-3d) | 719,678 B | 176,627 B |

시제품 dist 약 700KB 와 같은 자리.

## plan 으로 풀리지 않아 정한 것

1. **first-frame 사건에 `loadMs` 칸을 더함** — 관찰 쪽 '불러오기 ms'(받아 풀기까지)와 '첫 장 ms'를 가르려고. plan 의 detail 꼴 `{ type, reason?, ms? }` 에 선택 칸 하나.
2. **그림 층을 만들다 던지면(WebGLRenderer 생성 실패) no-webgl** — WebGL 2 검사를 지났어도 맥락을 못 만든 경우라.
3. **dispose 에서 `renderer.forceContextLoss()`**(맥락 잃음 처리기를 뗀 뒤) — 마무리에서 GPU 메모리를 바로 놓으려고(4절 '메모리를 일찍 풂').
4. **ResizeObserver 는 캔버스 자체를 본다** — 캔버스가 칸에서 칸으로 옮겨 다니고(창은 마무리 · 막힘에서 사라졌다 다시 생김) CSS 로 칸을 채우므로 같은 크기다.
5. **3D 일 때 초상 상태 표시(물결 · 점 셋 · 별)를 숨김** — plan 값 13 '초상일 때 상태 표시'를 그대로 읽음. 3D 는 움직임으로 상태를 보인다.
6. **'시작!' 화면의 까닭 속성** — WebGL 이 없으면 그림 층이 '시작!' 화면에서 바로 대신 표시로 가므로 그때부터 `data-teacher-fallback=no-webgl`. '3D 를 시작하기 전 초상은 까닭 없음'은 고르는 화면 앞(선생님 없음)과 보관 조각 밖 창에 남는다. d7 e2e 단언 하나를 이에 맞게 고침.
7. **보관 조각이 사라질 때 닫힌 상태로 둠** — 개발 모드의 효과 두 번 돌기 · 쪽 떠남 뒤 늦게 온 코드 조각이 그림 층을 만들지 않게(단위 시험 하나).
8. **보관 조각이 마지막 상태 · 움직임 줄이기를 기억** — 회화 틀의 효과(자식)가 보관 조각 효과(부모)보다 먼저 돌아, 움직임 줄이기가 처음부터 참이면 새 그림 층에 넘어가지 않던 빈틈.
9. **의존 규칙 three-only-in-avatar 의 대상** — three · @types/three · @pixiv/three-vrm 과 그 하위 꾸러미(@pixiv/three-vrm-core 등). 다른 파일은 core 의 손잡이 꼴만 쓴다.
10. **관찰 쪽** — 상태 단추 다섯(쉬기 · 말하기 · 듣기 · 칭찬 · 생각)을 더함(로컬 3D 눈 점검의 '다섯 상태'를 수업 없이 보게). 설정은 page.preview.tsx 가 `getSettings` 로 직접 읽음(못 읽으면 3D 보기를 끄고 한 줄). 관찰 쪽 글은 정본 밖 문구 표의 줄 밖 것(대신 표시 까닭 · 상태 이름 등)이 있다 — 관찰 도구라 아이 화면 원칙 밖.
11. **CREDITS** — 새 번호 절 대신 3절 끝 소절('3D 그리기 라이브러리')로 둠(4절 번호를 바꾸지 않게).

## 요청하는 변경(공용 · 설계)

없음. 브리프가 허용한 파일 밖은 `src/app/dev/teacher-probe/probe-text.ts`(관찰 쪽 글 모듈 — 3D 보기 글을 넣음)와 `tests/unit/teacher-window.test.ts` · `access-gate.test.ts` · `next-config.test.ts`(고친 파일을 덮는 시험)뿐이다.

## 남은 우려

1. **e2e 미실행** — 새 AC-19i 기본 e2e 셋과 고친 단언 하나는 CI 첫 실행에서 결과가 나온다. 그만하기 → 정리 → 마무리 흐름은 회화 e2e 의 AC-15f 와 같은 꼴로 썼다.
2. **3D 실제 그리기 미확인** — avatar-3d 는 형 검사 · 빌드 · 의존 규칙만 지났다. 실제 모델 올리기 · 첫 장 · 다섯 상태 · 마무리 닫힘은 컨트롤러 로컬 눈 점검(관찰 쪽 '3D 보기' · 회화 1단계 수업)과 d9(3D e2e)에서 본다. EXT_texture_webp · MToon 이 그려지는지도 같음(plan 위험 5).
3. **막힘 · 쉼 화면에서도 불러옴** — 보관 조각은 선생님이 있으면 화면과 관계없이 시작한다(plan 값 14 '선생님이 생기면'). 마이크가 없는 기기 · 1-가 상한 날에도 모델(약 5MB)을 받는다. 막을지는 컨트롤러 판단.
4. **check:ids design-number 보고** — 새 파일에 맨 숫자 몇 개(avatar-3d 빛 세기 · 위치 · 초→ms 1000, teacher-layer 의 ×1000, 관찰 쪽 간격)가 보고된다. 규칙은 보고만이고 막지 않는다. 차수 경계에서 막음으로 바뀌면 이름을 붙여야 한다.
5. **Vercel 에서 headers() 가 public 파일 응답에 붙는지** — 프리뷰에서 `curl -I …/teachers/mina.9c5152a7.vrm` 로 확인(plan '구현하며 확인할 것').
6. **React Compiler** — 그림 층은 effect 안에서만 만들고 렌더 중 ref 를 읽지 않게 했다. 빌드는 통과했으나 dev 화면에서의 경고 여부는 눈 점검 때 콘솔로 본다.
