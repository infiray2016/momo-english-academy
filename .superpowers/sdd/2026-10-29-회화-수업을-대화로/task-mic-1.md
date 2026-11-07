# 구현 브리프: iPad '못 듣는 마이크' 감지 · 기록 칸 · 쪽지 되돌아감 고침(2026-11-06 04:3x, 가벼운 루프)

## 맥락
- 닿는 결정: 7절(녹음 안 함 · getUserMedia 안 씀 · 32줄 '막힌 그 낱말'로 돌아감), C53 (5) · S7(iPad 실기 기준), C109 · C148(iPad WebKit 말소리 없는 듣기 → no-speech), C201(쪽지 단추 읽기 뒤 쉼 — 전제가 기록과 어긋남, 그대로 둠), 설정값 규칙(숫자는 settings).
- 요청자 지적 네 번째("여러번 말해도 못듣더라", 11-06 04:0x). 분석 `task-ipad-listen-analysis-report.md`(ana-ipad-listen)와 조사 `docs/research/2026-11-06-iPad-사파리-음성-인식-no-speech-조사.md`(res-ipad-speech)를 먼저 읽는다. 결론: 실패한 듣기는 start 뒤 audiostart 가 200ms 안에 오고 소리(soundstart · speechstart · result)가 전혀 안 들어오는 꼴(사흘 24번 모두 실패)이고, audiostart 278ms 이상은 14 중 13 성공. iOS 27 Safari 회귀(WebKit 326069 · 321436)로 보이며 확인된 우회법은 없다. 회복 전략은 관찰 쪽(/dev/mic-probe, 다른 구현자)에서 iPad 로 잰 뒤 정한다.
- e2e 분류 `task-e2e-webkit-triage.md`(ana-e2e-webkit) (나) 앱 결함 1건: 짧은 준비 쪽지 둘째 낱말에서 막혔다 풀리면 쪽지가 첫 낱말로 돌아간다(7절 32줄 위반, 실제 iPad 에서도 남). 고칠 자리 `talk-frame.tsx` 의 막힘 복귀(onRecovered) · prep 상태.
- 쪽지 듣기는 이미 attempts 의 talk-prep clientListen 으로 서버에 남는다(분석 보고 정정).
- **새 설정 키를 더하면 개발 DB 에 적재하기 전에는 배포에서 모든 턴이 실패할 수 있다**(11-06 T-157). 그래서 새 키는 seed/settings.json · tests/fixtures/settings.ts · 서버가 그 키를 읽는 목록(sentence_pause_ms 가 가는 길과 같은 곳) 셋을 모두 바꾸고, 보고에 '컨트롤러가 배포 전 seed:load 로 설정을 넣어야 한다'고 적는다.

## 고칠 것
1. **감지.** `src/lib/speech/browser.ts` listen() 에서 start 호출 뒤 audiostart 까지 ms 가 설정값 `speech.deaf_audiostart_ms`(기본 200) 아래이고, 그 뒤 설정값 `speech.deaf_silence_ms`(기본 1500) 안에 소리 · 결과가 전혀 없으면 그 듣기를 '마이크 안 잡힘'(outcome 새 갈래, 예: `deaf`)으로 끝낸다(no-speech 가 아니다). 설정값 `speech.deaf_retry_max`(기본 0 — 관찰 쪽 측정 뒤 올림)만큼 같은 듣기 안에서 조용히 다시 시작할 수 있게 자리만 둔다(0 이면 안 함).
2. **아이 화면.** 회화 차례 · 쪽지 · 정리에서 '마이크 안 잡힘'은 아이의 말소리 없음(talk.nospeech_dontknow_count · 쪽지 건너뜀 · '못 들었어요' 문구)으로 세지 않는다. 문구는 해요체 한 줄(예: "마이크가 안 잡혔어요. 한 번 더 눌러 주세요")과 말하기 단추 그대로. 턴을 보내지 않는다. 문구는 정본 7절 문구 표가 있으면 그 꼴을 따른다.
3. **기록 칸.** client_listen 요약(`src/lib/speech/listen-log.ts`)에 분석 보고가 권한 칸 여섯(pe · ss · rs · ts · te · hid — 보고의 정의대로)을 더하고, outcome `deaf` 가 서버 Zod(`ClientListen` 스키마)와 저장을 지나게 한다(하위 호환: 칸은 선택).
4. **쪽지 되돌아감.** `talk-frame.tsx` 막힘 복귀 뒤 쪽지가 '막힌 그 낱말'로 돌아가게(서버 attempts 의 성공 낱말을 반영). e2e `speech-feedback.spec.ts:442`(U4-5)가 지나야 한다.
5. **시험.** 단위: listen-log 요약의 deaf 판정(audiostart 41ms · 소리 없음 → deaf, 297ms · 소리 있음 → result, 41ms 뒤 result 있으면 result), fake-web-speech 로 빠른 audiostart 장면, 셈에서 빠지는 것(nospeech 카운터 안 오름). e2e 는 U4-5 하나(있는 시험 고침)만.

## 지킬 것
- 바꾸는 파일: `src/lib/speech/{browser.ts, listen-log.ts, types.ts, fake-web-speech.ts}`, `src/components/conversation/talk-frame.tsx`(+ 쪽지 · 정리 컴포넌트), 서버 스키마 · 설정 목록, `seed/settings.json`, `tests/fixtures/settings.ts`, `specs/09-설정값.md`(새 키 셋 한 줄씩, 'C-잠정 · 11-06'), 시험. `/dev/mic-probe` 는 다른 구현자(impl-mic-probe) 몫이니 건드리지 않는다.
- 관문 다섯(biome · tsc · 단위 · spec:trace · seed:validate) 0. 실호출 없음. iOS 재현 불가 — 가짜 음성으로만 검증하고, 실제 확인은 요청자 iPad 몫이라고 보고에 적는다.
- 보고 `task-mic-1-report.md`: 바꾼 것 · 시험 · 새 설정 키 셋과 적재 필요 · 남은 우려. 끝나면 요지 한 번만.
