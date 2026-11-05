# Plan: 쓰기 불편한 것부터 — 내가 한 일이 되돌아오고, 실패해도 길이 있고, 끝나면 보상이 보이게

spec: `intent/2026-10-29-UI-UX-개선/spec.md`(2판 approved, 13절 C179 · 그 앞 컨트롤러 C178, 1판 정본 반영 C180, 2판 델타 반영 중) · intent: `intent/2026-10-29-UI-UX-개선/intent.md`(2판, C173) · 작성일: 2026-10-29 · 상태: approved(컨트롤러, 2026-10-29 23:5x, 13절 C185 — 1-가 하위 plan 과 같은 승인 규칙 C139 · C141; 요청자 결정 C173 · C179 범위 안)
승인: 컨트롤러 2026-10-29 23:5x(묶음 0-가 부터 구현 시작, 4-나 초상 표본 셋은 요청자 번호 고르기) · 브랜치 · 워크트리: `feature/1a-p13d-teacher`(`.claude/worktrees/p13d`, 머리 0c664c3 위 커밋 전: 불편 1차 묶음 64파일(검토 A · B Approved)과 시드 규격 · 검증기 확장 작업) · 작업 장부: `.superpowers/sdd/2026-10-29-UI-UX-개선/`

읽는 법. 파일 경로는 p13d 기준이다. 정본에 없는 새 이름(파일 · 함수 · 칸)에는 '(제안)'을 붙였다. 시험 이름과 증명 표는 정본 15절 번호를 쓴다(델타 U1~U10 → AC-23a~j, 필수 U6 · U7 → AC-23f · AC-23g). 델타 번호에 'AC-' 머리를 붙이면 CI 의 spec:trace(unknown-ac)에 걸린다. R-n 은 spec 설계 1 의 정본 변경 행, N-n 은 설계 4 표의 화면, U-n · D-n 은 UX 검토 3판의 지적, L-n 은 장부 항목이다. 코드 사실은 2026-10-29 22:4x 의 p13d 에서 확인했다.

## 목표 (Goal)

승인된 델타 spec 2판을 p13d 코드에 입힌다. 가장 먼저 지키는 것은 요청자가 필수로 둔 둘이다. 아이가 말로 낸 말(인식 글)은 그 말에 대한 다음 반응이 화면에 올 때까지 남고 보낸 뒤 빈 화면이 없으며(4절 원칙 문단 · 회화 세션 표 R-1 · R-28 · R-32, 설계 3), 오류 · 막힘 · 쉼 · 소리를 들려주지 못함을 보이는 아이 화면마다 같은 자리로 돌아가는 길이 있고 홈을 거치지 않는다(7절 '막힘 화면' · '들려주지 못함' 행, 8절 '아이 화면' · '앱 오류' · '복구 예외' 행, 설계 4 · 4.1). 둘은 Playwright e2e 로 잠그고, 실제 실행 결과를 확인해야 완료로 적는다(C179).
다음은 디자인 ② 밝은 책상(C168)이다. 색 · 모양 값은 `src/app/globals.css` 한 곳의 디자인 토큰이고(설계 5.1 · 5.2, 설정값이 아닌 코드 토큰 — 12절 머리 문단), 이 토큰을 화면 가족(5.4)과 둥근 창(5.5)으로 모든 아이 화면에 입힌다. 승인된 넷도 함께 들어간다. 큰 단추는 그 화면 글이 권하는 행동이고(UX3: 막힘은 큰 '다시 해 볼래요', 쉼은 큰 '홈'), 쉬는 화면에도 '다시 해 볼래요'가 있으며(UX4), 홈은 카드 넷이고 단원 5칸 · 막대 둘은 수업 목록 위 띠로 가고(UX2), 결과 · 마무리에는 별(reward.star_complete, 홈 별 합과 같은 함수 earnsStar)과 '오늘 만난 단어'(그 세션 미리보기 단어, 다시 하기에는 없음 — UX1)가 앞쪽에 있다.
새 설정 키는 없다. 설계 7 의 일곱(speech.speak_start_timeout_seconds 3 · speech.speak_end_timeout_extra_seconds 5 · speech.speak_chars_per_second 8 · speech.skip_notice_seconds 1.5 · ui.auto_next_seconds 2 · talk.teacher_praise_seconds 3 · reward.star_complete 1)은 정본 · seed/settings.json · 시험 고정본에 이미 있으므로 check:ids 대조만 확인한다. 아이 화면 새 문구는 설계 6 표 그대로 쓴다.

## 묶음과 배정

묶음 번호는 spec 설계 8 의 차례 번호와 같다(차례 1 정본 반영은 이 plan 밖에서 진행 중이다). 구현자는 Opus · high, 코드 검토는 Opus · xhigh, 화면 검토는 Fable · max 이고 호출마다 model · effort 를 적는다. 동시에 다섯까지 돌리며, 한 파일은 한 구현자만 고친다(위험 1).

| 묶음 | 범위 | 먼저 끝날 것 | 검토 | 증명하는 AC | 커밋 후보 |
|---|---|---|---|---|---|
| 0-가 | 돌아갈 길: 막힘 단추 차례(UX3) · 쉼 '다시 해 볼래요'(UX4) · 홈 · 목록 쉼 한 줄 칸(R-11 · R-15) · 회화 끊김 단추(N-11) · 닫힌 카드 다시 확인(R-10) | 없음(회화 구현이 회화 틀을 잡기 전에 끝냄) | 코드 | 23g(행동) | ① |
| 0-나 | 앱 오류 화면 · 없는 주소(R-52, N-15 · N-16) | 없음 | 코드 | 23g | ① |
| 0-다 | 보상 · 문구 · 저장 자리 · 이름: 위 띠 별 0(R-12) · 그만둔 대화 문구(R-54) · 회화 다시 하기 단어 숨김(R-19) · ①② 프로필마다(R-29) · '얻은' → '만난'(설계 2) | 0-가 | 코드 | 23c · 23d | ① |
| 0-라 | 음성 층 감시 결과 셋(R-48: 들려줌 · 끝 알림 없음 · 들려주지 못함) | 없음 | 코드 | 23a (3) | ① |
| 0-마 | 필수 e2e 정적 작성(필수 경로 가 · 나 · 복구 예외 둘) | 0-가 · 0-나 · 0-다 | 코드 | 23f · 23g · 23a (4) | ① |
| 2-가 | 토큰 · 책상 바탕 · 꾸밈 층 · 공용 조각(보드 · 띠 · 카드 · 단추 · 쪽지 · 테이프 · 흐린 단추 · 아이콘 획) | 시드 규격 작업이 structure.ts 를 놓음 | 코드 + 눈 점검 | 23e (1) | ② |
| 2-나 | 토큰 밖 색 걷기 · 아이콘 획 · 듣는 중 고리 | 2-가 | 코드 | 23e (1) | ② |
| 2-다 | 검사: 토큰 밖 색 · 설계 숫자 상한 · 대비 7:1 · 꾸밈 겹침 | 2-나 | 코드 | 23e (1)~(3) · N9 | ② |
| 3 | 홈 카드 넷 · 홈 위 띠 · 수업 목록 위 띠 · 영역 그림 · 홈 작은 초상 | 0-가 · 0-다 · 2-가 · 4-가 | 코드 + 화면 | 23h · 23c · 2a · 2d | ③ |
| 4-가 | 둥근 창 · 흰 이름표 · 상태 표지 · 작은 초상 꼴 · 3D 칸 바탕 | 2-가, 회화 구현과 선생님 창 잠금 | 코드 + 화면 | 23i · 19i | ③ |
| 4-나 | 초상 다시 찍기(도구 · 자산 · 명단) · 3D 담는 범위 | 4-가 | 코드 + [사람] 표본 고름 | 23i | ③ |
| 5-가 | 화면 가족 꼴: 세션 · 결과 · 막힘 · 쉼 · 오류 · 배치 · 첫 실행(D-1 · D-7 · D-8 · D-10 · D-13 · D-14) | 0 · 2, session-frame 은 가르치고 구현과 잠금 | 코드 + 화면 | 23j · 23e | ④ |
| 5-나 | 소리를 들려주지 못함: 말하기 세션 · 배치 · 점수 · 예비 문항(N-19, R-55 · R-56 · R-57) | 0-라 · 5-가 | 코드 | 23a (5) · 23g | ④ |
| 6 | 회화 화면 꼴 · 회화 쪽 들려주지 못함(N-19 · N-20) · 마무리 판 · 필수 경로 가 다시 맞춤 | 회화 구현 첫 묶음 · 4-가 · 5-가 | 코드 + 화면 | 23i · 23a (3) · 23f | ⑤ |
| 7-가 · 7-나 | 화면 검토: 7-가 는 2~5, 7-나 는 6 | 사진 | 화면 | 23d · 23e (4) · 23h~j | ⑥ |
| 8 | iPad 재시험 [사람] | 프리뷰 push(L-19) | 사람 | 잠정값 · R2 | 없음 |
| 9 | 필수 e2e 실행 확인 | 11-01 · push | 기록 | 23f · 23g | 없음 |

plan 이 정한 것(spec 이 plan 에 맡긴 자리):
1. **1차 묶음과 다른 자리(spec 우려 5 의 일곱)는 묶음 0 에 넣는다.** 까닭은 셋이다. 1차 묶음은 회화 재설계와 함께 프리뷰로 나가므로(L-19), 승인된 단추 차례(UX3)와 쉼의 돌아갈 길(UX4)과 다른 행동이 프리뷰에 나가지 않게 한다. 회화 구현이 회화 틀을 크게 고치기 전에 그 틀의 몇 줄을 끝내 두면 같은 파일을 두 구현자가 동시에 고치지 않는다. 필수 경로 나 의 e2e 도 일찍 쓸 수 있다. 회화 구현이 먼저 회화 틀을 잡으면, 회화 틀 몫(막힘 판 단추 차례 · 쉼 '다시 해 볼래요' · 끊김 단추 · ①② 저장 자리 · 그만둔 대화 문구 · 다시 하기 단어 숨김)은 그 구현 브리프로 넘긴다. 화면 꼴(② 판 · 크기)은 묶음 5 · 6 이 입힌다.
2. 감시 결과 셋은 음성 층 몫을 0-라 에 두어 회화 구현이 그 결과를 받아 쓰게 하고, 화면 몫(N-19 · N-20)은 5-나(말하기 · 배치)와 6(회화)에 둔다. 듣기 사건 기록 칸은 회화 plan 몫이다(회화 spec 설계 8 · L-15).
3. '얻은' 식별자는 met 계열로 바꾼다(설계 2 의 권함). gotWords → metWords, gotWordsOf → metWordsOf, GotWordCards → MetWordCards, 표지 data-got-words · data-got-word → data-met-words · data-met-word 다. core 의 metWordsIn(대화 글에 나온 단원 단어)과 이름이 가깝지만 3.3 '만났다'와 같은 뜻이라 함께 둔다.
4. 토큰은 회화 파일이 같은 이름을 쓰므로 이름을 바꾸지 않고 값만 바꾸는 쪽을 먼저 한다(postit 넷 · ink · ink-soft · paper · kraft · shadow-postit · shadow-band). 새 이름은 더하기만 한다. 옛 tape 는 마지막 사용처(회화 파일, 묶음 6)가 옮긴 뒤 지우고, cork · cork-frame 은 2-가 · 2-나 에서 사용처를 모두 옮긴 뒤 지운다.
5. 초상 다시 찍기는 줄인 VRM 을 로컬 전용 쪽에서 3D 로 그려 찍는다(새 그림을 그리지 않는다). WebP · 해시 이름 · 명단 칸은 스크립트가 맡는다(4-나).
6. 앱 오류 화면 e2e 에는 시험용 갈래를 앱 코드에 두지 않는다. 시험 DB 의 설정 행 하나(예: speech.skip_notice_seconds)를 지워 서버 그리기가 던지게 한 뒤, 행을 되돌리고 '다시 해 볼래요'를 잰다.
7. '/' 요청 셈은 문서 이동과, 미리 읽기가 아닌 RSC 요청만 센다. Next 의 Link 는 보이는 '홈' 링크를 미리 읽어 '/' 요청을 내기 때문이다.
8. 설계 숫자 경고의 기준 값은 2-가 시작 때 잰 수다(2026-10-29 p13d 49 = 1차 묶음 47 + 시드 규격 작업 2). 세션 진행 막대의 묶음 이름은 정본 3.2 · 3.3 의 활동 이름(새 단어 · 과제 · 따라 말하기 · 듣기 · 질문)에서 가져와 새 문구를 만들지 않고, 가르치고 plan 이 여섯 자리 이름으로 바꾼다.

## 설정값 · 토큰 · 문구

이 plan 은 12절 키를 더하지 않는다. 쓰는 키와 값은 아래와 같고, 확인은 specs 사본을 맞춘 뒤 `pnpm check:ids` 의 spec-setting-missing · seed-setting-unknown · setting-default · fixture-setting · code-setting-unknown 이 0 인지 보는 것뿐이다.

| 키 | 값 | 읽는 곳 | 이 plan 에서 |
|---|---|---|---|
| speech.speak_start_timeout_seconds | 3(잠정) | 음성 층 감시(pace.ts speakWatchOf · browser.ts) | 0-라 가 결과 셋으로 가르고, 8 에서 확정 |
| speech.speak_end_timeout_extra_seconds | 5(잠정) | 같음 | 같음 |
| speech.speak_chars_per_second | 8(잠정) | 같음 | 같음 |
| speech.skip_notice_seconds | 1.5(잠정) | 건너뜀 · '모름' 안내 | 6 의 '소리가 안 나와서 글로 봐요'(N-20)도 같은 키 |
| ui.auto_next_seconds · talk.teacher_praise_seconds | 2 · 3(잠정) | 결과 말 · 칭찬 표지 | 8 에서 체감을 보고 확정 |
| reward.star_complete | 1 | earnsStar(결과 · 마무리 · 홈) | AC-23c 를 값 1 · 2 로 잰다 |
| ui.wait_hint_seconds 첫 값 · talk.teacher_portrait_max_kb | 1초 · 100 | 기다림 표시 · 초상 자산 검사 | 필수 경로 가 의 '1초 안', 4-나 새 초상 |

토큰은 설정값이 아니다(12절 머리 문단). 값을 바꾸면 빌드가 바뀌고 학습 판정에 쓰지 않는다. 화면 크기 상수(HOME_CARD_MIN_H · TEACHER_WINDOW_PX · 3D 담는 범위)는 그 파일 맨 위 상수다(C72). 아이 화면 문구는 설계 6 표에서 가져오며, 새로 들어가는 자리는 아래 묶음뿐이다. 1차 묶음이 이미 넣은 문구(첫 수업 · 여기부터 · 말하기 단계 찾기 · 별을 받았어요 · 오늘 만난 단어 · 듣고 있어요 · 다 읽은 뒤 눌러요 · 이건 다음에 다시 해요 · 말소리 없음 안내 · 다시 해 볼래요 · 아무 말이나 한마디 해 주세요 · 무음 모드 · 토막 이름 · 첫 실행 줄)는 바꾸지 않는다.

| 문구(설계 6) | 묶음 |
|---|---|
| '아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요' · 회화 끊김 단추 '다시 해 볼래요' | 0-가 |
| '잠깐 문제가 생겼어요' · '찾는 화면이 없어요' | 0-나 |
| '다음에 조금 더 이야기하면 별을 받아요' · 위 띠 별 칸은 값 1 이상일 때만 | 0-다 |
| '소리가 안 나왔어요. 다시 들어 봐요' · 큰 '다시 듣기' · 작은 '다음' | 5-나(말하기 · 배치) · 6(회화) |
| '소리가 안 나와서 글로 봐요' | 6(회화), 세 영역 선생님 말은 가르치고 plan |

## 바뀌는 파일 (Files that change)

### 묶음 0: 1차 묶음 보정 · 돌아갈 길 · 필수 e2e(L-19 커밋 전, 회화 구현 시작 전)

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 0-가 | `src/components/session/mic-blocked.tsx` | 수정 | 막힘 판 조각(제안 `MicBlockedPanel`): 안내 줄 + 큰 '다시 해 볼래요' + 작은 '홈'(onHome). 단추 차례 순수 함수(제안 `stuckButtonsOf` — 막힘은 다시 해 보기, 쉼은 홈이 큼) |
| 0-가 | `src/components/session/ai-rest.tsx` | 수정 | onRetry 를 받으면 큰 '홈' · 작은 '다시 해 볼래요', 안 풀리면 '아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요' 한 줄. 카드 아래 한 줄 꼴(제안 `AiRestLine`) |
| 0-가 | `src/server/actions/session.ts` | 수정 | 쉼 다시 확인 액션(제안 `recheckAiRest`): 접근 쿠키 확인 뒤 `aiRestingToday`(ai-gate.ts)를 다시 읽는다. 1-나는 같은 판정 함수에 ai_status 와 응답 뒤 확인 호출을 더한다(위험 10) |
| 0-가 | `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 막힘 → 막힘 판, 쉼 → onRetry(풀리면 router.refresh 로 같은 활동) |
| 0-가 | `src/components/conversation/talk-frame.tsx` | 수정 | 막힘 판 단추 차례, 쉼 onRetry(풀리면 끊김 줄의 다시 부를 일을 같은 시도 id 로), 끊김 · 실패 줄은 큰 '다시 해 볼래요'(TALK_TEXT.retry) |
| 0-가 | `src/app/(child)/[area]/placement/placement-flow.tsx` | 수정 | 막힘 판 단추 차례(판정 전이면 마이크 안내 — 지금 길 그대로) |
| 0-가 | `src/app/(child)/result/[id]/result-view.tsx` · `src/components/conversation/closing-cards.tsx` | 수정 | 결과 '다음 수업' · 셋째 장 '다음 이야기' 쉼: 큰 단추 자리에 안내 + 큰 '홈' · 작은 '다시 해 볼래요'(풀리면 그 수업 시작) |
| 0-가 | `src/app/(child)/[area]/lessons/lesson-board.tsx` · `past/past-lessons.tsx` | 수정 | 쉼이면 목록을 그대로 두고 누른 카드 아래 한 줄 칸(기다림 줄 자리)에 쉼 글, 다시 누르면 다시 판정 |
| 0-가 | `src/app/(child)/home-cards.tsx` | 수정 | '첨삭이 왔어요' 쉼 → 쪽지 아래 한 줄. 닫힌 카드 다시 확인 줄은 막힘 판과 같은 확인(runMicRetry) |
| 0-가 | `tests/unit/ux-recover.test.ts`(제안) · `mic-blocked.test.ts` · `speech-feedback.test.ts` · e2e `speech-feedback.spec.ts` · `writing.spec.ts` · `conversation.spec.ts` | 신규 · 수정 | 단추 차례 · 쉼 다시 확인 갈래, 바뀐 큰 · 작은 단추 고르개 |
| 0-나 | `src/components/session/app-trouble.tsx`(제안) | 신규 | 앱 오류 판('잠깐 문제가 생겼어요' · 큰 '다시 해 볼래요' · 작은 '홈')과 없는 주소 판('찾는 화면이 없어요' · 큰 '홈'), 문구 표 |
| 0-나 | `src/app/(child)/error.tsx` · `src/app/error.tsx` | 신규 | 오류 경계. '다시 해 볼래요'는 router.refresh() 와 reset() 을 한 전환 안에서 부른다. 루트 쪽은 (child) 틀의 오류를 받는다 |
| 0-나 | `src/app/not-found.tsx` · `src/app/(child)/not-found.tsx` | 신규 | 없는 주소 판 |
| 0-나 | `src/app/(child)/session/[id]/page.tsx` · `result/[id]/page.tsx` | 수정 | 모르는 세션은 notFound(). 닫힌 세션은 지금처럼 그 영역 수업 목록으로, 남의 세션은 없는 주소 판(프로필 단위 읽기라 영역을 알 수 없고, 알려면 다른 프로필의 행을 읽어야 함 — 0-나 검토 판정 2), 결과 주소의 못 여는 세션은 그 영역 수업 목록으로(0-나 검토 판정 3) |
| 0-다 | `src/app/(child)/page.tsx` | 수정 | 위 띠 별 칸은 별 수 1 이상일 때만(R-12). 순수 함수(제안 `homeBandChipsOf`)가 정하고, 연속 학습 일수는 P12 가 값을 넣으면 같은 규칙을 탄다 |
| 0-다 | `src/components/conversation/closing-cards.tsx` | 수정 | 그만둔 대화 '다음에 조금 더 이야기하면 별을 받아요'(R-54), 다시 하기 대화는 오늘 만난 단어를 숨김(R-19), 이름 바꿈 |
| 0-다 | `src/components/conversation/tori.tsx` · `talk-frame.tsx` · `src/server/conversation/index.ts` | 수정 | ①② 안내를 기기 저장(`momo.answer-tip.v1`)에서 profiles.notices_seen 으로(TALK_NOTICE_KINDS 에 (제안) `talk_answer_tip`, markTalkNotice). WrapView gotWords → metWords |
| 0-다 | `src/components/session/reward.tsx` · `src/server/session/result.ts` · `src/server/session/index.ts` · `result-view.tsx` | 수정 | met 계열 이름(정한 것 3)과 주석 '오늘 얻은 단어' → '오늘 만난 단어'(주석 11곳) |
| 0-다 | `tests/unit/ux-screen-feedback.test.ts` · `talk-follow.test.ts` · `star-count.test.ts` · `tests/integration/session-flow.test.ts` · e2e `reading.spec.ts` · `session.spec.ts` · `conversation.spec.ts` | 수정 | 시험 이름 · 주석 7곳, 고르개, 그만둔 문구, ①② 를 두 브라우저 맥락(같은 프로필)으로 보는 시험 |
| 0-라 | `src/lib/speech/types.ts` | 수정 | SpeakOutcome 'ended' 에 들려준 결과(제안 `heard: "played" \| "no_end" \| "not_played"`) |
| 0-라 | `src/core/speech/pace.ts` | 수정 | 순수 함수(제안 `speakHeardOf`): 시작 · 끝 알림 유무로 셋을 가름 |
| 0-라 | `src/lib/speech/browser.ts` · `paced.ts` | 수정 | browser.ts 의 감시 끝냄(giveUp no-start · no-end)과 정상 끝(onend)이 heard 를 다르게 싣는다. paced.ts 의 첫 값도 같은 꼴. 가짜 음성은 대본(utterance runs)으로 시작 알림 없음 · 끝 알림 없음을 만들고, 모자라면 `fake-web-speech.ts` 를 고친다 |
| 0-라 | `tests/unit/speech-speak.test.ts` · `fake-web-speech-defaults.test.ts` | 수정 | 세 갈래 |
| 0-마 | `tests/e2e/route-watch.ts`(제안) · `tests/e2e/screen-sampler.ts`(제안) | 신규 | '/' 요청 셈(정한 것 7), 200ms 표본(표지 data-child-said · data-tori-bubble · data-tori-line · data-tori-waiting · data-wait-hint · data-speak · 안내 줄) |
| 0-마 | `tests/e2e/required-utterance.spec.ts`(제안) · `tests/e2e/required-recovery.spec.ts`(제안) | 신규 | 필수 경로 가 · 나 와 복구 예외 둘(증명 절) |

### 묶음 2: 디자인 ② 바탕(회화 구현과 나란히 갈 수 있음)

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 2-가 | `src/app/globals.css` | 수정 | 5.1 값: postit 넷 · ink · ink-soft · paper · kraft 바꿈, desk · talk-deep · tape-1~5 · grid · margin-line · doodle 더함, cork · cork-frame 지움. 5.2 모양: 모서리 셋(카드 · 판 · 단추) · 그림자 값(shadow-postit → 카드, shadow-band → 판, shadow-button 더함) · 종이 테 2.6px |
| 2-가 | `src/components/board/board.tsx` | 수정 | ChildScreen 의 16px 화면 테 없앰 · 책상 바탕 + 꾸밈 층, PaperBand · PostIt · ConfirmSheet 의 종이 테 · 손으로 자른 모서리 · 테이프(열쇠로 고름), 단추 둘 모양, 흐린 단추(opacity-40 대신 종이 바탕 · 먹색 42% 글 · 36% 테 · 그림자 없음), 아이콘 획 상수(제안 `ICON_STROKE` 2.75) |
| 2-가 | `src/components/board/decor.tsx`(제안) · `src/components/board/paper-key.ts`(제안) | 신규 | 바탕 무늬(모눈 28px · 여백 선 왼쪽 58px · 종이 결 한 겹)와 연필 낙서(시안 ② 파일의 선 그림, 가장자리 띠에만, 움직임 없음, data-decor). 순수: 카드 열쇠 → 테이프 길이(104 × 30 ±12%) · 각도(−3° ±3°) · 기울기 · 테이프 색 |
| 2-가 | `src/app/(child)/layout.tsx` · `src/app/dev/teacher-probe/teacher-probe.tsx` | 수정 | bg-cork → bg-desk |
| 2-가 | `src/core/seed/structure.ts` | 수정 | TEACHER_LABEL_TEXT 를 새 paper 값으로, 주석(이름표는 흰 종이 · 먹색 글자, 명단 accent 대비 검사는 spec 대로 그대로). 시드 규격 작업 뒤 |
| 2-가 | `tests/unit/ux-tokens.test.ts`(제안) | 신규 | 토큰 값 = 5.1 · 5.2 표, ink 와 종이 · 색 종이 · 책상의 대비 7:1, cork 없음, 같은 열쇠면 같은 꼴 |
| 2-나 | `src/components/activities/common.tsx` · `activities/{reading,speaking,writing}.tsx` · `answer/{tiles,typing,choice}.tsx` · `session/{reading,writing-composition,writing-guided,writing-rewrite}.tsx` · `(setup)/access/access-code-form.tsx` · `(setup)/first-run/first-run-flow.tsx` | 수정 | 기본 팔레트 색 클래스 28곳 · [#FFFDF7] 셋 · cork/20 → 토큰, strokeWidth → ICON_STROKE |
| 2-나 | `src/components/answer/speak-button.tsx` | 수정 | 듣는 중 남은 시간 고리 talk-deep, 소리 물결 표지 |
| 2-다 | `scripts/check-ids.ts` · `tests/unit/check-ids.test.ts` | 수정 | 규칙(제안) design-color: 화면 소스의 날값 색 · 기본 팔레트 색 클래스 · cork 토큰(globals.css 와 명단 색 style 은 뺌). design-number 상한 인자(제안 `--design-number-max`) |
| 2-다 | `.github/workflows/ci.yml` · `tests/unit/ci-workflows.test.ts` | 수정 | check-ids fail-on 에 design-color, 설계 숫자 상한 |
| 2-다 | `tests/e2e/child-size.ts` · `font-size.spec.ts` | 수정 | 대비 훑기(글자색과 가장 가까운 불투명 바탕 7:1, 흐린 단추 뺌, 글 바로 아래가 책상이면 위반) · 꾸밈 상자 겹침 훑기, AC-N9 고친 문장 |

### 묶음 3 · 4: 홈 · 수업 목록 · 둥근 창 · 초상

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 3 | `src/app/(child)/page.tsx` | 수정 | 위 띠 왼쪽 '[홈 이름]의 공부 보드', 오른쪽 별 칸(0-다 규칙) · 부모 꼬리표(kraft) |
| 3 | `src/app/(child)/home-cards.tsx` | 수정 | 카드: 영역 이름 + 영역 그림 · 단계(크게) · 오늘('오늘 다 했어요' 표지, 또는 '오늘 아직이에요' + '이번 주 n일', 첫 사용은 '첫 수업을 해 봐요' 한 줄만) · 큰 단추. 회화 카드는 작은 초상 + 오늘 이야기 제목. UnitCells · Bar · RecentCells 지움, '여기부터 해요' 그대로 |
| 3 | `src/components/board/area-art.tsx`(제안) | 신규 | 영역 그림 넷: 시안 ② 의 il-book-hand · il-pencil-hand · il-speak-hand · il-chat-hand 선 그림(토리 tori-hand · 모모 그림은 쓰지 않음) |
| 3 | `src/server/home/index.ts` · `src/server/lesson-list/band.ts`(제안) | 수정 · 신규 | 단원 5칸 · 아는 단어 · 최근 성적 · 끝낸 대화 셈을 band.ts 로 옮기고 친한 정도 · '끝낸 세션 있음'을 더함. 홈은 오늘 이야기 제목(회화 목록 '여기부터 해요' 수업)을 더함 |
| 3 | `src/server/lesson-list/index.ts` · `src/core/lesson-list/state.ts` · `src/app/(child)/[area]/lessons/lesson-board.tsx` | 수정 | 위 띠에 단원 5칸 · 막대 둘(회화는 아는 단어 · 끝낸 대화 · 친한 정도), 끝낸 세션이 없으면 막대 숨김(R-13) |
| 3 | `tests/unit/ux-home.test.ts`(제안) · `today-done.test.ts` · `lesson-list-state.test.ts` · `tests/integration/home.test.ts` · `lesson-list.test.ts` · e2e `home.spec.ts` · `lesson-list.spec.ts` | 신규 · 수정 | 위 띠 칸 규칙 · 카드 꼴 · 목록 띠, AC-2a · AC-2d 고친 문장, 사진 |
| 4-가 | `src/components/teacher/teacher-window.tsx` | 수정 | 위가 둥근 창, 연두 10px + 먹색 2.6px 테, 테이프는 창 밖, 방 벽(color.room) + 바닥 띠, 오른쪽 아래 상태 표지 하나(듣기 연두 테 · 마이크, 말하기 accent 물결, 생각 점 셋, 칭찬 별), 흰 종이 이름표(먹색 Jua 24px, −2°), 크기 상수는 262 × 288 기준(7-가 가 정함), 3D 칸 바탕 방 색 |
| 4-가 | `src/components/teacher/teacher-portrait.tsx` · `teacher-choice.tsx` | 수정 | 둥근 창 꼴 갈래(위 둥근 모서리 · 방 색 바탕): 홈 작은 초상(56px 안팎) · '선생님을 골라요' |
| 4-가 | `tests/unit/teacher-window.test.ts` · e2e `teacher-window.spec.ts` · `teacher-choice.spec.ts` | 수정 | AC-19i · 이름표 색 단언(rgb(255, 253, 247) → 먹색 글자 · 종이 바탕) · 창 상자 |
| 4-나 | `src/app/dev/portrait-shot/page.local.tsx`(제안) + 조각 | 신규 | 로컬 전용(next dev 만, seed-viewer 와 같은 꼴, DB 없음): 명단과 줄인 VRM 을 512² 캔버스에 방 색 단색 · 정면 · 입 다문 기본 얼굴 · 멈춘 자세로 그린다. avatar-3d 는 동적 가져오기로만 |
| 4-나 | `src/components/teacher/avatar-3d.ts` | 수정 | 담는 범위 선택 칸 · 멈춘 자세, 회화 창의 머리 위 여유(FRAMING, 화면 꼴 상수) |
| 4-나 | `scripts/teacher-portrait.ts`(제안) · `package.json`(teacher:portrait) · `tests/unit/teacher-portrait-shot.test.ts`(제안) | 신규 · 수정 | 그 쪽 캔버스를 Playwright 로 찍어 PNG → 규격 검사(512², 머리 위 12% 이상, 눈높이 38~42%, 가장자리 방 색) → cwebp q80 → 해시 이름 → --write 면 명단 portrait 칸(경로 · 바이트) · 옛 파일 지움 |
| 4-나 | `seed/teachers.json` · `public/teachers/{mina,leo}.<해시>.webp` | 수정 · 신규 | 새 초상(talk.teacher_portrait_max_kb 100 이하), 옛 둘 지움 |

### 묶음 5 · 6: 화면 가족 · 소리를 들려주지 못함 · 회화 화면

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 5-가 | `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 위 띠 아래 큰 판 하나(판 아래 끝 = 보는 창 아래 끝), 진행 막대, '다음' 큰 단추를 판 안 아래로, 막힘 · 쉼 판 화면 가족 꼴 |
| 5-가 | `src/components/session/activity-progress.tsx`(제안) · `src/core/session/progress.ts`(제안) | 신규 | 활동 묶음 막대(묶음 이름 · 지금 자리), 순수 함수(제안 `activityGroupsOf`) |
| 5-가 | `result-view.tsx` · `reward.tsx` | 수정 | 결과 판(5.4): 가로 두 열(왼쪽 제목 · 번호 · 오늘 만난 단어 · 막대 자리 · 단추 줄, 오른쪽 큰 별), 세로 한 열(별 → 제목 → 단어 → 막대 → 단추), 다시 하기는 별 자리에 '다시 했어요', 쓰기 초고는 별 자리를 접음 |
| 5-가 | `mic-blocked.tsx` · `ai-rest.tsx` · `app-trouble.tsx` · `placement-flow.tsx` · `first-run-flow.tsx` | 수정 | 화면 가운데 큰 판 하나(빈 바탕이 화면 높이 1/3 아래), 배치 문항 · 결과 판, 첫 실행 종이 높이 = 내용(D-14) |
| 5-가 | `tests/unit/ux-progress.test.ts`(제안) · e2e 사진(세션 · 결과 · 막힘 · 쉼 · 오류 · 첫 실행, 가로 · 세로)과 판 상자 높이 셈 | 신규 · 수정 | |
| 5-나 | `src/components/session/sound-retry.tsx`(제안) | 신규 | '소리가 안 나왔어요. 다시 들어 봐요' + 큰 '다시 듣기', 다시도 못 들려주면 무음 모드 줄(아이패드 사파리) + 작은 '다음'. 저절로 건너뛰지 않는다. 순수 함수(제안 `soundRetryStepOf`) |
| 5-나 | `src/components/session/speaking.tsx` · `src/components/answer/repeat.tsx` | 수정 | 듣기 이해 문항 · 따라 말하기 본보기 · 배치 따라 말하기에서 heard 가 not_played 면 sound-retry |
| 5-나 | `src/core/session/attempt.ts` · `src/core/scoring/*` | 수정 | 시도 선택 칸(제안 `techError: "speak_fail"`, 한 번도 못 들려준 채 받은 답). 그 문항은 활동 점수의 분모 · 분자에서 빼고, 다 빠지면 그 항 가중치 0(R-55) |
| 5-나 | `src/core/placement/adaptive.ts` · `src/server/placement/*` · `placement-flow.tsx` | 수정 | 기술 오류 문항은 판정에 넣지 않고 같은 단계 예비 문항, 예비도 못 들려주면 같은 자리에서 '다시 듣기'(R-56) |
| 5-나 | `tests/unit/sound-retry.test.ts`(제안) · `score.test.ts` · `placement.test.ts` · e2e `speech-feedback.spec.ts` · `placement.spec.ts` · `required-recovery.spec.ts` | 신규 · 수정 | AC-23a (5) · N-19 |
| 6 | `src/components/conversation/talk-frame.tsx` | 수정 | 둥근 창 + 옆 칸 오늘 이야기 쪽지 + 흰 대화 판 + 아래 줄 마스킹 테이프 띠, 위 띠 토막 이름 표지, 막힘 · 쉼 · 끊김 판(5-가 조각), 선생님 말을 들려주지 못하면 '소리가 안 나와서 글로 봐요'(speech.skip_notice_seconds, N-20) |
| 6 | `tori.tsx` · `child-turn.tsx` · `follow-along.tsx` · `closing-cards.tsx` | 수정 | 손으로 자른 말풍선 모서리 · 쪽지 꼴, 1단계 ①② · 짧은 준비 · 바닥선의 들려줄 말을 못 들려주면 sound-retry(①② 가 다시 듣기), 마무리 첫 장 판(별 또는 그만둠 줄 → 끝인사 글 → 미션 성공 → 오늘 만난 단어 → '다음'), bg-tape 걷기 |
| 6 | `src/app/globals.css` | 수정 | --color-tape 지움(사용처 0 뒤) |
| 6 | e2e `conversation.spec.ts` · `teacher-window.spec.ts` · `required-utterance.spec.ts` · `speech-feedback.spec.ts` | 수정 | 회화 대화 사진(가로 · 세로), 필수 경로 가 를 대화 기록 칸 표지에 맞춤, AC-23a (3) 회화 몫 |

묶음 7(화면 검토 보고 `review-screen-a.md` · `review-screen-b.md`(제안))과 8(iPad 재시험 기록) · 9(실행 기록)는 코드를 바꾸지 않는다. 결과는 장부와 완료 보고에 남는다.

## 작업 순서 (Order of work)

1. [문서] 2판 델타의 정본 반영이 끝났는지 본다(편집자 진행 중: R-54~R-58, 12절 키 뜻 둘, 9 · 11 · 14 · 15절). 끝 판정: 13절 '반영 끝' 줄과 8절 '복구 예외' 행이 정본에 있다.
2. [사람] 컨트롤러 검토 → 요청자 승인 → 브리프 0-가 · 0-나 · 0-다 · 0-라. 끝 판정: plan approved, 브리프 넷이 작업 장부에 있다.
3. [화면] 0-가 ∥ 0-나 ∥ 0-라 구현 → 코드 검토. 끝 판정: 관문(lint · tsc · test · check:deps · check:ids) 통과와 검토 Approved.
4. [화면] 0-다(0-가 뒤, closing-cards · result-view · talk-frame 이 겹친다). 끝 판정: 관문 통과, `grep -rn "얻은\|gotWord\|GotWord\|data-got-" src tests` 0건, 검토 Approved.
5. [검증] 0-마 필수 e2e 정적 작성. 끝 판정: tsc · lint 통과, 장부에 상태 '작성됨'(실행 아님). 여기가 커밋 후보 ① 이고, 회화 구현이 회화 틀을 잡기 전에 끝낸다.
6. [화면] 2-가(시드 규격 작업이 structure.ts 를 놓은 뒤). 회화 구현은 이때부터 나란히 간다. 끝 판정: ux-tokens 단위 · 관문 통과, [컨트롤러] 로컬 눈 점검 사진(next dev · 개발용 DB · Playwright MCP, 세로 820 · 가로 1180 — 선생님 화면 plan d8 과 같은 길).
7. [화면] 2-나 ∥ 4-가(둘 다 2-가 뒤). 끝 판정: design-color 보고 0, 4-가 단위 · 눈 점검 사진.
8. [검증] 2-다. 끝 판정: CI 와 같은 명령으로 check:ids --fail-on …,design-color 통과, design-number 가 기준 이하. 커밋 후보 ②.
9. [화면] 3(0-가 · 0-다 · 2-가 · 4-가 뒤) ∥ 4-나([컨트롤러] 로컬에서 찍기 → 규격 안 담는 범위 표본 셋(머리 위 여유 12 · 15 · 18%)을 표본 쪽 하나로 요청자에게 보이고 번호로 고름 → --write). 끝 판정: 3 은 단위 · 관문 · 눈 점검 사진, 4-나 는 seed:validate 자산 검사 · check:bundle · check:deps 통과. 커밋 후보 ③.
10. [화면] 5-가(0 · 2 뒤, session-frame · result-view 는 가르치고 구현과 파일 잠금) → 5-나(0-라 · 5-가 뒤). 끝 판정: 단위 · 관문 통과, 검토 Approved. 커밋 후보 ④.
11. [검증] 7-가 화면 검토(Fable · max): 홈 · 목록 · 세션 · 결과 · 막힘 · 쉼 · 오류 · 첫 실행 · 선생님 창 · 고르기. 사진은 CI e2e 사진(E2E_PHOTOS)이 정본이고, 11-01 전에는 로컬 눈 점검 사진으로 '잠정' 판정한 뒤 CI 사진으로 확인한다. fix 라운드는 3회까지다. 끝 판정: 보고에 D 판정 · L-9(말풍선 · 점 셋 자리, 칭찬 가림 M-4, 단추 크기) · 네 색 무게 · 창 크기 상수가 있다.
12. [화면] 6(회화 구현 첫 묶음 · 4-가 · 5-가 뒤) → 7-나 화면 검토(회화 대화 · 마무리). 끝 판정: 검토 Approved, D-6 은 '미완료'로 적는다. 커밋 후보 ⑤.
13. [사람] 커밋 · push(L-19, 회화 재설계 적용과 함께 — 커밋 · 프리뷰 절) 뒤 8 iPad 재시험(요청자): R2 N0 세 조건 · 감시 잠정값과 '끝 알림 없음' 가정(L-8) · R4 체감(2초 · 3초) · 막힘 '다시 해 볼래요' · 무음 모드 한 줄 · 둥근 창의 3D · 홈 막대를 옮긴 뒤의 반응. 끝 판정: 컨트롤러가 13절 확정 줄을 적고 잠정값은 설정값만 고친다.
14. [검증] 9 필수 e2e 실행 확인(11-01 뒤, push 뒤): workflow_dispatch(e2e: true) 또는 PR 'e2e' 라벨로 한 번 돌린다. 실패면 fix 뒤 다시 돌린다. 끝 판정: 증명 절 '필수 둘' 기록. e2e 는 분 한도 때문에 경계마다 손으로만 띄운다.
15. [문서] 완료 보고 · 장부(L-2 · L-3 · L-8 · L-9 · L-12 · L-19 · L-20 · L-21 판정) · plan done.

## 위험 · 제약 (Risks)

| 번호 | 위험 | 막는 법 | 되돌리기 |
|---|---|---|---|
| 1 | 겹치는 파일. 회화 plan(talk-frame · child-turn · follow-along · tori · closing-cards · teacher-window · speak-button · server/conversation/index.ts — 브리프가 든 겹침과 회화 spec 설계 7), 가르치고 plan(session-frame · result-view · reward · 세 영역 활동 조각 — 추측), 시드 규격 작업(src/core/seed/structure.ts · seed/settings.json · specs 09 · 10 사본)이 같은 파일을 고친다 | 파일 잠금: 한 파일은 한 구현자가 맡고, 먼저 잡은 쪽이 Approved 될 때까지 다른 쪽은 기다린다. 묶음 0 은 회화 구현 전, structure.ts 한 줄은 시드 규격 작업 뒤, 가르치고 구현은 2-가 토큰 뒤(그 spec 427줄) | 커밋 전에는 `git checkout -- <파일>` 이 다른 묶음 변경까지 지우므로 쓰지 않고, 묶음 보고의 줄 목록으로 손으로 되돌린다 |
| 2 | p13d specs 사본을 장 단위로 덮으면 p13d 에만 있는 줄(12절 행 19 · 시드 키 28: lesson.* · speech.rate_ko · speech.speak_chars_per_second_ko · seed.goals_required_levels, 13절 시드 규격 줄)이 지워져 check:ids(seed-setting-unknown)가 실패한다 | 장마다 diff 로 p13d 전용 줄을 찾고 09 · 10 은 손으로 합친다(가르치고 정본 반영으로 그 줄이 정본에 들어오면 그때 통째로 복사). 15절 장(11)은 p13d 전용 줄이 없어 먼저 복사해도 된다 | 복사 전 사본을 스크래치패드에 둔다 |
| 3 | 토큰 값 바꿈이 시험을 깬다: seed-teacher.test 'AC-19a'(globals.css paper = TEACHER_LABEL_TEXT), teacher-window.spec 이름표 색, teacher-window.test 의 accent 바탕 이름표, data-got-* 고르개 | 같은 묶음에서 시험을 같이 고친다(2-가 · 4-가 · 0-다). 명단 accent ↔ paper 대비 검사는 spec 대로 둔다 | 토큰 한 줄 |
| 4 | 초상 자산: 새 찍기 도구(로컬 WebGL · next dev), 해시 이름 · 명단 칸 · 옛 파일 지움, 1년 캐시(next.config TEACHER_ASSET_CACHE) | 해시 이름이라 캐시 문제가 없다. seed:validate 자산 검사와 의존 규칙(three-only-in-avatar · avatar-only-dynamic) 통과가 끝 판정이다. 찍기가 막히면 지금 초상을 둥근 창에 맞춰 두고 D-4 는 7-가 가 '일부'로 판정한다 | 명단 portrait 칸을 옛 경로 · 바이트로 되돌린다. 옛 파일은 0c664c3 에 있다 |
| 5 | 한 단 밝은 색: 하늘(ΔE 6.7) · 분홍(10.3)은 거의 바뀌지 않아 네 색 무게가 고르지 않을 수 있고, ink-soft 는 색 종이 위에서 4.3~6.3:1 이다 | 색 종이 위 뜻 줄은 ink 로 쓴다(NFR-U1). 7-가 가 홈 카드 넷을 나란히 보고 정한다(C168) | 토큰 한 줄 |
| 6 | 감시 잠정값(L-8): 시작 알림이 3초 넘게 늦는 기기는 '들려주지 못함'으로 넘어가 다시 듣기 안내가 잦아진다. '끝 알림 없음'을 들려줌으로 보는 가정은 중간에 끊긴 소리를 놓친다 | iPad 재시험(8)에서 재고 13절에 확정한다 | 설정값만 바꾼다 |
| 7 | e2e 를 못 돌린다: 이 Mac 내장 Postgres(L-2), 11-01 전 CI push 금지, push 는 L-19 때. 새 e2e · 고친 e2e 가 모두 정적이고, 설정값 둘로 e2e 시간이 는다(L-3, e2e 작업 상한 45분) | 정적으로 쓰고 첫 실행에서 몰아 고친다(fix 3회까지). 필수 둘은 완료로 적지 않는다(증명 절). 첫 실행 시간이 상한에 닿으면 e2e 를 나누는 안을 컨트롤러가 요청자에게 올린다(분 한도) | 없음 |
| 8 | '/' 요청 셈: Link 미리 읽기가 '/' RSC 요청을 내고, redirect('/') 도 셈에 든다 | route-watch 가 문서 이동과 미리 읽기 아닌 RSC 만 센다. 화면 행동은 바꾸지 않는다 | 없음 |
| 9 | 오류 경계: (child) 틀의 오류는 (child)/error.tsx 가 못 받고, reset 만으로는 서버 자료를 다시 읽지 않는다. 모르는 세션을 notFound() 로 바꾸면 홈 이동을 단언하던 e2e 가 깨질 수 있다 | 루트 error.tsx 를 같은 조각으로 두고 다시 그리기는 router.refresh + reset. 기존 단언을 찾아 같은 묶음에서 고친다 | 파일을 지우면 기본 화면으로 돌아간다 |
| 10 | 1-가의 'AI 쉬는 중'은 하루 안전 상한뿐이라 '다시 해 볼래요'는 다음 학습일 전에는 늘 '아직 쉬고 있어요'다. ai_status 다시 읽기 · 확인 호출(T1 · C29)은 1-나다 | 다시 확인 액션은 같은 판정 함수 하나를 부르고, 1-나가 그 함수에 ai_status 를 더한다. e2e 는 프로필 상한 값을 올려 '풀림'을 흉내 낸다 | 없음 |
| 11 | 시도 입력에 칸을 더하면(R-57) strictObject 라 기기 대기열의 옛 시도와 섞이고, 평가 spec 의 종류 이름(우려 13)과 어긋날 수 있다 | 선택 칸이라 옛 시도는 그대로 통과하고 서버 · 화면은 한 배포다. 이름은 평가 spec 정본 반영 때 맞춘다 | 칸을 지워도 저장된 행은 JSON 이라 읽힌다 |
| 12 | 홈에서 단원 5칸 · 막대를 빼면 아이가 쌓임을 덜 본다(우려 11) | 수업 목록 위 띠 · 결과 막대(P12) · 별 합으로 보완하고 iPad 재시험에서 반응을 본다 | [승인 UX2] 의 '받지 않으면' 안(친한 정도 작은 줄)은 spec 을 먼저 고친 뒤 |
| 13 | 모양 값(2.6px · 모서리 · 각도 · 아이콘 획 2.75)을 화면 소스에 쓰면 설계 숫자 경고가 는다 | 값은 globals.css 토큰과 파일 맨 위 화면 꼴 상수(C72)에만 둔다. 2-다 뒤로는 CI 가 상한으로 막는다 | 없음 |
| 14 | 원칙 경계: 새 그림 자산 금지, 마스코트는 이 plan 밖, 3D 는 회화 세션만(NFR-11) | 영역 그림은 시안 ② 의 il-*-hand 넷만 쓰고 얼굴 자리는 접는다. 작은 초상 · 둥근 창은 그림 파일과 스타일만 쓴다(check:bundle) | 없음 |

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| AC-23a (U1) | 단위: 감시 결과 세 갈래 · 상한 함수(키 셋). e2e: (1) 듣는 중 글 · 소리 들어옴 (2) 대화 턴 읽는 중 단추 · 읽는 중 힌트 듣기(L-12) (3) 시작 알림 없는 발화 → 아이 차례 · 기록 가름 · '소리가 안 나와서 글로 봐요'(회화 몫은 6) (4) 200ms 표본 · 빈 구간 5초 이하 (5) 말하기 듣기 이해 · 본보기 다시 듣기 · 기술 오류 | `tests/unit/speech-speak.test.ts` · `speech-pace.test.ts` · `tests/e2e/speech-feedback.spec.ts` · `required-utterance.spec.ts` |
| AC-23b (U2) | e2e: 읽는 중 누름 · 건너뜀 안내 · 둘째 낱말 막힘 뒤 둘째 낱말부터 · '모름' 안내, 경로 내내 '/' 0회 | `speech-feedback.spec.ts`(1차 묶음 시험 + route-watch) |
| AC-23c (U3) | 단위 · 통합 · e2e: 별 값 1 · 2, 단어 차례, 다시 하기 · 초고, 그만둔 문구, 첫 사용 위 띠 칸 없음 · 첫 별 뒤 별 칸, 화면 글에 '얻은' 없음. 회화 참여 완료 몫은 회화 구현 뒤(6) | `star-count.test.ts` · `ux-screen-feedback.test.ts` · `ux-home.test.ts` · `tests/integration/home.test.ts` · `session-flow.test.ts` · `conversation-session.test.ts` · e2e `home.spec.ts` · `reading.spec.ts` · `session.spec.ts` · `conversation.spec.ts` |
| AC-23d (U4) | e2e: 토막 이름 · 셈, 쪽지 첫 초점, ①② 두 브라우저 맥락, 무음 모드, 쓰기 쪽지. 화면 검토 보고: 불편 장면 열다섯마다 '사라짐 · 남음(근거)', 사라짐 12 이상 | `conversation.spec.ts` · `teacher-choice.spec.ts` · `writing.spec.ts` · 7-가 · 7-나 보고 |
| AC-23e (U5) | (1) 단위 토큰 값 · 대비 짝, check:ids design-color 0 · design-number 기준 이하 (2) e2e 대비 7:1 훑기 (3) e2e 꾸밈 겹침 훑기 (4) 화면 검토: D-1 · D-3 · D-4 · D-5 · D-7 닫힘, D-8 · D-9 · D-10 · D-13 · D-14 판정, D-2 · D-6 '미완료' | `ux-tokens.test.ts` · `pnpm check:ids --fail-on …,design-color` · `font-size.spec.ts` · `child-size.ts` · 보고 |
| AC-23f (U6) **필수** | e2e 실행 결과(아래 '필수 둘') + 단위(말풍선 세움 · 지움) | `required-utterance.spec.ts` · `speech-feedback.test.ts`('M-7 …') |
| AC-23g (U7) **필수** | e2e 실행 결과(N-1 · N-2 · N-3 · N-5 · N-6 · N-7 · N-15 · N-16 · N-19, 목록 · 홈 쉼은 화면을 떠나지 않음, 복구 예외 둘, '/' 0회) + 단위(단추 차례 · 다시 확인 차례) | `required-recovery.spec.ts` · `route-watch.ts` · `ux-recover.test.ts` · `mic-blocked.test.ts` |
| AC-23h (U8) | e2e 사진(홈 보통 · 첫 사용, 가로 · 세로) + 화면 검토 | `home.spec.ts` |
| AC-23i (U9) | e2e 사진(회화 대화 · 선생님 창, 가로 · 세로) + 자산 검사 + 첫 JS 검사 + 화면 검토 | `conversation.spec.ts` · `teacher-window.spec.ts` · `pnpm seed:validate` · `pnpm check:bundle` |
| AC-23j (U10) | e2e 사진(결과 가로 · 세로)과 판 상자 높이 셈(빈 바탕 1/3 아래) + 화면 검토 | `reading.spec.ts` · `session.spec.ts` |
| AC-2a · AC-2d · AC-6e · AC-15e · AC-19i · AC-N3 · AC-N9(고친 정본 문장) | 기존 시험의 단언과 이름을 새 문장에 맞춘다. AC-6b 는 회화 plan 몫이다 | `home.spec.ts` · `today-done.test.ts` · `lesson-list.spec.ts` · `lesson-list-state.test.ts` · `talk-follow.test.ts` · `conversation.spec.ts` · `teacher-window.test.ts` · `teacher-window.spec.ts` · `talk-bubble.test.ts` · `speaking.spec.ts` · `font-size.spec.ts` |
| AC-N12(NFR-U3) | 회화 세션 밖 첫 JS 에 3D 없음 · 의존 규칙 | `pnpm check:bundle` · `pnpm check:deps` |
| 늘 | 린트 · 형 · 단위 · 의존 · 식별자 · 추적 · 시드 · 그림 · 빌드(Node 24 PATH) | `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(사본 맞춘 뒤) · `pnpm seed:validate` · `pnpm images:check` · `pnpm build` · `pnpm check:bundle` |

### 필수 둘은 실행 결과로만 완료

- 상태는 '작성됨'(시험을 쓰고 tsc · lint 통과)과 '실행 통과'(실제로 돌려 통과) 둘이다. AC-23f · AC-23g 와 복구 예외 둘은 '실행 통과' 기록이 장부에 들어가기 전에는 완료로 적지 않는다(C179). 시험을 쓰거나 정적으로 맞춘 것, 단위 시험이 통과한 것은 완료가 아니다.
- 차례: 정적 작성(0-마, 5-나 · 6 에서 N-19 · N-20 · 회화 몫을 더함) → L-19 커밋 · push(회화 재설계 적용 때, 11-01 전이면 [skip ci]) → 11-01 뒤 CI e2e 실행(workflow_dispatch e2e: true 또는 PR 'e2e' 라벨) → 실패면 fix(3회까지) → 통과 기록.
- 기록에는 실행 일시, CI 실행 주소(또는 명령), 돌린 커밋, 필수 시험 수 · 통과 · 실패 0, 사진 아티팩트(e2e-photos)를 적는다. L-2 가 풀려 로컬에서 같은 시험을 끝까지 돌린 기록도 실행 결과로 친다.
- 필수 경로 가: 회화 1단계 · 4단계에서 말로 보낸 턴마다(바로 보낸 1~3단계 턴 포함) 아이 말풍선이 보낸 때부터 다음 선생님 말(첫 문장 · 쉬는 안내 · 끝인사)이 보일 때까지 끊김 없이 있고 글이 인식 글과 같으며, 보낸 뒤 1초 안에 기다림 표시가 보이고, 말하기 세션 인식 글이 다음 문항까지 남는다.
- 필수 경로 나: 막힘 셋 · 쉼 셋 · 앱 오류 · 소리를 들려주지 못함에서 같은 자리로 돌아오고, 복구 예외 둘(회화 4단계 가짜 AI 연결 오류 두 번 → '수업 목록' → '하던 수업 이어 하기' → 같은 말 주고받기 수와 다음 선생님 말 / 첨삭 대기 → '수업 목록' → 가짜 첨삭 도착 → '첨삭 보기' → 같은 초고의 둘째 세션)이 같은 상태로 돌아오며, 그 사이 '/' 요청이 0회다. 대화 기록 칸 단언은 회화 구현 뒤(6) 더한다.
- 회화 구현이 대화 기록 칸으로 화면을 바꾸면 필수 경로 가 를 다시 맞추고 다시 실행해야 한다. 회화 구현은 표지 data-child-said · data-tori-bubble · data-tori-line · data-tori-waiting · data-wait-hint 를 지키거나, 바꾸면 이 시험을 함께 고친다(회화 plan 에 알린다).

## 커밋 · 프리뷰

- 커밋 후보 경계는 ① 묶음 0 끝(1차 묶음 64파일과 함께, 회화 구현 시작 전) ② 묶음 2 끝 ③ 묶음 3 · 4 끝 ④ 묶음 5 끝 ⑤ 묶음 6 끝(회화 구현 위) ⑥ 화면 검토 · iPad 손질 끝이다. 경계마다 늘 하는 관문과 검토 Approved 가 조건이다.
- 실제 커밋과 push 는 요청자 지시로 회화 재설계 적용과 함께 한다(L-19). 이 plan 은 push 하지 않는다. 11-01 전 push 면 커밋 메시지에 [skip ci] 를 넣는다.
- 경계에서 로컬 커밋 지시가 없으면 L-19 때 경로 묶음으로 나눠 커밋한다. 여러 묶음 · 변경 단위가 함께 고치는 파일(talk-frame · closing-cards · tori · teacher-window · result-view · session-frame · home-cards · lesson-board · placement-flow · server/conversation/index.ts · specs 사본)은 경로로 갈리지 않으므로 뒤 묶음의 커밋에 함께 든다. 시드 규격 작업의 파일은 그 작업의 커밋이다.
- 커밋 전 일: (1) p13d specs 사본 맞추기(위험 2 의 차례대로 2판 델타 반영이 끝난 정본에서 장마다 diff, p13d 전용 줄 보존, 뒤에 check:ids 보고 규칙 0 · spec:trace unknown-ac 0) (2) 늘 하는 관문 (3) 장부 L-19 · L-20 · L-21 갱신 (4) 프리뷰 상태표 첫 줄에 D-2 · D-6 미완료와 필수 e2e '작성됨' 상태를 적는다.

## plan 밖 · 정할 것

| 항목 | 몫 | 이 plan 이 하는 것 |
|---|---|---|
| R2 따라 말하기 읽는 중 단추의 최종 꼴 | iPad N0 뒤 13절(묶음 8 결과) | 지금 꼴(흐림 · '다 읽은 뒤 눌러요' · 읽기 끝과 감시 끝에 켬) 유지 |
| R8 맞장구 문구 · 수(talk-wait-lines · talk.wait_line_seconds) | 회화 spec · plan | 맞장구 동안 창 '말하기', 첫 문장 전 점 셋 유지만 지킴 |
| 회화 '참여 완료'가 되는 세션 상태 · AC-6b · 그만둔 대화 조건 문장 | 회화 plan | 별 함수는 세션 상태만 봄, 문구만 0-다 |
| 별 장부 · 단원 막대 변화 · 다시 하기 맞힌 단어 · 연속 학습 일수 · '복습하기' 단추 | 평가 체계(P12) | 결과 판 막대 자리, 위 띠 칸 규칙(값 생긴 뒤에만) |
| 한국어 목소리(speech.rate_ko · speech.speak_chars_per_second_ko) · 세 영역 새 자리 여섯 · 결과 첫머리 되짚기 · '오늘 만난 말' · 말하기 질문 앞 이야기의 들려주지 못함 | 가르치고 plan | 토큰 · 결과 판 자리 · sound-retry 조각을 넘김 |
| 마스코트 모모 · 토리 그림과 얼굴 자리(D-2) | 캐릭터 표본(이 plan 밖, 별도 브리프, L-18) | 자리를 접음, D-2 미완료 |
| 회화 판의 서식 느낌(D-6) | 회화 spec 구현(대화 기록 칸) | 묶음 6 은 꼴만, D-6 미완료 |
| D-11 친한 정도 막대 꼴 · D-12 '선생님의 약속' 줄 자리 · D-15 낱말 그림 | 목업 대조 · 화면 검토 · 실기 사진 뒤(spec 미결 6 · 7) | 아래 줄은 마스킹 테이프 꼴만 |
| 듣기 사건 기록 칸(감시 결과, L-15) | 회화 plan(회화 spec 설계 8) | 음성 층 결과 셋(0-라) |
| 평가 spec 기술 오류 종류 '읽어 주기 실패' · 단계 평가 R 목록(우려 13) | 평가 spec 정본 반영 | 시도 칸 이름을 그때 맞춤 |
| ai_status 다시 읽기 · 확인 호출 · 홈 영역 카드의 쉼 | 1-나 | 같은 판정 함수 자리 |
| 단계 평가 · 복습 화면(N-18) · 부모 화면 '마이크 다시 확인' | P12 · 1-나 | 설계 4 표 규칙을 넘김, 홈 다시 확인 줄 유지 |
| 목업 원본(B_Home4 · B_Result · B_TalkEnd) · 소개 영상 대본의 '얻은' | 11절 목업 손질 · 다음 영상 재생성 | 없음 |

## 장부 항목의 자리

| 장부 | 지금 | 이 plan 의 자리 |
|---|---|---|
| L-2 통합 · e2e 미실행 | 열림 | 9(실행 확인), 위험 7 |
| L-3 설정값 둘로 e2e 시간 증가 | 열림 | 9 첫 실행에서 잰다(위험 7) |
| L-8 감시 잠정값 | 열림 | 8, 위험 6 |
| L-9 말풍선 · 점 셋 자리 · 칭찬 가림 M-4 · 단추 크기 | 열림 | 7-가 · 7-나 |
| L-12 힌트 듣기 배선 e2e | 열림 | 0-마(AC-23a (2)) → 9 |
| L-14 C167 정본 반영 | 반영됨(C180) | 닫힘 판정만 |
| L-15 감시 기록 칸 | 회화 plan | 0-라 가 결과 셋을 넘김 |
| L-19 커밋은 회화 적용과 함께 | 열림 | 커밋 · 프리뷰 절 |
| L-20 1차 묶음과 다른 자리 넷 | 열림 | 묶음 0(정한 것 1) |
| L-21 C179 보완 넷 | spec 2판 끝 · 정본 반영 중 | 작업 순서 1 |

## 확인한 사실과 출처

모두 2026-10-29 22:4x 의 p13d 와 본 저장소에서 확인했다.
- p13d: 머리 0c664c3 위 커밋 전 77 자리다. 1차 묶음 64 와 시드 규격 작업(seed/unit-specs.json · seed/lessons/{reading,writing,speaking}/3 · src/core/seed/* · check-teach.ts 등)이 섞여 있다.
- check:ids: 12절 키 226, 대조 규칙 모두 0, design-number 49(1차 묶음 47 + check-teach.ts 2).
- 앱 오류 화면이 없다: src/app 아래 error.tsx · not-found.tsx 가 없고, 모르는 세션은 session · result 쪽이 redirect('/') 한다.
- 막힘 화면은 MicBlockedText 안의 작은 '다시 해 볼래요'(SmallButton)와 쓰는 쪽의 큰 '홈'(session-frame · talk-frame · placement-flow)이다.
- 쉼은 AiRest 의 안내와 '홈'뿐이다(session-frame · talk-frame · result-view · closing-cards · lesson-board · past-lessons · home-cards). 1-가 쉼은 aiRestingToday(하루 안전 상한)이고 ai_status 는 1-나 몫이다(ai-gate.ts 머리 주석). e2e 는 프로필 ai.safety_daily_calls 를 1 로 두어 쉼을 만든다(tests/e2e/talk.ts reachSafetyCap).
- 회화 끊김 줄은 TroubleLine 의 작은 '다시 해 보기'다. 끊긴 턴은 같은 시도 id 로 다시 받는 길이 이미 있다(server/conversation/state.ts · turn.ts).
- 감시: browser.ts 의 giveUp(no-start · no-end)이 {kind: "ended"} 로 끝내 부르는 쪽이 정상 재생과 가르지 못한다. 3D 렌더러는 투명(alpha)이라 창 칸의 방 색이 비친다.
- ①② 안내는 tori.tsx 의 기기 저장 열쇠 momo.answer-tip.v1 이다. 프로필 한 번 안내는 TALK_NOTICE_KINDS(talk_intro · talk_hint_nudge · talk_test_hint_nudge)와 profiles.notices_seen 이다.
- 홈 위 띠는 '별 n개'를 0 일 때도 그리고, 연속 학습 일수는 아직 없다(P12). 회화 마무리는 다시 하기에도 단어를 그리고, 그만둔 대화 문구는 '다음에 끝까지 이야기하면 별을 받아요'다.
- '얻은' 자리: 식별자 셋(gotWords · gotWordsOf · GotWordCards), 주석 11, 시험 7.
- 토큰 밖 색: 기본 팔레트 클래스 28곳(8파일), [#FFFDF7] 3곳, cork 사용 4곳(layout · board · first-run · teacher-probe), tape 사용 3곳(board · teacher-choice · follow-along).
- 토큰 값에 묶인 시험: seed-teacher.test(paper = TEACHER_LABEL_TEXT "#fffdf7"), teacher-window.spec(이름표 글자 rgb(255, 253, 247)).
- CI: checks 는 push · PR 마다 돈다(spec:trace --fail-on unknown-ac,plan-ac-not-in-spec 포함). e2e 는 main push · workflow_dispatch(e2e) · PR 'e2e' 라벨 때만 돌고 사진은 E2E_PHOTOS 아티팩트다. e2e 웹 서버는 next build · start 라 Link 미리 읽기가 켜진다.
- specs 사본: p13d 의 09 · 10 에 시드 규격 작업 줄(12절 행 19 · 시드 키 28 등)이 있고, 정본과 다른 장은 02-2 · 02-3 · 03 · 07 · 08 · 09 · 10 · 11 · README 다.
- page.local.tsx 는 next dev 에서만 쓰인다(next.config pageExtensions). 지금 초상은 VRM 썸네일을 512² WebP 로 키운 것이다(teacher-reduce.ts).
- 시안 ② 파일 안의 선 그림은 il-book-hand · il-pencil-hand · il-speak-hand · il-chat-hand · dd-leaf · dd-spark · i-* 아이콘이고, 토큰 값은 .cs-b · .th-desk 에 있다.

## 완료 보고 (Done)

구현 뒤 채운다: 실제 바뀐 파일(계획과 다른 것 표시), 시험 결과(단위 수 · 통합 · e2e 실행 기록), 남긴 것, 커밋.

끝 조건은 넷이다. (1) 묶음 0~6 이 검토 Approved 이고 늘 하는 관문을 통과했다. (2) 화면 검토가 D-1 · D-3 · D-4 · D-5 · D-7 을 닫고 D-8 · D-9 · D-10 · D-13 · D-14 를 판정했으며, 불편 장면 열다섯 가운데 12 이상이 사라졌다. (3) iPad 재시험 결과로 잠정값과 R2 를 13절에 적었다. (4) 필수 둘과 복구 예외 둘의 e2e '실행 통과' 기록이 있다. D-2 · D-6 은 관련 변경 단위(마스코트 캐릭터 표본 · 회화 대화 기록 칸)가 끝날 때까지 '미완료'로 적고 끝 조건에서 뺀다(C179).

보정(10-30 05:4x, C192 — 회화 plan 경계 표): 묶음 6(회화 화면)의 파일 목록에 `src/components/conversation/talk-log.tsx`(대화 기록 조각 — 회화 묶음 10 이 만듦)를 더하고, 묶음 6 은 회화 묶음 10~12(대화 기록 · 네 토막 화면 · 옛 흐름 걷기) 뒤에 시작한다. 꼴(판 · 기록 칸 모양 · 쪽지 · 단추 크기 · 말풍선 · 테이프 · 마무리 첫 장 판 · sound-retry 자리)은 묶음 6, 동작 · 자료 · 토막 흐름 · data-* 표지는 회화 plan 이다.
