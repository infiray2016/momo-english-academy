# 보고: 회화 1~3단계 '모름' 턴 결함 A~E 고침(구현자 · Opus · high, 2026-10-29)

상태: **DONE_WITH_CONCERNS**. 결함 다섯을 모두 고쳤고 단위 시험 · lint · tsc · 의존 검사는 통과했습니다. 통합 시험은 이 Mac 에서 시험용 Postgres 가 뜨지 않아 돌리지 못했습니다(아래 '관문'). e2e 는 브리프대로 시험 코드만 고쳤습니다. 커밋하지 않았습니다.

작업 자리: `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(1e44de5 위 작업 트리).

## 1. 고친 파일 · 줄

| 결함 | 파일:줄 | 내용 |
|---|---|---|
| A | `src/core/conversation/flow.ts:1010-1029` | 순수 함수 `toriKoShownOf({ ko, sent, shown, lowBand })` 를 더했습니다. 1~3단계에서 보이는 토리 문장 수가 보낸 문장 수보다 적으면 null 을 돌려주고, 4단계부터는 뜻을 그대로 둡니다. |
| A | `src/server/conversation/turn.ts:1089-1099` · `:1127` | `shownTurnOf` 바로 뒤에서 흘릴 뜻(plan.ko)과 저장할 뜻(plan.toriKo)을 같은 판정으로 거릅니다. 1~3단계 판정은 `state.spec.cardShape === "turns"` 입니다. 저장값이 비므로 다시 흘리기(`replay`)와 이어 열기도 저장값을 따라 저절로 비게 됩니다. |
| B | `src/core/ai/calls/talk.ts:375` | lowBandRules 에 브리프의 한 줄을 더했습니다. "Levels 1-3: when Input is dont_know or stuck is true, write only a short encouragement in tori_en and tori_ko. Do not say the answer; the app plays it. Leave recast empty." 고정부가 바뀌므로 프롬프트 캐시는 한 번 새로 만들어집니다. |
| C | `src/core/conversation/flow.ts:901-912` · `:16` · `:917-918` | `normalizeSpoken` 이 일치율 정규화(`normalizeForMatch`)를 먼저 거쳐 줄임꼴을 펼친 뒤, 기존처럼 따옴표 · 문장부호 · 띄어쓰기를 지웁니다. 주석에 'C127 보완(2026-10-29)'만 적었습니다. `SAME_SAYING_MIN_WORDS` 주석에도 펼친 뒤 세 낱말이라 문턱 2 를 그대로 넘는다는 한 줄을 보탰습니다. |
| D | `src/server/conversation/turn.ts:399-401` | `toriPlanOf` 성공 길에서 아이 입력이 dont_know 이면 recast 를 null 로 둡니다. |
| E | `src/components/conversation/tori.tsx:359` | 설명 줄이 `fillName(explanation, englishName)` 을 거칩니다. |

## 2. 설계와 다르게 한 것과 이유

- **C 의 펼치기 표는 `normalizeForMatch` 를 그대로 불러 씁니다.** 표를 복사하지 않으려고 이렇게 했습니다. 이 함수는 숫자도 낱말로 바꾸므로 '2' 와 'two' 가 같은 말로 잡힙니다. 견주는 양쪽이 같은 정규화를 거치므로 판정은 대칭입니다. 같은 폴더의 `said.ts` 가 이미 이 함수를 불러 쓰고 있어 의존 규칙에도 걸리지 않습니다(check:deps 통과).
- **e2e 가짜 응답의 기본값(`tests/e2e/talk.ts:233`)은 바꾸지 않았습니다.** 기본 tori_ko 를 답이 든 문장으로 바꾸면 그 기본값을 쓰는 다른 e2e 가 모두 흔들립니다. 그래서 AC-15g 시험(`tests/e2e/conversation.spec.ts:314-325`)의 가짜 응답에만 넣었습니다. 1단계 처음 묻는 턴(답 두 개가 있는 턴)이면 tori_en "That's okay. Say, (카드 답 예시)" 와 tori_ko "괜찮아! '(카드 답 예시)' 라고 말해 봐." 를 줍니다. 토리 문장에 답이 들어 있어야 겹침 없애기가 그 문장을 빼고 판정이 걸리기 때문입니다. 답 예시 글자는 카드에서 읽고, 브리프의 'I am fine.' 꼴을 그대로 씁니다. 기존 단언 "main 글에 답 예시가 없다"(`:349-351`)가 회귀를 잡습니다.
- **통합 시험은 인사 턴에서 돕니다.** 1단계 인사 질문은 늘 처음 묻는 턴이라 답 두 개가 붙으므로, 브리프의 'I am fine' 예시와 같은 자리입니다. 답 글자는 카드의 인사 답 두 개 가운데 첫째에서 읽습니다.

## 3. 덮는 시험

먼저 쓰고 실패를 확인한 뒤 고쳤습니다. 고치기 전 단위 시험 실행에서 아래 다섯이 모두 실패했습니다(`expected 'im fine' to be 'i am fine'`, `toriKoShownOf is not a function`, `expected 'I am fine.' to be null`, 설명 줄 정규식 불일치, 시스템 글에 그 줄 없음).

- A: `tests/unit/talk-repeat.test.ts` "같은 말: 겹침 없애기가 토리 문장을 하나라도 뺀 1~3단계 턴은 뜻 줄을 흘리지도 저장하지도 않는다(결함 A)"
- A · D 통합: `tests/integration/conversation-session.test.ts` "회화 세션: 1단계 인사 '모름' 턴에 겹침 없애기가 토리 문장을 빼면 그 턴의 뜻 줄을 흘리지도 저장하지도 않고 recast 도 비운다(결함 A · D)". 흘린 줄에 ko 가 없는지, talk_turns 의 tori_ko · recast 가 null 인지, 이어 열기 화면 자료에 뜻이 없는지 봅니다. **로컬에서 돌리지 못했습니다.**
- A e2e: `tests/e2e/conversation.spec.ts` "AC-15g '잘 모르겠어요'를 누르면 1단계는 …"(가짜 응답만 바꿈, CI 몫)
- B: `tests/unit/conversation-call.test.ts` "회화 턴 규격: 1~3단계 고정부는 '모름' · 막힘 턴에 짧은 격려만 쓰고 답을 말하지 않으며 recast 를 비우라고 하고 4단계부터는 이 줄이 없다(결함 B)"
- C: `tests/unit/talk-repeat.test.ts` "같은 말: 줄임꼴(I'm · it's · that's · don't · you're · let's)은 펼친 꼴과 같은 말이다(C127 보완 2026-10-29, 결함 C)". 여섯 쌍과 굽은 따옴표, "Say, I'm fine." 이 'I am …' 답 두 개와 같은 말로 빠지는지 봅니다.
- D: `tests/unit/conversation-server.test.ts` "회화 서버: '모름' 턴(input dont_know)은 AI 가 recast 를 채워도 비우고 말한 턴은 그대로 둔다(결함 D)"
- E: `tests/unit/talk-bubble.test.ts` "AC-16b 말풍선 아래 설명 줄도 {NAME} 을 영어 이름으로 채워 보인다(결함 E)"

## 4. 관문(명령과 출력 요지)

모두 `export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH` 뒤에 돌렸습니다.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit`(덮는 네 파일) | 4 파일 · 80 통과 |
| `pnpm test` | 970 통과 · 3 실패 · 6 todo. 실패 3은 모두 `tests/unit/ci-workflows.test.ts` 입니다(아래 5절 1) |
| `pnpm lint` | Checked 436 files, No fixes applied |
| `pnpm exec tsc --noEmit` | 종료 코드 0 |
| `pnpm check:deps` | no dependency violations found (225 modules) |
| `pnpm test:int` | **돌지 못함.** 시험용 Postgres 초기화가 실패합니다 |

통합 시험이 돌지 못한 출력은 다음과 같습니다. 첫째는 셸 로캘(ko_KR) 때문이고, `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 로 넘겼습니다. 둘째는 커널 공유 메모리 한도 때문입니다. 명령 격리를 끄고 돌려도 같았습니다. 커널 설정(sysctl)은 시스템 상태를 바꾸는 일이라 손대지 않았습니다.

```
initdb: could not find suitable text search configuration for locale "ko_KR.UTF-8"
FATAL:  could not create shared memory segment: Cannot allocate memory
DETAIL:  Failed system call was shmget(key=36183705, size=56, 03600).
HINT:  This error usually means that PostgreSQL's request for a shared memory segment exceeded your kernel's SHMALL parameter.
```

이때 `kern.sysv.shmall` 은 1024 였고, 10-17 부터 떠 있는 p10 워크트리의 개발용 Postgres(포트 54331)가 공유 메모리 조각 하나를 쥐고 있었습니다. 그 프로세스는 다른 작업의 것이라 건드리지 않았습니다. 메모리 기록에도 이 Mac 에서는 통합 시험을 CI 에서만 돌린다고 남아 있습니다.

## 5. 남은 우려 · 범위 밖 관찰

1. **[관찰] `pnpm test` 의 실패 3건은 제 변경과 무관합니다.** 작업을 시작할 때부터 `.github/workflows/ci.yml` 이 바뀌어 있었습니다(CI 분 아끼기 작업의 미커밋 변경, 머리 주석 '분 아끼기(2026-10-29 …)'). `ci-workflows.test.ts` 가 그 파일을 읽습니다. 저는 그 파일을 고치지 않았습니다.
2. **[우려] 통합 · e2e 검증은 CI 를 기다립니다.** 메모리 기록상 11-01 전에는 CI push 를 하지 않기로 되어 있어, 통합 시험(A · D)과 e2e AC-15g 의 실제 결과는 그 뒤에 확인됩니다.
3. **[범위 밖] 토리 문장에 답이 없고 뜻 줄에만 답이 든 턴은 A 판정에 걸리지 않습니다.** 예를 들어 tori_en "That's okay!" 와 tori_ko "'I am fine.' 라고 해 봐." 의 조합입니다. 한글 발음으로 적은 답('아임 파인')도 같습니다. 지금은 B 의 지시 한 줄로만 줄입니다. 뜻 줄 자체를 검사하려면 설계 판단이 필요합니다.
4. **[범위 밖] 설명(explanation) 줄도 영어 답을 담을 수 있습니다.** AC-15g 대로 설명은 글로 보이므로, AI 가 설명에 답 문장을 쓰면 화면 글로 보입니다. 이번 고침은 설명을 거르지 않습니다.
5. **[관찰] 고치기 전에 저장된 토리 행은 tori_ko 에 답이 남아 있습니다.** 그런 세션을 이어 열면 예전 뜻 줄이 그대로 보입니다. 데이터 정리는 범위 밖이라 하지 않았습니다.
6. **[관찰] B 의 효과는 확률적입니다.** 단위 시험은 시스템 글에 그 줄이 있는지만 봅니다. 실제로 AI 가 답을 덜 쓰는지는 표본 호출이나 사용 시험으로 봐야 합니다.
7. **[관찰] 13절 C127 보완 줄은 아직 없습니다.** 브리프대로 코드 주석에만 'C127 보완(2026-10-29)'을 적었고, 정본은 고치지 않았습니다.

## fix round 1 (2026-10-29, 검토 task-talk-greeting-fix-review.md 3절)

상태: **DONE_WITH_CONCERNS**. 지적 셋을 모두 고쳤습니다. 고친 자리는 지시받은 세 곳뿐이고, 각 파일은 고치기 직전에 다시 읽었습니다.

### 고친 것
- **I-1:** `tests/integration/conversation-session.test.ts` 의 A · D 통합 시험에서 `startTalk` 바로 뒤에 `await viewOf(h, sessionId);` 를 더했습니다. 처음 스냅숏과 토리 행 1 이 먼저 들어가야 턴 길이 'stale' 로 끝나지 않습니다.
- **I-2:** `src/core/conversation/flow.ts` 의 `normalizeSpoken` 에서 일치율 정규화 결과를 이은 뒤 `.toLowerCase()` 를 거치게 했습니다. 이름 자리는 대문자 '{NAME}' 으로 돌아오는데, 이제 '{name}' 을 거쳐 고치기 전처럼 한 낱말 'name' 으로 남습니다. 까닭은 주석 한 줄로 적었습니다.
- **M-1:** 같은 통합 시험의 이어 열기 단언을 `expect(view.lastTori?.ko).toBeUndefined()` 로 바꿨습니다.

### 더한 시험
- `tests/unit/talk-repeat.test.ts` "같은 말: 이름 자리 {NAME} 은 줄임꼴을 펼쳐도 한 낱말 'name' 으로 남는다(검토 fix 1 I-2)"
  - `normalizeSpoken("Yes! My name is {NAME}.")` 이 "yes my name is name" 인지 봅니다.
  - 선생님 자기소개 "Hi, my name is Mina." 가 답 두 개('Yes! My name is {NAME}.' · 'Hi! My name is {NAME}.')로 잡히지 않는지 봅니다.
  - 질문 'Hi! Are you {NAME}?' 가 토리 문장 "Hi!" · "Are you ready?" 와 함께 와도 붙일 줄로 남는지 봅니다.

### 관문

| 명령 | 결과 |
|---|---|
| 덮는 단위 시험 다섯 파일(talk-repeat · conversation-call · talk-bubble · conversation-flow · talk-hold) | 5 파일 · 90 통과 |
| `pnpm test` | 990 통과 · 3 실패 · 6 todo. 실패 3은 모두 `tests/unit/talk-child-listen.test.ts` 입니다 |
| `pnpm lint` | 오류 1. `src/server/conversation/turn.ts:23` 의 client-listen 가져오기 이름 순서입니다 |
| `pnpm biome check`(제가 고친 여섯 파일) | No fixes applied |
| `pnpm exec tsc --noEmit` | 종료 코드 2. 오류는 `src/server/conversation/index.ts:678`(ClientListenSchema 없음), `tests/unit/conversation-server.test.ts:737` · `:747`, `talk-child-listen.test.ts`, `talk-listen-log.test.ts` 에 있습니다 |
| `pnpm check:deps` | no dependency violations found (227 modules) |
| `pnpm test:int` | 돌리지 않았습니다. 본 보고 4절처럼 이 Mac 에서는 시험용 Postgres 가 뜨지 않습니다 |

### 남은 우려
1. **lint · tsc · `pnpm test` 의 실패는 모두 같은 워크트리에서 진행 중인 다른 구현(impl-talk-speech-fix)의 미완성 변경에서 납니다.** client-listen 모듈, 듣기 기록 시험, child-turn 의 아직 없는 내보내기(`silentListenOf` · `speechStoppedAt`)가 그 예입니다. `conversation-server.test.ts:737` · `:747` 도 그 구현이 더한 듣기 기록 자료이고, 제 D 시험(같은 파일 820행 근처)은 통과합니다. 지시대로 그 파일들은 손대지 않았으므로, 두 구현이 합쳐진 뒤 관문을 다시 돌려야 합니다.
2. **I-1 로 고친 통합 시험은 여전히 로컬에서 한 번도 돌지 않았습니다.** CI 에서 처음 확인됩니다.
