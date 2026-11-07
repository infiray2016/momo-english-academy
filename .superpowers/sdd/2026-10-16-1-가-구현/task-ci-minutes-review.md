# 검토: CI 분 줄이기(ci.yml, p13d 작업 트리) 2026-10-29

판정: Changes requested. Critical 0 · Important 2 · Minor 2.

대상은 `.claude/worktrees/p13d/.github/workflows/ci.yml` 의 작업 트리 판(아래 "새 판", 줄 번호는 새 판 기준)이고, 옛 판은 1e44de5 의 같은 파일입니다. 시간 실측은 `gh run list/view`(읽기 전용)로 최근 실행 64번의 작업 · 단계 시각을 읽어 계산했습니다(대기열 시간 제외, 0.1분 단위 버림).

## 1. 설계 준수

- ✅ (나) 작업 묶기: 옛 판의 작은 작업 아홉이 `checks` 하나(14단계, 설치 한 번)로 들어갔습니다. 설치 단계와 단계 이름을 빼고 두 판의 단계(`run` · `if` · `env` · `uses` · `with`)를 YAML 로 읽어 비교하면 옛 판에만 있는 것과 새 판에만 있는 것이 모두 0개입니다. 옛 판 bundle-secrets 의 두 번째 `pnpm build` 만 의도대로 빠졌습니다.
- ✅ 명령 · 조건 · 환경 변수: check-ids 의 `--fail-on` 아홉 개(39줄), spec-trace 의 `--fail-on`(41줄), seed-validate · images-check 의 `hashFiles` 조건(47 · 50줄), integration 의 `NO_COLOR` · `set -o pipefail` · `tee int.log` · `! grep`(60~65줄), e2e 의 `E2E_PHOTOS` 와 사진 올리기(80~87줄)가 옛 판과 글자까지 같습니다.
- ✅ 설계 주석: C51(40줄) · C55 (1)(56줄) · P2b(66줄) · P5b(88줄) · P7b(38줄) · P4c(46줄), 그리고 review-p10-5-6-code I-1 · P11 차례 2 · 역분석 제안 6 · 조사 P5 가 모두 남아 있습니다. bundle-secrets 주석은 새 동작에 맞게 바뀌었습니다(54줄).
- ✅ (가) 조건식 문법: 아래 2절에서 설명하듯 세 사건 모두에서 오류 없이 뜻대로 평가됩니다.
- ❌ (가) "labeled 사건은 checks 를 다시 돌리지 않는다": 다시 돌리지는 않지만, 같은 concurrency group 이라 진행 중이던 checks 를 취소합니다(Important 1).
- ❌ (다) timeout 값: checks 20 · e2e-local 20 은 타당하지만, e2e 30 은 현재 실측에 비해 여유가 거의 없습니다(Important 2).
- ⚠️ 실제 GitHub 에서 labeled 사건이 진행 중 실행을 취소하는지는 이 저장소에서 실측하지 않았습니다. 판단 근거는 GitHub 문서의 concurrency 규칙입니다.

## 2. 잘한 점

- **check-bundle 이 같은 build 결과를 그대로 읽습니다.** `scripts/check-bundle.ts:12,168,185` 은 `process.cwd()` 아래 `.next/static` 과 `.next/server/app` 을 읽고, 새 판은 build(52~53줄) 바로 다음 단계에서 check:bundle(54~55줄)을 돌립니다. 두 단계 사이에 다른 단계가 없어 다른 산출물이 섞일 여지도 없습니다.
- **통합 시험은 build 뒤에 돌아도 충돌하지 않습니다.** `tests/integration/global-setup.ts:41-56,69` 가 운영 체제가 고른 빈 포트와 `mkdtempSync(tmpdir())` 임시 폴더를 쓰고, build 와 unit 은 서버를 띄우지 않습니다. 통합 시험의 대상은 `tests/integration/**/*.test.ts` 로 한정되어 있어(`vitest.config.mts:30`) `.next` 아래 파일을 집어 오지 않습니다.
- **실패 줄 지킴이 그대로 작동합니다.** 셸을 지정하지 않은 `run` 의 기본 셸은 `bash -e {0}` 이라 pipefail 이 없으므로 63줄의 명시적 `set -o pipefail` 이 꼭 필요한데, 그대로 남아 있습니다. `! grep` 이 마지막 줄이라서 그 종료 코드가 단계의 종료 코드가 됩니다. int.log 는 옛 판처럼 작업 디렉터리 뿌리에 쓰이고, 그 뒤에 도는 단계가 없습니다.
- **앞 단계가 실패하면 뒤 단계가 멈추는 동작이 브리프와 맞습니다.** 단계 `if` 에 상태 함수가 없으면 GitHub 가 `success() &&` 를 붙이므로(문서 "jobs.<job_id>.steps[*].if", 확인 정도 높음) hashFiles 조건이 있는 47 · 50줄도 앞 실패 뒤에는 돌지 않습니다. 브리프 (나) "싼 것부터 차례"와 24줄 주석의 뜻에 맞습니다.
- **`inputs.e2e` 를 고른 것이 맞습니다.** `inputs` 맥락은 boolean 입력을 boolean 으로 유지하지만 `github.event.inputs` 는 문자열 'false' 로 바꿔 참이 됩니다(GitHub 문서 "inputs context", 확인 정도 높음). workflow_dispatch 가 아닌 사건에서는 `inputs` 가 비어 있어 `inputs.e2e` 가 null 이 되며 오류가 나지 않고, 그 앞의 `github.event_name == 'workflow_dispatch' &&` 가 먼저 거짓이 되어 평가가 끝납니다.
- **push 에서도 오류가 나지 않습니다.** push 사건에는 `github.event.action` 이 없어 25줄이 참이 되고, `github.event.pull_request` 가 null 이어도 67 · 89줄의 `github.event_name == 'pull_request' &&` 가 먼저 막습니다. labeled 사건의 `github.event.pull_request.labels` 에는 방금 붙인 라벨이 들어 있으므로 'e2e' 를 붙이는 순간 e2e 둘이 뜹니다.
- **작업 이름이 바뀌어도 필수 검사가 깨지지 않습니다.** 저장소가 비공개 무료 요금제라 main 보호 규칙과 ruleset API 가 모두 403(기능 없음)을 돌려줍니다. 옛 작업 이름(lint · build …)을 기다리는 필수 검사가 있을 수 없습니다.
- **YAML 구조에 문제가 없습니다.** Ruby Psych 로 읽혔고, 매핑마다 중복 키를 검사해 0개였습니다. checks 의 단계 수(14)도 의도와 같습니다.

## 3. 지적

### Important 1. 라벨을 붙이면 진행 중이던 checks 가 취소되고, 그 커밋의 checks 결과가 사라집니다

- **자리:** `ci.yml:7`(types 에 labeled 추가), `ci.yml:18-20`(concurrency), `ci.yml:25`(checks 건너뜀).
- **무엇이:** labeled 사건으로 생긴 실행도 같은 group `ci-${{ github.ref }}`(PR 이면 `refs/pull/N/merge`)에 들어갑니다. `cancel-in-progress: true` 때문에 이 실행은 synchronize · opened 로 돌던 실행을 취소합니다. 그런데 새 실행은 25줄 때문에 checks 를 건너뛰므로, 그 커밋에는 끝난 checks 결과가 하나도 남지 않습니다. 화면에는 취소된 checks 와 건너뛴 checks 만 보입니다.
- **언제 생기나:** push 직후 사진을 받으려고 바로 'e2e' 라벨을 붙이는 경우가 대표적입니다. checks 는 약 5분 걸리므로 그 안에 라벨을 붙이면 취소됩니다. `gh pr create --label e2e` 처럼 만들 때 라벨을 붙이면 opened 와 labeled 가 거의 동시에 오므로 같은 일이 생깁니다(확인 정도 중간). 'e2e' 가 아닌 다른 라벨을 붙여도, 모든 작업이 건너뛰어지는 실행이 생겨 진행 중 실행을 똑같이 취소합니다.
- **근거:** GitHub 문서 "Control the concurrency of workflows and jobs"에 따르면, 같은 group 에 새 실행이 대기열에 들어오면 `cancel-in-progress: true` 일 때 진행 중 실행을 취소합니다. 작업 `if` 는 실행이 시작된 뒤에 평가되므로, 작업이 모두 건너뛰어질 실행도 group 에는 들어갑니다. 확인 정도는 높음(문서 규칙에서 바로 따라 나옴)이고, 이 저장소에서 실측하지는 않았습니다. 브리프 (가)의 "checks 는 다시 돌리지 않는다"는 앞 실행의 checks 결과가 유효하게 남는다는 전제에서만 성립합니다.
- **어떻게:** labeled 실행을 라벨 이름별 group 으로 떼어 놓기를 권합니다. 라벨 이름을 넣어야 다른 라벨을 붙인 실행이 'e2e' 라벨로 돌던 e2e 를 취소하지 않습니다.

```yaml
concurrency:
  group: ci-${{ github.ref }}-${{ github.event.action == 'labeled' && format('label-{0}', github.event.label.name) || 'run' }}
  cancel-in-progress: true
```

  이렇게 바꾸면, 라벨로 띄운 e2e 가 도는 중에 새 push 가 와도 그 e2e 는 취소되지 않고 끝까지 돕니다. 이 비용은 한 번에 최대 약 28분이고, 라벨을 붙인 직후 push 하는 경우에만 생깁니다. concurrency 를 작업 단위로 옮기는 방법도 있지만, 건너뛴 작업이 group 을 차지하는지 문서에서 확인하지 못했으므로 권하지 않습니다.

### Important 2. e2e 의 timeout 30분은 현재 실행 시간(21~27분)에 비해 여유가 거의 없습니다

- **자리:** `ci.yml:69`.
- **무엇이:** 브리프가 근거로 든 "e2e 실행당 평균 11.5분"은 64번 전체의 평균입니다(성공 41번 평균 11.3분으로 재현됨). 그러나 e2e 시간은 10-22 오후부터 크게 늘었고, 그 뒤 13번은 모두 21분을 넘었습니다. PR 6(ci/p13-c1)의 최근 성공 실행은 26.2분과 27.0분이었고, 그 가운데 `pnpm e2e` 단계만 24.1~25.5분입니다.

| 작업 | 브리프 기준 | 실측(최근) | 새 timeout |
|---|---|---|---|
| e2e | 평균 11.5분 | 21.1~27.0분(10-22~10-23, 13번) | 30분 |
| e2e-local | 평균 7분 | 보통 2.2~3.1분, 설치가 멈춘 때 26.8~49.2분(성공 4번) | 20분 |
| checks(옛 아홉의 합) | 12분 | 6.9~9.4분(최근 성공 4번, 설치 아홉 번 · build 두 번 포함) | 20분 |

- **왜 문제인가:** 여유가 3~4분(약 10%)뿐이라 러너 속도 차이나 e2e 시험이 조금만 늘어도 통과할 실행이 시간 초과로 실패합니다. 그러면 main push 와 라벨 실행의 e2e 결과를 믿을 수 없게 되고, 실패할 때마다 30분이 그대로 소모되어 분을 아끼려는 목적에도 어긋납니다.
- **근거:** 실행 39913399098 · 39909039146 · 39902064523 · 39892261319 등의 작업 · 단계 시각(`gh run view --json jobs`).
- **어떻게:** e2e 는 45분(현재 최대 27분의 약 1.7배)을 권합니다. checks 20분은 한 작업으로 묶으면 약 5~6분으로 예상되므로 3배 남짓의 여유가 있어 그대로 둡니다. e2e-local 20분은 보통 실행(2~3분)에는 넉넉하고, 설치가 멈춘 경우를 일찍 끊어 분을 아끼므로 그대로 둡니다.

### Minor 1. 'e2e' 라벨이 있는 PR 에 다른 라벨을 붙여도 e2e 둘이 다시 돕니다

- **자리:** `ci.yml:67`, `ci.yml:89`.
- **무엇이:** labeled 사건의 판단이 "이번에 붙인 라벨"이 아니라 "지금 붙어 있는 라벨 전체"를 보므로, 'e2e' 가 이미 있으면 어떤 라벨을 붙여도 같은 커밋에서 e2e 와 e2e-local 이 다시 돕니다. 한 번에 약 28분이 듭니다. 브리프 (가)의 글자("라벨이 붙어 있을 때")에는 맞으므로 Minor 로 둡니다. 지금 PR 6 에는 라벨이 하나도 없어 당장 생기는 비용은 없습니다.
- **어떻게:** pull_request 갈래에 이번에 붙인 라벨 조건을 더합니다. Important 1 의 라벨 이름별 group 과 함께 써야, 다른 라벨을 붙인 실행이 'e2e' 라벨 실행을 취소하지 않습니다.

```yaml
(github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'e2e') && (github.event.action != 'labeled' || github.event.label.name == 'e2e'))
```

### Minor 2. 긴 실행의 원인은 Playwright 설치 멈춤이므로, 설치 단계에 따로 timeout 을 두면 더 일찍 끊깁니다

- **자리:** `ci.yml:78`, `ci.yml:100`.
- **무엇이:** e2e-local 이 26.8~49.2분 걸린 성공 실행 가운데 단계 시각을 확인한 두 번(39838603341 은 47.4분, 39909039146 은 28.3분)은 모두 `playwright install --with-deps webkit` 단계가 시간을 썼고, 시험 자체는 1.3분이었습니다. 보통 이 단계는 0.6~1.3분입니다. 작업 timeout 만 있으면 e2e 에서는 설치가 멈춰도 45분(Important 2 권고값)까지 기다립니다.
- **어떻게:** 두 작업의 설치 단계에 `timeout-minutes: 5` 정도를 둡니다. 단계 단위 `timeout-minutes` 는 GitHub 가 지원합니다(문서 "jobs.<job_id>.steps[*].timeout-minutes", 확인 정도 높음).

## 4. 범위 밖 관찰

- 브리프의 증명 절차(PR 6 에 force-push 한 번 → checks 하나만 돌고 e2e 둘은 건너뜀)는 PR 6 에 라벨이 없으므로 의도한 길로 갑니다. ci/p13-c1 은 main 이 아니므로 push 사건도 생기지 않습니다.
- 'e2e' 라벨은 붙어 있는 동안 push 마다 e2e 둘(약 28분)을 돌립니다. 사진을 받은 뒤에는 라벨을 떼야 분이 아껴집니다. workflow_dispatch 도 입력 기본값이 true 라서 손으로 띄우면 약 35분이 듭니다. 둘 다 브리프대로입니다.

## 5. 판정

Changes requested. Important 1(labeled 실행이 checks 를 취소함)과 Important 2(e2e timeout 30분)를 고친 뒤 다시 봅니다.

## 재검토(fix 1회차, 2026-10-29)

라운드 판정: Approved. Critical · Important 는 남지 않았고, 새 Minor 1개는 커밋 전에 컨트롤러가 직접 고치면 됩니다.

대상은 같은 작업 트리 판이고, 줄 번호는 이번 판 기준입니다. 첫 검토 때의 판과 비교한 차이는 머리 주석(4~5줄), concurrency(20줄), e2e 둘의 `if`(68 · 91줄), e2e timeout(70줄), 설치 단계 timeout(80 · 103줄)뿐입니다. 옛 판(1e44de5)과 단계 내용을 다시 대조해도 옛 판에만 있는 것과 새 판에만 있는 것이 0개이고, 중복 키도 0개입니다.

### 지적별 판정

- **Important 1: ADDRESSED.** `ci.yml:20` 의 group 이 권고한 식과 글자까지 같습니다. synchronize · opened · push · workflow_dispatch 실행은 `…-run` group 에, labeled 실행은 `…-label-<라벨 이름>` group 에 들어가므로 라벨을 붙여도 진행 중인 checks 가 취소되지 않습니다. 라벨 이름이 'run' 이어도 `label-` 접두어 때문에 group 이 겹치지 않습니다.
- **Important 2: ADDRESSED.** `ci.yml:70` 이 45분입니다. 최근 실측 최대 27.0분과, 아래 새 Minor 의 권고값(설치 12분)을 더한 최악의 경우(약 12 + 25.5 + 1 = 38.5분)도 45분 안에 들어갑니다.
- **Minor 1: ADDRESSED.** `ci.yml:68,91` 의 pull_request 갈래에 `(github.event.action != 'labeled' || github.event.label.name == 'e2e')` 가 붙었습니다. 'e2e' 가 이미 있는 PR 에 다른 라벨을 붙이면 e2e 둘이 건너뛰어지고, 그 실행은 `label-<다른 라벨>` group 에 있으므로 'e2e' 라벨 실행도 취소하지 않습니다. synchronize 때는 앞 조건이 참이라 옛 동작 그대로 라벨 유무만 봅니다.
- **Minor 2: ADDRESSED.** `ci.yml:80,103` 에 단계 timeout 5분이 붙었습니다. 다만 그 값에 대해서는 아래에 새 Minor 를 적습니다.

### 새로 생긴 문제

#### Minor 3. 설치 단계 timeout 5분은 6~10분 걸리고도 성공한 설치를 끊습니다. 12분을 권합니다

- **자리:** `ci.yml:80`, `ci.yml:103`.
- **무엇이:** 첫 검토의 Minor 2 에서 "5분 정도"를 권한 것은 실행 몇 번의 표본(0.6~1.3분)만 보고 정한 값이었습니다. 이번에 최근 실행 64번의 설치 단계 122번을 모두 읽어 보니 분포는 아래와 같습니다.

| 설치 단계 시간 | 횟수 | 결과 |
|---|---|---|
| 2.0분 이하 | 105 | 정상 |
| 6.0~9.8분 | 10 | 9번 성공, 1번은 실행이 취소됨 |
| 22.4~47.5분 | 7 | 설치가 멈춘 경우 |

  6~9.8분 열 번은 모두 2026-10-22 07시~15시(UTC)에 몰려 있고, 멈춤 일곱 번 가운데 다섯 번도 같은 날입니다. 네트워크나 패키지 저장소가 느려지는 날에는 설치가 6~10분 걸리고도 끝까지 성공하는데, 5분 상한은 이런 실행을 실패로 끊습니다. 그날 기준으로는 설치 74번 가운데 10번(약 13%)이 끊깁니다. 끊긴 실행은 다시 띄워야 하므로 아끼는 분도 거의 없습니다.
- **근거:** `gh run view --json jobs` 로 읽은 단계 시각입니다. 실행 39739335263 · 39741128570 · 39756074894 · 39801443421 등이 6~9.5분에 성공했습니다.
- **어떻게:** 두 단계 모두 `timeout-minutes: 12` 를 권합니다. 성공한 설치의 최대값(9.5분)을 넘고, 멈춘 설치의 최소값(22.4분)보다 작아서, 정상 실행은 하나도 끊지 않으면서 멈춘 실행은 모두 10~35분 일찍 끊습니다. 12분으로 바꿔도 e2e-local 의 최악 경우(약 12 + 1.3 + 0.5 = 14분)가 작업 timeout 20분 안에 들어갑니다. 80 · 103줄 주석의 "26~49분"은 실측(22.4~47.5분)에 맞춰 "22~48분"으로 고치면 정확합니다.

### 범위 밖 관찰

- 첫 검토에서 적은 맞바꿈은 그대로입니다. 라벨로 띄운 e2e 가 도는 중에 push 하면 그 e2e 는 취소되지 않고 옛 커밋에서 끝까지 돕니다. 결함이 아니라 Important 1 을 고친 대가입니다.
- 증명 절차(PR 6 에 force-push 한 번)는 여전히 의도한 길로 갑니다. PR 6 에는 라벨이 없으므로 synchronize 실행이 `…-run` group 에서 checks 만 돌리고 e2e 둘은 건너뜁니다.

### 라운드 판정

Approved. Important 1 · 2 와 Minor 1 · 2 가 모두 반영됐습니다. 새로 생긴 Minor 3(설치 timeout 5분 → 12분)은 브리프대로 컨트롤러가 커밋 전에 직접 고치면 됩니다.
