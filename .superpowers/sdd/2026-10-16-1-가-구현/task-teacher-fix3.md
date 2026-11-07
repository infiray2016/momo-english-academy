# 구현 브리프: 손질 3 — 코드 검토 4(d8) Minor 여섯(+ 화면 검토 지적은 뒤에 메시지로)(implementer · Opus · high, 2026-10-23 15:1x)

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(바탕 e9909c2). 커밋 · push 하지 않는다(컨트롤러가 한다). 검토 원문: `review-teacher-4-code.md`(같은 폴더) 4절 M-1~M-6 — 줄 번호는 123d7bc 기준이다. 3D 프리뷰 직전 손질이라 크기를 넘기지 않는다.

## 고칠 것
1. **M-1 막힘 · 쉼에서 받지 않기 · 안 보이는 캔버스에 그리지 않기**
   - (a) 그림 층 차례는 회화 틀이 선생님 창을 **처음 보일 때** 시작한다: 공유 값에 `want()`(이름은 알맞게)를 두고 talk-frame 이 창이 처음 보일 때 부른다. 보관 조각은 want 뒤에만 설정 → WebGL → import() 를 시작한다. plan 글 '시작! 화면부터'(plan.md:296)와 맞춘다.
   - 막힘 판정이 렌더 뒤 효과에서 정해져 첫 그림에 창 · '시작!'이 잠깐 보일 수 있다(검토 3 범위 밖 관찰, `talk-frame.tsx:331-334`). 그 첫 그림에서 want 가 불리지 않게, 막힘 · 쉼 판정이 끝난 뒤 창이 보일 때만 부른다.
   - 관찰 쪽 '3D 보기'는 창이 늘 보이므로 고른 뒤 바로 want 한다(지금 동작 그대로).
   - (b) 첫 장 뒤에는 캔버스 크기가 0 인 동안 그리기를 건너뛴다(getBoundingClientRect — avatar-3d 의 기존 크기 읽기와 같은 값). '시작!' 화면의 숨긴 칸 · 대화 중 막힘 · 쉼에서 GPU 가 쉬게.
   - 시험: 단위 'want 전에는 importAvatar · hasWebgl 을 부르지 않고 사건도 없다', 'want 뒤 차례는 지금과 같다'. 이름은 AC-19f 또는 AC-19i 로 시작.
2. **M-2 관찰 쪽 초당 장 수**: avatar-3d 가 장 수를 적을 때 그 시각도 남기고(예 `data-teacher-frames-at`, performance.now()), 관찰 쪽은 두 값의 차이로 나눈다.
3. **M-3 1년 immutable 을 해시 이름에만**: `next.config.ts` headers source 를 해시 꼴(키 · 8자 · vrm|webp)로 좁힌다. 키 꼴 · 글자 수는 `src/core/seed/structure.ts` TEACHER_KEY · TEACHER_ASSET_HASH_CHARS 와 같게(가져오거나, 단위 시험이 같은지 단언). path-to-regexp 는 매개변수 안 괄호 묶음(갈래)을 거부할 수 있으니 확장자마다 줄을 나누는 등 실제로 받아들여지는지 `pnpm build` 로 확인한다. next-config 단위에 '해시 없는 이름(예 teachers/readme.txt · teachers/mina.webp)에는 붙지 않음'을 더한다(가능하면 Next 의 경로 맞춤과 같은 방식으로 맞춰 본다).
4. **M-4 시험**: 단위 'initialFallback 이면 importAvatar · hasWebgl 을 부르지 않고 사건 없이 그 까닭 초상을 한 번 낸다'. 보관 조각 pose ref 는 단위 환경에서 효과가 돌지 않으니 보고에 '로컬 눈 점검 · d9 몫'으로 적는다.
5. **M-5 이름 없는 숫자**: 파일마다 `MS_PER_SECOND`(둘레 관례), avatar-3d 에 `LIGHTS = { … } as const` · `NO_BLINK_YET`, MOUTH 에 `as const`. 값은 바꾸지 않는다.
6. **M-6 숨김 정규식**: `tests/unit/teacher-window.test.ts` 의 클래스 숨김 정규식을 공백 경계로(예 `/class="(?:[^"]*\s)?hidden(?:\s[^"]*)?"/`).

## 하지 않는 것
- 3D 모습 · 빛 값 · 창 크기 · 자리는 바꾸지 않는다(화면 검토 몫 — 지적이 오면 컨트롤러가 메시지로 넘긴다).
- 정본 · plan · spec 은 고치지 않는다. 필요한 변경은 보고의 '요청하는 변경'에.

## 관문(Node 24 PATH — `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`)
`pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm build` · `pnpm seed:validate` · `pnpm check:bundle` · `pnpm check:ids` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`. e2e 는 이 Mac 에서 못 돌린다(CI 몫) — 바꾼 e2e 가 있으면 형 검사만.

## 보고
`task-teacher-fix3-report.md`(같은 폴더): 지적마다 고친 자리(파일:줄) · 시험 이름 · 관문 결과 · 정한 것 · 남은 우려. 답장은 한 줄 요약 + 보고 경로. 그 뒤 화면 검토 지적이 메시지로 오면 같은 방식으로 이어 한다.
