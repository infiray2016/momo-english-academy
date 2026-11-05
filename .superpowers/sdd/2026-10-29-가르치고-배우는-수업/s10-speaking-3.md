# S10 표본 비교 — 3단계 말하기 단원 1, xhigh · high(컨트롤러, 2026-10-30 03:5x)

plan 정한 것 13(C186): 말하기 한 단원(승인 수업 1 + 새로 25)을 high · xhigh 로 만들어 견주고, 같으면 high 로 간다. '같다' 기준은 `seed/prompts/README.md` 3절: 첫 통과율 차이 5%p 이하이고, 풀이 검사 걸림과 요청자 '오류'가 high 쪽에 더 많지 않으면 같다. 생성자는 seed-generator(Opus 5.5), 브리프 `seed/prompts/speaking-3.md` 3판(briefHash 5ee7f413…), 뿌리 `tests/.tmp/l3-samples/{xhigh,high}`.

| 잴 것 | S-x(xhigh) | S-h(high) | 어디서 |
|---|---|---|---|
| 칸 수 | 26(승인 1 · 새 25) | 26(승인 1 · 새 25 — 정규 20 · 보강 6) | 생성 보고 |
| 첫 검증 오류 칸 · 첫 통과율 | 4 · 84.6%(22/26) | 5(오류 6) · 80.8%(21/26) | 생성 보고 '첫 검증' |
| 첫 검증 규칙별 오류 | speaking 3 · speaking-meaning 1 | learning-elements 4 · speaking 1 · speaking-meaning 1 | 생성 보고 |
| 첫 검증 경고 | 7(unit-words-unlisted) | 7(이 파일 3 unit-words-unlisted) | 생성 보고 |
| 고침 회차 · 최종 오류 | 1 · 0 | 2 · 0(1회차 뒤 teach-differ 1 남음) | 생성 보고 |
| 최종 경고(이 파일) | 0 | 0 | 생성 보고 |
| 풀이 검사 대상 | 26칸 · 182문항 | 26칸 · 182문항 | seed:check --dry-run |
| 풀이 검사 걸림 | 0(통과 26 · 사람 확인 0) | **4 칸 · 4 문항 multiple**(assigned 5 no.13 · reinforce 7 no.13 · remedial 1 no.13 · remedial 3 no.21 — 풀이자가 답 둘 이상으로 봄) | `tests/.tmp/l3-samples/<뿌리>/checks/lessons/speaking/3/1.json` |
| 풀이 검사 비용(USD) · 토큰 | 0.1668 · 입력 54,152 · 출력 5,850 | 0.1667 | 기록 costUsd 합 |
| 걸린 시간(분) | 76(02:17:32 ~ 03:33:49) | 88(02:24:44 ~ 03:52:23) | 생성 보고 |
| 파일 크기 · 수업 하나(KB) | 320,079 · 12.3 | 319,758 · 12.3 | wc -c ÷ 26 |
| 생성자 토큰 | 작업 알림 usage 미확인 | 미확인 | — |
| 답하는 대상으로 나온 단원 단어 수 | validate --json 에 stats 없음(검증기 출력 꼴 바뀜 — 아 의 teach:metrics 로 대신 잴 것) | 같음 | — |
| 요청자 판정 | 대기(첫 묶음 표본 검토 때, 표본 쪽은 따로) | 대기 | — |

생성자가 판단으로 정한 곳(둘 다 시드 검토 항목): xhigh — 보조 인물 Ben · Meg 는 Mom · Dad 와 짝(읽기 중심 쌍 'Ben and Meg' 안 씀), 모모 등장 수업 10, 다른 영역 3단계 단원 단어 겹침은 목록 없어 미확인. high — 첫 오류 6 가운데 5 는 낱말 수를 하나씩 덜 센 것(이야기 셋 · 질문 하나 8낱말, 따라 말하기 하나 7낱말), 하나는 질문 짝 의미 검사(검증기가 'write' 를 하는 일 말로 못 읽는다고 보고 'read' 로 바꿈 — 검증기 코드는 안 열어 봄).

**판정: 같지 않다 → xhigh.** 첫 통과율 차이 3.8%p 는 기준 안이지만 풀이 검사 걸림이 high 쪽에 4(xhigh 0) 더 많다. 시간도 xhigh 가 12분 짧았다. 정한 것 13 대로 시드 본 생성(읽기 · 쓰기 3단계 단원 1, 이후 단원)은 xhigh 로 간다. 요청자 판정은 기준을 바꿀 수 있으므로 첫 묶음 표본 검토 때 high 의 multiple 문항 넷을 함께 보인다.

후속: (1) 검증기가 'write' 를 하는 일 말로 읽지 못한 것이 맞는지 — 품사 표(어휘 목록 function · pronoun + 수업 글 낱말)에 write 가 없어 핵심 낱말로 안 잡힌 것인지 타 묶음 후속(장부). (2) seed:validate --json 에 stats(answerTargetWords)가 없어 README 3절 표의 그 행은 teach:metrics 로 잰다. (3) high 표본은 비교 기록으로만 두고 적재하지 않는다.
