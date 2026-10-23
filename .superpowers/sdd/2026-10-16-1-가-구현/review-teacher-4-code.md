# 코드 검토 묶음 4: P13d d8 — 3D 선생님 그림 층(code-reviewer rev-teacher-4 · Opus · xhigh, 2026-10-23 15:xx)

(브리프 `task-teacher-review-4.md` 대로 검토자가 직접 썼다. 대상은 워크트리 p13d 의 `git diff 1174e13..123d7bc`(커밋 하나). 줄 번호는 123d7bc 기준이다. 뒤 커밋 8d97a04 · e9909c2 는 아래에서 인용한 줄을 옮기지 않았다. 코드는 고치지 않았고, 단위 · e2e 는 다시 돌리지 않았다. e2e 는 이 Mac 에서 돌지 않아 단언을 코드와 맞대어 보았다.)

**판정: Approved.** Critical 0 · Important 0 · Minor 6. 구현자가 정한 열하나는 모두 받는다. Minor 는 프리뷰를 막지 않는다. M-2 는 d10 실측 전에 고치기를 권한다.

## 1. 설계 준수

- ✅ 값 14 avatar-3d(plan.md:294): fetch(signal) → arrayBuffer → parseAsync(`avatar-3d.ts:111-118`), 멈췄거나 닫힌 뒤 끝나면 풀고 false(:120-123), 첫 장 onFirstFrame(:254-258), 맥락 잃음 · 그리기 오류 onFailure(:184-188 · :248-251), dispose 는 한 번 + momo:teacher dispose(:169-182), 시제품 상수에 이름(:24-41), document.hidden 이면 안 그리고 장 수도 그대로(:242), 1초마다 data-teacher-frames(:259-261).
- ✅ 값 14 판정 순수 함수(plan.md:295): 사건 아홉 · 까닭 다섯 · 한 번 초상이면 그 세션 끝까지 · 차례 번호로 늦은 결과 버림(`layer.ts:9-15 · 61-91`). core 의존 규칙도 지킨다(형만 가져옴).
- ✅ 값 14 보관 조각(plan.md:296): 세션 id 를 키로 회화 틀 바깥에 둔다(`page.tsx` 회화 갈래). 차례는 설정 → WebGL 2 → load-start → import() → 그림 층 → 모델 → 첫 장이다(`teacher-layer.tsx:138-191`). 시간 넘김은 AbortController 로 멈춘다(:183-188 → teardown :101). close · 보관 조각 사라짐을 합쳐 풀기는 한 번이다(:198-210, teardown 이 avatar 를 null 로).
- ✅ 값 14 창 · 회화 틀(plan.md:297-298): `started && 3d` 일 때만 3D 칸을 보이고 초상을 숨긴다(`teacher-window.tsx:57-59 · 105-129`). '시작!' 화면은 초상이다(정할 것 8). 넘김 효과 없이 hidden 만 바꾼다. 마무리에 들어가면 close(), 상태 · 움직임 줄이기를 넘긴다(`talk-frame.tsx:839-845`).
- ✅ 값 15(plan.md:302-306): 판을 정확히 고정했다(설치된 three 0.180.0 · three-vrm 3.5.5 확인). `teachers/` 를 proxy 밖으로 뺐다(`proxy.ts:63`). headers 로 1년 immutable 을 준다(`next.config.ts:31-36`). 의존 규칙 둘(`.dependency-cruiser.cjs:88-109`). CREDITS 저작권 줄은 node_modules 의 두 LICENSE 첫 줄과 같다.
- ✅ 값 16 관찰 쪽 '3D 보기'(plan.md:310): 명단 고르기 · 보관 조각 + 창 · 불러오기 · 첫 장 · 초당 장 수 · 대신 표시 까닭 · talk.teacher_render 를 모두 갖췄다.
- ✅ 설정값: talk.teacher_render · talk.teacher_load_timeout_seconds 는 서버가 Zod 로 읽어 넘긴다(`src/server/conversation/index.ts:452-453 · 481-485`). 3D 상수는 plan 제약(plan.md:425)의 화면 꼴 상수다.
- ✅ C122 · 정본 4절(`specs/03-화면.md:78`): 아이 화면에 오류 글 · 다시 불러오기 단추가 없다. 까닭은 속성과 사건에만 남는다.
- ✅ 증명 표 d8 몫(plan.md:456 · 460): AC-19i 단위 17 · e2e 기본 셋, AC-N12 의존 규칙 몫을 갖췄다. 시험 이름은 모두 정본 번호로 시작한다.
- ✅ 용어: 더한 줄에 트랙 · 유닛 · 토리가 없다.
- ⚠️ diff 로 확인하지 못하는 것:
  1. 실제 번들. 구조로는 맞다. teacher-layer 는 react · core 형만 가져오고 avatar-3d 는 :291 의 import() 하나뿐이다. CI 대조는 d9 의 check:teacher-bundle 몫이다.
  2. Vercel public 파일에 headers() 가 붙는지. 프리뷰에서 `curl -I` 로 본다(plan.md:396).
  3. 실제 3D 그리기 · WebP · MToon · 콘솔 경고 · React Compiler dev 경고. 차례 6 로컬 눈 점검 몫이다.
  4. 새 e2e 셋. CI 첫 실행에서 결과가 나온다(아래 3절 5 에서 단언을 코드와 맞대 보았다).

## 2. 잘한 점

- 판정을 순수 함수로 떼고 불러오기 차례를 바깥 의존(`LayerRunDeps`)으로 넣었다. 그래서 늦은 import · 시간 넘김 뒤 결과 · 닫은 뒤 · 보관 조각이 사라진 뒤를 가짜 시계로 모두 시험했다(`teacher-layer.test.ts:247-435`). 단언이 사건 차례 · ms · loadMs · 풀기 횟수 · abort 여부까지 구체적이다.
- `layerStep` 은 바뀌지 않으면 같은 객체를 돌려주고, 대신 표시 · 닫힘 뒤의 사건은 모두 버린다(`layer.ts:61-85`). 작고 읽기 쉽다. three 형을 core 의 손잡이 꼴(`TeacherAvatarHandle`)로 막아 의존 규칙과 맞물린다.
- 의존 규칙을 실제 depcruise 로 시험했다. 정적 가져오기는 위반이고 import() 는 허용된다. pnpm 경로 꼴도 다루고, 닮은 이름(three-mesh-bvh · threejs · @pixiv/other)은 거른다. 이것으로 plan '구현하며 확인할 것'의 dynamic-import 갈래 이름이 닫힌다.
- 개발 모드에서 효과가 두 번 도는 것과 자식 효과가 부모보다 먼저 도는 차례(정한 것 7 · 8)를 짚어 ref 로 막았다.
- dispose 가 맥락 잃음 듣개를 뗀 뒤 forceContextLoss 를 부른다. 그래서 마무리에서 GPU 맥락을 바로 놓는다(iPad 맥락 수 한도에 유리).
- 검토 3 Minor-1(d8 이 깨뜨릴 단언)을 이 묶음이 고쳤다 — **ADDRESSED**(`teacher-window.spec.ts:314` 이름 · :333 단언).

## 3. 브리프 '특히 볼 곳' 1~6

1. **3D 는 동적 조각 하나에만.** page.tsx 가 teacher-layer 를 모든 세션에서 정적으로 가져오지만 teacher-layer 에는 three 가 없다. 그래서 읽기 · 쓰기 · 말하기 세션의 첫 JS 에도 3D 가 들지 않는다.
   - three-only-in-avatar 의 `npm("three|@types/three|@pixiv/three-vrm[a-z0-9-]*")` 는 `node_modules/(…)/` 로 끝을 막는다. 그래서 닮은 이름을 거르고, `three/addons/…` 의 실제 경로(.pnpm/three@…/node_modules/three/examples/…)는 잡는다. tsPreCompilationDeps 가 true 라 `import type` 도 잡는다.
   - avatar-only-dynamic(`dependencyTypesNot: ["dynamic-import"]`)는 정적 가져오기 · 다시 내보내기 · 형 가져오기를 모두 막는다. import() 로 부르는 중간 모듈이 avatar-3d 를 정적으로 가져와도 그 줄이 걸린다. 검사 범위는 src 다(package.json:20). 빈틈은 찾지 못했다.
2. **판정과 자원.** 아래는 모두 맞다. 빈틈은 시험 쪽뿐이다(M-4).
   - 대신 표시 까닭 다섯(`layer.ts:66-84`).
   - 한 번 초상이면 세션 끝까지(:63, 보관 조각 fallen ref `teacher-layer.tsx:264 · 280`).
   - 늦은 결과 버림(acceptsLoad :146 · :166).
   - 닫은 뒤 · 사라진 뒤 결과 버림(close → closed, dispose → closed :203).
   - 시간 넘김(:184-188 → abort :101).
   - 맥락 잃음(avatar-3d.ts:184-188 · :248-251).
   - 풀기 한 번 — disposed 깃발 :170, forceContextLoss 는 맥락 잃음이 아닐 때만 :179.
   - rAF 취소(:173 — tick 안에서 실패해 새로 건 장도 취소된다) · ResizeObserver 끊기(:174) · 쪽 숨김(:242).
   - 개발 모드 효과 두 번: 첫 차례가 closed 로 남아 늦게 온 import 가 캔버스를 만들지 않는다(:146). load-start 사건이 두 번 나는 것은 dev 에서만이다(e2e 는 `pnpm build && pnpm start`, playwright.config.ts:118).
   - 보관 조각이 마지막 상태 · 움직임 줄이기를 기억해 새 차례에 넘긴다(:305).
   - import · 모델 실패는 모두 잡혀 사건이 되고(:140-145 · :164-169), 닫은 뒤의 AbortError 도 버려진다. 처리 안 된 Promise 거부가 없다.
3. **접근 · 캐시.**
   - C141 (2) 가 '`/teachers/` 는 proxy 밖 · 1년 캐시'를 승인했다(`specs/10-결정-기록.md:310`). 정본 8절 접근 제어는 'proxy.ts 로 페이지 요청을 먼저 거른다'이다(`specs/08-테스트와-기술.md:38`). 정적 자산은 그 밖이고, 서버 액션 · Route Handler 의 첫 줄 확인은 그대로다.
   - 쿠키 없이도 모델을 받을 수 있다는 점은 plan 위험 14 가 받아들였다(plan.md:390). matcher 는 경로 머리의 teachers/ 만 뺀다. 단위가 .vrm · .webp 를 덮는다(`access-gate.test.ts:674-675`).
   - immutable 은 폴더 전체에 닿는다 → M-3.
4. **선생님 창.**
   - 칸은 늘 두고, show3d 는 `started && render==="3d"` 일 때만 참이다(:57).
   - '시작!' 화면은 3D 가 먼저 되어도 초상이다(단위 :171-181). 3D 일 때 render=3d 이고, 까닭 속성은 없으며, 초상 · 상태 표시는 숨는다(정한 것 5).
   - 대신 표시 까닭 다섯 × 상태 셋 모두에서 상태 표시가 보이고 단추 · 오류 글은 없다(단위). 움직임 줄이기는 그림 층에 넘어간다.
5. **시험.** 단위 17 은 개수가 맞다(판정 6 + 차례 11). e2e 셋의 단언을 코드와 맞대 본 결과는 이렇다.
   - (a) no-webgl: fixtures 가 문맥 시작 스크립트로 getContext 를 null 로 바꾼다(`tests/e2e/fixtures.ts:69`). 그러면 browserHasWebgl 이 false 이고(`teacher-layer.tsx:211-221`) 창 :69 에 까닭이 붙는다.
   - (b) 캔버스 0: 대신 표시면 createCanvas 를 부르지 않는다. 검사용 캔버스는 문서에 붙이지 않는다. 앱 다른 곳에 canvas 가 없다(src 훑음).
   - (c) 사건이 `[{type:"fallback",reason:"no-webgl"}]` 하나: startedAt 이 없어 ms 키가 없다(:113-118). 마무리의 close() 는 fallback 상태라 버려진다(layer.ts:63).
   - (d) 마무리 장에서 창 0: teacherWindowShown 이 closing 을 뺀다(`talk-frame.tsx:234`).
   - (e) 흐름: greetingToTalkLesson 은 오늘 쓸 말을 비워 인사 뒤 바로 대화로 간다(`tests/e2e/talk.ts:3-4`). 목표 턴 전 '그만할래요' → 정리 `[data-speak]` → 마무리 첫 장으로 이어진다. AC-15a(`conversation.spec.ts:1212-1224`)와 같은 꼴이다. 시험 앞에서 미리 넣는 insertTalkLesson 은 beforeEach resetHousehold(:83) 뒤라 FK 문제가 없다.
   - (f) 설정이 WebGL 검사보다 먼저다(`teacher-layer.tsx:174-178`).
   - (g) 관찰 쪽의 사건 듣개는 고르기 전에 달려 있어 까닭 칸이 채워진다.
   - '초상에서도 말하기 · 생각 · 칭찬 표시'(plan.md:456)는 새 AC-19i 시험이 아니라 d7 AC-19g · 19h 시험(:418-673)이 덮는다. 그 시험들도 같은 WebGL 끈 문맥이라 이제 no-webgl 대신 표시 아래에서 돈다. 단위도 까닭 다섯 × 상태 셋을 덮는다.
   - 흔들릴 만한 곳은 보이지 않는다.
6. **구현자 우려 3** → M-1(Minor). 고치기를 권하지만 프리뷰를 막지는 않는다.

## 4. 지적

### M-1 (Minor) 막힘 · 쉼 화면에서도 3D 를 받고, 보이지 않는 캔버스에도 매 장 그린다(구현자 우려 3)

- **자리**
  - `teacher-layer.tsx:274-275`: 선생님만 있으면 차례를 시작한다.
  - `talk-frame.tsx:234 · 1112-1117`: 막힘 · 쉼 · 마무리에는 창이 없다.
  - `teacher-window.tsx:111`: '시작!' 화면에서는 칸을 숨긴다.
  - `avatar-3d.ts:242`: 그리기를 멈추는 조건은 document.hidden · 맥락 잃음뿐이다.
- **근거**
  - plan 값 14 는 '(teacher 가 생기면('시작!' 화면부터)'라고 한다(plan.md:296). 그런데 증명 표 AC-19b 대로 막힘 · 쉼은 '시작!' 앞에 오는 화면이다(plan.md:449).
  - spec AC-6(AC-19f)의 '모델을 요청하지 않는 화면' 목록(spec.md:317)에는 막힘 · 쉼이 없다. 그래서 AC 위반은 아니다.
  - 마이크 없는 기기와 1-가 상한 날에는 3D 조각 약 720KB 와 모델 약 5MB 를 받는다. 1년 캐시라 다음 세션에서 다시 쓰므로 한 번만이다.
  - 그 뒤로 맥락 하나를 잡은 채 매 장 그린다. 막힘 · 쉼에서는 문서에서 떨어진 칸에, '시작!' 화면에서는 첫 장 뒤 숨긴 칸에 그린다.
  - 아이에게 보이는 결과는 없고 배터리 · 발열(AC-N11 점검 항목)만 늘어서 Minor 로 둔다.
- **의견 — 고칠 길**: 고치기를 권한다(d9 또는 d10 손질 묶음, 프리뷰는 막지 않음). 둘 다 손이 작다. 고치지 않기로 하면 장부 '남은 우려'에 남긴다.
  1. 회화 틀이 창을 처음 보일 때(windowShown) 공유 값의 `want()` 를 부르고, 보관 조각은 그 뒤에 차례를 시작한다. 이러면 막힘 · 쉼에서는 받지 않고 plan 글 '시작! 화면부터'와도 맞는다.
  2. 첫 장 뒤에는 캔버스 크기가 0 인 동안 그리기를 건너뛴다(:213 과 같은 값 — getBoundingClientRect). '시작!' 화면과 대화 중 막힘 · 쉼에서 GPU 가 쉰다.

### M-2 (Minor) 관찰 쪽 '초당 장 수'가 최대 약 ±25% 흔들린다

- **자리**
  - `teacher-probe.tsx:48-49 · 119-132`: 1초마다 읽고, 읽은 시각(performance.now())으로 나눈다.
  - `avatar-3d.ts:259-261`: 장 수는 마지막으로 적은 뒤 1초가 지난 첫 장에만 적는다.
- **근거**
  - 표본 다섯(약 4초)의 장 수 차이는 '표본 0 직전에 적은 때'부터 '표본 4 직전에 적은 때'까지의 장이다. 적은 때는 표본보다 0~약 1초 앞선다.
  - 그래서 실제 구간은 약 3~5초인데 4초로 나눈다. 읽힌 값은 참값의 0.75~1.25배 사이를 천천히 오간다(적는 간격이 1초 + 한 장이라 맥놀이가 난다).
  - 이 칸은 AC-N11 점검표에 그대로 옮겨 적고(plan.md:310 · 459), 13절의 그리기 빈도 · 화소 비율을 이 값으로 정한다(plan.md:369 · spec.md:360).
- **고칠 길**: d10 실측 전에 둘 중 하나로 고친다.
  - avatar-3d 가 장 수와 함께 적은 때를 남기고(예 `data-teacher-frames-at`) 관찰 쪽은 그 두 값으로 나눈다.
  - 관찰 쪽이 100ms 마다 읽고, 값이 바뀐 때의 시각만 표본으로 쓴다(오차 약 0.1초/4초).

### M-3 (Minor) 1년 immutable 머리글이 `/teachers/` 폴더 전체에 닿는다

- **자리**: `next.config.ts:33`(`/teachers/:path*`).
- **근거**
  - 1년 캐시는 '파일 이름에 내용 해시'를 전제로 정했다(정본 `08-테스트와-기술.md:37` · spec.md:107 · C141 (2)).
  - 해시 이름은 두 곳에서만 보장된다. 명단의 모델 · 초상 경로 꼴(`src/core/seed/check-teacher.ts:401-403` (b))과 명단 밖 .vrm 거부((e) :510)다.
  - 해시 없는 다른 파일(명단 밖 .webp, 설명 파일 등)을 뒤에 이 폴더에 두면 검사 없이 1년 바뀌지 않는 캐시가 된다.
  - 지금 파일 넷은 모두 해시 이름이라 결함은 아니다.
- **고칠 길**: 둘 중 하나.
  - source 를 해시 꼴로 좁힌다. 예 `/teachers/:file([a-z]+\\.[0-9a-f]{8}\\.(?:vrm|webp))`. 키 꼴 · 글자 수는 `structure.ts` 의 TEACHER_KEY · TEACHER_ASSET_HASH_CHARS 와 맞춘다(검토 3 Minor-2 '꼴은 한 곳'). next-config 단위에 '해시 없는 이름에는 붙지 않음'을 더한다.
  - 자산 검사 (e) 를 public/teachers 의 모든 파일로 넓힌다.

### M-4 (Minor) 보관 조각이 세션 끝까지 기억하는 두 길이 시험 밖이다

- **자리**
  - `teacher-layer.tsx:172-175`: initialFallback — 사건 없이 그 까닭의 초상.
  - :264 · :280: fallen ref.
  - :266-269 · :305: pose ref(정한 것 8).
- **근거**
  - plan 값 14 '한 번 초상으로 가면 그 세션 끝까지 초상'(plan.md:295) · 브리프 '특히 볼 곳 2'.
  - initialFallback 길은 어떤 시험도 부르지 않는다.
  - 단위 :422 는 차례 안의 pose 만 덮는다. 정한 것 8 이 메운 빈틈은 보관 조각의 ref 인데, 이것은 덮지 않는다.
  - e2e 는 운영 빌드라 개발 모드의 효과 두 번 돌기도 돌지 않는다.
- **고칠 길**
  - 단위 하나를 더한다. `startTeacherLayer({ initialFallback: "timeout", … })` 가 importAvatar · hasWebgl 을 부르지 않고, 사건을 내지 않으며, onChange 로 timeout 초상을 한 번 낸다.
  - 보관 조각 ref 는 단위 환경(node · renderToStaticMarkup)에서 효과가 돌지 않는다. 로컬 눈 점검(next dev, 움직임 줄이기를 켠 채 회화 수업)이나 d9 3D e2e 에서 확인했다고 적는다.

### M-5 (Minor) 이름 없는 숫자 — 둘레 관례와 다르고 check:ids 가 보고한다

- **자리**
  - `teacher-layer.tsx:187`(`* 1000`).
  - `avatar-3d.ts:237`(`/ 1000`) · :95-101(빛 세기 2 · 2.4 · 0.6 · 위치 · 색) · :73 · :157(`-10`).
  - `teacher-probe.tsx:130`(`* 1000`).
- **근거**
  - 둘레 코드는 초 → ms 를 파일마다 `const MS_PER_SECOND = 1000` 으로 이름 붙인다(`src/core/speech/listen.ts:39` · `src/core/conversation/listen.ts:15` · `follow-along.tsx:68` 등).
  - avatar-3d 는 시제품 값에 이름을 붙였다면서(:24-41 CAMERA · FRAMING · ARMS · MOUTH · BLINK) 빛과 '아직 깜빡이지 않음' 표시(-10)만 맨 숫자로 둔다.
  - `pnpm check:ids` 가 이 줄들을 design-number 로 보고한다(지금은 보고만 — 구현 보고 우려 4).
  - 이 숫자들은 설정값 대상이 아니다(plan.md:425 화면 꼴 상수). 문제는 읽기 쉬움과, 차수 경계에서 검사가 '막음'으로 바뀔 때다.
- **고칠 길**: 파일마다 MS_PER_SECOND 를 둔다. avatar-3d 에 `LIGHTS = { … } as const` 와 `NO_BLINK_YET` 을 두고, MOUTH 에 `as const` 를 붙인다.

### M-6 (Minor) 단위 시험의 '숨김' 정규식이 overflow-hidden 에도 맞는다

- **자리**: `tests/unit/teacher-window.test.ts:85`(`/class="[^"]*\bhidden\b/`).
- **근거**
  - `-` 는 낱말 글자가 아니라서 `\bhidden\b` 가 `overflow-hidden` 의 hidden 에도 맞는다. 주석은 aria-hidden 만 짚었다.
  - 지금 칸 · 초상 img 클래스에는 overflow-hidden 이 없어 결과는 맞다.
  - 뒤에 초상 img 에 overflow-hidden 이 붙으면 '3D 일 때 초상 숨김' 단언(:168)이 숨기지 않아도 통과한다.
- **고칠 길**: 클래스 경계를 공백으로 본다. 예 `/class="(?:[^"]*\s)?hidden(?:\s[^"]*)?"/`.

## 5. 구현자가 정한 것 열하나

| # | 정한 것 | 판정 | 까닭 |
|---|---|---|---|
| 1 | first-frame 사건에 loadMs | 받음 | plan 값 16 이 불러오기 · 첫 장을 따로 잰다. 선택 칸 하나가 가장 작은 길이다. 형 · 단위(:310-314)가 맞다 |
| 2 | 그림 층을 만들다 던지면 no-webgl | 받음 | WebGL 2 검사를 지나도 three r180 WebGLRenderer 는 맥락을 못 만들면 던진다. 다른 생성자 오류도 같은 까닭으로 묶이지만 까닭은 진단용이라 해가 없다 |
| 3 | dispose 에서 forceContextLoss | 받음 | 정본 4절 '떠나면 자원을 푼다'와 맞다. 듣개를 먼저 떼고(:175) 맥락 잃음 뒤에는 부르지 않는다(:179) |
| 4 | ResizeObserver 는 캔버스 | 받음 | 캔버스가 칸 사이를 옮겨 다니고 칸을 꽉 채운다. setSize(…, false) 라 CSS 크기가 바뀌지 않아 관찰이 되먹임으로 돌지 않는다 |
| 5 | 3D 일 때 초상 상태 표시 숨김 | 받음 | plan 값 13 '초상일 때 상태 표시', 정본 4절 '초상일 때도 … 보인다' — 3D 에서는 움직임이 상태를 보인다 |
| 6 | '시작!' 화면의 까닭 속성 | 받음 | spec AC-9(AC-19i) '그 까닭 속성으로 남고'와 맞다. 검토 3 Minor-1 이 미리 짚은 단언 옮김이다 |
| 7 | 보관 조각이 사라지면 closed | 받음 | 단위 :396-420 이 덮는다 |
| 8 | 마지막 상태 · 움직임 줄이기 기억 | 받음 | 자식 효과가 먼저 도는 React 차례가 맞다. 시험은 M-4 |
| 9 | three-only-in-avatar 대상 | 받음 | 하위 꾸러미까지 정규식 표로 시험한다 |
| 10 | 관찰 쪽 상태 단추 · 설정 직접 읽기 | 받음 | plan 값 16 '아이 화면 원칙 밖', C141 (3) 이 관찰 쪽 글을 승인했다. plan 정본 밖 문구 표(plan.md:327)에 없는 관찰 글(대신 표시 까닭 · 선생님 상태 · 상태 이름 · 안내 두 줄)을 그 줄에 더할지는 컨트롤러가 정한다(지적 아님) |
| 11 | CREDITS 는 3절 소절 | 받음 | 4절 번호를 지킨다. 저작권 줄이 설치된 LICENSE 와 같다 |

고칠 것 0.

## 6. 범위 밖 관찰(지적 아님)

- **spec 우려 2**(spec.md:294 '듣는 동안에는 풀기를 미룰지 구현하며 확인한다'): 이번 구현은 풀기를 미루지 않는다. plan 위험 10(plan.md:386)이 iPad 실측으로 넘겼으므로 d10 점검표에 '듣기 중 풀기 · 첫 셰이더 컴파일 때 체감 대기'를 한 줄 넣기를 권한다.
- **검토 3 I-1**(AC-19j e2e 가 마이크 안내를 다시 기다림)은 이 diff 밖이다. 뒤 커밋 8d97a04 가 따로 고쳤다(이번 검토 범위 아님).
