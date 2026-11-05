# 브리프: 회화 plan 묶음 1 · 2 — 설정 키 · p13d 정본 사본 · seed:load --partial(구현자 · Opus · high, 가벼운 루프, 2026-10-30 05:4x — plan C192 승인 뒤)

plan `intent/2026-10-29-회화-수업을-대화로/plan.md`(approved C192) 묶음 1 · 2 행(묶음 표 18 · 19줄, 파일 표 '1 · 2 · 3 · 설정 · 적재 · 새 꼴' 절의 묶음 1 · 2 행, '이름 · 설정값 · 문구' 절의 설정 표 24행, 정한 것 14(없앤 키 두 행은 묶음 12 까지 사본 전용 줄), 작업 순서 1 · 3, 위험 3)을 구현한다. 정본 12절 82줄 꼴은 컨트롤러가 이미 고쳤다(talk.valid_turns_ratio 바꾸는 곳 '고급').

## 할 것
| 묶음 | 파일 | 무엇을 |
|---|---|---|
| 1 | `seed/settings.json` · `tests/fixtures/settings.ts` | plan 설정 표의 24행(12절 새 키 15 를 구간으로 펼친 행, 기본값 · 범위 · 바꾸는 곳)을 넣고, talk.dontknow_max 의 바꾸는 곳을 plan 대로(결정 기록 먼저) 바꾼다. 더하기만 — 다른 행은 그대로 |
| 1 | `.claude/worktrees/p13d/specs/*.md`(열세 장 + README) | 본 저장소 정본(C189 · C190 · C191 · 12절 82줄 꼴 고침 반영)을 장마다 사본에 복사한다. 복사 전 사본을 스크래치패드에 둔다. 09 에는 없앤 키 두 행(talk.participation_ratio · plan 정한 것 14 의 다른 하나)을 '사본 전용 줄'로 되돌려 둔다(코드가 아직 읽으므로 묶음 12 까지). 사본 전용 줄에는 그 표시를 적는다 |
| 1 | 관문 | `pnpm check:ids --fail-on …`(CI 와 같은 인자 — ci.yml 확인) 종료 0: spec-setting-missing 24 · seed-setting-unknown 2 · code-setting-unknown 7 · setting-change-via 1 이 모두 0. `pnpm spec:trace --fail-on unknown-ac` 0, 단위, `pnpm seed:validate` 0 |
| 2 | `scripts/seed-load.ts` · `src/server/seed/load.ts` · `.github/workflows/dev-load.yml` · `tests/integration/seed-load.test.ts` · `tests/unit/seed-validate-cli.test.ts` | plan 묶음 2 행 그대로: `--partial`(--reference-only 와 함께 못 씀, 완전성 빈 칸은 보고만), dev-load 입력 partial(기본 끔). 통합 시험은 정적 |

## 지키는 것
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(코드 · 사본) — 정본은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/specs/` 에서 읽기만 한다(정본 · 13절 · 볼트 · CLAUDE.md 는 고치지 않음). 세션 cd 금지, `( cd 워크트리 && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸. 커밋 · push 금지. 같은 워크트리에서 시드 생성자가 `tests/.tmp/l3-samples/xhigh` 를, 다른 손이 없음을 확인하고 settings.json 은 더하기만.
- 숫자는 plan 설정 표 그대로(기본값은 잠정 표시). 개발 DB 적재(`seed:load --reference-only`)는 컨트롤러가 한다 — 돌리지 않는다.

## 관문 · 보고
위 관문 전부. 보고 `task-talk-1-report.md`(같은 폴더): 넣은 행 24 목록 · 사본 전용 줄 둘 · 복사한 장 · check:ids 전후 수치 · 묶음 2 의 바뀐 파일(줄) · 시험 이름 · 우려. 답은 요지 다섯 줄 안으로.
