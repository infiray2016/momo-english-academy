# 학습 설계 브리프: 생성 브리프 둘째 판 — 쓰기 1 새로 · 말하기 1 새 판 · 틀(curriculum-designer · Opus · xhigh, 2026-10-23 03:4x)

워크트리 p08(`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p08`). 커밋 없음. 정본은 본 저장소 `specs/`(최신, 워크트리 specs 는 옛 판).

## 할 일
1. **`seed/prompts/writing-1.md` 새로 쓰기** — `_template.md` 틀대로, `reading-1.md` · `speaking-1.md` 의 꼴과 같은 결로. 쓰기 1단계(단원 0 알파벳 포함)는 고르기 · 베끼기 · 조립만이다(아이가 문장을 만들어 내는 과제 없음 — CLAUDE.md '틀리는 것' 첫 줄). 문장 조립 카드는 소문자, 고유 명사 · I 는 정답 꼴, 문장 부호는 카드 하나(C84). **지금 검증기는 대문자 카드를 모두 막으므로**(README 7절 메모 — 고침은 쓰기 3 전) 쓰기 1 조립 카드에는 고유 명사 · I 가 들어가는 문장을 쓰지 않는다.
2. **`seed/prompts/speaking-1.md` 새 판** — 바꾸는 것만:
   - **C124 인물 규칙**: 인물은 문장에 필요할 때만 넣는다. 넣을 때 모모 · 토리만 되풀이하지 않게 가끔 다른 가상 인물(아이 · 동물, 짧고 읽기 쉬운 이름 6~8명 — 브리프 안 작은 표)을 쓴다. 회화 선생님 이름(Mina · Leo · Ruby · Sora · Hana · Jun · Nabi · Luna · Kiki · Lulu · Pang · Pipi)은 쓰지 않는다. 셀 수 있는 기준 하나를 둔다(예: 한 단원 영어 문장 가운데 인물 이름이 든 문장 비율 상한 · 모모 · 토리가 그 가운데 차지하는 몫 상한 — 값은 설계자가 정하고 까닭을 적음). 표본 단원 1 high 는 모모 19 · 토리 26번이었다(26수업).
   - 표본 보고 두 벌이 짚은 빈틈(장부 `ledger-open.md` 'P8 표본에서 드러난 브리프 빈틈' 행 + 아래): 소리가 비슷한 보기를 한 듣기 문항에 두지 않기(swing · wing · king), 셀 수 없는 명사의 허용 답 꼴(milk · It is milk. 둘뿐 — acceptedMin 과의 관계), 'the sun' 처럼 a/an 이 어색한 낱말, 감탄 · 부르는 말 꼴(Oh, ~! · Momo, ~)을 꼴 표에 넣을지, 그림과 관사 수(grape 그림은 송이). 짧은 규칙으로.
3. **`seed/prompts/_template.md`** 에 C124 인물 규칙 절을 더한다(다음 브리프들이 물려받게).
4. **`reading-1.md` 는 고치지 않는다**(C121 · C124 — 읽기 1 묶음이 지금 판으로 만들어지는 중).
5. 확인: `pnpm -s seed:validate`(규격 파일 오류 0) · 세 파일 해시(`shasum -a 256`)를 보고에.

## 읽을 것
본 저장소 `specs/10-결정-기록.md` C66 · C67 · C84 · C87 · C88 · C116 · C121 · C124, `specs/06-시드-생성.md` 6.3 · 6.4, `specs/02-1-영역-단원-승급.md`(단계표) · `02-2`(쓰기 1~3 활동), p08 `seed/prompts/README.md` · `_template.md` · `reading-1.md` · `speaking-1.md`, `seed/unit-specs.json` · `level-specs.json` · `vocab.json` · `lists/forms.json`, 근거 문서 `docs/research/2026-10-16-seed-reference-basis.md`(p06b 워크트리).

## 보고
마지막 답장에: 바꾼 파일 · 새 해시 셋 · C124 기준 값과 까닭 · 쓰기 1 브리프의 활동 꼴 요약 · 정본으로 풀리지 않아 스스로 정한 것 · 우려.
