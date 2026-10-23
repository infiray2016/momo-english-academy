# 검토 브리프: 회화 선생님 시드 쪽 몫 — 범위 한정 코드 검토(code-reviewer 새로 · Opus · xhigh, 2026-10-23 09:3x)

읽기 전용. 대상: 워크트리 p08 작업 트리의 커밋 안 된 변경 가운데 구현 보고 `task-teacher-seed-side-report.md` 의 파일(seed/teachers.json · src/core/seed/schema/teachers.ts · check-teacher.ts · structure.ts · reference-index.ts · validate.ts · check-talk.ts · check-assessment.ts · scripts/seed-validate.ts · seed/settings.json · tests/fixtures/settings.ts · tests/fixtures/seed/builders.ts · loadable.ts · tests/unit/seed-teacher.test.ts · seed-schema.test.ts · tests/e2e-local/seed-viewer.spec.ts). `git -C …/p08 diff -- <파일>` 로 읽는다. seed/prompts/ · seed/vocab.json 은 학습 설계자들이 같은 때 고치는 중이라 범위 밖. 정본: 본 저장소 `specs/`(13절 C130 · C131, 6.4 '선생님 이름' · '명단 자료' 행, 5절 명단, 12절 talk.teacher_* 다섯, 15절 AC-5 · AC-19a 의 시드 몫), 브리프 `task-teacher-seed-side.md`.

## 볼 것
1. '선생님 이름' 검사가 세 종류(회화 카드 · 회화 평가 장 · 선생님 이야기)의 **모든 글 칸**을 보는지, 읽기 · 쓰기 · 말하기 글은 안 보는지. 영어 대소문자 · 낱말 경계, 한국어 조사 목록 · '이름 앞이 한글이면 안 걺'(스토리 · 도토리 · 시나리오) 규칙이 헛걸림 · 놓침을 만들지 않는지(예: 'Leo' 와 'Leon' · '리오' 와 '시나리오' · '토리' 와 '도토리' · 'tori' 가 든 낱말).
2. 명단 규격 · 명단 검사(키 겹침 · 이름 겹침 · vocab 단어인 영어 이름 · 성격 낱말 셋 · 이름표 대비)가 정본 5절 · C130 과 맞는지, 지금 비울 수 있게 한 칸(모델 · 초상 · 목소리 · 줄인 방법)이 '선생님 화면 plan 때 필수로' 표시돼 있는지.
3. 설정 키 다섯의 값 · 범위 · 바꾸는 곳이 12절과 같은지, 시험 설정 · 시험용 나무 설정과 같은지.
4. 시험용 나무 고침이 회화 쪽 'Tori' 만 바꾸고 뜻을 지켰는지, 예상 흐름 5낱말 상한 때문에 줄인 견본이 시험의 뜻을 바꾸지 않는지.
5. 구현자가 워크트리에서 `git stash` · `pop` 을 한 번 썼다(보고 5) — 지금 작업 트리에 남은 stash 항목 · 잃은 변경이 없는지 `git stash list` 와 `git status` 로 확인(공유 stash 라 다른 세션 항목이 섞였는지도).

## 보고
`review-teacher-seed-side-code.md`: 판정 · 지적마다 심각도(Critical · Important · Minor)와 근거(파일:줄 · 정본 절). SendMessage 한 줄.
