# 구현 보고: 가르치고 배우는 수업 묶음 마-1 — 음성 층 한국어 줄(2026-10-30 01시)

상태: DONE_WITH_CONCERNS. 워크트리 `.claude/worktrees/p13d`, 커밋 안 함. 0-라 의 heard 세 갈래 · speakHeardOutcomeOf · 모으기 규칙은 그대로다.

## 바뀐 파일
- `src/core/teacher/voice.ts`: `pickVoice` 를 browser.ts 에서 옮겼다(browser.ts 는 관찰 페이지를 위해 그대로 내보낸다). `KOREAN_LANG`(ko-KR) · `isKoreanLang`(:12) · `voiceFor`(:88) · `voiceUseOf`(:145) 를 더했다.
- voiceFor 입력은 `{ use: "teacher_ko" | "teacher_en" | "material", voices, teacher?: { pitch?, prefer? }, rate?, speech: { lang, rateKo, readKo } }` 이다.
- voiceFor 출력은 `{ kind: "speak", voice, lang, pitch, rate }` 또는 `{ kind: "skip", reason: "read_ko_off" | "no_ko_voice" }` 이다.
- 한국어 줄은 read_ko 끔이면 skip, ko-KR 가운데 기기 기본 → 첫 ko-KR → 없으면 skip 이다. 높이는 선생님 pitch, 빠르기는 rate_ko 다. 선생님 영어는 prefer → pickVoice, 글 자료는 pickVoice · 기본 높이다.
- `src/core/speech/listen.ts` · `script.ts`: 설정에 speakCharsPerSecondKo · rateKo · readKo 와 키 셋을 더했다. 없거나 꼴이 틀리면 던진다. script.ts 는 설정 꼴이 `satisfies SpeechSettings` 라 같이 고쳤다.
- `src/core/speech/pace.ts:41`: 감시 상한의 계산 자리다. `speakWatchOf` 가 lang 을 받아 한국어면 speak_chars_per_second_ko 로 잰다. SpokenKind 에 skipped 를 더했다.
- `src/lib/speech/types.ts`: SpeakOptions.lang 을 더했다. SpeakOutcome 에 `{ kind: "skipped", reason }`(:28)을 더했다. 이것이 '읽지 않음'이고 heard 가 없다.
- `browser.ts:423-456`: voiceFor 결과로 lang · 목소리 · 높이 · 빠르기 · 감시를 정한다. skip 이면 아무것도 끊지 않고 바로 skipped 를 돌린다.
- `paced.ts:46`: skipped 문장은 모으지 않는다. 모두 skipped 면 0-라 규칙대로 마지막 결과가 그대로 나간다.
- `teacher.ts:29`: 한국어 줄은 높이와 lang 만 넘기고 영어 목소리 순서는 넘기지 않는다.
- 고정값 둘: `tests/fixtures/settings.ts` · `speech/settings.json` 에 키 셋을 seed/settings.json 값(켬 · 6 · 1.0) 그대로 더했다.
- 대본 둘: `tests/fixtures/speech/scripts/ko-voice.json` · `no-ko-voice.json`(새 파일).
- 범위 밖 한 곳: `tests/unit/listen-end.test.ts` 의 12절 대조가 '켬'을 글로 읽어 깨졌다. 그래서 '켬 · 끔'을 true · false 로 읽는 줄을 Edit 로 더했다. 이 파일은 listen.ts 의 시험이고 다른 손의 변경은 없었다.

## 시험(새 18, 고치기 전 16 실패 확인)
- teacher-voice 7: AC-3h 의 기본 → 첫 ko-KR → 없음, read_ko 끔, 고르기 전 높이, 선생님 영어, 글 자료, 쓰임 정하기.
- speech-pace 2: AC-N20 한국어 감시 상한과 키 없음 · 꼴 틀림.
- speech-speak 5: AC-3h 접점의 ko-KR · 높이 · rate_ko, AC-N20 의 ko 없음 · read_ko 끔 · 한국어 끝 상한 · 시작 안 함.
- teacher-speech 2: AC-3h 한국어 갈래, AC-N20 skipped 그대로.
- fake-web-speech-defaults 2: AC-3h · AC-N20 대본 둘.
- 덮는 일곱 파일(위 다섯 · speech-paced · listen-end)은 모두 통과한다.

## 관문
| 관문 | 결과 |
|---|---|
| pnpm lint | 오류 4 · 경고 1. 모두 session/attempt.ts · spares.ts · 그 시험 둘(다른 손)이다 |
| tsc --noEmit | 오류 0 |
| pnpm test | 1188 통과 · 2 실패 · 6 todo. 실패는 session-attempt · session-spares(다른 손)다 |
| check:deps · check:ids | 위반 0 · design-number 49(기준 그대로), 이번 파일은 없음 |
| spec:trace --fail-on unknown-ac | 종료 1, unknown-ac 43. 내 몫 18(AC-3h 10 · AC-N20 8)은 워크트리 specs 사본에 두 번호가 아직 없어서다(주 저장소 정본에는 있음). 나머지 25 는 AC-22k · 22l · 23f · 23g(다른 손) |

## 우려
1. 워크트리 specs 사본에 AC-3h · AC-N20 이 없어 spec:trace 가 종료 1 이다. plan 차례 10(사본 맞추기)이 끝나면 닫힌다.
2. L-2(iPad 실측): iOS 사파리는 getVoices() 가 처음에 빈 목록일 수 있다. 그러면 ko-KR 이 있어도 no_ko_voice 로 글로만 보인다. 영어 줄은 목록이 비어도 lang 만으로 읽으므로 이 차이는 한국어 줄에만 있다. 목록이 채워지는 때와 기기의 ko-KR 이름을 실측해야 한다.
3. skipped 는 새 결과 종류라 화면 조각(라-1)이 '읽지 않음'을 따로 다뤄야 한다. speakHeardOutcomeOf 는 이 종류를 받지 않으므로, skipped 를 거르지 않고 넘기면 tsc 가 잡는다.
