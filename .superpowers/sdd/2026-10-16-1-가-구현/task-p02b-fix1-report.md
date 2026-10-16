# fix 1 보고: P2b 음성 접점 · 관찰 페이지(검토 Minor 둘)

상태: DONE · 2026-10-16 · 구현자 impl-p02a(Opus · high) · 같은 워크트리(브랜치 feature/1a-p02b-speech-probe, P2a 커밋 2f222d5 위) · git 쓰기 없음
근거: 컨트롤러 지시(fix 1), 검토 `review-p02b.md` 2절 M-1 · M-2

## 지적별 판정

| 지적 | 판정 | 고친 곳 | 더한 시험 |
|---|---|---|---|
| M-1 교대 시험이 끊긴 듣기에서도 다음 문장으로 넘어가 읽음 | ADDRESSED | `src/app/dev/speech-probe/speech-probe.tsx:503-512`: `outcome.kind === "interrupted"` 이면 턴을 쌓지 않는다. 다음 문장을 읽지 않고 같은 문장에 머물며, 상태를 'ready' 로 두어 '말하기' 버튼을 다시 보인다(plan 값 2 갈래 표 interrupted 줄 · 나-4). 끊김 까닭은 :359 상태에 두고 :808-813 에 '끊김(<까닭>) — 턴으로 세지 않고 같은 문장에 머문다…' 로 보인다. 기록 표의 cancel 줄에도 남는다. [시작]을 누르면 지운다 | e2e "관찰 페이지: 교대 시험의 듣기가 쪽 숨김으로 끊기면 턴으로 세지 않고 다음 문장을 읽지 않으며 말하기 버튼을 다시 보인다"(speech-probe.spec.ts:137). 가짜 `document.hidden` 과 visibilitychange 로 끊는다 → 끊김(hidden) 표시 · 상태 ready · 턴 0 · 말하기 버튼 켜짐 · 읽은 글은 [" ", 첫 문장] 그대로 · 인식 호출은 [1 start, 1 abort]. 돌아온 뒤 같은 문장으로 다시 들으면 턴 1(첫 문장), 객체 2 |
| M-2 마이크 확인 객체를 새 듣기 · 닫기 · 숨김이 끊지 않음 | ADDRESSED | `src/lib/speech/browser.ts`: 지금 확인을 `activeCheck`(:149)로 붙든다(:507). 새 `listen()`(:179) · `speak()`(:397) · 새 `checkMicrophone()`(:469) · 쪽 숨김(:540) · `dispose()`(:559) 가 `cancelNow(까닭)` 를 부른다. 그러면 객체를 abort 하고 확인을 실패 `{ ok: false, code: "interrupted-<leave·speak·hidden>", group: "retry" }` 로 끝낸다(:500-505, 코드 앞부분 상수 `MIC_CHECK_INTERRUPTED_PREFIX` :35-39). 끝나면 붙든 것을 놓는다(:490). 끊긴 확인을 실패로 셀지는 P10 몫이라 주석에 적었다(검토 5절) | e2e "관찰 페이지: 마이크 확인 중 듣기를 시작하면 확인이 끊김으로 끝나고 인식 객체가 함께 돌지 않는다"(speech-probe.spec.ts:197). hang-twice 대본으로 확인 객체가 멈춘 채 듣기를 시작한다 → 확인 결과 '실패 · 코드 interrupted-leave · 갈래 retry', 객체 2, 호출 차례 [1 start, 1 abort, 2 start](확인 객체를 끊은 뒤 듣기 객체를 시작함) |

새 시험 이름에 AC 접두는 없다. 기존 시험 이름은 바꾸지 않았다.

## 설계와 다르게 한 것

- 끊긴 마이크 확인의 결과 꼴은 새로 만들지 않았다. `MicrophoneCheck` 의 실패 꼴에 코드 `interrupted-<까닭>` 와 갈래 retry 를 넣었다. 검토 5절 '범위 밖 관찰' 대로 꼴은 P10 브리프가 정할 일이라 형은 바꾸지 않았다.
- 새 `checkMicrophone()` 도 앞선 확인을 끊는다(까닭 leave). 확인 객체 둘이 함께 돌지 않게 하려는 것이다.

## 바뀐 파일

- `src/lib/speech/browser.ts`: :35-39 · :149 · :179 · :397 · :469 · :490 · :500-507 · :540 · :559
- `src/app/dev/speech-probe/speech-probe.tsx`: :359 · :481(시작 때 지움) · :503-512 · :808-813
- `tests/e2e/speech-probe.spec.ts`: :134-221 에 describe 둘 · 시험 둘

허용 파일 밖의 변화는 없다.

## 명령과 출력

명령마다 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin` 를 앞에 두었다.

- `pnpm biome check --write src tests` → 꼴만 1 파일
- `pnpm lint` → `Checked 53 files in 41ms. No fixes applied.`
- `pnpm exec tsc --noEmit -p tsconfig.json` → 0
- `pnpm test` → `Test Files 9 passed (9) · Tests 93 passed (93)`
- `pnpm e2e` → `9 passed (8.0s)`(전 7 + 새 2)
- `pnpm check:deps` → `✔ no dependency violations found (22 modules, 26 dependencies cruised)`
- `rm -rf .next && pnpm build` → 성공, 경로 `/` · `/_not-found` · `/dev/speech-probe`
- `pnpm check:bundle` → `check-bundle: 파일 31 · static 11 · 화면 파일 20 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0`

## 남은 우려

- 새 e2e 둘이 고치기 전 코드에서 실패하는지는 다시 돌려 보지 않았다. git 쓰기 금지라 바꾼 것을 잠시 치울 수 없었다. 단언(끊긴 뒤 읽은 글이 늘지 않음 · 호출 차례에 확인 객체 abort 가 듦)은 검토가 적은 고치기 전 동작(곧바로 다음 문장을 읽음 · 확인 객체를 끊지 않음)과 갈린다.
- 관찰 페이지의 화면 사진은 다시 찍지 않았다. 끊김 문구는 끊겼을 때만 보이고, 내보내기 장면의 화면은 그대로다.
