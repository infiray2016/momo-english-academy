# 코드 검토: P11a 차례 2 — 세션 서버 · 대기열 · 틀 · 읽기 · 결과 틀(검토 묶음 A2) — code-reviewer rev-p11(Opus · xhigh, 2026-10-18 07:xx)

대상: 워크트리 `.claude/worktrees/p11`(HEAD 7794633 — P10 fix 8 합침 뒤) 작업 트리의 변경 15 · 새 파일 11. 대조: 검토 브리프 `task-p11-review-2-code.md`(컨트롤러 결정 셋), 구현자 보고 `task-p11-report.md` '차례 2', plan-p11a 값 5~10 · 위험 2 · 3 · 4 · 9 · 증명 표, 정본 4절 읽기 세션 · 세션 결과 행 · 3.3 읽기 · 3.7 · 5절 · 7절 네트워크 행 · 8절 네트워크 끊김 · 같은 프로필 동시 사용, 13절 C72 · C76 · C77 (1) · C78.
직접 돌린 것: `pnpm check:deps`(위반 0) · `pnpm check:ids`(design-number 35, 차례 2 파일에서 나온 줄 0 · code-setting-unknown 0 · fixture-setting 0) · `pnpm check:bundle`(위반 0) · 시험 이름 일곱(통합 '세션 바탕:' 넷 · AC-2c · 단위 '대기열:' · e2e AC-3a)을 plan 증명 표 글자와 기계 대조(일곱 모두 같음, 지어 붙인 AC 없음). 단위 · 통합 · e2e 는 다시 돌리지 않았다(CI 1차 run 39072933388 전부 성공, 구체적 의심 없음).

## 판정: Approved — Critical 0 · Important 0 · Minor 1

## 1. 설계 준수

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 값 5 시도 낱낱 검사 · 거부 | ✅ | `src/server/session/index.ts` `saveSessionAttempts`(550~): 묶음은 시도 id 글만 보고, 시도마다 겉꼴 · `parseAttemptInput` · `inputFitsActivity` · 활동 번호 범위 · `needsAiPath` 를 보아 그 id 만 `rejected`. 진행 · 남의 세션이 아니면 받은 것으로 치고 버림(위험 10 그대로) |
| 서버 채점이 정본 · 화면 점수 무시 | ✅ | 받은 시도마다 `appActivityResult` 로 score · word_results · word_count 를 씀. 점수 칸을 붙인 시도는 strict 꼴에서 거부(다르게 한 것 2 — '받지 않는다'를 더 엄하게 지킴, 통합 첫 사례가 증명). 빈 단어별 정오는 칸을 비움(JSON null 안 넣음, 제약) |
| AI 활동 끝 시도는 이 길로 안 받음 | ✅ | `needsAiPath`(354~): 앱 판정이 아닌 단계의 질문 답 끝 시도는 `skipped` 가 있을 때만(c 값 3). b · c 종류는 시도 꼴에 없어 꼴에서 거부(다르게 한 것 3 — 까닭 맞음) |
| `finishLessonSession` | ✅ | 한 트랜잭션 · `FOR UPDATE` · 끝 시도 빠지면 `incomplete` + `missing` · `sessionScoreOf`(영역별 입력, 활동 점수는 저장된 score) · 말하기만 `englishSentencesOf`(읽기 · 쓰기 0 — 열이 NOT NULL default 0, 다르게 한 것 4) · `learningDayOf(now, app.*)` · `WHERE status = 'in_progress'` · 끝난 세션 already · 남의 · 없는 세션 not_found · 중단 closed. 끝 시도가 둘이면 먼저 저장된 것(다르게 한 것 5 — 3.7 '첫 시도'와 같은 결) |
| `loadSessionView` | ✅ | `resumePointOf(activities, finalActivityNos(rows))`, config(speech · ui · speaking · 그 구간 answer_max_seconds) · 동음이의어 · 원형 표 · appJudged · answerShapes · showKo. 만난 단어는 `parseAttemptInput` 으로 P10 시도 · 새 꼴 둘 다 읽음 |
| 활동 모델 한 인자 꼴 · 상수는 core | ✅ | `src/core/session/preview.ts` 두 인자 덧붙임 지움. 서버 `sessionContextOf`(281~)가 part · thinkout(설정) · confirmQuestions(규격)를 채움. `ATTEMPTS_PER_BATCH_MAX` · `INPUT_JSON_MAX` 는 `@/core/session/attempt` 에서(서버 두 벌 없어짐) |
| 값 6 대기열 | ✅ | `src/lib/attempt-queue.ts`: `queueBatches` 50개씩 · 앞 묶음 실패면 남은 묶음은 다음에 · accepted ∪ rejected 지움 · warn 은 수만 · `queueFinals`. 넣기는 저장소에 바로 쓰고 보냄(`add` 의 `save` 가 첫 await 앞) |
| 값 6 활동 안 입력 | ✅(Minor 하나) | `src/lib/session-input.ts` 키 `momo.session-input.v1` · 못 쓰면 메모리 · 끝 시도 때 그 활동, 끝내기 성공 때 세션 전체를 지움. 이 기기에서 끝내지 않은 세션의 줄이 남는 틈(M-1) |
| 값 7 틀 | ✅ | `session-frame.tsx`: 조각은 `onDone` 하나 → 끝 시도 → 끝 시도 없는 가장 앞 활동(서버 finals ∪ 대기열 finals), 마지막 뒤 idle · flush → `finishSession` → incomplete 한 번 더 → 이 기기에도 없으면 빠진 활동으로(컨트롤러 결정 3) · 그 밖 실패는 7절 끊김 문장(끊겼을 때)이나 C72 '지금은 저장할 수 없어요 …'(이미 정본 밖 문구 표에 있는 글) + online · '다음'으로 다시 → `/result/<id>`. 미리보기 '다음'에서 `unlockFromGesture()`. 종이 띠 · 활동 점 · '홈'(idle · flush 뒤) 그대로. 아직 조각이 없는 활동은 P10 처럼 보기만 |
| 값 8 결과 | ✅ | `src/server/session/result.ts` 는 그 프로필의 끝난 수업 세션만. `next` = hereStart(resume → 그 세션 · lesson · practice → 그 칸 · 그 밖 list). 화면은 '수업을 끝냈어요!' · 큰 '다음 수업' 또는 '수업 목록' · 작은 '홈', 점수 · 퍼센트 없음. 세션 쪽은 끝난 세션이면 결과로 보냄 |
| 값 9 읽기 | ✅ | `src/components/session/reading.tsx`: '읽어 주기'는 누를 때만 · 다시 누르면 멈춤. 글로서리 낱말(고유 명사 빼고) 누르면 뜻 쪽지 · 원형을 `tappedWords` 로. 문항은 C77 (1) 그대로(맞음 '맞았어요!' + 해설 · 처음 틀림 해설 + '한 번 더 풀기', 정답 안 보임 · 둘째 뒤 정답 표시, 점수는 첫 시도). 처음 고른 오답은 눌린 채(결정 1) · 둘째 말(결정 2). 가로 나란히 · 세로 '지문 보기' 쪽지, **문항 쪽 지문에는 그림 줄 없음**(`PassageText` 169~185, 컨트롤러 결정). 낱말 단추 `data-size-exempt`. 화면 판정 `checkAnswer` 는 서버와 같은 함수(위험 2) |
| `ReadingPassage` 선택 속성 | ✅ | 하나가 아니라 둘(`onWordTap` · `openWord`, 다르게 한 것 8). 이 조각이 훅 없는 보기 조각이라 열린 자리를 부르는 쪽이 쥐어야 한다는 까닭이 맞다. `splitPassage` 는 대소문자를 가리는 맞춤이라 새 단어 표시(`markSet.has(part.text)`)가 앞과 같고, 두 속성이 없으면 낱말 단추가 생기지 않는다 |
| 값 10 e2e 견본 · 사진 · ci.yml | ✅ | `tests/e2e/lessons.ts`(최신 개정 · 정정 0 · 같은 칸이면 그 행) · `atLevel` · `levelSpecOf`(시험 숫자를 DB 규격에서). 기본 틀 견본은 plan 추측이 틀려서(다르게 한 것 10 — 까닭 맞음). `photos.ts` 는 `E2E_PHOTOS` 없으면 아무것도 안 함, 끝에 세로로 돌려 두는데 e2e 기본 화면이 세로(820 × 1180)라 사진이 시험 흐름을 바꾸지 않는다. ci.yml 변경은 e2e 작업 안의 env · 아티팩트 둘뿐 |
| 시험 | ✅ | 통합 '세션 바탕:' 넷이 이름 그대로이고 각각 단언이 실하다(점수 · 단어별 정오를 수업 내용에서 따로 세운 기대값, 위조 점수 칸 거부, 섞인 묶음에서 그 id 만 거부 · 시도 id 없는 묶음은 통째, 빠진 활동 · 두 번 부름 · 늦은 시도, 쓰기 연결을 Proxy 로 깨뜨려 로그 글에 입력 글 · 'Failed query' 없음). AC-2c 는 다시 하기 점수 · 단어별 정오 · 남은 정규 수업 수 · 잠긴 줄을 앞뒤로 맞댄다. 단위 '대기열:' 은 101개 → 50 · 50 · 1, 거부 id 지움, warn 에 입력 글 없음. 숫자는 `TEST_SETTINGS` · DB 규격 · `ATTEMPTS_PER_BATCH_MAX` |
| 제약 | ✅ | `finishSession` 첫 문장 `await requireAccess()`. DB 오류는 `logFailure` → `dbErrorTag`. 시도 입력 · 인식 글 로그 없음(새 파일의 console 은 수 · 이름뿐). check:deps · check:bundle · check:ids 새 줄 0. 트랙 · 유닛 없음. 화면 문구는 plan 정본 밖 문구 표 · C72 글자 그대로. 결과 쪽은 서버 모듈을 타입으로만 가져옴 |
| P10 시험 그대로 | ⚠️ | diff 로는 못 봄. CI 1차 전부 성공(컨트롤러 메시지)을 받는다. `tests/integration/session-start.test.ts` 고침은 기대값에 `rejected: []` 를 더한 것뿐(위험 3 — P10 시험을 고침 목록에) |

## 2. 잘한 점

- **장부 M-2 를 서버 · 기기 두 끝에서 함께 닫았다.** 서버는 거부할 id 를 낱낱이 돌려주고, 기기는 받은 id 와 거부한 id 를 둘 다 지운다. 그 위에 NUL 글자 든 시도처럼 '꼴은 맞지만 jsonb 가 받지 않아 묶음 넣기 전체를 늘 실패시키는' 경우까지 찾아 그 시도만 거부했다(`src/core/session/attempt.ts` `parseAttemptInput`). 대기열이 영영 안 비는 길을 하나 더 막은 것이다.
- **위험 2(화면 판정 ≠ 서버 판정)를 구조로 막았다.** 서버의 저장 · 끝내기 · 화면 자료가 `sessionContextOf` 하나로 같은 활동 목록 · 설정 · 규격을 만들고, 화면 판정도 같은 `checkAnswer` 다. 통합 시험의 기대값은 구현을 부르지 않고 수업 내용에서 따로 세웠다.
- **컨트롤러 결정 3 의 길이 8절 동시 사용과 장부 M-2 를 함께 덮는다.** 끝내기가 두 번 막히고 이 기기에도 그 활동이 없으면 빠진 활동으로 돌아가므로, 다른 기기에서 하다 만 활동이나 거부되어 지워진 시도가 있어도 아이가 결과로 가지 못하고 갇히지 않는다.
- **DB 오류 로그 시험이 실제 질의 오류 꼴을 흉내 낸다.** 'Failed query … params: <아이 답>' 글과 cause 사슬을 만들어 쓰기 연결만 깨뜨리고, 로그가 하나 이상 나왔다는 것까지 단언해 거짓 초록을 막았다.
- **결과 자료의 '다음 수업'을 목록의 '여기부터 해요'와 같은 함수에서 낸다.** 별도 규칙을 만들지 않아 4절 '같은 수업을 연다'가 구조로 지켜지고, 통합 시험이 다음 배정 수업 id 로 맞댄다.

## 3. 지적

### Minor

**M-1. 이 기기에서 끝내지 않은 세션의 활동 안 입력 줄이 지워지지 않는다**
- 무엇이: `src/lib/session-input.ts` 는 지우기를 부르는 쪽에 맡기고, 틀은 끝 시도 때 그 활동(`session-frame.tsx:340`)과 끝내기 성공 때 세션 전체(`:297`)만 지운다. 24시간 지나 중단으로 닫힌 세션(8절 '오래 멈춘 세션'), 다른 기기에서 끝낸 세션, 끝내기가 not_found · closed 로 끝난 세션(`:314~320`)의 줄은 `momo.session-input.v1` 에 남는다.
- 왜: plan 값 6 '그 활동의 끝 시도를 대기열에 넣거나 세션이 끝나면 지운다'. 줄 하나는 작지만 정리할 때가 없어 기기마다 쌓이기만 한다. 아이 입력(고른 번호 · 누른 낱말, 차례 3 부터는 놓은 카드 · 쓴 글)이 그 세션이 끝난 뒤에도 기기에 남는다.
- 어떻게: 세션 쪽을 열 때 지금 세션이 아닌 줄을 지우거나(한 프로필 · 영역마다 진행 세션은 하나 — 5절), not_found · closed 길에서도 `inputs.clear(view.sessionId)` 를 부른다. 앞의 것이 더 넓게 닫는다. 차례 3 의 AC-6a 일과 함께 해도 된다.

## 4. 판정

**Approved.** 차례 3 으로 가도 된다. M-1 은 막는 것이 아니며 차례 3(활동 안 입력을 쓰기 조각이 처음 많이 쓰는 차례)에서 함께 닫기를 권한다. 다르게 한 것 열하나는 보고의 까닭대로 받는다 — 7(동음이의어 읽기 두 벌)은 이미 장부에 차례 4 몫으로 있다(`src/server/placement/index.ts:213~` · `src/server/session/index.ts:164~`). 11(읽기 세션도 음성 설정을 읽음)은 공용 변경 2(개발용 DB 설정 채우기)가 프리뷰 전에 되어 있어야 한다는 plan 정할 것 카와 같은 조건이다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| 대기열 묶음 전체 거부(review-p10-5-6-code M-2) | **닫힘** | 서버는 시도 id 가 있는 시도를 낱낱이 거부(`saveSessionAttempts` 의 `rejected`)하고 묶음 전체 `invalid` 는 시도 id 글조차 없을 때뿐이다 — 틀이 넣는 시도는 늘 `crypto.randomUUID()` id 가 있다. 기기는 accepted ∪ rejected 를 지운다(`attempt-queue.ts` `sendOnce`). 단위 '대기열: 50개씩 나눠 보내고 거부된 id 도 지운다' · 통합 '세션 바탕: 꼴이 틀린 시도는 그 시도만 거부되고 나머지는 받는다'가 증명 |
| safe-error 단위 사례(서버 액션 · 서버 함수의 DB 오류 행) | **닫힘** | `tests/unit/safe-error.test.ts` 새 사례(시도 저장 질의 오류 글 · cause 에 아이 답 → `safeDbError` 글은 이름 · 코드만, cause 없음)와 통합 '세션 바탕: DB 오류 로그에 시도 입력 글이 없다'(저장 · 끝내기 둘) |
| M-5 꿰맞춤 key(review-p11-1-code) | **닫힘** | `session-frame.tsx:131~137` 이 문장 번호를 열쇠로 씀(까닭 주석 · biome 예외 한 줄). 꿰맞춤 자리는 보기만 하는 활동 몸통 `DisplayBody` 로 정리됨 |
