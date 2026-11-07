# 검토: iPad 사파리 '결과 없음' 처리 고침 N1~N4(코드 검토자 · Opus · xhigh, 2026-10-29, 1라운드)

판정(1라운드): **Approved**. Critical 0 · Important 0 · Minor 3 입니다.

대상은 스냅숏 `task-talk-speech-fix.diff`(같은 폴더, 1603줄)와 추적하지 않는 새 파일 여섯입니다. 지금 워크트리 p13d 의 코드 줄은 스냅숏과 글자까지 같습니다. 스냅숏 뒤에 바뀐 것은 문서뿐입니다(`.claude/CLAUDE.md` · `specs/01-개요.md` · `specs/07-음성과-오류.md:26` 말하기 버튼 행 · 13절 C150). 그 가운데 07 말하기 버튼 행의 새 줄은 이번 N3 의 정본 근거가 되므로 아래에서 함께 봅니다. 인사 '모름' 턴 결함 A~E 의 변경(flow.ts 의 `toriKoShownOf` · `normalizeSpoken`, turn.ts 의 뜻 줄 · recast, talk.ts 지시 한 줄, tori.tsx:359, 그 시험들)은 범위 밖이라 보지 않았습니다. 시험은 다시 돌리지 않았습니다. 판단은 diff, 새 파일, 그리고 이름 붙일 수 있는 위험을 확인하려고 읽은 diff 밖 코드로 했습니다.

## 1. 설계 준수

### N1 · C148 (말소리 없음 읽기)

| 항목 | 판정 | 근거 |
|---|---|---|
| 'aborted + No speech detected' 를 no-speech 코드로 | ✅ | `src/core/speech/listen.ts:179-180`. 받아쓰기 꺼짐 검사(`:177-178`)가 먼저 걸리고, 메시지 없는 aborted(우리 쪽 abort)는 그대로입니다. 음성 접점은 이미 이 함수를 불렀으므로(`src/lib/speech/browser.ts:278`) 주석만 바뀐 것이 맞습니다. |
| 모은 글이 없을 때만 no-speech 오류 | ✅ | 멈추는 중 갈래 `listen.ts:464-469` 가 'no-speech · chunk 아님 · 모은 글 없음'일 때만 오류로 끝냅니다. 글이 있으면 `:470-471` 이 모은 글로 끝냅니다. 듣는 중에 오면 한 문장 답은 결과(browser), 여러 문장 답은 이어 듣기입니다(`:474-482`). 7절 사본 문장 '모은 글이 없을 때 이것을 no-speech 로 본다'(`specs/07-음성과-오류.md:29`)와 맞습니다. |
| chunk 다시 시작 길 그대로 | ✅ | `:466` 의 조건에서 chunk 를 빼고, chunk 면 `afterStop`(`:389-392`)이 새 객체를 엽니다. 글 없는 chunk 도 이어 듣는 단위 시험이 있습니다. |
| 다른 오류(not-allowed · audio-capture · network) 그대로 | ✅ | 멈추는 중의 나머지 코드는 전처럼 `errorOutcome`(`:472`)이고, 코드 바꿈은 aborted 에만 닿습니다. 마이크 확인은 원래 코드(`browser.ts:563`)를 써서 이번 변경이 닿지 않습니다. |
| 말하기 판정 함수에서 여섯 번 셈 제외(C22) | ✅ | `src/core/speaking/judge.ts` 의 `failure` 가 no-speech 일 때 micFailures 를 올리지 않고, 활동이 no-speech 로만 끝나면 silentItems 를 올립니다. 판정 함수를 고치지 않은 판단이 맞습니다. 지킴 시험은 `tests/unit/speaking-judge.test.ts:248-280` 입니다. |
| 아이 차례 '결과 없음' 갈래 뺌 | ✅ | `src/components/conversation/child-turn.tsx:108-110` · `:284`. 정본 3.3 막힘 문단(`specs/02-2-세션과-단계표.md:129`)의 'no-speech 로 끝난 듣기'와 맞습니다. 셈은 들음일 때만 0 으로 돌아가므로(`:244`) '인식된 말 없이'라는 조건과도 맞습니다. |
| 회화 셈 흐름 | ✅ | 대화 턴마다 next-activity 로 활동 셈이 0 이 되고(`src/components/conversation/talk-frame.tsx:605-609`), 한 턴의 no-speech 는 talk.nospeech_dontknow_count 에서 '모름'으로 갑니다. 회화의 말소리 없음 막힘은 `silentCountStep`(`talk-frame.tsx:195-214`)이 셉니다. no-speech 는 여섯 번 셈에 들지 않습니다. |

### N2 · C149 (듣기 사건 요약 칸)

| 항목 | 판정 | 근거 |
|---|---|---|
| 글 · 소리 · 개인 정보가 들어갈 길 | ✅ 없음 | `src/lib/speech/listen-log.ts:44-83` 이 기록 사건을 받을 때 읽어 준 글(영어 이름이 채워진 글) · 목소리 이름 · 인식 글 · 오류 메시지를 버리고 시각과 종류만 쌓습니다. 결과 종류 o 는 정규식으로 묶이고(`src/core/conversation/client-listen.ts:16-17`), 두 꼴 모두 strict 입니다(`:21-38` · `:42-51`). br 은 `describeDevice` 의 '기기 · 브라우저 · 판'(`src/core/speech/device.ts:131-133`)이라 parent_alerts 의 browser 와 같은 값이고, 기기 식별자가 아닙니다. src 는 서버가 화면의 nospeech 표시로 정하고 요청 꼴은 받지 않습니다(`client-listen.ts:64-76`). 요약은 DB 저장에만 쓰이고 AI 입력이나 화면 응답으로 가지 않습니다. |
| 마이그레이션이 더하기만인가 | ✅ | `drizzle/0005_talk_turns_client_listen.sql` 은 비울 수 있는 칸 하나를 더하는 한 줄입니다. `drizzle/meta/_journal.json` 의 idx 5 tag 가 파일 이름과 같고, `0005_snapshot.json` 의 prevId 가 0004 의 id 이며, 두 스냅숏의 차이는 이 칸 하나입니다. 옛 행은 null 입니다. |
| 서버 요청 꼴의 Zod 검증 | ✅ | 회화 턴 `src/server/conversation/turn.ts:157-158`, 따라 말하기 저장 `src/server/conversation/index.ts:678-679`. 둘 다 선택 칸이라 옛 화면도 통과합니다. |
| 크기 상한 | ✅ | 회화 턴 경로의 본문 상한(`src/app/api/talk/turn/route.ts:17`, 4000자)은 그대로입니다. 꼴이 허용하는 최대치(듣기 20개의 모든 칸 최댓값과 아이 글 500자)를 직렬화하면 아래와 같아 상한 안입니다. 따라 말하기 저장은 서버 액션이라 이 상한이 없습니다. |
| 따라 말하기 시도 꼴 | ✅ | `src/core/conversation/attempt.ts:32-33` 의 선택 칸이고, 옛 시도도 읽힙니다(`tests/unit/talk-listen-log.test.ts:285-307`). 저장은 `index.ts:771` 입니다. |
| 관찰 페이지와 같은 사건에서 나오는가 | ✅ | 회화 틀이 음성 접점을 만들 때 `onTrace` 로 기록을 넘깁니다(`talk-frame.tsx:353-357`). 관찰 페이지와 같은 `SpeechTraceEntry`(`src/lib/speech/types.ts:123-157`)입니다. |
| 5절 사본 | ✅ | `specs/04-데이터.md:35` 의 값 목록이 코드 꼴(src · br · r3d · listens 의 o · by · d · as · snd · fr · tc · mf)과 같습니다. tc 를 '끊김 여부'보다 넓게 둔 것은 분석 보고 4.1 그대로이고, 브리프가 값을 4.1 로 정했습니다. |

본문 크기 계산(스크래치패드에서 JSON 직렬화):

| 경우 | 듣기 요약 | 본문 전체 |
|---|---|---|
| 꼴이 허용하는 최대치 | 2883자 | 3697자 |
| 실제 꼴(듣기 20개) | 1923자 | 2737자 |

### N3 · N4

| 항목 | 판정 | 근거 |
|---|---|---|
| 듣는 중 세 단추 끔 | ✅ | 다시 듣기 `src/components/conversation/tori.tsx:292`, 답 듣기 ①② `:334`, 힌트 문장 듣기 `child-turn.tsx:369`. 회화 틀이 아이 차례의 듣는 중 상태(`talk-frame.tsx:1095`)를 말풍선에 넘깁니다(`:1044`). |
| '잘 모르겠어요' · 말하기 단추 그대로 | ✅ | diff 가 건드리지 않았습니다. '잘 모르겠어요'는 원래 듣는 중에 꺼져 있고(`child-turn.tsx:424`), 말하기 단추는 듣는 중에 다시 눌러 끝낼 수 있게 켜진 채입니다(`:399`). |
| N3 의 근거 표기 | ⚠️ | 코드와 시험이 근거를 C148 로 적었습니다. 아래 M-1 입니다. |
| N4 끝 조용함을 결과 없음 · 오류 때만 빼지 않음 | ✅ | `child-turn.tsx:116-122` 는 들은 결과일 때만 끝 조용함을 빼고, `:232-236` 이 그 값을 씁니다. 말소리 없음 '모름' 행은 listen_end_seconds 를 보내지 않으므로, AC-N8(`specs/11-요구사항과-수용-기준.md:172`)의 뺄셈 뒤 값은 '첫 문장 − 마지막 듣기 끝'입니다. 들은 턴은 전과 같아 listen_end_seconds 뺄셈과 계속 맞습니다. |

### 시험

| 항목 | 판정 | 근거 |
|---|---|---|
| N1 단위 | ✅ | `tests/unit/listen-end.test.ts` 'iPad WebKit 말소리 없음(C148)' 일곱이 단추 · 상한 · 글 있음 · chunk 둘 · 듣는 중 · 메시지 없는 aborted 를 단언합니다. 흉내(`:82-89`)도 브라우저와 같은 함수로 코드를 고르게 바꿔, 단위 시험이 실제 기기의 코드 고르기를 지납니다. |
| e2e AC-15g · AC-N3 | ✅ | `tests/e2e/conversation.spec.ts:2284` · `:2318`. 흉내 꼴 `tests/e2e/talk.ts:344-364` 는 브리프 차례(start → audiostart → stop → aborted 'No speech detected' → end) 그대로입니다. 가짜 인식은 message 를 넘기고(`src/lib/speech/fake-web-speech.ts:81`), stop 때 남은 예약을 지운 뒤 onStop 사건을 냅니다(`:140-154`). 그래서 'start' 사건 전에 둘째 누름이 와도 흉내가 돕니다. 새 AC-N3 는 기존 AC-N3(`conversation.spec.ts:2115-2147`)와 같은 꼴이고 흉내만 다릅니다. '고치기 전이면 첫 질문의 여섯째 듣기에서 mic_stalled' 라는 짝 설명도 판정 함수 셈과 맞습니다. |
| N2 단위 · 통합 | ✅ | 단위 `tests/unit/talk-listen-log.test.ts` 가 요약 꼴 · 글 없음 · 꺼낸 뒤 다시 안 나옴 · 상한 20 · 꼴 거부를 단언합니다. 통합 `tests/integration/conversation-session.test.ts:315-408` 은 화면 자료(viewOf)를 먼저 엽니다(`:317`). 지난 검토 I-1 의 함정이 없고, 기존 따라 말하기 시험(`:261-313`)과 같은 차례입니다. |
| N3 e2e | ✅ | `conversation.spec.ts:2352`. 첫 대화 턴에는 답 두 개와 영어 힌트 단이 있어(기존 단언 `:202` · `:237-240`) 네 단추가 모두 그려집니다. |
| N4 단위 | ✅ | `tests/unit/talk-child-listen.test.ts:63-89`. |
| 실제 멈춘 자리(오늘 쓸 말)의 e2e | ⚠️ | 브리프 목록 밖입니다. 아래 M-3 입니다. |

### 정본 사본 · 설정값 · 원칙

| 항목 | 판정 | 근거 |
|---|---|---|
| 3.3 · 7절 사본과 C148 | ✅ | `specs/02-2-세션과-단계표.md:129` · `specs/07-음성과-오류.md:29` 가 C148(`specs/10-결정-기록.md:318`)과 같은 내용이고, 7절은 '모은 글이 없을 때' 조건까지 적었습니다. |
| 5절 사본과 C149 | ✅ | `specs/04-데이터.md:35`(위 N2 표). |
| 13절 C148 · C149 | ⚠️ | p13d 사본에는 있습니다(`specs/10-결정-기록.md:318-319`). 본 저장소 정본과 다른 작업 트리에는 아직 C148 이 없어, 문서 가지의 글과 '같은 글'인지는 견주지 못했습니다. |
| 설정값 원칙 | ✅ | 새 숫자는 꼴 검사 · 남김 상한(`client-listen.ts:7-13`, `listen-log.ts:13`)이고 '기술 값'으로 적었습니다. 설계 숫자는 설정값에서 읽습니다(`child-turn.tsx:286`, e2e 의 TEST_SETTINGS). 12절에 바뀌는 키는 없습니다. |
| check:ids 의 table-mismatch 가 통과한 까닭 | ✅ 설명됨 | 이 검사는 5절 표의 첫 칸(테이블 이름)과 스키마의 pgTable 이름만 견줍니다(`scripts/check-ids.ts:368-378` · `:635-651`). 칸 수준의 대조가 없어서, 칸을 더해도 5절 글을 고치지 않아도 걸리지 않습니다. 그러므로 통과는 칸 일관을 증명하지 않습니다. 5절 칸 줄은 사람이 맞췄고, 그 내용이 코드 꼴과 맞음을 이 검토에서 대조했습니다. |
| 녹음 금지 | ✅ | 소리를 받거나 남기는 코드가 없습니다. |
| 이름 가림 | ✅ | 영어 이름이 채워진 읽기 글을 받는 즉시 버립니다(`listen-log.ts:74-76`). 인식 글도 남기지 않습니다. |
| 브리프 목록 밖 파일 | ✅ | `src/server/conversation/index.ts` · `src/lib/talk-stream.ts` · 새 파일 둘 · drizzle meta · `tests/integration/talk-fixture.ts` 는 N2 를 끝까지 잇는 데 필요한 것뿐입니다. |
| 용어 | ✅ | 새 글에 '트랙' · '유닛'이 없습니다. |

## 2. 잘한 점

- **판정을 듣기 층 한 곳에서 바꿨습니다.** 코드 고르기와 멈추는 중 갈래만 고쳐서 회화 · 말하기 · 배치 평가 · 관찰 페이지가 같은 결과를 받습니다. 판정 함수와 화면 셈을 건드리지 않아 C22 의 셈이 그대로 iPad 에도 적용됩니다.
- **글을 받는 순간 버립니다.** 기록 쪽이 글 없는 사건으로 바꾼 뒤에 쌓으므로, 요약 단계의 실수로 글이 나갈 길이 처음부터 없습니다. 서버 꼴도 strict 라 두 겹으로 막힙니다.
- **'모름'의 출처를 서버가 정합니다.** 화면이 이미 보내는 nospeech 표시만 믿고, 요청 꼴은 src 를 받지 않습니다. 화면이 출처를 꾸밀 길이 없습니다.
- **흉내를 실제 코드와 같은 함수로 맞췄습니다.** 단위 시험의 흉내가 브라우저 접점과 같은 코드 고르기를 지나므로, 흉내와 기기의 어긋남이 줄어듭니다.
- **남은 우려를 스스로 밝혔습니다.** 말하기 영역의 동작 변화, 건너뜀 값, 동시 작업 중의 stash 를 보고에 적었습니다.

## 3. 지적

### Critical

없습니다.

### Important

없습니다.

### Minor

**M-1. N3(듣는 동안 단추 끄기)의 근거를 13절 C148 로 적었습니다.**
- 자리: `src/components/conversation/tori.tsx:253`, `src/components/conversation/child-turn.tsx:8` · `:368`, 시험 이름 `tests/unit/talk-child-listen.test.ts:120` · `:133`, 시험 이름 `tests/e2e/conversation.spec.ts:2352`.
- 왜: C148(`specs/10-결정-기록.md:318`)은 'aborted · No speech detected' 를 no-speech 로 읽는 것만 정하고 단추 끄기는 말하지 않습니다. N3 의 근거는 분석 보고 A2 와, 스냅숏 뒤 컨트롤러가 더한 7절 말하기 버튼 행(`specs/07-음성과-오류.md:26` '2026-10-29 음성 분석 A2 · N3')입니다. 결정 번호로 찾아가면 C148 에서 단추 규칙을 찾을 수 없고, 나중에 C148 을 되돌릴 때 N3 까지 함께 지워질 수 있습니다.
- 어떻게: 주석과 시험 이름의 'C148' 을 '7절 말하기 버튼 행(분석 A2 · N3)'으로 바꿉니다. 결정 번호가 필요하면 컨트롤러가 13절에 한 줄을 더합니다.

**M-2. 막힘(마이크 멈춤 · 말소리 없음 · 마이크 필요)으로 끝난 차례의 듣기 요약은 어디에도 남지 않습니다.**
- 자리: 따라 말하기는 막힘 판정이면 `tryOnce` 가 아무것도 돌려주지 않고(`src/components/conversation/follow-along.tsx:419-420`), `speak` 가 저장 없이 끝납니다(`:512`). 아이 대화 턴도 막힘이면 보내지 않습니다(`child-turn.tsx:277-282`). 요약은 기록(아이 행 · 따라 말하기 시도)을 할 때만 꺼내는데(`talk-frame.tsx:702-709`), 막힌 뒤에는 '홈'만 남고 다음 세션은 새 틀이라 기록도 새로 시작합니다.
- 왜: C149 의 목적은 '다음 재현에서 말을 안 함 · 소리가 안 들어옴 · 읽기 끊고 들음 · 3D 때만을 가르는 것'입니다(`specs/10-결정-기록.md:319`). 10-24 · 10-26 의 재현은 둘 다 막힘으로 끝났습니다(브리프 '확정된 사실'). 지금 꼴로는 막힘 바로 앞 차례(10-26 이면 둘째 낱말)의 듣기가 빠지고, 앞서 건너뛰어 저장된 차례의 것만 남습니다. 막힘 알림(`talk-frame.tsx:522-530`)은 kind · code · browser 만 싣습니다.
- 어떻게(컨트롤러 판단): 시도 꼴에 이미 있는 건너뜀 값 'stalled' · 'silent' · 'no_mic'(`src/core/conversation/attempt.ts:31`, `src/server/conversation/index.ts:678`)으로 막힌 차례를 저장하면서 clientListen 을 싣는 길이 가장 작습니다. 아이 대화 턴의 막힘은 같은 길이 없어 따로 정해야 합니다. 브리프와 C149 가 정하지 않은 일이라 Minor 로 둡니다.

**M-3. 실제로 멈춘 자리인 '오늘 쓸 말'에서 WebKit 꼴 흉내를 도는 e2e 가 없습니다.**
- 자리: 새 e2e 셋(`tests/e2e/conversation.spec.ts:2284` · `:2318` · `:2352`)은 모두 대화 턴만 돕니다.
- 왜: 브리프의 확정 사실대로 10-26 은 '오늘 쓸 말' 첫 낱말에서 결과 없음 세 번 뒤 멈췄고, 분석 보고 5.3 의 N1 시험 칸도 'AC-15g · AC-N3 · 오늘 쓸 말 건너뜀'을 적었습니다. 브리프 시험 목록에는 빠져 있어 설계 미충족은 아닙니다. 판정 층은 단위 시험(listen-end · speaking-judge)이 덮지만, 따라 말하기 조각의 건너뜀 저장과 clientListen, 그리고 막힘 화면의 종류는 실제 화면에서 단언되지 않습니다.
- 어떻게: '오늘 쓸 말'을 webkitSilentRun 으로 돌려, 건너뛴 낱말의 attempts 에 skipped 와 clientListen.listens(o 'error:no-speech' · by 'button')가 들고 마이크 멈춤 알림이 생기지 않음을 단언합니다(AC-15g '인식이 세 번 실패한 단어는 건너뛴다', `specs/11-요구사항과-수용-기준.md:137`). 넣을지는 컨트롤러가 정합니다.

## 4. 범위 밖 관찰 · 운영 확인

- **멈춘 뒤의 진짜 no-speech 도 같은 길입니다.** `listen.ts:464-469` 는 코드만 보므로, 데스크톱 크롬 등이 우리 쪽 stop 뒤에 글 없이 no-speech 를 내도 이제 '결과 없음'이 아니라 no-speech 오류입니다. 7절의 'no-speech 는 이 수에 넣지 않는다'와 맞아서 지적하지 않습니다. 구현 보고 6절 2 와 같은 내용입니다.
- **WebKit 문구에 기댑니다.** `listen.ts:158` 의 정규식이 'No speech detected' 를 봅니다. WebKit 이 문구를 바꾸면 예전 동작('결과 없음')으로 돌아갈 뿐이라 지금보다 나빠지지 않습니다. 받아쓰기 꺼짐(M-10)과 같은 꼴입니다.
- **마이그레이션을 먼저 적용해야 합니다.** Drizzle 스키마에 칸이 생겨 talk_turns 를 읽고 쓰는 모든 길이 client_listen 을 부릅니다. 0005 를 개발 · 운영 DB 에 적용하기 전에 이 코드를 배포하면 회화가 멈춥니다. e2e(`scripts/dev-db.ts --ephemeral`)와 통합 시험은 띄울 때 마이그레이션을 적용합니다. 구현 보고 4절의 적용 명령은 맞습니다.
- **건너뜀 값은 늘 'recognition' 입니다.** `follow-along.tsx:518-522` 는 no-speech 로만 건너뛴 낱말도 'recognition' 으로 저장합니다(구현 보고 6절 3). C148 로 iPad 에서 그런 낱말이 늘어나므로 시도 꼴의 'silent' 값과 어긋남이 커집니다. 이제 clientListen 으로 가를 수 있습니다.
- **같은 워크트리의 stash.** 구현자가 동시 작업 중에 `git stash` · `git stash pop` 을 했습니다(구현 보고 6절 4). 지금 stash 목록은 비어 있고, 코드 줄은 스냅숏과 같습니다. 여러 쪽이 한 워크트리에서 일할 때는 stash 대신 `git diff` 사본으로 견주는 편이 안전합니다.
- **구현 보고 5절의 요청(7절 말하기 버튼 행 한 줄)은 스냅숏 뒤 문서에 반영됐습니다**(`specs/07-음성과-오류.md:26`). 말하기 세션 · 배치 평가의 듣기 기록은 브리프 밖입니다.

## 5. 판정

**Approved** (Critical 0 · Important 0 · Minor 3). Minor 셋은 내보내기를 막지 않습니다. M-1 은 표기만 고치면 되고, M-2 · M-3 은 컨트롤러가 다음 묶음에 넣을지 정합니다.
