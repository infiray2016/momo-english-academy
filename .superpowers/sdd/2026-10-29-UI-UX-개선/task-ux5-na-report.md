# 묶음 5-나 구현 보고(소리를 들려주지 못함 · 질문 답 인식 글, 2026-10-30 03:0x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋 안 함. e2e 는 정적으로만 썼다(돌리지 않음).
## 바뀐 파일
- 첫 항목(L-33): `speaking.tsx:161` 공용 `HeardLine`(data-heard · lang en)을 따라 말하기(:303)와 질문 답(:627)이 같이 쓴다. 질문 답의 첫 인식 글이 '잘 말했어요' · '같이 말해 볼까요'를 지나 다음 활동까지 남는다. 라-3 이 같은 줄을 쓰라는 주석을 그 위에 달았다.
- 신규 `src/components/session/sound-retry.tsx`: 문구 `SOUND_RETRY_TEXT`(설계 6 표 그대로, 무음 모드 줄은 C111 `MIC_BLOCKED_TEXT.ipadSilentMode` 재사용), 순수 `soundTrackOf`(:34) · `soundRetryStepOf`(:56) · `soundTechErrorOf`(:66), 접점 감싸기 `heardTrackedSpeech`(:74 — 마지막 읽기의 결과만), 훅 `useSoundCheck`(:101), 조각 `SoundRetry`(:135, 판 안 아래 mt-auto).
- 들려준 결과는 `speakHeardOutcomeOf` 로만 읽는다. not_played 만 '못 들려줌'이고 no_end · 끊김은 들려줌(표시는 활동 뿌리 data-sound-heard), skipped 는 셈에 넣지 않는다.
- 보일 것: 못 들려준 수 1 이면 안내 + 큰 '다시 듣기', 2 이상이면 무음 모드 줄(iPad Safari) + 작은 '다음', 배치 예비는 '다음' 없이 기다림. 저절로 넘기지 않는다.
- `speaking.tsx` 따라 말하기(:341) · 듣기 이해(:481): 감싼 접점을 보기 · 다시 듣기 조각에 넘긴다. 못 들려준 채 받은 답과 '다음'은 끝 시도에 `speakFailFields` 를 단다. 듣기는 첫 답 기준이고 되살릴 입력에 techError 를 남긴다.
- `attempt.ts:245` `speakFailFields = { v: 2, techError: "speak_fail" }`. 세션 틀 complete 가 내용을 뒤에 펼쳐 판 2 로 저장된다(틀 파일은 안 고침).
- `attempt.ts`: 듣기 tries 는 techError 가 있을 때만 빈 목록을 받는다(:145 · :226). appActivityResult 는 techError 면 점수 · 단어별 정오가 없고 말한 낱말 수는 남긴다. 판정 함수는 그대로다.
- `score.ts`: 머리 주석만 고쳤다. null 점수가 분모 · 분자에서 빠지고 한 종류가 다 빠지면 가중치 0 이 되는 것은 기존 셈 그대로 R-55 와 맞는다.
- 배치 `adaptive.ts`: 기록 칸 `techError?`. 그 자리만 같은 번호 예비로 다시 내고(techSpare) 판정 · 문항 수에 넣지 않는다. 예비 문항의 기술 오류 기록은 차례 어긋남으로 던진다.
- `server/placement/index.ts`: 입력에 `techError` 를 받고 answer 는 그때만 비울 수 있다. 화면에 `techSpare`(:301 — 본 문항 · 소리 문항 · 예비 있음)를 넘긴다. 기술 오류는 채점하지 않고 점수 null 로 적으며 totalScore 에서 뺀다. 조건 밖이면 invalid 다.
- `placement-flow.tsx`: `useSoundCheck` 를 문항 id 로 둔다. 듣기 · 따라 말하기에 감싼 접점을 넘기고 판 안 아래에 SoundRetry(:515)를 둔다. 답 · 몰라요 · 작은 '다음'에 techError 를 붙인다. 예비로 못 넘기는 문항은 못 들려준 동안 답 · 몰라요를 막는다.
- `repeat.tsx`: 머리 주석만 고쳤다. 들려준 셈은 배치 화면이 감싼 접점으로 한다.
## 설계와 다르게 한 것
1. 큰 '다시 듣기'를 조각이 새로 둔다. 기존 작은 '다시 듣기'(choice.tsx SoundButton, 범위 밖)는 그대로라 두 단추가 함께 보인다.
2. 듣기 문항 시도 꼴에서 기술 오류 '다음'만 빈 tries 를 허용했다. 답 없는 '다음'을 적을 다른 꼴이 없어서다.
3. 따라 말하기는 끝낼 때까지 한 번도 못 들려줬을 때만 기술 오류다. 들려주기 전 시도가 섞이면 보통대로 최고 일치율에 든다.
4. 배치 듣기 문항은 고르기 조각의 큰 '다음'(제출)과 새 작은 '다음'이 함께 보인다. 몰라요 · 고른 답도 기술 오류로 예비에 간다.
## 시험(덮는 것)
- 신규 `tests/unit/sound-retry.test.ts` 9건: R-57 셋 · N-19 · AC-23a (5) · 설계 6 문구 · N-19 그림 · 접점 차례 · AC-23f 인식 글 줄.
- `score.test.ts` 'AC-23a (5) R-55' 둘 · `placement.test.ts` 'AC-23a R-56' 둘 · `speech-paced.test.ts` 0-라 재검토 둘('R-57 모으기 …' · 'R-48 모으기: 시작 뒤 오류 …').
- e2e(정적): speech-feedback 'AC-23a (5) N-19 말하기 따라 말하기 …' · 'AC-23a (5) R-55 말하기 듣기 이해 …', required-recovery 'AC-23g N-19 말하기 세션 …' · 'AC-23g N-19 R-56 말하기 배치 …', placement 'AC-23a R-56 R-57 말하기 배치 …'.
- required-utterance 의 질문 답 시험은 고치지 않았다. 앱이 이제 data-heard 를 그려 통과할 것으로 본다(실행 확인은 CI).
## 관문(p13d, Node 24, 03:00)
| 관문 | 결과 |
|---|---|
| pnpm lint | 517 파일, No fixes applied |
| tsc --noEmit | 종료 0 |
| pnpm test | 117 파일 · 1360 통과 · 6 todo(덮는 다섯 파일 63 통과) |
| check:deps | 위반 0(268 모듈) |
| check:ids | 위반 0, design-number 47(5-가 와 같음, 이 묶음 파일 0건), design-color 0 |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |
## 요청하는 변경 · 정할 것
- 세션 틀 `session-frame.tsx` complete 의 `v: 1` 을 INPUT_VERSION 으로 바꾸길 권한다. 지금은 내용의 v 가 이기는 펼침 차례에 기대고 있다(5-가 · 가르치고 잠금 파일).
- 쓰기 배치 받아쓰기(typing.tsx, 범위 밖)도 소리 문항이지만 이번 범위에 없다. 쓰기 배치에는 예비가 없어 R-56 을 적용하려면 별도로 정해야 한다.
- 새 설정 키는 없다. 다시 듣기 한 번 뒤 '다음'은 차례로 두었다.
## 우려(4)
1. e2e 다섯은 돌리지 못했다. 배치 placement.spec 시험은 가짜 음성 발화 차례(잠금 풀기 · 들어올 때 읽기 · 다시 듣기 = 0~2번)에 기댄다.
2. 끊김(cancelled)은 0-라 결정대로 들려줌이다. 들려주기 전에 아이가 '말하기'로 끊으면 그 뒤 답은 보통 답이 된다.
3. 설계 차이 1 · 4(단추 둘 · '다음' 둘)는 화면 검토(7-가)가 볼 자리다.
4. 배치 서버 갈래(techSpare 거부 · 점수 null)는 통합 시험 없이 e2e 로만 덮인다.
