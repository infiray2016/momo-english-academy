# 보고: plan 묶음 타 — 검증기 보탬 · 의미 검사 · 풀이 대상(구현자 · Opus · high, 2026-10-30)
상태 DONE_WITH_CONCERNS. 원본 정규 시드 셋은 그대로 통과한다(seed:validate 종료 0 · 실패 0). 커밋하지 않았고 세션 · 화면 · 음성 · 시드 JSON · specs 는 손대지 않았다.
## plan 타 표 (1)~(8)
| 항목 | 상태 · 규칙 이름 |
|---|---|
| (1) 같이 해 보기 조립 빈칸 수 = 남은 카드 · 빈칸마다 올바른 카드 | 이미 있음(fix 1, teach-layout) |
| (2) 이름표 꼴 | 이미 있음(fix 1, ask-role) |
| (3) 예 하나 · 한 문장 답 | 이미 있음(fix 1 speaking-question, 한 문장은 지금 단계 규격 answerSentences 검사 speaking) |
| (4) closeKoPracticed 단정 꼴 | 이미 있음(fix 1, recap-line) |
| (5) 유형 경계 | 이미 있음(fix 1, teach-type · 짝은 checkSpareShape) |
| (6) 짝 유형 · 목표 · 본보기와 다름 | 이미 있음(fix 1 spare · goal, fix 3 teach-differ 문장 단위) |
| (7) 짝 · 같이 해 보기 정답 검사 | 새로 넣음(checkBlankAnswers, 규칙 answer): 빈칸 하나인 읽기 짝 · 같이 해 보기 · 듣기 짝은 정답을 넣은 글이 그 글(textEn · 대본)의 문장이고, 말하기 같이 해 보기는 고른 말을 틀에 넣은 글이 바른 답이다. 보기 번호 범위 · 그림 · 카드는 fix 1 이 이미 본다 |
| (8) 말하기 질문 의미 검사 | 새로 넣음(checkSpeakingMeaning, 규칙 speaking-meaning): 3단계 단원 1~4 의 Do 질문(혼자 · 짝 · 같이 해 보기)에서 바른 답 · accepted · acceptedMeaning 이 의미 검사 ok, 아니요 질문은 틀린 정보 낱말이 있다 |
## 의미 검사 순수 함수 `src/core/speaking/meaning.ts`
- `checkMeaning({ question, modelAnswer, answer, words, homophones }): "ok" | "direction" | "key" | "negated" | "wrong_info"`(plan 이름 표 judge.meaning). `words` 는 vocab 행과 같은 꼴 `{ word, pos, forms }[]`(plan 정한 것 7, 세션 자료 표와 검증기 vocab 이 같은 꼴), `homophones` 는 6.2 일치율의 묶음이다.
- `meaningFrame(...)` 은 방향 · 바른 답 핵심 낱말 · 바로잡은 정보 · 틀린 정보를 낸다. 정규화는 match-rate 의 normalizeForMatch 그대로, 기본형과 forms 는 같은 낱말, 핵심 낱말은 품사에 function · pronoun 이 없는 낱말(사전에 없는 이름도 핵심)이다.
- 예 질문은 do 로 받거나 동사를 두고 무엇을 it · them 으로 받아도 핵심 정보를 채운다. not 범위는 not 뒤에서 and · but · 대명사 앞까지다.
## 풀이 대상(solve-check · validate itemsOf)
- 가르치는 수업의 정답이 있는 같이 해 보기(읽기 · 쓰기)와 짝(읽기 문항 · 쓰기 문항 · 듣기)을 지금 문항 번호 뒤에 붙였다(지금 칸의 번호는 그대로). 풀이 요청은 칸마다 하나라 한 수업의 짝은 한 호출에 든다. 말하기 질문 · 질문 짝 · 같이 해 보기(질문)는 지금처럼 대상이 아니다.
- 읽기 짝 · 같이 해 보기 보기에 제 글 `passage`(textEn)를 싣고, 같이 해 보기 보기 칸 choices 를 options 로 낸다. 지시문에 'passage 가 있으면 그 문항만 보는 글' 한 줄을 더했다. 실호출은 하지 않았다.
## 시험(TDD — 시험을 먼저 돌려 실패를 본 뒤 구현, meaning.ts 본문은 시험보다 먼저 썼다)
- `tests/unit/speaking-meaning.test.ts` 4: 정보 뽑기, 증명 절 부정 예문(일치율 문턱을 넘는 글 포함) · 긍정 예문, 정규 시드 셋 말하기 바른 답 · 허용 답 52개 전부 ok(시드 파일을 읽음).
- `tests/unit/seed-validator-teach.test.ts` 3(묶음 타 절): (7) 정답 검사 셋 · (8) 의미 검사 · 틀린 정보 없음 · 풀이 대상 번호 · 한 요청 · passage · seedAnswerOf. 풀이 대상 시험은 가르치는 수업 가짜 조각이 이 파일에 있어 solve-check.test.ts 대신 여기에 두었다.
- 시험 이름은 정본 15절 번호(AC-22k · AC-22l)로 시작한다.
## 관문(워크트리 서브셸 · Node 24)
| 명령 | 종료 | 결과 |
|---|---|---|
| pnpm lint | 1 | 다른 구현자 몫 넷(src/core/session/attempt.ts · spares.ts, tests/unit/session-attempt · session-spares)의 포맷. 내가 바꾼 25 파일은 biome check 0 |
| pnpm exec tsc --noEmit | 0 | 오류 0 |
| pnpm test | 0 | 106 파일 · 1190 통과 · 6 todo |
| pnpm check:deps | 0 | 위반 없음 |
| pnpm check:ids(CI 꼴) | 0 | 위반 0 |
| pnpm seed:validate --areas reading,writing,speaking | 0 | 실패 0 · 경고 12(필수 단계 단원 목표, 보고만) |
| pnpm spec:trace --fail-on unknown-ac | 1 | 워크트리 specs/11 에 C184 번호(AC-22a~o · 23 …)가 아직 없어, 내 시험 7개(AC-22k · 22l)와 다른 구현자 시험이 unknown-ac 다. 본 저장소 정본 15절에는 둘 다 있다 |
## 우려 4
1. spec:trace 는 워크트리 specs/11 을 C184 대로 맞춰야 0 이 된다(허용 범위 밖).
2. 의미 검사는 Do 질문 꼴에만 건다(설계 8 끝 문장). 다른 질문 꼴은 그 묶음 표본에서 정한다.
3. 풀이 지시문이 한 줄 바뀌었다. 기록은 내용 해시로 매기므로 지금 기록이 무효가 되지는 않지만, 다시 풀지는 '정할 것 카'의 결정이 필요하다. 짝 · 같이 해 보기를 대상에 넣어 seed:check 호출 비용이 는다.
4. 말하기 같이 해 보기(질문)는 앱 판정이라 풀이 대상이 아니다. 그 정답은 (7) · (8) 검사로만 본다.
