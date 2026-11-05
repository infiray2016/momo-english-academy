# 브리프: 묶음 0-라 fix 1 — heard 필수 칸 · 여러 문장의 감시 결과 모으기(구현자 impl-ux0-ra · Opus · high, 2026-10-30 00:2x 작성)

구현 보고 `task-ux0-ra-report.md` 의 '설계와 다르게 한 것' 1 과 우려 1 에 대한 컨트롤러 결정이다.

1. **heard 는 필수 칸으로 한다**(우려 2 를 닫는다 — 새 접점이 빠뜨리면 tsc 가 잡아야 한다. 들려주지 못함을 기술 오류로 기록하는 값이라 조용한 기본값을 두지 않는다). 범위 밖 시험 셋(`tests/unit/teacher-speech.test.ts` · `speech-paced.test.ts` · `speech-feedback.test.ts`)의 손 접점 `{ kind: "ended" }` 에 `heard: "played"` 를 더하는 것을 허용한다. 그 줄만 더하고 다른 줄은 손대지 않는다. speech-feedback.test.ts 는 impl-ux0-ga 가 fix 1 로 같은 시각에 손댈 수 있으니 Edit 로만 고치고(Write 금지) 고치기 직전에 다시 읽는다.
2. **여러 문장을 읽은 결과는 모은다**(우려 1). `src/core/speech/pace.ts` 에 순수 함수(제안 `speakHeardOfAll(list: SpeakHeard[])`)를 두고 규칙은 셋이다: 모두 played 면 played, 모두 not_played 면 not_played, 그 밖(섞임 · no_end 포함)은 no_end(들려준 것으로 보되 표시). 빈 목록은 played(읽을 문장이 없었음). `src/lib/speech/paced.ts` 가 문장마다 받은 heard 를 모아 이 함수로 돌린다. R-57 '한 번도 들려주지 못함'은 not_played 만 해당한다(5-나 · 6 · 가르치고 plan 이 이 값을 받는다).
3. 시작 알림 없이 끝 알림만 온 발화를 not_played 로 한 것('다르게 한 것' 2)은 R-48 대로이니 그대로 둔다.

시험: pace 순수 함수 네 갈래(모두 played · 모두 not_played · 섞임 · 빈 목록)와 paced 의 여러 문장 갈래(앞 문장 not_played · 뒤 문장 played → no_end). 관문은 브리프 `task-ux0-ra.md` 와 같다. seed-validator-teach 의 lint · tsc · 시험 실패는 다른 손(impl-seed-schema fix 1 진행 중)이니 고치지 말고 결과 그대로 적는다. 명령은 서브셸 · 절대 경로, cd 금지. 커밋하지 않는다.

보고는 `task-ux0-ra-report-fix1.md`(25줄 안). 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
