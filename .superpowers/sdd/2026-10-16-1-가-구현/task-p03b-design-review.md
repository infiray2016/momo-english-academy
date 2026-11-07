# 화면 검토 브리프: 접근 코드 화면(design-reviewer · Opus · xhigh, 읽기 전용)

P3b 가 만든 접근 코드 화면(쿠키 없는 기기가 처음 보는 화면)을 사진과 코드로 정본 4절 문구 · 아이 화면 원칙과 견준다. 목업은 없다(plan-p03b 정할 것 하). 포스트잇 보드 꾸밈 · 글꼴은 P5 · P10 몫이라 이번 기준이 아니다. 코드 · 보안은 code-reviewer 가 따로 본다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p03b-design.md`(메인 저장소).

## 대상
- 화면 사진 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a4f928c00fc43a1e8/.superpowers/sdd/2026-10-16-1-가-구현/p03b-access.png`(e2e, WebKit 10.9형 820 × 1180 세로).
- 화면 코드(같은 워크트리): `src/app/(setup)/access/unauthorized.tsx` · `access-code-form.tsx` · `page.tsx`. 구현 보고 `task-p03b-report.md` 의 화면 부분.
- 필요하면 워크트리에서 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH E2E_ACCESS_SCREENSHOT=1 pnpm e2e` 로 사진을 다시 찍어 볼 수 있다(파일을 덮어쓰지 않게 다른 이름으로 저장하거나 보고에 적는다).

## 기준(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. `specs/03-화면.md` 4절 접근 코드 행 — 제목 '부모님이 코드를 넣어 주세요', 이름표 '가족 접근 코드', 버튼 '들어가기', 틀림 '코드가 맞지 않아요. 다시 넣어 주세요', 잠김 '잠시 뒤에 다시 넣어 주세요'(남은 분 없음), 그 밖 '지금은 들어갈 수 없어요. 잠시 뒤에 다시 해 주세요', 끊김 '인터넷이 끊겼어요. 연결되면 다시 해요'(8절). 글자 그대로인지(`specs/10-결정-기록.md` C57).
2. 4절의 아이 화면 원칙과 `.claude/CLAUDE.md` Conventions: 한 화면에 행동 하나, 큰 글자, 해요체, 퍼센트 없음. plan-p03b 값 7 의 크기(안내 text-xl 이상 = 20px, 버튼 글자 text-2xl = 24px, 입력칸 · 버튼 min-h-14 = 56px).
3. 접근성: 입력칸에 보이는 이름표(label 연결), 안내는 `role="status"` 한 줄, 초점 차례 · 키보드로 제출, 색만으로 뜻을 나누지 않음, 대비.
4. plan-p03b 값 8(입력칸 속성 · 응답별 문구 · 버튼 잠금) · 값 7.

## 판정할 것
1. 문구가 글자 그대로인지(제목 · 이름표 · 버튼 · 안내 넷 · 끊김).
2. 한 화면 한 행동인지(입력 하나 · 버튼 하나, 다른 길 없음), 글자 · 높이가 기준 이상인지(코드의 Tailwind 단위로 확인), 10.9형 세로에서 잘림 · 겹침 · 가로 스크롤이 없는지.
3. 접근성 항목(1~3 의 3).
4. 아이가 처음 보는 화면으로서 어색한 것(어른용 말투 · 영어 · 기술 용어 · 숫자 노출)이 있는지.

## 보고 꼴(`review-p03b-design.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도 · 파일:줄 또는 사진의 위치 · 근거(4절 문장 · 원칙 · plan 줄) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: 문구 일곱마다 '같음 · 다름(무엇)'. 표 하나: 원칙(한 행동 · 크기 · 해요체 · 접근성 넷)마다 '맞음 · 어긋남'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 6줄 안쪽.
