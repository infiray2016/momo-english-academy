# 브리프: 첫 프리뷰 화면 결함 셋(구현자 · Opus · high, 2026-11-05 22:1x)

## 맥락
- CI e2e 첫 실행 분류 `task-e2e-first-run-triage.md` 4절 '앱 결함'(I · J)과 2절 I · J 행. 정본 C114(한 판의 카드는 줄 높이로 늘어 같은 높이) · AC-23h · AC-23e (2)(3)(NFR-U1). 컨트롤러 결정: J-2 는 앱을 고친다(회전한 모서리도 여백 띠 안에).
- 맡는 파일(src 만): `src/app/(child)/home-cards.tsx` · `src/app/(child)/[area]/lessons/lesson-board.tsx` · `src/components/board/decor.tsx` · `src/components/board/paper-key.ts`. 시험 파일은 다른 구현자 몫 — 건드리지 않는다(home.spec · font-size.spec 의 기존 단언이 고친 뒤 통과해야 한다 — 그 단언 줄을 읽어 기준을 맞춘다).

## 할 것
1. **I(2) 홈 세로 2×2 카드 높이.** `home-cards.tsx` 414 `grid grid-cols-2 items-stretch … landscape:grid-cols-4` — 두 줄 높이가 내용 따라 다름(12px · 5px 차). 격자에 같은 몫 줄(auto-rows-fr 등)을 주어 네 카드가 같은 높이(C114). 세로 1180 안에 드는지(home.spec 329 · 564 단언 기준).
2. **J-1 '다지기' 이름표.** `lesson-board.tsx` 513 '다지기' p 가 종이 없이 책상 위 — 종이(카드 · 띠) 위로 올리거나 종이 조각을 둔다(AC-23e (2) 글은 종이 위).
3. **J-2 낙서 · 기울인 카드 겹침.** `decor.tsx` 10~12 낙서 자리(화면 끝 3~21px)와 `paper-key.ts` 16 기울기(−1.4 · 1 · −0.6 · 1.2°)로 400px 넘는 카드의 회전 모서리가 낙서와 1~2px 겹침 — 낙서를 여백 띠 안쪽으로 옮기거나 큰 카드의 기울기를 줄여 겹침 0(font-size.spec 92 의 회전 상자 기준).
4. 단위 시험이 있으면 갱신(ux-tokens · ux-home 등), 관문 0. 바꾼 값이 설계 숫자면 설정 · 토큰 자리에.

## 지키는 것
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD ed5d845 위 미커밋 없음). 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. e2e · 통합은 이 Mac 에서 못 돌린다(시험용 Postgres 안 뜸) — 정적으로 고치고 부르는 함수 · 표지 · 설정 키를 코드 줄로 대조해 보고에 적는다. 관문 biome ci · tsc · `vitest run --project unit` 0. 시험 파일은 있으면 Edit 로만. 커밋 · push 금지(컨트롤러). 개발 DB 쓰기 · 환경 파일 값 출력 금지. 다른 구현자가 같은 시각에 다른 파일을 고치므로 **아래 파일 밖은 건드리지 않는다**(필요하면 보고에 적는다). 긴 출력은 스크래치패드 파일로.

## 보고
`task-ux-fix-1-report.md`: 자리별 바꾼 줄 · 기준 단언 줄, 관문, 사진으로 확인할 것. 답은 요지 다섯 줄 안.
