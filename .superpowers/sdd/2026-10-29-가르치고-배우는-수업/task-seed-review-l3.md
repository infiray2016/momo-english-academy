# 브리프: 3단계 단원 1 정규 시드 검토(설계 · 화면 검토자 · Fable · max, 2026-10-30 05:2x — 영역마다 하나씩, 자-2 적재 전)

생성된 3단계 단원 1 수업 시드(뿌리 `.claude/worktrees/p13d/tests/.tmp/l3-samples/xhigh/lessons/<영역>/3/1.json`, 수업 26 = 승인 수업 1 + 새 25, seed:validate 오류 0 · 경고 0)를 아이 눈과 설계 규칙으로 검토한다. 고치지 않고 판정과 정정 목록만 낸다. 보고는 `.superpowers/sdd/2026-10-29-가르치고-배우는-수업/task-seed-review-<영역>-report.md`.

## 기준
- 생성 브리프 `seed/prompts/<영역>-3.md`(3판 — 워크트리 `.claude/worktrees/p13d/seed/prompts/`)와 틀 `_template.md`(가르치는 수업 규칙 R5~R16), 생성자 보고(컨트롤러가 브리프 호출에 붙임), 문법 용어 금지 목록 `seed/lists/grammar-terms.json`(68), 어휘 `seed/vocab.json` · 단원 규격 `seed/unit-specs.json`(3단계 단원 1 목표 · 단원 단어) · 그림 `seed/images.json`, 정본 `specs/06-시드-생성.md` 6.3(카드 · 수업 규격 · teach 칸) · 6.4(검증 규칙) · `specs/02-2-세션과-단계표.md` 3.3(여섯 자리 · 틀린 뒤 차례 · 1~3단계 경계: 쓰기 3단계는 카드 조립(첫 글자 대문자 · 마침표 카드), 말하기 3단계는 한 문장 답, 읽기 3단계는 짧은 글 + 사실 확인) · 델타 spec `intent/2026-10-29-가르치고-배우는-수업/spec.md` 설계 1 · 2 · 6 · 7, 승인 표본(`.superpowers/sdd/2026-10-29-가르치고-배우는-수업/` 의 표본 · 정정 기록 — 승인 수업은 글자 그대로 붙어 있어야 함).
- 아이: 초등 4학년이 혼자 쓴다. 한 화면 한 행동, 해요체 선생님 말, 영어 문장의 뜻은 친구 말투(반말), 아이 이름 · {NAME} · 선생님 이름 없음, 토리는 수업 글의 등장인물로만.

## 볼 것(영역 공통)
1. **아이 눈**: 글 · 문장이 3단계 범위(낱말 수 · 문장 꼴 · 단원 단어 · 앞 단원 단어)인지, 뜻이 자연스럽고 어린이 세계의 장면인지(생성자가 적은 어색 문장 — 쓰기: 'They are far.' · 'The trucks are low.' · 'The robot is bright.' · 'The roads are red.' · top 의 두 뜻; 말하기: 보조 인물 Ben · Meg 를 Mom · Dad 와 짝지은 것 · 모모 등장 수업 10), 선생님 말(todayKo · lineKo · whyKo · rightKo · wrongKo · closeKo · closeKoPracticed)이 해요체이고 문법 용어 68 이 없는지, 칩 role 이 아이 말(누가 · 하는 일 · 무엇 · 어디 / 무엇 · is · 어때요 · 마침표)인지.
2. **낱말 짝 · 변형**: 본보기 ↔ 같이 해 보기 ↔ 혼자 문항 ↔ 짝이 인물 · 낱말이 서로 다른지(설계 7 '혼자 문항과 본보기의 다름'), 뒤집힌 낱말 짝은 같은 짝으로 보는지, 변형 1 · 2 사이의 낱말 짝 겹침이 학습에 해가 되는지(같은 수업 안 · 같은 변형 안 겹침은 금지), 단원 단어 덮기(보강 1번 이상 25 · 2번 이상)가 브리프 셈법과 맞는지.
3. **규칙**: 인물(동물 인물 Max · Ted · Gus 는 먹기 · 마시기 · 가기 · 오기 · 놀기만, 읽기 중심 쌍 'Ben and Meg', 쓰기는 이름 · I 카드 없음 — C84), 그림 키가 images.json 에 있는지, 짝 수 = 채점 혼자 문항 수, 승인 수업(배정 1 · 변형 1)이 글자 그대로인지, 되짚기 문장 틀(frameEn · chips)이 그 수업 목표 꼴인지, 마무리 줄 둘의 뜻 차이(할 수 있어요 / 배우고 연습했어요).
4. **영역별**: 쓰기 — 카드 조립의 빈칸 수 = 남은 카드 수(C174 (3)), 대문자 · 마침표 카드, 색 칸 칩 자리(정답 문장 'is' 위치 — 라-2 잠정), 단원 1 · 2 낱말 일곱 맞바꿈 반영. 말하기 — 질문 꼴 [L1](아니요 셋 · 예 하나, 쉼표 꼴 한 문장), 이야기(1~2문장, 글자 없이 소리만, 답 낱말은 이야기에서 나오고 질문 글에는 없음), 허용 답 두 묶음(accepted 셋 이상 · acceptedMeaning), chunks 끊기 자리, 듣기 대본 · 빈칸 문장 · 이름표, 의미 검사 C187 갈래에서 걸릴 답 예, high 표본(`…/high/lessons/speaking/3/1.json`)의 풀이 검사 multiple 넷(assigned 5 · reinforce 7 · remedial 1 의 no.13, remedial 3 의 no.21)이 xhigh 에도 비슷한 문항으로 있는지. 읽기 — 짧은 글 길이(lesson.spare_text_max_words.1-3 20), 사실 확인 문항 · 이름표(askRole), 하는 일 말 띠(retryHighlight), 글로서리.

## 보고
심각도(Critical · Important · Minor)와 근거(수업 번호 kind:lessonNo:variant · 칸 · 문장)를 반드시. 판정은 Approved(그대로 적재) 또는 Changes requested(정정 목록 — 수업 · 칸 · 지금 글 · 고칠 글). 좋은 점 셋도 적는다. 아이 이름 · 비밀값은 적지 않는다. 답은 판정과 건수, Important 이상 요지만.
