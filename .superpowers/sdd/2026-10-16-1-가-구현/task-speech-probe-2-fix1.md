# fix 브리프: 음성 관찰 페이지 2판 fix 1 — 코드 검토 I 2 · M 5(implementer impl-probe 이어 보기 · Opus · high, 2026-10-22 20:4x, 가벼운 루프)

`review-speech-probe-2.md`(Changes requested — I-1 · I-2, M-1~M-5)를 읽고 일곱을 모두 고친다. 워크트리 p11 작업 트리(2판, 커밋 전). 시험 먼저(빨강 → 초록). 커밋은 하지 않는다. Minor 다섯은 가벼운 루프 규칙대로 컨트롤러가 결정했으니 아래 '결정' 대로 고치고, 재검토는 I-1 · I-2 만 범위 한정으로 받는다.

| 번호 | 지적 | 컨트롤러 결정 · 할 일 | 선 위 검증 |
|---|---|---|---|
| I-1 | `resume()` 약속이 머무르면 마이크 트랙을 멈추는 길이 없음(`probe-browser.ts:325 · :338 · :344-347 · :362-364`) | (1) `stop()` 은 깃발만이 아니라 **스트림 트랙을 즉시 멈추고 처리기를 닫는다**(재기 틀이 뒤에 깨어나도 다시 쓰지 않게). (2) `resume()` 은 이름 붙인 상한(관찰 페이지 상수, 예 `RESUME_WAIT_MS`)으로 기다리고, 넘으면 트랙 stop · 처리기 close 뒤 mic-level 줄에 '처리기 깨우기 없음(상한 ms)'을 남긴다(수치는 없음으로). 함께 재기도 같은 길 | 단위: 머무르는 resume 가짜로 상한 뒤 stop · close 가 불렸는지. e2e: 가짜 resume 을 '안 풀림'으로 두는 시험 하나 — 트랙 멈춤 · 줄 남음 |
| I-2 | 장치 · 트랙 label 이 기록 줄 · 복사 글에 그대로(사람 이름 길 — AirPods 기본 이름) | **원문 label 은 어디에도 적지 않는다.** 장치 줄은 kind 별 수와 **갈래**만: label 에 AirPods · Beats · Bluetooth · BT · 헤드셋 · headset · 이어폰 · earbuds 가 들면 '블루투스 · 외부', 'Built-in' · 'iPad' · 'MacBook' · '내장' 이면 '내장', 비어 있으면 '권한 전', 그 밖은 '그 밖'. 트랙 줄도 같은 갈래 + muted · readyState 만. 복사 글 머리에 '기기 이름은 기록에 넣지 않아요' 한 줄 | 단위: 갈래 함수(순수) 표 시험 — '홍길동의 AirPods' → '블루투스 · 외부', 원문이 결과 글에 없음(`not.toContain`). e2e: 가짜 장치 label 에 사람 이름 꼴을 넣고 복사 글 · 화면에 없음을 단언 |
| M-1 | 비프 처리기가 거부 · 머무름 길에서 안 닫힘 | 거부 갈래 `closeQuietly`, `BEEP_DURATION_MS` + 이름 붙인 여유 뒤 end 가 없으면 닫고 'end 없음' 줄 | 단위 하나 |
| M-2 | 화면 · 기록에 '트랙' 낱말 | '마이크'로(마이크 끔 예 · 마이크 소리 끊김 아니오 · 마이크 갈래 …). 코드 식별자 `track` 은 그대로. 단위 · e2e 기대 글 같이 | grep '트랙' 화면 글 0 |
| M-3 | 읽어 주기 길마다 꼴 바꾸는 때가 다름 | `onSpeakTest` · `onAltStart` 모두 `autoSession("playback")` 을 `unlockFromGesture` **앞**으로(playback 단추 길과 같은 순서) | e2e 자동 시험의 줄 순서 단언 |
| M-4 | 누름 밖 꼴 바꾸기 · 그 뒤 소리가 기록에 안 드러남 | audio-session set 줄 · 비프 start 줄 · 읽어 주기 줄에 `navigator.userActivation?.isActive`(없으면 '없음')를 덧붙이고, 보고의 '확인 순서'에 '교대에서 몇째 문장부터 안 들렸는지 글로 적어 달라' 한 줄 | 단위(줄 꼴) |
| M-5 | 가짜 getUserMedia 가 같은 트랙을 되돌림 | 부를 때마다 새 track · stream, 트랙마다 멈춤 셈 | 기존 e2e 그대로 초록 + '소리 재기 → 함께 재기' 두 번 시험 하나 |

관문: 브리프 2판 '지킬 것' 그대로(`export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`). 보고 `task-speech-probe-2-report.md` 에 'fix 1' 절(지적별 어떻게 · 바뀐 파일 · 시험 수 · '확인 순서' 단락 고침) · SendMessage 한 줄 → 컨트롤러 CI 21차 → rev-probe 재검토(I-1 · I-2) → 커밋 → Vercel → 요청자 세 묶음 측정.
