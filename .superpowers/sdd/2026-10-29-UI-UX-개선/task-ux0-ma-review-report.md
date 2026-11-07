# 코드 검토 보고: UI · UX 묶음 0-마 필수 e2e 정적 작성(검토자 · Opus · xhigh, 2026-10-30 01:5x)

판정: **Changes requested** · Critical 0 · Important 1 · Minor 3. e2e 는 돌리지 않고 코드 · 정본 사본과 정적으로 대조했다. 상태는 '작성됨'이 맞고, 필수 둘은 실행 기록 전에는 완료가 아니다(plan 214~220줄).

## 1. 설계 준수 — 단언으로 옮겨졌는가
- ✅ 필수 경로 나(AC-23g): N-1 · N-2 · N-3 막힘(required-recovery.spec.ts:310-418), N-5 · N-6 · N-7 둘 쉼(:426-606), N-8 · N-9 · N-10(:614-726), N-15 · N-16(:734-849), 복구 예외 N-12 · N-13(:857-983)이 모두 있고, 경로마다 큰 · 작은 단추 차례(expectButtons :125-132)와 '/' 0회(expectNoHome)를 단언한다. 목록 · 홈 쉼은 주소가 그대로임을 본다(:632 · :668). N-19 · N-20 은 끝 주석 자리만 두었다(5-나 · 6 몫, :986-989).
- ✅ N-15: 설정 행을 지워 던지게 하고(정한 것 6) finally 로 되돌리며(:748 · :802-804), MutationObserver 기록으로 data-trouble-retrying 이 판이 사라지기 전까지 풀리지 않았음을 단언한다(:757-799, 0-나 fix 1 권고 그대로).
- ✅ N-12: 이어 열 때 말 주고받기 수가 그대로인지 첫 문장을 늦춰 본다. 서버 자리 계산은 고아 아이 행을 빼므로(server/conversation/state.ts:661 · :711) 보내기 전 셈과 같아야 한다는 단언이 맞다. 앞 대화 기록 그대로 · 같은 시도 id 하나 · 토리 행 하나도 본다(:910-918).
- ✅ ui.wait_hint_seconds 는 시험 DB 설정에서 읽고(required-utterance.spec.ts:88-94 · db.ts settingValueOf), 200ms · 5초는 시험 쪽 상수로 파일 머리에 까닭을 적었다(screen-sampler.ts:6-15).
- ❌ 필수 경로 가(AC-23f)의 갈래 둘이 빠졌다(I1).
- ⚠️ AC-23a (4)는 턴 창만 잰다(M3).

## 2. 고르개 · 표지
- ✅ 쓰는 표지(data-button-size · data-ai-rest-still · data-ai-rest-line · data-trouble-retrying · data-app-retry · data-not-found · data-child-said · data-child-confirm · data-tori-bubble · data-tori-waiting · data-wait-hint · data-speak · data-heard · data-talk-break · data-top-item · data-result-next · data-closing-card · data-placement-item 등)가 모두 src 에 있다. N-3 의 막힘 판은 data-placement-screen 안에 그려진다(placement-flow.tsx:268-294 · :459-472). 앱에 더한 표지는 없다.

## 3. DB 도우미 · 되돌리기
- ✅ 앱 코드에 시험용 갈래가 없다. 상한 채우기 · 풀기(talk.ts liftSafetyCap — ai_calls 지움), 설정 행 지우기(db.ts removeHouseholdSetting — 같은 행을 다시 넣는 되돌리기, finally), 가짜 첨삭 도착(deliverFeedback — insertReadyDraft 가 넣은 초고 시도 하나만 있는 세션), 진행 창 비켜 가기(pastTurnInFlight — 마지막 아이 행 recorded_at 을 5분 물림)는 모두 시험 DB 만 바꾸고, 나머지는 beforeEach resetHousehold 가 지운다.

## 4. '/' 셈(정한 것 7)
- ✅ route-watch.ts:25-34 의 머리 이름(rsc · next-router-prefetch · next-router-segment-prefetch · next-action)이 설치판 next 16.4.2 app-router-headers.js:95-99 와 같다. 문서 이동과 미리 읽기 아닌 RSC 만 세고 서버 액션을 빼므로, 홈에서 부르는 서버 액션(N-9 startLesson · N-10 micCheckSpeech — '/' 로 POST)이 잘못 세지지 않는다. 단위 시험 넷이 갈래를 잠근다.

## 5. 이름 · 상태
- ✅ 시험 이름은 AC-23f · AC-23g 로 시작하고, 두 파일 머리에 '작성됨 — 실행 통과는 11-01 뒤 CI'가 있다. AC-23a 로 시작하는 시험은 없다(M3).

## 6. 지적
**Important**
- **I1 필수 경로 가 의 '끝인사' · '질문 답' 갈래가 없다.** 정본 AC-23f(사본 11장 222줄)와 plan 219줄은 '다음 선생님 말(첫 문장 · 쉬는 안내 · 끝인사)'까지 남음과 '말하기 세션 따라 말하기 · 질문 답의 인식 글'을 재라고 적는다. required-utterance.spec.ts 는 첫 문장(:230 · :260)과 쉬는 안내(:290)만, 말하기는 따라 말하기(:340)만 잰다. 끝인사 갈래는 아이 말풍선을 지우는 자리가 따로 있어(talk-frame.tsx onClose → childSaidStep closed) 이것이 끝인사가 보이기 전에 지우지 않는지가 바로 재야 할 것이다. 고칠 것: (1) 대화 안전 상한 talk.safety_max_turns 를 낮춰(withHouseholdSetting — turn.ts 의 reason "safety" 닫힘) 아이 턴의 다음 반응이 끝인사가 되게 하고 heldUntil 의 until 을 끝인사 글로 둔 시험, (2) 말하기 1~2단계 질문 답 활동에서 data-heard 가 다음 활동까지 남는 시험. 이 둘이 없으면 실행 통과가 나와도 AC-23f 를 완료로 적을 수 없다.

**Minor**
- **M1 N-16 의 둘째 프로필이 앱의 프로필 고르기를 흔들 수 있다(구현자 우려 2 셋째).** readHouseholdProfile 은 `select().from(profiles).limit(1)`(server/profile/index.ts:50)로 차례 없이 첫 행을 고르고, resetHousehold 는 TRUNCATE 가 아니라 DELETE 라 힙 자리가 다시 쓰일 수 있다. 둘째 행이 먼저 읽히면 남의 세션이 '내 세션'이 되어 시험이 이유 없이 실패한다. 1-가 에는 프로필이 하나라 남의 세션 갈래는 단위(session-destination.test · readSessionPlace 의 프로필 거름)로 이미 지켜진다. e2e 에서 그 갈래를 빼거나, 넣은 뒤 앱이 여전히 집 프로필을 읽는지(예: 홈 위 띠 이름)를 먼저 단언해 실패 까닭이 드러나게 하길 권한다.
- **M2 표본 분석이 시각이 아니라 표본 수를 쓴다.** longestBlankMs 는 '이어진 빈 표본 수 × 200ms'(screen-sampler.ts:107-115)라, CI 가 무거워 setInterval 이 밀리면 실제 빈 시간보다 짧게 잰다. 또 '보낸 때'를 아이 말풍선이 처음 보인 표본으로 잡아(:142), 누른 뒤 말풍선이 늦게 뜨는 결함은 기다림 시간 단언(required-utterance.spec.ts:184-186)에서 빠진다. 표본의 at 차로 빈 길이를 재고, 누른 시각을 쪽에 남겨 그때부터 재길 권한다.
- **M3 AC-23a (4)는 수업 하나 전체가 아니라 턴 창만 잰다.** 정본 AC-23a (4)(사본 217줄)는 '느린 가짜 AI(6초) · 시작 알림 없는 음성으로 회화 1단계 수업 하나를 끝까지' 200ms 표본을 잰다. 지금은 AC-23f 시험 안의 턴 창에서만 longestBlankMs 를 보고, AC-23a 로 시작하는 시험이 없다. (3) · (5) 와 함께 6(회화) · 5-나 에서 수업 전체 시험을 더한다고 장부에 적어 두길 권한다.

## 7. 구현자 우려 넷
1. 사본: 풀림(spec:trace 종료 0).
2. 실행 안 함: 결함이 아니다(plan 위험 7). 셋째 항목(N-16 둘째 프로필)은 M1 이다. 4단계 견본 · N-7 의 next 는 실행에서 본다.
3. M4 서버 결함 남음: 시험이 비켜 가는 것은 맞는 선택이고, 결함은 회화 plan 몫으로 열려 있다(0-가 검토 M4). 회화 구현이 고치면 pastTurnInFlight 없는 N-6 변형을 더한다.
4. check:bundle compile 모드: 0-나 M1 을 사실로 확인한 값으로 쓸 만하다. 형 오류가 풀린 뒤 `pnpm build && pnpm check:bundle` 을 한 번 더 돌리는 것은 2-가 몫으로 둔다.

## 8. 판정
**Changes requested.** fix 1: I1(시험 둘 더함). 함께 권함: M1 · M2. M3 은 장부(6 · 5-나 몫).
