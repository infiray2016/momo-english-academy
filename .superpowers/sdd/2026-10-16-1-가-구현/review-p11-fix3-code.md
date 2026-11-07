# 재검토: P11a 차례 3 fix 3(화면 검토 A3 I 2 · M 4 고침) — code-reviewer rev-p11(Opus · xhigh, 2026-10-18 08:3x, 범위 한정)

대상: 워크트리 `.claude/worktrees/p11`(HEAD d798b6e) 작업 트리. fix 3 몫은 기준 커밋 2ba410e(차례 3 둘째 바퀴 CI 용)에서 파일마다 `git show 2ba410e:<파일>` 과 지금 파일을 맞대어 뽑았다. 일부 파일이 작업 트리에서 아직 추적되지 않아 `git diff 2ba410e` 로는 빠진 것처럼 보이기 때문이다. 바뀐 것은 `src/components/answer/{tiles,choice,typing}.tsx` · `src/components/session/{writing-items,reading}.tsx` · `tests/e2e/{writing,reading}.spec.ts` 일곱이다. `tests/e2e/session.spec.ts` 는 2ba410e 와 같다.
직접 확인한 것: `pnpm check:deps`(위반 0) · `pnpm check:ids`(design-number 35, fix 3 파일에서 나온 줄 0) · `pnpm check:bundle`(위반 0). 새 e2e 단언 셋은 CI 사진의 고치기 전(`scratchpad/p11-photos-3`)과 고친 뒤(`scratchpad/p11-photos-4`)를 맞대어 '고치기 전 코드에서도 초록인가'를 따졌다. e2e 는 다시 돌리지 않았다(CI 5차 run 39078060721 전부 성공, P10 배치 e2e 포함 — 컨트롤러 메시지).

## 판정: Approved — Critical 0 · Important 0 · Minor 0. 코드 검토 A3 Approved 를 깨지 않았다.

## 볼 것별

| 볼 것 | 판정 | 근거 |
|---|---|---|
| (1) P10 배치 동작 그대로(코드로) | ✅ | 배치 화면은 답 조각에 `item` · `level` · `speech` · `disabled` · `onAnswer` 만 넘긴다(`src/app/(child)/[area]/placement/placement-flow.tsx` 363~393). fix 3 의 바뀐 동작은 모두 넘기지 않으면 꺼지는 선택 속성 아래에 있다. **'다 놓았어요' 조건**: `needed` 가 없으면 `blanks` 가 fill-letters 빈칸 수 · 그 밖 undefined 그대로라 `full` 은 '빈칸 수와 같음 · 하나 이상' 그대로다(`tiles.tsx` 108~114). **빈 칸 꼴 · 뜻 크기 · '대문자' 자리**: 셋 다 `slots` 일 때만 바뀌고, 배치는 뜻 `GuideLine` · 첫 카드 아래 '대문자'(`!slots`) 그대로다. `widest` 는 계산만 되고 쓰이지 않는다. **pick-word 내기 단추**: `instant` 기본 거짓이라 고를 때 내지 않고 '다음'이 그대로 그려지며 바깥 꼴도 `flex flex-col gap-6` 그대로다(`choice.tsx`). **받아쓰기 단추 이름**: `submitLabel` 기본값이 `ANSWER_TEXT.next`('다음')다(`typing.tsx`) |
| (2) 새 e2e 단언 셋이 거짓 초록인가 | 셋 다 실함 | 아래 표 |
| (3) 구조 상수 꼴 | ✅ | 새 수는 화면 꼴 Tailwind 토큰(`text-[32px]` · `landscape:gap-4` · `landscape:grid-cols-[auto_1fr]`)과 기존 크기 묶음(`CHILD_SIZE.choice` · `.target`)뿐이다. 12절 설정에 닿는 수가 아니고, 결과 화면 제목의 `text-[32px]` 와 같은 꼴이다. 빈 칸 너비는 수가 아니라 '가장 긴 조각 글'을 숨은 글로 넣어 잡는다. check:ids 새 줄 0 |
| (4) check:deps · check:bundle · check:ids | ✅ | 위 '직접 확인한 것' |
| 세션 쪽 동작이 지적대로인가 | ✅ | `needed` 는 정답 조각 수(조립 = 카드 토큰 수, 타일 = 정답 글자 수, 빈 글자 채우기 = 빈칸 수, `writing-items.tsx` 218~221)이고, 다 차면 남은 타일을 더 놓을 수 없다(기존 `placed.length >= blanks`). 그림 고르기는 고르면 바로 내고 결과 단계에서는 `reveal` 로 보기가 잠긴다. 받아쓰기 내기는 '다 썼어요'(컨트롤러 결정)다. 조립 맞음 단계에서는 뜻 줄을 다시 쓰지 않는데, 뜻은 답 조각 위 `data-assemble-meaning` 에 `reveal` 과 관계없이 남는다 |
| 새 결함 | 없음 | 바로 내기에서 `onChange`(고른 것) 다음에 `onAnswer`(시도)가 불리므로 기기 저장소의 마지막 쓰기는 시도 쪽이라 되살리기가 맞다. `needed` 를 줄 때도 되살린 놓은 번호는 기존처럼 범위 · 겹침으로 걸러진다 |

### 새 e2e 단언 셋 — 고치기 전 코드에서도 초록인가

| 단언 | 판정 | 근거 |
|---|---|---|
| 빈 칸 너비가 모두 같다(`writing.spec.ts` `emptySlotsEven`, 처음 · 카드 하나 놓은 뒤) | 실함 | 고치기 전 빈 칸은 저마다 남은 조각 글로 너비를 잡았다(2ba410e `tiles.tsx`). 그래서 'kububa' · 'with' · '.' 처럼 길이가 다른 카드가 섞인 견본 3단계 첫 문항에서 너비가 달라 실패한다. 빈 칸이 하나 이상인지도 먼저 단언해 빈 목록의 참을 막았다 |
| 다 놓기 전에는 '다 놓았어요'가 꺼져 있다(`placeAll` · 조립 마지막 카드 앞 · 첫 문항 카드 하나) | 실함 | 고치기 전 조건은 글자 타일 · 조립이 '하나 이상'이라, 둘째 글자나 카드를 놓기 전에 이미 켜져 `toBeDisabled` 가 실패한다. 빈 글자 채우기(빈칸 하나)는 앞 조각이 없어 고치기 전에도 꺼져 있지만, 그 갈래는 원래 빈칸 수 조건이라 고칠 것이 없던 자리다 |
| 두 방향 모두 쪽 높이 ≤ 보는 창(`fitsBothWays`, 쓰기 첫 문항 맞음 · 읽기 정답 보기 · 맞음) | 실함 | 고치기 전 사진은 읽기 정답 보기 · 맞음 가로가 821px(1642 ÷ 2), 쓰기 1단계 맞음 가로가 857px(1714 ÷ 2)이었다. 화면이 `min-h-dvh` 라 문서 높이가 그만큼 커지므로 `scrollHeight ≤ 820` 이 실패한다. 고친 뒤 사진은 모두 보는 창 크기다. 읽기는 넘침이 1px 이었던 자리라 여유가 적다 — 뒤에 문항 칸에 줄 하나만 더해도 다시 넘칠 수 있다는 것을 화면 검토가 알고 있으면 된다(지적 아님) |

## 판정

**Approved.** 배치 길은 코드로도 그대로이고, 새 단언 셋은 고치기 전 화면에서 실패했을 자리를 정확히 본다. 차례 4 로 가도 된다. 코드 검토 A3 의 Minor(`displayCardsOf` 가 첫 허용 정답만 봄)는 fix 3 범위 밖이라 그대로 열려 있다(차례 4 몫).
