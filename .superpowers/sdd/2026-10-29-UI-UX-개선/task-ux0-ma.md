# 브리프: UI · UX plan 묶음 0-마 — 필수 e2e 정적 작성(구현자 · Opus · high, 2026-10-30 00:5x 작성, 0-다 검토 Approved 뒤 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185)의 묶음 0-마 를 구현한다. 근거는 spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` 설계 3(필수 (가) 발화 표시 — 표와 '재는 법') · 설계 4(필수 (나) 막다른 화면 — N-1~N-20 표와 '재는 법') · 4.1 복구 예외 둘(N-12 · N-13 표의 'e2e 가 재는 것' 열) · AC-U6 · AC-U7, plan 의 '필수 둘은 실행 결과로만 완료' 절(214~220줄: 필수 경로 가 · 나 의 문장이 기준) · 정한 것 6(앱 오류 e2e 는 시험 DB 설정 행 하나를 지워 던지게 한 뒤 되돌림) · 정한 것 7('/' 요청 셈은 문서 이동과 미리 읽기 아닌 RSC 만) · 위험 7 · 8 · 증명 표 AC-23a (4) · AC-23f · AC-23g, 정본 9절 '필수 경로 가 · 나'(C180). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(커밋 전 변경 위: 1차 묶음 · 시드 규격 · 묶음 0-가(fix 1) · 0-나(fix 1) · 0-다 · 0-라(fix 1)). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지. **e2e 는 이 Mac 에서 돌릴 수 없다(내장 Postgres). 정적으로 쓰고 tsc · lint 로만 맞춘다. 상태는 '작성됨'이고 '실행 통과'는 11-01 뒤 CI 에서.**

## 범위(plan 묶음 0-마 표 101~102줄)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `tests/e2e/route-watch.ts`(제안) | 신규 | '/' 요청 셈 도우미: 문서 이동(navigation)과 미리 읽기(prefetch, Next 의 RSC 미리 읽기 머리)가 아닌 RSC 요청만 센다(정한 것 7 · 위험 8). 경로 내내 0회를 단언하는 꼴로 |
| `tests/e2e/screen-sampler.ts`(제안) | 신규 | 200ms 표본 도우미: 표본마다 화면에 표시(표지 data-child-said · data-tori-bubble · data-tori-line · data-tori-waiting · data-wait-hint · data-speak · 안내 줄)가 하나 이상 있는지 재고, 빈 구간의 가장 긴 길이를 돌린다(AC-23a (4) '빈 구간 5초 이하'의 5초와 200ms 는 시험 쪽 상수로 파일 머리에 까닭과 함께 둔다. 앱 설정값(ui.wait_hint_seconds)이 있는 문턱은 시험 DB 의 설정값을 읽어 쓴다) |
| `tests/e2e/required-utterance.spec.ts`(제안) | 신규 | 필수 경로 가(AC-23f): 회화 1단계 · 4단계에서 말로 보낸 턴마다(1~3단계의 바로 보낸 턴 포함) 아이 말풍선이 보낸 때부터 다음 선생님 말(첫 문장 · 쉬는 안내 · 끝인사)이 보일 때까지 끊김 없이 있고 글이 인식 글과 같다, 보낸 뒤 ui.wait_hint_seconds 안에 기다림 표시, 말하기 세션 인식 글이 다음 문항까지 남는다. 가짜 음성 대본 · 가짜 AI 는 기존 e2e 꼴(`conversation.spec.ts` · `speech-feedback.spec.ts` · `tests/e2e/lessons.ts` · fixtures)을 쓴다. 대화 기록 칸 단언은 회화 구현 뒤(묶음 6)라 넣지 않는다 |
| `tests/e2e/required-recovery.spec.ts`(제안) | 신규 | 필수 경로 나(AC-23g): 막힘 셋(N-1 세션 · N-2 회화 · N-3 배치: 마이크 막힘 → 큰 '다시 해 볼래요' → 같은 자리 · 같은 활동 번호 · 같은 시도) · 쉼 셋(N-5 세션 · N-6 회화 · N-7 결과 · 마무리: 상한을 채워 쉼 → 상한을 풀고 '다시 해 볼래요' → 같은 자리로, 결과는 그 수업 시작) · 목록 · 홈 쉼(N-8 · N-9 · N-10: 화면을 떠나지 않고 한 줄 칸, 홈 다시 확인 줄) · N-15 앱 오류(정한 것 6: 시험 DB 의 설정 행 하나를 지워 서버 그리기가 던지게 → '잠깐 문제가 생겼어요' → 행 되돌림 → 큰 '다시 해 볼래요' → data-trouble-retrying 이 붙었다 사라지고 같은 화면) · N-16 없는 주소(모르는 세션 id · 틀린 꼴 id · 남의 세션 → '찾는 화면이 없어요' + 큰 '홈') · 복구 예외 둘(N-12: 회화 4단계 가짜 AI 연결 오류 두 번 → '여기까지 이야기한 것은 저장했어요 …' → '수업 목록' → '하던 수업 이어 하기' → 같은 대화 기록 · 같은 말 주고받기 수 · 다음 선생님 말; N-13: 첨삭 대기 → '아직 글을 살펴보고 있어요' → '수업 목록' → 가짜 첨삭 도착 → '첨삭 보기' → 같은 초고의 둘째 세션). 경로마다 route-watch 로 '/' 0회. N-19 · N-20(소리를 들려주지 못함)은 5-나 · 6 이 더하므로 자리만 주석으로 둔다 |
| 기존 e2e 도우미(`tests/e2e/fixtures.ts` · `lessons.ts` 등) | 수정(필요할 때만) | 상한 채우기 · 풀기(0-가 의 reachSafetyCap · liftSafetyCap 꼴) · 가짜 첨삭 도착 · 설정 행 지우기 · 되돌리기 같은 DB 도우미를 더한다. 앱 코드에는 시험용 갈래를 두지 않는다 |

고르개는 이미 있는 표지만 쓴다: 0-가 data-button-size · data-ai-rest-trouble · data-mic-recheck-trouble · data-activity-no, 0-나 data-trouble-retrying, 0-다 data-met-words · data-met-word · data-star-total · data-closing-status, 1차 묶음 data-child-said · data-tori-bubble · data-tori-line · data-tori-waiting · data-wait-hint · data-speak. 없는 표지가 필요하면 동작을 바꾸지 않는 data-* 속성 하나만 더하고 보고에 적는다(그 밖의 앱 코드는 손대지 않는다).

## 알아 둘 것(검토가 남긴 것)
- **M4(0-가 검토): 회화 쉼이 아이 말 뒤 60초 안에 풀리면 '시작!'을 다시 거친다.** 쉼 길은 회화 턴 호출 기록을 남기지 않아 같은 시도 id 의 다시 보냄이 TURN_IN_FLIGHT_MS(turn.ts 122 · 745~757줄) 동안 stale 로 잡히고, 자료 다시 읽기가 판 키를 바꿔 틀을 새로 그린다. N-6 시험은 설계대로(같은 시도 id 로 이어지고 '시작!'이 다시 나오지 않음) 쓰되, 시험 DB 에서 그 시도의 시각을 상한 너머로 물려 stale 창을 피하는 길이 있으면 그 길을 쓴다. 없으면 test.fixme 로 두고 보고에 '회화 구현(서버 쉼 길)이 고친 뒤 fixme 를 푼다'고 적는다. 서버 쉼 길은 고치지 않는다.
- **M1(0-나 검토): 루트 오류 경계가 음성 모듈을 싣는다.** 이 묶음에서 `pnpm build && pnpm check:bundle` 을 한 번 돌려 첫 JS 결과를 보고에 적는다(고치지 않는다. 2-가 가 본다).
- 0-나 fix 1 우려: '다시 해 볼래요' 흐림이 다시 그리기 끝까지 이어지는지는 N-15 시험이 data-trouble-retrying 으로 잰다.
- 0-다 우려: 첫 사용 홈의 별 칸 없음 단언은 묶음 3(home.spec)이라 여기서는 넣지 않는다.

## 하지 않는 것
앱 코드 동작 · 화면 · 회화 흐름 · 토큰 · 시드 · specs 를 바꾸지 않는다. 커밋하지 않는다. e2e 를 돌리지 않는다(돌릴 수 없음).

## 절차 · 관문
기존 e2e 의 꼴(고르개 · 도우미 · 가짜 음성 대본 · 가짜 AI)을 먼저 읽는다. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit`(e2e 가 별도 tsconfig 면 그것도) · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 기준 49) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름은 정본 15절 번호 AC-23f · AC-23g · AC-23a 꼴) · `pnpm build && pnpm check:bundle`(보고). 다른 손 때문에 실패하면 고치지 말고 적는다.

## 보고(`task-ux0-ma-report.md`, 같은 폴더, 60줄 안)
바뀐 파일 · 경로마다 N 번호와 재는 방법(가짜 · DB 도우미) · 더한 data-* 표지 · M4 처리(물린 시각 길 또는 fixme) · check:bundle 결과 · 관문 · 상태('작성됨') · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:0x, 0-나 fix 1 재검토 권고): N-15 시험에 'data-trouble-retrying 이 판이 바뀌기(다시 그려지기) 전까지 남는다'는 단언을 넣는다. 0-다 검토 뒤 시작 조건은 채워졌다(0-가 · 0-나 · 0-다 · 0-라 모두 Approved).
