# 구현 브리프: 마이크 점검 쪽 /dev/mic-probe(2026-11-06 04:3x, 가벼운 루프)

## 맥락
- 요청자 iPad(Safari 27.0)에서 회화 듣기가 대부분 '마이크 시작 알림 0.2초 안 + 소리 없음'으로 실패한다(분석 `task-ipad-listen-analysis-report.md`, 조사 `docs/research/2026-11-06-iPad-사파리-음성-인식-no-speech-조사.md` — 둘 다 먼저 읽는다). iOS 27 WebKit 회귀로 보이고 확인된 우회법이 없어, 회복 전략을 요청자 iPad 한 번(15분 안)으로 재는 관찰 쪽이 필요하다. 이 Mac 에서는 iOS 재현이 안 된다.
- 정할 것 4번(수업 안 한국어로 물어보기)의 전제인 iPad 한국어 인식(ko-KR) 실측도 같은 쪽에서 한다.
- 닿는 결정: 7절(녹음 안 함 — getUserMedia · MediaRecorder 를 쓰지 않는다. 이 쪽도 마찬가지), 관찰 쪽 전례 `src/app/dev/teacher-probe/*`(가족 접근 쿠키 뒤, DB 쓰기 없음, 목소리 목록 복사 단추).
- 다른 구현자(impl-mic-1)가 `src/lib/speech/*` 와 talk-frame 을 고치는 중이니 그 파일들은 건드리지 않는다. 이 쪽은 `webkitSpeechRecognition` 을 직접 써서 앱 접점과 독립으로 잰다.

## 만들 것
- `src/app/dev/mic-probe/` 쪽 하나(teacher-probe 와 같은 틀 · 접근 제어). 글자는 크게, 단추는 큼직하게(요청자가 iPad 로 15분 안에 끝내는 것이 목표).
- **전략 단추 다섯**(각 단추 한 번 = 듣기 한 번, 결과를 표에 한 줄):
  A 그냥 듣기(새 객체 · start, continuous=true · interimResults=true, 지금 앱과 같은 꼴).
  B 빠른 audiostart 감지 뒤 즉시 재시작(audiostart 가 200ms 안이고 1.5초 안에 소리 · 결과 없으면 abort → 새 객체 → start, 최대 3회).
  C start() 를 탭 핸들러 안에서 동기로 호출(setTimeout · await 없이).
  D 읽어 주기 뒤 듣기(speechSynthesis 로 짧은 영어 한 문장 → 끝 알림 뒤 새 객체로 start; 읽기 전에 앞 인식기 abort).
  E 한국어 듣기(lang ko-KR, A 와 같은 꼴) — 결과 글을 그대로 보인다.
- **기록**: 듣기마다 start-call · audiostart · soundstart · speechstart · result(interim · final, 글 길이) · error(code · message) · end 의 ms(start-call 기준), 전략, 재시작 횟수, 결과 글(한국어 · 영어). 표 위에 전략별 성공률 요약(성공 = final 결과 있음). 페이지 머리에 UA · 화면 숨김 여부 · `navigator.audioSession?.type`(있으면).
- **복사 단추**: 기록 전체를 마크다운 표 + JSON 으로 클립보드에 복사(teacher-probe 의 목소리 목록 복사와 같은 꼴, 실패하면 textarea 대체). 요청자가 붙여 넣어 보내면 된다.
- **안내 한 줄**: "단추마다 세 번씩 눌러 'apple' 처럼 한 낱말을 말해 주세요. E 는 '사과'." 와 "안 되면 새로 고침 뒤 A 를 다시 눌러 보세요(새로 고침으로 회복되는지도 알고 싶어요)".
- DB 에 쓰지 않는다. 녹음하지 않는다. 비밀값 · 아이 이름 없음.

## 시험 · 관문
- 단위: 기록 요약(전략별 성공률 · ms 계산)은 순수 함수로 빼서 시험 셋. e2e 는 쪽이 뜨고 복사 단추가 있는지 하나(기존 dev 쪽 e2e 꼴).
- 관문 다섯 0. 실호출 없음. 보고 `task-mic-probe-report.md`: 쪽 경로 · 전략별 동작 · 요청자에게 부탁할 순서 한 단락. 끝나면 요지 한 번만.
