# fix 1 보고: P2a 음성 판정 함수

상태: DONE · 2026-10-16 19:1x · 구현자 impl-p02a(Opus · high) · 같은 워크트리 `agent-a0ffe8037fa827af6` · git 쓰기 없음
근거: 브리프 `task-p02a-fix1.md`, 검토 `review-p02a.md`(C 0 · I 2 · M 2), 메인 저장소의 plan-p02 값 2(컨트롤러가 19:0x 에 고친 판의 82 · 91 · 98~100줄)

## 지적별 판정

| 지적 | 판정 | 고친 곳 | 더하거나 바꾼 시험 |
|---|---|---|---|
| I-1 감시 다시 시작이 활동 시간 상한을 다시 잼 | ADDRESSED | `src/core/speech/listen.ts:306` `reopenWindow = kind === "watchdog" && joinedText(s) === ""`, :320-321 은 듣기 창(windowStartAt · lastResultAt)을 이것이 참일 때만 새로 잼. 함수 머리 주석 :294-298 | "감시 타이머: 두 문장 이상 답의 도중에 다시 시작해도 활동 시간 상한은 처음 잰 대로다"(listen-end.test.ts:741). 상한 60초, 대본 [말함 · 말함 · 멈춤 · 말함]. 객체 3 이 48.2초에 감시로 끊겨도 cap stop 은 60초(객체 4), done 60.1초 |
| I-2 버튼 · 조용함 · 상한 stop 뒤 새 객체가 멈추면 다시 들음 | ADDRESSED | `listen.ts` `onWatchdog`(:338~) 349-356줄. 멈추는 중이고 stop 까닭이 chunk 가 아니며 모은 글이 있으면 abort 뒤 모은 글로 done(stall-after-stop). chunk 이거나 모은 글이 없으면 전처럼 감시 다시 시작(0회) · 멈춤(1회). plan 99 · 100줄과 같다 | "감시 타이머: 말하기 버튼으로 stop 한 뒤 막 연 새 객체가 멈추면 모은 글로 끝나고 다시 듣지 않는다"(:777) · "감시 타이머: 상한으로 stop 한 뒤 새 객체가 멈추면 상한을 넘겨 듣지 않는다"(:803) · "감시 타이머: 한 문장 답이 브라우저 끝 뒤 새 객체에서 멈추면 조용함 stop 뒤 모은 글로 끝난다"(:828). 셋 다 done 은 객체 2 시작 + watchdog 시간(33.1 · 33.1 · 19.0초)이고 start 는 2번뿐이다. 기존 hang-twice · hang-then-ok · '앱이 끊은 객체' 시험은 고치지 않고 그대로 통과 |
| M-1 {NAME} 에 붙은 문장 부호가 이웃 낱말을 먹음 | ADDRESSED | `src/core/speech/match-rate.ts:23` `NAME_WITH_POSSESSIVE`(`{NAME}` 과 바로 뒤의 소유 `'s` · `’s`), :180 입력의 U+E000 먼저 지움, :181 표지를 앞뒤 빈칸으로 감쌈, :209 낱말이 표지와 **같을 때만** 자리로 봄(전엔 '표지가 든 낱말') | "일치율: {NAME} 에 문장 부호가 붙어도 자리 하나만 아무 낱말과 맞는다"(match-rate.test.ts:171): `Hi,{NAME}!` 대 'bye bye' 0.5, `Thanks,{NAME}. Good job` → thanks · {NAME} · good · job, `{NAME}’s bag` → {NAME} · bag, 표지 글자가 든 목표 `I <U+E000>like apples` 대 'I hate apples' 는 2/3(전엔 1), 인식 쪽 표지도 지워짐 |
| M-2 글 뒤 no-speech 에서 옛 객체를 그대로 둠 | ADDRESSED | `listen.ts:410-417` 두 문장 이상 답은 `restart(…, "continue", [abort 옛 객체])`. 효과 차례는 abort → start(감시 다시 시작 길과 같음). 옛 객체의 뒤늦은 aborted · 끝은 번호로 버린다. plan 91줄과 같다 | 기존 "듣기 끝: 글 없이 끝나면 '결과 없음', 글 뒤 no-speech 는 한 문장 답이면 끝나고 두 문장 이상이면 다시 시작한다"(이름 그대로)에 단언 하나를 더함(:526-542). no-speech 시각의 효과가 [abort 1, start 2] 차례다 |

새 시험 이름에 AC 접두가 없고, 기존 시험 이름은 바꾸지 않았다. 새 대본 파일은 없다(시험 안 `inlineScript` 로 장면을 만듦).

## 설계와 다르게 한 것

없음. 고친 plan 값 2(82 · 91 · 98~100줄)를 글자 그대로 따랐다.
- '모은 글'은 판정 표 머리의 정의(끝난 조각과 지금 객체의 글을 이은 것)를 `joinedText` 로 그대로 쓴다.
- M-1 의 소유 흡수는 `'s` 뒤가 낱말 경계일 때만 한다. `{NAME}s` 처럼 따옴표가 없는 꼴은 흡수하지 않는다(s 낱말 하나가 남는다). 이 꼴은 다-7 표기 규칙으로 막을 일이다.

## 바뀐 파일

- `src/core/speech/listen.ts`: :294-306 · :320-321(I-1), :349-356(I-2), :410-417(M-2)
- `src/core/speech/match-rate.ts`: :21-23(정규식), :176-181(1단계), :209(6단계)
- `tests/unit/listen-end.test.ts`: :526-542(M-2 단언), :734-867 새 describe "감시 타이머 — 모은 글이 있을 때(검토 I-1 · I-2)"의 시험 넷
- `tests/unit/match-rate.test.ts`: :171-192 시험 하나

허용 파일 밖의 변화는 없다(`git status` 는 P2a 의 새 파일과 보고뿐이다).

## 명령과 출력

명령마다 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin` 를 앞에 두었다. `$HOME` 이 든 꼴은 격리 검사가 막았다.

- `pnpm biome check --write src/core tests/unit` → Fixed 2 files(꼴만)
- `pnpm lint` → `Checked 44 files … No fixes applied.`
- `pnpm test` → `Test Files 8 passed (8) · Tests 89 passed (89)`(fix 전 84 + 새 5)
- `pnpm exec tsc --noEmit -p tsconfig.json` → 0
- `pnpm build` → 성공(경로 `/` · `/_not-found`)
- `pnpm check:deps` → `✔ no dependency violations found (12 modules, 7 dependencies cruised)`
- `pnpm spec:trace`(인자 없이) → `15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 14 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 64`(그대로)
- `pnpm check:bundle` → `파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0`

## 남은 우려

- 검토 6절 '범위 밖 관찰' 1~4 는 브리프대로 손대지 않았다. 1 은 chunk stop 뒤 끝이 없으면 stall-after-stop 으로 끝나는 장면으로 H2 뒤에 본다. 2~4 는 P2b 몫이다.
- 새 시험이 고치기 전 코드에서 실패하는지는 다시 돌려 보지 않았다. 장면은 검토 재현 셋과 I-1 재현(108초)을 그대로 옮긴 것이다. 시각 단언(cap 60초 · done 33.1 · 19.0초)이 고치기 전 동작(108초 · 다시 시작 · 34초)과 갈린다.
