# 재검토 브리프: P6a 시드 규격 파일 fix 1(design-reviewer des-p06a 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 04:4x)

범위 한정 재검토다. `review-p06a.md` 의 I-1~I-5 · M-1~M-12 가 fix 1 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 값(맞바꾼 낱말 37 · 단원 주제 9 · 배정 차례 · 형태 정규식 · 금지어 정규식 · can-do 둘 · 근거 문서)에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다(일회 검사 스크립트를 돌리는 것은 된다). 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 워크트리에서.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(feature/1a-p06a-seed-reference, 커밋 없음). fix 1 이 바꾼 파일: `seed/vocab.json` · `seed/unit-specs.json` · `seed/level-specs.json` · `seed/lists/forms.json` · `seed/lists/forbidden.json` · `docs/research/2026-10-16-seed-reference-basis.md` · 일회 검사 `tests/.tmp/p06/`(새로 `check_unit_words.ts` · `check_meanings.ts`). 코드 파일 변화는 앞 라운드 컨트롤러 것 셋(`biome.json` · `src/core/seed/reference-index.ts` · `tests/unit/seed-validator-reading.test.ts`)뿐이어야 한다.
- fix 1 보고: `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06a-report.md` 의 'fix 1' 절(완료 판정 대조 열 · 지적마다 표 · 맞바꾼 낱말 표 · 다르게 한 것 넷 · 알릴 것 넷 · 남은 우려 셋). fix 브리프 `task-p06a-fix1.md`(컨트롤러 판정 — C67 (1)~(4)).
- 컨트롤러 재확인(04:4x, 워크트리): lint 0 · test 160 · seed:validate 첫 줄 '칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · … · 경고 0 · 규격 파일 오류 120' · reference-complete 밖 오류 0 · 단원 단어 × allowedForms 맞대기 RESULT 0(단원 122 · 단원 단어 3,352) · 예문 1~6 RESULT 0(183 · 137 · 139 · 175 · 170 · 161) · 시험 문장 RESULT 0 · 12절 대조 RESULT 0 · 뜻 · 예문 금지어 RESULT 0(vocab 965) · 코드 파일 변화 셋만.

## 볼 것
1. I-1: (가) time-at 낱말에서 o'clock 뺌 (나) have 의 writing 1-1(다르게 한 것 2 — '쓰기 열 미검출'을 like 와 같은 C64 (3) 꼴로 표현, C67 (1)에 맞는지) (다) 빈도부사 다섯이 5단계 기능어 · 단원 단어에서 빠짐(C67 (2)). `check_unit_words.ts` 를 직접 돌려 0 을 재현하고, fix 전 꼴 사본이 5건을 잡았다는 말이 맞는지 본다(검사 자체가 허술하지 않은지 — 활용형 · 대소문자 · 문장 안 자리).
2. I-2: 맞바꾼 37 낱말이 모두 초등 권장 목록(근거 문서 (1))에 있거나 그 파생(easy · onion)인지, 누계 1,725 · 단계별 수가 그대로인지, 뺀 32 가 7단계 후보 끝에 있는지(남은 우려 1 — 묶음 3 에서 150 을 정할 때 다른 후보를 밀어내는 위험을 메모로), 새로 쓴 예문 9 가 형태 · 금지어 · 단계 범위에 맞는지.
3. I-3: personal-info-ko — 걸릴 셋 · 안 걸릴 다섯을 재현하고 정상 뜻 풀이 · 예문 표본을 몇 개 더 넣어 거짓 양성이 없는지(`check_meanings.ts` RESULT 0 재현).
4. I-4(C67 (4)): contact-address-ko · contact-address-en — 걸릴 넷 · 안 걸릴 여덟 재현, 아이 글 꼴(I live in Seoul. · 앞으로 3칸 · 2 miles on the road 등)과 시드 예문 · 회화 카드 꼴에서 거짓 양성 없음. P9b 가 이 범주를 통째로 가리는 점(review-p09b-2)을 알고 본다.
5. I-5: time-at 좁힘('at + 수' 뒤 o'clock · 시각 · 문장 부호 · 글 끝) · third-person-s 낱말 목록에서 명사로도 흔한 꼴 제외 → 검토의 다섯 문장 '없음' 재현. 새 거짓 음성이 생겼는지(예: 'He plays soccer.' · 'She wants milk.' 는 he · she 정규식이 잡는지, 'at seven o'clock' 은 여전히 잡히는지).
6. M-1~M-12: 보고 표의 고친 곳 · 검사를 하나씩 재현한다. 특히 M-2 dont(다르게 한 것 1 — 끝을 `\s+[a-z]` 로: 'No, I don't.' 보호가 맞고 'I don't know.' · 'We do not swim.' 는 잡히는지, 'Don't run.' 은 안 잡히는지), M-4 주제 아홉(같은 (영역, 단계) 안 겹침 0 · 주제가 가리키는 낱말이 단원 단어에 있는지), M-5 old 1단계 · head 2단계 · many 기능어(1단계 회화 질문 색 · 나이 · 수에 맞는지), M-6 배정 차례(쓰기 1단계 배정 수업마다 패턴 밖 1~2 · like · name 첫 자리), M-7 can-do 둘(읽기 3 '그림 없이' 뺌 · 회화 1 문구가 3.3 · C64 (3)과 맞는지), M-9 활용형 · 뜻.
7. 다르게 한 것 3(guest · guessed 묶음 뺌, 32묶음 · 근거 문서 (5) 목록 다시 뽑음) · 4(`check_meanings.ts` 더함) 받을지. 알릴 것 1 · 2(4단계 그림 낱말 bread · letter · pilot 들어옴 · plant · toast · dentist · uniform · seat 빠짐 · head 2단계 — P6b 작업 3 영향, 컨트롤러가 장부에 올렸다) · 3 · 4(빈도부사 검출기 그대로)가 맞는지.
8. 근거 문서 (3) 단원 주제 표 4-2 · 4-5 행 되살림 — 표 30행 × 네 영역 = unit-specs 다름 0 재현. 근거 문서의 수 표 · 'fix 1 맞바꿈' 절 · (4) 'fix 1 검출기' 표 · 120 표 머리말이 파일 값과 맞는지.
9. 지난 보고 4절(판단 셋 · 약한 곳 둘) · 5절(열린 장부 판정)의 '받음(조건)'이 fix 뒤에도 서는지. 6절 '묶음 3 · 4 와 2차 검토에 넘길 메모'에 더할 것(남은 우려 1~3: 7단계 후보 경계 · board · bored · he-she · we-they 명사 주어 범위).
10. 코드 파일 변화가 셋뿐인지(`git status --short`).

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p06a-2.md`(메인 저장소): 판정(Approved · Changes requested) · 지적마다 ADDRESSED · NOT ADDRESSED 와 근거(파일 · 줄 · 재현 결과) · 새 지적(심각도 · 근거, fix 범위 안) · 다르게 한 것 1~4 판정 · 알릴 것 1~4 판정 · 묶음 3 · 4 에 넘길 메모(지난 6절에 더하는 것만). Approved 면 묶음 3(7~9단계)으로 간다. 마지막 메시지는 판정과 요지 5줄 안쪽.
