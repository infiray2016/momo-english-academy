# 브리프: 회화 plan 묶음 3 — 카드 · 단계 규격 새 꼴과 검증기(구현자 · Opus · high, 2026-10-30 08:1x — 묶음 1 구현 끝 · 검토 중)

plan `intent/2026-10-29-회화-수업을-대화로/plan.md`(approved C192) 묶음 3 행(묶음 표 20줄: 새 TalkCardSchema, 옛 꼴은 런타임 전용 이름, 관계 검사 둘, 문항 번호, 시드 보기, 옛 1단계 회화 시드 빼기 — 증명 AC-15m · 7a), 파일 표 '1 · 2 · 3 · 설정 · 적재 · 새 꼴' 절의 묶음 3 행 전부(schema/talk.ts · lesson.ts · reference.ts · structure.ts · check-talk.ts · check-cross.ts · check-assessment.ts · validate.ts · vocab/allocate.ts · reference-index.ts · seed/level-specs.json 회화 1~12단계 행 · seed/lessons/talk/1/{1..5}.json 지움 · seed-viewer talk-card.tsx · 옛 갈래 이름 · 꼴 읽기만 바꾸는 conversation 파일들 · 시험 builders · seed-validator-talk · seed-schema · seed-validator-complete), '이름 · 설정값 · 문구' 절(새 꼴 칸 이름 · 열거), 정한 것 1(새 흐름은 새 꼴 카드에서만 — 옛 형은 TalkCardV1Schema · TalkLessonV1Schema, 꼴 가르기 순수 함수 talkCardKindOf) · 3(옛 1단계 회화 시드 다섯 빼기, manifest 첫 판 줄 둠) · 15(일부 단원은 경고) 와 나머지 정한 것 가운데 검증기에 닿는 것, 위험 1 · 2, 증명 표 AC-15m · AC-7a 행을 그대로 구현한다. 기준 설계는 spec 4판 설계 6(카드 새 꼴 · 검증기 표 · 생성 브리프)과 정본 `specs/06-시드-생성.md` 6.3 회화 카드 · 6.4 검증 규칙(C189 반영)이다.

## 지키는 것
- 옛 흐름은 동작 그대로(정한 것 1): 옛 갈래는 V1 형을 쓰고 카드에서 꼴만 읽게 이름 · 읽기만 바꾼다. 옛 시험은 지우지 않는다(묶음 12 몫). 로컬 관문(lint · tsc · 단위 · check:deps · check:ids · spec:trace · seed:validate)이 늘 0 — 옛 1단계 회화 파일을 뺀 시드 나무의 seed:validate 오류 0, AC-15m 부정 시험(옛 칸 · 틀린 칸 거부) 통과.
- 같은 워크트리의 다른 손: 회화 묶음 1 · 2 는 검토 중(settings.json · 사본 · seed-load — 고치지 않음), 학습 설계자가 `seed/unit-specs.json` 의 talk 3단계 단원 1 goals 를 쓰는 중(그 파일은 고치지 않음). 가르치고 쪽 시드 정정은 멈춰 있다(`tests/.tmp/` 는 건드리지 않음).
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, `( cd 워크트리 && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸(세션 cd 금지), 커밋 · push 금지, 숫자는 설정값, 통합 · e2e 는 정적.

## 관문 · 보고
위 관문 전부. 보고 `task-talk-3-report.md`(같은 폴더): 바뀐 파일(줄) · 새 꼴 칸 표 · 검증기 규칙 목록(설계 6 표 행마다 어느 검사) · 설계와 다르게 한 것 · 시험 이름(AC 번호) · 관문 결과 · 요청하는 변경 · 우려. 답은 요지 열 줄 안.
