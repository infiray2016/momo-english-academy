# 재검토 브리프: P6a 시드 규격 파일 fix 3(design-reviewer des-p06a 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 18:3x) — fix 라운드 3(상한) 뒤

범위 한정 재검토다. `review-p06a-3.md` 의 R-1(Important) · R-2~R-5(Minor)가 fix 3 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 3 이 바꾼 값(검출기 예외 · 주제 이름 아홉 · 활용형 목록 · 뜻 · 예문 아홉 · 근거 문서)에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다(일회 검사 스크립트 실행은 된다). 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. **이번이 P6a fix 라운드 3(상한) 뒤의 재검토다** — Approved 면 P6a 커밋 요청, Important 가 남으면 컨트롤러가 요청자에게 가져간다. Minor 만이면 Approved 로 적고 Minor 는 고치는 법까지(컨트롤러가 직접 처리).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(feature/1a-p06a-seed-reference, 커밋 없음). fix 3 이 바꾼 것: `seed/lists/forms.json`(to-infinitive 41줄 · comparative 32줄 · superlative 예외, 활용형 목록 12 · 21 · 28 · 34 · 40 · 42 · 46줄) · `seed/unit-specs.json`(topic 아홉) · `seed/vocab.json`(뜻 · 예문 아홉 — church · pray · guy · fellow · afford · fund · income · adopt · parent) · 시험 문장(407 → 450) · `tests/.tmp/p06/build_bundle.py`(활용형을 vocab forms 에서) · `tests/.tmp/p06/scan_phrases.ts`(훑기) · 근거 문서 `docs/research/2026-10-16-seed-reference-basis.md`(관용구 거짓 양성 · 9-2 앞 to 꼴 표 · 주제 표 · 154줄).
- 보고: `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06a-report.md` 의 'fix 3' 절(완료 판정 대조 열여섯 · 지적마다 · R-1 예외 목록과 근거 · 바뀐 주제 아홉 · 활용형 차이 · R-4 고친 것 · 다르게 한 것 · 알릴 것 · 남은 우려 · 결정이 필요한 것). 브리프 `task-p06a-fix3.md`(컨트롤러 판정: 검출기 끄지 않고 좁은 구 단위 예외 + 1~8단계 훑기 + 9-2 앞 to 꼴 확인 + 양쪽 시험 문장, R-2 이름만, R-3 vocab forms, R-4 받음 + 재훑기, R-5 순위 수 빼기).
- 컨트롤러 재확인(18:3x, 워크트리): seed:validate 종료 0 · errors 0 · warnings 0 · 예문 1~12 RESULT 0(1,920) · 시험 문장 RESULT 0 · 맞대기 RESULT 0(242 · 6,952) · 뜻 RESULT 0 · lint 0 · test 160(배경 실행 로그 `p06a-fix3-ci.log`, 숫자가 다르면 보고에 적는다).

## 볼 것
1. **R-1**: 예외가 '좁은 구 단위'인지 — nice · glad · good · happy · pleased · sorry + to meet · see · hear, time to, older · younger + brother · sister, best friend, feel · get better, 그리고 훑기에서 더한 것(Have a nice day · Have fun · Let's learn · talk · keep · some new words · Would you like some · Can you say it again · want to talk more · keep + -ing · sorry to hear). 각 예외가 (가) 정본 3.3 · 6.3 이 그 단계 앞에서 요구하는 꼴인지(근거 표의 단계 · 단원이 맞는지), (나) 진짜 to-부정사 · 비교급 · 최상급을 새어 나가게 하지 않는지(scan_phrases 의 '진짜 형태 15 잡힘'을 재현하고, 네 묶음 밖의 흔한 진짜 꼴 — 'I want to learn English.' · 'She is taller than me.' · 'the biggest city' · 'It is important to study.' — 를 직접 넣어 본다). 'happy to + 동사' 를 다른 갈래로 잡는다는 말이 맞는지. 9-2 앞 to 꼴 표(want to 5-2 · 쓰기 4-3, would like to 5-2, going to 7-3, have to 8-4, used to 12-3)가 단계표 · 단원 규격과 맞는지.
2. **R-2**: 바뀐 주제 아홉이 단원 단어와 맞고(쓰기 8-3 '가장 좋은 선택' 포함) 겹침 0 · 아이 눈높이인지.
3. **R-3**: 활용형 목록이 vocab forms 에서 뽑혔는지(panicked · panicking · lied · sewed 들고 panicing · paniced · upsetted 빠짐), 형용사 제외 목록(bored · tired · worried)이 그대로인지, 더한 시험 문장 8 이 양쪽을 보는지.
4. **R-4**: 고친 아홉(church · pray · guy · fellow · afford · fund · income · adopt · parent)이 사실 서술 · 중립 뜻이고 단계 · 형태 · 금지어에 맞는지. 같은 꼴이 더 남았는지 표본 한 번(7~12단계 민감 낱말).
5. **R-5**: 154줄 문장.
6. fix 3 이 바꾼 값에서 새로 생긴 문제, '다르게 한 것' · '알릴 것' · '남은 우려' · '결정이 필요한 것' 판정(컨트롤러가 정할 것이 있으면 권하는 답과 함께). 열린 장부 P6a 몫(opus-4-8 'none' 은 P9 · 한국어 뜻 단계 규칙은 P4 — 그대로 열림) 확인.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p06a-4.md`(메인 저장소): 판정(Approved · Changes requested) · R-1~R-5 ADDRESSED · NOT ADDRESSED 와 근거(파일 · 줄 · 값 · 재현) · 새 지적(심각도 · 근거, fix 3 범위 안; Minor 는 고치는 법까지) · 다르게 한 것 판정 · 결정이 필요한 것에 대한 권함. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
