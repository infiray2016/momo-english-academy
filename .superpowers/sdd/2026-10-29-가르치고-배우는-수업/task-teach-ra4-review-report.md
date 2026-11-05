# 코드 검토: 가르치고 배우는 수업 묶음 라-4(결과 첫머리 되짚기 · 오늘 만난 말 · 칩 단 문장 틀) — 2026-10-30, 검토자 Opus · xhigh

판정: **Changes Requested** (Critical 0 · Important 1 · Minor 4). fix 라운드 항목은 I1 이고, 같은 라운드에 M2(통합 단언)를 더하기를 권한다. 범위는 보고의 바뀐 파일 아홉이다. 직접 확인한 것은 둘이다. biome check 아홉 파일 오류 0, 단위 시험 넷(result-recap · teach-recap-piece · ux-progress · ux-screen-feedback)은 57 통과(03:37)다. e2e 는 정적이다.

## 1. 설계 준수
- ✅ 첫머리: RecapHead(초상 · 이름표 · 마무리 한 줄)가 본 열 맨 위다(result-view.tsx:241~248). 별 열은 가로에서 오른쪽이고 세로에서 맨 위이며, 판 꼴 · DOM 차례 · flex-row-reverse 는 5-가 그대로다(UI · UX 5.4).
- ✅ 읽기 차례: recapPartsOf(recap.tsx:35)가 마무리(teacher_ko) → 단원 단어(teacher_en, 보여 주기 차례) → 문장 틀(teacher_en)이다. 정본 03:80 '마무리 → 단원 단어 → 문장 틀'과 같다. 들리는 차례와 보이는 차례(첫머리 → 오늘 만난 말 단어 → 그 칸 아래 문장 틀)도 같다.
- ✅ 오늘 만난 말: 단어 · 뜻 · 소리 단추가 카드마다 있고, 칩을 단 문장 틀과 듣기 단추('다시 듣기')는 같은 칸 아래(MetWordCards children)에 있다. 정본 03:26 '오늘 만난 말(… 단원 단어와 뜻 · 소리 단추, 칩을 단 문장 틀 한 줄, 듣기 단추)'과 같다. 그래서 '설계와 다르게 한 것' 2 는 정본대로다.
- ✅ 칸 이름: 세 영역은 REWARD_TEXT.metWords '오늘 만난 말'(teach 없는 수업 포함)이다. 회화 마무리는 자기 문구 CLOSING_TEXT.metWords '오늘 만난 단어'(closing-cards.tsx:38)를 써서 이번 변경이 닿지 않는다(정본 03:24).
- ✅ 줄 고르기: 화면은 서버의 recap.line 에 맞는 시드 글(recapViewOf)만 보이고 다시 셈하지 않는다. 근거 수 · 비율도 화면에 없다(시험 'AC-6f 아이 화면에 점수 · 퍼센트 · 근거 수가 없다').
- ✅ teach 없는 결과 · 쓰기 초고: 되짚기가 없다(사 recapOf 가 draft 를 빼고, recapView 는 recap 이 있을 때만). teach 없는 결과에도 소리 단추가 있고 바로 누를 수 있다.
- ❌ 다시 하기 결과: 되짚기 첫머리까지 뺀다(I1).
- ✅ 설정값: 음성 설정은 세션 틀과 같은 SPEECH_SETTING_KEYS · speechSettingsFrom 으로 읽고, 빠르기는 speakRateOf(level, speech)다. 숫자를 고정하지 않았다.
- ✅ 다른 묶음 파일: 라-4 흔적(recapView · useRecap · RecapHead · '라-4')은 허용 파일 여덟과 e2e 하나에만 있다. 사 recap.ts(02:59)와 라-1 teacher-line · chips(03:10)는 라-4 작업(03:2x~)보다 먼저 고쳐졌다. ux-progress.test.ts 에는 라-4 의 두 줄(:310 · :322)이 라-2 변경과 함께 남아 있고, 그 시험은 통과한다.

## 2. 지적
- **I1 다시 하기 결과에서 되짚기 첫머리(초상 · 마무리 한 줄)까지 뺀다**(`src/server/session/result.ts:120~131` recapViewOf 의 `kind === "retry"` · loadResultView `row.session.kind !== "retry"`, 시험 result-recap 'AC-6f 다시 하기 … 되짚기도 … 없다' · e2e teach-result.spec.ts:218~232). 정본 03:26 이 다시 하기 결과에서 바꾸는 것은 둘뿐이다. '별 대신 다시 했어요'와 '오늘 만난 말은 두지 않는다'이고, 첫머리 되짚기('세 영역 결과 화면의 첫머리는 되짚기다')는 빼지 않는다. 정본 AC-6f 도 '세 영역 세션 결과 화면 첫머리에 선생님 마무리 한 줄이 보이고 읽히며'로 다시 하기를 가르지 않는다. 델타 spec 설계 1 '수업 종류'는 '다시 하기 … 모두 여섯 자리다'라고 하므로 되짚기 자리가 있다. 사 recapOf 도 다시 하기 세션의 줄을 고른다. 브리프의 '다시 하기 결과 … 싣지 않는다'는 정본과 어긋나고, 정본이 우선한다(C186). 고칠 방법: 다시 하기 결과에도 recapView 의 lineKo · teacher 를 실어 RecapHead 를 보인다. 문장 틀은 오늘 만난 말 칸 안의 것이라 다시 하기에서는 두지 않고, 읽는 차례도 마무리 한 줄만이다. 단위 · e2e 시험의 기대를 바꾼다. 컨트롤러가 브리프 쪽을 지키려면 13절 한 줄이 먼저다.
- **M1 쓰기 초고 시험 이름이 단언과 다르다**(result-recap 'AC-6f 다시 하기('다시 했어요') · 쓰기 초고 결과에는 되짚기도 오늘 만난 말도 없다'). 쓰기 초고 갈래는 data-recap-head · data-recap-frame 이 없음만 단언한다. 견본의 metWords(reading 견본, 비어 있지 않음)와 화면 조건(`view.kind === "retry"` 일 때만 숨김) 때문에, 실제 그림에는 '오늘 만난 말'이 있다. 이름을 '되짚기가 없다'로 고치거나 단언을 맞춘다. 쓰기 6단계 이상 첫 세션 결과에 오늘 만난 말을 둘지는 따로 장부에 남긴다. 델타 spec 설계 1 자리 표는 오늘 만난 말을 되짚기(자리 6) 안에 두고, '되짚기는 둘째 세션 결과에만'이라 한다. 지금 이 갈래는 5-가 동작이고 6단계 teach 수업도 없어 이 묶음의 결함은 아니다.
- **M2 결과 서버 길의 통합 단언이 없다**(우려 1 · 요청). recapOf → teach.recap · readHouseholdTeacher · resultSpeechOf 는 단위로 덮이지 않는다. 사 fix 1 의 `tests/integration/session-flow.test.ts`('AC-3e 가르치는 수업 짝' 첫 시험, :789 근처)에 `result.recapView` 단언(lineKo = teach.recap.closeKo · frameEn = teach.recap.frameEn · teacher null)과 `result.speech` 있음을 더하기를 권한다. I1 을 고치면 다시 하기 갈래 하나도 같이 둔다. CI 첫 실행에서 확인한다.
- **M3 되짚기 선생님이 결과를 여는 때의 집 선생님이다**(우려 5, result.ts loadResultView 의 readHouseholdTeacher). 델타 spec 설계 4 는 '1-나 부모 화면의 선생님 바꾸기는 다음에 여는 세션부터다'라고 한다. 그러니 바꾼 뒤에 연 옛 세션의 결과는 그 세션의 선생님이어야 맞다. 1-가 에는 바꾸는 길이 없어 지금은 같다. 1-나 선생님 바꾸기 묶음의 조건(세션에 선생님 키를 남기거나 세션 시작 때 값을 읽음)으로 장부에 올린다.
- **M4 낱말 소리 단추의 읽히는 이름이 모두 '단어 듣기'다**(reward.tsx:118 `aria-label={REWARD_TEXT.listenWord}`). 화면 읽기 기능에서는 단추 목록이 '단어 듣기'만 되풀이되어 어느 낱말인지 알 수 없다. 글은 회화 마무리의 같은 단추 글이라 새 문구는 아니다('설계와 다르게 한 것' 4 는 결함 아님). 단추 이름을 낱말과 이어 주는 방법이 있다. 예를 들어 aria-describedby 로 그 카드의 낱말을 가리키면 문구를 더하지 않아도 된다. 회화 마무리와 함께 화면 검토에서 정한다.

## 3. '설계와 다르게 한 것' · 우려 판정
- (1) ResultView.speech: 정본 03:26 이 teach 없는 결과에도 소리 단추를 두므로 결과마다 싣는 것이 맞다.
- (2) 문장 틀 자리: 정본대로다(위 1절).
- (3) 쓰기 결과 빠르기(speech.rate.<구간>): 설계 4 목소리 표대로다.
- (4) '단어 듣기': 새 문구가 아니다(M4 는 접근성).
- (5) 카드 안 배치: 카드 꼴 토큰은 그대로이고 소리 단추 자리만 더했다. 눈 점검 몫이다.
- (6) '다음 수업' 늘 누름: 정본 '단추가 읽기 뒤 밝아짐'은 오늘 배울 것 · 보여 주기 · '왜'에만 걸리므로 맞다.
- (7) e2e 새 파일: 결함이 아니다. 라-2 의 teach.spec.ts 와 겹치지 않게 한 것이고, 실행은 CI · 7-가 화면 검토 몫이다. I1 고침에 맞춰 :218 시험을 고친다.
- 우려 2(iPad 잠금 풀기)는 '다음 수업'이 읽기와 상관없이 눌리므로 막히지 않는다. 음성 점검에서 본다. 우려 3(그림 층 모듈)은 라-1 과 같다. ⚠️ check:bundle 로 확인한다. 우려 4 는 위 1절이다.

## 4. 시험 · 관문
- 시험 20(단위)은 AC-6f · 6g 의 갈래를 덮는다. teach 없음 · 다시 하기 · 쓰기 초고 · 줄 둘(closeKo · closeKoPracticed 를 세 영역 시드로) · 읽는 차례(ko-KR → 선생님 높이) · 문장 틀 · 들려주지 못함 · skipped · 칸 이름 둘 · 3D 없음 · 다시 셈 없음이다. 이름은 모두 정본 AC 를 품는다. 빠진 것은 서버 길 통합(M2)이다. AC-6h 는 검증기 몫(seed-validator-teach 의 옛 'AC-7c' 이름)이라 이 묶음 밖이다.
- 관문(구현자 보고 그대로, 03:3x): lint 종료 1(오류 6, 모두 라-2 진행 중 tiles.tsx · server/session/index.ts · teach-frame.test.ts) · tsc 종료 0 · 단위 121 파일 · 1426 통과 · 6 todo · check:deps 위반 0 · check:ids 위반 0(design-number 47) · spec:trace 종료 0(unknown-ac 0 · missing-test 16).

## 5. 판정
**Changes Requested.** fix 1: I1(같은 라운드에 M2 통합 단언을 권함). Minor M1 · M3 · M4 는 컨트롤러가 직접 고치거나 장부에 올린다.
