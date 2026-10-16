# 재검토: P9b AI 호출 넷 fix 1 — Approved(C 0 · I 0 · M 1, 새 지적 Minor 1)(rev-p09b · Opus · xhigh, 2026-10-17 03:2x)

범위: `review-p09b.md` 의 I-1 · I-2 · I-3 · M-1~M-5 와 fix 1 이 바꾼 줄. 워크트리 `.claude/worktrees/p09`(커밋 없음)를 직접 읽었다. 고친 동작은 스크래치패드의 tsx 스크립트로 워크트리 함수를 불러 다시 재현했다(파일 변경 · API 호출 없음). 시험 묶음은 다시 돌리지 않았다(컨트롤러 재확인 단위 234 · 통합 30).

## 1. 지적마다

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 firstSentence | ADDRESSED | common.ts:177~181 이 splitSentences 조각 가운데 처음 한글이 든 조각까지 잇고, 한글이 없으면 첫 조각을 쓴다. 검토 재현 세 문장이 한국어까지 남는다(normalize.test.ts:735~751). 한글 없는 글은 첫 조각이다(752~753). 쓰이는 네 곳 모두 이 함수를 지난다: 쓰기 이유 writing.ts:177, 질문 답 speaking.ts:167, 발표 337, 확인 질문 답 443. 말하기 피드백 · 쓰기 이유 인용 사례 시험 있음(754~782). 한글 범위는 바이트로 `가-힣` |
| I-2 전화번호 경계 | ADDRESSED | mask.ts:29~38 이 `(^|[^0-9])(0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4})(?![0-9])` 이고 `keepsPrefix: true` 는 이 하나뿐이다. 전자 우편과 시드 contact(mask.ts:162~165)는 `keepsPrefix: false` 로 통째 가림이라 예전과 같다. 묶음이 있는 시드 정규식 `(서울)시` 도 통째로 가려짐을 재현했다. 출력 검사는 걸린 글로 2번 묶음을 쓴다(output-check.ts:38~43 · 52). `x010-…` 에서 걸린 글이 `010-1234-5678` 로 앞 글자가 섞이지 않는다. `Ganada010-1234-5678` → `{NAME}***`, `call01012345678` → `call***`, `1010-1234-5678` 그대로, 붙은 두 번호 `***/***`(contacts 2). 가린 수는 바꿀 때마다 1 이라 맞다. 시험 mask.test.ts:135~150 |
| I-3 마지막 턴 검증 | ADDRESSED | thinkout.ts:200~205 가 `value.done \|\| rules.lastTurn` 으로 본다. `rules.lastTurn` 은 rulesOf(150~151)가 `input.turn` 에서 내고, assertTurn 이 그 turn 을 기록 수와 맞춘다. 시험(normalize.test.ts:785~804)은 보기 셋인 묻는 응답을 쓰고, 그 응답이 엄격 규격을 지남을 먼저 단언한 뒤 마지막 턴 검증이 걸리고 첫 턴은 지남을 본다 |
| M-1 박힌 구조 숫자 | ADDRESSED | `calls/` 에 '1-2' · '1-4' · 'correct, partial or retry' 글자가 없다(grep 0). 끼운 상수는 structure.ts 의 `AI_SCORE`(writing.ts:28 · speaking.ts:28) · `WRITING_CHECK_DISTRACTORS`(writing.ts:51 · 91) · `SPEAKING_JUDGEMENTS`(speaking.ts:29 · 73 · 104) 그대로다 |
| M-2 턴 번호 | ADDRESSED | assertTurn(thinkout.ts:106~113) 하나를 rulesOf(150) · messages(173)가 같이 부르므로 조건이 같다. 던지는 것은 RangeError 라 '설정 문제'의 CallSettingError 와 구별된다(재현: name RangeError). 메시지의 턴 표시 · 마지막 턴 말은 `input.turn` 기준이고, 셋째 턴 메시지가 둘째 턴 메시지를 글자 그대로 앞에 둔다(재현). 시험 ai-request.test.ts:266~280 |
| M-3 빈 글 처리 | ADDRESSED | 빈 바른 답 → `seedCorrectAnswer ?? ""`(speaking.ts:172~175), 문법 지적 거른 뒤 자름(177~180), 빈 고칠 곳 · 교정 버림(writing.ts:180~186 · 384~387), 빈 피드백 null(speaking.ts:166~167 · 337~338 · 443~444). 넷 모두 시험에 있다(normalize.test.ts:806~867). 3단계 빈 바른 답이 시드 바른 답이 되어 AC-5d 둘째 문장(부분 · 다시에 바른 답 재생)에 맞는다. 4단계부터는 시드 바른 답이 없어 빈 글이고, 이것은 P11 메모 3(빈 글은 들려주지 않음)으로 이미 넘겼다 |
| M-4 멱등 시험 | ADDRESSED | normalize.test.ts:869~ 이 일곱 사례로 여섯 규격과 생각 꺼내기 마지막 턴(done 강제) · 묻는 턴을 지난다. 넣는 값은 자르기 · 범위 밖 점수 · 둘째 줄이 든 응답이고, 비교는 `toEqual`(깊은 같음)이며 첫 결과가 null 이 아님도 단언한다 |
| M-5 원문 길이 | ADDRESSED | `checkLength?: boolean`, `!== false` 라 기본 참(output-check.ts:25 · 85). 거짓은 쓰기 확인 원문(writing.ts:198) · 첨삭 원문(404) 두 곳뿐이다(grep). 금지어 · 연락처는 길이와 따로 보아 원문에서도 걸린다. 시험(normalize.test.ts:930~)이 긴 원문은 걸리지 않음과 `you stupid` 원문이 걸림을 함께 본다 |

## 2. 새 지적(fix 1 이 바꾼 줄)

**N-1(Minor). 견본 contact 정규식의 문서 주석이 어긋났다.** tests/fixtures/ai/sample-inputs.ts:48 의 `/** 시드 forbidden 의 contact 정규식. */` 이 49줄 SAMPLE_ADDRESS 주석 위에 떨어져 남았다. 51~56줄 SAMPLE_CONTACT_PATTERNS 에는 주석이 없는데, 이 값은 이제 견본 주소 꼴도 담는다. mask.test.ts:186 의 `leaks().phone` 도 주소를 함께 본다. 동작에는 영향이 없다. 48줄 주석을 SAMPLE_CONTACT_PATTERNS 위로 옮기고 '시드 contact 정규식 + 견본 주소 꼴(C67 (4))'로 고친다. phone 칸은 `contact` 로 이름을 바꾼다. 컨트롤러가 직접 고쳐도 되는 크기다.

## 3. 다르게 한 것 · 알릴 것 판정

- **다르게 한 것 1 `{ source, keepsPrefix }` — 받음.** 앞 글자 되돌리기를 정규식마다 알아야 하는 I-2 고침의 최소 꼴이다. 다른 쓰는 곳은 output-check 와 mask.test 길이 단언뿐이다.
- **다르게 한 것 2 턴 검사 두 곳 — 받음.** 같은 함수라 조건이 갈리지 않는다. P9c 는 rulesOf 를 먼저 부르므로 일찍 던지고, 계약 · 관찰 스크립트가 messages 만 불러도 막힌다.
- **알릴 것 1 한글 든 첫 조각까지 — 받음.** 영어 조각이 둘 이상 앞서면 '한 문장'보다 길어지지만, 한국어 피드백이 사라지는 것보다 낫다. 첫 조각에 한글이 있으면 그 조각만 남는다(재현). 같은 함수를 두 번 지나도 결과가 같다.
- **알릴 것 2 빈 피드백 null — 받음.** 엄격 규격의 min 1 이 먼저 걸려 6.1 대로 1회 다시 요청한 뒤의 일이다. 그 뒤 null 이면 8절의 말하기 평가 실패 길로 간다(판정 없이 다음 문항, 그 활동은 점수에서 뺌). 컨트롤러 fix 판정과 같다.

## 4. P9c 메모(review-p09b 6절에 더함)

- **P9c 3.** 생각 꺼내기 `rulesOf` · `messages` 가 던지는 RangeError(턴 번호 어긋남)와 `buildAiRequest` 의 목적 불일치 RangeError 는 호출부 결함이다. '설정 문제'(CallSettingError)나 AI 실패로 세지 않고 서버 오류로 남긴다. ai_calls 행도 만들지 않는다.
- **P9c 4.** 앱 연락처 정규식을 다시 쓸 때(1-나 지난 대화 요약 가림 등)는 `BUILTIN_CONTACT_PATTERNS` 의 `keepsPrefix` 를 따라 1번 묶음을 되돌려 넣는다. 가림은 `createMasker`, 검사는 `checkOutputFields` 를 그대로 쓰면 된다.
