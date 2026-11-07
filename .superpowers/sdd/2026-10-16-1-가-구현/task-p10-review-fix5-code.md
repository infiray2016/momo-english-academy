# 재검토 브리프: P10 fix 5(review-p10-5-6-code I-1 · I-2 · M-1 · M-3 · M-4 + 요청자 프리뷰 결함 넷 + 마이크 안내 문구)(code-reviewer rev-p10 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-18 04:0x)

범위 한정 재검토. 지적별 ADDRESSED · NOT ADDRESSED · 새로 깨뜨린 것. 파일 고치지 않음. 이 Mac 은 아직 새 Postgres 가 안 뜬다 — DB 시험은 CI 결과(ci/p10-c5 c606f5c, run 번호는 메시지로)를 증거로: integration 은 지킴 단계('failed' grep)가 들어간 뒤 처음으로 믿을 수 있는 '통과'(7차 run 39060088890: Test Files 13 · Tests 108 + 1 skipped). 54331 · 3001 · 프리뷰 DB 는 건드리지 않는다.

## 대상(구현 보고 `task-p10-report.md` 'fix 5' · 'fix 5 덧붙임' · 'CI 7차' 소절, 단위 364)
- **I-1** `scripts/pg-local.ts` `importEmbeddedPostgres()` — 동적 import 뒤 새로 걸린 `beforeExit` · `message` · 신호 처리기를 떼고 `exit` 는 남김; `tests/integration/global-setup.ts` · `scripts/dev-db.ts` 가 함께 씀; `.github/workflows/ci.yml` integration 단계 `set -o pipefail; pnpm test:int 2>&1 | tee int.log; ! grep -qE "(Test Files|Tests) +[0-9]+ failed" int.log`(NO_COLOR). 단위 시험(처리기 떼기). 구현자 로컬 재현: 그대로 읽으면 0 · 도우미로 1.
- **I-2** `tests/integration/session-start.test.ts` 다지기 칸 번호를 DB 에서(`firstReinforce`) — 7차 CI 에서 실제 통과.
- **M-1** `DbOrTx` 형 · 읽기 함수가 tx 를 받음 · 세션 시작이 같은 tx 로 목록 · 수업 칸 읽기 · `use-lesson-start` useRef 막음. **M-3** 동음이의어 목록 없으면 console.warn 한 번. **M-4** 덮개 전체를 dialog(tabIndex −1)로 — 덮개 클릭에도 초점이 쪽지에 남음.
- 요청자 결함 넷: 마이크 확인 성공 조건(soundstart · speechstart · 결과) + `audio-no-sound` 대본 e2e · 닫힌 말하기 카드 아래 '마이크를 켰으면 여기를 눌러 다시 확인해요'(clearMicState 뒤 재판정) · '내 단계 찾기' 카드 안내 '단계를 몰라도 돼요. 짧은 문제로 찾아요' · `/talk` 부모용 '회화 수업은 다음 차수에 들어와요'(data-parent-info) · 마이크 확인 단추 아래 '단추를 누른 뒤 아무 말이나 한마디 해 주세요'(첫 실행 · 배치, data-mic-speak-hint) — 넷 모두 C72 표(plan-p10a · p10b)에 있음.
- CI e2e 고침: 첫 실행 화면 data-hydrated · fillPin · home.spec 대기(PIN autoFocus 경쟁).

## 볼 것
1. I-1 — 떼는 처리기 범위가 안전한지(embedded-postgres 가 'exit' 에서 하는 정리는 남기는지 · 다른 라이브러리 처리기를 건드리지 않는지), dev-db 의 기존 신호 처리와 겹치지 않는지, 지킴 grep 이 vitest 출력 꼴(색 끔)과 맞는지 · 거짓 양성(예: 시험 이름에 'failed')이 없는지.
2. M-1 — tx 안 읽기가 잠금 순서 · 교착을 새로 만들지 않는지, `DbOrTx` 가 server-only 경계를 지키는지.
3. 마이크 확인 — 소리 조건이 7절(끊김은 다시 · 그 밖 실패는 알림 하나 · mic-unavailable 이면 저장)과 맞는지, timeout 길(speech.max_listen_seconds + watchdog)이 설정값인지, '다시 확인' 단추가 `clearMicState` 뒤 재판정만 하고 서버 상태를 안 건드리는지(7절 '기기 상태는 브라우저에만'), 새 문구가 표와 글자 같은지, `data-mic-speak-hint` 가 두 화면에.
4. 새로 깨뜨린 것 · 장부 판정(CI 가림 행 · 마이크 거짓 양성 행 · 수업 목록 해석 행).

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-fix5-code.md`(메인): 지적별 표 · 새 지적 · 장부. 요지 5줄 SendMessage.
