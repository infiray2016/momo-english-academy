# fix 1 브리프: P6b 작업 2 스크립트 · 규격(implementer impl-p06b, 2026-10-17 01:0x)

검토 `review-p06b.md`(rev-p06b, Changes requested — C 0 · I 1 · M 4)의 지적을 고친다. 같은 워크트리(`.claude/worktrees/p06b`, feature/1a-p06b-vocab-images)에서, 시험을 먼저 더해 실패를 본 뒤 고친다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 검토가 받은 '더한 것' 1~6 은 그대로. 네트워크는 쓰지 않는다.

| 번호 | 지적 | 고치는 법(검토 보고 그대로) | 시험 |
|---|---|---|---|
| I-1 | 카탈로그 행이 0 인데 그림 폴더가 없으면 check 가 2 — P6a 가 빈 images.json 을 넣고 git 은 빈 폴더를 싣지 않아 첫 SVG 전 모든 PR 의 CI seed-validate 가 깨진다 | 행이 0 이면 폴더가 없어도 0 으로 끝낸다(출력 `행 0 · 파일 0 · 위반 0`). 행이 있는데 폴더가 없으면 지금처럼 2 | "그림 카탈로그: 행이 없으면 그림 폴더가 없어도 통과한다" |
| M-1 | checkSvg 가 `javascript:` · `data:` 링크와 href 를 바꾸는 애니메이션(`<animate attributeName="href">` · `<set>`)을 놓친다 | href · xlink:href 값은 `#` 으로 시작하는 안쪽 참조만 받고 그 밖은 모두 문제로 센다. href 를 바꾸는 animate · set 도 문제 | 기존 "그림 카탈로그: script · foreignObject · 바깥 주소 · 이벤트 속성이 든 SVG 를 잡는다"에 사례 셋 추가 |
| M-2 | 하위 폴더 갈래(이름 뒤 `/`)에 시험이 없다 | 시험만 더한다 | 기존 "파일이 없거나 상한을 넘거나 카탈로그 밖 파일이 있으면 잡는다"에 `old/` 폴더 사례 |
| M-3 | `--root` 를 잘못 주면 오류 글이 실제로 본 경로를 보이지 않는다 | 오류 글에 뿌리를 붙인 실제 경로를 낸다(`<root>/seed/images.json 이 없다` 꼴) | 기존 시험의 글 단언 고침 |
| M-4 | macOS `.DS_Store` 가 로컬 check 를 1 로 만든다 | 이름이 `.DS_Store` 인 항목은 건너뛴다(그 밖 숨은 파일은 그대로 카탈로그 밖) | 사례 하나 |

끝나면 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle` 전부 0 · 비밀값 grep 0 을 확인하고, 보고 `task-p06b-fix1-report.md`(워크트리 장부, Write 도구)에 지적마다 ADDRESSED · NOT ADDRESSED(까닭) · 파일:줄 · 시험 수(164 → 새 수)를 적는다. 마지막 메시지는 상태 + 요약 한 줄. 커밋 · 네트워크 · 비밀값 없음.
