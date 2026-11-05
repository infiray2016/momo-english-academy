# 브리프 B 구현 보고 — 불편 1차 묶음: 화면 피드백 · 보상 · 표시(2026-10-29)

상태: DONE_WITH_CONCERNS(fix: 컨트롤러 결정 반영 — 아래 '## 컨트롤러 결정 반영' 절). 작업 자리 `.claude/worktrees/p13d`(0c664c3 위, 커밋 안 함). 브리프 A 구현자가 같은 워크트리에서 동시에 고치고 있어, 아래 관문 결과에는 A 의 진행 중 변경이 함께 걸려 있습니다.

## 1. 바뀐 파일:줄(브리프 항목별)

| 항목 | 파일:줄 | 한 일 |
|---|---|---|
| U2-1 홈 첫 사용 꼴(R7) | `src/server/home/index.ts:69` · `:151` | `HomeCard.firstLesson` — 그 영역에 배치 평가 말고 끝낸 세션이 하나도 없으면 참(정규 · 다시 하기 · 단계 평가 무엇이든 하나면 거짓) |
| | `src/app/(child)/home-cards.tsx:44` · `:72` · `:206` | `HOME_TEXT`(내보냄) · `homeCardLookOf` · `FirstBody` — 머리(영역 · 단계 · 단원 · 단원 5칸) + '첫 수업을 해 봐요' + 아래 끝 큰 단추. 아는 단어 · 최근 성적 · 끝낸 대화 · 이번 주 · 오늘 아직 줄은 숨김 |
| U2-2 '여기부터' | `home-cards.tsx:81` | `startHereAreaOf` — 판 차례에서 오늘 할 것이 남은 앞 영역 하나에 '여기부터 해요'(수업 목록 표지와 같은 글). 마이크 판정 전 · 닫힌 말하기 · 회화, 말하기 배치를 기다리는 회화는 고르지 않음 |
| U2-3 배치 전 회화 단추 | `home-cards.tsx:282` | '말하기 단계 찾기'(누르면 말하기 배치 평가 — 가는 곳 그대로) |
| U4-1 결과 별 · 단어(R3) | `src/components/session/reward.tsx`(새 파일) | `REWARD_TEXT` · `RewardStar` · `GotWordCards` |
| | `src/server/session/result.ts:65` · `src/server/session/index.ts:90` | `ResultView.gotWords` — 이 세션 미리보기 시도의 `shownWords` 차례 그대로, 뜻은 미리보기와 같게 수업 시드 preview 먼저, 없으면 vocab. `PREVIEW_ACTIVITY` 를 내보냄(값 그대로) |
| | `src/app/(child)/result/[id]/result-view.tsx:53` · `:145` | `resultRewardOf` — 끝낸 수업은 별 하나, 다시 하기는 '다시 했어요', 쓰기 6단계 이상 첫 세션(첨삭 전)은 없음. 그 아래 오늘 얻은 단어 카드 |
| U4-1 회화 마무리 | `src/components/conversation/closing-cards.tsx:64` · `:116` | `closingRewardOf` — 끝까지 한 대화만 별 하나(그만둠 · 다시 함은 없음), 정리에서 읽은 끝인사를 글(영어 · 뜻)로 남김 |
| | `src/components/conversation/talk-frame.tsx:365` · `:1048` · `:1081` | 정리의 끝맺음 끝인사(와 있으면 그것, 아니면 카드 끝인사)를 받아 이름을 채워 첫 장에 넘김 |
| U5-7 · U4-10 설정값(R4) | `seed/settings.json:91` · `:123`, `specs/09-설정값.md:81` · `:104`, `tests/fixtures/settings.ts:107` · `:172` | `talk.teacher_praise_seconds` 2 → 3, `ui.auto_next_seconds` 1 → 2. 코드 변경 없음 |
| U5-5 위 띠 토막 이름 | `talk-frame.tsx:146` · `:159` · `:1283` · `:1298` | `TALK_SEGMENT_LABEL` · `talkBandOf` — 띠에 '인사 · 오늘 쓸 말 · 말해 보기 · 대화 · 정리' 표지. '말 주고받기' 셈은 셈이 오르는 인사 · 대화 토막에서만(따라 말하기 · 정리 중에는 숨김, 자리는 그대로 잡음) |
| U5-6 · U3-3 확인 쪽지 | `src/components/board/board.tsx:425` | 공용 `ConfirmSheet` 한 곳: 계속하는 쪽(취소)이 큰 먹색 단추 · 첫 초점, 파괴적 선택(확인)이 작은 종이 단추. 확인 쪽지 쓰는 여섯 자리(회화 '그만하기' · 수업 목록 · 지난 수업 · 결과 · 마무리 · 홈 첨삭)가 모두 확인 = 파괴적 선택이라 공용 조각만 바꿈. DOM 차례는 그대로라 Tab 맴돌기 e2e 가 그대로 맞음 |
| U5-11 ①② 한 번 안내 | `src/components/conversation/tori.tsx:32` · `:312` · `:405` | '번호를 누르면 답을 들려줘요' — ①② 가 처음 뜬 말풍선에 한 번, 기기 저장 열쇠 `momo.answer-tip.v1` |
| U5-8 무음 모드 한 줄 | `src/components/conversation/silent-mode-note.tsx:26`(새 파일) | `SilentModeNote`(속성 없음) — 아이패드 사파리면 '소리가 안 나면 무음 모드를 꺼 주세요', 아니면 없음. 판정은 `isIpadSafari(readDeviceVerdict())` 를 그리기 뒤에 읽음. '시작!' 종이 안 자리는 A 가 `follow-along.tsx:226` 에 넣음 |
| U5-12 초상 듣기 표시 | `src/components/teacher/teacher-window.tsx:96` | 듣기 상태: 창 둘레 연두 테(제자리 — 깜빡이지 않음) + 마이크 표지 |
| U4-7 읽기 다시 풀기 | `src/components/session/reading.tsx:262` | `pickAnotherShown` · '다른 답을 골라요' 한 줄 |
| U5-10 힌트 점 셋 | `src/components/conversation/hint-loading-dots.tsx:9`(새 파일) | `HintLoadingDots`(속성 없음, 힌트 단 글 한 줄 높이) — 꽂는 자리는 A 가 `child-turn.tsx:409` 에 넣음 |
| U4-8 첨삭 기다림 | `result-view.tsx:48` | '기다리는 동안 다른 공부를 해도 돼요' 한 줄(기다림 표시 아래) |
| U4-6 쓰기 제출 확인 | `src/components/session/writing-composition.tsx:76` · `:594` | `belowAmountOf`(단어 분량은 낱말 수, 문장 분량은 시드 검증기와 같은 `splitSentences`) — 분량 최소 아래면 '이대로 보낼까요?' 쪽지(큰 '더 쓸래요' · 작은 '보낼래요') |
| U1-1 · U1-3 첫 실행 | `src/app/(setup)/first-run/first-run-flow.tsx:97` · `:141` · `:788` | 실패 줄 '… 위 설정을 켠 뒤 다시 눌러 주세요. 그래도 …', `handoffLinesOf` — 넘겨주기 화면에 영역별 첫 할 일 세 줄 안(알파벳 단원 · 고른 단계 첫 수업 · 단계 찾기 · 회화는 말하기를 따름) |

## 2. 설계와 다르게 한 것과 이유

1. **U5-12 는 `tori.tsx` 가 아니라 `teacher-window.tsx`.** 초상 상태 표시(말하기 · 생각 · 칭찬)가 선생님 창 조각에 있고 말풍선에는 없습니다. A 소유 파일이 아닙니다.
2. **U5-8 · U5-10 조각은 컨트롤러 결정대로 새 파일 둘로 두었습니다.** A 소유 파일에는 손대지 않았고, 꽂는 한 줄씩은 A 가 넣었습니다. 처음에 회화 틀에 붙였던 임시 한 줄과 말풍선 조각 안의 점 셋 조각은 걷어 냈습니다.
3. **회화 마무리 첫 장의 끝인사 글은 정본 4절 회화 마무리 행 '끝인사는 … 첫 장에 다시 쓰지 않는다(C33)'와 반대입니다.** 브리프 '선생님 끝인사 글 남기기'를 따랐습니다. 4절 행과 C33 은 UI · UX spec 에 모아 반영해야 합니다.
4. **'오늘 얻은 단어'는 그 세션 미리보기에 보인 단어로 정했습니다**(P12 의 숙달 셈이 아님). 다시 하기 결과의 '맞힌 단어'(4절)는 P12 몫이라 두지 않고, 다시 하기에도 미리보기 단어가 있으면 같은 카드가 보입니다.
5. **'여기부터 해요' 고르는 규칙은 제가 정했습니다.** 브리프의 '할 것이 정해진 영역'을 '판 차례에서 오늘 할 것이 남은 앞 영역'으로 읽었습니다. 정본 4절 홈 표에 한 줄이 필요합니다(R7 과 함께).
6. **첫 사용 판정은 '배치 평가 말고 끝낸 세션이 하나라도 있나'입니다.** 다시 하기 · 단계 평가만 끝낸 영역도 첫 사용이 아닙니다. 기존 e2e '부모 확인 대기 영역 … 오늘 완료' 시험이 그 경우를 씁니다.
7. **시험 설정값 `tests/fixtures/settings.ts` 도 바꿨습니다.** 브리프는 settings.json 과 specs/09 만 적었지만, `check:ids` 가 TEST_SETTINGS 값이 settings.json 과 같기를 요구합니다.

## 3. 요청하는 변경(제 소유 밖)

1. **U5-8 — `src/components/conversation/follow-along.tsx`(A 소유).** `TalkStart` 의 TalkPaper 안 '시작!' 큰 단추 바로 아래에 `<SilentModeNote />` 한 줄, 가져오기 `import { SilentModeNote } from "./silent-mode-note";`. A 가 넣음(지금 `follow-along.tsx:59` · `:226`).
2. **U5-10 — `src/components/conversation/child-turn.tsx`(A 소유).** 힌트 단 li 안 `text === undefined ? null : …` 을 `text === undefined ? <HintLoadingDots /> : …` 로, 가져오기 `import { HintLoadingDots } from "./hint-loading-dots";`. A 가 넣음(지금 `child-turn.tsx:409`).
3. **정본 반영(UI · UX spec 에 모아서).** 4절 홈 표에 첫 사용 꼴 · '여기부터 해요' 행이 필요합니다. 4절 세션 결과 행에는 P12 전 임시 별 하나와 오늘 얻은 단어의 출처를 적어야 합니다. 4절 회화 마무리 행은 끝인사 글과 별 하나(C33 바꿈)로 고칩니다. 4절 위 띠 행에는 토막 이름과 셈을 보이는 토막을 적습니다. 4절 선생님 창 행에는 초상 듣기 표시를 더합니다. 4절 처음 회화 행에는 무음 모드 한 줄이 들어갑니다. 4절 선생님 차례 행에는 ①② 한 번 안내가 필요합니다. 4절 쓰기 세션 행에는 분량 아래 확인 쪽지를 적습니다. 정본 밖 문구 표에는 1절 표의 새 문구(홈 셋 · 보상 · 첨삭 기다림 · 읽기 · 쓰기 쪽지 셋 · ①② · 무음 모드 · 토막 이름 · 첫 실행 줄)가 들어갑니다.

## 4. 덮는 시험

- 단위 `tests/unit/ux-screen-feedback.test.ts`(새 파일, 14개): U2-1 · U2-2 · U2-3 · U5-6 · U3-3 · U4-1(결과 · 마무리) · U4-8 · U4-10 · U5-7 · U5-5 · U5-11 · U4-7 · U4-6 · U1-1 · U1-3.
- 단위 `tests/unit/silent-mode-note.test.ts`(새 파일, 2개 — U5-8), `tests/unit/hint-loading-dots.test.ts`(새 파일, 1개 — U5-10). 단위 시험 프로젝트가 `tests/unit` 만 모으므로 조각 파일 이름 그대로 그 자리에 두었습니다.
- 단위 `tests/unit/teacher-window.test.ts`: 'AC-19g · U5-12 초상 상태 표시 …'(듣기 = 연두 테 + 마이크), AC-19h 에 듣기 더함.
- 통합(새 · 고침): `tests/integration/home.test.ts` 'U2-1 홈 자료: … firstLesson …', `tests/integration/session-flow.test.ts` '결과 틀 · U4-1: … 오늘 얻은 단어 …'.
- e2e(새 · 고침):
  - `home.spec.ts` 'U2-1 · U2-2 …'(사진 `home-first-use`)을 더했습니다. AC-2a 두 시험은 지난 수업을 넣어 보통 꼴을 보게 고쳤고, 배치 전 시험에 U2-3 단언을 넣었습니다.
  - `conversation.spec.ts` 는 인사 띠와 ①② 안내, 오늘 쓸 말 · 말해 보기 띠, 그만하기 쪽지 단추 강조를 봅니다. 마무리 첫 장의 끝인사 글과 별 단언은 기존 'not.toContain(farewell)' 셋을 뒤집었습니다.
  - `teacher-choice.spec.ts` 는 U5-8 을 봅니다.
  - `reading.spec.ts` 는 U4-7 과 결과의 별 · 단어를, `session.spec.ts` 는 결과의 별과 새 단어를 봅니다.
  - `writing.spec.ts` 는 U4-6 쪽지('더 쓸래요' 초점 → 입력란, '보낼래요')와 U4-8 한 줄, 초고 결과에 별 없음을 봅니다(사진 `p11-writing-6-short-confirm`).
  - `resume.spec.ts` 의 초고 제출 둘은 쪽지를 거치게 고쳤습니다. 6단계 분량 최소가 30단어라 기존 글이 모두 아래입니다.
  - `first-run.spec.ts` 는 U1-1 문구와 U1-3 넘겨주기 두 줄을 봅니다.

## 5. 실행 명령과 출력

```
export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH
pnpm vitest run --project unit tests/unit/ux-screen-feedback.test.ts tests/unit/teacher-window.test.ts
  → Test Files 2 passed · Tests 27 passed   (구현 전 같은 명령은 모듈 없음으로 실패 — 시험 먼저 확인)
pnpm test            → Test Files 98 passed · Tests 1028 passed | 6 todo(결정 반영 뒤)
pnpm exec tsc --noEmit → 오류 없음
pnpm check:deps      → no dependency violations found (228 modules)
pnpm check:ids       → 종료 0 · fixture-setting 0 · setting-default 0 · design-number 47(경고 — 제 몫은 아이콘 선 굵기 2.5 셋, 기존 칭찬 별과 같은 꼴)
pnpm biome check --write <제가 고친 27개 파일> → 통과
pnpm lint            → Checked 448 files · 오류 없음(결정 반영 뒤 — 처음 돌렸을 때의 오류 1 은 A 파일 줄바꿈이었고 지금은 없음)
pnpm check:deps      → no dependency violations found (230 modules)
```

통합 · e2e 는 이 자리에서 돌리지 못했습니다. 내장 Postgres 가 샌드박스 안에서 공유 메모리를 못 잡았습니다(`could not create shared memory segment: Cannot allocate memory`). 샌드박스 밖 실행은 권한에서 거절됐습니다. 컨트롤러가 관문으로 돌려야 합니다.

## 6. 남은 우려

1. **별 표시와 홈 별 합이 어긋납니다.** 결과 · 마무리에 '별 하나를 받았어요'가 보여도, 별 장부(P12)가 없어 홈 '별 n개'는 그대로 0 입니다. 아이가 '받았다는데 안 늘었다'고 느낄 수 있습니다. 브리프의 '설정 키 없이 표시만'대로 했고, P12 를 당기거나 문구를 바꿀지는 요청자 결정입니다.
2. **e2e 미실행.** 통합 둘과 e2e 아홉 파일은 고쳤지만 이 자리에서는 돌리지 못했습니다. 특히 회화 마무리 끝인사(끝맺음 끝인사가 오는 시험)와 홈 첫 사용 꼴의 크기 시험('홈 화면 꼴 …' — 첫 사용 꼴 카드도 같은 아래 끝 단추 꼴로 맞춤)은 실행으로 확인해야 합니다.
3. **설정값 바꿈으로 e2e 시간이 늘어납니다.** 결과 말 2초 · 칭찬 3초라 회화 · 말하기 e2e 의 따라 말하기 한 번마다 1초쯤 더 걸립니다.
4. **회화 틀(`talk-frame.tsx`)을 A 와 함께 고쳤습니다.** 제 변경은 위 띠 · 끝인사 전달 두 자리이고, A 가 알려 온 네 자리(아이 차례 열기 · 막힘 분기 · 아이 말풍선 둘)와 겹치는 줄은 없습니다.

## 컨트롤러 결정 반영(2026-10-29)

- 결정: A 소유 파일은 B 가 건드리지 않고, 표시 조각 둘을 새 파일(`silent-mode-note.tsx` · `hint-loading-dots.tsx`, 속성 없음)로 만든다. 꽂는 한 줄씩은 A 가 넣는다.
- 한 일: 새 파일 둘과 단위 시험 둘을 만들었습니다. 회화 틀의 임시 무음 모드 띠(`TalkSilentNote`)와 말풍선 조각의 `HintLoading` 은 지웠고, 묶음 시험에서 해당 두 시험을 새 시험 파일로 옮겼습니다. A 구현자에게 넣을 두 줄을 알렸고, A 가 이미 넣은 것을 확인했습니다.
- e2e 단언 `teacher-choice.spec.ts`(`[data-talk-silent-note]`)는 그대로 맞습니다. 표지 속성 이름을 새 조각도 같게 두었습니다.

## fix round 1(2026-10-29) — 홈 별 합을 결과의 별과 맞춤

상태: DONE. 남은 우려 1(결과 '별 하나'와 홈 '별 0'이 어긋남)을 홈 쪽을 맞춰 풀었습니다. 그 밖은 그대로 두었습니다.

### 바뀐 파일:줄

| 파일:줄 | 한 일 |
|---|---|
| `src/core/reward/star.ts:32` · `:41`(새 파일, 순수) | `earnsStar` — 끝낸(`completed`) 새 수업(정규 · 보강 · 연습 · 안 해 본 수업)만 참이고, 쓰기 초고(`writingPart` draft)는 거짓, 고쳐 쓰기는 참. `starTotalOf(sessions, perLesson)` = 별 받는 세션 수 × perLesson |
| `src/server/home/index.ts:119` · `:331` | 홈 '별 n개' = 그 프로필의 끝낸 세션을 `starTotalOf` 로 센 값 × 설정 `reward.star_complete`. 비어 있는 별 장부(star_ledger) 합 대신(P12 가 장부를 쓰면 장부 합으로 돌아감 — 머리 주석) |
| `src/app/(child)/result/[id]/result-view.tsx:57` | `resultRewardOf` 가 같은 `earnsStar` 를 씀(다시 하기는 '다시 했어요', 그 밖 별 · 없음) |
| `src/server/session/result.ts:188` | 결과 자료에 `writingPart` 를 더함(고쳐 쓰기 결과에 별) |
| `src/components/conversation/closing-cards.tsx:69` | `closingRewardOf` 가 같은 `earnsStar` 를 씀(목표 턴 = 세션 '완료', 그만둠 = '중단', 다시 함 = 다시 하기) |
| `tests/fixtures/settings.ts:174` | `reward.star_complete` 1(settings.json:127 · specs/09:108 에는 이미 있어 바꾸지 않음) |

회화가 목표 턴에 닿으면 세션이 '완료'가 되고, 그 전에 그치면 '중단'이 됩니다(`src/server/conversation/state.ts` reachTalkTarget · `turn.ts` · `index.ts` stop 경로). 그래서 회화는 '완료'인지만 보면 정본의 '목표 턴까지 끝낸 대화'와 같습니다. 안 해 본 수업의 '처음 끝낼 때만'(S6)은 같은 수업을 다시 하면 세션 종류가 다시 하기라 종류만으로 가립니다.

### 덮는 시험

- 단위 `tests/unit/star-count.test.ts`(새 파일, 6개): 'U4-1 fix 1 끝낸 새 수업 …만 별' · '끝나지 않은 세션 …' · '쓰기 6단계 이상은 …고쳐 쓰기' · '홈의 별 합은 … × reward.star_complete' · '결과 화면의 별 하나도 같은 셈' · '회화 마무리의 별 하나도 같은 셈'. 구현 전에는 모듈 없음으로 실패하는 것을 확인했습니다.
- 단위 `tests/unit/ux-screen-feedback.test.ts`: 결과 자료에 `writingPart` 를 넣고 초고 경우를 `writingPart: "draft"` 로 맞춤.
- 통합 `tests/integration/home.test.ts:159` 'U4-1 fix 1 홈 별 합 = …': 정규 · 보강 · 고쳐 쓰기 · 회화 완료 4개는 별, 초고 · 회화 중단 · 다시 하기 · 배치 · 진행은 없음 → 4 × reward.star_complete.
- e2e `tests/e2e/home.spec.ts:134` · `:265`: AC-2a(지난 수업 넷 → 별 4 × 설정값), U2-1 · U2-2(지난 수업 하나 → 별 1 × 설정값). 기존 '별 0개' 단언을 바꿨습니다.

### 실행 명령과 출력

```
export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH
pnpm vitest run --project unit tests/unit/star-count.test.ts   → (구현 전) Cannot find package '@/core/reward/star' — 실패 확인
pnpm test            → Test Files 99 passed · Tests 1034 passed | 6 todo
pnpm exec tsc --noEmit → 오류 없음
pnpm lint            → Checked 450 files · 오류 없음
pnpm check:deps      → no dependency violations found (231 modules)
pnpm check:ids       → 종료 0 · fixture-setting 0 · setting-default 0 · code-setting-unknown 0
```

통합 · e2e 는 지난번과 같은 까닭(샌드박스 안 내장 Postgres 공유 메모리)으로 이 자리에서 돌리지 못했습니다.

### 참고와 남은 우려

- **U5-8 · U5-10 의 자리는 앞의 컨트롤러 결정(새 파일 둘, A 가 한 줄씩 꽂음)대로 둡니다.** 이번 지시의 'tori.tsx 의 HintLoading 그대로 · U5-8 은 회화 틀의 띠'는 그 결정보다 앞선 상태를 가리키는 것으로 보았습니다. A 가 이미 `follow-along.tsx:226` · `child-turn.tsx:409` 에 새 조각을 꽂아 두었기 때문입니다. 옛 자리로 되돌려야 하면 알려 주세요.
- **P12 와 이어 붙일 때 두 가지를 정해야 합니다.** 홈 합은 지금 세션에서 셉니다. P12 가 장부를 쓰기 시작하면, 그 전에 끝낸 세션을 장부로 옮길지 정해야 합니다. 옮기지 않으면 장부로 바꾸는 순간 합이 줄어듭니다.
- **홈이 읽는 행이 늘었습니다.** 홈은 이제 그 프로필의 끝낸 세션 전부를 한 번 읽어 셉니다. 아이 한 명의 세션 수로는 문제가 없을 크기입니다.

## fix round 2(2026-10-29) — 코드 검토 B 지적 반영(I 2 · M 10)

상태: DONE. 브리프 `task-ux-fix-b-round2.md` 의 컨트롤러 결정대로 고쳤습니다. A 소유 파일은 건드리지 않았습니다. 시험을 먼저 고쳐 실패 7건을 확인한 뒤 고쳤습니다.

| 지적 | 판정 | 파일:줄 | 덮는 시험 |
|---|---|---|---|
| I-1 별 수를 박음 | ADDRESSED | `src/components/session/reward.tsx:11` · `:17`(글 '별을 받았어요' · `RewardStar({ count })` 가 그 수만큼 별, 0 이면 없음), `src/server/session/result.ts:56` · `:175`(`starsPerLesson` = reward.star_complete), `src/server/conversation/index.ts:1185`(WrapView 같은 칸), `result-view.tsx:158` · `closing-cards.tsx:117` | 단위 'I-1 별 수는 서버가 실은 reward.star_complete 만큼 그리고 글에는 숫자가 없다(값 2 — 결과 · 마무리 둘 다)' |
| I-2 크기 e2e 가 첫 사용 꼴만 잼 | ADDRESSED | `tests/e2e/home.spec.ts:482` — 쓰기 · 회화만 지난 수업을 넣어 세로 두 줄 · 가로 한 줄 모두 첫 사용 꼴과 보통 꼴이 섞인 판. 두 꼴이 다 있는지 단언하고, 사진 `home-default` 한 장에 두 꼴이 담김 | e2e '홈 화면 꼴: 한 판의 영역 카드 넷은 …'(정적으로만 맞춤) |
| M-1 끝낸 세션을 두 번 읽음 | ADDRESSED | `src/server/home/index.ts:155` — 한 번 읽어 첫 사용 판정(배치가 아닌 행의 영역)과 별 합을 함께 냄. `ne` 가져오기 지움 | 통합 'U2-1 홈 자료 …' · 'U4-1 fix 1 홈 별 합 …'(정적) |
| M-2 설정값 바꾸면 지난 별도 다시 셈 | ADDRESSED(주석) | `src/core/reward/star.ts:6` '잠정 셈 — 장부는 P12 …', `home/index.ts:9` 같은 뜻 한 줄 | — |
| M-3 새 수업 종류 두 벌 | ADDRESSED | `src/core/today/done.ts:24` `NEW_LESSON_KINDS` 내보냄, `star.ts:24` 가 그것을 씀(STAR_KINDS 지움) | 단위 'M-3 별을 받는 종류는 오늘 완료의 새 수업 종류(NEW_LESSON_KINDS) 한 벌과 같다' |
| M-4 마무리 별이 종류를 지어 넘김 | ADDRESSED | `src/server/conversation/index.ts:1114`(WrapView `kind` = state.session.kind), `closing-cards.tsx:69`(그대로 넘김) | 단위 'U4-1 fix 1 · M-4 회화 마무리의 별도 같은 셈에 실제 세션 종류를 그대로 넘긴다 …'(level_test → 별 없음) |
| M-5 다시 하기에 오늘 얻은 단어 · 초고에 '다시 했어요' | ADDRESSED | `result-view.tsx:169`(다시 하기는 단어 카드 숨김), `:58`(다시 하기 초고는 'none') | 단위 'U4-1 읽기 · 쓰기 · 말하기 결과에 별과 오늘 얻은 단어 카드가 보이고, 다시 하기는 별 · 단어 카드 대신 …' · 'M-5 쓰기 6단계 이상 다시 하기의 초고 결과는 …' |
| M-6 정리에서 읽지 않은 끝인사도 남음 | ADDRESSED | `talk-frame.tsx:150` `closingFarewellOf` — 정리에서 고른 끝인사(bye)만 이름을 채워 넘기고, 없으면(목표 턴 뒤 '홈' · 열자마자 마무리) 없음. `:1067` 에서 씀 | 단위 'M-6 마무리 첫 장의 끝인사 글은 정리에서 읽은 끝인사만 …', e2e `conversation.spec.ts:1453` 'U4-1 · M-6 끝맺음 끝인사가 오면 정리에서 그 끝인사를 읽고 마무리 첫 장 글도 … 그 끝인사다'(가짜 AI 끝맺음 응답 → 정리 말풍선 · 첫 장 글 = 그 끝인사, 읽기 한 번) |
| M-7 낱말 셈이 검증기와 다름 | ADDRESSED | `writing-composition.tsx:76` `draftWordsOf` = `sentenceWords`, 화면 수(`:397`)와 분량 판정이 같이 씀 | 단위 'U4-6 …'에 'cats .' = 1 · 'dog,cat' = 2 와 그 판정 둘 |
| M-8 머리 주석 넷 | ADDRESSED | `reward.tsx:1-3`, `result.ts:5` · `:8-9`, `result-view.tsx:5-6` · `:9-11`, `closing-cards.tsx:4` · `:9-11` | — |
| M-9 무음 모드 훅 중복 | ADDRESSED | `silent-mode-note.tsx:26` — `mic-blocked` 의 `useIpadSafari` 를 씀(자체 훅 지움) | 단위 'U5-8 …'(그대로 통과) |
| M-10 구현 값을 되읽는 시험 | ADDRESSED | settings.json 값 단언 시험('U4-10 · U5-7 …')과 U1-1 문구 상수 시험을 지웠습니다. U1-1 은 e2e `first-run.spec.ts` 가 봅니다. `writing.spec.ts:838` 에 '더 쓸래요' 뒤 입력란 `toBeFocused()` 를 더했습니다 | e2e 'AC-4c 쓰기 6단계 첫 세션 …' |

함께 고친 것:
- 기존 단위 시험 `tests/unit/talk-follow.test.ts` 의 마무리 자료 꼴에 `kind` · `starsPerLesson` 를 더했습니다. 다시 하기 경우는 `kind: "retry"` 입니다. WrapView 칸이 늘어 타입 오류가 났던 자리입니다.
- e2e 'AC-15e …' 시험 이름을 '끝인사는 … 마무리 첫 장에는 글로만 남으며'로 맞췄습니다(C167 (1)).

### 실행 명령과 출력

```
export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH
pnpm vitest run --project unit tests/unit/star-count.test.ts tests/unit/ux-screen-feedback.test.ts
  → (고치기 전) 7 failed — M-3 · M-4 · U4-1 · M-5 · I-1 · M-6 · U4-6
pnpm test            → Test Files 99 passed · Tests 1043 passed | 6 todo
pnpm exec tsc --noEmit → 오류 없음
pnpm lint            → Checked 450 files · 오류 없음
pnpm check:deps      → no dependency violations found (231 modules)
pnpm check:ids       → 종료 0 · fixture-setting 0 · setting-default 0 · code-setting-unknown 0
```

통합 · e2e 는 이 Mac 에서 돌리지 못해 정적으로만 맞췄습니다. 시험 DB 설정은 `loadableSettings()` 가 TEST_SETTINGS 를 함께 실어 `reward.star_complete` 가 들어갑니다. 그래서 결과 · 마무리 · 홈의 새 설정 읽기가 설정 없음으로 멈추지 않습니다.

### 남은 우려

- **끝맺음 e2e 는 시점에 기댑니다.** 정리가 끝맺음 상태를 한 번 묻는 때에 끝맺음이 저장돼 있어야 합니다. 시험은 끝맺음 요청이 나간 것을 확인한 뒤 정리 한 줄을 따라 말하므로, 따라 말하기 결과 말 시간(설정 2초) 뒤에 묻습니다. 그래도 CI 에서 늦으면 카드 끝인사가 보여 실패할 수 있습니다. 실패하면 정리가 상태를 묻는 횟수(지금 한 번)를 정본에서 정할 일입니다.

## fix round 3(2026-10-29) — 재검토 B 의 새 Minor 넷

상태: DONE. 브리프 `task-ux-fix-b-round3.md` 대로 고쳤습니다. A 소유 파일은 건드리지 않았습니다. 시험 둘(N-1 · N-2)을 먼저 써서 실패를 확인한 뒤 고쳤습니다.

| 지적 | 판정 | 파일:줄 | 덮는 시험 |
|---|---|---|---|
| N-1 '다 썼어요' 켜짐 기준이 바뀜 | ADDRESSED(되돌림) | `src/components/session/writing-composition.tsx:84` `canSubmitDraft` — 글이 비었는가(trim)로만 가름. `:441`(보내기 막음) · `:598`(단추 꺼짐)이 씀. 보이는 낱말 수와 분량 아래 판정은 `sentenceWords` 그대로 | 단위 'N-1 한글만 쓴 초고도 '다 썼어요'가 켜지고(글이 비었는가로만 끔) 보이는 낱말 수는 0 이라 보내면 분량 아래 쪽지를 묻는다' |
| N-2 상태 묻기 실패 때 첫 장 끝인사 없음 | ADDRESSED | `src/components/conversation/talk-frame.tsx:151` `wrapFarewellOf` — 끝맺음 상태 묻기가 실패해도 정리가 읽는 카드 끝인사를 bye 로 돌려줌. `:1106` 콜백이 그 bye 를 늘 setBye | 단위 'N-2 정리의 끝맺음 상태 묻기가 실패해도 정리에서 읽은 카드 끝인사를 첫 장에 남기고, 끝맺음 끝인사가 왔으면 그것을 남긴다'(실패 · 대기 · 와 있음 셋) |
| N-3 서버의 별 수 싣기를 잠그는 시험 없음 | ADDRESSED(정적) | `tests/integration/session-flow.test.ts:554`(결과 `starsPerLesson` = 설정값), `tests/integration/conversation-session.test.ts:983`(마무리 `starsPerLesson` = 설정값 · `kind` = DB 세션 종류) | 통합 '결과 틀 · U4-1 …' · '1-가 안전 상한(회화): 목표 턴 뒤 …'(이 Mac 에서는 못 돌림) |
| N-4 '별 하나' 글 두 곳 | ADDRESSED | `src/components/conversation/closing-cards.tsx:87` 설명 '받은 별(설정 수만큼)', `tests/unit/star-count.test.ts:91` 시험 이름 '결과 화면의 별도 같은 셈' | — |

### 실행 명령과 출력

```
export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH
pnpm vitest run --project unit tests/unit/ux-screen-feedback.test.ts
  → (고치기 전) 2 failed — wrapFarewellOf · canSubmitDraft 없음
pnpm test            → Test Files 99 passed · Tests 1045 passed | 6 todo
pnpm exec tsc --noEmit → 오류 없음
pnpm lint            → Checked 450 files · 오류 없음
pnpm check:deps      → no dependency violations found (231 modules)
pnpm check:ids       → 종료 0 · fixture-setting 0 · setting-default 0 · code-setting-unknown 0
```

통합 단언 둘은 정적으로만 맞췄습니다. fix 라운드는 이번이 셋째(상한)입니다.
