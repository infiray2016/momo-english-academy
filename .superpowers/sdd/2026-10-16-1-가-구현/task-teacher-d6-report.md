# 구현 보고: P13d 묶음 d6 — '선생님을 골라요' · 초상 조각 · 관찰 쪽(2026-10-23 14:0x, implementer · Opus · high)

상태: DONE_WITH_CONCERNS(관문 넷 초록. 통합 · e2e 는 이 Mac 에서 못 돌려 CI 에서 확인 필요)
자리: 워크트리 `.claude/worktrees/p13d`(바탕 18dcf77). 커밋 · push 없음.

## 바뀐 파일

| 파일 | 신규 / 수정 | 무엇 |
|---|---|---|
| `src/components/teacher/teacher-portrait.tsx` | 신규(61줄) | `TeacherPortrait({ teacher, size })`. 둥근 초상(next/image unoptimized, alt "", 바탕 color.room, 먹색 3px 테). 선생님이 없거나 초상을 못 읽으면 글자 동그라미 '선'(Jua · 연두 · 먹색 테, aria-hidden). `data-teacher-portrait="<키>|initial"` |
| `src/components/teacher/teacher-choice.tsx` | 신규(173줄) | 값 10 그대로. 종이 판 위 제목 '선생님을 골라요'(Jua 36px) → 연두 장 두 칸(grid-cols-2, 가로 · 세로 같음) → 큰 단추 → '고른 선생님은 부모님이 바꿀 수 있어요'. 장 안 누름 자리(button aria-pressed — 초상 160 · 이름 36px · 성격 칩 셋 · 소개 줄바꿈 그대로), 그 아래 SmallButton '인사 듣기'(접근 이름 '[이름] 인사 듣기'). 골라진 장 = 보드 공용 `SELECTED_RING`(먹색 4px) + '골랐어요' 표지(체크 + 글). 큰 단추 '선생님과 할래요'(흐림) → '[이름] 선생님과 할래요'. ok · already → onChosen, unknown · hidden → '다시 골라 주세요' + 골라진 표시 지움. 속성 `data-teacher-choice` · `data-teacher-card` · `data-teacher-chosen`(+ 시험용 `data-teacher-go` · `data-teacher-greet` · `data-teacher-chosen-mark`) |
| `src/components/conversation/talk-frame.tsx` | 수정 | 38(가져오기) · 301~307(`ready` 에 `view.teacher !== null`) · 791~800(몸 차례 blocked → resting → `!view.teacher` 면 `TeacherChoice` → `!started` TalkStart, onChosen = `router.refresh()`) · 머리 주석 |
| `src/server/actions/teacher-preview.ts` | 신규(25줄) | `'use server'` — `clearTeacherForPreview()` · `jumpUnitForPreview(input)`. 둘 다 첫 문장 `await requireAccess()` |
| `src/server/preview/index.ts` | 신규(210줄, server-only) | 관찰 쪽 서버 몸. `previewToolsAllowed(env)` · `previewUnitsOf(area)` · `readPreviewProbe` 68 · `clearTeacherForPreviewFor` 92 · `jumpUnitForPreviewFor` 130 · 상수 `PREVIEW_JUMP_LEVEL = 1` · `PREVIEW_JUMP_SOURCE = "preview_jump"` |
| `src/app/dev/teacher-probe/page.preview.tsx` | 신규(32줄) | 관찰 쪽(운영 빌드에서 빠짐). `connection()` 뒤 `readPreviewProbe` · 영역별 단원 번호를 본체에 |
| `src/app/dev/teacher-probe/teacher-probe.tsx` | 신규(239줄) | 본체. (1) 지금 선생님 · '이 프로필의 선생님 지우기' → '지웠어요 · 다음 회화에서 다시 골라요' (2) 단원 바로 가기 — 영역마다 지금 단원 · 단원 번호 단추(접근 이름 '회화 단원 3 열기', 지금 단원은 aria-current) → '바꿨어요 — 회화 1단계 · 단원 3' + `router.refresh()`, '홈에서 보기' 링크 (3) 목소리 목록 표(en 으로 시작 — 이름 · 언어 · 기본 · 기기 안, voiceschanged 마다 다시) · '목록 복사' |
| `src/app/dev/teacher-probe/probe-text.ts` | 신규(79줄, 순수) | 관찰 쪽 글 `PROBE_TEXT` · `voiceRowsOf` · `voiceListText`(e2e 가 같은 글을 읽게 React 없는 모듈) |
| 시험 — 신규 | | `tests/unit/next-config.test.ts`(38줄) · `tests/unit/teacher-probe.test.ts`(50줄) · `tests/e2e/teacher-choice.spec.ts`(277줄) |
| 시험 — 수정 | | `tests/integration/teacher.test.ts` — 194행 '관찰 쪽 선생님 지우기' · 227행 '관찰 쪽 단원 바로 가기' describe 둘, 머리 주석 |

## 시험 이름

단위 `tests/unit/next-config.test.ts`
- AC-19b 운영 배포 빌드(VERCEL_ENV=production)의 쪽 확장자에 preview.tsx 가 없어 관찰 쪽(/dev/teacher-probe)이 빠진다
- AC-19b 프리뷰 배포 빌드(VERCEL_ENV=preview)에는 preview.tsx 가 있어 관찰 쪽이 들어가고 local.tsx 는 없다
- AC-19b next dev 에는 preview.tsx · local.tsx 가 다 있다

단위 `tests/unit/teacher-probe.test.ts`
- AC-19b 관찰 쪽 목소리 목록: en 으로 시작하는 목소리만 기기 차례 그대로 남긴다(대소문자 무시)
- AC-19b 관찰 쪽 목록 복사: 기기 줄 · 머리 줄 · 목소리마다 탭으로 가른 한 줄이고, 목소리가 없으면 없다는 줄이다

통합 `tests/integration/teacher.test.ts`(더한 열)
- AC-19b 관찰 쪽 지우기: 접근 쿠키가 없으면 401 이고 고른 선생님은 그대로다
- AC-19b 관찰 쪽 지우기: 운영 배포(VERCEL_ENV=production)에서는 거부하고 teacher_key 를 그대로 둔다
- AC-19b 관찰 쪽 지우기: 프리뷰 배포에서는 teacher_key 를 비워 집 선생님이 없고 다시 고를 수 있다
- AC-19b 단원 바로 가기: 접근 쿠키가 없으면 401 이고 지금 단원은 그대로다
- AC-19b 단원 바로 가기: 운영 배포(VERCEL_ENV=production)에서는 거부하고 트랙 · 단원 회차 · 사건을 쓰지 않는다
- AC-19b 단원 바로 가기: 회화 단원 3 으로 바꾸면 트랙 · 첫 단원 회차(단원 시작 복사본) · 사건이 들고 홈 회화 카드가 단원 3 을 지금 단원으로 보인다
- AC-19b 단원 바로 가기: 이미 회차가 있는 단원으로 돌아가면 그 회차를 그대로 쓰고 새 회차를 넣지 않는다
- AC-19b 단원 바로 가기: 배치 전 읽기도 1단계 알파벳 단원 0 으로 바꿀 수 있고 홈 읽기 카드가 배치 문 없이 그 단원을 읽는다
- AC-19b 단원 바로 가기: 1단계에 없는 단원(말하기 · 회화 0, 6) · 모르는 영역 · 꼴이 틀린 입력은 invalid 이고 아무것도 바꾸지 않는다
- AC-19b 단원 바로 가기: 프로필이 없으면 no_profile 이다

e2e `tests/e2e/teacher-choice.spec.ts`
- AC-19b 선생님을 고르지 않은 프로필이 회화 수업을 열면 '시작!' 앞에 '선생님을 골라요'가 나오고, 미나를 골라 '미나 선생님과 할래요'를 누르면 teacher_key 가 mina 이고 '미나는 앱 속 AI 선생님이에요' 안내와 '시작!'이 나오며 다시 열면 고르는 화면이 없다
- AC-19b '선생님을 골라요'의 '인사 듣기'는 그 선생님 높이로 인사를 읽어 주고 화면 · 접근 이름에 영어 글이 없다(미나 1.08 · 리오 0.97 — 명단 값을 읽음)
- AC-19b 영어 이름이 Mina 인 프로필의 '선생님을 골라요'에는 리오 장만 있다
- AC-19b 마이크를 쓸 수 없는 기기에서는 '선생님을 골라요'보다 막힌 안내가 먼저다
- AC-19b 1-가 하루 안전 상한 날에는 '선생님을 골라요'보다 '선생님이 잠깐 쉬어요'가 먼저다
- AC-19b 관찰 쪽 '이 프로필의 선생님 지우기'를 누르면 teacher_key 가 비고 다음 회화에서 '선생님을 골라요'가 다시 나온다
- AC-19b 관찰 쪽 '단원 바로 가기'로 회화 단원 3 을 누르면 회화 지금 단원이 1단계 단원 3 이고 홈 회화 카드가 단원 3 을 보인다(브리프 '관찰 쪽 e2e 한 줄')

## 관문(Node 24 PATH, 워크트리 p13d)

```
pnpm lint                                   → Checked 429 files … No fixes applied.
pnpm exec next typegen && pnpm exec tsc --noEmit → 0(출력 없음)
pnpm test                                   → Test Files 90 passed (90) · Tests 929 passed | 6 todo (935)
pnpm check:deps                             → ✔ no dependency violations found (218 modules, 1170 dependencies cruised)
pnpm spec:trace --fail-on unknown-ac        → unknown-ac 0 · plan-ac-not-in-spec 0(덧붙여 돌림)
```

통합(`tests/integration/teacher.test.ts`) · e2e(`tests/e2e/teacher-choice.spec.ts`)는 이 Mac 에서 돌지 않아 쓰기만 했다 — CI 에서 처음 돈다.

## 사진(e2e 가 E2E_PHOTOS 때 찍음, 가로 · 세로 둘씩)

- `teacher-choice-empty` — 고르기 전(큰 단추 흐림)
- `teacher-choice` — 미나를 고른 뒤(굵은 테 · '골랐어요' · '미나 선생님과 할래요')
- `teacher-start` — 고른 뒤 '시작!' 과 처음 회화 안내(미나)
- `teacher-probe` — 관찰 쪽(지운 뒤)

## plan 으로 풀리지 않아 정한 것

1. **운영 거부 자리**: 운영 배포 확인(`VERCEL_ENV === "production"`)을 액션 파일이 아니라 서버 몸(`src/server/preview`)에 두었다. 액션 첫 문장은 그대로 `requireAccess()`. 까닭: 통합 시험이 쿠키 없이 몸을 바로 불러 운영 거부를 볼 수 있고, 몸을 다른 곳에서 불러도 막힌다.
2. **단원 바로 가기의 규칙**(브리프 '새 규칙을 만들지 않는다'):
   - 고를 수 있는 단원은 `isUnitOf(영역, 1, 단원)` 그대로다(읽기 · 쓰기 0~5, 말하기 · 회화 1~5).
   - 행은 첫 실행 · 배치와 같은 `unitEntryOf` 로 만든다(단원 시작 복사본 · 시작 개정 · 설정 판). 설정은 배치 · 첫 실행처럼 집 전체 값(`firstRunSettingKeys`)을 읽는다.
   - 그 단원의 회차가 이미 있으면 새 회차를 넣지 않고 그대로 쓴다(유일 제약과 앞 진행을 지킴). 트랙 행은 FOR UPDATE.
   - 사건은 늘 한 행이다. `unitEntryOf` 의 부모 갈래(`parent_adjustment` · `parent`)를 쓰고 까닭(target.source)만 `preview_jump`, oldValue 에 앞 단계 · 단원. `TrackSource` 형(`src/core/profile/start.ts`)은 고치지 않았다.
   - 범위 끝 알림은 넣지 않는다(진짜 시작이 아니고 같은 기준 키 알림이 첫 실행 때 이미 있을 수 있음).
   - 배치 전 영역(읽기 · 쓰기 · 말하기)도 1단계 단원으로 바꿀 수 있다(배치를 건너뜀 — 프리뷰 시험 도구라서).
3. **새 파일 셋(plan 표 밖)**: `src/server/preview/index.ts`(서버 몸), `src/app/dev/teacher-probe/probe-text.ts`(e2e 가 읽는 글 · 순수 목소리 꼴), `tests/unit/teacher-probe.test.ts`.
4. **고르기 실패 글**: unknown · hidden 말고 액션이 던진 때(네트워크)도 '다시 골라 주세요'를 낸다. 고르기 뒤 다시 읽는 동안 큰 단추는 잠긴 채다.
5. **'인사 듣기'**: 음성 접점이 생기기 전(렌더 직후)에는 누를 수 없다. 접점이 읽던 글을 스스로 끊으므로 두 장의 인사를 이어 눌러도 겹치지 않는다. 인사를 들어도 고른 것이 아니다.
6. **'목록 복사' 글 첫 줄에 기기 줄(userAgent)**: iPad 사파리 · 크롬 목록을 가르려고 더했다.
7. **고른 뒤 다시 읽기(덧 2)**: 회화 틀의 `onChosen = router.refresh()` 하나가 회화 자료(판이 바뀌어 틀이 새로 그려짐)와 (child) 틀의 집 선생님을 함께 다시 읽는다. 관찰 쪽 지우기 · 단원 바꾸기 뒤에도 `router.refresh()`.

## 요청하는 변경

없음(공용 파일 · 스키마 · 시드 · 설정을 고치지 않음).

## 남은 우려

1. 통합 · e2e 는 로컬에서 못 돌렸다. CI 결과에 기대고, 특히 e2e '인사 듣기'(가짜 음성 기록의 pitches 차례)와 홈 카드 선택자는 CI 에서 처음 확인된다.
2. 단원 바로 가기는 앞 단원의 진행 세션을 건드리지 않는다. 다른 단원 수업을 열면 기존 세션 시작 판정(이전 세션 중단 길)이 다룬다. 시드에 없는 단원으로 바꾸면 수업 목록이 빈다(개발용 시험 시드는 단원 1 위주).
3. `preview_jump` 사건은 1-나 부모 화면 기록에서 '부모 조정'으로 보일 수 있다. 실시드 전환(C140) 때 시험 기록과 함께 지워지는 값이다.
4. **이 워크트리의 다른 변경**: 14:03:46~51 에 `tests/unit/{speech-speak,teacher-speech,teacher-state,teacher-voice}.test.ts` 의 시험 이름 앞에 'AC-19g' · 'AC-19j' 같은 번호가 붙는 변경이 생겼다. 제가 한 것이 아니고 손대지 않았다. 그 상태로 `pnpm test` 를 다시 돌려 929건 통과를 확인했다.
5. 고르는 화면의 장 크기 · 글 크기(초상 160 · 이름 36px · 장 너비 약 320px)는 목업이 없어 plan 값대로 두었다. 화면 검토(C142 — 프리뷰 직전 묶음)에서 사진으로 본다.
