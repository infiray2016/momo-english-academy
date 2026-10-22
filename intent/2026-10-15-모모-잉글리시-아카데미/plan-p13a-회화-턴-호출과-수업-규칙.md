# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P13a 회화 턴 호출과 수업 규칙(흘려 보내기 · 문장 검사 · 순수 함수)

spec: `specs/` 정본(3.3 회화 문단 전부 — 토막 표 · 토막 전환 · 오늘 쓸 말 · 말해 보기 · 대화 · 정리 · '회화에서 쓰는 말' 표 · 채점 없음 · 막힘 · 1~3단계 토리 말 · 처음 · 다시 묻는 턴 · 목표 턴과 '대화가 멈추는 경우' 표 · 아이 차례 · 힌트 · 회화 단계표, 3.2 회화 단원 통과 행 · 회화 단계 평가 문단 둘, 3.4 '말함' 문단, 3.5 토리와 친한 정도, 3.6 학습 요소 범위 · 길이 초과, 5절 sessions 회화 열 · attempts · talk_turns · talk_summaries · vocab_progress · profile_tracks 회화 행 · 전이 표 회화 줄 · 순수 함수 목록 회화 줄, 6.1 회화 턴 두 행 · 고정부 공통 · 구간 규칙 · 이름 가림 · 프롬프트 캐시 · 대체 모델 재시도 · 정규화 · 기록, 6.2 회화 턴 행과 그 아래 문단 넷, 6.4 실시간 출력 검사 문단, 7절 회화 읽어 주기 · 듣기를 끝내는 때 · 인식 결과 확인 · 오류 행, 8절 회화 턴 실패 · 끝맺음 없이 떠난 대화 · 대화 안전 상한 · '목표 턴 뒤의 회화', 12절 talk.* 전부 · speech.end_silence_seconds.talk.<구간> · speech.end_silence_seconds.talk_long · ai.model · ai.effort · ai.thinking 의 talk_turn.<구간> · ai.max_tokens.talk_turn · talk_closing · ai.timeout_seconds.realtime · feedback, 13절 C2 · C3 · C5 · C7 · C10 · C18~C23 · C30~C37 · C41 · C44 · C60 · C85, 15절 AC-2f(회화) · 5e(회화 단위) · 8c(끝맺음 요청) · 8f(가짜 클라이언트) · 8i(회화 요청) · 9d · 15b(흐름 몫) · 15c(단위) · 15d(정규화) · 15h(단위) · 15k(요청 꼴) · 15m(단위) · 15n(단위) · 16a · 16b(요청) · N4(회화), approved 2026-10-16 06:2x) · 델타 spec `intent/2026-10-16-회화-선생님-수업/spec.md`(approved 2026-10-16 04:5x — 모든 행이 정본에 반영됨) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P13 행 · 작업 순서 8 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · `intent/2026-10-16-회화-선생님-수업/intent.md` · 작성일: 2026-10-22 · 상태: approved(컨트롤러 2026-10-22 15:5x — 정할 것 회1~회22 권함대로, 13절 C89~C98 · 회2 평가 나눔은 묶음 plan P12 · P13 행에; 회23 은 표본 평가 결과 뒤 요청자. 요청자 되읽기는 PR 때, C85 '회화 우선' 지시)
승인: (컨트롤러 검토 대기 — 정할 것 회1~회15) · 브랜치 · 워크트리: `feature/1a-p13-conversation`(제안, a · b · c 한 브랜치 · 워크트리 `.claude/worktrees/p13`, 바탕 P11 가지 `feature/1a-p11-session-activities` 차례 5 커밋 — 컨트롤러가 만든다) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P13 은 회화 영역 전부(13절 C85 — 11절 1-가 (9))다. 손 파일이 일흔 안팎이라 셋으로 나눴다. 이 파일(a)은 화면 없는 몫이다 — 회화 턴 · 끝맺음 턴 호출(흘려 보내기 · 문장 검사 · 실패 길 · 기록)과 회화 수업 규칙의 순수 함수(토막 · 질문 차례 · 힌트 · '모름' · '말했다' · '안다' · 되짚을 말 · 듣기 규칙 · 친한 정도)다. 짝은 `plan-p13b-회화-수업-1-3단계.md`(세션 서버 · 턴 길 · 1~3단계 화면 · 연결)와 `plan-p13c-4-12단계-이야기-평가-마무리.md`(4~12단계 화면 몫 · 토리 이야기 · 홈 회화 카드 · 회화 평가 대화 · 표본 평가 · 크기 시험)다. 셋이 함께 쓰는 사실 — **나눈 까닭과 배정 · 가정 · 화면을 보는 차례 · 바탕 가지와 겹치는 파일 · P12 와 나누는 몫 · 회화 수업 모델(값 0) · 정본 밖 문구 · 정할 것 회1~회15 · 확인한 사실** — 은 이 파일에만 있고 b · c 는 절 이름으로 가리킨다.
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 코드 사실은 2026-10-22 에 워크트리 p11(HEAD 726198f + 미커밋 차례 5)에서 확인했다(끝 '확인한 사실과 출처').

## 나눈 까닭과 배정

| plan | 범위 | 검토 묶음(차례) | 이 plan 이 증명하는 AC | 손 파일(줄) |
|---|---|---|---|---|
| a(이 파일) | 회화 턴 · 끝맺음 턴 호출(규격 · 흘려 보내기 · 문장 검사 · 실패 길 · ai_calls · 가짜 SSE)과 수업 규칙 순수 함수 | a1(1) · a2(2) · a3(3) | 2f 회화 · 5e 회화 단위 · 8c 끝맺음 요청 · 8f 가짜 · 8i 회화 요청 · 9d · 15b 흐름 몫 · 15c 단위 · 15d 정규화 · 15h 단위 · 15k 요청 꼴 · 15m 단위 · 15n 단위 · 16a · 16b 요청 · N4 회화 | 21 |
| b | 회화 세션 서버(턴 길 Route Handler · 처음 스냅숏 · 따라 말하기 저장 · 토막 넘김 · 그만하기 · 홈 · 이어 하기 · 끝맺음 · 홈 진입 정리 · 1-가 안전 상한 · 대화 안전 상한) · 회화 틀과 1~3단계 화면(토리 표시 · 말풍선 · 아이 차례 · 힌트 · 인식 확인 · 오늘 쓸 말 · 말해 보기 · 정리 · 마무리 세 장 · 처음 안내) · 연결(홈 카드 · 수업 목록 · 세션 쪽 · `/talk` 자리 지움) | b1(4) · b2(5) · b3(6) | 2c 회화 · 5c 회화 세션 · 8b 회화 · 8c 그만하기 · N3 회화 · N8 · 15a · 15b 대화 몫 · 15c 세션 · 15e(1~3) · 15f · 15g(1단계) · 15h(1단계) · 15i · 15j · 15k 저장 · 15l(1~3) · 15m 화면 · 15p · 16b 화면 · 요약 · 16c(1-가 몫) | 25 |
| c | 4~12단계 화면 몫(카드 질문 번호 · 끊긴 턴 · 6~9 다시 묻는 턴 뜻 단 · 5~7 미션 · 8단계부터 '다 말했어요' · 10~12 힌트 없음 · 4단계부터 힌트 흐림 · 마무리 둘째 장) · 토리 이야기 · 홈 회화 카드 · 회화 평가 대화(P12 몫과 나눔) · 표본 평가 명령 · AI 계약 실호출 · 크기 시험 · (4-나) 게이트 | c1(7) · c2(8) · c3(9) · c4(10) | 2a 회화 · 5e 회화 화면 · 10e 턴 판정 · 평가 화면 · 15b(4단계 화면) · 15d 화면 · 15e(5단계) · 15g(5단계) · 15h(4~12) · 15l(4단계) · 15n · 16d · 8f 수동 · 9e · 15o · N9 회화 | 31(두 줄은 회19 를 받을 때만) |

까닭: (1) 서버 길이 셋이다 — 회화 턴은 Anthropic 스트리밍을 서버에서 문장마다 검사해 흘려 보내는 새 길(P9 의 `runAiCall` 은 비스트리밍)이고, 수업은 그 길 위에 세션 상태 · 화면을 얹으며, 4~12단계 · 이야기 · 평가는 같은 틀에 단계별 몫을 더한다. (2) 정본 해석이 가장 많이 걸린 곳(질문 차례 · '모름' · 처음 · 다시 묻는 턴 · 힌트 단 · '말했다')을 화면보다 먼저 순수 함수와 단위 시험으로 굳혀 검토받는다(a3). (3) b 가 끝나면 요청자가 프리뷰에서 1단계 회화 수업을 끝까지 해 볼 수 있다 — 차수 경계로 PR 하나씩 낼 수 있다. (4) 검토 묶음마다 손 파일 열 안팎이다 — plan 하나를 파일 열 개로 자르면 일곱 plan 이 되어 브리프의 '2~3개'를 넘으므로 P11 꼴(검토 묶음 단위로 열 안팎)을 따랐다(정할 것 회1).

## 가정

- (가) 시드. 프리뷰 · 로컬 · e2e 의 수업 자료는 시험용 시드 `devSeedTree()`(1단계 · 작은 틀 · 지어낸 낱말, C70 · C75)이고, 회화(1단계 단원 카드 · 1단계 회화 평가 카드 · 1~3 구간 토리 이야기)를 거기에 더한다(정할 것 회5 — 13절 한 줄 뒤). 작은 틀 설정이라 '더 이야기할 거리'는 2턴(talk.more_talk_turns 2), 평가 카드는 5턴(level.test_items_per_session 5)이다 — 시험 숫자는 그 설정에서 읽는다. 요청자가 프리뷰에서 볼 수 있는 것은 **1단계 회화 수업**이다. 3 · 4 · 5 · 6 · 8 · 10단계 화면은 e2e 가 견본 빌더(`talkCard(ref, place)` — 아무 단계나 만든다)로 넣어 사진으로 보인다. 실제 회화 카드는 P8 의 6.3 (4-나) 뒤다(이 P 는 그 게이트만 연다 — c 차례 11).
- (나) AI. 개발용 Anthropic 키(H4)가 프리뷰에 아직 없다(ledger-open 배포 행 (다)). 키가 없으면 회화 턴이 '설정 문제'로 실패한다 — 1~3단계는 8절 '회화 턴 실패'대로 카드의 칭찬 대사와 다음 카드 질문으로 끝까지 가고(요청자가 흐름은 볼 수 있다), 4단계부터는 'Oops' 길로 수업 목록에 간다. H4 뒤 실제 Haiku 5.5 · Sonnet 5.5 가 답한다. CI · e2e 는 가짜 Anthropic(C81 webServer)에 SSE 스트리밍을 더해(값 6) 돈다. 실제 API 호출은 수동 명령뿐이다(c 차례 10 · 11).
- (다) 시험 환경. 이 Mac 은 새 Postgres 가 뜨지 않는다(ledger-open 환경 행). 단위 · tsc · biome · build 는 로컬, **통합 · e2e 는 CI 로**(P11 과 같은 길 — 컨트롤러가 CI 가지를 작업 가지 최신 커밋 위에 다시 만든다).
- (라) 별 · 단원 통과 · 연속 일수 · 단계 평가 시작 · 결과는 P12 다(아래 'P12 와 나누는 몫'). P13 이 끝나도 회화 수업을 끝내면 별이 붙지 않고 다음 단원이 열리지 않는다. 친한 정도는 오르고 토리 이야기는 열린다. 요청자에게 미리 알린다(메모리 feedback-show-scope-before-demo).
- (마) 토리 표시. 회화 선생님 캐릭터(VRM · 이모지 명단, `intent/2026-10-17-회화-선생님-캐릭터/intent.md` draft — 요청자 되읽기 대기, 미결 3 '토리 처리')가 정해지기 전이다. 토리는 경계 하나(`ToriFigure`, 제안)로 그리고 1-가는 목업 B_Talk1 의 '토' 글자 동그라미 + 말하는 중 표시로 시작한다. `prototypes/teacher-avatar/`(Codex 10-20 시제품, 미나 · 리오 VRM)는 본 앱에 연결하지 않고 참고만 한다(정할 것 회14).
- (바) 목업. P6c(목업 맞추기)가 아직이다 — 11절 목업 표의 회화 새 목업(B_Talk1_Input · B_TalkPractice · B_TalkWrapUp · B_ToriStory · B_Talk1_Picture)이 없고 B_Talk1 · B_Talk5 · B_TalkEnd 는 옛 꼴이다. 화면 검토 기준은 4절 회화 세션 · 회화 마무리 · 토리 이야기 표와 11절 목업 표의 '고칠 것'이고, 꼴(보드 · 연두 · 글꼴)만 옛 목업에서 본다(정할 것 회15).
- (사) 마이크. 회화는 마이크가 되는 기기에서만 연다(7절 · S7). iPad Safari 실기(문장마다 이어 읽기 · 읽어 주는 중 말하기 누르기 · 천천히 읽기)는 [사람] 이다(c 차례 11).

## 화면을 보는 차례(P13a · b · c)

한 구현자가 한 워크트리에서 차례대로 한다(차례 1 과 3 은 파일이 겹치지 않아 ∥ 로 둘이 해도 된다). 검토 묶음마다 code-reviewer(Opus · xhigh) 한 번, 화면이 있는 묶음은 design-reviewer(Fable · max, 요청자 2026-10-22)도 한 번이다. 구현자는 implementer(Opus · high). 커밋 · 프리뷰 올리기는 요청자 지시 때(H14) — 차례 6 끝에 요청자에게 올릴지 묻기를 권한다.

| 차례 | 할 일 | 검토 묶음 | 끝에 요청자가 볼 수 있는 화면 |
|---|---|---|---|
| 0 | [컨트롤러] 바탕 가지 · 워크트리 p13 · 공용 변경 1 · 13절 줄(승인 때) | — | — |
| 1 | a 작업 1: 회화 턴 규격 · 흘려 받기 · 문장 검사(순수) | a1(코드) | — |
| 2 | a 작업 2: 스트리밍 시도 · 회화 턴 흐름 · 가짜 SSE | a2(코드) | — |
| 3 | a 작업 3: 수업 규칙 순수 함수(∥ 1) | a3(코드) | — |
| 4 | b 작업 1: 회화 세션 서버 · 턴 길 · 끝맺음 · 안전 상한(앞에 [컨트롤러] P11 가지 합침 ①) | b1(코드) | — |
| 5 | b 작업 2: 회화 틀 · 토리 표시 · 말풍선 · 아이 차례 · 1단계 인사 · 대화 | b2(코드 · 화면) | (e2e 사진) 1단계 인사 · 대화 · 힌트 · '모름' · 인식 확인 |
| 6 | b 작업 3: 오늘 쓸 말 · 말해 보기 · 정리 · 마무리 · 연결(앞에 [컨트롤러] P11 가지 합침 ②, 공용 변경 2 · 3) | b3(코드 · 화면) | **1단계 회화 수업을 홈부터 끝까지**: 홈 회화 카드 → 수업 목록 → 처음 안내 → 인사(답 두 개 ①②) → 오늘 쓸 말 → 말해 보기 → 대화 15턴(힌트 두 단 · '잘 모르겠어요') → '더 이야기하기' · '그만하기' → 정리 → 마무리 셋 |
| 7 | c 작업 1: 4~12단계 몫 · 마무리 둘째 장 | c1(코드 · 화면) | (e2e 사진) 4 · 5 · 6 · 8 · 10단계 대화 · 마무리 |
| 8 | c 작업 2: 토리 이야기 · 홈 회화 카드 | c2(코드 · 화면) | 홈 회화 카드 친한 정도 · 오늘 이야기 · '토리 이야기' |
| 9 | c 작업 3: 회화 평가 대화(∥ 8) | c3(코드 · 화면) | (e2e 사진) 평가 턴 '내가 할 말' · '문장 다 보기' |
| 10 | c 작업 4: 표본 평가 명령 · AI 계약 사례 · 크기 시험 · 화면 검토 다시 | 화면 검토 | 회화 화면 전부 |
| 11 | [사람] H4 · 계약 실호출 · 표본 평가 · 요청자 프리뷰 회화 · 커밋 · PR · (4-나) 게이트 | — | — |

순서의 근거: (1) 요청자 지시가 '회화 우선'이다(C85). 1단계 회화를 프리뷰에서 처음부터 끝까지 해 보는 것(차례 6)이 첫 목표이고, H4 전에도 1~3단계는 실패 길로 끝까지 돈다(가정 나). (2) 정본 해석 위험이 가장 큰 흐름 규칙을 화면 앞(차례 3)에 단위 시험으로 굳힌다. (3) 4~12단계(차례 7)는 시험용 시드에 없어 요청자 눈에 차이가 없으므로 1단계 뒤다. (4) 평가 대화(차례 9)는 P12 가 시작 · 결과를 붙여야 아이가 쓴다 — 가장 덜 급하다.

## 바탕 가지와 겹치는 파일

- 바탕: P11 가지 차례 5(P11b 검토 묶음 B1) 커밋. 그 위에 `feature/1a-p13-conversation` · 워크트리 `.claude/worktrees/p13`(컨트롤러). P9c(`src/server/ai/*` · `src/core/ai/*`) · P6a(`seed/lists` 넷) · P7a(적재) · P10 · P11a · P11b 차례 5(`ai-gate.ts` · `aiNeededLesson` · `WaitHint` · `AiRest` · 가짜 AI webServer) 가 다 들어 있다.
- P11b 차례 6 · 7 은 워크트리 p11 에서 나란히 간다(C85). 같은 파일을 고치는 곳(2026-10-22 plan-p11b '바뀌는 파일' 표와 대조):

| 파일 | P11b 가 고치는 차례 | P13 이 고치는 것(줄 수를 작게) | 맞추는 때 |
|---|---|---|---|
| `src/server/session/index.ts` | 6 · 7(첫 세션 · 둘째 세션 · 되살림 · 늦은 초고) | `startUnsafe` 가 회화 수업을 받음(영역 목록 · 회화 시작 토막) · `readSessionPlace` 가 회화 완료 세션을 회화 틀로 — b 값 6 | 차례 4 앞 합침 ① |
| `src/server/lesson-list/index.ts` | 7(`writingDrafts` · `feedbackReady`) | 영역 형에서 `Exclude<Area, "talk">` 를 뺌 — b 값 6 | 차례 4 앞 합침 ① |
| `src/app/(child)/page.tsx` | 7(밀린 첨삭 `after()`) | `after(() => closeIdleTalks(...))` 한 줄 — b 값 12 | 차례 6 앞 합침 ② |
| `src/app/(child)/home-cards.tsx` | 7('첨삭이 왔어요' 포스트잇) | 회화 카드 길(차례 6) · 친한 정도 · '토리 이야기'(차례 8) | 차례 6 · 8 앞 |
| `src/server/home/index.ts` | 7(`feedbackReady` · 최근 성적 셈) | 회화 카드 칸 넷(차례 8) | 차례 8 앞 |
| `tests/e2e/home.spec.ts` | 7(AC-2a '첨삭이 왔어요') | 회화 카드 길 단언(차례 6) | 차례 6 앞 |

  P11b 가 이 파일들을 커밋한 뒤면 컨트롤러가 P11 가지를 P13 가지에 합치고(합침 ① · ②) 겹침을 손으로 맞춘다. 아직이면 P13 이 먼저 가고 P11b 쪽 합침 때 맞춘다(어느 쪽이든 P13 의 고침은 위 표의 몇 줄이다). P11c(말하기 AI)는 P12 뒤(C85 순서)라 P13 과 나란히 가지 않는다 — P13 은 P11c 가 고칠 `src/core/speaking/judge.ts` · `src/core/session/attempt.ts` · `src/components/session/speaking.tsx` · `session-frame.tsx` 를 고치지 않는다(회화 몫은 `src/core/conversation/*` · `src/components/conversation/*` 에 새로 둔다).
- 마이그레이션: a · b 는 더하지 않는다(정할 것 회3 — 회화 열이 5절대로 다 있다). c 는 토리 이야기의 구간별 열린 수에 하나를 권한다(정할 것 회19 — 받으면 c 차례 8, 더하기만).

## P12 와 나누는 몫(누가 만드는지)

P12 는 P13 뒤다(C85 순서 P11b → P13 → P12 → P11c). P13 은 회화만의 판정 재료와 이음매를 두고, 영역을 가로지르는 판정 · 화면은 P12 가 만든다(정할 것 회2).

| 일 | 만드는 P | 자리(제안) | 다른 쪽이 하는 일 |
|---|---|---|---|
| '말함' 행 만들기(만남) · 말한 학습일 · '안다' | P13 | `src/core/conversation/said.ts`(a 값 9) · b 턴 길 | P12 단원 통과가 `vocab_progress`(state say)의 known 을 읽는다 |
| 회화 단원 단어 조건('말함' '안다' ≥ 단원 복사본 talk.said_ratio) | P13 | `said.ts` `talkWordConditionOf` | P12 `unit-pass` 가 회화 갈래에서 부른다(AC-10a 회화 갈래 · AC-15c) |
| 단원 통과 판정(회화 갈래 — 목표 턴까지 끝낸 정규 대화 수 · 학습일 · 단어 조건) · 보강 · 단어 익히기 · 부모 확인 · 판정 때(회화는 세션이 끝날 때 — 완료 · 중단 모두, 3.2) | P12 | `src/core/unit-pass/` | P13 은 회화 세션이 끝나는 자리 넷(목표 턴 닿음 · 그만하기 · 다른 수업 고르기 · 이어 하기 시간 지남)에 이음매 함수 `onTalkSessionEnded`(제안, 지금은 빈 함수)를 둔다 — P12 가 판정을 붙인다 |
| 회화 연습 수업 고르기(남은 단어를 노리는 턴이 가장 많은 수업, 3.2 · AC-7b) | P12 | `src/core/practice-pick/` | P13 이 카드의 노리는 단어 목록 `talkTargetsOf(card, spec)`(a 값 7)를 준다 |
| 별(회화는 목표 턴에 닿을 때 1개, 다시 하기 없음, 3.5 · AC-6b 회화 사례) | P12 | `src/core/stars/` · star_ledger | P13 은 목표 턴에서 세션을 완료로 바꾸는 한 곳(`reachTalkTarget`, b 값 1)을 두고 P12 가 그 트랜잭션에 별을 더한다. 마무리 첫 장의 별 자리는 P13 이 비워 둔다 |
| 연속 일수(회화는 목표 턴 닿은 세션만, AC-6d) | P12 | `src/core/streak/` | P13 은 목표 턴 전에 끝난 회화를 늘 중단(aborted)으로 둔다 — 완료 세션만 세면 회화 조건이 맞는다(통합 시험으로 보증) |
| 복습 카드에서 회화 단원 단어 빼기(AC-9b) | P12 | `src/core/review/` | P13 은 '말함' 행의 next_review_day 를 늘 비운다 |
| 친한 정도 · 토리 이야기 열기(AC-16a) | P13 | `src/core/conversation/friendship.ts`(a 값 12) | — |
| 회화 단계 평가: 턴 판정(허용 답 · 틀 자리 품사 · {NAME} · 힌트 단 점수) · 평가 대화 화면 · 평가 턴 AI 반응 · 턴 점수 기록 | P13(c 차례 9) | `src/core/conversation/test-turn.ts` · 회화 틀 평가 모드 | P12: level_tests 행(벌 · 두 장) · 두 세션 차례 · 시작 화면('먼저 뜻만 보고 말해 봐요 …') · 점수 합 · 통과 · '반을 했어요' · 결과 화면 · 재응시 · 보강 · '나중에 할래요'(AC-10b · 10h · 10e 의 합 · 통과 몫) |
| 결과 화면의 '단원 n을 통과했어요!' · 별 | P12 | — | 회화는 결과 화면 대신 마무리 첫 장에 P12 가 더한다(P13 이 자리 표시) |
| 수업 목록의 회화 문구(단어 익히기 '내일 토리와 또 이야기해요. 아직 덜 익은 말을 토리가 물어볼 거예요' · 잠긴 단원 '토리와 며칠 더 이야기하면 열려요') | P12 | `lesson-board.tsx` | P13 은 목록이 회화를 받게만 한다(gate 의 단어 조건이 P12 몫이라 그 줄은 P12 때 나온다) |
| 홈 회화 카드(친한 정도 n/10 · 오늘 이야기 제목 · '토리 이야기' · '끝낸 대화 n/최소') | P13(c 차례 8) | `src/server/home/index.ts` | — |

## 회화 수업 모델(값 0 — b · c 가 같이 쓴다)

정본 3.3 · 4절 · 5절을 데이터와 차례로 옮긴 것이다. 이름은 모두 (제안)이다. 정본에 세부가 없던 곳은 정할 것 회3 · 회11 에 올렸다.

1. **토막과 차례**(3.3 토막 표 · C3 · C19). `talkFlowOf`(a 값 7)가 단계 규격(level_specs `segments`)과 카드로 정한다.
   - 인사(greeting): 카드의 인사 턴 수(1 또는 2)만큼 아이 턴. 1~3단계는 카드 인사 질문(`card.greeting.questions[i]`, 1단계는 답 두 개도), 4단계부터는 첫 턴 앞에 카드의 토리 첫 말(`card.greeting.firstLine`)을 앱이 보이고 읽고(AI 없음), 둘째 인사 턴(있으면)은 AI 가 쓴다. **마지막 인사 턴의 아이 말은 토막 '인사 끝'으로 보낸다** — 응답은 반응과 넘어가는 말만(질문 없음), 1~3단계도 카드 질문을 붙이지 않는다.
   - 오늘 쓸 말(today_words): 오늘 쓸 말 단어마다 한 차례(아래 2). 단어가 없으면 이 토막과 말해 보기를 건너뛴다(C33).
   - 말해 보기(practice, 1~3단계 — 규격 `segments` 에 있을 때): 카드 todayWords 가운데 예문 뜻(`exampleKo`)이 있는 예문마다 talk.practice_rounds 바퀴. 첫 바퀴는 카드 차례 · 영어와 뜻, 둘째 바퀴부터 세션 id 로 정한 다른 차례 · 뜻만(정할 것 회11 (3) · 회13).
   - 대화(talk): 대화 첫 질문(`card.firstQuestion` — 1~3단계는 첫 대화 턴 질문, 4단계부터는 카드 질문 목록 1번)을 앱이 보이고 읽는다(AI 없음). 그 뒤 아이 말마다 회화 턴. 목표 턴(인사 + 대화의 아이 턴 가운데 '모름' · 막힘이 아닌 것)에 닿은 턴에서 세션이 완료가 된다.
   - 더 이야기하기(more_talk): 목표 턴 뒤 '더 이야기하기'를 고를 때마다 talk.more_talk_round_turns 턴(C30). 그 뒤 다시 묻는다.
   - 정리(wrap_up): 되짚을 말(a 값 10) → 1~3단계는 문장마다 따라 말하기 → 끝인사(끝맺음 턴이 와 있으면 그 끝인사, 아니면 카드 끝인사) → 마무리 세 장. **정리 토막에 들어가는 것이 '대화 닫힘'이다**(그 뒤로 회화 턴 없음).
2. **오늘 쓸 말 단어 목록**(3.3 첫 활동 문단 · AC-2f). P10 `previewWordsOf`(그대로 가져다 씀) — 입력 `lesson = { newWords, unitWords, preview: card.todayWords(word · meaningKo · example) }`, `metWords` = 처음 스냅숏의 metBefore, `knownWords` = '말함' known 인 단원 단어, `k` = 단원 복사본 unit.new_words_per_lesson. 배정 수업은 카드 오늘 쓸 말 + 안 만난 단원 단어(건너뛴 앞 수업), 다지기 · 보강은 아직 '안다'가 아닌 단원 단어 k 개(vocab 뜻 · 예문).
3. **처음 묻는 턴 · 다시 묻는 턴**(C2 · 3.3). 노리는 단어 가운데 하나라도 '처음 스냅숏의 metBefore 에 없고 이 대화의 앞 아이 턴들이 노린 단어(talk_turns.target_words)에도 없으면' 처음 묻는 턴이다(정할 것 회11 (5)). 1단계 처음 묻는 턴과 인사 턴은 질문 뒤 답 두 개를 들려준다. '더 이야기할 거리' 턴과 AI 가 이어 만든 턴은 늘 다시 묻는 턴이다(C36 · B5-M-04).
4. **기록 자리**(5절, 정할 것 회3).
   - `sessions`: area talk · lesson_id(카드 행) · kind · status(진행 → 목표 턴에서 완료 | 중단) · talk_segment(지금 토막) · english_sentences(인식 글이 있는 발화마다 +1, C41) · score 늘 NULL(AC-15c) · completed_at · learning_day(완료 · 중단 때).
   - `talk_turns`: 아이 행과 토리 행이 같은 턴 번호 n 을 쓴다. **토리 행 n = 아이 말 n 앞에 토리가 한 말**(앞 아이 말에 대한 AI 반응 + 앱이 붙인 말), **아이 행 n = 아이 말 n**. 토리 행 1 은 세션 화면을 처음 열 때 넣는 앱의 첫 말(1~3 인사 질문 · 4+ 카드 첫 말)이고, 토리 행 n+1 은 아이 행 n 에 대한 회화 턴 응답이 끝난 뒤 넣는다. 인사 끝 턴의 토리 행에는 대화 토막이 시작될 때 대화 첫 질문을 붙인다(그 행의 글 · 다시 쓸 토리 차례를 다음 호출 전에 고침). 아이 행 칸: 원문 · 입력 방식 · 힌트 종류 · 쓴 힌트 단 · 들은 도움 · 노린 단어 · 처음/다시 · AI 가 돌려준 스스로 쓴 단어 · 막힘으로 볼 말 · 앱이 센 '말했다' · 목표 턴 안 · 단어 수 · 보낸 사용자 메시지 전문 · 체감 대기 · 듣기 끝 대기 · 확인 건너뜀 · 시도 id. 토리 행 칸: 원문(검사를 지난 글 + 붙인 말, {NAME} 은 틀 그대로) · 되풀이 문장 · 설명 · 새 단어 · 미션 체크 · 카드 질문 번호 · 길이 초과 · 다시 쓸 토리 차례. 아이 말은 보내기 전에, 토리 말은 응답이 끝난 뒤 저장한다(5절).
   - 막힘으로 볼 말은 `stuck_phrase`(글 열)에 참일 때 아이 말 글({NAME} 바꾼 뒤)을, 거짓이면 비운다. 들은 도움은 열거 하나라 답 두 개와 답 예시를 함께 들으면 '답 예시'를 적는다(정할 것 회3).
   - `attempts`: 처음 스냅숏(activity_no 1, 시도 id `talk-start:<세션 id>`, 입력 `{ v: 1, kind: "talk-start", step: "final", shownWords, metBefore, practiceOrder }`)과 따라 말하기(오늘 쓸 말 · 말해 보기 · 정리 · 마무리 '한 번 더 말해 보기', activity_no 2 부터 a 값 13 의 차례), 끝맺음 기록(activity_no 0 · 시도 id `talk-closing:<세션 id>` — ai_feedback 상태 칸에 잡기 · 실패 수 · 결과(끝인사 · 잘한 말 · 다음엔 이렇게), b 값 3). 점수 · 단어별 정오는 비운다(회화는 채점하지 않음 — R2).
   - `vocab_progress`(state say): 만남 때 행(first_area talk · met_areas · first_met_day), '말했다' 때 said_days 에 학습일(겹치지 않게), 서로 다른 학습일이 단원 복사본 talk.known_days 이상이면 known. next_review_day 늘 NULL.
   - `talk_summaries`: 끝맺음 턴 요약(검사 · {NAME} · 가림 뒤, talk.summary_max_chars 자 이하).
   - `profile_tracks`(talk): friendship · tori_stories_opened.
   - `ai_calls`: talk_turn · talk_closing 시도마다 한 행, first_sentence_ms(서버가 요청을 받은 때부터).
   - `parent_alerts`: talk_safety_cap(같은 학습일 talk.safety_alert_count 번째, P9c `AI_ALERT_KINDS`) · 기기 알림 mic_unavailable · mic_stalled · speech_silent(P11a `recordDeviceAlert`).
5. **세션 상태 표**(3.3 '대화가 멈추는 경우' · 5절 전이 · 8절, 정할 것 회11 (10)).

| 일 | status | talk_segment | 끝맺음 턴 |
|---|---|---|---|
| 수업 시작(P11 `startLesson`) | in_progress | greeting | — |
| 목표 턴에 닿음 | completed(completed_at · learning_day) | talk | — |
| '더 이야기하기' | completed | more_talk | — |
| '그만하기'(목표 턴 전, 확인 뒤) | aborted(learning_day) | wrap_up | 응답 뒤(after) |
| '그만하기'(목표 턴 뒤) | completed | wrap_up | 응답 뒤 |
| '홈'(목표 턴 전) | in_progress | 그대로 | — |
| '홈'(목표 턴 뒤) — 마무리 첫 장 뒤 홈 | completed | wrap_up | 응답 뒤(제안) |
| 앱을 닫음(목표 턴 전) → session.resume_hours 지남 | aborted(P10 `closeStaleSessions`) | 그대로 | 없음 |
| 앱을 닫음(목표 턴 뒤) → 마지막 턴에서 talk.idle_close_minutes 지남 | completed | wrap_up | 그 뒤 첫 홈 진입 응답 뒤(마무리 안 보임) |
| 4단계부터 회화 턴 두 번 실패 | in_progress | 그대로 | 없음 |
| 대화 안전 상한(talk.safety_max_turns) | 목표 턴 뒤면 completed · 목표 턴 전이면 aborted(C107, 컨트롤러 2026-10-22 20:5x — 차례 4 코드 검토 M-9) | wrap_up | 응답 뒤(제안) |
| 1-가 하루 안전 상한(목표 턴 전) | in_progress | 그대로 | — |
| 1-가 하루 안전 상한(목표 턴 뒤) | completed | wrap_up | 상한이 풀린 첫 홈 진입 응답 뒤(정할 것 회4) |
| 다른 수업 고르기(확인 뒤, P10) | aborted | 그대로 | 없음 |

   대화가 닫히면(정리 토막 · 끝맺음 없이 떠난 대화의 정리 · 끝맺음 없이 중단으로 닫힌 뒤) 그 세션 talk_turns 의 보낸 사용자 메시지 전문 · 다시 쓸 토리 차례를 지운다(B5-21). 끝맺음 상태(잡기 · 실패 수 · 결과)는 끝맺음 기록 시도 행의 ai_feedback 에 두고 두 번 실패면 요약 없이 닫는다(8절 '끝맺음 없이 떠난 대화', b 정할 것 회18).
6. **한 턴**(아이 말 → 토리): 아이 차례(말하기 · '힌트' · '잘 모르겠어요') → 듣기 끝(a 값 11) → 인식 확인(talk.confirm_seconds, 1~3단계는 연 영어 문장 · 들은 답과 맞으면 바로) → Route Handler(b 값 5)가 아이 행 저장 → 회화 턴 호출(a 값 4 — 문장마다 검사해 흘려 보냄) → 토리 행 저장 · '말했다' · 만남 · 셈 → 앱이 붙일 말(카드 질문 · 답 예시 + 같은 질문 · 답 두 개 · 'Do you want to talk more?') → 다음 아이 차례.

## 목표 (Goal)

- **회화 턴 호출(6.1 · 6.2 · 6.4 · 8절 · C19 · C20 · C21 · C33 · C36 · C44).** 회화 턴은 1~3단계 `claude-haiku-5-5`(effort low · thinking disabled · fallbacks 없음), 4단계부터 `claude-sonnet-5-5`(effort low · between_tools · 서버 측 대체 모델 재시도 켬)이고 모두 ai.model · ai.effort · ai.thinking 의 `talk_turn.<구간>` 에서 읽는다(P9a `requestConfigOf` 그대로). 타임아웃 ai.timeout_seconds.realtime(10초), 최대 출력 ai.max_tokens.talk_turn(1000). 끝맺음 턴은 같은 규격 · 같은 대화로 ai.max_tokens.talk_closing(2000) · ai.timeout_seconds.feedback(60초). 대화 끝까지 자동 프롬프트 캐시, 지난 대화 요약은 대화 시작 때 읽어 고정, 사용자 메시지는 '늘 넣는 값'과 '바뀐 턴에만 넣는 값'으로, 앞 턴은 '보낸 사용자 메시지 전문'과 '다시 쓸 토리 차례'를 글자 그대로. 대화 도중 모델 · effort · 생각 단계는 바뀌지 않는다 — Haiku 거절 뒤 Sonnet 한 턴만 예외.
- **흘려 보내기 · 문장 검사.** 서버가 SDK 의 text 조각을 쌓아 첫 속성 `tori_en` 문자열을 이스케이프까지 직접 풀고, 문장이 끝날 때마다 금지어 · 개인 정보 질문 패턴 · 메타 문장(시드 목록) · 1~3단계 반응의 물음표 문장을 검사해 통과한 문장만 내보낸다. 걸린 문장은 카드의 안전한 대사로 바뀌고(1~3단계 물음표 문장은 지운다) 브라우저는 검사 전 글을 받지 않는다. `tori_ko` 는 다 흐른 뒤 전체 검사(걸리면 뜻 전체 숨김). 힌트 · 미션 같은 구조 부분은 끝난 뒤 Zod 로 보고, 실패해도 다시 요청하지 않는다(카드 힌트로 — b 가 고름). 끝맺음 · 다른 글 칸도 6.4 검사.
- **실패 길(8절 '회화 턴 실패').** 첫 문장을 보내기 전 연결 오류 · 타임아웃이면 같은 입력으로 1회 다시. 첫 문장 뒤 끊김 · 타임아웃 · refusal · max_tokens 면 보낸 문장을 두고 그 턴을 닫는다. 거절은 같은 모델로 다시 부르지 않고, Haiku 5.5 거절은 첫 문장 전일 때만 Sonnet 5.5(low · between_tools)로 1회. 시도마다 ai_calls 한 행(첫 문장 시간 포함 — 서버가 요청을 받은 때부터). 하루 안전 상한은 호출 앞 판정(P9c `preCallGate`).
- **수업 규칙 순수 함수(차례 3).** 위 '회화 수업 모델' 1~3 을 함수로: 토막 차례 · 오늘 쓸 말 목록 · 말해 보기 차례 · 1~3단계 질문 차례(카드 턴 → 넘어간 질문 + 답 예시 → '더 이야기할 거리' → AI, C36) · 4단계부터 카드 질문 번호(C19) · '모름'(버튼 · 같은 질문 no-speech talk.nospeech_dontknow_count 번 · 막힘으로 볼 말)과 talk.dontknow_max · 목표 턴과 '말 주고받기 n' · '더 이야기하기' talk.more_talk_round_turns · 처음 · 다시 묻는 턴(C2) · 앱이 붙일 말 · 힌트 단(C10 · C20 · C31 · 3.3 단계표)과 힌트 종류 · '말했다'(3.4 · AC-9d) · '안다'(talk.known_days) · 만남 · 단원 단어 조건(talk.said_ratio) · 영어로 말한 문장 수(C41) · 되짚을 말과 끝인사(C33) · 회화 듣기 끝 규칙(C7 · C37) · 인식 확인과 바로 보내기(C23 · talk.hint_read_match, {NAME} 자리 뺌) · 이름 묻기 턴 가림(6.1) · 친한 정도(3.5 · AC-16a) · 따라 말하기 시도 꼴.
- 경계: 세션 상태 · 저장 · 화면 · 연결은 b. 4~12단계 화면 · 토리 이야기 · 홈 카드 · 평가 대화 · 표본 평가 · 실호출 계약은 c. 'AI 쉬는 중' 상태 · 확인 호출 · 이어진 실패 수(회화는 턴마다, C18) · 부모 화면(대화 기록 · 지우기) · 원문 삭제 Cron 은 1-나.

## 바뀌는 파일 (Files that change)

손 파일 스물하나(새 열여섯 · 고침 넷 · 견본 묶음 하나). 검토 묶음 셋(a1 규격 · 흘려 받기, a2 스트리밍 · 흐름 · 가짜 SSE, a3 수업 규칙).

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `src/core/ai/calls/talk.ts` | 신규 | 회화 턴 · 끝맺음 턴 규격 — 입력 형 · 고정부 · 가변부 · 사용자 메시지 · 다시 쓸 토리 차례 · 응답 규격 · 정규화 · 출력 검사 칸 · 1~3단계 AI 질문 · 힌트 검사(값 1) | a1 · 1 |
| `src/core/conversation/stream.ts` | 신규 | tori_en 흘려 풀기 · 문장 끝 · 문장 검사 · 걸린 문장 바꾸기(값 2) | a1 · 1 |
| `tests/unit/conversation-call.test.ts` | 신규 | 규격 · 정규화 · 사용자 메시지 · 다시 쓸 토리 차례 · 1~3단계 AI 질문 검사 | a1 · 1 |
| `tests/unit/conversation-stream.test.ts` | 신규 | 흘려 풀기(이스케이프 · 조각 경계 · 첫 속성) · 문장 끝 · 검사 | a1 · 1 |
| `tests/fixtures/ai/samples/talk_turn.*.json` | 신규(여럿) | 회화 턴 응답 견본(값 6) | a1 · 1 |
| `src/server/ai/client.ts` | 수정 | `sendStreamingAttempt`(값 3 — P9a 값 7 이 정해 둔 자리) | a2 · 2 |
| `src/server/ai/talk.ts` | 신규 | `server-only`. 회화 턴 · 끝맺음 턴 흐름(값 4) | a2 · 2 |
| `src/server/ai/run.ts` | 수정 | `maskerFor` · `isConfigError` 를 내보냄(동작 그대로 — 두 흐름이 같이 씀) | a2 · 2 |
| `src/server/ai/index.ts` | 수정 | `talkTurn` · `talkClosing` 공개(값 5) | a2 · 2 |
| `tests/fixtures/ai/fake-anthropic.ts` | 수정 | 'stream' 응답(SSE 이벤트 꼴, 값 6) — 비스트리밍 응답 그대로 | a2 · 2 |
| `tests/integration/conversation-call.test.ts` | 신규 | 흘려 보내기 · 실패 길 · 기록 · 요청 꼴 · 가림 | a2 · 2 |
| `src/core/conversation/flow.ts` | 신규 | 토막 · 질문 차례 · '모름' · 목표 턴 · 처음/다시 · 붙일 말 · 이어 할 자리 · 노리는 단어 목록(값 7) | a3 · 3 |
| `src/core/conversation/hints.ts` | 신규 | 힌트 단 · 힌트 종류 · 쓴 단(값 8) | a3 · 3 |
| `src/core/conversation/said.ts` | 신규 | '말했다' · '안다' · 만남 · 단원 단어 조건 · 영어로 말한 문장 · S-3 단어 수(값 9) | a3 · 3 |
| `src/core/conversation/wrap-up.ts` | 신규 | 되짚을 말 · 끝인사 · 마무리 문장 고르기(값 10) | a3 · 3 |
| `src/core/conversation/listen.ts` | 신규 | 회화 듣기 끝 규칙 · 인식 확인 · 이름 묻기 턴 가림(값 11) | a3 · 3 |
| `src/core/conversation/friendship.ts` | 신규 | 친한 정도 · 토리 이야기 열기(값 12) | a3 · 3 |
| `src/core/conversation/attempt.ts` | 신규 | 처음 스냅숏 · 따라 말하기 시도 꼴과 활동 번호(값 13) | a3 · 3 |
| `tests/unit/conversation-flow.test.ts` | 신규 | flow · hints · wrap-up | a3 · 3 |
| `tests/unit/conversation-said.test.ts` | 신규 | said · friendship · attempt | a3 · 3 |
| `tests/unit/conversation-listen.test.ts` | 신규 | listen | a3 · 3 |

### 요청하는 공용 변경(컨트롤러가 합친다 — b · c 몫 포함)

| # | 파일 | 바꿀 것 | 차례 · 까닭 |
|---|---|---|---|
| 1 | `tests/fixtures/settings.ts` | `TEST_SETTINGS` 에 12절 회화 키를 기본값 그대로(집 전체): talk.feedback_from_level 5 · talk.good_lines 2 · talk.next_time_lines `{"5":1,"6":1,"7":1,"8":1,"9":1,"10":2,"11":2,"12":2}`(실시드 꼴 그대로) · talk.friendship_max 10 · talk.friendship_per_talk 1 · talk.memory_summaries 3 · talk.summary_max_chars 300 · talk.test_match_pass 0.8 · talk.test_hint_scores [1, 0.5, 0] · talk.hint_read_match 0.9 · talk.confirm_seconds 2 · talk.idle_close_minutes 30 · talk.practice_rounds 2 · talk.more_talk_round_turns 5 · talk.dontknow_max 3 · talk.nospeech_dontknow_count 2 · talk.reask_sentence_every_turns 3 · talk.follow_up_min_every_turns 3 · talk.max_answer_seconds 30 · speech.end_silence_seconds.talk.1-3 3 · .4-6 2.5 · .7-9 2 · .10-12 2 · speech.end_silence_seconds.talk_long 5. 회12 가 받아들여지면 speech.slow_rate 0.8(제안)도 | 0. 실시드 `seed/settings.json`(P6a)에는 모두 있고 값이 같다(확인한 사실 11). talk.said_ratio · known_days · more_talk_turns 는 작은 틀 설정(`smallFrameSettings`)에 이미 있다 |
| 2 | `tests/fixtures/seed/dev-tree.ts` | `DEV_SEED_AREAS` 에 회화를 더한다(시험용 시드의 1단계 회화 카드 · 1단계 회화 평가 카드 · 1~3 구간 토리 이야기가 로컬 · e2e · 개발용 DB 에 들어감). 주석의 C68 (1) 을 회5 결정 번호로 | 6 앞. 회5 · 13절 한 줄 뒤. 안 하면 프리뷰 · e2e 에 회화 수업이 없다 |
| 3 | 개발용 DB 둘 | 공용 변경 1 · 2 뒤 로컬 `pnpm db:dev --reset`(재부팅 뒤), Supabase 개발용 프로젝트는 시험용 시드 다시 적재(C75 길 — P11 공용 변경 2 와 같은 임시 적재) | 6 끝. **안 하면 프리뷰 회화 화면이 설정 없음 오류이거나 회화 수업이 없다** |
| 4 | [사람] H4 | 개발용 Anthropic 키를 Vercel Preview 환경 변수에(요청자 — 값은 대화에 적지 않음) | 11. 없으면 회화 턴이 실패 길(가정 나) |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **회화 턴 규격(`src/core/ai/calls/talk.ts`, 순수).** P9b `CallSpec` 꼴(`src/core/ai/calls/common.ts`)을 따르되 스트리밍 몫을 더한 `TalkCallSpec`(제안). 목적 `talk_turn` · `talk_closing`(P9a `AI_PURPOSES` 에 있음), `multiTurn: true`(자동 캐시), 응답 규격 제목 `"talk_turn"`(두 목적이 같은 규격 — 6.2 '회화 턴과 끝맺음 턴은 같은 스키마', 가짜 Anthropic 이 제목으로 고르고 끝맺음은 사용자 메시지 글로 가름).
   - 입력 `TalkTurnInput`(제안): P9b `LevelContext`(can-do · 학습 요소 · 앞 단원 학습 요소 · 단원 단어 · 문장 길이 상한 — P11b `levelContextOf` 를 b 가 부름) + `spec`(대화 방식 `mode` · 목표 턴 · 힌트 영어 단 수(level_specs `hintTiers` 에서 'ko' 를 뺀 수) · 4~9단계 뜻 힌트 칸 여부 · 쓸 수 있는 말 수 · 미션 수 · 카드 꼴) + `card`(프롬프트에 넣는 카드 칸: 주제 · 목표 표현 · 예상 흐름 · 오늘 쓸 말 단어 · 4단계부터 카드 질문 목록(번호 · 영어 · 노리는 단어) · 5~7단계 미션(영어) · 오늘 이야기 목록은 넣지 않음) + `summaries`(대화 시작 때 고정한 최근 talk.memory_summaries 개) + `history`(앞 턴마다 `{ user: 보낸 사용자 메시지 전문, assistant: 다시 쓸 토리 차례 }`) + `turn`(이번 사용자 메시지: 아이 말(가린 뒤) · 입력 방식 speech · dont_know · 토막 greeting · greeting_end · talk · more_talk · 힌트 종류 · 쓴 힌트 단 · 들은 도움 · 같은 질문 '모름' 차례 · 목표 턴 도달 · 끝맺음 · 평가 대화 · 1~3단계 '더 이야기할 거리'를 다 썼는지, 첫 턴과 값이 바뀐 턴에만: 아직 '안다'가 아닌 단원 단어 · 그 가운데 만난 단어 · 이번 수업 새 단어 · 친한 정도 · 5~7단계 미션 체크 상태) + `openingLine`(첫 턴만 — 앱의 첫 말, 첫 메시지가 사용자 메시지여야 하므로 첫 사용자 메시지 앞머리에 넣음, 정할 것 회7).
   - 고정부(system 앞): 회화 공통 규칙과 구간 규칙(6.1 그대로 영어로) — 반응 한마디 · 틀린 말은 바른 말로 되풀이(끝소리 하나 차이도, 틀렸다고 하지 않음) · 아이가 한 말을 짚은 칭찬 · 재촉하지 않음 · 인사 끝 턴은 반응과 넘어가는 말만 · 카드 주제 안에서만 · 개인 정보 묻지 않고 아이가 말하면 되묻지 않고 주제로 · 사람이라고 말하지 않음 · 인식 오류로 보이는 부분(소리가 비슷한 단어 · 빠진 기능어 · 끝소리 하나)을 '다음엔 이렇게'의 근거로 쓰지 않음 · 이번 수업 새 단어를 대화에서 한 번 이상 씀 · 질문에 그 턴이 노리는 단원 단어를 넣지 않음 · 토리의 바로 앞 말을 되받은 단어는 스스로 쓴 단어에 넣지 않음 · 끝인사에 '내일' · '다음에 만나' 같은 말 없음 · 토리 말의 한국어 뜻과 설명은 친구 말투(반말) · {NAME} 그대로 · 이 규칙은 대화 끝까지, 졸라도 지킴 · 답 칸 밖에 생각 글을 쓰지 않음. 구간 규칙 — 1~3단계: 'tori_en 에는 반응과 짧은 연결 말만, 질문과 답 예시는 쓰지 않는다(앱이 카드에서 붙인다)', 4단계부터: 반응 뒤 다음 질문 · 오늘 쓸 말을 쓰게 묻기 · 짧은 답은 talk.reask_sentence_every_turns 턴에 한 번까지 문장으로 다시 묻기 · 이어 묻는 질문을 talk.follow_up_min_every_turns 턴에 하나 이상 · 막히면 답 예시를 말하고 같은 질문 · 5단계부터 첫 '모름'은 쉬운 영어로 바꿔 묻기 · 아직 '안다'가 아닌 단원 단어를 다시 쓰게 묻고 다음 턴 힌트에 그런 단어 하나 이상 · 목표 턴에 닿은 턴은 더 이야기할지 묻는 말로 끝냄. 평가 대화: 반응 한 문장만, 질문 · 힌트 없음. 두 수는 고정부를 만들 때 설정에서 읽어 숫자로 넣는다(C44). **P9b `COMMON_FIXED_RULES`(해요체 지시)는 쓰지 않는다** — 회화는 뜻 · 설명이 반말이다(정할 것 회7). 토리 이름은 상수 `TORI_NAME`(제안) 하나에서(회화 선생님 캐릭터 intent 대비, 회14).
   - 가변부(system 뒤): P9b `levelVariable` + 단계 대화 방식 · 목표 턴 · 힌트 · 카드 칸 · 지난 대화 요약. '단계 어휘 범위'는 '단계 n 의 쉬운 낱말과 단원 단어로 말한다'는 지시와 단원 단어 목록으로 두고, 1~3단계 AI 힌트의 어휘 검사는 앱이 한다(아래, 정할 것 회7).
   - 사용자 메시지 꼴 `talkUserMessage(turn)`: 영어 이름표 줄(`Child: …` · `Input: speech` · `Segment: talk` · `Hint: none (0)` · `Heard help: -` · `Don't-know count: 0` · `Target reached: no` · `Closing: no` · `Level test: no` · `More-talk material used up: no`, 바뀐 칸이 있으면 그 뒤 줄 `Unit words not known yet: …` 등). 같은 입력이면 같은 글(캐시 · AC-15k).
   - 다시 쓸 토리 차례 `toriRewriteOf({ sentSentences(검사를 지난 글, 걸린 자리는 안전한 대사), appended(앱이 붙인 카드 질문 영어 · 들려준 답 두 개 'A. Or B.' · 답 예시 · 'Do you want to talk more?') })` — tori_ko 는 넣지 않고 {NAME} 은 채우기 전 글(6.1 · AC-15k).
   - 응답 규격(모두 required, null 없음 — 6.2 끝 문단, 칸 이름 제안, 차례 그대로): `tori_en` string(첫 속성) · `tori_ko` string · `recast` string · `explanation` string · `new_words` string[] · `self_used_words` string[] · `mission_done` int[](5~7단계 이번에 끝낸 미션 번호) · `stuck` boolean(막힘으로 볼 말) · `card_question_no` int(4단계부터, 이어 묻는 질문이면 0) · `next_question_en` · `next_question_ko`(1~3단계 '더 이야기할 거리'를 다 쓴 '더 이야기하기' 턴만) · `next_hint_ko` string(4~9단계) · `next_hints` string[](영어 단) · `next_usable_phrases` string[](5~6단계) · `next_targets` string[] · `next_answer_example` string · `farewell` · `farewell_ko`(1~4단계) · `good_lines` string[] · `next_time_lines` string[] · `summary` string(끝맺음 필드는 끝인사 → 잘한 말 → 다음엔 이렇게 → 요약 차례, C21). 판정 칸은 없다(R2 · AC-15c).
   - 정규화 `normalizeTalk(loose, input, rules)`: 다듬기(P9b `prepareAnswer`) → 개수 자르기(6.1): good_lines ≤ talk.good_lines · next_time_lines ≤ talk.next_time_lines[단계](5단계 미만은 둘 다 빈 배열, AC-15d) · next_hints ≤ 단계 영어 단 수(C20 — 4~5 · 6~7 둘, 8~9 하나, 10~12 없음) · next_usable_phrases ≤ 규격 수 · summary ≤ talk.summary_max_chars 자 · 5단계부터는 tori_ko · farewell_ko 를 '' 로(1~4단계만 뜻) · card_question_no 를 0~카드 질문 수로 · self_used_words 를 원형(vocab forms — P11a `lemmaLookup`)으로 바꿔 단원 단어 목록에 있는 것만 · 같은 말 하나로. 필수 칸이 없으면 null(호출 하나의 실패).
   - 출력 검사 칸 `talkCheckFields(value)`: tori_ko(ko) · recast(en) · explanation(ko) · next_question_en/ko · next_hint_ko · next_hints · next_usable_phrases · next_answer_example · farewell · farewell_ko · good_lines · next_time_lines · summary(ko). tori_en 은 흘려 받는 동안 문장마다(값 2). 걸린 칸 바꾸기(6.4): tori_ko 는 전체 '' · recast · explanation · good_lines · next_time_lines 는 비움 · 질문 · 힌트 · 답 예시는 비우고 `hintsBlocked: true`(b 가 카드 것으로) · farewell 은 비우고 `farewellBlocked`(카드 끝인사로) · summary 는 비우고 저장 안 함.
   - 1~3단계 AI 질문 · 힌트 검사 `checkLowLevelAiQuestion(value, { sentenceMaxWords, allowedWords, unitWords, forms })`(6.4 · C5 · AC-15i): 질문이 물음표로 끝나고 문장 길이 상한 안 · 한국어 뜻 힌트와 영어 문장 힌트 한 쌍(3단계는 영어 틀도) · 영어 문장 힌트 · 영어 틀 · 답 예시가 길이 상한 안이고 그 단계 어휘 범위(vocab band_level ≤ 단계 — P9c `allowedWordsOf`) · 단원 단어 · {NAME} 밖 낱말이 없으며 형태 표(시드 `forms`)로 범위 밖 형태가 없다 → `{ ok } | { ok: false, reason }`.
2. **흘려 받기(`src/core/conversation/stream.ts`, 순수).**
   - `createToriEnReader()` → `{ push(delta: string): string[]; finish(): string[]; failed(): boolean }`: JSON 글 조각을 쌓아 `{"tori_en":"` 뒤 문자열을 풀며(`\"` `\\` `\/` `\n` `\t` `\uXXXX`, 조각 경계에 걸친 이스케이프 포함) 새로 끝난 문장을 돌려준다. 문자열이 닫히면 남은 조각이 마지막 문장이다(`finish`). 첫 속성이 tori_en 이 아니면 `failed()` — 흐름은 흘려 보내지 않고 끝까지 받아 한 번에 보낸다(위험 3).
   - 문장 끝: P4a `splitSentences` 규칙(`. ! ?` 와 닫는 따옴표 · 괄호 뒤가 공백이나 글 끝, 약어 Mr. · Mrs. · Dr. · a.m. · p.m. · 숫자 사이 점 제외 — 5절 끝 문단). 흘려 받는 중에는 문장부호 뒤에 공백이 온 뒤에야 끝으로 본다(글 끝은 문자열이 닫힐 때).
   - `checkToriSentence(sentence, { forbidden, metaPhrases, lowLevel })` → `{ ok: true } | { ok: false, reason: "forbidden" | "contact" | "personal" | "meta" | "question" }`. 금지어 · 개인 정보 질문 패턴은 P9b 출력 검사와 같은 함수(`forbiddenHits` · 연락처 정규식), 메타 문장은 시드 `meta-sentences.json` 의 구(소문자 포함), 1~3단계는 물음표로 끝나는 문장을 `question`(지움). 길이 상한은 막지 않고 `overLength` 만 센다(3.6 '길이 초과' 기록).
   - 걸린 문장 바꾸기: forbidden · contact · personal · meta 는 카드 안전한 대사(`card.safeLines` 를 턴 번호로 돌려 고름)로 바꾸되 **한 턴에 처음 걸린 자리만** 바꾸고 그 뒤 걸린 문장은 지운다(같은 대사 되풀이를 막음, 정할 것 회8). question 은 지운다.
3. **스트리밍 시도(`src/server/ai/client.ts`).** P9a 값 7 이 정해 둔 자리 그대로: `sendStreamingAttempt(client, { body, betas, timeoutMs }, clock, { onText })` → `{ ok: true; message; requestId; latencyMs; firstTextMs } | { ok: false; failure; requestId; latencyMs; firstTextMs: number | null; receivedText: string }`. `client.beta.messages.stream({ ...body, betas }, { timeout })` 의 `text` 이벤트에서 **조각(delta)만** 받아 `onText` 로 넘긴다 — fallback 블록 뒤 새 text 블록이 시작되어도 조각을 차례로 이으면 JSON 글 하나가 된다(8절 끝 문장, 확인한 사실 1). 끝은 `finalMessage()`(usage · iterations · stop_reason 은 비스트리밍과 같은 꼴 — P9a `billedAttemptsOf` 그대로). 끊을 때는 `stream.abort()`. 오류 갈래는 `toAttemptFailure` 그대로. 첫 `text` 까지를 '첫 바이트 전'으로 본다.
4. **회화 턴 흐름(`src/server/ai/talk.ts`, `server-only`).** P9c `runAiCall`(`run.ts`)과 같은 차례를 스트리밍으로:
   - (1) 설정(`aiSettingSchemasOf("talk_turn" | "talk_closing", level)` + 앱 규칙 키 talk.good_lines · talk.next_time_lines · talk.summary_max_chars · talk.reask_sentence_every_turns · talk.follow_up_min_every_turns) · 학습일 · 단가표 · `requestConfigOf`(끝맺음은 P9a `settingKeysOf` 가 모델 · effort · 생각을 talk_turn 구간 키로, 최대 출력 · 타임아웃을 talk_closing · feedback 으로 준다). 설정 문제는 `config`(행 없음).
   - (2) 호출 앞 판정 `preCallGate` → 막히면 safety_cap 행 · `{ ok: false, reason: "safety_cap" }`(스트림 없음).
   - (3) 시드 목록(forbidden · metaSentences) · 가림(`maskerFor` — run.ts 에서 내보냄) · 요청 본문(`buildAiRequest` + `cache_control` 자동 · Sonnet 은 fallbacks · 구조화 출력 `zodOutputFormat(wireSchema)`).
   - (4) 시도: 기다림은 타임아웃의 두 배까지(6.1). 첫 text 가 타임아웃 안에 안 오면 흐름이 `abort`(SDK timeout 의미에 기대지 않음, 위험 1). 첫 문장 전 연결 · 타임아웃이면 1회 다시. Haiku 첫 문장 전 refusal 이면 같은 본문을 `claude-sonnet-5-5` · low · between_tools · fallbacks 로 1회(그 턴만, 따로 ai_calls 행).
   - (5) 흘려 보내기: `onText` → reader → 끝난 문장 → `checkToriSentence` → 통과(또는 바꾼) 문장을 `onSentence(sentence)` 로(부르는 쪽 b 가 브라우저로 씀). 첫 문장을 내보낸 때 `firstSentenceMs = 지금 − requestReceivedAt`.
   - (6) 첫 문장 뒤 끊김 · 타임아웃 · stop_reason refusal · max_tokens → `{ ok: false, reason: "cut_after_first", sentSentences }`(보낸 문장은 그대로, 정리 · 기록은 b).
   - (7) end_turn → 모든 text 블록을 차례로 이은 글 → `JSON.parse` → `prepareAnswer` → 엄격 규격 · 검증 → (실패면 다시 요청하지 않고 느슨한 규격 + 정규화, 6.1 '회화 턴은 다시 요청하지 않고') → `normalizeTalk` → `talkCheckFields` 검사 · 바꾸기 → `{ ok: true, value, sentSentences, toriEnChecked, overLength, firstSentenceMs, answeredModel, normalized, checked }`. 끝맺음 턴은 `onSentence` 없이 같은 길(tori_en '' — C33).
   - (8) 시도마다 ai_calls 한 행(`insertAiCall` — 상태 · 오류 갈래 · 토큰 넷 · 비용(`costOf(billedAttemptsOf(...))`) · 답한 모델 · 지연 · first_sentence_ms). 아이 글 · 응답 글은 어디에도 남기지 않는다.
5. **공개 함수(`src/server/ai/index.ts`).** `talkTurn(input, ctx & { requestReceivedAt: Date; onSentence(s: string): void }, deps?)` · `talkClosing(input, ctx, deps?)` · 결과 형 `TalkOutcome` 다시 내보냄. b 의 회화 서버는 이 파일만 가져온다(의존 규칙 sdk-only-in-ai).
6. **가짜 SSE · 견본(`tests/fixtures/ai/fake-anthropic.ts` · `samples/talk_turn.*.json`).** `FakeReply` 에 `{ kind: "stream"; body: unknown; chunks?: number; delayMs?: number; firstDelayMs?: number; cutAfterChars?: number; fallbackAtChars?: { at: number; toModel: string } }`(제안)를 더한다. body 는 `messageBody(...)` 꼴의 마지막 메시지이고, 처리기는 문서의 SSE 차례(`message_start` → `content_block_start`(text) → `content_block_delta`(text_delta)×조각 → [`content_block_stop` → `content_block_start`(fallback, to.model) → `content_block_stop` → `content_block_start`(text)] → `content_block_stop` → `message_delta`(stop_reason · usage · iterations) → `message_stop`)로 `text/event-stream` 을 흘린다. fetch 가짜(Vitest)와 node:http 서버(e2e) 둘 다. `cutAfterChars` 면 그 뒤 연결을 끊는다. 견본(제안): `talk_turn.l1-ok` · `l1-question-in-reaction` · `l1-blocked`(금지어 · 주소 질문 · 메타 문장) · `l1-more-talk-ai`(질문 · 힌트 · 답 예시) · `l4-ok`(카드 질문 번호 · 힌트) · `l5-closing`(끝인사 · 잘한 말 둘 · 다음엔 이렇게 셋 · 요약) · `refusal` · `fallback`(대체 모델 홉) · `max-tokens`.
7. **흐름(`src/core/conversation/flow.ts`, 순수).**
   - `talkFlowOf({ spec, card })` → 토막 차례(회화 수업 모델 1).
   - `todayWordsOf({ card, lesson, snapshotMet, known, k, vocab })` → P10 `previewWordsOf` 를 그대로 불러 오늘 쓸 말 목록. `practiceItemsOf({ card, todayWords })` → 카드 todayWords 가운데 exampleKo 가 있는 예문(회13). `practiceOrderOf(sessionId, n, rounds)` → 바퀴마다 차례(둘째 바퀴부터 세션 id 해시로 섞되 첫 바퀴와 다른 차례, 시계 · 무작위 없음).
   - `talkPositionOf({ spec, card, snapshot, turns, followDone, settings })` → `{ segment, followIndex?, pending: PendingQuestion | null, talkCount, targetReached, moreRound, moreTurnsLeft, closed }`(이어 할 자리 · 서버 · 화면이 같은 값). `turns` 는 talk_turns 의 가벼운 꼴(화자 · 토막 · 입력 방식 · 막힘 · 노린 단어 · 처음/다시 · 카드 질문 번호 · 목표 턴 안).
   - `PendingQuestion` = `{ source: "card_greeting" | "card_turn" | "card_skipped" | "more_talk" | "ai_more_talk" | "card_question" | "ai_question"; index?; questionNo?; en?; ko?; targets: string[]; askKind: "first" | "re_ask"; twoAnswers?: [string, string]; answerExample: string; imageKey?: string }`.
   - 1~3단계 질문 차례(C36): 카드 턴 차례 → 목표 턴 전에 카드 턴이 다 쓰였으면 talk.dontknow_max 로 넘어간 질문을 답 예시와 함께 한 번씩 → '더 이야기할 거리' → AI(`ai_more_talk`). 목표 턴 뒤 '더 이야기하기'는 '더 이야기할 거리'의 남은 질문부터 → AI. AI 질문이 검사에 걸리면 '더 이야기할 거리' 가운데 이 대화에서 가장 오래전에 쓴 것(같은 질문이 이어 나오지 않게 — AC-15i).
   - 4단계부터: 대화 첫 질문은 카드 질문 1번, 그 뒤 질문은 AI(응답의 card_question_no 기록). 끊긴 턴 · 걸린 힌트의 대신 질문은 '아직 쓰지 않은 가장 앞 카드 질문'(talk_turns.card_question_no 에 없는 가장 작은 번호, 회11 (8)).
   - '모름'(C2 · C36 · C44): 버튼 · 같은 질문에서 인식된 말 없이 no-speech 로 끝난 듣기 talk.nospeech_dontknow_count 번 · AI 의 stuck 참 — 같은 질문 '모름' 수(질문이 바뀌면 0). 둘째부터 힌트 마지막 단까지 열림, talk.dontknow_max 번째면 다음 질문. '모름' · 막힘 턴은 목표 턴 · '말 주고받기 n'에 세지 않는다.
   - `appendAfter({ level, position, outcome })` → 앱이 붙일 말: 1~3단계 — 인사 끝 턴 없음 · '모름' · 막힘이면 카드 답 예시 + 같은 질문(1단계 처음 묻는 턴이면 답 두 개도) · 목표 턴에 닿은 턴이면 'Do you want to talk more?' · 그 밖 다음 카드 질문(1단계 처음 묻는 턴이면 답 두 개). 4단계부터 — 끊긴 턴만 카드 질문. 1~3단계 회화 턴이 두 번 실패한 턴은 카드 칭찬 대사 + 다음 카드 질문(8절).
   - `askKindOf({ targets, metBefore, askedTargets })` → 하나라도 처음이면 `first`(회11 (5)).
   - `talkTargetsOf(card, spec)` → 1~3단계는 턴마다, 4단계부터 카드 질문마다의 노리는 단어(P12 연습 고르기가 씀).
   - 대화 안전 상한은 P9c `talkSafetyOf({ turns, reachedToday }, …)` 를 그대로(턴 수 = 아이 턴 전부, 회11 (15)).
8. **힌트(`src/core/conversation/hints.ts`, 순수).** `hintTiersOf({ level, spec, pending, askKind, ai?: { hintKo, hints, usable, ok } })` → 차례 있는 단 목록(각 `{ kind: "ko" | "frame" | "sentence" | "usable"; text; listen?: boolean }`):
   - 1~2단계: 뜻(카드 hintKo) → 영어 문장(카드 hintEn, 듣기 단추). 3단계: 뜻 → 영어 틀(카드 frameEn) → 영어 문장(듣기). 4~5단계: 뜻(AI next_hint_ko, 걸리면 카드) → 영어 틀 → 영어 문장(5단계는 영어 틀 단에 쓸 수 있는 말을 더함). 6~7단계: 영어 틀(6단계는 쓸 수 있는 말 함께) → 영어 문장, 다시 묻는 턴이면 맨 앞에 뜻. 8~9단계: 영어 틀, 다시 묻는 턴이면 앞에 뜻. 10~12단계: 단 없음('힌트' 단추 없음). 4단계부터 AI 힌트가 걸리면 그 턴 카드 질문 번호의 카드 힌트, 번호 0 이면 단 없음(C19). 같은 질문 둘째 '모름'부터 전부 열림.
   - `hintKindOf({ opened, tiers, heardHelp })` → 영어 단(영어 틀 · 영어 문장 · 쓸 수 있는 말)을 하나라도 열었거나 답 두 개 · 답 예시를 들었으면 `english`, 뜻만 열었으면 `meaning_only`, 아니면 `none`(3.3 '힌트 종류').
9. **'말했다' · '안다'(`src/core/conversation/said.ts`, 순수).**
   - `saidWordsOf({ aiWords, heard, hintKind, unitWords, lemmaOf, homophones })`(3.4 · AC-9d): hintKind 가 english 면 빈 목록. 아니면 AI 단어를 원형으로 · 단원 단어 목록에 있는 것만 · 인식 글을 P2a `normalizeForMatch`(소문자 · 문장 부호 · 숫자 · 축약형 · 동음이의어)로 낱말로 나눠 원형으로 바꾼 묶음에 든 것만.
   - `sayStateAfter({ saidDays, day, knownDays })` → `{ saidDays(겹치지 않게), known: 서로 다른 학습일 수 ≥ knownDays }`.
   - `metWordsIn(text, { unitWords, lemmaOf, homophones })` → 토리 말 · 카드 질문 · 오늘 쓸 말에서 단원 단어 찾기(만남, 5절 vocab_progress).
   - `talkWordConditionOf({ knownSay, unitWords, ratio })` → '말함' '안다' 비율 ≥ ratio(AC-15c 24/30 · 23/30).
   - `talkEnglishSentenceDelta(kind, text)` → '말' 턴 · 따라 말하기 · 한 번 더 말해 보기에서 인식 글이 있으면 1, '모름' · 빈 글은 0(C41).
   - `s3WordCountOf(turns)` → 힌트 종류 '영어'를 뺀 아이 턴 단어 수(AC-15c).
10. **되짚을 말(`src/core/conversation/wrap-up.ts`, 순수, C33).** `wrapUpLinesOf({ recasts(대화 차례), todayWords, closingLines, level, lemmaOf })` → 오늘 쓸 말 단어마다 그 원형이 든 가장 늦은 되풀이 문장 하나(같은 문장 두 번 안 씀) · 모자란 자리는 카드 정리 대사 차례로 · 줄 수 = 오늘 쓸 말 단어 수, 오늘 쓸 말이 없으면 카드 정리 대사 전부. 카드 정리 대사는 1~4단계 한국어 뜻을 함께. `farewellOf({ closing?, card })` → 끝맺음 끝인사가 와 있고 검사를 지났으면 그것(1~4 뜻), 아니면 카드 끝인사. `againLineOf({ level, closing?, recasts })` → 마무리 '한 번 더 말해 보기' 문장: 5단계부터 다음엔 이렇게 첫 줄(없으면 잘한 말 첫 줄), 4단계는 마지막 되풀이 문장, 1~3단계 없음(회11 (13)).
11. **회화 듣기(`src/core/conversation/listen.ts`, 순수).**
   - `talkSpeechSettingsFrom(read)` → `{ endSilenceMs: 구간별(speech.end_silence_seconds.talk.<구간>), longSilenceMs(speech.end_silence_seconds.talk_long), maxAnswerMs(talk.max_answer_seconds) }` — 없거나 꼴이 틀리면 던진다.
   - `talkEndRuleFor({ level, mode: "dialogue" | "follow" | "test" }, speech, talk)` → P2a `EndRule`: 따라 말하기 · 평가 대화 · 1~7단계 대화는 `{ endSilenceMs: talk 구간 값, capMs: speech.max_listen_seconds, chunkMs }`, 8단계부터 대화는 `{ endSilenceMs: talk_long, capMs: talk.max_answer_seconds, chunkMs: speech.max_listen_seconds }`(말하기 단추 글 '다 말했어요', C37). P2a `endRuleFor` 는 고치지 않는다(회화 키가 없는 말하기 · 배치가 깨지지 않게).
   - `confirmPlanOf({ level, heard, openedSentence?, heardAnswers?, matchPass(talk.hint_read_match), homophones, confirmMs })` → `{ autoSend, bigRetry, waitMs }`: 1~3단계는 인식 글이 연 영어 문장 힌트나 들려준 답과 일치율(nameSlot excluded) ≥ matchPass 면 바로 보냄(waitMs 0), 연 힌트 · 들은 답과 맞지 않으면 waitMs = confirmMs · '다시 말하기' 크게, 연 힌트 · 들은 답이 없으면 4단계부터와 같게(waitMs = confirmMs · 두 단추 같은 크기)(4절 인식 확인 행 · C23).
   - `maskNameAnswer(heard, { templates })`(6.1 이름 묻기 턴): 그 턴의 영어 문장 힌트 · 답 두 개 · 답 예시 가운데 {NAME} 을 든 틀과 인식 글을 맞대어 {NAME} 자리에 온 낱말을 {NAME} 으로(AC-16b 'my name is min jun').
12. **친한 정도(`src/core/conversation/friendship.ts`, 순수, 3.5 · AC-16a).** `friendshipAfter({ friendship, opened, band, storiesInBand, isRetry }, { per: talk.friendship_per_talk, max: talk.friendship_max })` → `{ friendship, opened, unlocked: number | null }`: 다시 하기면 그대로. 칸 + per 가 max 에 닿으면 지금 구간의 다음 이야기를 열고 0 칸(구간 이야기를 다 열었으면 max 에서 멈춤). 구간이 바뀌면 열린 수는 새 구간 기준(칸은 그대로). 구간 이야기 수는 STORIES_PER_BAND(20, P4a 상수 — 시드 규격 수).
13. **회화 시도 꼴(`src/core/conversation/attempt.ts`, 순수).** Zod 판별 합: `talk-start`(activity_no 1 — shownWords · metBefore · practiceOrder) · `talk-today`(단어) · `talk-practice`(예문 · 바퀴) · `talk-wrapup`(되짚을 말) · `talk-again`(마무리 한 번 더 말해 보기) — 공통 `{ v: 1, step: "final", target: string, heard: string[], failures: number, skipped?: "recognition" | "no_mic" | "silent" }`. 활동 번호 `followAlongNo({ segment, index, round? }, snapshot)` = 1 + 앞 토막 항목 수 + 차례(오늘 쓸 말 → 말해 보기 바퀴마다 → 정리 → 한 번 더). P11a `src/core/session/attempt.ts` 는 고치지 않는다(P11c 와 겹침 — 회화 시도는 회화 서버만 읽고 쓴다, 정할 것 회3).

### 정본 밖 문구(P13 셋 — 정할 것 회10)

4절 · 3.3 · 7절 · 8절 · C34 · C35 · C50 에 있는 회화 문구(예: '말 주고받기 n / 목표 턴' · '다 했어요! 더 이야기하기 n / …' · '토리가 생각하고 있어요' · '힌트' · '잘 모르겠어요' · '막히면 눌러요' · '다시 말하기' · '보내기' · '더 이야기하기' · '그만하기' · '토리와 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요' · '다음에 끝까지 이야기하면 별을 받아요' · '다시 했어요' · '토리가 바꿔 말해 준 문장' · '한 번 더 말해 보기' · '다음 이야기' · '홈' · '수업 목록' · '토리 이야기 듣기' · '토리는 앱 속 AI 친구예요. …'(처음 안내) · '토리의 약속' 한 줄 · '토리에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요' · '여기까지 이야기한 것은 저장했어요. 다음에 이어서 해요' · 'Oops, I need a little break!' · '나 잠깐 쉬어야 해!' · 'Do you want to talk more?' · '내가 할 말' · '문장 다 보기' · '천천히 생각해도 돼요. 생각나면 말하기 버튼을 눌러요' · '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' · 마이크 안내 셋 · '인터넷이 끊겼어요. 연결되면 다시 해요' · '잘한 말' · '다음엔 이렇게' · 결과 말 셋)는 그대로 쓰고 아래에 넣지 않았다. P11 의 '말하기'(단추) · '맞았어요!' · '정답은 이거예요' · '다음'은 같이 쓴다(C78). 아래는 제안이다(해요체, 수는 설정값 · 시드에서).

| 화면 | 자리 | 제안 문구 | plan |
|---|---|---|---|
| 처음 회화 안내 | 시작 단추 | '시작!'(홈 카드 단추와 같은 말) | b |
| 오늘 쓸 말 · 정리(1~3) | 첫 줄 안내 | '토리를 따라 말해 봐요' | b |
| 말해 보기 | 첫 바퀴 · 둘째 바퀴 안내 | '보고 말해 봐요' · '뜻을 보고 영어로 말해 봐요' | b |
| 대화 | '그만하기' 확인 쪽지 단추 | '그만할래요' · '더 이야기할래요' | b |
| 마무리 첫 장 | 줄 이름 | '오늘 얻은 단어' · '미션 성공'(5~7단계) — 4절 말을 줄 이름으로 | b · c |
| 마무리 둘째 장 | 끝맺음 기다림 둘째 줄 | '토리가 생각하고 있어요'(4절 토리 차례 문구를 같이 씀) | c |
| 마무리 셋째 장 | 줄 | '토리와 친한 정도 n/10' · '다음 이야기: <주제>' | b |
| 위 띠 오른쪽 | 그만하기 자리 | '그만하기'(정본) — 구석 작은 단추 | b |
| 회화 틀 | 턴 요청 · 토막 넘김 · 더 이야기하기가 실패한 뒤 안내 · 단추(컨트롤러 2026-10-22 21:5x, 차례 5 코드 검토 M-3) | '지금은 이야기할 수 없어요. 잠시 뒤에 다시 해 주세요' · '다시 해 보기'(끊김은 7절 '인터넷이 끊겼어요. 연결되면 다시 해요' + 같은 단추) | b |
| 토리 이야기 목록 | 제목 · 빈 목록 | '토리 이야기' · '아직 열린 이야기가 없어요. 토리와 이야기하면 열려요' | c |
| 토리 이야기 | 질문 맞음 · 틀림 · 끝 | '맞았어요!' · '정답은 이거예요' + 해설 · '이야기 목록' | c |
| 평가 대화 | 아이 차례 위 이름표 | '내가 할 말'(정본) — 더하는 문구 없음 | c |

## 작업 순서 (Order of work)

명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(서브에이전트 환경, P11 과 같음). 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 시험의 설계 숫자는 `TEST_SETTINGS` · `loadableSettings()` · 견본 빌더에서 읽는다. 통합 · e2e 는 CI(가정 다). 차례 번호는 위 '화면을 보는 차례'다.

0. (차례 0) [사람 · 컨트롤러] 바탕 가지 · 워크트리 p13 · 공용 변경 1 · 정할 것 승인과 13절 줄(회3 · 회4 · 회5 · 회6 · 회9 · 회10 · 회11 · 회12 · 회13). 완료: 바탕에서 `pnpm build` · `pnpm test` 초록.
1. (차례 1) [검증] 시험 먼저 — `tests/unit/{conversation-call,conversation-stream}.test.ts` · 견본 JSON → `src/core/ai/calls/talk.ts` · `src/core/conversation/stream.ts`. 완료: 단위 초록, 검토 묶음 a1(code-reviewer — 6.1 · 6.2 · 6.4 · C19 · C20 · C21 · C36 · C44 대조).
2. (차례 2) [서버][검증] 공용 없음 → `tests/fixtures/ai/fake-anthropic.ts`(stream 응답 — 기존 단위 · 통합 그대로 초록 확인) → `tests/integration/conversation-call.test.ts` → `src/server/ai/client.ts` · `src/server/ai/run.ts`(내보냄) · `src/server/ai/talk.ts` · `src/server/ai/index.ts`. 완료: 통합 초록(CI), `pnpm check:deps`(sdk-only-in-ai), 검토 묶음 a2(code-reviewer — 8절 회화 턴 실패 · 6.1 대체 모델 · 캐시 · 기록). H4 가 이미 있으면 컨트롤러가 `pnpm ai:contract --case talk_config.haiku,talk_config.sonnet`(P9c, 비스트리밍)를 한 번 돌려 둔다(위험 2).
3. (차례 3, 차례 1 과 ∥ 가능) [검증] `tests/unit/{conversation-flow,conversation-said,conversation-listen}.test.ts` → `src/core/conversation/{flow,hints,said,wrap-up,listen,friendship,attempt}.ts`. 완료: 단위 초록, 검토 묶음 a3(code-reviewer — 3.3 · 3.4 · 3.5 · C2 · C5 · C10 · C19 · C20 · C23 · C30 · C31 · C33 · C36 · C37 · C41 · C44 · 정할 것 회11 표와 한 줄씩 대조).
   (차례 4~6 은 b, 7~11 은 c)

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 스트리밍 SDK 의 timeout 이 첫 바이트 · 전체 가운데 어디에 걸리는지 모른다(추측) | 첫 문장 전 다시 부르기 · 두 배 기다림이 어긋남 | 흐름이 제 시계로 첫 text 기다림과 전체 기다림을 재고 `stream.abort()`(값 4 (4)). 통합 시험이 가짜 '첫 조각 늦춤'으로 본다 |
| 2 | 생각 끔(disabled · between_tools) + 구조화 출력 + 스트리밍을 함께 보내면 400 일 수 있다(추측 — P9c talk_config 계약은 비스트리밍, 아직 H4 전) | 실제 회화 턴 전부 | c 차례 10 계약 사례에 스트리밍 둘을 더하고 H4 뒤 컨트롤러가 먼저 돌린다. 400 이면 회화 턴 조합을 adaptive 로 바꾸는 13절 한 줄(12절 기본값) — 1-가 구현은 가짜로 계속 간다 |
| 3 | 구조화 출력이 tori_en 을 첫 속성으로 내지 않는다(추측 — 규격 차례대로 나온다고 봄) | 흘려 보내기 없이 응답 끝까지 기다림(NFR-8) | reader `failed()` 면 끝까지 받아 한 번에 보냄(맞게는 돎). 표본 평가(c 차례 11)가 첫 문장 시간 p95 로 본다 |
| 4 | 스트림 중 대체 모델이 이어 쓰는지 처음부터 다시 쓰는지(추측 — 8절은 '이어 붙여 JSON 하나') | 같은 말 두 번 · JSON 깨짐 | 조각을 차례로 이음(값 3). AI 계약 'fallback 블록이 끼인 표본'(9절)을 H4 뒤 받아 견본으로 고정, 다르면 reader 를 블록 경계에서 다시 시작하는 쪽으로(13절 한 줄) |
| 5 | 문장 끝 판정이 약어 · 숫자 · 따옴표에서 어긋남 | 문장이 잘리거나 늦게 나옴 | P4a `splitSentences` 규칙을 그대로 · 단위 시험 표(Mr. · a.m. · 3.5 · "Hi!" 뒤) |
| 6 | 걸린 문장마다 안전한 대사를 넣으면 같은 대사가 되풀이 | 토리 말이 어색 | 한 턴에 첫 자리만 바꾸고 뒤는 지움(회8) |
| 7 | 회화 고정부가 P9b 공통 규칙(해요체)을 가져다 쓰면 뜻 · 설명이 해요체가 됨 | 6.1 '친구 말투(반말)' 어김 | 회화 규칙 목록을 따로(값 1, 회7). 시험이 system 글에 '해요체' 지시가 없음을 본다 |
| 8 | 캐시가 깨짐(바뀌는 값이 system 으로 감 · 앞 메시지 글자가 바뀜) | 비용(6.6 캐시 값) · AC-15k | 사용자 메시지 꼴 고정 · 다시 쓸 토리 차례 글자 그대로 · 같은 입력 같은 글 시험 |
| 9 | 이름 묻기 턴 가림이 지나치게 지움 | 아이 말이 {NAME} 로 바뀌어 '말했다'가 빠짐 | {NAME} 틀 자리 낱말만(값 11), 단위 시험 'my name is min jun' · 이름 아닌 낱말 그대로 |
| 10 | 정규화가 C20 단 수를 다르게 자름 | 6~9단계 힌트 단이 모자람 | level_specs hintTiers 에서 'ko' 를 뺀 수(실시드 12행 확인, 확인한 사실 8) · 단위 표 |
| 11 | 흐름 규칙의 정본 해석이 엇갈림(질문 소진 · '모름' · 처음/다시 · 붙일 말) | 1~3단계 대화가 목표 턴에 못 닿거나 같은 질문 되풀이 | 정할 것 회11 표 · 단위 시험이 AC-15g · 15i · 15m · 2f 사례를 모두 본다 |
| 12 | 가짜 SSE 꼴이 실제와 다름 | 통합 · e2e 만 초록 | 문서의 이벤트 차례 그대로(값 6) · H4 뒤 녹화 표본으로 계약 시험(c) |
| 13 | P9 파일(client.ts · run.ts · index.ts)을 고침 | P11b 와 겹침 | P11b 는 이 셋을 가져오기만 한다(확인 — plan-p11b 바뀌는 파일 표). run.ts 는 내보내기만 |

### 정할 것(컨트롤러 — 보고 `task-p13-plan-report.md` 와 같은 글자. b 는 회16~회18, c 는 회19~회23)

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| 회1 | P13 을 셋으로 · 차례 0~11 · 검토 묶음 열 · 손 파일 수 기준 | 위 '나눈 까닭' · '화면을 보는 차례'대로. plan 하나 = 파일 열 개는 검토 묶음 단위로 지킴(P11 꼴). 묶음 plan P13 행을 a · b · c 셋으로(컨트롤러) | 아니오 |
| 회2 | P12 와 나누는 몫 · 회화 단계 평가 나눔 · 묶음 plan 고침 | 위 'P12 와 나누는 몫' 표대로. 묶음 plan P13 완료 판정의 '회화 단원 통과 · 회화 단계 평가 e2e'를 '회화 몫 함수(말함 · 안다 · 단어 조건 · 평가 턴 판정)와 평가 대화 화면(행은 시험이 넣음) e2e'로, 단원 통과 판정 · 평가 시작 · 결과는 P12 행으로. 묶음 plan 증명 표의 '회화 … 1-나' 주석 줄(AC-2a · 2c · 2f · 5e · 8c · 8i · N3)과 '회화 사례는 순수 함수 시험에만 … 서버 · 화면은 1-나' 문장, '1-가 몫이 아닌 AC' 목록(8f · 9d · 9e · 10e · 15a~15p · 16a~16d)을 C85 에 맞춰 고침 | 아니오(묶음 plan) |
| 회3 | 회화 데이터 자리(5절 해석) | 회화 수업 모델 4 · 5 대로 — 아이 행 · 토리 행이 같은 턴 번호(토리 행 n = 아이 말 n 앞 토리 말) · 칸 나눔 · 정리 토막 = 대화 닫힘 · 처음 스냅숏 시도(activity_no 1) · 따라 말하기 시도는 회화 서버만 읽고 씀(P11a 시도 꼴 · 대기열 안 씀) · 끝맺음 기록 = attempts 한 행(activity_no 0 · ai_feedback 상태 — 잡기 · 실패 수 · 결과) · stuck_phrase 글 열에 참일 때 아이 말 · 들은 도움 둘이면 '답 예시' · 마이그레이션 없음 | 예(한 줄) |
| 회4 | 1-가 하루 안전 상한의 회화 처리(C80 보완) | 회화 수업은 'AI 가 필요한 수업'이다 — 상한 날 새 회화 수업은 시작하지 않고 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'(하던 회화 수업은 열리고 그 화면이 안내). 목표 턴 전 도중이면 그 턴에서 같은 안내 + '홈'(세션 진행, 아이 행은 남고 다음 학습일에 같은 시도 id 로 이어 받음). 목표 턴 뒤 '더 이야기하기' 중이면 8절 '목표 턴 뒤의 회화' 행대로(다음 턴에 카드 정리 대사와 끝인사 → 마무리 첫 장 · 셋째 장, 끝맺음 턴은 상한이 풀린 학습일의 첫 홈 진입 응답 뒤). 쉬는 날 목표 턴 전 '그만하기'는 끝맺음 없이 중단. 토리 이야기는 그대로 | 예(C80 보완) |
| 회5 | 시험용 시드에 회화를 넣음(C68 (1) · C75 보완) | `devSeedTree` 의 적재 영역에 회화를 더해 시험용 1단계 회화 카드 · 1단계 회화 평가 카드 · 1~3 구간 토리 이야기를 로컬 · e2e · Supabase 개발용에 넣는다(공용 변경 2 · 3). 실시드 개발용 적재(dev-load)의 회화는 그대로 (4-나) 뒤. 같은 줄에 C50 (1)(1-가 프리뷰의 회화 카드는 '토리가 준비 중이에요')이 P13b 차례 6 에서 끝난다고 적음 — C85 가 C50 (1)을 끝낸다고 적지 않았다 | 예(한 줄) |
| 회6 | 회화 턴 전송 · 가짜 SSE(기술 선택) | Route Handler `POST /api/talk/turn`(제안) 이 NDJSON 줄을 흘려 보냄(문장 · 뜻 · 붙인 말 · 끝 상태 — b 값 5), 첫 문장은 검사를 지난 뒤, 첫 줄 `await requireAccess()` · 같은 출처 확인. 가짜 Anthropic 에 SSE 응답(값 6, C81 꼴) | 예(C81 꼴 기술 선택) |
| 회7 | 회화 턴 규격 꼴 | 값 1 대로 — 칸 이름 · 차례 · 사용자 메시지 꼴(영어 이름표 줄) · 첫 사용자 메시지 앞머리에 앱의 첫 말 · 회화 고정부는 P9b 공통 규칙을 쓰지 않음(반말 뜻 · 설명) · 토리 이름 상수 하나 · '단계 어휘 범위'는 지시 + 단원 단어, 어휘 검사는 앱(1~3단계 AI 힌트) | 아니오 |
| 회8 | 흘려 받기 세부 | 조각을 차례로 이음(블록 경계 무시) · 첫 문장 전 연결 · 타임아웃만 1회 다시 · Haiku 첫 문장 전 거절만 Sonnet 1회 · 걸린 문장은 한 턴에 첫 자리만 안전한 대사, 뒤는 지움 · 문장 끝은 문장부호 뒤 공백이 온 뒤 · 길이 초과는 막지 않고 기록 | 아니오 |
| 회9 | 8절 'Oops, I need a little break!' · '나 잠깐 쉬어야 해!' — '카드의 대사'라 적었으나 6.3 카드 규격(P4 `TalkCardSchema`)에 칸이 없다 | 정본 문구 그대로 앱 고정 대사로 두고(4단계는 뜻을 함께) 8절 글을 '앱의 대사'로 고친다. 카드 칸을 더하면 P4 규격 · P8 시드가 바뀌어 미룸 | 예(8절 고침) |
| 회10 | 정본 밖 문구(위 표) | 표대로. C78 처럼 13절 한 줄 + 4절 회화 세션 · 회화 마무리 · 토리 이야기 행이 이 결정을 가리킴 | 예(C78 꼴) |
| 회11 | 회화 흐름 해석(정본 세부 없음) | (1) 오늘 쓸 말: 토리가 단어 → 예문을 읽고, 따라 말할 것은 1~3단계 단어 · 4단계부터 예문, 말하기 단추로 시작. (2) 오늘 쓸 말 · 말해 보기 · 정리 따라 말하기는 결과 말을 ui.auto_next_seconds 보인 뒤 결과와 관계없이 저절로 다음(말해 보기 둘째 바퀴가 talk.hint_read_match 아래면 영어를 보이고 들려준 뒤 다음), 인식이 speech.max_retries 번 실패하면 건너뜀. (3) 말해 보기 둘째 바퀴 차례는 세션 id 로 정한 섞기(첫 바퀴와 다름). (4) 1~3단계 질문 차례: 카드 턴 → (목표 턴 전에 다 쓰면) 넘어간 질문을 답 예시와 함께 차례로 한 번씩 → '더 이야기할 거리' → AI; '더 이야기하기'는 남은 '더 이야기할 거리'부터. (5) 노리는 단어 가운데 하나라도 처음이면 처음 묻는 턴. (6) 같은 질문 '모름' 수는 질문이 바뀌면 0, '모름' 뒤 1단계 처음 묻는 턴은 답 두 개도 다시. (7) 1~4단계 뜻 줄 = AI tori_ko + 붙인 카드 질문 뜻을 이어 한 번에. (8) 4단계부터 대신 질문 = 아직 쓰지 않은 가장 앞 카드 질문(card_question_no 기록에 없는 가장 작은 번호). (9) 이어 할 때: 1~3단계는 흐름이 정한 지금 질문(AI 질문 턴이었으면 '더 이야기할 거리' 가운데 가장 오래전에 쓴 것), 4단계부터는 마지막 토리 행 글 — 힌트는 그 카드 질문 번호의 카드 힌트, 번호 0 이면 힌트 단추 없음(다음 턴 AI 힌트를 저장하지 않음). (10) '홈'(목표 턴 뒤)과 대화 안전 상한 닫힘은 정리 없이 마무리 첫 장 뒤 홈 · 수업 목록이고 끝맺음 턴을 응답 뒤에 부름, 다른 수업 고르기 · 이어 하기 시간 지남으로 중단된 회화는 끝맺음 없음(8절 그대로). (11) 되짚을 말 고르기 = 값 10. (12) 마무리 '오늘 얻은 단어' = 이 세션 오늘 쓸 말 단어, 대화(토리 말 · 아이 말)에 원형이 안 나온 것에 듣기 단추. (13) '한 번 더 말해 보기' 문장 = 값 10 `againLineOf`. (14) 대화 안전 상한의 턴 수 = 아이 턴 전부('모름' 포함). (15) 처음 회화 안내는 프로필마다 한 번(profiles.notices_seen), 처음 마이크 안내는 기기마다 한 번(P10 MIC_NOTICE_KEY 같이 씀), 안내 화면 '시작!' 누름이 첫 읽어 주기를 연다 | 예(C77 꼴) |
| 회12 | 1~2단계 '천천히 읽는다'(3.3 · 4절 · AC-15l)의 빠르기 숫자가 정본에 없다 | 12절에 `speech.slow_rate`(제안, 0.8, 고급 — Web Speech `rate`)를 두고 `SpeechPort.speak(text, { rate })` 선택 속성(b 값 11). 기술 상수로 두는 길도 있으나 사용 시험 뒤 고칠 숫자라 설정값 | 예(12절 행) |
| 회13 | 말해 보기 예문의 한국어 뜻이 다지기 · 보강 · 더한 단어(AC-2f)에는 없다(vocab 규격에 예문 뜻 칸 없음, 6.3 카드는 새 단어만) | 말해 보기는 카드 todayWords 가운데 exampleKo 가 있는 예문만 하고 나머지 단어는 오늘 쓸 말에서만 따라 말한다. 말해 보기 항목이 없으면 그 토막을 건너뜀 | 예(3.3 한 줄) |
| 회14 | 토리 표시(아바타 결정 전) | `ToriFigure`(제안) 경계 — 상태 넷(쉬는 중 · 말하는 중 · 듣는 중 · 생각 중)을 받는 조각 하나. 1-가는 목업 B_Talk1 의 '토' 글자 동그라미(연두 · 먹색 테) + 말하는 중 표시(움직임 줄이기 존중). VRM · 이모지 선생님은 회화 선생님 캐릭터 intent 가 spec 이 된 뒤 같은 경계에 끼움. 이름 '토리'는 상수 하나 | 아니오 |
| 회15 | 화면 검토 기준(P6c 미완) | 4절 회화 세션 · 회화 마무리 · 토리 이야기 · 단계 평가 표와 11절 목업 표 '고칠 것'이 기준, 꼴(보드 · 연두 · 글꼴)만 B_Talk1 · B_Talk5 · B_TalkEnd. P6c 회화 새 목업은 기다리지 않음(P6c 가 나중에 같은 화면을 그리면 그때 맞춤) | 아니오 |

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 '정할 것'에 올리고 컨트롤러가 13절에 한 줄 넣은 뒤 구현한다.
- 설계 숫자는 settings(12절)와 level_specs 에서 읽는다(목표 턴 · 힌트 단 · 일치율 · 초 · 횟수 · 턴 수 · 칸 수). 시험도 `TEST_SETTINGS` · 견본 규격에서. 기술 값(조각 수 · 가짜 지연 · 문장부호 목록)은 그 파일 위 대문자 상수(C72 꼴 — P7b check-ids 허용 목록). 회화 고정부의 '세 턴' 두 수는 설정에서 읽어 숫자로 넣는다(C44).
- AI 는 서버에서만 부르고 회화 서버는 `src/server/ai/index.ts` 만 가져온다(sdk-only-in-ai). temperature · top_p · top_k 를 보내지 않고 max_retries 0(P9a 그대로). 키는 서버 환경 변수에만.
- `src/core` 는 db · next · react 를 가져오지 않는다(core-no-framework). 시각은 한 시계(`@/server/clock`)에서 읽고 순수 함수에는 인자로. 질의 SQL 안에 now() 를 쓰지 않는다.
- 아이 이름 · 인식 글 · 토리 글 · 요약을 로그 · 오류 · ai_calls · 알림 값에 넣지 않는다(`safeDbError`). 녹음하지 않는다(`getUserMedia` · `MediaRecorder` 없음).
- 회화는 채점하지 않는다 — 턴에 점수 · 맞음 · 틀림 표시가 없고(R2) 회화 세션 점수는 비운다. 1~3단계 대화 토막에서 아이 차례에 영어 문장을 미리 보이지 않는다(힌트를 열기 전 · T2).
- 용어는 영역 · 단계 · 단원 · 활동 · 토막. 코드 식별자와 브랜치 이름은 영어 ASCII. 시험 이름은 앱 안 이름(모모 · 토리)만. 비밀값 · 아이 이름은 어디에도 적지 않는다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh, design-reviewer Fable · max). 동시에 셋까지. 커밋 · PR 은 요청자 지시 때만(H14).

### 묶음 plan 과 다르게 한 것

1. P13 을 a · b · c 셋으로, 한 브랜치에서 차례대로(정할 것 회1). 묶음 plan 의 '(p13a 수업 흐름 · 턴 호출 · p13b 평가 · 통과 · 이야기 등)'을 'a 턴 호출 · 수업 규칙, b 1~3단계 수업 끝까지, c 4~12 · 이야기 · 평가 · 마무리'로.
2. 회화 단원 통과 판정 · 단계 평가 시작 · 결과는 P12 로 — P13 은 회화 몫 함수와 평가 대화 화면까지(정할 것 회2).
3. 파일 묶음 이름: 묶음 plan 의 `src/app/(child)/conversation/**` 대신 세션 쪽 `/session/<id>` 를 같이 쓰고(회16) 회화 조각은 `src/components/conversation/**`, 토리 이야기만 `src/app/(child)/talk/stories/**`. 회화 턴 규격은 P9 자리 `src/core/ai/calls/talk.ts`, 흐름은 `src/server/ai/talk.ts`.
4. 시험용 시드에 회화를 넣는다(회5).

### 다른 P 에 넘길 것

- P12: 위 'P12 와 나누는 몫' 표 전부 — 특히 `onTalkSessionEnded` 이음매에 단원 통과 판정, `reachTalkTarget` 트랜잭션에 별, 마무리 첫 장의 별 · '단원 n을 통과했어요!' 자리, 회화 평가의 level_tests 행 · 두 장 차례 · 합 · 통과 · 결과(c 정할 것 회21 의 기록 꼴을 따름), 수업 목록 회화 문구 둘, 연습 고르기의 `talkTargetsOf`.
- 1-나: 'AI 쉬는 중' 상태가 회화에 닿는 곳(4절 홈 카드 꼬리표 · 수업 목록 · 목표 턴 전후 — 회4 의 1-가 길을 ai_status 로 넓힘, AC-8m), 이어진 실패 수(회화는 턴마다, C18 — P9a 분류 칸), 부모 화면 회화 대화 기록 · '토리가 기억한 것' · '이 대화 지우기'(AC-16c 부모 몫) · 오늘 영어로 말한 문장(AC-12h — sessions.english_sentences 를 P13 이 채움) · 오늘의 대화 거리(AC-12g — 회화 오늘 쓸 말), 원문 삭제 Cron(talk_turns 원문 · 되풀이 · 설명 · talk_summaries, AC-N4), '이 문제 이상해요'(마무리 첫 장 자리), `recordDeviceAlert` 를 알림 공용 모듈로.
- P8: 회화 카드 본 생성(6.3 (4-나))은 c 차례 11 게이트 뒤. 시드 브리프: 1~3단계 카드 질문은 앱이 붙여 읽으므로 반응과 이어지는 짧은 질문, 안전한 대사 · 칭찬 대사 여럿(턴마다 돌려 씀), 정리 대사는 오늘 쓸 말 수만큼(되짚을 말이 모자랄 때 채움), 오늘 쓸 말 예문 뜻(exampleKo)은 1~3단계 카드 필수(회13).
- 회화 선생님 캐릭터(intent 2026-10-17): `ToriFigure` 경계 · `TORI_NAME` 상수 자리(회14).

### 확인한 사실과 출처(2026-10-22)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | SDK 0.135.0 `BetaMessageStream`: `text` 이벤트는 (조각, 그 text 블록의 지금까지 글)이고, `fallback` 블록이 시작되면 스냅숏 모델이 `to.model` 로 바뀌고 다음 text 블록이 새로 시작된다(블록마다 스냅숏이 새로). usage.iterations 는 `message_delta` 에서 채워진다. `finalMessage()` · `abort()` 가 있다 | 워크트리 p11 `node_modules/@anthropic-ai/sdk/package.json` · `lib/BetaMessageStream.d.ts` 6~20 · `lib/BetaMessageStream.js` 412~426 · 540~580 |
| 2 | P9a 가 스트리밍 자리를 정해 둠: `sendStreamingAttempt(client, { body, betas, timeoutMs }, clock, onText)` · `stream()` 의 text · 첫 text 까지가 첫 바이트 전 · `finalMessage()` · fallback 경계 이어 붙이기 · 가짜 SSE 는 1-나(이제 P13)가 값 9 에 더함 | `intent/…/plan-p09a-AI-호출-바탕.md` 156줄 · `src/server/ai/client.ts` 머리 주석 · `run.ts` 머리 주석 |
| 3 | AI 층: `AI_PURPOSES`(talk_turn · talk_closing) · `REALTIME_PURPOSES`(talk_turn) · `settingKeysOf` 가 회화 · 끝맺음을 `talk_turn.<구간>` 키로, 끝맺음 최대 출력 · 타임아웃을 talk_closing · feedback 으로 · `requestConfigOf`(caps 로 fallbacks · 베타) · `buildAiRequest`(multiTurn 이면 `cache_control` 자동) · 공개 함수 넷뿐(회화 턴 없음) | `src/core/ai/combo.ts` · `src/core/ai/request.ts` · `src/server/ai/index.ts` |
| 4 | ai_calls 에 first_sentence_ms 칸, `insertAiCall` 이 받음. `dailyUsage` · `preCallGate` · `talkSafetyOf`(talk.safety_max_turns · safety_alert_count) · `AI_ALERT_KINDS`(talk_safety_cap) | `src/server/ai/store.ts` · `src/core/ai/cost-alert.ts` |
| 5 | 가림: `maskerFor`(run.ts 안, 내보내지 않음) · `createMasker` · `nameVariantsOf` · `fillName` · `fillNameDeep` · 연락처 정규식 | `src/server/ai/run.ts` · `src/core/ai/mask.ts` |
| 6 | 출력 검사 `checkOutputFields`(금지어 · 연락처 · 영어 칸 길이) · 공통 규칙 `COMMON_FIXED_RULES` 는 해요체 지시를 담음 · `answerTextOf` 는 마지막 fallback 뒤 text 만(비스트리밍 꼴) | `src/core/ai/output-check.ts` · `src/core/ai/calls/common.ts` |
| 7 | DB 회화 열: sessions.talk_segment(열거 greeting · today_words · practice · talk · more_talk · wrap_up — C60) · english_sentences · talk_turns 스물여섯 칸(stuck_phrase 는 글, heard_help 는 열거 하나, client_attempt_id 유일(NULL 제외)) · talk_summaries · vocab_progress.said_days · profile_tracks.friendship · tori_stories_opened · profiles.notices_seen · lessons kind tori_story | `src/db/schema/content.ts` · `src/db/schema/learning.ts` |
| 8 | 시드 규격: `TalkCardSchema`(greeting questions | firstLine · todayWords(exampleKo 선택) · firstQuestion · closingLines · safeLines · farewell · safetyFarewell · praiseLines · turns · moreTalk · questions · missions) · `TurnCardSchema`(targets · ask · hintKo · hintEn · frameEn · answerExample · twoAnswers · imageKey) · `QuestionCardSchema`(hintTiers · usablePhrases) · `TalkTestSheetSchema` · `AllowedAnswerSchema`(slotPos) · `StorySchema` · level_specs 회화 칸(segments · targetTurns · hintTiers · cardShape · twoAnswers · frameInTurns · turnImages · koMeaning · moreTalk · usablePhrases · missions). 실시드 회화 12행이 3.3 단계표와 같음. 카드에 'Oops' 대사 칸이 없다 | `src/core/seed/schema/{talk,assessment,reference}.ts` · `seed/level-specs.json` |
| 9 | 견본 빌더 `talkCard(ref, place)` 는 아무 단계나 만든다(`talkLesson` 형은 1 · 3 · 4 · 5) · `talkUnitCards` · `talkLevelTest` · `storyFile` · 작은 틀 설정 talk.more_talk_turns 2 · level.test_items_per_session 5 · level.test_forms 1 | `tests/fixtures/seed/builders.ts` 1933~2200 · 246~265 |
| 10 | `devSeedTree` 의 `DEV_SEED_AREAS` 가 회화를 뺌(C68 (1) 주석) · dev-db 가 그 영역만 적재 · loadableSeed 는 네 영역 | `tests/fixtures/seed/dev-tree.ts` · `scripts/dev-db.ts` 489~518 · `tests/fixtures/seed/loadable.ts` |
| 11 | 시험용 설정에 회화 키는 talk.placement_cap · safety_max_turns · safety_alert_count · ai.*.talk_turn.* 뿐. 실시드 settings.json 에는 12절 회화 키가 모두 있고 값이 같다(talk.next_time_lines 는 단계 열쇠 객체) | `tests/fixtures/settings.ts` · `seed/settings.json` |
| 12 | 앱이 회화를 뺀 자리: `/talk` C50 쪽 · `[area]/lessons` 의 talk redirect · `readLessonList` · `startLessonSession` · `loadSessionView` · `result.ts` 의 영역 형 · 홈 카드 `TALK_PATH`. 회화 트랙 · 단원 회차는 첫 실행 · 말하기 배치 끝에서 생기고 단원 복사본에 talk.said_ratio · talk.known_days 가 든다 | `src/app/(child)/talk/page.tsx` · `[area]/lessons/page.tsx` · `src/server/{lesson-list,session}/index.ts` · `home-cards.tsx` · `src/core/profile/start.ts` · `src/core/placement/finish.ts` |
| 13 | 가짜 Anthropic 은 비스트리밍 응답만(message · error · network-error · hang), 규칙은 목적(규격 제목) · 모델 · bodyIncludes 로 고름. e2e 는 webServer 의 가짜 서버(C81) | `tests/fixtures/ai/fake-anthropic.ts` · `tests/e2e/fake-ai-server.ts` · `fake-ai.ts` · `playwright.config.ts` |
| 14 | 음성: `SpeechPort.speak(text)` 에 빠르기 없음 · `endRuleFor` 는 speaking · placement 만('회화 키는 1-나가 더한다' 주석) · `EndRule` 꼴 · 듣기 손잡이 `useListen` 은 speaking.tsx 안 지역 함수 · `SpeakButton`(gapClassName · listeningLabel) 공용 | `src/lib/speech/types.ts` · `src/core/speech/listen.ts` · `src/components/session/speaking.tsx` · `src/components/answer/speak-button.tsx` |
| 15 | 판정 · 일치율: `resultPhraseOf` · `RESULT_PHRASES` · `speakingCounters`(실패 · 마이크 · 말소리 없음 셈) · `speechEventOf` · `bestMatchRate`(nameSlot any-word · excluded) · `normalizeForMatch` · `lemmaLookup`(vocab forms) · 틀 자리(___) 판정 없음 | `src/core/speaking/judge.ts` · `src/core/speech/match-rate.ts` · `src/core/session/attempt.ts` |
| 16 | 시드 목록 넷 `loadSeedList`(forbidden · homophones · forms · metaSentences — 메타 문장 열셋) · 문장 자르기 `splitSentences`(약어 · 숫자 점 · 닫는 따옴표) | `src/server/seed-lists.ts` · `seed/lists/meta-sentences.json` · `src/core/seed/text.ts` · `structure.ts` |
| 17 | 접근: `requireAccess`(unauthorized 401) · `isSameOrigin` · 10절 '모든 서버 액션 · Route Handler(회화 스트리밍 포함)는 첫 줄에서' · Route Handler 는 지금 접근 코드 제출 하나 | `src/server/access/guard.ts` · `specs/08-테스트와-기술.md` 35줄 |
| 18 | 기기 · 마이크: `recordDeviceAlert` · `reportSessionMic` · `micUsable` · `MIC_NOTICE_KEY` · `createBrowserSpeech` | `src/server/alerts/device.ts` · `src/server/actions/session.ts` · `src/lib/mic-state.ts` · `src/lib/speech/browser.ts` |
| 19 | P6c 목업 맞추기는 승인됐으나 회화 새 목업 파일이 없고 B_Talk1 은 옛 꼴('천천히 다시 듣기' · 답 글 보임). P6b 그림 카탈로그 207장에 다람쥐 그림 없음 · 바탕에 미합침 | `docs/media/mockups/` 목록 · B_Talk1 글 · 워크트리 p06b `public/images/vocab` |
| 20 | 회화 선생님 캐릭터 intent 는 draft(요청자 되읽기 대기, 미결 '토리 처리') · teacher-avatar 시제품은 미나 · 리오 VRM(본 앱 미연결) | `intent/2026-10-17-회화-선생님-캐릭터/intent.md` · `prototypes/teacher-avatar/README.md` |
| 21 | H4(개발용 Anthropic 키를 프리뷰에) 아직 — 'H4 뒤' 행들이 열려 있음 | `.superpowers/sdd/…/ledger-open.md` 배포 행 (다) · progress |
| 22 | P11b 차례 6 · 7 이 고칠 파일(겹침 표의 근거) · P11c 가 고칠 파일(judge · attempt · speaking · session-frame · session/index) | `plan-p11b-쓰기-AI-첨삭.md` · `plan-p11c-말하기-AI-평가.md` 바뀌는 파일 표 |
| 23 | 이미 이름 붙은 회화 AC 시험은 AC-15m 검증기 사례 아홉뿐(P4) | `git grep '"AC-15m'` 워크트리 p11 `tests/unit` |

(추측): 구조화 출력이 규격의 속성 차례대로 흐른다(위험 3), 스트림 중 대체 모델이 이어 쓴다(위험 4), 생각 끔 + 구조화 출력 + 스트리밍이 400 이 아니다(위험 2), SDK stream timeout 의 범위(위험 1), 시험용 시드의 1단계 회화 카드가 작은 틀로 검증 · 적재를 지난다(공용 변경 2 — 적용 때 `pnpm db:dev --reset` 결과로 확인).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-15b(흐름 몫) | 단위 "AC-15b 흘려 받은 tori_en 에서 금지어 · 개인 정보를 묻는 문장 · 메타 문장은 카드의 안전한 대사로 바뀌고 1~3단계 반응의 물음표 문장은 지워진다" + 통합 "AC-15b 회화 턴을 흘려 보내는 가짜 클라이언트에서 검사에 걸린 문장은 내보낸 조각에 없다" · "AC-15b 한국어 뜻은 영어가 다 흐른 뒤 한 번에 나오고 뜻에 걸린 문장이 있으면 뜻 전체가 비어 있다" · "AC-15b 힌트가 Zod 검증에 실패하면 다시 요청하지 않고 힌트가 빈 채 돌아온다" · "AC-15b 첫 문장 뒤 스트림이 끊기면 보낸 문장을 두고 그 턴이 닫힌다" · "AC-15b fallback 블록이 끼인 표본에서 토리의 말은 한 번만 내보내진다" · "AC-15b Haiku 5.5 거절 표본에서 Sonnet 5.5 로 한 번 다시 부르고 그것도 거절이면 거절로 돌아온다" · "AC-15b 첫 문장 뒤 거절이면 Sonnet 재시도 없이 그 턴이 닫힌다" | `tests/unit/conversation-stream.test.ts` · `tests/integration/conversation-call.test.ts` |
| AC-15k(요청 꼴) | 단위 "AC-15k 둘째 턴부터의 사용자 메시지에는 단원 단어 목록과 친한 정도가 값이 바뀐 턴에만 들고 다시 쓸 토리 차례에는 tori_ko 와 영어 이름이 없다" + 통합 "AC-15k 둘째 턴 요청 본문은 앞 턴 요청의 메시지를 글자 그대로 앞에 두고 대화 도중 모델 · effort · 생각 단계가 바뀌지 않으며 Haiku 5.5 거절 뒤 Sonnet 5.5 로 다시 부른 턴만 예외다" | `tests/unit/conversation-call.test.ts` · `tests/integration/conversation-call.test.ts` |
| AC-8f(가짜 클라이언트) | 통합 "AC-8f 회화 턴 요청은 1~3단계에서 claude-haiku-5-5 · effort low · thinking disabled 이고 fallbacks 가 없다" · "AC-8f 4단계부터 회화 턴 요청은 claude-sonnet-5-5 · effort low · thinking between_tools 이고 서버 측 대체 모델 재시도를 켠다" · "AC-8f 대체 모델이 답한 회화 턴의 ai_calls 비용은 usage.iterations 항목별 단가로 계산된다". 수동 몫은 c | `tests/integration/conversation-call.test.ts` |
| AC-8i(회화 요청) | 통합 "AC-8i 4~6 구간 회화 모델을 claude-haiku-5-5 로 바꾸면 그 구간 회화 턴 요청은 thinking disabled 이고 fallbacks 가 없다" · "AC-8i 1-3 구간 effort 를 medium 으로 바꿔도 4-6 구간 회화 턴 요청은 low 다" | `conversation-call.test.ts`(통합) |
| AC-8c(끝맺음 요청) | 통합 "AC-8c 끝맺음 턴 요청의 max_tokens 는 ai.max_tokens.talk_closing 이고 ai.timeout_seconds.feedback 으로 기다리며 ai_calls 에 talk_closing 행이 프롬프트 · 응답 본문 없이 남는다" | `conversation-call.test.ts`(통합) |
| AC-15c(단위) | 단위 "AC-15c 회화 턴 응답 규격에 판정 칸이 없고 회화 턴 사용자 메시지에 이 턴의 힌트 종류와 아직 '안다'가 아닌 단원 단어가 든다" · "AC-15c 단원 단어 30개 가운데 '말함' '안다'가 24개면 회화 단원 통과의 단어 조건을 채우고 23개면 채우지 못한다" · "AC-15c S-3 단어 수는 힌트 종류가 '영어'인 턴을 빼고 센다" | `tests/unit/conversation-call.test.ts` · `conversation-said.test.ts` |
| AC-15d(정규화) | 단위 "AC-15d 정규화 함수는 5단계 다음엔 이렇게 3개 응답에서 1개만 남기고 10단계는 2개를 남기며 4단계는 잘한 말과 다음엔 이렇게를 비운다" | `conversation-call.test.ts` |
| AC-9d | 단위 "AC-9d '말했다'는 AI 가 돌려준 단원 단어 가운데 힌트 종류가 '뜻만' · '없음'이고 인식 글에 원형으로 든 것만 센다" · "AC-9d 같은 학습일에 두 번 말한 단어는 '안다'가 아니고 서로 다른 학습일에 두 번이면 '안다'다" · "AC-9d 인식 글 'I went to the park' 에서 AI 가 돌려준 go 는 센다" · "AC-9d 'two dogs' 가 'to dogs' 로 인식되어도 two 로 센다" · "AC-9d 답 두 개나 답 예시를 들은 턴과 오늘 쓸 말 · 다시 하기 · 중단된 대화의 턴 처리: 앞의 둘은 세지 않고 뒤의 둘은 센다" | `tests/unit/conversation-said.test.ts` |
| AC-16a | 단위 "AC-16a 새 대화를 목표 턴까지 하면 친한 정도가 1칸 오르고 10칸이 차면 지금 구간의 다음 토리 이야기가 열린 뒤 0칸으로 돌아간다" · "AC-16a 구간 이야기 20장을 다 열면 칸이 10에서 멈추고 다음 구간에 들어가면 그 구간 첫 이야기부터 연다" · "AC-16a 칸이 7일 때 구간이 바뀌면 7이 그대로 남고 다시 하기로는 오르지 않는다" | `conversation-said.test.ts` |
| AC-16b(요청) | 단위 "AC-16b 영어 이름이 Minjun 일 때 이름 묻기 턴의 인식 결과 'my name is min jun' 은 'my name is {NAME}' 이 된다" + 통합 "AC-16b 회화 턴 요청 본문에 지난 대화 요약이 최근 talk.memory_summaries 개 들어가고 요청 본문에는 전화번호 · 주소 형태와 프로필 이름이 없다" | `tests/unit/conversation-listen.test.ts` · `conversation-call.test.ts`(통합) |
| AC-N4(회화) | 통합 "AC-N4 회화 입력의 전화번호 형태가 회화 턴 요청 본문과 끝맺음 턴 요약에서 가려진다" | `conversation-call.test.ts`(통합) |
| AC-2f(회화) | 단위 "AC-2f 1단계 회화에서 건너뛴 배정 수업의 새 단어는 오늘 쓸 말에 더해지고 그 단어를 묻는 턴은 처음 묻는 턴이라 답 두 개를 들려준다" | `tests/unit/conversation-flow.test.ts` |
| AC-15m(단위) | 단위 "AC-15m 카드가 다시 묻는 턴으로 적은 턴이라도 아이가 그 단어를 앞 회화 세션에서 만나지 않았고 이 대화에서도 묻지 않았으면 처음 묻는 턴이다" · "AC-15m 카드가 처음 묻는 턴으로 적은 단어를 앞 세션에서 만났으면 다시 묻는 턴이라 1단계에서도 답 두 개를 들려주지 않는다" | `conversation-flow.test.ts` |
| AC-15h(단위) | 단위 "AC-15h 6단계 다시 묻는 턴의 힌트는 한국어 뜻 단부터, 처음 묻는 턴은 AI 출력과 관계없이 영어 틀부터 열린다" · "AC-15h 10단계 다시 묻는 턴에는 힌트 단이 없고 8단계 다시 묻는 턴은 한국어 뜻 다음 영어 틀이다" · "AC-15h 영어 문장 단을 연 턴과 답 예시를 들은 턴은 힌트 종류가 '영어'다" | `conversation-flow.test.ts` |
| AC-5e(회화 단위) | 단위 "AC-5e 회화 4단계 한 문장 답은 speech.end_silence_seconds.talk.4-6 조용하면 끝나는 규칙이다" · "AC-5e 회화 8단계 대화 답은 speech.end_silence_seconds.talk_long 조용함 · 말하기 버튼 · talk.max_answer_seconds 로 끝나고 8단계 평가 대화 답은 speech.end_silence_seconds.talk.7-9 로 끝난다" | `tests/unit/conversation-listen.test.ts` |
| AC-15n(단위) | 단위 "AC-15n 정리 토막의 되짚을 말은 토리가 되풀이한 바른 문장 가운데 오늘 쓸 말이 든 것과 카드 정리 대사로 오늘 쓸 말 단어 수까지이고 보일 단어가 없는 수업은 카드 정리 대사다" · "AC-15n 오늘 쓸 말 · 말해 보기 · 정리의 따라 말하기는 '말했다'에 들지 않는다" | `conversation-flow.test.ts` · `conversation-said.test.ts` |
| 흐름 · 턴(AC 접두 없음) | 단위 "회화 흐름: 1~3단계 카드 질문이 넘어간 질문으로 모자라면 넘어간 질문을 답 예시와 함께 한 번 더 묻고 그다음 '더 이야기할 거리', 그다음 AI 차례다" · "회화 흐름: 같은 질문의 '모름' 둘째부터 힌트가 마지막 단까지 열리고 talk.dontknow_max 번째에 다음 질문으로 간다" · "회화 흐름: '모름' 턴과 막힘으로 볼 말 턴은 말 주고받기 수에 들지 않는다" · "회화 흐름: 목표 턴에 닿은 턴에는 카드 질문 대신 'Do you want to talk more?'를 붙이고 '더 이야기하기' 한 번은 talk.more_talk_round_turns 턴이다" · "회화 흐름: 4단계부터 대신 질문은 아직 쓰지 않은 가장 앞 카드 질문이다" · "회화 흐름: 1~3단계 AI 질문이 물음표 · 뜻 힌트 · 어휘 범위 검사에 걸리면 걸린 것으로 돌려준다" · "영어로 말한 문장 수(회화): 인식 글이 있는 '말' 턴과 따라 말하기마다 하나이고 '모름' 턴은 세지 않는다" · "회화 듣기: 1~3단계 인식 글이 연 영어 문장 힌트나 들려준 답과 talk.hint_read_match 이상 맞으면 확인 없이 보내고 {NAME} 자리는 빼고 견준다" · "회화 흘려 받기: 조각 경계에 걸친 이스케이프와 약어 · 숫자 점은 문장을 끊지 않는다" + 통합 "회화 턴: 첫 문장 전 연결 오류는 같은 입력으로 한 번 다시 부른다" · "회화 턴: 하루 안전 상한에 닿으면 부르지 않고 safety_cap 행을 남긴다" · "회화 턴: ai_calls 에 첫 문장 시간이 서버가 요청을 받은 때부터 남는다" · "회화 턴: 설정 문제면 부르지 않고 config 로 돌아온다" | `conversation-flow.test.ts` · `conversation-said.test.ts` · `conversation-listen.test.ts` · `conversation-stream.test.ts` · `conversation-call.test.ts`(통합) |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int`(CI) · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm check:bundle` · `pnpm check:ids` 초록, 비밀값 grep 0건 | 차례 1~3 |

시험 이름은 글자 그대로 적는다(spec-trace 가 이름 맨 앞 AC 토큰을 센다). 시험 안의 숫자는 시험용 설정 · 견본에서 읽는다.

## 완료 보고 (Done)

구현 뒤 채운다.
