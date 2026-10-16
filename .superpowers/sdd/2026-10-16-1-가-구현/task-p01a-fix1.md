# fix 라운드 1 브리프: P1a 뼈대(implementer impl-p01a · Opus · high)

검토 `review-p01a.md`(code-reviewer, Changes requested, Important 2 · Minor 4)의 지적 1~6 을 모두 반영한다. 컨트롤러가 여섯 다 받아들였다(2026-10-16 11:3x). 허용 파일은 아래 표의 여섯과 보고 `task-p01a-report.md` 다. 명령은 `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && ` 로 시작한다. git 쓰기 명령 금지(파일 이름 바꾸기는 `mv`). 임시 탐침 파일 · 값은 확인 뒤 반드시 되돌린다.

| 지적 | 고칠 것 | 확인(보고에 결과를 적는다) |
|---|---|---|
| 1 Important(결정 다) | `src/app/layout.tsx`: 3줄 `import { Geist }` · 4줄 `import { cn }`(쓰는 곳이 없어짐) · 6줄 `const geist …` 를 지우고 `<html …>` 줄을 `<html lang="ko">` 로 한다. `src/app/globals.css`: 9줄 `--font-sans: var(--font-sans);` 한 줄만 지운다(8줄 `--font-heading: var(--font-sans);` 은 둔다). `src/lib/utils.ts` 는 둔다 | `pnpm build` 뒤 `.next/static/chunks/*.css` 의 `:root` 에서 `--font-sans` 가 기본 묶음(`-apple-system, …`)이고 `--font-sans:var(--font-sans)` 자기 참조가 없다. `.next/static` 에 `Geist` 문자열이 없다 |
| 2 Important(결정 라) | `.gitignore` 끝에 `.claude/settings.local.json` 한 줄 | `git check-ignore -v .claude/settings.local.json` 이 그 줄을 가리킨다 |
| 3 Minor(결정 가) | `next.config.ts` 의 `turbopack` 객체 안, `rules` 위에 `root: import.meta.dirname,` 한 줄(`__dirname` 은 쓰지 않는다. `outputFileTracingRoot` 는 따로 적지 않는다) | `pnpm build` 출력에 '작업 폴더 뿌리' · `package-lock.json` 경고가 없다. 타입 검사 통과 |
| 4 Minor(결정 나) | `mv vitest.config.ts vitest.config.mts`(내용 그대로. `.ts` 를 남기지 않는다) | `pnpm test` 에 CommonJS 경고가 없고 unit 2 통과, `pnpm test:int` 0개 통과 |
| 5 Minor | `tests/e2e/smoke.spec.ts`: `page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))` 결과가 `TABLET_10_9_VIEWPORT` 와 같은지 단언 한 줄을 더한다(기존 `viewportSize()` 단언은 둔다) | `pnpm e2e` 1 통과. 상수를 잠깐 다른 값으로 바꿔 실패를 본 뒤 되돌린다 |
| 6 Minor | `tests/unit/env-example.test.ts`: 주석 줄 가운데 `^#\s*[A-Z][A-Z0-9_]*=\S` 꼴(이름=값을 주석으로 막은 줄)을 위반으로 센다. 시험 이름은 그대로 | 견본에 `# DATABASE_URL=abc` 줄을 잠깐 넣어 실패를 본 뒤 되돌린다(견본은 원래대로, 값 꼴 문자열을 저장소에 남기지 않는다). `pnpm test` 2 통과 |

끝나면 `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm e2e` · 비밀값 `git grep -nE --untracked "sk-ant-[A-Za-z0-9_-]{16,}|postgres(ql)?://[^ ]+:[^ ]+@"` 을 다시 돌린다. `task-p01a-report.md` 끝에 `## fix 라운드 1` 절을 더한다: 지적별 ADDRESSED 와 바뀐 파일 · 확인 결과, 다시 돌린 명령 표, 바뀐 파일 목록. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽.
