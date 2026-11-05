# 구현 보고: 가르치고 배우는 수업 묶음 바(근거 값 함수) — 2026-10-30 03:2x, 구현자 Opus · high — DONE_WITH_CONCERNS

워크트리 p13d, 커밋 안 함. 새 파일 둘만 만들었다: `src/core/evidence/teach.ts`(teachEvidenceOf :588, 값 꼴 :39~150, 활동별 사실 factsOf :377 · togetherFacts :553) · `tests/unit/teach-evidence.test.ts`(23건).

## 열 유무와 저장 길
`src/db/schema/learning.ts` 의 attempts 에 evidence 열이 없다(grep 0). 그래서 `src/server/session/index.ts` · `src/server/speaking/index.ts` 는 손대지 않았다 — **열 없음, 평가 plan 채움 함수 몫**이다. 두 파일의 git 변경 표시는 다른 손의 것이다.

## 값 이름 표(plan 제안 → 실제)
| plan 제안 | 실제 | 다른 곳 · 까닭 |
|---|---|---|
| teachEvidenceOf(attempt, lesson) | teachEvidenceOf({ lessonKey, lesson, activity, input, ctx }) | 문항 자리(activity.index) · 다시 채점 맥락 · ctx.item 머리(시드 행 id)가 필요하다 |
| task · goals: string[] | 그대로. 따라 말하기 repeat · 듣기 listening · 질문 question, 읽기 · 쓰기는 시드 type | 짝은 짝을 둔 문항의 task · goals |
| assist: string[](retry_after_answer 를 같은 목록에) | assist = 첫 시도 도움(없으면 ["none"]), '왜' 뒤 다시는 retry { assist, accuracy } | 같은 칸 안에서 독립 시도와 도움받은 시도를 가르려고 나눴다. model_heard 는 첫 시도 앞 도움으로도 쓰일 수 있어 한 목록이면 모호하다 |
| exposure | 말하기 질문 답(같이 해 보기 질문 포함)만. 질문 글에 있으면 question_word, 없으면 none(이야기 낱말 포함), 견줌은 metWordsIn | 고르기 · 쓰기 · 따라 말하기는 {} |
| accuracy · result | accuracy correct · partial · wrong · no_answer. result { correct?, rate?, judge?, ai?, bundle?, communicative?, expressionDone? } | 쓰기 대문자 · 마침표만 틀림은 partial(writingWhyOf). 의사소통 정답은 judge 그대로라 correct + communicative |
| validity | "valid" · "practice" · { technical } | technical 은 speak_fail(techError), recognition(recognition · stalled), no_mic, nospeech(silent), ai_rest, ai_fail(판정 칸 없는 AI 질문) |
| ctx · source · purpose | ctx { item: `<key>:<종류>.<i>`(짝 `.spare`), example: 지문 · `.storyEn` · `.script` · 짝 글 }, source { assist, accuracy, validity }, purpose 없음 | 읽기 assist 출처는 안 썼을 때도 device |
| (표에 없음) | words: 노린 단원 단어 원형(문항 정답에 든 단원 단어) | 정본 04 의 words 값. 근거 칸만으로 단어 근거를 셀 수 있게 넣었다 |

**정본과 다른 곳 하나.** 정본 04 · 평가 spec [승인 A9]는 acceptedMeaning 답의 정확도를 '부분'으로 적는다고 쓴다. 브리프와 plan 정한 것 9는 '맞음 + communicative, 부분은 저장하지 않음'이라 그쪽을 따랐다. A9 를 확정하면 평가 plan 이 이 한 줄을 맞춰야 한다.

## 시험(`pnpm vitest run tests/unit/teach-evidence.test.ts` 23 통과)
AC-22e 다섯(같이 해 보기 practice · 말하기 같이 해 보기 · 읽기 '왜' 뒤 · 쓰기 · 듣기 · 질문 · 따라 말하기의 다시 · 짝 새 칸), AC-22g 셋(오답 → 다시 정답 → 짝 정답 · 두 목표 목록 · 말하기 목표 셋), AC-22h 둘, AC-22j 셋, AC-22k 셋(수준 값 없음 · 짝 판정 · 원문 없음), 기술 오류 셋, 정확도 · 근거 칸 없는 자리 넷. 수준 셈(22g 기회 1 · 2 · 0, 22h 독립 2, 22j 최대 1)은 평가 plan 의 근거 상태 함수와 같이 돈다.

## 관문(p13d, 03:2x)
| 명령 | 결과 |
|---|---|
| pnpm lint | 종료 0, 519 파일 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 종료 0, 118 파일 · 1391 통과 · 6 todo |
| pnpm check:deps | 종료 0, 위반 없음 |
| pnpm check:ids | 종료 0, design-number 47(새 파일 0) · code-setting-unknown 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0 · missing-test 16(옛 P12 몫) |

## 요청하는 변경
1. 평가 plan: 설정 키 evidence.match_cut(따라 말하기 · 1~2 질문 정확도 경계 [부분, 정답])을 seed/settings.json 에 넣는다. 지금은 부르는 쪽이 ctx.matchCut 으로 넘기고, 시험은 임시 값 [0.6, 0.9]를 쓴다.
2. 평가 plan: lessonKey 를 무엇으로 둘지(lessons 행 id 또는 시드 경로 키) 정하고, 근거 꼴(Zod)을 정할 때 위 이름 표를 받거나 고친다.

## 우려(4)
1. 같이 해 보기 문항에는 goal 칸이 없어 goals 를 빈 목록으로 둔다. 연습이라 기회는 아니다.
2. retry 는 '왜' 뒤 첫 시도 하나만 본다. 읽기 · 쓰기 · 듣기는 tries[1], 따라 말하기는 둘째 인식 글, 질문은 echo 다. 짝에 다시 시도가 있어도 그대로 적는다.
3. 노출은 말하기 질문만 판정한다. 고르기 문항의 choice 노출과 따라 말하기의 정답 노출은 평가 spec 표의 회화 몫으로 읽어 비웠다.
4. 1~2단계 질문(앱 판정)의 정확도 갈래는 지금 teach 수업이 없어 시드로 시험하지 못했다.
