**판정: Approved(가벼운 루프 · 범위 한정 · high) — Critical 0 · Important 0 · Minor 2. CI 14차(74b13dd) 통합 초록, e2e 는 이 보고를 쓸 때 돌고 있었다(⚠️).**

# 가벼운 검토: 개발용 시드 회화 — 시험용 나무의 회화 1단계 적재(rev-p13b · code-reviewer · high · 2026-10-23 01:xx)

대상: CI 가지 `ci/p13-c1` **74b13dd**. 변경은 `git diff 220a51c 74b13dd`(5 파일 — 시험 바탕 · 시험만)로 읽었다.
근거: 브리프 `task-p13-review-6-code.md` 끝 '덧(01:1x)', 구현 보고 `task-p13-report.md` '개발용 시드 회화' 절, 13절 C68 (1) · (2) · (5) · C70 · C75 · **C91**(`specs/10-결정-기록.md:241`).

## CI 14차(run 39811559402)

unit · build · lint · depcruise · spec-trace · seed-validate · bundle-secrets · e2e-local · check-ids · **integration 초록** — conversation-session 25 · conversation-turn 11(회화 통합 36 — 차례 4 의 32 + 그 뒤 더한 넷이 모두 돎) · lesson-list 8(새 회화 목록 시험 포함) · dev-seed 1. 통합 225 통과. e2e 는 돌고 있었다.

## 볼 것별 판정

| 볼 것 | 판정 | 근거 |
|---|---|---|
| (1) 시험용 시드 규칙 | ✅ | 적재하는 것은 이미 나무에 있던 견본(작은 틀 · 1단계 — 단원 1~5 대화 1 · 2 · 3 · 보강 1 · 회화 평가 장 · 토리 이야기 1~3 구간)이고 빌더는 고치지 않았다. 견본은 무작위가 없고 아이 이름은 `{NAME}` 틀, 연락처 꼴이 없다(P4a 제약 — `dev-tree.ts` 머리 주석). Supabase 개발용에 넣는 것은 C75(프리뷰 기간 개발용 허용 · 운영 금지 그대로)와 **C91**('devSeedTree 적재 영역에 회화를 더해 1단계 카드 · 1단계 평가 카드 · 1~3 구간 토리 이야기가 로컬 · e2e · Supabase 개발용에 들어간다')대로다. 그림 키는 있고 파일이 없어 화면은 깨진 그림 길(차례 5 fix 2 `TurnPicture`)로 그리지 않는다 — C70 '그림 없음' 한계 그대로 |
| (2) 토리 이야기 견본도 적재 | ✅(새 결정 아님) | **C91 이 이미 '1~3 구간 토리 이야기'를 넣는다고 정했다.** 브리프의 '토리 이야기는 넣지 않는다'가 C91 과 어긋났던 것이고, 구현이 C91 과 맞다. 적재기의 완전성 검사가 회화 영역의 이야기 칸을 빈 칸으로 막는다는 구현자 확인(이야기 뺀 나무 빈 칸 5)도 같은 결론을 받친다. 이야기 행은 lessons 의 `tori_story`(단원 비움)라 수업 목록에 나오지 않고(목록은 단원으로 고름), 1-가에는 이야기 화면이 없다. 지울 길은 아래 (5) |
| (3) `talk-fixture.ts` 겹침 | ✅ | `lessons_slot_unique` 가 (영역 · 단계 · 단원 · 종류 · 수업 번호 · 변형 · 판 …)이라(`src/db/schema/content.ts:311-320`) 같은 칸 · 같은 판의 1단계 행은 `onConflictDoNothing` 으로 시드 행이 남는다. 판은 적재 뒤 표들의 가장 큰 개정이라 시드 행과 같다. 작은 틀은 `seed.topic_variants` 1(`tests/fixtures/seed/builders.ts:254`)이라 변형이 하나뿐이고, `talkLessonRow` 의 정규(배정 · 다지기) 거르개가 같은 수업 번호의 보강 1 과의 겹침을 막는다. 시험은 늘 `cardOf(talkLessonRow)` 로 그 행의 카드를 읽어 서버가 고르는 행과 같은 내용을 본다. 4단계 행은 나무에 없어 그대로 들어간다. CI 14차에서 회화 통합 36 이 모두 초록 — 흔들리지 않았다 |
| (4) e2e 영향 | ✅(⚠️ CI 14차 e2e) | 분석이 맞다. 회화 e2e 의 `insertTalkLesson` 은 같은 칸(영역 · 단계 · 단원 · 종류 · 번호)을 판 · 변형과 관계없이 지운 뒤 넣고, 집 비우기(`resetHousehold` — 프로필 cascade 로 세션이 지워짐)가 먼저라 세션의 restrict 에 걸리지 않는다. 시험이 단언하는 다음 이야기 · '여기부터 해요'는 시험이 넣은 행을 가리킨다. P10 시험 넷은 회화 수업이 없다는 가정을 하지 않고(차례 6 에서 고침), 홈 회화 카드는 단계 없는 집이라 needs_speaking 그대로다 |
| (5) 적재 명령 · 지움 SQL | ✅(Minor M-2) | 나무 꺼내기 → `seed:load … --areas talk --complete-through 1 --dry-run` → 실제 차례가 맞다. 미리 돌림으로 설정 견주기(개발용 DB 의 `seed.complete_through_level` 5)를 먼저 보는 것도 맞다 — C68 (2) 의 설정 판 규칙상 적재가 그 값을 시드 값으로 되돌릴 수 있다. 지움은 세션부터(`sessions.lesson_id` restrict, `src/db/schema/learning.ts:124-125`) → attempts · talk_turns · talk_summaries 는 세션 cascade(`:154-157`), ai_calls · parent_alerts 의 세션 칸은 set null(`operations.ts`) → lessons → level_test_items 차례로 restrict 에 걸리지 않는다. 남는 자리는 M-2 |

## 지적

| 번호 | 심각도 | 무엇 | 왜(근거) | 어떻게 |
|---|---|---|---|---|
| M-1 | Minor | `dev-tree.ts` 머리 · `DEV_SEED_AREAS` 주석이 근거를 'C68 (1) 을 넘어선 판'으로 적었다 | 이 넓힘을 정한 결정은 C91 이다(`specs/10-결정-기록.md:241`). 근거 없는 '넘어선 판'은 결정 기록이 없는 것처럼 읽힌다 | 주석을 'C91(C68 (1) · C75 보완)'으로 |
| M-2 | Minor | 지움 SQL 셋은 회화 **내용**만 지운다. 회화를 해 본 집이면 `unit_progress`(area talk) · `vocab_progress`(state say — 회화 '말함' 행) · `profile_tracks` 회화 열(friendship · tori_stories_opened · tori_stories_by_band)이 시험용 낱말 · 단원을 가리킨 채 남는다. 1-나 신고가 생기면 `seed_reports.lesson_id`(restrict)가 lessons 지움을 막는다 | C75 '실시드를 개발용에 넣기 전에 시험용 시드를 비운다'의 뜻이 회화 몫까지 깨끗한 판이라면 셋으로 모자라다 | 실시드 전 비우기 때 `DELETE FROM unit_progress WHERE area = 'talk'` · `DELETE FROM vocab_progress WHERE state = 'say'` · 회화 profile_tracks 열 비우기를 더하거나, 그 판은 집 비우기(전체 다시 넣기)로 한다고 장부에 적는다 |

## 판정

**Approved.** 시험용 시드 규칙 · C91 · 통합 겹침 · e2e 영향 · 적재 길이 모두 맞다. Minor 둘은 주석 근거와 지움 범위라 컨트롤러가 직접 다룰 수 있다. CI 14차 e2e 초록을 함께 본다.
