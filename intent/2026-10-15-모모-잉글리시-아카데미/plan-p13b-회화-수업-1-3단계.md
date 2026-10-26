# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P13b 회화 수업 1~3단계(세션 서버 · 턴 길 · 회화 틀 · 다섯 토막 · 마무리 · 연결)

spec: `specs/` 정본(3.3 회화 문단 전부 · '대화가 멈추는 경우' 표 · 회화 단계표 1~3 행, 3.4 '말함' 문단, 3.5 토리와 친한 정도, 4절 회화 세션 표 · 회화 마무리 행 · 홈 회화 카드 '누르면' 행 · 수업 목록 표(회화가 같은 목록), 5절 sessions · attempts · talk_turns · talk_summaries · vocab_progress · profile_tracks 회화 열 · 전이 표 회화 줄, 6.1 이름 가림 · 프롬프트 캐시 · 기록, 6.2 회화 턴 행 아래 문단 넷, 7절 회화 읽어 주기 · 마이크를 쓸 수 없음 · 듣기를 끝내는 때 · 인식 결과 확인 · 오류 행, 8절 회화 턴 실패 · 끝맺음 없이 떠난 대화 · 대화 안전 상한 · 'AI 쉬는 중' 표 '목표 턴 뒤의 회화' · 같은 프로필의 동시 사용, 10절 접근 제어(회화 스트리밍 포함), 12절 talk.* · speech.* · ui.* · session.resume_hours · ai.timeout_seconds.feedback, 13절 C2 · C3 · C10 · C22 · C23 · C30 · C32 · C33 · C34 · C36 · C41 · C50 (1) 걷어냄 · C53 (2) · C80 · C85, 15절 AC-2c(회화) · 5c(회화 세션) · 8b(회화) · 8c(그만하기 응답 뒤) · N3(회화) · N8 · 15a · 15b(대화 몫) · 15c(세션 점수) · 15e(1~3단계) · 15f · 15g(1단계) · 15h(1단계) · 15i · 15j · 15k(저장 · 다시 씀) · 15l(1~3단계) · 15m(화면) · 15p · 16b(화면 · 요약) · 16c(1-가 몫), approved 2026-10-16 06:2x) · 델타 spec `intent/2026-10-16-회화-선생님-수업/spec.md` · 묶음 plan P13 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-22 · 상태: approved(컨트롤러 2026-10-22 15:5x — 정할 것 회1~회22 권함대로, 13절 C89~C98 · 회2 평가 나눔은 묶음 plan P12 · P13 행에; 회23 은 표본 평가 결과 뒤 요청자. 요청자 되읽기는 PR 때, C85 '회화 우선' 지시)
승인: (컨트롤러 검토 대기 — 정할 것 회16~회18, a 몫 회1~회15) · 브랜치 · 워크트리: `feature/1a-p13-conversation`(a · c 와 같은 브랜치 · 워크트리 p13) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P13 의 둘째 묶음이다. 짝은 `plan-p13a-회화-턴-호출과-수업-규칙.md` 이고, 셋이 함께 쓰는 사실(나눈 까닭과 배정 · 가정 · 화면을 보는 차례 · 바탕 가지와 겹치는 파일 · P12 와 나누는 몫 · 회화 수업 모델(값 0) · 정본 밖 문구 · 정할 것 회1~회15 · 확인한 사실)은 그 파일의 같은 이름 절에만 있다. 이 plan 의 작업은 그 파일 '화면을 보는 차례'의 차례 4 · 5 · 6 이다. a 의 차례 1~3(회화 턴 호출 · 수업 규칙 순수 함수) 위에 선다.
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.

## 목표 (Goal)

- **회화 세션 서버(차례 4).** 회화 수업은 P11 의 수업 시작(`startLesson` → `startLessonSession` — 목록 재판정 · 판 · 변형 · 하던 수업 중단)을 같이 쓰고 세션을 토막 greeting 으로 연다. 세션 화면을 처음 열 때 처음 스냅숏(그때 이미 만난 단원 단어 · 오늘 쓸 말 목록 · 말해 보기 차례)과 앱의 첫 말(토리 행 1)을 넣는다. 아이 말 하나는 Route Handler `POST /api/talk/turn`(제안) 하나다 — 접근 확인 → 세션 행 잠금 → 아이 행 저장 → 1-가 하루 안전 상한 · 대화 안전 상한 판정 → a 의 `talkTurn` 으로 토리의 말을 문장마다 검사해 NDJSON 줄로 흘려 보냄 → 토리 행 · '말했다' · 만남 · 영어로 말한 문장 수 · 목표 턴 · 친한 정도를 저장 → 앱이 붙일 말과 다음 차례를 끝 줄로. 따라 말하기(오늘 쓸 말 · 말해 보기 · 정리)는 서버 액션이 바로 attempts 에 남긴다. '그만하기' · '홈' · 이어 하기 · 끝맺음 턴(응답 뒤 `after()`) · 홈 진입 정리(목표 턴 뒤 앱을 닫은 대화 · 미룬 끝맺음 · 닫힌 대화의 보낸 메시지 지우기)를 회화 수업 모델 5 의 표대로 한다.
- **회화 틀과 1~3단계 화면(차례 5 · 6).** 한 화면에 한 토막(4절). 위 띠 '말 주고받기 n / 목표 턴'(목표 턴 뒤 '다 했어요! 더 이야기하기 n / talk.more_talk_round_turns') · 오늘 이야기 제목 · '홈'. 가운데 토리 표시(`ToriFigure` — 1-가는 '토' 동그라미, a 정할 것 회14)와 말풍선: 점 셋 → 5초(ui.wait_hint_seconds 둘째 값) 넘으면 '토리가 생각하고 있어요', 검사를 지난 문장이 흘러나오듯 보이고 바로 읽힘(1~2단계는 천천히), 1~3단계는 영어가 다 흐른 뒤 한국어 뜻을 한 번에, 그림 턴(C32)은 말풍선 옆 큰 그림 · 글 없음, 1단계 처음 묻는 턴 · 인사 턴은 질문 뒤 답 두 개를 'Or' 사이에 두고 들려주고 글 없는 ①② 단추, 말풍선을 누르면 다시 읽음, 따로 '다시 듣기' 단추 없음. 아이 차례: 큰 말하기 단추(듣는 동안 남은 시간 고리) · 작은 '힌트'(누를 때마다 한 단 — 1~2단계 뜻 → 영어 문장, 3단계 뜻 → 영어 틀 → 영어 문장, 영어 문장 단에 듣기 단추, 첫 회화 수업에 '막히면 눌러요' 한 번) · '잘 모르겠어요'. 대화 토막에서는 힌트를 열기 전 영어 문장이 보이지 않는다(T2). 인식 확인 talk.confirm_seconds('다시 말하기' · '보내기', 1~3단계는 연 영어 문장 · 들은 답과 맞으면 바로). 옆 칸 오늘 이야기 목록, 아래 '토리의 약속' 한 줄. 오늘 쓸 말 · 말해 보기 · 정리 화면, 마무리 세 장(1~3단계는 둘째 장 건너뜀), 처음 회화 안내(3.3 글 그대로, '시작!' 누름이 첫 읽어 주기).
- **연결(차례 6).** 홈 회화 카드 · '이야기 고르기'가 회화 수업 목록으로(R14, C50 (1) '토리가 준비 중이에요' 자리를 지움), 수업 목록이 회화를 받고, 세션 쪽 `/session/<id>` 가 회화 세션을 회화 틀로 그린다. 시험용 시드에 1단계 회화가 들어가(a 정할 것 회5) **요청자가 프리뷰에서 1단계 회화 수업을 홈부터 끝까지** 한다(H4 전에는 1~3단계 실패 길 — a 가정 나).
- 경계: 4~12단계 화면 몫 · 마무리 둘째 장(5단계부터 잘한 말 · 다음엔 이렇게, 4단계 바꿔 말해 준 문장) · 토리 이야기 쪽 · 홈 회화 카드 칸 · 평가 대화는 c. 별 · 단원 통과 · 연속 일수는 P12(a 'P12 와 나누는 몫'). 'AI 쉬는 중' 상태 · 부모 화면은 1-나.

## 바뀌는 파일 (Files that change)

손 파일 스물다섯 줄(새 열다섯 · 고침 아홉 · 지움 하나 — 음성 셋 · 시험 넷은 한 줄에 묶고, 회화 e2e 는 차례 5 · 6 에 한 줄씩이라 파일로는 스물아홉). 검토 묶음 셋(b1 서버, b2 틀 · 말풍선 · 아이 차례, b3 따라 말하기 · 마무리 · 연결).

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `src/server/conversation/index.ts` | 신규 | `server-only`. 화면 자료 · 처음 스냅숏 · 따라 말하기 저장 · 토막 넘김 · 더 이야기하기 · 그만하기 · 홈 · 목표 턴 닿음 · 이음매(값 1) | b1 · 4 |
| `src/server/conversation/turn.ts` | 신규 | `server-only`. 턴 길(값 2) | b1 · 4 |
| `src/server/conversation/closing.ts` | 신규 | `server-only`. 끝맺음 턴 · 홈 진입 정리 · 보낸 메시지 지우기(값 3) | b1 · 4 |
| `src/server/actions/conversation.ts` | 신규 | `'use server'`. 회화 액션(값 4). 첫 문장 `await requireAccess()` | b1 · 4 |
| `src/app/api/talk/turn/route.ts` | 신규 | Route Handler — NDJSON(값 5). 첫 문장 `await requireAccess()` | b1 · 4 |
| `src/server/session/index.ts` | 수정 | 회화 수업 시작 받기(값 6) | b1 · 4 |
| `src/server/lesson-list/index.ts` | 수정 | 영역 형에 회화(값 6) | b1 · 4 |
| `tests/integration/conversation-session.test.ts` | 신규 | 시작 · 스냅숏 · 따라 말하기 · 상태 전이 · 그만하기 · 홈 · 이어 하기 · 끝맺음 · 홈 진입 정리 · 안전 상한 · 다시 하기 · 두 기기 | b1 · 4 |
| `tests/integration/conversation-turn.test.ts` | 신규 | 턴 길(가짜 SSE): 저장 차례 · 같은 시도 id · 말했다 · 만남 · 1~3 두 번 실패 · 끊긴 턴 · '더 이야기할 거리' AI · 80턴 · 다시 쓸 차례 | b1 · 4 |
| `src/components/conversation/talk-frame.tsx` | 신규 | 'use client'. 회화 틀(값 7) | b2 · 5 |
| `src/components/conversation/tori.tsx` | 신규 | 'use client'. 토리 표시 경계 · 말풍선(값 8) | b2 · 5 |
| `src/components/conversation/child-turn.tsx` | 신규 | 'use client'. 아이 차례(값 9) | b2 · 5 |
| `src/lib/talk-stream.ts` | 신규 | 턴 요청 · NDJSON 읽기 · 체감 대기(값 10) | b2 · 5 |
| `src/lib/speech/{types,browser,fake-web-speech}.ts` | 수정 | `speak(text, { rate })` 선택 속성(값 11) | b2 · 5 |
| `src/app/(child)/session/[id]/page.tsx` | 수정 | 회화 세션은 회화 틀로(값 12) | b2 · 5 |
| `tests/e2e/talk.ts` | 신규 | e2e 도우미: 회화 견본 넣기 · 세션 열기 · 가짜 SSE 규칙 · 가짜 음성 대본(값 13) | b2 · 5 |
| `tests/e2e/conversation.spec.ts` | 신규 | 1단계 인사 · 대화 · 힌트 · '모름' · 인식 확인 · 첫 문장 먼저 · 말풍선 다시 읽기 | b2 · 5 |
| `src/components/conversation/follow-along.tsx` | 신규 | 'use client'. 오늘 쓸 말 · 말해 보기 · 정리 · 처음 안내(값 14) | b3 · 6 |
| `src/components/conversation/closing-cards.tsx` | 신규 | 'use client'. 마무리 세 장(값 15) | b3 · 6 |
| `src/app/(child)/[area]/lessons/page.tsx` | 수정 | 회화도 수업 목록(talk redirect 지움) | b3 · 6 |
| `src/app/(child)/talk/page.tsx` | 지움 | C50 (1) '토리가 준비 중이에요' 자리 | b3 · 6 |
| `src/app/(child)/home-cards.tsx` | 수정 | 회화 카드 · '이야기 고르기'가 `/talk/lessons` 로(`TALK_PATH` 지움) | b3 · 6 |
| `src/app/(child)/page.tsx` | 수정 | 홈 진입 응답 뒤 `closeIdleTalks`(값 3) | b3 · 6 |
| `tests/e2e/conversation.spec.ts` | 수정 | 홈부터 1단계 끝까지 · 오늘 쓸 말 · 말해 보기 · 정리 · 마무리 · 그만하기 · 이어 하기 · 3단계 힌트 · 그림 턴 · 마이크 · 1-가 안전 상한 · 대화 안전 상한 | b3 · 6 |
| `tests/e2e/{home,lesson-list,placement,font-size}.spec.ts` | 수정 | '토리가 준비 중이에요' · `href="/talk"` 단언을 회화 수업 목록으로(P10 시험 — 위험 4) | b3 · 6 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **회화 세션 서버(`src/server/conversation/index.ts`).** 모두 `{ db?, now }` 를 받고 그 프로필의 회화 세션만 다룬다(남의 세션은 거부). 시각은 `now()` 한 시계.
   - `loadTalkView({ sessionId })` → `TalkView | undefined`: 그 프로필의 회화 세션이고 (진행 이거나 완료 + talk_segment 가 wrap_up 아님)이면 자료, 아니면 undefined(쪽이 회화 수업 목록으로). 처음 열 때(토리 행 · 처음 스냅숏 시도가 없을 때) 한 트랜잭션(세션 행 FOR UPDATE)으로 처음 스냅숏(a 값 0 4 · 값 13 — 시도 id `talk-start:<세션 id>` · ON CONFLICT DO NOTHING) 과 토리 행 1(1~3단계 카드 인사 질문 · 1단계는 답 두 개도, 4단계부터 카드 토리 첫 말 — AI 없음)을 넣는다. 자료 칸: 세션(단계 · 단원 · 종류 · 다시 하기인지) · 카드(아이 화면 몫 — {NAME} 틀 그대로, 화면이 영어 이름으로 채움) · 규격 회화 칸 · 영어 이름 · 오늘 이야기 제목(수업 행 `listTitle`) · 흐름(a `talkFlowOf`) · 자리(a `talkPositionOf` — 이어 할 자리) · 오늘 쓸 말 · 말해 보기 항목과 차례 · 화면에 다시 그릴 턴(이어 할 때는 마지막 토리 행과 지금 질문 — 이어 할 때 AI 호출 없음, a 정할 것 회11 (9)) · 지금 질문의 힌트 단(a `hintTiersOf`) · 설정(talk.* · speech(P2a `speechSettingsFrom`) · 회화 듣기(a `talkSpeechSettingsFrom`) · ui.wait_hint_seconds · ui.match_phrase_levels · ui.auto_next_seconds · speech.slow_rate(회12) · ai.timeout_seconds.feedback) · 동음이의어(P9c `loadSeedList("homophones")`) · 단원 단어 원형 표 · 친한 정도 · 한 번 안내 기록(회17) · `resting`(P11b `aiRestingToday` 이고 목표 턴 전 — 화면이 안내).
   - `saveFollowAlong({ sessionId, clientAttemptId, segment, index, round?, target, heard, failures, skipped? })` → attempts 한 행(활동 번호 a `followAlongNo` · 같은 시도 id 는 한 번 · 점수 · 단어별 정오 없음 · status done) + sessions.english_sentences += a `talkEnglishSentenceDelta`. AI 없음.
   - `advanceTalk({ sessionId, to })` → talk_segment 를 차례대로만 넘김(a `talkFlowOf` 차례, 거꾸로 · 건너뛰기 거부). today_words 들어갈 때 오늘 쓸 말 단어 전부 만남(say 행 — 처음 스냅숏 뒤라 처음 · 다시 묻는 턴 판정에 닿지 않음), talk 들어갈 때 대화 첫 질문(카드 — 1~3단계 첫 대화 턴 질문, 4단계부터 카드 질문 1번)을 인사 끝 토리 행의 글 · 다시 쓸 토리 차례 뒤에 붙이고(다음 호출 전) 그 질문이 노린 단어 만남(a 값 0 4).
   - `chooseMoreTalk({ sessionId })` → 완료 세션에서만, talk_segment more_talk(한 번에 talk.more_talk_round_turns 턴 — 남은 수는 턴에서 셈).
   - `stopTalk({ sessionId, confirmed })` → 목표 턴 전이면 `confirmed` 가 있어야(C34 확인 쪽지) · status aborted + learning_day · talk_segment wrap_up, 목표 턴 뒤면 wrap_up 만. 1-가 안전 상한이 아니면 끝맺음 턴을 응답 뒤로(값 3, AC-8c) — 상한이면 목표 턴 전은 끝맺음 없음 · 목표 턴 뒤는 미룸(a 정할 것 회4). 돌려줌: 정리 자료(a `wrapUpLinesOf` · 카드 끝인사 — 끝맺음을 기다리지 않음, C33) · 마무리 자료(값 15).
   - `leaveTalk({ sessionId })` → 목표 턴 전이면 아무것도 바꾸지 않음(진행, C34), 목표 턴 뒤면 wrap_up + 끝맺음 응답 뒤(a 정할 것 회11 (10)) · 마무리 첫 장 자료.
   - `reachTalkTarget(tx, { session, at })`(안에서만): status completed · completed_at · learning_day(C56 (1)) · 다시 하기가 아니면 친한 정도(a `friendshipAfter`) → profile_tracks(talk) friendship · tori_stories_opened · 그다음 `onTalkSessionEnded(tx, …)`(제안 — 빈 이음매, P12 가 별 · 단원 통과 판정을 붙임). 중단(그만하기 · 다른 수업 · 시간 지남)에서도 같은 이음매를 부른다(3.2 '회화는 회화 세션이 끝날 때(완료 · 중단 모두)') — P10 의 다른 수업 고르기 · `closeStaleSessions` 로 닫힌 회화는 다음 홈 진입 정리(값 3)가 이음매를 부른다(P10 파일을 고치지 않게).
   - `markTalkNotice({ kind })` → profiles.notices_seen[kind] = 지금(회17).
   - `readTalkSessionArea({ sessionId })` → 그 프로필 세션의 영역 · 상태(쪽이 고르는 데 씀, 값 12).
2. **턴 길(`src/server/conversation/turn.ts` `runTalkTurnRequest(raw, { now, write })`).**
   - (1) 입력 Zod: `{ sessionId, clientAttemptId, input: { mode: "speech" | "dont_know", text?: string, nospeech?: boolean }, hint: { opened: number, heard: ("two_answers" | "answer_example")[] }, listenEndSeconds?: number, confirmSkipped?: boolean, prevPerceivedWaitMs?: number }`(글 상한 `TALK_TEXT_MAX`, 기술 값). 꼴이 틀리면 `{ t: "error" }`.
   - (2) 한 트랜잭션(세션 행 FOR UPDATE — 두 기기 줄 세움, 회18): 그 프로필의 회화 세션 · 대화가 안 닫힘 · 지금 자리(a `talkPositionOf`)가 아이 차례. 같은 시도 id 의 아이 행이 있으면 — 다음 토리 행도 있으면 저장된 토리 글 · 붙인 말 · 끝 상태를 다시 흘려 보냄(AI 없음), 없으면 그 아이 행으로 AI 만 다시(8절 '토리의 말이 없는 마지막 턴이 있으면 같은 시도 id 로 다시 받는다' · AC-15f). 자리가 어긋나면 `{ t: "stale" }`(화면이 자료를 다시 읽음).
   - (3) 아이 행 저장(보내기 전, 5절): 이름 묻기 턴이면 a `maskNameAnswer` → 이름 변형 · 연락처 가림(a2 가 내보낸 `maskerFor` 로 — 저장 글에 이름 · 전화번호 없음, 6.1 · AC-16b) · 입력 방식 · 힌트 종류(a `hintKindOf`) · 쓴 단 · 들은 도움 · 노린 단어 · 처음/다시(a `askKindOf`) · 목표 턴 안 · 단어 수 · 듣기 끝 대기 · 확인 건너뜀 · 시도 id. 앞 아이 행에 체감 대기(`prevPerceivedWaitMs`). '말' 턴이고 인식 글이 있으면 english_sentences + 1(C41).
   - (4) 1-가 하루 안전 상한(P11b `aiRestingToday`, a 정할 것 회4): 목표 턴 전이면 `{ t: "resting" }`(세션 진행 · 아이 행 남음 — 다음 학습일에 같은 시도 id 로 이어 받음), 목표 턴 뒤면 정리로 닫음(`{ t: "close", reason: "resting", lines: 카드 정리 대사, farewell: 카드 끝인사 }` · talk_segment wrap_up · 끝맺음은 미룸).
   - (5) 대화 안전 상한(P9c `talkSafetyOf`, 아이 턴 수 = '모름' 포함 전부 — a 회11 (14)): 닿으면 회화 턴을 부르지 않고 `{ t: "close", reason: "safety", farewell: 카드 safetyFarewell }` · wrap_up · 끝맺음 응답 뒤 · 그 학습일 닿은 수가 talk.safety_alert_count 면 알림 `createAlertOnce({ kind: "talk_safety_cap", profileId, thresholdKey: "talk.safety_alert_count", once: "day", value: { sessionId } })`(3.3 · 8절 · AC-15j).
   - (6) 입력 만들기(a `TalkTurnInput`): P11b `levelContextOf`(세션 판) · 카드 · 지난 대화 요약 = 그 세션 started_at 전에 남은 talk_summaries 최근 talk.memory_summaries 개(대화 시작 때 고정 — 저장 없이 같은 값, 6.1 · B4-07) · 앞 턴 짝(아이 행 sent_user_message · 다음 토리 행 tori_rewrite — 글자 그대로) · 이번 턴 칸(바뀐 칸은 앞 아이 행의 값과 견줘 바뀐 때만) · 첫 턴이면 앱의 첫 말.
   - (7) `talkTurn(input, { profileId, sessionId, level, requestReceivedAt, onSentence })` — 문장마다 `write({ t: "s", en })`({NAME} 틀 그대로).
   - (8) 결과에 따라(a 값 7 `appendAfter` · 8절):
     - ok: `write({ t: "ko", ko })`(1~3단계 — tori_ko + 붙일 카드 질문 뜻, 회11 (7)) · 붙일 말 `write({ t: "add", kind, en, ko?, answers? })`(kind: question · again(답 예시 + 같은 질문) · two_answers · more_prompt('Do you want to talk more?')) · 1~3단계 '더 이야기하기'의 AI 질문은 a `checkLowLevelAiQuestion` 으로 보고 걸리면 '더 이야기할 거리' 가운데 이 대화에서 가장 오래전에 쓴 것(AC-15i) · 저장: 아이 행에 self_used_words · said_words(a `saidWordsOf`) · stuck_phrase(stuck 참이면 아이 글) · sent_user_message, 토리 행 n+1(원문 = 검사 뒤 tori_en + 붙인 말, 되풀이 문장 · 설명 · 새 단어 · 미션 체크 · 카드 질문 번호 · 길이 초과 · 다시 쓸 토리 차례(a `toriRewriteOf`)) · '말함' 행(만남 = a `metWordsIn`(검사를 지난 tori_en + 붙인 카드 질문) · '말했다' = said_days · known — 단원 복사본 talk.known_days) · 목표 턴에 닿은 턴이면 `reachTalkTarget` · 끝 줄 `{ t: "end", next: { pending(지금 질문 — 질문 · 노린 단어 · 처음/다시 · 1단계 답 두 개 · 그림 키), hints(a `hintTiersOf`), talkCount, target, targetReached, moreLeft, segment, explanation?, dontKnowCount, missionsDone? } }`. 설명(explanation)은 토리 말풍선 아래 글(읽지 않음).
     - cut_after_first(첫 문장 뒤 끊김 · 타임아웃 · refusal · max_tokens): 같은 질문을 되풀이하지 않는다. 1~3단계는 다음 카드 질문을 붙이고 다음 턴 힌트는 카드 그 턴 힌트, 4단계부터는 보낸 문장에 물음표 문장이 없으면 아직 쓰지 않은 가장 앞 카드 질문을 붙이고 힌트는 그 카드 질문 힌트, 있으면 힌트 단추 없음(C19). 그 턴은 '말했다'를 세지 않는다(AI 단어 없음).
     - 실패(첫 문장 전 — 다시 불러도 실패 · 설정 문제 · 그 밖): 1~3단계는 카드 칭찬 대사(`praiseLines` 를 턴 번호로 돌려 고름)를 `{ t: "s" }` 로 + 다음 카드 질문, '말했다' 없음(8절 · AC-15b). 4단계부터는 `{ t: "break", en: "Oops, I need a little break!", ko?: "나 잠깐 쉬어야 해!"(4단계) }`(a 정할 것 회9) — 화면이 '여기까지 이야기한 것은 저장했어요. 다음에 이어서 해요' 뒤 수업 목록, 세션 진행, 끝맺음 없음.
     - 거절(Haiku → Sonnet 까지 거절): 카드 안전한 대사 + 1~3단계는 다음 카드 질문, 대화는 이어 감(8절).
   - (9) 알림 기준(하루 호출 · 비용)은 막지 않는다(AC-8b — P9c `preCallGate` 는 안전 상한만). 로그에는 오류 이름 · Postgres 코드만(`safeDbError`).
3. **끝맺음 · 홈 진입 정리(`src/server/conversation/closing.ts`).**
   - 끝맺음 기록 = attempts 한 행(activity_no 0(제안), 시도 id `talk-closing:<세션 id>` — 유일 색인이 잡기를 겸함, ai_feedback `{ state: "pending", failures, claimedAt }` → `{ state: "ready", value: { farewell, farewellKo, goodLines, nextTime } }` → `{ state: "failed", failures }`, P11b 첨삭 상태와 같은 꼴, 정할 것 회18). 두 번 실패하면 요약 없이 닫는다(8절).
   - `scheduleTalkClosing(sessionId, { schedule = after })` → `runTalkClosing(sessionId)`: 잡기(INSERT … ON CONFLICT DO NOTHING 또는 claimedAt 이 ai.timeout_seconds.feedback × `AI_WAIT_TIMEOUT_MULTIPLE` 보다 낡은 것만 UPDATE — SQL 안 now() 대신 매개변수) → a `talkClosing`(같은 대화 · 끝맺음 칸) → ready 면 요약을 talk_summaries 에(검사 통과 · {NAME} · 가림 · talk.summary_max_chars, 걸리면 저장 안 함 — 6.4), 실패면 failures + 1 → 그 세션 talk_turns 의 sent_user_message · tori_rewrite 를 지움(끝맺음이 끝났거나 두 번 실패한 뒤 — 끝맺음이 그 대화 기록을 써야 하므로, B5-21).
   - `talkClosingStatus({ sessionId })` → `{ state, value? }`(마무리 둘째 장이 `CLOSING_POLL_MS`(3000, 기술 값)마다 읽음 — c).
   - `closeIdleTalks({ profileId, at })`(홈 쪽 `after()`, 10절 · 8절 '끝맺음 없이 떠난 대화'): 1-가 안전 상한이면 끝맺음은 부르지 않고 정리만. 대상 (가) 완료 · 대화 안 닫힘 · 마지막 턴 recorded_at < at − talk.idle_close_minutes → wrap_up 으로 닫고 끝맺음(마무리는 안 보임) (나) wrap_up · 끝맺음 대기(잡기 낡음) · 실패 < 2 → 다시 (다) 중단된 회화(그만하기 · 다른 수업 · 시간 지남)로 이음매를 아직 안 부른 것 → `onTalkSessionEnded` · 보낸 메시지 지움. 한 진입에 끝맺음 많아야 `IDLE_CLOSINGS_PER_ENTRY`(2, 기술 값 — Hobby 300초 안). 다른 기기의 진입은 talk.idle_close_minutes 전이면 대화를 닫지 않는다(8절 '같은 프로필의 동시 사용' · AC-15f).
4. **회화 액션(`src/server/actions/conversation.ts`, `'use server'`).** `saveTalkFollowAlong` · `advanceTalk` · `chooseMoreTalk` · `stopTalk`(응답 뒤 끝맺음 — `after()`) · `leaveTalk` · `talkClosingStatus` · `markTalkNotice`. 모두 첫 문장 `await requireAccess()`, 입력은 서버 Zod, 아이 글을 로그에 내지 않음. 마이크 알림은 P11a `reportSessionMic` 을 그대로 부른다.
5. **Route Handler(`src/app/api/talk/turn/route.ts`).** `export const dynamic = "force-dynamic"` · `maxDuration`(제안 60 — 회화 턴 기다림 두 배 + 저장). `POST(request)`: 첫 문장 `await requireAccess()`, `isSameOrigin(request)` 가 아니면 403, 본문 크기 상한, `ReadableStream` 을 열고 `runTalkTurnRequest(body, { now, write })` 의 줄을 `JSON.stringify(line) + "\n"` 로 넣어 `content-type: application/x-ndjson; charset=utf-8` · `cache-control: no-store` 로 돌려준다(a 정할 것 회6). 줄 꼴: `{ t: "s", en }` · `{ t: "ko", ko }` · `{ t: "add", kind, en, ko?, answers? }` · `{ t: "end", next }` · `{ t: "resting" }` · `{ t: "break", en, ko? }` · `{ t: "close", reason, lines?, farewell }` · `{ t: "stale" }` · `{ t: "error" }`. 정적 검사 `tests/unit/access-gate.test.ts`(모든 route.ts 처리기 · 'use server' 함수의 첫 문장이 `requireAccess()` 인지)가 새 route.ts 와 액션 파일을 저절로 본다(허용 목록에 넣지 않음).
6. **겹치는 파일(a '바탕 가지와 겹치는 파일').**
   - `src/server/session/index.ts` `startUnsafe`: `LESSON_AREAS` 에 talk, 회화 수업 행은 `LESSON_SCHEMAS.talk`(P4 `TalkLessonSchema` — 이미 표에 있음)로 읽되 `.content` 가 아니라 `.card` 를 씀(지금 줄 431 의 `.content` 는 회화에서 비어 있음), AI 필요 판정은 `area === "talk" || aiNeededLesson(…)`(P11b `attempt.ts` 는 고치지 않음 — 회화는 늘 AI 필요, a 회4), 세션 행에 `talkSegment: "greeting"`(회화만). 부분 유일 색인 충돌 길의 `lesson.area !== "talk"` 조건을 지움(회화 하던 수업도 돌려줌).
   - `src/server/lesson-list/index.ts` `readLessonList`: 영역 형을 `Area` 로(회화도 목록 — 끝낸 수업 = 완료 세션 = 목표 턴 닿은 회화라 P10 규칙이 그대로 맞음). 잠긴 단원 단어 조건의 회화 문구는 P12.
7. **회화 틀(`src/components/conversation/talk-frame.tsx`).** P10 종이 띠(`PaperBand`) 꼴로 위 띠(영역 회화 · 단계 · 단원 · 오늘 이야기 제목 · '말 주고받기 n / 목표 턴' · '홈'), 오른쪽 구석 작은 '그만하기'(대화 토막 · 더 이야기하기 동안), 옆 칸 하나(1~3단계 오늘 이야기 목록 — 카드 `todayTopicsKo`), 아래 '토리의 약속' 한 줄(4절 글 그대로). 상태: 토막(view.position.segment) → 오늘 쓸 말 · 말해 보기 · 대화 · 정리 · 마무리 조각을 고름. 열 때 차례: 마이크를 쓸 수 없는 기기면 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'만(7절 — 세션 진행) → 처음 회화면 안내(값 14) → 처음 마이크 안내(P10 `MIC_NOTICE_KEY`, 기기마다 한 번) → `resting` 이면 P11b `AiRest`('토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' + '홈'). 음성 접점은 렌더 뒤 `createBrowserSpeech`. 첫 누름(안내 '시작!' 또는 첫 화면 누름)에서 `unlockFromGesture()`. 인식 실패 셈은 P11a `speakingCounters` 를 그대로 쓰되 회화 몫: 'skip' 판정은 건너뛰지 않고 '토리에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요'로 같은 차례(7절 오류 행 회화 문장), 마이크 멈춤 · 쓸 수 없음 · 말소리 없음(회화는 '모름'으로 넘어간 질문을 셈 — C22)은 막힌 안내 + '홈' + `reportSessionMic`. network 는 '인터넷이 끊겼어요. 연결되면 다시 해요'와 `online` 때 같은 시도 id 로 다시. '홈'은 `leaveTalk` 뒤 홈(목표 턴 뒤면 마무리 첫 장 뒤). '그만하기'는 목표 턴 전 확인 쪽지(C34 글 · 단추 '그만할래요' · '더 이야기할래요') → `stopTalk` → 정리 → 마무리. 목표 턴에 닿은 턴 뒤 '더 이야기하기' · '그만하기' 두 단추(4절 목표 턴 행). 같은 화면에 행동 하나(4절) — 말하기 단추만 크게.
8. **토리 표시 · 말풍선(`src/components/conversation/tori.tsx`).**
   - `ToriFigure({ state: "idle" | "speaking" | "listening" | "thinking", size })`(제안 — a 정할 것 회14): 1-가는 목업 B_Talk1 의 '토' 글자 동그라미(연두 바탕 · 먹색 테 · Jua), 말하는 중은 동그라미 둘레 물결 · 생각 중은 점 셋(움직임 줄이기면 멈춘 표시). 그림 · VRM 은 이 경계 안에서 바꾼다.
   - `ToriBubble`: 받는 차례대로 문장을 흘러나오듯 그림(`TYPE_MS_PER_CHAR` 기술 값, 움직임 줄이기면 바로) · 문장마다 바로 읽기 큐(차례대로 `speak`, 1~2단계 `rate: speech.slow_rate`) · 1~3단계 뜻은 영어가 다 흐른 뒤 그 아래에 한 번에(20px) · 붙인 카드 질문은 같은 말풍선 끝에 영어(뜻은 뜻 줄에) · 그림 턴은 말풍선 옆 큰 그림(카탈로그 그림 — 그림이 없으면 그리지 않음, P11 지문 그림 깨짐 대체와 같은 결) · 1단계 처음 묻는 턴은 질문 뒤 답 ①('Or' 를 사이에) ② 를 읽고 글 없는 듣기 단추 둘(누르면 그 답만) · 말풍선을 누르면 그 말을 다시 읽음(1단계 처음 묻는 턴은 답 두 개까지, AC-15l) · 기다리는 동안 점 셋(`data-wait-hint`) → ui.wait_hint_seconds 둘째 값 뒤 '토리가 생각하고 있어요'(`data-wait-line`). 설명(explanation)은 말풍선 아래 글로만(읽지 않음). 영어 글 24px 이상 · 뜻 20px 이상.
9. **아이 차례(`src/components/conversation/child-turn.tsx`).** P11a 공용 `SpeakButton`(고리 틈 연두 — 회화 카드색, gapClassName) 하나를 크게, 옆에 작은 '힌트' · '잘 모르겠어요'.
   - 듣기: a `talkEndRuleFor({ level, mode: "dialogue" })` 로 `speech.listen(rule)`. 읽어 주는 중에 누르면 읽기를 멈추고 듣는다(C53 (2)).
   - '힌트': 누를 때마다 한 단(`hints` — 끝 줄 · 이어 할 때 view), 영어 문장 단에 작은 듣기 단추(천천히), 같은 질문 둘째 '모름'부터 마지막 단까지 열린 채. 프로필의 첫 회화 수업에서 단추 옆 '막히면 눌러요' 한 번(profiles.notices_seen — 다른 기기에서도 한 번, AC-15l).
   - 인식 확인: a `confirmPlanOf` — 바로 보냄 · talk.confirm_seconds 동안 아이 말풍선(인식 글) + '다시 말하기' · '보내기'(1~3단계에서 연 힌트 · 들은 답과 맞지 않을 때만 '다시 말하기'를 크게, 힌트를 열지 않고 말한 턴은 같은 크기). 아무것도 안 누르면 보냄.
   - '모름': '잘 모르겠어요' 누름 · 같은 질문에서 인식된 말 없이 no-speech 로 끝난 듣기 talk.nospeech_dontknow_count 번 → `input.mode = "dont_know"`(no-speech 면 `nospeech: true` — 말소리 없음 셈에 씀).
   - 들은 도움: 1단계 처음 묻는 턴 · 인사 턴은 토리가 답 두 개를 읽었으므로 `two_answers`, '모름' 뒤 답 예시를 들었으면 `answer_example`.
10. **턴 요청(`src/lib/talk-stream.ts`).** `sendTalkTurn(body, handlers, { signal })` — `fetch("/api/talk/turn", { method: "POST" })` 본문 읽기를 줄 단위로 나눠 `onSentence` · `onKo` · `onAdd` · `onEnd` · `onResting` · `onBreak` · `onClose` · `onStale` 로. 아이 말이 멈춘 때(듣기 끝)부터 첫 문장을 화면에 그린 때까지를 재어 다음 턴의 `prevPerceivedWaitMs` 로(5절 체감 대기 · C23). 줄을 하나도 받기 전에 끊기면 '인터넷이 끊겼어요 …'와 `online` 때 같은 시도 id 로 다시(서버가 같은 결과를 돌려줌).
11. **읽어 주기 빠르기(`src/lib/speech/{types,browser,fake-web-speech}.ts`).** `SpeechPort.speak(text, options?: { rate?: number })` — 브라우저는 `utterance.rate`, 가짜는 받은 빠르기를 기록(e2e 가 '천천히'를 봄). 없으면 지금 그대로(말하기 · 배치 동작 같음 — 위험 5).
12. **쪽 · 연결.** `src/app/(child)/session/[id]/page.tsx`: `readTalkSessionArea` 가 회화면 `loadTalkView` → 있으면 `<TalkFrame view={…} />`, 없으면 `/talk/lessons`, 회화가 아니면 지금 길 그대로(정할 것 회16). `src/app/(child)/[area]/lessons/page.tsx` 의 `if (area === "talk") redirect("/talk")` 와 `Exclude<Area, "talk">` 를 지움. `src/app/(child)/talk/page.tsx` 지움(`/talk` 는 404 — 홈 · 목록이 가리키지 않음). `home-cards.tsx` 의 `TALK_PATH` 를 지우고 회화 카드도 `/${area}/lessons`. 홈 `page.tsx` 에 프로필이 있으면 `after(() => closeIdleTalks({ profileId, at: now() }))`(쿠키 · 머리글은 after 안에서 읽지 않음 — P11b 와 같은 꼴).
13. **e2e 도우미(`tests/e2e/talk.ts`).** `insertTalkLesson({ level, kind?, lessonNo?, card? })` — 견본 빌더 `talkCard(smallReferenceSet() 또는 referenceSet(defaultSettings()), place)` 를 lessons 행으로(P11a `insertSampleLesson` 꼴, 판은 DB 최신 개정), `talkAtLevel(level, fn)`(집 넣기 · 회화 단계), `openTalk(page, lessonId)`(목록 거치지 않고 시작 — P11 `openLessonSession` 꼴), 가짜 SSE 규칙 `talkReply({ en, ko?, recast?, selfUsed?, stuck?, cardQuestionNo?, nextHintKo?, nextHints?, nextTargets?, answerExample?, missionDone? }, { chunks, delayMs, cutAfterChars?, refusal? })` · `closingReply({ farewell, farewellKo?, good?, next?, summary })`(`when: { purpose: "talk_turn", bodyIncludes: "Closing: yes" }`), 가짜 음성 대본(P2 가짜 인식 — 턴마다 인식 글 · no-speech · aborted). DB 를 쓰는 e2e 는 `beforeEach(resetHousehold)` · `beforeEach/afterEach(resetFakeAi)`.
14. **따라 말하기 · 처음 안내(`src/components/conversation/follow-along.tsx`).**
   - 처음 회화 안내(프로필마다 한 번, 3.3 글 그대로) + '시작!'(누름이 첫 읽어 주기를 연다, 7절) → `markTalkNotice("talk_intro")`.
   - 오늘 쓸 말: 단어마다 카드 한 장(단어 · 한국어 뜻 · 예문 — 모든 단계 뜻을 보임, 4절), 들어올 때 토리가 단어 → 예문을 읽고(회11 (1)), 말하기 단추로 따라 말하기(1~3단계 단어) → 결과 말(P11a `resultPhraseOf` · `RESULT_PHRASES`, ui.match_phrase_levels)을 ui.auto_next_seconds 보인 뒤 결과와 관계없이 다음(C39), 인식 실패가 speech.max_retries 에 닿으면 건너뜀 · `saveFollowAlong`. 첫 줄 안내 '토리를 따라 말해 봐요'(제안).
   - 말해 보기(1~3단계): 예문 카드 한 장씩, 첫 바퀴 영어 + 뜻 · 읽어 주고 말하기('보고 말해 봐요'), 둘째 바퀴부터 뜻만('뜻을 보고 영어로 말해 봐요') · 일치율이 talk.hint_read_match 아래면 영어를 보이고 들려준 뒤 다음. 결과 말 · 저절로 다음은 오늘 쓸 말과 같다(회11 (2)).
   - 정리: 되짚을 말(stopTalk · 목표 턴 뒤 '그만하기'가 돌려준 줄)을 토리 말풍선으로 보이고 읽음(1~3단계는 뜻 함께 — 카드 정리 대사만 뜻이 있음), 1~3단계는 문장마다 한 번 따라 말하기(결과 말만) → 끝인사(끝맺음 끝인사가 와 있으면 그것, 아니면 카드 끝인사 — 화면이 `talkClosingStatus` 를 한 번 보고 고름) → 마무리. 정리 · 오늘 쓸 말 · 말해 보기의 따라 말하기는 '말했다'에 들지 않는다.
15. **마무리 세 장(`src/components/conversation/closing-cards.tsx`).** 첫 장: 미션 성공 자리(5~7단계 — c) · 받은 별 자리(P12) · 오늘 얻은 단어(이 세션 오늘 쓸 말 단어, 대화에 원형이 안 나온 것에 듣기 단추 — 회11 (12)) · 목표 턴 전 그만둔 대화는 '다음에 끝까지 이야기하면 별을 받아요' · 다시 하기는 '다시 했어요' · '이 문제 이상해요' 자리(1-나) · '다음'. 둘째 장: 1~3단계는 건너뜀(C33) — 4단계부터 몫은 c. 셋째 장: 친한 정도 막대(다시 하기는 없음) · 다음 이야기(수업 목록 '여기부터 해요'인 회화 수업의 제목 — 서버가 P10 `readLessonList({ area: "talk" })` 의 hereStart 로 채움) · '다음 이야기'(큰 — 그 수업 `startLesson`) · 없으면 큰 단추 '수업 목록' · '홈'(작은). '토리 이야기 듣기'는 c. 숫자 · 퍼센트 없음, '내일' 없음.

## 작업 순서 (Order of work)

명령 꼴 · 시험 먼저 · 설정 숫자는 a 작업 순서 머리와 같다. 차례 번호는 a '화면을 보는 차례'다.

1. (차례 4 앞) [컨트롤러] P11 가지에 P11b 차례 6 커밋이 있으면 P13 가지에 합침 ① — 겹치는 `src/server/session/index.ts` · `src/server/lesson-list/index.ts` 를 손으로 맞춤. 완료: 합친 뒤 단위 · tsc 초록.
2. (차례 4) [서버][검증] `tests/integration/{conversation-session,conversation-turn}.test.ts`(가짜 SSE — a2 의 견본) → `src/server/conversation/{index,turn,closing}.ts` · `src/server/actions/conversation.ts` · `src/app/api/talk/turn/route.ts` · `src/server/session/index.ts` · `src/server/lesson-list/index.ts`. 완료: 통합 초록(CI), 단위 `access-gate.test.ts`(첫 문장 확인) 초록, 검토 묶음 b1(code-reviewer — 5절 전이 · 8절 · 3.3 멈추는 경우 표 · 회화 수업 모델 5 대조).
3. (차례 5) [화면] `src/lib/speech/*`(빠르기) → `tests/e2e/talk.ts` · `tests/e2e/conversation.spec.ts`(인사 · 대화 — 견본을 시험이 넣고 세션을 바로 엶) → `src/lib/talk-stream.ts` · `src/components/conversation/{talk-frame,tori,child-turn}.tsx` · `session/[id]/page.tsx`. P10 · P11 e2e 가 그대로 초록인지 함께 본다(위험 5). 완료: 검토 묶음 b2 → code-reviewer · design-reviewer(4절 회화 세션 표 · B_Talk1 꼴, 세로 820 · 가로 1180 사진).
4. (차례 6 앞) [컨트롤러] P11b 차례 7 커밋이 있으면 합침 ② — `page.tsx`(홈) · `home-cards.tsx` · `home.spec.ts` 손 맞춤. 공용 변경 2(시험용 시드에 회화 — 회5 13절 뒤) · 공용 변경 3(개발용 DB 둘).
5. (차례 6) [화면] `src/components/conversation/{follow-along,closing-cards}.tsx` · 쪽 · 연결 → `conversation.spec.ts`(홈부터 끝까지 · 마무리 · 그만하기 · 이어 하기 · 3단계 · 그림 · 마이크 · 안전 상한 둘) · P10 시험 넷 고침. 완료: 검토 묶음 b3 → code · design(B_TalkEnd 꼴 · 4절 회화 마무리 행). **볼 수 있는 화면: 1단계 회화 수업을 홈부터 끝까지.**
6. [사람] 요청자 지시가 있으면 커밋 · 프리뷰(H14). H4 전이면 프리뷰 회화는 1~3단계 실패 길(카드 칭찬 대사)로 돈다는 것을 먼저 알림(a 가정 나 · 메모리 feedback-show-scope-before-demo). 완료: 프리뷰 `/talk/lessons` 200 · 회화 세션 쪽 200.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | P11b 차례 6 · 7 과 같은 파일(session · lesson-list · 홈 · home-cards · home.spec) | 합칠 때 충돌 · 한쪽 고침이 사라짐 | 고침을 몇 줄로(값 6 · 12) · 합침 ① ② 를 차례 앞에 둠 · 합친 뒤 두 쪽 시험을 다 돌림 |
| 2 | Route Handler 스트림이 배포 환경에서 모아져(버퍼) 첫 문장이 늦게 감(추측) | AC-N8 · NFR-8 | `dynamic = "force-dynamic"` · `cache-control: no-store` · 줄마다 enqueue. e2e 가 첫 문장이 끝 줄보다 먼저 그려지는지 본다. 프리뷰 실기(차례 11)에서 다시 |
| 3 | iPad Safari 에서 문장마다 이어 읽기 · 빠르기 · 읽는 중 듣기 누르기가 다르게 돎(추측) | 토리 말이 끊기거나 겹침 | 큐는 하나씩 · 말하기를 누르면 `cancelSpeaking` · 실기는 [사람](차례 11 · H2 점검표에 회화 줄) |
| 4 | 시험용 시드에 회화가 들어가면 P10 시험 · 프리뷰 화면이 바뀜 | home · lesson-list · placement · font-size e2e 실패 | 고칠 시험 넷을 바뀌는 파일 표에 둠 · 회5 승인 뒤에 공용 변경 2 |
| 5 | 음성 접점에 빠르기 선택 속성을 더하다 말하기 · 배치가 깨짐 | AC-5 · AC-11 e2e | 선택 속성(없으면 그대로) · 차례 5 에서 말하기 · 배치 e2e 함께 |
| 6 | 두 기기가 같은 턴을 보냄 · 같은 시도 id 가 둘 | 턴이 둘로 · AI 두 번 | 세션 행 FOR UPDATE · 같은 시도 id 는 저장 결과 · 자리 어긋남은 stale(회18) · 통합 시험 |
| 7 | 끝맺음이 두 진입(그만하기 after · 홈 진입)에서 같이 불림 | 비용 두 배 · 요약 둘 | 끝맺음 기록 시도 행의 유일 시도 id 로 잡기(값 3, 회18) · 통합 '동시 둘 → 호출 하나' |
| 8 | 보낸 메시지를 끝맺음 전에 지우면 끝맺음이 대화를 못 씀 | 요약 없음 · 캐시 빗나감 | 지우기는 끝맺음이 끝나거나 두 번 실패한 뒤(값 3) |
| 9 | 정리 · 마무리 도중 쪽을 다시 열면 대화가 닫혀 목록으로 감 | 마무리를 다시 못 봄 | 받아들임(대화는 이미 저장, 친한 정도 반영). 완료 보고에 적음 |
| 10 | e2e 가 길다(15턴 · 따라 말하기 · 확인 2초) | CI 시간 | 시험 안에서만 talk.confirm_seconds · 가짜 지연을 줄임(`withHouseholdSetting`), 끝까지 시험은 하나만 |
| 11 | 1-가 안전 상한 · 대화 안전 상한 · 끝맺음 미룸 길이 얽힘 | 대화가 닫히지 않거나 끝맺음이 안 옴 | 회화 수업 모델 5 표를 통합 시험 표로 한 줄씩 |
| 12 | 이어 할 때 4단계부터 힌트가 바뀜(AI 힌트 대신 카드 힌트) | 아이가 다른 힌트를 봄 | 회11 (9) — 받아들임, c 화면 검토가 봄 |
| 13 | 아이 원문이 로그 · 오류로 샘 | 개인 정보 | `safeDbError` · Route Handler 오류는 이름만 · 시험 '로그에 아이 글 없음' |

### 정할 것(컨트롤러 — 보고와 같은 글자. a 의 회1~회15 와 이어서)

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| 회16 | 회화 세션 쪽 주소 · 시작 길 | `/session/<id>` 를 같이 쓰고 쪽이 영역으로 갈라 회화 틀을 그림(묶음 plan 의 `src/app/(child)/conversation/**` 대신). 완료됐어도 대화가 닫히기 전(목표 턴 뒤 '더 이야기하기')에는 회화 틀, 닫히면 회화 수업 목록(결과 쪽 `/result` 를 쓰지 않음 — 회화는 마무리 세 장). 시작은 P11 `startLesson` · `startLessonSession` 을 회화도 받게 고쳐 같이 씀(목록 재판정 · 판 · 변형 · 하던 수업 확인이 같다) | 아니오 |
| 회17 | '한 번' 안내 기록 | profiles.notices_seen 열쇠 `talk_intro`(처음 회화 안내) · `talk_hint_nudge`('막히면 눌러요' — 첫 회화 수업) · `talk_test_hint_nudge`(첫 평가 턴, c) — 프로필마다 한 번이라 다른 기기에서도 안 보임(AC-15l). 처음 마이크 안내는 기기마다(P10 `MIC_NOTICE_KEY`) | 아니오 |
| 회18 | 두 기기 · 같은 시도 id · 끝맺음 잡기 | 턴은 세션 행 FOR UPDATE 로 줄 세우고 같은 시도 id 는 저장 결과를 다시 흘림 · 자리가 어긋나면 stale. 끝맺음 기록은 attempts 한 행(activity_no 0 · 시도 id `talk-closing:<세션 id>` · ai_feedback 상태 칸 — P11b 첨삭 상태 꼴)로 잡기와 결과(끝인사 · 잘한 말 · 다음엔 이렇게)를 겸함, 두 번 실패하면 요약 없이 닫음 · 홈 진입마다 끝맺음 많아야 2 | 아니오(a 회3 의 한 줄에 함께) |

### 제약

a '제약'과 같다. 더해서 — 모든 서버 액션과 Route Handler 의 첫 문장은 `await requireAccess()`(10절 '회화 스트리밍 포함'). 회화는 기기 대기열을 쓰지 않는다(따라 말하기 · 턴 모두 서버로 바로 — 끊김은 7절 안내 · 같은 시도 id 로 다시). 녹음하지 않는다. 마이크를 쓸 수 없는 기기에서는 회화를 열지 않는다(7절 · S7). 1~3단계 대화 토막의 아이 차례에 힌트를 열기 전 영어 문장이 없다(T2) — e2e 가 화면 글을 훑어 본다. 회화 화면에 점수 · 판정 · 퍼센트가 없다(R2).

### 다른 P 에 넘길 것

a '다른 P 에 넘길 것'과 같다. 더해서 — c: 마무리 둘째 장 · '토리 이야기 듣기' · 미션 자리 · 4단계부터 힌트 흐림 · 끊긴 턴 힌트 숨김 · 8단계부터 '다 말했어요'를 이 plan 의 조각에 더한다. P12: `onTalkSessionEnded` · `reachTalkTarget` 이음매, 마무리 첫 장 별 자리.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-15a | e2e "AC-15a 회화 1단계 수업은 인사 → 오늘 쓸 말 → 말해 보기 → 대화 → 정리 순서로 이어지고 대화 토막의 아이 차례에 영어 문장이 보이지 않는다" · "AC-15a 회화 1단계 인사 턴과 처음 묻는 턴에서는 질문 뒤 답 두 개가 'Or' 를 사이에 두고 들리고 화면에는 답 글 없이 듣기 버튼 ①② 만 있다" · "AC-15a 회화 1단계 '힌트'를 한 번 누르면 한국어 뜻, 두 번 누르면 영어 문장과 듣기 버튼이 보인다" · "AC-15a 회화 1단계 말해 보기는 첫 바퀴를 예문 모두에 한 뒤 둘째 바퀴를 다른 순서로 하고 둘째 바퀴 일치율이 talk.hint_read_match 아래이면 영어 문장이 보이고 들린다" · "AC-15a 인식 글이 들려준 답이나 연 영어 문장과 talk.hint_read_match 이상 맞으면 바로 보내지고 아니면 talk.confirm_seconds 보인 뒤 보내지며 힌트를 열지 않고 말한 턴에는 '다시 말하기'가 크게 보이지 않는다" · "AC-15a 위 띠는 '말 주고받기 n / 목표 턴'이고 목표 턴에 닿으면 토리가 더 이야기할지 묻고 '더 이야기하기'를 고르면 '다 했어요! 더 이야기하기 n / talk.more_talk_round_turns'와 '더 이야기할 거리'의 질문이 나오며 그만큼 뒤 다시 묻는다" · "AC-15a '그만하기'를 누르면 AI 응답을 기다리지 않고 토리가 오늘 쓴 말을 되짚고 아이가 따라 말한 뒤 마무리 화면으로 간다" | `tests/e2e/conversation.spec.ts` |
| AC-15b(대화 몫) | 통합 "AC-15b 1~3단계 회화 턴이 두 번 실패하면 대화가 끊기지 않고 카드의 칭찬 대사와 다음 카드 질문이 붙는다" · "AC-15b 1단계 첫 문장 뒤 끊긴 턴은 같은 질문을 되풀이하지 않고 다음 카드 질문이 붙으며 그 턴은 '말했다'를 세지 않는다" · "AC-15b 4단계 첫 문장 뒤 끊긴 턴에는 앱이 아직 쓰지 않은 가장 앞 카드 질문이 붙고 다음 턴 힌트는 그 카드 질문의 힌트다" · "AC-15b Haiku 와 Sonnet 이 다 거절하면 카드의 안전한 대사 뒤 대화가 이어진다" + e2e "AC-15b 검사에 걸린 문장은 회화 화면과 읽어 주기에 나오지 않고 카드의 안전한 대사가 보인다" | `tests/integration/conversation-turn.test.ts` · `conversation.spec.ts` |
| AC-15c(세션) | 통합 "AC-15c 회화 세션의 점수는 끝나도 비어 있다" | `tests/integration/conversation-session.test.ts` |
| AC-15e(1~3단계) | e2e "AC-15e 회화 마무리는 장마다 '다음' 버튼으로 넘어가고 1~3단계는 둘째 장 없이 셋째 장으로 가며 셋째 장에는 '다음' 버튼이 없고 '다음 이야기'(큰) · '홈'(작은)이 있다" · "AC-15e 끝인사는 정리 토막에서 한 번만 나오고 마무리 첫 장에는 없으며 끝인사와 다음 이야기에 '내일'이 없고 다음 이야기는 수업 목록의 '여기부터 해요' 회화 수업 주제와 같다" · "AC-15e 다시 하기로 한 대화의 첫 장에는 '다시 했어요'가 보이고 친한 정도 막대가 없다" | `conversation.spec.ts` |
| AC-15f | 통합 "AC-15f 목표 턴 전 '그만하기'를 확인하면 세션이 중단이 되고 끝맺음 턴이 응답 뒤에 불려 요약이 저장된다" · "AC-15f 목표 턴 전에 떠난 대화는 진행으로 남고 다시 열면 토리의 마지막 질문부터 AI 호출 없이 이어진다" · "AC-15f 목표 턴 뒤에 떠난 대화는 talk.idle_close_minutes 뒤 첫 홈 진입 때 끝맺음 턴이 한 번 불리고 그 전 다른 기기의 홈 진입은 대화를 닫지 않는다" · "AC-15f 토리의 말이 없는 마지막 턴이 있으면 같은 시도 id 로 다시 받는다" + e2e "AC-15f 목표 턴 전에 회화 화면에서 '홈'을 누르면 확인 없이 홈으로 가고 다시 열면 '하던 수업 이어 하기'로 토리의 마지막 질문부터 이어진다" · "AC-15f 목표 턴 전에 '그만하기'를 누르면 '토리와 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요'를 묻고 그만두면 마무리 첫 장에 '다음에 끝까지 이야기하면 별을 받아요'가 보인다" | `conversation-session.test.ts` · `conversation.spec.ts` |
| AC-15g(1단계) | e2e "AC-15g 회화 오늘 쓸 말은 새 단어마다 단어 · 한국어 뜻 · 예문을 보이고 1~3단계는 단어를 따라 말하며 결과 말을 ui.auto_next_seconds 보인 뒤 다음 단어로 넘어가고 인식이 speech.max_retries 번 실패한 단어는 건너뛴다" · "AC-15g '잘 모르겠어요'를 누르면 1단계는 한국어 설명이 토리 말풍선 아래에 글로 보이고 읽어 주지 않으며 토리가 답 예시를 말한 뒤 같은 질문을 다시 묻고 위 띠 숫자가 오르지 않는다" · "AC-15g 같은 질문에서 no-speech 로 끝난 듣기가 talk.nospeech_dontknow_count 번 이어지면 '모름'과 같이 처리되고 talk.dontknow_max 번째 '모름'이면 다음 질문으로 간다" · "AC-15g 1단계에서 'I don't know' 라고 말한 턴 뒤에는 답 예시와 같은 질문이 나오고 위 띠 숫자가 오르지 않는다" · "AC-15g 질문 하나를 talk.dontknow_max 번 '모름'으로 넘긴 1단계 대화는 그 질문을 답 예시와 함께 한 번 더 묻고 모자라면 '더 이야기할 거리'로 목표 턴에 닿는다" · "AC-15g 대화에서 나오지 않은 새 단어는 마무리 첫 장에 듣기 버튼과 함께 보인다" | `conversation.spec.ts` |
| AC-15h(1단계) | e2e "AC-15h 1단계 다지기 수업에서 앞 세션에 만난 단어를 묻는 턴은 답 두 개를 들려주지 않고 힌트를 열지 않거나 한국어 뜻만 열고 그 단어를 말한 턴은 '말했다'로 기록되며 영어 문장 단을 연 턴과 답 예시를 들은 턴은 기록되지 않는다" | `conversation.spec.ts` |
| AC-15i | 통합 "AC-15i '더 이야기할 거리'를 다 쓴 1단계 대화에서 AI 가 낸 질문 · 힌트 · 답 예시가 검사를 통과하면 그대로 쓰인다" · "AC-15i 물음표가 없거나 한국어 뜻 힌트가 없거나 어휘 범위 밖 단어가 든 AI 질문은 '더 이야기할 거리' 가운데 이 대화에서 가장 오래전에 쓴 질문과 힌트로 되돌리고 두 번 걸려도 같은 질문이 이어 나오지 않는다" · "AC-15i '더 이야기할 거리' 턴은 1단계에서도 답 두 개를 들려주지 않는다" | `conversation-turn.test.ts` |
| AC-15j | 통합 "AC-15j 대화 하나가 talk.safety_max_turns 에 닿으면 토리가 카드의 '새 이야기로 이어 가자' 끝인사로 닫고 같은 학습일에 talk.safety_alert_count 번째로 닿을 때만 부모 알림이 생긴다" + e2e "AC-15j 대화 안전 상한에 닿으면 끝인사 뒤 수업 목록으로 간다" | `conversation-turn.test.ts` · `conversation.spec.ts` |
| AC-15k(저장 · 다시 씀) | 통합 "AC-15k 1단계 둘째 턴 요청의 앞 토리 차례에는 앞 턴에 앱이 붙인 카드 질문과 들려준 답 두 개가 들어 있고 검사에 걸린 문장은 안전한 대사로 들어 있다" · "AC-15k 회화 턴은 보낸 사용자 메시지 전문과 다시 쓸 토리 차례를 저장해 다음 턴에 글자 그대로 쓴다" | `conversation-turn.test.ts` |
| AC-15l(1~3단계) | e2e "AC-15l 토리 말풍선을 누르면 그 말을 다시 읽어 주고 단계 구간마다 정한 빠르기(speech.rate.<구간>, C125)로 읽으며 1단계 처음 묻는 턴에서는 질문과 답 두 개를 다시 들려준다" · "AC-15l 1단계 처음 묻는 턴의 듣기 버튼 ①을 누르면 첫째 답만 다시 읽고 아이 차례 화면에 따로 '다시 듣기' 버튼이 없다" · "AC-15l 프로필의 첫 회화 수업에서 '힌트' 버튼에 '막히면 눌러요'가 한 번 보이고 둘째 수업부터는 같은 프로필의 다른 기기에서도 보이지 않는다" | `conversation.spec.ts` |
| AC-15m(화면) | e2e "AC-15m 회화 1단계에서 카드가 다시 묻는 턴으로 적은 턴이라도 아이가 그 단어를 만나지 않았으면 답 두 개를 들려준다" | `conversation.spec.ts` |
| AC-15p | e2e "AC-15p 회화 3단계 대화 턴에서 '힌트'를 누르면 한국어 뜻 → 영어 틀 → 영어 문장 순으로 열린다" · "AC-15p 1단계 카드 턴에 그림 키가 있으면 토리 말풍선 옆에 그림이 크게 보이고 글은 보이지 않는다" | `conversation.spec.ts` |
| AC-16b(화면 · 요약) | 통합 "AC-16b 끝맺음 턴 요약은 한국어로 {NAME} 바꾸기와 가림을 거쳐 talk.summary_max_chars 자 이하로 저장되고 다음 대화의 회화 턴 요청에 최근 talk.memory_summaries 개가 들어간다" · "AC-16b 저장된 회화 아이 원문에는 프로필 이름과 전화번호 형태가 없다" + e2e "AC-16b 회화 말풍선에는 영어 이름이 보이고 홈에는 한글 이름이 보인다" | `conversation-session.test.ts` · `conversation.spec.ts` |
| AC-16c(1-가 몫) | e2e "AC-16c 처음 회화를 열면 '토리는 지난 이야기를 조금 기억해요'와 '토리와 나눈 이야기는 부모님도 볼 수 있어요'가 든 안내가 보이고 회화 화면 아래에 '토리의 약속' 한 줄이 늘 보인다" + 통합 "AC-16c 대화가 끝나면 보낸 메시지 전문과 다시 쓸 토리 차례가 지워지고 단어 수 · 말한 단원 단어 · 입력 방식 · 힌트 종류는 남는다". 부모 화면 대화 기록 · 지우기는 1-나 | `conversation.spec.ts` · `conversation-session.test.ts` |
| AC-2c(회화) | 통합 "AC-2c 지난 단원의 회화 수업을 다시 하기로 열면 처음 했을 때와 같은 주제 변형으로 열리고 회화 턴 호출이 새 수업과 같이 일어나며 친한 정도는 오르지 않는다" | `conversation-session.test.ts` |
| AC-5c(회화 세션) | e2e "AC-5c 회화 세션 도중 마이크 권한을 거두면 세션이 진행으로 남고 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'이 보인다" | `conversation.spec.ts` |
| AC-8b(회화) | 통합 "AC-8b 알림 기준(하루 호출 · 하루 비용)을 넘긴 날에도 회화 턴이 나가고 회화 세션이 그대로 진행된다" + e2e "AC-8b 알림 기준을 넘긴 날 회화 세션 화면에 제한 문구가 없다" | `conversation-turn.test.ts` · `conversation.spec.ts` |
| AC-8c(그만하기) | 통합 "AC-8c 끝맺음 턴은 '그만하기' 응답 뒤에 talk_closing 최대 출력으로 불리고 '그만하기' 응답은 끝맺음을 기다리지 않는다" | `conversation-session.test.ts` |
| AC-N3(회화) | e2e "AC-N3 no-speech 만 이어지는 가짜 API 에서 회화 질문 셋이 '모름'으로 넘어가면 '말소리가 잘 안 들려요' 안내와 '말소리가 들어오지 않음' 알림이 나온다" · "AC-N3 한 질문에서 no-speech 가 여섯 번이어도 회화 세션은 멈추지 않고 다음 질문으로 간다" | `conversation.spec.ts` |
| AC-N8 | e2e "AC-N8 회화 턴 고정 표본을 흘려 보내는 가짜 클라이언트에서 첫 문장이 끝나면 전체 응답을 기다리지 않고 화면 표시와 읽어 주기가 시작된다" · "AC-N8 인식 확인 중 '보내기'를 누르면 바로 보낸다" | `conversation.spec.ts` |
| 1-가 안전 상한(회화, AC 접두 없음 — 회4) | 통합 "1-가 안전 상한(회화): 상한 날에는 새 회화 수업이 시작되지 않고 목표 턴 전 도중이면 그 턴에서 쉬는 안내를 돌려주며 세션은 진행으로 남고 다음 학습일에 같은 시도 id 로 이어 받는다" · "1-가 안전 상한(회화): 목표 턴 뒤 '더 이야기하기' 중에 닿으면 다음 턴에 카드 정리 대사와 끝인사로 닫고 끝맺음 턴은 상한이 풀린 학습일의 첫 홈 진입에서 응답 뒤에 한 번 불린다" · "1-가 안전 상한(회화): 쉬는 날 목표 턴 전 '그만하기'는 끝맺음 턴 없이 중단된다" + e2e "1-가 안전 상한(회화): 상한 날 회화 수업을 고르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'이 보인다" | `conversation-session.test.ts` · `conversation.spec.ts` |
| 회화 세션(AC 접두 없음) | 통합 "회화 세션: 목표 턴에 닿은 턴에서 완료가 되고 완료 시각 · 학습일이 차며 그 뒤 '더 이야기하기' 턴은 목표 턴 밖으로 붙는다" · "회화 세션: 목표 턴 전에 그만둔 회화는 중단이고 완료로 세지 않는다(연속 일수 · 별의 회화 조건 — P12)" · "회화 세션: 세션 시작 · 처음 열기 · 대화 첫 질문 · 이어 하기에서 AI 호출이 0회다" · "회화 세션: 따라 말하기 시도는 attempts 에, 회화 턴은 talk_turns 에 남고 영어로 말한 문장 수가 인식 글이 있는 발화마다 는다" · "회화 세션: 두 기기가 같은 턴을 보내면 하나만 받고 늦은 쪽은 다시 읽으라는 답을 받는다" · "회화 세션: 끝맺음을 두 요청이 함께 부르면 호출은 하나다" · "회화 세션: 만남과 '말했다'는 '말함' 행에 남고 next_review_day 는 비어 있다" · "회화 세션: 로그에 아이 말 글이 없다" | `conversation-session.test.ts` · `conversation-turn.test.ts` |
| 공통 | a 증명 '공통' 줄과 같은 명령 · CI. 기존 e2e(P10 · P11 — 고친 넷 포함)가 회화를 넣은 시드에서도 초록 · 녹음 API(`getUserMedia` · `MediaRecorder`) src 에 없음 | 차례 4~6 |

## 완료 보고 (Done)

구현 뒤 채운다.
