# 구현 보고: iPad 사파리 '결과 없음' 처리 고침 N1~N4 (impl · Opus · high, 2026-10-29)

상태: **DONE_WITH_CONCERNS**. N1~N4 와 정본 사본을 모두 고쳤고 단위 시험 · 린트 · 타입 · 의존 · 식별자 · 추적 관문이 통과한다. 통합 시험은 이 Mac 에서 시험용 Postgres 가 뜨지 않아 코드만 썼고, e2e 는 브리프대로 CI 에 맡겼다(돌리지 않음).

바탕: 워크트리 p13d(feature/1a-p13d-teacher, 커밋 b7cf682) 위에 앞선 구현자의 결함 A~E 변경이 커밋 없이 있는 상태. 그 변경 줄은 건드리지 않았다(아래 '남은 우려 4' 의 대조). 커밋하지 않았다. 마이그레이션은 파일만 만들었다.

## 1. 바뀐 파일 · 줄

### N1 — 'aborted · No speech detected' 를 no-speech 로 (C148)
- `src/core/speech/listen.ts:152-158` NO_SPEECH_CODE · 메시지 정규식, `:162-178` recognitionErrorCodeOf 가 aborted + 'No speech detected' 를 no-speech 로 바꾼다(받아쓰기 꺼짐 M-10 과 같은 꼴), `:462-470` 멈추는 중(stop 뒤) no-speech 이고 끊어 듣기(chunk)가 아니며 모은 글이 없으면 no-speech 오류로 끝낸다. chunk 이면 그대로 이어 듣고, 메시지 없는 aborted 는 그대로 '결과 없음'이다.
- `src/lib/speech/browser.ts:272-273` 주석만(이미 recognitionErrorCodeOf 를 부른다).
- `src/components/conversation/child-turn.tsx:54-62` silentListenOf(no-speech 오류만 셈 — 결과 없음 갈래 뺌), `:283-284` 그 함수를 쓴다.
- 말하기 판정(`src/core/speaking/judge.ts`)은 고치지 않았다. no-speech 는 이미 여섯 번 셈에서 빠지고 말소리 없음 문항 셈에 들기 때문이다(시험으로 확인, 3절).

### N2 — 듣기 사건 요약 칸 client_listen (C149)
- 새 파일 `src/core/conversation/client-listen.ts`: 꼴(ClientListenSchema · ClientListenEntrySchema, strict) · CLIENT_LISTENS_MAX(20, 기술 값) · clientListenRowOf(순수 — '모름'의 출처 src 를 화면의 nospeech 표시로 정함).
- 새 파일 `src/lib/speech/listen-log.ts`: 음성 접점 기록 사건(onTrace)을 받을 때 글 · 인식 글 · 오류 메시지를 버리고 시각 · 종류만 남기며(남김 상한 2000, 기술 값), 듣기마다 o · by · d · as · snd · fr · tc 로 줄인다. take() 는 앞 기록 뒤 끝난 듣기만 꺼낸다.
- `src/server/conversation/turn.ts:23-27` 가져옴, `:157-158` 요청 꼴 clientListen(선택), `:225` · `:253-254` childRowOf 가 clientListen 칸을 돌려준다(삽입은 기존 `...fields` 로 들어감).
- `src/db/schema/learning.ts:222-223` talk_turns.client_listen jsonb(비울 수 있음).
- 마이그레이션 `drizzle/0005_talk_turns_client_listen.sql`(한 줄 `ALTER TABLE "talk_turns" ADD COLUMN "client_listen" jsonb;`) · `drizzle/meta/0005_snapshot.json` · `drizzle/meta/_journal.json`(drizzle-kit generate 가 만듦).
- `src/core/conversation/attempt.ts:6` · `:32-33` 따라 말하기 시도 꼴에 clientListen(선택).
- `src/server/conversation/index.ts:17` · `:678-679` · `:771` 따라 말하기 저장 꼴 · 시도 입력에 clientListen.
- `src/lib/talk-stream.ts:6` · `:29-30` 턴 요청 본문 꼴.
- `src/components/conversation/talk-frame.tsx:48` · `:66` 가져옴, `:352-360` 듣기 기록을 만들어 createBrowserSpeech 의 onTrace 로 넘김, `:370` 효과 의존, `:698-710` takeClientListen(기기 판정 이름 · 3D(그림 층 render) · 듣기 요약 · 세션 실패 셈 mf), `:732` 턴 본문, `:841` 따라 말하기 환경, `:873-875` 그림 층 참조.
- `src/components/conversation/follow-along.tsx:32` · `:247-248` FollowEnv.clientListen, `:353` · `:378` 시도 저장에 싣는다.

### N3 — 듣는 동안 읽어 주기 단추 끔
- `src/components/conversation/tori.tsx:237` · `:253-254` listening 선택 속성, `:292` 말풍선(다시 듣기) · `:334` 답 듣기 ①② 의 disabled. 앞선 구현자가 고친 설명 줄(359 근처)은 그대로다.
- `src/components/conversation/child-turn.tsx:368-369` 힌트 문장 듣기 disabled={listening}.
- `src/components/conversation/talk-frame.tsx:1044` 말풍선에 listening 을 넘긴다.

### N4 — 결과 없음 · 오류 듣기의 endedAt
- `src/components/conversation/child-turn.tsx:64-74` speechStoppedAt(순수 — 들은 결과만 끝 조용함을 뺌), `:231-236` endedAt 에 쓴다.

### 정본 사본(p13d `specs/`)
- 13절 C148 · C149: **이미 이 작업 트리 사본에 들어 있었다**(`specs/10-결정-기록.md:318-319`, 제가 넣지 않음 — 같은 날 C127 보완 줄과 함께 다른 쪽이 넣은 것으로 보인다). 그래서 다시 더하지 않았다.
- 7절 오류 행 한 줄: `specs/07-음성과-오류.md:29`('iPad 의 Safari · Chrome(WebKit)은 … aborted('No speech detected')로 끝낸다. 앱은 모은 글이 없을 때 이것을 no-speech 로 본다(C148, 실측 2026-10-22)').
- 3.3 막힘 문단 한 줄: `specs/02-2-세션과-단계표.md:129`.
- 5절 talk_turns 칸: `specs/04-데이터.md:35`(client_listen jsonb 와 값 목록, 글 · 인식 글 · 소리 없음, 따라 말하기 시도 입력에도 같은 꼴, C149).
- 12절: 바뀌는 설정 없음(새 숫자는 모두 기술 값 상수 — 꼴 검사 상한 · 남김 상한).

## 2. 설계와 다르게 한 것 · 까닭

1. **tc 꼴**: C149 문구는 '듣기 직전 읽기 끊김 여부'인데, 분석 보고 2판 4.1 대로 'cut'(읽는 중 끊음) 또는 읽기가 끝난 뒤 ms 로 두었다. 끊김 여부를 담고 '읽기 끝 0.7초 안 누름'(분석 1순위 후보의 둘째 조건)도 가를 수 있다. 앞에 읽기가 없으면 칸이 없다. 소리 없는 풀기 읽기(unlockFromGesture 의 ' ')는 읽기로 보지 않는다.
2. **by(끝난 까닭)**: 들음은 판정의 endedBy 그대로다. 결과 없음 · 오류는 판정 결과에 까닭이 없어 기록에서 정한다(단추 사건이 있으면 button, 듣기 길이 ≥ 상한이면 cap, 아니면 browser). 끊김 · 멈춤에는 두지 않는다.
3. **src(출처)는 서버가 정한다**: 화면이 이미 보내는 input.nospeech 로 서버가 button · nospeech 를 정하고, 요청 꼴은 src 를 받지 않는다(strict). 화면 꼴이 없는 '모름'도 출처만은 남긴다({src}). 말한 턴에 화면 꼴이 없으면 null.
4. **한 기록에 드는 듣기**: 앞 기록(아이 턴 보내기 · 따라 말하기 저장) 뒤 끝난 듣기 전부(최근 20개)다. 따라 말하기에서 막혀 저장되지 않은 차례의 듣기는 다음 기록에 들어간다.
5. **브리프 목록 밖 파일**(N2 를 끝까지 잇는 데 필요): `src/server/conversation/index.ts`(따라 말하기 저장 꼴), `src/lib/talk-stream.ts`(턴 본문 꼴), 새 파일 둘(`client-listen.ts` · `listen-log.ts`), drizzle meta 두 파일, `tests/integration/talk-fixture.ts`(say 에 nospeech · clientListen).
6. **스키마 칸은 타입 없는 jsonb**: 다른 jsonb 칸(mission_checks · ai_question)처럼 `$type` 을 붙이지 않았다(db 스키마가 core 를 가져오지 않게).

## 3. 덮는 시험(이름)

단위(통과):
- `tests/unit/listen-end.test.ts` 'iPad WebKit 말소리 없음(C148)' 일곱: C148 aborted 의 메시지가 'No speech detected' 면 no-speech … / C148 말하기 단추로 stop 한 뒤 … no-speech 오류다 / C148 상한(speech.max_listen_seconds)으로 stop 한 뒤 … / C148 모은 글이 있으면 … 모은 글로 끝난다 / C148 끊어 듣기(chunk)로 stop 한 뒤의 … 이어 듣는다 / C148 듣는 중에 … no-speech 오류다 / C148 우리 쪽 stop 뒤 메시지 없는 aborted 는 그대로 '결과 없음'이다. 흉내(scriptInput)도 browser.ts 처럼 메시지로 코드를 고르게 했다.
- `tests/unit/speaking-judge.test.ts` C148 iPad WebKit 의 말소리 없는 듣기 … '마이크가 멈춤'이 아니라 '말소리 없음'으로 간다.
- `tests/unit/talk-child-listen.test.ts`(새): C148 회화 아이 차례의 말소리 없음 셈에는 no-speech 로 끝난 듣기만 … / AC-N8 말소리 없음 '모름' 뒤 체감 대기는 첫 문장 − 마지막 듣기 끝이고 … / C148 듣는 동안 토리 말 다시 듣기와 답 듣기 ①② 단추는 꺼지고 … / C148 듣지 않을 때 힌트 문장 듣기 단추는 켜져 있다(듣는 동안 꺼짐은 e2e).
- `tests/unit/talk-listen-log.test.ts`(새): C149 읽는 중 끊고 들은 iPad 말소리 없음 듣기는 o error:no-speech · by button · snd 거짓 · tc cut 이고 … / C149 상한으로 끝난 결과 없음은 by cap … / C149 모르는 오류 코드는 error:other 로 … / C149 요청 꼴은 … 글이 든 칸은 거른다 / C149 아이 행 칸의 '모름' 출처는 … / C149 따라 말하기 시도 꼴에 듣기 요약 칸(clientListen)을 둘 수 있고 ….
- `tests/unit/conversation-server.test.ts` C149 아이 행에 듣기 사건 요약(client_listen)을 두고 '모름'의 출처는 … (행 꼴 도움 함수에 clientListen: null 한 줄).

통합(코드만, 돌지 않음): `tests/integration/conversation-session.test.ts` C149 아이 행에는 듣기 사건 요약과 '모름'의 출처가 저장되고 따라 말하기 시도에도 듣기 요약이 들며 글은 들지 않는다.

e2e(코드만, CI): `tests/e2e/conversation.spec.ts` 'iPad '결과 없음' 고침(C148 · C149)' 셋 — C148 AC-15g iPad WebKit 꼴(단추 stop 뒤 aborted 'No speech detected')로 … '모름'과 같이 처리되고 아이 행에 말소리 없음 출처와 듣기 요약이 남는다 / C148 AC-N3 iPad WebKit 꼴의 말소리 없는 듣기로 회화 질문 셋이 … '마이크가 멈춤'이 아니라 '말소리가 잘 안 들려요' … / C148 듣는 동안 토리 말 다시 듣기 · 답 듣기 ①② · 힌트 문장 듣기 단추가 꺼져 있고 …. 흉내 꼴은 `tests/e2e/talk.ts` webkitSilentRun(start → audiostart → stop → aborted 'No speech detected' → end). AC-N3 짝은 고치기 전 코드라면 첫 질문의 여섯째 듣기에서 '마이크가 잘 안 돼요'로 막혀 빨강이 된다.

먼저 실패 확인: listen-end 다섯(C148 가운데 메시지 · 단추 · 상한 · chunk 둘째 몫 · 듣는 중), talk-child-listen 셋, talk-listen-log(모듈 없음), conversation-server 하나가 고치기 전에 실패했다. speaking-judge 의 C148 시험은 listen.ts 를 고친 뒤 썼으므로 지킴 시험으로만 둔다.

## 4. 실행 명령 · 출력

모두 `cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH` 뒤.

| 명령 | 결과 |
|---|---|
| `pnpm test` | Test Files 94 passed · Tests 993 passed, 6 todo |
| `pnpm lint` | Checked 440 files, No fixes applied |
| `pnpm exec tsc --noEmit` | 출력 없음(통과) |
| `pnpm check:deps` | no dependency violations found (227 modules, 1217 dependencies) |
| `pnpm check:ids` | 종료 0 · table-mismatch 0 · 테이블 29/29 (design-number 45 는 변경 전과 같은 수) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0 · unknown-ac 0 · plan-ac-not-in-spec 0 (missing-test 16 은 변경 전과 같은 수) |
| `pnpm test:int` | 돌지 않음: embedded-postgres initdb 가 `could not create shared memory segment: Cannot allocate memory`(커널 SHMALL) · `could not find suitable text search configuration for locale "ko_KR.UTF-8"` 로 실패 |
| e2e | 돌리지 않음(브리프 — CI) |

마이그레이션 적용(컨트롤러): 개발용 DB 가 로컬 내장 Postgres 면 `pnpm db:dev`(띄울 때 늘 마이그레이션), Supabase 개발 DB 면 `.env.local` 의 MIGRATION_DATABASE_URL 로 `pnpm db:migrate`. 더하기만 하는 칸 하나라 옛 행은 null 이다.

## 5. 요청하는 변경(정본 · 설계)

- **7절 말하기 버튼 행 한 줄(N3 근거)**: 분석 A2 대로 '듣는 동안 읽어 주기 단추(토리 말 다시 듣기 · 답 듣기 · 힌트 문장 듣기)는 끈다'를 둘지 컨트롤러가 정해 주세요. 브리프가 정본 줄을 정하지 않아 넣지 않았고, 지금은 코드만 그렇게 한다.
- 말하기 세션 · 배치 평가의 듣기 사건 기록(분석 2판 N2 '말하기 틀')은 브리프 범위 밖이라 하지 않았다.

## 6. 남은 우려

1. **통합 · e2e 미실행**: 위 4절. CI 에서 처음 돈다. 특히 e2e 셋의 단추 두 번 누름 흉내(듣기 열림 → 다시 눌러 stop)는 실제 실행에서 확인해야 한다. r3d 값은 e2e 에서 단언하지 않았다.
2. **말하기 영역에도 동작이 바뀐다(의도대로)**: iPad 말하기 세션 · 배치 평가에서 단추 · 상한 stop 뒤 말소리 없음이 이제 no-speech 다. 여섯 번 '마이크가 멈춤' 대신 문항 건너뜀이 말소리 없음 문항으로 세어져 speech.silent_items_max 에서 '말소리가 잘 안 들려요'로 간다(C22 · C148 그대로). 데스크톱 크롬이 stop 뒤 빈 글로 no-speech 를 내는 경우도 같은 길이 된다.
3. **따라 말하기 건너뜀 값**: no-speech 로만 건너뛴 회화 따라 말하기 차례도 skipped 'recognition' 으로 저장된다(시도 꼴에는 'silent' 가 있다). 범위 밖이라 고치지 않았다. 이제 clientListen 으로 가를 수 있다.
4. **같은 작업 트리의 동시 변경**: 작업 중에 `src/core/conversation/flow.ts` · `tests/unit/talk-repeat.test.ts` · `specs/10-결정-기록.md` 가 다른 쪽(앞선 구현자의 검토 fix 1 · 컨트롤러로 보임)에서 바뀌었다. 저는 그 파일을 고치지 않았다. 앞선 구현자 변경 파일 가운데 talk.ts · conversation-call.test.ts · talk-bubble.test.ts 의 +/− 줄은 저장된 diff 와 같음을 대조했다. 또 관문 수(design-number · missing-test)가 변경 전과 같은지 보려고 약 1분 동안 `git stash` → 검사 → `git stash pop` 을 했다. 충돌 없이 복원됐고 stash 목록은 비어 있다. 그 사이 다른 쪽이 같은 추적 파일을 썼다면 pop 이 충돌을 냈을 것이므로 잃은 변경은 없다고 본다. 다만 동시 작업 중에는 하지 말았어야 할 일이라 적어 둔다.
5. **tc 의 한계**: 읽어 주기 사건에는 발화 번호가 없어, 끊긴 앞 발화의 늦은 끝 알림이 새 발화 시작 뒤에 오면 그 발화가 끝난 것으로 잘못 볼 수 있다(드묾, 진단용 값).
6. **D3 · N0**(따라 말하기의 '읽는 중 누름' 실측 · 단추 끄기)은 이번 범위가 아니다. 이번 칸(tc · snd)이 그 실측과 다음 재현의 근거가 된다.
