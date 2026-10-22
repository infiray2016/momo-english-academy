# 구현 브리프: 음성 관찰 페이지 2판 — 사파리 원인 잡기(implementer impl-probe · Opus · high, 2026-10-22 19:4x, 가벼운 루프)

## 왜
요청자 iPad 실측 셋(장부 `ledger-open.md` 'H2 실측 1~3'): 크롬은 Siri · 받아쓰기 제한을 풀면 읽어 주기 · 인식이 되는데, **사파리는 소리 나가기(읽어 주기가 start → end 로 찍히는데 안 들림) · 들어오기(마이크 확인 timeout, 듣기 세 번 모두 `soundstart` 없이 'No speech detected' — 따라 말하기 · 자유 발화 모두)가 둘 다 안 된다.** 요청자 결정 C102(13절): iPad 는 둘 다 되어야 한다. 지금 관찰 페이지 `/dev/speech-probe` 는 인식 서비스와 읽어 주기 이벤트만 기록해 "마이크에 소리가 들어오는가 · 소리가 어디로 나가는가 · 어떤 실행 꼴인가"를 가르지 못한다. 한 번 더 재면 원인이 가려지게 기록을 넓힌다.

## 할 것(모두 `/dev/speech-probe` 안, 아이 화면은 건드리지 않음)
1. **환경 사실 칸**(쪽이 열리면 바로 기록 · 표에 보임): `navigator.userAgent` · `navigator.standalone` 과 `matchMedia('(display-mode: standalone)')`(홈 화면 아이콘 실행인지) · `document.visibilityState` · `navigator.audioSession?.type`(Safari 17+ Audio Session API, 없으면 '없음') · `AudioContext` 의 `sampleRate` · `state` · `outputLatency`(만들고 바로 닫음) · `speechSynthesis.getVoices()` 수와 영어 음성 수(지금 것 유지).
2. **장치 목록 칸**: `navigator.mediaDevices.enumerateDevices()` 를 권한 전 · 권한 뒤 두 번 — kind 와 label(권한 뒤에만 이름이 보임) · 수. 블루투스 이어폰 · 외부 장치가 잡혔는지 보려는 것이다. 이름은 기록 표에만.
3. **입력 소리 세기 단추**('마이크 소리 재기'): 누르면 `getUserMedia({ audio: true })` → `AudioContext` + `AnalyserNode` 로 3초 동안 RMS 를 재어 **최대 · 평균 · 소리가 들린 비율**을 기록하고 스트림 트랙을 바로 멈춘다(저장 · 전송 없음 — 7절 '녹음하지 않는다' 그대로, 수치만). 인식 서비스와 상관없이 마이크 신호가 들어오는지 본다. 권한 거부 · 오류는 코드로 기록.
4. **소리 나가기 시험 단추 둘**: '비프 소리'(AudioContext 440Hz 0.5초, 사용자 동작 안에서 만들고 resume) · '읽어 주기'(지금 문장 그대로). 각각 뒤에 '들렸어요' · '안 들렸어요' 단추로 요청자가 답하면 trace 에 `heard` 로 남긴다(TTS 만 안 들리는지, 소리 전부가 안 들리는지 가르기).
5. **오디오 세션 꼴 실험**(Safari 17+ 만, API 없으면 단추 비활성): 선택 상자로 `navigator.audioSession.type` 을 `auto` · `playback` · `play-and-record` · `ambient` 가운데 하나로 바꾼 뒤 3 · 4 · 기존 듣기를 다시 할 수 있게. 바꾼 값과 그 뒤 결과가 trace 에 남는다. 아이 화면에는 적용하지 않는다(원인이 가려지면 따로 브리프).
6. **기록 복사 꼴**: 지금 `export` 표 그대로 두고 새 사실 · 사건(`env` · `devices` · `mic-level` · `beep` · `heard` · `audio-session`)이 같은 표에 줄로 들어간다. 요청자가 붙여 넣기 쉽게 사실 칸은 표 머리에 한 줄씩.
7. **첫 실행의 마이크 확인(`checkMicrophone`) 은 바꾸지 않는다.** `src/lib/speech/browser.ts` 는 trace 종류를 더하는 범위에서만 건드리고, 새 사건 종류는 `src/lib/speech/types.ts` 의 `SpeechTraceEntry` 에 더한다(기존 종류 · 필드 이름 그대로 — e2e `speech-probe` 시험이 읽는다).

## 지킬 것
- CLAUDE.md 전부. 녹음 · 전송 없음(수치만), 비밀값 · 아이 이름 없음, 개발용 쪽은 접근 쿠키 뒤(지금 그대로). 설계 숫자 없음(3초 · 440Hz · 0.5초는 관찰 페이지 상수로 이름 붙여 둠 — 설정값 아님).
- 시험 먼저: 단위(RMS 요약 순수 함수 · trace 꼴) · e2e `tests/e2e/speech-probe.spec.ts`(있으면 거기에) — 가짜 `getUserMedia` · `AudioContext` 로 '마이크 소리 재기' 가 `mic-level` 줄을 남기고 스트림을 멈추는지, 환경 사실 칸이 보이는지 한둘. 로컬 관문: `pnpm biome ci .` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm build` · `pnpm check:deps` · `pnpm check:ids` · `pnpm check:bundle`.
- **도구 자리**: 명령 앞에 `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`(이 맥의 pnpm 은 nvm Node 24 에만).
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p11`(HEAD cce2238, P11b 끝난 뒤 깨끗함). 커밋하지 않는다. 다른 파일 · 정본 · 문서는 고치지 않는다.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-speech-probe-2-report.md` — 바뀐 파일 · 새 사건 종류 · 시험 이름 · 다르게 한 것 · 사파리에서 확인할 순서(요청자에게 보낼 한 단락: 사파리 앱에서 새로 열기 → 환경 칸 → 마이크 소리 재기(말하기) → 비프 → 읽어 주기 → 듣기 한 번 → 복사). 끝나면 SendMessage 한 줄 → 컨트롤러 CI(ci/p11-c2 재생성) → 코드 검토 high(범위 한정) → 커밋 → 프리뷰 → 요청자 재측정.
