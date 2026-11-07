# 검토: 회화 1~3단계 '모름' 턴 결함 A~E 고침(코드 검토자 · Opus · xhigh, 2026-10-29, 1라운드)

판정(1라운드): **Changes requested**. Critical 0 · Important 2 · Minor 1 입니다. fix 1 재검토 결과는 맨 끝 '재검토(fix 1)' 절에 있습니다.

대상은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d` 의 작업 트리 diff 입니다(1b70da8 위, 파일 10개). `tests/unit/ci-workflows.test.ts` 는 diff 에 없고 범위 밖입니다. 범위 기준은 컨트롤러가 저장한 스냅숏 `task-talk-greeting-fix.diff`(같은 폴더)이고, 검토한 diff 와 글자까지 같음을 대조했습니다. 그 뒤 같은 워크트리에 들어온 음성 고침(`src/core/speech/listen.ts` · `tests/unit/listen-end.test.ts` · `tests/unit/speaking-judge.test.ts`)은 범위 밖입니다. 통합 시험과 e2e 는 돌리지 않았습니다. 판단은 diff 와 diff 밖의 호출부 읽기, 그리고 스크래치패드에서 정규화 함수 값을 찍어 본 결과로 했습니다.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| A 뜻 줄 거르기(흘림 · 저장) | ✅ | `src/server/conversation/turn.ts:1089-1099` 에서 흘릴 뜻과 저장할 뜻이 같은 판정을 거치고, `:1127` 이 거른 값을 저장합니다. 분석 보고 5절 (나) A 의 자리 그대로입니다. |
| A 판정이 순수 함수 | ✅ | `src/core/conversation/flow.ts:1015` `toriKoShownOf` 는 DB 없이 값만 봅니다. 4단계부터는 뜻을 그대로 돌려줘 4단계 이상의 동작이 바뀌지 않습니다. |
| A 다시 흘리기 · 이어 열기 | ✅ | 다시 흘리기(`turn.ts:662`)와 이어 열기(`src/server/conversation/index.ts:517`)는 저장된 tori_ko 만 냅니다. 저장값이 비므로 둘 다 따라옵니다. |
| B 고정부 한 줄 | ✅ | `src/core/ai/calls/talk.ts:375`. 'Input' 은 사용자 메시지 이름표(`talk.ts:478`)와 같습니다. |
| C 줄임꼴 펼치기 | ❌ 넘침 | 줄임꼴은 펼쳐지지만 이름 자리도 지워집니다. 아래 I-2 입니다. |
| D '모름' 턴 recast 비움 | ✅ | `turn.ts:399-401`. 브리프대로 dont_know 만 비웁니다. 기존 시험 가운데 '모름' 턴의 recast 에 기대는 것은 없습니다. |
| E 설명 줄 이름 채우기 | ✅ | `src/components/conversation/tori.tsx:359` 가 영어 줄(`:309`) · 뜻 줄(`:352`)과 같은 함수를 씁니다. |
| A 단위 시험 | ✅ | `tests/unit/talk-repeat.test.ts:172` 가 뺌 · 안 뺌 · 뜻 없음 · 4단계 넷을 단언합니다. |
| A · D 통합 시험 | ❌ | 화면 자료를 먼저 열지 않아 턴 길이 'stale' 로 끝납니다. 아래 I-1 입니다. |
| A e2e(AC-15g) | ✅ | `tests/e2e/conversation.spec.ts:314-325`. 아래 '잘한 점'에 적었습니다. |
| B · C · D · E 단위 시험 | ✅ | `conversation-call.test.ts:258` · `talk-repeat.test.ts:147` · `conversation-server.test.ts:820` · `talk-bubble.test.ts:210`. C 시험에는 이름 자리 경우가 없습니다(I-2). |
| T2 '답은 화면에 보이지 않는다' | ✅ | A 가 이 규칙을 지키게 합니다(3.3 `specs/02-2-세션과-단계표.md:112` · `:135`). |
| C125 (3) | ✅ | 저장하는 토리 차례(`text` · `toriRewrite`)는 그대로입니다. 비우는 것은 화면용 뜻 칸(C103)뿐입니다. 6.2 의 "tori_ko 에 걸린 문장이 있으면 뜻 전체를 보이지 않는다(영어는 그대로 둔다)"와 같은 꼴입니다. |
| C127 | ⚠️ | 13절에 보완 줄이 아직 없습니다. 아래 4절에 적었습니다. |
| 설정값 원칙 | ✅ | 새 숫자가 없습니다. 1~3단계 판정은 `toriPlanOf` 의 `turnsShape` 와 같은 `state.spec.cardShape === "turns"` 입니다. 단계 규격(설정값)에서 오고 단계 번호를 박지 않습니다. |
| 범위 밖 변경 | ✅ | diff 는 브리프의 다섯 자리와 그 시험뿐이고, 추적하지 않는 새 파일도 없습니다. |

## 2. 잘한 점

- **판정을 한 곳에 두었습니다.** 흘릴 뜻(plan.ko)과 저장할 뜻(plan.toriKo)이 같은 순수 함수를 지나므로, 처음 화면과 다시 흘리기 · 이어 열기가 어긋날 수 없습니다. 고친 줄이 적어 최소 변경 요구에도 맞습니다.
- **e2e 보강이 실제로 A 길을 지납니다.** 견본 카드의 1단계 첫 턴은 답 두 개가 있고 답 예시가 그 첫째입니다(`tests/fixtures/seed/builders.ts:2046-2052`). 그래서 'Say, (답 예시)' 문장이 빠지고, 뜻 줄의 영어 답은 기존 단언(`conversation.spec.ts:349-351`)이 잡습니다. 가짜 응답 기본값(`tests/e2e/talk.ts:233`)을 바꾸지 않아 다른 e2e 를 흔들지 않은 판단도 맞습니다.
- **B 의 '앱이 들려준다'는 사실입니다.** 정본 3.3 은 "'모름' 턴과 '막힘으로 볼 말'이 참인 턴에는 카드의 답 예시와 같은 질문을 붙인다"고 정합니다(`02-2:131`). 그래서 지시 줄이 정본과 부딪히지 않습니다. 4단계에 이 줄이 없음도 함께 단언했습니다.
- **C 는 표를 복사하지 않았습니다.** 일치율 정규화를 불러 써서 6.2 의 축약형 펼침(`specs/05-AI-호출.md:64`)과 한 표를 씁니다. 숫자를 낱말로 바꾸는 부수 효과도 보고에 밝혔습니다.
- **시험을 먼저 쓰고 실패를 확인한 차례**가 보고 3절에 실패 문구와 함께 남아 있습니다.

## 3. 지적

### Important

**I-1. A · D 통합 시험은 화면 자료를 먼저 열지 않아 'stale' 로 끝나므로, 지금 꼴로는 CI 에서 실패합니다.**
- 자리: `tests/integration/conversation-session.test.ts:1120` · `:1134` · `:1135`.
- 근거: 회화의 처음 스냅숏과 토리 행 1 은 화면 자료를 처음 읽을 때만 들어갑니다(`src/server/conversation/index.ts:546` 의 `ensureStarted`, 본문 `:225-290`). 수업 시작 함수(`startTalk` → `startLessonSession`)는 세션 행의 토막을 'greeting' 으로 정할 뿐이고 talk_turns 를 넣지 않습니다(`src/server/session/index.ts:612`). 턴 길은 마지막 행이 토리 행이 아니면 'stale' 을 돌려줍니다(`src/server/conversation/turn.ts:756`). 같은 파일의 다른 시험은 모두 `startTalk` 뒤에 `viewOf` 나 `intoTalk` 를 먼저 부릅니다(예: `:262-263` · `:389-390` · `:1063-1064`). 따라서 `:1135` 의 `expect(last?.t).toBe("end")` 가 'stale' 로 실패합니다. 브리프가 요구한 통합 검증(흘린 줄에 ko 없음 · tori_ko 와 recast 비어 있음)도 일어나지 않습니다. 구현자는 이 시험을 로컬에서 돌리지 못했습니다(보고 4절).
- 고침: `startTalk` 바로 뒤에 `await viewOf(h, sessionId);` 한 줄을 더합니다. 그 뒤의 흐름을 코드로 따라가면 나머지 단언은 성립합니다. 인사 '모름'은 같은 인사 질문과 답 두 개를 다시 붙이고, 그 짝 때문에 'Say, I'm good.' 이 빠집니다. 그래서 ko 와 tori_ko 가 비고, D 때문에 recast 도 빕니다.

**I-2. C 의 정규화가 이름 자리({NAME})를 통째로 지워, 줄임꼴과 상관없는 '같은 말' 판정까지 바뀝니다.**
- 자리: `src/core/conversation/flow.ts:905-911`.
- 근거: 일치율 정규화는 이름 자리를 대문자 낱말 '{NAME}' 으로 돌려줍니다(`src/core/speech/match-rate.ts:7` · `:228`). 그 뒤 `[^a-z0-9]+` 지우기가 대문자를 남기지 않아 자리 전체가 사라집니다. 고치기 전에는 먼저 소문자로 바꿨기 때문에 'name' 한 낱말로 남았습니다. 스크래치패드에서 찍은 값은 아래와 같습니다.

  | 글 | 고치기 전 | 고친 뒤 |
  |---|---|---|
  | `Yes! My name is {NAME}.` | `yes my name is name` | `yes my name is` |
  | `Hi! Are you {NAME}?` | `hi are you name` | `hi are you` |

  | 판정 | 고치기 전 | 고친 뒤 |
  |---|---|---|
  | `sayingAnswer("Hi, my name is Mina.", [답 두 개 'Yes! My name is {NAME}.' · 'Hi! My name is {NAME}.'])` | 거짓 | 참 |
  | `shownTurnOf(["Hi!", "Are you ready?"], [질문 'Hi! Are you {NAME}?', 그 답 두 개])` 의 붙일 줄 | 질문 남음 | 질문 빠짐 |

- 영향: 실제 회화 1단계 시드에 이 꼴이 있습니다(`seed/lessons/talk/1/*.json` 에서 이름 자리가 든 답 두 개 28줄, 카드 턴 질문 143줄, 인사 질문 128줄). 선생님이 자기 이름을 말한 'Hi, my name is Mina.' 가 아이의 답으로 잡혀 말풍선에서 빠지고, A 때문에 그 턴의 뜻도 함께 사라집니다. 토리 문장에 'Hi!' 와 'are you' 가 든 문장이 함께 오면, 앱이 붙일 카드 질문이 읽히지도 보이지도 않습니다. 이것은 3.3 의 "앱이 그 뒤에 카드의 다음 턴 질문을 붙여 보이고 읽어 준다"(`02-2:131`)와 어긋납니다. 두 경우 모두 AI 출력에 달려 있어 자주 생기지는 않을 것입니다. 그러나 브리프 C 의 범위(줄임꼴 펼치기)를 넘는 동작 변경이고, 보고에도 시험에도 없습니다.
- 고침: 이름 자리를 고치기 전처럼 한 낱말로 남깁니다. 예를 들면 `[^a-z0-9]` 지우기 앞에서 `.join(" ").toLowerCase()` 로 바꿔 '{name}' 이 'name' 이 되게 합니다. 단위 시험에는 `Yes! My name is {NAME}.` 의 정규화 값과 위 두 판정(선생님 자기소개는 남음 · 카드 질문 줄은 남음)을 더합니다.

### Minor

**M-1. 통합 시험의 이어 열기 단언이 간접적입니다.**
- 자리: `tests/integration/conversation-session.test.ts:1145`.
- 근거: `JSON.stringify(view.lastTori ?? {})` 에 뜻 글 전체가 없는지만 봅니다. 이어 열기가 저장값을 따른다는 것(`index.ts:517`)은 `expect(view.lastTori?.ko).toBeUndefined()` 가 바로 단언합니다. 지금 꼴도 회귀는 잡으므로 다듬기입니다.

## 4. 범위 밖 관찰 · 확인하지 못한 것

- **⚠️ 13절 C127 보완 줄이 아직 없습니다.** 코드 주석(`flow.ts:901-904` · `:917-918`)이 'C127 보완(2026-10-29)'을 가리키지만, C127 본문은 아직 "'I'm good' 은 정규화하면 두 낱말"이라 적고 있습니다(`specs/10-결정-기록.md:296`). 프로젝트 규칙은 설계를 바꿀 때 결정 기록에 한 줄을 먼저 더하라고 정합니다(`.claude/CLAUDE.md` Architecture 절). 분석 보고 7절 4 도 결함 C 를 고치기 전에 정하라고 적었습니다. 브리프대로 이것은 컨트롤러 몫이고, 커밋 전에 13절 한 줄이 들어가야 합니다. I-2 를 고치면 그 줄에 '이름 자리는 한 낱말로 남긴다'도 함께 적을 수 있습니다.
- **⚠️ 통합 시험과 e2e 의 실제 결과는 확인하지 못했습니다.** 이 Mac 에서는 시험용 Postgres 가 뜨지 않습니다(구현자 보고 4절). e2e 의 가짜 뜻 줄이 서버의 뜻 검사(`talk.ts:773` 부근 `talkCheckFields`)에 걸려 먼저 비워지면 A 없이도 시험이 지나갑니다. 다만 분석 보고가 같은 꼴의 뜻 줄이 실제 기록에 그대로 보였다고 적었으므로(5절 A '기록'), 검사에 걸리지 않을 것으로 봅니다.
- 숫자를 낱말로 바꾸는 부수 효과('I'm 9.' 와 'I'm nine.' 이 같은 말)는 양쪽이 같은 정규화를 거쳐 대칭입니다. 6.2 일치율 규칙과도 같아 문제로 보지 않습니다.
- 구현자 보고 5절 3 · 4(뜻 줄에만 답이 든 경우, 설명 줄에 영어 답이 든 경우)는 설계 판단이 필요한 몫이라는 데 동의합니다. 이번 diff 의 결함은 아닙니다.

## 5. 판정

I-1 과 I-2 를 고친 뒤 재검토가 필요합니다. M-1 은 함께 고치면 좋습니다. fix 라운드는 이번이 1회째입니다.

판정: Changes requested

## 재검토(fix 1)

범위는 `src/core/conversation/flow.ts` · `tests/unit/talk-repeat.test.ts` · `tests/integration/conversation-session.test.ts` 셋입니다. 스냅숏 `task-talk-greeting-fix.diff` 와 지금 diff 를 견줘 보니, fix 1 이 바꾼 것은 아래 세 자리뿐입니다. 같은 워크트리의 음성 고침(client-listen 등)은 범위 밖입니다. 그 구현자가 같은 통합 시험 파일에도 시험을 더하고 있어 줄이 밀렸습니다. 아래 줄 번호는 재검토 때 파일 기준이고, A · D 시험 블록의 내용은 fix 1 diff 와 같음을 대조했습니다.

### 지적별 판정

**I-1 ADDRESSED.** `tests/integration/conversation-session.test.ts:1194` 에 `await viewOf(h, sessionId);` 가 들어갔습니다. 기본 시험 가정에는 선생님이 있습니다. 선생님을 비우는 것은 AC-19b 시험(`:529-530`)뿐입니다. 그리고 화면 자료를 처음 읽으면 토리 행 1 이 들어간다는 것을 같은 파일의 첫 시험이 이미 단언합니다(`:165-167`). 따라서 턴 요청은 인사 질문 자리에서 AI 를 부르는 길로 갑니다. 그 뒤 단언(답 문장 빠짐 · ko 없음 · tori_ko 와 recast 비어 있음)도 코드로 따라가면 성립합니다. 다만 이 Mac 에서는 여전히 돌리지 못했습니다(아래 관찰).

**I-2 ADDRESSED.** `src/core/conversation/flow.ts:906-913` 이 낱말을 이은 뒤 소문자로 바꿔, 이름 자리가 고치기 전처럼 'name' 한 낱말로 남습니다. 일치율 정규화는 이름 자리 말고는 이미 모두 소문자로 돌려주므로(`src/core/speech/match-rate.ts:197-228`), 이 한 줄은 다른 낱말을 바꾸지 않습니다. 스크래치패드에서 다시 찍은 값은 아래와 같습니다.

| 글 · 판정 | 1라운드 | fix 1 뒤 | 고치기 전 |
|---|---|---|---|
| `Yes! My name is {NAME}.` | `yes my name is` | `yes my name is name` | `yes my name is name` |
| `Hi! Are you {NAME}?` | `hi are you` | `hi are you name` | `hi are you name` |
| 선생님 자기소개 'Hi, my name is Mina.' 가 답으로 잡힘 | 참 | 거짓 | 거짓 |
| 'Hi!' · 'Are you ready?' 뒤 카드 질문 줄 | 빠짐 | 남음 | 남음 |

줄임꼴 펼치기(결함 C)는 그대로 됩니다('I'm 9.' 와 'I'm nine.' 이 모두 `i am nine`). 새 단위 시험(`tests/unit/talk-repeat.test.ts:172-195`)은 위 세 경우를 단언합니다. 카드 질문 경우는 1라운드 코드에서라면 질문 줄이 빠져 실패하는 꼴이라, 회귀를 실제로 잡습니다.

**M-1 ADDRESSED.** `tests/integration/conversation-session.test.ts:1219` 가 `expect(view.lastTori?.ko).toBeUndefined()` 로 이어 열기의 뜻 칸을 바로 단언합니다. 마지막 행이 토리 행임은 바로 위(`:1214`)에서 단언하므로 lastTori 가 비어 저절로 지나가는 일은 없습니다.

### 새로 깨뜨린 것

없습니다. 세 파일 안에서 fix 1 이 바꾼 세 자리 밖의 줄은 스냅숏과 같습니다(통합 시험 파일은 음성 고침 구현자가 더한 시험을 빼고 견줌).

### 범위 밖 관찰

- **관문은 두 구현이 합쳐진 뒤 다시 돌려야 합니다.** 구현자 보고의 fix 1 '관문' 표에 따르면 `pnpm lint` · `tsc --noEmit` · `pnpm test` 의 실패는 모두 같은 워크트리의 음성 고침 쪽 파일(`src/server/conversation/turn.ts:23` 가져오기 순서, `src/server/conversation/index.ts:678`, `talk-child-listen.test.ts` 등)에서 납니다. 이번 세 파일에는 없습니다. 커밋 전에 합친 상태로 관문 전부를 확인해야 합니다.
- **⚠️ 통합 시험(A · D)과 e2e(AC-15g)는 아직 한 번도 돌지 않았습니다.** CI 에서 처음 확인됩니다.
- **⚠️ 13절 C127 보완 줄은 여전히 컨트롤러 몫입니다.** 4절에 적은 대로 커밋 전에 13절 한 줄이 들어가야 합니다. 그 줄에 '줄임꼴은 일치율과 같은 표로 펼치고, 이름 자리는 한 낱말로 남긴다'를 함께 적으면 코드와 맞습니다.

### 라운드 판정

결함 A~E 고침의 범위에서 열린 지적이 없습니다.

판정(fix 1): Approved
