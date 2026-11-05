# 브리프: 가르치고 배우는 수업 plan 묶음 마-1 — 음성 층 한국어 줄(목소리 고르기 · lang · 한국어 감시 · speech.read_ko)(구현자 · Opus · high, 2026-10-30 01:0x 작성, UI · UX 0-라 검토 Approved 뒤 시작)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 146~158줄 '마 · 선생님 · 목소리' 표의 마-1 행과 정한 것 10(한국어 목소리는 spec 그대로 — 명단 · 기기 상태에 칸을 더하지 않고, ko-KR 이 없으면 글로만 · 안내 없음)을 구현한다. 근거는 spec 3판 설계 4(가르치는 이, 204줄 표: 한국어 줄은 기기 ko-KR 기본 → 첫 ko-KR, 선생님 voice.pitch 를 얹음, speech.rate_ko) · 설계 10(읽어 주기 실패 · 379~381줄: 한국어 글자 수 ÷ speech.speak_chars_per_second_ko 감시, ko-KR 없거나 read_ko 끔이면 글로만 · 단추 바로 밝음 · 안내 없음) · 설계 12(키: speech.read_ko · speak_chars_per_second_ko · rate_ko — 시드 규격 fix 1 이 settings.json · 12절 사본에 넣음) · AC-3b · AC-N3(단위 몫), 정본 7절(C180 · C184). UI · UX 묶음 0-라 가 놓은 SpeakOutcome.heard(필수 칸) · speakHeardOf · speakHeardOfAll 은 그대로 쓴다. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(커밋 전 변경 위). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 할 것(plan 마-1 표)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/teacher/voice.ts` | 수정 | 순수 함수 `voiceFor`(제안): 쓰임(선생님 한국어 줄 · 선생님 영어 · 글 자료)과 기기 목소리 목록 · 명단 voice({ pitch, prefer })로 목소리 · lang · 높이 · 빠르기를 고른다. 한국어 줄: ko-KR 가운데 기기 기본, 없으면 첫 ko-KR, 없으면 '없음'(글로만) + 선생님 pitch + speech.rate_ko. 선생님 영어: 지금 pickVoice(voice.prefer 의 en-US) 그대로. 글 자료: 지금 목소리. 명단 · 기기 상태에 새 칸 없음 |
| `src/lib/speech/types.ts` · `browser.ts` · `teacher.ts` · `src/core/speech/pace.ts` · `listen.ts` | 수정 | SpeakOptions.lang(지금 settings.lang 고정 → 쓰임별), lang 에 맞는 목소리, 한국어 감시 상한(글자 수 ÷ speech.speak_chars_per_second_ko + speak_end_timeout_extra_seconds, speakWatchOf 가 lang 을 받음), 선생님 한국어 줄(ko-KR + 높이, teacher.ts 의 한국어 갈래 — 회화 구현이 teacher.ts 를 잡기 전에 끝낸다), speech.read_ko 끔이면 한국어 줄을 읽지 않고 바로 ended · heard "played" 꼴이 아니라 '읽지 않음'을 구분할 수 있게(화면 조각 라-1 이 단추를 바로 밝히는 근거). 0-라 의 heard 세 갈래 · 모으기는 그대로 |
| `tests/fixtures/settings.ts` · `tests/fixtures/speech/settings.json` | 수정 | speech.read_ko(켬) · speak_chars_per_second_ko · rate_ko 고정값(settings.json 의 값과 같게 — 값은 설정 파일에서 읽어 옮김) |
| `tests/unit/teacher-voice.test.ts` · `speech-pace.test.ts` · `speech-speak.test.ts` · `teacher-speech.test.ts` | 수정 | AC-3b(한국어 줄은 기기 ko-KR 기본 → 첫 ko-KR → 없음, 선생님 높이; 선생님 영어는 voice.prefer 의 en-US; 글 자료는 지금 목소리; read_ko 끔이면 읽지 않음) · AC-N3 단위 몫(한국어 감시 상한이 ko 키로 계산, 시작 안 함 · ko 없음 · read_ko 끔 갈래). 가짜 음성(fake-web-speech)의 목소리 목록에 ko-KR 있음 · 없음 대본 |

## 지키는 것
- 화면 조각(선생님 줄 · 단추 상태 teach-line.ts)은 라-1 몫이고, 선생님 고르는 때 당기기 · 첫 화면 잠금 풀기는 마-2 몫이다. 회화 파일(talk-frame · teacher-window)은 손대지 않는다. 설계 숫자 코드 금지(모두 설정 키). 식별자 영어. 녹음 없음.
- 0-라 파일과 겹치므로 0-라 검토가 Approved 된 뒤 시작하고, 0-라 가 놓은 꼴을 바꾸지 않는다(heard 필수 칸 · 모으기 규칙).
- 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 기준 49) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름은 정본 15절 번호 — C184 대응표). 보고 `task-teach-ma1-report.md`(40줄 안): 바뀐 파일 · voiceFor 의 입력 · 출력 꼴 · 감시 상한 계산 자리 · 시험 · 관문 · 우려(iPad 실측 필요한 것은 L-2 로). 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:1x): 델타 → 정본 15절 번호(C184 반영 보고 대응표): 1a~1d → AC-22a~d · 2a~2d → AC-3c~3f · 2e → AC-4d · 3a~3c → AC-3g~3i · 4a 4b → AC-3j 3k · 4c 4d → AC-5i 5j · 5a 5b → AC-3l 3m · 6a~6g → AC-22e~k · 7a~7c → AC-6f~6h · 8a 8b → AC-22l m · 9a → AC-22n · 10a → AC-22o · N1~N4 → AC-N18~N21. 시험 이름은 정본 번호로.
