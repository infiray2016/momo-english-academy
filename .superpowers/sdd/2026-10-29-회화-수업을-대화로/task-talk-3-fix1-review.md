# 재검토 보고: 회화 plan 묶음 3 fix 1(범위 한정)

검토자 rev-talk-3(Opus · xhigh), 2026-10-30 09:3x, 읽기 전용. 본 것은 지난 보고(`task-talk-3-review-report.md`)의 지적 일곱 개와 고침 보고(`task-talk-3-fix1.md`), 첫 보고(`task-talk-3-report.md`)의 고친 문장이다. 첫 검토 때 만든 diff 와 지금 diff 를 견주어, fix 1 이 바꾼 파일이 `src/core/seed/check-talk.ts` · `src/core/seed/schema/talk.ts` · `tests/unit/seed-validator-talk.test.ts` · `tests/e2e/conversation.spec.ts` 넷뿐임을 확인했다. 새 시험이 지적의 본체라 `tests/unit/seed-validator-talk.test.ts` 한 파일만 돌렸고(09:36, 38건 통과), 바뀐 네 파일의 biome 검사도 오류 0 이다. 전체 관문은 다시 돌리지 않았다.

## 판정: Approved

## 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 단원 덮기 범위 | ADDRESSED | `check-talk.ts:858~861` 의 againTargets 가 배정 카드의 필수 질문을 빼고(`lesson.kind === "assigned" ? [] : required`), 더 이야기할 거리는 모든 카드에서 센다. 다지기 · 보강 카드의 필수 질문은 talk-first-ask 때문에 모두 다시 묻는 질문이라, re_ask 거르기를 뺀 것이 셈을 바꾸지 않는다. 시험 `seed-validator-talk.test.ts:729~756` 은 배정 카드 둘의 다시 묻는 필수 질문으로만 채운 단원이 talk-known-days 오류임을 본다. 고치기 전 실패를 본 시험이다. 첫 보고 5 · 요청 3 의 문장도 실제 동작대로 고쳐졌다(report:79 · 109) |
| I-2 단원 갈림길 시험 | ADDRESSED | `seed-validator-talk.test.ts:758~798` 은 옵션 없이 checkTalkUnit 을 부른다. 단원 틀대로 변형마다 정규 카드와 보강 카드(talkCard 에 kind remedial)를 넣은 다 찬 단원이 통과하고, 변형 1 의 덮기를 깨면 `variant.1` 에 talk-known-days 오류 하나가 난다. 보강 카드 둘의 필수 질문으로 다시 채우면 통과하므로 보강 셈도 지난다. `:800~808` 은 세 장만 넣으면 옵션 없이도 talk-unit-incomplete 경고 하나(`variant.1`)이고 오류가 0 임을 본다. unitComplete 를 실제로 지난다 |
| M-1 앞쪽 절반 | ADDRESSED | `check-talk.ts:414~415` 가 `isLow(spec)` 일 때만 앞쪽 절반을 본다. 수 · 오늘 쓸 말 안은 4단계부터도 두면 본다(주석 371~374). 시험 `:595~605` 는 4단계 카드에서 뒤쪽 필수 질문의 새 단어를 prep 으로 두어도 오류 0 이고 수가 모자라면 talk-prep 임을 본다. 1~3단계 몫은 기존 'late' 시험이 그대로 막는다 |
| M-2 쉬운 질문 뜻 | ADDRESSED | 규칙은 그대로이고 근거 주석이 `check-talk.ts:740` · `schema/talk.ts:173` 에서 13절 C194 (2)를 가리킨다. C194 (2)는 정본 `specs/10-결정-기록.md:364` 와 p13d 사본에 같은 글로 있다 |
| M-3 막는 쪽 시험 | ADDRESSED | home 밖 purpose(`:302~315`, home 안 purpose 는 받고 demands 를 두면 통과), talk-shape(`:493~508`, 인사 질문 수 ≠ 인사 턴 수 · 4단계 인사 질문), talk-hints(`:510~540`, 쓸 수 있는 말 모자람 · 둘 수 없는 단계에 둠 · 3단계 영어 틀 없음 · 1단계에 영어 틀 둠), level-spec-talk-v1 한 칸씩(`:846~876`, segments · cardShape · choices 없음 · twoAnswers 를 하나씩 어기면 그 칸 이름이 든 오류 하나). 모두 통과 쪽 견본 위에서 한 갈래만 바꾼다 |
| M-4 '동작 그대로'의 예외 | ADDRESSED | 첫 보고 '설계와 다르게 한 것' 2(report:76)에 'Conversation mode' 줄(talk.ts:395)이 새 꼴 행의 mode 글을 읽는다는 예외 한 줄이 들었다. 코드는 위험 2 범위라 그대로다 |
| M-5 e2e 변수 이름 | ADDRESSED | `tests/e2e/conversation.spec.ts:906 · 910 · 911` 이 talkHomeCard 다. tests 아래에 `const talkCardV1 =` 꼴로 남은 변수는 없다 |

## 새로 깨뜨린 것

없다. fix 1 의 코드 변경은 함수 두 곳(againTargets · checkPrep 의 조건 한 줄)과 주석뿐이고, 견본 빌더 · 다른 검사는 바뀌지 않았다.

## 범위 밖 관찰

- `seed-validator-talk.test.ts:810~821`('일부 단원 … 경고로만', 옵션을 넘기는 첫 판 시험)은 새 시험 `:800~808` 과 겹친다. 막는 힘은 같으니 지우지 않아도 된다.
- 고침 보고 '남은 우려'대로, talk-3 브리프(묶음 4)에는 단원 덮기 셈 범위(다지기 · 보강 필수 질문 + 모든 카드의 더 이야기할 거리)와 4단계부터 prep 의 앞쪽 절반 없음, 쉬운 질문 뜻(C194 (2))을 옮겨야 한다.
