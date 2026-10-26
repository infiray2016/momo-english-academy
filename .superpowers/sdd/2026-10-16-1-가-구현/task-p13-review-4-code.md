# 검토 브리프: P13b 차례 4 코드 검토 b1 — 회화 세션 서버 · 턴 길 · 끝맺음 · 안전 상한 · NDJSON 라우트 · 마이그레이션 0003(code-reviewer rev-p13b · Opus · xhigh, 2026-10-22 20:2x)

코드: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13` 작업 트리(HEAD 6d1f929 = 합침 ① 뒤, 커밋 전 — `git status` · `git diff` 와 새 파일을 직접 읽는다. CI 가지 `ci/p13-c1` 8cd0cd2 가 같은 내용). 구현 보고 `task-p13-report.md` '차례 4' 절(바뀐 파일 표 · 넘긴 값 넷 유도 규칙 · 다르게 한 것 1~13 · 정할 것 1~7 · 남은 우려 · 관문). 브리프 `task-p13-4.md`(+ 덧 18:2x · 19:2x).

대조 자료: plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p13b-회화-수업-1-3단계.md` 작업 2 · '파일별 값' 1~6 · 정할 것 회16~회18, `plan-p13a-회화-턴-호출과-수업-규칙.md` '회화 수업 모델' 4 · 5(세션 상태 표) · '바탕 가지와 겹치는 파일' 표, 정본 `specs/04-데이터.md`(5절 talk_turns · attempts · profile_tracks · 전이) · `specs/05-AI.md`(6.2 회화 턴 호출 · 6.1 모델) · `specs/07-음성과-오류.md` · `specs/02-2-세션과-단계표.md`(3.3 '대화가 멈추는 경우' 표) · `specs/06-...`(8절 실패 길 — 파일은 `specs/README.md` 지도로) · 13절 `specs/10-결정-기록.md` C89 · C90 · C92 · C95 · C98 · C100 · C101. CLAUDE.md 규칙: AI 호출은 서버 코드만 · 키 서버만 · 응답 Zod · 설계 숫자는 talk.* · ai.* 설정 키 · 녹음 없음 · 회화 채점 없음 · 모든 액션 · 라우트 첫 문장 `requireAccess()` · 1~3단계 영어 문장을 서버 자료로 내려 주지 않음.

볼 것(지적마다 심각도 Critical · Important · Minor 와 근거 — 파일:줄 · 정본 절 · plan 값 번호. 근거 없는 지적은 넣지 않는다):
1. 세션 상태 표(회화 수업 모델 5 · 3.3 멈추는 경우 표) 행마다 코드 자리 — 처음 열기 · 따라 말하기 · 토막 넘김 · 더 이야기하기 · 그만하기 · 홈 · 끝맺음 · 홈 진입 정리 (가)(나)(다). 5절 전이(세션 · attempts activity_no 0 끝맺음 · talk_turns · vocab_progress '말함' · profile_tracks.tori_stories_by_band).
2. 안전 상한 C90: 상한 날 새 회화 시작 안 함 · 도중 안내 + '홈' · 목표 턴 뒤 8절 '목표 턴 뒤의 회화' · 끝맺음은 풀린 첫 홈 진입. 다르게 한 것 7(셈 자리) · 8(목표 턴 전 상한 → aborted).
3. 턴 길: 아이 말 저장(보내기 전) → 회화 턴 호출(차례 2 `talkTurn` · `streamTalk`) → 흘려 보내기 → 토리 행 저장 · 네 칸 유도(보고 표) · `onSentence` 던지지 않음(a2 M1) · 8절 실패 길(첫 문장 전 · 뒤 · 거절 · 끊김 · 설정 문제) · 다시 쓸 토리 차례 · 사용자 메시지 전문 저장 · 대화 끝나면 지움(C? 5절).
4. NDJSON 라우트 C92: 첫 문장 `requireAccess()` · 같은 출처 아니면 403 · 413 · `no-store` · 스트림 쓰기 실패 삼킴 · `maxDuration = 60`(기술 값, check:ids 보고만 — 컨트롤러 받아들임).
5. 1~3단계 영어가 서버 자료 어디에도 안 내려가는지 — `pendingViewOf` · `hintViewsOf` · 새 액션 `revealTalkHint`(접근 확인 · 연 단만 · 아이가 열지 않은 단은 안 내려감). 읽어 주기용 `add` 줄에 든 영어(답 두 개 · 답 예시 + 질문)가 화면에 글로 보일 길이 없는지는 차례 5 화면 몫이지만 자료 꼴(`answers` 칸)이 그 경계를 지키는지 본다.
6. 마이그레이션 0003 · 스키마(C98 · C101) · drizzle 스냅숏 · `_journal` — 되돌림 가능 · 비울 수 있음.
7. 겹침 파일 `src/server/session/index.ts`(+26 −13) · `lesson-list/index.ts` — 쓰기 둘째 세션 · feedback_pending · 되살림 · 홈 `after(retryPendingFeedback)` 길이 그대로인지(P11 cce2238 기준).
8. 다르게 한 것 1~13 의 타당성 — 특히 5(4단계 거절 턴 카드 질문, 컨트롤러 C104 받아들임) · 6(AI 질문 어휘 검사를 그 단계 이하 vocab 전체 활용형으로 — 1단계 어휘 범위 · C99 와 어긋나지 않는지, `seed/lists/forms.json` 읽기 실패 때 AI 질문 안 쓰는 길) · 9(끝맺음 실패 셈 · `CLOSING_FAILURES_TO_GIVE_UP` 2 가 8절 고정 수인지 설정 키여야 하는지) · 10(앞 값 다시 셈) · 11(같은 시도 id 다시 흘림 · stale) · 12(이음매 두 번 안 부름).
9. 남은 우려 — 같은 기기가 같은 시도 id 를 겹쳐 보내면 AI 두 번 호출(대화는 하나): 심각도를 판정하고 가벼운 막음 길(세션 행 진행 중 시도 id 표시 · advisory lock 등)을 제안한다. 1-가 원칙 '실시간 호출은 비용으로 아이 진행을 끊지 않음'과 함께 본다.
10. 통합 32 는 로컬에서 못 돌렸다(embedded-postgres). 시험 글을 읽어 가짜 규칙 소비 차례 · 단언이 plan 증명 표(이름 32 글자 그대로)와 맞는지, 첫 CI 에서 빨강이 날 자리(보고 '남은 우려' 둘째 — 견본 카드 턴 수 · `cutAfterChars` · 1단계 AI 질문 어휘 검사 · 상한 설정 행)를 코드로 짚어 둔다. CI 결과는 컨트롤러가 덧으로 알린다 — 먼저 코드부터.
11. 시험 먼저 원칙 위반(보고 '순서')은 과정 지적으로 따로 적고 코드 판정과 섞지 않는다.

컨트롤러 결정(검토는 이 결정을 전제로 — 어긋나면 지적): 정할 것 1 · 6 받아들임(차례 5 · 화면 몫). 2 받아들임 — 1-가에서는 '안다' 아닌 단어 · 친한 정도의 대화 안 변화는 바뀐 턴 칸에 넣지 않음(C103). **3 → fix 1: `talk_turns.tori_ko`(비울 수 있음) 열을 0003 에 더하고 1~3단계 토리 반응 뜻을 저장해 이어 하기 · 같은 시도 id 다시 흘림에 뜻을 다시 낸다**(C103 — 커밋 전이라 마이그레이션 하나로). 4 받아들임(C104). 5 받아들임(C105). **7 → fix 1(Minor): 끝맺음 기록 입력 갈래를 a 시도 꼴 `TalkAttemptInputSchema` 에 더한다.** 홈 진입 정리 연결은 차례 6(plan 값 12).

열린 장부 `ledger-open.md` 의 P13 · 회화 행을 '닫힘 · 아직 열림(근거)'으로 판정한다. 보고 `.superpowers/sdd/2026-10-16-1-가-구현/review-p13-4-code.md`(판정 Approved · Changes requested 를 첫 줄에, 지적 표 · 맞는 것 표 · 장부 판정 · 과정 지적 · fix 브리프에 넣을 한 줄 요약). 끝나면 SendMessage 한 줄. 코드 · 문서는 고치지 않는다.

## 덧(21:0x) — fix 1 재검토(범위 한정)
fix 1(`task-p13-fix1.md`, 보고 'fix round 1' 절)이 작업 트리에 들어갔다(CI 가지 ci/p13-c1 c6368af = 작업 트리, **CI 6차-b** — 결과는 컨트롤러 덧. 중간 스냅숏 6차-a 는 M-1 시험만 빨강이었고 I-1 · I-2 시험은 그때 이미 고침이 들어 초록 — '빨강 먼저'는 M-1 만 CI 로 확인). **I-1 · I-2 · I-3 와 컨트롤러 결정 둘(tori_ko 열 — 0003 을 다시 만듦 `0003_talk_ai_question_tori_ko_stories_by_band` · 끝맺음 입력 갈래)을 ADDRESSED · NOT ADDRESSED 로 판정**, M-1~M-9 는 결정대로 고쳤는지 한 줄씩(M-9 는 C107 · AC-15j status 단언). 새 지적은 fix 1 이 건드린 자리에서 생긴 것만. 특히 I-1 고침이 P11 파일 `src/server/writing/composition.ts` 라 쓰기 밀린 첨삭 길(writing-feedback 통합)을 깨지 않는지 — CI 6차-b 의 writing-feedback 결과와 함께. 보고 `review-p13-fix1-code.md`, SendMessage 한 줄.
