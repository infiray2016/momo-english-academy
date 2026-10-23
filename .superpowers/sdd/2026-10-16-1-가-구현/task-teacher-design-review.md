# 화면 검토 브리프: 선생님 화면 묶음(d4 · d6 · d7 · d8) — 프리뷰 직전 한 번(design-reviewer · Fable · max, 2026-10-23 15:0x)

C142 검토 묶기: 화면 검토는 3D 프리뷰 직전에 한 번이다. 이번에 보는 것: '선생님을 골라요'(d6) · 회화 세션 선생님 창(초상 · 상태 표시 · 이름표 · 칭찬, d7) · 3D 선생님(d8) · 화면 글의 선생님 이름(d4). 코드 검토는 따로 한다(검토 1~4). 너는 사진과 정본으로 판정만 하고 고치지 않는다.

## 볼 사진
1. CI 22차(커밋 1174e13 — d6 · d7 까지, 3D 없음 · WebGL 끔) 사진 폴더 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/638fc0bf-4fe7-4c7c-a6f2-28de7b880efe/scratchpad/ci22-art/` — 각 `-landscape` · `-portrait`(iPad 10.9 가로 1180 × 820 · 세로 820 × 1180, 2배 화소).
   - 선생님: `teacher-choice` · `teacher-choice-empty` · `teacher-start` · `teacher-window-greeting` · `teacher-window-talk` · `teacher-window-thinking` · `teacher-window-praise` · `teacher-probe`.
   - 회화 수업 전체(창이 들어간 판): `p13-talk-*` 열여덟(intro · greeting · today-words · say-it · say-it-reveal · dialogue · answers · hint · dontknow · picture · waiting · confirm · stop-confirm · needs-mic · resume · wrapup · closing-1 · closing-3).
   - 견줄 다른 영역 화면이 필요하면 같은 폴더의 `p11-*` · `home-*`.
2. 로컬 3D 눈 점검(컨트롤러, 커밋 123d7bc — d8, `next dev` · 관찰 쪽 '3D 보기'): 
   - `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/638fc0bf-4fe7-4c7c-a6f2-28de7b880efe/scratchpad/eyecheck/shots-gpu/`(크롬 · Apple GPU) · `.../eyecheck/shots-webkit/`(사파리 엔진 WebKit) — `미나-{쉬기,말하기,듣기,칭찬,생각}.png` · `리오-…` · `미나-section.png` · `리오-section.png`. 창은 회화 세션 가로 창과 같은 부품 · 같은 크기(260 × 300).
   - 잰 값: 크롬 미나 불러오기 299ms · 첫 장 1,332ms · 초당 60 / 리오 485 · 1,310 · 60. WebKit 미나 229 · 1,318 · 41 / 리오 204 · 703 · 51(머리 없는 실행이라 초당 장 수는 참고만). 대신 표시 0.
   - 회화 수업 안의 3D(세션 화면에서 초상 → 3D 바뀜 · 마무리 닫힘)는 개발용 DB 에 요청자 아이의 기록이 있어 로컬에서 수업을 열지 않았다 — 프리뷰에서 본다. 그래서 세션 판 안의 3D 는 '같은 창 크기에 위 3D 사진이 들어간다'로 읽는다.

## 근거
- 정본 4절 `specs/03-화면.md`(머리 문단 [이름] · 조사 · '선생님을 골라요' · 회화 세션 '선생님 창' · '선생님 차례' · 아래 줄 · 처음 회화 · 회화 마무리) — 본 저장소 `/Users/hikaru/workspace/momo-english-academy/specs/03-화면.md`.
- plan `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-17-회화-선생님-캐릭터/plan.md` — 창 크기 · 자리(95줄 · 285줄, 목업 없음 · '화면 검토가 사진으로 고친다'), 위험 7(가로 1180 × 820 높이), 정본 밖 문구 표(C141 (3)), d8 '정한 것' 5(3D 일 때 초상 상태 표시 숨김).
- 옛 회화 목업(토리 시절, 자리 · 분위기 참고만) `/Users/hikaru/workspace/momo-english-academy/docs/media/mockups/B_Talk1.dc.html` · `B_Talk5.dc.html` · `B_TalkEnd.dc.html`.
- `.claude/CLAUDE.md` 아이 화면 원칙(한국어 해요체 · 한 화면에 행동 하나 · 큰 글자 · 포스트잇 보드: 코르크 바탕 · 종이 띠 · 회화 연두 · 글꼴 Jua · Gowun Dodum · Fredoka), 13절 C114(같은 종류 종이 크기 일관 · 같은 줄 아래 끝), 1~3단계 회화는 대화에서 영어 문장을 미리 보이지 않음.
- 보조 스킬 `ui-ux-pro-max` · `design-taste-frontend` 의 점검 항목을 써도 된다. 정본 · 포스트잇 보드가 우선이다.

## 특히 볼 곳
1. 창 크기 · 자리: 가로(왼쪽 칸 창 + 아래 '오늘 이야기 목록', 오른쪽 대화 판)와 세로(위 한 줄에 창 · 목록, 아래 대화 판)에서 대화 판 · 말풍선 · 그림 턴이 줄지 않는지, 세로에서 대화 판이 너무 아래로 밀리지 않는지(코드 검토 3 이 화면 검토 몫으로 넘김), 가로 1180 × 820 에 다 들어오는지.
2. 말하기 물결: 2배로 퍼져 세로에서 위 띠를 덮어 보이는지(코드 검토 3 · d7 보고 우려).
3. 3D 선생님: 창 안 구도(초상은 얼굴 가까이, 3D 는 가슴 위 — 같은 사람으로 보이는지 · 머리 · 이름표와 겹침), 다섯 상태가 아이 눈에 달라 보이는지, 3D 일 때 초상 상태 표시(물결 · 점 셋 · 별)를 숨겨도 '지금 말할 차례'가 드러나는지, 배경 · 빛이 포스트잇 보드와 어울리는지.
4. '선생님을 골라요': 한 화면 한 행동(고르기 → '[이름] 선생님과 할래요'), 카드 크기 일관(C114), '골랐어요' 표, 인사 듣기 단추, 빈 명단 화면.
5. 화면 글: 해요체 · 선생님 이름 · 조사, 정본 밖 문구 표 밖 글이 아이 화면에 있는지, 1~3단계 대화에서 영어 문장이 미리 보이지 않는지(p13-talk 사진).

## 보고
- **파일로 쓴다**: `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-teacher-design-1.md`. 맨 위에 판정 한 줄(Approved · Changes requested).
- 지적마다 심각도(Critical · Important · Minor)와 근거(사진 파일 이름 · 정본 절 · 줄 · plan 줄). 근거 없는 지적은 넣지 않는다. 고칠 길은 크기 · 자리 · 글 수준으로 한 줄(코드는 쓰지 않는다).
- 답장은 판정 한 줄 + 지적 제목 목록 + 파일 경로만. `ledger-closed.md` 는 읽지 않는다.
