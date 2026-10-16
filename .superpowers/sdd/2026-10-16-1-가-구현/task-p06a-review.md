# 규격 검토 브리프: P6a 규격 파일 1차 — 묶음 0 · 2 · 1(1~6단계 전부)(design-reviewer des-p06a · Opus · xhigh, 읽기 전용, 2026-10-17 02:3x)

역할: design-reviewer, 읽기 전용. 저장소 · 워크트리의 어떤 파일도 고치지 않는다. 보고 파일 하나만 쓴다(Bash 로 써도 된다). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴로 워크트리 안에서 돌리고, 한글 경로는 명령 인자로 넘기지 않는다(cd 뒤 상대 경로). 네트워크 · API 없음. 시드 규격 파일(수업 본문이 아니라 settings · level_specs · vocab · unit_specs · 형태 · 금지어 목록)이 정본 3절 · 6절 · 12절과 교육과정 상식에 맞는지를 본다.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(브랜치 feature/1a-p06a-seed-reference, 바탕 P4c 6bd6015, 커밋 없음 — 새 파일은 untracked 라 직접 읽는다). 규격 파일: `seed/settings.json`(180행) · `seed/level-specs.json`(48행) · `seed/model-prices.json` · `seed/vocab.json`(960항목, 1~6단계 확정 + 7~12단계 기능어 임시) · `seed/unit-specs.json`(122행 = 1~6단계 120 + 알파벳 단원 0 둘) · `seed/lists/forms.json`(21) · `seed/lists/forbidden.json` · `seed/lists/homophones.json` · `seed/images.json`(빈 카탈로그). 근거 문서 `docs/research/2026-10-16-seed-reference-basis.md`((1) 어휘 출처 · 단계 규칙 · 1~6단계 vocab, (2) can-do 48 근거, (3) 단원 주제 · 학습 요소 · 1~6단계 단원 단어 배치, (4) 형태 표 검출 표 · 3.6 요소 120 검출 여부, (5) 금지어 시험 문장, (6) H5 제안서 확정 C66, (7) level_specs 를 견본에서 고친 곳, (8) 일회 검사 결과). 학습 설계자 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06a-report.md`(묶음 0 · 묶음 2 · 묶음 1 세 절 — 만든 것 · 명령 출력 · 판단 · 약한 곳). 일회 검사 스크립트 `<워크트리>/tests/.tmp/p06/`(check_settings.py · check_examples.ts · check_lists.ts — 다시 돌려 본다).
- 기준(메인 저장소 `/Users/hikaru/workspace/momo-english-academy/`): plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06a-규격-파일.md`(머리 '컨트롤러 결정' 두 문단 · '어휘 vocab.json' 규칙 · 위험 1~9 · 증명 절의 design-reviewer 점검표), 정본 3.2 단원 틀 표 · 관계 표(`specs/02-1-영역-단원-승급.md`), 3.3 단계표 · 3.6 문장 길이 상한 · 학습 요소 120(`specs/02-2-세션과-단계표.md`), 3.4 어휘 누계(`specs/02-3-어휘-복습-동기-점수.md`), 6.3 시드 규격(`specs/06-시드-생성.md`), 12절 설정값(`specs/09-설정값.md`), 13절 C53 · C54 · C61 · C64 · C66(`specs/10-결정-기록.md`). 외부 사실(CEFR Pre-A1 · A1 어휘, 초등 영어 교육과정 권장 어휘)은 출처와 확인 정도를 적는다.
- 컨트롤러 재확인(02:3x): lint 0 · test 160 · `pnpm seed:validate` 첫 줄 '실패 0 · 규격 파일 오류 120'(120 은 모두 reference-complete, 7~12단계 행 20씩 — 1~6단계 0) · settings 180 · level-specs 48 · vocab 960 · unit-specs 122 · forms 21.

## 볼 것(점검표 1차 — plan 증명 절 그대로, 1~6단계)
1. level_specs 48행이 3.3 · 6.3 · 3.6 과 줄마다 같은지(활동 수 · 문장 길이 상한 · 평가 유형별 문항 수 testMix(C66) · 쓰기 틀 frame · 말하기 questions.modelAnswer 가 1~3단계만 참인지(P9b 가 문법 지적 경계로 읽음) · speaking.answer_max_seconds 30 · 30 · 60 · 150). 근거 문서 (7) '견본에서 고친 곳'이 타당한지.
2. can-do 48: 숫자 없음(경고 0 확인) · 이웃 단계와 차이가 보이는지 · 근거 문서 (2)의 근거 줄이 맞는지 · 아이 눈높이 한국어인지.
3. settings: 12절 표를 펼친 키 모음 = settings.json 키 모음(plan 정할 것 라의 넷 빼고), 값 = 12절 기본값(H5 확정 값 포함) — `python3 -I tests/.tmp/p06/check_settings.py` 를 다시 돌린다. 관계 표(마지막 배정 5 ≤ 25 × 0.2 등)가 1~3구간 25 로도 성립하는지.
4. model-prices: plan '확인한 사실' 표(C61 단가)와 같은지.
5. 1~6단계 내용어: 단계마다 수 = 단원 단어 수 × 5(1~3 125 · 4~6 150), 출처 표시(`**`) 비율, 단원 주제와 낱말의 어울림, 학습 요소가 3.6 글자 그대로인지, 배정 차례(앞 수업일수록 쉬운 낱말), 쓰기 1~3단계 단원이 3.6 철자 패턴 낱말인지(보고 81% 가 충분한지 — 패턴 밖 낱말이 뒤쪽에 있는지), 읽기 1~2단계 그림 낱말 비율(2-1 '오늘 내 기분' 15/25 를 받을지 — 그림으로 고르기 활동이 되는지), 같은 단계 안 영역 사이에 같은 단원 단어 모음이 없는지(묶음 1 판단 둘째), 1단계 a · an 단원에 an 낱말이 드는지(판단 첫째).
6. 알파벳 대표 낱말 26(단원 0): 1단계 내용어와 겹치지 않는지, 글자 소리 대표로 알맞은지(x · q · y 등).
7. 기능어 목록과 단계(1~6): 3.6 도입 요소와 어긋나지 않는지(위험 7 — 너무 이르거나 늦은 기능어), 대명사 pos 처리.
8. vocab 표본 10%(단계마다 고르게, 96항목 안팎): 뜻(한국어, 아이 눈높이) · 예문(그 단계 사전 안 낱말 · 3.6 문장 길이 안 · 범위 안 형태) · 활용형 · 품사. 예문 일회 검사 `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6` 을 다시 돌린다(RESULT 0 인지). 달 May 없음(⑦).
9. forms(1~6): 묶음 0 여섯 + 묶음 2 열다섯 검출기가 plan 규칙과 맞는지, 근거 문서 (4)의 '검출하지 않음 24' 까닭이 타당한지(C64 (3) — 3.3 이 앞서는 형태 · 한 열 형태), 금지어 · 형태 시험 문장 `pnpm exec tsx tests/.tmp/p06/check_lists.ts` 다시 돌림(139 문장 RESULT 0). forbidden 의 contact 정규식(P9b 가 가림에 씀) · homophones 의 1~6단계 낱말이 vocab 에 있는지(동음이의어 13 은 7~12단계라 묶음 3 · 4 — 받을지).
10. 어휘 누계가 3.4(375 · 825 · 1,275 · 1,725)의 1~6단계 몫(375 · 825)과 맞는지, 단계 사이 난도가 오르는지(표본).
11. 보고 '판단' 셋(a · an 짝 변경 · 쓰기 4-2 짝 변경 · 철자 패턴 81%)과 '약한 곳'(읽기 2-1 그림 낱말 · 동음이의어 13)을 받을지 판정한다.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p06a.md`(메인 저장소 장부, plan 증명 표 이름 그대로). 첫 줄 판정(Approved · Changes requested, C · I · M 수). 지적마다 심각도(Critical · Important · Minor)와 근거(파일 · 행 id 또는 줄, 정본 절 · 표 행, 13절 번호, 외부 사실은 출처 · 확인 정도)를 적고 근거 없는 지적은 넣지 않는다. 점검표 1~11 마다 '맞음 · 어긋남(무엇)' 표, 다시 돌린 명령 셋의 출력 첫 줄, 판단 셋 · 약한 곳 둘의 판정. 묶음 3 · 4(7~12단계)와 2차 검토에 넘길 메모가 있으면 끝에. 마지막 메시지는 판정 + C · I · M 수 + 요지 세 줄.
