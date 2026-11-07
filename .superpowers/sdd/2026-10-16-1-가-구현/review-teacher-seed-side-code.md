# 범위 한정 코드 검토: 회화 선생님 시드 쪽 몫(code-reviewer · Opus · xhigh, 2026-10-23 09:3x)

(검토자는 읽기 전용이라 컨트롤러가 답장 원문을 이 파일에 옮겼다.)

**판정: 수정 필요.** Critical 0 · Important 1 · Minor 3. 범위 밖 관찰 4건(그 가운데 1건은 실시드 전환 C128 전에 컨트롤러가 정할 것).

대상: 워크트리 p08 의 커밋 안 된 변경 가운데 구현 보고 파일들. 정본 본 저장소 specs/(p08 specs 와 같음 확인). 직접 돌린 것: check:ids(보고와 같음) · 이름 찾기 함수를 실제 명단으로 시험(scratchpad/rv/names.ts) · stash 목록 · 상태 · 버려진 커밋 대조. 단위 시험은 다시 돌리지 않음.

## 1. 설계 준수
| 볼 것 | 판정 | 근거 |
|---|---|---|
| 1a 세 종류 모든 글 칸 | ✅ | check-talk.ts:703 · check-assessment.ts:653 · :805, 글 칸 모으는 함수 schema/talk.ts:176 · :229 · schema/assessment.ts:359 |
| 1b 읽기 · 쓰기 · 말하기 안 봄 | ✅ | 세 곳에만 걸림. 읽기만 시험 있음(seed-teacher.test.ts:232-250), 쓰기 · 말하기 시험 없음(M-2) |
| 1c 영어 대소문자 · 낱말 경계 | ✅ | check-teacher.ts:115-119. stamina · Leon · leopard · Victoria · tutorial · victorious · TORIES · Minas 안 걸림, TORI · Leo's · Mina! · 'Mina가' 걸림 |
| 1d 한국어 조사 허용 | ❌ 일부 | '라고' · '이다' 활용 일부 빠짐 → I-1 |
| 1e 이름 앞이 한글이면 안 걺 | ✅ | check-teacher.ts:127. 미나리 · 세미나 · 시나리오 · 포트폴리오 · 마리오 · 도토리 · 스토리 · 히스토리 · 토리노 · 미나토 · 리오넬 헛걸림 없음 |
| 1f {TEACHER} 틀 자리 오류 | ✅ | 시험 :192-204 |
| 2a 명단 규격 = 5절 칸 | ✅ | schema/teachers.ts 칸 아홉 = specs/04-데이터.md:7 |
| 2b 명단 검사 = 6.4 명단 자료 행 | ✅ / ⚠️ | check-teacher.ts:200-299 · specs/06-시드-생성.md:104. 이름표 대비 두 색 → M-1 |
| 2c 명단 글 = 시제품 | ✅ / ⚠️ | prototypes/teacher-avatar/src/teachers.js 와 같음 · LICENSES.md · SHA-256 같음. 명단 쪽 아티팩트와는 못 견줌 |
| 2d 비운 칸 표시 | ✅ | schema/teachers.ts:3-4 · 44 · 67 · 71 · 73, ledger-open.md:126 |
| 3 설정 키 다섯 | ✅ | seed/settings.json:88-92 = specs/09-설정값.md:78-82, fixtures · loadable changeViaOf 같음, check:ids talk.teacher_* 0 |
| 4 시험용 나무 회화 쪽만 · 뜻 유지 | ✅ | builders.ts 회화 질문 1 · 예상 흐름 2 · 이야기(제목 · 본문 · 뜻 · 질문 둘). 'Who plays with Tori?' → 'Who finds it?' 정답 Momo 본문과 맞음 |
| 5 stash · 잃은 변경 | ✅ | 5절 |

## 2. 잘한 점
명단이 검사 입력(teacherNamesOf, check-teacher.ts:38-49 — 셋째 선생님 준 · Jun 을 더하면 코드 고침 없이 막음, 시험 :75-85) · 명단 없거나 깨져도 옛 이름 검사는 돌고 규격 파일 오류로 실패(:470-486) · 가짜 명단 13가지가 오류 하나씩 · 경로까지 단언(:309-413) · 규격 거부 6가지 Zod 이슈 하나씩(:415-436) · 인사 문장 상한을 회화 1단계 규격 sentenceMaxWords 에서 읽음 · WCAG 상수 structure.ts 에 '설계 숫자 아님' · 회화 카드 여러 자리 고쳐 보며 칸 경로 · 칸 키 단언 · stash 스스로 보고 · 정한 것 8 따로.

## 3. 지적
### Important
**I-1. 한국어 이름 뒤 말 목록에 '라고' · '이다' 활용 일부가 빠져 이름을 대는 흔한 꼴을 놓친다** — check-teacher.ts:55-103(KO_NAME_TAILS) · :107-109 · :121-131(hasKoreanName), 시험 seed-teacher.test.ts:100-125 에 이 꼴 없음. 근거 specs/06-시드-생성.md:103 '조사를 허용해 본다' · AC-19e '조사 변형 포함'. 실제 명단 시험에서 안 걸림: '내 이름은 토리라고 해.' · '토리라는 친구' · '나는 토리인데' · '미나이고' · '토리잖아' · '토리지!' · '미나쌤' · '미나선생님' · '토린 좋아'. 허용 목록을 이어 붙인 꼬리만 이름으로 봐서 목록 밖은 모두 놓침. 놓침은 아이 화면에 다른 선생님 이름이 나가는 일. 남는 위험은 한국어만 있는 칸(목록 제목 · 주제 · 한국어 뜻 힌트 · 오늘 이야기 목록 · 끝맺음 조건 · 미션 한국어 · 풀이 설명 · 단어 뜻). 고칠 방법: (가) 목록에 라고 · 이라고 · 라는 · 이라는 · 란 · 이란 · 라서 · 이라서 · 라도 · 이라도 · 라면 · 이라면 · 인데 · 이고 · 고 · 이지 · 지 · 이지만 · 지만 · 잖아 · 이잖아 · 쌤 · 선생님 더함, (나) 앞이 한글이 아니면 뒤에 무엇이 붙어도 걸고 이름으로 시작하는 보통 낱말(미나리 · 토리노 · 미나토 · 리오넬 …)만 빼는 목록 — 막는 쪽으로 틀리므로 (나) 권함. 놓친 꼴을 시험 '걸림' 목록에.
### Minor
**M-1.** 이름표 대비를 accent ↔ room 으로 세는 것은 시제품 그림과 맞지 않음(check-teacher.ts:287-293 · 6.4 '색(이름표 글자 대비 4.5:1 이상)' · 시제품 style.css:8 .name-tag 바탕 #fff8d8 먹색 글자 · accent 는 .name-dot · :11 .greet-button accent 바탕 #fffdf5 글자). 지금 값 둘 다 넘음(미나 5.54 · 리오 4.93) — 장부에 '선생님 화면 plan 이 이름표 · 인사 단추 그리는 법을 정할 때 대비 짝을 맞춘다'.
**M-2.** 시험이 안 닿는 길 둘 — (a) '안 봄' 시험이 읽기 하나뿐(쓰기 · 말하기 수업 · 그 영역 단계 평가 없음) (b) validateSeed 의 assetExists 갈래(validate.ts:1001-1015) · runValidate 셋째 인자(scripts/seed-validate.ts:159 · 221 · 275-278) 시험 없음. 쓰기 · 말하기 견본에 '미나와 리오' 단언 · assetExists: () => false + 모델 채운 명단으로 teacher-asset 오류 하나 · summary.referenceErrors 시험.
**M-3.** 자산 경로 꼴이 '//' · 끝 '/' 를 받음(schema/teachers.ts:17-24 `^[a-z0-9][a-z0-9._/-]*$`) — 칸을 필수로 바꿀 때 조각마다 빈 문자열 막는 refine.

## 4. 범위 밖 관찰
1. **규격 파일에 '토리'가 남음(C128 전에 정할 것)** — seed/unit-specs.json:185 회화 1단계 단원 1 주제 '토리와 첫 만남'이 홈 카드에 나감(src/server/home/index.ts:254 → home-cards.tsx:124). seed/level-specs.json 회화 canDo 12행이 모두 '토리…'(정본 단계표 specs/02-2-세션과-단계표.md:156-167 은 이미 '선생님'), canDo 는 AI 가변부 Can-do 줄로 감(src/core/ai/calls/common.ts:189) — 'You are Mina' 고정부와 부딪히고 6.1 'Tori 라는 말은 … 어디에도 두지 않는다'(specs/05-AI-호출.md:31)와 어긋남. 6.4 검사는 이 둘을 안 봄. 결정 한 줄 · 규격 파일 글 고침(학습 설계자) · 회화 단원 규격 주제 · 단계 규격 canDo 도 검사에 넣을지.
2. **예상 흐름 'The teacher asks …' 꼴과 1단계 5낱말 상한이 부딪힘** — 6.3 · check-talk.ts:27-35(예상 흐름 역할 prompt 가 회화 영어 역할 목록에). 브리프에 상한을 적거나 아이에게 안 보이는 예상 흐름을 길이 검사에서 뺄지.
3. check:ids 남은 것(spec-setting-missing 다섯 · ai.model.talk_turn.1-3 기본값 · design-number 41)은 보고와 같음 — ledger-open.md:125.
4. 같은 워크트리를 동시에 고치는 중 — seed/vocab.json 09:25 바뀜(예문 넷 Tori 뺌, 설계자). 구현 보고의 seed:validate 숫자는 그 전 상태.

## 5. stash 확인
git stash list 본 저장소 · p08 모두 비어 있음(refs/stash 공유). 버려진 stash 커밋 4656afe(WIP on feature/1a-p08-seed-generation, 09:14:40)와 지금 작업 트리를 견줌 — stash 의 25파일 모두 지금도 고친 상태, 차이는 구현자 뒤 작업과 09:25 vocab.json 고침뿐, stash 때 vocab.json · prompts/ 는 HEAD 그대로. 잃은 변경 없음.

## 6. 라운드 판정
수정 필요. I-1 을 고치면 Approved. M-1 은 장부 한 줄, M-2 · M-3 은 컨트롤러가 직접 다듬어도 됨. 범위 밖 1 은 C128 전에 결정 필요.
