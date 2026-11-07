# 재검토 보고: 기록 규칙 묶음 끝 전환 fix 1(코드 검토자 · Opus, 2026-10-30 14:1x, 범위 한정)

**라운드 판정: Approved** (지적 8건 ADDRESSED, 새 Minor 1건은 컨트롤러가 직접 고친다)

검토한 판은 훅 14:02:33 판(sha256 앞 12자리 `30e1ab1437f9`, 설치본과 볼트 정본이 같음)이다. 재검토를 받은 뒤 14:00:19 판에서 `LEDGER_PREFIXES`(58줄)와 323줄이 더 바뀌었으므로 이 판을 기준으로 했다. `vault_check.diff`(14:03:14)는 이 판과 같다.

모의 시험은 지난번처럼 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev-vault-sim/` 에서 돌렸다(임시 git 저장소는 `core.quotePath` 기본값, 임시 볼트, `VAULT_STATE` 도 이 폴더). 실제 상태 폴더와 저장소는 읽기만 했다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I1 한글 경로를 버림 | ADDRESSED | 117 · 380줄에 `-c core.quotePath=false` 가 들어갔다. 기본 설정 저장소에서 13절만 고친 모의 A 가 이제 결정 목록 요구로 막히고, 13절과 볼트 결정 목록을 함께 고친 모의 D 는 통과한다. 실제 저장소에서 최근 3시간 동안 바뀐 파일 10개 가운데 한글 경로 3개가 잡힌다. 컨트롤러가 보고한 숫자와 같다 |
| I2 새 보고 사본 요구 | ADDRESSED | `RECORD_NEW_PREFIXES = ("docs/research/",)`(59줄), 332줄 문구는 '조사 파일'로 바뀌었다. `.superpowers/` 는 `DESIGN_PREFIXES`(54줄)에서 빠졌고, `LEDGER_PREFIXES`(58줄)로 `code`(323줄)에서도 빠졌다. 따라서 45분 규칙으로 이어하기까지 요구하는 일도 생기지 않는다. 모의 G(한글 sdd 새 보고만, log 낡음)는 통과하고, J(코드만, log 낡음)는 log · 이어하기를 요구하며, K(한글 intent 새 파일)는 log 한 줄을, I(새 조사 파일)는 사본을 요구한다. 운영 쪽 131~133줄과 맞는다 |
| M1 이름 부분 문자열 | ADDRESSED | `rel in srcs` 를 먼저 보고(254줄), 기본 이름은 경계 정규식으로 맞대며(255줄), `name` 도 `_nfc` 를 거친다(246줄). `ux-review-report.md` 가 `review-report.md` 를 가리던 문제는 사라졌다. 다만 제가 권한 정규식 자체에 결함이 있었다(N1) |
| M2 브리프 머리글 판별 | ADDRESSED | 249~250줄은 이름에 report · 보고가 없을 때만 `#\s[^:(\n—]*브리프` 로 판별하고, 수정 시각 검사(248줄)를 먼저 한다. 지금 저장소에서 사본 없는 보고는 0건이다. 머리글을 `lstrip` 없이 보지만, 앞에 공백 · BOM · 프런트매터가 있는 브리프는 0건이라 걸림이 없다 |
| M3 세션기록 머리글 | ADDRESSED | 219줄이 '묶음이 닫힐 때 · 요청자 결정 때 · /wrap-up 때'로 바뀌었다 |
| M4 Stop 문장 | ADDRESSED | PENDING_MODE(48줄), `vault-ingest/SKILL.md` 3 · 13줄(도구 폴더 정본과 같음), `.claude/CLAUDE.md:21` 이 'Stop 훅은 정리가 밀렸다고 막지 않고, 13절이 바뀐 턴에만 결정 목록 옮김을 요구한다'로 바뀌었다. 스킬 3줄 첫머리의 '이번 턴에 생긴'은 남았지만, 같은 문장이 곧바로 때를 바로 적으므로 사소하다 |
| M5 운영 쪽 SessionStart 행 | ADDRESSED | 113줄에 '볼트 사본 없는 저장소 보고'와 '묶음이 닫힐 때나 /wrap-up 때 … 막지 않는다'가 들어갔다. 116줄에 그대로인 요구가 적혔고, 141줄 명령 표에도 들어갔다 |
| M6 표 이름 날짜 | ADDRESSED | `--report` 가 "볼트 사본 없는 저장소 보고(최근 14일 · 2026-10-30 뒤)"로 찍는다(602줄 f-string). diff 파일도 지금 판과 같다 |

## 2. 새로 깨뜨린 것

**N1(Minor). 경계 정규식의 왼쪽 `/` 가 다른 폴더의 같은 기본 이름을 사본으로 잡는다.** 이 정규식은 제가 지난 보고 M1 에서 권한 것이다.
- 근거: 훅 `:255` 의 `(^|[\s`/])` + 이름. 볼트 원자료 `source:` 줄에는 `.superpowers/sdd/2026-10-29-학습-단계-개선/review-report.md` 가 있다. 그래서 다른 폴더에 새로 생긴 `review-report.md` 도 `/review-report.md` 에서 경계가 맞아 사본이 있는 것으로 보인다. 폴더 네 곳에 있는 `task-canon-apply-report.md` 도 같다.
- 재현: 스크래치 저장소 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev-uncopied-repo/` 의 `.superpowers/sdd/2026-10-30-새-묶음/` 에 사본 없는 보고 세 건(`review-report.md` · `task-canon-apply-report.md` · `task-new-zzz-report.md`)을 두고 실제 볼트를 읽기만 해서 `uncopied_reports()` 를 부르면, `task-new-zzz-report.md` 하나만 나온다.
- 고침: 왼쪽 경계에서 `/` 를 뺀다(`(^|[\s`])`). 경로 꼴 언급은 `rel in srcs` 가 맡고, 기본 이름은 '보고 `task-samples-report.md`' 처럼 이름만 적은 언급에서만 맞춘다. 지금 저장소에서 `rel` 없이 이름으로 맞는 9건은 `/` 를 빼도 9건 그대로다.

## 3. 범위 밖 관찰

없음.

## 4. 라운드 판정

**Approved.** Important 두 건이 닫혔고, 모의 A · D · G · I · J · K 가 모두 뜻대로 돈다. N1 은 알림만 하는 검사의 거짓 음성이므로 컨트롤러가 직접 고치면 되고, 재검토는 필요 없다.
