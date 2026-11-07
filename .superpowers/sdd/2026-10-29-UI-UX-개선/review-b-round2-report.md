# 재검토 보고 B(fix 2, 범위 한정): 불편 1차 묶음, 화면 피드백 · 보상 · 표시(2026-10-29)

판정: **Approved** · ADDRESSED 12 · NOT ADDRESSED 0 · 새 지적 4(모두 Minor)

범위는 fix 2 가 손댄 자리와 그 영향입니다(`task-review-b-round2.md`). 작업 자리 `.claude/worktrees/p13d` 의 지금 파일을 읽었고, A 의 자리는 보지 않았습니다. 시험은 다시 돌리지 않았고, 통합 · e2e 는 정적으로 읽었습니다. 줄 번호는 작업 자리 기준입니다. fix 라운드는 2회째입니다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 별 수를 코드에 박음 | **ADDRESSED** | 서버가 `reward.star_complete` 를 읽어 결과 자료(`src/server/session/result.ts:169` · `:175` starsPerLesson)와 마무리 자료(`src/server/conversation/index.ts:1185`)에 싣고, 조각이 그 수만큼 별 그림을 그립니다(`src/components/session/reward.tsx:17`, 0 이면 그리지 않음). 글은 숫자 없는 '별을 받았어요'(`reward.tsx:11`)입니다. 홈 합(`src/server/home/index.ts:169`)도 같은 키를 같은 프로필 범위로 읽으므로 세 화면의 수가 갈리지 않습니다. 단위 시험(`tests/unit/ux-screen-feedback.test.ts:276`)이 값 2 · 1 · 0 을 결과 · 마무리 둘 다에서 잠급니다. 서버 쪽 싣기를 잠그는 시험은 없습니다(N-3) |
| I-2 크기 e2e 가 첫 사용 꼴만 잼 | **ADDRESSED** | `tests/e2e/home.spec.ts:482` 가 쓰기 · 회화에만 지난 수업을 넣어, 세로 두 줄(읽기 · 쓰기 / 말하기 · 회화)과 가로 한 줄 모두에서 첫 사용 꼴과 보통 꼴이 한 줄에 섞입니다. 두 꼴이 다 있는지도 먼저 단언합니다(`:485-488`). 같은 높이 · 줄마다 아래 끝 단언이 섞인 판을 재고, 사진 `home-default` 한 장에 두 꼴이 담깁니다 |
| M-1 홈이 끝낸 세션을 두 번 더 읽음 | **ADDRESSED** | `home/index.ts:155-169` 에서 한 번 읽어 첫 사용 판정(배치가 아닌 행의 영역)과 별 합을 함께 냅니다. 통합 `tests/integration/home.test.ts` 의 두 시험이 그대로 덮습니다 |
| M-2 지난 별까지 다시 셈 | **ADDRESSED**(주석) | `src/core/reward/star.ts:6-7`, `home/index.ts:9-10`. 컨트롤러 결정(주석)대로입니다 |
| M-3 새 수업 종류 두 벌 | **ADDRESSED** | `src/core/today/done.ts:24` 가 `NEW_LESSON_KINDS` 를 내보내고 `star.ts:24` 가 그것을 씁니다. `tests/unit/star-count.test.ts:42` 가 여덟 종류 전부에서 둘이 같음을 잠급니다 |
| M-4 마무리 별이 종류를 지어 넘김 | **ADDRESSED** | `WrapView.kind` = `state.session.kind`(`conversation/index.ts:1114` · `:1184`), `closing-cards.tsx:69-79` 가 그대로 넘깁니다. `star-count.test.ts:107` 이 보강 → 별, 다시 하기 · 단계 평가 → 없음을 잠급니다 |
| M-5 다시 하기에 오늘 얻은 단어 · 초고에 '다시 했어요' | **ADDRESSED** | `result-view.tsx:61-62`(다시 하기 초고는 없음), `:168-171`(다시 하기는 단어 카드를 숨김). 단위 `ux-screen-feedback.test.ts:225` · `:263` 이 둘 다 잠급니다 |
| M-6 정리에서 읽지 않은 끝인사도 남음 | **ADDRESSED** | `talk-frame.tsx:150` closingFarewellOf 는 정리에서 고른 끝인사(bye)만 넘기고, 목표 턴 뒤 '홈'처럼 정리를 거치지 않은 길에는 없습니다. 단위 `:349` 와 새 e2e `conversation.spec.ts:1453`(끝맺음 끝인사 → 정리 말풍선 · 첫 장 글 = 그 끝인사, 읽기 한 번)이 잠급니다. 한 갈래(상태 묻기 실패)에서 글이 빠집니다(N-2) |
| M-7 낱말 셈이 검증기와 다름 | **ADDRESSED** | `writing-composition.tsx:76` draftWordsOf = `sentenceWords` 를 화면의 '지금 n단어'(`:397` · `:556`)와 분량 판정(`:86`)이 같이 씁니다. 시드 검증기도 `sentenceWords` 로 예시문 낱말을 셉니다(`src/core/seed/check-lesson.ts:816`). 문장은 그대로 `splitSentences` 입니다. 화면 수 · 쪽지 · 검증기 셋이 같습니다. 단위 `:426` 이 'cats .' = 1 · 'dog,cat' = 2 와 그 판정을 잠급니다. 곁따른 행동 변화 하나는 N-1 입니다 |
| M-8 머리 주석 넷 | **ADDRESSED** | `reward.tsx:1-4`, `result.ts:5` · `:8-9`, `result-view.tsx:5-6` · `:9-11`, `closing-cards.tsx:4` · `:9-11` 가 지금 동작과 맞습니다. 남은 한 곳은 N-4 입니다 |
| M-9 무음 모드 훅 중복 | **ADDRESSED** | `silent-mode-note.tsx:8` · `:26` 이 `mic-blocked` 의 `useIpadSafari` 를 씁니다 |
| M-10 구현 값을 되읽는 시험 | **ADDRESSED** | 설정 파일 값 단언과 U1-1 문구 상수 단언을 지웠습니다(U1-1 은 `tests/e2e/first-run.spec.ts:297` · `:329` 가 봅니다). `writing.spec.ts:838` 에 '더 쓸래요' 뒤 입력란 `toBeFocused()` 가 들어갔고, 그 초점은 `writing-composition.tsx:610` 이 줍니다 |

## 2. 새로 깨진 곳 확인

- **I-1 자료 흐름.** 서버(설정 읽기) → `ResultView` · `WrapView` → `RewardStar({ count })` 길이 끊김 없이 이어집니다. `WrapView` 를 만드는 곳은 `wrapViewOf` 하나라 그만하기 · 홈 · 닫힌 회화 마무리(`readTalkWrap`) 모두 새 칸을 싣습니다. 통합 시험 DB 는 `loadableSettings()` 가 시험 설정을 함께 실어(`tests/fixtures/seed/loadable.ts:57`, 회화 통합도 `tests/fixtures/seed/dev-tree.ts:30` 이 같은 나무) 새 설정 읽기가 멈추지 않습니다. 통합 시험의 결과 · 마무리 단언은 `toMatchObject` · 칸 하나씩이라 새 칸으로 깨지지 않습니다.
- **M-6 e2e(`conversation.spec.ts:1453`).** 쓰는 도구(`fakeAiRequests` · `talkReply` 의 `when` 덮어쓰기 · `CLOSING_MARK`)가 있고, 카드 끝인사('Bye! See you soon.', `tests/fixtures/seed/builders.ts:2134`)는 시험의 끝인사 글에 들지 않아 `not.toContainText` 가 뜻대로 섭니다. 구현 보고가 적은 시점 위험(정리가 끝맺음 상태를 한 번만 물음)은 그대로이고, CI 실행으로만 확인됩니다.
- **I-2 e2e.** '여기부터 해요' 표지는 절대 위치라 높이 · 줄 계산에 들지 않습니다.

## 3. 새 지적(fix 2 가 만든 것, 모두 Minor)

**N-1. 낱말 셈을 바꾸면서 '다 썼어요' 켜짐 기준도 함께 바뀌었습니다.** `writing-composition.tsx:433` · `:590` 의 `count === 0` 이 이제 영어 토큰 수라, 한글만 쓰거나 부호만 쓴 초고는 '지금 0단어'로 단추가 꺼지고 보낼 수 없습니다. 고치기 전에는 빈칸으로 자른 낱말이 하나라도 있으면 보낼 수 있었습니다. 정본(3.3 쓰기 6~12 첫 세션 행 · 4절 쓰기 세션 행)에는 이 경우의 규칙이 없고, 구현 보고와 시험에도 이 변화가 적혀 있지 않습니다. 의도한 것이면 단위 시험 한 줄('한글만 쓴 글은 0단어 → 단추 꺼짐')로 잠그고 정본 밖 문구 표 쪽에 메모합니다. 의도가 아니면 단추 켜짐만 '글이 비었는가(trim)'로 되돌립니다.

**N-2. 끝맺음 상태 묻기가 실패하면 읽은 끝인사가 첫 장에 남지 않습니다.** 틀의 콜백(`talk-frame.tsx:1088-1095`)은 `talkClosingStatus` 가 던지면 `setBye` 전에 빠집니다. 정리 조각은 그 오류를 삼키고 카드 끝인사를 읽습니다(`follow-along.tsx:686-689`). 그래서 끝인사는 읽었는데 첫 장에는 글이 없습니다. fix 1 의 `bye ?? wrap.farewell` 은 이 갈래를 덮었는데, M-6 고침으로 열렸습니다. 콜백에서 오류일 때도 `setBye(wrap.farewell)` 을 부르거나, 정리 조각이 고른 끝인사를 `onDone` 으로 넘기게 하면 '정리에서 읽은 것만'과 '읽은 것은 남김'이 함께 섭니다.

**N-3. I-1 의 서버 쪽 싣기를 잠그는 시험이 없습니다.** 단위 시험은 조각에 수를 직접 넣어 그리기만 봅니다. `result.ts:175` 나 `conversation/index.ts:1185` 가 설정 대신 다른 값을 실어도 시험은 통과합니다. 통합 `session-flow.test.ts` 결과 시험의 `toMatchObject` 에 `starsPerLesson: TEST_SETTINGS["reward.star_complete"].value` 를, `conversation-session.test.ts` 의 마무리 단언(`:980` 근처)에 같은 칸 하나를 더하면 서버 → 화면 길이 끝까지 잠깁니다.

**N-4. '별 하나' 글이 두 곳에 남았습니다.** `closing-cards.tsx:87` 의 ClosingFirst 설명('첫 장: 별 하나 · …')과 `tests/unit/star-count.test.ts:91` 시험 이름('결과 화면의 \'별 하나\'도 같은 셈')이 I-1 뒤의 동작(설정 수만큼 별)과 다릅니다. 글만 고치면 됩니다.

## 4. 범위 밖 관찰

- 회화 마무리의 다시 하기 첫 장에는 이번 묶음 전부터 '오늘 얻은 단어' 카드가 그대로 보입니다(`closing-cards.tsx` gotWords 묶음). 4절 회화 마무리 행은 다시 하기에 별 · 친한 정도만 빼라고 적었으므로 지금은 정본과 어긋나지 않습니다. 결과 화면(M-5)과 맞출지는 UI · UX spec 에서 정할 일입니다.

## 5. 라운드 판정

**Approved.** 지적 열둘이 모두 고쳐졌고 먼저 쓴 시험이 그 행동을 잠급니다. 새 지적 넷은 모두 Minor 라 컨트롤러가 직접 고르거나 다음 묶음에 넣을 수 있습니다. 통합 · e2e 실행 확인(장부 L-2)과 새 e2e 의 시점 위험은 CI 에서 봐야 합니다.
