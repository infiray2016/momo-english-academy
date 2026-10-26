# 구현 브리프: P10 fix 6 — 크기 훑기 규칙 보정(카드 단추 안 보조 줄은 안내 글)(implementer impl-p10 이어 보기 · Opus · high, 2026-10-18 06:0x)

CI 9차(ci/p10-c5 5cfe685, run 39068609052) e2e 1 실패: `tests/e2e/font-size.spec.ts` AC-N9 크기 훑기가 26건을 냈고 전부 '20px < 22px' 다 — 홈 영역 카드 안 보조 줄(단원 줄 · '아는 단어 0/4' · '최근 성적' · '이번 주 0일' · '오늘 아직이에요' · '단계를 몰라도 돼요…' · '말하기에서 단계를 찾으면…') 7 × 2 방향, 수업 목록 · 지난 수업의 수업 카드 제목('reading 1단계 수업 1' 등) 3 × 2 화면 × 2 방향. 다른 48 시험(AC-1b 포함)은 통과. 로그 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/ci-p10-c5-9-e2e-failed.log`. 워크트리 p10, 커밋 없음, e2e 는 CI(컨트롤러 push).

## 결정(13절 C82 · 4절 문장 더함, 컨트롤러 06:0x)
4절 '버튼 글자 22px' 는 누르는 것의 **이름표**(단추 글 · 카드의 영역 이름 · 단계 · 수업 번호 · 띠 · '시작!' · '이야기 고르기')에 걸고, 카드 꼴 단추 안의 **보조 줄**(단원 · 아는 단어 · 최근 성적 · 이번 주 · 오늘 · 안내 한 줄 · 수업 제목)은 안내 글(20px 이상)로 본다. 화면 검토(차례 3 · 4 Approved)가 본 꼴은 그대로 두고 **시험 규칙을 맞춘다 — 글자를 키우지 않는다.**

## 할 것
1. `tests/e2e/child-size.ts` — 누르는 것(button · a · [role=button] · [data-touch]) 안의 글이라도 `[data-size-guide]` 표시가 그 요소나 누르는 것 **안쪽** 조상에 있으면 안내 기준(`MIN_GUIDE_PX` 20)으로 잰다(누르는 것 바깥의 표시는 효과 없음). 상자 56 × 56 · '%' · 가로 넘침 · `data-size-exempt` · `data-parent-info` 규칙은 그대로. 머리 주석과 상수(`SIZE_GUIDE_ATTR` 같은 꼴) 갱신.
2. `src/app/(child)/home-cards.tsx` — 보조 줄을 감싸는 요소(단원 줄 · 아는 단어 · 최근 성적 · 이번 주 · 오늘 · findLevelHint · needsSpeaking)에 `data-size-guide`. 영역 이름(text-3xl) · 단계(text-5xl · 4xl) · '시작!' · '이야기 고르기' 는 표시 없음.
3. `src/app/(child)/[area]/lessons/lesson-board.tsx` — `{item.title}` 두 자리(180 · 224줄 근처 `<span>`)에 `data-size-guide`. 수업 번호 · 꼬리표 · '여기부터 해요' 띠 · 묶음 제목(text-2xl)은 표시 없음.
4. 확인: biome ci · tsc · 단위(수 변화 없음) 로컬. 26건에 없던 화면(접근 코드 · 배치 · 세션 틀 · 결과 · 회화)은 손대지 않는다.
5. 보고 `task-p10-report.md` '차례 7 fix 6' 절(바뀐 파일 셋 · 표시한 자리 목록 · 로컬 관문) → SendMessage team-lead 한 줄. 그 뒤 컨트롤러가 CI 10차 push.

## 지킬 것
표시 이름은 영어 ASCII(`data-size-guide`). 설계 숫자를 새로 박지 않는다(20 · 22 는 이미 이름 붙은 상수). 아이 이름 · 비밀값 없음. 글 크기 · 화면 꼴 · 문구는 바꾸지 않는다.
