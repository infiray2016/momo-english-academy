# 구현 브리프: P11a 차례 4 — 말하기 1~2 · 음성 공통 · 기기 알림(implementer impl-p11 이어 보기 · Opus · high, 2026-10-18 07:5x 작성 — 차례 3 검토 · fix · 커밋 뒤 보냄)

plan-p11a 작업 순서 5(검토 묶음 A4 — code-reviewer + design-reviewer, 목업 B_Speaking). 시작 조건: 차례 3 커밋 뒤 컨트롤러 알림. 워크트리 p11, 커밋 없음. 통합 · e2e 는 CI(가짜 음성 길 — P2b · P10 배치의 가짜 API 대본, 사진 `p11-speaking-<화면>-<방향>.png`).

## 먼저 읽을 것
plan-p11a **값 12**(말하기 조각 · 기기 알림) · 값 4(차례 1 `judge.ts` — `resultPhraseOf` · `judgeAppAnswer` · `answerShapeOf` · `speakingCounters` · `MIC_CAPTURE_STREAK`) · 값 7(틀 — 말하기 세션은 열 때 P10 `micUsable()` 아니면 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈', 세션은 진행으로 남음) · 정본 밖 문구 표('다시 듣기' · '알겠어요' · '한 번 더 듣기' + 4절 · 7절 문구 그대로) · 정할 것 마 (4) (5) · 자 · 위험 8 · 10 · 증명 표(AC-5b · 5c · 5e · 5f · N3 e2e 이름 글자 그대로). 정본 3.3 말하기 문단과 표(1~2단계), 4절 말하기 세션 행(결과 말 셋 · '한 번 더 말하기' 큰 · '다음' 작은 · 저절로 넘김), 7절 인식 규칙 표 전부 · 마이크를 쓸 수 없음, 12절 ui.* · speaking.* · speech.*, 13절 C38 · C39 · C53 · C56 (4) · C77 (4) (5) · C83 · C22. P10 `src/components/answer/repeat.tsx` · `src/lib/mic-state.ts`(`micUsable` · `markMicUnavailable` · `clearMicState` · `MIC_NOTICE_KEY`) · `src/server/placement/index.ts`(`recordPlacementMicAlert` 803~ · `seedHomophones` 213~) · P2a `src/core/speech/listen.ts` · `src/lib/speech/*`(`SpeechPort` · 대본) · P9 `AI_ALERT_KINDS` 꼴 · `tests/e2e/placement.spec.ts`(가짜 음성 길 · `speechPage` 픽스처) · 차례 2 서버 `src/server/session/index.ts`(동음이의어 읽기 두 벌 — 장부).

## 이번 몫(파일 — plan 표 A4 행)
- `src/server/alerts/device.ts`(신규, `server-only`) — `recordDeviceAlert({ kind: "mic_unavailable" | "mic_stalled" | "speech_silent", code, browser })`: P10 `recordPlacementMicAlert` 몸통을 옮김(`createAlertOnce` once day · 값 `{ code, browser }`). `src/server/placement/index.ts` 의 `recordPlacementMicAlert` 는 이것을 부름(동작 같음). **동음이의어 읽기도 한 곳으로**(장부 — 세션 · 배치 두 벌 → 공용 모듈 하나, AI 층에 닿지 않게).
- `src/server/actions/session.ts` — `reportSessionMic`(첫 문장 `await requireAccess()`) → `recordDeviceAlert`.
- `src/components/session/speaking.tsx`(신규, 'use client') — 값 12: 따라 말하기(목표 24px · 들어올 때 한 번 읽기 · '다시 듣기' · '말하기' → `listen(endRuleFor(한 문장))` → 인식 글을 아이 말 칸에(틀린 낱말 표시 없음) · 결과 말 셋 · 'good' 이면 ui.auto_next_seconds 뒤 저절로 다음 · 아니면 '한 번 더 말하기'(큰) · '다음'(작은) · 횟수 상한 없음 · 점수는 가장 높은 일치율 · 실패는 '다시 한 번 말해 볼까요' + 셈) · 듣기 이해(대본 한 번 읽기 · '다시 듣기' · 보기 · 처음 틀리면 '한 번 더 듣기' → 정답 표시, 대본 글 안 보임) · 질문 답 1~2단계(영어 질문 읽기 → `showKo` 한국어 뜻 · '말하기' → `judgeAppAnswer` → '잘 말했어요' + '다음' / 다시: `modelAnswer` 영어 줄 보이며 들려주고 '같이 말해 볼까요' → 한 번 말하면 결과 말 없이 다음 · 판정 글자 안 보임) · 처음 마이크 안내(`MIC_NOTICE_KEY` 공유) · 막힌 안내 셋(값 12 문구, 세션은 진행으로 남음, 알림 종류 셋) · network 안내(같은 활동).
- 틀 — 말하기 세션 마이크 문(값 7) · 활동마다 조각 연결 · `speakingCounters` 로 셈(차례 1) · 끝 시도 꼴(`heard` · `failures` · `skipped` · `echo`).
- 시험 `tests/e2e/speaking.spec.ts`(이름 글자 그대로 — plan 증명 표 AC-5b 1단계 몫 · AC-5c · AC-5e(4단계는 1단계 수업 복제) · AC-5f e2e 셋 · AC-N3 넷) · 필요하면 통합(알림 한 줄 · once day).

## 함께 닫을 작은 것
- 코드 검토 A3 M-1(`review-p11-3-code.md`): `src/core/answer/expected.ts` `displayCardsOf` 가 첫 허용 정답만 봐서 시드 카드가 소문자인 조립 문항의 둘째 허용 정답을 화면으로 못 냄 → 허용 정답 모두를 보고(카드가 어느 정답에든 대문자 꼴로 들어가면 정답 꼴), 둘째 허용 정답이 있는 문항 단위 시험 하나.
- 코드 검토 A3 범위 밖 관찰: P10 배치 평가의 조립 문항(`src/components/answer/tiles.tsx` · 배치 흐름)이 시드 카드를 그대로 그려 같은 결함이 남음 → 배치도 `displayCardsOf` 로 카드를 보인다(판정 그대로). P12 평가 화면은 장부로.

## 지킬 것
설계 숫자는 설정에서(결과 말 경계 · 저절로 넘김 · 일치율 기준 · 재시도 · 말소리 없음 · 상한 초) — 화면은 `loadSessionView` 의 config 로 받음. 녹음 없음(`getUserMedia` · `MediaRecorder` 없음). 인식 글은 채점에만 서버로. 알림 값에 인식 글 없음(code · browser 만). 아이 화면 원칙 · 문구 글자 그대로 · 판정 글자 없음(AC-5d) · 퍼센트 없음. `check:deps` · `check:bundle` · `check:ids` 새 줄 없음. 보고 `task-p11-report.md` '차례 4' 절 → SendMessage → CI → 검토 A4. 차례 4 가 끝나면 P11a 끝(차례 5~9 는 b · c) — 보고에 'P11a 완료 보고에 넣을 것'(계획과 다르게 한 것 전부 · 남긴 것)을 한 절로 모아 달라.
