# 묶음 2 fix 2 범위 한정 재검토 · rev-2-fix2

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`. 지난 보고 `task-rev-2-fix1-report.md` 의 N-1(M-4) · N-2 와 고침이 만든 새 어긋남만 봤다. 묶음 5 진행 중 파일 탓의 biome · tsc 붉음은 판정에서 뺐다. 시험은 다시 돌리지 않았다. 판정은 07:52 의 파일로 했다(마지막 수정 07:51:58).

## 라운드 판정: Approved (fix 라운드 2/3 · Critical 0 · Important 0)

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| N-1(M-4) 끝맺음 시험의 걸림 예가 시드 꼴에 안 걸림 | ADDRESSED | `tests/integration/talk-ai-scope.test.ts:509~512` 가 걸림 예를 "I remember my fish! Bye bye!" 로 바꿨다. 끝맺음을 돌리기 전에 시드 목록(seedTalkMadeUpPhrases)으로 그 글이 걸리고 대조군 'Bye bye!' 는 안 걸림을 먼저 단언한다. 지난 재검토 스크립트(`rev2f1-madeup-probe.ts`)에서도 이 글은 'i remember my' 로 걸렸다. 끝맺음 길(`closing.ts`)에는 끝인사 어휘 범위 검사가 따로 없어, 카드 끝인사로 바뀌는 까닭은 지어낸 경험 꼴 하나뿐이다. 그래서 이 시험은 그 길을 가른다 |
| N-2 허용 낱말 대조가 서버(사전) · 도구(꼬리 떼기)에서 갈림 | ADDRESSED(묶음 2 몫) | 사전 만들기가 core 순수 함수 `allowedLemmaOfVocab`(`situation.ts:52~58`)로 나왔다. 서버 readAllowedLemmaOf(`lesson-turn.ts:2087~2110`)가 그 함수를 부른다. 대본 도구 · 넓이 시험도 `seed/vocab.json` 행을 넣으면 같은 사전이 된다. 시험 `talk-situation.test.ts:346~` 가 이 함수로 words → word · going → go 를 보고, 허용 낱말이 아닌 행(swords)은 사전에 들지 않음을 본다. 도구 · 넓이 · 짝 시험에 잇는 일은 묶음 5 파일이라 열린 항목으로 넘긴다 |

## 2. 새로 깨뜨린 것
- 없음. fix 2 가 서버에서 바꾼 것은 readAllowedLemmaOf 가 lemmaLookup 대신 allowedLemmaOfVocab 를 부르는 것이다. 읽는 행이 이미 허용 낱말뿐이라 결과 사전은 fix 1 과 같다.
- 새 import `lemmaLookup`(`src/core/session/attempt.ts:427`)은 zod · core 모듈만 가져오고 server · db 를 가져오지 않는다. situation.ts 는 여전히 순수 모듈이다(plan 정한 것 7). `src/core/speech/*` 는 가져다 쓸 뿐 고치지 않았다(정한 것 8). 서버 범위 원형 표도 같은 함수를 이미 쓰고 있다.

## 3. 묶음 5 로 넘길 열린 항목
- 대본 도구 · 넓이 시험이 `allowedLemmaOfVocab(seed/vocab.json 행, 허용 낱말)` 을 allowedLemmaOf 로 넘겨 서버 길과 같은 판정을 내게 한다. 짝 시험에 'news' 꼴(꼬리 떼기만 통과)과 'went' 꼴(사전만 통과) 낱말을 하나씩 넣어 두 길이 같은지 본다.
