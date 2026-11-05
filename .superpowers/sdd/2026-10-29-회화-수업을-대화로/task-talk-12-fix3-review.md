# 확인 보고: 회화 plan 묶음 12 fix 3(F-1)(code-reviewer · Opus · xhigh, 2026-11-05 19:4x)

판정: **F-1 ADDRESSED. 회화 plan 묶음 12 Approved.** Critical 0 · Important 0 · Minor 0. 묶음 12 의 지난 지적(I-1 · I-2 · M-1 · M-2 · N-1 · N-2 · F-1)이 모두 닫혔다.

본 것: fix 3 보고 `task-talk-12-fix3.md`, 지금 `tests/e2e/talk-lesson.spec.ts`(fix 3 뒤 바뀐 유일한 파일, 수정 시각 19:26)의 도우미와 네 자리, 다시 연 뒤 말풍선을 그리는 코드. src · seed 는 묶음 12 뒤 사본과 `diff -rq` 차이 없음을 확인했다. 관문 biome 575 · tsc 빈 출력 · 단위 1781 통과 6 todo 는 보고와 같다. e2e 는 돌리지 않았다.

## F-1 네 자리

| 옛 줄 → 지금 줄 | 판정 | 근거 |
|---|---|---|
| 357 → `:364` 'Okay! Let's talk more.' | ADDRESSED | `toriLines(...).toContainText(sentencesOf(reply))`. 흘려 받는 말풍선은 서버 `s` 줄 하나마다 `data-tori-line` 하나다(`tori.tsx:648~656`, `lessonShownEnglishOf :374~380`). 배열꼴은 줄 요소 가운데 차례가 맞는 일부가 각 문장을 담으면 지나므로, 붙인 카드 줄 · 읽기용 전문 겹침이 있어도 맞는다 |
| 485 → `:492` 'Wow, me too! What do you like?' | ADDRESSED | 같은 꼴. 1~3단계 질문 문장은 응답 끝에 따로 된 `s` 줄로 나오므로 차례도 맞다 |
| 492 → `:500~501`(다시 연 뒤) | ADDRESSED · 브리프와 다른 꼴 받아들임 | 다시 열면 저장 글의 AI 몫이 줄 하나다: `index.ts:899~906` teacherLinesOf 가 aiPart 하나를, `talk-frame.tsx:357~359` lessonBubbleOf 가 `{ t: "s", en }` 하나를 낸다. 그래서 두 문장 배열꼴은 요소가 모자라 실패한다. 문장마다 `bubble.toContainText(sentence)` 는 Playwright 가 이은 글('…What do you like?Wow, me too! What…' 꼴)에 문장 하나씩은 늘 들어 있어 줄이 하나이든 여럿이든 맞는다 |
| 518 → `:527` 'Oh, nice! Do you like it?' | ADDRESSED | 배열꼴. 맞장구 줄은 읽기만 하고 기록에 넣지 않는다. 설령 줄로 그려져도 배열꼴은 일부 차례 맞춤이라 영향이 없다 |

`sentencesOf`(`:118`)는 마침표 · 느낌표 · 물음표 뒤 띄어쓰기로 나눈다. 세 응답 모두 두 문장으로 나뉘고, "Let's" 의 따옴표는 나누지 않는다. 말풍선 전문을 한 번에 보는 `toContainText(reply)` 는 파일에 남지 않았다(grep 0). 나머지 말풍선 단언은 한 문장이거나 부정 단언이다(지난 보고 3절과 같음).

새로 깨뜨린 것: 없다.

## 넘길 것(묶음 14 · CI 첫 실행)

- `:426` AC-15g(첫 막힘 카드 자리 차례의 설명 칸)는 판정 보류 그대로다.
- 옮기거나 고친 e2e · 통합은 모두 정적 대조뿐이다. 흘려 받는 줄 차례, kind answer 소리 줄 표지, 선택지 ①② 그리기는 CI 첫 실행에서 확인된다(fix 2 · fix 3 보고 우려).
- 회화 plan 증명 표에 AC-8f · AC-8c(끝맺음) · AC-16b · AC-16c 행을 더하는 일은 컨트롤러 몫이다.
