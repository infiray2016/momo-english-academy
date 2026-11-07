# 브리프: 수업 시드 규격 · 검증기 확장 — 3단계 단원 1 원본 시드 셋이 검증을 통과하게(구현자 · Opus · high, 2026-10-29 22:0x)

요청자 지시(2026-10-29 21:5x, 13절 C175 (5)): "실제 시드에서 보고된 스키마 오류 24건을 해결하고 새 필드를 포함한 원본 시드 3개가 모두 검증기를 통과하도록. 새 필드를 제거한 사본의 검사 성공은 최종 검증 완료로 보지 않는다." 코드 워크트리는 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(머리 0c664c3 위에 커밋 전 변경 64파일 — 불편 1차 묶음. 그 파일들은 건드리지 않는다). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. 작업 폴더를 옮기지(cd) 않는다. 통합 · e2e 는 이 Mac 에서 못 돌리므로 단위 · lint · tsc · check:deps · check:ids · seed:validate 만 돈다.

## 목표
1. `seed/lessons/{reading,writing,speaking}/3/1.json`(새 칸이 든 원본, 학습 설계자가 쓴 것 — 곧 3판으로 바뀜: 말하기 혼자 질문에 `storyEn` · `acceptedMeaning` 이 더해진다)이 `pnpm seed:validate --areas reading,writing,speaking` 을 오류 0 으로 통과한다. 새 칸을 걷은 사본으로 통과시키는 것은 안 된다.
2. 기존 1단계 시드(`seed/lessons/*/1/*.json`)와 가짜 시드 나무를 쓰는 단위 시험은 그대로 통과한다(새 칸은 선택이고, 1~3단계 수업에 teach 가 있으면 새 검사가 걸린다).
3. 델타 spec 설계 6 · 7 의 검사 가운데 기계로 할 수 있는 것을 검증기에 넣는다(아래 표).

## 입력(절대 경로 /Users/hikaru/workspace/momo-english-academy)
- 델타 spec `intent/2026-10-29-가르치고-배우는-수업/spec.md` 설계 6(수업 시드 규격, teach.* · 문항 칸) · 설계 7(검증 표 · 문법 용어 목록 `seed/lists/grammar-terms.json`) · 설계 12(설정 키 — 검증이 읽는 키는 `seed/settings.json` 에 잠정 기본값으로 더한다: lesson.teacher_line_max_chars 40 · lesson.line_max_sentences 2 · lesson.models_per_lesson 2~3 · lesson.together_items.<구간> 2 · 1 · 1 · 1 · lesson.spares_per_session.<영역> 3 · 3 · 4 · lesson.spare_text_max_words.<구간> 20 · 40 · 60 · 80 · lesson.teach_seconds_max.<구간> 70 · 80 · 90 · 100 · speech.speak_chars_per_second_ko 6 — 12절 정본 반영은 따로 가므로 check:ids 가 '정본에 없는 키'로 막으면 그 검사의 허용 목록(있다면)이나 보고 방식을 보고 컨트롤러에게 알린다. 설정 키를 더하면 `seed/settings.json` 판(version)을 올린다).
- 표본 2판 `.superpowers/sdd/2026-10-29-가르치고-배우는-수업/samples-l3u1.md` 부록 B(시드에 쓴 꼴) · 보고 `task-samples-report-v2.md`(검증 결과: 걸린 자리 목록).
- 지금 코드: `src/core/seed/schema/lesson.ts`(수업 Zod) · `check-lesson.ts` · `validate.ts` · `structure.ts` · `issue.ts` · `scripts/`(seed:validate 가 부르는 것) · `tests/unit/` 의 시드 시험 · `seed/lists/`(금지어 · 메타 문장 목록 꼴).

## 규격(스키마에 더할 칸 — 모두 선택이되, 1~3단계 수업에 teach 가 있으면 아래 '필수' 규칙을 검사)
수업(lesson) 칸 `teach`: `goals`(string[]) · `shiftKo { before, after }` · `todayKo`(string) · `todayEn`(string, 선택) · `models[]`(en · ko · chips[{ text, role }] · lineKo · picture? · fromEn? · storyEn? · questionEn? · wordAnswerEn?) · `together[]`(영역 문항 꼴 + filled · slot · choices · highlight · rightKo · wrongKo · accepted?) · `recap { frameEn, chips, closeKo, closeKoPracticed }`. `chips[].role` 은 who · do · what · where · thing · is · how · end. 말하기 본보기 chips 에는 `from`(질문 칩 → 답 칩 짝) 이 있을 수 있다.
문항 칸: 혼자 문항마다 `goal`(string) · `whyKo`(string) · `askRole`(이름표, 읽기 · 듣기 빈칸 문항) · `retryHighlight`(읽기 · 듣기) · `spare`(같은 꼴 문항 + whyKo, 읽기 짝은 `textEn`, 말하기 질문 짝은 `storyEn` · `accepted`(셋 이상)). 따라 말하기 묶음(repeat)은 글 배열이라 같은 차례의 `goal` · `chunks` · `spares` 배열. 말하기 혼자 질문 문항에 `storyEn`(질문 직전에 들려줄 이야기, 3판에서 더해짐) · `acceptedMeaning`(의사소통상 정답으로 받되 완전 수행 근거는 아닌 꼴, 선택). `preview[].parts`(선택), `preview[].example` 은 비울 수 있게. 읽기 문항의 `explanationKo` 는 `whyKo` 가 있으면 없어도 된다(둘 다 있으면 거부하지 않는다).

## 검증기에 넣을 검사(설계 7, 기계로 되는 것)
| 검사 | 기준 |
|---|---|
| 자리 꼴 | teach 가 있으면 필수 칸(goals · shiftKo · todayKo · models · together · recap)이 있고, 본보기 수가 lesson.models_per_lesson 안, 같이 해 보기 수가 lesson.together_items.<구간>. 채점 문항은 teach.together · 혼자 문항 · spare 가운데 한 곳에만 |
| 선생님 줄 길이 | todayKo · lineKo · whyKo · rightKo · wrongKo · closeKo · closeKoPracticed 가 lesson.teacher_line_max_chars 이하(빈칸 뺌), 문장 수 lesson.line_max_sentences 이하 |
| 설명 시간 합 | 오늘 배울 것 · 본보기 · 되짚기의 선생님 글을 한국어 speech.speak_chars_per_second_ko · 영어 speech.speak_chars_per_second 로 나눠 더한 값이 lesson.teach_seconds_max.<구간> 이하(speech.speak_chars_per_second 가 settings.json 에 없으면 8 로 두고 보고) |
| 문법 용어 | 선생님 말 칸 · 칩 text 에 `seed/lists/grammar-terms.json`(새 파일: 주어 · 동사 · 목적어 · 형용사 · 부사 · 명사 · 대명사 · 관사 · 전치사 · 조동사 · be동사 · 단수 · 복수 · 인칭 · 시제 · 현재형 · 과거형 · 진행형 · 의문문 · 부정문 · 명령문 · 품사, 항목마다 fromLevel 비움) 낱말이 없다 |
| 짝 | 채점되는 혼자 문항마다 spare 하나. 짝의 글자가 본보기 · 같이 해 보기 · 혼자 문항 · 다른 짝의 자극과 같지 않다. 읽기 짝 글은 lesson.spare_text_max_words.<구간> 이하. 말하기 질문 짝은 accepted 셋 이상 |
| '왜' | 1~5단계 채점 문항(따라 말하기 빼고)과 짝에 whyKo. 읽기 · 듣기의 retryHighlight 가 지문 · 대본 안의 글이고 정답 낱말을 품는다. 따라 말하기 문장은 chunks 가 있고 '/' 로 나눈 덩어리를 합치면 원문이다 |
| 목표 | teach.goals 의 ID 꼴(`<영역>-<단계>-<단원>-<n>`)이 맞고 혼자 문항 goal 이 teach.goals 안. unit-specs goals 와의 대조는 평가 체계 구현 몫이라 하지 않는다 |
| 범위(넓힘) | 본보기 · 같이 해 보기 · 짝 · storyEn · 되짚기의 영어 칸도 지금의 어휘 범위 · 문장 길이 · 형태 · 금지어 검사를 받는다. 말하기 답은 한 문장(쉼표 뒤 소문자 'No, they …' 꼴은 한 문장) |
| 선생님 이름 | 선생님 말 칸에 명단 이름 · {TEACHER} · {NAME} 금지('토리'는 그 수업 글에 등장인물로 있을 때만) |

## 절차
TDD: 새 칸 · 새 검사마다 실패 시험을 먼저 쓰고(가짜 시드 조각) 통과시킨다. 기존 시험은 깨지 않는다. 바뀌는 파일은 `src/core/seed/**` · `seed/settings.json` · `seed/lists/grammar-terms.json` · `tests/unit/seed-*` 와 검증 스크립트뿐이다. 다른 파일(특히 커밋 전 64파일)은 손대지 않는다. 끝에 `pnpm lint` · `pnpm tsc --noEmit`(또는 package 의 typecheck) · `pnpm test`(단위) · `pnpm check:deps` · `pnpm check:ids` · `pnpm seed:validate --areas reading,writing,speaking` 을 돌리고 결과를 그대로 적는다. 원본 시드 셋이 오류 0 이어야 끝이다(검사가 시드의 잘못을 잡으면 고치지 말고 보고에 적는다 — 시드는 학습 설계자 몫).

## 보고(`task-seed-schema-report.md`, 같은 폴더, 60줄 안)
바뀐 파일 · 새 검사 표 · 관문 결과(명령 · 종료 코드 · 수) · 원본 시드 셋 검증 결과 · 시드가 못 지킨 것(있으면) · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
