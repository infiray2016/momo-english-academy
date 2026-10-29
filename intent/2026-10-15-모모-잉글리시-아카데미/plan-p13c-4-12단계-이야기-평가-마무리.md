# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P13c 회화 4~12단계 · 토리 이야기 · 홈 회화 카드 · 회화 평가 대화 · 표본 평가와 마무리

spec: `specs/` 정본(3.3 회화 단계표 4~12 행 · 아이 차례(8단계부터 '다 말했어요') · 힌트 문단(C20 — 6~9단계 다시 묻는 턴 뜻 단 · 10~12단계 없음) · 막힘 문단(5단계부터 쉬운 영어 → 설명) · 5단계부터 잘한 말 · 다음엔 이렇게, 3.2 회화 단계 평가 문단 둘, 3.5 토리와 친한 정도 · 토리 이야기, 4절 회화 세션 표(힌트 · 아이 차례 · 옆 칸 미션) · 회화 마무리 행(둘째 장 · 셋째 장 '토리 이야기 듣기') · 토리 이야기 행 · 홈 회화 카드 행 · 단계 평가 행(회화 평가 턴), 5절 profile_tracks 회화 행 · level_tests(회화는 (장, 턴)) · lessons tori_story, 6.2 회화 턴 행(평가 대화 · 4단계부터 출력 칸) · 6.3 회화 평가 카드 · 토리 이야기, 7절 듣기를 끝내는 때(8단계부터 · 평가 대화), 8절 회화 턴 실패(4단계부터), 9절 AI 계약 · AI 계약(수동) · 실시간 호출 표본 평가, 11절 1-가 (9), 12절 talk.feedback_from_level · good_lines · next_time_lines · test_match_pass · test_hint_scores · speech.end_silence_seconds.talk_long · talk.max_answer_seconds, 13절 C4 · C19 · C20 · C21 · C35 · C37 · C43 · C85 · 2026-10-15 '회화 턴이 돌려준 단원 단어는 … 0.9' 잠정 행, 15절 AC-2a(회화 카드) · 5e(회화 화면) · 10e(턴 판정 · 평가 화면) · 15b(4단계 화면) · 15d(화면) · 15e(5단계) · 15g(5단계) · 15h(4~12) · 15l(4단계) · 15n · 16d · 8f(수동) · 9e · 15o · N9(회화), approved 2026-10-16 06:2x) · 델타 spec `intent/2026-10-16-회화-선생님-수업/spec.md` · 묶음 plan P13 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-22 · 상태: approved(컨트롤러 2026-10-22 15:5x — 정할 것 회1~회22 권함대로, 13절 C89~C98 · 회2 평가 나눔은 묶음 plan P12 · P13 행에; 회23 은 표본 평가 결과 뒤 요청자. 요청자 되읽기는 PR 때, C85 '회화 우선' 지시)
승인: (컨트롤러 검토 대기 — 정할 것 회19~회23, a 몫 회1~회15 · b 몫 회16~회18) · 브랜치 · 워크트리: `feature/1a-p13-conversation`(a · b 와 같은 브랜치 · 워크트리 p13) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P13 의 셋째 묶음이다. 짝은 `plan-p13a-회화-턴-호출과-수업-규칙.md`(함께 쓰는 사실 — 나눈 까닭과 배정 · 가정 · 화면을 보는 차례 · 바탕 가지와 겹치는 파일 · P12 와 나누는 몫 · 회화 수업 모델(값 0) · 정본 밖 문구 · 정할 것 회1~회15 · 확인한 사실)와 `plan-p13b-회화-수업-1-3단계.md`(회화 세션 서버 · 턴 길 · 회화 틀 · 1~3단계 화면 · 연결)다. 이 plan 의 작업은 a '화면을 보는 차례'의 차례 7~11 이다. b 차례 6 이 끝난 뒤 시작한다(같은 조각에 단계 몫을 더함).
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.

## 목표 (Goal)

- **4~12단계 몫(차례 7).** 회화 틀 · 아이 차례 · 말풍선에 단계별 몫을 더한다(a 값 7 · 8 · 11 의 결과를 화면에). 4단계부터 토리 말은 AI 가 반응 + 다음 질문을 쓰고(앱이 붙이지 않음 — 끊긴 턴만 카드 질문), 토리 말 뜻은 4단계까지만, '힌트'는 3.3 단계표대로(4~5단계 뜻 → 영어 틀 → 영어 문장 · 5단계 영어 틀 단에 쓸 수 있는 말 · 6~7단계 영어 틀 → 영어 문장 · 8~9단계 영어 틀 · 6~9단계 다시 묻는 턴은 맨 앞에 뜻 · 10~12단계 단추 없음) · 4단계부터 '힌트' 단추는 그 턴 응답이 끝날 때까지 흐림 · 끊긴 턴의 질문 번호가 0 이면 단추 없음. 5~7단계 옆 칸 미션 체크 목록 · 마무리 첫 장 미션 성공. 8단계부터 대화 듣기는 speech.end_silence_seconds.talk_long · 말하기 단추 다시 누름(듣는 동안 글 '다 말했어요') · talk.max_answer_seconds(C37). 5단계부터 첫 '모름'은 쉬운 영어로 바꿔 묻고 둘째부터 한국어 설명 · 힌트 다 열림. 4단계부터 회화 턴 두 번 실패는 'Oops' 길. 마무리 둘째 장 — 5단계부터 끝맺음 턴을 기다려(기다림 표시 · ai.timeout_seconds.feedback) 잘한 말 talk.good_lines 개와 다음엔 이렇게 talk.next_time_lines 개(5~9단계 1 · 10~12단계 2), 4단계는 '토리가 바꿔 말해 준 문장'(마지막 되풀이), 그리고 '한 번 더 말해 보기'(결과 말 + 카드 칭찬 대사, 별 없음).
- **토리 이야기 · 홈 회화 카드(차례 8).** 친한 정도 10칸이 차면 지금 구간의 다음 토리 이야기가 열린다(b 서버가 셈 — a 값 12). 열린 이야기는 홈 회화 카드의 '토리 이야기' 작은 단추와 마무리 셋째 장 '토리 이야기 듣기'로 연다 — 토리가 이야기를 읽어 주고 글이 보이며(1~3 · 4~6 구간은 한국어 뜻 함께), 질문 2개를 보기 3개로 묻고 고르면 바로 맞음을 보인다. 별 · 점수 · 단원 횟수 없음 · AI 0회(4절 · AC-16d). 홈 회화 카드에 토리 얼굴(`ToriFigure`) · 친한 정도 n/10 · 오늘 이야기 제목('여기부터 해요' 회화 수업 제목) · 열린 이야기가 있으면 '토리 이야기' 단추(4절 · AC-2a).
- **회화 평가 대화(차례 9, P12 몫과 나눔 — a 정할 것 회2).** 평가 대화 한 장은 level.test_items_per_session 턴, 세션 하나에 한 장, 인사 토막 없이 토리 첫 말만 짧은 인사(C4). 토리 질문은 카드 대사 그대로, 실시간 AI 는 아이 말에 대한 반응 한 문장만(6.2). 앱이 허용 답 일치율(talk.test_match_pass)로 판정하고(틀 자리 품사 · {NAME}) 쓴 힌트 단으로 talk.test_hint_scores(1 · 0.5 · 0) 점수를 낸다(S2 · AC-10e). 아이 차례: 한국어 뜻을 '내가 할 말' 이름표와 함께 처음부터, '힌트' 한 번 → 영어 틀 · 단추 이름 '문장 다 보기' → 영어 문장, '잘 모르겠어요'는 0점 · 설명 없이 다음, no-speech 는 '모름'이 아니라 '천천히 생각해도 돼요. 생각나면 말하기 버튼을 눌러요'(C35), 듣기는 단계와 관계없이 한 문장 답(C37). 턴 점수를 level_tests 에 (장, 턴)으로 남기고 장이 끝나면 세션을 끝낸다 — level_tests 행 만들기 · 두 세션 차례 · 시작 화면 · 합 · 통과 · 결과 화면은 P12.
- **표본 평가 · 계약 · 마무리(차례 10 · 11).** AI 계약(수동)에 회화 턴 실규격 사례(1 · 4단계 · 스트리밍 · 끝맺음)를 더하고, 실시간 호출 표본 평가 명령(9절 — Haiku 세 조합 · Sonnet, 표본 대화 20개의 아이 턴 대본과 미리 적은 사람 판단, 단원 단어 정밀도 · 재현율 0.9 · '문장으로 한 번 더' · 이어 묻는 질문 · 막힘 판정 · 카드 질문 번호 · 첫 문장 시간 · 출력 토큰 p99)을 만든다. H4 뒤 컨트롤러 · 요청자가 돌려 회화 턴 기본값(ai.effort · ai.thinking · ai.max_tokens.talk_*)을 13절에 적고, 그때 6.3 (4-나) 회화 카드 본 생성(P8)이 열린다(C85 게이트). AC-N9 크기 시험에 회화 화면 전부를 더하고 화면 검토를 다시 한다.
- 경계: 단원 통과 판정 · 별 · 연속 일수 · 회화 평가의 시작 · 결과는 P12. 'AI 쉬는 중' · 부모 화면 · 원문 삭제는 1-나.

## 바뀌는 파일 (Files that change)

손 파일 서른한 줄(새 열다섯 · 고침 열넷 · 회19 를 받을 때만 두 줄 — 이야기 쪽 둘은 한 줄, 회화 틀 · 마무리 카드는 차례마다 한 줄씩이라 파일로는 스물여덟, 회19 를 받으면 서른하나). 검토 묶음 넷(c1 4~12단계, c2 이야기 · 홈 카드, c3 평가 대화, c4 표본 평가 · 계약 · 크기).

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `src/components/conversation/talk-frame.tsx` | 수정 | 옆 칸 미션 체크 목록(5~7) · 'Oops' 안내 → 수업 목록(값 1) | c1 · 7 |
| `src/components/conversation/child-turn.tsx` | 수정 | 4단계부터 힌트 흐림 · 번호 0 힌트 없음 · 6~9 뜻 단 · 10~12 단추 없음 · 8단계부터 '다 말했어요' · 5단계부터 '모름' 차례(값 1) | c1 · 7 |
| `src/components/conversation/tori.tsx` | 수정 | 5단계부터 뜻 없음 · 4단계부터 AI 질문(값 1) | c1 · 7 |
| `src/components/conversation/closing-cards.tsx` | 수정 | 첫 장 미션 성공 · 둘째 장(값 2) | c1 · 7 |
| `tests/e2e/talk.ts` | 수정 | 단계 견본 4 · 5 · 6 · 8 · 10 · 4단계 다지기 · 가짜 SSE 4단계 칸(카드 질문 번호 · 힌트) | c1 · 7 |
| `tests/e2e/conversation-levels.spec.ts` | 신규 | AC-15b(4단계 화면) · 15d · 15e(5단계) · 15g(5단계) · 15h(4~12) · 15l(4단계) · 15n · 5e(회화) | c1 · 7 |
| `src/server/conversation/stories.ts` | 신규 | `server-only`. 열린 이야기 목록 · 이야기 하나(값 3) | c2 · 8 |
| `src/app/(child)/talk/stories/page.tsx` | 신규 | 열린 이야기 목록(값 3) | c2 · 8 |
| `src/app/(child)/talk/stories/[no]/{page,story-view}.tsx` | 신규 | 이야기 · 질문 둘(값 3) | c2 · 8 |
| `src/server/home/index.ts` | 수정 | 회화 카드 칸 넷(값 4) | c2 · 8 |
| `src/app/(child)/home-cards.tsx` | 수정 | 회화 카드 토리 얼굴 · 친한 정도 · 오늘 이야기 · '토리 이야기'(값 4) | c2 · 8 |
| `src/components/conversation/closing-cards.tsx` | 수정 | 셋째 장 '토리 이야기 듣기'(값 3) | c2 · 8 |
| `src/db/schema/learning.ts` · `drizzle/<다음 번호>_tori_stories_by_band.sql`(제안 — drizzle-kit 이 만들고 `drizzle/meta/*` 함께) | 수정 · 신규(회19 를 받을 때만) | profile_tracks 에 구간 → 연 수 jsonb 열(제안 `tori_stories_by_band`) — 더하기만 · RLS · 권한 회수 그대로(P3) · 옛 열 `tori_stories_opened` 는 지금 구간 수로 둠 | c2 · 8 |
| `src/server/conversation/index.ts` | 수정(회19 를 받을 때만) | 세션 끝에서 `tori_stories_opened` 와 함께 지금 구간 칸에 열린 수(a 값 12 의 opened)를 씀 — b 값 1 의 `reachTalkTarget` 한 곳 | c2 · 8 |
| `tests/e2e/tori-story.spec.ts` | 신규 | AC-16d · AC-2a 회화 카드 | c2 · 8 |
| `src/core/conversation/test-turn.ts` | 신규 | 평가 턴 판정 · 점수(값 5) | c3 · 9 |
| `src/core/speech/match-rate.ts` | 수정 | 틀 자리(빈칸) 선택 속성(값 5) — 없으면 지금 그대로 | c3 · 9 |
| `src/server/conversation/test.ts` | 신규 | `server-only`. 평가 대화 화면 자료 · 평가 턴 기록 · 장 끝(값 6) | c3 · 9 |
| `src/server/conversation/turn.ts` | 수정 | 평가 대화 모드(값 6) | c3 · 9 |
| `src/components/conversation/test-turn.tsx` | 신규 | 'use client'. 평가 턴 아이 차례(값 7) | c3 · 9 |
| `src/components/conversation/talk-frame.tsx` | 수정 | 평가 모드(위 띠 '문제 n' · 토막 없음)(값 7) | c3 · 9 |
| `tests/unit/conversation-test-turn.test.ts` | 신규 | AC-10e 단위 | c3 · 9 |
| `tests/integration/conversation-test.test.ts` | 신규 | 평가 턴 기록 · AI 반응만 · 장 끝 | c3 · 9 |
| `tests/e2e/conversation-test.spec.ts` | 신규 | AC-10e 화면 몫 · AC-5e 평가 대화(행은 시험이 넣음) | c3 · 9 |
| `scripts/ai-contract.ts` | 수정 | 회화 턴 실규격 사례(값 8) | c4 · 10 |
| `scripts/talk-observe.ts` | 신규 | 실시간 호출 표본 평가 명령(값 8) | c4 · 10 |
| `tests/fixtures/ai/talk-scripts.json` | 신규 | 표본 대화 대본 · 사람 판단(값 8) | c4 · 10 |
| `package.json` | 수정 | scripts `ai:talk-observe`(제안) | c4 · 10 |
| `tests/unit/talk-observe.test.ts` | 신규 | 정밀도 · 재현율 · 세 턴 규칙 셈(키 없이) | c4 · 10 |
| `tests/e2e/font-size.spec.ts` | 수정 | AC-N9 회화 화면 전부 | c4 · 10 |
| `docs/checklists/talk-observe.md` | 신규 | 표본 평가 결과표 자리(H4 뒤 채움) | c4 · 10 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **4~12단계 화면 몫(talk-frame · child-turn · tori).**
   - 힌트: b 의 단추에 a `hintTiersOf` 결과를 그대로 그린다 — 5단계 영어 틀 단에 쓸 수 있는 말 칩(talk 규격 usablePhrases 개), 뜻만 연 턴에는 쓸 수 있는 말이 안 보임(4절 힌트 행), 6단계는 첫 단(영어 틀)에 쓸 수 있는 말, 6~9단계 다시 묻는 턴(서버가 정한 askKind)이면 맨 앞에 뜻 단(AI 의 next_hint_ko, 걸리면 카드 질문 hintKo), 10~12단계는 '힌트' 단추를 그리지 않는다. 4단계부터 '힌트'는 끝 줄(`{ t: "end" }`)이 올 때까지 흐리고 눌리지 않는다(4절 · AC-15l). 끊긴 턴 · 걸린 힌트로 질문 번호가 0 이면 단추를 그리지 않는다(C19).
   - 말하기: 8단계부터 대화는 a `talkEndRuleFor({ mode: "dialogue" })`(talk_long · talk.max_answer_seconds), 듣는 동안 단추 글 '다 말했어요'(P11a `SpeakButton` 의 `listeningLabel`, C37 — 따로 단추 없음). 남은 시간 고리는 talk.max_answer_seconds 로.
   - 말풍선: 4단계는 영어 뒤 뜻(tori_ko), 5단계부터 영어만(C3). 4단계부터 질문은 AI 의 tori_en 안에 있다(앱이 붙이는 것은 끊긴 턴의 카드 질문뿐).
   - '모름'(3.3 막힘): 5단계부터 첫 '모름'은 AI 가 쉬운 영어로 바꿔 묻는 말(읽어 줌), 둘째 '모름'부터 한국어 설명(말풍선 아래 글) · 힌트 마지막 단까지 열림. 1~4단계는 첫 '모름'부터 설명(b).
   - 옆 칸: 5~7단계는 카드 미션(한국어)의 체크 목록 — 끝 줄의 missionsDone 을 누적해 표시(숫자 · 퍼센트 없음), 그 밖 단계는 오늘 이야기 목록.
   - 4단계부터 회화 턴 두 번 실패(`{ t: "break" }`): 토리 말풍선에 'Oops, I need a little break!'(4단계는 '나 잠깐 쉬어야 해!' 뜻 함께) → 화면 글 '여기까지 이야기한 것은 저장했어요. 다음에 이어서 해요' → 수업 목록(세션 진행 — 다시 열면 이어 함, 8절).
2. **마무리(closing-cards).**
   - 첫 장: 5~7단계 '미션 성공'(제안 줄 이름) 아래 끝낸 미션 목록(카드 미션 한국어, 끝낸 것만 표시).
   - 둘째 장(4절 회화 마무리 · C33): 1~3단계 건너뜀(b). 5단계부터: b `talkClosingStatus` 를 `CLOSING_POLL_MS` 마다 읽고 기다리는 동안 점 셋 → ui.wait_hint_seconds 둘째 값 뒤 '토리가 생각하고 있어요'(정본 밖 문구 표 c 행), ready 면 '잘한 말'(talk.good_lines 개 이하) · '다음엔 이렇게'(talk.next_time_lines[단계] 개 이하 — 정규화가 자른 값), ai.timeout_seconds.feedback 이 지나도 없거나 failed 면 둘째 장을 건너뜀. 4단계: '토리가 바꿔 말해 준 문장'(a `againLineOf` — 마지막 되풀이 문장, 끝맺음을 기다리지 않음), 그런 문장이 없으면 건너뜀. 둘째 장에 '한 번 더 말해 보기' 단추 하나 — 누르면 그 문장(5단계부터 다음엔 이렇게 첫 줄)을 따라 말하기(회화 따라 말하기 듣기 규칙) → 결과 말 + 카드 칭찬 대사(`praiseLines`)를 읽음, 별 · 점수 없음, attempts `talk-again`(a 값 13) · 영어로 말한 문장 +1. 그다음 '다음'.
3. **토리 이야기(`src/server/conversation/stories.ts` · `/talk/stories` · `/talk/stories/[no]`).**
   - `readOpenedStories({ profileId })` → 열린 이야기(구간 · 차례 · 제목). 이야기 행은 lessons kind tori_story · area talk · level = 구간 첫 단계 · lesson_no = 여는 차례(5절), 판은 칸마다 가장 높은 판(정정 포함 — 이야기는 단원 회차가 없음, 정할 것 회19). 열린 수는 구간마다(회19 — profile_tracks 에 구간별 기록).
   - 목록 쪽(제안 `/talk/stories`): 열린 이야기 포스트잇 줄(연두) · 없으면 '아직 열린 이야기가 없어요. 토리와 이야기하면 열려요'(정본 밖 문구 표 c 행) · '홈'.
   - 이야기 쪽(`/talk/stories/[no]?band=<구간>` 제안): 열린 것만(아니면 목록으로). 들어올 때 토리가 영어 글을 읽어 줌(첫 누름 뒤 — iOS) · 다시 읽기 단추(P11 '다시 듣기' 꼴) · 글(영어 24px, 1~3 · 4~6 구간은 한국어 뜻 함께) · 질문 2개를 하나씩: 보기 3개(P10 `ChoiceAnswer`) → 고르면 바로 '맞았어요!' 또는 '정답은 이거예요' + 해설(`explanationKo`) · '다음' → 끝나면 '이야기 목록' · '홈'. 별 · 점수 · 단원 횟수 없음, AI 0회, 시도 기록 없음(토리 이야기 질문은 앱 채점 — 6.2, 기록 칸 없음).
   - 마무리 셋째 장: 이번 세션에서 이야기가 열렸으면(끝 줄 · 화면 자료의 `unlockedStory`) '토리 이야기 듣기' 단추(그 이야기 쪽).
4. **홈 회화 카드(`src/server/home/index.ts` · `home-cards.tsx`).** 회화 카드 칸 넷: `friendship`(profile_tracks talk) · `todayTitle`(회화 수업 목록 '여기부터 해요'인 수업의 제목 — P10 `readLessonList({ area: "talk", closeStale: false })` 의 hereStart(제안 선택 속성 — 홈 진입이 오래 멈춘 세션을 닫지 않게, 5절 '다음 수업 목록 요청 때', 정할 것 회20) · `storiesOpened`(지금까지 열린 수) · '끝낸 대화 n/최소'의 최소를 P10 `minLessonsOf`(배정 수업 수와 단원 복사본 unit.min_lessons 가운데 큰 값 — 3.2, 지금은 복사본 값만 씀, 회20). 화면: 토리 얼굴(`ToriFigure` 작게, 4절 회화 카드 행) · '친한 정도 n/10'(수는 talk.friendship_max) · 오늘 이야기 제목 · '이야기 고르기'(b — 수업 목록) · 열린 이야기가 있으면 '토리 이야기' 작은 단추(`/talk/stories`). 'AI 쉬는 중' 꼬리표는 1-나.
5. **평가 턴 판정(`src/core/conversation/test-turn.ts` · `match-rate.ts`).**
   - `judgeTalkTestTurn({ heard, allowed: AllowedAnswer[], slotOk, homophones, pass })` → `{ correct, rate, best }`: 허용 답마다 P2a 일치율(nameSlot any-word)에 틀 자리를 더해(빈칸 `___` 자리에 온 낱말이 `slotOk(word, slotPos)` 면 맞은 낱말) 가장 높은 값 ≥ pass(talk.test_match_pass)면 맞음. `slotOk` = 그 단계 어휘 범위(vocab band_level ≤ 단계) 안이고 vocab 품사 목록에 slotPos 가 있다(3.2 · 6.2 · AC-10e — 'I like cats' 맞음 · 'It is cat' 아님 · 'It is orange.' 는 orange 품사에 형용사가 있으면 맞음).
   - `match-rate.ts`: `MatchOptions` 에 `slot?: (word: string, pos: SlotPos) => boolean` 과 빈칸 표지의 품사(`slotPos`) — 목표 글의 빈칸을 {NAME} 처럼 한 낱말 자리로 정렬하되 판정 함수가 참일 때만 맞음(제안, 정할 것 회22). 없으면 지금 동작 그대로(말하기 · 배치 · 회화 확인 일치율이 깨지지 않게 — 위험 6).
   - `talkTestTurnScore({ correct, opened, dontKnow }, scores = talk.test_hint_scores)` → 맞고 뜻만 봤으면 scores[0](1) · 영어 틀까지 열었으면 scores[1](0.5) · 영어 문장까지 열었으면 scores[2](0) · 맞지 않거나 '잘 모르겠어요'면 0(S2).
6. **평가 대화 서버(`src/server/conversation/test.ts` · `turn.ts` 평가 모드).**
   - 기록 꼴(정할 것 회21 — P12 가 따른다): 회화 평가 세션 = sessions kind level_test · area talk · level_test_id. level_tests.item_ids = 그 벌의 두 장(level_test_items 행 id, 장 번호 차례), 이 세션이 몇째 장인지 = 같은 level_test 의 앞선 회화 평가 세션 수. answers 는 배열(P10 배치 꼴) `{ sheet, turn, itemId, heard({NAME} · 가림 뒤), opened, dontKnow, score }`, item_scores 는 열쇠 '<장>:<턴>'(5절 '(장, 턴)').
   - `loadTalkTestView({ sessionId })` → 장의 첫 말(짧은 인사) · 턴들(토리 질문 · 1~4단계 질문 뜻 · 아이가 할 말의 뜻 · 영어 틀 · 영어 문장 — 허용 답은 화면에 보내지 않음) · 지금 턴(answers 로 셈) · 설정(talk.test_match_pass · test_hint_scores · 회화 듣기 · speech.*) · 한 번 안내(`talk_test_hint_nudge`).
   - 턴 길 평가 모드: 입력에 `test: true` · 아이 말을 c 값 5 로 판정해 기록(앱이 세고 AI 는 판정하지 않음 — R2) → a `talkTurn` 의 입력 '평가 대화' 참(반응 한 문장만 — 고정부 평가 규칙) → 토리 반응 줄 · 다음 질문은 장의 다음 턴 질문(카드 대사 그대로, 앱이 붙임 · 1~4단계 뜻 함께) · '잘 모르겠어요'면 0점 · 토리는 설명 없이 다음 질문(회화 턴을 부르지 않음 — 3.2 '설명 없이 다음 질문으로') · no-speech 는 이 길로 오지 않음(화면이 안내) · '말' 턴이라 영어로 말한 문장 +1(C41) · '말했다'는 세지 않음(3.4 의 '그 단원의 회화 세션' 목록에 평가가 없음 — 회21) · 끝맺음 · 친한 정도 · 지난 대화 요약 없음. 회화 턴이 실패하면 반응 없이 다음 질문(판정 · 점수는 앱이라 그대로 — 대화는 어느 경우에도 이어짐, 3.2).
   - 장의 마지막 턴 뒤: 세션 완료(completed_at · learning_day) → 이음매 `onTalkTestSheetDone(tx, { levelTestId, sheet })`(제안 — 빈 함수, P12 가 '반을 했어요' · 합 · 통과 · 결과를 붙임).
7. **평가 턴 아이 차례(`src/components/conversation/test-turn.tsx` · talk-frame 평가 모드).** 아이 차례 칸에 '내가 할 말' 이름표와 한국어 뜻(childKo)을 처음부터(C35), 1~4단계는 토리 질문 뜻도 말풍선 아래(4절 단계 평가 행). '힌트'(누르면 영어 틀 · 단추 이름이 '문장 다 보기'로 바뀜 → 누르면 영어 문장) · '잘 모르겠어요'. 프로필의 첫 평가 턴에 '막히면 눌러요' 한 번(회17). 듣기는 a `talkEndRuleFor({ mode: "test" })`(단계와 관계없이 speech.end_silence_seconds.talk.<구간>, C37). no-speech 면 '천천히 생각해도 돼요. 생각나면 말하기 버튼을 눌러요'를 보이고 같은 턴(인식 실패 규칙은 7절 — 마이크 멈춤 · 쓸 수 없음 안내는 b 와 같음). 인식 확인은 회화와 같음(talk.confirm_seconds — 1~3단계 바로 보냄 규칙은 평가에서 열린 영어 문장과 견줌). 판정 · 점수는 화면에 없다(4절 '아이 화면에 점수 · 퍼센트는 보이지 않는다'). 위 띠는 '문제 n'(4절 단계 평가 '문제 화면 위에는 문제 n 만'), 옆 칸 없음, 아래 '토리의 약속'은 그대로.
8. **표본 평가 · 계약(`scripts/ai-contract.ts` · `scripts/talk-observe.ts` · 대본).**
   - 계약 사례(제안 이름, P9c 꼴 · H4 뒤 컨트롤러가 돌림 · AC-8f 수동 · 9절): `talk_turn.l1`(Haiku 5.5 low · disabled · 실제 회화 턴 규격 · 비스트리밍) · `talk_turn.l4`(Sonnet 5.5 low · between_tools · fallbacks) · `talk_turn.stream.l1` · `talk_turn.stream.l4`(스트리밍 — 400 아님 · 첫 text 까지 시간 · 첫 속성이 tori_en 인지 · fallback 블록 유무를 적음, a 위험 2 · 3 · 4) · `talk_closing.l5`(끝맺음 칸). 녹화한 응답을 `tests/fixtures/ai/recorded/` 에 두고 a 견본과 맞댐.
   - 표본 평가 `pnpm ai:talk-observe`(제안 — P9c `ai:observe` 와 같은 결, 개발용 키 · 수동, 9절 '실시간 호출 표본 평가'): 대본 `tests/fixtures/ai/talk-scripts.json` = 대화 20개(1~3단계 카드 — P8 표본이 있으면 그것, 없으면 시험용 견본 카드) · 아이 턴 대본(단어 하나 답 · 틀린 꼴 · 활용형 · 인식 오류로 바뀐 말 · 토리 앞 말 되받기 · 한국어 섞인 말 · 못 알아들었다는 말을 고루) · 턴마다 사람 판단('스스로 알맞게 쓴 단원 단어' · 막힘)을 대본을 돌리기 전에 적어 둠(B5-28). 조합: Haiku 5.5 low · disabled / low · adaptive / medium · disabled(1~3단계), Sonnet 5.5 low · between_tools(4단계 표본). 잰다: 첫 문장 시간 p95 · 카드 주제 밖 턴 비율 · 문장 길이 초과 비율 · 아이에게 보이는 글에 추론 같은 글이 섞인 턴 수 · 단원 단어 정밀도 · 재현율 · 앞 말 되받은 단어를 돌려준 턴 수 · 4단계 '문장으로 한 번 더'가 talk.reask_sentence_every_turns 턴에 한 번을 넘은 턴 수 · 이어 묻는 질문이 talk.follow_up_min_every_turns 턴에 하나 미만인 구간 수 · 막힘 판정이 사람과 다른 턴 수 · 카드 질문 번호가 실제와 다른 턴 수 · 1~3단계 tori_en 에 질문 · 답 예시가 든 턴 수 · 출력 토큰(생각 포함) p99 · 턴마다 는 입력 토큰. 결과는 `docs/checklists/talk-observe.md` 표. 정밀도 · 재현율이 둘 다 0.9 이상인 조합만 기본값 후보(AC-9e · 13절 2026-10-15 잠정 행), 못 미치면 프롬프트를 고쳐 다시 재고 그래도 못 미치면 요청자에게(운영 배포 전).
   - 셈 함수는 `scripts/talk-observe.ts` 안의 순수 함수로 두고 `tests/unit/talk-observe.test.ts` 가 키 없이 본다.

## 작업 순서 (Order of work)

명령 꼴 · 시험 먼저 · 설정 숫자는 a 작업 순서 머리와 같다. 차례 번호는 a '화면을 보는 차례'다.

1. (차례 7) [화면] `tests/e2e/talk.ts`(단계 견본) · `tests/e2e/conversation-levels.spec.ts` → talk-frame · child-turn · tori · closing-cards 의 4~12단계 몫. 완료: e2e 초록(CI), 검토 묶음 c1 → code-reviewer · design-reviewer(4절 회화 세션 표 힌트 · 아이 차례 · 옆 칸 행 · 회화 마무리 둘째 장 · B_Talk5 · B_TalkEnd 꼴, 세로 820 · 가로 1180 사진).
2. (차례 8 앞) [컨트롤러] P11b 차례 7 커밋이 아직 안 합쳐졌으면 합침 — `src/server/home/index.ts` · `home-cards.tsx` 손 맞춤. 회19 가 마이그레이션이면 컨트롤러가 13절 · 5절 줄 뒤 구현자에게 허용(drizzle-kit 더하기만).
3. (차례 8) [서버][화면] `tests/e2e/tori-story.spec.ts` → `src/server/conversation/stories.ts` · 이야기 쪽 둘 · 홈 서버 · 홈 카드 · 셋째 장 단추(· 회19 를 받으면 스키마 · 마이그레이션 · 세션 끝 기록). 완료: 검토 묶음 c2 → code · design(4절 토리 이야기 · 홈 회화 카드 행 · B_Home4 꼴).
4. (차례 9, 차례 8 과 ∥ 가능 — 겹치는 파일은 talk-frame 하나라 차례 8 이 그 파일을 안 고치면 ∥) [검증][서버][화면] `tests/unit/conversation-test-turn.test.ts` · `tests/integration/conversation-test.test.ts` → `src/core/conversation/test-turn.ts` · `match-rate.ts` · `src/server/conversation/test.ts` · `turn.ts` 평가 모드 · `test-turn.tsx` · talk-frame 평가 모드 → `tests/e2e/conversation-test.spec.ts`. 완료: 검토 묶음 c3 → code · design(4절 단계 평가 행의 회화 평가 턴 · B_LevelTest 꼴).
5. (차례 10) [검증][화면] `tests/unit/talk-observe.test.ts` → `scripts/talk-observe.ts` · 대본 · `package.json` · `scripts/ai-contract.ts`(dry-run 으로 요청 꼴 확인 — 키 없이) · `docs/checklists/talk-observe.md`(빈 표) · `tests/e2e/font-size.spec.ts`(AC-N9 회화). 완료: 단위 · e2e 초록, 화면 검토 다시(회화 화면 전부 — design-reviewer), 코드 검토 c4.
6. (차례 11) [사람] H4(요청자 — 개발용 Anthropic 키를 Vercel Preview 에) → [컨트롤러] `pnpm ai:contract --case talk_turn.l1,talk_turn.l4,talk_turn.stream.l1,talk_turn.stream.l4,talk_closing.l5` → `pnpm ai:talk-observe` → 결과표 · 13절 한 줄(회화 턴 기본값 — 요청자 확인) → [사람] 요청자가 프리뷰에서 1단계 회화를 실제 토리와 끝까지(iPad — 이어 읽기 · 천천히 · 읽는 중 누르기, H2 점검표에 회화 줄) → 커밋 · PR 지시(H14) → 6.3 (4-나) 회화 카드 본 생성이 P8 묶음 순서에 열림(C85). 완료: 결과표 · 13절 · 요청자 시험 기록.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 회화 평가 기록 꼴을 P12 가 다르게 짬 | P12 가 평가 화면 · 기록을 다시 짬 | 정할 것 회21 을 P12 브리프에 그대로 넘김 · 이음매 `onTalkTestSheetDone` 하나 |
| 2 | 열린 토리 이야기 수가 열 하나라 구간이 바뀌면 앞 구간 기록을 잃음 | '열린 이야기는 언제든 다시 본다'(4절) | 정할 것 회19 — 구간별 기록(마이그레이션 더하기만) |
| 3 | 표본 평가 · 실호출은 H4 뒤에만 | 회화 턴 기본값 · (4-나) 게이트가 늦어짐 | 대본 · 명령 · 결과표 자리는 미리(차례 10), H4 는 [사람] 으로 따로 알림 |
| 4 | 4~12단계 e2e 견본은 지어낸 낱말 · 견본 카드 | 실제 카드 느낌과 다름 | P8 실시드 뒤 화면 검토 다시(완료 보고에 남김) |
| 5 | 홈이 회화 목록 상태를 읽으면 오래 멈춘 세션을 닫음(부작용) | 5절 '다음 수업 목록 요청 때' 와 어긋남 | 닫기 없이 읽는 선택 속성(회20) |
| 6 | match-rate 에 틀 자리를 더하다 기존 일치율이 바뀜 | 말하기 · 배치 · 회화 확인 판정 | 선택 속성(없으면 그대로) · 기존 match-rate 단위 시험 전부 초록 확인 |
| 7 | 평가 대화를 P12 전에 열 길이 없음 | 아이는 아직 못 씀 | 받아들임 — e2e 가 행을 넣어 화면만 증명, P12 가 시작 · 결과를 붙임 |
| 8 | 4단계부터 힌트 흐림 · 끝 줄 늦음 | 아이가 힌트를 못 누름 | 끝 줄이 오면 바로 밝힘 · 실패 · 끊김 줄도 끝으로 셈 |
| 9 | 크기 시험에 말풍선 듣기 단추 ①② · 힌트 칩이 56px 못 미침 | AC-N9 | 단추는 56px 이상, 글 안 낱말 단추처럼 예외가 필요하면 표시(P11a 위험 9 꼴) · 화면 검토가 판정 |

### 정할 것(컨트롤러 — 보고와 같은 글자. a 회1~회15 · b 회16~회18 과 이어서)

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| 회19 | 토리 이야기 자리 · 기록 | 열린 이야기 목록 쪽(`/talk/stories`)을 두고 홈 '토리 이야기' · 마무리 '토리 이야기 듣기'가 그리로(4절은 '토리 이야기 화면'만 적음). 질문을 틀리면 '정답은 이거예요' + 해설(C77 (1) 꼴, 다시 풀기 없음 — 별 · 점수 없음). 판은 칸마다 가장 높은 판(정정 포함). **열린 이야기 수를 구간마다 기록**: 5절 profile_tracks '열린 토리 이야기 수'가 열 하나(smallint)라 구간이 바뀌면 앞 구간 기록을 잃는다 → profile_tracks 에 구간 → 연 수 jsonb 열 하나를 더하는 마이그레이션(5절 '더하기만', 옛 열은 지금 구간 수로 둠). 마이그레이션을 피하려면 profiles.notices_seen 에 넣는 길이 있으나 뜻이 어긋나 권하지 않음 | 예(5절 한 줄) |
| 회20 | 홈 회화 카드 칸 | '끝낸 대화 n/최소'의 최소를 P10 `minLessonsOf`(3.2 — 지금 홈은 단원 복사본 unit.min_lessons 만 씀, P10 코드와 정본 어긋남을 바로잡음) · 오늘 이야기 제목은 회화 목록 hereStart 를 닫기 없이 읽음(`readLessonList` 선택 속성 `closeStale`, 기본 참) · 토리 얼굴은 `ToriFigure` 작게 | 아니오 |
| 회21 | 회화 평가 대화 기록 꼴(P12 와) | 값 6 대로 — item_ids 두 장 · 세션의 장 = 앞 회화 평가 세션 수 · answers 배열 · item_scores '장:턴' · 장 끝 세션 완료 + 이음매 · 평가 대화는 '말했다'를 세지 않음(3.4 목록 밖) · 영어로 말한 문장은 셈(C41 '단계 평가 대화 포함') · 끝맺음 · 친한 정도 · 지난 대화 요약 없음 · 회화 턴 실패 때 반응 없이 다음 질문 | 아니오(P12 브리프) |
| 회22 | 허용 답 틀 자리 판정 자리 | P2a `match-rate.ts` 에 선택 속성(slot 판정)으로 — 정렬 하나를 같이 써서 회화 평가 · 확인 일치율이 같은 규칙. 따로 함수를 두면 정렬이 둘 | 아니오 |
| 회23 | 표본 평가 · 계약 · (4-나) 게이트 | 대본 20 · 조합 넷 · 결과는 `docs/checklists/talk-observe.md`, 회화 턴 기본값(ai.effort · ai.thinking · ai.max_tokens.talk_turn · talk_closing)은 결과 때 13절(요청자 확인, C21 의 'p99 두 배'). (4-나) 게이트의 '표본 카드'(6.3 (4-나) · C85)는 P8 표본(6.3 (2))이 있으면 그것, 없으면 시험용 견본 카드로 계약 · 관찰을 먼저 하고 정밀도 · 재현율 판정은 P8 표본 카드로 다시 | 결과 때 |

### 제약

a '제약'과 같다. 더해서 — 토리 이야기 · 평가 판정은 AI 를 부르지 않는다(6.2). 평가 대화의 AI 는 반응 한 문장만이고 판정 칸이 없다(R2). 아이 화면에 평가 점수 · 퍼센트가 없다. 수동 명령(계약 · 표본 평가)은 개발용 키로만 돌리고 결과 파일에 아이 글 · 키를 넣지 않는다(대본은 지어낸 아이 턴). 마이그레이션(회19 를 받으면)은 더하기만 · RLS · 권한 회수 그대로(P3 규칙).

### 다른 P 에 넘길 것

a · b '다른 P 에 넘길 것'과 같다. 더해서 — P12: 회화 평가 시작 화면('먼저 뜻만 보고 말해 봐요. 막히면 힌트를 눌러요', AC-10h) · level_tests 행 · 장 차례 · `onTalkTestSheetDone` 에 '반을 했어요' · 합 · 통과 · 결과 · '틀린 문항'(점수 1 미만 턴)으로 보강 고르기(3.2). P8: 표본 평가가 고른 조합과 프롬프트 판으로 (4-나) 시작, 카드 미션 · 쓸 수 있는 말 · 카드 질문 목록 수(목표 턴 − 인사 턴 이상)를 시드 브리프에. 회화 선생님 캐릭터: 홈 카드 토리 얼굴도 `ToriFigure` 경계.

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-15d(화면) | e2e "AC-15d 회화 4단계 마무리 둘째 장에는 '다음엔 이렇게'가 없고 '토리가 바꿔 말해 준 문장'이 보인다" · "AC-15d 회화 5단계 마무리 둘째 장에는 잘한 말 2개와 다음엔 이렇게 1개가, 10단계에는 잘한 말 2개와 다음엔 이렇게 2개가 보인다" | `tests/e2e/conversation-levels.spec.ts` |
| AC-15e(5단계) | e2e "AC-15e 5단계 마무리 둘째 장은 끝맺음 턴이 올 때까지 기다림 표시를 보이고 '한 번 더 말해 보기'를 하면 결과 말과 칭찬 대사가 나오며 별 수는 바뀌지 않는다" | `conversation-levels.spec.ts` |
| AC-15g(5단계) | e2e "AC-15g 5단계에서도 오늘 쓸 말에 한국어 뜻이 보이고 '잘 모르겠어요'를 누르면 먼저 쉬운 영어로 바꿔 묻는 말이 읽어 주어지며 한 번 더 누르면 한국어 설명이 보이고 힌트가 마지막 단까지 열린다" | `conversation-levels.spec.ts` |
| AC-15h(4~12) | e2e "AC-15h 6단계 다시 묻는 턴의 '힌트'는 한국어 뜻 단부터 열리고 처음 묻는 턴의 첫 단은 AI 출력과 관계없이 영어 틀이다" · "AC-15h 10단계 다시 묻는 턴에는 '힌트' 버튼이 없고 8단계 다시 묻는 턴에서 '힌트'를 두 번 누르면 한국어 뜻 다음에 영어 틀이 보인다" | `conversation-levels.spec.ts` |
| AC-15l(4단계) | e2e "AC-15l 4단계 턴에서 응답이 끝나기 전에는 '힌트' 버튼이 흐리고 눌리지 않는다" | `conversation-levels.spec.ts` |
| AC-15n | e2e "AC-15n 회화 4단계 수업은 인사 → 오늘 쓸 말 → 대화 → 정리로 이어지고 말해 보기가 없으며 인사 턴이 '말 주고받기 n'에 들고 위 띠는 '말 주고받기 n / 목표 턴'이다" · "AC-15n 오늘 쓸 말 뒤 대화 토막의 첫 질문은 카드 질문 목록 1번이고 그때 AI 호출은 0회이며 옆 칸의 오늘 이야기 목록은 카드의 목록이다" · "AC-15n 정리 토막은 끝맺음 턴을 기다리지 않고 보일 단어가 없는 다지기 수업은 오늘 쓸 말 없이 대화로 가며 정리는 카드 정리 대사다" | `conversation-levels.spec.ts` |
| AC-15b(4단계 화면) | e2e "AC-15b 이어 묻는 질문(번호 0) 턴의 힌트가 걸리면 '힌트' 버튼이 보이지 않는다" | `conversation-levels.spec.ts` |
| AC-5e(회화 화면) | e2e "AC-5e 회화 4단계 한 문장 답은 speech.end_silence_seconds.talk.4-6 조용하면 끝나고 회화 8단계 답은 그보다 짧은 쉼에서 끊기지 않고 speech.end_silence_seconds.talk_long 조용하거나 '다 말했어요'를 누르거나 talk.max_answer_seconds 에서 끝난다" + e2e "AC-5e 회화 8단계 평가 대화의 답은 speech.end_silence_seconds.talk.7-9 조용하면 끝난다" | `conversation-levels.spec.ts` · `tests/e2e/conversation-test.spec.ts` |
| 4~12 몫(AC 접두 없음) | e2e "회화 4단계: 회화 턴이 두 번 실패하면 토리가 'Oops, I need a little break!'와 '나 잠깐 쉬어야 해!'를 말하고 '여기까지 이야기한 것은 저장했어요. 다음에 이어서 해요' 뒤 수업 목록으로 가며 세션은 진행으로 남는다" · "회화 5단계: 옆 칸에 미션 체크 목록이 있고 회화 턴이 미션을 끝내면 표시되며 마무리 첫 장에 끝낸 미션이 보인다" | `conversation-levels.spec.ts` |
| AC-2a(회화 카드) | e2e "AC-2a 홈의 회화 카드에 친한 정도 n/10 과 '여기부터 해요' 회화 수업의 제목이 보이고 '이야기 고르기'를 누르면 회화 수업 목록이 열리며 열린 토리 이야기가 있으면 '토리 이야기' 작은 버튼이 있다" | `tests/e2e/tori-story.spec.ts` |
| AC-16d | e2e "AC-16d 열린 토리 이야기를 홈 회화 카드에서 열면 읽어 주기와 글, 질문 2개(보기 3개)가 나오고 고르면 바로 맞음이 보이며 AI 호출은 0회이고 별 수는 그대로다" | `tori-story.spec.ts` |
| 토리 이야기(AC 접두 없음) | e2e "토리 이야기: 친한 정도가 차서 이야기가 열린 회화 마무리 셋째 장에 '토리 이야기 듣기'가 보이고 누르면 그 이야기가 열린다" · "토리 이야기: 1~3 구간 이야기는 한국어 뜻을 함께 보이고 열리지 않은 이야기 주소는 목록으로 간다" · (회19 를 받을 때) "토리 이야기: 구간이 바뀌어도 앞 구간에서 연 이야기가 목록에 남는다" | `tori-story.spec.ts` |
| AC-10e(턴 판정) | 단위 "AC-10e 회화 단계 평가 함수는 명사 틀 자리 'I like ___.' 에 'I like cats' 를 맞음으로 세고 형용사 틀 자리 'It is ___.' 에 'It is cat' 은 맞음이 아니다" · "AC-10e {NAME} 자리에는 무엇이 와도 맞은 단어로 세고 'It is orange.' 는 orange 의 품사 목록에 형용사가 있으면 맞음이다" · "AC-10e 맞은 턴은 한국어 뜻만 봤으면 1, 영어 틀을 열었으면 0.5, 영어 문장을 열었으면 0 이고 맞지 않은 턴과 '잘 모르겠어요' 턴은 0 이다" | `tests/unit/conversation-test-turn.test.ts` |
| AC-10e(평가 화면) | e2e "AC-10e 회화 평가 턴은 처음에 한국어 뜻만 '내가 할 말' 이름표와 함께 아이 차례 칸에 보이고 2단계 평가는 토리 질문의 뜻도 말풍선 아래에 보인다" · "AC-10e 평가 턴에서 '힌트'를 한 번 누르면 영어 틀이 보이고 버튼 이름이 '문장 다 보기'로 바뀐다" · "AC-10e 평가 턴에서 no-speech 가 두 번 나도 그 턴은 0점이 되지 않고 '천천히 생각해도 돼요' 안내 뒤 이어진다" · "AC-10e 프로필의 첫 평가 턴에는 '힌트' 버튼에 '막히면 눌러요'가 한 번 보인다" + 통합 "AC-10e 회화 평가 턴의 AI 는 반응 한 문장만 쓰고 턴 점수는 앱이 허용 답 일치율과 쓴 힌트 단으로 세어 (장, 턴)으로 남긴다". 20턴 합 · 통과 · 두 세션은 P12 | `tests/e2e/conversation-test.spec.ts` · `tests/integration/conversation-test.test.ts` |
| AC-8f(수동) | 수동 `pnpm ai:contract --case talk_turn.l1,talk_turn.l4,talk_turn.stream.l1,talk_turn.stream.l4,talk_closing.l5`(H4 뒤): 두 설정이 400 없이 받아짐 · 녹화 표본 | `scripts/ai-contract.ts` |
| AC-9e · AC-15o | 수동 `pnpm ai:talk-observe`(H4 뒤): 표본 대화 20 × 조합 — 정밀도 · 재현율 ≥ 0.9 조합만 기본값 · 4단계 '문장으로 한 번 더' · 이어 묻는 질문 · 1~3단계 tori_en 에 질문 · 답 예시 없음 + 단위 "표본 평가 셈: 정밀도와 재현율은 사람 판단과 AI 가 돌려준 단원 단어로 세고 세 턴 규칙을 넘은 턴을 센다" | `scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts` · `docs/checklists/talk-observe.md` |
| AC-N9(회화) | e2e "AC-N9 회화 화면(처음 안내 · 인사 · 대화 · 힌트 열림 · 인식 확인 · 오늘 쓸 말 · 말해 보기 · 정리 · 마무리 세 장 · 토리 이야기 · 평가 턴)과 홈 회화 카드의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없고 세로 820 · 가로 1180 에서 가로 넘침이 없다" | `tests/e2e/font-size.spec.ts` |
| 공통 | a 증명 '공통' 줄과 같은 명령 · CI · 녹음 API 없음 · design-reviewer 보고(심각도 · 근거, 세로 820 · 가로 1180 사진) | 차례 7~10 |

## 완료 보고 (Done)

구현 뒤 채운다.
