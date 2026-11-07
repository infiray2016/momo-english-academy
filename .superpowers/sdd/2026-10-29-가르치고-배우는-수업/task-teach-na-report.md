# 구현 보고: 가르치고 배우는 수업 묶음 나(활동 차례 · 시도 꼴 판 2 · 짝 고르기 · 이어 하기 · 서버 다시 셈) — 2026-10-30 01:2x, 구현자 Opus · high

상태 DONE_WITH_CONCERNS. 워크트리 p13d 커밋 전 변경 위, 커밋 안 함. 0-다 의 met 이름은 그대로 뒀다. 묶음 타 · 마-1 · e2e 파일은 손대지 않았다.

## 바뀐 파일(계획과 다른 것은 ※)
- `src/core/session/preview.ts`: SpareBase(:60) · Activity 에 today · model · together · spare. spareActivities(:220, 질문 → 듣기 → 문장 → 낱말) · teachOrder(:252) · previewActivityNoOf(:298). ActivityModelInput.teach 는 본보기 · 같이 해 보기 수만 본다.
- `src/core/session/spares.ts`(신규): soloActivityNoOf · sparesToShow(:35 → { show, skip }) · soloOutcomesOf · sparesFromFinals(:72, 기기 · 서버 공용).
- `src/core/session/attempt.ts`: INPUT_VERSION 2(:28) · QuestionJudgeSchema(:61) · inputFitsActivity(:240) · resumePointOf(:316, 셋째 인자 skipped) · togetherResult(:572) · spareResult(:599) · soloOutcomeOf(:751). ※ 혼자 첫 시도 판정 soloOutcomeOf 는 plan 에 이름이 없어 새로 뒀다.
- `src/core/speaking/judge.ts:272 · 296`: englishSentencesOf 가 together 시도마다 인식 글 하나를 센다.
- `src/server/session/index.ts`: previewAttemptWhere(:102) · teach 를 활동 차례에 넘김 · 짝 상한은 teach 수업만 읽음(:342) · spareChoiceOf(:401) · firstFinalInputs(:417) · 질문 짝은 AI 길 아님(:441) · 짝 시도 거름(:878, 저장된 첫 시도 + 묶음 앞 첫 시도) · 끝내기의 skip(:1010) · ※ SessionView.spares(:1178, { show, skip, cap }) · 이어 할 자리에 skip(:1407). PREVIEW_ACTIVITY 는 지웠다.
- `src/server/session/result.ts:77`: 오늘 만난 단어를 previewAttemptWhere 로 읽는다.
- 시험: `tests/fixtures/seed/builders.ts:1930` teachSeedLessons(3단계 정규 시드 셋을 읽음). session-preview · session-attempt · ※ session-spares(신규, 기기 쪽 이어 하기 시험도 여기) · session-flow. ※ session-input.test.ts 는 고치지 않았다.

## 시도 꼴 판 2: 이름 표와 다른 곳
1. communicative · expressionDone 은 judge 안에 뒀다. judge.final 은 correct · partial · retry 다.
2. together.tries 의 heard 는 시도마다 글 하나(string)다.
3. aid 는 { readAloud?: true, gloss?: string[] } 꼴이다. story 는 { replayed: boolean } 꼴이다. techError 는 듣기 · 질문 · 따라 말하기의 "speak_fail" 이다. 점수 규칙은 5-나 몫이라 바꾸지 않았다.
4. 판: 지금 종류는 판 1 · 2 를 모두 받는다. today · model · together 는 판 2 만 받는다. 꼬리표 없는 P10 미리보기 시도는 v 1 로 읽는다.
5. 짝 결과: 점수는 null 이고 단어별 정오 · 낱말 수는 짝 내용으로 센다. 질문 짝은 accepted · acceptedMeaning 을 judgeAppAnswer 로 본다(두 묶음 판정은 다 몫). 같이 해 보기는 점수 · 정오가 없고, 말로 하면 낱말 수만 남는다.
6. 혼자 첫 시도 '틀림'의 해석
   - 따라 말하기: 첫 인식 글이 ui.match_phrase_levels 첫 값('잘 말했어요')에 못 미치면 틀림이다.
   - AI 질문: judge.final 이 correct 가 아니면 틀림이고, judge 가 없으면 U 다.
   - U: 건너뜀 · techError · 진행 시도.

## 시험(정본 15절 번호 — C184 대응: 델타 2a → AC-3c · 1b → AC-22b · 2c → AC-3e, 01:3x 에 이름을 바꿈)
- AC-3c: session-preview 'AC-3c 가르치는 수업 차례' 셋(읽기 · 쓰기 · 말하기 차례, 짝 없는 문항 · teach 없는 수업), 정한 것 4 previewActivityNoOf 하나.
- AC-22b: session-spares 'AC-22b 짝 고르기' 다섯(빈 목록 · 읽기 둘 · 말하기 여섯 상한 · U 뺌 · 쓰기 첫 시도).
- AC-3e: session-spares 'AC-3e 짝 이어 하기'(기기 몫) · session-flow 'AC-3e 가르치는 수업 짝' 둘(정적 작성, 이 Mac 에서 못 돌림).
- 판 1 읽기 · 새 꼴 · 맞춤 · 결과 · 영어 문장 수: session-attempt '시도 꼴 판 2' 넷. 기존 시험의 '판 2 거부' 예는 v 3 으로 바꿨다.

## 관문(p13d, 이름을 바꾼 뒤 01:3x 에 다시 돌림)
| 명령 | 결과 |
|---|---|
| pnpm lint | 종료 0, 475 파일 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 종료 0, 106 파일 · 1190 통과 · 6 todo |
| pnpm check:deps | 종료 0, 위반 없음 |
| pnpm check:ids | 종료 0, design-number 49(기준 49) |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, 15절 AC 189 · unknown-ac 0 · missing-test 16(옛 plan 의 P12 몫, 실패 조건 아님). 01:2x 첫 실행은 다른 손의 시험 43건 때문에 종료 1 이었다 |

## 우려(6)
1. 화면 연결이 남았다. session-frame.tsx 가 resumePointOf 를 skip 없이 부르고, 새 꼴을 v 1 로 보낸다. 라-2 가 view.spares 와 sparesFromFinals 로 고치기 전에는 가르치는 수업 세션이 짝 자리에서 멈춘다.
2. 시험 설정 고정값(tests/fixtures/settings.ts)에 lesson.spares_per_session.* 가 없다. 그래서 통합 시험이 그 키를 직접 넣는다. 고정값에 더하기를 요청한다(e2e 가르치는 수업도 필요).
3. 쓰기 서버(src/server/writing/index.ts · composition.ts)는 teach 없이 activitiesOf 를 부른다. 지금은 guided · composition 에 teach 가 없어 차례가 같지만, 4단계 이상에 teach 가 생기면 함께 넘겨야 한다.
4. AI 판정 질문은 judge(다)가 없으면 U 로 본다. 다 전에는 3단계 혼자 질문의 짝이 나오지 않는다.
5. 따라 말하기 첫 시도의 틀림 기준은 spec 의 틀린 뒤 차례 표를 짝 고르기로 넓혀 읽은 것이다. 검토에서 확인해 주기를 바란다.
6. 통합 시험 둘은 정적으로만 썼다(이 Mac 에서 못 돌림). CI 첫 실행에서 확인해야 한다.

## 보정(01:2x)
- 바꾼 시험 11개: AC-3c 3 · AC-22b 5 · AC-3e 3(단위 1 · 통합 2). 다시 돌린 lint · tsc · test(1190 통과) 모두 종료 0.
- spec:trace --fail-on unknown-ac 종료 0(unknown-ac 0 · missing-test 16).
- 우려 2 풀림: tests/fixtures/settings.ts 에 lesson.spares_per_session.reading · writing · speaking(seed/settings.json 값 3 · 3 · 4)을 더하고 통합 시험은 그 고정값을 쓴다(직접 넣던 줄 지움). lint · tsc · test · check:ids(fixture-setting 0) · spec:trace 종료 0.
