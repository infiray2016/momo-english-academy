# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P11a 세션 바탕 · 읽기 · 쓰기 1~3 · 말하기 1~2(앱 채점)

spec: `specs/` 정본(3.3 첫 활동 · 읽기 문단과 표 · 쓰기 1~3 행 · 말하기 문단과 표, 3.4 단어장 · '단어별 정오', 3.7 점수 표 전부, 4절 첫 문단(결과 말 셋 · '한 번 더' · 퍼센트 없음) · 읽기 · 쓰기 · 말하기 세션 행 · 세션 결과 행, 5절 sessions · attempts · 전이 표, 6.2 끝 두 문단(앱 채점 · 일치율), 7절 인식 규칙 표 · 마이크를 쓸 수 없음, 8절 네트워크 끊김 · 같은 프로필 동시 사용, 12절 ui.* · speaking.match_weight · speaking.listening_weight · speaking.answer_match_pass · speech.*, 13절 C38 · C39 · C53 · C67 (6) (7) · C70 · C73, 15절 AC-2c(읽기 몫) · 3a · 4a · 5b(1단계) · 5c(세션 몫) · 5e(말하기 1 · 4) · 5f(1~2단계) · 6a · 6c · N3 · N9, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P11 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-18 · 상태: done(2026-10-22, 커밋 79ee1cc)
승인: 컨트롤러 2026-10-18 04:1x(정할 것 가~카 모두 권함대로 — 13절 C76 단어별 정오 · C77 활동 흐름 해석 · C78 정본 밖 문구, 짝 plan 몫 C79 · C80 · C81) · 브랜치 · 워크트리: `feature/1a-p11-session-activities`(제안, a · b · c 한 브랜치 · 워크트리 p11) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P11 은 손 파일이 일흔 안팎(셋의 표를 더하면 여든여덟 — 같은 파일을 차례마다 고친 것을 따로 셈)이라 셋으로 나눴다(묶음 plan 위험 12). 이 파일(a)은 AI 없이 도는 세션 — 활동 바탕 · 시도 저장과 서버 채점 · 세션 끝내기 · 결과 틀 · 읽기 · 쓰기 1~3 · 말하기 1~2 와 음성 공통이다. 짝은 `plan-p11b-쓰기-AI-첨삭.md` · `plan-p11c-말하기-AI-평가.md` 다. 셋이 함께 쓰는 사실 — **나눈 까닭과 배정 · 가정 · 화면을 보는 차례 · 바탕 가지 · 활동 모델(값 1) · 시도 꼴(값 2) · 정본 밖 문구 · 정할 것 가~카 · 확인한 사실** — 은 이 파일에만 있고 b · c 는 절 이름으로 가리킨다.
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 판과 출처는 2026-10-18 에 확인했다(끝 '확인한 사실과 출처').

## 나눈 까닭과 배정

| plan | 범위 | 검토 묶음(차례) | 이 plan 이 증명하는 AC | 손 파일 |
|---|---|---|---|---|
| a(이 파일) | 활동 바탕 · 시도 저장 · 서버 채점 · 끝내기 · 결과 틀 · 읽기 · 쓰기 1~3 · 말하기 1~2 · 마이크와 인식 오류 | A1(1) · A2(2) · A3(3) · A4(4) | 2c 읽기 · 3a · 4a · 5b 1단계 · 5c 세션 · 5e 1 · 4 · 5f 1~2 · 6a · 6c · N3 · N9 | 38 |
| b | AI 길(가짜 AI e2e · 기다림 표시 · 1-가 안전 상한) · 쓰기 4~5 확인 · 6~12 생각 꺼내기 · 초고 · after() 첨삭 · 둘째 세션 · 밀린 첨삭 · 목록 '첨삭 보기' · 홈 '첨삭이 왔어요' | B1(5) · B2(6) · B3(7) | 2a 첨삭 · 2e 초고 · 4c · 6a 초고 · 8d · 8k · 8n 첨삭 · N6 · N10 | 36 |
| c | 말하기 3~8 질문 답 · 그림 보고 말하기(AI 판정) · 9~12 생각 화면 · 발표 · 확인 질문 | C1(8) · C2(9) | 2c 말하기 · 5b 6 · 10 · 5d · 5e 6 · 5f 3 · 5g · 8b · N9 | 14 |

까닭: (1) 앱 채점(a) · 쓰기 AI(b) · 말하기 AI(c)는 서버 길이 다르다 — a 는 기기 대기열로 시도를 보내고 서버가 다시 채점하고, b · c 는 서버 액션이 AI 를 부르고 그 자리에서 저장한다. (2) b 의 두 세션(초고 · 고쳐 쓰기)은 P10 목록 상태 · 홈 · P12 판정의 셈을 바꾸는 가장 큰 구조 변경이라 따로 검토한다. (3) 묶음마다 손 파일 열 안팎이다.

## 가정

- (가) 시드. 수업 자료는 시험용 시드 `devSeedTree()`(1단계뿐 · 작은 틀 · 지어낸 낱말, C70 · C75)다. 요청자가 프리뷰(iPad)에서 볼 수 있는 것은 **1단계 읽기 · 쓰기 · 말하기 수업**이다 — 이 plan(a)이 끝나면 셋 다 끝까지 돈다. 4 · 6 · 10단계 화면은 e2e 가 견본 빌더(`readingLesson` 1 · 4, `writingLesson` 1 · 3 · 4 · 6, `speakingLesson` 1 · 6 · 10)로 넣어 보고 design-reviewer 사진으로 보인다. 실제 단계별 수업은 P8 실시드 뒤다.
- (나) AI. a 는 AI 를 부르지 않는다(3.3 · 6.2 · CLAUDE.md 피드백 규칙 — 쓰기 1~3 · 읽기 · 듣기 · 따라 말하기 · 말하기 1~2 질문 답은 앱 채점). b · c 는 P9 가짜 Anthropic 으로 먼저 간다(C63 (5)). 프리뷰에 개발용 Anthropic 키(H4)가 들어가기 전에는 AI 활동이 8절 실패 길로 간다(쓰기 확인 건너뜀 · '이번에는 바로 써 볼까요' · 첨삭 대기).
- (다) 시험 환경. 이 Mac 은 SysV 공유 메모리 고갈로 새 Postgres 가 뜨지 않는다(장부 '환경' 행). 단위 · tsc · biome · build 는 로컬, **통합 · e2e 는 CI(GitHub Actions ubuntu, embedded-postgres)로 확인**한다 — 컨트롤러가 CI 가지를 늘 바탕 가지 최신 커밋 위에 다시 만들어 push 한다(장부 'CONFLICTING' 행). 재부팅 뒤에는 로컬도.
- (라) 단원 통과는 P12 다. a 가 끝나면 수업이 끝나고(완료 표시 · 잠긴 단원 줄의 수가 준다) 결과 화면이 나오지만 다음 단원은 P12(숙달 · 최근 성적 판정) 전까지 열리지 않는다 — 요청자에게 미리 알린다(메모리 feedback-show-scope-before-demo).

## 화면을 보는 차례(P11a · b · c)

한 구현자가 한 워크트리에서 차례대로 한다. 검토 묶음마다 code-reviewer(Opus · xhigh) 한 번, 화면이 있는 묶음은 design-reviewer(Opus · xhigh)도 한 번이다. 커밋 · 프리뷰 올리기는 요청자 지시 때(H14) — 차례 2 · 3 · 4 끝마다 요청자에게 올릴지 묻기를 권한다(요청자가 프리뷰에서 직접 눌러 봄).

| 차례 | 할 일 | 검토 묶음 | 끝에 요청자가 볼 수 있는 화면 |
|---|---|---|---|
| 0 | 바탕 가지 · 워크트리 p11 · 공용 변경 1 — 컨트롤러(13절 C76~C81 은 적힘) | — | — |
| 1 | a 작업 1 순수 함수 바탕(활동 · 시도 · 점수 · 말하기 판정) | A1(code 만) | — |
| 2 | a 작업 2 세션 서버 · 대기열 · 틀 · 읽기 · 결과 틀 | A2 | **읽기 1단계 수업을 끝까지**: 지문(읽어 주기 · 낱말 누르면 뜻) → 문항(바로 채점 · 해설 · 한 번 더 풀기) → 결과 → '다음 수업' |
| 3 | a 작업 4 쓰기 1~3 · 이어 하기 | A3 | **쓰기 1단계 수업을 끝까지**(그림 보고 고르기 · 빈 글자 채우기 · 글자 베끼기, 틀리면 정답 보고 다시) · 닫았다 열면 같은 자리 |
| 4 | a 작업 5 말하기 1~2 · 음성 공통 | A4 | **말하기 1단계 수업을 끝까지**(따라 말하기 결과 말 셋 · 듣고 고르기 · 질문 답 · '같이 말해 볼까요') · 마이크 안내 |
| 5 | b 작업 1 AI 길 · 쓰기 4~5 | B1 | (프리뷰는 1단계뿐 — e2e 사진) 쓰기 4 · 5단계 문장 쓰기 → 확인(칭찬 · 고칠 곳 하나) |
| 6 | b 작업 2 쓰기 6~12 첫 세션 | B2 | (e2e 사진) 생각 꺼내기 → 초고 → '글을 보냈어요' → '첨삭 보기' |
| 7 | b 작업 3 둘째 세션 · 목록 · 홈 · 밀린 첨삭 | B3 | (e2e 사진) 첨삭 보기 → 고쳐 쓰기 → 모범 답안 · 홈 '첨삭이 왔어요' |
| 8 | c 작업 1 말하기 3~8 | C1 | (e2e 사진) AI 판정 질문 답 · 그림 보고 말하기 |
| 9 | c 작업 2 말하기 9~12 | C2 | (e2e 사진) 생각 화면 → 발표 → 확인 질문 셋 |
| 10 | 마무리(크기 시험 · CI 순서 명령 · 화면 검토 다시) | 화면 검토 | 세 영역 세션 처음부터 끝까지 |
| 11 | [사람] 요청자 프리뷰 시험 · H4 뒤 AI 활동 · 커밋 · PR 지시 | — | — |

순서의 근거(브리프의 '읽기 → 쓰기 1~3 → 말하기 1~3 → 쓰기 4~12 → 말하기 4~12'를 따르되 말하기 3단계를 뒤로 옮김):
1. 요청자의 지금 불만이 '수업이 안 끝나 진도가 안 나간다'(2026-10-18 02:2x)다. 시험용 시드에 있는 1단계 세 영역은 모두 AI 없이 채점되므로(위 가정 (나)) 차례 2~4 만으로 프리뷰에서 진짜 수업이 끝까지 돈다. H4(키) · P8(실시드)을 기다리지 않는다.
2. 읽기를 맨 앞에 둔 까닭: AI · 마이크가 없어 세션 바탕(대기열 · 서버 채점 · 끝내기 · 결과)을 가장 단순한 활동으로 먼저 굳힌다.
3. **말하기 3단계는 c 로 옮겼다** — 3단계 질문 답은 AI 판정(6.2 · C38 '1~2단계 질문 답은 AI 를 부르지 않는다')이고 4~8단계와 같은 AI 판정 화면을 쓴다. 시험용 시드에 3단계가 없어 요청자 눈에 차이가 없다.
4. 쓰기 AI(b)를 말하기 AI(c)보다 앞에 둔다. 쓰기 4~5 확인은 가장 단순한 AI 호출이라 AI 길(가짜 AI e2e · 기다림 표시 · 실패 길 · 안전 상한)을 먼저 굳히기 좋고, 6단계 두 세션은 목록 · 홈 · P12 셈을 바꾸는 가장 큰 위험이라 일찍 드러낸다. 말하기 9~12 는 1차 시드 범위(1~6단계, 12절 seed.complete_through_level) 밖이라 가장 덜 급하다.

## 바탕 가지

- 제안: **`feature/1a-base-p10-p9c-p6a-p7b`**(제안 이름) = P10 가지 `feature/1a-p10-first-run-home`(fix 5 커밋 · 차례 7 마무리 커밋까지) + P9c `feature/1a-p09c-ai-flow` dae3afd(P9b 6213662 포함) + P6a `feature/1a-p06a-seed-reference` f447bc5 + P7b `feature/1a-p07b-ci-ids` 1a5c188. 컨트롤러가 합친다(596137a 와 같은 길, 정할 것 나).
- P9c 가 필요한 까닭: b · c 가 부르는 공개 함수 넷(`checkWriting` · `writeFeedback` · `evaluateSpeaking` · `thinkoutTurn`, `src/server/ai/index.ts`)과 흐름(`run.ts`)이 P9c 에만 있다. P10 가지는 P9a 01ff0a9 까지다.
- **P6a 가 필요한 까닭: P10 가지에는 `seed/` 폴더가 없다.** P9c 흐름은 실행 때 `seed/lists/forbidden.json` 을 읽어 출력 검사를 하고, 없으면 `config` 로 AI 를 부르지 않는다(`run.ts` 4 · 5단계, `seed-lists.ts`). 동음이의어(`seed/lists/homophones.json`)도 없으면 따라 말하기가 빈 묶음으로 채점된다(P10 `placement/index.ts` 218줄 경고). P6a 에 목록 넷이 있다. P6a 의 규격 파일(seed/*.json)이 함께 들어오지만 앱 DB 는 시험용 시드를 그대로 쓴다(적재는 따로) — PR CI 의 seed-validate 는 있는 칸만 막는다(9절).
- P7b(권함): check-ids(설계 숫자 박힘 · 12절 키 ↔ 시험용 설정 대조)가 P11 의 새 이름 붙인 상수와 `TEST_SETTINGS` 새 키를 바로 본다.
- 겹치는 파일(2026-10-18 확인): P10 ↔ P9c 는 `next.config.ts`(P10 함수 꼴 + P9c `outputFileTracingIncludes: { "/*": ["./seed/lists/**/*.json"] }` — 함수 꼴 안에 더함) · `package.json` scripts(`ai:contract` · `ai:observe` 둘 더함) · `src/server/seed-lists.ts`(두 쪽 글자 같음). P10 ↔ P7b 는 `.github/workflows/ci.yml`(P10 fix 5 'failed' 지킴 + P7b check-ids 작업) · `package.json`. P6a 는 `biome.json` · `src/core/seed/reference-index.ts` · 시험 하나 · seed/ · docs.
- 마이그레이션: P11 은 더하지 않는다. 필요한 열이 모두 있다(sessions `writing_part` draft · rewrite · `score` · `english_sentences` · `learning_day`, attempts `input` · `ai_feedback` · `score` · `word_results` · `word_count` · `status` done · awaiting_feedback · feedback_failed).

## 목표 (Goal)

- **세션 바탕.** 영역 수업의 활동 차례(값 1)를 끝까지 돌린다. 활동마다 '끝' 시도 하나를 기기 대기열로 보내고(8절 — 같은 시도 id 는 한 번만), 서버가 저장 때 수업 내용으로 **다시 채점**해 attempts 의 `score` · `word_results` · `word_count` 를 쓴다(화면은 같은 순수 함수로 바로 판정한다). 마지막 활동 뒤 '끝내기'가 3.7 세션 점수 · 끝낸 학습일(C56 (1)) · 완료 시각 · 영어로 말한 문장 수(C12 · C41)를 채우고 결과 화면(`/result/<세션 id>`)으로 간다. 닫았다 열면 끝 시도가 없는 가장 앞 활동에서, 같은 기기면 그 활동 안 입력까지 되살린다(4절 · AC-6a). 대기열은 50개씩 나눠 보내고 꼴이 틀린 시도만 버린다(장부 M-2).
- **읽기(3.3 읽기 · AC-3a).** 새 단어 미리보기 → 지문(1~4단계 단어 그림 · '읽어 주기' · 아무 낱말이나 누르면 그 낱말의 뜻 — 누른 낱말은 단어장 몫으로 기록) → 객관식 문항(고르면 바로 채점과 해설, 틀리면 '한 번 더 풀기' 한 번 뒤 정답 표시) 순서다. 점수는 첫 시도 정답 수 ÷ 문항 수다.
- **쓰기 1~3(3.3 쓰기 표 · AC-4a).** 새 단어 미리보기 → 문항(그림 보고 고르기 · 글자 베끼기 · 빈 글자 채우기 · 받아쓰기 · 글자로 단어 만들기 · 어구 · 문장 조립). 앱 안 영문 자판과 타일 · 카드만 쓰고 기기 자판을 띄우지 않는다. 틀리면 정답을 보여 주고 맞힐 때까지 다시 한다(점수는 첫 시도). 판정은 P10 `checkAnswer`(C73 — 첫 글자 대문자 · 마침표 카드 · 차례)다. AI 0회.
- **말하기 1~2와 음성 공통(3.3 말하기 · 4절 · 7절 · AC-5b · 5c · 5e · 5f · N3).** 새 단어 미리보기 → 따라 말하기 낱말 → 문장(결과 말 셋 ui.match_phrase_levels 0.9 · 0.6 — '잘 말했어요'면 ui.auto_next_seconds 뒤 저절로 다음, 아니면 '한 번 더 말하기'(큰) · '다음'(작은), 점수는 가장 높은 일치율) → 듣기 이해(앱 채점) → 질문 답(1~4단계는 영어를 읽어 준 뒤 한국어 뜻, 1~2단계는 허용 답 일치율 ≥ speaking.answer_match_pass 면 '잘 말했어요', 아니면 바른 답 문장을 들려주고 '같이 말해 볼까요' 뒤 한 번 말하면 다음). 점수는 (1 − L) × {a × 따라 말하기 평균 + (1 − a) × 질문 답 평균} + L × 듣기 정답률(a = speaking.match_weight, L = speaking.listening_weight). 인식 오류 · 감시 타이머 · 마이크 못 씀 · 말소리 없음 · 끊김은 7절 표대로 안내하고 부모 알림을 남긴다.
- **결과 틀.** '수업을 끝냈어요!'(정본 밖) · '다음 수업'(큰 — 수업 목록의 '여기부터 해요'와 같은 수업) · '홈'(작은). 그런 수업이 없거나 P12 몫(단계 평가 · 복습 · 연습)이면 큰 버튼은 '수업 목록'이다. 별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' · '다시 했어요'는 P12 가 더한다(정할 것 바).
- 경계: 쓰기 4~12 · 말하기 3~12 의 AI 활동은 b · c. 단어장 · 숙달 · 단원 통과 · 별 · 연속 일수 · 결과의 나머지는 P12. '이 문제 이상해요' · 'AI 쉬는 중' 상태 · 부모 화면은 1-나. session.length_factor 는 1-가에서 곱하지 않는다(정할 것 차).

## 바뀌는 파일 (Files that change)

손 파일 서른여덟(새 스물하나 · 고침 열일곱 — 답 조각 셋은 한 줄에 묶음). 검토 묶음 넷(A1 순수 함수 · A2 바탕 · 읽기 · 결과 · A3 쓰기 1~3 · A4 말하기 1~2), 묶음마다 열 안팎. 공용 변경은 아래 따로.

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `src/core/session/preview.ts` | 수정 | `activitiesOf` 를 값 1 의 활동 모델로(모든 영역 · 단계 · 쓰기 두 세션 — b · c 화면이 쓸 차례까지 여기서 정함) | A1 · 1 |
| `src/core/session/attempt.ts` | 신규 | 시도 꼴(Zod) · 앱 채점 활동 결과(점수 · 단어별 정오 · 단어 수) · 이어 할 자리(값 2) | A1 · 1 |
| `src/core/scoring/score.ts` | 신규 | 3.7 세션 점수 — 모든 영역 · 단계(값 3) | A1 · 1 |
| `src/core/speaking/judge.ts` | 신규 | 결과 말 셋 · 1~2단계 앱 판정 · 답 꼴(한 문장 · 두 문장 이상) · 인식 실패 셈 · 영어로 말한 문장 수(값 4) | A1 · 1 |
| `src/core/speech/match-rate.ts` | 수정 | `matchedTargetWords(target, heard, options)` — 목표 낱말마다 맞았는지(단어별 정오, 값 2) | A1 · 1 |
| `tests/unit/session-preview.test.ts` | 수정 | 활동 차례(쓰기 두 세션 · 말하기 6 · 8 그림 먼저 · 발표 · 확인 질문 수) | A1 · 1 |
| `tests/unit/session-attempt.test.ts` | 신규 | 시도 꼴 · 앱 채점 · 단어별 정오 · 이어 할 자리 · P10 꼬리표 없는 미리보기 시도 | A1 · 1 |
| `tests/unit/score.test.ts` | 신규 | AC-6c | A1 · 1 |
| `tests/unit/speaking-judge.test.ts` | 신규 | AC-5f 단위 · 실패 셈 · 문장 수 | A1 · 1 |
| `tests/unit/match-rate.test.ts` | 수정 | 낱말별 맞춤(정렬) | A1 · 1 |
| `tests/unit/answer-check.test.ts` | 수정 | AC-4a 이름 붙은 사례(P10a 넘김 '시험은 checkAnswer 에') | A1 · 1 |
| `src/server/session/index.ts` | 수정 | 시도 저장(낱낱 검사 · 거부 id · 서버 채점) · 끝내기 · 화면 자료(이어 할 자리 · 설정 · 동음이의어 · 낱말 원형)(값 5) | A2 · 2 |
| `src/server/actions/session.ts` | 수정 | `finishSession` · `reportSessionMic`(차례 4). 첫 문장 `await requireAccess()` | A2 · 2 · 4 |
| `src/server/session/result.ts` | 신규 | `server-only`. 결과 화면 자료(값 8) | A2 · 2 |
| `src/lib/attempt-queue.ts` | 수정 | 50개씩 나눠 보내기 · 거부 id 지우기 · 화면 떠나기 전 비우기(값 6) | A2 · 2 |
| `src/lib/session-input.ts` | 신규 | 'use client' 아님(저장소는 부르는 쪽이 넘김). 활동 안 입력 되살리기(값 6) | A2 · 2 |
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 활동 차례 돌리기 · 끝내기 → 결과(값 7) | A2 · 2 · 3 · 4 |
| `src/app/(child)/session/[id]/page.tsx` | 수정 | 끝난 세션이면 결과로 | A2 · 2 |
| `src/components/activities/reading.tsx` | 수정 | `ReadingPassage` 에 `onWordTap`(없으면 지금 그대로 — 시드 보기 화면 영향 없음) | A2 · 2 |
| `src/components/session/reading.tsx` | 신규 | 'use client'. 지문 활동 · 문항 활동(값 9) | A2 · 2 |
| `src/app/(child)/result/[id]/page.tsx` | 신규 | 서버: 그 프로필의 끝난 세션만 | A2 · 2 |
| `src/app/(child)/result/[id]/result-view.tsx` | 신규 | 'use client'. 결과 틀(값 8) | A2 · 2 |
| `tests/integration/session-flow.test.ts` | 신규 | 서버 채점 · 끝내기 · 거부 id · 이어 할 자리 · 낱낱 거부 | A2 · 2 |
| `tests/integration/retry.test.ts` | 신규 | AC-2c 읽기 몫(c 가 말하기 몫을 더함) | A2 · 2 |
| `tests/unit/attempt-queue.test.ts` | 수정 | 나눠 보내기 · 거부 id | A2 · 2 |
| `tests/e2e/lessons.ts` | 신규 | e2e 전용 단계 견본 수업 넣기 · 그 단계 집(값 10) | A2 · 2 |
| `tests/e2e/reading.spec.ts` | 신규 | AC-3a e2e | A2 · 2 |
| `tests/e2e/session.spec.ts` | 수정 | P10 '둘째 활동부터 보기만' 시험을 끝까지 하는 시험으로 | A2 · 2 |
| `src/components/answer/{choice,tiles,typing}.tsx` | 수정 | `initial` · `onChange`(같은 입력 되살리기) · `reveal`(정답 보이기) 속성 — 배치 동작은 그대로 | A3 · 3 |
| `src/components/session/writing-items.tsx` | 신규 | 'use client'. 쓰기 1~3 문항 활동(값 11) | A3 · 3 |
| `tests/e2e/writing.spec.ts` | 신규 | AC-4a e2e(b 가 4~12 를 더함) | A3 · 3 |
| `tests/e2e/resume.spec.ts` | 신규 | AC-6a(b 가 초고 글을 더함) | A3 · 3 |
| `src/server/alerts/device.ts` | 신규 | `server-only`. 기기 알림(마이크 못 씀 · 마이크 멈춤 · 말소리 없음) — 배치 함수를 옮김(값 12) | A4 · 4 |
| `src/server/placement/index.ts` | 수정 | `recordPlacementMicAlert` 가 `recordDeviceAlert` 를 부름(동작 같음) | A4 · 4 |
| `src/components/session/speaking.tsx` | 신규 | 'use client'. 따라 말하기 · 듣기 · 질문 답(앱 판정) · 마이크 안내(값 12) | A4 · 4 |
| `tests/e2e/speaking.spec.ts` | 신규 | AC-5b 1 · 5c · 5e 1 · 4 · 5f · N3(c 가 3~12 를 더함) | A4 · 4 |

### 요청하는 공용 변경(컨트롤러가 합친다)

| # | 파일 | 바꿀 것 | 차례 · 까닭 |
|---|---|---|---|
| 1 | `tests/fixtures/settings.ts` | `TEST_SETTINGS` 에 12절 기본값 그대로(범위 집 전체): `ui.wait_hint_seconds` [1, 5] · `ui.match_phrase_levels` [0.9, 0.6] · `ui.auto_next_seconds` 1 · `speaking.match_weight` 0.5 · `speaking.listening_weight` 0.2 · `speaking.answer_match_pass` 0.8 · `speaking.prepare_seconds` 30 · `speaking.answer_max_seconds.1-3` 30 · `.4-6` 30 · `.7-9` 60 · `.10-12` 150 · `writing.thinkout_from_level` 6 | 0. 실시드 `seed/settings.json`(P6a)에는 모두 있고 값이 같다. 시험용 시드 설정(`loadableSettings`)은 이 표에서 가져온다(묶음 위험 4) |
| 2 | 개발용 DB 둘 | 공용 변경 1 뒤 로컬 `pnpm db:dev --reset`, Supabase 개발용 프로젝트는 시험용 시드 다시 적재(C75 길 — 설정만 더해도 됨) | 2 끝. **안 하면 프리뷰 세션 화면이 SettingMissingError 로 멈춘다**(정할 것 카) |
| 3 | `tests/e2e/font-size.spec.ts`(P10 차례 7) | 차례 10 에 P11 화면을 더함(c 마무리) | P10 차례 7 의 `tests/e2e/child-size.ts` 가 바탕에 있어야 한다 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **활동 모델(`src/core/session/preview.ts` `activitiesOf`)** — DB · 시계 없음. 입력 `{ area, level, content, part?: "draft" | "rewrite", thinkout?: boolean, corrections?: number, confirmQuestions?: number }`(부르는 쪽이 level_specs · 설정 · 첨삭에서 채움). 돌려주는 `Activity[]` 의 차례 번호(1부터)가 `attempts.activity_no` 다.
   - 읽기: `preview` → `reading-passage` → `reading-question`(문항 수만큼).
   - 쓰기 `items`(1~3): `preview` → `writing-item`(문항 수만큼).
   - 쓰기 `guided`(4~5, b): `preview` → `writing-task` → `writing-guided`(문장 전부 한 화면 · 한 제출 · 확인도 같은 화면 — 4절 '확인은 같은 화면에', 정할 것 마) → `writing-own-repeat`(내 문장 듣고 따라 말하기, 선택). P10 의 `writing-sentence` × n 은 없앤다.
   - 쓰기 `composition` 첫 세션(`part` draft, b): `preview` → `writing-task` → `thinkout`(`thinkout` 참일 때 — 단계 ≥ writing.thinkout_from_level) → `draft`.
   - 쓰기 둘째 세션(`part` rewrite, b): `feedback-praise` → `feedback-correction`(교정 수만큼, 0 이면 없음) → `rewrite` → `model-answer` → `own-speak`. 새 단어 미리보기가 없다(3.3 6~12 둘째 세션 행 · AC-4c '첨삭 · 고쳐 쓰기 · 모범 답안 순서로 열린다').
   - 말하기: `preview` → `repeat-word` → `repeat-sentence` → `listening` → `picture-task`(있으면 — **질문보다 먼저**, 3.3 표 6 · 8단계 행 차례, 정할 것 마) → `question` → `presentation`(있으면) → `confirm-question`(`confirmQuestions` 수만큼 — level_specs presentation.confirmQuestions).
   - 회화는 빈 목록(1-나). 시험용 시드 1단계 세 영역의 차례 번호는 P10 과 같다(말하기 1단계는 그림 칸이 없어 바뀌지 않음) — 프리뷰에 남은 진행 세션이 그대로 이어진다.
2. **시도 꼴 · 앱 채점 · 이어 할 자리(`src/core/session/attempt.ts`)** — DB · 시계 없음.
   - `attempts.input` = `{ v: 1, kind: <활동 종류>, step: "final" | "progress", …내용 }`(Zod 판별 합). P10 의 꼬리표 없는 미리보기 시도 `{ shownWords }` 는 `{ v: 1, kind: "preview", step: "final", shownWords }` 로 읽는다. 내용(a 몫): `preview` `shownWords: string[]` · `reading-passage` `tappedWords: string[]`(누른 글로서리 낱말의 원형 — P12 단어장) · `reading-question` · `listening` `tries: number[]`(고른 번호, 첫째가 점수) · `writing-item` `tries: Answer[]`(P10 `Answer` 의 choice · tiles · text) · `repeat-word` · `repeat-sentence` `heard: string[]`(시도마다 인식 글) · `failures: number` · `skipped?: "recognition" | "no_mic" | "silent" | "stalled"` · `question`(앱 판정) `heard: string[]` · `echo?: string`('같이 말해 볼까요' 뒤 말) · `failures` · `skipped?`. b · c 가 자기 종류를 더한다(그 plan 값). JSON 글자 상한은 P10 `INPUT_JSON_MAX` 4000 그대로.
   - `appActivityResult(activity, lesson, input, ctx)` → `{ score: number | null, wordResults: { word: string; correct: boolean }[], wordCount: number | null }`. `ctx` = `{ answerMatchPass, homophones, unitWords, lemmaOf(surface) }`. 점수(3.7): `reading-question` · `listening` · `writing-item` 은 첫 시도가 맞으면 1 아니면 0(`checkAnswer`, 몰라요 없음). `repeat-*` 는 `heard` 가운데 가장 높은 `matchRate`(nameSlot any-word), 건너뛰었으면 null(7절 '점수에서 뺀다'). `question`(앱 판정 — 그 단계 level_specs `questions.acceptedMin > 0` 인 1~2단계, C38 · C66. 시드 질문의 `accepted` 칸 유무로 가르지 않는다 — e2e 가 1단계 수업을 3단계로 복제해도 AI 판정이 되게)은 첫 인식 글의 `bestMatchRate(accepted, …)` ≥ answerMatchPass 면 1 아니면 0. `preview` · `reading-passage` 는 null.
   - 단어별 정오(정할 것 라 — 정본에 뽑는 규칙이 없다): 단원 단어(수업 `unitWords`, 원형)만, **앱이 정답을 아는 낱말 문항에서만** 낸다. 읽기 그림 문항 · 듣기 그림 문항은 정답 보기 낱말, 쓰기 `pick-word` 는 `picture`, `copy-tiles` · `build-tiles` · `fill-letters` · `dictation` 은 `word`, 조립은 첫 허용 정답에 든 단원 단어 — 모두 그 문항의 첫 시도 정오. 따라 말하기는 목표에 든 단원 단어마다 가장 높은 시도에서 정렬로 맞았는지(`matchedTargetWords`). 1~2단계 질문 답은 가장 가까운 허용 답에 든 단원 단어 — 판정 정오. 글 보기 이해 문항 · AI 판정 활동 · 쓰기 4~12 는 내지 않는다(틀린 낱말을 잘못 당기지 않게 — 3.4 '틀린 단어는 다음 복습일을 다음 학습일로').
   - 단어 수: 말하기는 인식 글 낱말 수의 합, 그 밖은 null(b 가 쓴 글 낱말 수).
   - `resumePointOf(activities, finals: number[])` → `{ next } | { done: true }` — `finals` 는 서버의 끝 시도 차례 번호 ∪ 이 기기 대기열에 남은 끝 시도. **끝 시도가 없는 가장 앞 활동**이다(P10 의 '가장 큰 번호 + 1'을 바꿈 — 서버 액션이 저장한 AI 활동이 앞 활동의 대기열 시도보다 먼저 닿아도 건너뛰지 않게). 진행 시도(`progress`)는 자리를 옮기지 않는다.
3. **세션 점수(`src/core/scoring/score.ts` `sessionScoreOf`)** — 입력 `{ area, shape, activities: { kind, score: number | null }[], rubric?: { task, grammar, vocabulary }, weights: { a, L } }` → `number | null`(0~1, 반올림하지 않음).
   - 읽기 · 쓰기 1~3: 첫 시도 정답률(문항 점수 평균).
   - 쓰기 4~5: `writing-guided` 점수(고칠 곳 없는 문장 수 ÷ 문장 수 — b 가 확인 결과로 채움). 확인이 실패했으면 null.
   - 쓰기 6~12 첫 세션: 채점표 평균 ÷ 4(첨삭이 올 때 b 가 부름). 첨삭 전 · 둘째 세션은 null.
   - 말하기(발표 없음): R = 따라 말하기 평균, Q = 질문 답 · 그림 보고 말하기 평균, Lr = 듣기 정답률(모두 null 뺀 평균). (1 − L) × {a × R + (1 − a) × Q} + L × Lr. Q 가 없으면 a = 1(3.7 'AI 평가를 못 한 3~8단계'), R 이 없으면 a = 0, Lr 이 없으면 L = 0, R · Q 둘 다 없으면 null.
   - 말하기(발표 있음, 9~12): E = 발표 · 확인 질문 답 평균(각 (내용 + 문법) ÷ 2 ÷ 4). (1 − L) × E + L × Lr. E 가 없으면 null(3.7 '9~12단계는 넣지 않는다').
   - 점수가 null 인 세션은 최근 성적에서 빠진다(P12 가 평균을 낼 때). 보강 · 연습 · 안 해 본 수업 · 다시 하기도 점수는 남기고 빼는 일은 P12(3.7 표).
4. **말하기 판정(`src/core/speaking/judge.ts`)** — DB · 시계 없음.
   - `resultPhraseOf(rate, [high, mid])` → `"good"`(≥ high, '잘 말했어요') · `"close"`(≥ mid, '거의 다 맞았어요') · `"again"`('한 번 더 들어 볼까요'). 경계는 ui.match_phrase_levels.
   - `judgeAppAnswer(heard, accepted, { pass, homophones })` → `{ correct, rate, closest }`(허용 답이 여럿이면 가장 높은 일치율, 6.2).
   - `answerShapeOf(activity, levelSpec)` → `"one-sentence" | "multi-sentence"`: 따라 말하기는 한 문장, 질문 답은 level_specs `questions.answerSentences.max ≥ 2` 면 두 문장 이상(5~8단계 — 7절 '5단계부터의 질문 답'), 그림 보고 말하기 · 발표 · 확인 질문은 두 문장 이상. 두 문장 이상의 상한은 speaking.answer_max_seconds.<구간>(P2a `endRuleFor({ area: "speaking", level, answer, capSeconds })`).
   - `speakingCounters` 줄이기 함수(7절 오류 행): 활동마다 retry 갈래 실패(no-speech · aborted · 결과 없음 · audio-capture)를 세어 speech.max_retries 면 그 활동을 건너뜀(점수에서 뺌) · 같은 활동에서 audio-capture 가 `MIC_CAPTURE_STREAK`(3, 7절 고정 수 — P10 `src/components/answer/repeat.tsx` 의 상수를 이 파일로 옮기고 repeat.tsx 는 여기서 가져온다. core 는 react 파일을 못 가져온다 — 의존 규칙) 번 이어지면 '마이크를 쓸 수 없음' · 세션 전체에서 audio-capture · aborted · 결과 없음이 성공 없이 speech.max_retries × 2 번 이어지면 '마이크가 멈춤'(no-speech 는 안 셈) · no-speech 로만 끝난 활동이 speech.silent_items_max 개 이어지면 '말소리 없음'(C22) · network 는 안 셈. 감시 타이머가 두 번 멈춤(P2b `stalled`)은 '마이크가 멈춤'.
   - `englishSentencesOf(inputs)` = 말하기 세션 시도의 인식 글이 있는 발화 수(따라 말하기 시도 · 질문 답 · '같이 말해 볼까요' 뒤 말 · 발표 · 확인 질문 답, 빈 글 · 실패는 안 셈 — 4절 부모 화면 '오늘 영어로 말한 문장', C41). 쓰기 세션의 내 문장 말하기는 안 센다(5절 '말하기 · 회화 세션').
5. **세션 서버(`src/server/session/index.ts`)** — P10 함수를 고친다.
   - `saveSessionAttempts`: 묶음을 통째로 거부하지 않고 시도마다 `AttemptSchema` + 값 2 의 꼴로 본다. 꼴이 틀린 시도 id 는 `rejected` 로 돌려준다(`{ ok: true, accepted, rejected }`). 받은 시도는 그 세션의 수업 내용으로 `appActivityResult` 를 다시 불러 `score` · `word_results` · `word_count` 를 쓴다(서버 값이 정본 — 화면이 보낸 점수는 받지 않는다). AI 활동 종류의 끝 시도는 이 길로 받지 않는다(b · c 서버 액션이 저장 — AI 결과 없이 건너뛴 끝 시도만 받음, c 값 3). 끝나거나 닫힌 세션의 늦은 시도는 지금처럼 받은 것으로 치고 버린다(b 가 중단된 초고 세션의 초고 진행 시도만 예외로 받음).
   - `finishLessonSession({ sessionId })`(서버 액션 `finishSession`): 그 프로필의 진행 세션이 아니면 끝난 세션은 `{ ok: true, already: true }`, 남의 세션은 거부. 한 트랜잭션: 세션 행 `FOR UPDATE` → 활동 1..n 의 끝 시도가 다 있는지(없으면 `{ ok: false, reason: "incomplete", missing }` — 화면이 대기열을 비운 뒤 다시 부름) → `sessionScoreOf` → sessions `{ status: "completed", completed_at: now, learning_day: learningDayOf(now, app.*), score, english_sentences }`(`WHERE status = 'in_progress'`, 두 번 불러도 같다). 쓰기 6~12 첫 세션은 이 길이 아니라 b 의 초고 제출이 끝낸다.
   - `loadSessionView`: 지금 활동 = `resumePointOf`(서버 끝 시도), 화면이 기기 대기열을 합쳐 다시 셈. 더해 넘기는 것: `config` = `speech`(P2a `speechSettingsFrom`) · `ui`(wait_hint_seconds · match_phrase_levels · auto_next_seconds) · `speaking`(answer_match_pass · 그 구간 answer_max_seconds · prepare_seconds) · 동음이의어(P9c `loadSeedList("homophones")`, 없으면 빈 묶음 + 경고 한 번 — P10 배치와 같은 꼴) · 단원 단어의 원형 표(vocab `forms`) · 말하기 `answerShape`(값 4) · `appJudged`(level_specs `questions.acceptedMin > 0`)와 `showKo`(P10). 끝난 세션이면 없음(쪽이 `/result/<id>` 로).
6. **대기열 · 활동 안 입력(`src/lib/attempt-queue.ts` · `src/lib/session-input.ts`).**
   - 대기열: 보낼 때 `ATTEMPTS_PER_BATCH_MAX`(50 — P10 `src/server/session/index.ts` 의 상수를 `src/core/session/attempt.ts` 로 옮겨 서버와 대기열이 함께 가져옴. 대기열은 `server-only` 파일을 못 가져온다)씩 나눈다. 서버가 돌려준 `accepted` 와 `rejected` 를 둘 다 지운다(꼴이 틀린 시도가 영영 남지 않게 — 장부 M-2). 버린 시도는 `console.warn` 에 수만 남긴다(입력 글을 내지 않음). `idle()` 뒤 `flush()` 를 '홈' · '다음 수업' · 끝내기 앞에서 부른다.
   - 활동 안 입력: localStorage 키 `momo.session-input.v1`(제안) = `{ [sessionId]: { [activityNo]: 조각 상태 } }`. 조각이 바뀔 때 쓰고, 그 활동의 끝 시도를 대기열에 넣거나 세션이 끝나면 지운다. localStorage 를 못 쓰면 메모리. 다른 기기에서 이어 하면 활동은 같고 입력은 빈 채다(8절 '두 번째 기기는 이어 한다'의 범위 — 쓰기 6~12 초고 글은 b 가 서버에도 저장).
7. **세션 틀(`session-frame.tsx`)** — P10 의 위 종이 띠 · 활동 점 · '홈'은 그대로. 활동마다 조각을 고른다(읽기 값 9 · 쓰기 값 11 · 말하기 값 12, b · c 가 더함). 조각은 `onDone(끝 내용)` 하나로 끝을 알린다 → 틀이 `{ clientAttemptId: crypto.randomUUID(), sessionId, activityNo, input: { v: 1, kind, step: "final", … } }` 을 대기열에 넣고 다음 활동(AI 활동은 조각이 서버 액션으로 이미 저장했다는 `{ stored: true }`). 마지막 활동 뒤 `queue.idle()` → `finishSession` → `incomplete` 면 비우고 한 번 더(그래도 안 되면 7절 '인터넷이 끊겼어요. 연결되면 다시 해요'와 `online` 때 다시) → `/result/<id>`. 첫 누름(미리보기 '다음')에서 `unlockFromGesture()` 를 불러 뒤 활동의 저절로 읽기를 연다. 말하기 세션은 열 때 P10 `micUsable()` 이 아니면 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'만 보인다(7절, 세션은 진행으로 남음).
8. **결과 틀(`src/server/session/result.ts` · `result/[id]/*`).** `loadResultView(sessionId)`: 그 프로필의 끝난 세션(쓰기 6~12 첫 세션은 b 가 더함)이 아니면 없음(쪽이 홈으로). 자료 `{ area, kind, title, next }` — `next` 는 P10 `readLessonList` → `lessonListState` 의 `hereStart`. 화면: 제목 '수업을 끝냈어요!'(정본 밖) · 큰 버튼 '다음 수업'(hereStart 가 `lesson` · `resume` · `practice` 면 P10 `startLesson`, `feedback` 은 b) — 그 밖(단계 평가 · 복습 — P12)이나 없으면 큰 버튼 '수업 목록' · 작은 버튼 '홈'. 숫자 · 퍼센트 없음.
9. **읽기 조각(`src/components/session/reading.tsx`).**
   - 지문 활동: P5b `ReadingPassage`(그림 줄 · 새 단어 표시 그대로) + 소리 단추 '읽어 주기'(P10 `SoundButton`, 지문 전체를 읽음, 다시 누르면 멈춤 — 저절로 읽지 않음) + `onWordTap`: 글로서리의 모든 낱말(고유 명사 빼고)을 누를 수 있고 누르면 그 낱말 위에 뜻(글로서리 `meaningKo`) 작은 쪽지가 뜬다. 누른 원형을 모아 끝 시도 `tappedWords` 로. 안내 줄 '모르는 단어를 누르면 뜻이 보여요'(정본 밖). '다음' 하나.
   - 문항 활동: P10 `ChoiceAnswer`(읽기 꼴) — 고르면 바로 채점. 맞으면 '맞았어요!' + 해설(`explanationKo`) + '다음'. 처음 틀리면 해설 + '한 번 더 풀기'(정답은 아직 안 보임) → 둘째 고름 뒤 정답 보기를 표시하고 '다음'(둘째는 점수 없음, 정할 것 마). 지문 배치: 가로 1180 은 B_Reading 처럼 지문 칸 · 문항 칸 나란히(지문 칸 안 세로 넘김), 세로 820 은 문항 위 작은 '지문 보기' → 쪽지(지문 · '읽어 주기' · '닫기')(정할 것 사).
10. **e2e 단계 견본(`tests/e2e/lessons.ts`).** `insertSampleLesson({ sample, kind?, lessonNo?, variant? })` — 견본 빌더(`readingLesson(ref, 4)` · `writingLesson(ref, 3 | 4 | 6)` · `speakingLesson(ref, 6 | 10)`, `ref = smallReferenceSet()` — e2e DB 규격과 같은 지어낸 낱말)를 lessons 행으로(판은 DB 최신 개정 · 정정 0, 검증 밖 — P10 `cloneLessons` 와 같은 결). 말하기 3 · 4단계는 P10 `cloneLessons({ area: "speaking", fromLevel: 1, toLevel, unit: 1 })`(질문의 `accepted` 칸이 남아도 판정 길은 그 단계 규격으로 가름 — 값 2). `atLevel({ area, level }, fn)` = `withHouseholdSetting("seed.complete_through_level", 12, …)` 안에서 `insertHousehold({ startLevels: { [area]: level } })` 뒤 fn.
11. **쓰기 1~3 조각(`src/components/session/writing-items.tsx`).** 갈래마다 안내 줄(정본 밖 문구 표) + P10 답 조각(`ChoiceAnswer` pick-word · `TileAnswer` 타일 · 카드 · `TypingAnswer` 받아쓰기 앱 안 자판) + 받아쓰기 · 빈 글자 채우기는 들어올 때 낱말을 한 번 읽고 '다시 듣기'. 조립의 놓는 칸은 카드 수만큼(목업 B_W3_Order, 정할 것 사). 판정 `checkAnswer`(C73). 맞으면 '맞았어요!'와 낱말 · 뜻 두 줄(목업 B_W1_Words) + '다음'. 틀리면 '정답은 이거예요'와 정답(타일 · 카드 차례 그대로) + '한 번 더 풀기' → 맞힐 때까지 다시(점수는 첫 시도). 끝 시도 `tries`. 기기 자판을 띄우는 요소(`input` · `textarea` · `contenteditable`)를 두지 않는다(AC-4a).
12. **말하기 조각과 기기 알림(`src/components/session/speaking.tsx` · `src/server/alerts/device.ts`).**
   - 따라 말하기: 목표(영어 24px) + 들어올 때 한 번 읽기 + '다시 듣기'. '말하기' → `listen(endRuleFor(한 문장))` → 인식 글을 아이 말 칸에 보이고(목표와 다른 낱말을 틀렸다고 표시하지 않음 — 3.3) 결과 말(값 4). 'good' 이면 ui.auto_next_seconds 뒤 저절로 다음. 아니면 '한 번 더 말하기'(큰) · '다음'(작은), 횟수 상한 없음, 점수는 가장 높은 일치율(정할 것 마). 실패는 '다시 한 번 말해 볼까요'(7절)로 다시 듣고 셈은 값 4.
   - 듣기 이해: 들어올 때 대본을 한 번 읽기 + '다시 듣기' + 보기(그림 · 글). 맞으면 '맞았어요!' + '다음', 처음 틀리면 '한 번 더 듣기'와 다시 고르기 → 정답 표시 + '다음'(정할 것 마). 대본 글은 보이지 않는다.
   - 질문 답(1~2단계 — level_specs `questions.acceptedMin > 0`, 값 2): 영어 질문을 읽은 뒤(읽기가 안 되는 기기면 바로) 1~4단계 한국어 뜻(`showKo`, C39). '말하기' → 판정(`judgeAppAnswer`) → 맞음: '잘 말했어요' + '다음'(질문 답은 저절로 넘기지 않음 — 4절은 따라 말하기만 적음, 정할 것 마). 다시: 바른 답 문장(`modelAnswer`)을 영어 줄로 보이며 들려주고 '같이 말해 볼까요' → 한 번 말하면(실패 셈 안에서) 결과 말 없이 다음. 판정 글자는 보이지 않는다(AC-5d).
   - 처음 마이크를 쓸 때 기기마다 한 번 '말한 소리는 인터넷으로 보내 글자로 바꿔요. 소리는 저장하지 않아요' + '알겠어요'(정본 밖) — P10 `MIC_NOTICE_KEY` 를 같이 씀(배치에서 봤으면 안 보임).
   - 막힌 안내(한 화면, 세션은 진행으로 남음): 마이크 못 씀 → `markMicUnavailable(code)` · '마이크가 필요해요. 부모님께 말해 주세요' · '홈' · 알림 `mic_unavailable`. 멈춤 → '마이크가 잘 안 돼요. 부모님께 말해 주세요' · '홈' · 알림 `mic_stalled`. 말소리 없음 → '말소리가 잘 안 들려요. 부모님께 말해 주세요' · '홈' · 알림 `speech_silent`(정할 것 자). network → '인터넷이 끊겼어요. 연결되면 다시 해요'(같은 활동에 남음).
   - `recordDeviceAlert({ kind: "mic_unavailable" | "mic_stalled" | "speech_silent", code, browser })`: P10 `recordPlacementMicAlert` 몸통을 옮긴 것(`createAlertOnce` once day, 값 `{ code, browser }` — 4절 '브라우저 이름과 시각'). 배치 · 세션 서버 액션이 같이 부른다.

### 정본 밖 문구(P11 셋 — 13절 C78, 정할 것 아)

4절 · 3.3 · 7절 · 8절 · C50 에 있는 문구(예: '다음' · '홈' · 결과 말 셋 · '한 번 더 말하기' · '한 번 더 풀기' · '같이 말해 볼까요' · '다 말했어요' · '다시 한 번 말해 볼까요' · 마이크 안내 셋 · '인터넷이 끊겼어요. 연결되면 다시 해요' · '이번에는 바로 써 볼까요' · '확인하고 있어요' · '글을 보냈어요. 첨삭이 오면 고쳐 쓰고 별을 받아요' · '첨삭 보기' · '첨삭이 왔어요' · '아직 글을 살펴보고 있어요' · '수업 목록' · '다음 수업' · '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' · '부모님도 볼 수 있어요')는 그대로 쓰고 아래에 넣지 않았다. 아래는 제안이다(해요체, 수는 설정값 · 규격에서 채움).

| 화면 | 자리 | 제안 문구 | plan |
|---|---|---|---|
| 세션 공통 | 맞음 · 틀림(정답 보임) | '맞았어요!'(목업 B_W1_Words) · '정답은 이거예요' | a |
| 결과 | 제목 | '수업을 끝냈어요!' | a |
| 읽기 지문 | 안내 · 소리 단추 | '모르는 단어를 누르면 뜻이 보여요'(목업 '노란 단어를 누르면 …'을 모든 낱말로) · '읽어 주기'(목업 B_Reading) | a |
| 읽기 문항(세로) | 지문 쪽지 | '지문 보기' · '닫기' | a |
| 쓰기 1~3 | 갈래별 안내 | pick-word '그림에 맞는 단어를 골라요' · copy-tiles '단어를 보고 글자를 차례대로 놓아요' · build-tiles '뜻에 맞게 글자를 놓아 단어를 만들어요' · fill-letters '빈칸에 들어갈 글자를 놓아요' · dictation '잘 듣고 단어를 써요' · 조립 '이 뜻이 되게 카드를 놓아요' · '카드를 누르면 빈칸으로 가요'(목업 B_W3_Order 둘) | a |
| 말하기 · 쓰기 · 듣기 | 소리 단추 · 처음 마이크 안내 단추 · 듣기 틀림 | '다시 듣기'(목업 B_Speaking · B_W1_Words) · '알겠어요' · '한 번 더 듣기' | a |
| 쓰기 1~3 받아쓰기 | 내기 단추(쓴 글을 내는 것 — '다음'과 가름, 컨트롤러 2026-10-18 fix 3 · review-p11-3-design M-2) | '다 썼어요'(쓰기 4~5 와 같은 말) | a |
| 말하기 1~2 | 활동 첫 줄 안내(읽기 · 쓰기와 같은 꼴 — 컨트롤러 2026-10-18 fix 4 · review-p11-4-design M-3) | 따라 말하기 '잘 듣고 따라 말해 봐요' · 듣기 이해 '잘 듣고 알맞은 것을 골라요' · 질문 답 '질문을 듣고 영어로 대답해 봐요' | a |
| 쓰기 4~5 | 과제 · 단어 상자 · 제출 | '과제' · '예시' · '단어 상자'(목업 B_Writing) · '다 썼어요'(목업 B_Writing) | b |
| 쓰기 4~5 | 고칠 곳 · 보기 · 틀린 보기 · 고침 | '색칠한 곳을 눌러 고쳐 봐요' · '알맞은 말을 골라요' · '다시 골라 볼까요' · '잘 고쳤어요!' | b |
| 쓰기 4~5 · 6~12 | 내 문장 말하기 · 선택 | '내 문장을 듣고 따라 말해 봐요' · '내 글을 소리 내어 읽어 봐요' · '건너뛰기' | b |
| 쓰기 6~12 | 생각 꺼내기 | '생각 꺼내기'(정본 용어) · '직접 쓸래요' · '보내기' · '한글로 짧게 써도 돼요'(입력 안내) | b |
| 쓰기 6~12 | 초고 화면 | '내 생각'(요약) · '쓸 수 있는 단어' · '이렇게 시작해 봐요'(시작 틀) · '<최소>~<최대>단어로 써요'(level_specs amount, 문장 수 규격이면 '<최소>~<최대>문장으로 써요') · '지금 <n>단어' · '다 썼어요' | b |
| 쓰기 둘째 세션 | 칭찬 · 교정 · 고쳐 쓰기 · 모범 답안 | '잘한 점' · '이렇게 고쳐 봐요' · '고쳐 쓰기' · '다 고쳤어요' · '모범 답안' | b |
| 말하기 그림 · 발표 | 안내 · 생각 화면 | '그림을 보고 말해 봐요' · '생각하는 시간이에요' · '쓸 말' · '<n>초'(남은 초, speaking.prepare_seconds) | c |

## 작업 순서 (Order of work)

명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(서브에이전트 환경, P10 과 같음). 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 시험의 설계 숫자는 `TEST_SETTINGS` · `loadableSettings()` 에서 읽는다. 통합 · e2e 는 CI 로(가정 (다)).

0. (차례 0) [사람 · 컨트롤러] 바탕 가지 · 워크트리 p11 · 공용 변경 1(13절 C76~C81 은 승인 때 적힘). 완료: 바탕에서 `pnpm build` · `pnpm test` 초록, CI 한 번 초록.
1. (차례 1) [검증] 시험 먼저 — `tests/unit/{session-preview,session-attempt,score,speaking-judge,match-rate,answer-check}.test.ts` → `src/core/session/preview.ts` · `src/core/session/attempt.ts` · `src/core/scoring/score.ts` · `src/core/speaking/judge.ts` · `src/core/speech/match-rate.ts`. 완료: 단위 초록, 검토 묶음 A1(code-reviewer — 3.7 · 7절 대조).
2. (차례 2) [서버][화면] `tests/integration/{session-flow,retry}.test.ts` · `tests/unit/attempt-queue.test.ts` → `src/server/session/index.ts` · `src/server/actions/session.ts`(finishSession) · `src/lib/attempt-queue.ts` · `src/lib/session-input.ts` · `session/[id]/*` · `src/components/activities/reading.tsx`(onWordTap) · `src/components/session/reading.tsx` · `src/server/session/result.ts` · `result/[id]/*` · `tests/e2e/lessons.ts` → `tests/e2e/{reading,session}.spec.ts`. 완료: 통합 · e2e 초록(CI), 검토 묶음 A2 → code-reviewer · design-reviewer(B_Reading · B_Result 와 4절, 세로 820 · 가로 1180 사진). **볼 수 있는 화면: 읽기 1단계 수업 끝까지 → 결과 → 다음 수업.**
3. [컨트롤러] 공용 변경 2(개발용 DB 둘 설정 채우기). [사람] 요청자 지시가 있으면 커밋 · 프리뷰. 완료: 프리뷰 `/session/<id>` 200.
4. (차례 3) [화면] `src/components/answer/{choice,tiles,typing}.tsx`(initial · onChange · reveal) · `src/components/session/writing-items.tsx` · 틀 → `tests/e2e/{writing,resume}.spec.ts`. P10 배치 e2e 가 그대로 초록인지 함께 본다. 완료: 검토 묶음 A3(B_W1_Words · B_W3_Order). **볼 수 있는 화면: 쓰기 1단계 수업 끝까지 · 닫았다 열면 같은 자리.**
5. (차례 4) [서버][화면] `src/server/alerts/device.ts` · `src/server/placement/index.ts` · `reportSessionMic` · `src/components/session/speaking.tsx` · 틀 → `tests/e2e/speaking.spec.ts`. 완료: 검토 묶음 A4(B_Speaking). **볼 수 있는 화면: 말하기 1단계 수업 끝까지 · 마이크 안내.**
   (차례 5~9 는 b · c, 차례 10 마무리는 c 작업 3)

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 바탕에 `seed/lists` 가 없으면 AI 흐름이 늘 `config` 이고 따라 말하기가 빈 동음이의어로 채점된다 | b · c 의 가짜 AI e2e 가 안 돎 · 프리뷰 AI 전부 | 바탕에 P6a 합침(정할 것 나). b 작업 1 첫 시험이 '목록이 있어 AI 를 부른다'를 본다 |
| 2 | 화면 판정과 서버 판정이 다르다 | 화면은 '맞았어요!'인데 점수 0 | 같은 순수 함수(`appActivityResult` · `checkAnswer` · `judgeAppAnswer`) · 같은 동음이의어 · 같은 설정. 통합 시험이 화면 꼴 시도로 서버 점수를 맞댄다 |
| 3 | 이어 할 자리 규칙을 바꿔 P10 시험 · 프리뷰 진행 세션이 어긋난다 | '다시 열면 다음 활동' 통합 · e2e | 꼬리표 없는 미리보기 시도를 끝으로 읽음 · 1단계 차례 번호 그대로(값 1). P10 시험을 고침 목록에 넣음 |
| 4 | 대기열에 남은 끝 시도 때문에 끝내기가 `incomplete` 로 막힌다 | 결과로 못 감 | 끝내기 앞 `idle()` · `flush()` · 한 번 더 · 끊김 안내와 `online` 다시. 통합 시험 |
| 5 | P10 답 조각에 속성을 더하다 배치가 깨진다 | AC-11 e2e | 속성은 모두 선택(없으면 지금 동작). 차례 3 에서 배치 e2e 함께 |
| 6 | 단어별 정오 규칙이 정본에 없다 | P12 숙달 · 복습일이 흔들림 | 정할 것 라(13절). 앱이 정답을 아는 낱말만 · AI 판정은 안 냄 |
| 7 | 시험용 설정 키를 더한 뒤 개발용 DB 를 안 채움 | 프리뷰 세션 화면이 설정 없음 오류 | 공용 변경 2 를 작업 순서 3 에 둠(정할 것 카) |
| 8 | 저절로 읽기는 iOS 에서 누름 뒤에만 된다 | 따라 말하기 · 듣기 첫 읽기가 소리 없음 | 첫 '다음' 누름에서 `unlockFromGesture()`. 안 되면 '다시 듣기'로(질문 뜻은 읽기 실패면 바로 보임) |
| 9 | 지문 낱말 누르기가 긴 지문(150~300단어)에서 누르는 곳 56px 를 못 지킨다 | AC-N9 | 낱말은 글줄 안의 단추(높이는 줄 높이 — 4절 '누르는 곳 56px'는 따로 둔 단추에 둠, 글 안 낱말은 크기 시험의 예외 표시 `data-inline-word`) — 화면 검토가 판정(정할 것 사) |
| 10 | 가짜 음성 대본으로만 시험한다 | 실기(iPad)에서 결과 말 · 끝 시간이 다름 | P2 실기 결과(H2)와 대본을 맞춤. 차례 11 요청자 iPad 시험 |
| 11 | 통합 · e2e 를 CI 로만 돌린다 | 고침 한 바퀴가 느림 | 단위 · tsc · biome · build 를 먼저 로컬로. CI 가지 다시 만들기(가정 (다)) |
| 12 | P10 차례 7(크기 도우미)이 늦으면 P11 크기 시험 자리가 없다 | AC-N9 | 공용 변경 3 · 정할 것 나 — P10 마무리를 바탕 전에 |

### 정할 것(컨트롤러 — 보고 `task-p11-plan-report.md` 와 같은 글자. b 는 ㄱ~, c 는 갑~)

13절 열은 한 줄이 필요한지와 그 번호다. 모두 권함대로 받았다(컨트롤러 2026-10-18 04:1x).

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| 가 | P11 을 셋으로 · 차례 1~11 · 검토 묶음 아홉 · 브리프의 '말하기 1~3'을 1~2 로(3단계는 AI 판정이라 c) | 위 '나눈 까닭' · '화면을 보는 차례'대로. 묶음 plan P11 행을 a · b · c 셋으로(컨트롤러가 배정표 고침) | 아니오 |
| 나 | 바탕 가지 | P10(fix 5 · 차례 7 커밋) + P9c + P6a(seed/lists 때문에 필수) + P7b(권함). P10 차례 7 을 바탕 전에 끝냄 | 아니오 |
| 다 | 활동 모델 · 시도 꼴 · 이어 할 자리 · 채점 자리 | 값 1 · 2 · 5 · 6 대로 — 활동마다 끝 시도 하나 · 끝 시도가 없는 가장 앞 활동에서 이어 함 · 화면은 바로 판정하고 서버가 저장 때 다시 채점(서버 값이 정본) · 활동 안 입력은 기기 저장 | 아니오 |
| 라 | 단어별 정오를 뽑는 규칙(3.4 · 5절 attempts 에 칸만 있음) | 값 2 셋째 줄: 단원 단어만, 앱이 정답을 아는 낱말 문항(그림 · 쓰기 1~3 · 따라 말하기 정렬 · 1~2단계 질문 답)에서만, 글 보기 이해 · AI 판정 · 쓰기 4~12 는 내지 않음 | C76 |
| 마 | 활동 흐름 해석(정본에 세부 없음, b · c 몫 포함) | (1) 읽기: 맞으면 '맞았어요!' + 해설, 처음 틀리면 해설 + '한 번 더 풀기'(정답은 둘째 뒤) — 3.3 '틀린 문제 해설과 다시 풀기'·AC-3a '바로 채점 · 해설'. (2) 쓰기 1~3: 틀리면 정답을 보이고 맞힐 때까지 다시(점수는 첫 시도). (3) 듣기 이해: 처음 틀리면 '한 번 더 듣기' 한 번 뒤 정답. (4) 따라 말하기 '한 번 더 말하기'는 상한 없음 · 점수는 가장 높은 일치율. (5) 질문 답은 '잘 말했어요' 뒤 '다음'(저절로 넘김은 따라 말하기만), '같이 말해 볼까요'는 바른 답 문장을 영어 줄로 보이며 들려줌. (6) b: 쓰기 4~5 는 문장 전부 한 화면 · 한 제출 · 확인도 같은 화면, 고칠 곳 보기를 틀리면 다시 고르기, 시드 힌트는 아이에게 안 보임, 5단계 바꿀 칸은 문장 안 빈칸에 직접 씀; 중단된 초고를 되살릴 때 생각 꺼내기 결과도 되살리고 생각 꺼내기는 건너뜀; '내 문장 듣고 따라 말하기' · '내 문장 말하기'는 '건너뛰기' 있음 · 마이크 없으면 건너뜀 · 점수 · 영어로 말한 문장 수에 안 셈. (7) c: 말하기 6 · 8단계는 그림 보고 말하기가 질문보다 먼저(3.3 표 차례), 3~8단계 AI 피드백 한 문장과 4~8단계 문법 지적 한 줄을 보임 | C77 |
| 바 | 결과 화면 자리 | P11 이 `/result/<id>` 틀('수업을 끝냈어요!' · '다음 수업' · '홈' · b 의 쓰기 6+ 첫 세션 문구 · 기다림 · '첨삭 보기')을 만들고 P12 가 별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' · '다시 했어요' · 'n단계 평가 보기'를 더함 — AC-4c(P11)가 결과 화면 일부를 요구해서. 묶음 plan P12 행 고침 | 아니오 |
| 사 | 화면 세부 | 읽기 문항의 지문: 가로 나란히(B_Reading) · 세로 '지문 보기' 쪽지. 조립 놓는 칸은 카드 수만큼(B_W3_Order). 소리 단추는 '다시 듣기' 글이 보이는 단추(목업). 저절로 읽기는 들어올 때 한 번(받아쓰기 · 빈 글자 채우기 · 따라 말하기 · 듣기 · 질문 · 확인 질문), 지문 · 미리보기는 누를 때만. 지문 안 낱말 단추는 크기 시험의 예외 표시(위험 9) | 아니오 |
| 아 | 정본 밖 문구(위 표) | 표대로. C72 처럼 13절 한 줄 + 4절 읽기 · 쓰기 · 말하기 세션 행 · 세션 결과 행이 이 결정을 가리킴 | C78 |
| 자 | '말소리가 들어오지 않음' 알림 종류 값 · 기기 알림 함수 | `speech_silent`(C56 (4) 위임 — P9 `AI_ALERT_KINDS` · P10 `mic_*` 와 같은 snake_case). 배치 함수를 `recordDeviceAlert` 로 옮겨 세션과 같이 씀 | 아니오 |
| 차 | 미룰 것 둘 | session.length_factor 는 1-가에서 곱하지 않음(바꾸는 화면이 2차 · 기본 1.0 · 단원 복사본 키 목록에 없음) → 2차 설정 화면 때 단원 복사본에 더함. P4a `bandOf` ↔ P2a `level-band` 하나로는 P12 로 | 아니오 |
| 카 | 개발용 DB 설정 채우기 | 공용 변경 1 을 합친 직후 컨트롤러가 로컬 · Supabase 개발용 둘 다(작업 순서 3) | 아니오 |

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 '정할 것'에 올리고 컨트롤러가 13절에 한 줄 넣은 뒤 구현한다.
- 설계 숫자는 settings(12절)에서 읽는다(결과 말 경계 · 저절로 넘김 초 · 일치율 기준 · a · L · 재시도 수 · 말소리 없음 수 · 상한 초). 시험도 `TEST_SETTINGS` 에서. 기술 값(묶음 크기 50 · 저장 키)은 그 파일 위 대문자 상수(C72 꼴 — P7b check-ids 허용 목록). 7절 고정 수 '세 번'은 `MIC_CAPTURE_STREAK` 하나(값 4 — core 로 옮김). `src/core` 는 db · next · react 를 가져오지 않는다(의존 규칙 — 화면 쪽 상수를 core 로 옮기는 까닭).
- 시각은 한 시계(`@/server/clock` `now()`)에서 읽고 순수 함수에는 인자로. 질의 SQL 안에 `now()` 를 쓰지 않는다. 학습일은 `learningDayOf(now, app.timezone, app.day_start_hour)`. 화면 쪽 타이머는 `performance.now` · `setTimeout`.
- DB 는 서버 Drizzle 로만. 모든 서버 액션의 첫 문장은 `await requireAccess()`. 비울 수 있는 jsonb 에 JSON null 을 넣지 않는다. 마이그레이션을 만들지 않는다.
- **DB 오류는 오류 이름 · Postgres 코드만 남긴다** — `src/server/db/safe-error.ts` 의 `dbErrorTag` · `safeDbError` 를 쓴다(장부 '서버 액션 · 서버 함수의 DB 오류' 행 — P11 이 아이 답 글(attempts)을 처음 다루므로 `safeDbError` 단위 사례를 하나 더한다). 시도 입력 · 인식 글 · 쓴 글을 로그 · 오류 · 알림 값에 넣지 않는다.
- 녹음하지 않는다(`getUserMedia` · `MediaRecorder` 없음). 인식 글은 채점에만 서버로 보낸다(a 는 AI 로 보내지 않음).
- 아이 화면: 한 화면 한 행동 · 해요체 · 안내 20px · 영어 24px · 버튼 22px · 누르는 곳 56 × 56px · 퍼센트 없음 · 판정 글자 없음(말하기 질문 답). 시험 이름은 앱 안 이름(모모 · 토리)만. 비밀값 · 아이 이름은 어디에도 적지 않는다.
- 용어는 영역 · 단계 · 단원 · 활동 · 판 · 칸. 코드 식별자와 브랜치 이름은 영어 ASCII.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer · design-reviewer Opus · xhigh). 동시에 셋까지. 커밋 · PR 은 요청자 지시 때만(H14).

### 묶음 plan 과 다르게 한 것

1. P11 을 a · b · c 셋으로 나누고 한 브랜치에서 차례대로 한다(묶음 위험 12).
2. 브리프 순서의 '말하기 1~3'을 1~2 로 — 3단계 질문 답은 AI 판정이라 c(정할 것 가).
3. 결과 화면 틀을 P11 이 만든다(묶음 plan 은 P12) — AC-4c 가 결과 화면을 요구한다(정할 것 바).
4. 상호작용 조각은 `src/components/session/*` 에 새로 두고 P5b `src/components/activities/*` 는 보기 조각으로 남긴다(시드 보기 화면이 같이 씀 — 묶음 위험 13 의 '상호작용만 더한다'를 조합으로). P5b `ReadingPassage` 에만 선택 속성 하나를 더한다.
5. 시험 파일: AC-4a 단위는 `answer-check.test.ts`(P10a 넘김), 크기는 P10 `font-size.spec.ts` 에 더함. 새로 `session-attempt` · `session-flow` · `resume` · `lessons`(e2e 도우미).
6. 바탕에 P6a · P9c · P7b 를 합친다(정할 것 나).

### 다른 P 에 넘길 것

- P12: `attempts.word_results`(값 2 규칙)와 `reading-passage` 의 `tappedWords` · 미리보기 `shownWords`(만남)로 단어장 · 복습일을 고친다. 최근 성적은 `sessions.score` 가 null 인 세션을 빼고 센다. 결과 화면(값 8)에 별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' · '다시 했어요' · 'n단계 평가 보기'를 더한다. 단계 평가 화면의 '빈칸 채우기'는 답을 문장 빈칸 안에 넣는다(장부 review-p05b-design-3 M-C — P11 은 수업에 이 갈래가 없음). P4a `bandOf` 하나로(정할 것 차).
- 1-나: 부모 화면이 `speech_silent` · `mic_*` 알림과 `sessions.english_sentences` 를 읽는다. '이 문제 이상해요'는 읽기 해설 · 쓰기 1~3 확인 · 결과 화면 자리에 단추를 더한다(지금은 자리만 없음). 'AI 쉬는 중' 상태가 b 의 1-가 안전 상한 처리를 바꾼다(b 정할 것 ㄴ).
- 2차: session.length_factor(정할 것 차) · 오늘의 한 문장.
- P8: 시드 브리프 — 쓰기 1~3 문항의 정답 낱말이 단원 단어와 같은 원형이게(단어별 정오가 그것만 셈) · 조립 카드는 소문자 그대로(C73).

### 확인한 사실과 출처(2026-10-18)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | next 16.4.2 `after()` 는 서버 함수 · 쪽 · Route Handler 에서 쓰고 경로의 maxDuration 동안 돈다. 서버 액션은 그 쪽의 maxDuration 을 따른다 | p10 워크트리 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md` · `…/02-route-segment-config/maxDuration.md` |
| 2 | Vercel Hobby 함수 시간은 300초 기본 · 최대 | https://vercel.com/docs/functions/limitations (2026-10-17 캐시) |
| 3 | P9c 공개 함수 넷 · `AiOutcome`(ok · normalized · checked · historyEntry / reason · refusals) · `AiDeps`(db · clock · client · lists) | `git show dae3afd:src/server/ai/index.ts` · `run.ts` |
| 4 | P9c 흐름은 금지어 목록이 없으면 `config`(AI 안 부름). P10 가지에 `seed/` 가 없고 P6a 에 `seed/lists` 넷이 있다 | `run.ts` · `seed-lists.ts` · `git ls-tree feature/1a-p06a-seed-reference seed` |
| 5 | P10 ↔ P9c 겹침 셋(seed-lists 는 같은 글), P10 ↔ P7b 둘 | `git merge-base` · `git diff --name-only` · `comm -12` |
| 6 | 스키마 열(sessions writing_part · score · english_sentences · learning_day, attempts input · ai_feedback · score · word_results · word_count · status 셋) | p10 `src/db/schema/learning.ts` · `content.ts` |
| 7 | P10 대기열 · 서버: 묶음 50 · 입력 4000자 · 묶음 통째 거부 · 늦은 시도 버림 · 이어 하기 = 가장 큰 활동 번호 + 1 · 활동 차례(말하기 질문 → 그림) | p10 `src/server/session/index.ts` · `src/lib/attempt-queue.ts` · `src/core/session/preview.ts` |
| 8 | 시드 규격 칸(말하기 questions en · ko · modelAnswer · accepted, pictureTask, presentation · fallbackQuestions / level_specs questions.answerSentences · koMeaning · acceptedMin · presentation.confirmQuestions / 쓰기 amount · guided input) | p10 `src/core/seed/schema/lesson.ts` · `reference.ts` |
| 9 | 시험용 시드 1단계 갈래(읽기 그림 문항 · 쓰기 pick-word · fill-letters · copy-tiles · 말하기 따라 말하기 · 그림 듣기 · 허용 답 질문), 견본 빌더 단계, 규격은 12단계 전부 | p10 `tests/fixtures/seed/builders.ts` 918~1199 · 1818~1840 · 2568~2737 |
| 10 | 시험용 설정에 P11 키 열둘이 없고, 실시드 settings.json 180 키에는 모두 있으며 값이 12절과 같다 | `tests/fixtures/settings.ts` · `git show f447bc5:seed/settings.json` |
| 11 | P2 음성 접점 `endRuleFor({ area: "speaking", … })` · `ListenOutcome` · 오류 갈래 · `SpeechPort` · 기기 저장 `momo.mic.v1` · `momo.mic-notice.v1` | p10 `src/core/speech/listen.ts` · `src/lib/speech/types.ts` · `src/lib/mic-state.ts` |
| 12 | 일치율 함수는 수만 낸다(낱말별 맞춤 없음) · P10 따라 말하기 조각은 배치 규칙(인식 글 안 보임 · 두 시도) | p10 `src/core/speech/match-rate.ts` 253~283 · `src/components/answer/repeat.tsx` |
| 13 | 이미 이름 붙은 AC 시험: AC-5e 단위 넷(P2a) · AC-5b 단위 넷(P4) · AC-3a 단위(P4) · AC-8b 통합 · AC-8d 통합 · AC-8n 통합 둘 · AC-5d 단위(P9) | `git grep '"AC-…'` 두 가지 |
| 14 | 배치 마이크 알림 `recordPlacementMicAlert`(createAlertOnce once day, 값 code · browser) | p10 `src/server/placement/index.ts` 803~840 |

(추측): iPad Safari 에서 `unlockFromGesture()` 뒤 다음 활동의 저절로 읽기가 된다(P2 실기 H2 기록으로 확인), 견본 빌더가 작은 틀 규격(`smallReferenceSet`)으로도 만들어진다(P4 시험은 기본 틀로 돎).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-3a(P11 몫) | e2e "AC-3a 읽기 4단계 세션의 지문은 55~80단어이고 문제는 4개이며 답을 고르면 바로 채점과 해설이 보인다" | `tests/e2e/reading.spec.ts` |
| AC-4a | 단위 "AC-4a 쓰기 1단계 빈 글자 채우기와 3단계 카드 조립은 앱이 채점하고 조립은 허용 정답 가운데 하나와 같으면 정답이며 첫 글자 대문자와 마침표 카드를 판정한다" + e2e "AC-4a 쓰기 1 · 3단계 세션은 AI 호출 0회로 채점되고 기기 자판이 뜨지 않으며 첫 활동은 새 단어 미리보기다" | `tests/unit/answer-check.test.ts` · `tests/e2e/writing.spec.ts` |
| AC-6a | e2e "AC-6a 세션 도중 앱을 닫고 다시 열면 같은 활동 · 같은 입력에서 이어진다(읽기 셋째 문항 · 쓰기 3단계 놓은 카드)"(b 가 쓰기 6단계 초고 글을 더함) | `tests/e2e/resume.spec.ts` |
| AC-6c | 단위 "AC-6c 점수 함수는 3.7 표의 경계값을 맞게 낸다(읽기 · 쓰기 1~3 첫 시도 정답률 · 쓰기 6~12 채점표 평균 ÷ 4 · 말하기 9~12)" · "AC-6c 쓰기 4단계 3문장 가운데 고칠 곳 없는 문장이 2개면 0.67 이다" · "AC-6c 말하기 1~8단계는 a = speaking.match_weight · L = speaking.listening_weight 로 계산하고 질문 답 평가가 하나도 없으면 a = 1 이다" · "AC-6c 점수 없는 세션(쓰기 확인 실패 · 첨삭 전 · 말하기 9~12 AI 평가 없음)은 점수가 비어 최근 성적에서 빠진다" | `tests/unit/score.test.ts` |
| AC-5b(1단계 몫) | e2e "AC-5b 말하기 1단계 세션은 따라 말하기 단어 5 · 문장 5, 듣기 이해 3문항, 질문 답 4개이고 듣기 이해 문항은 AI 호출 없이 채점된다" | `tests/e2e/speaking.spec.ts` |
| AC-5c(세션 몫) | e2e "AC-5c 말하기 세션 도중 마이크 권한을 거두면 세션이 진행으로 남고 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'이 보이며 audio-capture 한 번으로는 닫히지 않는다" | `speaking.spec.ts` |
| AC-5e(말하기 1 · 4 몫) | e2e "AC-5e 말하기 1단계 따라 말하기는 마지막 중간 결과 뒤 3초 조용하면, 4단계는 1.5초 조용하면 듣기가 끝난다"(4단계는 1단계 수업 복제) | `speaking.spec.ts` |
| AC-5f(1~2단계 몫) | 단위 "AC-5f 말하기 1단계 질문 답은 허용 답과의 일치율이 speaking.answer_match_pass 이상이면 맞음이고 아니면 다시다" · "AC-5f 일치율 0.95 는 '잘 말했어요', 0.7 은 '거의 다 맞았어요', 0.5 는 '한 번 더 들어 볼까요'다" + e2e "AC-5f 말하기 1단계 질문 답은 AI 호출 0회로 판정되고 다시면 바른 답 문장이 들리며 '같이 말해 볼까요' 뒤 한 번 말하면 결과 말 없이 다음 질문으로 간다" · "AC-5f 따라 말하기 일치율 0.95 는 '잘 말했어요'와 ui.auto_next_seconds 뒤 다음 문장, 0.7 은 '거의 다 맞았어요'와 '한 번 더 말하기'(큰) · '다음'(작은), 0.5 는 '한 번 더 들어 볼까요'가 보인다" · "AC-5f 하루 안전 상한에 닿은 날에도 말하기 1~2단계 질문 답은 그대로 된다" | `tests/unit/speaking-judge.test.ts` · `speaking.spec.ts` |
| AC-N3(세션 몫) | e2e "AC-N3 인식 이벤트가 오지 않는 가짜 API 에서 감시 타이머가 한 번 다시 시작한 뒤 또 멈추면 세션이 진행으로 남고 '마이크가 잘 안 돼요'와 '마이크가 멈춤' 알림이 생긴다" · "AC-N3 aborted 가 이어지는 가짜 API 에서 인식 실패가 여섯 번 이어지면 같은 안내와 알림이 나온다" · "AC-N3 no-speech 로만 끝난 말하기 문항이 speech.silent_items_max 개 이어지면 '말소리가 잘 안 들려요' 안내와 '말소리가 들어오지 않음' 알림이 나온다" · "AC-N3 network 오류는 '인터넷이 끊겼어요. 연결되면 다시 해요'를 보이고 다시 시도 횟수에 들지 않는다" | `speaking.spec.ts` |
| AC-2c(읽기 몫) | 통합 "AC-2c 지난 단원의 읽기 수업을 다시 하기로 끝내면 세션 점수가 sessions 에 남고 단어별 정오가 attempts 에 남으며 정규 수업 수(잠긴 단원 줄의 수)는 그대로다" | `tests/integration/retry.test.ts` |
| AC-N9(P11 화면) | e2e(c 마무리) "AC-N9 세션 활동 화면(읽기 · 쓰기 · 말하기 · 마이크 안내 · 쓰기 AI · 말하기 발표)과 결과 화면의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없고 세로 820 · 가로 1180 에서 가로 넘침이 없다" | `tests/e2e/font-size.spec.ts` |
| 세션 바탕(AC 접두 없음) | 단위 "세션 바탕: 이어 할 자리는 끝 시도가 없는 가장 앞 활동이고 P10 의 꼬리표 없는 미리보기 시도는 끝으로 본다" · "단어별 정오: 앱이 정답을 아는 낱말 문항의 단원 단어만 내고 따라 말하기는 정렬로 맞은 낱말만 맞음이다" · "영어로 말한 문장 수: 인식 글이 있는 발화마다 하나다" · "대기열: 50개씩 나눠 보내고 거부된 id 도 지운다" + 통합 "세션 바탕: 서버가 저장 때 다시 채점해 attempts 의 score · word_results · word_count 를 쓰고 화면이 보낸 점수는 받지 않는다" · "세션 바탕: 꼴이 틀린 시도는 그 시도만 거부되고 나머지는 받는다" · "세션 바탕: 끝내기는 모든 활동의 끝 시도가 있어야 되고 학습일 · 점수 · 완료 시각 · 영어로 말한 문장 수를 채우며 두 번 불러도 같다" · "세션 바탕: DB 오류 로그에 시도 입력 글이 없다" | `tests/unit/session-attempt.test.ts` · `speaking-judge.test.ts` · `attempt-queue.test.ts` · `tests/integration/session-flow.test.ts` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm e2e` · `pnpm e2e:local` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm check:bundle` · `pnpm check:ids`(P7b 를 합쳤으면) 초록, 비밀값 grep 0건, design-reviewer 보고(심각도 · 근거, 세로 820 · 가로 1180 사진). 통합 · e2e 는 CI(가정 (다)) | 차례마다 · c 작업 3 |

시험 이름은 글자 그대로 적는다(spec-trace 가 이름 맨 앞 AC 토큰을 센다). 시험 안의 숫자는 시험용 설정 · 시드에서 읽는다.

## 완료 보고 (Done)

채움: 문서 반영 편집자 2026-10-22 13:4x(브리프 `task-p11a-done-edit.md`). **커밋 79ee1cc**(가지 `feature/1a-p11-session-activities`, 2026-10-22 13:31). P11a 는 워크트리 `.claude/worktrees/p11`(작업 가지 바탕 dc5308d)에서 차례 1~4 와 fix 1~4 로 끝냈다. b · c 는 같은 가지 · 같은 워크트리에서 차례 5 부터 잇는다. 원문은 구현 보고 `task-p11-report.md`(장부 폴더) · 검토 보고 열넷(`review-p11-*.md`) · 장부 progress · ledger-open · ledger-closed · 13절 C76~C84 다. CI 8차의 시험 수는 장부에 없어 GitHub Actions 로그에서 옮겼다.

### 흐름

| 차례 · 라운드 | 검토 묶음 | 결과(검토 보고) |
|---|---|---|
| 차례 0 바탕 · 공용 변경 1(컨트롤러, 10-18 05:3x~05:5x) | — | 바탕 가지 `feature/1a-base-p11` a4a46a4 = P10 df7f6cd + P9c dae3afd + P6a f447bc5 + P7b 1a5c188. 검사 tsc 0 · biome 0 · 단위 446 · build 성공 · check:ids 2(P10 차례 7 몫). 공용 변경 1 dc5308d · specs · intent 맞춤 9b97f4d. 바탕만으로 돌린 CI 는 기록 없음(첫 CI 는 차례 2) |
| 차례 1 순수 함수 바탕 | A1(코드만) | Changes requested · I 1 · M 5(`review-p11-1-code.md` — 건너뛴 시도에 인식 글이 있으면 점수 · 단어별 정오를 냄) |
| fix 1 | A1 | Approved · 다섯 ADDRESSED · 새 0(`review-p11-fix1-code.md`) → c8db4f5 |
| 차례 2 세션 서버 · 대기열 · 틀 · 읽기 · 결과 틀 | A2 | 코드 Approved · M 1(`review-p11-2-code.md`). 화면 Changes requested · I 3 · M 5(`review-p11-2-design.md` — 가로 1단계 그림 문항 '다음' 잘림 · 지문 그림 줄 깨진 그림 표 · 오른쪽 끝 낱말 쪽지 잘림) |
| fix 2 | A2 | 화면 Approved · 여덟 ADDRESSED · 새 M 2(`review-p11-fix2-design.md`). 코드 Approved · M 1(`review-p11-fix2-code.md`) → d798b6e |
| 차례 3 쓰기 1~3 · 이어 하기 | A3 | 코드 Approved · M 1(`review-p11-3-code.md`). 화면 Changes requested · I 2 · M 4(`review-p11-3-design.md` — 조립 빈 칸 너비가 섞인 카드 차례를 닮음 · '다 놓았어요'가 하나만 놓아도 켜짐) |
| fix 3 | A3 | 화면 Approved · 여섯 ADDRESSED · 새 M 1(`review-p11-fix3-design.md`). 코드 Approved · 지적 0(`review-p11-fix3-code.md`) → 52f30a8 |
| 차례 4 말하기 1~2 · 음성 공통 · 기기 알림 | A4 | 코드 Approved · M 2(`review-p11-4-code.md`). 화면 Changes requested · I 1 · M 3(`review-p11-4-design.md` — 듣는 동안 화면이 바뀌지 않음) |
| fix 4 | A4 | 구현은 10-18 09:1x 에 끝났고 CI 8차가 그때 돌았다. 곧바로 주간 한도로 멈췄다가 10-22 13:2x 에 다시 시작했다. 한도 뒤 응답 보장이 없는 앞 검토자 대신 새 검토자 둘(rev-p11b 코드 · des-p11b 화면, Opus · xhigh)이 재검토했다. 화면 Approved · 넷 ADDRESSED · 새 M 2(`review-p11-fix4-design.md`). 코드 Approved · 새 M 3(`review-p11-fix4-code.md`) → 79ee1cc |

fix 라운드는 검토 묶음마다 한 번이다(한도 셋). 재검토의 새 Minor 는 다음 차례 브리프로 넘겼다. 차례 4 재검토의 넷은 차례 5 브리프에 있고, 코드 재검토 M-3 은 이 절이 닫는다(계획 표 밖 파일 · 다르게 한 것 14 · 15).

### 커밋(작업 가지, 바탕 dc5308d 위 넷)

| 커밋 | 시각 | 파일 · 줄 | 담은 것 | 커밋한 때 |
|---|---|---|---|---|
| c8db4f5 | 10-18 06:30 | 13 · +2,572 −125 | 차례 1 · fix 1 | 재검토 Approved 뒤 |
| d798b6e | 10-18 07:30 | 26 · +3,222 −229 | 차례 2 · fix 2 | CI 2차 · 재검토 둘 Approved 뒤 |
| 52f30a8 | 10-18 08:18 | 14 · +1,389 −121 | 차례 3 · fix 3 | CI 5차 · 재검토 둘 Approved 뒤 |
| 79ee1cc | 10-22 13:31 | 16 · +1,899 −111 | 차례 4 · fix 4 | CI 8차 · 재검토 둘 Approved 뒤. 요청자 지시 "검토 끝나면 커밋하고 말하기 프리뷰 주소 알려줘"(10-22 13:2x) |

넷을 합치면 50 파일이다(새 27 · 고침 23, +9,082 −586 줄). 차례 1~3 커밋의 요청자 지시는 장부에 기록이 없다. 마이그레이션은 더하지 않았다(계획대로). 사이의 커밋 여섯은 P11a 코드가 아니다 — 9b97f4d · ccbd899 · 1d6ad23 · b648c8c 는 specs · intent 를 문서 가지와 맞춘 것이고, 6e09901 · 7794633 은 P10 78db3a2 · fix 8 176eda1 을 합친 것이다.

### CI(가지 `ci/p11-c2`, 초안 PR #4)

이 Mac 은 새 Postgres 가 뜨지 않아(ledger-open 환경 행) 통합 · e2e 는 CI 에서만 돌렸다(가정 (다)). CI 가지는 차례마다 작업 가지 최신 커밋 위에 다시 만들었다(ledger-open CI 용 PR 행). 작업은 열하나다(lint · build · unit · integration · e2e · e2e-local · depcruise · spec-trace · bundle-secrets · seed-validate · check-ids).

| 차 | 커밋 | run | 차례 | 결과 | 사진 세트(장) |
|---|---|---|---|---|---|
| 1 | ee3120f | 39072933388 | 차례 2 | 전부 성공(첫 바퀴) | 19 |
| 2 | 1292c14 | 39074646676 | fix 2 | 전부 성공 | 25 |
| 3 | bc55b8f | 39076275851 | 차례 3 | e2e 1 실패 · 52 통과 — 견본 조립 카드 'momo' 가 소문자라 화면으로 맞힐 수 없음(→ C84) | — |
| 4 | 2ba410e | 39076856051 | 차례 3 고침 | 전부 성공(e2e 53) | 41 |
| 5 | 9e06c6a | 39078060721 | fix 3 | 전부 성공(배치 e2e 그대로) | 45 |
| 6 | 833de73 | 39079611504 | 차례 4 | 통합 1 실패(device-alert — 알림 종류에 seed_range_end_near 가 섞임) · e2e 4 실패 · 59 통과(말하기 — 듣는 중 다시 누름 경합 · 저절로 넘김 시간 재는 때) | — |
| 7 | 8f5bd72 | 39080614985 | 차례 4 고침 | 전부 성공(e2e 63) | 67 |
| 8 | 755a2be | **39081857257** | fix 4 | **전부 성공**(작업 열하나, 아래 표) | 77 |

사진 세트 칸의 '—'는 내려받은 세트가 없다는 뜻이다. 화면 검토는 이 세트들을 봤다.

CI 8차(10-18 09:11 시작, 결과는 10-22 재개 때 확인):

| 작업 | 결과 |
|---|---|
| unit | 52 파일 · 494 통과 · 6 todo |
| integration | 20 파일 · 151 통과 |
| e2e | 63 통과(배치 e2e 포함 — 공용 '말하기' 단추가 배치를 깨지 않음) |
| e2e-local | 7 통과 |
| 사진(아티팩트 e2e-photos) | 77장 — 읽기 25 · 쓰기 16 · 이어 하기 4 · 말하기 32(세로 820 · 가로 1180) |

사진은 컨트롤러가 내려받아 두었고 커밋 밖이다.

### 로컬 관문(DB 를 쓰지 않는 것, 이 Mac — fix 4 뒤)

| 명령 | 마지막 결과 |
|---|---|
| `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm build` | 0 · 0 · 성공 |
| `pnpm test` | 52 파일 · 494 통과 · 6 todo |
| `pnpm check:deps` · `pnpm check:bundle` | 위반 0 · 위반 0 |
| `pnpm check:ids` | code-setting-unknown 0 · design-number 35(P10 을 합친 뒤의 바탕 값 — P11a 파일에서 새 줄 0) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0(missing-test 는 보고만 — 차례 4 에 21줄) |
| 녹음 API(`getUserMedia` · `MediaRecorder`) | src 에 없음(차례 4 · review-p11-4-code) |
| 비밀값 grep | 따로 돌린 기록 없음. CI bundle-secrets 작업은 8차 성공 |
| `pnpm test:int` · `pnpm e2e` · `pnpm e2e:local` | 로컬에서 못 돌림 → CI 8차 |

| 시험 | P11a 가 더한 것 | P11a 끝(79ee1cc) |
|---|---|---|
| 단위 | +45 — 446 → 476(차례 1) → 479(P10 합침 +3) → 482(fix 1) → 488(차례 2) → 491(차례 3) → 492(CI 3차 고침) → 494(차례 4) | 494 · 6 todo |
| 통합 | +9(session-flow 7 · retry 1 · device-alert 1 — 편집자가 시험 선언을 셈) · session-start 기대값 고침 | 151(CI 8차) |
| e2e | +13(읽기 1 · 쓰기 1 · 이어 하기 1 · 말하기 10) · session.spec 둘 고침 | 63(CI 8차) |
| e2e-local | 0 | 7 |

증명 표 대조(편집자, 79ee1cc 의 시험 글을 읽기만): 증명 표의 시험 이름 서른 가운데 스물아홉이 글자 그대로 시험 선언 줄에 있다(건너뜀 · todo 없음). 없는 하나는 e2e 'AC-N9 세션 활동 화면(…)'으로, 차례 10(c 마무리 · 공용 변경 3) 몫이다. `tests/e2e/font-size.spec.ts` 에 P10 의 AC-N9 시험이 있어 spec-trace 는 이 빈칸을 잡지 않는다.

### 프리뷰 확인(P11 가지 별칭)

| 때 | 판 | 확인한 것 |
|---|---|---|
| 10-18 07:4x | d798b6e | 배포 READY · 접근 204 · 홈 200 · 읽기 수업 목록 200 · 진행 중 읽기 세션 200(지문 활동) · 쓰기 세션 200 |
| 10-18 08:2x | b648c8c | 접근 204 · 홈 200 · 쓰기 수업 목록 200 · 쓰기 세션 200(그림 고르기 안내) · 읽기 세션 200 |
| 10-22 13:3x | 79ee1cc | 배포 READY · 접근 204 · 홈 200 · 말하기 수업 목록 200. 남아 있던 진행 세션 셋은 session.resume_hours 가 지나 중단 처리되어 세션 주소가 307 이다(8절). 말하기 세션 화면은 CI 8차 사진으로 봤다 |

요청자가 프리뷰에서 수업을 끝까지 해 본 기록은 없다(차례 11).

### 실제 바뀐 파일(※ = 계획과 다름)

계획 표의 손 파일 서른여덟(새 21 · 고침 17)은 모두 바뀌었다. 계획 표 밖 파일은 열둘이다(둘째 표). '다르게 한 것' 번호는 아래 절이다.

| 파일 | 신규 / 수정 | 실제 |
|---|---|---|
| `src/core/session/preview.ts` | 수정 | 값 1 대로(시험용 시드 1단계 차례 번호는 P10 과 같음). ※ 다르게 한 것 4 |
| `src/core/session/attempt.ts` | 신규 | 값 2 대로. ※ 다르게 한 것 2 · 4 |
| `src/core/scoring/score.ts` · `src/core/speaking/judge.ts` | 신규 | 값 3 · 4 대로(`MIC_CAPTURE_STREAK` 를 repeat.tsx 에서 옮김). ※ 다르게 한 것 6 |
| `src/core/speech/match-rate.ts` | 수정 | 계획대로(`matchedTargetWords`, 기존 함수 그대로) |
| `tests/unit/{session-preview,session-attempt,score,speaking-judge,match-rate,answer-check}.test.ts` | 신규 셋 · 수정 셋 | 계획대로. 시험 숫자는 `TEST_SETTINGS` 에서(fix 1) |
| `src/server/session/index.ts` | 수정 | 값 5 대로. ※ 다르게 한 것 5 · 9, 화면 자료에 `openSessionIds` · 쓰기 낱말 뜻(차례 3) |
| `src/server/actions/session.ts` | 수정 | `finishSession`(차례 2) · `reportSessionMic`(차례 4). 첫 문장 `await requireAccess()` |
| `src/server/session/result.ts` · `src/app/(child)/result/[id]/{page,result-view}.tsx` | 신규 | 값 8 대로. ※ 다르게 한 것 7 |
| `src/lib/attempt-queue.ts` · `src/lib/session-input.ts` | 수정 · 신규 | 값 6 대로. ※ `prune(진행 세션 id)`(차례 3, review-p11-2-code M-1) |
| `src/app/(child)/session/[id]/{session-frame,page}.tsx` | 수정 | 값 7 대로. ※ 다르게 한 것 7 · 13 · 14 |
| `src/components/activities/reading.tsx` | 수정 | ※ 선택 속성이 셋이다(다르게 한 것 8) |
| `src/components/session/reading.tsx` | 신규 | 값 9 대로. ※ 다르게 한 것 8 |
| `tests/integration/{session-flow,retry}.test.ts` · `tests/unit/attempt-queue.test.ts` | 신규 둘 · 수정 하나 | 계획대로. session-flow 는 증명 이름 넷에 말하기 1단계 서버 채점 · 화면 자료 · 결과 틀을 더함 |
| `tests/e2e/lessons.ts` | 신규 | ※ 다르게 한 것 10 · `levelSpecOf`(시험 숫자를 DB 단계 규격에서) |
| `tests/e2e/{reading,session}.spec.ts` | 신규 · 수정 | 계획대로. 가로 '다음' 아래 끝 · 그림 줄 · 쪽지 자리(fix 2 · 차례 3) · 두 방향 높이(fix 3) 단언을 더함 |
| `src/components/answer/{choice,tiles,typing}.tsx` | 수정 | `initial` · `onChange` · `reveal`. ※ 선택 속성을 더 둠 — `ChoiceAnswer` `instant` · `struck`(안쪽 보기 `compact`), `TileAnswer` `slots` · `needed`, `TypingAnswer` `submitLabel`. 넘기지 않으면 배치 동작 그대로(위험 5 — 배치 e2e 초록) |
| `src/components/session/writing-items.tsx` | 신규 | 값 11 대로. ※ 다르게 한 것 11 · 12 |
| `tests/e2e/{writing,resume}.spec.ts` | 신규 | 계획대로(AC-4a · AC-6a) |
| `src/server/alerts/device.ts` · `src/server/placement/index.ts` | 신규 · 수정 | 값 12 · 정할 것 자 대로(배치 동작 같음) |
| `src/components/session/speaking.tsx` | 신규 | 값 12 대로. ※ 다르게 한 것 13 · 14 · 15 |
| `tests/e2e/speaking.spec.ts` | 신규 | 계획대로. 가짜 음성 대본을 수업 문장으로 만들고, 4단계는 1단계 수업 복제 |

계획 표 밖 열둘:

| 파일 | 신규 / 수정 | 까닭 · 차례 |
|---|---|---|
| `src/components/answer/repeat.tsx`(P10) | 수정 | 차례 1 — `MIC_CAPTURE_STREAK` 를 core 에서 가져옴(값 4 글에는 있음). fix 4 — 공용 '말하기' 단추를 써 배치 화면에도 듣는 중 꼴이 생김(다르게 한 것 14) |
| `src/components/answer/speak-button.tsx` | 신규 | fix 4 — 공용 '말하기' 단추(듣는 중 분홍 테 · 남은 시간 고리 · `data-listening`, P2b `capAt` 으로만 셈). c 의 '다 말했어요' 자리 `listeningLabel` |
| `src/core/answer/expected.ts` · `tests/unit/answer-expected.test.ts` | 신규 | 차례 3 — 정답 조각(`expectedAnswerOf`) · 카드 표시(`displayCardsOf`, C84). 화면에 보인 정답 = 채점 정답을 단위로 묶음 |
| `src/core/answer/display.ts`(P10) | 수정 | 차례 4 — 배치 조립 문항도 `displayCardsOf` 로 카드를 보임(판정 그대로) |
| `src/server/seed-lists.ts` | 수정 | 차례 4 — `seedHomophones()` 하나로(다르게 한 것 9) |
| `tests/unit/session-input.test.ts` | 신규 | 차례 2 · 3 — 활동 안 입력 · `prune` |
| `tests/unit/safe-error.test.ts`(P10) | 수정 | 차례 2 — 시도 저장 질의 오류 사례(제약 글에는 있음) |
| `tests/integration/session-start.test.ts`(P10) | 수정 | 차례 2 — 저장 결과 기대값에 `rejected: []`(위험 3 글에는 있음) |
| `tests/integration/device-alert.test.ts` | 신규 | 차례 4 — 기기 알림 셋 · 학습일마다 한 번 · 값은 code · browser 만 |
| `tests/e2e/photos.ts` · `.github/workflows/ci.yml` | 신규 · 수정 | 공용 변경(컨트롤러 요청) — 아래 표 마지막 줄 |

### 공용 변경

| # | 실제 |
|---|---|
| 1 `tests/fixtures/settings.ts` | 계획 글자대로 — 컨트롤러 dc5308d(키 열둘, 12절 기본값). 단위 446 · tsc 0 · biome 0 |
| 2 개발용 DB 둘 | Supabase 개발용은 10-18 07:0x 에 시험용 시드를 다시 적재했다(설정 넣음 12 · 고침 0 · 위반 0, 임시 적재 스크립트는 지움). 로컬 54331 은 재부팅 뒤 `pnpm db:dev --reset` 이다(아직) |
| 3 `tests/e2e/font-size.spec.ts` | 차례 10(c 마무리) 몫 — 아직 |
| 계획 밖 — 사진 아티팩트 | `tests/e2e/photos.ts`(`E2E_PHOTOS` 가 있을 때만 사진) · `.github/workflows/ci.yml`(e2e 작업 `E2E_PHOTOS: "1"` · upload-artifact e2e-photos). 컨트롤러 요청(10-18 06:1x) — 이 Mac 이 로컬 e2e 를 못 돌려 화면 검토 사진을 CI 에서 받으려고 |

### 계획과 다르게 한 것

1. **바탕은 P10 fix 5 커밋 df7f6cd 에서 시작했다.** 정할 것 나는 P10 차례 7 커밋까지를 바탕으로 했다. 실제로는 바탕 가지(`feature/1a-base-p11` — 제안 이름과 다름)를 먼저 만들고, P10 78db3a2 · fix 8 176eda1 은 작업 가지에 합쳤다(6e09901 · 7794633). 작업 가지의 specs · intent 는 문서 가지와 네 번 맞췄다(ledger-open '코드 가지의 specs · intent' 행).
2. **건너뛴 시도는 인식 글이 있어도 점수 · 단어별 정오를 내지 않는다**(컨트롤러 결정 1 · 7절 '점수에서 뺀다', review-p11-1-code I-1 → fix 1). 단어 수는 내고 영어로 말한 문장 수에는 센다. 성공이 그 활동의 실패 수를 지우지 않는 것(결정 2)과 단어별 정오 세부(결정 3 — 같은 단원 단어는 한 줄 · 여러 낱말 표제어는 이어진 낱말 전부 · 하이픈 · 따옴표 든 낱말도 일치율과 같은 정규화)는 받아들여졌다.
3. **C83 — 7절 · 12절의 '다시 듣기 최대 3회' 글을 구현에 맞췄다.** 한 활동의 인식 실패 수가 speech.max_retries 에 닿으면 건너뛴다(처음 듣기도 실패로 셈). review-p11-1-code 범위 밖 관찰에서 나왔고 코드 · 값은 그대로다.
4. **활동 모델 · 시도 꼴**(값 1 · 2). `activitiesOf` 의 `level` 칸은 차례를 정하는 데 쓰지 않는다. 차례 1 은 P10 서버가 부르는 두 인자 꼴을 임시로 남겼고 차례 2 가 지웠다. 앱 채점 ctx 에 `appJudgedQuestions` 를 더했다(질문 답이 앱 판정인지를 시드 accepted 칸이 아니라 level_specs 로 가름). 공개 함수 넷(`parseAttemptInput` · `inputFitsActivity` · `finalActivityNos` · `lemmaLookup`)을 덧붙였다. NUL 글자 든 시도는 거부한다(jsonb 가 받지 않아 묶음 넣기 전체가 늘 실패하던 길).
5. **세션 서버**(값 5). 시도 id 글조차 없는 원소 · 빈 묶음 · 50 넘는 묶음은 통째로 `invalid` 다(P10 시험 그대로). 꼴이 strict 라 점수 칸을 붙인 시도는 거부한다. 앱 판정이 아닌 단계의 질문 답 끝 시도는 건너뛴 것만 받는다(`needsAiPath`). 읽기 · 쓰기 세션의 영어로 말한 문장 수는 0 이고, 끝 시도가 둘이면 먼저 저장된 것을 쓴다. `readSessionArea` 는 `readSessionPlace` 로 바꿨다. 화면 자료는 읽기 · 쓰기 세션도 음성 · 말하기 설정을 함께 읽어, 설정이 하나라도 없으면 멈춘다(정할 것 카와 같은 조건).
6. **세션 점수 · 판정 함수**(값 3 · 4). `sessionScoreOf` 입력은 영역별 판별 합이고 쓰기에 `part` 를 더했다(둘째 세션 null). b · c 가 같은 식을 쓰게 `cleanSentenceRate` · `rubricScoreOf` · `RESULT_PHRASES` · `answerMaxSecondsKey` · `speakingCountersStart` · `speechEventOf` 를 덧붙였다. 구조 상수 `RUBRIC_MAX` · `MIC_STALL_RETRY_MULTIPLE` 은 12절 키가 아니다(check:ids 새 줄 0).
7. **틀 · 결과**(값 7 · 8). 결과의 큰 단추는 '여기부터 해요'가 수업 · 연습이면 그 칸, 하던 수업이면 그 세션이다. 그 밖(단계 평가 · 복습 · 첨삭)이나 없으면 '수업 목록'이다(컨트롤러 결정). 끝내기가 두 번 incomplete 이고 이 기기에도 그 활동이 없으면 빠진 가장 앞 활동으로 돌아간다(컨트롤러 결정). 상태 줄은 늘 두는 알림 영역이고 글이 없으면 `sr-only` 다(fix 2 · 차례 3). 차례 1 은 계획에 없던 차례에 틀을 꿰맞췄고(없어진 활동 종류 둘을 P10 자리로), 차례 2 가 틀을 다시 쓰며 없앴다(review-p11-1-code M-5 닫힘).
8. **읽기 화면**(값 9 · 컨트롤러 결정 · 화면 검토 A2). 문항 쪽 지문 보기에는 그림 줄이 없다(ledger-open P8 · P12 행). 처음 고른 오답은 ✕ 로 눌린 채 끝까지 남고, 둘째가 맞으면 '맞았어요!'다. 다시 고르는 동안에도 해설을 남긴다. 지문 그림이 깨지면 뜻 글 상자로 바꾸고(`SafePicture`), 뜻 쪽지는 열 때 자리를 재어 카드 안에 두며 쪽지 밖을 누르면 닫힌다. 가로 그림 보기 칸은 줄이고 세션 지문 줄 높이는 넓혔다. `ReadingPassage` 선택 속성은 하나가 아니라 셋이다(`onWordTap` · `openWord` · `renderPicture`, 세션 길만 — 시드 보기 · 평가 지문 그대로).
9. **동음이의어 읽기**: 차례 2 는 세션 서버에 따로 두었고(배치 모듈이 AI 기록을 가져와서), 차례 4 가 `src/server/seed-lists.ts` 의 `seedHomophones()` 한 곳으로 모았다(AI 층에 안 닿음).
10. **e2e 견본은 기본 틀 규격으로 만든다**(값 10). '확인한 사실' 끝의 추측(작은 틀로도 만들어진다)이 틀렸다 — 작은 틀로는 `readingLesson` 1 · 4 가 던진다. 지어낸 낱말이라 견본 그림은 뜻 글로 보인다.
11. **C84 — 조립 카드의 대문자**(CI 3차). 견본의 소문자 'momo' 카드는 첫 칸만 대문자로 바꾸는 화면에서 맞힐 수 없었다. 화면은 문장 가운데 대문자 낱말 카드를 정답 꼴로 보인다(차례 4 부터 허용 정답 전부에서). 첫 카드는 소문자이고 판정은 C73 그대로다. 배치 조립 화면도 같은 카드 표시를 쓴다. 시드 규칙 · 검증기는 P8 이다.
12. **쓰기 1~3 화면**(값 11 · 컨트롤러 · 화면 검토 A3). 틀린 뒤 정답은 같은 답 조각 자리에 보인다. 조립 빈 칸은 모두 같은 너비이고, '다 놓았어요'는 다 찼을 때만 켜진다. 그림 고르기는 고르면 바로 채점하고, 받아쓰기 내기 단추는 '다 썼어요'다. 조립 뜻은 제목 글꼴로 크게, '대문자'는 놓는 줄 오른쪽 끝에 처음부터 자리를 잡는다. 다시 할 때 소리를 한 번 다시 읽고, 맞으면 첫 허용 정답 글과 뜻을 보인다(뜻이 없거나 낱말과 같으면 뜻 줄 없음).
13. **말하기 흐름**(값 12 · 컨트롤러). 인식 실패 셈은 틀이 쥔다(세션 몫이 활동을 넘어 이어져서). 말소리 없음으로 막히면 그 활동은 건너뛴 끝 시도(`skipped: "silent"`)로 남고, 마이크 멈춤 · 쓸 수 없음은 남기지 않는다. 처음 마이크 안내는 처음 말하는 활동 앞이다. 듣기 이해에서 다시 고를 때 처음 오답은 ✕ 로 고정한다(CI 6차 뒤 결정). 질문 답 화면에는 아이 인식 글을 보이지 않는다(AC-5d 쪽). '같이 말해 볼까요' 뒤 말은 결과 말 없이 다음이다. 알림 코드는 멈춤 'stalled' · 여섯 번은 마지막 오류 코드 · 말소리 없음 'no-speech' 다.
14. **'말하기' 단추를 공용 조각으로 만들었다**(fix 4 — 화면 검토 A4 I-1, 7절 '남은 시간' 표시). 새 파일 `speak-button.tsx` 를 세션 조각과 P10 배치 `repeat.tsx` 가 같이 쓴다. 그래서 배치 화면에도 듣는 중 꼴(분홍 테 · 남은 시간 고리 · `data-listening`)이 생겼다. 단추 이름 · `data-speak` · `aria-pressed` 는 그대로라 배치 e2e 는 같다(CI 8차 초록). 막힌 안내의 '홈'은 몸통에 하나이고(띠 '홈'을 숨김), 막힌 동안에는 첫 활동이어도 세션을 지우지 않는다. 세션 듣기 이해 그림 보기는 가로에서 작게 그린다(`compact`).
15. **정본 밖 문구 표에 a 행 둘을 더했다**(컨트롤러): 받아쓰기 내기 '다 썼어요'(fix 3) · 말하기 1~2 활동 첫 줄 안내 셋(fix 4). 따라 말하기 목표 글과 영어 질문 글은 키웠다(36px · 28px, 4절 '24px 이상' 안).
16. **사진 아티팩트를 공용 변경으로 더했다**(위 '공용 변경').

### 안 한 것(계획에 있었음)

1. **e2e 'AC-N9 세션 활동 화면(…)'** — 차례 10(c 마무리) 몫이라 아직 없다(위 증명 표 대조).
2. **공용 변경 2 의 로컬 몫 · 공용 변경 3** — 위 '공용 변경' 표.
3. **공통 증명의 로컬 통합 · e2e · e2e-local** — CI 8차로 대신했다(가정 (다)). 비밀값 grep 은 따로 돌린 기록이 없다.
4. **차례 11 [사람] 요청자 프리뷰 시험 · iPad 실기(H2)** — 남았다.

### 남긴 것

- **차례 5(b) — 브리프 `task-p11-5.md` '함께 닫을 작은 것'**: review-p11-fix4-design N-1('같이 말해 볼까요' 바른 답이 질문보다 작음) · N-2('한 번 더 말하기' 오른쪽 끝이 안쪽, 고르기). review-p11-fix4-code M-1(AC-5c '홈 → 진행' 단언과 고리 단언이 고친 동작을 가르지 못함) · M-2(마지막 활동이 말소리 없음으로 막힌 채 끝내기가 실패하면 '홈'이 없음).
- **b · c**: 쓰기 4~12 · 말하기 3~12 AI 활동 조각과 시도 꼴 종류 · `needsAiPath` 의 자기 규칙 · 둘째 세션 교정 수(`corrections` 지금 0) · 결과 화면 쓰기 6+ 첫 세션 문구 · '첨삭 보기'. c 는 `SpeakButton` 의 `listeningLabel` 에 '다 말했어요'를 붙인다. 받아쓰기 '다 썼어요'는 시험용 시드에서 2단계 갈래라 사진이 없다(코드로만).
- **차례 10(c 마무리)**: `font-size.spec` AC-N9 에 P11 화면(읽기 · 쓰기 · 말하기 · 마이크 안내 · 결과)을 더한다(공용 변경 3).
- **P12**: 결과 화면 나머지(별 · 오늘 얻은 단어 · 단원 막대 · '단원 n을 통과했어요!' · '다시 했어요' · 'n단계 평가 보기'). `attempts.word_results` · `tappedWords` · `shownWords` 로 단어장 · 복습일을 고친다. `sessions.score` 가 null 인 세션은 최근 성적에서 뺀다. 평가 지문 그림 줄에 `renderPicture`(`SafePicture` 꾸밈 그림)를 넘기고, 평가 문항 지문 보기에도 그림 줄을 두지 않는다. 평가 조립 문항도 `displayCardsOf` 를 쓴다. 평가 '빈칸 채우기'는 답을 문장 빈칸 안에 넣는다. `bandOf` 를 하나로(정할 것 차). 모두 ledger-open 또는 '다른 P 에 넘길 것'.
- **P8**: C84 시드 규칙 · 검증기(ledger-open) · 쓰기 1~3 정답 낱말 = 단원 단어 원형.
- **1-나**: 부모 화면이 `speech_silent` · `mic_*` 알림과 `sessions.english_sentences` 를 읽는다. '이 문제 이상해요' 자리 · 'AI 쉬는 중' 상태. 검토자 관찰 둘 — 세션 서버 액션이 `device.ts` 를 거쳐 `@/server/ai/store` 의 `createAlertOnce` 를 가져오므로 알림 공용 모듈로 옮길 만하다(review-p11-4-code). 마지막 활동이 말소리 없음이면 안내를 잠깐 보인 뒤 결과로 간다(review-p11-fix4-code) — 부모 화면 작업 때 아이 쪽 안내를 남길지 본다.
- **재부팅 뒤(컨트롤러)**: 로컬 54331 `pnpm db:dev --reset`(공용 변경 2) · 로컬 통합 · e2e 한 바퀴 · embedded-postgres 종료 훅 소음이 로컬에서도 나는지(ledger-open). 재부팅했다는 기록은 아직 없다.
- **실기(H2 · 차례 11)**: iPad Safari 에서 저절로 읽기(`unlockFromGesture` — '확인한 사실'의 추측) · 결과 말 · 끝 조용함 · 마이크 안내 · 듣는 중 고리를 요청자가 직접 본다.
- **문서 맞춤**: 워크트리의 intent 사본은 b648c8c 맞춤 그대로라 말하기 1~2 안내 줄 행과 이 완료 보고가 없다 — 다음 specs · intent 맞춤 때(review-p11-fix4-code 범위 밖 · ledger-open).

### PR

- PR #4 `ci/p11-c2` → `feature/1a-p11-session-activities`: CI 용 초안(합치지 않음). CI 1~8차를 이 PR 에서 돌렸고 10-22 지금 열려 있다.
- main 으로 합치는 PR 은 없다(H14 — 바탕 합침 때).
