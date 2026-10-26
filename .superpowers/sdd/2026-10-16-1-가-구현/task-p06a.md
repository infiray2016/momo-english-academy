# 브리프: P6a 규격 파일(시드 확정) — 묶음 0(학습 설계자 cd-p06a, 2026-10-16 23:1x)

역할: curriculum-designer(Opus · xhigh). 아래 파일만 만들고, 앱 코드 · 시험 · 정본 · 공용 파일은 고치지 않는다. 하위 에이전트를 띄우지 않고 커밋하지 않는다. 비밀값 · 아이 이름을 어디에도 적지 않는다(예문의 이름은 Tori · Momo 또는 흔한 영어 이름).

## 자리
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(브랜치 feature/1a-p06a-seed-reference, 바탕 P4c 6bd6015, node_modules 있음, biome 에 `!seed/**/*.json` 됨). 만드는 파일은 모두 여기에 쓴다.
- 정본과 plan 은 메인 저장소에서 읽는다(워크트리의 `specs/` 는 낡아 C55~C61 이 없다): 정본 `/Users/hikaru/workspace/momo-english-academy/specs/*.md`, plan `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/plan-p06a-규격-파일.md`(approved 23:0x — 머리의 '컨트롤러 결정' 문단까지 읽는다), 13절 C54 · C58 · C60 · C61(`specs/10-결정-기록.md`).
- 명령은 워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(서브에이전트 환경이 `source ~/.nvm/nvm.sh` 를 막는다). 한글 경로를 명령 인자로 넘기지 않는다 — 장부 폴더 이름이 한글이므로 보고 파일은 Write 도구로 쓴다. 도구 층이 `\uXXXX` 를 글자로 바꾸므로 정규식은 글자 그대로 쓰거나 바이트로 확인한다.
- 임시 조각 · 후보 낱말 모음 · 일회 검사 스크립트는 `tests/.tmp/p06/`(.gitignore 에 든 자리)에. `seed/` 아래에는 규격 파일 열만 둔다(검증기 `path` 오류).

## 먼저 읽을 것(순서)
1. 메인 저장소 `.claude/CLAUDE.md`.
2. plan-p06a 전부 — 특히 '어휘 시드 구성'(C61 (1)) · '파일별 값' · 'H5 제안' · '작업 순서' 머리의 필터 명령 · '위험' · 'P6 에 넘어온 메모' · '확인한 사실과 출처'.
3. 정본 3.1 · 3.2 · 3.3 · 3.4 · 3.6(`02-1` · `02-2` · `02-3`), 5절 시드 테이블(`04-데이터`), 6.1 · 6.6(`05-AI-호출`), 6.3 · 6.4(`06-시드-생성`), 12절 전부(`09-설정값`), 13절 C49~C61.
4. 워크트리의 P4 규격 `src/core/seed/schema/reference.ts` · `structure.ts` · 견본 `tests/fixtures/seed/builders.ts`(READING_TABLE · WRITING_TABLE · SPEAKING_TABLE · TALK_TABLE · levelSpecRows) · `scripts/seed-validate.ts`(`--json` 꼴).

## 이번 묶음(plan 작업 순서 2 = 묶음 0)
만들 것 — 값은 plan '파일별 값' 그대로:
- `seed/settings.json`: 12절 키 전부(약 180행, 12절 밖 키 없음). H5 키(`unit.vocab_count` · `unit.new_words_per_lesson` · `unit.regular_lessons` · `unit.min_lessons` · `unit.min_days` · `unit.max_remedial` · `seed.remedial_per_unit` · `seed.topic_variants` 의 구간 값, `speaking.answer_max_seconds.<구간>`)는 12절 잠정 값 · 제안 값으로 넣고 근거 문서에 '잠정'이라 적는다. `profile.start_level.<영역>` 행은 두지 않는다(C61 (2)).
- `seed/level-specs.json` 48행(can-do 48 포함). `testMix` · `frame` 은 H5 제안 값으로 잠정(H5 뒤 고친다).
- `seed/model-prices.json` 여섯 행(plan 표 그대로. `thinkingDefault` 는 전부 adaptive — Opus 4.8 메모는 근거 문서에).
- `seed/images.json` 은 `{ "images": [] }`, `seed/vocab.json` 은 `{ "vocab": [] }`, `seed/unit-specs.json` 은 `{ "unitSpecs": [] }` — 빈 목록으로 두어 검증기가 끝까지 돌게 한다(묶음 1 부터 채운다. 뿌리 키 이름은 reference.ts 로 확인).
- `seed/lists/homophones.json` · `forbidden.json` · `meta-sentences.json` 완성. `forms.json` 은 뼈대 — 3.6 요소 120 의 id · `introducedAt` 전부, 검출기(words · 정규식)는 1~3단계 도입 요소까지(나머지는 묶음마다). 맞아야 할 · 안 맞아야 할 시험 문장은 근거 문서에.
- `docs/research/2026-10-16-seed-reference-basis.md`: (1) 어휘 출처와 단계 정하기(출처 표시 수 표 · 기능어 목록과 단계 · 알파벳 대표 낱말 26 안팎), (2) can-do 48 근거(성취기준 코드 · CEFR 척도), (3) 단원 주제 · 학습 요소 표(1~12단계 초안), (6) H5 제안서 — plan 'H5 제안' 1~7 항목 전부, 갈림길(1~3구간 단원 단어 25 대 30)은 두 안의 결과(누계 · 관계 표 · 시드 수 · 하루 분량)를 나란히 두고 권하는 안과 까닭을 적는다, (7) level_specs 를 견본에서 고친 곳, (8) 일회 검사 결과(설정값 12절 대조: 12절 표를 펼친 키 모음 = settings.json 키 모음(profile.start_level 넷 빼고), 값 = 기본값(H5 키 · answer_max_seconds 빼고)).
- 단계마다 후보 낱말 모음(순위 매김 — 25 · 30 어느 쪽이든 앞에서부터 고를 수 있게) → `tests/.tmp/p06/candidates-<단계>.json`(저장소에 남지 않음) + 근거 문서 (1)에 수 표.

완료 판정: 필터 명령(plan 작업 순서 머리의 jq 두 줄)에서 `reference-complete` 와 빈 vocab · unit-specs 때문에 나는 오류를 뺀 나머지가 0, 설정값 12절 대조 일회 검사 0, `pnpm lint` 0(seed JSON 은 biome 밖), `pnpm test` 가 바탕과 같음(159).
하지 않는 것: vocab · unit_specs 본문(묶음 1 부터, H5 뒤), 그림(P6b), 코드 · 시험 · 정본 · 공용 파일 수정, 새 규격 칸(모르는 키는 규격이 거부한다).

## 지킬 것
- plan 의 '어휘 시드 구성' · '파일별 값' · 'P6 에 넘어온 메모'를 그대로 따른다. 숫자는 12절 키 · level_specs 칸 · `structure.ts` 상수 밖에 두지 않는다. H5 값은 '확정'이라 적지 않는다.
- 쓰기 1~3단계에 문장 생산 과제를 넣지 않는다. 횟수로 단원 통과를 적지 않는다(can-do 에도). 1~3단계 회화 can-do 에 '보이는 영어를 읽는다'를 쓰지 않는다. can-do 의 숫자는 그 단계 규격 JSON 에 있는 숫자만(`can-do-numbers` 경고 0).
- JSON 은 UTF-8 · 두 칸 들여쓰기 · 긴 배열은 항목 하나 한 줄. 수는 JSON 수, JSON null 을 뜻으로 쓰지 않는다. 영어 값은 C54 (3) · C60 그대로.
- 외부 사실은 출처 · 판 · 날짜를 근거 문서에. 확인 못 한 것은 (추측). 2022 기본 어휘 목록의 출처 표시(`*` · `**`)를 낱말마다 남긴다.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p06a-report.md`(워크트리, Write 도구): 상태 · 만든 파일과 건수 · 필터 명령과 일회 검사의 명령 · 출력 첫 줄 · 3.3 · 6.3 · 12절과 대조한 결과 · 견본에서 고친 곳 · 근거가 약한 항목 · H5 제안서 요지(갈림길 · 권하는 값 · 까닭 세 줄) · 결정이 필요한 것. 마지막 메시지는 상태(DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED) + 요약 한 줄 + H5 권하는 값 한 줄. 묶음 1~4 는 컨트롤러가 H5 확인 값과 함께 SendMessage 로 이어 지시한다.
