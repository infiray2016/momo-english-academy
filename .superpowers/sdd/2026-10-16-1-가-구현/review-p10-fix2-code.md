# 재검토 보고: P10 fix 2(review-p10-3-code I-1 · M-1~M-3 · review-p10-fix1 N-1 · N-2 · 컨트롤러 핫픽스 둘 · 보드) — rev-p10, 2026-10-18 00:5x

**라운드 판정: Approved** — 지적 여섯 모두 ADDRESSED, 핫픽스 둘 타당, 새로 깨뜨린 것 없음. 새 Minor 둘은 컨트롤러가 직접 고치거나 fix 3 에 넣으면 된다. B1 코드 지적의 fix 라운드 1회째.

재현(워크트리 파일은 고치지 않음, 막힌 포트는 건드리지 않음, e2e 는 포트 54339 를 써서 돌리지 않음):
- 스크래치패드 복사본 `scratchpad/rev-p10-fix2/copy` 를 썼다. 비밀 파일 · `.dev` 를 뺐고 node_modules 는 링크다.
- 홈 변이 넷을 다시 돌렸다(통과 시각 · 칸 수 · 이번 주의 배치 · 오늘 완료의 배치).
- 회귀(복사본):

  | 명령 | 결과 |
  |---|---|
  | 통합 first-run · home · lesson-list | 23 통과 |
  | 단위 전체 | 334 통과(진행 중인 차례 5 시험 포함) |
  | `check:deps` | 위반 0(108 모듈) |
  | `biome ci` | 고칠 것 없음 |
- 차례 5 판: 검토 시점의 `home-cards.tsx` 는 `PLACEMENT_OPEN = false` 그대로였다. `tests/e2e/home.spec.ts` 의 배치 href 단언도 바뀌지 않았다.
- 남은 프로세스 · 임시 폴더 0.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| 코드 I-1 AC-5c 둘째 e2e | **ADDRESSED** | 아래 |
| 코드 M-1 통합 빈틈 | **ADDRESSED** | `tests/integration/home.test.ts` 둘째 시험에 통과 시각 없는 단원 3 회차와 복사본 `unit.recent_window` − 2 가 들었다. 변이 H3(통과 시각 무시) · H8(칸 수 5 고정)이 둘 다 이제 깨진다 |
| 코드 M-2 (가) 이번 주 n일에 배치 | **ADDRESSED** | `src/server/home/index.ts`:133-148 — 이번 주는 `allAreaSessions`(배치 포함), 오늘 완료는 배치를 뺀 `areaSessions`. 새 통합 '…배치 평가 세션을 끝낸 날도 세고 오늘 완료는 배치 평가로 켜지지 않는다'(:195)가 H5a(이번 주에서 배치 빼기)를 잡는다. H5b(오늘 완료에 배치 넣기)는 같은 동작의 변이라 살아남는다 — `todayDone` 은 배치 종류를 어떤 갈래에도 세지 않으므로 :148 의 빼기는 방어용이다 |
| 코드 M-3 카드 이름 | **ADDRESSED** | `src/app/(child)/home-cards.tsx` 의 카드 넷 모두 `label` 을 넘기지 않는다(:186-245). 닫힌 카드의 이름에 '마이크가 필요해요. 부모님께 말해 주세요'가, 배치 전 카드에 '내 단계 찾기'가 든다. 행동 자리('시작!')는 `aria-hidden` 그대로다 |
| fix1 N-1 설정 키 로그 | **ADDRESSED** | `src/server/profile/index.ts`:137-140 — `SettingMissingError` 면 '첫 실행 저장 실패(설정 <키> 가 없습니다)' · unavailable. 통합(:413-433)이 로그에 키가 있고 이름 · PIN 해시가 없음을 단언한다. 키만 남고 값은 남지 않는다 |
| fix1 N-2 주석 보기 | **ADDRESSED** | `src/server/db/safe-error.ts`:11 이 'Error P0001' 과 그 까닭을 적는다 |

**I-1 확인.**
- 첫 AC-5c(:174)의 `denied` 쪽(:194-199)과 둘째 AC-5c 의 새 쪽 셋(`denied` :267 · `first` :291 · `second` :301)은 모두 `installFakeWebSpeech` 를 먼저 넣는다. 기본 `page` 는 픽스처가 넣는다(`tests/e2e/fixtures.ts`:42-45, 바뀌지 않음). 다른 e2e 파일에는 새 쪽 · 새 문맥이 없다. 그래서 e2e 가 실제 브라우저의 인식 API 에 기대는 곳이 없어졌다. 리눅스 WebKit 의존도 사라졌다.
- **audio-capture 절**: 새 대본 `tests/fixtures/speech/scripts/audio-capture.json` 은 시작 뒤 audio-capture 오류 한 번과 끝이다. 마이크 확인 한 번(`checkMicrophone`)에 오류 하나라 7절 '같은 활동에서 세 번 이어짐 → 쓸 수 없음'과 겹치지 않는다. 둘째 AC-5c (1)(:225-262)이 이 대본으로 첫 실행 마이크 확인을 실패시킨다. 그 뒤 실패 줄이 보이고, 홈에서 `momo.mic.v1` 이 비어 있으며, 말하기 · 회화 카드가 링크임을 단언한다.
- **변이**: 첫 실행의 기록 조건(`first-run-flow.tsx`:305 `result.group === "mic-unavailable"`)을 '모든 실패'로 바꾸면 audio-capture 도 기록된다. 그러면 :256-258 `toBeNull()` 과 카드 href 단언이 깨진다(코드로 본 추론 — e2e 는 돌리지 않음).
- **'홈 진입마다 다시 확인' 절**: (3)이 인식 API 없는 문맥 → 닫힘 · 저장 없음 → 같은 문맥의 다음 쪽(API 있음) → 열림을 본다.

## 2. 핫픽스 판정(`src/app/(setup)/first-run/first-run-flow.tsx`)

| 핫픽스 | 판정 | 근거 |
|---|---|---|
| 한글 이름 칸 `value` → `defaultValue`(비제어, :428) | 타당 | 상태(`displayName`)는 `onChange` 가 그대로 채운다. 그래서 '다음' 조건(`nameReady`), 영어 이름 미리 채움(`englishShown`), 저장 값(:320)이 모두 상태를 읽어 어긋나지 않는다. 상태를 코드가 따로 고치는 길이 없어(처음 "" 뿐) 비제어여도 화면과 상태가 갈리지 않는다. e2e `fill` 은 input 이벤트를 내므로 그대로 돈다(구현자 e2e 34 초록) |
| `<Fragment key={step}>{body}</Fragment>`(:745) | 타당 · 비제어의 필수 짝 | 키가 없으면 PIN 화면 첫 `<input>`(password)과 이름 화면 첫 `<input>`(text)이 같은 자리라 React 가 DOM 요소를 재사용한다. 비제어에서는 그 요소의 값(PIN)이 남는다. 키로 단계마다 새로 만들면 막힌다. 뒤로 갔다 오면 새 요소가 `defaultValue={displayName}` 으로 다시 채워진다. 상태는 `FirstRunFlow` 에 있어(정할 것 커 '화면 메모리') 잃지 않는다. 초점 효과(:212-215)는 새 요소가 붙은 뒤 `[step]` 로 돌아 새 제목 · 새 PIN 칸을 잡는다. 요소 안 상태는 묶음 그림의 `broken`(읽기 실패) 하나뿐이라 다시 그릴 때 한 번 더 읽어 볼 뿐이다 |
| 회귀 단언 '이름 화면에 들어오면 두 칸이 비어 있다' | 맞음 | `tests/e2e/first-run.spec.ts`:153-155 |
| 영어 이름 · 별명 칸(제어 유지)의 한글 입력기 문제 | 낮음 | 두 칸은 로마자만 받는다(`isEnglishName` — 한글이면 '다음'이 눌리지 않음). 한글 조합이 정상 쓰임새가 아니다. 영어 이름은 한글 이름에서 다시 채우려면 제어가 필요하다. 요청자 기기에서 증상이 나오면 구현 보고의 compositionend 길로 간다(추측, 실기 재현 불가) |

## 3. 보드(`src/components/board/board.tsx`)

- **PostIt 닫힘 꼴**(:123-174): 비활성은 `opacity` 대신 영역 색 45% + 종이 55%(`color-mix`) 바탕, 먹색 글, `cursor-not-allowed` 다.
  - `PostIt` 을 쓰는 곳은 홈 카드 · 회화 준비 · 지난 수업 · 첫 실행 넷이다. P5b 활동 컴포넌트와 시드 보기는 `PostIt` 을 쓰지 않는다(`AREA_TONE` 을 직접 씀). 첫 실행 포스트잇(주제 묶음)은 비활성이 없다. 그래서 바뀌는 화면은 홈의 닫힌 · 배치 전 카드뿐이다.
  - `color-mix()` 는 Safari 16.2 부터 된다. 7절 지원 표가 iPadOS 17 이상이라 문제없다.
- **`SmallLink`**(:248-263): 쓰는 곳이 아직 없다(fix 3). `next/link` 와 공용 단추 꼴만 써 서버 · 클라이언트 경계 문제가 없다.

## 4. 새 지적

**N-1(Minor). '뒤로 갔다 오면 한글 이름 칸이 다시 채워진다'를 증명하는 시험이 없다.**
- 무엇이: 비제어 + 키 다시 만들기라, 이름 화면으로 돌아왔을 때의 값은 `defaultValue` 하나에 기댄다. 지금 '이전' e2e(`first-run.spec.ts`:188-)는 넘겨주기 → 마이크 화면만 오간다.
- 왜: 누가 `defaultValue` 를 빼거나 키 자리를 옮기면, 돌아온 이름 칸이 비거나 다른 값이 된다. 그런데 '다음'은 상태로 열려 있어 사람이 알아채기 어렵다.
- 어떻게: AC-1c 차례 시험에 사례를 더한다. 이름 화면에서 한글 이름을 넣고 '다음' → '이전'을 누르면, 이름 칸에 그 값이 있고 영어 이름 칸도 같은 로마자다.

**N-2(Minor). 가짜 음성을 새 쪽에 넣는 일이 시험마다 손으로 하는 일로 남았다(장부 :49).**
- 무엇이: 픽스처는 여전히 기본 `page` 에만 넣는다. 이번 고침은 홈 e2e 의 새 쪽 넷에 `addInitScript(installFakeWebSpeech, …)` 를 직접 달았다.
- 왜: 다음 시험(차례 5 배치 · 차례 6 세션 · P11)이 두 번째 기기 쪽을 열 때 같은 줄을 잊으면, 같은 리눅스 WebKit 의존이 조용히 돌아온다.
- 어떻게: 픽스처에 도우미 하나를 둔다. 예: `speechPage(context, script = "default-ok")` 는 새 쪽을 열고 가짜를 넣어 돌려준다. 다른 길은 `context` 고정 장치에서 `context.addInitScript` 로 넣는 것인데, 그러면 시험마다 다른 대본을 쓰기 어렵다. 홈 e2e 의 네 자리를 그것으로 바꾼다.

## 5. 장부 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| :49 e2e 픽스처 가짜 음성 | AC-5c 몫은 **닫힘**. 행은 N-2(도우미)로 바꿔 남기기를 권함 | 1절 I-1 확인. 리눅스 WebKit 인식 API 유무는 이제 어느 시험도 기대지 않는다. H15 뒤 첫 CI e2e 는 확인으로만 남는다 |
| :46 '이번 주 n일'은 배치도 셈(결정 (가)) | 그 몫은 **닫힘** | 코드 · 통합 사례 · 변이 H5a 로 확인. 행의 나머지(차례 5 · 6 단언 · P11 · P12 칸)는 열림 |
