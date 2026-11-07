**판정: Approved(CI 18차 e2e 초록 조건) — 지난 지적 I-1 · I-3 · M-1 · M-2 · CI-17 모두 ADDRESSED, 새로 깨뜨린 것 없음, 새 Minor 4 · 확인 못 한 것 ⚠️ 2.**

# 재검토: 회화 느낌 고침 fix 1 + 덧 둘 — 범위 한정 (rev-p13b · code-reviewer · Opus · xhigh · 2026-10-23 07:xx)

대상: 워크트리 p13 의 `dc82db2..0007b1d`(CI 18차 스냅숏, 커밋 하나). `git -C …/p13 diff dc82db2 0007b1d` 와 `git show 0007b1d:<경로>` 로만 읽었다. p13 작업 트리에 다른 작업의 커밋 안 된 수정이 있으나 커밋 기준이라 영향 없다. 시험은 다시 돌리지 않았다(CI 18차 결과로 갈음).
근거: 브리프 `task-p13-review-feel-fix1-code.md`, 구현 보고 `task-p13-report.md` '회화 느낌 고침 fix 1'(1280줄~) · 'fix 1 덧'(1337줄~) · 'fix 1 덧 2'(1352줄~), 정본 13절 C127(`specs/10-결정-기록.md` 끝 행) · 6절 회화 턴 스키마 문단(`specs/05-AI-호출.md:56`) · C125 · 8절 '회화 턴 실패'(`specs/07-음성과-오류.md:58`), 지난 보고 `review-p13-feel-code.md`.

## 1. 지난 지적 — 닫힘 · 아직 열림

| 번호 | 판정 | 근거 |
|---|---|---|
| I-1 짧은 줄 지나치게 뺌 | **닫힘(ADDRESSED)** | `holds` 가 '들어 있음'을 찾는 쪽 두 낱말 이상일 때만 쓰고, 한 낱말이면 정규화 문장 전체가 같을 때만 같은 말로 본다(`src/core/conversation/flow.ts` `SAME_SAYING_MIN_WORDS = 2` · `holds`). 같은 `holds` 를 `sayingAnswer` 와 `shownTurnOf` 의 `heard` 가 함께 쓴다. 칭찬 대사(`praise`)는 답 두 개 줄과 함께 늘 남긴다(`shownTurnOf` 의 `line.kind === "praise"`). 문턱 2 는 C127 이 정한 값이고 까닭('I'm good' 이 정규화하면 두 낱말)이 상수 주석에 있다. 단위 넷(`tests/unit/talk-repeat.test.ts` — 지난 보고 (a) 'Yes.'/'No.' 반응 남음 · (b) 'Good!' 칭찬 남음 · (c) 세 낱말 답 안의 'Yes!' 남음 · (d) 똑같은 한 문장은 빠짐)이 지난 견본 꼴을 그대로 단언한다 |
| I-3 막힘 쪽 짝이 첫 문장을 늦춤 | **닫힘(ADDRESSED)**, 실제 모델의 칸 차례는 ⚠️ | 출력 규격에서 `stuck` 을 `tori_en` 앞으로 옮겼다(`src/core/ai/calls/talk.ts` `talkWire` · 느슨한 규격 · `normalizeTalk` 두 갈래). 흘려 받기는 앞 칸 stuck 을 한 번 읽고(`src/core/conversation/stream.ts` `after-stuck-key` → `stuck-value` → `after-stuck-value`) 첫 문장을 내기 전에 `onStuck` 을 부른다(`src/server/ai/talk.ts:305-312` — 같은 조각의 문장보다 먼저). 턴 길은 `createAnswerHold` 로 짝 하나만 본다 — '모름' 입력이면 처음부터 지금 질문 짝, 아니면 stuck 참 → 지금 질문 짝 · 거짓 → 다음 질문 짝(`src/server/conversation/turn.ts:962-985`). 짝을 고르는 자리(`stuckAfter` · `afterBase`)가 계획의 `afterOf(v.stuck)` 와 같은 인자로 만들어져 잡는 짝과 붙이는 답 두 개가 어긋나지 않는다. 단위 `tests/unit/talk-hold.test.ts` 첫 사례가 지난 보고의 "I'm good too!" 를 stuck 거짓에서 곧바로 내보내는지 단언한다. ⚠️ 실제 모델이 회화 턴 규격에서 stuck 을 먼저 내는지는 증명되지 않았다(`task-p13-report.md:1411` — 계약 명령의 회화 사례는 작은 시험 규격). 차례를 어겨도 흘려 받기는 예전처럼 돌고 잡기만 다음 질문 짝으로 보므로 깨지지는 않는다 |
| M-1 시도 기록 실패가 턴을 바꿈 | **닫힘(ADDRESSED)**, 남은 한 자리는 N-4 | `keepTurnOnRecordFailure` 가 시도 기록과 같은 오류 알림을 따로 감싸 DB 실패를 `dbErrorTag`(이름 · 코드만 — `src/server/db/safe-error.ts:14`) 한 줄로 남기고 던지지 않는다(`src/server/ai/talk.ts:584-595` · `:716-731`). 끝맺음 턴도 같은 `runTalkCall` 이라 함께 덮인다. 단위가 23503 오류에서 응답 · 흘려 보낸 문장이 그대로이고 기록 줄에 아이 글 · 토리 글이 없음을 단언한다 |
| M-2 '홈' e2e 가 서버 턴 끝을 안 기다림 | **닫힘(ADDRESSED)** | 시험 끝에서 그 세션 토리 행이 하나 늘 때까지 DB 를 poll 한다(`tests/e2e/conversation.spec.ts:478-481`, 시간 한도 30초 — 가짜 응답 7.2초보다 넉넉함). 목표 턴 전의 '홈'은 세션을 닫지 않으므로(`src/components/conversation/talk-frame.tsx:621-622`) 서버가 토리 행을 저장해 poll 이 끝난다 |
| CI-17 AC-15g e2e 둘 | **코드는 닫힘(ADDRESSED)**, ⚠️ CI 18차 e2e 결과 대기 | CI 17차에서 빨강이던 둘은 `conversation.spec.ts` 의 AC-15g 두 시험(no-speech 가 이어져 '모름'과 같이 · 'I don't know' 턴)이었다(run 39838603341 실패 기록, 2 failed · 138 passed). 기대 끝말을 `dontKnowTailOf` 로 바꿨다 — 처음 묻는 턴이면 [같은 질문, 답 두 개 줄], 아니면 [답 예시, 같은 질문](C125 우선순위 · AC-15g 새 문구와 같음). 끝에서 n 개만 보므로 시험 카드의 답 예시가 ①과 달라도 깨지지 않는다 |
| I-2 설정 키 DB 적재 | 아직 열림(컨트롤러 몫 — 배포 때 닫힘) | 이 diff 범위 밖. 브리프대로 미리 돌림은 끝났고 배포 전 적재가 남았다 |
| M-3 뜻 줄 | 아직 열림(장부) | 이 diff 범위 밖 |

## 2. 새로 볼 것

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 1 stuck 먼저 칸 차례 | ✅(N-1 · N-2) | **끝맺음 칸(C21)**: 끝인사 → 잘한 말 → 다음엔 이렇게 → 요약의 서로 차례는 그대로이고 stuck 만 맨 앞으로 갔다. 끝맺음 정규화도 `stuck: false` 를 맨 앞에 둔다. **느슨한 규격**: Zod 객체라 칸 차례가 풀이에 영향이 없다. **가림 · 6.4 검사 · 저장 글**: 검사 칸 목록(`talkCheckFields`)과 저장(`sentSentences` · `toriTextOf`)이 칸 차례를 쓰지 않는다. **따옴표 · 이스케이프 · 끊김**: stuck 은 tori_en 열쇠 앞 단계에서만 읽고, tori_en 문자열 안은 `string` · `escape` 단계라 열쇠 풀이가 다시 일어나지 않는다 — tori_en 안의 `\"stuck\":true` 글로 stuck 을 잘못 읽는 길이 없다. stuck 글자 도중 끊기면 stuck 은 모르고 문장도 없어 첫 문장 전 실패 길이다. 두 번째 stuck 열쇠 · stuck 뒤 tori_en 이 아닌 열쇠 · 참 거짓이 아닌 값은 모두 failed(단위 `conversation-stream.test.ts` 새 사례 넷) |
| 2 `createAnswerHold` 짝 고르기 | ✅ | **'모름' 입력**: `dontKnow` 면 처음부터 지금 질문 짝이고 stuck 은 무시한다 — '모름'의 다음 자리는 `afterBase` 자체라(`dontknow_max` 번째 '모름'이면 다음 질문 짝이 되어 계획과 같음) 맞다. **말소리 없음 두 번**: 화면이 `mode: "dont_know"` 로 보내므로(`src/components/conversation/child-turn.tsx:255-262`) '모름'과 같은 길이다. **4단계부터**: 답 두 개는 1단계 처음 묻는 턴만 있어 짝이 비고 아무것도 잡지 않는다(단위 마지막 사례). **더 이야기하기 · 고르기 자리**: `pairOf` 가 `awaitingChoice` 면 짝을 비운다 — 그 자리에서 앱은 답 두 개 대신 더 이야기할지 묻는 말을 붙이므로 맞다 |
| 3 새 회귀 | ✅(⚠️ e2e) | CI 18차(run 39863411233, 0007b1d)는 이 보고를 쓸 때 unit · integration · build · lint · check-ids · spec-trace · seed-validate · depcruise · bundle-secrets 가 성공, e2e · e2e-local 은 도는 중이었다. 견본 여덟의 칸 차례 고침은 같은 응답의 칸 자리만 옮겼다(값 그대로). e2e 이름은 바뀌지 않았다 |

## 3. 새 지적(모두 Minor)

| 번호 | 심각도 | 무엇 | 왜(근거) | 어떻게 |
|---|---|---|---|---|
| N-1 | Minor | 흘려 받기가 실패해 응답 끝에서 한 번에 내보내는 길(위험 3)은 `onStuck` 을 부르지 않는다(`src/server/ai/talk.ts:478-485` — `splitSentences(toriEn)` 만 `emit`). 그 길에서는 잡기가 다음 질문 짝으로 보아, 끝 값이 stuck 참이면 지금 답이 든 'You can say, I'm good.' 이 나가고 앱이 같은 답 ①② 를 또 읽는다 | C125 (3) '한 턴에 같은 말을 두 번 읽지 않음'. 이 길은 응답 전체를 이미 받은 때라 stuck 을 알 수 있다 | 끝에서 한 번에 내보내기 전에 `prepared.stuck` 이 참 · 거짓이면 아직 알리지 않았을 때 `onStuck` 을 부른다. 단위 '첫 속성이 tori_en 이 아니면 …' 사례(`tests/unit/talk-stream-call.test.ts:273`)에 stuck 참 꼴 하나 |
| N-2 | Minor | 6절 회화 턴 표 행이 아직 '첫 속성은 토리의 영어 말(tori_en)이다 … 둘째 속성은 한국어 뜻(tori_ko)이다'라고 한다(`specs/05-AI-호출.md:54`). 같은 장 :56 의 C127 문장(stuck 을 tori_en 앞에)과 어긋난다. 단위 이름 둘도 '첫 속성이 tori_en 이 아니면'이다(`tests/unit/conversation-stream.test.ts:115` · `talk-stream-call.test.ts:273`) | 13절 C127 이 칸 차례를 바꿨다. 정본 한 장 안에 두 차례가 함께 있으면 다음 구현자 · 검토자가 옛 차례를 따를 수 있다 | 표 행을 'stuck 다음 tori_en(C127) … 다음 tori_ko' 꼴로 고친다(컨트롤러 정본 편집). 단위 이름은 '앞 칸이 stuck · tori_en 이 아니면'으로 |
| N-3 | Minor | `dontKnowTailOf` 를 `spokenTail` 의 문서 주석과 함수 사이에 끼워 넣어, '토리가 마지막으로 읽은 말 n 개 …' 주석이 새 함수 주석 위에 떨어져 남았다(`tests/e2e/conversation.spec.ts:1653-1657`) | `spokenTail` 이 설명을 잃고 주석 둘이 겹친다 | 옛 주석을 `spokenTail` 바로 위로 옮긴다 |
| N-4 | Minor(M-1 남은 자리) | 하루 안전 상한 닫힘의 시도 기록은 감싸지 않았다(`src/server/ai/talk.ts:663` `await insertAiCall`). 그 쓰기가 실패하면 `safety_cap` 대신 서버 실패 길이 된다 | M-1 의 뜻(기록 한 행의 실패가 아이 턴의 길을 바꾸지 않음)과 같은 꼴. DB 가 아플 때만 나는 드문 길이다 | 같은 `keepTurnOnRecordFailure` 로 감싼다 |

## 4. 확인 못 한 것(⚠️)

- **실제 모델의 칸 차례.** 구조화 출력이 규격의 속성 차례를 따른다는 데 C127 이 기댄다. 프리뷰 첫 회화 턴에서 서버가 stuck 을 첫 문장 전에 받았는지 한 번 보면 닫힌다. 잴 수 있게 하려면 준비 시간 기록 줄에 'stuck 먼저 받음 참 · 거짓' 한 칸을 두는 길이 있다(장부 '구현하며 확인할 것').
- **CI 18차 e2e.** 이 보고를 쓸 때 e2e · e2e-local 이 도는 중이었다. AC-15g 둘과 '홈' 시험이 초록이어야 위 판정이 선다.

## 5. 라운드 판정

**Approved(CI 18차 e2e 초록 조건).** 지난 Important 둘(I-1 · I-3)과 Minor 둘(M-1 · M-2), CI-17 이 닫혔고 새로 깨뜨린 것이 없다. 새 지적 넷은 Minor 라 컨트롤러가 직접 다듬어도 되는 크기다. fix 라운드는 이번이 1회째다.

다듬기 한 줄: N-1 끝에서 한 번에 내보내는 길에서도 `onStuck` 먼저 · N-2 6절 표 행 '첫 속성' 문장과 단위 이름 둘 · N-3 e2e 주석 자리 · N-4 안전 상한 기록 감싸기 · ⚠️ 프리뷰 첫 턴에서 stuck 먼저 확인.
