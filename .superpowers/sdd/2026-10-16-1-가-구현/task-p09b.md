# 브리프: P9b AI 호출 넷(implementer impl-p09a 이어 하기, 2026-10-17 00:5x)

역할: implementer(Opus · high). plan-p09b 가 정한 파일 열둘(새 11 · 고침 1)만 만들고 고친다. 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 검토는 하지 않는다(code-reviewer 가 따로). 하위 에이전트 · 커밋 없음. 실제 API 호출 없음(키도 없음). 비밀값 · 아이 이름 없음(견본 이름은 지어낸 `가나다` · `Ganada`, 전화번호는 견본 꼴 `010-1234-5678`).

## 자리
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(브랜치 feature/1a-p09b-ai-calls, 바탕 P9a 01ff0a9). 모든 파일은 여기에.
- 정본 · plan 은 메인 저장소 `/Users/hikaru/workspace/momo-english-academy/` 에서 읽는다: plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09b-AI-호출-넷.md`(approved, 머리 '컨트롤러 결정' — 정할 것 가~사 판정은 plan-p09a '컨트롤러 결정' 문단), `plan-p09a-AI-호출-바탕.md` 확인한 사실 1~12 · 완료 보고(실제 이름 — `AI_PURPOSES` · `requestConfigOf` · `AiRequestConfig` · `STRUCTURED_OUTPUTS_BETA` · `PriceBook` 등은 P9a 코드 그대로), 13절 C63(4) 출력 검사 세부 · 안전한 대사 · (5) 가림 세부, 정본 6.1 · 6.2(`specs/05-AI-호출.md`) · 6.4 끝 문단(`specs/06-시드-생성.md`) · 3.3 · 3.6(`specs/02-2-세션과-단계표.md`) · 4절 말투(`specs/03-화면.md`) · 12절 writing.*(`specs/09-설정값.md`), 목업 `docs/media/mockups/B_Writing2.dc.html` · `B_Writing3.dc.html`(해요체 문구).
- 명령은 워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(plan 의 `source ~/.nvm/nvm.sh …` 는 이 꼴로 읽는다). 한글 경로는 명령 인자로 넘기지 않고(`pnpm spec:trace` 는 인자 없이) 보고는 Write 도구로. 도구 층이 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다.

## 먼저 읽을 것
1. plan-p09b 전부 — 바뀌는 파일 · 파일별 값 1~9(structure.ts 'AI 출력 꼴' 절 · mask · output-check · calls/common · writing · speaking · thinkout · request · sample-inputs) · 작업 순서 1~8 · 위험 · 정할 것 가~사 · 증명 표(시험 이름).
2. P9a 코드(이 워크트리): `src/core/ai/combo.ts`(AI_PURPOSES · requestConfigOf · AiRequestConfig · STRUCTURED_OUTPUTS_BETA) · `cost.ts`(MessageLike 꼴) · `tests/fixtures/settings.ts`(TEST_SETTINGS · testSettingValues) · `tests/fixtures/ai/fake-anthropic.ts`(messageBody — 규격 제목으로 목적을 알아봄). P4a `src/core/seed/text.ts`(forbiddenHits · splitSentences · sentenceWords · isEnglishSentence) · `structure.ts`(PLACEHOLDER_NAME · 상수 원칙) · `schema/reference.ts`(ForbiddenFileSchema · 패턴 category) · `schema/lesson.ts`(SpeakingLevelSpec 등 규격 타입).
3. 검토 `review-p09a.md` 8절 'P9c 에 넘길 메모' 일곱 — P9b 에 닿는 것이 있으면 적용하고 보고에 적는다(대부분 P9c 몫).

## 만들 것(plan 작업 순서 1~8 의 1~7 + 8 (가))
1. `src/core/seed/structure.ts` 끝에 'AI 출력 꼴' 절(값 1 상수 아홉, 파일 끝에 새 절로 붙인다 — 병합 충돌 피함) · `tests/fixtures/ai/sample-inputs.ts`(값 9: 단계 맥락 3 · 4 · 5 · 6 · 9 · 10 과 호출마다 견본 입력 · 관찰용 변형 다섯). 완료: `pnpm build` · `pnpm check:deps`.
2. 가림(시험 먼저): `tests/unit/mask.test.ts` → `src/core/ai/mask.ts`(값 2: CONTACT_MASK · TWO_SYLLABLE_SURNAMES · BUILTIN_CONTACT_PATTERNS · nameVariantsOf · createMasker · fillName — 영어 변형은 글자 사이 공백 · 하이픈 · 대소문자 허용, 뒤보기 없이, 앞뒤 영문자 아닐 때만; 한글은 글 그대로; 연락처는 앱 정규식 + 시드 contact).
3. 출력 검사 · 공통(시험 먼저): `tests/unit/normalize.test.ts` '6.4 출력 검사' 묶음 → `src/core/ai/output-check.ts`(값 3) · `src/core/ai/calls/common.ts`(값 4: LevelContext · CallSpec · COMMON_FIXED_RULES · SAFE_LINE_KO "좋아요, 다음으로 가 볼까요?" · answerTextOf · prepareAnswer · firstLine · firstSentence · buildSystem).
4. 쓰기 둘(시험 먼저): AC-4b 와 걸린 칸 바꾸기 → `src/core/ai/calls/writing.ts`(값 5 두 규격).
5. 말하기 셋(시험 먼저): AC-5d 와 발표 예비 질문 → `src/core/ai/calls/speaking.ts`(값 6: speakingRulesOf · answer · presentation · confirm).
6. 생각 꺼내기(시험 먼저): → `src/core/ai/calls/thinkout.ts`(값 7, multiTurn 캐시 · historyEntry).
7. 요청 본문(시험 먼저): `tests/unit/ai-request.test.ts` 와 AC-N4 → `src/core/ai/request.ts`(값 8 `buildAiRequest` — output_config.format 은 넣지 않는다, betas 에 STRUCTURED_OUTPUTS_BETA).
8. (가) 마무리: `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, `grep -rn "sk-ant-" src tests` 이 작업 파일 0건. 완료: spec-trace missing-test 가 바탕(54)보다 2 적다(AC-4b · AC-5d).
하지 않는 것: P9c 파일(흐름 · 공개 함수 · 계약 · 관찰), 공용 파일 수정, 실제 호출, 정본 · plan 수정, 회화 턴 · 끝맺음 턴 규격(1-나, 자리만).

## 지킬 것
- 시험 이름은 plan 증명 표 글자 그대로(spec-trace 가 AC-4b · AC-5d · AC-N4 를 센다). 숫자 · 글은 `TEST_SETTINGS` · P4a 견본 · `structure.ts` 상수 · level_specs 견본에서 읽는다.
- `src/core/ai` 는 순수 — 시각 · DB · Next · SDK 를 가져오지 않는다(core-no-framework · sdk-only-in-ai). SDK 응답 형은 구조로 받는다.
- 아이에게 보이는 AI 한국어는 해요체(plan 정할 것 라), 지시문은 영어(사). 걸린 칸 바꾸기 · 길이 규칙은 C63 (4) 그대로. 가림 세부는 C63 (5). 생각 꺼내기 단어 정규화는 정할 것 마, 쓰기 확인 문장 판정 수는 정할 것 바.
- 코드 식별자 영어, 주석 · 보고 한국어(용어: 영역 · 단계 · 단원 · 활동 · 호출 · 턴).

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p09b-report.md`(워크트리, Write 도구): 상태 · 바뀐 파일 · 시험 수(단위 200 · 통합 30 → 새 수) · 작업 8 (가) 명령과 출력 첫 줄 · 계획과 다르게 한 것 · 남긴 것 · 검토자에게 알릴 것. 마지막 메시지는 상태(DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED) + 요약 한 줄.
