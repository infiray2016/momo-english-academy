판정: **Changes requested** — Critical 0 · Important 2 · Minor 5

# 검토 보고: 음성 관찰 페이지 2판 — 코드(rev-probe · Opus, 2026-10-22, 가벼운 루프 · 범위 한정)

대상: 워크트리 `.claude/worktrees/p11` 작업 트리(HEAD cce2238, 커밋 전). 고친 셋 `src/app/dev/speech-probe/speech-probe.tsx` · `src/lib/speech/types.ts` · `tests/e2e/speech-probe.spec.ts`, 새 셋 `probe-audio.ts` · `probe-browser.ts` · `tests/unit/speech-probe-audio.test.ts`. 요구 `task-speech-probe-2.md`(+ 보고의 '추가' · '추가 2'), 브리프 `task-speech-probe-2-review.md`.

직접 한 것: diff 와 새 파일 셋을 읽음, 워크트리에서 `pnpm check:ids` 한 번(exit 0 — 관찰 페이지 줄은 기존 `speech-probe.tsx:269` `slice(0, 10)` 하나뿐, 새 두 파일 0줄). 단위 · e2e 는 다시 돌리지 않음(구체적 의심 없음 · e2e 전체는 CI 20차 몫).

## 1. 설계 준수(브리프 '볼 것' 1~7)

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | 범위 지킴 | ✅ | `git status`: 바뀐 것은 위 여섯 파일뿐. `src/lib/speech/browser.ts` · 아이 화면 · `src/proxy.ts` · `page.preview.tsx` 무변경. `types.ts` diff 의 지운 줄은 합 꼴 끝 `;` 한 줄(기존 종류 · 필드 이름 그대로, 새 종류는 135~258 덧붙임). e2e diff 지운 줄 0(옛 단언 그대로, 옛 시험은 기록 줄 수를 세지 않아 새 env · devices 줄에 안 걸림). `/dev/speech-probe` 는 `proxy.ts:61` matcher(정적 파일 말고 전부) 뒤 그대로. 옛 시험 초록은 CI 20차 ⚠️ |
| 2 | 녹음 없음 · 트랙 멈춤 · 처리기 닫기 | ❌ 일부 | 수치만 남김 ✅(MediaRecorder · 전송 · 저장 없음 — grep 0, 이득 0 노드로만 destination). 재기 끝 · getUserMedia 실패 · 재기 중 던짐 · 듣기 끝 · 떠남 · 숨김에서 멈춤 ✅(아래 맞는 것 표). 그러나 처리기 깨우기(resume) 약속이 풀리지 않으면 트랙을 멈추는 길이 없다 → **I-1**. 비프 처리기가 안 닫히는 길 → M-1. 보고의 변이 시험 3건은 diff 로 확인 못 함 ⚠️ |
| 3 | Audio Session API 사용 꼴 | ✅(M-3 · M-4) | 고르는 값 넷(`probe-audio.ts:29-34`)은 구현 브리프 5 그대로, 읽는 값은 글 그대로라 `transient` · `transient-solo` 도 그대로 적힘. API 없으면 `audioSessionOf` undefined → `setAudioSessionType` undefined, 스위치 · 선택 상자 · playback 단추 disabled(`sessionSupported` 901). 자동 자리는 모두 누름 처리 안(`onSpeakTest` 836 · `onBeep` 810 · `startListen` 623(교대 '말하기' · 긴 말 · 감시) · `onMicCheck` 769 · `onMicLevel` 796 · `speakTurn(0)`). 교대 둘째 문장부터(709 → 657)는 누름 밖이고 기록에는 순서로만 드러남 → M-4. set 줄에 before · requested · after · threw · by. 기본 꺼짐(432) |
| 4 | 기록 · 복사 꼴 | ❌ 일부 | 새 종류 여섯 · 지연 요약 · 함께 잰 소리가 같은 `logRows`(865~)로 화면 표와 복사 글에 들어감 ✅, 지연 요약 복사는 e2e 단언. 장치 · 트랙 이름(label)이 복사 글에 그대로 → **I-2**. UA · 판정 '이름'(브라우저 이름, `core/speech/device.ts`) · 음성 이름에는 사람 이름 · 비밀값 길 없음 |
| 5 | 설계 숫자 | ✅ | `probe-audio.ts:13-27` 이름 붙인 관찰 페이지 상수(3000 · 50 · 0.01 · 2048 · 440 · 500 · 0.2), `MS_PER_SECOND` 도 이름. `check:ids` 직접 확인 0 · 새 파일 hit 0 · `code-setting-unknown 0`(설정 키와 안 섞임) |
| 6 | 시험 | ✅(M-5) | 단위 `it` 22(5 + 3 + 6 + 3 + 3 + 2 = 보고 16 + 4 + 2), 모두 값 단언. e2e 새 10(보고 13 → 16 → 18 = 옛 8 + 10 과 맞음), 기대값은 원본 상수에서 만듦. 가짜 꼴 어긋남 → M-5, 처리기 깨우기가 안 되는 길은 가짜에 없음(I-1 의 시험 몫) |
| 7 | 범위 밖 | — | 4절 '참고' |

## 2. 맞는 것(잘한 점)

| 무엇 | 근거 |
|---|---|
| 순수 · 브라우저 갈라 순수 쪽에 단위 22 | `probe-audio.ts` 는 브라우저를 안 읽음, `probe-browser.ts:5` `client-only` |
| 장치 deviceId · groupId 를 아예 안 읽고, 트랙 설정은 허용 목록만 | `probe-browser.ts:195` · `:31-39` · `:202-219` |
| 화면에는 수치 · 종류별 수만(이름은 기록 표) — 단위가 `not.toContain` 으로 단언 | `probe-audio.ts:141-157`, 단위 125-149 |
| getUserMedia · resume 을 누름 처리 안에서 동기로 부름 | `run()` 은 첫 await 앞에서 `getUserMedia`(`probe-browser.ts:330`), `resume()` 은 `:325` — `run()` 은 `:365` 에서 동기 호출 |
| 오류 길마다 트랙 stop · 처리기 close | getUserMedia 실패 close(`:331-333`, e2e 거부 시험 closed 2), 재기 중 던져도 트랙 stop · close(`:340-347`) |
| 듣기 끝 · 떠남 · 숨김이 모두 meter.stop 으로 이어짐 | `speech-probe.tsx:632` `handle.outcome.then(stop)`, outcome 은 dispose(`browser.ts:570-576` cancelNow 'leave') · 숨김(`:549-553`) · 다른 듣기(`:198`)에서도 풀림 |
| 자동은 바뀔 때만 줄을 남기고 같은 꼴이면 건너뜀 | `speech-probe.tsx:486-491`, e2e '자동' 시험 마이크 확인 뒤 줄 수 2 · '끈 채' 시험 0 |
| 복사 글이 붙여 넣기에 안전 | 칸 안 탭 · 줄바꿈을 빈칸으로(`probe-audio.ts:343`), `writeText` 누름 안 · 실패 때 글 상자 안내(`speech-probe.tsx:887-899`) |
| 지연 요약의 갈래가 단위로 덮임 | 같은 ms · 오류 끝 · start 던짐 · 다시 시작 객체 · 세션 꼴(단위 403-528) |
| 새 종류가 대본 JSON 을 깨지 않음 | `buildScript` 가 kind 로 걸러 씀(`speech-probe.tsx:239-247`), 옛 내보내기 시험 그대로 |

## 3. 지적

| ID | 심각도 | 자리 | 무엇 · 왜 · 어떻게 |
|---|---|---|---|
| I-1 | Important | `probe-browser.ts:325` · `:338` · `:344-347` · `:362-364` | **처리기 깨우기가 풀리지 않으면 마이크 트랙이 멈추지 않는다.** 무엇: `run()` 은 스트림을 받은 뒤 `await resumed`(:338)에서 기다린다. `resumed` 는 `resume().catch(...)` 라 거부는 넘기지만 풀리지 않고 머무는 약속은 못 넘는다. 트랙 stop 은 그 뒤(:344-345)에만 있고, `stop()`(:362-364)은 깃발만 세운다(깃발은 `sampleLevels` 의 틀 안에서만 읽힘 :256-262). 그러면 (가) '마이크 소리 재기'는 mic-level 줄이 안 남고 단추가 '재는 중'으로 꺼진 채(`speech-probe.tsx:1120`) 마이크가 켜져 있고, (나) '듣기 중 함께 재기'는 듣기가 끝나 `meter.stop()` 을 불러도 트랙이 살아 있어 같은 묶음의 뒤 듣기 · 마이크 확인이 열린 캡처와 겹친다(측정 오염, 기록에는 '재는 중'만). 왜: 브리프 볼 것 2 '재기 끝 · 듣기 끝 · 쪽 떠남 · 오류 때 트랙을 반드시 멈추는지'. WebKit 의 `AudioContext.resume()` 약속은 상태가 running 이 될 때 풀리고, 재생을 시작할 수 없는 때(사용자 동작 없음 · 세션 interrupted)는 풀리지 않은 채 남는다(WebKit BaseAudioContext 의 resume 처리 — 기억 기반, 확인 정도 중간). 이번 측정 대상(무음 모드 · 세션 꼴 전환 · 인식과 같은 때 캡처)이 처리기가 interrupted 로 갈 수 있는 바로 그 자리다. 가짜 `resume` 은 늘 바로 풀려(`speech-probe.spec.ts:419-422`) 이 길을 못 본다. 어떻게: resume 을 기다리지 말고 바로 재거나(처리기 상태는 `contextState` 로 이미 남고 suspended 면 '모두 0' 자체가 관찰 값), 기다리더라도 stop 요청 · 이름 붙인 짧은 한도와 겨룬다. `stop()` 은 스트림을 받았으면 그 자리에서 트랙을 멈춘다. 가짜에 '풀리지 않는 resume' 갈래를 더해 듣기 끝 · 정해진 틀 뒤 `stoppedTracks` 1 을 단언 |
| I-2 | Important | `probe-browser.ts:195` · `:274`, `probe-audio.ts:131` · `:208`, `speech-probe.tsx:887-899` | **장치 · 트랙 이름이 복사 글에 그대로 들어가 사람 이름이 대화로 갈 길이 있다.** 무엇: enumerateDevices 의 label 과 마이크 트랙 label 을 devices · mic-level 기록 줄에 그대로 적고, '기록 표 복사' 글이 그 줄을 담는다. iPad 에 블루투스 이어폰 · 외부 마이크가 이어져 있으면 입력 장치 label 이 그 기기의 블루투스 이름이 되고(기억 기반, 확인 정도 중간), AirPods 의 기본 이름은 '<주인 이름>의 AirPods' 다(Apple 기본 동작, 확인 정도 높음). 아이 계정 iPad 면 아이 이름이다. 왜: 브리프 볼 것 4 '장치 이름 · UA 같은 사실이 아이 이름 · 비밀값을 담을 길이 없는지' — 길이 있다. CLAUDE.md 기록(강제) '비밀값 · 아이 이름은 대화에 적지 않는다'. 복사 글은 요청자가 대화에 붙여 넣는 것이 목적이고(보고 '사파리에서 확인할 순서'), 대화는 훅이 볼트에 자동 기록한다. 구현 브리프 2 '이름은 기록 표에만'은 화면 노출만 막는다. 어떻게(컨트롤러 결정): (가) 기록 줄 · 복사 글에서 label 의 소유 꼴('…의 ' · "…'s " · "…’s ") 앞을 '(이름 가림)'으로 바꾸고 단위 시험, 또는 (나) label 대신 '내장 · 블루투스 · 그 밖' 갈래와 글자 수만, 그리고 (다) 요청자 안내 단락에 '붙여 넣기 전에 장치 이름 줄 확인' 한 줄. (가) + (다) 권함 — 블루투스 장치가 잡혔는지 보려는 목적(구현 브리프 2)은 남는다 |
| M-1 | Minor | `probe-browser.ts:405-408` · `:417-420` | **비프 처리기가 안 닫히는 길.** close 는 onended(:405-408)와 만들기 실패(:414)에만 있다. `resume()` 이 거부되면(:419) 오류 줄만 남고 처리기는 열린 채, 머무르면(I-1 과 같은 꼴) currentTime 이 안 가 onended 가 오지 않아 열린 채다. 누를 때마다 새 처리기를 만든다(:391). 왜: 브리프 볼 것 2 'AudioContext 를 닫는지(누수)' — 묶음 안에서 거듭 누르면 열린 처리기가 쌓여 뒤 측정의 처리기 상태에 섞일 수 있다. 어떻게: 거부 갈래에서 `closeQuietly`, 그리고 `BEEP_DURATION_MS` + 이름 붙인 여유 뒤에도 end 가 없으면 닫고 'end 없음' 줄을 남긴다(관찰 값은 그대로) |
| M-2 | Minor | `probe-audio.ts:131-136`(화면 `speech-probe.tsx:1134` · 기록 표 · 복사 글) | **'트랙' 낱말이 화면에 보인다.** '트랙 멈춤 예' · '트랙 muted' · '트랙 <이름> live' 가 '마이크 소리 재기' 결과와 기록 줄에 나온다(HEAD 판 관찰 페이지에는 '트랙' 0). 왜: CLAUDE.md Conventions '문서와 화면에서 "트랙" · "유닛"을 쓰지 않고, 영어 개발 용어는 직역하지 않고 알맞은 우리말로'(요청자 2026-10-15). 뜻은 MediaStreamTrack 이라 영역과 섞이진 않지만 낱말 규칙에 걸린다(개발용 쪽이라 Minor). 어떻게: '마이크 끔 예' · '마이크 소리 끊김(muted) 아니오 → 아니오' · '마이크 이름 …' 처럼 '마이크'로, 단위 · e2e 기대 글도 함께. 코드 식별자 `track` 은 그대로 |
| M-3 | Minor | `speech-probe.tsx:834-836` · `:860`, `:665-668` → `:657` | **읽어 주기 길마다 세션 꼴을 바꾸는 때가 다르다.** 'playback 으로 두고 읽어 주기' 단추는 꼴 바꾸기(860) → `unlockFromGesture`(834) → speak, '자동으로 두기'는 `unlockFromGesture`(834 · 665) → 꼴 바꾸기(836 · 657) → speak 다. 첫 누름의 제약 풀기 발화(`browser.ts:47-48` 빈칸 · 볼륨 0)가 자동 길에서는 앞 꼴로 나간다. 왜: 둘째 묶음(자동)과 단추 결과를 견주는 것이 이 판의 목적(보고 '추가 2')인데, 두 길의 순서가 다르면 차이가 꼴 때문인지 순서 때문인지 가를 수 없다(영향 크기는 사파리에서만 드러남). 어떻게: `onSpeakTest` · `onAltStart` 에서 `autoSession("playback")` 을 `unlockFromGesture` 앞으로 |
| M-4 | Minor | `speech-probe.tsx:709` → `:657`, `probe-audio.ts:225-230` | **누름 밖 꼴 바꾸기와 그 뒤 소리가 기록에 드러나지 않는다.** 교대 둘째 문장부터의 자동 playback 은 누름 밖이다(보고 '추가 2' 우려). set 줄의 '읽은 값'은 세터가 받은 값을 되읽을 뿐 실제 소리 길이 바뀌었는지는 말해 주지 않고, 교대 문장마다 '들렸어요' 답 자리도 없다(speak-event start → end 는 무음 모드에서도 찍힘 — 장부 H2 실측). 지금은 '누름 줄 없이 listen-done 바로 뒤의 set 줄'이라는 순서로만 짐작된다. 왜: 브리프 볼 것 3 '둘째 문장부터는 동작 밖 — 그 한계를 기록이 드러내는지'. 어떻게: set 줄(과 비프 start · 읽어 주기 줄)에 `navigator.userActivation?.isActive`(없으면 '없음')를 덧붙이고(Safari 16.4 이상에 있음 — 기억 기반, 확인 정도 중간), 요청자 안내에 '교대에서 몇째 문장부터 안 들렸는지 말로 적기' 한 줄 |
| M-5 | Minor | `tests/e2e/speech-probe.spec.ts:361-387` | **가짜 getUserMedia 가 부를 때마다 같은 트랙을 돌려준다.** 실제 API 는 부를 때마다 새 live 트랙을 주는데, 가짜는 한 `track` 객체를 되돌려 한 번 stop 하면 다음 스트림도 이미 ended 다. 그러면 `stopped`(`probe-browser.ts:346` 모두 ended)가 코드의 stop 없이도 '예'가 되고 `stoppedTracks` 는 늘지 않는다. 왜: 브리프 볼 것 6 '가짜가 실제 API 꼴과 어긋나 통과만 하는 자리'. 지금 시험은 쪽마다 getUserMedia 를 한 번만 불러(`getUserMedia` 1 단언) 빈 통과는 없지만, '소리 재기 → 함께 재기' 같은 두 번 시험을 더하면 빈 통과가 된다. 어떻게: getUserMedia 마다 새 track · stream 을 만들고 트랙마다 멈춤을 센다 |

## 4. 참고(범위 밖 — 앱 음성 접점에 audioSession 을 넣을 때, 다음 fix 브리프 재료)

1. **결정 기록 먼저.** 앱 음성 접점(`browser.ts`)에 세션 꼴을 넣는 것은 음성 동작 변경이라 13절에 한 줄을 먼저 더하고 따로 브리프로(구현 브리프 5 '원인이 가려지면 따로 브리프').
2. **iPad 크롬도 같이 바뀐다.** iOS 의 브라우저는 모두 WebKit 이라 iPad 크롬에도 `navigator.audioSession` 이 있을 가능성이 크다(기억 기반, 확인 정도 중간). 넣으면 지금 되는 크롬 길도 함께 바뀌므로 크롬 회귀를 같은 측정 묶음에 넣는다.
3. **회화 · 따라 말하기 교대도 둘째 턴부터 누름 밖이다.** 이 판 교대와 같은 꼴이라 M-4 를 고친 측정 결과가 앱 설계의 직접 재료다.
4. **턴마다 꼴을 오가면 처리기 · 소리 길이 흔들릴 수 있다.** 교대처럼 playback ↔ play-and-record 를 턴마다 바꾸는 꼴과 수업 동안 play-and-record 하나로 두는 꼴을 측정으로 견준 뒤 고른다(iOS 소리 길 동작은 확인 정도 낮음).
5. **Playwright WebKit 에 진짜 audioSession 이 있다(보고 우려 3).** 앱에 넣으면 기존 e2e 가 진짜 API 를 밟으므로, 이 판의 `installFakeAudio` 를 공용 도움 파일로 옮겨 쓴다(M-5 를 고친 꼴로).
6. **쪽 열림 때 처리기를 만들지 않는다(보고 우려 5).** `readAudioContextFacts` 는 관찰 페이지 한정이어야 한다.
7. **아이 화면 무음 모드 안내는 정본 문구로.** 이 쪽 노란 띠(`speech-probe.tsx:956`)는 정본 밖 개발용 문구다. 아이 화면에 둔다면 정본에 문구를 먼저 둔다.
8. **이 검토에서 확인 못 한 것.** CI 20차(`ci/p11-c2` 274ce92) 결과는 컨트롤러 덧 몫. 보고의 변이 시험 3건(track.stop · meter.stop · 스위치 조건)은 diff 로 확인할 수 없다.

## 5. 판정

**Changes requested** — I-1(처리기 깨우기가 머무를 때 트랙 멈춤 보장)과 I-2(복사 글의 장치 이름)를 고친 뒤 재검토. Minor 5개는 가벼운 루프 규칙대로 컨트롤러가 직접 처리해도 된다. fix 라운드 1/3.
