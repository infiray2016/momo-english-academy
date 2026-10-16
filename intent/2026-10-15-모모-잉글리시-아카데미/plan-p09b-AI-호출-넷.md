# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P9b AI 호출 넷(입력 가림 · 프롬프트 · 응답 규격 · 정규화 · 실시간 출력 검사)

spec: `specs/` 정본(6.1 프롬프트 고정부 · 가변부 · 이름 바꾸기 · 가림 · 프롬프트 캐시 · 정규화, 6.2 호출 목록의 쓰기 확인 · 쓰기 첨삭 · 말하기 평가 · 생각 꺼내기, 6.4 끝 문단 실시간 출력 검사, 3.3 쓰기 · 말하기 단계표, 3.6 문장 길이 상한, 4절 말투, 12절 writing.*, 15절 AC-4b · AC-5d · AC-N4, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P9 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved
승인: 컨트롤러 2026-10-16 23:4x(C63, P9a '컨트롤러 결정') · 브랜치 · 워크트리: `feature/1a-p09b-ai-calls`(P9a 브랜치 끝에서, P9 워크트리) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P9 셋 가운데 둘째다. 첫째 `plan-p09a-AI-호출-바탕.md`(요청 구성 · 서버 클라이언트 · 실패 분류 · 비용 · 기록 · 가짜 클라이언트)가 끝난 브랜치 끝에서 시작하고, 셋째 `plan-p09c-AI-흐름-계약.md`(호출 앞 판정 · 비용 알림 판정 · 실행 흐름 · 공개 함수 · AI 계약 · 관찰표)가 이 plan 끝에서 시작한다. SDK · 문서에서 확인한 사실은 P9a '확인한 사실과 출처'(번호로 가리킨다)에 있다.
이 plan 은 모두 순수 함수(`src/core`)다. DB · 현재 시각 · SDK 를 가져오지 않는다(의존 규칙 core-no-framework · sdk-only-in-ai). 그래서 P9c 의 서버 흐름과 `tsx` 스크립트(계약 · 관찰)가 같은 코드를 쓴다.

컨트롤러 결정(2026-10-16 23:4x): 승인. 정할 것 가~사의 판정은 `plan-p09a-AI-호출-바탕.md` '컨트롤러 결정' 문단(가는 C63 (4), 나는 C63 (5)). P9a 끝에서 같은 워크트리 · 같은 구현자가 이어 한다. 명령은 `PATH=… pnpm …` 꼴(P9a 메모).

## 목표 (Goal)

- 호출 넷의 규격(호출 규격 하나 = 입력 형 · 프롬프트 · 엄격 · 느슨한 응답 규격 · 다듬기 · 검증 · 정규화 · 출력 검사 · 걸린 칸 바꾸기)을 정한다. 쓰기 확인(4~5단계) · 쓰기 첨삭(6단계부터, 단계 평가의 쓰기 과제도) · 말하기 평가(3단계부터, 질문 답 · 발표 · 확인 질문 답 셋, 단계 평가의 말하기 과제도) · 생각 꺼내기(6단계부터, 턴마다)다(6.2). 회화 턴 · 끝맺음 턴 · 확인 호출의 규격은 1-나다(규격 자리만 — P9a 의 `AI_PURPOSES` · 조합 함수).
- 시스템 프롬프트는 고정부와 가변부로 나눈다(6.1). 고정부는 영역 규칙 · 아동용 내용 기준 · '설명은 한국어' · 개인 식별 정보를 묻지 않고 아이가 쓰면 되묻지 않고 넘어감, 호출별 규칙(생각 꺼내기는 생각을 그 단계 학습 요소 범위로 쓸 수 있게 좁히는 질문, 쓰기 확인 · 첨삭은 이번 · 이전 단원 학습 요소에서 먼저, 말하기 평가는 인식 오류로 보이는 부분을 판정 · 지적의 근거로 쓰지 않음)이다. 가변부는 단계 can-do · 단원 어휘와 학습 요소 · 이번 시드 수업이다.
- 아이 이름은 보내지 않는다. 아이 입력 · 인식 글 · 대화 기록을 보내기 전에 한글 이름 · 영어 이름 · 대소문자 · 띄어쓰기 변형 · 성을 뺀 이름을 `{NAME}` 으로 바꾸고, 전화번호 · 주소 형태를 가린다(6.1, AC-N4). vocab 단어와 같은 이름 변형은 이름 묻기 턴(1-나 회화)에서만 바꾸므로 1-가 호출에서는 바꾸지 않는다(6.1 끝 문장).
- 응답은 Zod 로 검증하고 정규화한다(6.1). 구조화 출력은 개수 · 길이 · 범위 · 열거값을 문법에 싣지 않으므로(P9a 확인한 사실 7 · 8) 정규화가 그 제약을 맡는다 — 개수 초과분은 앞에서부터 잘라 쓰고 범위 밖 점수는 범위 안으로 자른다. 고칠 곳 1개 · 교정 writing.max_corrections 개 · 생각 꺼내기 보기 3개 · 말하기 발표 확인 질문 수(3.3, level_specs) · 말하기 3단계 문법 지적은 지움(AC-4b · AC-5d).
- 실시간 출력에도 길이 · 금지어 목록 · 개인 정보 질문 패턴 검사를 하고, 걸리면 미리 정한 안전한 대사로 바꾼다(6.4 끝 문단). 칸마다 바꾸는 법은 정할 것 가.
- 완료 판정: 단위 시험이 호출 넷의 요청 본문 · 정규화 · 출력 검사 · 가림을 증명한다(AC-4b · AC-5d · AC-N4). 실제 응답 표본으로 보는 계약은 P9c 의 H4 뒤다.

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 열둘이다(새 파일 열하나 · 고치는 파일 하나, 시험 파일 셋 포함). 공용 파일은 고치지 않는다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/structure.ts` | 수정 | 끝에 'AI 출력 꼴' 절(C54 (2) 한 곳 원칙, 파일별 값 1) |
| `src/core/ai/mask.ts` | 신규 | 이름 변형 · 가림 · 화면용 이름 채우기(값 2) |
| `src/core/ai/output-check.ts` | 신규 | 실시간 출력 검사(금지어 · 개인 정보 질문 · 연락처 · 영어 문장 길이, 값 3) |
| `src/core/ai/calls/common.ts` | 신규 | 호출 규격 꼴 · 단계 맥락 · 공통 고정부 · 응답 글 꺼내기 · 다듬기 · 한 줄 · 한 문장 · 안전한 대사(값 4) |
| `src/core/ai/calls/writing.ts` | 신규 | 쓰기 확인 · 쓰기 첨삭 규격(값 5) |
| `src/core/ai/calls/speaking.ts` | 신규 | 말하기 평가 셋(질문 답 · 발표 · 확인 질문 답)과 단계 규칙 읽기(값 6) |
| `src/core/ai/calls/thinkout.ts` | 신규 | 생각 꺼내기 규격(여러 턴 · 캐시, 값 7) |
| `src/core/ai/request.ts` | 신규 | 요청 본문 만들기(조합 구성 + 규격 + 가림, 값 8) |
| `tests/fixtures/ai/sample-inputs.ts` | 신규 | 호출마다 견본 입력 · 단계 맥락 · 지어낸 이름(값 9). P9c 의 계약 · 관찰 명령도 쓴다 |
| `tests/unit/normalize.test.ts` | 신규 | AC-4b · AC-5d · 정규화 · 출력 검사 · 걸린 칸 바꾸기 |
| `tests/unit/mask.test.ts` | 신규 | AC-N4 · 이름 변형 · 가림 |
| `tests/unit/ai-request.test.ts` | 신규 | 요청 본문(네 호출) |

### 파일별 값(구현자가 옮겨 쓸 것)

1. `src/core/seed/structure.ts` 끝에 더할 절. 정본 절 주석을 단다. P7 check-ids 는 이 파일을 허용 목록으로 본다(C54 (2)).

```ts
// ── AI 출력 꼴(6.2 · 3.3, C54 (2)) ────────────────────────────────

/** 6.2 쓰기 확인: 고칠 곳 최대 1개. */
export const WRITING_CHECK_FIX_MAX = 1;
/** 6.2 쓰기 확인: 헷갈리는 보기 1~2개(3.3 '보기 2~3개' = 바른 표현 + 이것). */
export const WRITING_CHECK_DISTRACTORS = { min: 1, max: 2 } as const;
/** 3.3 · 6.2 채점표 세 항목(과제 충족 · 문법 · 어휘). */
export const RUBRIC_ITEMS = ["task", "grammar", "vocabulary"] as const;
/** 6.2 채점표 · 말하기 내용 · 문법 점수 범위(1~4). */
export const AI_SCORE = { min: 1, max: 4 } as const;
/** 6.2 말하기 평가 판정(맞음 · 부분 · 다시). */
export const SPEAKING_JUDGEMENTS = ["correct", "partial", "retry"] as const;
/** 6.2 말하기 4~8단계 문법 지적 최대 1개. */
export const SPEAKING_GRAMMAR_NOTE_MAX = 1;
/** 6.2 · 3.3 생각 꺼내기: 보기 3개 · 쓰기에 쓸 영어 단어 4~6개 · 문장 시작 틀 2개. */
export const THINKOUT_OPTIONS = 3;
export const THINKOUT_WORDS = { min: 4, max: 6 } as const;
export const THINKOUT_STARTERS = 2;
```

2. `src/core/ai/mask.ts`. `{NAME}` 은 P4a `PLACEHOLDER_NAME` 을 가져다 쓴다.

| 이름 | 무엇 · 규칙 | 정본 |
|---|---|---|
| `CONTACT_MASK` | `"***"` — 가린 연락처 자리(정할 것 나) | 6.1 '가린다' |
| `TWO_SYLLABLE_SURNAMES` | `["남궁", "황보", "제갈", "선우", "독고", "사공", "서문"]`(넉 자 한글 이름의 두 글자 성을 알아보는 목록, 언어 사실이라 설정값 아님) | 6.1 '성을 뺀 이름' |
| `BUILTIN_CONTACT_PATTERNS` | 앱에 둔 최소 정규식: 휴대 · 지역 전화번호(`0` 으로 시작하는 2~3자리 · 3~4자리 · 4자리, 사이에 `-` · `.` · 공백 또는 붙여 씀)와 전자 우편. 주소 꼴은 시드 `lists/forbidden.json` 의 `contact` 정규식(P6)이 맡는다 | 6.1 · 3.3 '전화번호 · 주소 형태는 AI 로 보내기 전에 가린다' |
| `nameVariantsOf({ displayName, englishName, nickname }, isVocabWord)` | 한글: 이름 그대로, 세 글자면 뒤 두 글자, 넉 자이고 앞 두 글자가 두 글자 성이면 뒤 두 글자(두 글자 미만 변형은 버림). 영어: 영어 이름 · 별명 그대로와 띄어쓰기 · 하이픈으로 나눈 조각(두 글자 이상). `isVocabWord(변형)` 이 참인 변형은 뺀다. 긴 것부터 차례로 | 6.1 · B5-22 |
| `createMasker({ names, isVocabWord, contactPatterns })` | `Masker = (text) => { text, names: 바꾼 수, contacts: 가린 수 }`. 영어 변형은 글자 사이에 공백 · 하이픈이 있어도 맞고(지어낸 이름 `Ganada` 면 `Ga Nada` · `ga-nada` · `GANADA`) 대소문자를 가리지 않으며 앞뒤가 영문자가 아닐 때만 맞는다(뒤보기를 쓰지 않고 앞 글자를 잡아 되돌려 넣는다 — tsconfig ES2017, P4a 위험 5). 한글 변형은 글 그대로 찾는다(조사가 붙어도 바꾼다). 연락처는 `BUILTIN_CONTACT_PATTERNS` 와 넘긴 시드 `contact` 정규식을 `gu` 로 모두 `CONTACT_MASK` 로. 이름을 먼저, 연락처를 뒤에 | 6.1 |
| `fillName(text, englishName)` | `{NAME}` 을 영어 이름으로 채운다(화면 · 읽어 주기용, P11) | 6.1 '토리의 말과 힌트의 {NAME} 은 영어 이름으로 채워' |

3. `src/core/ai/output-check.ts`. P4a 글 도구(`forbiddenHits` · `splitSentences` · `sentenceWords` · `isEnglishSentence`)를 그대로 쓴다(6.4 시드 검사와 같은 함수, plan-p04a '글 도구').

| 이름 | 무엇 · 규칙 |
|---|---|
| `CheckField` | `{ path: string; lang: "ko" \| "en"; text: string }` — 아이에게 보이거나 읽어 주는 칸 하나 |
| `FieldHit` | `{ kind: "forbidden"; match; category? } \| { kind: "too-long"; words; max }` |
| `checkOutputFields(fields, { forbidden, sentenceMaxWords })` | `Map<path, FieldHit[]>`(걸린 칸만). 모든 칸에 `forbiddenHits`(금지어 · 폭력 · 개인 정보 질문 패턴 · 연락처 꼴, 영어 · 한국어 두 벌). `en` 칸은 영어 문장마다 낱말 수가 단계의 3.6 문장 길이 상한(`sentenceMaxWords`)을 넘으면 `too-long`. 판정용 AI 호출은 쓰지 않는다(6.4) |

4. `src/core/ai/calls/common.ts`.

| 이름 | 무엇 · 규칙 |
|---|---|
| `LevelContext` | `{ level; canDo; learningElement; prevLearningElements: string[]; unitWords: string[]; sentenceMaxWords }` — 가변부 재료. P11 이 level_specs(`can_do` · `spec.sentenceMaxWords`) · unit_specs(`learning_points` · `target_vocab`)에서 채운다 |
| `CallSpec<I, O, R>` | `{ purpose; title; wireSchema(input, rules): ZodType; looseSchema; multiTurn; enumPaths; settingSchemas; rulesOf(values, input): R; mask(input, masker): I; system(input): string; messages(input): ChatMessage[]; validate(value, input, rules): string[]; normalize(loose, input, rules): O \| null; checkFields(value): CheckField[]; applyChecks(value, hits, input): { value; changed; fatal }; historyEntry?(value): string }`. `title` 은 응답 규격의 루트 제목(`.meta({ title })`)이고 가짜 클라이언트가 목적을 알아보는 표시다(`writing_check` · `writing_feedback` · `speaking_eval.answer` · `speaking_eval.presentation` · `speaking_eval.confirm` · `thinkout`). 엄격 규격은 입력 · 규칙에 따라 개수가 달라 함수다(교정 상한 · 문법 지적 수 · 확인 질문 수가 규격 설명 글에 숫자로 들어간다. 설명만 바뀌면 문법 캐시는 그대로다 — P9a 확인한 사실 7). `normalize` 가 null 이면 필수 칸이 없다는 뜻(6.1 → '호출 하나의 실패') |
| `COMMON_FIXED_RULES` | 고정부 공통 규칙(지시는 영어, 아이에게 보이는 글의 언어 · 말투는 명시). 꼭 넣을 뜻: 배우는 사람은 한국 초등 4학년~중학생이다 · 아동용 내용만 쓴다 · 설명 · 칭찬 · 이유 · 피드백은 한국어 해요체로 짧고 다정하게(정할 것 라) · 이름 · 학교 · 주소 · 전화번호 · 사진 · 만나자는 말을 묻지 않는다 · 아이가 개인 정보를 쓰면 되묻지 않고 넘어간다 · `{NAME}` 은 그대로 둔다 · 틀렸다고 꾸짖지 않는다 · 정해진 JSON 칸만 쓴다 · 생각한 과정을 답 칸에 쓰지 않는다(reasoning_extraction 거절을 피함, P9a 확인한 사실 2). 근거는 6.1 고정부 |
| `SAFE_LINE_KO` | `"좋아요, 다음으로 가 볼까요?"`(6.4 의 예 그대로, 정할 것 가) |
| `answerTextOf(message)` | 응답 내용에서 마지막 `fallback` 블록 뒤의 `text` 블록을 이어 붙인 글(비스트리밍은 거절된 부분 출력이 빠지고 대체 모델이 처음부터 답한다, P9a 확인한 사실 2) |
| `prepareAnswer(json, enumPaths)` | 글 칸 앞뒤 공백을 지우고 `enumPaths` 칸을 소문자로(열거값이 설명 글로만 가서 대소문자가 바뀔 수 있다, P9a 확인한 사실 7 · 8) |
| `firstLine(text)` · `firstSentence(text)` | 6.2 가 '한 줄' · '한 문장'이라 적은 한국어 칸을 첫 줄 · 첫 문장(P4a `splitSentences`)으로 줄인다(정할 것 가) |
| `buildSystem({ fixed, variable })` | 고정부 규칙 목록 뒤에 가변부(이름표 · 값)를 정해진 차례로 이은 글. 같은 입력이면 같은 글(캐시가 깨지지 않게) |

5. `src/core/ai/calls/writing.ts`.

쓰기 확인 `writingCheckSpec`(6.2 쓰기 확인 행, 3.3 쓰기 4 · 5단계 행).

| 칸 | 값 |
|---|---|
| 입력 `WritingCheckInput` | `LevelContext & { task; example; sentences: string[] }`(아이가 낸 문장들 — 문장 틀 · 바꿀 칸을 채운 온 문장) |
| 응답 규격(엄격) | `{ praise: string; sentences: { index: int ≥ 0; correct: boolean }[]; fixes: { sentenceIndex: int; original: string; corrected: string; distractors: string[](1~2); reason: string }[](최대 WRITING_CHECK_FIX_MAX) }` |
| 고정부 규칙 | 문장마다 맞음 여부를 낸다(성적 계산용) · 고칠 곳은 최대 1개, 이번 단원 학습 요소와 이전 단원 학습 요소에서 먼저 고른다 · 고칠 곳은 원문 부분 · 바른 표현 · 헷갈리는 보기 1~2개(바른 표현과 같은 자리에 들어갈 그럴듯한 틀린 꼴) · 한국어 이유 한 문장 · 칭찬은 한국어 한 줄, 아이 문장을 짚어 구체적으로 · 모범 답안은 내지 않는다 |
| 사용자 메시지 | 과제 · 예시 · 번호 붙인 아이 문장(가린 글) |
| 검증(입력 기준) | `sentences` 는 아이 문장 수와 같고 0 부터 하나씩 · `fixes[].sentenceIndex` 는 그 범위 · 칭찬은 비지 않음 |
| 정규화 | 문장 판정은 번호 차례로 · 같은 번호는 첫 것만 · 범위 밖 번호는 버림 · 빠진 번호가 있으면 null(정할 것 바). 고칠 곳은 앞에서 1개 · 보기는 앞에서 2개 · 보기가 0 이면 그 고칠 곳을 버림(3.3 '보기 2~3개'를 만들 수 없음). 칭찬 · 이유는 `firstLine` · `firstSentence` |
| 출력 검사 칸 | 칭찬(ko) · 고칠 곳의 원문 · 바른 표현 · 보기(en) · 이유(ko) |
| 걸린 칸 바꾸기 | 칭찬 → `SAFE_LINE_KO` · 고칠 곳의 어느 칸이든 → 그 고칠 곳을 버림(문장 판정은 그대로). 그 턴을 실패로 보지 않는다 |

쓰기 첨삭 `writingFeedbackSpec`(6.2 첨삭 행, 3.3 쓰기 6~12 둘째 세션 행).

| 칸 | 값 |
|---|---|
| 입력 `WritingFeedbackInput` | `LevelContext & { task; example; draft: string; thinkoutSummary: string \| null; forLevelTest: boolean }` |
| 설정 · 규칙 | `writing.max_corrections`(단계 → 수 사전 `{ "6": 2, … "12": 3 }`, plan-p06a 정할 것 마)에서 `String(level)` 의 값을 `maxCorrections` 로. 그 단계 값이 없으면 설정 문제(P9c 가 '설정 문제'로 처리). level_specs 의 `maxCorrections` 는 같은 값(plan-p06a 정할 것 바, P7 check-ids 가 맞댐)이지만 정규화는 6.1 대로 설정 키를 읽는다 |
| 응답 규격(엄격) | `{ praise: string; corrections: { original; corrected; reason }[](최대 maxCorrections — 규격 설명 글에 숫자가 들어가도록 입력마다 만든다); modelAnswer: string; rubric: { task: int 1~4; grammar: int 1~4; vocabulary: int 1~4 } }` |
| 고정부 규칙 | 칭찬 1개(한국어, 아이 글을 짚어 구체적으로) · 교정은 최대 N개, 이번 단원 학습 요소와 뜻을 가리는 오류에서 먼저(3.3) · 교정은 원문 · 수정 · 한국어 이유 · 모범 답안은 아이의 생각을 살린 영어 글, 그 단계 문장 길이 상한 · 어휘 범위 안 · 채점표는 첫 제출 글로 과제 충족 · 문법 · 어휘 각 1~4(3.3 '채점표 점수는 첫 제출 글로') · 생각 꺼내기 요약은 맥락으로만 |
| 사용자 메시지 | 과제 · 예시 · 생각 꺼내기 요약(있으면) · 초고(가린 글) · '교정은 최대 N개' |
| 검증 | 교정 수 ≤ maxCorrections · 칭찬 · 모범 답안이 비지 않음 |
| 정규화 | 교정은 앞에서 maxCorrections 개 · 채점표 각 항목을 반올림한 뒤 `AI_SCORE` 범위로 자름 · 항목이 없으면 null. 칭찬은 자르지 않는다(목업 B_Writing3 의 칭찬이 두 문장) |
| 출력 검사 칸 | 칭찬(ko) · 교정의 원문 · 수정(en) · 이유(ko) · 모범 답안(en) |
| 걸린 칸 바꾸기 | 칭찬 → `SAFE_LINE_KO` · 교정 → 그 교정을 버림 · 모범 답안 → 빈 글(P11 은 보이지 않는다). 채점표는 그대로 |

6. `src/core/ai/calls/speaking.ts`. 세 규격 모두 목적 `speaking_eval` 이다. 공개 함수(P9c)가 입력의 `mode` 로 고른다.

| 이름 | 무엇 · 규칙 |
|---|---|
| `speakingRulesOf(levelSpec: SpeakingLevelSpec)` | `{ grammarNoteMax: levelSpec.questions.modelAnswer ? 0 : SPEAKING_GRAMMAR_NOTE_MAX, confirmQuestionCount: levelSpec.presentation?.confirmQuestions ?? 0 }`. 1~3단계는 '바른 답 들려주기만'(CLAUDE.md 피드백 규칙 · 6.2 3단계 '문법 지적은 내지 않는다')이고 level_specs 의 `questions.modelAnswer` 가 그 1~3단계 표시다(정할 것 다) |
| `speakingAnswerSpec` | 입력 `LevelContext & { question; scene: string \| null(그림 과제의 시드 영어 장면 설명); transcript; grammarNoteMax: 0 \| 1; seedCorrectAnswer: string \| null }`. 응답 `{ judgement: SPEAKING_JUDGEMENTS; feedback: string; correctSentence: string; grammarNotes: string[](최대 grammarNoteMax) }`. 고정부: 말로 한 답이고 브라우저 인식 글이라 인식 오류로 보이는 부분(소리가 비슷한 다른 단어 · 빠진 기능어 · 끝소리 하나의 차이)을 판정 · 지적의 근거로 쓰지 않는다(6.1) · 내용이 질문(그림)에 맞는지와 꼴이 바른지로 맞음 · 부분 · 다시 · 칭찬 또는 내용 피드백 한국어 한 문장 · 바른 답 영어 문장 하나(그 단계 길이 · 어휘) · grammarNoteMax 가 0 이면 문법 지적을 내지 않는다, 1 이면 최대 1개 한국어 한 줄. 정규화: 판정은 열거값 밖이면 null · 피드백 `firstSentence` · 문법 지적은 앞에서 grammarNoteMax 개(0 이면 모두 지움, AC-5d) · 각 `firstLine` · 바른 답은 그대로 남긴다. 출력 검사: 피드백(ko) · 바른 답(en) · 문법 지적(ko). 걸리면: 피드백 → `SAFE_LINE_KO` · 바른 답 → `seedCorrectAnswer ?? ""` · 문법 지적 → 버림 |
| `speakingPresentationSpec` | 입력 `LevelContext & { topic; prepWords: string[]; transcript; confirmQuestionCount; spareConfirmQuestions: string[]; withConfirmQuestions: boolean(단계 평가 발표 문항은 false) }`. 응답 `{ contentScore: int 1~4; grammarScore: int 1~4; feedback: string; confirmQuestions: string[] }`. 고정부: 발표 내용 · 문법 점수 · 한국어 피드백 한 문장 · withConfirmQuestions 면 발표 내용을 확인하는 영어 질문 N개(그 단계 길이 · 어휘, 개인 정보를 묻지 않음), 아니면 빈 목록(6.2 '단계 평가의 발표 문항에는 확인 질문을 내지 않는다'). 정규화: 점수 반올림 · 범위 자름 · 피드백 `firstSentence` · 질문은 앞에서 N 개, 모자라면 같은 차례의 예비 확인 질문으로 채움(6.2 '비거나 검사에 걸리면 시드의 예비 확인 질문') · withConfirmQuestions 가 거짓이면 빈 목록. 출력 검사: 피드백(ko) · 질문(en). 걸리면: 피드백 → `SAFE_LINE_KO` · 질문 → 같은 차례 예비 질문(없으면 버림) |
| `speakingConfirmSpec` | 입력 `LevelContext & { presentationTranscript; question; transcript }`. 응답 `{ contentScore; grammarScore; feedback }`. 정규화 · 검사는 발표와 같다(질문 칸 없음) |

7. `src/core/ai/calls/thinkout.ts`(`thinkoutSpec`, 6.2 생각 꺼내기 행 · 3.3 생각 꺼내기 문단).

| 칸 | 값 |
|---|---|
| 입력 `ThinkoutInput` | `LevelContext & { task; example; hints: string[]; newWords: string[](이번 수업 배정 새 단어, 시드 차례); allowedWords: ReadonlySet<string>(그 단계 어휘 범위의 낱말 — 소문자, P9c 가 vocab 에서 채움); history: { assistant: string; answer: string }[]; turn: number(1부터) }` |
| 설정 · 규칙 | `writing.thinkout_max_turns` → `maxTurns`. `turn === maxTurns` 면 마지막 턴 |
| 응답 규격(엄격) | `{ question: string; options: string[]; done: boolean; summary: string; words: string[]; starters: string[] }`(모든 칸 필수, 그 턴에 안 쓰는 칸은 빈 글 · 빈 목록 — 6.2 회화 턴 규격과 같은 원칙) |
| 고정부 규칙 | 한국어 해요체로 한 번에 질문 하나, 생각을 그 단계 학습 요소 범위(3.6)로 쓸 수 있는 크기로 좁힌다 · 보기 3개는 한국어 짧은 말 · 아이는 보기를 누르거나 한글로 짧게 친다 · 학교 이름 · 주소 · 전화번호 같은 개인 정보를 묻지 않는다(3.3) · 마지막 턴이나 생각이 충분하면 `done: true` 와 한국어 생각 요약 · 쓰기에 쓸 영어 단어 4~6개(그 단계 어휘 범위, 이번 수업 새 단어 먼저) · 영어 문장 시작 틀 2개(그 단계 문장 길이) |
| 메시지 | 첫 턴: 사용자 '시작' 메시지(과제 · 새 단어). 다음 턴부터 `history` 마다 [assistant: `assistant` 글 그대로, user: 가린 아이 답 + '턴 k / N']. 마지막 턴의 사용자 메시지에만 '마지막 턴이에요 — done true 로 요약 · 단어 · 틀을 채워요'를 넣는다(바뀌는 값은 마지막 사용자 메시지에, 6.1). 시스템 프롬프트는 대화 끝까지 같다 |
| 캐시 | `multiTurn: true` — 요청에 자동 캐시(`cache_control: { type: "ephemeral" }`, 6.1 '여러 턴 호출에서 대화 끝까지') |
| 검증 | done 이 아니면 질문이 비지 않고 보기가 THINKOUT_OPTIONS 개. done(또는 마지막 턴)이면 요약이 비지 않고 단어 THINKOUT_WORDS 범위 · 틀 THINKOUT_STARTERS 개 |
| 정규화 | 보기 앞에서 3개 · 마지막 턴이면 done 을 참으로 · 단어는 '새 단어 전부(시드 차례) → 응답 단어 가운데 allowedWords 에 있고 겹치지 않는 것' 차례로 앞에서 THINKOUT_WORDS.max 개(정할 것 마) · 틀 앞에서 2개 · done 인데 요약이 비면 null |
| 출력 검사 칸 | 질문 · 보기 · 요약(ko) · 단어 · 틀(en) |
| 걸린 칸 바꾸기 | 질문 → 그 턴 실패(`fatal: true` — P11 은 '이번에는 바로 써 볼까요' 초고 화면으로, 8절) · 보기 → 버림 · 요약 → 빈 글 · 단어 · 틀 → 버림 |
| `historyEntry(value)` | 정규화한 값의 `JSON.stringify`(칸 차례 고정). 다음 턴 요청의 assistant 글로 쓰인다 — P11 이 턴마다 저장해 돌려준다 |

8. `src/core/ai/request.ts`.

| 이름 | 무엇 · 규칙 |
|---|---|
| `buildAiRequest(spec, input, { config, masker, rules })` | `BuiltRequest = { body, betas, timeoutMs, wireSchema, title }`. `wireSchema = spec.wireSchema(input, rules)`. 가린 입력(`spec.mask(input, masker)`)으로 `system` · `messages` 를 만들고, `body = { model: config.model, max_tokens: config.maxTokens, system, messages, thinking: config.thinking, output_config: { effort: config.effort } }`. `config.fallbacks` 면 `fallbacks: "default"`, `spec.multiTurn` 이면 `cache_control: { type: "ephemeral" }`. temperature · top_p · top_k · metadata · stop_sequences · tools 는 넣지 않는다(6.1). betas 는 `[...config.betas, STRUCTURED_OUTPUTS_BETA]`. `output_config.format` 은 넣지 않는다 — SDK 도우미(`zodOutputFormat`)는 `src/server/ai` 와 스크립트만 가져올 수 있어서 P9c 가 `wireSchema` 로 붙인다(sdk-only-in-ai) |

9. `tests/fixtures/ai/sample-inputs.ts`. 단계 맥락(3 · 4 · 5 · 6 · 9 · 10단계)과 호출마다의 견본 입력, 관찰용 변형(호출마다 다섯 개)을 내보낸다. 아이 글은 손으로 쓴 견본이다(일부러 틀린 꼴 · 인식 오류로 바뀐 말 · 한국어 섞인 말 · 이름 · 전화번호 꼴 포함). 아이 이름은 지어낸 이름(`가나다` · `Ganada`)만 쓴다. 전화번호는 견본 꼴(`010-1234-5678`)만 쓴다.

## 작업 순서 (Order of work)

시작 전(구현자). P9a 가 끝난 같은 워크트리에서 `feature/1a-p09b-ai-calls` 를 만든다. 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다. 구현자 하나(implementer · Opus · high)가 차례로 한다.

1. [검증] 상수 · 견본 입력. `structure.ts`(값 1) · `sample-inputs.ts`(값 9). 완료: `pnpm build` · `pnpm check:deps` 통과.
2. [서버] 가림(시험 먼저). `mask.test.ts`(AC-N4 의 요청 본문 시험은 작업 7) → `mask.ts`(값 2). 완료: 시험 통과.
3. [서버] 출력 검사 · 공통(시험 먼저). `normalize.test.ts` 의 '6.4 출력 검사' 묶음 → `output-check.ts`(값 3) · `calls/common.ts`(값 4). 완료: 시험 통과.
4. [서버] 쓰기 둘(시험 먼저). AC-4b 와 쓰기 걸린 칸 바꾸기 → `calls/writing.ts`(값 5). 완료: 시험 통과.
5. [서버] 말하기 셋(시험 먼저). AC-5d 와 발표 예비 질문 → `calls/speaking.ts`(값 6). 완료: 시험 통과.
6. [서버] 생각 꺼내기(시험 먼저). → `calls/thinkout.ts`(값 7). 완료: 시험 통과.
7. [서버] 요청 본문(시험 먼저). `ai-request.test.ts` 와 AC-N4 → `request.ts`(값 8). 완료: 네 호출(여섯 규격)의 본문 시험 통과.
8. [검증] 마무리 · 검토 · H14. CI 순서 명령 전부(P9a 작업 7 과 같다) · 비밀값 grep 0건 · code-reviewer(Opus · xhigh) 검토와 fix ≤3 · 요청자 지시로 커밋. 완료: spec-trace 의 missing-test 가 2 줄어든다(AC-4b · AC-5d).

### H4 전 · 뒤

| 때 | 할 수 있는 것 |
|---|---|
| H4 전(지금) | 이 plan 전부(순수 함수 · 단위 시험) |
| H4 뒤 | 이 plan 에는 할 일이 없다. 프롬프트가 실제로 규칙을 지키는지는 P9c 작업 8 의 관찰표가 잰다. 어긋나면 이 파일들의 고정부 규칙 글만 고치고(설계 변경 아님) 관찰을 다시 돈다 |

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 프롬프트가 개수 · 문법 지적 · 말투 · 언어 규칙을 어긴다 | 아이 화면에 규칙 밖 글이 나온다 | 정규화 · 출력 검사가 마지막으로 막는다. H4 뒤 관찰표(P9c)가 규칙 위반 수를 재고, 고정부 글을 고쳐 다시 잰다 |
| 2 | 열거값 · 개수 · 범위가 문법이 아니라 설명 글로만 간다(P9a 확인한 사실 8) | 판정 값이 바뀌어 온다 · 엄격 검증이 자주 실패해 다시 요청이 는다 | 다듬기(소문자 · 공백)를 엄격 검증 앞에 둔다. 관찰표가 첫 시도 엄격 통과율을 잰다. 낮으면 컨트롤러가 SDK 도우미 대신 열거값을 남기는 변환을 고를 수 있다(13절 한 줄 뒤) |
| 3 | 가림이 지나치거나 모자란다. 두 글자 이름이 흔한 낱말(예: 이름이 '지원')이면 아이 글의 그 낱말도 바뀐다. 주소 꼴은 시드 정규식에 기댄다 | 생각 꺼내기 맥락이 조금 이상해진다 · 주소가 새어 나간다 | 개인정보가 먼저다(지나침을 받아들인다). 주소 · 연락처 정규식은 P6 이 `contact` 범주에 넣는다(다른 P 에 넘길 것). 가림 수(`names` · `contacts`)를 흐름이 받아 둔다 |
| 4 | 영어 이름 변형이 영어 낱말과 같다(예: 별명 'May') | 아이 글의 낱말이 {NAME} 으로 바뀐다 | 첫 실행이 vocab 단어와 같은 영어 이름을 별명으로 바꾸게 하고(4절), 가림은 vocab 단어와 같은 변형을 뺀다(6.1 끝 문장) |
| 5 | `structure.ts` 를 P5 · P6 · P7 도 고칠 수 있다 | 병합 충돌 | 파일 끝에 새 절로 붙인다. 충돌은 컨트롤러가 합칠 때 푼다 |
| 6 | 말하기 문법 지적의 단계 경계를 `questions.modelAnswer` 로 읽는다(정할 것 다) | P6 이 그 칸을 1~3단계 밖에도 켜면 문법 지적이 사라진다 | P6 에 넘길 것으로 적는다. 다른 길은 level_specs 에 칸 하나를 더하는 것(P4 · P6) |
| 7 | 생각 꺼내기 프롬프트가 짧아 모델의 최소 캐시 길이에 못 미칠 수 있다(추측) | 캐시가 걸리지 않을 뿐 결과는 같다 | 관찰표가 둘째 턴의 캐시 읽기 토큰을 적는다 |
| 8 | 첨삭 칭찬은 자르지 않는다(목업이 두 문장) | 칭찬이 길어진다 | 고정부에 '칭찬 1개, 짧게'를 넣고 관찰표가 길이를 본다 |
| 9 | 단계 평가 쓰기 과제(6단계부터)도 첨삭 호출로 채점한다(6.2) | 단계 평가에서 교정 · 모범 답안이 낭비된다 | 1-가는 같은 규격을 쓰고 `forLevelTest` 는 프롬프트에만 쓴다(보이지 않음은 P12). 비용 차이는 작다(6.6) |

### 정할 것(컨트롤러)

- 가. 실시간 출력 검사의 세부(6.4 끝 문단 첫 두 문장을 호출 넷에 펼친 것). (1) '길이'는 영어 학습 글 칸(바른 표현 · 보기 · 수정 · 모범 답안 · 바른 답 · 확인 질문 · 단어 · 틀)의 영어 문장마다 3.6 문장 길이 상한(level_specs `sentenceMaxWords`)을 넘지 않는 것으로 읽는다. 한국어 칸 가운데 6.2 가 '한 줄' · '한 문장'이라 적은 칸(쓰기 확인 칭찬 · 이유 · 말하기 피드백 · 문법 지적)은 검사 실패 대신 첫 줄 · 첫 문장으로 정규화한다. (2) 걸린 칸 바꾸기: 칭찬 · 피드백은 안전한 대사 `좋아요, 다음으로 가 볼까요?`(6.4 의 예 그대로), 고칠 곳 · 교정 · 문법 지적 · 보기 · 단어 · 틀은 버림, 모범 답안 · 요약은 빈 글(보이지 않음), 말하기 바른 답은 시드 바른 답(1~3단계에 있음) 또는 빈 글, 발표 확인 질문은 예비 확인 질문(6.2), 생각 꺼내기 질문이 걸리면 그 턴을 실패로 보고 8절의 '이번에는 바로 써 볼까요' 길로 간다. 어느 칸이든 걸리면 그 시도의 ai_calls 결과 상태는 '검증 실패'(6.4). 아이 화면 문구 하나와 처리 규칙이 정본에 없어 13절 한 줄을 권한다.
- 나. 입력 가림 세부. 한글 이름의 성 빼기(세 글자 → 뒤 두 글자, 넉 자는 두 글자 성 목록), 영어 변형은 글자 사이 공백 · 하이픈 · 대소문자를 허용, 연락처는 앱에 둔 전화번호 · 전자 우편 정규식에 시드 `contact` 정규식을 더함, 가린 자리는 `***`. 권함대로면 13절은 P9a 정할 것 라의 기술 선택 한 줄에 묶는다.
- 다. 말하기 문법 지적의 단계 경계. 6.2 는 '3단계는 문법 지적을 내지 않는다 · 4~8단계는 최대 1개'라 적고, C54 (2) 는 단계마다 다른 규칙을 level_specs 칸으로 둔다. 권하는 것은 P4a 규격의 `questions.modelAnswer`(1~3단계 '바른 답 들려주기만'의 표시)를 경계로 읽는 것이다 — 새 칸이 필요 없다. 다른 길은 level_specs 말하기에 `grammarNotes` 칸을 더하는 것(P4 규격 · P6 값). 해석이라 13절 불필요.
- 라. 아이에게 보이는 AI 한국어의 말투. 4절은 '토리의 말과 영어 문장의 한국어 뜻은 반말, 앱의 안내 · 버튼은 해요체'다. 호출 넷의 칭찬 · 이유 · 피드백 · 문법 지적 · 생각 꺼내기 질문 · 보기 · 요약은 목업 B_Writing2 · B_Writing3 의 문구('대문자와 마침표를 빠짐없이 썼어요.' · 'He · She 가 주어일 때는 동사 뒤에 s 를 붙여요.')대로 해요체로 둔다. 권함대로면 13절 불필요(목업 · 4절 해석).
- 마. 생각 꺼내기 단어 정규화. 6.2 '그 단계 어휘 범위 안 · 배정 새 단어 먼저'를 모델에 맡기지 않고, 새 단어를 앞에 채우고 범위 밖 낱말을 뺀다(최대 6개). 새 단어가 6개면(6~9단계 k 6) 모델 단어는 남지 않는다. 권함.
- 바. 쓰기 확인의 문장 판정 수가 아이 문장 수와 다를 때. 넘치면 자르고(6.1 '개수 초과분은 앞에서부터'), 모자라면 엄격 검증 실패 → 1회 다시 요청 → 그래도 모자라면 '호출 하나의 실패'(필수 칸 없음, 8절 '쓰기 확인이 실패하면 확인 없이 넘어가고 점수 없는 세션'). 권함.
- 사. 프롬프트 글의 언어. 지시는 영어로 쓰고 아이에게 보이는 칸의 언어(한국어 해요체 · 영어)를 칸마다 명시한다. 정본은 언어를 정하지 않는다. 권함, 13절 불필요.

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 이 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다.
- 설계 숫자는 settings 에서 읽는다(writing.max_corrections · writing.thinkout_max_turns). 꼴 · 구조 수는 `structure.ts`(C54 (2)), 단계마다 다른 수(문장 길이 상한 · 확인 질문 수 · 문법 지적 경계)는 level_specs 에서. 시험도 `TEST_SETTINGS` · P4a 견본에서 읽는다.
- `src/core/ai` 는 순수 함수다. 현재 시각 · DB · Next · SDK 를 가져오지 않는다.
- 아이 이름은 어디에도 적지 않는다. 시험의 이름은 지어낸 이름이다. 아이 화면 문구는 정본 · 목업 · 13절 결정 그대로다.
- 커밋 · PR 은 요청자 지시 때만(H14). 화면이 없어 화면 검토는 없다.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 |
|---|---|---|
| AC-4b | 단위 "AC-4b 쓰기 확인 정규화는 고칠 곳 2개인 응답에서 1개만 남긴다" · "AC-4b 첨삭 정규화는 6단계에서 교정 3개를 2개로, 10단계에서 4개를 3개로 줄인다(writing.max_corrections 단계 사전에서 읽음)" · "AC-4b 첨삭 정규화는 범위 밖 채점표 점수(0 · 5 · 2.6)를 1~4 로 자른다" | `tests/unit/normalize.test.ts` · `pnpm test` |
| AC-5d(P9 몫: 정규화) | 단위 "AC-5d 말하기 평가 정규화는 3단계 응답에서 문법 지적을 지우고 바른 답 문장을 남긴다" · "AC-5d 4단계는 문법 지적을 1개까지 남긴다". 판정 글자가 화면에 없고 부분 · 다시에 바른 답을 들려주는 것은 P11 e2e | `normalize.test.ts` |
| AC-N4(P9 몫: 가림) | 단위 "AC-N4 생각 꺼내기 요청 본문에 아이가 쓴 전화번호가 없고 가린 자리로 바뀐다" · "AC-N4 쓰기 첨삭 · 말하기 평가 요청 본문에도 전화번호 · 전자 우편이 없다". 번들 비밀값 검사는 P1b, 지난 대화 요약의 가림은 1-나 | `tests/unit/mask.test.ts` |
| 6.1 이름 바꾸기 | 단위 "6.1 가림: 한글 이름 · 성을 뺀 이름 · 영어 이름의 대소문자 · 띄어쓰기 · 하이픈 변형을 {NAME} 으로 바꾼다" · "6.1 가림: vocab 단어와 같은 이름 변형은 바꾸지 않는다" · "6.1 가림: 낱말 안에 든 이름 글자(영문자 사이)는 바꾸지 않는다" · "6.1 화면: {NAME} 을 영어 이름으로 채운다" | `mask.test.ts` |
| 6.2 정규화 | 단위 "6.2 생각 꺼내기: 보기 3개 · 단어는 새 단어 먼저 · 범위 밖 낱말 뺌 · 최대 6개 · 틀 2개 · 마지막 턴은 끝냄" · "6.2 말하기 발표: 확인 질문은 단계 규격 수만큼, 모자라거나 걸리면 같은 차례 예비 질문" · "6.2 단계 평가 발표에는 확인 질문이 없다" · "6.2 다듬기: 열거값 대소문자 · 앞뒤 공백을 고친다" · "6.2 쓰기 확인: 문장 판정이 모자라면 규격 실패(null)" · "6.1 필수 칸이 없으면 정규화가 null 을 낸다" | `normalize.test.ts` |
| 6.4 출력 검사 | 단위 "6.4 출력 검사: 금지어 · 개인 정보 질문 패턴(영어 · 한국어) · 연락처 꼴에 걸린 칸을 찾는다" · "6.4 출력 검사: 영어 칸의 문장이 단계의 문장 길이 상한을 넘으면 걸린다" · "6.4 걸린 칸 바꾸기: 칭찬 · 피드백은 안전한 대사, 고칠 곳 · 교정 · 문법 지적은 버림, 모범 답안은 빈 글, 바른 답은 시드 바른 답" · "6.4 걸린 칸 바꾸기: 생각 꺼내기 질문이 걸리면 그 턴 실패" | `normalize.test.ts` |
| 6.1 요청 본문 | 단위 "6.1 요청: 네 호출 여섯 규격 모두 temperature · top_p · top_k · metadata 가 없고 max_tokens 는 ai.max_tokens.<목적>이다" · "6.1 요청: 시스템 프롬프트에 공통 고정부(한국어 해요체 설명 · 개인 정보 · {NAME})와 가변부(can-do · 단원 단어 · 학습 요소 · 수업)가 있고 아이 이름 · 아이 글이 없다" · "6.1 요청: 말하기 평가 고정부에 인식 오류를 근거로 쓰지 않는다는 규칙이 있다" · "6.1 요청: 생각 꺼내기만 자동 캐시이고 바뀌는 값(마지막 턴)은 마지막 사용자 메시지에만 있다" · "6.1 요청: 생각 꺼내기 둘째 턴 메시지는 첫 턴 메시지를 글자 그대로 앞에 둔다" · "6.1 요청: 규격 제목이 목적 이름이다 · betas 에 구조화 출력 머리글이 있다" | `tests/unit/ai-request.test.ts` |
| 공통 | P9a 증명 표의 공통 행 | CI |

## 완료 보고 (Done)

구현 뒤 채운다.
