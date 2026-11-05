# 구현 보고: 회화 plan 묶음 8 fix 2(구현자 impl-talk-8 · Opus · high, 2026-11-05, fix 라운드 2/3)

상태: DONE. 재검토 보고 `task-talk-8-fix1-review.md` 의 N-1 을 고쳤고, N-2 는 지시대로 코드를 바꾸지 않고 뜻만 적었다. 워크트리 `.claude/worktrees/p13d`, 커밋 · push 없음, 개발 DB 에 쓰지 않았다.

## N-1(Important) 반응 물음 뒤 막힌 질문을 되풀이한 턴에 받침 줄이 붙지 않음

- 고친 것: `src/server/conversation/lesson-turn.ts` 994줄 부근의 `if (why === "same_question" && keptQuestion) why = null;` 을 지웠다. 이제 같은 질문으로 지우면 늘 카드 자리다(02-2 200줄 · AC-15r). 그 차례 질문은 마지막 물음표 문장이고, 앞서 보낸 물음표 문장은 반응으로 본다. 같은 질문으로 지운 뒤의 물음표 문장을 지우는 규칙(fix 1 M-1 첫 몫)은 그대로다. 그 자리에 까닭과 흘려 보내기의 한계를 주석으로 남겼다.
- 시험(`tests/unit/talk-lesson-turn.test.ts`, 먼저 고쳐 두 건 실패를 본 뒤 통과 — 스크래치패드 `f2-red.txt`):
  - M-1 시험의 둘째 단언('before')을 바꿨다. 'What color do you like?' · 'Do you like math?'(상한)는 이제 카드 자리(same_question)이고 text 는 'What color do you like?\nWhich class is hard?' 이다. 제목도 그 뜻으로 고쳤다.
  - 새 시험 'AC-15r 4단계부터 반응 물음('Oh, is it hard?') 뒤에 막힌 질문을 되풀이해도 지우고 받침 줄(카드 쉬운 질문)이 붙는다'. 받침 둘째 자리에서 text 'Oh, is it hard?\nEasy first 1?' 이고 move 는 card_slot · same_question · stage 2 · easy_question · required 1 이다.
- 남는 한계: AI 가 정말 질문 둘을 쓰고 둘째가 되풀이인 드문 턴에서는 앞 질문이 이미 흘러, 카드 질문까지 질문이 둘 보인다. 4단계부터는 문장이 끝날 때 바로 보내므로 흘려 보내기로는 막을 수 없다. 고정부가 한 차례 질문 하나를 지시한다(talk-lesson.ts 고정부).

## N-2(Minor) 흘린 겹침 표시의 뜻 — 코드 그대로

- ai_calls 를 '검증 실패'로 남기는 '겹침' 표시(`server/ai/talk.ts` lessonSoundFixedOf 의 overlap)는 'AI 가 고정부를 어기고 따라 할 말 · 선택지의 답을 tori_en 에 쓴 턴'이라는 뜻이다. 화면에 실제로 답 글이 보인 턴(T2 가 깨진 턴)이라는 뜻이 아니다. 서버 턴 길이 잡아 두었다가 지운 문장과 카드 자리로 바뀐 턴의 문장도 센다. 묶음 13 talk:observe 브리프에 이 뜻으로 옮긴다(컨트롤러). T2 가 깨진 턴을 따로 세려면, 서버 턴 길의 보낸 문장(LessonSentence state sent)과 최종 소리 줄로 따로 남겨야 한다. move 칸이 필요해 장부 몫이다.

## 관문(이 fix 의 파일 기준, 2026-11-05 후반, 출력은 스크래치패드 `f2-*.txt`)

| 명령 | 결과 |
|---|---|
| 시험 셋(talk-lesson-turn · talk-lesson-stream · seed-load-goals) | 39 통과 |
| `pnpm biome ci`(이 묶음의 src · scripts · 시험) | 0 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm check:deps` | 0 |

전체 관문(biome ci 전체 · vitest unit 전체)은 묶음 11 뒤 컨트롤러가 다시 돌린다.

## 설계와 다르게 한 것

없다.
