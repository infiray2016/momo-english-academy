# 묶음 4-나 보고: 지표 도구 talk-metrics

상태: DONE_WITH_CONCERNS · 구현자 Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(머리 6e86881, 커밋 없음) · 실호출(`--yes`) 안 함 · `src/core/*` · `src/server/*` 손대지 않음

## 바뀐 파일

| 파일 | 바뀜 |
|---|---|
| `scripts/talk-metrics.ts` | 신규. 판정 상수 45~71 · 입력 꼴 124~165 · 재료(시드 · 프롬프트 예 문장) 168~372 · 낱말 376~440 · 차례 재료 446~535 · 지표 판정 537~616 · 셈 618~944 · 값 946~1133 · 판정 줄 1135~1420 · 표 1426~1645 · JSON 1646~1710 · 명령 1712~1858 |
| `scripts/talk-observe.ts` | `CHANCE_ALERT_DEFAULT` · `chanceAlertOf` 186~192, 인자 `--chance-alert` 272, 아이 칸 글 상수 806(보고 글은 같음), `isSoundCue` 내보냄 872, 계획 끝 줄 2464, io `readJson` 2718, 부르기 전 기준선 꼴 확인 2865, 끝의 지표 셈 · 파일 셋 2955 |
| `package.json` | 31 `"talk:metrics": "tsx scripts/talk-metrics.ts"` |
| `tests/unit/talk-metrics.test.ts` | 신규. 시험 29 |
| `tests/unit/talk-observe.test.ts` | 기본 인자 기대값 둘에 chanceAlert, 계획 끝 줄 글, 실행 시험의 io `readJson`, 새 시험 셋 |

## 도구가 하는 것

- `pnpm talk:metrics <보고 json> [--baseline <json>] [--chance-alert <0~1>] [--out <폴더>]`. 표를 출력하고, `<이름>-metrics.md` · `-metrics.json` · `-review.md` 를 쓴다(기본은 보고 옆). 꼴이 틀리거나 파일이 없으면 종료 2 다.
- `pnpm talk:observe --yes … --baseline <json> --chance-alert <n>` 는 부르기 전에 기준선 꼴을 본다. 끝에는 같은 셈을 돌려 .md 보고 끝에 지표 표를 붙이고, .json 에 `metrics` 칸을 넣는다. 파일 셋도 따로 쓴다. talk-metrics 는 `await import` 로 불러서 정적 순환 import 가 없다.
- 대본마다 바퀴를 합친 분자 · 분모를 내고, 합계는 대본을 더한 값이다. 분모가 10 아래이면 '건수'로 적고, 상한 판정은 `num ≤ ⌊den × 상한⌋` 이다.
- 기술 오류 자리(4-가 `techError`)는 지표 분자 · 분모에서 빼고 따로 센다. 따로 세는 것은 들리지 않음 · 그 고정 문장 · 호출 쪽 실패 · 선생님 낱말 · 다시 부르기 · 범위 밖 낱말이다. 선생님 말 양 (1) · (2) 에는 넣는다(spec 그대로).
- 판정 줄은 spec 표 차례대로 '통과 · 기준 밖 · 사람 판정 · 기준선 없음 · 해당 없음'을 적는다. 사람 판정 칸은 □ 와 JSON null 로 비워 둔다. 알림은 출력 토큰 +30% · 턴 비용 +20%(위험 12)와 기회 알림이고, 판정에 넣지 않는다.
- 검토 목록 파일에는 걸린 차례(모든 바퀴, 자동 표시 붙음)와 첫 바퀴 전문을 둔다.

## 설계와 다르게 하거나 해석한 것

1. **고정 문장 모음.** 차례마다 그 바퀴 `systemPrompt` 에서 따옴표로 감싼 영어 예 문장을 꺼낸다. 여기에 카드의 안전한 대사 · 칭찬 대사 · 끝인사 · 마무리 물음 · 'Now let's talk.' · 시드 상황 줄 · 신호 말을 더한다. 정본 장(specs)의 예 문장은 따로 읽지 않는다. 프롬프트 · 시드 목록으로 들어온 것만 센다.
2. **틀에 박힌 맞장구 꼴(자동).** 반응이 한 문장이고, 네 낱말 안이며(05:38), 아이 말 내용어가 없어야 한다. 그 문장의 내용어도 일반 칭찬 목록(`STOCK_REACTION_WORDS`: nice · great · good · job …) 안에 있어야 한다. 그리고 보인 글 전체가 질문 하나로 끝나야 센다. 'Me too!' · 'Yum, rice!' 는 세지 않는다. 기준선 (가)는 0/52 이다(고침 전 코드가 늘 아이 낱말을 되받기 때문, 예 'Oh, juice! …'). 그래서 '고침 전보다 낮음'은 지금이 0 일 때만 통과다.
3. **예 · 아니요 답.** 'Yes!' 처럼 내용어가 없는 답은 바로 앞 질문의 명사 · 형용사를 아이 말의 뜻으로 본다. 이어짐 · 맞장구 · 장면 여는 질문 뒤 셈에 쓴다.
4. **범위 밖 낱말.** 질문 밖 원문(`output.tori_en`) 문장의 내용어를 센다. 범위는 단계 어휘 · 단원 단어 · 선생님 이름 · 시드 허용 목록 · 아이가 그 대화에서 앞서 말한 낱말이다. 닫힌 품사 한 낱말은 C203 (2) 대로 범위 안으로 친다. 줄임꼴은 core `normalizeSpoken` 으로 펼친다. 허용 목록은 셀 때의 시드를 읽으므로 기준선과 지금이 같은 잣대다. 다만 묶음 3 이 06:45 에 목록을 고쳐 yum 이 범위 안이 되었다. 기준선 값도 셀 때마다 바뀔 수 있다.
5. **답 글.** 답 예시는 앱이 붙인 답 소리를 쓴다. 없으면 앞 선생님 글에 든 카드 질문의 답 예시를 쓴다. 그 내용어 가운데 앞 질문 글에 없는 낱말이 든 문장을 원문 · 나간 것으로 센다.
6. **소리 줄 자리.** 설계 4 표를 move.stage · next · 들리지 않음으로 옮겼다. 1단계 선택지는 next 가 introduce · required 인 차례에만 받는다. 1단계는 판정 밖이라 어림으로 두었다.
7. **긴 차례 ㉠ ㉡ ㉢ 은 자동 후보다.** 자기 이야기는 'I …(세 낱말 이상) · My … · Me too · Let's pretend' 꼴이다. ㉡ 은 `child_topic` 이나 child_kind new_topic 으로 본다. ㉢ 은 `talk.self_line_every_turns` 를 쓰고, 대본 덮음을 설정 파일보다 앞세운다. 후보가 있으면 판정은 '사람 판정(후보 n)'이다.
8. **첫 문장.** 재질문 차례까지 모든 AI 차례로 p50 · p95 를 판정한다. 재질문 차례와 재질문 뺀 값을 따로 적고, NFR-8(2.5초)과의 차이도 적는다(AC-N2).
9. **호출 수 · 기회.** 대본마다 바퀴당 값으로 견준다. 기준선은 한 바퀴이고 회차는 두 바퀴이기 때문이다. '다시 쓰기 기회'는 더 이야기할 거리 항목 수로 읽었다. 알림은 필수 질문에만 건다.
10. **재질문 실패(retry_failed).** 4-가 우려 5 의 넓은 읽기를 그대로 두어 기술 오류 자리로 센다.

## 요청하는 변경

없다. 공용 파일 · 설계를 고칠 일은 없다.

## 덮는 시험

- `tests/unit/talk-metrics.test.ts`(29): 재료 다섯(프롬프트 예 문장 · 목록 en · 고정 문장 출처 · 덮음 우선 · 카드 없음 건너뜀), 고정 문장 · 되풀이 · 기술 오류 빼기, 맞장구 꼴 · 이어짐 · 예 · 아니요 답, 범위 밖 낱말 · 원문 셈 · 답 글 둘, 소리 줄 자리 · 신호 말 겹침, 장면 여는 질문 뒤, 선생님 말 양 · 긴 차례 ㉠ ㉡ ㉢, 호출 · 첫 문장 · 기회, 분모 10 아래 건수, 두 바퀴 합침, 기준선 대비 판정 · 알림, 표 · 검토 목록, 명령 인자 · 꼴 · 실행.
- `tests/unit/talk-observe.test.ts`(56, 새 시험 셋): '--chance-alert 는 0 초과 1 이하 수를 읽는다(기본 0.5, spec N-3)', '--yes 는 끝에 지표 표를 보고에 넣고 지표 · 검토 목록 파일을 따로 쓴다(talk-metrics)', '기준선 JSON 꼴이 틀리면 부르기 전에 멈춘다'.

## 실행 명령 · 결과

명령은 모두 `( cd <p13d> && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && … )` 서브셸에서 돌렸다. 출력 파일은 스크래치패드(`…/scratchpad/`)에 있다.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-metrics.test.ts tests/unit/talk-observe.test.ts` | 85 통과(`ai-scope-4na-unit.txt`) |
| `npx tsc --noEmit -p .` | 0 |
| `pnpm biome ci` 내 파일 다섯 | 0 |
| `pnpm biome ci .` | 1. 오류 넷이 모두 묶음 1 의 파일이다: `src/core/ai/calls/talk-lesson.ts` 형식 · `tests/unit/talk-ai-scope-flow.test.ts` 형식 · `tests/unit/talk-ai-scope-prompt.test.ts` 형식 · 시험 파일 export(`ai-scope-4na-biome.txt`) |
| `pnpm test` | 파일 161 · 시험 2124 통과 · 1 실패 · todo 6. 실패는 묶음 1 의 붉은 시험 `talk-ai-scope-prompt.test.ts` '고정부에 품질 지표의 수치 · 비율 문구가 없다'이다(`ai-scope-4na-unit-all.txt`) |
| `pnpm talk:metrics <기준선 json> --baseline <기준선 json> --out …/ai-scope-4na-proof` | 종료 0. 설계 8 표의 분자 · 분모가 대본 열둘마다 · 합계로 나온다(`ai-scope-4na-proof.txt`, 파일 셋 `ai-scope-4na-proof/`) |
| `pnpm talk:observe --level 3 --rounds 2 --baseline <기준선 json> --chance-alert 0.5`(--yes 없이) | 종료 0. 기준선 꼴 확인을 지나고 끝 줄이 '끝의 지표 표(talk-metrics)가 대본마다 견준다'이다(`ai-scope-4na-plan.txt`) |

기준선 (가)(`ai-scope-base/2026-11-06-talk-observe-settings.json`, 6e86881 한 바퀴)를 이 도구로 센 값은 아래와 같다. 고침 뒤 회차의 견줌 재료다.

| 지표 | 기준선 (가) |
|---|---|
| 고정 문장 차례 | 19/73(26%) |
| 상황 반응 되풀이 | 4 |
| 틀에 박힌 맞장구 꼴 | 0/52 |
| 이어짐(자동) | 53/62 |
| 범위 밖 낱말(자동, 07:0x 허용 목록) | 41/219(19%) |
| 소리 줄 자리 밖 · 신호 말 겹침 | 12 · 0 |
| 선생님 ÷ 아이 낱말 · 차례 앞 중앙 · p90 | 4.89 · 10 · 20 |
| 긴 차례 후보 ㉠ · ㉡ · ㉢ | 5 · 0 · 0 / 73 |
| 호출 · 재질문 | 77 · 13 |
| 첫 문장 p50 · p95 | 1422ms · 2347ms |

범위 밖 낱말 값은 허용 목록이 바뀐 뒤 다시 세면 줄어든다(우려 2).

## 남은 우려

1. **관문 0 전체가 묶음 1 때문에 붉다.** biome ci 오류 넷과 단위 시험 하나가 묶음 1 이 시험을 먼저 쓰는 중인 파일에서 난다(plan 위험 5 · 정한 것 10). 내 파일 다섯은 biome ci · tsc · 덮는 시험이 모두 0 이다. 묶음 1 이 관문을 지난 뒤 전체를 다시 돌려야 한다.
2. **허용 목록 · 카드가 바뀌면 기준선 값도 다시 센다.** 지표는 셀 때의 시드를 읽는다. 회차의 견줌은 같은 때 같은 시드로 두 JSON 을 함께 세므로(`--baseline`) 잣대는 같다. 기준선 숫자를 장부에 적을 때는 센 때를 함께 적어야 한다.
3. **자동 셈의 한계.** 맞장구 꼴 · 이어짐 · 긴 차례 · 자기 이야기는 낱말 · 꼴로 본 보조 셈이다. 'Me too!' 같은 뜻 받기, 넓혀 들려주기와 장면 말의 구분은 사람 판정이 한다. 판정 줄도 그렇게 적었다.
4. **묶음 5 와의 이음.** 새 코드의 신호 말 줄 · 상황 줄은 보고의 `attach` · `teacher` 에 실려야 셈에 든다. 묶음 5 가 신호 말 줄을 TurnRecord 의 다른 칸에 두면, `tallyRun` 의 신호 말 겹침 · 선생님 낱말 셈에 그 칸을 더해야 한다. 묶음 5 가 talk-observe 의 `isSoundCue` 사본을 core 의 것으로 바꾸면 talk-metrics 의 import 도 따라 바꾼다.

## fix round 1(컨트롤러 요청: 시험은 고정 표본으로)

- `tests/unit/talk-metrics.test.ts` 44 근처: 목록 셋(감탄 · 수업 말 허용 목록 · 상황 줄 · 신호 말)은 살아 있는 시드 목록을 읽지 않고 시험 안의 고정 표본 `FIXED_LISTS` 를 쓴다(`{ ...loadMetricsSeed(ROOT), ...FIXED_LISTS }`). 카드 · 어휘 · 설정은 시드 그대로다. 금지 구는 지표 셈이 읽지 않아 표본에 두지 않았다.
- 고정 표본에는 yum 이 없으므로, 두 셈 더하기 시험의 범위 밖 낱말 기대를 `{ yum: 1 }` 로 고쳤다. 이것으로 낱말 목록을 합치는 것도 증명한다. 컨트롤러가 본 실패 넷 가운데 셋(yum)은 이미 본 라운드에서 표본 낱말을 delicious · volcano 로 바꿔 풀려 있었다.
- 결과: `pnpm vitest run --project unit tests/unit/talk-metrics.test.ts tests/unit/talk-observe.test.ts` 85 통과(`ai-scope-4na-unit2.txt`), 내 파일 다섯 biome ci 0, tsc 0. 도구 코드는 바꾸지 않았다.
