# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P10a 첫 실행 · 배치 평가

spec: `specs/` 정본(4절 첫 문단 · 첫 실행 · 배치 평가 행, 3.1 알파벳 문단, 3.2 배치 평가 표 · 회화 시작 단계 문단, 3.5 관심 주제, 5절 profiles · profile_tracks · settings · unit_progress · level_tests · sessions · attempts · parent_auth · parent_alerts · progress_events · 전이 표, 6.3 주제 묶음 · 시드 범위 끝 알림 문단, 7절 마이크 · 지원 표 · 오류 · 마이크를 쓸 수 없음 행, 8절 네트워크 끊김 · 오래 멈춘 세션(배치 평가는 닫지 않음), 12절 placement.* · profile.start_level.<영역> · speech.* · seed.complete_through_level · seed.range_end_alert_margin · talk.placement_cap · unit.* · level.*, 13절 C50 · C53 · C55 · C57 · C61 (2) · C66 · C68, 15절 AC-1a · 1b · 1c · 5e(배치 몫) · 11a · 11b · 11c · 11d, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P10 행 · 위험 1 · 12 · 화면 구현 · 검토 루프 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-17 · 상태: approved
승인: 컨트롤러 2026-10-17 18:3x(C70~C73 — 순서 바꿈은 요청자 2026-10-17 14:1x 요청에 따름, 다른 순서를 원하면 되돌림; 정할 것은 모두 권함대로) · 브랜치 · 워크트리: `feature/1a-p10-first-run-home`(바탕은 아래 '바탕 브랜치', 격리 워크트리 하나. P10b 와 같은 브랜치 · 같은 워크트리) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P10 은 파일이 쉰 개 안팎이라 둘로 나눴다(묶음 plan 위험 12). 이 파일(a)은 개발용 로컬 DB 길 · 보드 공용 · 첫 실행 · 배치 평가 · 답 입력 조각이다. 짝은 `plan-p10b-홈-목록-세션-틀.md`(홈 · 수업 목록 · 세션 틀 — 시작 재판정 · 판 · 주제 변형 · 전이 · 시도 id)다. 두 plan 은 한 브랜치에서 아래 '화면을 보는 차례'대로 엇갈려 구현한다. 함께 쓰는 사실(앞당긴 까닭과 가정 · 화면을 보는 차례 · 바탕 브랜치 · 시험용 시드 · 정본 밖 문구 · 정할 것 · 확인한 사실)은 이 파일에만 두고 b 는 절 이름으로 가리킨다.
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 판과 출처는 2026-10-17 에 확인했다(위험 절 끝 '확인한 사실과 출처').

## 앞당긴 까닭과 가정

- 까닭. 요청자 2026-10-17 14:1x "화면은 도대체 언제 볼 수 있는거야 ?". 묶음 plan 은 P10 을 P7(적재) · P8(실시드) · P9(AI) 뒤(작업 순서 7)에 두었다. 아이 화면을 먼저 보도록 **P10(그리고 뒤이어 P11)을 P8 앞으로 당긴다.** 순서 바꿈의 13절 한 줄은 컨트롤러가 요청자 확인 뒤 적는다(정할 것 가).
- 가정 (가) 시드. 수업 · 평가 자료는 실시드(P8)가 아니라 **시험용 시드**다. P7a `tests/fixtures/seed/loadable.ts` 의 `loadableSeed()`(P4c `miniSeed` 작은 틀 · 1단계까지 + 적재용 설정 + P9a 시험용 단가표, 낱말은 bababa 같은 지어낸 말)에 이 plan 이 손질 둘(말하기 배치 본 문항을 따라 말하기로 · P10 이 읽는 설정 키)을 더한 `devSeedTree()` 를 쓴다. 넣는 곳은 **요청자 컴퓨터의 개발용 로컬 DB**(내장 Postgres, `pnpm db:dev`)와 e2e 의 임시 DB 뿐이다. Supabase 개발용 프로젝트(H3)에는 넣지 않는다 — C68 (5)의 '시험용 수업은 개발용 DB 에 넣지 않는다'는 지어낸 시드가 실제 규격과 같은 칸 · 판으로 부딪치기 때문이고, 로컬 DB 는 `pnpm db:dev --reset` 으로 버리고 다시 만든다. 실시드가 오면 로컬 DB 를 비우고 실시드로 채운다.
  - 시험용 시드로 보이는 화면의 한계(요청자에게 미리 알릴 것): seed.complete_through_level 1 이라 시작 단계 · 배치 결과가 늘 1단계다. 단원 틀이 작다(단원 단어 4 · 정규 수업 3 = 배정 2 + 다지기 1 · 보강 1 · 주제 변형 1 · 배치 문항 단계마다 1). 그림 파일이 없어 그림 자리에 뜻 글이 보인다. 낱말이 지어낸 말이다.
- 가정 (나) AI. P10 에는 AI 호출이 없다. 배치 평가 · 읽기 문제 · 허용 답 일치율은 앱이 채점한다(CLAUDE.md 피드백 규칙). P11 에서 AI 가 필요한 곳(쓰기 확인 · 첨삭 · 말하기 평가 · 생각 꺼내기)은 P9 의 가짜 Anthropic(P9a `tests/fixtures/ai/fake-anthropic.ts` — 시험은 SDK fetch 주입, e2e 는 `ANTHROPIC_BASE_URL` 로 로컬 HTTP 서버, C63 (5))으로 먼저 간다. P11 은 다음 plan 이라 '다른 P 에 넘길 것'에만 적는다.
- 요청자가 직접 보는 길. 컨트롤러가 요청자 컴퓨터에서 `pnpm db:dev`(켜 둠)와 `pnpm dev` 를 띄우고, 요청자는 브라우저 http://localhost:3000 에서 접근 코드 → 첫 실행 → 배치 평가 → 홈 → 수업 목록 → 세션 시작을 누른다. 접근 코드 해시는 요청자가 자기 터미널에서 `pnpm access:hash` 로 만들어 `.env.local` 에 둔다(대화 · 장부에 적지 않는다, H4 와 같은 길). localhost 는 안전한 출처라 데스크톱 Chrome · Edge 에서 마이크가 된다. iPad 실기는 프리뷰(H1 · H4) 몫이다.

## 화면을 보는 차례(P10a · P10b 엇갈림)

한 구현자가 한 워크트리에서 차례대로 한다(정할 것 나 — 차례 5 를 3 · 4 와 나란히 둘 수 있다). 검토 묶음마다 code-reviewer(Opus · xhigh) 한 번, 화면이 있는 묶음은 design-reviewer(Opus · xhigh)도 한 번이다. 차례 1 은 가벼운 루프(C52 — 컨트롤러 브리프, 검토 Opus high · 범위 한정, Minor 는 컨트롤러가 직접).

| 차례 | 할 일(plan · 작업) | 루프 | 검토 묶음 | 이 차례 끝에 요청자가 볼 수 있는 화면 |
|---|---|---|---|---|
| 0 | 바탕 브랜치 만들기(아래 '바탕 브랜치') | 컨트롤러 | — | — |
| 1 | a 작업 1 개발용 로컬 DB 길 · 시험용 시드 나무 · e2e DB · 시험용 설정 키 | 가벼운 | T | `/access` 에서 접근 코드를 넣으면 쿠키를 받고 `/`(빈 화면)로 간다 — 지금 컨트롤러가 p05b 워크트리에서 손으로 띄운 길을 저장소 명령 하나로 |
| 2 | a 작업 2 · 3 · 4 보드 · 첫 실행 · 마이크 상태 | 전체 | A1 | 첫 실행 여덟 화면(PIN → 이름 → 아바타 → 알파벳 → 주제 묶음 → 시작 단계 → 음성 인식 안내 → 넘겨주기). 끝나면 `/`(아직 빈 보드). 프로필이 있으면 `/` 는 첫 실행을 건너뛴다 |
| 3 | b 작업 1 · 2 순수 함수 · 홈 | 전체 | B1 | 홈 카드 넷(단계 · 단원 5칸 · 막대 둘 · 이번 주 n일 · 오늘 완료 · '내 단계 찾기' · 마이크 닫힘 · 부모 점 · 회화 카드를 누르면 '토리가 준비 중이에요. 곧 만나요') |
| 4 | b 작업 3 수업 목록 | 전체 | B2 | 카드 → 수업 목록(종이 띠 · 지금 단원 묶음 · 잠긴 다음 단원 한 줄 · 지난 수업 다시 하기). 수업을 누르는 것은 차례 6 |
| 5 | a 작업 5 · 6 · 7 답 맞춤 · 답 입력 조각 · 배치 평가 | 전체 | A3(조각) · A2(배치) | 홈 '내 단계 찾기' → 배치 평가(읽기 고르기 · 쓰기 타일 · 말하기 따라 말하기와 듣고 고르기) → 결과 → 수업 목록 |
| 6 | b 작업 4 세션 틀 | 전체 | B3 | 수업 → 세션 시작(새 단어 미리보기 → 둘째 활동부터 보기만) → '홈'(첫 활동이면 지움) · 수업 목록 맨 위 '하던 수업 이어 하기' |
| 7 | a 작업 8 · b 작업 5 마무리(e2e · 글자 크기 · 정적 검사 · 화면 검토 다시) | 전체 | 화면 검토 | 접근 코드부터 세션 시작까지 한 번에 |
| 8 | [사람] 요청자가 로컬에서 눌러 봄(H13 의 로컬 판) · 커밋 · PR 지시(H14) | — | — | — |

차례 4 까지는 배치 평가가 없다. 그동안 요청자는 첫 실행에서 영역마다 시작 단계(시험용 시드는 1단계뿐)를 고르고 홈 · 목록을 본다. '내 단계 찾기' 카드는 차례 5 끝에 열린다.

## 바탕 브랜치

- 제안: **`feature/1a-base-p2-p3-p4-p5b-p7`** = `feature/1a-base-p2-p3-p4` e08eaba(P1a · P1b · P2a · P2b · P3a · P3b · P4a~c) + P5b 커밋(p05b 워크트리, Approved · 커밋 대기) + P7a 커밋(p07 워크트리 `feature/1a-p07-seed-load`, 바탕 01ff0a9 = 8791527 + P9a, fix 1 끝 · 재검토 대기). 브리프의 후보 `feature/1a-base-p2-p3-p4-p7`(e08eaba + P7a)에 P5b 를 더한 꼴이다(정할 것 다).
- P5b 가 필요한 까닭: 차례 2 의 보드가 P5b `src/components/activities/common.tsx` 의 `AREA_TONE` · `CHILD_SIZE` 를 보드 토큰으로 옮기고(장부 'P10: AREA_TONE hex → board 토큰'), 차례 5 의 배치 문항이 P5b 의 `ReadingTestItem` · `WritingItem` · `ListeningItem` · `RepeatItem` · `VocabPicture` 를 그리며, 차례 6 의 첫 활동이 `NewWordsPreview` 를 쓴다(P11 은 더 많이 쓴다). P5b 커밋이 늦으면 e08eaba + P7a 로 시작하고 **차례 2 앞에** P5b 를 합친다.
- 합칠 때 부딪힐 공용 파일(2026-10-17 확인): 8791527 → e08eaba 는 68 파일, 8791527 → 01ff0a9 는 19 파일을 바꿨고 겹치는 파일은 없다(`git diff --name-only` 둘의 `comm -12` 빈 결과). P7a 의 커밋 전 변경은 `package.json` scripts 한 줄(`seed:load`)과 새 파일 열이다. `package.json` 은 같은 덩이를 둘 다 고친다 — e08eaba 는 `seed:validate` 뒤에 `access:hash` · `check:data-api` 를, P7a 는 `seed:validate` 뒤에 `seed:load` 를 더했다. 넷 다 남겨 푼다. P5b 의 변경(`package.json` `e2e:local` 한 줄 · `ci.yml` e2e-local 작업 · `next.config.ts` 함수 꼴 · `.dependency-cruiser.cjs` seed-viewer-only-from-viewer · `.env.example` · `tests/unit/dependency-rules.test.ts` · `src/core/seed/check-assessment.ts` isAiItem export)은 P7a 와 같은 줄이 없다. drizzle 마이그레이션은 0000 · 0001(P3a)과 0002(P9a, ai_calls error_code)뿐이고 **P10 은 마이그레이션을 더하지 않는다**(필요한 열이 모두 있다 — '파일별 값' 8). vitest 설정 · ci.yml 은 P10 이 고치지 않는다.
- 넣지 않는 것: P9b 6213662 · P9c(p09 워크트리, fix 2 진행 중). P10 은 AI 를 부르지 않는다. 단, 차례 5 의 따라 말하기 일치율이 동음이의어 목록을 읽어야 하므로 P9c 의 `src/server/seed-lists.ts` 가 그때 커밋되어 있으면 합쳐서 쓴다(정할 것 타).

## 목표 (Goal)

- **개발용 로컬 DB 길.** `pnpm db:dev` 한 줄로 요청자 컴퓨터에 내장 Postgres(embedded-postgres, 포트 54329, 데이터 `.dev/db/`)를 켠다. 처음이면 Supabase 역할 흉내(anon · authenticated · service_role) · 기본 권한 · 마이그레이션 · 시험용 시드 적재(P7a `loadSeed`, 영역 읽기 · 쓰기 · 말하기, 완전성 1단계 — C68 (1))를 하고, `.env.local` 의 로컬 접속 두 줄(`DATABASE_URL` · `MIGRATION_DATABASE_URL`)을 채운다. e2e 는 같은 스크립트를 임시 모드로 띄워 실제 DB 위에서 돈다(정할 것 하).
- **보드 공용.** 포스트잇 보드(코르크 바탕 · 종이 띠 · 포스트잇 노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화, 글꼴 제목 Jua · 본문 Gowun Dodum · 영어 Fredoka — 4절)를 토큰 · 컴포넌트로 둔다. 아이 화면은 한 화면 한 행동 · 해요체 · 안내 20px · 영어 24px · 버튼 22px · 누르는 곳 56 × 56px · 퍼센트 없음 · 한국어 줄바꿈은 낱말 단위다.
- **첫 실행(4절 · AC-1a · 1c).** 가정에서 한 번, 한 화면에 하나씩 PIN → 이름 → 아바타 → 알파벳 → 주제 묶음 → 시작 단계(건너뛸 수 있음) → 음성 인식 안내 → 넘겨주기. PIN 6자리는 argon2id 해시로 parent_auth(종류 pin) 한 행에 둔다. 영어 이름 칸은 한글 이름에서 로마자로 먼저 채우고(국어의 로마자 표기법 제3장 제4항 — 이름의 음운 변화는 반영하지 않는다) 부모가 고친다. 영어 이름이 vocab 낱말이면 '토리가 부를 다른 영어 이름(별명)을 골라 주세요'로 별명을 받는다. 시작 단계는 1~seed.complete_through_level 이고, 고른 영역은 profile.start_level.<영역> 프로필 행(C61 (2))과 그 단계 단원 1 로 시작한다. 고르지 않은 읽기 · 쓰기 · 말하기는 첫 세션 자리가 배치 평가다. 회화는 고르지 않으면 말하기 시작 단계와 talk.placement_cap 가운데 낮은 값, 고르면 상한 없이 그 단계다. '알파벳을 아직 몰라요'면 읽기 · 쓰기는 배치 없이 1단계 단원 0(알파벳 · 소리)이다. '마이크 확인'이 실패해도 넘어가고 부모 알림 하나가 생긴다. 두 번째 기기는 접근 코드 뒤 첫 실행 없이 홈으로 간다.
- **배치 평가(3.2 표 · 4절 · AC-11a~d · AC-5e 배치 몫).** 읽기 · 쓰기 · 말하기 영역마다 첫 세션 자리에서 가 벌(벌 1)로 placement.start_level(3)부터 적응형으로 본다. 다 맞히면 두 단계, 하나만 틀리면 한 단계 오르고, 그 밖은 못 넘음이며 처음 두 문항을 틀리면(몰라요 포함) 셋째 없이 못 넘음이다. 두 단계 뛴 뒤 못 넘으면 건너뛴 단계를 보고, 넘은 단계 바로 위에서 못 넘거나 · 1단계에서 못 넘거나 · placement.items_per_area(15)문항을 다 쓰면 끝난다. 시작 단계는 넘은 최고 단계 − 1(최소 1, seed.complete_through_level 이하)이고, 1단계도 못 넘으면 읽기 · 쓰기는 알파벳 · 소리 단원과 부모 알림이다. 말하기 따라 말하기는 placement.repeat_tries(2)번까지, 높은 일치율이 placement.repeat_pass(0.8) 이상이면 맞음이고, 첫 시도가 기준 아래면 인식 글 없이 '한 번 더 말해 볼까요?'만 보인다. 한 문항 인식 실패가 두 시도를 합쳐 speech.max_retries(3)번이면 남은 따라 말하기 자리를 같은 단계 듣고 고르기 예비 문항으로 내고 결과에 '말하기 일부는 듣기로 봤어요'와 부모 알림이다. 배치는 멈춰도 닫지 않고 다음에 멈춘 문항부터 이어 본다. 판정 키 placement.* 는 시작 때 level_tests 에 복사하고(12절), 시작 개정은 시작 때의 `currentSeedRevision()` 이다(5절 · P7a). 결과 화면은 '읽기는 n단계에서 시작해요'(말하기는 '이제 토리를 만날 수 있어요'를 더함)와 '수업 고르러 가기' 하나다. 말하기 배치는 마이크가 될 때만 보고, 첫 문항 앞에 마이크 안내 · 권한 화면을 따로 둔다.
- **답 입력 조각.** 앱이 채점하는 문항의 입력(고르기 · 글자 타일과 낱말 카드 · 앱 안 영문 자판 · 글 입력 · 따라 말하기)과 답 맞춤 순수 함수를 만든다. 배치 평가가 먼저 쓰고 P11 세션 · P12 복습과 단계 평가가 그대로 쓴다(묶음 plan 과 다르게 한 것 4).
- 경계: 홈 · 수업 목록 · 세션 틀은 P10b. 부모 화면(PIN 입력 · 알림 보기 · '마이크 다시 확인')은 1-나. 재배치 평가 · 둘째 벌 · 결과 상세는 2차. AI 호출 없음.

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 서른둘이다(새 파일 서른하나 · 지우는 파일 하나). 파일 열 개 기준을 넘어 검토 묶음 넷(T · A1 · A3 · A2)으로 나눈다 — 묶음마다 열 안팎(위험 1). 공용 파일 변경은 아래 따로 적고 세지 않는다.

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `scripts/dev-db.ts` | 신규 | `pnpm db:dev`: 개발용(지속) · e2e 임시 모드, 역할 흉내 · 마이그레이션 · 시험용 시드 적재 · `.env.local` 로컬 두 줄 · 준비 줄(값 1) | T · 1 |
| `tests/fixtures/seed/dev-tree.ts` | 신규 | `devSeedTree()` · `DEV_SEED_AREAS` · `DEV_SEED_THROUGH`(값 2) | T · 1 |
| `tests/e2e/db.ts` | 신규 | e2e DB 도우미 — 기록 비우기 · 프로필 넣기 · 설정 바꾸기 · 수업 복제 · 행 세기 · 시각 당기기(값 3) | T · 1 |
| `tests/unit/dev-tree.test.ts` | 신규 | 시험용 시드 나무가 완전성 1단계 · 영역 셋에서 오류 0, 말하기 배치 본 문항이 따라 말하기, dev-db 인자 · `.env.local` 고치기 순수 함수 | T · 1 |
| `src/components/board/board.tsx` | 신규 | 보드 공용 컴포넌트(값 5) | A1 · 2 |
| `src/app/(child)/layout.tsx` | 신규 | 아이 화면 틀(코르크 바탕 · 본문 글꼴 · `lang="ko"` 아래 · 낱말 단위 줄바꿈) | A1 · 2 |
| `src/app/(child)/page.tsx` | 신규(`src/app/page.tsx` 를 옮김) | 차례 2 몫은 '프로필이 없으면 `/first-run`' 길과 빈 보드뿐. 홈 내용은 P10b 작업 2 가 채운다 | A1 · 2 |
| `src/lib/mic-state.ts` | 신규 | 'use client'. 기기 마이크 상태(그 브라우저의 localStorage, 7절 '기기 상태는 그 브라우저에만')와 기기 판정 읽기(P2a `describeDevice`) — 첫 실행 · 홈 · 배치가 같이 씀(값 4) | A1 · 2 |
| `src/core/profile/romanize.ts` | 신규 | 한글 이름 → 영어 이름 미리 채움(값 6) | A1 · 2 |
| `src/core/profile/start.ts` | 신규 | 첫 실행 입력 규칙 · 트랙 시작값(회화 상한 · 알파벳) · 단원 시작 설정 복사본 · 범위 끝 판정 · 행 만들기 순수 함수 · 구조 상수(값 7) | A1 · 2 |
| `src/server/profile/index.ts` | 신규 | `server-only`. 가정 프로필 읽기 · 없으면 첫 실행으로 · 첫 실행 저장 · 단원 들기(트랙 · unit_progress · progress_events · 알림)(값 8) | A1 · 2 |
| `src/server/actions/first-run.ts` | 신규 | `'use server'`. `checkEnglishName` · `completeFirstRun`. 첫 문장 `await requireAccess()` | A1 · 2 |
| `src/app/(setup)/first-run/page.tsx` | 신규 | 서버: 프로필이 있으면 `/` 로, 시작 단계 예시 줄 · 묶음 그림 · 설정 읽어 넘김 | A1 · 2 |
| `src/app/(setup)/first-run/first-run-flow.tsx` | 신규 | 'use client'. 여덟 화면 상태 · 마이크 확인 · 저장(값 8) | A1 · 2 |
| `tests/unit/first-run.test.ts` | 신규 | AC-1c 로마자 · 트랙 시작값 · 복사본 · 범위 끝 · 입력 규칙 | A1 · 2 |
| `tests/integration/first-run.test.ts` | 신규 | AC-1a(PIN 필수) · AC-1c(회화 5) · AC-11b(부모가 말하기만) · 두 번째 저장 거부 · 쓰는 행 | A1 · 2 |
| `tests/e2e/first-run.spec.ts` | 신규 | AC-1a · AC-1c(차례 2 끝), AC-1b(홈 · 목록 · 세션이 생긴 차례 7 에 더함) | A1 · 2 · 7 |
| `src/core/answer/check.ts` | 신규 | 앱 채점 답 맞춤(값 10) | A3 · 5 |
| `src/components/answer/choice.tsx` | 신규 | 'use client'. 고르기(글 · 그림 보기, 읽기 · pick-word · 듣고 고르기)(값 11) | A3 · 5 |
| `src/components/answer/tiles.tsx` | 신규 | 'use client'. 글자 타일 · 낱말 카드(copy-tiles · build-tiles · fill-letters · assemble-phrase · assemble-sentence)(값 11) | A3 · 5 |
| `src/components/answer/typing.tsx` | 신규 | 'use client'. 앱 안 영문 자판(dictation, 1~3단계는 기기 자판을 띄우지 않음) · 글 입력(fill-blank · fix-sentence, 자동 수정 끔)(값 11) | A3 · 5 |
| `src/components/answer/repeat.tsx` | 신규 | 'use client'. 따라 말하기(읽어 주기 · 듣기 · 시도 셈 · 실패 셈, P2b `SpeechPort`)(값 11) | A3 · 5 |
| `tests/unit/answer-check.test.ts` | 신규 | 갈래마다 맞음 · 틀림 · 몰라요 · 정규화 | A3 · 5 |
| `src/core/placement/adaptive.ts` | 신규 | 배치 적응 규칙 · 끝 · 판정 · 예비 문항 · 이어 보기(값 9) | A2 · 5 |
| `src/server/placement/index.ts` | 신규 | `server-only`. 시작 · 이어 보기 · 답 저장 · 결과(트랙 · 회화 · 알림 · 사건)(값 12) | A2 · 5 |
| `src/server/actions/placement.ts` | 신규 | `'use server'`. `startPlacement` · `answerPlacement` | A2 · 5 |
| `src/app/(child)/[area]/placement/page.tsx` | 신규 | 서버: 영역 확인 · 배치 상태 · 문항 · 그림 · 설정 | A2 · 5 |
| `src/app/(child)/[area]/placement/placement-flow.tsx` | 신규 | 'use client'. 시작 · 마이크 · 문항 · 결과 화면(값 12) | A2 · 5 |
| `tests/unit/placement.test.ts` | 신규 | AC-11a · 11c · 11d 단위 몫 | A2 · 5 |
| `tests/integration/placement.test.ts` | 신규 | AC-11b · 11c · 11d · 복사본 · 시작 개정 · 알림 | A2 · 5 |
| `tests/e2e/placement.spec.ts` | 신규 | AC-11b · 11c · 11d · AC-5e(배치 몫) | A2 · 5 |
| `src/app/page.tsx` | 수정(지움) | `(child)/page.tsx` 로 옮김 | A1 · 2 |

### 요청하는 공용 변경(컨트롤러가 합친다)

이 브랜치의 구현자가 자기 워크트리에서 글자 그대로 옮기고(차례마다 그 차례 앞), 다른 줄기와 합칠 때 컨트롤러가 푼다(P3 · P4 · P7 과 같은 길).

| # | 파일 | 바꿀 것 | 차례 · 까닭 |
|---|---|---|---|
| 1 | `package.json` scripts | `"db:dev": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/dev-db.ts"` | 1. `loadSeed` · `createDb` 가 `server-only` 라 P7a `seed:load` 와 같은 띄우기(P7a 확인한 사실 9) |
| 2 | `.gitignore` | `/.dev/` | 1. 개발용 DB 자료 · 비밀번호 파일 |
| 3 | `playwright.config.ts` | (가) 시험용 DB 비밀번호를 실행 때 만들어 `process.env.E2E_DB_PASSWORD` 에(이미 있으면 그대로 — `E2E_ACCESS_CODE` 와 같은 꼴), 포트 이름 붙인 상수 `E2E_DB_PORT`(54339, 기술 값)를 내보냄. (나) `webServer` 를 배열로 — 첫째 `{ name: "e2e-db", command: "node --conditions=react-server --import tsx scripts/dev-db.ts --ephemeral --port <E2E_DB_PORT>", wait: { stdout: /DEV_DB_READY/ }, reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: <ms> }, env: serverEnv, timeout }`, 둘째 지금의 Next 서버 + `serverEnv.DATABASE_URL`(URL 속성으로 조립, '사용자:비밀번호@' 문자열 틀 금지 — P3a 꼴) · `reuseExistingServer: false`. (다) `workers: 1` | 1. P10 e2e 가 집 하나(프로필 하나 · PIN 하나)의 DB 를 함께 쓰므로 한 번에 하나씩. Playwright 1.64.1 은 webServer 를 배열 차례대로 하나씩 끝까지 띄운 뒤 globalSetup 을 돈다(확인한 사실 1 · 2). 낡은 서버를 다시 쓰지 않게 다시 쓰기를 끈다 |
| 4 | `tests/fixtures/settings.ts` | `TEST_SETTINGS` 에 P10 이 읽는 12절 키를 기본값 그대로(값 2 표) | 1. 시험은 설계 숫자를 이 파일에서 읽고, `loadableSettings()` 가 이 키를 개발용 · e2e DB 에 넣는다(묶음 위험 4). 작은 틀에 이미 있는 키(placement.items_per_level 1 등)는 작은 틀 값이 이긴다 |
| 5 | `src/app/layout.tsx` | `next/font/google` 의 `Jua`(400) · `Gowun_Dodum`(400) · `Fredoka`(가변)를 CSS 변수(`--font-jua` · `--font-gowun` · `--font-fredoka`)로 `<html>` 에, `display: "swap"` · `subsets: ["latin"]`(한국어 조각은 미리 읽지 않고 쓸 때 받는다) | 2. 4절 글꼴. 설치판은 CSS 의 글꼴 파일을 모두 내려받고 subsets 는 미리 읽기만 정한다(확인한 사실 3) |
| 6 | `src/app/globals.css` | `@theme` 에 보드 토큰(값 5 표) · `--font-heading`/`--font-sans` 를 글꼴 변수로 · 본문 `word-break: keep-all` | 2. 장부 'AREA_TONE hex → board 토큰 · 줄바꿈(keep-all)' |
| 7 | `src/components/activities/common.tsx`(P5b) | `AREA_TONE.<영역>.className` 을 토큰 클래스(`bg-postit-reading` 등)로, `PAPER` 를 `bg-paper` 로. 값 · 이름 · 내보내기는 그대로 | 2. 같은 색을 두 곳에 두지 않는다. P5b e2e-local 의 크기 · 색 시험을 다시 돌린다(장부 '글꼴 입힌 뒤 크기 시험 다시') |
| 8 | `tests/e2e/smoke.spec.ts`(P3b) | 'AC-1a 유효한 접근 쿠키가 있는 기기는 …' 의 기대를 '프로필이 없으면 첫 실행(`/first-run`), 있으면 홈'으로. 이름은 그대로 | 2. `/` 가 프로필을 보고 첫 실행으로 보낸다(P3b 목표 문단 'AC-1a 의 첫 실행 화면으로 간다는 P10 이 마저 증명한다') |
| 9 | `src/core/seed/structure.ts` · `src/core/level-band.ts`(선택) | `structure.ts` 의 `Band` · `bandOf` 를 `level-band.ts` 에서 다시 내보내 하나로(오류 문구가 다르면 시험 기대를 맞춤) | 2. 장부 'P4a bandOf ↔ P2a level-band 중복 — P5b · P10 때 하나로'. P10 새 코드는 `level-band.ts` 만 쓴다 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **`scripts/dev-db.ts`**(컨트롤러 스크래치패드 `devdb/dev-pg.mts`, 2026-10-17 14:2x 검증본을 저장소 꼴로). 순수 꼴(`parseArgs` · `planEnvLocal(text, urls)`)을 내보내고 실행은 직접 실행될 때만(`isDirectRun`, P1b · P7a 스크립트 꼴).
   - 인자: 없음(개발용) · `--reset`(개발용 자료 폴더를 지우고 처음부터) · `--ephemeral --port <n>`(e2e). 모르는 인자는 종료 2.
   - 개발용: 자료 `.dev/db/data`, 포트 `DEV_DB_PORT`(54329, 기술 값), 비밀번호 `.dev/db/password`(처음 한 번 `randomBytes` 로 만들고 권한 0600). `PG_VERSION` 이 없으면 initialise. `persistent: true`.
   - 임시(e2e): `mkdtemp` 폴더, `--port`, 비밀번호는 환경 변수 `E2E_DB_PASSWORD`(없으면 종료 2), `persistent: false`, 끌 때 폴더를 지운다.
   - 처음 만들 때: `CREATE ROLE anon NOLOGIN` · `authenticated NOLOGIN` · `service_role NOLOGIN BYPASSRLS` · `CREATE DATABASE momo_dev`(e2e 는 `momo_e2e`) · `GRANT USAGE ON SCHEMA public …` · `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES · SEQUENCES · FUNCTIONS …`(P3a global-setup 과 같은 차례, 위험 15). 그 뒤 늘 `migrate(drizzle, { migrationsFolder: "drizzle" })`(새 마이그레이션이 오면 적용).
   - 시드: 시드 테이블 다섯이 비었으면 `loadSeed(db, { files: filesOf(devSeedTree()), completeThrough: DEV_SEED_THROUGH, areas: DEV_SEED_AREAS, now: now() })`(P7a). 거부면 보고 첫 줄을 내고 종료 1. 이미 있으면 건너뜀(시험용 시드 꼴이 바뀌어 다시 넣어야 하면 `--reset`).
   - `.env.local`(개발용만): `DATABASE_URL` · `MIGRATION_DATABASE_URL` 이 없거나 `127.0.0.1` · `localhost` 의 개발용 포트를 가리키면 로컬 주소로 쓰고, 다른 주소(H3 뒤의 Supabase 등)면 고치지 않고 '다른 DB 주소가 있어 고치지 않았어요' 한 줄. 새 파일은 0600. 값을 화면에 내지 않는다.
   - 준비 줄: 개발용 `DEV_DB_READY dev port=<n> seed=<loaded|kept>` 와 다음 할 일(`.env.local` 에 `ACCESS_CODE_HASH` 가 없으면 '`pnpm access:hash` 로 만들어 넣어 주세요', 그 뒤 `pnpm dev`) · e2e `DEV_DB_READY e2e`. 접속 문자열 · 비밀번호는 내지 않는다. 그 뒤 SIGINT · SIGTERM 까지 켜 둔다(끄면 stop, e2e 는 폴더 지움).
   - 종료 코드: 0 정상 끔 · 1 시드 적재 거부 · 2 인자 · 환경 · 포트 사용 중 · 시작 실패(로그 끝 줄을 붙임, P3a 꼴).
2. **`tests/fixtures/seed/dev-tree.ts`**. 무작위 · 아이 이름 · 연락처 꼴 금지(P4a 제약).
   - `DEV_SEED_AREAS = ["reading", "writing", "speaking"]`(C68 (1) — 회화 · 토리 이야기 칸은 나무에 있어도 적재하지 않는다). `DEV_SEED_THROUGH = LOADABLE_THROUGH`(1).
   - `devSeedTree()` = `loadableSeed()` 에서 말하기 배치 파일의 단계마다 본 문항(지금은 듣고 고르기)을 따라 말하기 `{ no, revision, correction, type: "repeat", sentence: <그 문항의 script> }` 로 바꾼다. 예비 문항(듣고 고르기)은 그대로 둔다. 바꾼 칸은 풀이 검사 대상이 아니므로(`solveTargets` 의 SOLVED_TEST_TYPES 에 repeat 없음) 그 칸의 풀이 검사 기록을 뺀다. 까닭: 따라 말하기 · 인식 실패 · 예비 문항 길을 개발 화면과 e2e 에서 보려고(miniSeed 의 말하기 배치는 본 · 예비 모두 듣고 고르기다).
   - 설정은 `loadableSettings()` 그대로다 — 작은 틀 45 키 + `TEST_SETTINGS`(공용 변경 4 로 P10 키가 들어온다). 그래서 개발용 · e2e DB 의 placement.items_per_level 은 1, seed.topic_variants.* 은 1, seed.complete_through_level 은 1 이다.
   - 공용 변경 4 로 `TEST_SETTINGS` 에 더할 키(12절 기본값, 범위는 모두 집 전체): placement.start_level 3 · placement.items_per_level 3 · placement.items_per_area 15 · placement.retest_months 3 · placement.recommend_up 0.95 · placement.recommend_down 0.5 · placement.repeat_pass 0.8 · placement.repeat_tries 2 · placement.target_minutes 10 · talk.placement_cap 4 · speech.lang "en-US" · speech.max_listen_seconds 15 · speech.end_silence_seconds.1-3 3 · .4-6 1.5 · .7-9 1.5 · .10-12 1.5 · speech.watchdog_extra_seconds 3 · speech.max_retries 3 · speech.silent_items_max 3 · session.resume_hours 24 · seed.range_end_alert_margin 1 · unit.min_days.1-3 4 · .4-6 5 · .7-9 6 · .10-12 7 · unit.recent_score 0.8 · unit.recent_window 5 · unit.remedial_batch 2 · unit.parent_decision_days 3 · level.pass_score 0.8 · level.remedial_before_retest 2 · level.retest_gap_days 1 · level.near_pass_gap 2.
3. **`tests/e2e/db.ts`**. Playwright 쪽은 `server-only` 모듈을 가져오지 못하므로 `postgres` + `drizzle-orm/postgres-js` 와 스키마 세 파일(`server-only` 없음)만 쓴다. 접속 주소는 `E2E_DB_PASSWORD` · `E2E_DB_PORT` 로 조립한다.
   - `resetHousehold()`: profiles(따라 지움 — 트랙 · 세션 · 시도 · unit_progress · level_tests · 프로필 설정 행 · 별 · 사건 · 프로필 알림) · parent_auth(pin · access_ip) · profile_id 가 빈 parent_alerts 를 지운다. 시드 테이블 · 집 전체 설정은 두지 않는다.
   - `insertHousehold(choices)`: 첫 실행을 화면으로 거치지 않는 시험용. `src/core/profile/start.ts` 의 행 만들기 순수 함수(값 7)로 서버와 같은 행을 만들어 넣는다(따로 짠 행이 서버와 어긋나지 않게).
   - `withHouseholdSetting(key, value, fn)`(끝나면 되돌림) · `cloneLessons({ area, fromLevel, toLevel, unit, toVariant? })`(e2e 전용 — 시험용 시드에 없는 단계 · 변형 칸을 같은 내용으로 복제, 검증 밖, 정할 것 서) · `insertSessions(rows)`(e2e 전용 — P11 전에는 세션을 끝낼 길이 없으므로 끝낸 정규 · 다시 하기 · 단계 평가 세션을 그 학습일로 넣어 오늘 완료 · 잠긴 단원 줄을 본다) · `countRows(table, where)` · `shiftTimes(table, id, hours)`(시작 · 시도 시각을 앞으로 당김, AC-11d '24시간 뒤').
   - DB 를 쓰는 e2e 파일은 `test.beforeEach(resetHousehold)` 다. 접근 쿠키 · 가짜 음성은 P2b · P3b 의 `tests/e2e/fixtures.ts` `test` 를 그대로 쓴다.
4. **`src/lib/mic-state.ts`**('use client'). 저장 키 `momo.mic.v1`(제안) = `{ state: "unavailable", code, at }` — 그 브라우저에만(7절). `readMicState()` · `markMicUnavailable(code)` · `clearMicState()`(1-나 '마이크 다시 확인'이 쓴다). `readDeviceVerdict()` 는 `window` 에서 사실(userAgent · maxTouchPoints · 표준 · webkit 인식 생성자 · speechSynthesis · isSecureContext)을 모아 P2a `describeDevice` 로 판정한다. `micUsable()` = 판정이 `ok` 이고 저장 상태가 unavailable 이 아님. 음성 인식 API 가 없는 기기는 부를 때마다 다시 판정한다(7절 '홈 진입마다 다시 확인'). localStorage 를 못 쓰면 상태 없음으로 본다.
5. **보드(`src/components/board/board.tsx` · 토큰).**
   - 토큰(`globals.css` `@theme`, 목업 B_Home4 · B_Sticky 의 색): `--color-cork`(목업 코르크 바탕) · `--color-paper` #FFFDF7 · `--color-ink` #2B2B2B · `--color-postit-reading` #FFE566 · `--color-postit-writing` #9FD8FF · `--color-postit-speaking` #FFB3C7 · `--color-postit-talk` #C9F2B2 · 글꼴 `--font-heading`(Jua) · `--font-sans`(Gowun Dodum) · `--font-en`(Fredoka). 코르크 색 · 질감 값은 목업 파일에서 옮긴다.
   - 컴포넌트(모두 속성만, 훅 없음 — 서버 · 클라이언트 둘 다): `ChildScreen`(`<main data-child-screen>` · 안쪽 기본 글자 20px · 세로 820 · 가로 1180 둘 다 가로 넘침 없이 — 장부 '화면 방향') · `PaperBand`(위 종이 띠: 제목 · 단계 · 단원 · 오른쪽 '홈' 자리) · `PostIt`(영역 색 · 조금 기운 종이 · `href` 나 `onClick` 을 받는 누르는 곳 56px 이상, `disabled` 꼴) · `BigButton` · `SmallButton`(글자 24px · 22px 이상, 누르는 곳 56px) · `ConfirmSheet`(한 문장과 단추 둘, P10b 수업 목록이 씀) · `AREA_LABEL`(읽기 · 쓰기 · 말하기 · 회화). 부모용 작은 글은 `data-parent-info` 안에만(4절 '작은 글자는 부모용 정보에만').
   - 첫 실행은 부모 화면이지만 같은 보드 꼴로 그린다(목업 B_FirstRun1 · 2 는 P6c 몫, 정할 것 저).
6. **`src/core/profile/romanize.ts`**. `romanizeGivenName(displayName): string`.
   - 국어의 로마자 표기법(문화체육관광부 고시 2014-42호) 제2장 표기 일람과 제3장 제4항 — 인명은 이름의 음운 변화를 표기에 반영하지 않는다(보기: 한복남 Han Boknam · 홍빛나 Hong Bitna). 그래서 음절마다 첫소리 · 가운뎃소리 · 끝소리를 표대로 적고(끝소리는 대표음 k · t · p · n · l · m · ng), 음절 사이 연음 · 동화를 하지 않는다. 첫 글자만 대문자, 붙여 쓴다(붙임표 없음).
   - 성 빼기: 세 글자면 뒤 두 글자, 넉 자이고 앞 두 글자가 두 글자 성(남궁 · 황보 · 제갈 · 선우 · 독고 · 사공 · 서문)이면 뒤 두 글자, 그 밖은 그대로다(P9b `mask.ts` 의 이름 변형과 같은 규칙. P9b 가 바탕에 없으므로 성 목록은 이 파일의 이름 붙인 상수 — P9 합칠 때 하나로). 한글이 아닌 글자는 버린다. 결과가 비면 빈 글자(부모가 쓴다).
   - 시험 이름은 앱 안 이름(모모 → Momo · 토리 → Tori · 남궁모모 → Momo)과 고시의 보기만 쓴다.
7. **`src/core/profile/start.ts`**(DB · 시계를 가져오지 않는다).
   - 구조 상수(정본 고정 규칙, 12절 키 아님 — check-ids 허용 목록에 까닭과 함께): `PIN_LENGTH = 6`(4절 'PIN 6자리', 정할 것 바) · `NAME_MAX_LENGTH`(입력 상한, 기술 값) · `TOPIC_BUNDLES`(6.3: 1 = '동물 · 자연 · 음식 · 가족', 2 = '놀이 · 운동 · 게임 · 우주 · 탈것', 묶음마다 대표 낱말 넷 · 다섯과 한국어 이름표 — 그림은 그림 카탈로그에서 그 낱말로 찾고 없으면 이름표 글, 정할 것 자) · `AVATARS`(목업 꼴 이름 첫 글자 동그라미의 색 여섯 이름, 정할 것 아).
   - `trackStartsOf({ chosen: Partial<Record<Area, number>>, alphabetUnknown, through, placementCap })` → 영역마다 `{ level, unit, source }` 또는 `pending`(배치 대기). 규칙: 고른 영역은 `{ level: 고른 값, unit: 1, source: "first_run" }`(1 ≤ 값 ≤ through 가 아니면 던짐). `alphabetUnknown` 이면 읽기 · 쓰기는 `{ level: 1, unit: 0, source: "first_run_alphabet" }`(고른 값보다 앞선다 — 시작 단계 화면에서 그 두 칸은 고를 수 없다, 정할 것 처). 회화를 고르지 않았으면 말하기가 정해진 경우 `min(말하기 단계, placementCap)`·`source: "speaking_start"`, 아니면 `pending`. 회화를 골랐으면 상한 없이 그 값(4절 '부모가 고른 회화 단계에는 talk.placement_cap 을 쓰지 않는다').
   - `unitSnapshotOf(read, area, level)` → 단원 시작 때 unit_progress.settings_snapshot 에 넣을 사전. 키(12절 머리 '단원을 시작할 때 판정에 쓰는 키'): unit.regular_lessons · unit.new_words_per_lesson · unit.min_lessons · unit.min_days · unit.vocab_count · unit.max_remedial(이 여섯은 그 단계 구간 값으로 풀어 `<구간>` 없는 이름으로) · unit.vocab_mastery · unit.recent_score · unit.recent_window · unit.remedial_batch · unit.parent_decision_days · level.test_items · level.test_items_per_session · level.pass_score · level.remedial_before_retest · level.test_forms · level.retest_gap_days · level.near_pass_gap · talk.said_ratio · talk.known_days. 없는 키는 던진다(조용한 기본값 금지). 꼴은 P12 가 읽는다(다른 P 에 넘길 것).
   - `placementSnapshotOf(read)` → level_tests.settings_snapshot: placement.* 아홉 키(12절 머리 '배치 평가는 시작할 때 … placement.* 의 값을 level_tests 에 복사').
   - `rangeEndAlertDue(level, through, margin)` = `level ≥ through − margin`(6.3 '그 상태로 시작한 경우도 알린다').
   - `householdRowsOf(input, ctx)` → 넣을 행 묶음(profiles 한 행 · profile_tracks 넷 · 고른 영역의 settings 프로필 행 profile.start_level.<영역> · 단원 든 영역의 unit_progress · progress_events · parent_alerts 후보). `ctx` 는 설정 읽기 값 · seed 최신 개정 · 설정 판 · 시각(인자). 서버(값 8)와 e2e 도우미(값 3)가 같은 함수를 쓴다. PIN 해시는 받지 않는다(서버가 따로).
8. **첫 실행(서버 · 화면).**
   - 행(마이그레이션 없음 — P3a 스키마 그대로): profiles `display_name` · `english_name` · `tori_nickname`(별명일 때만) · `avatar`(AVATARS 이름) · `topic_bundle`(묶음 번호 글 "1" · "2" — lessons.topic_variant 와 같은 수, C54 (3)) · `alphabet_start` · `notices_seen` {} . parent_auth `{ kind: "pin", pin_hash: <argon2id PHC>, failed_count: 0, updated_at: now }`(부분 유일 색인이 두 번째 PIN 을 막는다 — 두 기기가 함께 첫 실행을 끝내도 하나만 남음). profile_tracks 넷(`pending` 은 level · unit 비움, 고른 영역은 `chosen_start_level`). settings `{ key: "profile.start_level.<영역>", scope: "profile", profile_id, value: n, version }`(C61 (2), 설정 판은 가장 큰 판 + 1). 단원 든 영역마다 unit_progress `{ level, unit, round: 1, started_at: now, start_revision: currentSeedRevision(), settings_version, settings_snapshot: unitSnapshotOf(...) }`. progress_events `{ kind: "parent_adjustment", actor: "parent", target: { area, source: "first_run" | "first_run_alphabet" }, new_value: { level, unit } }` · 회화가 말하기에서 정해지면 `{ kind: "auto_judgement", actor: "app", target: { area: "talk", source: "speaking_start" } }`(1-나 부모 화면 '처음에 부모님이 골랐어요' 등의 까닭, 정할 것 퍼). JSON null 을 뜻으로 쓰지 않는다(P3a 메모).
   - 알림(parent_alerts, 종류 값은 P9 꼴 snake_case — 정할 것 퍼): 마이크 확인 실패면 `mic_unavailable`(값 `{ browser, code }`, 4절 '마이크 알림에는 브라우저 이름과 시각'). 단원 든 영역이 `rangeEndAlertDue` 면 `seed_range_end_near`(기준 키 `seed.range_end_alert_margin:<영역>`, 영역마다 한 번 — P9a `createAlertOnce` 의 key 꼴을 쓴다).
   - `completeFirstRun(input)`: 첫 문장 `await requireAccess()`. Zod 로 입력 전부(PIN 숫자 `PIN_LENGTH` 자리 · 이름 길이 · AVATARS · TOPIC_BUNDLES · 시작 단계 1~through · 회화 · 마이크 결과)를 본다. argon2id 해시(`@node-rs/argon2` `hash` 기본값, P3b 와 같은 방식)는 트랜잭션 밖에서. 한 트랜잭션: 프로필이 이미 있으면 `already_done`(화면은 `/` 로) → 행 넣기. 돌려주는 것 `{ ok: true } | { ok: false, reason }`. `checkEnglishName(name)`: 첫 문장 `await requireAccess()`, vocab 의 word 와 대소문자 없이 같거나 띄어쓰기 · 붙임표 조각 하나가 같으면 `{ vocabWord: true }`(정할 것 처).
   - 화면(`first-run-flow.tsx`): 여덟 화면 상태는 화면 메모리에만 둔다(새로 고치면 처음부터, PIN 을 기기에 저장하지 않음 — 정할 것 커). '다음'은 그 화면의 값이 맞을 때만 눌린다(AC-1a 'PIN 을 정해야 다음으로'). 영어 이름 칸은 부모가 고치기 전까지 한글 이름에서 다시 채운다. 음성 인식 안내 화면의 '마이크 확인'은 누름 처리 안에서 P2b `createBrowserSpeech` 의 `unlockFromGesture()` 뒤 `checkMicrophone()` — 성공이면 성공 줄, 실패면 실패 줄과 함께 결과를 저장 입력에 담고 갈래가 mic-unavailable 이면 `markMicUnavailable`, 끊김(`interrupted-<까닭>`, P2b 가 P10 에 맡긴 꼴)은 알림 없이 다시 누를 수 있게(정할 것 터). iPad 면 Siri · 받아쓰기 켜는 그림 안내를 먼저 보인다(그림은 단순 도식, 정할 것 저). 넘겨주기의 '10분'은 placement.target_minutes 값, 배치 볼 영역이 없으면 둘째 문장을 뺀다. 저장이 끝나면 `/`.
   - 문구는 아래 '정본 밖 문구' 표.
9. **`src/core/placement/adaptive.ts`**. 상태는 답 기록뿐이다(이어 보기는 같은 기록으로 다음 차례를 다시 셈, AC-11d).
   - 입력: `answers: { level, slot: "main" | "spare", no, correct: boolean, dontKnow: boolean, repeatFailed: boolean }[]`, 설정(level_tests 복사본) `startLevel` · `perLevel`(placement.items_per_level) · `maxItems`(placement.items_per_area), `levelMax`(structure `LEVEL_MAX`), 예비 여부를 정하는 `spareMode`(말하기 따라 말하기에서 실패 3회가 한 번이라도 있었는가 — 답 기록에서 셈), 그 단계 본 문항 꼴 목록(따라 말하기인지).
   - 블록 규칙(정할 것 라): 한 단계에서 perLevel 문항을 낸다. 맞은 수 c · 남은 수 r. **다 맞히면(c = perLevel) 두 단계, 하나만 틀리면(c = perLevel − 1 이고 perLevel ≥ 2) 한 단계 오른다. 그 밖은 못 넘음이다. 남은 문항을 다 맞혀도 c + r < perLevel − 1(perLevel = 1 이면 c + r < 1)이면 거기서 멈추고 못 넘음이다.** perLevel 3 이면 3.2 표와 같다(3 → 두 단계 · 2 → 한 단계 · 1 이하 못 넘음 · 처음 두 문항 틀림 → 셋째 없이). 몰라요는 틀림이다.
   - 다음 단계(넘었을 때): 그 단계가 LEVEL_MAX 이거나 바로 위(단계 + 1)가 이미 못 넘음이면 끝. 아니면 오름이 둘이고 단계 + 2 가 LEVEL_MAX 이하 · 아직 안 본 단계면 단계 + 2 로 가며 건너뛴 단계(단계 + 1)를 기억한다. 그 밖은 단계 + 1.
   - 다음 단계(못 넘었을 때): 바로 아래(단계 − 1)가 넘은 단계면 끝(넘은 단계 바로 위에서 못 넘음). 기억한 건너뛴 단계가 있으면 그 단계로(기억을 지움). 넘은 단계가 아직 없으면 단계 − 1 로 내리고, 단계가 1 이면 끝.
   - 끝: 위의 끝 · 낸 문항 수가 maxItems. 보기: 3 못 넘음 → 2 에서 2/3 → 3 은 이미 못 넘음이라 끝(최고 2, 시작 1). 3 다 맞힘 → 5 못 넘음 → 건너뛴 4 → 4 넘음이면 5 가 이미 못 넘음이라 끝(최고 4, 시작 3).
   - 판정: `highest` = 넘은 최고 단계. 시작 = `max(1, highest − 1)`, 넘은 단계가 없으면 1 과 `alphabet: true`(읽기 · 쓰기만 쓰임). 그다음 `min(시작, seed.complete_through_level)`(판정 때의 값, 6.3). 기본 설정의 가장 높은 시작은 10 이다(3 → 5 → 7 → 9 → 11 다 맞힘이면 15문항, 시작 10 — 시험으로 고정).
   - 예비: 말하기에서 `spareMode` 면 따라 말하기 본 문항 자리를 같은 (단계, 번호)의 예비 문항으로 낸다. 실패 3회가 난 그 문항도 예비로 다시 낸다(그 시도는 틀림으로 세지 않음, 정할 것 처). 듣고 고르기 본 문항은 그대로.
   - 내보내기: `nextPlacementStep(input) → { kind: "item", level, slot, no } | { kind: "done", result: { start, highest, alphabet, usedSpares } }`.
10. **`src/core/answer/check.ts`**. `checkAnswer(item, answer)` — 앱이 채점하는 갈래 모두(P4a 규격 형): 읽기(`picture` · 글 보기 유형) · 쓰기 `pick-word` 는 고른 번호 = `answerNo`. `copy-tiles` · `build-tiles` · `fill-letters` 는 놓은 글자를 이은 낱말이 허용 정답 가운데 하나와 같다(글자 그대로). `assemble-phrase` · `assemble-sentence` 는 놓은 카드를 빈칸 하나로 잇되 문장 부호 카드(. , ? !)는 앞 카드에 붙여 이은 글이 허용 정답 하나와 같다(대소문자 · 문장 부호 그대로 — AC-4a '첫 글자 대문자 · 마침표 카드를 판정', 대문자 바꾸기는 정할 것 차). `dictation` · `fill-blank` · `fix-sentence` 는 쓴 글을 앞뒤 공백 · 겹 빈칸 · 굽은 따옴표만 맞춘 뒤 허용 정답 하나와 같다(대소문자 · 문장 부호는 가린다, 정할 것 카). 말하기 `listening` 은 번호, `repeat` 는 시도마다 P2a `bestMatchRate([sentence], heard, { homophones, nameSlot: "any-word" })` 의 가장 높은 값 ≥ placement.repeat_pass(값은 부르는 쪽이 넘김). 몰라요는 모두 틀림. 돌려주는 것 `{ correct, detail }`(detail 은 P11 이 '정답을 보여 주고 다시'에 씀).
11. **답 입력 조각**(`src/components/answer/*`, 'use client'). 내용 그리기는 P5b 컴포넌트를 쓰고(`ReadingTestItem` · `WritingItem` · `ListeningItem` · `RepeatItem` · `VocabPicture`) 입력만 더한다. 모두 `onAnswer(answer)` 하나로 부르는 쪽에 넘기고 채점은 하지 않는다(배치는 서버가 채점, P11 은 세션 규칙대로). 누르는 곳은 56px · 글자 22px 이상 · `data-touch`(크기 시험이 고른다).
   - `ChoiceAnswer`: 보기를 누르면 고른 표시, '다음'으로 보냄(평가 중에는 정오를 보이지 않음 — 4절 배치 '평가 중에는 힌트와 뜻 보기가 없다', 정할 것 처).
   - `TileAnswer`: 빈칸 줄 + 남은 타일 · 카드. 누르면 첫 빈칸으로, 놓인 것을 누르면 돌아감, '처음부터' · '다 놓았어요'(목업 B_W3_Order). fill-letters 는 무늬의 밑줄 자리만 빈칸이다. 문장 조립의 대문자는 정할 것 차의 결정대로(권함: 첫 칸에 놓인 낱말 카드의 '대문자' 단추).
   - `TypingAnswer`: dictation 은 앱 안 영문 자판(a~z · 지우기 · 빈칸, 기기 자판을 띄우지 않음 — 4절 쓰기 '1~3단계는 … 앱 안 영문 자판만')과 읽어 주기 · '다시 듣기'. fill-blank · fix-sentence 는 입력란(자동 수정 · 자동 대문자 · 맞춤법 검사 · 단어 추천 끔 — 4절).
   - `RepeatAnswer`: 문장을 보이고 읽어 준다(첫 읽어 주기는 누름 처리 안에서 `unlockFromGesture`). 말하기 버튼 → `listen(endRuleFor({ area: "placement", level, answer: "one-sentence" }))`(P2a · P2b). 결과 갈래(P2 plan 값 2 '갈래' 표): result 면 일치율을 셈 — 기준 이상이면 그 시도로 끝, 아래면 첫 시도 뒤 인식 글 없이 '한 번 더 말해 볼까요?'(3.2). retry 갈래(no-speech · aborted · 결과 없음 · audio-capture)는 실패 하나를 세고 '다시 한 번 말해 볼까요'로 다시 듣고(7절 오류 행), 두 시도를 합쳐 speech.max_retries 번이면 `{ repeatFailed: true }` 로 보냄(AC-5e). network 는 셈에 넣지 않고 '인터넷이 끊겼어요. 연결되면 다시 해요'. mic-unavailable 이면 `markMicUnavailable` · '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'(배치는 멈춘 문항으로 남음, 7절). stalled 면 '마이크가 잘 안 돼요. 부모님께 말해 주세요'와 '홈', 알림 `mic_stalled`. audio-capture 가 같은 활동에서 세 번 이어질 때만 '마이크를 쓸 수 없음'(AC-5c 'audio-capture 한 번은 닫히지 않음') — 이때는 예비 문항으로 바꾸지 않고 '마이크를 쓸 수 없음'이 먼저다(말하기 배치는 마이크가 될 때 본다, 정할 것 처).
12. **배치 평가(서버 · 화면).**
   - `startPlacement(area)`: 첫 문장 `await requireAccess()`. 그 영역 트랙이 `pending` 이 아니면 거부(그 영역은 이미 단계가 있음). 진행 중 배치가 있으면 그것을 돌려줌(이어 보기). 없으면 한 트랜잭션: level_tests `{ kind: "placement", area, level: null, round: 1, form: 1, start_revision: currentSeedRevision(), settings_snapshot: placementSnapshotOf, item_ids: [], answers: [] }` + sessions `{ kind: "placement", area, level_test_id, status: "in_progress", started_at: now }`(프로필 × 영역마다 진행 하나 — 부분 유일 색인). 말하기는 마이크가 될 때만(화면이 먼저 막음, 서버는 막지 않음 — 기기 상태는 브라우저에만).
   - `answerPlacement({ sessionId, clientAttemptId, itemId, answer })`: 첫 문장 `await requireAccess()`. 그 프로필의 진행 중 배치 세션인지 · 문항이 지금 차례(`nextPlacementStep`)의 칸인지 확인. attempts `{ session_id, client_attempt_id, activity_no: 낸 차례, input: answer, attempted_at: now, score: 1 | 0, status: "done" }`(같은 시도 id 는 한 번만 — `onConflictDoNothing`, 8절 네트워크) + level_tests `item_ids` · `answers` 에 한 줄 더함. 채점은 서버가 `checkAnswer` 로(따라 말하기는 화면이 보낸 시도 글로 서버가 다시 셈 — 동음이의어는 시드 목록, 정할 것 타). 다음 차례를 돌려준다. 끝이면 같은 트랜잭션에서 결과: level_tests `completed_at` · `placement_start_level` · `total_score`(맞은 수) · `passed` 비움, 세션 완료(`completed_at` · `learning_day` = 그 시각의 학습일), 트랙 `level` · `unit`(알파벳이면 0) · `placement_level`, 단원 들기(값 8 과 같은 함수 — unit_progress · 사건 `auto_judgement`/`source: "placement"` · 범위 끝 알림), 말하기면 회화 트랙이 `pending` 일 때 `min(시작, talk.placement_cap)` 으로 단원 들기, 알파벳이면 알림 `alphabet_sound`, 예비를 썼으면 알림 `speaking_placement_listening`.
   - 화면(`placement-flow.tsx`): 시작 화면(4절 문구, '15' 는 placement.items_per_area) → [말하기만] 마이크 화면('말한 소리는 인터넷으로 보내 글자로 바꿔요. 소리는 저장하지 않아요' — 4절 처음 마이크 안내, 기기마다 한 번 · `micUsable()` 이 아니면 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈', AC-11c) → 문항(위 '문제 n'만 · 문항 그림은 P5b 컴포넌트 · 아래 '몰라요' 작은 단추 · 답 조각) → 결과('<영역>는 n단계에서 시작해요' · 말하기 '이제 토리를 만날 수 있어요' · 예비를 썼으면 '말하기 일부는 듣기로 봤어요' · '수업 고르러 가기' 하나 → `/<영역>/lessons`). 보낸 답은 시도 id 와 함께 기기 대기열에 먼저 넣고 보낸다(P10b 의 `src/lib/attempt-queue.ts` 를 같이 씀 — 차례 6 전이면 같은 꼴의 작은 보내기로 두고 차례 6 에서 합침).
   - 그림: 서버가 화면에 쓸 낱말의 그림 정보(`PictureInfo` — 뜻 · 그림 경로)를 vocab · images 에서 모아 넘긴다. 앱은 카탈로그 행을 믿고 경로를 주고, 그림을 읽지 못하면 화면이 뜻 글로 바꾼다(운영 함수에서 public 파일을 볼 수 없음, 정할 것 파).

### 정본 밖 문구(컨트롤러가 정한다 — 정할 것 마)

4절 · 3.1 · 3.2 · 6.3 · 7절 · C50 에 있는 문구는 그대로 쓰고 아래 표에 넣지 않았다. 표의 문구는 제안이다(해요체 · 숫자는 설정값에서). 첫 실행은 부모 화면이다.

| 화면 | 자리 | 제안 문구 |
|---|---|---|
| 첫 실행 공통 | 단추 | '다음' · '이전' |
| PIN | 제목 · 다시 넣기 · 다름 | '부모님 PIN 6자리를 정해 주세요' · '한 번 더 넣어 주세요' · 'PIN 이 서로 달라요. 다시 정해 주세요' |
| 이름 | 이름표 | '홈에 보일 이름(한글)' · '토리가 부를 영어 이름' |
| 이름 | 빈 이름 · 서버 오류 | '아이 이름을 알려 주세요'(이름이 비었을 때) · '지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요'(이름 확인 · 저장의 서버 DB 오류 — fix 1 규칙; 요청이 닿지 않고 기기가 끊겼으면 7절 '인터넷이 끊겼어요. 연결되면 다시 해요') — 구현 보고의 표 밖 문구 둘을 2026-10-17 컨트롤러가 받음(C72) |
| 아바타 | 제목 | '아이 그림을 골라 주세요' |
| 알파벳 | 물음 · 단추 | '아이가 알파벳 26자의 이름과 소리를 알아요?' · '알아요' · '알파벳을 아직 몰라요'(3.1) |
| 주제 묶음 | 제목 | '아이가 좋아하는 주제 묶음을 골라 주세요' |
| 시작 단계 | 안내 · 고르지 않음 · 회화 · 알파벳 | '영역마다 시작 단계를 고를 수 있어요. 고르지 않은 영역은 단계 찾기로 정해요' · '고르지 않음' · '고르지 않으면 말하기 단계를 따라가요' · '알파벳 · 소리 단원에서 시작해요' |
| 시작 단계 | 단계 예시 줄 | level_specs 의 can-do 문장 끝 '… 수 있다'를 '… 수 있어요'로(정할 것 사) |
| 음성 인식 안내 | 제목 · 본문 · 결과 | '말하기 · 회화는 마이크가 있어야 해요' · '말소리는 브라우저가 글자로 바꿔요. Chrome 은 소리를 Google 서버로 보내고, 다른 브라우저도 어디에서 바꾸는지 앱이 정할 수 없어요. 앱은 소리를 저장하지 않아요'(7절 내용) · iPad '설정에서 Siri 또는 받아쓰기를 켜야 말소리를 알아들어요' · 성공 '마이크가 잘 돼요' · 실패 '마이크를 쓸 수 없었어요. 그래도 다음으로 넘어갈 수 있어요' · 끊김 '다시 눌러 확인해 주세요' |
| 넘겨주기 | 단추 | '아이에게 넘기기' |
| 배치 | 시작 단추 · 다음 · 마이크 확인 · 말하기 · 듣기 | '시작' · '다음'(목업 B_LevelTest) · '마이크 확인' · '말하기'(7절 말하기 버튼) · '다시 듣기'(목업 소리 자리 이름표) |
| 쓰기 조각 | 단추 | '처음부터' · '다 놓았어요'(목업 B_W3_Order) · '대문자'(정할 것 차) · 자판 '지우기' · '띄우기' |

## 작업 순서 (Order of work)

명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다(서브에이전트 환경). 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 시험의 설계 숫자는 `TEST_SETTINGS` · `loadableSettings()` 에서 읽는다. 차례 번호는 위 '화면을 보는 차례'다.

1. (차례 1) [검증][DB] **가벼운 루프.** 공용 변경 1 · 2 · 3 · 4 → `tests/unit/dev-tree.test.ts` → `tests/fixtures/seed/dev-tree.ts` → `scripts/dev-db.ts` → `tests/e2e/db.ts`. 실기: `pnpm db:dev` 처음 · 다시 · `--reset`, `pnpm dev` 로 `/access` 제출 204, `pnpm e2e` 가 DB 를 띄워 기존 e2e 전부 초록. 완료: 실기 출력(값 없음)이 보고에 있다. **볼 수 있는 화면: 접근 코드 제출 → `/`.**
2. (차례 2) [화면] 공용 변경 5 · 6 · 7(· 9) → `src/components/board/board.tsx` · `src/app/(child)/layout.tsx` · `src/lib/mic-state.ts`. 완료: `pnpm build` · P5b `pnpm e2e:local` 크기 시험 초록(글꼴 입힌 뒤 다시 — 장부).
3. (차례 2) [검증] `tests/unit/first-run.test.ts` → `src/core/profile/romanize.ts` · `src/core/profile/start.ts`. 완료: 단위 초록.
4. (차례 2) [서버][화면] `tests/integration/first-run.test.ts` → `src/server/profile/index.ts` · `src/server/actions/first-run.ts` · `src/app/(setup)/first-run/*` · `src/app/(child)/page.tsx`(프로필 없으면 첫 실행, `src/app/page.tsx` 지움) · 공용 변경 8 → `tests/e2e/first-run.spec.ts` 의 AC-1a · AC-1c. 완료: 통합 · e2e 초록, 검토 묶음 A1 → code-reviewer · design-reviewer(세로 820 · 가로 1180 사진). **볼 수 있는 화면: 첫 실행 여덟 화면 → 빈 보드.**
   (차례 3 · 4 는 P10b 작업 1 · 2 · 3)
5. (차례 5) [검증] `tests/unit/answer-check.test.ts` → `src/core/answer/check.ts`, `tests/unit/placement.test.ts` → `src/core/placement/adaptive.ts`. 완료: 단위 초록.
6. (차례 5) [화면] `src/components/answer/*`. 완료: 배치 e2e 에서 조각마다 한 번씩 지남, 검토 묶음 A3.
7. (차례 5) [서버][화면] `tests/integration/placement.test.ts` → `src/server/placement/index.ts` · `src/server/actions/placement.ts` · `src/app/(child)/[area]/placement/*` → `tests/e2e/placement.spec.ts`. 완료: 통합 · e2e 초록, 검토 묶음 A2 → code-reviewer · design-reviewer. **볼 수 있는 화면: '내 단계 찾기' → 배치 세 영역 → 결과 → 수업 목록.**
   (차례 6 은 P10b 작업 4)
8. (차례 7) [검증] `tests/e2e/first-run.spec.ts` 의 AC-1b(홈 · 목록 · 세션 틀이 생긴 뒤) · 화면 검토 다시(P10b 작업 5 와 함께) · CI 순서 명령 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm e2e` → `pnpm e2e:local` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 비밀값 grep 0. 완료: 출력이 보고에 있고 missing-test 가 P10a 몫(AC-1b · 1c · 11a · 11b · 11c · 11d)만큼 준다. **볼 수 있는 화면: 접근 코드부터 세션 시작까지 한 번에(P10b 와 함께).**

### H3 · H15 와의 관계

H3(Supabase 개발용)과 H15(원격)는 이 plan 을 막지 않는다. 모든 작업과 요청자 확인(차례 8)이 로컬 DB 로 된다. CI 의 e2e 는 H15 뒤 첫 실행이 증명한다(embedded-postgres linux · 빌드 때 글꼴 내려받기, 위험 5).

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | P10 손 파일이 쉰일곱(a 서른둘 · b 스물다섯)이라 PR 하나 기준(열)을 크게 넘는다 | 검토가 느슨해진다 | 두 plan · 검토 묶음 일곱(T · A1 · B1 · B2 · A3 · A2 · B3), 묶음마다 열 안팎. 더 나누려면 a 를 a1(첫 실행) · a2(배치)로 가르는 길이 있다(정할 것 나) |
| 2 | 시험용 시드를 로컬 DB 에 넣는 것이 C68 (5)와 부딪쳐 보인다 | 실시드를 같은 DB 에 넣으면 칸 · 판 충돌(version-content-changed) | 로컬 DB 는 버리는 DB 다 — 실시드 전에 `pnpm db:dev --reset`. Supabase 개발용 프로젝트에는 넣지 않는다(정할 것 가) |
| 3 | 시험용 시드가 실시드와 다르게 보인다(1단계뿐 · 단원 단어 4 · 그림 없음 · 지어낸 낱말) | 요청자가 화면을 잘못 판단 | 차례 8 안내에 한계를 적는다(앞당긴 까닭과 가정). 화면 검토는 실데이터 꼴(P5b 처럼 실시드 뿌리로 한 번)도 본다 — P6a 규격 파일이 합쳐진 뒤 |
| 4 | 배치 적응 규칙이 문항 셋을 전제로 적혀 있다. 시험용 DB 는 단계마다 하나다 | 규칙을 지어내게 된다 | 정할 것 라의 일반화(셋이면 3.2 와 같음). 단위 시험은 12절 값 3 으로 3.2 표를 그대로, 작은 틀 1 로 끝까지 도는지 따로 |
| 5 | `next/font/google` 은 빌드 · 개발 서버가 Google Fonts 에서 글꼴을 내려받는다 | 네트워크가 막힌 곳(구현자 격리 환경 · CI)에서 빌드 실패 | 차례 2 첫 빌드로 확인. 막히면 같은 세 글꼴(OFL)의 woff2 를 `src/app/fonts/` 에 두고 `next/font/local` 로(파일 크기 · 한국어 조각 수를 보고에 적고 컨트롤러가 고른다) |
| 6 | e2e 가 DB 를 갖게 되어 `workers: 1` · 시간 증가 · 기존 smoke 기대가 바뀜 | e2e 가 느려지고 P2 · P3 · P5 e2e 가 깨질 수 있다 | 차례 1 에서 기존 e2e 전부 초록 확인. DB 를 쓰는 파일만 `beforeEach(resetHousehold)`. 포트 54339 가 쓰이면 시작 실패로 알림 |
| 7 | 그림 파일이 없다(시험용 시드) · 운영 함수에서 public 파일 존재를 볼 수 없다 | 깨진 그림 | 카탈로그 행을 믿고 경로를 주고 읽기 실패 때 뜻 글(정할 것 파). 운영의 파일 존재는 P6b 그림 명령의 검사가 맡는다 |
| 8 | 마이크는 안전한 출처에서만 열린다 | iPad 로 LAN 주소(http)에 붙으면 말하기 배치가 막힘 | 로컬은 데스크톱 브라우저 localhost 로 본다. iPad 는 프리뷰(H1 · H4) 몫 |
| 9 | 첫 실행 상태가 화면 메모리에만 있다 | 새로 고치면 처음부터 | 정할 것 커. 마지막 한 번 저장이라 반쯤 저장된 집이 없다 |
| 10 | 두 기기가 함께 첫 실행을 끝냄 | 프로필 둘 | PIN 부분 유일 색인 + 트랜잭션 안 '프로필 있음' 확인으로 둘째는 `already_done` |
| 11 | 문장 조립의 대문자 바꾸기 방법이 정본에 없다 | P10 · P11 · P8 시드가 다르게 짠다 | 정할 것 차를 차례 5 전에 정하고 P8 브리프 · P11 에 같은 규칙 |
| 12 | 답 입력 조각을 P11 몫에서 당겼다 | P11 이 다시 짤 수 있다 | 묶음 plan 과 다르게 한 것 4 · 다른 P 에 넘길 것. 조각은 채점하지 않고 `onAnswer` 하나만 내 세션 규칙을 P11 이 더한다 |
| 13 | P5b 가 바탕에 없으면 보드 토큰 옮기기 · 배치 문항 그리기가 막힌다 | 차례 2 · 5 | 바탕 브랜치 절의 조건(차례 2 앞에 합침) |
| 14 | 따라 말하기 일치율의 동음이의어 목록 읽기 자리가 P9c 에 있다(커밋 전) | 같은 일을 두 번 짬 | 정할 것 타 |
| 15 | dev-db 가 `.env.local` 을 고친다 | 사용자의 다른 주소를 덮음 · 값 노출 | 로컬 주소일 때만 고치고 다른 주소면 손대지 않는다. 값을 내지 않는다(시험: `planEnvLocal` 사례) |
| 16 | 가짜 음성 대본의 일치율(0.6 · 0.85)을 시험이 만들어야 한다 | 시험이 시드 문장 꼴에 묶이거나 숫자를 박는다 | 대본을 시험 안에서 그 문항의 문장으로 만든다(낱말을 빼 기준 아래 꼴) — 기준은 설정에서, 일치율은 P2a 함수로 계산해 단언 |
| 17 | `placement.items_per_area` 15 를 시작 문구에 박기 | 설정값 원칙 위반 | 문구의 수는 설정값에서 채운다(정본 밖 문구 표와 같은 꼴) |

### 정할 것(컨트롤러 — 보고 `task-p10-plan-report.md` 와 같은 글자)

13절 열은 한 줄이 필요한지다. '예'는 컨트롤러가 13절에 먼저 적은 뒤 그 차례를 구현한다.

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| 가 | 순서 바꿈(P10 · P11 → P8 앞)과 시험용 시드를 로컬 DB 에 넣는 범위 | 로컬 내장 DB(`pnpm db:dev`) · e2e 임시 DB 에만, Supabase 개발용 프로젝트에는 넣지 않음(C68 (5) 그대로). 순서 바꿈 줄에 한 문장으로 | 예(순서 바꿈 줄에 함께) |
| 나 | 차례 5(배치)를 3 · 4(홈 · 목록)와 나란히 할지, a 를 더 가를지 | 한 구현자 차례대로(겹침 · 병합 줄임). 동시 셋 자리가 넉넉하면 차례 2 끝에서 배치를 다른 워크트리로 ∥ | 아니오 |
| 다 | 바탕 브랜치 | e08eaba + P5b 커밋 + P7a 커밋 = `feature/1a-base-p2-p3-p4-p5b-p7`. P5b 가 늦으면 e08eaba + P7a 로 시작하고 차례 2 앞에 P5b. P9b · P9c 는 넣지 않음(타 참고) | 아니오 |
| 라 | 배치 적응 규칙의 일반화(placement.items_per_level ≠ 3) | '다 맞히면 두 단계, 하나만 틀리면(문항 둘 이상) 한 단계, 그 밖 못 넘음, 남은 문항을 다 맞혀도 그 수에 못 미치면 멈춤' — 셋이면 3.2 표와 같다 | 예(3.2 해석) |
| 마 | 정본 밖 문구(위 표) | 표대로. C57 처럼 13절 한 줄 + 4절 첫 실행 · 배치 행에 반영 | 예 |
| 바 | PIN 6자리 · 입력 상한을 이름 붙인 상수로(12절 키 없음 — C57 의 12자 규칙과 같은 결) | 그대로 | 예(마 와 한 줄) |
| 사 | 시작 단계 화면의 '단계마다 예시 한 줄'(4절)의 출처 | level_specs can-do 끝말을 해요체로 — 새 시드 칸 없이 | 예(마 와 한 줄) |
| 아 | 아바타 후보 | 목업 B_Home4 · B_Profile 꼴(이름 첫 글자 동그라미), 고르는 것은 색 여섯 — 새 그림이 아니라 목업 꼴. 그림 아바타를 원하면 표본 쪽(시각 결정 규칙) | 아니오 |
| 자 | 주제 묶음 그림(6.3 '묶음마다 주제 그림 4~5개') | 그림 카탈로그의 대표 낱말 그림(구조 상수 `TOPIC_BUNDLES`), 없으면 이름표 글 | 아니오 |
| 차 | 문장 조립의 대문자 바꾸기(3.3 쓰기 3 '첫 글자를 대문자로 바꾸고', 4절 · 6.3 에 방법 없음, 목업 '대문자 카드') | 첫 칸에 놓인 낱말 카드에 '대문자' 단추. 판정은 첫 글자 대문자 · 마침표 카드 · 차례(AC-4a). P8 시드 브리프(카드는 소문자 그대로) · P11 에 같은 규칙 | 예 |
| 카 | 쓴 답(받아쓰기 · 빈칸 채우기 · 문장 고치기) 견주기의 정규화 | 앞뒤 공백 · 겹 빈칸 · 굽은 따옴표만 맞추고 대소문자 · 문장 부호는 가림(3.3 '허용 정답 전부와 비교') | 예(차 와 한 줄) |
| 타 | 동음이의어 목록 읽기 자리 | P9c `src/server/seed-lists.ts` 가 차례 5 전에 커밋되면 바탕에 합쳐 쓴다. 늦으면 같은 꼴의 작은 읽기를 두고 P9c 합칠 때 하나로 | 아니오 |
| 파 | 그림 파일 확인 | 카탈로그 행을 믿고 경로를 주고 읽기 실패 때 뜻 글(Vercel 함수는 public 파일을 볼 수 없음) | 아니오 |
| 하 | e2e 에 DB 붙이는 방식 | webServer 배열(DB 먼저 · `DEV_DB_READY` 기다림) · `workers: 1` · 다시 쓰기 끔 · DB 파일마다 기록 비우기. 기술 선택이라 원하면 C55 처럼 한 줄 | 선택 |
| 처 | 해석 묶음 — 배치 문항 정오를 보이지 않음(답 → '다음') · 실패 3회 난 문항부터 예비 · audio-capture 세 번 이어짐(7절)은 예비보다 '마이크를 쓸 수 없음'이 먼저(그 '세 번'은 12절 키가 없어 7절 고정 수로 이름 붙인 상수) · 알파벳 모름이면 시작 단계의 읽기 · 쓰기 칸은 고를 수 없음 · 영어 이름 vocab 확인은 전체 또는 조각 하나 | 그대로(plan 승인) | 아니오 |
| 커 | 첫 실행 상태는 화면 메모리에만 · 마지막 한 번 저장 | 그대로 | 아니오 |
| 터 | 마이크 확인 결과 꼴(P2b 가 P10 에 맡김) | 끊김은 알림 없이 다시, 그 밖 실패는 알림 하나 + mic-unavailable 갈래면 기기 상태 저장 | 아니오 |
| 퍼 | parent_alerts 종류 값(`mic_unavailable` · `mic_stalled` · `alphabet_sound` · `speaking_placement_listening` · `seed_range_end_near`)과 progress_events 의 target 꼴(`{ area, source }`) | 그대로(C56 (4) 위임, P9 꼴). 1-나 부모 화면이 읽는다 | 아니오 |
| 저 | 화면 검토 기준 — P6c 새 목업(첫 실행 두 판 · 수업 목록 · 배치 시작)이 아직 없다(`docs/media/mockups/` 2026-10-17) | 4절 문구 · 크기 · 한 화면 한 행동과 B_Home4 · B_Sticky · B_LevelTest · B_W3_Order 로 본다. H6 뒤 목업과 다른 곳은 그때 fix. P6c 를 P10 과 나란히 띄우면 차례 7 전에 목업이 온다 | 아니오 |
| 서 | e2e 전용 수업 복제(`cloneLessons`) — 시험용 시드에 없는 3단계 · 변형 2 칸을 1단계 · 변형 1 내용으로 복제해 AC-1b · AC-1c 를 본다 | 그대로(e2e 전용, 개발용 DB 길에는 쓰지 않음). 고른 묶음의 변형 칸이 없으면 가장 낮은 변형으로 연다(P10b 정할 것 — 작은 틀 대비, 운영은 완전성 검사로 늘 있음) | 아니오 |

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 위 '정할 것'에 올리고 컨트롤러가 13절에 한 줄 넣은 뒤 구현한다.
- 설계 숫자는 settings(12절)에서 읽는다(시작 문구의 15 · 넘겨주기의 10 포함). 시험도 `TEST_SETTINGS` · `loadableSettings()` 에서 읽는다. 포트 · 비밀번호 바이트 · 입력 상한 같은 기술 값은 파일 위 이름 붙인 상수다. PIN 6자리 · 묶음 · 아바타는 정본 고정 규칙의 이름 붙인 상수다(check-ids 허용 목록).
- 시각은 한 시계(`@/server/clock` `now()`)에서 읽고 순수 함수에는 인자로 넘긴다. 질의 SQL 안에 `now()` 를 쓰지 않는다(P3a 메모). 학습일은 `learningDayOf(now, app.timezone, app.day_start_hour)`.
- DB 는 서버 Drizzle 로만. 모든 서버 액션의 첫 문장은 `await requireAccess()`(P3b 훑기 시험). 비울 수 있는 jsonb 에 JSON null 을 넣지 않는다. 마이그레이션을 만들지 않는다.
- 녹음하지 않는다(`getUserMedia` · `MediaRecorder` 없음, P2). 인식 글은 배치 채점에만 서버로 보낸다(AI 로 보내지 않음).
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 시험 이름은 모모 · 토리 같은 앱 안 이름만. 접근 코드 · PIN 시험 값은 실행 때 만든다. 개발용 DB 비밀번호 · 접속 문자열을 출력하지 않는다.
- 용어는 영역 · 단계 · 단원 · 활동 · 판 · 칸이다. 코드 식별자와 브랜치 이름은 영어 ASCII.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer · design-reviewer Opus · xhigh, 차례 1 검토 Opus · high). 동시에 셋까지. 커밋 · PR 은 요청자 지시 때만(H14).

### 묶음 plan 과 다르게 한 것

1. 순서: P10(그리고 P11)을 P8 앞으로 당겼다(요청자 2026-10-17 14:1x). 완료 판정에 요청자가 로컬에서 직접 보는 길(차례 8)을 더했다.
2. P10 을 a · b 로 나누고 한 브랜치에서 엇갈려 구현한다(화면을 보는 차례). 묶음 plan 위험 12 의 예(P10a 첫 실행 · 배치, P10b 홈 · 목록 · 세션 틀)와 같은 가름이다.
3. 개발용 로컬 DB 길(`scripts/dev-db.ts` · `pnpm db:dev`)을 P10 첫 작업(가벼운 루프)으로 뒀다 — 장부의 'P7b 브리프 때'를 옮김. P7b 의 '개발용 DB'(Supabase · H3)는 그대로 P7b 다.
4. 답 입력 조각(고르기 · 쓰기 1~3 타일 · 앱 안 영문 자판 · 글 입력 · 따라 말하기)과 앱 채점 답 맞춤 함수를 P10 에 뒀다. 묶음 plan 은 '쓰기 1~3 타일 · 앱 안 영문 자판'을 P11 에 두었으나 배치 평가의 쓰기 문항이 같은 입력을 쓴다.
5. e2e 에 DB 를 붙였다(P3b smoke 기대 · Playwright 설정을 고침).
6. AC-6a 의 Playwright 증명은 P11 로 옮기기를 권한다(P10b 정할 것 — 같은 입력이 있는 활동은 P11 에 생김).
7. 파일 수가 PR 하나 기준을 넘어 검토 묶음으로 나눴다(위험 1).

### 다른 P 에 넘길 것

- P11: 답 입력 조각(`src/components/answer/*`)과 `checkAnswer` 를 세션 활동에 그대로 쓰고 '틀리면 정답을 보여 주고 다시'(3.3)만 더한다. AC-4a 시험은 `checkAnswer` 에 붙인다. 정할 것 차 · 카의 규칙. AI 는 P9 가짜 Anthropic 으로 먼저. P5b 장부의 '소리 자리 저절로 읽기 · 다시 읽기'는 `RepeatAnswer` · `TypingAnswer` 의 읽어 주기 꼴을 따른다.
- P12: 단원 시작 복사본(`unitSnapshotOf` 의 키 · 꼴)과 배치 복사본(`placementSnapshotOf`)을 그대로 읽는다. progress_events target `{ area, source }` 꼴에 자기 source 값을 더한다. 범위 끝 알림의 '진급해 그 단계에 든 경우'는 같은 `rangeEndAlertDue` · `seed_range_end_near` 로.
- P8: 시드 브리프 — 문장 조립 카드는 소문자 그대로 · 마침표 카드 따로(정할 것 차), 배치 문항은 단계마다 placement.items_per_level(3), 말하기 배치 본 문항은 따라 말하기 · 듣고 고르기, 예비 문항은 듣고 고르기.
- 1-나: 부모 화면이 progress_events `source` 로 까닭 문구('배치 평가로 정했어요' · '처음에 부모님이 골랐어요')를 고른다. '마이크 다시 확인'은 `clearMicState()` 를 부른다. 알림 종류 값(정할 것 퍼)을 4절 목록 문구로 보인다. PIN 입력 · 잠금(parent.pin_max_attempts · parent.lock_minutes)은 이 plan 이 만든 parent_auth pin 행을 쓴다.
- P7b: 장부 '개발용 로컬 DB 스크립트' 행은 P10 차례 1 로 옮겨 닫는다(P7b 브리프에서 뺀다). check-ids 허용 목록에 P10 이름 붙인 상수(`PIN_LENGTH` · `TOPIC_BUNDLES` · `AVATARS` · `DEV_DB_PORT` · `E2E_DB_PORT` · 입력 상한)와 까닭. fixture-setting 규칙이 `TEST_SETTINGS` 의 새 키를 12절과 맞댄다.
- P6c: 새 목업 넷(첫 실행 두 판 · 수업 목록 · 배치 시작)이 P10 화면 검토의 기준이다(정할 것 저). 코르크 바탕 색 · 질감 값을 목업과 보드 토큰에서 같게.

### 확인한 사실과 출처(2026-10-17)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | Playwright 1.64.1 의 `webServer` 는 배열을 받고 `wait: { stdout: RegExp }`(이름 붙은 묶음은 환경 변수로) · `gracefulShutdown` · `reuseExistingServer` 를 가진다 | p05b 워크트리 `node_modules/.pnpm/playwright@1.64.1/.../types/test.d.ts` 11096~11170 |
| 2 | Playwright 1.64.1 은 plugin(webServer) 설정을 globalSetup 보다 먼저 하고, 과제를 배열 차례로 하나씩 기다린다 | 같은 꾸러미 `lib/runner/index.js` `createGlobalSetupTasks` · TaskRunner `for (const task of this._tasks)` 6332줄 |
| 3 | next 16.4.2 의 `next/font/google` 은 Google CSS 응답의 글꼴 파일을 모두 내려받아 자체 호스팅하고 `subsets` 는 미리 읽기만 정한다. 글꼴 자료에 Jua 는 subsets latin 만, Gowun Dodum 은 latin · latin-ext · vietnamese, Fredoka 는 가변(wght 300~700) · hebrew · latin · latin-ext | `dist/compiled/@next/font/dist/google/find-font-files-in-css.js` · `loader.js` 101~102줄 · `font-data.json` · 설치판 문서 `dist/docs/01-app/03-api-reference/02-components/font.md` 146~196 |
| 4 | `@node-rs/argon2` 최신 2.2.2(2026-10-06 게시) — P1a 가 이미 설치(`package.json` e08eaba), P3b 가 기본값(Argon2id · OWASP 최소 권고)으로 씀 | `npm view @node-rs/argon2 version` · `time` (2026-10-17) · plan-p03b 값 2 |
| 5 | embedded-postgres 최신 18.4.0-beta.17 이나 저장소는 17.10.0-beta.17 고정(Supabase 판과 맞춤, C55 (1)) | `npm view embedded-postgres version` · `package.json` e08eaba |
| 6 | 스키마: profiles(display_name · english_name · tori_nickname · avatar · topic_bundle text · alphabet_start · notices_seen) · profile_tracks(level · unit 비울 수 있음 · placement_level · chosen_start_level · graduated · next_level_pending, 유일(profile, area)) · level_tests(kind placement · level 비울 수 있음 · round · form · start_revision · settings_snapshot · item_ids · answers · item_scores · total_score · passed · placement_start_level) · sessions(level_test_id 따라 지움 · 부분 유일 진행 하나 · learning_day = 끝낸 학습일) · attempts(client_attempt_id 유일) · parent_auth(pin 부분 유일) | `git show 01ff0a9:src/db/schema/learning.ts` · plan-p03a 값 3 |
| 7 | P7a 읽기 함수 `currentSeedRevision` · `readLessonsOfUnit` · `readLevelSpec` · `readUnitSpec` · `readLevelTestForm` · `readPlacementForm`(행은 Drizzle 형 그대로, 풀기는 부르는 쪽) · 적재 `loadSeed`(files · completeThrough · areas · referenceOnly · dryRun · now) | p07 워크트리 `src/server/seed/read.ts` · plan-p07a 값 3 · 4(커밋 전, 2026-10-17 14:5x) |
| 8 | `loadableSeed()` = `miniSeed({ areas: 넷, through: 1, frame: "small" })` + `loadableSettings()`(작은 틀 45 키 + `TEST_SETTINGS` 가운데 없는 키) + `MODEL_PRICES_FIXTURE`. miniSeed 는 through 1 만 만든다. 배치는 1~12단계 · 단계마다 placement.items_per_level(작은 틀 1) — 읽기 그림 고르기 · 쓰기 copy-tiles · 말하기 본 · 예비 모두 듣고 고르기(그림). 작은 틀은 seed.topic_variants 1 · 단원 단어 4 · 정규 3 · 보강 1 | p07 워크트리 `tests/fixtures/seed/loadable.ts` · `builders.ts` 168~265 · 2780~2880줄 |
| 9 | 풀이 검사 대상 꼴은 읽기 문항 · 쓰기 갈래 · fill-blank · fix-sentence · listening — repeat 는 아니다 | `git show e08eaba:src/core/seed/validate.ts` 224~265줄 |
| 10 | P2b 접점 `SpeechPort`(device · unlockFromGesture · speak · listen · checkMicrophone), 끊긴 마이크 확인은 `interrupted-<까닭>` 코드로 실패 꼴 — 결과 꼴은 P10 이 정함. P2a `describeDevice` 판정 ok · no-api · not-listed · insecure | plan-p02 값 3 · 6 · 7 · 완료 보고 P2b |
| 11 | P3b `requireAccess` · `hasValidAccess` · proxy(쿠키 없는 페이지 → /access 다시 쓰기) · e2e `addAccessCookie` · `tests/e2e/fixtures.ts` 의 `test`(가짜 음성 + 쿠키). 메모 — 훑기가 requireAccess 의 가져온 곳은 안 봄(P10 때) | plan-p03b 값 4 · 5 · 12 · 완료 보고 |
| 12 | P3a 메모 — 한 시계 정적 검사를 서버 컴포넌트까지 넓히는 일은 P10 브리프에(P3a 정할 것 아) · JSON null 금지 · SQL 안 now() 금지 | plan-p03a 컨트롤러 결정 · 완료 보고 |
| 13 | P5b 컴포넌트 `CHILD_SIZE` · `AREA_TONE`(hex 넷) · `ActivityCard`(className 으로 덮음) · `NewWordsPreview` · `VocabPicture`(보기 화면은 fs 로 파일 존재를 봄) · `ReadingTestItem` · `WritingItem` · `ListeningItem` · `RepeatItem` | p05b 워크트리 `src/components/activities/common.tsx` 1~200 · plan-p05b 활동 표시 표 |
| 14 | P9a `createAlertOnce(db, { kind, profileId, thresholdKey, learningDay, value, createdAt, once: "day" \| "key" })` — 자문 잠금으로 한 번만 | `git show 01ff0a9:src/server/ai/store.ts` 158~219줄 |
| 15 | 목업: 글꼴 Jua · Gowun Dodum · Fredoka, 색 #FFE566 · #9FD8FF · #FFB3C7 · #C9F2B2 · 종이 #FFFDF7 · 글 #2B2B2B, 홈 제목 '모모의 공부 보드' · '오늘 다 했어요', 아바타는 이름 첫 글자 동그라미(B_Profile), 문장 조립 '처음부터' · '다 놓았어요' · '대문자 카드와 마침표 카드도 자리가'(B_W3_Order), 평가 '다음'(B_LevelTest). P6c 새 목업은 아직 없음 | `docs/media/mockups/*.dc.html`(ls · 글 뽑기 2026-10-17) |
| 16 | 국어의 로마자 표기법 제3장 제4항 — 인명은 성과 이름 순서로 띄어 쓰고 이름은 붙여 쓰며, 이름에서 일어나는 음운 변화는 표기에 반영하지 않는다(한복남 Han Boknam · 홍빛나 Hong Bitna) | 국립국어원 https://korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0004 (검색 발췌 2026-10-17) |
| 17 | 컨트롤러 스크래치패드 `devdb/dev-pg.mts` — 포트 54329 · persistent · 역할 셋 · momo_dev · 기본 권한 · migrate · settings 가 비면 `TEST_SETTINGS` · 접속 문자열을 0600 파일로. p05b 워크트리 `.env.local` 에 ACCESS_CODE_HASH · SEED_VIEWER_ROOT · DATABASE_URL 이름이 있다(값은 읽지 않음) | 스크래치패드 파일 · `grep -oE '^[A-Z_]+='`(2026-10-17) |

(추측): `wait.stdout` 이 `stdout: "ignore"` 기본에서도 출력을 읽는다(아니면 `stdout: "pipe"`), embedded-postgres 가 GitHub linux 러너에서 e2e 와 함께 도는 것(P3a 가 H15 뒤 통합으로 먼저 증명), 구현자 격리 환경에서 Google Fonts 내려받기가 되는 것(위험 5), 한국어 글꼴 조각 수 · 크기가 빌드 시간을 크게 늘리지 않는 것.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-1a(P10 몫) | e2e "AC-1a 접근 쿠키 없이 홈을 열면 접근 코드 화면이 나오고 맞는 코드를 넣으면 첫 실행 화면으로 가며, 첫 실행은 PIN 6자리를 두 번 같게 넣어야 다음으로 넘어간다" + 통합 "AC-1a 첫 실행 저장은 PIN 이 6자리 숫자가 아니면 거부되고 PIN 은 argon2id 해시로 parent_auth 한 행에 남는다" | `tests/e2e/first-run.spec.ts` · `tests/integration/first-run.test.ts` |
| AC-1b(P10a 몫) | e2e "AC-1b 첫 실행에서 읽기 시작 단계를 3으로 고르면 읽기 카드는 배치 평가 없이 읽기 3단계 단원 1의 수업 1로 열리고 고르지 않은 쓰기 · 말하기 카드는 배치 평가로 열린다"(차례 7, `cloneLessons` · seed.complete_through_level 6). 'AI 호출 0회'는 P10b 통합 | `first-run.spec.ts` |
| AC-1c | e2e "AC-1c 첫 실행은 PIN → 이름 → 아바타 → 알파벳 → 주제 묶음 → 시작 단계 → 음성 인식 안내 → 넘겨주기 순서로 한 화면에 하나씩 넘어간다" · "AC-1c 한글 이름을 넣으면 영어 이름 칸이 로마자로 먼저 채워지고 홈에는 한글 이름이 보인다" · "AC-1c 고른 관심 주제 묶음의 주제 변형 수업이 열린다"(차례 7) · "AC-1c 두 번째 기기는 접근 코드 뒤 첫 실행 없이 홈으로 간다" · "AC-1c 음성 인식 안내의 '마이크 확인'이 실패해도 다음 화면으로 넘어가고 부모 알림이 하나 생긴다" · "AC-1c 시작 단계 화면에는 1~seed.complete_through_level 단계만 보이고 회화를 5단계로 고르면 회화는 5단계에서 시작한다" · "AC-1c 영어 이름 칸에 vocab 의 낱말을 넣으면 '토리가 부를 다른 영어 이름(별명)을 골라 주세요'가 보이고 다른 이름을 받는다" + 단위 "AC-1c 로마자: 이름의 음운 변화를 반영하지 않고(한복남 → Boknam · 홍빛나 → Bitna) 세 글자 · 두 글자 성 넉 자 이름은 성을 뺀다" + 통합 "AC-1c 회화를 5단계로 고르면 회화 트랙은 5단계 단원 1이고 talk.placement_cap 을 쓰지 않는다" | `first-run.spec.ts` · `tests/unit/first-run.test.ts` · `first-run.test.ts` |
| AC-11a | 단위 "AC-11a 배치: 3단계 3/3 → 5단계 2/3 → 6단계 1/3 이면 넘은 최고 단계는 5, 시작은 4다" · "AC-11a 배치: 한 단계에서 처음 두 문항을 틀리거나 몰라요로 넘기면 셋째 문항 없이 그 단계를 못 넘음으로 둔다" · "AC-11a 배치: 1단계도 못 넘으면 시작 1과 알파벳 처리가 나온다" · "AC-11a 배치: 두 단계 뛴 뒤 못 넘으면 건너뛴 단계를 보고 넘은 단계 바로 위에서 못 넘거나 placement.items_per_area 문항이면 끝난다" · "AC-11a 배치: 시작 단계는 seed.complete_through_level 을 넘지 않고 기본 설정의 가장 높은 시작은 10 이다" · "AC-11a 배치: 단계마다 문항 하나(작은 틀)여도 다 맞히면 두 단계 · 틀리면 못 넘음으로 끝까지 돈다" | `tests/unit/placement.test.ts` |
| AC-11b | e2e "AC-11b 말하기 배치를 끝내면 결과 화면에 '말하기는 n단계에서 시작해요' · '이제 토리를 만날 수 있어요'와 '수업 고르러 가기'만 보이고 회화 카드가 열리며 회화는 n 과 talk.placement_cap 가운데 낮은 단계다" + 통합 "AC-11b 부모가 말하기만 시작 단계를 고르면 회화는 고른 단계와 talk.placement_cap 가운데 낮은 값에서 시작한다" · "AC-11b 말하기 배치 결과가 회화 트랙을 n 과 상한 가운데 낮은 단계 단원 1로 넣는다" | `tests/e2e/placement.spec.ts` · `first-run.test.ts` · `tests/integration/placement.test.ts` |
| AC-11c · AC-5e(배치 몫) | e2e "AC-11c 따라 말하기 문항에서 첫 시도 일치율 0.6 · 둘째 0.85 면 맞음이고 첫 시도 뒤에는 인식 글 없이 '한 번 더 말해 볼까요?'만 보인다" · "AC-11c · AC-5e 한 문항 인식이 두 시도를 합쳐 3회 실패하면 남은 따라 말하기 자리에 예비 문항이 나오고 결과에 '말하기 일부는 듣기로 봤어요'가 붙는다" · "AC-11c 마이크를 쓸 수 없는 기기에서는 말하기 배치가 시작되지 않고 읽기 · 쓰기 배치는 그대로 된다" + 단위 "AC-11c 배치: 두 시도 가운데 높은 일치율이 placement.repeat_pass 이상이면 맞음이다" · "AC-11c 배치: 실패 3회 뒤 그 문항과 남은 따라 말하기 자리는 같은 단계 예비 문항이다" | `placement.spec.ts` · `placement.test.ts` |
| AC-11d | e2e "AC-11d 배치 평가 시작 화면에 안내 문구가 보이고 문제마다 '몰라요'가 있으며 몰라요는 틀림으로 센다" · "AC-11d 배치 평가를 하다 멈추고 24시간 뒤 카드를 누르면 멈춘 문항부터 이어진다"(`shiftTimes`) + 단위 "AC-11d 배치: 답 기록만으로 멈춘 문항을 다시 낸다" + 통합 "AC-11d 진행 중 배치 평가는 session.resume_hours 가 지나도 닫히지 않고 같은 시도 id 는 한 번만 저장된다" | `placement.spec.ts` · `placement.test.ts` · `placement.test.ts`(통합) |
| 앱 채점(AC 접두 없음 — AC-4a 는 P11) | 단위 "답 맞춤: 고르기 · 타일 · 카드(문장 부호 카드 붙임) · 쓴 답(공백 · 따옴표만 맞춤) · 따라 말하기 · 몰라요" | `tests/unit/answer-check.test.ts` |
| 개발용 길(AC 접두 없음) | 단위 "개발용 시드 나무: 완전성 1단계 · 영역 셋에서 검증 오류 0 이고 말하기 배치 본 문항은 따라 말하기다" · "개발용 DB: `.env.local` 은 비었거나 로컬 주소일 때만 고친다" + 실기 `pnpm db:dev` 처음 · 다시 · `--reset` 출력(값 없음) | `tests/unit/dev-tree.test.ts` · 작업 1 |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm e2e` · `pnpm e2e:local` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test −6: AC-1b · 1c · 11a · 11b · 11c · 11d) · `pnpm check:bundle` 초록, 비밀값 grep 0건 · design-reviewer 보고(심각도 · 근거, 세로 820 · 가로 1180 사진). CI `ci / lint · build · unit · integration · e2e · depcruise · spec-trace · bundle-secrets`(H15 뒤) | 작업 8 |

시험 이름은 글자 그대로 적는다(spec-trace 가 이름 맨 앞 AC 토큰을 센다). 시험 안의 숫자는 시험용 설정 · 시드에서 읽는다.

## 완료 보고 (Done)

구현 뒤 채운다.
