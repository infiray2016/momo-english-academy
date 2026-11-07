# 코드 검토: P11a 차례 4 — 말하기 1~2 · 음성 공통 · 기기 알림(검토 묶음 A4) — code-reviewer rev-p11(Opus · xhigh, 2026-10-18 09:xx)

대상: 워크트리 `.claude/worktrees/p11`(HEAD b648c8c) 작업 트리의 변경 10 · 새 파일 4(`src/components/session/speaking.tsx` · `src/server/alerts/device.ts` · `tests/e2e/speaking.spec.ts` · `tests/integration/device-alert.test.ts`). 대조: 검토 브리프 `task-p11-review-4-code.md`(컨트롤러 결정 둘 — 듣기 이해 처음 오답 ✕ 고정 · 질문 답 화면에 인식 글 안 보임), 구현자 보고 '차례 4' 절 · 'P11a 완료 보고에 넣을 것' 절, plan-p11a 값 4 · 7 · 12 · 정할 것 마 (3)~(5) · 자 · 위험 8 · 10 · 증명 표, 정본 3.3 말하기 · 4절 · 6.2 · 7절 인식 규칙 표 · 12절 · 13절 C22 · C38 · C39 · C53 · C77 · C84.
직접 확인한 것: `pnpm check:deps`(위반 0) · `pnpm check:ids`(design-number 35, 차례 4 파일에서 나온 줄 0) · `pnpm check:bundle`(위반 0). `src` 에 녹음 API(`getUserMedia` · `MediaRecorder`) 사용 없음(주석 한 줄뿐). e2e 이름 열을 plan 증명 표 글자와 기계 대조했다(열 모두 같음, 빠진 것 0). e2e · 통합은 다시 돌리지 않았다(CI 7차 run 39080614985 전부 성공).

## 판정: Approved — Critical 0 · Important 0 · Minor 2

## 1. 설계 준수

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 따라 말하기(값 12 · C77 (4) · 4절 · C39) | ✅ | `speaking.tsx` `RepeatActivity`: 목표 영어 줄 · 들어올 때 한 번 읽기('다시 듣기' `SoundButton` autoPlay) · 한 문장 끝 규칙(`endRuleFor(one-sentence)`) · 인식 글을 아이 말 칸에(틀린 낱말 표시 없음) · 결과 말 `resultPhraseOf(rate, ui.match_phrase_levels)` · 'good' 이면 `ui.auto_next_seconds` 뒤 저절로 다음 · 아니면 '한 번 더 말하기'(큰) · '다음'(작은), 상한 없음. 결과 말 일치율은 서버 `repeatResult` 와 같은 `bestMatchRate([목표], 인식 글, any-word)` 다(위험 2) |
| 듣기 이해(C77 (3) · 컨트롤러 결정) | ✅ | `ListeningActivity`: 대본은 소리로만(글 안 보임) · 고르면 바로 채점 · 처음 틀리면 정답은 숨기고 고른 오답 ✕ · '한 번 더 듣기'는 답 조각을 새로 그려 대본을 다시 읽고 처음 오답은 ✕ 로 남아 고를 수 없음(`struck`) · 둘째 뒤 정답 ✓ 와 '맞았어요!' 또는 '정답은 이거예요' |
| 1~2단계 질문 답(C38 · C39 · C77 (5) · AC-5d · 컨트롤러 결정) | ✅ | `QuestionAnswerActivity`: 영어 질문을 읽은 뒤 `showKo` 면 뜻(읽기가 안 되는 기기면 바로) · 첫 인식 글을 `judgeAppAnswer` 로(서버 `questionResult` 와 같은 함수 · 같은 첫 글) · 맞으면 '잘 말했어요' + '다음'(저절로 안 넘김) · 다시면 바른 답 문장을 영어 줄로 보이며 들려주고 '같이 말해 볼까요' → 한 번 말하면 결과 말 없이 다음(`echo`). 판정 글자 · 인식 글은 보이지 않는다. 앱 판정 단계(`appJudged`)에서만 이 조각을 쓴다(`session-frame.tsx` `recorded`) |
| 처음 마이크 안내 · 막힌 안내 · network | ✅(Minor 하나) | 안내 문구 · '알겠어요'는 plan 표 글자 그대로이고, P10 `MIC_NOTICE_KEY` 를 같이 쓴다(`micNoticeSeen` · `markMicNoticeSeen`). '알겠어요'에서 `unlockFromGesture()` 를 부른다. 막힌 안내 셋 문구는 7절 그대로이고 세션은 진행으로 남는다. network 는 '인터넷이 끊겼어요 …'만 보이고 실패 수에 들지 않는다. 막힌 화면의 '홈' 둘은 M-1 |
| 인식 셈 연결(값 4 · 7절) | ✅ | 틀이 `speakingCounters` 를 쥐고(`onSpeech`) 조각은 판정만 받는다. 활동이 바뀔 때(`complete`) `next-activity` 를 넣어 활동 몫만 지우고 세션 몫('여섯 번' · 말소리 없음 이어짐)은 잇는다. 판정 → 화면: retry '다시 한 번 말해 볼까요' · skip 은 `skipped: "recognition"` 끝 시도 · speech-silent 는 `skipped: "silent"` 끝 시도 + 막힌 안내 · mic-unavailable 은 기기 상태(`markMicUnavailable`) + 막힌 안내 · mic-stalled 는 막힌 안내(활동을 남기지 않음 — 다시 열면 그 활동). 건너뛴 끝 시도는 서버가 점수 · 단어별 정오를 내지 않는다(차례 1 결정 1, e2e AC-N3 aborted 가 `score: null` 을 단언) |
| 기기 알림(값 12 · 정할 것 자 · C22 · C56 (4)) | ✅ | `src/server/alerts/device.ts` `recordDeviceAlert`: strict 꼴(종류 셋 · code · browser), `createAlertOnce` once day, 값은 code · browser 만. 배치 `recordPlacementMicAlert` 는 마이크 두 종류만 거른 뒤 같은 함수를 부른다(동작 같음). `reportSessionMic` 첫 문장 `await requireAccess()`. 통합 `device-alert` 가 종류마다 한 번 · 다음 학습일 다시 · 값 · 모르는 종류와 다른 칸 거부를 본다 |
| 동음이의어 공용(장부) | ✅ | `src/server/seed-lists.ts` `seedHomophones()` 한 곳에서 세션 · 배치가 가져온다. 그 모듈은 `@/server/ai` 를 가져오지 않는다. check:deps · check:bundle 위반 0 |
| A3 M-1 · 배치 카드 표시 · '대문자' 자리 | ✅ | `displayCardsOf` 가 허용 정답 전부에서 모은다(새 단위 사례 — 이름 자리를 바꾼 두 정답을 화면이 낼 수 있는 답으로 둘 다 맞음). 배치 조립 문항도 `displayItemOf` 에서 같은 카드 표시를 쓴다. 이것은 배치의 **표시만** 바꾸고 판정(`checkAnswer`)은 그대로라 C84 '화면은 … 정답 꼴로'의 범위 안이다. '대문자' 단추는 `slots` 조립에서만 처음부터 자리를 잡고 첫 카드 전에는 꺼진다. 배치(`slots` 없음)는 첫 카드 아래 그대로다. `ChoiceAnswer` 의 새 `struck` 은 기본 빈 목록이라 배치 동작이 그대로다 |
| 틀(값 7 · 위험 8) | ✅ | 말하기 세션을 열 때 `micUsable()` 이 아니면 막힌 안내(세션 진행). 첫 누름(미리보기 '다음' · 마이크 안내 '알겠어요' · '말하기')에서 `unlockFromGesture()` |
| 시험 | ✅ | e2e 열의 이름이 증명 표 글자 그대로다. 가짜 음성 대본은 시험 안에서 수업 문장으로 만들어 각 갈래(성공 · 경계 셋 · audio-capture · not-allowed · 멈춤 · aborted · no-speech · network)를 실제로 낸다. 결과 말 경계는 20낱말 목표의 19 · 14 · 10 낱말로 0.95 · 0.7 · 0.5 를 만들고, 시험 안에서 `TEST_SETTINGS` 경계와 먼저 맞대어 사례가 정말 그 구간에 드는지 확인한다. 큰 · 작은 단추는 글자 크기로 맞댄다. 끝 조용함은 가짜 기록의 start · stop 시각으로 잰다. 숫자는 `TEST_SETTINGS` · DB 규격에서 읽는다. 감시 타이머 시험은 약 36초를 60초 기다림 · 180초 상한 안에서 보고, 6차 경합(듣는 중 다시 누름)은 `data-listening` · `data-failures` 를 기다리는 `speak()` 로 막았다(CI 7차 초록) |
| 제약 | ✅ | 녹음 API 없음. 알림 값 · 로그에 인식 글 없음(`device.ts` 로그는 설정 키 · DB 태그만, 통합이 `heard` 칸을 거부함을 단언). 설계 숫자는 config 로 들어온다(새 상수는 단위 바꿈 `MS_PER_SECOND` 뿐). 용어 · 문구 글자 그대로. check:ids 새 줄 0 |

## 2. 잘한 점

- **인식 셈을 틀이 쥔 구조가 7절의 '활동 몫 · 세션 몫' 구분과 정확히 맞는다.** 조각이 셈을 따로 들면 '여섯 번'과 '말소리 없음 이어짐'이 활동을 넘어 이어질 수 없다. 틀이 쥐고 활동이 바뀔 때만 `next-activity` 를 넣어 차례 1 의 순수 함수를 그대로 살렸다.
- **CI 6차 실패를 화면 결함과 시험 결함으로 바르게 갈랐다.** 듣는 중의 누름이 듣기를 끝내는 것은 7절 동작이라 코드를 바꾸지 않았다. 시험이 듣기 끝(`data-listening`)과 실패 수(`data-failures`)를 기다리게 고쳤다. 저절로 넘김도 '그 전 일정 동안 머무르고 그 뒤 넘어감'으로 단언을 바꿔 시계 기준점 차이에 흔들리지 않는다.
- **결과 말 경계 시험이 사례가 정말 경계 안인지 먼저 증명한다.** 'word1 … word20' 의 앞 n 낱말로 일치율을 만들고 `matchRate` 와 `TEST_SETTINGS` 경계로 구간을 먼저 단언한 뒤 화면을 본다. 설정이 바뀌어 사례가 구간을 벗어나면 화면 단언 전에 실패한다.
- **동음이의어 두 벌을 AI 층에 닿지 않는 모듈로 모았다.** 차례 2 다르게 한 것 7 의 까닭(세션이 AI 기록을 가져오지 않게)을 지키면서 장부를 닫았다.

## 3. 지적

### Minor

**M-1. 막힌 안내 화면에 '홈'이 둘이고, 첫 활동에서는 둘이 세션을 다르게 다룬다**
- 무엇이: 막힌 안내는 몸통에 큰 '홈'(`BigLink href="/"`)을 둔다(`src/app/(child)/session/[id]/session-frame.tsx` 652~665 `if (blocked)`, 큰 '홈' 662). 그런데 위 종이 띠의 작은 '홈'(`SmallButton` → `home()`, 675~678)도 그대로 그려진다. 큰 '홈'은 세션을 건드리지 않는다. 작은 '홈'은 `leaveSession({ onFirstActivity: current === 1 && finals.size === 0 })` 이라, 말하기 세션을 열자마자 `micUsable()` 이 거짓이라 막힌 경우(첫 활동 · 끝 시도 없음)에는 세션 행을 지운다.
- 왜: 7절 '마이크를 쓸 수 없음' 행은 "세션 … 을 진행으로 둔 채 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈' 버튼 하나를 보인다"이고, plan 값 7 · 12 도 '안내와 홈만 · 세션은 진행으로 남음'이다. 한 화면에 '홈'이 둘인 것은 4절 '한 화면에 행동 하나'와도 어긋난다. 세션 도중에 막힌 경우(끝 시도가 있음)는 둘 다 세션을 남기므로 동작 차이는 열자마자 막힌 경우뿐이다. 그래서 Minor 다.
- 어떻게: `blocked` 동안 종이 띠의 '홈'을 그리지 않거나(몸통의 '홈' 하나), 몸통 '홈'과 같은 길로 묶는다. 7절 글자대로면 세션을 남기는 쪽이다. 화면 검토가 볼 자리이기도 하다.

**M-2. 'P11a 완료 보고에 넣을 것' 절에 빠진 것과 지금 코드와 다른 글이 있다**
- 무엇이: 검토 브리프 볼 것 8 이 묻는 '계획과 다르게 한 것 전부'에 견주면 다음이 없다. (가) 차례 1 의 `session-frame.tsx` 꿰맞춤(계획 표 밖, 차례 2 에서 다시 씀). (나) 계획 표 밖 시험 파일 — `tests/integration/session-start.test.ts`(P10 시험 기대값 고침) · `tests/unit/safe-error.test.ts` · `tests/unit/session-input.test.ts` · `tests/unit/answer-expected.test.ts`. (다) 컨트롤러 공용 변경인 사진 도우미 `tests/e2e/photos.ts` 와 `.github/workflows/ci.yml` 의 `E2E_PHOTOS` · 아티팩트. (라) '13절에 적힌 것'에 C84 만 있고 P11a 동안 적힌 C83(7절 · 12절 '다시 듣기' 글을 구현에 맞춤)이 없다. 또 차례 4 절의 '다르게 한 것 5'와 '정할 것 1'은 "처음 고른 오답 표시는 남기지 않는다"인데, 지금 코드는 컨트롤러 결정대로 ✕ 를 남긴다(`speaking.tsx` `struck`). 그 절이 그대로 완료 보고로 옮겨지면 틀린 글이 된다.
- 왜: plan '완료 보고 (Done)'는 구현 뒤 채우는 기록이고, 다음 P(b · c · P12)와 요청자가 그것으로 무엇이 계획과 달라졌는지 읽는다. 계획 표 밖 파일과 정본 변경(C83)이 빠지면 뒤에서 까닭을 다시 찾아야 한다.
- 어떻게: 위 (가)~(라)를 한 줄씩 더하고, '다르게 한 것 5' · '정할 것 1'을 '처음 오답은 ✕ 로 남김(컨트롤러 결정)'으로 고친다.

## 4. 판정

**Approved.** 말하기 1~2 · 음성 공통 · 기기 알림이 plan 값 4 · 7 · 12 와 7절 인식 규칙대로 돈다. 화면 판정과 서버 판정이 같은 함수이고, 배치 동작은 표시(C84) 밖으로는 그대로다. M-1 은 화면 검토와 함께, M-2 는 P11a 완료 보고를 쓸 때 닫으면 된다.

범위 밖 관찰(지적 아님): 세션 서버 액션 모듈(`src/server/actions/session.ts`)이 이제 `src/server/alerts/device.ts` 를 거쳐 `@/server/ai/store` 의 `createAlertOnce` 를 가져온다. `ai/store` 는 SDK 를 가져오지 않는 DB 기록 모듈이라 AI 호출 경로는 아니고 의존 규칙에도 걸리지 않는다. 다만 차례 2 에서 '세션이 AI 층에 닿지 않게' 동음이의어를 따로 둔 까닭과 결이 다르다. `createAlertOnce` 를 알림 공용 모듈로 옮기면 그 선이 다시 깨끗해진다. 1-나 알림 작업 때 볼 만하다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| 동음이의어 읽기 두 벌(차례 2 다르게 한 것 7) | **닫힘** | `src/server/seed-lists.ts` `seedHomophones` 하나를 세션(`src/server/session/index.ts`)과 배치(`src/server/placement/index.ts`)가 가져온다. 두 파일의 옛 정의는 지워졌다 |
| `displayCardsOf` 둘째 허용 정답(review-p11-3-code M-1) | **닫힘** | 허용 정답 전부에서 모은다(`src/core/answer/expected.ts`). 단위 '허용 정답이 여럿이면 …'이 두 정답 모두 화면이 낼 수 있는 답으로 맞음을 단언한다 |
| 조립 카드 표시 — 배치 · P12 평가 화면(review-p11-3-code 범위 밖 관찰) | **배치 몫 닫힘 · P12 몫 아직 열림** | 배치는 `displayItemOf` 가 `displayCardsOf` 를 쓴다(새 단위 사례). P12 의 단계 평가 · 복습 조립 화면은 아직 없다 — P12 가 같은 함수를 쓰면 닫힌다 |
