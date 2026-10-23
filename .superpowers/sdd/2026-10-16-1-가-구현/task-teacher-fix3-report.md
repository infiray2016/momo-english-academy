# 구현 보고: 손질 3 — 코드 검토 4(d8) Minor 여섯(2026-10-23 15:2x)

자리: 워크트리 `.claude/worktrees/p13d`(바탕 e9909c2). 커밋 · push 안 함. 줄 번호는 이번 작업 트리 기준이다.

## 지적마다 고친 자리

### M-1 막힘 · 쉼에서 받지 않기 · 안 보이는 캔버스에 그리지 않기
- (a) 공유 값에 `want()`를 두었다.
  - 보관 조각의 몸을 React 밖 `createLayerHost`로 뺐다(`src/components/teacher/teacher-layer.tsx:262`). 선생님 · 설정(`configure`)과 `want`가 둘 다 있을 때만 `startTeacherLayer`(설정 → WebGL → load-start → import())를 시작한다. 두 번째 want 와 같은 설정을 다시 주는 것은 아무 일도 하지 않는다.
  - 보관 조각 `TeacherLayerHost`(:375)는 몸 하나를 `useState` 로 두고 `configure`(:393) · `dispose`(:395)만 효과에서 부른다. 대신 표시 까닭(fallen)과 마지막 상태(pose)는 몸이 기억한다(전 ref 둘과 같은 일).
  - 칸 붙이기(attach)도 몸으로 옮겼다. 브라우저 바깥은 `BROWSER_DEPS`(:345)에 있다.
  - 공유 값 형은 `TeacherLayerValue = LayerView & Pick<LayerHost, "want" | "attach" | "setPose" | "close">` 이다.
- 회화 틀(`src/components/conversation/talk-frame.tsx`)
  - `micChecked` 상태를 더했다(:258). 마이크 막힘 판정 효과에서 `setBlocked` 와 같은 차례에 참이 된다.
  - `windowShown` 계산을 그림 층 효과 앞으로 올렸다(값은 그대로).
  - `if (micChecked && windowShown) layer?.want()`(:852)을 더했다. 판정 전 첫 그림에서는 창이 잠깐 보여도 원하지 않는다. 막힘 · 쉼 · 마무리에서는 창이 없어 원하지 않는다. 고르는 화면은 선생님이 null 이다.
- 관찰 쪽 '3D 보기'(`src/app/dev/teacher-probe/teacher-probe.tsx:75`): `ProbePose` 가 올라올 때 바로 want 한다(동작은 지금과 같다).
- 그 밖: 머리 주석(teacher-layer.tsx:5-7)의 '선생님이 생기면'을 '창을 처음 보이면(want)'으로 바꿨다.
- (b) `src/components/teacher/avatar-3d.ts`
  - `resize()` 가 getBoundingClientRect 크기 0 을 `empty` 에 적는다(:244). ResizeObserver 가 부르므로 장마다 배치를 다시 읽지 않는다.
  - tick 은 첫 장 뒤 `!canvas.isConnected || empty` 면 그리지 않는다(:275). '시작!' 화면의 숨긴 칸, 문서에서 떨어진 칸(막힘 · 쉼)이 여기에 든다.
  - 첫 장은 숨긴 칸에서도 그린다. 그래야 3D 가 된다.

### M-2 관찰 쪽 초당 장 수
- avatar-3d `writeFrames`(:297)
  - 장 수와 함께 `data-teacher-frames-at` 을 적는다. 값은 requestAnimationFrame 시각으로, performance.now 와 같은 시간축이다.
  - 만들 때 처음 값도 적는다(:134).
- 관찰 쪽(:130-139)
  - 적은 때가 바뀐 표본만 모은다.
  - (장 수 차이 × MS_PER_SECOND) ÷ (적은 때 차이)로 낸다.

### M-3 1년 immutable 을 해시 이름에만
- `next.config.ts:24`: `TEACHER_ASSET_SOURCE` 를 두었다.
  - `structure.ts` 의 TEACHER_KEY(앞뒤 닻을 뗀 몸)와 TEACHER_ASSET_HASH_CHARS 를 가져와 조립한다(:3-6). 조립 결과는 `/teachers/:file([a-z]+\.[0-9a-f]{8}\.(?:vrm|webp))` 이다.
  - headers 의 source 로 쓴다(:43).
- path-to-regexp 6 은 `(?:…)` 갈래를 받아들인다. 거부하는 것은 이름 있는 묶음 `(…)` 뿐이다. 그래서 줄을 나누지 않았다.
- 확인한 것
  - `pnpm build` 가 통과했다. `.next/routes-manifest.json` 의 정규식은 `^/teachers(?:/([a-z]+\.[0-9a-f]{8}\.(?:vrm|webp)))(?:/)?$` 이다.
  - `next start` 로 실제 머리글을 봤다. `mina.9c5152a7.vrm` · `leo.669c5d28.webp` 는 `public, max-age=31536000, immutable` 이다.
  - 해시 없는 이름에는 붙지 않았다. 다만 서버를 띄운 뒤 넣은 임시 파일이라 404 와 기본 no-store 로 본 것이다. 파일은 바로 지웠다.

### M-4 시험
- 단위 `teacher-layer.test.ts:275` 를 더했다(시험 이름은 아래 '덮는 시험' 표).
- 보관 조각의 몸을 React 밖으로 뺐기 때문에, 전에 시험 밖이던 보관 조각 ref 둘(fallen · pose)도 단위로 덮였다(:566).
  - 사라졌다 다시 붙는 길은 개발 모드의 효과 두 번 돌기와 같은 길이다.
  - 다만 React 효과 차례 자체(자식 효과가 먼저 돎)는 단위 환경에서 돌지 않는다. 이것은 로컬 눈 점검(next dev, 움직임 줄이기를 켠 채 회화 수업)과 d9 3D e2e 몫으로 남긴다.

### M-5 이름 없는 숫자
- teacher-layer.tsx:32 · avatar-3d.ts:58 · teacher-probe.tsx:51 에 `MS_PER_SECOND` 를 두었다.
- avatar-3d
  - `MOUTH … as const`(:43)를 붙였다.
  - `LIGHTS = { hemisphere · key · fill } as const`(:51)를 두고, 주 빛 · 보조 빛은 같은 고리로 만든다.
  - `NO_BLINK_YET = -10`(:57)을 두었다.
- 값은 바꾸지 않았다. `pnpm check:ids` 에서 바꾼 다섯 파일의 design-number 보고가 0 이 됐다.

### M-6 숨김 정규식
- `tests/unit/teacher-window.test.ts:86` 을 `/class="(?:[^"]*\s)?hidden(?:\s[^"]*)?"/` 로 바꿨다.
- 정규식 자체 단언 셋을 더했다(:164-169). overflow-hidden · aria-hidden 에는 맞지 않고 낱개 hidden 에는 맞는다.
- 가짜 공유 값에 `want` 를 더했다.

## 덮는 시험(새로 · 바꾼 것)
| 파일:줄 | 이름 |
|---|---|
| teacher-layer.test.ts:275 | AC-19i 같은 세션에서 앞서 대신 표시로 갔으면(initialFallback) importAvatar · hasWebgl 을 부르지 않고 사건 없이 그 까닭 초상을 한 번 낸다 |
| teacher-layer.test.ts:502 | AC-19f 창이 원하기(want) 전에는 선생님 · 설정이 있어도 importAvatar · hasWebgl 을 부르지 않고 사건도 없다(막힘 · 쉼 화면에서는 3D 를 받지 않음) |
| teacher-layer.test.ts:529 | AC-19i 창이 원한(want) 뒤 차례는 지금과 같다 — WebGL 검사 · load-start · 코드 조각 · 붙인 칸에 캔버스 · 받은 상태 넘김 · 첫 장에 3D 이고 두 번 원해도 한 번이다 |
| teacher-layer.test.ts:566 | AC-19i 한 번 대신 표시로 가면 보관 조각이 차례를 다시 만들어도(설정 다시 줌 · 사라졌다 다시 붙음) 받지 않고 그 까닭 초상이며 마지막 상태 · 움직임 줄이기를 새 차례에 넘긴다 |
| next-config.test.ts:62 | AC-N12 1년 캐시는 해시 이름(<키>.<SHA-256 앞 8자>.<vrm\|webp>)에만 붙고 해시 없는 이름에는 붙지 않는다(Next 의 경로 맞춤으로 맞춰 봄) |
| next-config.test.ts:53 | (바꿈) 규칙 찾기를 `TEACHER_ASSET_SOURCE` 로 |
| teacher-window.test.ts:162 | (바꿈) 숨김 정규식 자체 단언 셋 |

- 시험 :62 이 하는 일
  - Next 가 쓰는 `getPathMatch` 로 맞춰 본다(`next/dist/shared/lib/router/utils/path-match`).
  - 붙는 쪽: `teacherAssetPath` 로 만든 vrm · webp 이름과 지금 `public/teachers` 의 네 파일이다.
  - 붙지 않는 쪽: readme.txt · mina.webp · mina.vrm · 7자 · 9자 해시 · 16진 아닌 글자 · png · .bak · 키에 숫자 · 하위 폴더 · 폴더 자체다.
  - TEACHER_KEY.source · TEACHER_ASSET_HASH_CHARS 값도 단언한다.
- 변이 확인: want 검사(`!wanted`)와 대신 표시 기억(`fallen`)을 지우면 새 시험 셋이 실패한다. 확인한 뒤 원래대로 돌렸다.

## 관문(Node 24 PATH)
- `pnpm lint`: 436 파일, 고칠 것 없음
- `pnpm exec next typegen && pnpm exec tsc --noEmit`: 오류 0
- `pnpm test`: 92 파일 · 968 통과 · 6 todo(전 963 + 새 5)
- `pnpm check:deps`: 위반 0(225 모듈)
- `pnpm build`: 통과
- `pnpm seed:validate`: 922 칸 통과 · 실패 0 · 경고 1. 경고는 회화 1단계 sentence-words 분포로, 전부터 있던 것이다.
- `pnpm check:bundle`: 위반 0
- `pnpm check:ids`: 바꾼 파일의 보고 0(전체 46 줄은 다른 파일 — 보고만)
- `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`: 종료 0. unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 16(P12 몫)이다.
- e2e: 바꾸지 않았다. 기존 AC-19i e2e 셋은 그대로 맞는다. 셋 다 '시작!' 화면에서 창이 보인 뒤 대신 표시 사건 한 번을 기다리고, 그 사건은 마이크 판정 뒤 want 에서 난다. 다만 이 Mac 에서 돌리지 않았다(CI 몫).

## 정한 것
1. 보관 조각의 몸을 React 밖(`createLayerHost`)으로 뺐다.
   - 까닭: 단위 환경(node)에서는 효과가 돌지 않는다. 그래서 브리프가 요구한 'want 전 · 뒤' 단위를 쓰려면 이 길이 가장 작다.
   - 덤: M-4 의 보관 조각 ref 둘도 단위로 덮였다.
   - 동작은 그대로다: 설정이 바뀌면 지금 차례를 풀고 새로 만들고, 사라지면 풀기 한 번이다.
2. 크기 0 판정은 장마다 getBoundingClientRect 를 읽지 않는다. ResizeObserver 가 부르는 `resize()` 의 같은 값을 쓴다. 문서에서 떨어진 경우는 `isConnected` 로 함께 본다. ResizeObserver 가 떨어짐을 알리는지는 브라우저마다 기대지 않았다.
3. `data-teacher-frames-at` 에는 rAF 시각을 적는다. performance.now 를 따로 부르지 않았다. rAF 시각이 같은 시간축이고 그 장을 센 때다.
4. next.config 는 structure.ts 를 상대 경로로 가져온다. Next 16 의 next.config.ts 가져오기 고리가 TS 파일을 받는 것을 빌드 · `next start` 로 확인했다. structure.ts 는 가져오는 것이 없는 모듈이다.
5. 마이크 판정 끝 표시는 `micChecked` 상태 하나로 했다. 쉼(`resting`)은 첫 그림부터 스냅숏 값이라 따로 기다리지 않는다.

## 요청하는 변경
- 없음(공용 파일 · 정본 · plan 은 손대지 않음).
- plan 값 14 글 '(teacher 가 생기면('시작!' 화면부터)'(plan.md:296)은 이제 '창이 처음 보이면(want)'이 더 정확하다. 고칠지는 컨트롤러가 정한다.

## 남은 우려
1. 회화 틀의 `micChecked && windowShown` 차례는 단위로 덮지 못했다(React 효과). 막힘 · 쉼 화면에서 모델 요청 0 은 d9 3D e2e(AC-19f 요청 세기)에 한 줄 넣기를 권한다.
2. 크기 0 건너뛰기가 GPU 를 실제로 쉬게 하는지는 d10 iPad 실측 몫이다(AC-N11 점검표). 도움이 되는 것은 '시작!' 화면에서 오래 머물 때와 대화 중 막힘 · 쉼일 때다.
3. 작업 트리에 내가 바꾸지 않은 변경이 하나 있다: `specs/11-요구사항과-수용-기준.md` FR-8 줄(회화 턴 1~3단계 Sonnet, C112). 다른 작업의 것으로 보고 그대로 두었다. 커밋할 때 범위를 나눠야 한다.

## 화면 검토 손질(화면 검토 1 — I-1 · M-1~M-5 · M-7, 2026-10-23 15:4x)

바탕은 e8e7e5c 이다. 커밋 · push 는 하지 않았다. M-6(인식 확인 32px)은 브리프대로 하지 않았다(디자인 fix 2 몫).

### 고친 자리
- **I-1 가로 '선생님을 골라요'**(`src/components/teacher/teacher-choice.tsx`)
  - 가로(lg)에서만 장을 눕힌다: li · 누름 자리를 같은 칸 나눔 `lg:grid-cols-[176px_1fr]` 으로 둔다(:102 · :135).
    - 왼쪽 칸: 초상 128(`PORTRAIT_PX.landscape`, :32)과 그 아래 '인사 듣기'(:169 — 누름 자리와 같은 격자 칸 1 에 겹쳐 아래 끝에 둔다).
    - 오른쪽 칸: 이름 · 성격 칩 · 소개.
  - '인사 듣기'는 여전히 누름 자리 밖 단추다(단추 안에 단추 없음). 누름 자리는 왼쪽 칸 아래를 그 자리만큼 비워 둔다(`lg:min-h-[200px]`). 초상은 세로용 160 · 가로용 128 둘을 두고 하나만 보인다. 주소가 같아 요청은 하나다.
  - 종이 판: `lg:py-8 · lg:gap-6`, 장 사이 `lg:gap-6`. 가로에서 종이 판 너비 상한을 풀었다(`lg:max-w-none`, :82).
    - 까닭: max-w-4xl 이면 오른쪽 글 칸이 약 160px 이라 소개 한 줄(약 310px)이 네 줄로 접힌다.
    - 풀면 글 칸은 약 262px 이고, 소개는 미나 세 줄 · 리오 두 줄이다.
  - 세로 꼴은 그대로다(두 칸 나란히 · 초상 160 · py-10 · gap-8).
- **M-1 세로 창**
  - `TEACHER_WINDOW_PX.portrait` 200 × 240 → 200 × 200, `WINDOW_SIZE_CLASS` 를 같은 글자로 바꿨다(`teacher-window.tsx:26 · :29`). 가로 260 × 300 은 그대로다.
  - 회화 틀 창 줄은 `items-start` → `items-stretch` 로, 목록 포스트잇이 창과 같은 높이다(`talk-frame.tsx:1134`).
- **M-2 3D 구도**: `FRAMING = { top: 0.045, belowHead: 0.15, width: 0.34 }`(`avatar-3d.ts:42`). top 은 그대로다.
- **M-3 말하기 테**
  - 퍼지는 물결(animate-ping, 2배)을 지웠다. 창 밖 8px(`-inset-2`) 테 하나가 제자리에서 깜빡인다(`motion-safe:animate-pulse`, `teacher-window.tsx:80-91`).
  - 움직임 줄이기면 멈춘 테다. e2e AC-19h 이름의 '물결'은 '말하기 테'로 바꿨다.
- **M-4 칩 칸**: 두 줄 최소 높이 `min-h-[82px] content-start`(:153 — 칩 37px × 2 + 줄 사이 8). 세로 · 가로 모두 소개 줄이 같은 높이에서 시작한다.
- **M-5 세로 '시작!'**: 목록이 없으면 창 줄을 가운데 정렬(`!panelShown && "justify-center"`, 가로는 `lg:justify-start`, `talk-frame.tsx:1134-1135`).
- **M-7 한 장**: 보일 선생님이 하나면 `col-span-2 justify-self-center w-[calc(50%-16px)] lg:w-[calc(50%-12px)]`(:105). 두 장일 때와 같은 너비로 가운데 둔다.

### 덮는 시험
| 파일:줄 | 이름 |
|---|---|
| tests/e2e/teacher-choice.spec.ts:195 | (새) AC-19b 가로 1180 × 820 에서 '선생님을 골라요'의 큰 단추 · 안내 줄이 보는 창 안이고 장은 누운 꼴(왼쪽 초상 · 그 아래 '인사 듣기', 오른쪽 이름)이며 '인사 듣기'를 눌러도 고른 것이 아니다 |
| tests/e2e/teacher-choice.spec.ts:178 | (덧) 'AC-19b 영어 이름이 Mina 인 프로필…'에 장 하나 가운데 · 너비 단언(세로 · 가로) |
| tests/unit/teacher-window.test.ts:155 | (바꿈) AC-19c 선생님 창 크기는 화면 꼴 상수(가로 260 × 300 · 세로 200 × 200 — 화면 검토 1 M-1)와 같은 글자 클래스다 — 전에는 AC 번호가 없어 붙였다 |
| tests/unit/teacher-window.test.ts:133-139 | (바꿈) AC-19g 상태 표시 시험: 말하기 테는 animate-pulse · ping 없음 · -inset-2 |
| tests/e2e/teacher-window.spec.ts:637 | (이름만) AC-19h '말하기 테 · 점 셋' |

- e2e 는 이 Mac 에서 돌리지 않았다. 형 검사(tsc)만 지났고 CI 가 처음 돈다.

### 로컬 눈 점검(사진 — 정적 쪽, 시험 파일로 남기지 않음)
- 방법
  - 임시 단위 파일로 `ChildScreen` + `PaperBand` + `TeacherChoice` / `TeacherWindow` 를 renderToStaticMarkup 해 HTML 로 뽑았다.
  - 운영 빌드 CSS · next/font 를 붙인 정적 쪽을 Playwright chromium 으로 1180 × 820 · 820 × 1180 에서 찍고 재었다.
  - 임시 파일은 저장소에서 뺐다. 사진은 scratchpad `choice-*-*.png` · `window-*-*.png` 이다.
- '선생님을 골라요' 가로
  - 쪽 높이 820(넘침 없음), 장 506 × 266.
  - 큰 단추 y 535~591, 안내 줄 615~643. 화면 검토 계산 약 790 보다 작다.
  - '인사 듣기'(x 111~258)는 이름 칸(x 292~)과 겹치지 않는다.
  - 한 장은 가운데에 두 장일 때와 같은 506 너비다.
- 세로: 단추 807~863, 장 322 × 514 로 전과 같다.
- 창 줄 세로
  - 창 200 × 200 · 목록 516 × 200 으로 아래 끝이 같다.
  - '시작!'(목록 없음)은 창이 가운데(x 310)다.
  - 말하기 테는 216 × 216 으로 창 밖 8px 이다.
- 3D 구도(M-2)는 GPU 로 그려 보지 못했다. 로컬 `next dev` 관찰 쪽 '3D 보기' 눈 점검 또는 d9 · d10 사진 몫이다.

### 관문(Node 24 PATH)
- 통과: lint 436 파일, tsc 0, 단위 968 통과 · 6 todo
- 위반 없음: check:deps 위반 0, check:bundle 위반 0
- seed:validate: 922 통과 · 경고 1(전과 같음)
- build: 통과
- spec:trace: 종료 0, unknown-ac 0 · plan-ac-not-in-spec 0
- check:ids: 바꾼 파일에 design-number 두 줄(`teacher-choice.tsx:118` 체크 아이콘 strokeWidth 3, `teacher-window.tsx:156` 별 아이콘 strokeWidth 2.5)이 남는다. 둘 다 e8e7e5c 에 있던 줄이 자리만 옮긴 것이다(보고만).

### 정한 것
1. 눕힌 장에서 '인사 듣기'는 누름 자리와 같은 격자 칸에 겹쳐 둔다(`lg:relative` 로 위에 그려지고 따로 눌린다). DOM 을 바꾸지 않고, 누름 자리(초상 · 이름 · 성격 · 소개)와 그 밖 단추라는 구조를 지키는 가장 작은 길이다. e2e 가 '인사 듣기'를 눌러도 고른 것이 아님을 본다.
2. 가로 종이 판 너비 상한을 풀었다(위 까닭). 다른 화면 종이 판과 꼴이 달라질 수 있으나, 이 화면만의 클래스다.
3. M-3 은 검토가 낸 셋 가운데 '제자리 깜빡임'을 골랐다. 테 하나로 끝나고, 창 밖 8px 을 넘지 않으며, 움직임 줄이기 꼴도 그대로다.
4. 칩 칸 최소 높이 82px 은 화면 꼴 상수(칩 글 20px · leading-tight · py-1 · 테 2px 두 줄 + gap-2)이고 가로에도 둔다. 가로 글 칸이 좁아 두 장 모두 칩이 두 줄이다.

### 요청하는 변경(정본 · plan — 컨트롤러 판단)
- plan 값 13(plan.md:95 · :285)의 창 크기 제안 '세로 200 × 240' → 화면 검토 1 M-1 결정 '세로 200 × 200, 목록 같은 높이'.
- plan 값 10(plan.md:260)에 가로 눕힌 장(초상 128 · 왼쪽 '인사 듣기' · 오른쪽 글)과 한 장일 때 가운데를 더한다.
- 정본 4절 선생님 창 행(`specs/03-화면.md:78`)과 선생님 화면 spec(spec.md:107)의 '말하기는 창 둘레 물결'을 '창 둘레 테 깜빡임'으로 맞출지. 단위 AC-19g 시험 이름은 정본 글을 따라 '물결'로 두었다.
- 시제품 값이던 3D FRAMING belowHead · width 가 바뀐 것(plan 값 14 '상수는 시제품 값')은 d10 실측 때 함께 본다.

### 남은 우려
1. 가로 '선생님을 골라요'의 실제 쪽(회화 틀 안)은 CI e2e 가 처음 잰다. 정적 쪽의 띠는 흉내라서 실제 위 띠 높이가 다르면 수치가 조금 다르다. 단추까지 약 230px 여유가 있다.
2. 3D 구도 0.15 · 0.34 가 세로 200 × 200 창(안쪽 약 188 × 152)에서 머리 · 이름표와 겹치지 않는지는 GPU 눈 점검 전이다.
