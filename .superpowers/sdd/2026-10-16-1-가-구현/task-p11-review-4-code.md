# 검토 브리프: P11a 차례 4 코드 검토 — 검토 묶음 A4(code-reviewer rev-p11 이어 보기 · Opus · xhigh, 2026-10-18 08:3x 작성 — CI 초록 뒤 보냄)

워크트리 p11(HEAD b648c8c), 이번 몫 = `git status` 의 변경 · 새 파일 14(말하기 조각 `src/components/session/speaking.tsx` · `src/server/alerts/device.ts` · `src/server/placement/index.ts`(recordPlacementMicAlert → recordDeviceAlert · 동음이의어 공용 · 조립 카드 표시) · `src/server/actions/session.ts` reportSessionMic · 세션 서버(동음이의어 공용) · 틀(마이크 문) · `src/core/answer/expected.ts`(허용 정답 모두) · 타일('대문자' 자리) · e2e speaking.spec · 통합 device-alert · …). 구현 브리프 `task-p11-4.md`, 보고 `task-p11-report.md` '차례 4' · 'P11a 완료 보고에 넣을 것' 절, plan-p11a 값 12 · 4 · 7 · 정할 것 마 (4) (5) · 자 · 위험 8 · 10 · 증명 표. CI 결과는 컨트롤러 메시지. 코드를 고치지 않는다.

## 대조할 정본
3.3 말하기 문단과 표(1~2단계), 4절 말하기 세션 행(결과 말 셋 · '한 번 더 말하기' 큰 · '다음' 작은 · 저절로 넘김) · 세션 공통 · 부모 화면 알림(브라우저 이름과 시각), 6.2 끝 두 문단, 7절 인식 규칙 표 전부 · 마이크를 쓸 수 없음, 12절 ui.* · speaking.* · speech.*, 13절 C22 · C38 · C39 · C53 · C56 (4) · C77 (4) (5) · C83 · C84, AC-5b · 5c · 5d · 5e · 5f · N3.

## 볼 것
1. **값 12 조각** — 따라 말하기(목표 24px · 들어올 때 한 번 읽기 · '다시 듣기' · `listen(endRuleFor(한 문장))` · 인식 글 보임(틀린 낱말 표시 없음) · 결과 말 `resultPhraseOf`(ui.match_phrase_levels) · good 이면 ui.auto_next_seconds 뒤 저절로 다음 · 아니면 '한 번 더 말하기'(큰) · '다음'(작은) · 상한 없음 · 점수 = 가장 높은 일치율 · 실패 '다시 한 번 말해 볼까요'), 듣기 이해(대본 읽기 · '다시 듣기' · 처음 틀리면 '한 번 더 듣기' → 정답, 대본 글 안 보임), 질문 답 1~2단계(영어 읽기 → `showKo` 뜻 · `judgeAppAnswer` · '잘 말했어요' + '다음' / 다시: `modelAnswer` 보이며 들려주고 '같이 말해 볼까요' → 한 번 말하면 다음, 판정 글자 없음 AC-5d), 처음 마이크 안내(`MIC_NOTICE_KEY` 공유), 막힌 안내 셋(문구 · 알림 종류 · 세션은 진행으로 남음), network 안내.
2. **인식 셈** — `speakingCounters`(차례 1)와 조각의 연결: 활동 실패 → max_retries 건너뜀 · audio-capture `MIC_CAPTURE_STREAK` · 세션 max_retries × 2 → 멈춤 · no-speech → silent_items_max · network 안 셈 · stalled. 끝 시도 꼴(`heard` · `failures` · `skipped` · `echo`)과 서버 채점(건너뜀 null — 결정 1).
3. **기기 알림** — `recordDeviceAlert`(createAlertOnce once day · 값 code · browser · 인식 글 없음) · 배치가 같은 함수 · `reportSessionMic` 첫 문장 requireAccess · 통합 device-alert 가 once day 를 보나.
4. **동음이의어 공용** — 세션 · 배치 두 벌이 한 곳으로(AI 층에 안 닿음 — check:deps · check:bundle).
5. **작은 것 넷** — A3 M-1(`displayCardsOf` 허용 정답 모두 + 시험) · 배치 조립 문항도 displayCardsOf · fix 3 새 Minor('대문자' 자리 처음부터) · 각각 배치 동작 변화가 설계 안인지(카드 표시만).
6. **틀** — 말하기 세션 마이크 문(`micUsable()` 아니면 안내 + '홈', 세션 진행으로 남음) · 첫 누름 `unlockFromGesture()`.
7. **시험** — e2e 이름 열이 plan 증명 표 글자 그대로(AC-5b 1 · 5c · 5e · 5f 3 · N3 4) · 가짜 음성 대본이 각 갈래를 실제로 내는가 · 감시 타이머 시험(실제 ~36초, test.setTimeout 180초)이 CI 에서 안정적인가 · 거짓 초록 없나 · 숫자 TEST_SETTINGS.
8. **제약** — 녹음 API 없음(`getUserMedia` · `MediaRecorder`) · 인식 글 로그 · 알림 값 없음 · 설계 숫자 config 로 · 용어 · 문구 글자 그대로 · check:ids 새 줄 없음. 'P11a 완료 보고에 넣을 것' 절이 계획과 다르게 한 것 전부를 담았나(값 10 추측 틀림 · 꿰맞춤 · 두 인자 꼴 제거 · 공용 변경 셋 …).

## 보고
`review-p11-4-code.md` — 판정 · 심각도 · 근거. 장부 항목(동음이의어 두 벌 · displayCardsOf 둘째 허용 정답 · P12 조립 카드 표시(P12 몫은 남김)) '닫힘 · 아직 열림'. SendMessage 한 줄.
