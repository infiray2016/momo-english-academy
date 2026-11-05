# 코드 검토: 수업 시드 규격 · 검증기 확장(검토자 · Opus, 2026-10-30 00시)
판정: **Changes requested**. Critical 0 · Important 5 · Minor 6. fix 할 항목은 I1~I5 이다(I5 범위를 이번에 넓힐지는 컨트롤러 판단, Minor 는 컨트롤러 재량).
근거 확인: 원본 seed 폴더 사본(스크래치 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev/`)으로 seed:validate 를 다시 돌렸다. 기준 실행은 칸 769 · 통과 766 · 실패 0 · 풀이 검사 안 됨 3 으로 보고와 같다. 아래 '사본' 결과는 `mutate.py` 로 한 칸씩 어긴 사본이다. 워크트리는 고치지 않았다.

## 1. 설계 준수
- [지킴] 설계 6 칸: teach.*(goals · shiftKo · todayKo/En · models · together · recap 두 줄), 문항 goal(하나 또는 목록) · whyKo · askRole · retryHighlight · spare(읽기 textEn, 질문 storyEn · accepted · acceptedMeaning), repeat 의 goal · chunks · spares, chips[].from, preview.parts, 예문 비움, 읽기 explanationKo 선택(schema/lesson.ts).
- [지킴] 설계 7: 자리 꼴(수 · 한 곳), 선생님 줄 길이, 설명 시간 합, 문법 용어, 짝(있음 · 자극 겹침 · 글 길이 · 서로 다른 꼴 셋), '왜'(whyKo · retryHighlight · chunks), 목표(꼴 · unit-specs 대조 오류 · tasks · 필수 단계 · expression → accepted), 범위 넓힘(영어 role · 읽기 범위 밖 비율), 선생님 이름 넓힘(토리 예외).
- [어김] 설계 7 · 수용 기준의 막는 행 가운데 '혼자 문항과 본보기의 다름'(AC-1a), 짝의 과제 유형 같음(AC-1a), 말하기 질문 꼴 셋(AC-4c · AC-4d), 핵심 목표 문항 0 의 오류(AC-8a), 이름표 꼴 · 되짚기 줄 · 유형 경계 · 조립 빈칸 · 자리별 시간 경고(AC-4b · AC-7c · AC-5a · AC-2e)가 없다(I1~I5).
- [지킴] 설계 12 키 이름 · 기본값 · 바꾸는 곳이 같다. speech.read_ko 는 검증이 읽지 않아 뺀 것이 타당하다. 평가 2절 목표 칸(UnitGoalSchema)은 같고, id 꼴 · 시드 전체 유일 · 영역 needs 를 본다.
- [확인 못 함] C182 (4) '원본 그대로 필수 검증 통과': 오류 0 은 사실이지만, I1 의 행을 넣으면 원본 말하기 시드가 걸린다. 그래서 아직 이 조건이 성립하지 않는다.

## 2. 잘한 점
- 새 칸을 걷지 않은 원본 셋이 schema 오류 0 으로 통과하고, 1단계 옛 시드 · 가짜 시드 나무도 그대로 통과한다(사본 기준 실행, 보고된 시험 1079).
- 설정값을 코드에 두지 않았다. lesson.* · speech.* 키가 없으면 키마다 한 번 `settings` 오류를 내고 검사를 건너뛰어 조용히 통과하지 않는다(check-teach.ts:111-142). 브리프의 '없으면 8' 대신 오류로 둔 것이 원칙에 더 맞다.
- 단원 목표 대조를 오류로 두었고(check-teach.ts:834-866), 규격 파일 정합(unit-goals)을 reference-index 에 따로 두었다.
- 시험이 규칙 이름과 칸 경로를 정확히 단언하고, 영역마다 '지킨 표본은 오류 0' 시험으로 거짓 실패도 막는다. '운동사진' · '마침표'(픽스처의 '끝에는 마침표를 놓아요.')는 문법 용어로 잡히지 않는다.

## 3. 지적
### Important
- **I1. '혼자 문항과 본보기의 다름' 행이 없고, 원본 말하기 시드가 이 행을 어긴다.** 짝은 자극만 맞대고(check-teach.ts:634-654), 한 곳 검사는 본보기 · 정답을 보지 않는다(:489-509). 원본 `speaking/3/1.json` 의 content.questions.1.spare 바른 답 · accepted.0 'No, they drink water.'가 teach.models.0.en · recap.frameEn 과 같은데 실패 0 이다. 쓰기 혼자 문항 정답을 본보기 문장으로 바꾼 사본도 실패 0 이다. 근거: 설계 7 해당 행, 설계 1 '다 맞힌 아이', AC-1a. 고칠 것: 혼자 문항 · 짝의 영어 문장과 정답 문장(쓰기 accepted, 말하기 modelAnswer · accepted)을 본보기(en · storyEn · questionEn · fromEn) · 같이 해 보기(textEn · en · storyEn · modelAnswer · accepted) 글과 맞대는 검사와 실패 시험을 넣는다. 그러면 말하기 시드가 걸리므로, 학습 설계자가 짝을 고친 뒤 원본 그대로 다시 통과시킨다(C182 (4)).
- **I2. 짝의 과제 유형 · 정답 꼴 검사가 없다.** 짝 유형을 문항 유형과 맞대지 않고, 목표 tasks 대조는 혼자 문항에만 돈다(:856-866). 보기 번호 검사(check-lesson.ts:581)도 혼자 문항에만 걸린다. 사본에서 읽기 짝 type 을 'sequence'(문항 fact, 목표 tasks [fact])로 바꿔도, 짝 answerNo 를 7(보기 넷)로 바꿔도 실패 0 이다. 근거: 설계 7 짝 '과제 유형 · 목표가 같고', 설계 6 spare '같은 꼴', AC-1a. 고칠 것: 짝 type(듣기는 kind 포함)을 문항과 같게 막고, 짝 · 같이 해 보기에 보기 번호 · 그림 키 검사를 다시 쓴다.
- **I3. 말하기 질문 꼴 가운데 셋이 없다.** (가) accepted 와 acceptedMeaning 의 같은 글: 사본 실패 0. 앱이 높은 쪽으로 가르므로 겹치면 뜻만 맞은 답이 표현 근거로 기록된다(C177 (4) · C182 (2)). (나) 3단계 단원 1~4 혼자 질문의 storyEn 필수: 스키마는 선택이고(lesson.ts:476) 검사는 있을 때만 돈다(check-teach.ts:937). 사본에서 지워도 실패 0 이고 '답 낱말은 이야기에' 검사도 함께 빠진다(C177 (3), AC-4d). (다) 넷 가운데 '예' 하나(AC-4c, 구현자 우려 1). 원본 시드는 셋 다 지킨다.
- **I4. 핵심 목표에 이어진 혼자 문항이 0개여도 경고뿐이다**(check-teach.ts:1007-1013). 설계 7 목표 행은 '하나 이상 이어지고'를 막는 조건으로, recap_min_evidence 미만만 경고로 둔다. 머리글은 "'경고'라고 적은 것만 경고"라고 하고, C177 (5) · AC-8a 는 경고 우회를 막는다. 사본(read-3-1-2 를 첫 값으로)은 실패 0 · 경고 1 이다. 고칠 것: 0 이면 goal 오류, 1 이상 미만이면 경고, 시험 둘.
- **I5. 설계 7 의 나머지 막는 행이 없다**(구현자 우려 1, 브리프 표 밖). 이름표 꼴(빈칸 하나 · askRole, AC-4b), 되짚기 줄 '할 수 있' 금지(AC-7c), 유형 경계(itemTypes · 쓰기 1~3 고르기 · 베끼기 · 조립, AC-5a), 같이 해 보기 조립 빈칸 수 = 남은 카드 수(AC-2e)가 없다. 자리별 lesson.slot_seconds_max 경고(설계 7 설명 시간 합 둘째 문장)는 키만 넣고 읽지 않으며 우려에도 없다. 원본 시드는 지금 모두 지키므로 한 라운드로 넣을 수 있다. 짝 · 같이 해 보기 풀이 검사(AC-8a)는 seed-check 몫이라 범위 밖이면 장부에 남긴다.
### Minor
- **M1. 문법 용어 거짓 실패.** 낱말 머리 일치라 '주어진 카드' · '주어요(주다)'가 막힌다(check-teach.ts:438-458). 예외 낱말 목록을 둔다. 또 설계 1 의 '칩 이름'은 화면 이름표(누가 · 마침표 …)인데 검사는 영어 칩 글을 본다. 문구 표가 생기면 같은 목록으로 단위 시험 하나를 둔다.
- **M2. seed.goals_required_levels 만 조용한 기본값을 쓴다**(structure.ts:299, reference-index.ts:604). 다른 키처럼 없으면 settings 오류로 둔다(CLAUDE.md 설정값 원칙).
- **M3. 읽기 짝 · 같이 해 보기의 범위 밖 비율이 지문 검사보다 느슨하다.** 대문자로 시작하고 사전에 없는 낱말을 모두 고유 명사로 빼고(check-teach.ts:1017-1029), 글로서리 대조가 없다(지문은 check-lesson.ts:546-551 글로서리 proper 만). 설계 7 은 '같은 검사'다.
- **M4. spec 과 기준이 다른 곳.** 허용 답 '서로 다른 꼴 셋'을 모든 단계에 건다(check-teach.ts:957-965, 설계 6 · 7 은 3단계 · 1~3단계). 이야기 낱말 검사는 기능어를 모두 빼는데 AC-4d 는 no · yes · they 만 뺀다. 4단계 이상 teach 시드에서 거짓 실패, 전치사 차이에서 거짓 통과가 날 수 있다.
- **M5. 단원 목표 꼴 일부와 완전성 '보고'가 없다.** 목표 수 ≤ seed.unit_goals_max(키도 없음), tasks 가 영역 · 단계 과제 유형 안인지(평가 2절 목표 꼴)를 보지 않는다. 필수 단계 단원에 목표가 없을 때 개발 적재 · CI 의 '보고만'(평가 2절 필수 범위)도 지금은 없다.
- **M6. 다듬기.** 예문 `z.string()` 은 teach 수업에서 공백뿐인 글을 받는다(lesson.ts:78, `z.union([z.literal(""), Text])`). reference.ts:329 주석 '대조는 평가 체계 몫'은 지금과 다르다. seed-viewer.spec.ts:353 `toContainText("")` 는 해설이 없으면 늘 통과한다.

## 4. 구현자가 다르게 둔 둘에 대한 의견
- 완전성 막음을 뺀 것: 개발 적재(dev-load.yml, 숫자 `--complete-through`)를 막지 않은 것은 C160 · 평가 2절에 맞다. main.yml 은 PROD_RELEASE 로 꺼져 있고, 6단계까지의 빈 칸 · 풀이 검사 안 됨으로 이미 종료 1 이라 막음을 더해도 새로 깨지는 것은 없다. 권함: 지금 모든 모드에 경고로 넣고(M5), `--complete-through settings`(운영 적재 경로만 씀)에서만 오류로 올린다. 늦어도 PROD_RELEASE 를 켜는 첫 운영 배포(1-나 · 1~6단계 시드 뒤) 전에는 켠다.
- seed.goals_required_levels 행: 코드가 읽으므로 타당하고 값도 평가 spec 8절과 같다. 기본값 처리만 M2.

## 5. 부작용 · 정본 반영 때 겹칠 자리
- e2e 네 줄 `?? ""` 는 지금 시드(해설 있음)에서 동작이 같다(빈 단언 우려는 M6). settings.json 에는 판 칸이 없어 판 올림은 해당 없다.
- 12절 머리 '시드를 다시 만들어야 하는 키' 문장은 가르치고 반영(lesson.* 여섯)과 canon-eval(level.test_spares_per_unit · level.ai_task_spares_per_form · seed.unit_goals_max)이 함께 고친다.
- seed.goals_required_levels 행은 canon-eval 이 평가 8절 문구로 넣으면 워크트리 행('워크트리에 먼저 둠')을 그 문구로 바꾼다.
- 델타 spec 12 의 `lesson.spares_per_session.<영역>` · `lesson.slot_seconds_max.<자리>` 를 그대로 옮기면 check:ids 가 `<영역>` 을 회화까지 펴서 spec-setting-missing 을 내고, `<자리>` 는 모르는 자리 표시로 멈춘다(scripts/check-ids.ts:251-272). 정본도 펼쳐 적거나 check-ids 를 고친다.
- speech.read_ko 를 정본에 넣으면 settings.json 에 없어 spec-setting-missing 이 난다. speech.speak_chars_per_second_ko · speech.rate_ko 는 본 저장소 12절(UI · UX 반영)에 아직 없고, speech.speak_* 세 행은 워크트리와 문구가 다르다.

## 범위 밖 관찰
- 읽기 원본 시드는 문항 셋 모두 explanationKo 없이 whyKo 만 있다. 지금 읽기 화면은 해설 줄에 explanationKo 를 그려(src/components/session/reading.tsx:502) 이 시드로 프리뷰하면 빈 줄이 보인다. 여섯 자리 화면이 whyKo 를 읽기 전까지 남는다.
