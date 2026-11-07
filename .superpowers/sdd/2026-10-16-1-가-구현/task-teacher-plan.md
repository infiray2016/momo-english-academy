# 계획 브리프: P13d 회화 선생님 화면(규격 설계 · Opus · xhigh, 2026-10-23 11:3x)

까닭: 요청자 결정 **C139** — 회화(선생님 포함)를 먼저, **시험용 자료가 아닌 진짜 회화 1단계 자료와 실제 AI 선생님으로** 프리뷰한다(요청자 '가짜 테스트 아니고 실제 회화 테스트를 하고싶은거야'). 선생님 변경 단위(`intent/2026-10-17-회화-선생님-캐릭터/`, intent · spec approved — C117 · C122, 정본 반영 C130, 설정 키 잠정 값 C131)의 구현 계획을 쓴다. 시드 쪽 몫(명단 `seed/teachers.json` · 명단 검사 · '선생님 이름' 검사 · 설정 키 다섯)은 p08 에서 끝났다(C130 · C132 · C134 · C135).

## 읽을 것
- spec · intent: `intent/2026-10-17-회화-선생님-캐릭터/spec.md`(FR-1~FR-11 · NFR-1 · NFR-2 · AC-1~AC-11 · AC-N1 · AC-N2 · 미결 3 · 4 · 5 · 6) · `intent.md`.
- 정본(본 저장소 `specs/`, 최신 — 지도 `specs/README.md`): 4절 화면(선생님을 골라요 · 회화 세션 선생님 창 · 문구 표의 [이름] 조사), 5절(profiles.teacher_key · 명단 자료 · 순수 함수 목록), 6.1 · 6.2(회화 턴 고정부 선생님 블록), 7절(읽어 주기 높이 · 목소리 순서 · 시작 알림), 8절, 9절, 10절(선생님 그림 행), 11절, 12절(talk.teacher_* 다섯), 13절 C115 · C117 · C118 · C122 · C127 · C130 · C131 · C139.
- 코드 바탕: 회화 가지 워크트리 `.claude/worktrees/p13`(feature/1a-p13-conversation, 87ea684 — 회화 1~3단계 수업 · 회화 턴 호출 · '토' 동그라미 토리 표시). 시드 쪽 코드는 `.claude/worktrees/p08`(feature/1a-p08-seed-generation — `src/core/seed/check-teacher.ts` · `schema/teachers.ts` · `seed/teachers.json` · `seed/settings.json` · 그림 P6b 포함). **컨트롤러가 새 가지 feature/1a-p13d-teacher(워크트리 `.claude/worktrees/p13d`, 커밋 1a64d91 '합침 ④')를 회화 가지에서 만들고 p08 을 합쳤다** — plan 의 바탕은 이 가지다(코드는 이 워크트리에서 읽는다. lint · tsc · 단위 836 · seed:validate 720칸 통과, CI 19차 진행 중). 회화 1단계 단원 2~5 · 선생님 이야기 · 회화 평가 카드는 p08 에서 만드는 중이라 끝나면 다시 합친다.
- 시제품: 본 저장소 `prototypes/teacher-avatar/`(Vite · three 0.180 · @pixiv/three-vrm 3.5.5, `TeacherAvatar` 그림 층 · `sampleMotion` · 시험 다섯 · `LICENSES.md` · `README.md`). C115: 이것을 바탕으로 한다.
- 장부 `.superpowers/sdd/2026-10-16-1-가-구현/ledger-open.md` 에서 '선생님 화면 plan' 몫: 명단 빼는 목록을 명단 항목 칸으로(N-3) · 이름표 · 인사 단추 대비 짝(M-1) · 명단의 모델 · 초상 · 목소리 · 줄인 방법 칸을 필수로 · 뒤 명단 한글 이름 헛걸림(C136 (4)) · VRM 17.1 · 18.1MiB 줄이기 · 시제품 소리 출력 미확인 · 첫 묶음 약 714KB → 회화 화면만 따로 · 미나 licenseName Other · 리오 CC0 · '칭찬' 상태가 지금 ToriState 넷에 없음. 같은 차례에 묶을 수 있는 회화 쪽 남은 Minor(회화 느낌 고침 재검토 N-1 흘려 받기 실패 길의 onStuck · N-3 · N-4 · 단위 이름, 디자인 리뷰 2 Minor 6 — `review-p13-feel-fix1-code.md` · `review-design-all-2.md`)는 넣을지 말지 plan 이 정한다.
- 틀: `.claude/skills/plan-build/SKILL.md`. 1-가 하위 plan 의 꼴은 `intent/2026-10-15-모모-잉글리시-아카데미/plan-p13a-회화-턴-호출과-수업-규칙.md` · `plan-p13b-회화-수업-1-3단계.md`.

## 쓸 것
1. `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(상태 draft). **차례는 프리뷰가 먼저다**: 프리뷰에 꼭 있어야 할 것(선생님을 골라요 · 이름 자리와 조사 · AI 고정부 선생님 블록 · 회화 세션 선생님 창 3D 와 초상 대신 · 다섯 상태 · 목소리 높이 · 줄인 모델 자산 · 마이그레이션 profiles.teacher_key)과 프리뷰 뒤로 미룰 수 있는 것(iPad 실측으로 값 확정 · 뒤 명단 · 일부 자산 검사 등)을 가른다. 미루는 것은 수용 기준을 바꾸지 않고 '프리뷰 뒤 차례'로만 둔다.
2. 미결 3(줄인 모델 제공 길 · 줄이기 도구 · 값)과 미결 6(코드 식별자 이름)은 plan 이 권함과 까닭으로 정한다. 미결 4 는 실측 뒤.
3. PR 하나 분량(파일 열 개 · 단계 여덟 이하)을 넘으면 검토 묶음으로 나눈다(plan-p13a '회1' 꼴).
4. [사람] 단계(iPad 실측 · 프리뷰 확인 · 개발용 DB 실시드 전환 확인)와 컨트롤러 몫(가지 합침 · 개발용 DB 마이그레이션 적용)을 표시한다.
5. 증명: AC-1~AC-11 · AC-N1 · AC-N2 마다 시험 이름 · 명령. CI 에 WebGL 이 없으니 3D 시험 길을 정한다(spec 9절 몫).

## 지키는 것
- 정본 · spec · 코드 · 시드를 고치지 않는다. 쓰는 파일은 plan.md 와 보고 파일뿐이다. 설계를 바꿔야 하면 plan 에 넣지 말고 보고의 '정할 것'에 올린다.
- 설계 숫자는 설정값(12절)이다. 실제 파일을 열어 보고 적는다(추측 금지).
- 모든 명령은 Node 24: `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`.

## 보고
`task-teacher-plan-report.md`(같은 폴더) — 쓴 파일 · 차례 · 검토 묶음 · 프리뷰까지의 최단 차례 · 컨트롤러가 정할 것(13절 한 줄이 필요한 것 / plan 승인으로 정할 것) · 걱정. 마지막 답장은 한 줄 요약.
