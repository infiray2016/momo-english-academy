# 구현 보고: UI · UX 묶음 2-다(검사, 2026-10-30 02:2x, 구현자 Opus · high)

상태: DONE_WITH_CONCERNS. 워크트리 p13d 의 커밋 전 변경 위에 고쳤고, 커밋 · push 는 하지 않았다.

## 규칙 정의
- **design-color**(`scripts/check-ids.ts:131 · 580`): `src/components` · `src/app` 의 .ts · .tsx 를 구문 트리로 읽고, 글 글자 · 틀 글자 조각에서 날값 색(#rgb~#rrggbbaa · rgb() · rgba() · hsl() · hsla()) · 기본 팔레트 색 클래스(변형 머리 · 진하기 · /투명도 포함, white · black 포함) · 코르크 토큰을 낸다. 주석 · JSX 글 · 자료에서 오는 값(명단 accent · room)은 글자가 아니라서 걸리지 않고, .css 는 훑지 않는다. 개발 도구 쪽(`src/app/dev/`, 시드 보기 · 음성 · 선생님 시험 화면)은 코르크만 본다. 시드 규칙이 아니라서 seed/ 가 없어도 돈다.
- **--design-number-max <수>**: 설계 숫자 경고 수가 상한을 넘으면 종료 1이다. 보고 줄에는 'design-number 상한 N'을, 넘으면 'design-number 상한 넘음: a > N' 줄을 적고, --json 에는 designNumberMax 를 싣는다. 0 이상 정수가 아니면 인자 오류(종료 2)다. CI_FAIL_ON 은 RULES 에서 design-number 를 뺀 목록이라 design-color 가 저절로 들어간다.
- **ci.yml**(42줄): `--fail-on <기존 아홉>,design-color --design-number-max 49`. 기준 값 49 는 작업 파일 인자에만 있고 시험은 정수 꼴만 본다. push 는 하지 않았다.
- **대비 공용 모듈** `src/core/color/contrast.ts`: contrastRatio(셈은 그대로) · parseHex · hexOf · textPixels(조상 층의 바탕색 · 흐림을 미리 곱한 색으로 겹쳐 글자 화소 · 바탕 화소를 냄) · nearestOpaqueLayer 가 있다. check-teacher 는 이 모듈을 가져와 쓰고, 같은 이름을 다시 내보내 기존 시험 둘(seed-teacher · teacher-window)이 그대로 돈다.
- **e2e**(`tests/e2e/child-size.ts:244 · 272 · 333`): childContrastProblems 는 브라우저에서 글자색과 조상 층을 1 × 1 캔버스로 읽고 Node 에서 공용 모듈로 7:1 을 잰다. 가장 가까운 불투명 바탕이 책상 토큰이거나 없으면 '글 바로 아래가 책상'으로 위반이다. 흐린 단추(:disabled · aria-disabled="true" 안)는 빼지만 data-choice-state 가 none 이 아닌 보기는 빼지 않고, 못 읽은 색도 위반으로 알린다. decorOverlapProblems 는 `[data-decor]` 상자와 뿌리 안 글(글자 줄 상자) · 누르는 것 상자의 겹침을 본다. childLookBothWays 는 크기 · 대비 · 겹침을 두 방향으로 돌리고, font-size.spec 의 열여섯 곳이 이 함수를 쓴다. 시험 이름은 'AC-N9 · AC-23e …'로 고친 문장이다. `playwright test --list` 로 모듈 풀림만 확인했다.

## 걸린 자리와 처리
- design-color 를 처음 돌렸을 때 55건이 나왔고, 모두 `src/app/dev/` 의 neutral · amber · blue · red · white 클래스였다. 아이 화면이 아니라서 위 규칙대로 뺐고, 지금은 0이다. 아이 화면 소스에 남은 날값 색은 없다.
- 흐림 글자 목록(2-나 검토 M1, 꼴 맞춤은 묶음 5 몫)은 아래와 같다.
  - **잡음**: choice.tsx:143 틀린 보기 70%, reading.tsx:367 고른 오답 70%(둘 다 disabled 이지만 data-choice-state 가 있음), speak-button.tsx:184 읽는 중 50%(disabled 아님).
  - **뺌**: writing-composition.tsx:513 · writing-guided.tsx:501 · access-code-form.tsx:86 의 disabled:opacity-60. 꺼진 단추라서 뺐고, 5.2 꼴(ink-off)이 아닌 점은 묶음 5 몫이다.

## 덮는 시험
- check-ids.test 'AC-23e (1) 식별자 대조 design-color …' · 'AC-23e (1) 식별자 대조 --design-number-max …'
- 저장소 시험(design-color 0)과 CI_FAIL_ON 단언
- ci-workflows.test 'check-ids … --design-number-max'
- ux-tokens.test 'AC-23e (2)' 넷(공용 함수 같음 · 층 겹침 · 흐림 70% < 7:1 · 가장 가까운 불투명 층)

## 관문(02:2x)
- `pnpm lint` 실패(오류 10): result-view.tsx · activity-progress.tsx · ux-home.test · ux-progress.test 로, 모두 다른 손의 파일이다. 내 파일 여덟은 biome 이 깨끗하다.
- `tsc --noEmit` 실패(오류 17): home.test(integration) · teacher.test(integration) · ux-home · ux-progress · ux-screen-feedback 으로, 내 파일에는 0이다.
- `pnpm test` 는 1282 통과, 실패 3(lesson-list-state AC-2d · ux-progress D-14 · ux-screen-feedback U2-1, 다른 손), todo 6이다. 내 시험 다섯 파일 79건은 통과한다.
- `pnpm check:deps` 는 위반 0이다.
- check:ids CI 꼴(design-color 포함 · --design-number-max 49)은 종료 0이고, design-color 0 · design-number 47(처음 잴 때 44, 다른 손이 고치는 중)이다.
- `pnpm spec:trace --fail-on unknown-ac` 는 종료 0이다.

## 우려(4)
1. 브리프는 check-teacher 를 '호출 한 줄'로 적었지만, 셈 정의 세 함수를 지우고 가져오기 · 다시 내보내기로 바꿨다(동작 같음은 함수 같음 단언으로 확인). WCAG 상수는 structure.ts 에 그대로 두고 공용 모듈이 가져온다.
2. '글 바로 아래가 책상' 규칙은 책상 위에 바로 놓인 제목 · 안내 글을 모두 잡는다. 11-01 뒤 첫 CI e2e 에서 font-size 시험이 이 줄로 실패할 수 있다(정적 작성이라 화면별 수는 모름).
3. font-size 경로는 틀린 보기 · 읽는 중 단추 상태를 지나지 않는다. 그래서 위 '잡음' 셋은 규칙만 있고 이 시험이 실제로 밟지 않는다. 그 상태를 지나는 e2e 에 childContrastProblems 를 붙일지는 묶음 5 가 정한다.
4. 대비 셈은 조상 사슬만 본다(형제 · 위치 지정 층 · 바탕 그라데이션은 보지 않음). 꾸밈 겹침은 지금 굴린 자리만 본다(고정 낙서가 쪽 아래 글과 겹치는지는 굴려 보지 않음). 기울어진 카드는 바깥 상자로 재서 넓게 잡힐 수 있다.
