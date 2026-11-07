# 고침 브리프: 회화 plan 묶음 12 fix 3(impl-talk-12 · Opus · high, 라운드 3/3 — 마지막, 2026-11-05 19:2x 작성)

## 맥락
- fix 2 재검토 `task-talk-12-fix2-review.md`(rev-talk-12): N-1 · N-2 여섯 자리 가운데 390 · 397 · 648/671 · 730 · 806 은 ADDRESSED, src · seed 는 묶음 12 뒤 사본과 같음. 470 · 499 는 어휘 까닭은 닫혔으나 단언이 여전히 걸린다(F-1). 컨트롤러 결정: fix 라운드 한도(3회) 안이고 시험 단언 네 줄이라 fix 3 으로 닫는다.
- F-1(Important): `tests/e2e/talk-lesson.spec.ts` 357 · 485 · 492 · 518줄이 두 문장 응답 전문을 말풍선의 toContainText 로 본다. 새 말풍선은 문장마다 span 을 따로 그리고 span 마다 보이는 글과 읽기용 전문이 붙어, Playwright 1.64.1 은 자식 글을 띄어쓰기 없이 이어('…too!Wow, me too!What…') 전문이 맞지 않는다(검토자가 coreBundle.js 의 elementText 로 확인). 357 은 묶음 11 이 쓴 줄이지만 같은 결함이라 함께 고친다.

## 할 것(`tests/e2e/talk-lesson.spec.ts` 만)
1. 네 자리(357 · 485 · 492 · 518)의 단언을 `bubble.locator("[data-tori-line]")` 에 문장 배열로 거는 toContainText 로 바꾼다(문장마다 한 줄 span 과 맞춤). 응답 전문을 한 글로 보지 않는다.
2. 같은 꼴(말풍선에 두 문장 이상 전문을 한 글로 toContainText)이 파일 안에 더 있으면 함께 고치고 보고에 줄을 적는다.
3. 관문: biome ci · tsc 0, 단위 그대로(1781). 표지 `data-tori-line` 이 새 말풍선 코드에 실제로 있는지(파일 · 줄) 보고에 적는다.

## 하지 않을 것
- src · seed · 다른 시험 파일. 커밋 · push · 개발 DB 쓰기. 시험 파일은 Edit 로만.

## 보고
`task-talk-12-fix3.md`: 자리별 바꾼 줄 · 대조한 코드 줄, 관문. 답은 요지 다섯 줄 안.
