# 회화 plan 묶음 12 fix 3 보고(라운드 3/3)

- 브리프: `task-talk-12-fix3-brief.md`, 재검토: `task-talk-12-fix2-review.md` 2절 F-1.
- 고친 파일은 `tests/e2e/talk-lesson.spec.ts` 하나다. src · seed 는 손대지 않았다. 묶음 12 뒤 사본 `scratchpad/p13d-after-12/` 과 `diff -rq` 로 대조했고, 차이가 없었다.
- 상태는 DONE_WITH_CONCERNS 다. e2e 는 이 Mac 에서 돌지 않아 정적으로만 맞췄다.

## 1. 표지 확인

`data-tori-line` 은 새 말풍선 코드에 있다.
- 흘려 받는 말풍선: `src/components/conversation/tori.tsx:650`. 문장마다 블록 span 하나를 그리고, 그 안에 TypedText 가 있다.
- 정리 한 장 꼴: `tori.tsx:288`.
- 말풍선에 그릴 문장은 `lessonShownEnglishOf`(`tori.tsx:374~380`)가 서버가 흘린 줄 `{ t: "s" }` 하나마다 하나씩 낸다.

## 2. 자리별 처리

도우미 둘을 더했다(`:116`, `:118`).
- `toriLines(page)`: `bubble(page).locator("[data-tori-line]")`.
- `sentencesOf(text)`: 마침표 · 느낌표 · 물음표 뒤 띄어쓰기로 문장을 나눈다.

| 옛 줄 | 지금 줄 | 바꾼 꼴 |
|---|---|---|
| 357 'Okay! Let's talk more.'(묶음 11) | `:364` | `toriLines(...).toContainText(sentencesOf(reply))` 배열꼴로, 줄 요소를 차례로 견준다 |
| 485 'Wow, me too! What do you like?'(흘려 받은 뒤) | `:492` | 같음 |
| 492(다시 연 뒤) | `:500~501` | 문장마다 `bubble(...).toContainText(sentence)` 로 본다. 브리프의 배열꼴과 다르다(3절) |
| 518 'Oh, nice! Do you like it?' | `:527` | 배열꼴 |

같은 꼴이 더 있는지 파일 전체를 훑었다. 말풍선 `toContainText` 의 나머지 자리는 모두 한 문장이거나 부정 단언이라 걸리지 않는다.
- 한 문장: `:147` · `:163` · `:195` · `:321` · `:621` · `:634` · `:734` · `:880`. 이 가운데 카드 글 셋을 빌더로 찍어 한 문장임을 확인했다(required[0].en 'What do you see?', more[0].en 'What is this?', safetyFarewell.en "Let's talk about something new!").
- 부정 단언: `:315` · `:404`.

## 3. 브리프와 다르게 한 것

- 다시 연 뒤 자리(옛 492)는 배열꼴을 쓰지 않았다.
- 까닭: 다시 열면 말풍선은 저장한 선생님 행 글로 그려지고, AI 글 전체가 줄 하나다. 행 글은 `index.ts:899~906` teacherLinesOf 에서 aiPart 한 줄이 되고, `talk-frame.tsx:357~359` lessonBubbleOf 에서 `{ t: "s", en }` 하나가 된다.
- 그래서 data-tori-line 이 하나뿐이라, 두 문장 배열꼴은 맞을 요소가 모자라 실패한다.
- 문장마다 말풍선 전체에 견주면 줄이 하나이든 문장마다 나뉘든 맞는다. 줄 수에 기대지 않는 이 꼴을 택했다.

## 4. 관문

| 관문 | 결과 |
|---|---|
| biome ci | 575 파일, 0 |
| tsc --noEmit | 빈 출력 |
| 단위 `pnpm test` | 1781 통과 · 6 todo(전과 같음) |

출력은 스크래치패드 `fix3-biome.txt` · `fix3-tsc.txt` · `fix3-unit.txt` 에 있다.

## 5. 우려

- 흘려 받는 자리 세 곳은 서버가 문장마다 `{ t: "s" }` 줄을 보낸다는 전제에 기댄다(`lesson-turn.ts` 문장 문 → onSentence). 실제 그려진 줄 차례는 CI 첫 실행에서 확인된다.
