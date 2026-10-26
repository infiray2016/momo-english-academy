# fix 브리프: P6a 시드 규격 파일 fix 3(curriculum-designer cd-p06a 이어 보기 · Opus · high, 2026-10-17 15:1x) — 마지막 fix 라운드

`review-p06a-3.md`(des-p06a 2차 검토, Changes requested — I 1 · M 4; N-1~N-4 ADDRESSED, 수 · 정합 · 누계 · 맞바꿈 16 · 가정법 예외 · 주제 셋은 받음)의 R-1~R-5 를 고친다. **P6a 의 fix 라운드 3 = 상한**이다 — 이번에 Approved 가 안 나오면 컨트롤러가 요청자에게 가져간다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(커밋 없음). 커밋하지 않는다. 코드 파일(`src/` · `tests/` 공용)은 건드리지 않는다(일회 검사 스크립트 `tests/.tmp/p06/` 는 된다). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴.

## 고칠 것(컨트롤러 판정)
1. **R-1(Important) — 묶음 3 검출기의 정형 표현 거짓 양성.** to-infinitive(9-2) · comparative · superlative(7-5) 검출기가 1~8단계에서 정본이 먼저 요구하는 꼴을 잡는다. 판정: 검출기를 끄지 않고 **좁은 구 단위 예외**를 둔다(C64 (3) · C67 (1) '3.3 이 앞서 요구하는 꼴은 검출하지 않는다').
   - 예외 묶음: (가) 인사 토막 — `(Nice|Glad|Good|Happy) to (meet|see) you`, `I'm happy to see you` 꼴(3.3 인사 토막은 모든 단계, 회화 1-1 '토리와 첫 만남'). (나) 가족 호칭 — `(older|younger|elder|big|little) (brother|sister)` 는 어휘로 보고 비교급에서 뺀다(읽기 2-2 · 회화 2-2 · 말하기 2-2 · 쓰기 6-4). (다) `best friend` 는 명사구로 최상급에서 뺀다. (라) `feel better` 는 보건실(회화 5-1)의 정형 표현으로 비교급에서 뺀다.
   - **훑기**: 1~8단계 vocab 예문 · 단원 주제 · 정본 3.3 인사 토막 · 6.3 카드 전형 문장(첫 말 · 끝인사 · 힌트 꼴)을 `formsIn` 으로 전부 돌려 거짓 양성을 더 찾고 같은 방법으로 예외를 둔다. 단계표 · 단원 규격 문법 초점에 9-2 보다 앞서 드는 to 꼴(want to · have to · going to · like to · need to 등 — 어느 단계 · 단원인지 적는다)이 to-infinitive 검출기에 잡히지 않는지 확인해 표로 적는다.
   - 시험 문장(`seed/lists/*` 의 시험 문장 또는 check_lists 입력): 예외 꼴이 1~8단계에서 통과(위 네 묶음 + 훑기에서 찾은 것) · 진짜 to-부정사 · 비교급 · 최상급('I want to learn English.' · 'She is taller than me.' · 'the biggest city')은 여전히 그 단계 전에 잡힘. 예외와 까닭을 근거 문서 '관용구 거짓 양성'(747줄 근처)에 적는다.
2. **R-2(Minor) — 7~12단계 주제 이름 아홉이 단원 단어와 어긋남.** 보고의 목록대로(쓰기 10-3 · 10-4 · 8-1 · 8-3 · 회화 8-5 등 아홉) 낱말 · 학습 요소는 그대로 두고 **주제 이름만** 단원 단어에 맞게 바꾼다(6.3 주제는 생성 입력). 주제 겹침 0 유지. 바뀐 아홉을 표로.
3. **R-3(Minor) — 검출기 활용형 목록을 vocab forms 에서 다시 뽑기.** present-progressive · past-progressive · gerund · past-regular · present-perfect · passive 의 낱말 목록을 생성 규칙이 아니라 `seed/vocab.json` 의 forms 칸에서 다시 뽑는다(형용사로 뺀 bored · tired · worried 제외 목록은 그대로). panicked · panicking · lied · sewed 가 들어가고 panicing · paniced · upsetted 가 빠지는지 확인하고 시험 문장에 panic · lie · sew 꼴을 더한다. 그 뒤 check_lists · check_examples · check_unit_words 를 다시 돌린다.
4. **R-4(Minor) — 아이 눈높이 셋, 받음.** church 'The church is next to the park.' · pray 'Some people pray before meals.' 처럼 사실을 말하는 문장으로, guy 뜻은 '사람, 남자'로. 같은 꼴(특정 신앙 · 가정 형편 전제, 낮춤말 뜻)이 더 있는지 7~12단계 민감 낱말 예문을 한 번 더 훑어 고친 것을 표로.
5. **R-5(Minor) — 근거 문서 154줄 순위 수.** 순위 수를 빼고 '7단계 후보 151위 이후 여분(묶음 4 의 맞바꿈 16 과 함께)'처럼 내용만 적는다.

## 완료 판정(모두 보고 표에)
필터 0 · reference-complete 0 · 예문 1~12 RESULT 0 · 시험 문장(더한 문장 포함) RESULT 0 · 단원 단어 × allowedForms 맞대기 0 · 주제 겹침 0 · can-do 경고 0 · lint 0 · test 160 · `pnpm -s seed:validate` 종료 0 · 첫 줄 '실패 0 · 규격 파일 오류 0' · python 셋(설정 · 단계 규격 · 동음이의어) 0 · R-1 네 묶음과 훑기 결과가 1~8단계에서 거짓 양성 0 · 단계별 수 · 누계 375 · 825 · 1,275 · 1,725 그대로.

## 보고
`task-p06a-report.md`(워크트리)에 'fix 3' 절: 지적마다 ADDRESSED · 파일 · 값, R-1 예외 목록과 근거 · 훑기 표(앞선 단계 to 꼴 포함), 바뀐 주제 아홉 표, 활용형 다시 뽑은 차이(들어온 · 빠진 꼴), R-4 고친 것 표, 완료 판정 대조, 다르게 한 것. 끝나면 상태(DONE · DONE_WITH_CONCERNS · BLOCKED)와 요지 5줄을 컨트롤러에게 SendMessage 로. 그 뒤 des-p06a 가 범위 한정 재검토를 한다.
