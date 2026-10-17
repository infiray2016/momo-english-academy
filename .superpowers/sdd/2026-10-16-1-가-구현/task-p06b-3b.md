# 브리프: P6b 작업 3 보충 — 그림 색과 어긋나는 vocab 예문 18 고치기(curriculum-designer cd-p06b 이어 보기 · Opus · high)

작업 3 보고 '결정이 필요한 것' 1 의 컨트롤러 판정: **vocab 예문을 그림에 맞춘다**(P8 수업 시드에는 따로 '그림이 붙는 문장은 그림의 색 · 모습과 맞춘다' 규칙을 둔다 — 장부). 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`, 커밋하지 않는다, 코드 파일은 건드리지 않는다.

## 할 것
1. 18 낱말(bike · bird · bus · chair · door · duck · fan · flower · grape · hat · kite · octopus · rabbit · shell · shirt · sock · wing · dress)의 `seed/vocab.json` 예문에서 그림과 어긋나는 색을 **빼거나 그림 색에 맞춘다**(예: 'The bird is blue.' → 'The bird is red.' 또는 'I see a bird.'). 단계 어휘 범위 · 형태 검출기 · 금지어 · 단원 단어 규칙을 지킨다(색 낱말을 넣을 때는 그 단계 vocab 에 있는 색만). 뜻(ko) · forms 는 그대로.
2. 검사: P6a 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3/tests/.tmp/p06/check_examples.ts` · `check_lists.ts` · `check_unit_words.ts` 를 p06b 의 `tests/.tmp/p06b/` 로 복사해(읽기 전용 출처) 1~2단계 예문 RESULT 0 · 시험 문장 RESULT 0 · 맞대기 0 을 다시 돌린다. `pnpm seed:validate` 종료 0 · `pnpm test` 167.
3. 같은 눈으로 207 그림 낱말 전부의 예문을 한 번 훑어 그림과 어긋나는 모습(수 · 크기 · 상황)이 더 있으면 같이 고치고 표로 적는다.
4. 보고 `task-p06b-report.md` '작업 3' 절 끝에 '보충 — 예문 18' 소절(낱말 · 전 · 후 · 까닭 표, 검사 결과). 끝나면 요지 3줄 SendMessage.

## 다른 판정(참고, 작업 4 · 5 몫)
hot · cold 는 뺀 채로. doctor 🧑‍⚕️ · nurse 그리기 받음. student · white · glasses 는 그린다(학사모 → 졸업, 연회색, 선글라스 오해). tired · family · strong · bank · piano · boy · girl · man · woman 은 작업 5 화면 검토에서 판정. head · hair · face 가리키기 틀은 작업 4 에서 시도, 안 되면 head 뺌.
