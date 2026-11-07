# 구현 브리프: P13b 차례 4 — 회화 세션 서버 · 턴 길 · 끝맺음 · 안전 상한(implementer impl-p13 이어 보기 · Opus · high, 2026-10-22 17:4x — 차례 2 검토 a2 fix 뒤, 컨트롤러 합침 ① 뒤 보냄)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p13b-회화-수업-1-3단계.md` **작업 2(차례 4)** 가 요구사항 전부다 — '파일별 값' · 정할 것 회16~회18 · a 의 '회화 수업 모델(값 0)' · 13절 C89 · C90 · C92 · C95 · C100. 앞에 컨트롤러가 **합침 ①**(P11 가지 차례 6 · 7 커밋을 p13 에 합치고 `src/server/session/index.ts` · `src/server/lesson-list/index.ts` 겹침을 손으로 맞춤)을 끝낸 뒤 보낸다 — 합친 상태에서 단위 · tsc 초록을 확인하고 시작한다. 워크트리 p13. 통합은 CI. 시험 먼저. 커밋은 하지 않는다.

## 범위(plan-p13b 작업 2)
`tests/integration/{conversation-session,conversation-turn}.test.ts`(a2 의 가짜 SSE 견본으로) → `src/server/conversation/{index,turn,closing}.ts`(회화 세션 시작 · 처음 스냅숏 시도(C89) · 턴 길: 아이 말 저장 → 회화 턴 호출(차례 2 `talkTurn`) → 흘려 보내기 → 토리 행 저장 · 네 칸(cardQuestionNo · moreTalkFallback · aiQuestion · moreChosen — 보고 '요청 2' 유도 규칙) · 끝맺음(`talkClosing`, 시도 행 activity_no 0) · 안전 상한(C90: 상한 날 새 회화 시작 안 함 · 도중 안내 + '홈' · 목표 턴 뒤 8절 '목표 턴 뒤의 회화' · 끝맺음은 풀린 첫 홈 진입) · 5절 전이 · 3.3 '대화가 멈추는 경우' 표(세션 상태 표)) · `src/server/actions/conversation.ts`(첫 문장 `requireAccess()`) · `src/app/api/talk/turn/route.ts`(C92 NDJSON · 같은 출처 · 첫 문장 `requireAccess()`) · `src/server/session/index.ts`(`startUnsafe` 가 회화 수업을 받음 · `readSessionPlace` 회화 완료 세션을 회화 틀로 — b 값 6, 몇 줄) · `src/server/lesson-list/index.ts`(영역 형에서 talk 제외 뺌 — 몇 줄). 단위 `access-gate.test.ts`(첫 문장 확인) 초록.

## 지킬 것
CLAUDE.md 규칙 전부(AI 서버에서만 · Zod · 설정값 · 녹음 없음 · 회화 채점 없음 · 1~3단계 영어 문장 안 보임은 화면 몫이지만 서버 자료에도 글을 내려 주지 않게). P11 겹침 파일의 회화 몫 변경은 작게(plan-p13a '바탕 가지와 겹치는 파일' 표). 정본과 어긋나면 '정할 것'. 설계 숫자는 talk.* · ai.* 설정 키.

## 완료 · 보고
로컬 관문 뒤 보고 `task-p13-report.md` '차례 4' 절(바뀐 파일 · 시험 이름 · 다르게 한 것 · 정할 것 · b 에 넘긴 값 넷의 유도 규칙 구현 여부) · SendMessage 한 줄 → 컨트롤러 CI → 검토 묶음 b1(code-reviewer — 5절 전이 · 8절 · 3.3 멈추는 경우 표 · 회화 수업 모델 5 대조) → fix → 차례 5 브리프(회화 틀 · 토리 표시 · 말풍선 · 아이 차례 · 1단계 인사 · 대화, 화면 검토 포함).

## 덧(18:2x) — 마이그레이션 하나
이번 차례에 P13 의 유일한 마이그레이션을 더한다: `talk_turns.ai_question jsonb`(비울 수 있음, **C101** — 토리 행이 붙인 AI 질문의 영어 · 뜻 · 답 예시 · 힌트 단)와 `profile_tracks` 의 구간 → 연 토리 이야기 수 jsonb 열(**C98**)을 한 마이그레이션으로. 5절 표 문구는 컨트롤러가 정본에 반영한다(스키마 `src/db/schema/learning.ts` · drizzle 마이그레이션 · `pnpm db:migrate` 는 CI). 콜백 계약(a2 M1): 턴 길의 `onSentence` 는 던지지 않고 응답을 끝까지 받는다.
- 이어 하기(회11 (9) 보완, C101): 그 턴의 `ai_question` 이 저장돼 있으면 그 질문을 다시 낸다 — '가장 오래전 더 이야기할 거리'는 저장이 없을 때만. 콜백 계약 위반 시 '연결 실패'로 셈이 어긋나니(a2 재검토 메모) b 턴 길은 `onSentence` 안에서 던지지 않게 감싼다.


## 덧(2026-10-22 19:2x, 컨트롤러) — 합침 ① 끝, 시작해도 됨
- 워크트리 p13 HEAD 는 **합침 ① 커밋**(P11 가지 cce2238 = 쓰기 차례 6 · 7 + fix 6~8b 를 9497b85 위에 merge). 텍스트 충돌 0, P13 차례 1~3 은 `src/server/session/index.ts` · `src/server/lesson-list/index.ts` 를 고치지 않았으므로 손 맞춤은 없었다 — 이번 차례가 그 두 파일을 처음 건드린다(회화 몫만 몇 줄, plan-p13a '바탕 가지와 겹치는 파일' 표).
- 합친 상태 확인(Node 24 · pnpm 10.34.7): `tsc --noEmit` 0 · `biome ci` 0 · 단위 **612 통과 | 6 todo**(60 파일) · `check:deps` 0(177 모듈).
- **도구 자리**: 이 맥에서 `pnpm` 은 nvm 의 Node 24 에만 있다. 셸 기본 node 가 26 이면 biome · vitest 의 네이티브 바인딩이 실패하므로 먼저 `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"` 를 한 뒤 `pnpm …` 을 쓴다(프로젝트 `.nvmrc` 24 · engines 24.x).
- P11 쪽에서 들어온 것 가운데 이번 차례와 닿는 자리: `src/server/session/index.ts` 의 `startUnsafe` · `judgeLessonStart` 길(쓰기 둘째 세션 `writing_part: "rewrite"` · feedback_pending 갈래가 새로 있음 — 회화 세션 시작 갈래를 더할 때 그 판정 뒤에 둠), `src/server/lesson-list/index.ts` 의 `writingDraftsOf` · 영역 형(talk 제외 뺌). 홈 `src/app/(child)/page.tsx` 는 `after(() => retryPendingFeedback)` 가 있으니 회화 몫을 더하더라도 그 길을 깨지 않게.
- 보고는 `task-p13-report.md` 에 '차례 4' 절로 이어 쓴다(차례 1~3 절 그대로 둠). 커밋은 하지 않는다. 끝나면 SendMessage 한 줄.
