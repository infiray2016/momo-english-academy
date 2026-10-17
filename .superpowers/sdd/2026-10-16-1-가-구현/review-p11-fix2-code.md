# 재검토: P11a 차례 2 fix 2(화면 검토 I 3 · M 5 고침) — code-reviewer rev-p11(Opus · xhigh, 2026-10-18 07:3x, 범위 한정)

대상: 워크트리 `.claude/worktrees/p11`(HEAD 7794633) 작업 트리. fix 2 몫은 첫 바퀴 검토 때 저장해 둔 diff 와 지금 diff 를 맞대어 뽑았다. 추적 파일 가운데 바뀐 것은 `src/components/activities/reading.tsx` · `src/app/(child)/session/[id]/session-frame.tsx` · `tests/e2e/session.spec.ts` 셋이다. 새 파일 `src/components/session/reading.tsx` · `tests/e2e/reading.spec.ts` 는 지금 내용을 읽었다. `src/components/activities/common.tsx` · `src/components/answer/choice.tsx` 는 바뀌지 않았다.
직접 확인한 것: `pnpm check:deps`(위반 0) · `pnpm check:ids`(design-number 35, fix 2 파일에서 나온 줄 0) · `pnpm check:bundle`(위반 0). 새 e2e 단언 셋은 CI 1차 사진(`scratchpad/p11-photos`, 고치기 전)과 2차 사진(`scratchpad/p11-photos-2`, 고친 뒤)을 맞대어 '고치기 전 코드에서도 초록인가'를 따졌다. e2e 는 다시 돌리지 않았다(CI 2차 run 39074646676 전부 성공, 컨트롤러 메시지).

## 판정: Approved — Critical 0 · Important 0 · Minor 1. 코드 검토 A2 Approved 를 깨지 않았다.

## 볼 것별

| 볼 것 | 판정 | 근거 |
|---|---|---|
| (1) 공용 조각 변경이 P5b 시드 보기 · P10 배치 · 평가 지문에 영향 없는가 | ✅ | `ReadingPassage` 에 더한 것은 선택 속성 셋(`onWordTap` · `openWord` · `renderPicture`)이고, 셋 다 없으면 그림 줄은 `VocabPicture` 그대로, 줄 높이는 `leading-relaxed` 그대로, 낱말 단추는 생기지 않는다(`reading.tsx` 97~101 · 183~187 · 156). 이 속성을 넘기는 곳은 `src/components/session/reading.tsx` 하나뿐이다. 다른 호출부 `src/components/answer/choice.tsx:163`(P10 배치 · 평가 문항)과 `src/app/dev/seed-viewer/cell-view.tsx:226`(P5b 시드 보기)은 넘기지 않는다. 가로 그림 칸 줄임(`landscape:[&_img]:size-28` 등)은 세션 조각의 `OptionButton` 클래스에만 있어 P10 `ChoiceAnswer` 와 무관하다 |
| (2) 새 e2e 단언 셋이 거짓 초록인가 | 둘은 실함 · 하나는 고친 것을 증명하지 못함(M-1) | 아래 표 |
| (3) 설계 숫자를 박았으면 구조 상수인가 | ✅ | 새 수는 화면 꼴 Tailwind 토큰(`size-28` · `leading-[2]` · `landscape:py-2` · `max-w-64`)뿐이다. 12절 설정 키에 닿는 수가 아니고, 로직이 쓰는 수가 아니며, 코드 안의 다른 화면 크기 토큰(`size-7` · `text-[32px]` …)과 같은 꼴이다. 쪽지 자리 계산(`session/reading.tsx` 169~193)에는 박힌 수가 없다. check:ids design-number 새 줄 0 |
| (4) check:deps · check:bundle · check:ids | ✅ | 위 '직접 확인한 것' |
| C77 (1) 흐름이 그대로인가 | ✅ | `stateOf` 는 처음 틀린 단계에서 고른 오답만 ✕ 이고 정답은 보이지 않는다(정답 표시는 둘째 고름 뒤 `reveal` 에서만). 해설을 다시 고르는 동안에도 남긴 것(M-2)은 처음 틀렸을 때 이미 보인 해설이라 새 정보를 주지 않는다. 다시 고를 때 처음 오답은 고를 수 없음 그대로 |
| 새 결함 | 없음 | 쪽지 바깥 누름 닫기는 낱말 단추 · 쪽지를 빼고 닫으므로 다른 낱말 누르기 · 같은 낱말 다시 누르기가 그대로다. `SafePicture` 는 `window.Image` 를 effect 안에서만 쓴다. 상태 줄은 `setStatus` 가 오류 글만 넣으므로 조건부로 그려도 빠지는 안내가 없다 |

### 새 e2e 단언 셋 — 고치기 전 코드에서도 초록인가

| 단언 | 판정 | 근거 |
|---|---|---|
| 가로에서 '한 번 더 풀기' · '다음' 아래 끝 ≤ 820(`tests/e2e/session.spec.ts` `withinLandscape`) | 실함 | 1차 사진 `p11-reading-level1-question-landscape.png` 는 문서 높이 969px(그림 2360 × 1938 의 절반)이고 '다음' 아래 끝이 약 840px 다. 그림 보기 아래 줄은 약 664px 라 보기를 누를 때 화면이 스크롤되지 않는다. 그래서 고치기 전 코드면 이 단언이 실패한다. 2차 사진은 모두 보는 창 크기(문서가 스크롤되지 않음)다. 단추를 누르기 전에 재므로 누름의 '보이게 스크롤'이 끼지 않는다 |
| 지문 그림 줄은 그림이 열렸거나 `[data-picture-missing]`(`session.spec.ts`) | 실함 | 1차 사진 `p11-reading-level1-passage-portrait.png` 에는 깨진 그림 표 둘이 보인다. 그 상태의 `<img>` 는 `naturalWidth` 0 이고 대체 상자가 없으므로 poll 이 끝내 거짓이다. 그림 줄이 하나 이상인지도 먼저 단언해 빈 목록의 `every` 참을 막았다. `VocabPicture` 는 src 가 없으면 `data-picture-missing` 상자를 그린다(`common.tsx:150~153`) |
| 첫 줄 마지막 글로서리 낱말의 쪽지가 활동 카드 안(`tests/e2e/reading.spec.ts` 84~105) | **고친 것을 증명하지 못함** | M-1 |

## 지적

### Minor

**M-1. 쪽지 자리 단언이 고르는 낱말은 왼쪽 맞춤이었어도 카드 안에 드는 자리라, 화면 검토 I-3 고침 없이도 초록이다**
- 무엇이: `tests/e2e/reading.spec.ts` 84~105 는 '첫 줄의 마지막 글로서리 낱말'을 눌러 쪽지가 카드 안인지 본다. 2차 사진 `p11-reading-word-note-right-portrait.png` 에서 그 낱말은 'modeba'(왼쪽 끝 약 588px)다. 쪽지 너비는 약 145px 이고 카드 오른쪽 끝은 약 780px 다. 고치기 전처럼 왼쪽 맞춤이어도 오른쪽 끝이 약 733px 라 카드 안이다. 첫 줄은 그 낱말 뒤에 마침표와 빈 자리가 남아 오른쪽 끝 낱말이 아니다.
- 왜: 이 단언은 I-3('오른쪽 끝 낱말 쪽지 잘림')을 선 위에서 지키려고 더한 것이다(구현 보고 fix 2 표 I-3 행). 지금 고른 낱말로는 align end · shift 를 지워도 초록이라, 뒤에 쪽지 자리 계산이 깨져도 잡지 못한다. 같은 사진의 둘째 줄 끝 'nedeba'(왼쪽 끝 약 656px)는 왼쪽 맞춤이면 약 801px 로 카드를 넘으므로 고친 것을 증명할 수 있는 자리다.
- 어떻게: 첫 줄 대신 **오른쪽 끝이 가장 큰 글로서리 낱말 단추**를 고르고, 누른 뒤 '왼쪽 맞춤이었다면 넘쳤다'는 앞 조건을 함께 단언한다. 예: `button.left + note.width > card.right` 가 참임을 먼저 보고 나서 지금의 카드 안 단언을 둔다. 앞 조건이 거짓이면 그 견본으로는 증명할 수 없다는 뜻이니 시험이 실패해야 한다. 가로 사진 앞뒤의 재기도 같은 낱말로 하면 된다.

## 판정

**Approved.** fix 2 는 공용 조각을 선택 속성으로만 바꿔 시드 보기 · 배치 · 평가 지문 길을 건드리지 않았다. 설계 숫자 · 의존 · 묶음 검사도 새 줄이 없다. M-1 은 시험 단언의 고를 낱말 하나라 막는 것이 아니다. 차례 3 브리프에 함께 실어 닫기를 권한다. 코드 검토 A2 의 Minor(이 기기에서 끝내지 않은 세션의 활동 안 입력)는 fix 2 범위 밖이라 그대로 열려 있다(차례 3 몫).
