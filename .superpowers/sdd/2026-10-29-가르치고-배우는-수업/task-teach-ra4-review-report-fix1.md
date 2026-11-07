# 재검토 fix 1: 묶음 라-4(I1 · M1 · M2 · M4, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). M3 은 지시대로 1-나 조건 장부 몫이라 보지 않았다. 직접 확인한 것은 셋이다. 단위 다섯(result-recap · teach-recap-piece · ux-progress · ux-screen-feedback · talk-follow)은 69 통과다. 바뀐 파일 아홉의 biome check 는 오류 0 이고, tsc 는 종료 0 이다(03:48).

## 지적별
- **I1 ADDRESSED.** recapViewOf(`src/server/session/result.ts:130~146`)는 다시 하기에도 lineKo · teacher 를 싣고, frame 만 null 이다. loadResultView 의 다시 하기 제외 조건은 지웠다(:330~337).
  - 화면(result-view.tsx)은 다시 하기에서도 RecapHead 를 본 열 맨 위에 둔다.
  - useRecap 에는 단어를 비우고(:193~194) frame null 을 넘긴다. recapPartsOf(recap.tsx:38~46)가 frame 이 없으면 문장 틀을 읽지 않으므로, 읽는 것은 마무리 한 줄뿐이다.
  - 오늘 만난 말 칸(단어 카드 · 문장 틀)은 다시 하기에서 그리지 않고, 별 자리는 '다시 했어요' 그대로다.
  - 정본 03:26(다시 하기는 별 대신 '다시 했어요' · 오늘 만난 말 없음, 첫머리 되짚기는 그대로)과 AC-6f 와 맞는다.
  - 시험: result-recap :153 · :254, teach-recap-piece :219(마무리 한 줄만 읽음), e2e :218 기대 고침.
- **M1 ADDRESSED.** 쓰기 초고 시험(result-recap :279)은 이름과 단언을 '되짚기 첫머리 · 문장 틀이 없다'로 맞췄고, 오늘 만난 말 있음 · 없음은 단언하지 않는다. 정본 03:26 은 쓰기 6단계 이상 첫 세션에 대해 '글을 보냈어요 …'와 '되짚기는 둘째 세션 결과에만'만 정하고, 오늘 만난 말을 이 결과에 둘지는 따로 말하지 않는다. 그러니 지금 동작(5-가 그대로 '있음')을 두고 장부로 넘긴 처리가 타당하다.
- **M2 ADDRESSED(정적).** `tests/integration/session-flow.test.ts:821~850` 의 기대값이 시험 자료와 맞는다.
  - recapView 의 lineKo = teach.recap.closeKo 다. 같은 시험이 앞에서 recap.line closeKo(유효 3 · 독립 3)를 단언하므로 맞물린다.
  - frame = 시드 frameEn · chips(글 · role)다.
  - teacher null 이다. 프로필 시작이 teacherKey 를 채우지 않고, readHouseholdTeacher 는 키가 없으면 null 이다(`src/server/teacher/index.ts:58`).
  - speech.skipNoticeMs = speech.skip_notice_seconds × 1000 이다. speechSettingsFrom 이 같은 환산을 한다(`src/core/speech/listen.ts:124~125`). readKo = speech.read_ko 다.
  - 다시 하기 갈래는 같은 세션을 kind retry 로 바꿔 다시 읽으면 { lineKo closeKo, frame null, teacher null } 이다.
  - tsc 종료 0 으로 타입을 확인했다. 실행은 CI 첫 실행에서 확인한다(⚠️).
- **M4 ADDRESSED.** listenWordLabel(`src/components/session/reward.tsx:33`)이 접근 이름을 '단어 듣기: <낱말>'로 만든다. 단추에 보이는 글은 없고(소리 그림만) 아이 화면 글도 바뀌지 않았다. 앱에 있던 글에 낱말만 이은 것이라 새 문구도 아니다. e2e 의 이름 찾기는 부분 일치라 그대로다. 회화 마무리 단추(`src/components/conversation/closing-cards.tsx:29 · :182`)도 같은 함수를 쓰도록 import 한 줄과 aria-label 한 줄을 고쳤다. 이 파일은 라-4 브리프의 '손대지 않는 파일'(회화 틀)이다. 구현자는 컨트롤러 지시('쓰면 함께')를 따랐다고 하므로 허용된 범위로 본다. 내용은 접근 이름 하나라 회화 동작 · 표지(data-word-listen)에 닿지 않는다(talk-follow 통과). 회화 묶음 담당에게 이 두 줄을 알려 두기를 권한다.

## 새로 깨뜨린 것
없음. teach 없는 결과 · 쓰기 초고는 전처럼 recapView 가 없다(recap 없음). 다시 하기가 아닌 teach 결과의 차례(마무리 → 단어 → 문장 틀)는 그대로이고, 기존 시험은 frame 꼴에 맞춰 통과한다.

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다.
