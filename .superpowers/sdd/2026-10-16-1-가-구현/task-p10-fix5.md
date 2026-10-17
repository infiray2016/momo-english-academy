# 구현 브리프: P10 fix 5 — 차례 5 · 6 코드 검토 지적 + 요청자 프리뷰 시험에서 드러난 것(implementer impl-p10 이어 보기 · Opus · high, 2026-10-18 02:3x)

`review-p10-5-6-code.md`(rev-p10, Changes requested — C 0 · I 2 · M 4, fix 4 여덟은 ADDRESSED)의 지적과 요청자가 프리뷰(iPad · 원격 PC)에서 겪은 것 셋을 고친다. 워크트리 p10. 커밋은 컨트롤러가. **이 Mac 은 아직 새 Postgres 가 안 뜬다** — 통합 · e2e 는 CI(ci/p10-c5 push 는 컨트롤러)로; 단위 · tsc · biome · build 는 로컬. 시험 먼저.

## 코드 검토(review-p10-5-6-code, 보고 '어떻게' 그대로)
- **I-1 CI 통합 작업이 실패를 가림(Important, P3a 부터)**: `tests/integration/global-setup.ts` 가 embedded-postgres 를 읽으면 async-exit-hook 이 `beforeExit` 에 `process.exit(0)` 을 걸어 vitest 의 실패 종료 코드를 덮는다(run 39051573610 · 39050999951 의 통합 로그는 'Tests 1 failed' 인데 작업은 success). (1) `scripts/pg-local.ts` 에 `importEmbeddedPostgres()`(제안) 하나를 두고 — 동적으로 읽은 뒤 새로 걸린 `beforeExit` · `exit` · 신호 처리기를 뗀다(dev-db 의 신호 처리기 떼기와 같은 꼴) — dev-db 와 global setup 이 함께 쓴다. (2) `.github/workflows/ci.yml` integration 단계에 지킴: `set -o pipefail; pnpm test:int 2>&1 | tee int.log; ! grep -qE "Tests +[0-9]+ failed" int.log`(또는 JUnit 보고 검사). (3) 단위 시험 하나: 처리기를 뗀 뒤 `process.listeners("beforeExit")` 에 embedded-postgres 것이 없음.
- **I-2 가려진 실패 — '세션 틀: 다시 열면 저장한 시도 다음 활동부터 이어진다'**: `lessonRow(1, "reinforce", 1)` 이 작은 틀(다지기 = 3번)에서 늘 던져 정할 것 ㄹ(만난 단어) 단언이 한 번도 안 돎 → e2e AC-2f 처럼 그 단원의 다지기 칸을 DB 에서 읽어 `kind === "reinforce"` 첫 칸의 `lessonNo` 를 쓴다. I-1 뒤 CI 로그로 실제 초록 확인.
- **M-1** 세션 시작이 트랙 행 잠금 안에서 목록 입력을 **바깥 연결**로 읽어 풀(3)이 차면 서로 기다림 → `tx` 를 넘겨 같은 연결로 읽고, 화면은 `useRef` 로 겹침 시작을 막는다.
- **M-2** 대기열이 묶음 전체 거부(50 초과 · 꼴 오류)에서 영영 안 빔 — **P11 몫**(장부에 둠, 이번엔 손대지 않음).
- **M-3** 운영에서 동음이의어 목록 파일이 없으면 따라 말하기 채점이 조용히 엄해짐 → 서버 시작(또는 첫 읽기) 때 없으면 `console.warn` 한 번 + 적재(`seed:load`) 검사에 목록 파일 유무를 넣는다(P7a 적재 쪽은 컨트롤러와 상의 — 이번엔 warn 만).
- **M-4** 쪽지 초점 가두기가 덮개 클릭으로 초점이 빠지면 Tab 이 뒤로 감 → 덮개 클릭은 쪽지를 닫거나 초점을 쪽지로 되돌린다.

## 요청자 프리뷰 시험(2026-10-18 01:5x~02:3x)
- **마이크 확인 거짓 양성**(첫 실행 '마이크 확인'이 원격 PC 에서 '잘 돼요'로 통과한 뒤 배치 따라 말하기에서 실패): 확인이 **인식 API 존재만으로 통과하지 않게** — 실제 인식 결과(또는 소리 들어옴 사건)가 한 번 와야 '잘 돼요', 안 오면 7절 실패 문구('마이크를 쓸 수 없었어요. 그래도 다음으로 넘어갈 수 있어요'). 가짜 음성 대본으로 단위 · e2e.
- **마이크 '못 씀' 되돌리기(1-가 임시)**: `markMicUnavailable` 뒤 되돌릴 길이 없음(부모 화면 '마이크 다시 확인'은 1-나) → 홈의 닫힌 카드 문구 아래 작은 글 '마이크를 켰으면 여기를 눌러 다시 확인해요'(새 문구 — C72 표에 더함, 컨트롤러)와 `clearMicState` 뒤 다시 판정. iPad 는 받아쓰기 · Siri 를 켜면 API 가 생기므로 홈 진입마다 재판정(AC-5c)이 그대로 되는지도 확인.
- **홈 안내 한 줄**: 시작 단계를 안 고른 영역의 '내 단계 찾기' 카드 아래 '단계를 몰라도 돼요. 짧은 문제로 찾아요'(새 문구 — C72 표에 더함, 컨트롤러) — 요청자가 잠긴 것으로 봄.
- **회화 '준비 중' 쪽(1-가)**: `/talk` 에 부모용 작은 글(`data-parent-info`) '회화 수업은 다음 차수에 들어와요' 한 줄(개발 기간 안내, 1-나에서 뺌 — C72 표).

## 완료
tsc · biome · 단위 · build 초록, 보고 `task-p10-report.md` 'fix 5' 소절. 끝나면 SendMessage → 컨트롤러가 ci/p10-c5 push(통합 로그의 'failed' 유무 직접 확인) → 재검토 → 커밋.
