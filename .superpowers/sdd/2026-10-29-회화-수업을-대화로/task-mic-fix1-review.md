# 범위 한정 재검토: 마이크 묶음 fix(앱 fix 2 · 3, 관찰 쪽 fix 1), 2026-11-06 · Opus · xhigh

판정: **Approved(라운드 1 닫힘).** 지난 지적 여덟 건은 모두 ADDRESSED 입니다. 새 결함은 Minor 세 건이고, Critical · Important 는 없습니다.
지난 보고는 `task-mic-review.md` 입니다. diff `scratchpad/diff-mic-2.patch` 와 지난 diff 의 차이를 기준으로 읽었고, 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 파일 기준입니다. 관문 · 시험은 다시 돌리지 않았고 실호출도 하지 않았습니다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 `pe` 상한 없음 | ADDRESSED | `client-listen.ts:11` 이 상한을 내보내고, `clampListenMs`(`listen-log.ts:22-23`)가 ms 칸 여섯 d · as · fr · tc · pe · ss 를 모두 자릅니다(147 · 208 · 235 · 239 · 243 · 246줄). 기존 칸 tc 도 함께 잘렸습니다. 11분 틈 시험은 칸 꼴과 요청 꼴 Zod 둘 다 지나는지 봅니다(`talk-mic-deaf.test.ts:630-659`). |
| I-2 이어지는 deaf 의 출구 | ADDRESSED | 쪽지(`follow-along.tsx:729-735`)와 정리(479-484줄)가 `speech.deaf_skip_after` 번 뒤 사유 `mic_deaf` 로 저장하고 다음으로 넘어갑니다. 대화 차례는 '잘 모르겠어요' 안내로 바뀝니다(`child-turn.tsx:78 · 502`). 부모 알림은 컨트롤러 결정에 따라 범위 밖이고 장부에 남았습니다. |
| I-3 관찰 쪽 TTS 물음 | ADDRESSED | F 와 G 가 생겼습니다(`mic-probe.tsx:168-196`). D 는 '누름 밖' 이름표로 비교 자료가 됩니다. 아래 (3) · (4)에 자세히 적었습니다. |
| M-1 `lateSoundRun` 여유 | ADDRESSED | audiostart 를 400 으로 옮겨(`speech-feedback.spec.ts:197`) 의심 자체가 생기지 않습니다. |
| M-2 주석 겹침 | ADDRESSED | `deafListenOf` · `deafStreakOf` 를 `silentListenOf` 의 주석 위로 옮겼습니다(`child-turn.tsx:108-133`). |
| M-3 단언 빈틈 | ADDRESSED | ts · hid 참과 그 뒤 거짓 · pe · tc 상한 단언이 생겼습니다(`talk-mic-deaf.test.ts:630-675`). 화면 갈래를 눌러 보는 시험은 단위 환경(node · 정적 그리기)에서 할 수 없어, 저장 함수를 되밟는 시험으로 대신했습니다. 그 시험 안의 빈 단언 한 줄은 N-2 로 적었습니다. |
| M-4 관찰 쪽 기록 크기 | ADDRESSED | 중간 결과는 시도마다 20개까지만 남고 넘친 수를 셉니다(`probe-log.ts:299-308`, `mic-probe.tsx:425-436`). 저장이 실패하면 빨간 줄로 안내합니다(`mic-probe.tsx:640 · 838`). |
| M-5 복사 글의 인식 원문 | ADDRESSED | 중간 결과 사건에는 길이만 남고, final 글과 시도마다 마지막 들은 글 하나만 남습니다(`mic-probe.tsx:421-433`). 안내에도 '한 낱말만, 다른 말 없이'가 들어갔습니다. |
| M-6 배포 전 적재 | ⚠️ | 컨트롤러가 개발 DB 에 적재를 마쳤다고 했습니다(v12 · v13). diff 로는 확인할 수 없습니다. |

## 2. 컨트롤러가 짚은 네 점

**(1) 새 키 `speech.deaf_skip_after` 는 다섯 곳 모두 3 입니다.**
- `seed/settings.json:146`(고급) · `tests/fixtures/settings.ts:199` · `tests/fixtures/speech/settings.json:26` 에 있습니다.
- `SPEECH_SETTING_KEYS`(`src/core/speech/listen.ts:102`)에도 있고, 읽기는 1 이상만 받습니다(184줄). 0 이면 던지는 시험도 있습니다.
- `specs/09-설정값.md:118` 에도 있고, 기록 대본 Zod(`script.ts:106`)에도 칸이 있습니다.

**(2) `mic_deaf` 건너뜀은 셈에 들지 않고, 시도 기록에 사유만 남습니다.**
- 두 카드 모두 `tried.current.failures` 를 올리지 않습니다. 틀의 셈 함수 `onSpeech` 도 부르지 않습니다.
- 넘어갈 때 부르는 `onNextItem` 은 항목별 셈을 0 으로 되돌릴 뿐입니다(`talk-frame.tsx:1380-1385`, `judge.ts:403-412`). 말소리 없음 항목 수는 오르지 않습니다.
- 서버 저장 꼴과 시도 기록 꼴은 같은 목록 `TALK_FOLLOW_SKIPS` 를 씁니다(`attempt.ts:31-38`, `server/conversation/index.ts:500 · 1718`). 옛 사유도 그대로 읽힙니다.
- 서버에서 이 사유를 읽는 곳은 `skippedPrepWordsOf` 하나입니다(`lesson-input.ts:111`). 거기서는 그 낱말이 '만난 단어'에서 빠질 뿐이고, AI 입력에 실패나 어려움으로 가지 않습니다. no_mic · silent 와 같은 처리입니다.
- 근거 모듈 `core/evidence/teach.ts:197-210` 의 기술 사유 표에는 `mic_deaf` 가 없습니다. 하지만 이 모듈은 세션 시도(`core/session/attempt`)만 읽으므로 회화 시도와 닿지 않습니다.
- 셈은 낱말 · 턴마다 새로 시작합니다. 카드와 대화 차례가 낱말 · 턴마다 key 를 바꾸기 때문입니다(`follow-along.tsx:654`, `talk-frame.tsx:1647`).

**(3) F · G 는 앱의 실제 경로와 같은 차례입니다.**
- 앱 대화 차례의 차례는 이렇습니다.
  - 누르면 `onListenStart` 의 `queue.cancel()` 이 `port.cancelSpeaking()` 을 부르고, 이것이 늘 `speechSynthesis.cancel()` 을 부릅니다(`talk-frame.tsx:1677-1680`, `tori.tsx:837-845`, `browser.ts:189-192`).
  - 이어서 화면 상태를 바꾸고 `speech.listen()` 으로 들어갑니다. 자기 읽기가 없으므로 다시 끊지 않고, 같은 누름 안에서 start 합니다(`child-turn.tsx:442-457`, `browser.ts:194-200`).
- F 는 읽기 끝 뒤에 누르면 `cancelSpeech()` 다음 화면 갱신, 그다음 같은 누름 안의 start 순서입니다(`mic-probe.tsx:188-195`). 앱과 차례가 같습니다.
- G 는 읽는 중에 누르면 `cancelSpeech()` 바로 뒤에 start 합니다(173-186줄). 앱은 그 사이에 화면 상태를 바꾸지만, 그리기는 처리 뒤로 밀리는 동기 호출이라 차례는 같습니다. 누른 때 아직 읽는 중이었는지도 남깁니다(`speak-cancel` 의 code).
- 앱이 쪽마다 한 번 하는 무음 읽기(`unlockFromGesture`)는 관찰 쪽에 없습니다. 하지만 관찰 쪽의 읽기도 전략 단추 누름 안에서 시작하므로 WebKit 읽기 제약은 같은 꼴로 풀립니다.

**(4) C210 의 물음 셋을 이제 가를 수 있습니다.**
- TTS 종료 직후 시작은 세 전략과 견주어 가릅니다.
  - D 는 읽기 끝에서 곧바로, 누름 밖에서 시작합니다.
  - F 는 읽기 끝 뒤, 누름 안에서 시작합니다. 칸 '읽기 끝 뒤'에 기다린 ms 가 남습니다.
  - G 는 읽는 중에 끊고, 누름 안에서 시작합니다. 칸 '취소 뒤(읽는 중)'에 cancel 부터 start 까지의 ms 와 읽는 중이었는지가 남습니다.
  - 기준선은 A · C(읽기 없음)와 B 의 다시 시작(누름 밖 · 읽기 없음)입니다.
  - 두 칸은 듣기 앞의 사건만 세므로(`probe-log.ts:228-233`), cancel 뒤에 늦게 온 interrupted 는 섞이지 않습니다.
- 실패 단계와 실패 뒤 다시 말하기는 지난 판정 그대로 가릅니다.
- 한계가 하나 있습니다. D 와 F 는 누름 여부와 읽기 끝 뒤 간격(0ms 와 사람의 반응 시간)이 함께 다릅니다. B 의 다시 시작 줄과 견주면 일부 가를 수 있습니다. 결함으로 보지는 않습니다.

## 3. 새로 본 것(Minor)
- **N-1. 정본 문구가 코드와 다릅니다.** 13절 C210 보완(`specs/10-결정-기록.md:382`)과 09절(`specs/09-설정값.md:118`)은 대화 차례가 쪽지 · 정리와 '같은 안내 한 줄'을 보인다고 적습니다. 그런데 코드는 fix 3 의 다른 줄 "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요"를 씁니다(`child-turn.tsx:78 · 502`). 컨트롤러 지시로 바꾼 문구이므로, 13절 보완과 09절 118줄을 새 줄로 고쳐야 합니다. 7절 문구 표에는 세 줄(micDeaf · micDeafSkip · micDeafStuck)이 아직 없습니다. 정본 밖 문구로 남은 상태입니다.
- **N-2. 빈 단언이 하나 있습니다.** `talk-mic-deaf.test.ts:727` 의 `expect(speakingCountersStart()).toEqual(counters)` 는 새로 만든 시작 상태 둘을 견줄 뿐입니다. 그래서 주석이 말하는 '틀 셈 불변'을 확인하지 않습니다. 이 줄을 지우거나, deaf 가 셈 함수에 넣을 일을 만들지 않는다는 앞 줄 단언(723줄)을 근거로 남기면 됩니다.
- **N-3. 이어진 수를 0 으로 되돌리는 기준이 두 곳에서 다릅니다.**
  - 대화 차례는 끊김(interrupted)에도 0 으로 되돌립니다. 결과를 셈의 일로 바꾸기 전에 세기 때문입니다(`child-turn.tsx:492-497`).
  - 쪽지 · 정리는 `if (!event) return` 뒤에 세므로 끊김에서는 이어진 수가 남습니다(`follow-along.tsx:344-348`).
  - 그래서 'deaf, deaf, 쪽 숨김, deaf' 는 쪽지에서는 건너뜀이 되고, 대화에서는 처음부터 다시 셉니다.
  - 13절 '같은 자리에서 이어지면'에 맞는 쪽으로 한 규칙에 맞추기를 권합니다.

## 4. 범위 밖 관찰
- 부모 알림은 아직 없습니다. 컨트롤러 결정으로 범위 밖이고 장부에 열려 있습니다. 한 세션에서 `mic_deaf` 건너뜀이 여러 번 나면 부모가 알 길은 client_listen 기록뿐입니다.

## 5. 라운드 판정
**Approved.** 지난 Important 셋이 모두 닫혔습니다. N-1 은 컨트롤러가 정본을 고칠 일입니다. N-2 · N-3 은 가벼운 루프 규칙대로 컨트롤러가 직접 다듬어도 됩니다. e2e(U4-5 · 회화 셋 · mic-probe)는 CI 에서, 실제 동작은 요청자 iPad 에서 확인해야 합니다.
