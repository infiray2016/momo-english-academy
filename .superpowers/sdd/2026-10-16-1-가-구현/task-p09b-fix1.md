# fix 1 브리프: P9b AI 호출 넷(implementer impl-p09a 이어 하기 · Opus · high, 같은 워크트리, 2026-10-17 03:0x)

검토 `review-p09b.md`(rev-p09b, Changes requested — C 0 · I 3 · M 5)의 지적 여덟을 모두 고친다. 시험을 먼저 더해 실패를 본 뒤 고친다. 커밋 · 공용 파일 · plan · 정본은 건드리지 않는다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 한글 경로는 인자로 넘기지 않는다. 실제 API 호출 없음.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(feature/1a-p09b-ai-calls, 커밋 없음). 검토 보고 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p09b.md`(지적마다 파일:줄 · 재현 · '어떻게'). plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09b-AI-호출-넷.md`.

## 고칠 것(컨트롤러 판정 — 검토의 '어떻게'를 따르되 아래가 우선)
- **I-1** `firstSentence`: 한국어 칸용 첫 문장은 `splitSentences` 조각 가운데 처음으로 한글이 든 조각까지를 공백으로 이어 붙인다(한글이 없으면 첫 조각). 시험: 인용 사례 둘(말하기 피드백 · 쓰기 이유, 검토 재현 문장 그대로).
- **I-2** 전화번호 경계: `(^|[^0-9])(0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4})(?![0-9])` 꼴로 바꾸고 첫 묶음을 되돌려 넣는다. 연락처 먼저 차례는 그대로(전자 우편 때문). 시험: `Ganada010-1234-5678` · `call01012345678` 두 줄, 기존 '1010-1234-5678 그대로' 유지.
- **I-3** 생각 꺼내기 `validate(value, input, rules)` 가 `value.done || rules.lastTurn` 으로 본다. 시험: '마지막 턴에 done 거짓 · 요약 빈 응답은 검증에 걸린다'.
- **M-1** 프롬프트 · 규격 설명 글의 숫자 · 열거값(writing.ts:89 · 236~238 · 286, speaking.ts:72 · 226~227 · 256 · 381~382)은 `structure.ts` 상수를 끼워 넣는다.
- **M-2** 턴 번호는 `input.turn` 하나만 쓴다(메시지의 턴 표시 · 마지막 턴 말도). `turn !== history.length + 1` 이면 던진다(request.ts:65 목적 검사 꼴). 시험 하나.
- **M-3** 빈 글 처리 통일 — 빈 바른 답은 `seedCorrectAnswer ?? ""`(걸린 바른 답과 같게, 다르게 한 것 11 을 이렇게 바꿈), 빈 고칠 곳 · 교정은 버림, 문법 지적은 빈 글을 거른 뒤 자름, 빈 피드백은 칭찬과 같이 null(필수 칸 없음). 시험: 바른 답 · 문법 지적 둘.
- **M-4** 멱등 시험: 여섯 규격에 `normalize(normalize(x))` 가 `normalize(x)` 와 깊은 같음을 한 묶음(it 하나)으로. P9c 가 기댈 계약이다.
- **M-5** 원문(아이 글 인용) 칸은 길이 검사를 하지 않는다 — `CheckField` 에 `checkLength?: boolean`(기본 참)을 두고 writing.ts:185 · 381 원문은 거짓. 금지어 · 연락처 검사는 그대로. 시험: 상한보다 긴 원문 인용이 버려지지 않음.
- 알림(할 일 없음): P6a 규격 검토가 시드 `forbidden.json` contact 범주에 집 주소 꼴을 더하기로 했다(C67 (4)). 앱 정규식은 전화 · 전자 우편, 시드가 주소를 맡는 경계 그대로다. 견본 contact 정규식(`tests/fixtures/ai/sample-inputs.ts`)에 주소 꼴 하나를 더해 가림 시험이 지나는지만 본다(선택).

## 완료 판정
`pnpm exec biome ci .` 0 · `pnpm build` · `pnpm test`(228 + 새 시험, 모두 통과) · `pnpm test:int` 30 · `pnpm check:deps` 0 · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` 0(missing-test 52 그대로) · `pnpm check:bundle` 0 · 비밀값 grep 0. 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09b-fix1-report.md`(지적마다 ADDRESSED · 파일:줄 · 시험, 다르게 한 것, 검토자에게 알릴 것). 마지막 메시지는 상태 + 요약 한 줄. 그 뒤 rev-p09b 범위 한정 재검토.
