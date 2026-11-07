# 코드 검토 묶음 3: P13d d6 · d7 · 손질 1(code-reviewer rev-teacher-3 · Opus · xhigh, 2026-10-23 14:3x~15:0x)

(답장이 잘려 컨트롤러 요청으로 검토자가 직접 썼다. 대상 diff 는 워크트리 p13d 의 `git diff 0168c43..1174e13`(커밋 1174e13 하나), 줄 번호는 1174e13 기준. 코드는 고치지 않았다.)

**판정: 수정 필요(Changes requested).** Critical 0 · Important 1 · Minor 4. 처음 답장의 Approved 는 e2e 결과가 나오기 전 판정이었다. CI 39905881726 의 e2e 일이 d7 시험 하나로 실패해 판정을 바꿨다. 앱 코드 결함의 증거는 없고 시험 전제가 틀렸다. I-1 만 고치면 Approved.

## CI 39905881726(1174e13)

- 초록: lint · unit · integration · build · spec-trace · check-ids · depcruise · seed-validate · bundle-secrets. 새 통합 시험(관찰 쪽 지우기 · 단원 바로 가기 · M-1 그만하기)은 integration 초록으로 확인됐다.
- e2e(tablet-10-9-webkit): 157 가운데 156 통과, 1 실패(재시도 1회도 같은 줄에서 실패 — 흔들림이 아님). teacher-choice.spec.ts 전부, teacher-window.spec.ts 의 나머지, 고친 conversation.spec.ts 는 통과했다.
- e2e-local: 이 파일을 쓸 때 진행 중.

## 지적

### I-1 (Important) AC-19j e2e 뒷부분이 처음 마이크 안내를 다시 기다려 실패한다

- 자리: `tests/e2e/teacher-window.spec.ts:640-716`, 실패 줄 :698(`[data-mic-notice]` toBeVisible, 5초 뒤 없음).
- 무엇: 앞쪽 회화 부분이 시험의 `context` 에서 '알겠어요'를 누른다(:646 pastStart → :240). 그 누름이 처음 마이크 안내 표시를 localStorage 에 남긴다(`src/lib/mic-state.ts:84` MIC_NOTICE_KEY · :97-99). 뒤쪽 말하기 세션은 같은 문맥에서 연다(:692 `speechPage(context, …)`). 안내는 기기마다 한 번이라(`src/components/session/speaking.tsx:107`) 다시 나오지 않는다.
- 왜 Important: AC-19j 의 화면 몫 증명(plan.md:457 — 회화 밖 읽어 주기는 높이 · 목소리 순서를 넘기지 않음)이 CI 에서 서지 않고 e2e 일이 빨갛다. 고치기 전에는 d7 증명을 믿을 수 없다.
- 고칠 길: 말하기 쪽 `goto` 앞에 그 표시를 지워 안내가 다시 나오게 한다. 예 `await speaking.addInitScript((key) => localStorage.removeItem(key), "momo.mic-notice.v1")`(시험이 src/lib/mic-state 를 가져올 수 있으면 MIC_NOTICE_KEY 를 써서 글자를 다시 적지 않는다). 다른 길은 말하기 쪽을 새 브라우저 문맥으로 여는 것인데, 접근 쿠키 · 가짜 음성 · WebGL 끔을 fixtures 와 같게 다시 붙여야 해 더 길다. :698 단언을 지우는 길은 잠금 풀기 뒤 읽기 차례를 흐리게 하므로 권하지 않는다. 고친 뒤 이 시험 하나를 CI e2e 로 다시 확인한다.

### Minor-1 d8 이 깨뜨릴 단언(넘김)

- 자리: `tests/e2e/teacher-window.spec.ts:297`(WebGL 을 끈 기본 e2e 에서 '시작!' 화면의 `data-teacher-fallback` 이 null), 시험 이름 :278 '초상(까닭 속성 없음)'.
- 근거: d8 은 '시작!' 화면부터 WebGL 2 맥락이 없으면 no-webgl 을 남긴다(plan.md:296 (2)). 증명 표도 기본 e2e 에서 `data-teacher-fallback=no-webgl` 을 요구한다(plan.md:456 AC-19i). d8 이 들어가면 이 단언이 깨진다. 지금 d7 의 결함은 아니다.
- 고칠 길: d8 브리프에 한 줄 — :297 을 no-webgl 기대로 바꾸거나 AC-19i 시험으로 옮기고 :278 이름을 고친다. 단위 `tests/unit/teacher-window.test.ts:43` 은 창만 따로 그리는 시험이라 그대로 둬도 된다.

### Minor-2 줄이기 스크립트에 남은 같은 꼴 둘(M-2 · M-3 의 나머지)

- 자리: `scripts/teacher-reduce.ts:229`(키 정규식 `/^[a-z]+$/`) · :46(`HASH_PREFIX = 8`).
- 근거: 검토 1 M-2 · M-3 '꼴은 한 곳', 손질 1 보고 '요청하는 변경 · 남은 우려'. 키 꼴이나 해시 글자 수가 바뀌면 스크립트가 자산 검사에서 거부될 이름을 만든다. CI seed-validate 가 막는 안전한 실패라 Minor.
- 고칠 길: `src/core/seed/structure.ts:303` TEACHER_KEY · :308 TEACHER_ASSET_HASH_CHARS 를 가져와 쓴다(한 줄씩).

### Minor-3 시험 이름에 정본 번호가 없음

- 자리: `tests/unit/teacher-window.test.ts:115`(고른 선생님이 있을 때 창이 나오는 화면 · 없는 화면), :101(창 크기 상수).
- 근거: plan.md:463 '시험 이름은 정본 번호로 시작한다'. :115 는 AC-19c 몫(4절 선생님 창 · '처음 회화')인데 spec-trace 에 잡히지 않는다. e2e `tests/e2e/teacher-window.spec.ts:350` 이 막힘 · 쉼 쪽을 AC-19c 이름으로 덮어 영향은 작다.
- 고칠 길: :115 앞에 'AC-19c '. :101 은 맞는 AC 가 없는 화면 꼴 상수라 그대로 둬도 된다.

### Minor-4 용어 '트랙'

- 자리: `tests/integration/teacher.test.ts:239 · :258`(시험 이름), `src/server/preview/index.ts:127`(주석).
- 근거: `.claude/CLAUDE.md` Conventions — 글에서 '트랙'을 쓰지 않고 영어 식별자 track 만 허용. 앞선 사례(`tests/integration/first-run.test.ts:143 · :228`, `tests/integration/placement.test.ts:239`)가 있어 급하지 않다.
- 고칠 길: '그 영역의 지금 단계 · 단원 행'(필요하면 profile_tracks 표 이름을 함께)으로 바꾼다.

## 검토 1 · 2 지적 판정

- **검토 1 I-1 — 닫힘.** d5 단위 시험 이름이 모두 정본 번호로 시작한다. `tests/unit/teacher-state.test.ts:18-168`(AC-19g 8 · 19h 4 · 19i 2), `teacher-voice.test.ts:16-48`(AC-19j 6), `teacher-speech.test.ts:62-183`(AC-19g 11, 62줄은 AC-19g · AC-19j), `speech-speak.test.ts:106-198`(AC-19j 3 · AC-19g 4). CI spec-trace 초록.
- **검토 1 M-1 — 닫힘.** 처음 스냅숏이 없으면 그만하기가 not_found(`src/server/conversation/index.ts:1264-1267`). 통합 `tests/integration/conversation-session.test.ts:456-471` 이 상태 · 토막 그대로 · 끝맺음 기록 없음 · 예약 0 · AI 요청 0 을 단언하고 CI integration 초록. 같은 조건의 '홈'(leaveTalk)은 목표 턴 전이라 아무것도 쓰지 않는다(index.ts:1320-1321).
- **검토 1 M-2 — 닫힘.** 지적한 세 곳이 `src/core/seed/structure.ts:303` TEACHER_KEY 하나를 쓴다(`schema/teachers.ts:58` · `core/conversation/attempt.ts:54` · `server/teacher/index.ts:84`). 지적 밖 스크립트의 같은 꼴은 Minor-2.
- **검토 1 M-3 — 닫힘.** `src/core/seed/check-teacher.ts:391` teacherAssetPath. 모델 경로는 명단 해시로 본다(:429, 명단 해시는 (b)에서 실제 바이트와 견줘지므로 결국 내용 해시). 초상 경로는 읽은 바이트 해시로 본다(:467). 시험 `tests/unit/seed-teacher.test.ts` '자산 검사'에 경우 넷(모델 이름 해시 · 모델 폴더 · 초상 이름 해시 · 초상 폴더), 경우마다 거부 하나 · 글 '꼴이 아니다'. '모델 해시' 경우는 앞 8자를 남겨 해시 다름 하나만 걸리게 바꿨다. 실제 명단도 통과(CI seed-validate 초록).
- **검토 2 M-2 — 닫힘.** `tests/unit/teacher-scan.test.ts` 끝 묶음 '선생님 화면 조각의 소리 통로(AC-19g)'가 src/components/teacher 의 audioSession 대입식을 훑고, 도구 자체 시험(주석 · 읽기 · 비교는 안 셈, 대입 두 꼴은 잡음)도 있다. src/lib/speech 는 d5 teacher-speech 시험이 맡아 plan 값 9(plan.md:257) · 증명 표 AC-19g(plan.md:454)의 두 범위가 다 덮인다.

## 설계 준수

**단원 바로 가기(컨트롤러 덧 (1)) ✅**
- 운영 배포 빌드에서 `page.preview.tsx` 가 빠진다(`next.config.ts:12`, 단위 `tests/unit/next-config.test.ts:17-23`).
- 액션 첫 문장 requireAccess(`src/server/actions/teacher-preview.ts:15 · :23`), 서버 몸은 운영 배포면 쓰지 않는다(`src/server/preview/index.ts:41-43 · :97 · :137`). 지우기 단추와 같은 보호. 통합이 401 · refused · 트랙 · 회차 · 사건 수 그대로를 단언(`tests/integration/teacher.test.ts:228-256`).
- 프리뷰는 개발용 Supabase 에 붙는다(`specs/08-테스트와-기술.md:40`) — 운영 DB 에 닿을 길이 없다.
- 단원 들기는 unitEntryOf 그대로(`src/server/preview/index.ts:159-170`), 트랙 행 FOR UPDATE · 회차가 있으면 그대로(:146-191). 수업 목록(`src/server/lesson-list/index.ts:252-266`)과 세션 시작(`src/server/session/index.ts:561-573`)은 트랙 단원의 최신 회차를 읽고, 홈 카드는 통합이 unitCells 까지 확인 — 셋이 어긋나지 않는다.
- ⚠️ 진행 중 세션: 바로 가기는 세션을 건드리지 않고, 새 단원 수업을 열면 기존 판정이 확인 뒤 앞 세션을 중단한다(`src/server/session/index.ts:505-521`). 이 조합 시험은 없으나 프리뷰 도구라 지적 아님.

**'선생님을 골라요'(값 10) ✅**
- 여는 차례 막힘 → 쉼 → 고르기 → '시작!'(`src/components/conversation/talk-frame.tsx:856-903`), 열림 조건에 선생님(:376-382). e2e `tests/e2e/teacher-choice.spec.ts:179-210`.
- 고른 뒤 router.refresh(`talk-frame.tsx:886`), 다시 열면 고르는 화면 없음(e2e :119-122). 이름 같은 선생님 숨김(e2e :164-177).
- ok · already → 다시 읽기, unknown · hidden · 던짐 → '다시 골라 주세요' + 골라진 표시 지움(`src/components/teacher/teacher-choice.tsx:61-74`) — plan 정본 밖 문구 표(plan.md:326)와 같다.
- 인사 영어 글은 읽어 주기에만(teacher-choice.tsx:50-59), e2e 가 화면 글 · 접근 이름에 영어 없음을 본다(:150-161). 화면 글은 모두 TEACHER_TEXT.
- ⚠️ already · 실패 글의 화면 길은 e2e 없음(서버 몫은 d2 통합).

**선생님 창 · 상태(값 13) ✅**
- 말하기는 선생님 음성 감싸기의 시작 알림부터(`talk-frame.tsx:346-359`), 따라 말하기 등도 같은 접점(:791). e2e speakingProblems(`tests/e2e/teacher-window.spec.ts:157-183`)가 시작 전 말하기 · 결과 뒤 말하기를 둘 다 잡는다(CI 통과).
- 칭찬은 정본 4절(`specs/03-화면.md:78`)대로: 따라 말하기 '잘 말했어요'(`src/components/conversation/follow-along.tsx:523 · :762`), 목표 턴이 처음 참이 된 턴의 읽어 주기가 끝난 뒤(`talk-frame.tsx:436-441 · :599-601`), 길이는 설정 talk.teacher_praise_seconds(:362). 대화 턴 맞고 틀림과 무관.
- 움직임 줄이기면 움직임 클래스를 빼고 motion-safe 도 겹친다, 넘김 효과 없음(`src/components/teacher/teacher-window.tsx:53 · :81 · :121 · :134`).
- 속성 data-teacher-window · key · state · render="portrait", 까닭 속성 없음(teacher-window.tsx:55-61).
- 회화 틀을 선생님 키로 다시 그림(`talk-frame.tsx:245-247`) — 받음(고르기 전엔 잃을 상태가 없다).

## 화면 검토 몫으로 넘긴 것(코드 위험은 없다고 봄)

- **말하기 물결 크기**: animate-ping 2배 확대, 창에 overflow 제한 없음(`src/components/teacher/teacher-window.tsx:68-86`). pointer-events-none 이라 위 띠 '홈' · '그만하기' 누름을 막지 않고, 왼쪽 · 위로 넘친 부분은 스크롤을 만들지 않으며, 대화 판은 뒤 형제(위치 지정)라 물결 위에 그려진다. 남은 것은 세로에서 위 띠를 덮어 보이는 모양.
- **세로 화면 높이**: 창 줄(240 + 간격 24)이 대화 판을 민다. 세로 '보는 창 안' 단언 없음(plan 위험 7 은 가로만). 정본 03-화면.md:78 '아이 차례 단추를 줄이지 않는다'와 함께 사진으로 본다.
- 고르는 화면 장 · 글 크기(초상 160 · 이름 36px), 한 장만 보일 때 두 칸 격자의 왼쪽에 놓이는 모양.

## 잘한 점

- 단원 바로 가기가 새 규칙 없이 기존 단원 들기 · 회차 재사용만 쓰고, 운영 거부 시험이 사건 수까지 센다.
- 꼴이 틀린 입력 열 가지를 한 표로 거부하고 바뀐 것이 없음을 확인한다.
- 상태 바뀜(MutationObserver)과 가짜 음성 사건을 같은 시계로 견주고, 목표 턴 칭찬이 읽어 주기 끝 뒤인지 시각으로 비교한다(teacher-window.spec.ts:585-595).
- 칭찬 시각을 상태에 담아 렌더 중 시계를 읽지 않는다(React Compiler 규칙).

## 구현자가 정한 것

- d6 1~7 받음(1 운영 거부를 서버 몸에 · 2 바로 가기 규칙 · 3 plan 표 밖 새 파일 셋 · 4 네트워크 실패에도 '다시 골라 주세요' · 5 접점 전 '인사 듣기' 잠금 · 6 목록 복사 기기 줄 · 7 고른 뒤 · 관찰 쪽 뒤 router.refresh).
- d7 1~11 받음. 10 은 plan 증명 표가 '읽기 세션'(plan.md:457)인데 말하기 세션으로 증명 — 감싸기는 회화 틀에만 있어 같은 증명으로 받되, 그 시험 자체는 I-1 로 고쳐야 한다. 6(정리 끝인사 기다림은 '생각' 아님)은 정본 03-화면.md:78 '생각은 회화 턴 첫 문장을 기다리는 동안'과 같다.
- d7 덧(검토 2 M-2 훑기) 받음.
- 손질 1 두 결정 받음 — 불러오기 차례 두 시험의 AC-19i(plan.md:456 단위 몫 '늦은 결과 버림'), teacher-speech 62줄의 AC-19g · AC-19j.

## 범위 밖 관찰(지적 아님)

- 막힘 판정이 렌더 뒤 효과라(`src/components/conversation/talk-frame.tsx:331-334`) 마이크를 쓸 수 없는 기기의 첫 그림에 창 · '시작!'이 잠깐 보인다. d7 에선 깜빡임뿐, d8 그림 층이 그 틈에 .vrm 받기를 시작할 수 있다(AC-19f 의 0 목록에 막힘 화면은 없음) — d8 검토 때 본다.
- 정리 끝인사를 기다리는 동안 판이 빈다(`src/components/conversation/follow-along.tsx:684-686`) — 상태 요청 한 번이라 짧다.
- CI e2e 서버 로그에 '회화 시도 기록 실패(Error 23503)' 한 줄(외래 키 위반). 실패한 시험과 다른 자리이고, 시험 사이 집 지우기와 늦은 쓰기가 겹친 것으로 보인다(추측, 확인 안 함).
