# 보고: 묶음 타 fix 1(구현자 · Opus · high, 2026-10-30)
상태 DONE. 지적 다섯과 C84 결함을 고쳤고 관문 여섯이 모두 종료 0 이다. 원본 시드 셋은 그대로 통과한다. 커밋하지 않았고 세션 코어 · 음성 · e2e 는 손대지 않았다.
## 지적별
| 지적 | 상태 · 자리 |
|---|---|
| I1 다섯째 갈래 | ADDRESSED: checkMeaning 끝(meaning.ts '(마) 덧붙인 정보'). 답의 핵심 낱말이 질문 · 바른 답 어디에도 없고 not 범위 밖이면 wrong_info. 검토자 세 문장이 걸리고 원본 52개는 0건(시험 '다섯째 갈래') |
| I2 품사 표 계약 | ADDRESSED: `meaningWordsFor(lessonTexts, vocab, homophones?)` = 수업 글 낱말 행 + function · pronoun 행 전부. 검토자 예문 둘을 포함한 여덟 답에서 좁힌 표와 전체 어휘의 판정이 같다(시험 '품사 표 계약') |
| M1 말하기 같이 해 보기 풀이 | ADDRESSED: 고르기 꼴(choices · answerNo)인 말하기 같이 해 보기를 itemsOf 뒤에 붙이고 풀이 대상에 넣었다. 보기는 choice 꼴 { listen: 이야기 + 질문, prompt: 틀(filled), options: choices }(solve-check speakingTogetherView). 정답 번호는 요청에 없다 |
| M2 시드 셈 단언 | ADDRESSED: 셈한 파일에 '3/1.json'이 든다고 단언한다 |
| M3 spec:trace | 이미 닫힘(컨트롤러가 사본을 맞춤) |
| C84 조립 카드 대문자 | ADDRESSED: check-lesson capitalAllowed. 'I' 와 수업 인물 이름(어휘 목록에 없는 낱말 — 어휘 목록에는 고유 명사가 없다 — 이 첫 허용 정답에 같은 꼴로 나올 때, 첫 글자만 대문자)만 받고 그 밖의 대문자 카드는 막는다. 시험 둘(받음 · 막음). 기존 쓰기 시험의 'I 카드 거부' 단언은 C84 와 어긋나 'The' 카드 거부로 바꿨다 |
## 바뀐 파일
`src/core/speaking/meaning.ts` · `src/core/seed/check-lesson.ts` · `src/core/seed/validate.ts`(itemsOf · solveTargets) · `src/core/seed/solve-check.ts` · `tests/unit/speaking-meaning.test.ts` · `tests/unit/seed-validator-teach.test.ts`(L3 가짜 허용 답 'here' → 'They do have a …' — 덧붙인 정보 갈래에 걸려서) · `tests/unit/seed-validator-writing.test.ts`
## 관문(워크트리 서브셸 · Node 24)
| 명령 | 종료 | 결과 |
|---|---|---|
| pnpm lint | 0 | 478 파일 |
| pnpm exec tsc --noEmit | 0 | 오류 0 |
| pnpm test | 0 | 107 파일 · 1209 통과 · 6 todo |
| pnpm check:deps | 0 | 위반 없음 |
| pnpm check:ids(CI 꼴) | 0 | 위반 0 |
| pnpm seed:validate --areas reading,writing,speaking | 0 | 실패 0 · 경고 12(필수 단계 단원 목표, 보고만) |
## 우려 2
1. C84 의 이름 판정은 '어휘 목록에 없는 대문자 낱말'에 기댄다. 어휘 목록에 같은 철자의 보통 낱말이 있는 이름(예 Rose)은 막힌다. 인물 이름 목록이 생기면 그 목록으로 바꾼다.
2. 다섯째 갈래는 질문 · 바른 답에 없는 내용 낱말을 모두 틀린 정보로 본다. 'They drink milk with Mom.' 같은 무해한 덧붙임도 맞음이 아니다(Mom 이 질문에 없으면). 시드 허용 답과 아이 답 모두 같은 규칙이다.
