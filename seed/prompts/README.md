# seed/prompts — 생성 브리프와 표본 계획

이 폴더는 시드 본 생성의 프롬프트 판을 둔다(정본 6.3). `<영역>-<단계>.md` 가 영역 × 단계 생성 브리프이고 `_template.md` 가 그 틀이다. 프롬프트 판은 브리프 해시와 생성 정의(`.claude/agents/seed-generator.md`) 해시의 짝이다. 시드 검증기는 이 폴더를 걷지 않는다(`structure.ts` 의 SEED_UNWALKED_DIRS).

| 파일 | 상태 |
|---|---|
| `_template.md` | 브리프 틀(절 0~17) |
| `reading-1.md` | 읽기 1단계 첫 판(2026-10-22, 단원 0 알파벳 포함) |
| `speaking-1.md` | 말하기 1단계 첫 판(2026-10-22) |

## 1. 표본 전에 갖출 것

| 할 일 | 누가 | 까닭 |
|---|---|---|
| H9 — 볼트 기록 훅에서 `seed/` 를 뺄지 승인 | 요청자 | 6.3 '첫 표본 생성 전에' 정한다. 빼지 않으면 생성 세션 컨트롤러가 턴마다 `--mark-ingest` 와 log 한 줄을 남긴다 |
| H7 승인 뒤 P6b 가지(7767df0)를 p08 에 합침 | 컨트롤러 | p08 의 vocab 에 그림 키가 없고 `images.json` 이 비어 있다. 이대로면 읽기 그림 문제 · 말하기 듣기 보기가 모두 `image` 오류다. svg 그림 파일 꼴(C65)도 P6b 가지의 규격 코드에 있다 |
| P5a 가지(2c31bee)를 p08 에 합침 | 컨트롤러 | `pnpm seed:check`(풀이 검사)가 p08 에 없다 |
| H4 — 개발용 Anthropic 키(`.env.local`) | 요청자 | 풀이 검사 실호출. 키는 대화 · 파일에 적지 않는다 |
| p08 에서 Node 24 · `pnpm install --frozen-lockfile` | 컨트롤러 | p08 워크트리에 `node_modules` 가 없다 |
| 합친 뒤 `pnpm seed:validate` 종료 0 · 규격 파일 오류 0 | 컨트롤러 | 표본 전 바탕 확인 |

## 2. 표본 절차(2026-10-23)

같은 브리프 · 같은 정의로 effort 만 바꿔 네 단원을 만든다(6.3 S10).

| 표본 | 브리프 | 단원 | effort | 뿌리 폴더 |
|---|---|---|---|---|
| R-x | `reading-1.md` | 1 | xhigh | `tests/.tmp/p08-samples/xhigh` |
| R-h | `reading-1.md` | 1 | high | `tests/.tmp/p08-samples/high` |
| S-x | `speaking-1.md` | 1 | xhigh | `tests/.tmp/p08-samples/xhigh` |
| S-h | `speaking-1.md` | 1 | high | `tests/.tmp/p08-samples/high` |

두 뿌리 폴더는 `seed/` 규격 파일의 사본이다. 두 effort 가 같은 파일 경로(`lessons/reading/1/1.json`)를 덮어쓰지 않게 나눈다. `tests/.tmp/` 는 커밋되지 않는다. 동시에 3개까지 돌린다.

컨트롤러 명령 차례(p08 워크트리에서):

```sh
# 0) 뿌리 폴더 둘
for e in xhigh high; do
  mkdir -p tests/.tmp/p08-samples/$e/lists
  cp seed/*.json tests/.tmp/p08-samples/$e/ && cp seed/lists/*.json tests/.tmp/p08-samples/$e/lists/
done
# 1) 판 해시 — 코드로 계산하고 손으로 옮겨 적지 않는다
shasum -a 256 seed/prompts/reading-1.md seed/prompts/speaking-1.md .claude/agents/seed-generator.md
# 2) manifest 첫 줄(4절 꼴)을 뿌리마다 manifest/reading-1.jsonl · manifest/speaking-1.jsonl 에
# 3) 생성 호출 넷 — Agent(subagent_type seed-generator, model opus, effort xhigh | high), 호출 글은 아래 꼴
# 4) 최종 검증(뿌리마다)
#    결과 파일은 뿌리 밖에 쓴다 — 뿌리 안에 두면 검증기가 '시드 파일 배치에 없는 경로'로 잡는다(2026-10-23 표본에서 겪음)
pnpm -s seed:validate --root tests/.tmp/p08-samples/xhigh --areas reading,speaking --json --stats > tests/.tmp/p08-samples/xhigh.validate.json
pnpm -s seed:validate --root tests/.tmp/p08-samples/high --areas reading,speaking --json --stats > tests/.tmp/p08-samples/high.validate.json
# 5) 풀이 검사(H4 키 · P5a 합친 뒤). 처음엔 --dry-run 으로 대상 문항 수를 본다
pnpm seed:check --root tests/.tmp/p08-samples/xhigh --file lessons/reading/1/1.json --dry-run
pnpm seed:check --root tests/.tmp/p08-samples/xhigh --file lessons/reading/1/1.json --json
pnpm seed:check --root tests/.tmp/p08-samples/xhigh --file lessons/speaking/1/1.json --json
#    (high 뿌리도 같게)
# 6) 크기
wc -c tests/.tmp/p08-samples/*/lessons/*/1/1.json
# 7) 요청자 보기 화면(로컬 전용, 5절)
SEED_VIEWER_ROOT=tests/.tmp/p08-samples/xhigh pnpm dev
SEED_VIEWER_ROOT=tests/.tmp/p08-samples/high pnpm dev --port 3001
```

생성 호출 글 꼴(값은 1)의 출력과 오늘 날짜로 채운다):

```text
브리프: seed/prompts/reading-1.md — 이 파일만 읽는다
단원: 1
뿌리: tests/.tmp/p08-samples/xhigh
briefHash: <reading-1.md sha256> · agentHash: <seed-generator.md sha256>
effort: xhigh · createdOn: 2026-10-23 · revision: 1 · correction: 0
검증 명령: pnpm -s seed:validate --root tests/.tmp/p08-samples/xhigh --areas reading --json
```

생성자는 검증을 스스로 돌려 첫 결과를 보고하고 오류 칸만 고친다(브리프 14절, 고침은 seed.max_retries 2회까지). 첫 통과율은 그 보고의 '첫 검증'으로 센다. 컨트롤러의 4)는 최종 결과다.

## 3. 재는 표(S10 · 6.3 순서 (2))

| 잴 것 | R-x | R-h | S-x | S-h | 어디서 |
|---|---|---|---|---|---|
| 칸 수 | 26 | 26 | 26 | 26 | 생성 보고 · validate summary(단원 하나 26칸) |
| 첫 검증 오류 칸 · 첫 통과율 | 0 · 100% | 0 · 100% | 0 · 100% | 0 · 100% | 생성 보고 '첫 검증'. 통과율 = (칸 − 오류 칸) ÷ 칸 |
| 첫 검증 규칙별 오류 | 없음 | 없음 | 없음 | 없음 | 생성 보고 |
| 고침 회차 · 최종 오류 | 0 · 0 | 0 · 0 | 0 · 0 | 0 · 0 | 생성 보고 · 컨트롤러 최종 검증(`<뿌리>.validate-*.json`) |
| 최종 경고 | 0 | 0 | 0 | 0 | 컨트롤러 최종 검증 |
| 풀이 검사 대상 문항 | 130 | 130 | 78 | 78 | seed:check --dry-run(읽기 칸마다 그림 문제 5, 말하기 듣기 3) |
| 풀이 검사 걸림(different · multiple · none) | 0 | 0 | 0 | 0 | `<뿌리>.check-*.json` — 사람 확인 0 |
| 풀이 검사 비용(USD) | 0.138 | 0.138 | 0.114 | 0.114 | 기록 costUsd 합(각 1분 남짓) |
| 걸린 시간(분) | 17 | 9 | 12 | 7 | 생성 보고 시작 · 끝(02:26:44 · 02:50:11 시작) |
| 파일 크기 · 수업 하나 크기(KB) | 66,275 · 2.5 | 66,208 · 2.5 | 56,307 · 2.1 | 54,374 · 2.0 | `wc -c` ÷ 칸 수 |
| 생성자 토큰(하위 에이전트 합, 구독 사용량) | 약 167k | 약 111k | 약 144k | 약 101k | 작업 알림 usage |
| 수업 하나 토큰(추정) | — | — | — | — | (뒤에) count_tokens 로 비율을 정한다 |
| 보강 덮기 1번 · 2번 이상 단어 수 | 25 · 25 | 25 · 25 | 25 · 25 | 25 · 25 | 생성 보고(셈법은 '나온 보강 수업 수' — 브리프에 셈법 없음, 장부) |
| 답하는 대상으로 나온 단원 단어 수 | 15 | 15 | 25 | 25 | validate stats answerTargetWords |
| 요청자 판정(알맞음 · 쉬움 · 어려움 · 오류) | 대기 | 대기 | 대기 | 대기 | 표본 쪽 https://claude.ai/artifact/BrK2sw8LAdWrWY8svQdkzu (가 · 나로 가림, 짝은 스크래치 패드에만) |

'같다' 판정(6.3 S10): 첫 통과율 차이가 5%p 이하이고, 풀이 검사 걸림과 요청자 '오류'가 high 쪽에 더 많지 않으면 같다고 본다. 요청자는 결과를 볼 때 이 기준을 바꿀 수 있다. 정본은 '성격이 다른 두 묶음에서 한 단원씩, 모두 네 단원'이라 하고 읽기 4 · 회화 2 를 예로 들었다. 이번 표본은 지금 만들 수 있는 읽기 1 · 말하기 1 이다(컨트롤러 일정).

하루 생산량: (제안) 표본 네 단원의 걸린 시간으로 단원 하나 평균을 내고, 동시 세션 수와 구독 한도에 걸린 횟수를 함께 적는다. 그 값으로 6.3 시간 문단(읽기 · 쓰기 20~40분, 말하기 25~50분)을 고칠 값을 올린다. 평가 문항 한 벌 · 회화 평가 카드 한 벌의 시간(6.3 순서 (2))은 평가 브리프가 생긴 뒤 잰다.

## 4. manifest 꼴(제안)

`seed/manifest/` 는 폴더다(검증기가 걷지 않는 폴더). 영역 × 단계마다 `seed/manifest/<영역>-<단계>.jsonl` 한 파일, 한 줄에 기록 하나다. 쓰는 이는 컨트롤러 하나다(묶음 plan 위험 16). 해시 · 시각은 코드(`shasum` · `date`)로 채운다. 표본은 뿌리 폴더마다 `manifest/` 에 같은 꼴로 둔다.

```jsonl
{"type":"start","area":"reading","level":1,"brief":"seed/prompts/reading-1.md","briefHash":"<sha256 64자>","agent":".claude/agents/seed-generator.md","agentHash":"<sha256 64자>","model":"<생성자가 답한 모델 ID>","effort":"<호출 effort>","startedAt":"<ISO 시각>"}
{"type":"unit","unit":1,"briefHash":"…","agentHash":"…","model":"…","effort":"…","createdOn":"2026-10-23","retries":0,"cells":26,"firstErrorCells":0,"errors":0,"warnings":0,"minutes":0,"bytes":0}
{"type":"warning-decision","id":"<경고 id>","decision":"keep | regenerate","date":"…"}
{"type":"load","no":1,"inserted":0,"date":"…"}
```

첫 줄은 묶음 시작이다. 단원 줄을 적을 때마다 두 해시와 모델 ID 를 첫 줄과 견준다. 다르면 그 영역 × 단계를 처음부터 다시 만든다(6.3). 경고 결정 줄의 id 는 검증기 경고의 `id` 다. 적재 줄은 적재 보고 `--json` 의 inserted 를 옮긴다(장부 'P8 … 적재 보고 inserted 를 seed/manifest 에').

## 5. 요청자 표본 읽기(H11 첫 회)

- 어디서: `pnpm dev` 로 띄운 로컬 시드 보기 화면이다(프리뷰 · 운영에는 없다). 먼저 http://localhost:3000 에서 가족 접근 코드를 넣고, http://localhost:3000/dev/seed-viewer?file=lessons%2Freading%2F1%2F1.json 을 연다. high 뿌리는 3001 포트다.
- 무엇을: 영역마다 수업 두 칸 — (제안) 배정 1 · 변형 1 과 보강 1 · 변형 2. 두 effort 를 '가' · '나' 로만 보여 주고 어느 쪽이 어느 effort 인지는 판정 뒤에 밝힌다(제안). 영역마다 4개, 모두 8개, 수업 하나에 3~5분이다.
- 아이 눈 질문 넷(제안):
  1. 아이가 혼자 읽고(듣고) 무슨 뜻인지 알 수 있나요? 모르는 낱말이 튀어나오지 않나요?
  2. 그림과 글이 맞나요?(색 · 모습 · 수)
  3. 문제마다 답이 하나로 분명한가요? 비슷해서 헷갈리는 그림이 보기에 함께 있지 않나요?
  4. 어색하거나 무섭거나 아이에게 맞지 않는 말 · 상황이 없나요? 같은 단원 안에서 같은 이야기가 되풀이되지 않나요?
- 판정: 수업마다 '알맞음 · 쉬움 · 어려움 · 오류'와 메모를 `seed/reviews/<영역>-<단계>.json` 의 행으로 남긴다(칸 키 · 문항 번호 · 사유 ok | easy | hard | error · 메모 · 날짜, `ReviewRowSchema`). 표본은 뿌리 폴더마다 `reviews/` 에 둔다.
- 한 영역 · 단계에서 '오류'가 하나라도 나오면 그 단계 표본을 5개로 늘린다. 같은 종류 오류가 둘 이상이면 브리프를 고쳐 그 영역 · 단계를 다시 만든다(6.3).

## 6. 묶음 게이트 H11(묶음마다)

다음 묶음으로 가는 것은 아래 넷이 다 찬 뒤다(묶음 plan '시드 묶음 워크플로').

| 조건 | 기록 |
|---|---|
| 검증 오류 0 | manifest 단원 줄 |
| 풀이 검사 사람 확인 목록이 빔 — 요청자가 '정답 맞음 · 고침' | `seed/checks/` 의 human |
| 분포 경고마다 '그대로 · 다시 만들기' | manifest 경고 결정 줄 |
| 표본 2개 판정(오류면 5개) | `seed/reviews/<영역>-<단계>.json` |

## 7. 1~6단계 묶음 순서(제안)

| 차례 | 묶음 | 브리프 | 메모 |
|---|---|---|---|
| 1 | 읽기 1(단원 0 알파벳 포함) | `reading-1.md` | 10-24 개발용 DB 첫 묶음 |
| 2 | 쓰기 1(단원 0 알파벳 포함) | `writing-1.md`(새로) | |
| 3 | 말하기 1 | `speaking-1.md` | |
| 4 | 1단계 단계 평가 세 영역 × 3벌 | 평가 브리프(새로) | 평가 지문 · 문항은 그 단계 수업과 겹치면 안 되므로 수업 묶음 뒤(6.3 단계 평가 행). 1-가 실시드 몫(C68 (1)) |
| 5~8 | 읽기 2 → 쓰기 2 → 말하기 2 → 2단계 평가 | | |
| 9~12 | 읽기 3 → 쓰기 3 → 말하기 3 → 3단계 평가 | | 쓰기 3 전에 검증기를 C84 에 맞춘다(지금은 대문자 카드를 모두 막는다) |
| 13 | 회화 1~3 카드 · 회화 평가 카드 · 토리 이야기 1~3 구간 | 회화 브리프(새로) | P13 회화 턴이 표본 카드로 돈 뒤(C85 · 6.3 (4-나)) |
| 14~ | 읽기 4 → 쓰기 4 → 말하기 4 → 4단계 평가 … 6단계까지 | | |
| 끝 | 회화 4~6 · 토리 이야기 4~6 구간 | | |

배치 평가 가 벌(6.3 순서 (3), 144문항)은 평가 브리프로 따로 만든다. 정본 순서는 (3) 배치 → (4-가) 수업이다. (제안) 일정 때문에 1단계 묶음들과 나란히 다른 세션에서 만든다.

## 8. 표본 뒤 정할 것(H10)

- effort 를 정한다. 정해지면 생성 정의 프런트매터에 `effort` 를 적는다(6.3 'effort 는 에이전트 정의 파일의 값으로 기록'). 그러면 정의 해시가 바뀌어 프롬프트 판이 바뀐다. (제안) 표본 단원은 본 묶음에 그대로 넣지 않고 새 판으로 다시 만든다. high 로 정하면 CLAUDE.md 서브에이전트 줄에 이 정의는 예외라고 한 줄 적는다(6.3).
- 표본의 오류 · 풀이 걸림 · 요청자 판정을 브리프에 반영한다. 고치면 판이 바뀐다.
- `seed.remedial_coverage.1-3` 을 정한다. 보강 3개로 2번 덮기가 되는지 표본에서 잰 값을 보고 학습 설계자가 정한다(6.3 순서 (2)).
