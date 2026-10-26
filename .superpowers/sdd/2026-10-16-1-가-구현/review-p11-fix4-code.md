# 코드 재검토: P11a 차례 4 fix 4 — '말하기' 단추 조각 · 막힌 안내 '홈' 하나 · 듣기 가로 칸 · 안내 줄 · 글 크기(code-reviewer rev-p11b · Opus · xhigh, 2026-10-22 — rev-p11 이어 봄)

대상: 워크트리 `.claude/worktrees/p11`(HEAD b648c8c) 작업 트리 가운데 fix 4 몫 — 새 `src/components/answer/speak-button.tsx`, `src/components/answer/repeat.tsx`(P10 배치) · `src/components/answer/choice.tsx`(`compact`) · `src/components/session/speaking.tsx`(안내 줄 · 글 크기 · 단추) · `src/app/(child)/session/[id]/session-frame.tsx`(막힌 안내 '홈' · 띠 '홈' 숨김) · `tests/e2e/speaking.spec.ts`(새 단언 · 사진). 가름은 구현 보고 `task-p11-report.md` '차례 4 fix 4' 절(426~445행).
대조: 검토 브리프 `task-p11-review-fix4-code.md` (1)~(5), 앞 코드 검토 `review-p11-4-code.md`(M-1 · M-2), 화면 검토 `review-p11-4-design.md`(I-1 · M-1~M-3), plan-p11a 값 7(156행) · 값 12 막힌 안내(168행) · 정본 밖 문구 표 말하기 1~2 안내 줄(메인 저장소 184행 — 워크트리 사본에는 아직 없음), 정본 7절 '말하기 버튼' 행(26행) · '오류' 행(29행) · '마이크를 쓸 수 없음' 행(31행), 4절 크기 하한, 13절 C83.
직접 확인한 것: `pnpm check:deps` 위반 0(모듈 154 — 새 파일 하나만큼 늘어남) · `pnpm check:bundle` 위반 0 · `pnpm check:ids` code-setting-unknown 0 · design-number 35(차례 4 와 같음, fix 4 파일에서 나온 줄 0). 단위 · e2e · 통합은 다시 돌리지 않았다(구체적 의심 없음, CI 8차 run 39081857257 전부 성공).

## 판정: Approved — Critical 0 · Important 0 · Minor 3

## 0. 앞 지적 닫힘 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| 화면 I-1 듣는 동안 변화 없음 | **ADDRESSED** | `speak-button.tsx:62-86` 듣는 동안 단추 안쪽 분홍 테(`border-postit-speaking`) · 둘레 conic 고리 · `data-listening` · `aria-pressed`. 고리는 `capAt`(P2b `ListenHandle.capAt`, `browser.ts:404` — `windowStartAt + rule.capMs`, 한 문장 규칙은 `capMs = settings.maxListenMs`, `listen.ts:98-103`)과 누른 시각으로만 잰다(`speak-button.tsx:41-60`). 박힌 설계 숫자 없음(`FULL_TURN_DEG` 는 기하 상수). 세션 세 활동(`speaking.tsx:230` · `:242` · `:491`)과 배치(`repeat.tsx:155-161`)가 같은 조각 |
| 화면 M-1 · 코드 M-1 막힌 안내 '홈' 둘 | **ADDRESSED** | 띠 '홈'은 `blocked` 동안 그리지 않고(`session-frame.tsx:679-683`), 몸통 큰 '홈'이 같은 `home()`(대기열 비우기 · `leaveSession`)를 쓴다(`:662-664`). `home()` 은 `onFirstActivity: !blocked && …`(`:503`)라 막힌 동안에는 첫 활동이어도 지우지 않는다. 서버는 `onFirstActivity` 가 거짓이면 아무것도 안 한다(`src/server/session/index.ts:775`). 7절 31행 '세션을 진행으로 둔 채 … '홈' 버튼 하나' · plan 값 7(156행) '열 때 … '홈'만 · 세션은 진행으로 남음'과 맞음. 시험은 M-1 참고 |
| 화면 M-2 가로 듣기 '다음' 걸림 | **ADDRESSED** | `choice.tsx:141-143` `compact` 그림 보기는 가로에서 그림 112px · 위아래 여백 4px. `compact={instant}`(`:265`)이고 `instant` 를 넘기는 곳은 세션 듣기 이해(`speaking.tsx:314`)와 쓰기 pick-word(`writing-items.tsx:178`)뿐인데 pick-word 보기는 글(`display.ts:104` `texts`)이라 `choice.kind === "picture"` 조건에 걸리지 않는다. 배치는 `instant` 를 넘기지 않아 그대로. `ChildScreen` 은 안쪽 스크롤 없이 문서가 늘어나는 꼴(`board.tsx:50-57` `min-h-dvh`)이라 e2e `fitsBothWays`(`speaking.spec.ts:174-186` `scrollHeight ≤ 보는 창 높이`)가 넘침을 실제로 잡는다(CI 8차 초록) |
| 화면 M-3 안내 줄 · 크기 | **ADDRESSED** | 안내 셋 `speaking.tsx:51-55` 글자가 plan 정본 밖 문구 표 말하기 1~2 행(메인 저장소 plan-p11a 184행)과 같다. `GuideLine` 20px(`:211` · `:307` · `:466`). 따라 말하기 목표 36px(`:214`) · 질문 28px(`:468`) — 4절 영어 24px 하한 위. `cn` 은 tailwind-merge 꼴이라 `text-2xl` 을 덮는다. 줄인 그림 보기 단추는 112px + 여백이라 56px 누름 하한 위, 그림 없음 대체 글은 보기 글 24px 를 물려받음(22px 하한 위) |
| 코드 M-2 완료 보고 모음 보충 | **ADDRESSED** | `task-p11-report.md:385` · `:393` 이 '처음 오답 ✕ 남김(컨트롤러 결정)'으로 고쳐졌고, `:460-463` 에 차례 1 꿰맞춤 · 계획 표 밖 시험 파일 · 사진 아티팩트 공용 변경 · C83 이 들어갔다. fix 4 몫이 이 모음에 없는 것은 새 M-3 |

## 1. 설계 준수(브리프 볼 것)

| 볼 것 | 판정 | 근거 |
|---|---|---|
| (1) 단추 조각 — 듣는 중 · 남은 시간 고리 · 다시 누르면 끝 | ✅ | 위 I-1. 다시 누름은 부르는 쪽 `listen()` 이 `handle.current.press()`(`speaking.tsx:83-86` · `repeat.tsx:72-76`) — 7절 26행 그대로. `handle` 은 `setListening(true)` 와 같은 처리 안에서 잡혀 효과가 돌 때 이미 있다 |
| (1) P10 배치 동작 그대로 | ✅ | `repeat.tsx` 변경은 그리기뿐이다. `listen()`(두 시도 `repeat.tries` · 실패 셈 · `MIC_CAPTURE_STREAK` · `repeat-failed` → 예비 문항)은 한 줄도 안 바뀌었다. 단추 이름 '말하기' · `data-speak` · `aria-pressed` · `disabled` 그대로. 배치 몫으로 바뀌는 것은 듣는 동안의 꼴(테 · 고리 · `data-listening`)뿐이고, 이것은 화면 검토 I-1 이 배치에도 건 것이다. CI 8차 배치 e2e 초록 |
| (1) c 의 '다 말했어요' 자리 | ✅ | `listeningLabel`(`speak-button.tsx:27` · `:83`). 7절 26행 · C37 |
| (2) 막힌 안내 '홈' 하나 · 세션 행 안 지움(첫 활동에서도) | ✅ | 위 M-1 행. 코드로 확인 — e2e 는 첫 활동 갈래를 지나지 않는다(새 M-1) |
| (2) 띠 '홈' 숨김이 다른 화면에 새지 않음 | ✅(빈틈 하나) | `blocked` 는 이 틀의 지역 상태라 다른 화면 · 결과 틀 · 배치에 닿지 않는다. 같은 틀 안에서 끝내기 실패와 겹칠 때 '홈'이 없어지는 빈틈은 새 M-2 |
| (3) 가로 칸 · 안내 줄 · 크기 ↔ AC-N9 · 24px 하한 | ✅ | 위 M-2 · M-3 행. P11 화면의 `font-size.spec` AC-N9 훑기는 차례 10 몫(보고 468행)이라 지금은 코드로만 맞댐 |
| (4) 새 e2e 단언이 거짓 초록인가 | ⚠️ 일부 | `[data-speak][data-listening]`(`speaking.spec.ts:289`)은 fix 전에는 없던 자리(단추 위)라 참 단언이다. `fitsBothWays` 셋(`:326` · `:342` · `:348`)도 문서 높이를 재 참 단언이다. 처음 오답 ✕ 고정(`:329-330`) · 듣기 점수 기대값(`:375-377`)도 참. 다만 AC-5c '홈 → 진행'(`:413-416`)과 고리 단언(`:290-293`)은 고친 동작을 가르지 못한다(새 M-1) |
| (5) check:deps · check:bundle · check:ids 새 줄 | ✅ | 위 '직접 확인한 것' |

## 2. 잘한 점

- **단추 조각이 수를 갖지 않고 P2b 손잡이의 상한 시각만 읽는다.** 상한이 `speech.max_listen_seconds`(한 문장)이든 `speaking.answer_max_seconds`(두 문장 이상, c)든 고리는 같은 길로 줄어들어, c 가 조각을 고치지 않고 쓸 수 있다. 고리 바깥 여백(`p-1.5`)을 듣기 전에도 잡아 두어 듣기가 시작될 때 단추가 밀리지 않는다.
- **'홈'을 하나로 묶으면서 7절의 '세션은 진행으로'를 서버 계약 그대로 지켰다.** 새 길을 만들지 않고 `onFirstActivity` 한 칸에 `!blocked` 를 더해, 대기열 비우기는 살리고 지우기만 막았다.
- **줄인 그림 칸을 세션 듣기 이해에만 닿게 좁혔다.** `instant` 와 `choice.kind === "picture"` 두 조건이 겹치는 곳이 세션 듣기 이해뿐이라 배치 · 쓰기 pick-word 의 화면이 그대로다.
- **가로 넘침을 사진이 아니라 수로 지킨다.** `fitsBothWays` 가 고른 뒤 세 단계(처음 틀림 · 정답 보기 · 맞음)에서 문서 높이를 두 방향으로 재, 화면 검토가 사진 치수로 짐작한 넘침을 선 위 검증으로 바꿨다.

## 3. 지적

### Minor

**M-1. 새 e2e 단언 둘이 고친 동작을 가르지 못한다**
- 무엇이: (가) AC-5c 의 "'홈'을 눌러도 세션은 진행으로 남는다"(`tests/e2e/speaking.spec.ts:413-416`)는 다시 열기 뒤에 누른다. 그때는 미리보기 끝 시도가 이미 있어(`session-frame.tsx:351-354` 병합 → 지금 활동 2) 고치기 전 코드로도 `onFirstActivity` 가 거짓이고, 서버도 시도가 있으면 지우지 않는다(`src/server/session/index.ts:792-797`). fix 가 바꾼 갈래는 plan 값 7(156행)의 '열 때 `micUsable()` 이 아니면'뿐, 곧 첫 활동 · 끝 시도 없음인데 이 갈래를 지나는 시험이 없다. `!blocked` 가 빠져도 이 시험은 초록이다. (나) 고리 단언(`:290-293`)은 `conic-gradient` 가 있는지만 본다. `capAt` 연결이 끊겨 고리가 늘 꽉 차도 초록이라, 7절 26행 '남은 시간이 줄어드는 표시'의 '줄어듦'은 시험이 지키지 않는다.
- 왜: 구현 보고 433행은 이 단언을 M-1 의 선 위 검증으로 든다. 코드는 읽어서 맞지만, 선 위 검증이 되돌림을 잡지 못하면 다음 손질(c 가 틀을 고칠 때)에서 조용히 깨질 수 있다.
- 어떻게: (가) 같은 시험 끝에서 이 기기가 '마이크를 쓸 수 없음'으로 남은 문맥 그대로 새 세션을 하나 더 넣고 열어, 미리보기에서 바로 막힌 안내가 뜨는지 · '홈'을 누른 뒤 세션 행이 있고 `in_progress` 인지 본다. (나) 듣는 동안 고리 style 의 각도를 두 번(수백 ms 간격) 읽어 둘째가 작음을 단언한다.

### 새로 깨뜨린 것

**M-2. 마지막 활동에서 말소리 없음으로 막힌 뒤 끝내기가 실패하면 '홈'이 하나도 없다**
- 무엇이: 마지막 활동이 말소리 없음(`speech-silent`)으로 건너뛰어지면 틀은 막힌 안내를 켜고(`session-frame.tsx:329-331`) 같은 때 조각의 `onDone` → `complete` → `finish()` 로 간다. 끝내기가 닿지 않으면 `finishPending` 이 켜져 몸통(막힌 안내와 그 '홈')은 그리지 않고(`:722`) 틀 '다음'만 보인다(`:670`). fix 4 전에는 띠 '홈'이 남아 있었는데, 이제는 `blocked` 라 띠 '홈'도 숨는다(`:679`). 아이 화면에 '홈'이 없다.
- 왜: 7절 29행 '말소리가 잘 안 들려요 …'와 '홈'을 보인다, plan 값 12(168행) '말소리 없음 → … · '홈''. '다음'(다시 끝내기)과 `online` 때 다시(`:369-375`)가 있어 막다른 길은 아니라 Minor 다. 말소리 없음이 `speech.silent_items_max` 개 이어진 끝이 마지막 활동이고 끝내기까지 실패해야 생긴다.
- 어떻게: 띠 '홈' 숨김 조건을 `blocked && !finishPending` 으로 하거나, 막힌 동안은 `finishPending` 이어도 막힌 안내 몸통을 그린다.

**M-3. 'P11a 완료 보고에 넣을 것' 모음에 fix 4 몫이 없다**
- 무엇이: 모음 절(`task-p11-report.md:447-473`)에 fix 4 가 만든 계획 밖 변경이 없다. (가) 계획 표 밖 새 파일 `src/components/answer/speak-button.tsx`. (나) P10 파일 `src/components/answer/repeat.tsx` 를 바꿔 배치 화면에도 듣는 중 꼴이 생긴 것(보고 437행에만 있음). (다) `ChoiceAnswer` 의 `compact`. (라) plan 정본 밖 문구 표에 말하기 1~2 안내 줄 행이 더해진 것(컨트롤러). plan-p11a 파일 표에는 `speak-button.tsx` 가 없다.
- 왜: 앞 검토 M-2 와 같은 까닭이다. P10 배치 화면이 P11 에서 바뀐 것은 P10 완료 보고와 다음 P(c 가 '다 말했어요'를 붙임)가 찾아야 할 사실이다.
- 어떻게: '계획 표 밖 파일' 줄에 (가)~(다)를, 값 12 줄에 (라)와 '배치 말하기 단추가 같은 조각'을 한 줄씩 더한다.

## 4. 판정

**Approved.** 화면 검토 I-1 · M-1~M-3 과 코드 검토 M-1 이 코드로 모두 닫혔다. 배치 동작은 듣는 중 꼴 밖으로는 그대로이고, 세 검사에 새 줄이 없다. M-1(시험 보강) · M-2(겹친 경우 '홈') 는 다음 차례나 c 와 함께, M-3 은 P11a 완료 보고를 쓸 때 닫으면 된다.

## 범위 밖 관찰(지적 아님)

- **마지막 활동의 말소리 없음은 막힌 안내를 잠깐 보인 뒤 결과 화면으로 간다.** 끝내기가 성공하면 `complete` → `finish()` 가 `/result` 로 옮겨(`session-frame.tsx:406-409`) '말소리가 잘 안 들려요 …'가 곧 사라진다. 7절 29행 말소리 없음 행은 '세션을 진행으로 둔 채'를 적지 않아 끝내기 자체는 어긋나지 않는다. 알림은 남으므로 부모는 안다. 차례 4 몫의 흐름이라 이번 범위 밖이다. 1-나 부모 화면 작업 때 아이 쪽 안내를 남길지 볼 만하다.
- **워크트리의 plan-p11a 사본에는 말하기 1~2 안내 줄 행이 아직 없다.** 메인 저장소 작업 트리의 plan 184행에만 있다. b648c8c 처럼 문서 가지와 맞출 때 함께 옮기면 된다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| review-p11-4-code M-1 막힌 안내 '홈' 둘 | **닫힘** | 위 0절 |
| review-p11-4-code M-2 완료 보고 모음 보충 | **닫힘** | 위 0절 |
| review-p11-4-design I-1 · M-1 · M-2 · M-3(코드 몫) | **닫힘** | 위 0절. 사진으로 보는 몫은 화면 재검토가 판정 |
| 새 M-1 · M-2 · M-3 | **아직 열림** | 위 3절 |
