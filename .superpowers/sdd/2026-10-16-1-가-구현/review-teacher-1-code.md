# 코드 검토 묶음 1: P13d d1 · d2 · d5(code-reviewer rev-teacher-1 · Opus · xhigh, 2026-10-23 13:5x~14:0x)

(검토자는 읽기 전용이라 컨트롤러가 답장 두 통을 옮겼다. 대상 diff `3b7ed36..8a4cba1 -- . ':!specs'`, 줄 번호는 8a4cba1 기준.)

**판정: Changes requested.** Important 1 · Minor 3, Critical 0. I-1 만 고치면 Approved. CI 21차(run 39902064523, 8a4cba1): build · unit · integration(새 통합 9건 통과) · seed-validate · spec-trace · check-ids · depcruise · lint · bundle-secrets · e2e-local 초록, e2e 는 검토 때 진행 중.

## 설계 준수
- **d1 충족**: 명단 칸 필수 · 코드 상수 KO_NAME_WORD_EXCEPTIONS → 명단 칸 nameKoWordExceptions(쓰는 곳 0) · 대비 짝 accent ↔ #fffdf7 · 자산 검사 plan 값 4 (a)~(f), 크기 상한은 시드 settings.json · 추적되는 .vrm 은 public/teachers 줄인 파일 둘(바이트 · 해시가 명단과 같음) · 줄이기 스크립트는 원본 읽기만, 새 이름 `<키>.<8자>`.
- **d2 충족**: 고르기 액션 첫 문장 requireAccess · strictObject 재검증 · 거부 차례 unknown → hidden → 조건 UPDATE 하나 · 0004 는 ADD COLUMN 하나(RLS 그대로) · 선생님은 처음 스냅숏 키 → 프로필 키, 둘 다 없고 스냅숏도 없으면 스냅숏 · 토리 행 1 미룸 · 화면 몫에 personaEn · source · nameEn 없음. 미룬 길: 턴 → stale(`turn.ts:748`) · 토막 넘김 → out_of_order(`index.ts:905`) · 따라 말하기 → invalid(`index.ts:741`) · 그만하기 → 막히지 않음(M-1).
- **d5 동작 충족, 증명 이름 미충족(I-1)**: 상태 차례 듣기 → 생각 → 말하기 → 칭찬 → 쉬기 · 칭찬 = 지금 + 설정 초 · 움직임 줄이기 몸 · 고개 멈춤 · 입만 · 깜빡임 0 · 시작 알림은 onstart 에서 지금 발화일 때만 · 감싸기는 시작한 발화만 셈 · src/lib/speech 에 audioSession 쓰기 없음.
- 확인 못 함: 줄인 VRM 이 three r180 · three-vrm 3.5.5 에서 그려지는지(d8 · 실기기, plan 위험 5).

## 잘한 점
조건 UPDATE(명단에 없는 키가 남은 프로필 다시 고름, 겹침 단언 `tests/integration/teacher.test.ts:110-143`) · 자산 검사 시험(깨뜨린 자료마다 거부 하나, `tests/unit/seed-teacher.test.ts:819-1142`) · 빼는 낱말은 이름보다 길어야 함(`check-teacher.ts:346-359`) · 늦은 시작 알림 두 겹 버림(`browser.ts:467-471` · `teacher.ts:31-46`).

## 지적
- **I-1 (Important)** d5 시험 이름이 정본 번호로 시작하지 않아 AC-19g · 19h · 19j 단위 증명이 spec-trace 에 안 잡힘 — `tests/unit/teacher-state.test.ts:18-168`(14) · `teacher-voice.test.ts:16-48`(6) · `teacher-speech.test.ts:62-183`(13) · `speech-speak.test.ts:106-198` 새 7. 근거 plan.md:461 · 452-455, `scripts/spec-trace.ts:23-28 · 158-165`. 고침: 본문 그대로, 이름 앞에 번호 — 상태 차례 · 칭찬 · 시제품 다섯 · 감싸기 · 시작 알림 · audioSession → AC-19g, 움직임 줄이기 · 깜빡임 → AC-19h, 목소리 고르기 · 접점 높이 · 목소리 → AC-19j.
- **M-1 (Minor)** 선생님 · 스냅숏 없는 세션의 확인 거친 '그만하기'가 막히지 않음 — `src/server/conversation/index.ts:1255-1276` stopTalk 가 처음 스냅숏을 안 보고 중단 · 끝맺음 기록 · 끝맺음 턴 예약 → 행 0 대화로 AI 부름(`closing.ts:311-332`). 고침: 처음 스냅숏이 없으면 not_found. d6 전에.
- **M-2 (Minor)** 선생님 키 정규식 세 곳(`schema/teachers.ts:54` · `conversation/attempt.ts:52-56` · `server/teacher/index.ts:82-84`) — 명단 키 꼴이 바뀌면 ensureStarted 가 던짐(`index.ts:270-271`), FR-1 '항목과 파일만'. 고침: structure.ts 에 하나.
- **M-3 (Minor)** 자산 검사가 파일 이름 안 내용 해시 · teachers 폴더를 안 봄 — `check-teacher.ts:394-490` checkTeacherAssets. d8 의 /teachers/ 1년 immutable 캐시(plan.md:91 · 304)는 이름에 내용 해시가 있다는 전제(plan.md:67). 고침: 모델 경로가 `teachers/<키>.<sha256 앞 8자>.vrm` 인지, 초상은 읽은 바이트 해시 앞 8자가 이름에 있는지. d8 전에.

## 구현자가 정한 것
d1 1~13 받음(7 · 10 좋은 보강) · d2 1~9 받음(3 · 7 받음) · d5 1~10 받음, 9 조건부 — plan 값 9 의 훑기 범위는 src/lib/speech 와 src/components/teacher(plan.md:257), d5 훑기는 src/lib/speech 만 → d4 의 teacher-scan 이 두 폴더를 덮어야 닫힘, 그때 하나로 합침.

## 브리프 5번 답
설계 숫자 박힘 없음(크기 상한은 시드 settings.json, 칭찬 · 불러오기 · 그리기 설정은 회화 화면 자료가 설정에서 읽어 넘김 `index.ts:450-485`, 움직임 · 줄이기 값은 plan 이 정한 상수 plan.md:423). 고르기 통합 6 · 회화 세션 통합 3 모두 단언 있고 CI 통과. 겹침 시험은 DB 연결 상한 3 이라 경쟁을 강제하지 않음(`src/server/db/index.ts:12`).
