# 보고 3판: 수업 시드 규격 · 검증기 확장(구현자 · Opus · high, 2026-10-29 22:0x ~ 10-30 fix 1)
상태(3판, fix 1 뒤) NEEDS_CONTEXT. 관문 다섯은 종료 0이고, seed:validate 는 새 검사가 원본 시드 둘(읽기 · 말하기)을 막아 종료 1이다. 시드는 학습 설계자 몫이라 고치지 않았다(아래 'fix 1' 끝). 아래 2판 본문은 fix 1 전 기록이다. 커밋하지 않았고 시드 내용(lessons JSON · unit-specs.json)과 커밋 전 64파일은 고치지 않았다.
## 원본 시드 셋 검증
`pnpm -s seed:validate --areas reading,writing,speaking` → 종료 0, 칸 769 · 통과 766 · 실패 0 · 풀이 검사 안 됨 3(새 칸 셋은 seed/checks 기록 없음) · 경고 0 · 규격 파일 오류 0. 말하기는 3판(acceptedMeaning · storyEn), unit-specs 는 목표 다섯이 든 판이다. 새 검사가 실제 시드에서 도는지는 스크래치 사본에서 어겨 확인했다(줄 51자 · '주어' · 짝=본보기 · chunks · teach.goals 에 read-3-1-2 · 'Pizza.' · 이야기에 없는 bread 가 모두 걸림). 시드가 못 지킨 검사는 없다.
## 바뀐 파일
- `src/core/seed/schema/lesson.ts`: 미리보기 parts · 빈 예문, teach 규격(칩 · 본보기 · 영역별 같이 해 보기 · 되짚기), 문항 칸(goal · whyKo · askRole · retryHighlight · spare, 읽기 explanationKo 선택), 따라 말하기 goal · chunks · spares, 질문 storyEn · acceptedMeaning(같이 해 보기 · 짝 포함), 새 칸 글 조각
- `src/core/seed/check-teach.ts`(새): checkTeach 와 검사 열하나 · `check-lesson.ts`: 빈 예문 허용 · explanationKo/whyKo · checkTeach 부름
- `schema/reference.ts`: UnitGoalSchema(평가 spec 2절 칸, strict) · UnitSpec goals 선택 · GrammarTermsFileSchema
- `reference-index.ts`: setting(key) · grammarTerms · goalsRequiredLevels() · unit-goals 정합 · `validate.ts`: 문법 용어 목록을 배치 밖 선택 파일로 읽음 · `structure.ts`: 칩 · 이름표 · '왜' 단계 · 목표 needs/accept/영역 표 · 잠정 [1,3,4,5]
- `seed/lists/grammar-terms.json`(새, 22 항목) · `seed/settings.json`(설계 12 키 28행 + seed.goals_required_levels) · 워크트리 `specs/09-설정값.md`(같은 키 행 '잠정' + 다시 만드는 키 목록, 컨트롤러 허락)
- `tests/unit/seed-validator-teach.test.ts`(새, 34 시험)
## 검사 표(규칙 · 기준)
| 규칙 | 기준 |
|---|---|
| teach-layout | 본보기 수 lesson.models_per_lesson 안, 같이 해 보기 수 = lesson.together_items.<구간>, 같은 문항이 같이 해 보기 · 혼자 · 짝 두 곳에 있음 |
| teacher-line | todayKo · lineKo · whyKo · rightKo · wrongKo · closeKo · closeKoPracticed 가 빈칸 뺀 40자 · 2문장 이하 |
| teach-seconds | 오늘 배울 것 · 본보기 · 되짚기 글: 한글 ÷ speech.speak_chars_per_second_ko + 영문 ÷ speech.speak_chars_per_second ≤ lesson.teach_seconds_max.<구간> |
| grammar-term · teacher-name | 선생님 줄 · 칩 글의 목록 낱말(낱말 머리) / 명단 이름 · 틀 자리(토리는 수업 글에 Tori 가 있으면 받음) |
| spare | 채점 혼자 문항마다 짝 · 따라 말하기 짝 같은 차례 수 · 짝 자극이 다른 자리와 다름 · 읽기 짝 글 ≤ lesson.spare_text_max_words.<구간> · 질문 짝 허용 답 서로 다른 꼴 셋 이상 |
| why | 5단계까지 whyKo, retryHighlight 가 지문 · 대본 안 · 정답 품음, chunks 를 이으면 원문 |
| goal(필수 오류) | teach.goals 꼴 · 혼자 goal 이 teach.goals 안, teach.goals 가 단원 unit-specs goals 의 id 안, 이어진 목표마다 과제 유형이 tasks 안, seed.goals_required_levels 단계 가르치는 수업은 단원 목표가 비면 오류, expression 목표에 이은 질문은 accepted 있음 |
| speaking | 같이 해 보기 · 짝 바른 답 문장 수, 질문(혼자 · 짝 · 같이 해 보기) 허용 답의 질문에 없는 내용 낱말이 storyEn 에 있음 · 서로 다른 꼴 셋 이상 · 낱말 하나뿐인 답 없음(accepted · acceptedMeaning) |
| recap-evidence(경고) | teach.goals 첫 목표에 이은 혼자 문항 < lesson.recap_min_evidence |
| unit-goals(규격 파일) | 목표 id 가 그 행의 `<영역>-<단계>-<단원>-<n>`, 시드 전체 유일, needs 가 영역 몫 |
| 범위(넓힘) · settings | 새 영어 칸이 learning-elements · forbidden 을 받고 읽기 같이 해 보기 · 짝 글은 offband / teach 수업에서 키가 없으면 키마다 한 번 |
## 관문(워크트리 서브셸 · Node 24)
| 명령 | 종료 | 결과 |
|---|---|---|
| pnpm lint | 0 | 452 파일, 고칠 것 없음 |
| pnpm tsc --noEmit -p . | 0 | 오류 0(e2e 네 줄을 고친 뒤) |
| pnpm test | 0 | 100 파일 · 1079 통과 · 6 todo |
| pnpm check:deps | 0 | 위반 없음 |
| pnpm check:ids(CI 의 --fail-on 그대로) | 0 | 12절 키 226 · 시드 키 222 · 위반 0 · design-number 49(보고만) |
| pnpm seed:validate --areas reading,writing,speaking | 0 | 위 '원본 시드 셋 검증' |
## 요청(허용 범위 밖)
1. 본 저장소 정본 12절에 워크트리 specs/09 에 더한 행을 spec 3판 반영 때 옮긴다(speech.read_ko 는 지시 목록에 없어 넣지 않음).
## 설계와 다르게 한 것 · 결정한 것
- 이름표 칸은 브리프 · 시드대로 askRole(델타 spec 6 은 label). 문법 용어 목록과 새 설정 키는 SEED_FILES · 필수 키 밖(가짜 시드 나무가 허용 밖이라 넣으면 기존 시험이 깨짐), teach 수업에서만 요구한다.
- 미리보기 예문 '비울 수 있게'는 빈 글("")로 받는다(teach 없는 수업은 지금처럼 막음).
- seed.goals_required_levels 를 코드가 읽으므로 settings.json 과 워크트리 12절에 평가 spec 8절 행을 같이 넣었다(값 1 · 3 · 4 · 5, 지시 밖이라 알림).
- 완전성 모드에서 '필수 단계 단원에 목표 없음'을 막는 검사는 넣었다가 뺐다. main.yml(`--complete-through settings`)과 dev-load.yml 이 완전성 모드라 지금 목표가 있는 단원 셋 밖의 1 · 3 · 4 · 5단계 단원이 모두 막히고, 평가 spec 은 개발 적재 · 그 밖의 CI 는 보고만이라 했다. 단계 필수는 가르치는 수업 칸에서 오류로 건다. 운영 적재 막음을 언제 켤지는 컨트롤러 결정.
- 짝 허용 답 '셋 이상'은 서로 다른 꼴로 센다(3판 (2)). 말하기 질문 검사는 혼자 · 짝 · 같이 해 보기에 같이 건다.
## fix round 1(컨트롤러 지시 넷: C177 (5) 목표 필수 · goals 규격 · 12절 행 허락 · 3판 검사 여섯)
UnitGoalSchema · unit-goals 정합 · 단원 목표 대조(오류) · 과제 유형 대조 · 3판 (1)~(5) 를 넣고 (6) closeKoPracticed 줄 길이 시험을 더했다. 시험 10건을 먼저 실패시키고(빨강) 통과시켰다. acceptedMeaning(같이 해 보기 · 짝)은 규격을 먼저 넣고 시험을 뒤에 붙였다.
## fix round 2(컨트롤러 재전송: 물음 셋 답 · e2e 허락)
- tests/e2e/reading.spec.ts:188 · 206 · 230 · tests/e2e-local/seed-viewer.spec.ts:353 을 `question.explanationKo ?? ""` 로 고쳤다(그 줄만, 포맷이 줄바꿈만 더함). 같은 파일의 다른 커밋 전 변경은 손대지 않았다.
- (1) · (3) · (4)는 fix round 1 에 이미 들어 있다. spares_per_session 은 `<영역>` 이 check:ids 에서 회화까지 넷으로 펴져(talk 키 없음 → spec-setting-missing) reading · writing · speaking 세 행으로, slot_seconds_max 는 `<자리>` 를 check:ids 가 몰라 종료 2 로 멈춰 today · show · together · spare · recap 다섯 행으로 풀어 적었다.
- '필수 단계는 goals 가 비면 오류'는 가르치는 수업 칸에 오류로 걸었다. 단원 규격 행 자체를 막는 검사(완전성 모드)는 main.yml · dev-load.yml 을 바로 막아 넣지 않았다(아래 우려 3, 결정 필요).
## 남은 우려 4
1. 설계 7 의 표 밖 행(같이 해 보기 빈칸 = 남은 카드, 이름표 꼴, 예 하나 · 아니요 셋, 되짚기 '할 수 있' 금지, 유형 경계, 짝 풀이 검사, 요구 능력 · core · home 용어 목록 대조)과 짝 · 같이 해 보기의 정답 검사는 없다.
2. 문법 용어는 낱말 머리 일치라 '주어요(주다)'도 잡는다. 이야기 낱말 검사는 기능어를 vocab 품사로 가르므로 사전에 없는 낱말은 내용 낱말로 본다.
3. 운영 적재의 단원 목표 막음이 아직 없다. 지금 목표가 있는 단원은 3단계 단원 1 셋뿐이라 켜면 main CI 가 막힌다.
4. seed/settings.json 에는 판(version) 칸이 없어 판을 올리지 못했다.
## fix 1(코드 검토 Changes requested — Important 5 · Minor 6, 모두 ADDRESSED)
| 지적 | 상태 · 자리(check-teach.ts 는 줄 번호만) |
|---|---|
| I1 혼자 문항과 본보기의 다름 | ADDRESSED: shownTexts :1201 · soloTexts :1225 · checkDiffer :1282(규칙 teach-differ). 짝 자극 검사는 혼자 문항 · 다른 짝 대조만 남겨 중복을 없앴다 |
| I2 짝 꼴 · 보기 번호 · 그림 | ADDRESSED: checkSpareShape :1299(읽기 kind/type · 쓰기 type · 듣기 kind), check-lesson.ts 의 짝 · 같이 해 보기 answerNo · 그림 키(:599 · :932 부근) · 쓰기 정답 꼴 checkWritingItem(:782 · :788) |
| I3 말하기 질문 꼴 | ADDRESSED: checkSpeakingQuestions :949. (가) accepted ∩ acceptedMeaning(꼴 맞춤) 모든 단계, (나) 3단계 단원 1~4 혼자 질문 storyEn 필수, (다) '예' 하나 · 나머지 '아니요'(규칙 speaking-question). 범위 상수 STORY_QUESTION_LEVELS · STORY_QUESTION_UNITS_MAX(structure.ts:299~) |
| I4 핵심 목표 0 | ADDRESSED: checkRecapEvidence :1077(0 이면 goal 오류, 1 이상 미만은 recap-evidence 경고), 시험 둘 |
| I5 남은 막는 행 | ADDRESSED: 이름표 checkAskRole :1340(ask-role) · 되짚기 줄 checkRecapLine :1379(recap-line, '수 있') · 유형 경계 checkTogetherTypes :1391(teach-type) · 빈칸 수 checkTogetherBlanks :1421(teach-layout) · 자리별 시간 checkSlotSeconds :1463(slot-seconds 경고, lesson.slot_seconds_max.<자리> · lesson.spares_per_session.<영역> 를 읽음). 짝 · 같이 해 보기 풀이 검사는 seed-check 몫이라 범위 밖(장부) |
| M1 문법 용어 예외 | ADDRESSED: 목록 항목 exceptions(schema/reference.ts:525) · grammarTermHits · grammar-terms.json 의 주어 · 부사 예외 · 단위 시험 |
| M2 조용한 기본값 | ADDRESSED: 잠정값 상수를 지우고 settings 오류로(check-teach checkGoals, reference-index goalsRequiredLevels 는 없으면 undefined) |
| M3 읽기 짝 범위 | ADDRESSED: checkReadingOffband :1093 — 글로서리 proper 만 이름으로 보고 glossaryMissing 대조를 더함 |
| M4 단계 · 뺄 낱말 | ADDRESSED: 짝 허용 답 셋은 1~3단계(SPARE_ACCEPTED_UNTIL_LEVEL), 혼자 질문 셋 · 낱말 하나 금지는 3단계 단원 1~4. 이야기 낱말은 바른 답(modelAnswer)에서 no · yes · they 만 뺀다(STORY_FREE_WORDS, AC-4d) |
| M5 단원 목표 | ADDRESSED: 목표 수 ≤ seed.unit_goals_max(reference-index.ts:561~, settings.json 4 · 워크트리 12절 행) · tasks 가 영역 · 단계 과제 유형 안(goalTaskTypes :175) · 필수 단계 단원 목표 없음은 모든 모드 경고(영역 · 단계마다 하나), `--complete-through settings` 에서만 오류(validate.ts:491 · :1227, scripts/seed-validate.ts:315) |
| M6 다듬기 | ADDRESSED: 예문 `z.union([z.literal(""), Text])`(lesson.ts:79) · reference.ts goals 주석 · seed-viewer.spec.ts 빈 단언을 해설이 있을 때만으로 |
| 키 · 12절 | settings.json · 워크트리 12절에 spares_per_session 세 행 · slot_seconds_max 다섯 행(펼쳐 적음), speech.read_ko(켬) · seed.unit_goals_max(4)를 더했다 |
### fix 1 관문
| 명령 | 종료 | 결과 |
|---|---|---|
| pnpm lint | 0 | 460 파일 |
| pnpm tsc --noEmit -p . | 0 | 오류 0 |
| pnpm test | 0 | 102 파일 · 1117 통과 · 6 todo(seed-validator-teach 47) |
| pnpm check:deps | 0 | 위반 없음 |
| pnpm check:ids(CI 의 --fail-on) | 0 | 12절 키 228 · 시드 키 224 · 위반 0 |
| pnpm seed:validate --areas reading,writing,speaking | 1 | 실패 칸 2 · 경고 12(필수 단계 단원 목표 없음) · 규격 파일 오류 0 |
### 원본 시드가 못 지킨 것(학습 설계자 몫, 컨트롤러에게 알림)
- 말하기 speaking/3/1.json, I1 teach-differ 2건: content.questions.1.spare.modelAnswer · accepted.0 'No, they drink water.' 이 teach.models.0/1.en 과 같다.
- 읽기 reading/3/1.json, M3 glossary 5건 · offband 3건: 같이 해 보기 · 짝 글의 Dan · Tess · room · cookie · rice · apples · shop · cups · car · bank · Dad 가 content.glossary 에 없다. Dan · Tess 가 proper 가 아니어서 범위 밖 비율이 together.0 18.2% · 짝 0 8.3% · 짝 2 7.1% 다. 짝 · 같이 해 보기 전용 글로서리 칸을 둘지는 결정이 필요하다.
### 남은 우려 4
1. 위 원본 시드 둘을 고치기 전에는 seed:validate 가 종료 1이다.
2. 짝 · 같이 해 보기 풀이 검사(AC-8a 의 seed-check)는 없다.
3. 이야기 낱말 검사는 낱말 원형이 같으면 받는다(eats ↔ eat). AC-4d 를 글자 그대로 읽으면 더 엄하다.
4. 운영 적재 경로의 단원 목표 막음은 켜졌고, 지금 목표가 있는 단원은 3단계 단원 1 셋뿐이다. main.yml 이 PROD_RELEASE 로 돌면 빈 칸 · 풀이 검사와 함께 막힌다.
## fix 2(단원 목표 막음을 인자로, plan 정한 것 12 · C186)
- 필수 단계 단원 규격의 목표 없음은 새 인자 `--require-unit-goals`(기본 끔)일 때만 오류다. `--complete-through settings` 만으로는 막지 않고, 경고(영역 · 단계마다 하나)는 모든 모드에 그대로다. 작업 흐름 파일 셋에는 넣지 않았다.
- 자리: scripts/seed-validate.ts(CliArgs.requireUnitGoals 선택 칸 · parseArgs · goalsBlocking 연결 · 사용 줄), validate.ts · schema/reference.ts 주석, 워크트리 12절 seed.goals_required_levels 행 글, 시험 'seed-validator-teach: 명령 --require-unit-goals …'(켬 · 끔 · PR 모드).
- 가르치는 수업 칸의 필수 목표 오류(teach.goals)는 그대로다. fix 1 의 'M5 … `--complete-through settings` 에서만 오류'와 '남은 우려 4'는 이 절로 바뀐다.
- 관문(종료 코드): lint 0(463 파일) · tsc 0 · test 0(103 파일 · 1135 통과) · check:deps 0 · check:ids CI 꼴 0 · seed:validate 0(실패 0 · 경고 12 · 시드 둘은 학습 설계자가 고쳐 통과). 인자를 켜면 종료 1(unit-goals 오류).
- 관문 중간에 다른 손의 새 파일(app-trouble · session-destination)로 tsc · test 가 한때 붉었다가 그쪽이 끝난 뒤 위처럼 0 이 됐다. 그 파일은 손대지 않았다.
- 남은 우려 2: 짝 · 같이 해 보기 풀이 검사(seed-check) 없음, 이야기 낱말 검사가 원형 일치까지 받음.
## fix 3(재검토 I1 나머지 · N1 · N2, 모두 ADDRESSED)
- I1: 지문 · 듣기 대본 · 짝 글 · 이야기 · 정답 문장(retryHighlight, 읽기 · 듣기)을 splitSentences 로 나눠, 같이 나눈 본보기 · 같이 해 보기 문장과 answerForm(문장 부호 고름)으로 맞댄다(check-teach sentenceForms · shownTexts · soloTexts · checkDiffer). 검토자 사본 넷(m3-read-model-eq-answer · m3-speak-story-eq-script-sentence · m2-differ-punct, 그리고 m2-together-single)이 모두 막히고 원본 셋은 0건이다.
- N1: 3단계 단원 1~4 말하기 같이 해 보기도 낱말 하나 답 검사를 받는다(singleWordAnswers, 설계 6 accepted 행 대상 '말하기 같이 해 보기'). 지난 판의 together 시험은 3단계 꼴로 되살렸다.
- N2: --require-unit-goals 인데 seed.goals_required_levels 가 없거나 꼴이 틀리면 unit-goals 오류(validate.ts).
- 시험 셋을 먼저 실패시키고 통과시켰다(seed-validator-teach 51). 원형 일치(eats ↔ eat) 시험은 가짜 사전에 꼴 바뀜 낱말이 없어 두지 않았다.
- 관문(종료 코드): tsc 0 · test 0(104 파일 · 1150 통과) · check:deps 0 · check:ids CI 꼴 0 · seed:validate 0(실패 0 · 경고 12), 인자 켜면 1. lint 1 은 다른 구현자가 고치는 중인 파일 셋(tests/e2e/required-utterance.spec.ts · tests/e2e/talk.ts · tests/unit/required-e2e-helpers.test.ts)의 포맷이고, 내가 바꾼 파일 25개는 biome check 0 이다.
- 남은 우려 2: 짝 · 같이 해 보기 풀이 검사는 묶음 타 몫, 원형 일치 해석은 정본 반영 때 한 줄로.
