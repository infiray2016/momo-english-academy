# fix 1 브리프: P2a 음성 판정 함수(implementer impl-p02a · Opus · high, 같은 워크트리)

검토 `.superpowers/sdd/2026-10-16-1-가-구현/review-p02a.md`(rev-p02a, Changes requested C 0 · I 2 · M 2)의 지적 넷을 모두 고친다. 컨트롤러가 먼저 plan-p02 값 2 를 고쳤다(19:0x): 82줄의 창 재측정 조건 · 99줄의 '멈추는 중 · 신호 없음' 줄을 둘로 나눔 · 91줄 no-speech 줄. 코드는 고친 plan 을 글자 그대로 따른다(메인 저장소 `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md` 를 다시 읽는다. 워크트리의 plan 사본은 옛 판이다).

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리에서 이어 한다. git 쓰기 금지. 명령은 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(`source` 는 막힌다).
- 허용 파일: `src/core/speech/listen.ts` · `src/core/speech/match-rate.ts` · `tests/unit/listen-end.test.ts` · `tests/unit/match-rate.test.ts` · 필요하면 `tests/fixtures/speech/scripts/*.json` 새 대본 · 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p02a-fix1-report.md`. 그 밖은 손대지 않는다. 기존 시험의 이름은 바꾸지 않는다(증명 표 글자 그대로). 새 시험 이름에 AC 접두를 붙이지 않는다.

## 지적과 고치는 법(검토 보고 3절 그대로)
1. **I-1**(listen.ts:315-316, 상한 계산 :221-222). 감시 다시 시작에서 듣기 창(windowStartAt · lastResultAt)은 아직 모은 글이 없을 때만 새로 잰다. 모은 글이 있으면 창을 그대로 둔다(활동 시간 상한이 밀리지 않는다). 시험 더하기(이름 제안 "감시 타이머: 두 문장 이상 답의 도중에 다시 시작해도 활동 시간 상한은 처음 잰 대로다"): 상한 60초, 객체 1 · 2 가 말하고 객체 3 이 멈춤(시작 뒤 아무 일도 없고 stop 에도 답하지 않음) → 감시 다시 시작 뒤에도 cap 이 60초에 온다(검토 재현: 고치기 전엔 108초).
2. **I-2**(listen.ts:339-344 `onWatchdog`). 멈추는 중 · 지금 객체 신호 없음 · watchdogAt 도달에서: stop 까닭이 chunk 이거나 아직 모은 글이 없으면 지금처럼 감시 다시 시작(0회) · '멈춤'(1회). stop 까닭이 버튼 · 조용함 · 상한이고 모은 글이 있으면 abort 뒤 모은 글로 done(까닭 stall-after-stop). 시험 셋(검토 재현 장면, 이름 제안): "감시 타이머: 말하기 버튼으로 stop 한 뒤 막 연 새 객체가 멈추면 모은 글로 끝나고 다시 듣지 않는다"(두 문장 이상 · 상한 없음 · 객체 1 이 15초 말하고 chunk 로 객체 2 → 15.5초 버튼 → 객체 2 가 stop 에 답하지 않음 → watchdogAt 에 done 결과) · "감시 타이머: 상한으로 stop 한 뒤 새 객체가 멈추면 상한을 넘겨 듣지 않는다"(상한 20초, 객체 2 멈춤 → 20초 stop → watchdogAt 에 done, 53초까지 듣지 않음) · "감시 타이머: 한 문장 답이 브라우저 끝 뒤 새 객체에서 멈추면 조용함 stop 뒤 모은 글로 끝난다"(객체 1 이 글을 낸 뒤 스스로 끝 → 객체 2 멈춤 → 조용함 stop → watchdogAt 에 done 결과, 34초가 아님). 기존 시험(hang-twice · hang-then-ok · '앱이 끊은 객체와 옛 객체의 일은 버린다')은 '모은 글 없음' 장면이라 그대로 통과해야 한다.
3. **M-1**(match-rate.ts:177 · :199 · :206). 표지를 앞뒤 빈칸으로 감싸 홀로 서게 하고, 바로 뒤의 소유 `'s` · `’s` 는 표지에 흡수하며, 입력(인식 글)에 든 U+E000 은 먼저 지운다. 시험 더하기(이름 제안 "일치율: {NAME} 에 문장 부호가 붙어도 자리 하나만 아무 낱말과 맞는다"): `matchRate("Hi,{NAME}!", "bye bye")` 는 0.5, `"Thanks,{NAME}. Good job"` 에서 thanks 가 남는다, 입력에 U+E000 이 든 낱말은 자리가 되지 않는다(목표 "I like apples" 에 인식 'I hate apples' 가 1 이 되지 않는다).
4. **M-2**(listen.ts:396-399). 두 문장 이상 답의 글 뒤 no-speech 에서 옛 객체를 abort 한 뒤 새 객체를 연다(효과 차례 abort → start, 감시 다시 시작 길과 같게). 옛 객체의 뒤늦은 일은 번호로 버린다. 시험: 기존 "듣기 끝: 글 없이 끝나면 '결과 없음', 글 뒤 no-speech 는 한 문장 답이면 끝나고 두 문장 이상이면 다시 시작한다" 에 abort 효과 단언을 더한다(이름은 그대로).

검토 6절 '범위 밖 관찰' 1~4 는 이번에 고치지 않는다(1 은 H2 뒤, 2~4 는 P2b).

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace`(인자 없이, missing-test 64 그대로) · `pnpm check:bundle`(build 뒤). 보고 `task-p02a-fix1-report.md`: 지적 1~4 마다 ADDRESSED(파일:줄 · 더한 시험 이름) · 설계와 다르게 한 것 · 바뀐 파일:줄 · 명령 출력(시험 수). 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝낼 때 Stop 관문이 `biome ci` 와 단위 시험을 돈다.
