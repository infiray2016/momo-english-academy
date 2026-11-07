**라운드 판정: Approved(CI 12차 e2e 초록을 조건으로) — fix 1 지적 셋(I-1 · I-2 · I-3) ADDRESSED, 브리프 밖 C22 셈 고침 받아들임, fix 1b(시험 파일 하나)가 CI 10차 e2e 실패 다섯의 까닭 둘(G-1 · G-2)을 닫음. 새 지적은 Minor 셋(다시 읽기 시험의 결정성 · 긴 e2e 시간 · 안전 상한 끝맺음 단언 없음). CI 12차(34fbfa5)는 이 보고를 쓸 때 대기 중이었다(⚠️).**

# 재검토: P13b 차례 6 fix 1 — 코드(rev-p13b · code-reviewer · Opus · xhigh, 2026-10-23 00:xx, 범위 한정)

대상: CI 가지 `ci/p13-c1` **34fbfa5**(= 작업 트리, b2997ab 과는 `tests/e2e/conversation.spec.ts` 하나 차이 +44 −23). 변경은 `git diff a866ba0 34fbfa5` 와 `git show <커밋>:<경로>` 로만 읽었다(처음 판은 b2997ab 기준이었고 fix 1b 를 더해 고쳐 썼다).
근거: 검토 `review-p13-6-code.md`(I-1 · I-2 · I-3), 구현 보고 `task-p13-report.md` '차례 6 fix 1' 절, plan-p13b 증명 표(`plan-p13b-…md:156-178`), 정본 7절 오류 행 · 13절 C22(`specs/10-결정-기록.md:172`) · 12절 speech.silent_items_max(`specs/09-설정값.md:85`) · talk.nospeech_dontknow_count(`:74`).

## 0. CI

| 실행 | 결과 |
|---|---|
| 11차 run 39802523013(b2997ab) | 통합 초록(I-3 확인) 뒤 취소(컨트롤러 — fix 1b 로 갈아탐) |
| 12차 run 39803686270(34fbfa5) | 대기 중 — e2e 초록이 이 판정의 조건 |
| 10차 run 39798442322(a866ba0) e2e | **5 실패 · 115 통과(21.6분)** — 아래 G-1 · G-2. fix 1 diff 는 시험 파일 머리의 가져오기와 끝에 더한 시험뿐이라 이 다섯 자리(`conversation.spec.ts:718` · `:1044` · `:1170` · `:1323` · `:1452`)가 그대로다 |

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| **I-1** 정리의 따라 말하지 않는 장이 다시 읽기 뒤 멈춤 | **ADDRESSED**(⚠️ 시험이 결정적이지 않음 — 3절) | 말풍선 다시 읽기의 끝에서도 `read` 를 세운다(`follow-along.tsx:763-766` — `say(...).then(ok => ok && setRead(true))`). 처음 읽기가 세대 바뀜으로 `false` 가 되어도 다시 읽기가 끝나면 `!follow && typed && read` 가 선다. e2e '회화 정리: 끝인사를 읽는 중 말풍선을 눌러 …'(`conversation.spec.ts:2050`)가 첫 장 열림과 끝인사 두 번 읽힘을 단언한다 |
| **I-2** 증명 표 e2e 열 개 | **ADDRESSED** | plan-p13b 증명 표의 e2e 이름 36 과 시험 이름을 다시 대조했다 — 빠짐 0(스크립트, b2997ab). 열 개는 `conversation.spec.ts:1607 · 1674 · 1715 · 1743 · 1795 · 1894 · 1938 · 1962 · 1983 · 2015`. 각 시험이 이름의 뜻을 단언한다: 위 띠 수 오름 · 목표 턴 고르기 · '더 이야기할 거리' · talk.more_talk_round_turns 뒤 다시 묻기(1607) / no-speech talk.nospeech_dontknow_count 번째에 '모름' · 답 예시 · 같은 질문 · 위 띠 그대로 · talk.dontknow_max 뒤 다음 질문 · 아이 행 dont_know(1674) / 막힘 말 뒤 답 예시 → 같은 질문 · stuck_phrase(1715) / 넘긴 질문 다시 묻기 → '더 이야기할 거리'로 목표 턴(1743) / 다지기에서 ①② 없음 · said_words 가 힌트 없음 · 뜻만 연 턴만 · hint_kind 넷 · heard_help(1795) / '막히면 눌러요' 한 번 · notices_seen · 새 브라우저 문맥(다른 기기)에서 없음(1894) / re_ask 카드인데 처음 만난 단어면 ①② · 'Or' 줄(1938) / {NAME} 이 영어 이름으로 채워지고 회화 화면에 틀 글 · 한글 이름 없음 · 홈 제목 한글 이름(1962) / 말소리 없이 넘어간 질문 speech.silent_items_max 번째에 막힌 안내 · 알림 speech_silent · 세션 진행, 그 전에는 막힘 없음(1983) / 한 질문 no-speech 여섯 번 뒤 다음 질문 · 막힘 없음 · mic_stalled · speech_silent 알림 없음(2015) |
| **I-3** 통합 견줌 | **ADDRESSED** | en · ko 로 좁힌 견줌(`conversation-session.test.ts:761-768`). CI 11차 통합 초록 |

## 2. 브리프 밖 고침 — C22 셈(`silentCountStep`) 판정: **받아들임**

- **결함이 맞다.** 옛 틀은 말소리 없는 '모름'을 보낼 때마다 셌다(a866ba0 `talk-frame.tsx` `onChildSend` — `silentQuestions += 1`). 시험 값(talk.nospeech_dontknow_count 2 · talk.dontknow_max 3 · speech.silent_items_max 3)으로는 한 질문의 no-speech 여섯 번('모름' 셋)만에 막혔다. 정본 C22 · 7절 오류 행은 'no-speech 로만 끝난 **질문**(회화에서 '모름'으로 넘어간 질문)이 같은 세션에서 speech.silent_items_max 개 이어지면'이다. AC-N3 둘째 증명('한 질문에서 no-speech 가 여섯 번이어도 … 멈추지 않고 다음 질문으로')이 옛 셈에서는 빨강이 난다 — 증명 표를 채우려면 필요한 고침이었다.
- **새 셈이 정본과 맞다.** 보낼 때 말한 턴이면 0, 말소리 없음 '모름'이면 그 질문을 '말소리 없음', 단추 '모름'이 끼면 '섞임'. 끝 줄에서 '모름' 뒤 `dontKnowCount` 가 0 이면(질문이 바뀌면 0 — 회11 (6)) 질문이 넘어간 것으로 보고, 말소리 없음뿐이었으면 하나 더, 섞였으면 0. 막힌 안내 · 알림은 끝 줄에서 낸다(`talk-frame.tsx` `countSilent`). 단위 둘이 '한 질문 여럿 → 하나' · '말한 턴 · 단추 모름이 낀 질문은 처음부터'를 단언한다(`tests/unit/talk-bubble.test.ts:227` · `:239`).
- **설정 키.** 상한은 `view.settings.silentItemsMax`(speech.silent_items_max), 말소리 없음 → '모름'은 아이 차례의 talk.nospeech_dontknow_count 그대로. 새 숫자 없음.
- 남는 것(Minor, 다듬기): 셈은 틀이 그려진 동안만 이어진다(쪽을 다시 열거나 stale 뒤 새 판으로 다시 그리면 0). C22 의 '같은 세션에서'보다 짧게 끊길 수 있다 — 막힌 안내가 늦어질 뿐 잘못 막지는 않는다. 장부로 넘겨도 된다.

## 3. 구현자 우려 — 결정적으로 할 길

1. **정리 다시 읽기 시험**(`:2050`)은 '처음 읽기 중에 누름'을 읽어 주기 1.5초(`SLOW_UTTER_MS`)라는 시간에 맡긴다. CI 가 느려 끝인사가 보인 뒤 누르기까지 1.5초를 넘기면, 고치기 전 코드로도 지나는 시험이 된다(처음 읽기가 끝나 `read` 가 이미 섰으므로). 결정적으로 하는 길 둘:
   - **선 위 검증 하나**: 가짜 읽어 주기가 끊긴 발화를 기록하게 하고(`fake-web-speech.ts` `cancel()` 의 `interrupted` 자리에서 `record.interrupted.push(text)`), 시험이 '끝인사의 첫 읽기가 끊겼다'를 단언한다. 그러면 시간이 어긋난 실행은 거짓 초록이 아니라 빨강(길을 지나지 않음)이 된다.
   - **시간 조건 없애기**: 가짜 대본의 발화 길이를 글로 고르게 한다(지금은 차례 번호로만 — `pump` 의 `utteranceRuns[utteranceIndex]`). 예: `utterances: [{ textIncludes: farewell, endAfter: 20000 }, { endAfter: 30 }]` 로 끝인사의 첫 읽기만 길게 하면, 누름이 늘 읽는 중에 닿고 시험 전체는 빠르다.
2. **긴 e2e 둘(20 · 24 턴)**: 턴마다 가장 긴 몫은 인식 확인 talk.confirm_seconds(2초 — 'I like it.'은 들려준 답과 안 맞아 기다림)다. plan 위험 10 의 길대로 그 시험 안에서 `withHouseholdSetting("talk.confirm_seconds", 0.2)`(또는 들려준 답 · 연 영어 문장과 맞는 인식 글로 바로 보냄)을 쓰면 턴당 2초가 준다. 위 띠 시험은 talk.more_talk_round_turns 를 그 시험 값으로 줄이고 단언도 그 값에서 읽으면 다섯 턴이 더 준다. 지금 제한(300초)을 늘리는 것보다 낫다.

## 4. CI 10차 e2e 실패 다섯과 fix 1b(`git diff b2997ab 34fbfa5` — 시험 파일만)

| 번호 | 까닭(CI 10차) | fix 1b | 판정 |
|---|---|---|---|
| G-1 | `getByRole("button", { name })` 가 기본 부분 일치라 '다음'이 '다음 이야기'를, '힌트'가 '힌트 문장 듣기'를 함께 잡음(`:718` · `:1170` · `:1323` — 셋) | 회화 e2e 의 '힌트' · '다음' · '홈' 찾기 23 곳에 `exact: true`. 남은 부분 일치 찾기는 '다음 이야기' 둘뿐이고 그 이름의 단추는 하나다. fix 2 가로 시험의 `while (await hint.isEnabled())`(문장 단 글이 늦게 오면 두 단추를 잡던 시간 문제)도 함께 닫혔다 | **ADDRESSED**(⚠️ CI 12차) |
| G-2 | `turnRequests()` 가 끝맺음 요청까지 셈 — 끝맺음 본문의 앞 턴 짝에 'Closing: no' 줄이 있음(`:1044` · `:1452` — 둘) | 본문에 `\nClosing: yes` 가 든 요청을 뺀다(`conversation.spec.ts:136-144`). 이 표지는 통합 · e2e 의 가짜 규칙이 끝맺음 응답을 고르는 같은 글이다. 회화 턴 요청에는 이 글이 없다 — 고정부의 설명은 `When 'Closing: yes', …`(`src/core/ai/calls/talk.ts:352`)라 줄바꿈 뒤가 아니고, 사용자 메시지의 `Closing:` 줄은 그 턴의 값(회화 턴은 no, `:457`)이며 앞 턴 짝도 모두 no 다. 그래서 회화 턴 요청이 셈에서 잘못 빠지지 않는다 | **ADDRESSED**(⚠️ CI 12차) |

**끝맺음을 셈에서 빼며 e2e 가 '응답 뒤 끝맺음'을 보지 않게 된 것 — 받아들인다.**
- '그만하기' 뒤 끝맺음은 통합 AC-8c('끝맺음 턴은 그만하기 응답 뒤에 talk_closing 최대 출력으로 불리고 그만하기 응답은 끝맺음을 기다리지 않는다', `conversation-session.test.ts`)와 AC-15f(요약 저장)가 증명 표의 증명이다(`plan-p13b-…md:160` · `:174`). e2e 증명 이름에 끝맺음 요청은 없다. CI 10차의 '+1'은 그것이 실제로 나갔다는 우연한 관찰이었을 뿐 단언이 아니었다.
- 다만 **대화 안전 상한 뒤 끝맺음(응답 뒤)은 어디서도 단언되지 않는다**(Minor F-3 — 아래). 통합 AC-15j 는 닫힘 줄 · AI 턴 없음 · 알림만 보고 응답 뒤 할 일을 비운다(`conversation-turn.test.ts` — `h.tasks.length = 0`). 회화 수업 모델 5 표가 '응답 뒤(제안)'로 정한 길이다.

## 5. 새 지적(fix 1 · 1b 자리, 모두 Minor)

| 번호 | 무엇 | 왜 | 어떻게 |
|---|---|---|---|
| F-1 | 정리 다시 읽기 시험(`conversation.spec.ts` '회화 정리: 끝인사를 읽는 중 …')이 '처음 읽기 중 누름'을 읽어 주기 1.5초에 맡긴다 | CI 가 느리면 고치기 전 코드로도 지나는 시험이 된다(3절 1) | 3절 1 — 가짜 읽어 주기의 끊긴 발화 기록 + '첫 읽기가 끊겼다' 단언, 또는 끝인사 첫 읽기만 길게(글로 고르는 발화 길이) |
| F-2 | 긴 e2e 둘(20 · 24 턴)이 인식 확인 2초를 턴마다 기다린다 | 시간 제한(300초)에 닿을 수 있다(3절 2) | 그 시험 안에서 talk.confirm_seconds 시험 값 · talk.more_talk_round_turns 를 줄이고 단언도 그 값에서 |
| F-3 | 대화 안전 상한 닫힘 뒤 끝맺음이 응답 뒤에 한 번 나간다는 단언이 없다 | 4절 — e2e 는 셈에서 뺐고 통합은 할 일을 비운다 | 통합 AC-15j 에서 마지막 닫힘 뒤 `h.tasks` 하나 · 돌리면 끝맺음 요청 하나(`requestsOf(h, CLOSING_MARK)`)를 단언 |

## 6. 라운드 판정

**Approved**(CI 12차 e2e 초록을 조건으로). fix 1 의 셋 · fix 1b 의 둘이 닫혔고 C22 셈 고침은 정본과 맞다. 새 Minor 셋(F-1 · F-2 · F-3)은 시험 다듬기라 컨트롤러가 직접 다루거나 장부로 넘길 수 있다. 차례 6 의 fix 라운드는 1 회째(fix 1 + 1b)다.

fix · 장부 한 줄: F-1 정리 다시 읽기 시험에 '첫 읽기가 끊겼다' 단언(가짜 읽어 주기 `interrupted` 기록) 또는 끝인사 첫 읽기만 길게 · F-2 긴 e2e 둘에 talk.confirm_seconds · talk.more_talk_round_turns 시험 값 · F-3 통합 AC-15j 에 안전 상한 뒤 끝맺음 한 번 단언 · (다듬기) C22 셈이 틀이 다시 그려지면 0 부터인 것.
