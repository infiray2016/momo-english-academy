# 묶음 3-(가) — 검증기: 장면 여는 질문 검사 · 목록 넷 검사(check-talk.ts · check-talk-lists.ts)

브리프: 컨트롤러 · 2026-11-07 07:0x · 구현자 Opus high(전체 루프의 첫 단계; 표본 · 카드 · 목록 내용은 3-(나)(다) 설계자 몫)

## 맥락(열 줄 안)
- 닿는 결정: 13절 C206 · C207 · C211 (1). 정본 6.3(`specs/06-시드-생성.md` 186 행 장면 여는 질문 검사 · 187 행 목록 넷 검사 — 규칙은 정본 행 그대로).
- plan `intent/2026-11-06-회화-AI-몫-넓힘/plan.md`(approved) 바뀌는 파일 표 3 행(68~73줄, 사본 `_rows-3.txt`) 가운데 **검증기 둘과 그 시험만**: `src/core/seed/check-talk.ts`(장면 여는 질문 검사: 1~3 새 꼴 카드에 있음 · 물음표 문장 마지막 하나 · 첫 낱말 조동사 · be 목록(코드 상수) · 'or' 없음 · …) · `src/core/seed/check-talk-lists.ts`(신규, 목록 넷 검사 — 꼴 수는 검사 상수) · `src/core/seed/reference-index.ts`(seed:validate 에 잇기) · `tests/unit/seed-validator-talk.test.ts` · `tests/unit/talk-lists.test.ts`(AC-5 (가) · AC-6 (나)).
- 넘겨받은 것: 0-나 의 sceneOpener 꼴 · 목록 넷 규격 · SEED_FILES(보고 `task-0na-report.md`). 카드 JSON(`seed/lessons/talk/3/1.json`) · 목록 내용 · 프롬프트 파일(`seed/prompts/*`)은 손대지 않는다(3-(나)(다) 몫). 지금 카드(개정 4, sceneOpener 없음)가 seed:validate 를 **여전히 통과**해야 한다(장면 여는 질문 '필수'는 새 꼴 카드 · 개정 5 부터 — 검사의 적용 조건을 plan 정한 것 3 · 4 와 06:186 대로).
- 요청자 강조: 장면 · 주제만 준비하고 '예 뒤 · 아니요 뒤' 대본을 두지 않음(검사가 대본식 칸을 요구하지 않게).

## 완료 조건
관문 0(lint · tsc · 단위) · `pnpm seed:validate` 0(개정 4 카드 그대로 통과) · 검사가 의도한 위반(물음표 둘 · 'or' · 조동사 아님 · 목록 꼴 모자람)을 시험 표본으로 잡음.

## 지킬 것
워크트리 · 서브셸 · 스크래치패드 `ai-scope-3a-*.txt` · BLOCKED 규칙 · 커밋 금지는 다른 묶음 브리프와 같다. 보고: `task-3a-report.md`. 저에게는 요지 세 줄.
