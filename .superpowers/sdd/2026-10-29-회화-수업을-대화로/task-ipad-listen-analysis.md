# 분석 브리프: iPad Safari 회화 듣기 실패(no-speech) — 기록 · 코드 대조(2026-11-06 04:0x)

## 맥락
- 닿는 결정: 7절(녹음 안 함 · getUserMedia 안 씀), C53(읽어 주는 중 듣기 시작하면 읽기 끊음), C148(aborted 'No speech detected' → no-speech), C166 R1(읽기 감시 상한), C201(따라 말하기 단추 읽기 뒤 쉼 speech.sentence_pause_ms 700, 잠정).
- 요청자 지적 네 번째(10-23 · 10-29 · 11-05 · 11-06): iPad Safari 에서 말해도 "못 들었어요". 11-06 04:0x 원문: "단어카드에서 마이크가 젤 처음 단어에 됐는데 안되고 이후 회화에서도 대부분 못들었다고 함."
- 첫 배포(87b102d, 11-05 22:xx 세션 d6edfd39)에서는 회화 듣기 3/3 성공(as 344 · 347 · 1005ms). 그 뒤 f4ec058(C201 speak-settle · follow-along · 쪽지) · b462c21 · 806801f 가 클라이언트 음성 코드를 바꿨다. 이번 세션 클라이언트는 b462c21 또는 806801f 번들이다. 되던 것이 안 되면 바뀐 조건부터 대조한다.
- 쪽지(짧은 준비 단어 카드)의 듣기는 서버에 기록되지 않는다(talk_turns 에 prep 없음). 회화 차례의 듣기만 client_listen 으로 남는다.
- 이 Mac 에서는 iOS 를 재현할 수 없다. 요청자 iPad 한 번으로 결정적 근거를 얻을 계획이 필요하다.

## 기록(세션 a7f63863, 11-06 03:52~03:56, iPad Safari 27.0, 3단계 단원 1, 서버 806801f)
client_listen 칸: o 결과 · as 마이크 시작 알림까지 ms(start 호출 → audiostart) · snd 소리 감지(soundstart · speechstart) 여부 · tc 마지막 읽어 주기와의 관계 ms · d 듣기 길이 ms · by 끝낸 주체.

| 차례 | 결과 | as | snd | tc | d | by | 힌트 |
|---|---|---|---|---|---|---|---|
| 1(인사, 03:40 옛 배포) | result | 1208 | true | 1313 | 3694 | button | none |
| 3 | no-speech · no-speech | 41 · 34 | false | 16060 · 20809 | 3120 · 4780 | button | none |
| 4 | result | 297 | true | 1541 | 4605 | button | english |
| 5 | no-speech · no-speech | 34 · 38 | false | 3842 · 13253 | 6144 · 2785 | button | none |
| 6 | no-speech · no-speech | 39 · 31 | false | 3595 · 9250 | 4204 · 4232 | button | english |
| 7 | (모르겠어요 단추, 듣기 없음) | | | | | | english |
| 8 | result | 280 | true | 4846 | 3489 | button | english |
| 9 | no-speech → result | 39 → 278 | false → true | 12665 → 20389 | 3922 → 4446 | button | english |

규칙성: 성공은 as 280~1208, 실패는 as 31~41 + snd false(마이크가 '열렸다'고 알리지만 소리가 전혀 안 들어옴). 같은 턴 두 번째 시도도 대부분 실패(9 만 둘째에 성공). 읽어 주기 뒤 경과(tc)로는 갈리지 않는다. 지난 쪽지 실패(11-05, preview-1-session-transcript.md)는 eat · drink 세 번 모두 snd false · as 116~158ms.

## 읽을 것
- `src/lib/speech/browser.ts`(listen · recognizer 생성 · abort · wake 재시작 · end 처리, 150~420줄 · 마이크 확인 560~610), `src/lib/speech/listen-log.ts`(as · snd · tc 의 뜻 93~150), `src/lib/speech/speak-settle.ts`(C201), `src/components/conversation/follow-along.tsx` · `talk-frame.tsx`(말하기 단추 → listen 호출 순서, 힌트 읽기 → 듣기), 쪽지 화면(짧은 준비) 컴포넌트.
- diff: `git -C <워크트리> diff 87b102d 806801f -- src/lib/speech src/components/conversation` (워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`).
- 기록 원본: `.superpowers/sdd/2026-10-29-회화-수업을-대화로/preview-1-session-transcript.md`(11-05 세션), 이 브리프의 표(11-06 세션).

## 물음
1. as≈35ms + snd false 가 코드 경로에서 어떻게 나올 수 있는가. 후보: 앞 recognizer 를 abort 한 뒤 end 를 기다리지 않고 바로 새 start()(activeListen.cancelNow → new Ctor → start 의 경쟁), continuous=true 의 wake 재시작으로 recognizer 가 겹침, 읽어 주기(speechSynthesis) 뒤 오디오 세션 상태, 힌트 읽기와 듣기의 순서, 말하기 단추를 읽어 주기 도중 눌렀을 때의 cancelSpeaking → listen 순서. 성공(4 · 8 · 9 둘째)과 실패(3 · 5 · 6 · 9 첫째)를 가르는 조건을 기록과 코드로 찾는다.
2. 첫 배포 → f4ec058 → b462c21 → 806801f 사이 클라이언트 음성 코드 변경 가운데 듣기 시작 순서 · 타이머 · 취소를 바꾼 것이 있는가(회귀 후보). 첫 배포 세션(d6edfd39)에서는 회화 듣기가 3/3 성공했다.
3. 고침 후보를 위험 · 비용과 함께 적고 하나를 추천한다: (a) 앞 recognizer abort → end 사건을 기다린(상한 300ms) 뒤 start, (b) start 직전 speechSynthesis.cancel() 항상, (c) audiostart 가 100ms 안에 오고 1.5초 안에 soundstart 가 없으면 그 recognizer 를 버리고 한 번 자동 재시작(자가 치유, 아이에게는 '듣는 중' 그대로), (d) iOS 에서 continuous=false, (e) getUserMedia 스트림 유지(7절 결정이 필요하므로 적기만 한다).
4. 검증 계획: 요청자 iPad 한 번으로 결정적 근거를 얻을 관찰 쪽(예: `/dev/mic-probe` — 단추를 누를 때마다 recognizer 사건을 ms 단위로 기록하고 전략 둘을 번갈아 씀)의 설계와, client_listen 에 더 남길 칸(앞 recognizer 끝남 뒤 경과 ms · soundstart 시각 · 재시작 횟수). 쪽지 듣기 기록을 서버에 남기는 길(기존 client_listen 꼴 재사용).

## 출력
`.superpowers/sdd/2026-10-29-회화-수업을-대화로/task-ipad-listen-analysis-report.md` — 가설 순위(근거: 파일 · 줄 · 기록 차례), 회귀 후보, 추천 고침(바꿀 파일 · 함수 · 두세 줄 의사 코드), 검증 계획, 열린 물음. 코드 · 설계는 고치지 않는다. 비밀값 · 아이 이름은 적지 않는다. 실호출 없음.
