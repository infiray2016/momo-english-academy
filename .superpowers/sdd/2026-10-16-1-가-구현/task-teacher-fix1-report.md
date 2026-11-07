# 구현 보고: P13d 손질 1 — 묶음 검토 1 지적 넷(implementer impl-teacher-fix1 · Opus · high, 2026-10-23 14:0x)

상태: **DONE_WITH_CONCERNS**(우려는 아래 "남은 우려" 둘 — 통합 시험은 이 Mac 에서 못 돌림 · 줄이기 스크립트의 같은 정규식). 자리: 워크트리 `.claude/worktrees/p13d`, 커밋 · push · stash 없음. d6 쪽 파일(`src/components` · `src/app` · `src/core/profile` · `tests/integration/teacher.test.ts` · `tests/unit/talk-stream-call.test.ts`)은 건드리지 않았다.

## I-1 — d5 시험 이름 앞에 정본 번호

본문은 그대로 두고 `it(` 첫 인자 앞에만 번호를 붙였다(describe 이름은 그대로).

| 파일 | 줄 | 번호 |
|---|---|---|
| `tests/unit/teacher-state.test.ts` | 18 · 24 · 47 · 54(시제품 움직임) · 78 · 102 · 108 · 120(상태 차례 · 칭찬) | AC-19g |
| 같은 파일 | 34(움직임 줄이기 몸 · 고개) · 62(줄이기가 아니면 몸이 움직임 — 19h 의 맞짝) · 132 · 150(깜빡임) | AC-19h |
| 같은 파일 | 158 · 168(불러오기 차례 번호) | AC-19i |
| `tests/unit/teacher-voice.test.ts` | 16 · 25 · 31 · 37 · 43 · 48(목소리 고르기) | AC-19j |
| `tests/unit/teacher-speech.test.ts` | 62(감싸기가 높이 · 목소리 순서를 넣고 빠르기는 그대로) | AC-19g · AC-19j |
| 같은 파일 | 75 · 83 · 96 · 108 · 116 · 131 · 144 · 154 · 164(감싸기 · 시작 알림) · 183(audioSession 훑기) | AC-19g |
| `tests/unit/speech-speak.test.ts` | 106 · 116 · 135(접점 높이 · 목소리) | AC-19j |
| 같은 파일 | 154 · 168 · 182 · 198(시작 알림 · 잠금 풀기) | AC-19g |

브리프와 다르게 한 것 둘:
- **불러오기 차례 두 시험은 AC-19i.** 브리프 목록에 없다. plan 증명 표 AC-19i 행의 단위 몫이 '그림 층 판정 · 늦은 결과 버림'이고 createLoadTurn 이 늦은 불러오기 버림(plan 값 11 의 시제품 generation)이라 그 번호를 붙였다. 컨트롤러가 다른 번호를 원하면 이름 앞 토큰만 바꾸면 된다.
- **teacher-speech 62줄은 두 번호.** 파일 머리는 감싸기(19g) 몫이라 하고 본문은 높이 · 목소리 순서 · 빠르기(19j 문장)라 `AC-19g · AC-19j` 로 붙였다(spec-trace 가 둘 다 뽑음).

확인: spec-trace 추출 함수로 센 수 — teacher-state 19g 8 · 19h 4 · 19i 2, teacher-voice 19j 6, teacher-speech 19g 11 · 19j 1, speech-speak 19g 4 · 19j 3. 워크트리에는 선생님 plan 이 없어 본 저장소 plan 을 넘겨 돌렸다.

```
pnpm spec:trace --plan <본 저장소>/intent/2026-10-17-회화-선생님-캐릭터/plan.md
spec-trace: 15절 AC 129 · 증명 표 AC 13 · AC 이름 시험 513 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 3
```
missing-test 셋에 AC-19g · 19h · 19j 는 없다(남은 것은 AC-19f(d9) 와 아직 안 만든 차례의 번호).

## M-1 — 처음 스냅숏 없는 세션의 '그만하기'

- `src/server/conversation/index.ts:1264-1268` stopTalk 첫 거름에 `!state.start` 를 더했다. 처음 스냅숏이 없으면 확인 여부와 관계없이 not_found(기존 결과 꼴 `{ ok: false, reason: "not_found" }`)이고, closeTalk(중단 · 끝맺음 기록) · scheduleTalkClosing 에 닿지 않는다.
- 통합 시험 `tests/integration/conversation-session.test.ts:456-471` — `AC-19b 선생님을 고르기 전(처음 스냅숏 없음) 세션의 확인한 '그만하기'는 not_found 이고 중단 · 끝맺음 기록 · 끝맺음 턴 예약이 없다`. 선생님 없는 프로필로 회화를 열고 확인한 그만하기 → not_found, 세션 status · talkSegment 그대로, 끝맺음 기록 없음, 예약 작업 0, AI 요청 0. **이 Mac 에서는 돌리지 않았다(CI 통합).** 형 검사 · 린트는 통과.

## M-2 — 선생님 키 정규식 한 곳

- `src/core/seed/structure.ts:299-303` `TEACHER_KEY = /^[a-z]+$/`(뜻 그대로).
- 쓰는 곳: `src/core/seed/schema/teachers.ts:7-11 · 58` · `src/core/conversation/attempt.ts:5 · 54` · `src/server/teacher/index.ts:10 · 84`.
- 시험: 새 시험은 없다(뜻이 같아 기존 명단 · 시도 꼴 · 고르기 시험이 그대로 덮음 — 단위 전체 통과).

## M-3 — 자산 파일 이름의 내용 해시 · teachers 폴더

- `src/core/seed/structure.ts:304-308` `TEACHER_ASSET_HASH_CHARS = 8`. 폴더는 이미 있던 `TEACHER_ASSET_DIR`("teachers")를 쓴다.
- `src/core/seed/check-teacher.ts:390-398` 순수 함수 `teacherAssetPath(key, sha256, ext)` → `teachers/<키>.<해시 앞 8자>.<확장자>`.
- `src/core/seed/check-teacher.ts:429-434` 모델 경로가 `teacherAssetPath(키, 명단 model.sha256, "vrm")` 와 같지 않으면 거부(`teachers.<i>.model.path`). 파일이 없어도 본다(명단끼리의 일치).
- `src/core/seed/check-teacher.ts:467-472` 초상 파일을 읽었을 때 경로가 `teacherAssetPath(키, 읽은 바이트 SHA-256, "webp")` 와 같지 않으면 거부(`teachers.<i>.portrait.path`). 파일이 없으면 '초상 파일 없음' 하나만 낸다.
- 머리 주석 (b)에 두 줄을 더했다(`check-teacher.ts:401-402`).
- 시험 `tests/unit/seed-teacher.test.ts` '자산 검사':
  - 가짜 자료 이름을 해시 꼴로 만든다(`assetName` · `moveFile` 851-861, setup 877-889). replaceModel 은 이름도 옮기고(911-920) replacePortrait 를 더했다.
  - '모델 해시' 경우는 앞 8자를 남기고 뒤만 바꿔 해시 다름 하나만 걸리게 했다(934).
  - 새 경우 넷 '모델 이름 해시' · '모델 폴더' · '초상 이름 해시' · '초상 폴더'(951-993) — 각각 거부 하나, 글에 '꼴이 아니다'. '초상 크기 상한'은 replacePortrait 로 이름까지 맞춘다(1026).
  - 시험 이름: `AC-19k 깨뜨린 가짜 자료마다 거부 하나: 파일 없음 · 바이트 · 해시 · 이름의 해시 · teachers 폴더 · 크기 상한 · VRM 판 · 메타 넷 · 표정 · 뼈 · 원본 해시 · 명단 밖 .vrm · 출처 문서`.
  - 실제 명단: `AC-19k 실제 명단 · public/teachers/ · CREDITS.md 는 자산 검사를 통과하고, 모델 둘이 상한 안이다` 통과(mina.9c5152a7.vrm · mina.fdc5f7f2.webp · leo.45154cde.vrm · leo.669c5d28.webp), `pnpm seed:validate` 도 오류 0.

## 관문(Node 24 PATH, 워크트리 p13d, 14:07)

```
pnpm lint                                   Checked 429 files … No fixes applied.
pnpm exec next typegen && pnpm exec tsc --noEmit   종료 0
pnpm test                                   Test Files 90 passed (90) · Tests 929 passed | 6 todo (935)
pnpm check:deps                             no dependency violations found (218 modules, 1172 dependencies cruised)
pnpm seed:validate                          칸 720 · 통과 720 · 실패 0 · … · 규격 파일 오류 0
pnpm exec vitest run --project unit <seed-teacher · teacher-state · teacher-voice · teacher-speech · speech-speak>   5 files · 67 passed
```
전체 단위 시험은 d6 의 쓰는 중인 코드가 있는 상태에서도 통과했다.

## 요청하는 변경 · 남은 우려

- **줄이기 스크립트의 같은 꼴 둘.** `scripts/teacher-reduce.ts:229` 에 키 정규식 `/^[a-z]+$/` 이 하나 더 있고, 같은 파일 46줄 `HASH_PREFIX = 8` 이 새 `TEACHER_ASSET_HASH_CHARS` 와 같은 값이다. 브리프 파일 목록 밖이라 고치지 않았다. M-2 · M-3 의 '한 곳' 뜻을 끝까지 하려면 그 둘을 `TEACHER_KEY` · `TEACHER_ASSET_HASH_CHARS` 로 바꾸는 한 줄씩이 남는다.
- **M-1 통합 시험은 CI 에서만 확인된다.** 이 Mac 에서는 통합 시험을 돌리지 않았다.
