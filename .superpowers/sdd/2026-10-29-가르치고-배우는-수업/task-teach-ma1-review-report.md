# 코드 검토 보고: 가르치고 배우는 수업 묶음 마-1 음성 층 한국어 줄(검토자 · Opus · xhigh, 2026-10-30 01:3x)

판정: **Approved** · Critical 0 · Important 0 · Minor 4. 범위는 구현 보고가 적은 줄이고, 같은 파일의 1차 묶음 · 0-라 줄은 꼴이 바뀌었는지만 봤다. 시험은 다시 돌리지 않았다.

## 1. 설계 준수
- ✅ AC-3h · spec 설계 4(204줄 표): voiceFor(core/teacher/voice.ts:88-139)가 한국어 줄에 read_ko 끔이면 skip, ko-KR 가운데 기기 기본 → 첫 ko-KR → 없으면 skip, 선생님 pitch(고르기 전이면 undefined = 기본), speech.rate_ko 를 돌린다. 선생님 영어는 voice.prefer 의 speech.lang 목소리 → pickVoice, 글 자료는 pickVoice · 기본 높이다.
- ✅ 설계 10(379 · 381줄) · AC-N20: 한국어 감시 상한은 speakWatchOf 가 lang 을 받아 speak_chars_per_second_ko × 빠르기로 잰다(pace.ts:27-51, browser.ts:456). ko-KR 없음 · read_ko 끔이면 음성 접점이 듣기 · 읽기를 끊지 않고 바로 `{ kind: "skipped", reason }` 을 돌린다(browser.ts:423-431, 끊기는 :433 부터). 안내 줄은 음성 층에 없다.
- ✅ 정한 것 10: 명단(seed/teachers.json) · 기기 상태(mic-state)는 바뀌지 않았고 preferKo 같은 새 칸이 없다.
- ✅ 영어 줄 동작 그대로: 글 자료(높이 · 목소리 순서 없음)는 pickVoice · settings.lang · 넘긴 빠르기, 선생님 영어는 preferredVoice → pickVoice · 넘긴 높이 · 빠르기로, 마-1 전 browser.ts 의 고르기와 같은 값이다. 감시도 lang 이 영어면 전과 같은 키를 쓴다. teacher.ts 는 한국어 줄에서만 voicePrefer 를 빼고(:29 · :34) 영어 줄은 전처럼 넘긴다. 회화(teacherSpeech)와 세 영역(paced) 1차 묶음 동작에 바뀜이 없다.
- ✅ 0-라 꼴 그대로: heard 필수 칸 · speakHeardOutcomeOf · speakHeardOfAll 은 손대지 않았다. paced 는 skipped 문장을 모으지 않고(paced.ts:46), 모두 skipped 면 0-라 규칙대로 마지막 결과(skipped)가 나간다.
- ✅ skipped 받는 쪽 안전: SpeakOutcome 에 새 갈래가 생겼지만 speakHeardOutcomeOf 는 받지 않아(pace.ts SpokenOutcome) 그대로 넘기면 tsc 가 잡는다. 지금 받는 화면(tori · follow-along · reading · speaking)은 한국어 lang 을 넘기지 않아 skipped 가 오지 않는다.
- ✅ 설계 숫자 없음(check:ids design-number 49 그대로), 고정값 둘은 seed/settings.json 값(켬 · 6 · 1.0)과 같다. 식별자 영어. core 사이 고리 없음(voice.ts 는 listen.ts 의 형만 읽음).

## 2. 잘한 점
- 쓰임 정하기(voiceUseOf)와 고르기(voiceFor)를 순수 함수로 떼어, 음성 접점은 결과대로 읽기만 하고 갈래는 단위 시험 일곱이 모두 덮는다.
- 읽지 않음을 ended · heard 가 아닌 별도 결과(skipped)로 두어, R-57 들려주지 못함(기술 오류)과 '글로만 · 안내 없음'이 섞이지 않는다.
- 읽지 않는 한국어 줄이 듣기 · 읽기를 끊지 않게 skip 판단을 cancel 앞에 둔 것을 시험으로 단언했다(speech-speak.test.ts:496).

## 3. 지적
Critical · Important 는 없다.

Minor
- **M1 paced 의 skipped 갈래에 시험이 없다.** paced.ts:46 이 skipped 를 모으지 않는 새 줄인데 speech-paced.test.ts 에 skipped 를 쓰는 시험이 없다. [skipped, skipped] → skipped, [skipped, 들려줌] → 들려줌 둘을 더하길 권한다.
- **M2 iPad 사파리에서 목소리 목록이 아직 비었으면 한국어 줄이 글로만 된다(구현자 우려 2).** voiceFor 는 빈 목록을 'ko-KR 없음'과 같이 본다(voice.ts:107-109). 영어는 lang 만으로 읽어 차이가 한국어 줄에만 생긴다. spec 설계 10 문장('ko-KR 목소리가 없으면 글로만')에는 맞지만, 목록이 늦게 차는 기기에서는 세션 첫 줄들을 조용히 놓친다. L-2 에서 실측한 뒤, 빈 목록이면 lang 만으로 읽고 감시(not_played)에 맡기는 갈래를 둘지 정하길 권한다.
- **M3 라-1 이 skipped 를 다룰 규칙을 브리프에 적어야 한다(구현자 우려 3).** tsc 가 잡는 것은 speakHeardOutcomeOf 로 넘길 때뿐이고, `kind === "ended"` 만 보는 꼴(tori.tsx:455-456 처럼)은 skipped 를 조용히 '끝나지 않음'으로 흘린다. 라-1 브리프에 'skipped 는 단추를 바로 밝히고 안내 줄 · 기술 오류 기록 · 다시 듣기 횟수에 넣지 않는다(설계 10 · 381줄)'를 적고, 단추 상태 함수 시험에 그 갈래를 넣길 권한다.
- **M4 새 키 셋이 DB 에 없으면 음성 설정을 읽는 쪽이 모두 던진다.** speechSettingsFrom 이 키 없음에서 던지는 꼴은 1차 묶음 키와 같고 조용한 기본값을 두지 않는 규칙에 맞다. 다만 SPEECH_SETTING_KEYS 를 읽는 첫 실행(profile/index.ts:221-231) · 세션 · 배치 · 회화가 함께 던지므로, 새 집은 첫 실행에 들어가지 못하고 있던 집은 홈만 열리고 세션마다 앱 오류 판이 된다. 개발 DB 설정은 수동 적재(dev-load.yml, workflow_dispatch)로만 들어가므로, L-19 push 차례에 '프리뷰 쓰기 전에 seed:load 로 설정을 먼저 넣는다'를 한 줄 적어 두길 권한다.

## 4. 구현자 우려 셋
1. 워크트리 specs 사본에 AC-3h · AC-N20 이 없어 spec:trace 가 종료 1: 결함이 아니고 plan 차례 10(사본 맞추기) 몫이다. 다만 사본을 맞추기 전에 커밋 · push 하면 CI 의 같은 관문이 막으므로, 차례 10 을 그 커밋보다 앞에 둔다.
2. iOS getVoices 빈 목록: M2(Minor, L-2).
3. skipped 화면 몫: M3(Minor, 라-1 브리프).

## 5. L-2 음성 점검에 적을 것
- iPad 사파리 getVoices() 가 첫 부름에 비는지, voiceschanged 뒤 언제 차는지.
- 기기의 ko-KR 목소리 이름 · default 표시 · 여럿일 때 차례. 목소리를 정하지 않고 lang 'ko-KR' 만 준 발화가 읽히는지.
- 선생님 높이를 얹은 한국어 목소리가 어색한지(특히 리오, spec 우려 6). 어색하면 speech.read_ko 를 끈다.
- 실제 한국어 1초 글자 수와 6 의 차이, 끝 알림 감시가 제대로 읽는 발화를 먼저 끊지 않는지.
- 무음 모드가 한국어 읽어 주기도 막는지(C106).

## 6. 판정
**Approved.** 비차단: M1(시험 둘)은 지금 fix 로, M2 는 L-2 실측 뒤 결정, M3 은 라-1 브리프, M4 는 L-19 push 차례에 넣길 권한다.
