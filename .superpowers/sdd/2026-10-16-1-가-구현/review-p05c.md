# P5c 검토 보고(rev-p05c · Opus · high, 가벼운 코드 검토, 커밋 a54e04b ↔ 81c3f40) — 판정 Approved(C 0 · I 0 · M 1)

검토자가 읽기 전용이라 보고 본문을 SendMessage 로 보냈고 컨트롤러가 2026-10-22 16:3x 에 그대로 옮겼다.

## 1. 설계 준수
- (1) 서버 액션 두 겹과 Zod: `actions.ts:69-71` · `:93-95` 첫 문장 `await requireAccess()`, 둘째 `assertSeedViewerLocal()`, 그다음 `strictObject`. 두 확인은 오류를 삼키는 `settle` 밖. 경로 거부는 `findCell` → `resolveSeedFile`(`files.ts:89-104`, 뿌리 밖 · `..` · 절대 경로 · 역슬래시) → `loadContentFile` → 칸 키 맞물림(plan 위험 4).
- (2) 쓰기 경로: 두 쓰기 모두 쓰기 직전 다시 읽음(`files.ts:551` · `:598`), `ReviewFileSchema`(`:557`) · `CheckFileSchema`(`:612`), 임시 파일 뒤 이름 바꾸기(`writeJsonAtomic` `:435`), 거부 글 '내용이 바뀌었어요. 다시 열어 주세요'(`:426`) plan 글자 그대로. 풀이 기록 없음 · 해시 다름은 P5a `withHumanDecisions` 가 거부.
- (3) 운영 빌드에 없음: 15:56 `next build` 의 `.next` — `app-path-routes-manifest.json` 에 `/dev/seed-viewer` 없음(`/dev/speech-probe` 는 있음), `dev` · `cache` · `*.nft.json` 을 뺀 grep 0건(saveHumanDecisions · appendReviewRow · saveReview · saveHumanCheck · writeJsonAtomic · seed-viewer · '표본 검토 남기기' · '사람 확인 남기기' · '순회 아니오'). `cell-view` · `review-panel` · `actions` 를 가져오는 곳은 `page.local.tsx` 하나.
- (4) 아이 눈 순회: `review-walkthrough.ts:15-63` 여덟 질문의 id · 글 · 짧은 이름 · 차례가 plan 표와 같음. 머리 꼴 `[순회 아니오: 이름 · 이름]`, 모르는 id 거부(C62 (4)).
- (5) 다르게 한 것 셋 모두 plan 의 뜻을 깨지 않음(내용 파일 경로 인자 — 맞물림 확인에 필요 · 시각을 액션이 만듦 — 파일 모듈은 시각을 읽지 않음 · 결과 글을 칸 밖 — 칸이 사라져도 남음).
- (6) 시험 참 단언: 단위는 쓴 파일을 다시 읽어 행 전체 비교 · 거부 뒤 파일 목록 · 임시 파일 없음 단언. e2e 는 남긴 파일을 스키마로 읽고 `seed-validate.ts --json` 실제 실행, 사람 확인 목록 · 미확인 목록에서 빠짐 확인.

## 2. 잘한 점
파일 시스템 오류는 터미널에만, 화면은 고정 글(`actions.ts:56-65`). 깨진 reviews · checks 파일을 덮어쓰지 않고 거부(`files.ts:447-465`, 시험 있음). 해시 시험 두 갈래(`seed-viewer-write.test.ts:399-426`). 날짜 시험은 시간대 경계 두 순간 · 키 없음 거부(`:327-346`). e2e 칸 분리 · 자정 경계 안전.

## 3. 지적
**Minor-1.** `files.ts:584-592` 사람 확인에서 문항 번호를 해시보다 먼저 봐, 시드가 고쳐져 문항이 빠지면 '이 칸에 문항 n 이 없어요'가 나오고 plan 의 '내용이 바뀌었어요. 다시 열어 주세요'가 안 나옴. 데이터는 어느 순서로도 안 쓰임. 고치는 법: 해시 대조 한 줄을 `findCell` 결과 확인 바로 뒤로. → **컨트롤러가 고침(해시 대조를 앞으로, 단위 시험 그대로 초록)**.

## 4. 범위 밖 관찰
- 운영 빌드의 아이 화면 쪽 `*.nft.json` 파일 추적 목록에 시드 보기 원본 파일 이름이 실려 있음(실행 안 되는 글, `tests/` · `scripts/` · `docs/` 도 함께 — P5c 전부터의 넓은 추적). 비밀값 파일 없음. 배포 묶음 줄이기는 따로.
- 구현 보고 '머리 주석 3줄 그대로' ↔ diff 는 `page.local.tsx:3` 도 고침(컨트롤러가 고친 것, 글은 맞음).

## 5. 판정
Approved. Minor-1 은 컨트롤러가 직접 고쳤다.
