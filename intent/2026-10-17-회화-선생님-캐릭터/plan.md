# Plan: 회화 선생님 캐릭터 — 여럿 가운데 설정으로 고르고, 이름은 정해져 있고, 화상영어처럼 움직인다 · 1-가 P13d 선생님 화면(자산 · 고르기 · 이름 자리 · AI 고정부 · 선생님 창 3D)

spec: `intent/2026-10-17-회화-선생님-캐릭터/spec.md`(approved — 13절 C122, 정본 반영 C130: 3.3 회화 세션 여는 차례 · 처음 안내, 4절 머리 문단([이름] · 조사) · '선생님을 골라요' · 회화 세션 '선생님 창' · '선생님 차례' · 아래 줄 · 처음 회화 · 회화 마무리 · 홈 'AI 쉬는 중', 5절 profiles.teacher_key · attempts 처음 스냅숏 · 명단 자료 · 순수 함수 목록, 6.1 · 6.2 회화 턴 고정부 선생님 블록, 6.4 명단 자료 · '선생님 이름', 7절 읽어 주기 행, 8절 'AI 쉬는 중', 9절 단위 · 화면 흐름 · CI 검사 · 음성 점검 · WebGL 없는 CI 문단, 10절 '선생님 그림' 행, 11절 1-가, 12절 talk.teacher_* 다섯, 14절 FR-19 · NFR-10 · NFR-11, 15절 AC-19a~AC-19k · AC-N11 · AC-N12) · intent: `intent/2026-10-17-회화-선생님-캐릭터/intent.md` · 13절: C115 · C117 · C118 · C122 · C123 · C125 · C127 · C130 · C131 · C132 · C134 · C135 · C136 · C139 · 작성일: 2026-10-23 · 상태: approved(2026-10-23 12:5x, C141)
승인: 컨트롤러 2026-10-23 12:5x(13절 C141 — C139 (1) '1-가 하위 plan 처럼 컨트롤러가 승인하고 요청자는 프리뷰에서 봄', 정할 것 2~16 권함대로) · 브랜치 · 워크트리: `feature/1a-p13d-teacher`(워크트리 `.claude/worktrees/p13d`, 바탕 7cbe9f8 '합침 ④-2' — 회화 가지 87ea684 + 진짜 수업 자료 가지 p08 99864ba) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`(계획 브리프 `task-teacher-plan.md`, 보고 `task-teacher-plan-report.md`)

선생님 변경 단위의 화면 · 서버 · 자산 몫 전부다. 시드 쪽 몫(명단 `seed/teachers.json` · 명단 검사 · '선생님 이름' 검사 · 설정 키 다섯)은 p08 에서 끝났다(C130 · C132 · C134 · C135). 요청자가 진짜 회화 1단계 자료와 실제 AI 선생님으로 하는 회화 프리뷰를 가장 먼저 원하므로(C139), 차례는 프리뷰에 맞췄다 — '프리뷰까지의 최단 차례'가 이 plan 의 뼈대다.
시험 이름과 증명 표는 정본 번호(AC-19a~AC-19k · AC-N11 · AC-N12)를 쓴다. 델타 번호 AC-1~AC-11 · AC-N1 · AC-N2 는 15절에 없어 spec-trace(unknown-ac)에 걸린다(대응: AC-1 → 19a … AC-11 → 19k, AC-N1 → N11, AC-N2 → N12).
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)', 스크래치패드에서 잰 값은 '(어림)'이다. 코드 사실은 2026-10-23 워크트리 p13d(7cbe9f8)에서, 자산 사실은 본 저장소 작업 트리의 시제품 파일에서 확인했다(끝 '확인한 사실과 출처').

## 나눈 까닭과 배정

| 묶음 | 범위 | 검토 | 이 묶음이 증명하는 AC | 손 파일(시험 빼고) | 먼저 끝나야 할 것 |
|---|---|---|---|---|---|
| d1 | 줄인 모델 · 초상 자산(줄이기 스크립트), 명단 칸 채움 · 필수, VRM 머리글 읽기, 자산 검사(CI), 빼는 낱말 칸(장부 N-3), 이름표 대비 짝(장부 M-1), 출처 문서 | 코드 | 19a(명단 몫) · 19e(칸 옮긴 뒤 그대로) · 19k | 10 + 만든 파일 넷 | — |
| d2 | profiles.teacher_key 마이그레이션, 명단 서버 · 보일 선생님, 고르기 액션, 회화 화면 자료의 선생님 · 처음 스냅숏 키, 시험 집 선생님 기본값 | 코드 | 19a(보일 선생님 셋) · 19b(액션 · 스냅숏) | 10 | d1 차례 2(명단 칸 필수) |
| d3 | 회화 턴 · 끝맺음 턴 고정부 선생님 블록 · 사람의 삶 줄 · 스키마 설명 · 앱 첫 말 이름표 · 실시간 낱말 범위의 선생님 이름, 회화 쪽 서버 Minor(재검토 rev-p13b N-1 · N-4 · 단위 이름) | 코드 | 19d(수동 표본 밖) | 4 | d2 |
| d4 | 조사 고르기 · 문구 표 · 이름 공유 — 모든 아이 화면의 '토리' 자리, 화면 글자 훑기 | 코드 · 화면 | 19c(문구 · 훑기) | 12(글자 바꿈) | d2 |
| d5 | 선생님 상태 · 칭찬 · 움직임 · 차례 번호 · 선생님 목소리 고르기(순수), 음성 층 높이 · 목소리 순서 · 시작 알림, 선생님 음성 감싸기, 가짜 음성 기록 | 코드 | 19g · 19h · 19j 의 함수 몫 | 6 | — |
| d6 | '선생님을 골라요' 화면 · 초상 조각, 회화 틀 고르기 차례, 관찰 쪽(지우기 · 목소리 목록) | 코드 · 화면 | 19b(화면 · 관찰 쪽) | 6 | d4 · d5 |
| d7 | 선생님 창(초상 · 상태 표시 · 이름표), 창 칸 레이아웃, 상태 연결, 칭찬 때, 회화 쪽 선생님 음성, e2e WebGL 끔, 디자인 리뷰 2 N-3 | 코드 · 화면 | 19c(창 · 말풍선 접근 이름) · 19g · 19h(초상 몫) · 19j(화면) | 6 | d5 · d6 |
| d8 | 3D 그림 층(시제품 TeacherAvatar 옮김) · 따로 불러오기 · 그림 층 보관 조각 · 대신 표시 다섯, 정적 자산 제공(proxy · 캐시), three 판 고정, 의존 규칙, 관찰 쪽 3D 재기, 라이브러리 고지 | 코드 · 화면 | 19i(WebGL 없음 · 설정 — e2e 기본, 늦은 결과 — 단위) · N12(의존 규칙 몫) | 12 | d1 · d7 |
| d9(프리뷰 길과 나란히) | 3D e2e 일(Chromium · 소프트웨어 WebGL 깃발) · 3D 시험 · 번들 검사 | 코드 | 19f · 19h · 19i(3D 몫) · N12 | 5 | d8 |
| d10(프리뷰 뒤) | iPad 실측 · 값 13절 · 리오 목소리 순서 · 2048 표본 견줌 · 프리뷰 지적 손질 · 시드 보기 이름 | 화면 · 사람 | N11 | 손질만 | 프리뷰 |

까닭: (1) C139 — 프리뷰가 먼저다. 프리뷰를 막는 길(d2 → d4 → d6 → d7 → d8)을 짧게 두고, 그 길과 파일이 겹치지 않는 묶음(d1 · d3 · d5)은 나란히 돌린다(동시에 2~3개, CLAUDE.md). (2) 화면이 없는 몫(자산 · 서버 · 음성 층)과 화면 몫을 나눠 코드 검토와 화면 검토가 섞이지 않게 한다. (3) 3D 는 맨 끝이다. d7 까지 끝나면 선생님이 초상으로 수업을 끝까지 하므로, 3D 가 실패해도 수업은 그대로다(FR-9 '수업은 3D 를 기다리지 않음'). (4) 3D 를 CI 에서 시험하는 길(d9)은 러너의 소프트웨어 WebGL 이 되는지 모른다(spec 우려 11). 프리뷰를 막지 않게 프리뷰 길과 나란히 둔다 — AC 는 그대로이고 증명 차례만 뒤다. (5) 묶음마다 손 파일 열 안팎(plan-p13a 회1 꼴). d4 는 열둘이지만 글자 바꿈이다.

같은 워크트리에서 나란히 돌릴 때 파일이 겹치지 않는다: d1(시드 · 스크립트 · `src/core/seed/` · `CREDITS.md` · `public/teachers/`) · d5(`src/core/teacher/{state,voice}.ts` · `src/lib/speech/`) · d2(`src/db` · `drizzle` · `src/server` · `src/core/teacher/roster.ts` · `src/core/conversation/attempt.ts` · `next.config.ts`) · d3(`src/core/ai/calls/talk.ts` · `src/server/conversation/{state,turn}.ts` · `src/server/ai/talk.ts`) · d4(`src/core/teacher/name.ts` · `src/components` · `src/app`). d2 와 d3 은 `state.ts` 를 함께 고쳐 차례로 한다. `talk-frame.tsx` 는 d4 → d6 → d7 → d8 이 차례로 고친다(나란히 두지 않는다).

## 프리뷰까지의 최단 차례(C139)

| 차례 | 누가 | 할 일 | 끝 판정 |
|---|---|---|---|
| 1 | [컨트롤러] | plan 승인 · 13절 한 줄(정할 것 1) · 브리프 d1 · d2 · d5 | 13절 줄 · 브리프 셋 |
| 2 | 구현 | d1 ∥ d5, d1 차례 2(명단 칸 필수)가 들어가면 d2 | 세 묶음 검토 통과 |
| 3 | [컨트롤러] | 개발용 DB 에 0004 적용 + 설정 키 다섯(talk.teacher_*) 넣기(C125 키 때와 같은 시험용 나무 `--reference-only` 길) — d2 코드 검토 뒤. 더하기만이라 지금 프리뷰(87ea684) 코드에 영향 없음 | `profiles.teacher_key` 열 · 설정 다섯 행 |
| 4 | 구현 | d3 ∥ d4 | 둘 다 검토 통과 · CI 초록 |
| 5 | 구현 | d6 | 검토 · 화면 검토 통과 |
| 6 | 구현 | d7 | 검토 · 화면 검토 통과 |
| 7 | 구현 + [컨트롤러] | d8, 그리고 로컬 3D 눈 점검(next dev · 개발용 DB · GPU 있는 데스크톱 Chrome — Playwright MCP 사진 → 화면 검토). 이 Mac 은 로컬 e2e 를 못 돌린다(메모리) | 검토 · 화면 검토 통과 |
| ∥ | 생성(p08) | 진행 중인 P8 회화 1단계 자료 — 단원 2~5 · 선생님 이야기 1~3 · 회화 평가 카드(C139 (1)) | 검증 · 풀이 검사 통과 |
| 8 | [컨트롤러] | p08 → p13d 합침 ⑤(P8 회화 1 끝 뒤) · CI(lint · build · unit · integration · e2e · seed-validate · check-ids · depcruise · spec-trace) | CI 초록 |
| 9 | [컨트롤러] · [사람] | 개발용 DB 실시드 전환(C128 — 네 영역 1단계 완전성). 시험하며 쌓인 기록(아이 정보 · 공부 기록) 지우기는 요청자 확인 | 적재 오류 0 · 요청자 확인 |
| 10 | [컨트롤러] | 커밋 · push(C139 가 프리뷰 지시) → Vercel 프리뷰 READY → 상태표 · 아래 '프리뷰 범위 안내' | 가지 별칭 401 접근 화면 |
| 11 | [사람] | 회화 프리뷰: 미나로 수업 하나 → 관찰 쪽 `/dev/teacher-probe` 의 '이 프로필의 선생님 지우기' → 리오로 수업 하나 → 같은 쪽 '목록 복사' → 대화창에 붙여 넣기(목소리 목록) | 요청자 소감 · 목소리 목록 |
| 12 | [컨트롤러] | 명단 voice.prefer 손질(가벼운 루프) · 다시 배포 · C127 첫 실제 회화 턴 서버 기록 확인(장부 '구현하며 확인할 것') | 리오가 남성 영어 목소리(기기에 있으면) |
| ∥ 8~12 | 구현 | d9(3D e2e 일 · 번들 검사) | CI e2e-3d 결과 보고 |
| 13 | [사람] · 구현 | d10(프리뷰 뒤) | 13절 값 한 줄 |

가장 긴 길은 '차례 2~7' 과 'P8 회화 1 생성' 가운데 늦은 쪽 → 8 → 9 → 10 → 11 이다. 8 과 9 사이에 코드 일이 없게, d8 까지를 P8 생성과 나란히 끝낸다.

### 프리뷰 전 · 프리뷰 뒤

- **프리뷰 전(꼭)**: 줄인 모델 · 초상 자산(d1) · profiles.teacher_key(d2) · 고르기 액션 · 처음 스냅숏 키(d2) · AI 고정부 선생님 블록(d3) · 이름 자리와 조사(d4) · 선생님 높이 · 시작 알림(d5) · '선생님을 골라요' · 관찰 쪽 지우기 단추(d6 — 요청자가 미나 · 리오 둘 다 보게, C117) · 선생님 창 초상 · 다섯 상태 · 칭찬(d7) · 3D 와 대신 표시(d8).
- **프리뷰 뒤(AC 는 그대로, 차례만 뒤)**: 3D 프로젝트 e2e · 번들 검사(d9, 프리뷰 길과 나란히) · iPad 실측과 값 확정(AC-N11 — talk.teacher_model_max_mb · talk.teacher_load_timeout_seconds · 그리기 빈도 · 화소 비율 · 리오 목소리 순서) · 2048 표본 견줌 · AI 표본 20 대본(AC-19d 수동 — P13c c4 명령) · 시드 보기 이름 '선생님 이야기' · 명단 넓히기(차수 밖).

### 프리뷰 범위 안내(컨트롤러가 요청자에게 먼저 — 메모리 '화면 보여 주기 전에 범위부터')

- 되는 것: 회화 1단계 진짜 수업(단원 1 — 단원 통과 · 다음 단원 열림은 P12 뒤), '선생님을 골라요'(미나 · 리오), 회화 화면의 선생님 창(3D, 안 되는 기기는 초상), 쉬기 · 말하기 · 듣기 · 칭찬 · 생각, 실제 AI 선생님(이름 · 성격 · 말투), 선생님 높이의 목소리.
- 안 되는 것: 별 · 단원 통과 · 단계 평가(P12), 선생님 이야기 · 홈 회화 카드 초상 · 친한 정도(P13c), 부모 화면에서 선생님 바꾸기(1-나 — 관찰 쪽 지우기 단추로 대신), 리오의 남성 목소리(기기 목소리 목록을 받은 뒤), iPad 성능 값(잠정 8MB · 6초).
- 해 볼 것: 위 '차례 11' 그대로.

## 목표 (Goal)

- **고르기와 이름 자리.** 회화 선생님은 빌드에 묶은 명단(`seed/teachers.json`, 1-가는 미나 · 리오, 꼴 vrm)에서 고른다. 아이가 회화 수업을 처음 열면 마이크 못 씀(막힘) → 1-가 상한(쉼) → '선생님을 골라요'(고른 선생님이 없거나 명단에 없는 키일 때만) → '시작!' 차례로 연다(3.3 · C130 (8)). 고른 값은 profiles.teacher_key(비울 수 있음, 더하기만 하는 마이그레이션)이고, 고르기 서버 액션은 접근 쿠키(없으면 401) · 명단 밖 키 · 보이지 않는 선생님 · 이미 고른 프로필의 다시 쓰기를 거부한다. 아이 이름과 같은 이름의 선생님은 그 아이에게 보이지 않는다. 아이 화면의 토리 자리는 [이름](고른 한글 이름, 조사 맞춤, 고르기 전 '선생님')이고 화면 소스에 '토리'를 직접 쓰지 않는다(4절 머리 문단 · C123).
- **AI 고정부.** 회화 턴 · 끝맺음 턴 고정부 첫머리를 선생님 블록('You are {영어 이름}, an AI teacher character …' + 성격 글)으로 바꾸고 'Never say you are a human.' 뒤에 사람의 삶을 지어내지 않는 줄을 더한다(6.1 · 6.2). 한 대화는 회화 처음 스냅숏의 선생님 키로 끝까지 간다. 출력 스키마 칸 이름(tori_en · tori_ko …)과 DB 저장 값은 그대로다(C130 (9)).
- **선생님 창.** 회화 세션에 보드 사진 꼴 선생님 창 하나를 둔다. 쉬기 · 말하기 · 듣기 · 칭찬 · 생각 다섯 상태를 하나만 낸다(듣기 → 생각 → 말하기 → 칭찬 → 쉬기). 말하기는 읽어 주기가 실제로 시작한 알림부터 그 문장의 끝 · 취소 · 오류까지, 칭찬은 따라 말하기 결과 '잘 말했어요'(C39) · 목표 턴에 닿은 턴 읽어 주기 뒤에 talk.teacher_praise_seconds(2) 동안이다(R2 — 대화 턴의 맞고 틀림에 묶지 않음). 3D(three 0.180.0 · @pixiv/three-vrm 3.5.5, 시제품 C115)는 회화 세션에서만 따로 불러오고, WebGL 없음 · 불러오기 실패 · talk.teacher_load_timeout_seconds(6) 넘김 · 3D 맥락 잃음 · talk.teacher_render=portrait 면 그 세션 끝까지 조용히 초상이다(C122 · C130 (5)).
- **목소리 · 자산.** 회화 쪽 읽어 주기는 선생님 높이(미나 1.08 · 리오 0.97)와 목소리 순서를 쓰고 빠르기는 단계 구간(speech.rate.<구간>, C125)이다. 줄인 VRM · 초상은 같은 출처 정적 자산(`public/teachers/`, 이름에 내용 해시, 오래 캐시)이고 자산 검사(있음 · 해시 · 크기 상한 talk.teacher_model_max_mb 8 · talk.teacher_portrait_max_kb 100 · VRM 메타 · 표정 · 뼈 · 원본 없음 · 출처 문서)가 CI 의 `pnpm seed:validate` 에서 돈다.

## 정한 것(spec 이 plan 에 맡긴 것)

### 미결 3 — 줄인 모델: 제공 길 · 줄이기 도구 · 값

- **제공 길: 줄인 파일을 저장소에 넣는다**(`public/teachers/<키>.<SHA-256 앞 8자>.vrm` · `.webp`). 까닭: (1) 줄인 파일이 하나에 약 5MB(어림, 아래)라 둘이 약 10MB — 저장소가 감당할 크기다(GitHub 파일 경고 50MB). (2) 빌드가 바깥 주소에 기대지 않고, 자산 검사가 파일을 바로 읽는다. (3) Vercel 은 GitHub 배포라 Hobby 'Static File uploads 100MB'(CLI 올리기 상한)에 해당하지 않는다(확인한 사실 6). spec 미결 3 의 권하는 안과 같다.
- **도구: 저장소 스크립트 `scripts/teacher-reduce.ts` + libwebp(cwebp · dwebp 1.6.0, Homebrew `webp`)**. GLB 안 그림만 다시 쓰고 VRM JSON(meta · humanoid · blendShapeMaster · secondaryAnimation · materialProperties)은 글자 그대로 둔다 — 메타 보존(spec '자산과 라이선스')을 구조로 지킨다. gltf-transform 류는 VRM 확장을 모르는 것을 버리므로 쓰지 않는다(추측 — 그래서 직접 다시 쓰는 길을 골랐다). 로컬 전용(CI 는 부르지 않음, `images:fetch` 와 같은 자리)이고 줄인 방법 글을 명단 `source.reduction` · 출처 문서에 남겨 원본에서 다시 만들 수 있다.
- **값(1024 표본 — 프리뷰에 씀)**: 텍스처 한 변 상한 1024(2048² 셋을 줄임), 색 텍스처 WebP 손실 q85(알파 무손실 `-alpha_q 100`), 법선 텍스처(`_BumpMap`) WebP 무손실, 썸네일(meta.texture)은 PNG 256²(VRM 밖 도구가 읽을 수 있게 PNG 로 둠), `EXT_texture_webp`(되돌림 PNG 없음 — extensionsRequired). 정점 · 뼈 · 표정 변형 · 머티리얼은 그대로다 — 고유 정점이 1.8~1.9만 · 삼각형 2.5~2.7만이라 폴리곤을 줄일 까닭이 없다(intent · spec 의 '정점 70만~170만'은 프리미티브마다 같은 정점을 겹쳐 센 값, 확인한 사실 2). 초상은 원본 썸네일을 512² WebP q80.
- **어림 크기(스크래치패드, 2026-10-23)**: 1024 표본 미나 약 4.74MB · 리오 약 5.06MB, 2048 표본 5.47MB · 6.34MB, 초상 약 22KB — 모두 talk.teacher_model_max_mb 8(C131) · talk.teacher_portrait_max_kb 100 안. PNG 그대로 1024 로 줄이면 9.65 · 9.89MB 라 8MB 를 넘는다(WebP 를 고른 까닭).
- **표본 둘(spec '표본 둘을 iPad 에서 견준다')**: 1024 표본(프리뷰 · 기본)과 2048 표본(줄이지 않고 WebP 만). 두 표본은 받는 크기가 0.7~1.3MB 다르고 GPU 메모리는 약 4배 다르다(2048² RGBA 셋 + 밉맵 약 67MB ↔ 1024² 약 17MB, 계산). 창이 약 260px 이라 1024 면 화면 화소당 텍셀이 약 하나다(추측). iPad 견줌은 d10 에서 1024 프리뷰와 2048 을 넣은 임시 가지 프리뷰(합치지 않음, [컨트롤러])로 한다.
- **원본**: 본 저장소 작업 트리 `prototypes/teacher-avatar/public/models/{mina,leo}.vrm`(추적 안 함 — `.gitignore`). 스크립트는 읽기만 하고 해시(명단 `source.originalSha256`)를 대조한다. 원본은 문서 가지 기록 000b3e6 에만 있고 p13d 기록에는 없다 — 시제품 폴더에 줄인 파일을 덮어쓰지 않는다(위험 4).

### 미결 6 — 코드 식별자

- **그대로 둔다**: DB 열 · 저장 값(tori_nickname · talk_turns 화자 'tori' · tori_ko · tori_rewrite · 수업 종류 'tori_story' · profile_tracks tori_stories_*), AI 출력 스키마 칸(tori_en · tori_ko …), 서버 함수(toriTextOf · toriRewriteOf), 말풍선 조각과 그 데이터 속성(`ToriBubble` · `ToriWaiting` · `useSpeakQueue` · `data-tori-bubble` · `-line` · `-ko` · `-explanation` · `-waiting` · `-promise`). 까닭: 바꾸면 마이그레이션 · 녹화 표본 · 문법 컴파일 · e2e 선택자가 함께 바뀌고 아이에게 보이는 것은 없다(C130 (9), spec 권하는 안).
- **바꾸거나 지운다**: `ToriFigure` · `ToriState` → `TeacherWindow` · `TeacherState`(d7), `TORI_TEXT` → `TEACHER_TEXT`(문구 표, d4), `TORI_NAME`(core/ai/calls/talk.ts) → 지움(명단 영어 이름, d3), `data-tori-figure` · `data-tori-state` → 아래 속성.

### 화면 상태 속성 이름(C130 'plan 이 정한다')

선생님 창 `data-teacher-window` · `data-teacher-key="<키>"` · `data-teacher-state="idle|speaking|listening|praise|thinking"` · `data-teacher-render="3d|portrait"`, 초상이면 `data-teacher-fallback="no-webgl|load-failed|timeout|context-lost|setting"`(3D 를 시작하기 전 초상은 까닭 없음), 초상 상태 표시 `data-teacher-indicator="speaking|thinking|praise"`, 3D 캔버스의 그린 장 수 `data-teacher-frames`(1초마다). 고르는 화면 `data-teacher-choice` · 장 `data-teacher-card="<키>"` · 골라진 장 `data-teacher-chosen`. 그림 층 사건은 `window` 의 `momo:teacher`(detail `{ type: "load-start" | "first-frame" | "fallback" | "dispose", reason?, ms? }`) — 관찰 쪽 재기와 e2e 셈이 쓴다.

### 그 밖에 plan 이 정한 것

- **proxy · 캐시(spec '제공' 행)**: `src/proxy.ts` 거르는 목록에서 `teachers/` 를 뺀다(그림 `images/` 와 같은 길 — 공개 허용 모델이라 비밀이 아니고, 큰 파일 요청마다 proxy 를 부르지 않는다). `next.config.ts` `headers()` 로 `/teachers/:path*` 에 `Cache-Control: public, max-age=31536000, immutable`(파일 이름에 내용 해시).
- **3D 시험 모델 · CI 길(9절 'plan 이 정한다')**: 3D 시험은 저장소의 줄인 모델을 쓴다(따로 시험 VRM 을 두지 않음). 기본 프로젝트(WebKit)는 쪽 시작 스크립트로 WebGL 을 끈 채 대신 표시 길을 늘 시험하고, 3D 는 새 프로젝트 `teacher-3d-chromium`(소프트웨어 WebGL 깃발 `--enable-unsafe-swiftshader`)과 새 CI 일 `e2e-3d` 가 돈다. 러너가 WebGL 맥락을 못 만들면 건너뛰지 않고 실패로 남는다(9절).
- **이름표 그리기와 대비 짝(장부 M-1)**: 이름표 = 선생님 accent 바탕 · 종이색(#fffdf7 = `--color-paper`) 글자, 창 안 바탕 = room(글자 없음), '인사 듣기'는 보드 작은 단추(먹색 · 종이색 — 선생님 색을 쓰지 않음). 명단 검사의 대비 짝을 accent ↔ room 에서 accent ↔ #fffdf7 로 바꾼다(미나 6.69 · 리오 6.03, 4.5 이상).
- **빼는 낱말 칸(장부 N-3 · C136 (4))**: 코드 상수 `KO_NAME_WORD_EXCEPTIONS` 를 명단 항목 칸 `nameKoWordExceptions` 로 옮긴다(토리 몫 '토리노'는 명단 밖이라 코드의 옛 이름 옆에 남음). 뒤 명단 한글 이름 하나 · 준 · 나비 · 소라는 보통 낱말 그 자체라(나비는 vocab butterfly 의 뜻이기도 함) 앞머리 빼기 칸으로 풀 수 없다 — 명단을 늘리는 변경에서 이름을 바꾸기를 권한다(정할 것 15).
- **창 크기 · 자리(목업 없음 — plan-p13a 회15 선례)**: 가로 화면은 왼쪽 칸(260px)에 창, 그 아래 '오늘 이야기 목록'(지금 오른쪽 옆 칸을 옮김), 오른쪽에 대화 판. 세로 화면은 위 띠 아래 한 줄에 창 · 오늘 이야기 목록, 그 아래 대화 판. 창 크기(제안, 화면 꼴 상수): 가로 260 × 300px, 세로 200 × 240px. 까닭: 가로 1180 에서 옆 칸(320)과 창을 양옆에 두면 대화 판이 약 470px 라 말풍선 상한 520 · 그림 턴 240 이 줄어든다(4절 '줄이지 않는다'). 옆 칸을 창 아래로 옮기면 대화 판이 약 800px 다. 화면 검토가 사진으로 고친다. 목업 그리기는 P6c(넘김).
- **'시작!' 화면 · 마무리**: '시작!' 화면에는 창이 초상으로 있고(4절 '처음 회화'), 3D 가 먼저 다 되어도 '시작!'을 누른 뒤 바꾼다. 마무리 세 장에 들어가면 그림 층을 닫는다(4절 '회화 마무리 — 초상만', 메모리를 일찍 풂).
- **회화 쪽 남은 Minor**: 재검토 rev-p13b N-1(흘려 받기 실패 길 onStuck — 실제 AI 프리뷰의 같은 답 두 번 읽기) · N-4 · 단위 이름 둘(N-2 의 몫) · e2e 주석 자리(N-3)와 디자인 리뷰 2 N-3(회화 세로 띠)은 넣는다 — 같은 파일 · 같은 화면을 이 plan 이 고친다. 디자인 리뷰 2 N-1 · N-2 · N-4 · N-5 · N-6 은 디자인 fix 2 그대로.
- **AI 고정부의 드문 길**: 처음 스냅숏 키도 프로필 키도 명단에 없으면(관찰 쪽 지우기를 대화 도중 누른 뒤 같은 대화의 옛 스냅숏에 키가 없을 때 정도) 명단 첫 항목으로 고정부를 만든다(화면은 '선생님').

## 확인한 사실과 출처(2026-10-23)

1. 원본 VRM(본 저장소 작업 트리, 추적 안 함): 미나 17,936,516B · SHA-256 aea824cc…, 리오 18,947,896B · 4af2194f…(시제품 LICENSES.md 와 같음). 둘 다 VRM 0.x(`extensions.VRM`, 미나 UniVRM-0.44 · 리오 VRoidStudio-0.14.0), extensionsUsed KHR_materials_unlit · VRM.
2. 구성(GLB 를 스크래치패드 스크립트로 읽음): 그림 28 · 25장 합 13.62 · 14.14MiB(BIN 16.97 · 17.93MiB), 그 가운데 2048² 넷(몸 · 몸 법선 · 옷 · 썸네일)이 약 10.4 · 11.1MiB. 고유 정점 18,743 · 17,669, 삼각형 26,706 · 24,858, 프리미티브 95 · 131(머리카락 78 · 114 — 그리기 호출 수), 머티리얼 16 · 14, 표정 변형 accessor 82 · 108(2.02 · 2.54MiB). 프리미티브마다 POSITION 을 더하면 801,566 · 961,776 — intent 미결 5 · spec 우려 2 의 '정점 70만~170만'은 이 겹친 셈이다.
3. 메타: licenseName Other(미나) · CC0(리오), allowedUserName Everyone, commercialUssageName Allow, otherPermissionUrl = otherLicenseUrl = VRoid Hub 조건 주소(명단 conditionsUrl 과 같음), meta.texture 27 · 24, 표정 프리셋 a · angry · blink · blink_l · blink_r · e · fun · i · joy · neutral · o · sorrow · u · unknown, 뼈 head · neck · spine · chest.
4. 줄이기 어림(스크래치패드, libwebp 1.6.0 · macOS sips 26.6 — 저장소 밖): 위 '어림 크기'. 모두 손실(색 q85 · 법선 q95)이면 1024 에서 3.81 · 4.14MiB 이고, 법선을 무손실로 두는 권하는 값은 그보다 약 0.9MiB 크다.
5. 라이브러리: three 0.180.0 `GLTFLoader.js` 의 `GLTFTextureWebPExtension.loadTexture`(1578~1612행)는 텍스처의 `EXT_texture_webp.source` 를 지원 검사 없이 바로 읽는다. @pixiv/three-vrm 3.5.5 MToon 은 `parser.assignTexture` 로 텍스처를 받고(three-vrm-materials-mtoon module 95행), VRM 0.x 머티리얼은 v0compat 이 textureProperties(_MainTex · _BumpMap …)를 옮긴다. `VRMMetaLoaderPlugin` 의 needThumbnailImage 기본값은 false(three-vrm-core module 3100행) — 썸네일은 받기만 하고 풀지 않는다. npm(2026-10-23 조회): three-vrm 최신 3.5.5(2026-07-09, peer three >=0.137), `@types/three@0.180.0` 있음, three 는 형을 싣지 않는다. 시제품 빌드 묶음 dist 700KB, 표지 글 `VRMC_vrm` 15번 · `THREE.WebGLRenderer` 30번.
6. Vercel 한도(vercel.com/docs/limits, 2026-09-16 판): 'Static File uploads' Hobby 100MB 는 CLI 배포의 소스 올리기 상한이다. 이 프로젝트는 GitHub 가지 배포(가지 별칭 momo-english-academy-git-…)라 해당 없음, 빌드 디스크 32GB. 지금 `public/` 848KB.
7. 대비(WCAG, check-teacher 와 같은 식): accent ↔ room 미나 5.54 · 리오 4.93, accent ↔ #fffdf7 6.69 · 6.03, 먹색 #2b2b2b ↔ room 11.52 · 11.38.
8. 설정 시드: talk.teacher_model_max_mb 8 · talk.teacher_portrait_max_kb 100 · talk.teacher_load_timeout_seconds 6 · talk.teacher_praise_seconds 2 · talk.teacher_render "3d"(`seed/settings.json`, `tests/fixtures/settings.ts` 164~168행, 12절 · C131).
9. 코드 자리(p13d 7cbe9f8): 토리 표시 `src/components/conversation/tori.tsx` 22~28(TORI_TEXT) · 96(ToriState) · 112~157(ToriFigure) · 415~497(useSpeakQueue — speaking 은 줄에 글이 남았는지); 회화 틀 `talk-frame.tsx` 101~105(약속 · 그만하기 글) · 732~739(toriState) · 779(TalkStart) · 851(몸 레이아웃) · 871(ToriFigure) · 990(옆 칸) · 1025(위 띠) · 1071(약속 줄); `follow-along.tsx` 52~65(처음 안내 · 따라 말하기 안내) · 191~221(TalkStart 의 ToriFigure) · 274(따라 말하기 읽어 주기); `child-turn.tsx` 43; `closing-cards.tsx` 35; `ai-rest.tsx` 9(모든 영역 · 7곳에서 씀); `home-cards.tsx` 45; `placement-flow.tsx` 69; `first-run-flow.tsx` 69~70; `src/core/ai/calls/talk.ts` 34(TORI_NAME) · 216~236(스키마 설명) · 333~353(고정부) · 440~450(사용자 메시지); `src/server/conversation/index.ts` 222~292(ensureStarted — 처음 스냅숏 · 토리 행 1) · 324~394(TalkView) · 497~603(loadTalkView); `state.ts` 918~(talkInputOf — 회화 턴 · 끝맺음 턴이 같이 씀); `turn.ts` 590~615(1~3단계 AI 질문 낱말 범위) · 954(보낸 사용자 메시지); `src/server/ai/talk.ts` 478~485(끝에서 한 번에 내보내기) · 663(안전 상한 기록); 세션 쪽 `src/app/(child)/session/[id]/page.tsx` 17~23(`<TalkFrame key={talk.version}>` — 판이 바뀌면 틀을 새로 그림); `src/proxy.ts` 61~63(거르는 목록); `next.config.ts` 21~24(tracing); `src/lib/speech/types.ts` 19(SpeakOptions — rate 하나); `browser.ts` 421~480(speak — onstart 는 기록만); `fake-web-speech.ts` 44~56 · 256~260(기록 — spoken · rates); `src/core/conversation/attempt.ts` 46~54(talk-start 꼴, strictObject); `src/core/seed/check-teacher.ts` 58~64(빼는 낱말) · 330~336(대비 짝) · 348~372(자산 있음); `schema/teachers.ts` 64~79(필수가 아닌 칸 넷); `scripts/seed-validate.ts` 267~281(public/ 있음 확인); `src/components/board/board.tsx` 84(띠 왼쪽 묶음 — 디자인 N-3).
10. 시험 바탕: Playwright 프로젝트는 `tablet-10-9-webkit`(iPad Pro 11 · 820×1180) 하나 · workers 1, CI e2e 일은 webkit 만 설치, 쪽 숨김 흉내 선례 `tests/e2e/speech-probe.spec.ts` 159~188행, 집 설정 바꾸기 `withHouseholdSetting`(`tests/e2e/db.ts` 63행), 회화 e2e 집 `talkHousehold`(`tests/e2e/talk.ts` 189행), 통합 회화 집 `resetHousehold`(`tests/integration/talk-fixture.ts` 123행), 서버 액션 첫 문장 훑기 `tests/unit/access-gate.test.ts`, proxy 거르는 목록 단위 같은 파일 656행.

## 바뀌는 파일 (Files that change)

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 값 |
|---|---|---|---|
| `scripts/teacher-reduce.ts` | 신규 | 줄이기 스크립트(로컬 전용) | d1 · 값 1 |
| `src/core/seed/vrm.ts` | 신규 | GLB 풀기 · 묶기 · VRM 사실(순수) | d1 · 값 3 |
| `src/core/seed/schema/teachers.ts` | 수정 | 모델 · 초상 · 목소리 · 줄인 방법 필수, 새 칸 nameKoWordExceptions | d1 · 값 2 |
| `src/core/seed/check-teacher.ts` | 수정 | 빼는 낱말을 명단에서 · 대비 짝 · 자산 검사 넓힘 | d1 · 값 2 · 4 |
| `src/core/seed/structure.ts` | 수정 | 옛 이름 빼는 낱말 · 이름표 글자색 · VRM 표정 · 뼈 · 자산 폴더 · 10진 MB/KB | d1 · 값 2 |
| `src/core/seed/validate.ts` | 수정 | assetExists → teacherAssets(io) | d1 · 값 4 |
| `scripts/seed-validate.ts` | 수정 | public/ · CREDITS.md 를 읽어 io 를 만듦 | d1 · 값 4 |
| `seed/teachers.json` | 수정 | model · portrait · voice · source.reduction · nameKoWordExceptions | d1 · 값 2 |
| `public/teachers/{mina,leo}.<8자>.{vrm,webp}` | 신규(만든 파일) | 줄인 모델 둘 · 초상 둘 | d1 · 값 1 |
| `CREDITS.md` | 수정 | '회화 선생님' 절(d1) · three · three-vrm 고지 줄(d8) | d1 · d8 |
| `package.json` · `pnpm-lock.yaml` | 수정 | 스크립트 teacher:reduce(d1) · three · @pixiv/three-vrm · @types/three · check:teacher-bundle(d8 · d9) | d1 · d8 · d9 |
| `src/db/schema/learning.ts` | 수정 | profiles.teacherKey | d2 · 값 7 |
| `drizzle/0004_profiles_teacher_key.sql` · `drizzle/meta/0004_snapshot.json` · `drizzle/meta/_journal.json` | 신규(생성) | ADD COLUMN teacher_key text | d2 · 값 7 |
| `src/server/seed-lists.ts` | 수정 | 시드 목록 teachers | d2 · 값 5 |
| `next.config.ts` | 수정 | tracing 에 seed/teachers.json(d2) · /teachers/ 캐시 머리글(d8) | d2 · d8 |
| `src/core/teacher/roster.ts` | 신규 | TeacherView · 보일 선생님 · 선생님 정하기(순수) | d2 · 값 5 |
| `src/server/teacher/index.ts` | 신규 | 명단 읽기 · 고정부 재료 · 집 선생님(server-only) | d2 · 값 5 |
| `src/server/actions/teacher.ts` | 신규 | chooseTeacher | d2 · 값 6 |
| `src/core/conversation/attempt.ts` | 수정 | talk-start 꼴에 teacherKey | d2 · 값 7 |
| `src/server/conversation/state.ts` | 수정 | TalkState.teacher(d2) · talkInputOf 의 teacher(d3) | d2 · d3 |
| `src/server/conversation/index.ts` | 수정 | TalkView 의 선생님 · 고를 선생님 · 선생님 설정, 선생님이 없으면 스냅숏 미룸 | d2 · 값 7 |
| `src/core/ai/calls/talk.ts` | 수정 | 선생님 블록 · 사람의 삶 줄 · 스키마 설명 · 이름표 · 낱말 범위 이름, TORI_NAME 지움 | d3 · 값 8 |
| `src/server/conversation/turn.ts` | 수정 | 보낸 사용자 메시지 · AI 질문 검사에 선생님 이름 | d3 · 값 8 |
| `src/server/ai/talk.ts` | 수정 | rev-p13b N-1 · N-4 | d3 · 값 8 |
| `src/core/teacher/name.ts` | 신규 | 조사 고르기 · 문구 표(순수) | d4 · 값 9 |
| `src/components/teacher/teacher-provider.tsx` | 신규 | 집 선생님 공유 값(아이 화면) | d4 · 값 9 |
| `src/app/(child)/layout.tsx` | 수정 | 집 선생님을 읽어 공유 | d4 · 값 9 |
| `src/components/session/ai-rest.tsx` | 수정 | '[이름](이/가) 잠깐 쉬어요 …' | d4 · 값 9 |
| `src/components/conversation/tori.tsx` | 수정 | TORI_TEXT 지움 · 이름 prop(d4), ToriFigure · ToriState 지움(d7) | d4 · d7 |
| `src/components/conversation/talk-frame.tsx` | 수정 | 문구(d4) · 고르기 차례(d6) · 창 칸 · 상태 · 칭찬 · 음성 감싸기(d7) · 마무리 닫기 · 3D 바꿈 때(d8) | d4 · d6 · d7 · d8 |
| `src/components/conversation/follow-along.tsx` | 수정 | 처음 안내 · 따라 말하기 안내(d4), TalkStart 그림 지움 · onPraise(d7) | d4 · d7 |
| `src/components/conversation/child-turn.tsx` | 수정 | '[이름]에게 잘 안 들렸어요 …' | d4 · 값 9 |
| `src/components/conversation/closing-cards.tsx` | 수정 | '[이름](와/과) 친한 정도' | d4 · 값 9 |
| `src/app/(child)/home-cards.tsx` | 수정 | 배치 전 '회화 선생님' 문구 | d4 · 값 9 |
| `src/app/(child)/[area]/placement/placement-flow.tsx` | 수정 | '이제 회화 선생님을 만날 수 있어요' | d4 · 값 9 |
| `src/app/(setup)/first-run/first-run-flow.tsx` | 수정 | '선생님이 부를 영어 이름' 둘 | d4 · 값 9 |
| `src/core/teacher/state.ts` | 신규 | 선생님 상태 · 칭찬 · sampleMotion · 차례 번호(순수) | d5 · 값 11 |
| `src/core/teacher/voice.ts` | 신규 | 선생님 목소리 고르기(순수) | d5 · 값 12 |
| `src/lib/speech/types.ts` | 수정 | SpeakOptions 높이 · 목소리 순서 · 시작 알림 | d5 · 값 12 |
| `src/lib/speech/browser.ts` | 수정 | 높이 · 목소리 순서 · onStart | d5 · 값 12 |
| `src/lib/speech/fake-web-speech.ts` | 수정 | 기록에 높이 · 목소리 | d5 · 값 12 |
| `src/lib/speech/teacher.ts` | 신규 | 선생님 음성 감싸기 | d5 · 값 12 |
| `src/components/teacher/teacher-portrait.tsx` | 신규 | 초상 · 글자 동그라미 '선' | d6 · 값 10 |
| `src/components/teacher/teacher-choice.tsx` | 신규 | '선생님을 골라요' | d6 · 값 10 |
| `src/server/actions/teacher-preview.ts` | 신규 | clearTeacherForPreview | d6 · 값 6 |
| `src/app/dev/teacher-probe/page.preview.tsx` · `teacher-probe.tsx` | 신규 | 관찰 쪽(지우기 · 목소리 목록(d6) · 3D 재기(d8)) | d6 · d8 · 값 16 |
| `src/components/teacher/teacher-window.tsx` | 신규(d7) · 수정(d8) | 선생님 창 — 초상 · 상태 표시 · 이름표(d7), 3D 캔버스 붙이기(d8) | d7 · d8 · 값 13 · 14 |
| `src/components/board/board.tsx` | 수정 | 디자인 리뷰 2 N-3(띠 왼쪽 묶음 min-w-0 flex-1) | d7 · 값 13 |
| `src/components/teacher/avatar-3d.ts` | 신규 | 3D 그림 층(동적 가져오기로만) | d8 · 값 14 |
| `src/core/teacher/layer.ts` | 신규 | 그림 층 판정(순수 — 대신 표시 다섯 · 늦은 결과) | d8 · 값 14 |
| `src/components/teacher/teacher-layer.tsx` | 신규 | 그림 층 보관 조각 · 공유 값 | d8 · 값 14 |
| `src/app/(child)/session/[id]/page.tsx` | 수정 | 회화일 때 보관 조각으로 감쌈 | d8 · 값 14 |
| `src/proxy.ts` | 수정 | 거르는 목록에서 teachers/ 뺌 | d8 · 값 15 |
| `.dependency-cruiser.cjs` | 수정 | three 는 avatar-3d 만 · avatar-3d 는 동적만 | d8 · 값 15 |
| `scripts/check-teacher-bundle.ts` | 신규 | 번들 검사(AC-N12) | d9 · 값 17 |
| `playwright.config.ts` | 수정 | 3D 프로젝트 · 기본 프로젝트에서 3D 시험 뺌 | d9 · 값 17 |
| `.github/workflows/ci.yml` | 수정 | e2e 프로젝트 고름 · 새 일 e2e-3d · 번들 검사 줄 | d9 · 값 17 |
| `tests/e2e/fixtures.ts` | 수정 | webgl 선택(기본 끔 — d7), 3D 프로젝트 켬(d9) | d7 · d9 |
| 시험 — 신규 | 신규 | 단위 `teacher-reduce` · `teacher-vrm`(d1), `teacher-roster`(d2), `teacher-name` · `teacher-scan`(d4), `teacher-state` · `teacher-voice` · `teacher-speech`(d5), `next-config`(d6), `teacher-layer`(d8), `check-teacher-bundle`(d9) · 통합 `teacher`(d2 · d6) · e2e `teacher-choice`(d6) · `teacher-window`(d7) · `teacher-3d`(d9) | 각 묶음 |
| 시험 — 수정 | 수정 | `seed-teacher`(d1) · `seed-validate-cli`(d1, 확인) · `conversation-session` · `talk-fixture` · e2e `household` · `talk`(d2) · `conversation-call`(단위 · 통합) · `talk-stream-call` · `conversation-stream` · `conversation-turn` · `fixtures/ai/sample-inputs` · contract `ai-schemas`(d3, 확인) · `talk-follow` · `talk-bubble` · e2e `conversation` · `first-run` · `home` · `placement` · `writing`(d4) · `speech-speak` · `fake-web-speech-defaults`(d5, 확인) · e2e `conversation`(d7 — 속성 이름 · 레이아웃 · 주석) · `access-gate` · `dependency-rules`(d8, 확인) · `ci-workflows`(d9, 확인) | 각 묶음 |

### 파일별 값(구현자가 옮겨 쓸 것)

**값 1. 줄이기 스크립트 `scripts/teacher-reduce.ts`(d1, 신규 · 로컬 전용).**
- 사용: `pnpm teacher:reduce --key <mina|leo> --src <원본 VRM 절대 경로> [--max-texture 1024] [--out <폴더>] [--write]`. package.json 스크립트 `"teacher:reduce": "tsx scripts/teacher-reduce.ts"`. 원본은 `/Users/hikaru/workspace/momo-english-academy/prototypes/teacher-avatar/public/models/<키>.vrm`(본 저장소 작업 트리 — 읽기만). `--out` 기본은 `public/teachers`, 2048 표본은 `--max-texture 2048 --out tests/.tmp/teacher-2048`(추적 안 함)로 만들어 크기만 기록한다.
- 차례: (1) 원본 SHA-256 이 명단 `source.originalSha256` 과 다르면 종료 2. (2) `cwebp -version` · `dwebp -version` 을 읽어 판을 적는다(없으면 종료 2 — 'brew install webp'). (3) GLB 풀기(값 3). (4) 그림 갈래: 썸네일 = VRM 0.x `extensions.VRM.meta.texture` 가 가리키는 텍스처의 source 그림, 법선 = `extensions.VRM.materialProperties[].textureProperties._BumpMap` 이 가리키는 텍스처의 그림(이름 `_nml` 과 다르면 보고만), 나머지 = 색. (5) 다시 쓰기: 썸네일 → PNG 256²(`cwebp -lossless -exact -resize 256 256` 뒤 `dwebp -png`), 법선 → WebP 무손실(`cwebp -lossless -z 9`), 색 → WebP 손실(`cwebp -q 85 -alpha_q 100`). 한 변이 `--max-texture` 보다 크면 비를 지켜 `-resize`. (6) WebP 그림을 쓰는 텍스처는 `extensions.EXT_texture_webp = { source }` 를 두고 `source` 를 지운다. 그 그림의 `mimeType` 은 `image/webp`. `extensionsUsed` · `extensionsRequired` 에 `EXT_texture_webp`. 한 그림을 썸네일과 다른 텍스처가 같이 쓰면 종료 2. (7) bufferView 를 차례대로 4바이트 맞춰 다시 놓고 `buffers[0].byteLength` 를 고친다. accessor · 머티리얼 · `extensions.VRM` 은 글자 그대로. (8) 초상: 원본 썸네일을 `cwebp -q 80 -resize 512 512`. (9) 쓰기: `<out>/<키>.<SHA-256 앞 8자>.vrm` · `.webp`. `--write` 면 명단 그 항목의 model(path · bytes · sha256) · portrait(path · bytes) · source.reduction 을 고치고, 같은 키의 옛 파일(`<키>.<16진 8자>.(vrm|webp)` 꼴만)을 지운다. 표준 출력은 바이트 · SHA-256 · 줄인 방법 글.
- 줄인 방법 글(source.reduction 에 그대로): `pnpm teacher:reduce --max-texture 1024 (scripts/teacher-reduce.ts) · libwebp cwebp/dwebp <판> · 텍스처 한 변 1024 · 색 WebP q85(알파 무손실) · 법선 WebP 무손실 · 썸네일 PNG 256 · EXT_texture_webp(되돌림 PNG 없음) · 정점 · 뼈 · 표정 · 머티리얼 · VRM 메타 그대로`.
- 내보내는 순수 함수(단위 `tests/unit/teacher-reduce.test.ts`): `imageRolesOf(json) → { thumbnail; normals; colors }` · `applyImageRewrite(json, bin, encoded) → { json, bin }`(인코더 결과를 받음 — 실행 파일 부르기는 직접 실행 때만, scripts 의 다른 명령과 같은 꼴). 시험: 가짜 GLB(그림 셋) → JSON 의 `extensions.VRM` · accessors · materials 가 글자 그대로 · bufferView 4바이트 맞춤 · 확장 두 목록 · 썸네일 텍스처는 source 유지.

**값 2. 명단 칸 · 규격(d1).**
- `src/core/seed/schema/teachers.ts`: model · portrait · voice · source.reduction 의 `.optional()` 을 뗀다(머리 주석 고침). `voice.prefer` 는 `z.array(Text)`(빈 목록 허용 — 값은 프리뷰 때 받은 기기 목록으로, 정할 것 9). 새 칸 `nameKoWordExceptions: z.array(z.string().regex(/^[가-힣]+$/))`(그 한글 이름으로 시작하는 보통 낱말, 장부 N-3).
- `seed/teachers.json`: 미나 `"nameKoWordExceptions": ["미나리"]` · `"voice": { "pitch": 1.08, "prefer": [] }`, 리오 `["리오넬", "리오데자네이루"]` · `{ "pitch": 0.97, "prefer": [] }`. 지금 코드 목록의 '리옹'은 받침 ㅇ 이라 '리오' 자리 맞춤(`nameAt` — 받침 ㄴ · ㄹ 줄임만 받음)에 원래 걸리지 않으므로 뺀다. model · portrait · source.reduction 은 값 1 이 채운다.
- `src/core/seed/structure.ts`: `OLD_TEACHER_NAMES` 에 `koWordExceptions: ["토리노"]`(명단 밖 옛 이름 몫은 코드에 남음), `TEACHER_LABEL_TEXT = "#fffdf7"`(이름표 글자 = `--color-paper`, 단위 시험이 `src/app/globals.css` 값과 견줌), `VRM_REQUIRED_EXPRESSIONS = ["blink", "happy", "aa", "oh", "ee"]` · `VRM_REQUIRED_BONES = ["head", "neck", "spine"]` · `VRM0_PRESET_TO_EXPRESSION`(blink→blink · joy→happy · a→aa · i→ih · u→ou · e→ee · o→oh — three-vrm 의 VRM 0.x 이름 바꿈과 같음), `TEACHER_ASSET_DIR = "teachers"`, `BYTES_PER_MB = 1_000_000` · `BYTES_PER_KB = 1_000`(P6b IMAGE_MAX_BYTES 와 같은 보수적 10진 셈).
- `src/core/seed/check-teacher.ts`: (1) `KO_NAME_WORD_EXCEPTIONS` 를 지우고 `teacherNamesOf` 가 옛 이름 몫과 명단 칸을 모아 `TeacherNames.koExceptions` 로 돌려준다 — `hasKoreanName` 이 그것을 쓴다(지금 동작 그대로). (2) 명단 검사: 빼는 낱말마다 `nameAt(word, 0, nameKo)` 가 거짓이면 오류('빼는 낱말 X 가 이름 Y 자리에서 걸리지 않는다'). (3) 대비: `contrastRatio(t.color.accent, TEACHER_LABEL_TEXT) < 4.5` 면 오류(글 '이름표(accent 바탕 · 종이색 글자) 대비 …'). (4) `checkTeacherAssets` 를 값 4 로 넓힘. (5) `t.model && t.source.reduction === undefined` 줄은 규격이 필수라 지운다.

**값 3. VRM 머리글 읽기 `src/core/seed/vrm.ts`(d1, 신규 · 순수 — 줄이기 스크립트와 자산 검사가 같이 씀).**
- `parseGlb(bytes: Uint8Array) → { ok: true; json; bin } | { ok: false; reason }` — 머리 'glTF' · 판 2 · 첫 덩이 JSON(0x4E4F534A) · 둘째 덩이 BIN(0x004E4942). `buildGlb(json, bin) → Uint8Array`(JSON 은 공백, BIN 은 0 으로 4바이트 맞춤).
- `vrmFactsOf(json) → { version: "0.x" | "1.0" | "none"; meta: { licenseName?; allowedUserName?; commercialUssageName?; otherPermissionUrl?; otherLicenseUrl?; texture? }; expressions: string[]; bones: string[] }` — 0.x 는 blendShapeMaster 프리셋을 VRM0_PRESET_TO_EXPRESSION 로 바꾼 이름, humanoid.humanBones[].bone. 1-가 명단은 0.x 만이다(1.0 은 자산 검사가 '명단을 늘리는 변경에서'로 거부).
- 단위 `tests/unit/teacher-vrm.test.ts`: 만든 가짜 GLB 로 풀기 · 묶기 되돌림, 머리 · 덩이 깨짐, 0.x 사실 뽑기.

**값 4. 자산 검사(d1 — AC-19k).**
- `checkTeacherAssets(file, io)`, `io: TeacherAssetIo = { read(path): Uint8Array | undefined; sha256(bytes): string; publicVrmFiles: readonly string[]; credits: string | undefined; limits: { modelMaxMb: number; portraitMaxKb: number } }`. 규칙 `teacher-asset`, 경로 `teachers.<차례>.<칸>`.
- 본다: (a) 모델 · 초상 파일 있음. (b) 모델 바이트 · SHA-256 이 명단과 같고, 초상 바이트가 명단과 같음. (c) 모델 ≤ talk.teacher_model_max_mb × BYTES_PER_MB, 초상 ≤ talk.teacher_portrait_max_kb × BYTES_PER_KB. (d) VRM: version 0.x, meta.licenseName = source.licenseName, `allowedUserName=<값> · commercialUssageName=<값>` = source.permissions, meta.otherPermissionUrl = meta.otherLicenseUrl = source.conditionsUrl, VRM_REQUIRED_EXPRESSIONS · VRM_REQUIRED_BONES 가 다 있음. (e) 원본 없음: `public/` 의 .vrm 은 모두 명단 model.path 이고 그 SHA-256 이 어느 source.originalSha256 과도 같지 않음. (f) 출처 문서: CREDITS.md 에 선생님마다 source.creator · source.distributionUrl · source.originalTitle · source.originalSha256 · model.sha256 · source.reduction 이 글자 그대로 있음.
- 두 설정은 읽은 시드 settings.json 에서 가져온다(없으면 오류 — 12절 '자산 검사(CI)가 읽는다').
- `src/core/seed/validate.ts`: `ValidateOptions.assetExists` → `teacherAssets?: TeacherAssetIo`(넘기지 않으면 자산 검사를 건너뜀 — 지금과 같은 뜻). `scripts/seed-validate.ts` main 이 저장소 뿌리의 `public/`(.vrm 목록) · `CREDITS.md` · `node:crypto` 로 io 를 만든다. `--root` 가 다른 시드 뿌리여도 공개 폴더 · 출처 문서는 저장소 뿌리(지금 assetExists 와 같음). CI `seed-validate` 일의 `pnpm seed:validate` 가 그대로 돈다(새 단계 없음).
- `CREDITS.md` 새 절(지금 '3. 앱 안 표시'를 4 로): '3. 회화 선생님(`public/teachers/`)' — 선생님마다 원 제작자 VRoid Project (VRoidプロジェクト) · 배포처 OpenGameArt 'VRoid Studio CC0 Models'(주소 · 배포 파일) · 원본 제목(ビビ · HairSample_Male) · 파일 안 조건(licenseName · 허용 · VRoid Hub 조건 주소 — 상업 · 고쳐 쓰기 · 재배포 허용 · 크레딧 불필요) · 원본 SHA-256 · 줄인 파일 SHA-256 · 줄인 방법 글. 조건상 크레딧은 필요 없지만 남긴다(spec '출처 표기').

**값 5. 명단 서버 · 보일 선생님(d2).**
- `src/server/seed-lists.ts`: `LIST_SCHEMAS` 에 `teachers: TeachersFileSchema`(파일 이름은 이미 `SEED_FILES.teachers = "teachers.json"`). `next.config.ts` `outputFileTracingIncludes` 의 "/" · "/*" 에 `"./seed/teachers.json"`.
- `src/core/teacher/roster.ts`(신규 · 순수): `TeacherView = { key; nameKo; introKo; traitsKo; greetingEn; color: { room; accent }; modelPath; portraitPath; voice: { pitch; prefer } }`(화면에 보내는 몫 — personaEn · source · nameEn 은 보내지 않음, 5절). `teacherViewOf(t)`. `visibleTeachers(roster, child: { displayName; englishName; nickname? })` — `nameVariantsOf(child, () => false)`(src/core/ai/mask.ts, 6.1 과 같은 이름 변형)의 한글 변형이 nameKo 와 같거나 영어 변형(소문자)이 nameEn(소문자)과 같은 선생님을 빼고, 다 빠지면 명단 전부. `resolveTeacher(roster, ...keys)` — 차례대로 명단에 있는 첫 키의 항목, 없으면 undefined.
- `src/server/teacher/index.ts`(신규 · `import "server-only"`): `rosterOf()`(loadSeedList("teachers")), `teacherPromptOf(t) = { nameEn, personaEn }`, `householdTeacher()`(React `cache` — 집 프로필 teacherKey → TeacherView | null, 읽기 실패는 null 이고 오류 이름만 로그).

**값 6. 고르기 액션(d2) · 지우기 액션(d6).**
- `src/server/actions/teacher.ts`(`'use server'`): `chooseTeacher({ key }) → { ok: true } | { ok: false; reason: "unknown" | "hidden" | "already" }`. 첫 문장 `await requireAccess()`(access-gate 훑기가 본다, `import { requireAccess } from "@/server/access/guard"` 꼴만 — 장부). key 를 `^[a-z]+$` 로 거름 → 명단 밖이면 unknown → 그 아이에게 보이지 않으면 hidden → `UPDATE profiles SET teacher_key = <key> WHERE id = <집 프로필> AND (teacher_key IS NULL OR teacher_key NOT IN (<명단 키>)) RETURNING id` 가 0 행이면 already(두 기기가 겹쳐도 한 번만 씀).
- `src/server/actions/teacher-preview.ts`(d6, `'use server'`): `clearTeacherForPreview() → { ok: boolean }` — 첫 문장 `await requireAccess()`, `process.env.VERCEL_ENV === "production"` 이면 `{ ok: false }`(운영 빌드에는 이 파일을 가져오는 쪽이 없다 — 관찰 쪽만 가져옴, 깊이 방어), 아니면 집 프로필 teacher_key = NULL.

**값 7. 회화 서버의 선생님(d2).**
- `src/db/schema/learning.ts` profiles 에 `teacherKey: text("teacher_key")`(비울 수 있음). Node 24 PATH 로 `pnpm db:generate --name profiles_teacher_key` → `drizzle/0004_profiles_teacher_key.sql`(`ALTER TABLE "profiles" ADD COLUMN "teacher_key" text;` 하나 — RLS 는 테이블 그대로) · meta 둘.
- `src/core/conversation/attempt.ts` talk-start 꼴에 `teacherKey: z.string().regex(/^[a-z]+$/).optional()`(옛 스냅숏도 읽힘).
- `src/server/conversation/state.ts`: `TalkState.teacher: Teacher | null` = `resolveTeacher(명단, 처음 스냅숏 teacherKey, 프로필 teacherKey)`(스냅숏 키가 명단에 없으면 프로필의 지금 선생님 — spec '세션의 선생님' 행).
- `src/server/conversation/index.ts`: (1) `TalkView` 에 `teacher: TeacherView | null` · `teacherChoices: TeacherView[]`(teacher 가 null 일 때만 — 그 아이에게 보일 선생님) · `teacherSettings: { render: "3d" | "portrait"; loadTimeoutSeconds: number; praiseSeconds: number }`(viewSettingsOf 가 talk.teacher_render · talk.teacher_load_timeout_seconds · talk.teacher_praise_seconds 를 읽음, 꼴이 틀리면 지금 설정 읽기처럼 던짐). (2) `loadTalkView`: 선생님을 먼저 정하고, null 이고 처음 스냅숏이 없으면 `ensureStarted` 를 부르지 않는다(spec '고르는 화면은 처음 스냅숏 앞'). 고른 뒤 다시 읽으면 스냅숏 · 토리 행 1 이 들어가 판(version)이 바뀐다. (3) `ensureStarted` 가 넣는 스냅숏에 `teacherKey`.
- 시험 집 기본값: `tests/e2e/household.ts` `insertHousehold({ teacherKey? })`(기본 null), `tests/e2e/talk.ts` `talkHousehold(level, { teacherKey = "mina" } = {})`, `tests/integration/talk-fixture.ts` `resetHousehold(db, level, teacherKey = "mina")` — 고르는 화면 시험만 null. 이 기본값이 d2 뒤 기존 회화 e2e · 통합을 초록으로 지킨다(선생님이 없으면 스냅숏을 넣지 않으므로).

**값 8. AI 고정부(d3).**
- `src/core/ai/calls/talk.ts`: `TalkTurnInput.teacher: { nameEn: string; personaEn: string }`. `TORI_NAME` 지움. `commonRules(teacher)` 첫 줄을 spec 블록 그대로 — `You are ${nameEn}, an AI teacher character in an English learning app for Korean children. You lead the lesson like a kind native-speaker teacher. Your personality: ${personaEn} Your personality changes only your tone and word choice. It never changes the rules below.` 'Never say you are a human.' 바로 뒤에 `Do not make up a human life for yourself (age, family, home, school). If the child asks who you are, say you are an AI teacher in this app.` 스키마 설명: tori_en `"Your English words. Empty string in the closing turn"`, recast `"The correct sentence you said back. Empty if none"`, self_used_words 의 `Tori's previous line` → `your previous line`(칸 이름 tori_en · tori_ko 는 그대로 — C130 (9)). `talkUserMessage(turn, openingLine, teacherNameEn)` 의 첫 줄 `${teacherNameEn} (app): …`. `LowLevelCheckOptions.teacherName` — 영어 힌트 · 답 예시의 낱말 범위에서 그 이름(대소문자 무시)을 {NAME} 처럼 범위 안으로(6.4 — 'Hi, Mina!').
- `src/server/conversation/state.ts` `talkInputOf`: `teacher: teacherPromptOf(state.teacher ?? 명단 첫 항목)`(드문 길 — 정할 것 11). 회화 턴 · 끝맺음 턴이 같이 쓴다(closing.ts 는 고치지 않음).
- `src/server/conversation/turn.ts`: 보낸 사용자 메시지(954행)에 `input.teacher.nameEn`, 1~3단계 AI 질문 검사(605행)에 `teacherName`.
- `src/server/ai/talk.ts`: N-1 — 끝에서 한 번에 내보내는 길(478~485행)에서 내보내기 전에 stuck 을 아직 알리지 않았고 `prepared.stuck` 이 참 · 거짓이면 `onStuck` 을 먼저 부른다. N-4 — 하루 안전 상한 닫힘의 기록(663행 `await insertAiCall`)을 `keepTurnOnRecordFailure` 로 감싼다. 단위 이름 둘(`tests/unit/conversation-stream.test.ts:115` · `talk-stream-call.test.ts:273` '첫 속성이 tori_en 이 아니면' → '앞 칸이 stuck · tori_en 이 아니면').
- 캐시: 고정부가 선생님마다 다르지만 한 대화는 스냅숏 키로 끝까지 가므로 대화 안 캐시는 그대로다(spec 'AI 호출 · 규격').

**값 9. 조사 · 문구 표 · 이름 공유(d4).**
- `src/core/teacher/name.ts`(신규 · 순수): `josa(name, pair)` — pair 는 `"이/가" | "은/는" | "와/과" | "을/를" | "아/야"`. 끝 글자가 받침 있는 한글 음절이면 앞 것(이 · 은 · 과 · 을 · 아), 아니면 뒤 것. `TEACHER_FALLBACK_NAME = "선생님"`. 아이 화면 소스는 아래 `TEACHER_TEXT` 만 쓰고 이름이 없으면 '선생님'이다(4절 머리 문단).

| 키 | 글(이름이 미나일 때 · 고르기 전) | 쓰는 곳 | 정본 |
|---|---|---|---|
| thinking(n) | 미나가 생각하고 있어요 · 선생님이 생각하고 있어요 | 말풍선 기다림 5초 뒤 | 4절 선생님 차례 |
| replay(n) | 미나 말 다시 듣기 | 말풍선 접근 이름 | 4절 |
| windowName(n) | 미나 선생님 | 선생님 창 이름표 · 접근 이름 | 4절 선생님 창 |
| promiseLabel | 선생님의 약속 | 아래 줄 이름 | 4절 아래 줄 |
| promise(n) | 미나는 집 · 학교 · 전화번호를 묻지 않아요 · 부모님도 볼 수 있어요 | 아래 줄 | 4절 |
| stopConfirm(n) | 미나와 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요 | '그만하기' 확인 | 3.3 |
| notHeard(n) | 미나에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요 | 인식 오류 | 7절 |
| intro(n) | 미나는 앱 속 AI 선생님이에요. / 미나는 오늘 이야기에 나오는 것만 물어요. / 집 주소, 학교 이름, 전화번호는 묻지 않아요. / 미나는 지난 이야기를 조금 기억해요. / 미나와 나눈 이야기는 부모님도 볼 수 있어요 | 처음 회화 안내(다섯 줄 — 지금 TALK_START_TEXT.intro 꼴) | 3.3 |
| followGuide(n) | 미나를 따라 말해 봐요 | 따라 말하기 안내 | 4절 머리 문단 규칙 |
| aiRest(n) | 미나가 잠깐 쉬어요. 다른 공부를 해 볼까요 · 선생님이 잠깐 쉬어요. 다른 공부를 해 볼까요 | 'AI 쉬는 중' · 1-가 상한(모든 영역) | 8절 · C123 |
| friendship(n) | 미나와 친한 정도 | 마무리 셋째 장 | 3.5 · 4절 규칙 |
| needsSpeaking | 말하기에서 단계를 찾으면 회화 선생님을 만날 수 있어요 | 홈 배치 전 | 4절 |
| meetTeacher | 이제 회화 선생님을 만날 수 있어요 | 배치 결과(말하기) | 4절 |
| firstRunEnglishName · firstRunNickname | 선생님이 부를 영어 이름 · 선생님이 부를 다른 영어 이름(별명)을 골라 주세요 | 첫 실행 | 4절 |
| chooseTitle · chooseGreet · chooseParents | 선생님을 골라요 · 인사 듣기 · 고른 선생님은 부모님이 바꿀 수 있어요 | 고르는 화면 | 4절 |
| chooseGo(n?) | 미나 선생님과 할래요 · (고르기 전) 선생님과 할래요 | 큰 단추 | 4절 · (제안 — 정본 밖 문구) |
| chooseGreetLabel(n) · chosen · chooseRetry | 미나 인사 듣기 · 골랐어요 · 다시 골라 주세요 | 고르는 화면 | (제안) |
| talkLockWords(n) · talkWordPractice(n) | 미나와 며칠 더 이야기하면 열려요 · 내일 미나와 또 이야기해요. 아직 덜 익은 말을 미나가 물어볼 거예요 | 수업 목록(회화) — P12 가 씀 | 4절 |
| recastTitle(n) · story · storyListen | 미나가 바꿔 말해 준 문장 · 선생님 이야기 · 선생님 이야기 듣기 | 마무리 둘째 장 · 홈 카드 · 마무리 셋째 장 — P13c 가 씀 | 4절 |
| probeClear | 이 프로필의 선생님 지우기 | 관찰 쪽 | 4절 |

- 받침 있는 이름(시험 이름 '준')이면 '준이 생각하고 있어요' · '준은' · '준과' · '준을', '선생님'이면 '선생님이 잠깐 쉬어요'(AC-19c).
- `src/components/teacher/teacher-provider.tsx`(신규 `'use client'`): `TeacherProvider value={TeacherView | null}` · `useTeacher()` · `useTeacherName()`(없으면 undefined → 문구가 '선생님').
- `src/app/(child)/layout.tsx`: 서버에서 `householdTeacher()` 를 읽어 `TeacherProvider` 로 감싼다(읽기 실패 null — 화면은 '선생님').
- 바꾸는 자리: `ai-rest.tsx` 9행 → `TEACHER_TEXT.aiRest(name)`(prop `teacherName` 이 있으면 그것 — 회화 틀은 세션 선생님을 넘김), `tori.tsx` TORI_TEXT 지움(ToriWaiting · ToriBubble 에 `teacherName` prop — thinking · replay), `talk-frame.tsx` TALK_TEXT promiseLabel · promise · stopConfirm → 표, `follow-along.tsx` TALK_START_TEXT.intro → `TEACHER_TEXT.intro(name)` · FOLLOW_TEXT.guide → `followGuide(name)`, `child-turn.tsx` 43행, `closing-cards.tsx` 35행, `home-cards.tsx` 45행, `placement-flow.tsx` 69행(meetTori → meetTeacher), `first-run-flow.tsx` 69 · 70행. 회화 틀 안 문구의 이름은 `view.teacher?.nameKo`(세션 선생님 — 처음 스냅숏), 그 밖은 공유 값.
- 훑기 `tests/unit/teacher-scan.test.ts`(TypeScript 컴파일러 API 로 문자열 · 템플릿 · JSX 글만 — 주석은 보지 않음): `src/app/(child)` · `src/app/(setup)` · `src/components` · `src/core/teacher` 의 화면 글자에 '토리'가 없다(AC-19c). 같은 파일에 `src/lib/speech/`(가짜 빼고) · `src/components/teacher/` 에 `audioSession` 쓰기(`audioSession.type =` · `audioSession =`)가 없다(AC-19g — 관찰 쪽 `src/app/dev/speech-probe/` 는 범위 밖).

**값 10. 고르는 화면(d6).**
- `src/components/teacher/teacher-choice.tsx`(신규 `'use client'`): props `{ choices: TeacherView[]; speech: SpeechPort | undefined; rate: number; onChosen: () => void }`. 꼴: 제목(Jua) '선생님을 골라요' → 장(연두 포스트잇 `bg-postit-talk`, 모두 같은 크기 — C114, 둘이면 가로 · 세로 모두 두 칸 나란히) → 큰 단추 → '고른 선생님은 부모님이 바꿀 수 있어요' 한 줄. 장 안: 누름 자리(`button aria-pressed` — 초상 160px · 한글 이름 36px · 성격 세 낱말 칩 · 소개(줄바꿈 그대로)), 그 아래 작은 '인사 듣기'(보드 작은 단추, 접근 이름 '[이름] 인사 듣기' — 누름 자리 안에 단추를 넣지 않음). 골라진 장은 굵은 테(먹색 4px) + '골랐어요' 표지(색만으로 가르지 않음). 큰 단추는 고르기 전 흐림 '선생님과 할래요', 고르면 '[이름] 선생님과 할래요'. '홈'은 위 띠의 작은 '홈' 하나(4절 '구석에 작은 홈' — 한 화면 '홈' 하나).
- '인사 듣기': 누름 처리 안에서 `speech.unlockFromGesture()` 뒤 `speech.speak(greetingEn, { rate, pitch: t.voice.pitch, voicePrefer: t.voice.prefer })`(rate 는 세션 단계 구간 값). 영어 글은 화면 · 접근 이름 어디에도 없다(T2).
- 큰 단추: `chooseTeacher({ key })` → ok · already 면 `onChosen()`(회화 틀이 `router.refresh()` — 새 자료에 선생님 · 스냅숏), unknown · hidden 이면 '다시 골라 주세요' 한 줄과 골라진 표시를 지움.
- 속성: 화면 `data-teacher-choice`, 장 `data-teacher-card="<키>"`, 골라진 장 `data-teacher-chosen`.
- `src/components/teacher/teacher-portrait.tsx`(신규): `TeacherPortrait({ teacher: TeacherView | null; size })` — 초상 `<img src="/<portraitPath>" alt="" …>`(이름이 옆에 있어 꾸밈), null 이면 글자 동그라미 '선'(Jua · 연두 바탕 · 먹색 테 — 지금 ToriFigure 동그라미 꼴). P13c 의 홈 회화 카드 · 선생님 이야기 · 평가 대화도 이 조각을 쓴다.
- `talk-frame.tsx`: 몸 차례 blocked → resting → `!view.teacher` 면 `<TeacherChoice …/>` → `!started` TalkStart → 처음 마이크 안내 → 토막(3.3 여는 차례 · C130 (8)). `ready` 에 `view.teacher !== null` 을 더함.

**값 11. 선생님 상태 · 움직임 · 차례 번호(d5) — `src/core/teacher/state.ts`(신규 · 순수).**
- `TEACHER_STATES = ["idle", "speaking", "listening", "praise", "thinking"] as const` · `TeacherState`.
- `teacherStateOf({ listening, thinking, speaking, praiseUntil, now })` — 듣기 → 생각 → 말하기 → 칭찬(now < praiseUntil) → 쉬기, 앞이 이긴다. `praiseUntilOf(now, praiseSeconds)`.
- `sampleMotion(state, seconds, reduced) → { headX; headY; headZ; bodyX; bodyY; smile; mouth }` — 시제품 `prototypes/teacher-avatar/src/motion.js` 그대로(진폭 · 주기는 이름 붙인 화면 꼴 상수 묶음 `MOTION` — C72). 모르는 상태는 쉬기, 움직임 줄이기면 시간 0 으로 몸 · 고개를 멈추고 입만 시간대로.
- `blinkAt({ elapsed, blinkStart, reduced }) → number` — 시제품 tick 의 깜빡임 셈(0.18초 사인 곡선)을 순수 함수로 옮김. 움직임 줄이기면 늘 0(AC-19h '깜빡임이 0'). 다음 깜빡임 간격(3~6초)은 그림 층이 정한다.
- `createLoadTurn() → { next(): number; isCurrent(n): boolean }` — 늦게 온 불러오기 버림(시제품 generation).
- 단위 `tests/unit/teacher-state.test.ts`: 시제품 시험 다섯(`test/motion.test.js` — 말하기 밖 입 0 · 말하기 입 0.3 넘는 때가 있고 0~0.65 · 움직임 줄이기면 몸 그대로 입만 · 듣기 고개 · 칭찬 웃음 · 모르는 상태 = 쉬기)을 같은 뜻으로, 상태 차례 · 칭찬 끝 · 깜빡임(움직임 줄이기면 0) · 차례 번호.

**값 12. 목소리 · 음성 층(d5).**
- `src/core/teacher/voice.ts`(신규 · 순수): `preferredVoice(voices, lang, prefer)` — lang 이 같은(소문자 · '_'→'-') 목소리 가운데 prefer 조각 차례로 이름에 그 조각(대소문자 무시)이 든 첫 목소리, 없으면 undefined(부르는 쪽이 pickVoice).
- `src/lib/speech/types.ts`: `SpeakOptions = { rate?: number; pitch?: number; voicePrefer?: readonly string[]; onStart?: () => void }`. 기록 'speak' 줄에 `pitch?`.
- `src/lib/speech/browser.ts` speak: 목소리 = `(voicePrefer?.length ? preferredVoice(voices, settings.lang, voicePrefer) : undefined) ?? pickVoice(voices, settings.lang)`, pitch 를 넘긴 때만 `utterance.pitch`, `utterance.onstart` 에서 기록 뒤 `options?.onStart?.()`. `unlockFromGesture` 는 그대로(시작 알림을 넘기지 않음 — 잠금 풀기는 세지 않는다). navigator.audioSession 은 건드리지 않는다(C109).
- `src/lib/speech/teacher.ts`(신규): `teacherSpeech(port, { pitch, voicePrefer, onSpeaking })` — speak 마다 pitch · voicePrefer 를 넣고, 시작 알림에 `onSpeaking(true)`, 시작했던 발화의 결과(끝 · 취소 · 오류 · 미지원)에 `onSpeaking(false)`(시작한 발화 수를 세어 겹침에도 맞게). 빠르기는 부르는 쪽 값 그대로(선생님은 바꾸지 않음 — C125). 나머지(듣기 · 장치 · 마이크 · 닫기)는 그대로 넘김.
- `src/lib/speech/fake-web-speech.ts`: `FakeSpeechRecord` 에 `pitches: number[]` · `voices: (string | null)[]`(spoken 과 같은 차례). 시작 알림 없는 발화는 지금 대본의 `neverStart`.
- 단위: `tests/unit/teacher-voice.test.ts`(AC-19j — 순서 · en-US 만 · 없으면 undefined), `tests/unit/speech-speak.test.ts` 더함(높이 · 목소리 순서 · 시작 알림 · 잠금 풀기는 알림 없음), `tests/unit/teacher-speech.test.ts`(시작 알림 없는 발화는 말하기가 아님 · 끝 · 취소 · 오류 뒤 꺼짐 · 겹침).

**값 13. 선생님 창(초상) · 레이아웃 · 상태 연결(d7).**
- `src/components/teacher/teacher-window.tsx`(신규 `'use client'`): `TeacherWindow({ teacher, state, reducedMotion })` — `<figure data-teacher-window data-teacher-key data-teacher-state data-teacher-render data-teacher-fallback? role="img" aria-label={windowName}>`. 보드에 붙인 사진 꼴(종이 테 6px · 위 테이프 — 지금 회화 판 테이프와 같은 꼴), 안 바탕 `teacher.color.room`, 안에 초상(object-cover — 썸네일이 얼굴 정면), 초상일 때 상태 표시: 말하기 = 창 둘레 물결(`motion-safe:animate-ping`), 생각 = 점 셋(`motion-safe:animate-bounce`), 칭찬 = 작은 별 표지(lucide Star 32px) — 움직임 줄이기면 멈춘 꼴, `data-teacher-indicator`. 이름표(figcaption) `teacher.color.accent` 바탕 · 종이색(#fffdf7) 글자 Jua 24px '[이름] 선생님'. 넘김 효과(transition)를 두지 않는다.
- 크기(화면 꼴 상수, 제안): 가로 화면 260 × 300px, 세로 화면 200 × 240px — 화면 검토에서 고친다.
- `talk-frame.tsx` 레이아웃: 몸(body) 밖에 늘 같은 자리의 '선생님 칸'을 둔다(같은 키 · 같은 자리 — 토막 · 정리로 바뀌어도 다시 만들지 않음). `windowShown = view.teacher !== null && !blocked && !resting && stage !== "closing"` — 고르는 화면 · 막힘 · 쉼 · 마무리 세 장에는 없고 '시작!' 화면에는 있다(4절 '처음 회화'). 가로: [왼쪽 칸 260px = 창 + 그 아래 '오늘 이야기 목록'(대화 판이 보일 때)] [대화 판]. 세로: 위 띠 아래 한 줄 [창 | 오늘 이야기 목록], 그 아래 대화 판(정할 것 7).
- 상태 연결: `toriState` → `teacherStateOf({ listening, thinking: waitingSince !== null, speaking: speakingNow, praiseUntil, now })`. `speakingNow` 는 회화 틀의 음성 접점을 `createBrowserSpeech` 바로 뒤 `teacherSpeech` 로 감싸서 받는다 — 회화 틀 · 따라 말하기 · 아이 차례 힌트 듣기 · 마무리 단어 듣기가 모두 같은 접점이라 선생님 목소리 · 시작 알림이 한 곳에서 나온다(읽기 · 쓰기 · 말하기 세션은 감싸지 않음).
- 칭찬: (1) `FollowEnv` 에 `onPraise()` — 오늘 쓸 말 · 말해 보기 · 정리 결과 말이 '잘 말했어요'(follow-along 의 phrase "good")일 때. (2) 끝 줄에서 목표 턴이 이번 턴에 처음 참이 되면 그 턴 읽어 주기 줄이 비는 때. 둘 다 `praiseUntil = now + talk.teacher_praise_seconds × 1000` 이고 끝날 때 다시 그리는 타이머를 둔다. 5~7단계 미션 체크는 P13c(넘김 — 같은 `praise()` 를 부름). 대화 토막 아이 턴의 맞고 틀림에는 묶지 않는다(R2).
- `tori.tsx` ToriFigure · ToriState 지움. `follow-along.tsx` TalkStart 의 그림 지움(창 칸이 맡음).
- 디자인 리뷰 2 N-3: `src/components/board/board.tsx:84` 띠 왼쪽 묶음에 `min-w-0 flex-1`(재검토 권고 그대로 — 네 영역 띠가 같은 코드라 사진을 다시 본다).
- e2e WebGL 끔: `tests/e2e/fixtures.ts` 에 선택 `webgl: "off" | "on"`(기본 off). off 면 쪽 시작 스크립트로 `HTMLCanvasElement.prototype.getContext` 가 `webgl` · `webgl2` · `experimental-webgl` 에 null(`speechPage` 도 같게). 3D 프로젝트만 on(d9). d8 앞이라 지금은 그림 층이 없어도 창이 초상이다.

**값 14. 3D 그림 층 · 보관 조각(d8).**
- `src/components/teacher/avatar-3d.ts`(신규 — 동적 가져오기로만): 시제품 `src/teacher-avatar.js` 를 TypeScript 로. 캔버스 하나에 VRM 하나, `WebGLRenderer({ canvas, alpha: true, antialias: true })`, 화소 비율 `min(devicePixelRatio, PIXEL_RATIO_MAX = 1.75)`, 빛 셋 · 카메라 framing · lowerArms · `VRMUtils.rotateVRM0` · `combineSkeletons` · frustumCulled false · lookAt 대상 카메라, 장마다 `sampleMotion` · `blinkAt`(core) · 섞기 `1 - exp(-delta × BLEND_RATE)`(7) · 깜빡임(움직임 줄이기면 0) · 표정 blink · happy · aa · oh · ee, 쪽이 숨으면 그리지 않음(document.hidden), 그린 장 수를 1초마다 `canvas.dataset.teacherFrames`. 바꿀 것: (1) `load(url, signal)` = `fetch(url, { signal })` → `arrayBuffer()` → `GLTFLoader.parseAsync(buffer, "")`(AbortController 로 멈춤) (2) 첫 장을 그리면 `onFirstFrame()` (3) 맥락 잃음 · 장 그리기 안 오류는 `onFailure(reason)`(다시 불러오기 안내 없음 — C122) (4) `dispose()` 는 한 번만, 뒤에 `momo:teacher` { type: "dispose" } (5) 크기는 붙인 칸을 ResizeObserver 로. 상수(그리기 빈도 — 매 장 · 화소 비율 1.75 · 섞기 7 · 깜빡임 간격 3~6초)는 시제품 값이고 iPad 실측 뒤 고친다(d10).
- `src/core/teacher/layer.ts`(신규 · 순수): 그림 층 판정 `layerStep(state, event)` — 사건 start · setting-portrait · no-webgl · import-failed · load-failed · timeout · context-lost · first-frame · close, 상태 `{ render: "3d" | "portrait"; fallback?; turn }`. 한 번 초상으로 가면 그 세션 끝까지 초상, 늦은 차례 번호의 사건은 버림. 단위 `tests/unit/teacher-layer.test.ts`(AC-19i 차례 번호 · 다섯 까닭).
- `src/components/teacher/teacher-layer.tsx`(신규 `'use client'` — 그림 층 보관 조각 `TeacherLayerHost` + 공유 값 `useTeacherLayer()`): 세션 쪽에서 키가 판(version)인 회화 틀 바깥에 둔다 — `<TeacherLayerHost key={세션 id} teacher={talk.teacher} settings={talk.teacherSettings}><TalkFrame key={talk.version} view={talk} /></TeacherLayerHost>`. 회화 틀이 판 바뀜으로 다시 그려져도 그림 층은 세션에 하나다(FR-6). 하는 일: teacher 가 생기면('시작!' 화면부터) (1) talk.teacher_render 가 portrait → setting (2) `document.createElement("canvas").getContext("webgl2")` 가 null → no-webgl(three r180 은 WebGL 2 만 — 맥락을 바로 놓음) (3) `import("@/components/teacher/avatar-3d")` 실패 → load-failed (4) 받기 · 풀기 실패 → load-failed, talk.teacher_load_timeout_seconds 안에 첫 장이 없으면 AbortController 로 멈추고 timeout, 맥락 잃음 · 그리기 오류 → context-lost (5) 판정은 `layerStep`, 늦은 결과는 차례 번호로 버림 (6) `close()`(마무리 세 장에 들어갈 때 회화 틀이 부름) · 보관 조각이 사라질 때 자원 풀기 한 번. 사건 `momo:teacher` { type: "load-start" | "first-frame" | "fallback" | "dispose", reason?, ms? }.
- `teacher-window.tsx`(d8 몫): 공유 값이 3d 이고 회화 틀이 `started`('시작!'을 누른 뒤)면 그림 층 캔버스를 창 안 칸에 붙이고 초상을 숨긴다(넘김 효과 없음). '시작!' 화면은 3D 가 먼저 되어도 초상이다(정할 것 8).
- `talk-frame.tsx`(d8 몫): stage 가 closing 이 되면 `layer.close()`, 상태 · 움직임 줄이기를 그림 층에 넘김.
- `src/app/(child)/session/[id]/page.tsx`: 회화일 때 보관 조각으로 감싼다(읽기 · 쓰기 · 말하기 세션은 그대로 — 3D 코드를 받지 않음).

**값 15. 정적 자산 제공 · 판 · 의존 규칙(d8).**
- `package.json`: dependencies `three@0.180.0` · `@pixiv/three-vrm@3.5.5`(시제품과 같은 판 — 10절 '판은 plan 이 고정'), devDependencies `@types/three@0.180.0`. `pnpm-lock.yaml`. 설치 스크립트가 없는 꾸러미라 `onlyBuiltDependencies` 는 그대로(추측 — 설치 때 확인).
- `src/proxy.ts` 거르는 목록(62행) 제외에 `teachers/`. `tests/unit/access-gate.test.ts` 의 '타지 않는' 목록에 `/teachers/mina.1a2b3c4d.vrm`.
- `next.config.ts` `headers()`: source `/teachers/:path*` → `Cache-Control: public, max-age=31536000, immutable`.
- `.dependency-cruiser.cjs` 새 규칙 둘: `three-only-in-avatar`(src 의 `src/components/teacher/avatar-3d.ts` 밖에서 three · @pixiv/three-vrm 가져오기 금지) · `avatar-only-dynamic`(avatar-3d.ts 를 동적 가져오기 밖으로 가져오기 금지 — dependencyTypesNot ["dynamic-import"], 갈래 이름은 구현하며 확인). `tests/unit/dependency-rules.test.ts` 확인.
- `CREDITS.md` 라이브러리 줄: three 0.180.0(MIT) · @pixiv/three-vrm 3.5.5(MIT) — 앱 안 표시는 2차(C65).

**값 16. 관찰 쪽 `/dev/teacher-probe`(d6 · d8 — 프리뷰 배포만, page.preview.tsx 길).**
- d6: '이 프로필의 선생님 지우기'(clearTeacherForPreview) + 결과 한 줄('지웠어요 · 다음 회화에서 다시 골라요'), 목소리 목록 표(en 으로 시작하는 목소리 — 이름 · 언어 · 기본 · 기기 안) + '목록 복사'(클립보드 — 요청자가 대화창에 붙여 넣어 리오 · 미나 목소리 순서를 정함).
- d8: '3D 보기' — 명단 선생님 고르기 · 선생님 창(보관 조각) · 불러오기 ms · 첫 장 ms · 초당 장 수(data-teacher-frames 차이) · 대신 표시 까닭 · 지금 talk.teacher_render 값 — AC-N11 점검표 칸을 그대로 적을 수 있게.
- 관찰 도구라 아이 화면 원칙 밖이다(speech-probe 와 같음). 운영 빌드에는 없다(next.config `pageExtensions` — 단위 `tests/unit/next-config.test.ts`).

**값 17. e2e 3D 일 · 번들 검사(d9).**
- `playwright.config.ts`: 새 프로젝트 `teacher-3d-chromium`(devices["Desktop Chrome"] · viewport TABLET_10_9_VIEWPORT · `webgl: "on"` · launchOptions.args `["--enable-unsafe-swiftshader", "--use-angle=swiftshader"]` · testMatch `teacher-3d.spec.ts`). 기본 프로젝트 testIgnore `teacher-3d.spec.ts`.
- `.github/workflows/ci.yml`: `e2e` 일은 `pnpm e2e --project tablet-10-9-webkit`, 새 일 `e2e-3d`(chromium 설치 · `pnpm e2e --project teacher-3d-chromium` · 사진 e2e-3d-photos · E2E_PHOTOS=1). 러너가 WebGL 맥락을 못 만들면 시험이 실패로 남는다(9절 — 건너뛰지 않음). 합침 필수 검사로 둘지는 첫 결과를 본 뒤 컨트롤러(정할 것 12). `bundle-secrets` 일 끝에 `pnpm check:teacher-bundle`. `tests/unit/ci-workflows.test.ts` 확인.
- 3D 시험은 시험 안에서 `withHouseholdSetting("talk.teacher_load_timeout_seconds", 60, …)`(소프트웨어 그리기가 느림 — timeout 시험만 짧게), 모델은 저장소의 줄인 모델.
- `scripts/check-teacher-bundle.ts`(신규, `pnpm check:teacher-bundle`): `pnpm build` 뒤 `.next/static/chunks/**/*.js` 가운데 표지 글 `VRMC_vrm` 또는 `THREE.WebGLRenderer` 가 든 조각 = 3D 조각(크기 합을 출력 — '3D 묶음 크기 기록'). `.next/server/app/**/page_client-reference-manifest.js` 마다 처음 받는 조각(`entryJSFiles` 의 값 + `clientModules` 가운데 `async: false` 의 chunks)과 `build-manifest.json` rootMainFiles 에 3D 조각이 있으면 종료 1(경로 이름만), 3D 조각이 0 이거나 목록 파일이 없으면 종료 2. 순수 함수(목록 읽기 · 표지 찾기)를 내보내 `tests/unit/check-teacher-bundle.test.ts`. `/session/[id]` 도 처음 받는 조각에 3D 가 없어야 한다(회화도 동적 가져오기).

### 정본 밖 문구(제안 — 컨트롤러 승인으로 정함)

| 자리 | 글 | 까닭 |
|---|---|---|
| 고르는 화면 큰 단추(고르기 전, 흐림) | 선생님과 할래요 | 규칙대로 [이름]='선생님'이면 '선생님 선생님과 할래요'가 된다 |
| 골라진 표지 | 골랐어요 | 굵은 테와 함께 — 색만으로 가르지 않음 |
| '인사 듣기' 접근 이름 | [이름] 인사 듣기 | 장마다 같은 글의 단추라 |
| 고르기 실패(명단 밖 · 보이지 않음 — 드묾) | 다시 골라 주세요 | already 는 글 없이 새로 읽음 |
| 관찰 쪽 | 지웠어요 · 다음 회화에서 다시 골라요 · 목소리 목록 · 목록 복사 · 3D 보기 · 불러오기 · 첫 장 · 초당 장 수 | 관찰 도구(프리뷰만) |

## 작업 순서 (Order of work)

> **C142(요청자 2026-10-23 13:1x) — 검토 묶기**: 구현은 쉬지 않고 이어 가고, 코드 검토는 d1 · d2 · d5 → d3 · d4 · d6 → d7 · d8 세 번으로 모으고, 화면 검토는 프리뷰 직전(d8 뒤, CI 사진 + 로컬 3D 사진)에 한 번 한다. 아래 차례의 '코드 검토 · 화면 검토' 줄은 이 묶음 검토로 읽는다. 동시 서브에이전트는 다섯까지.
>
> **컨트롤러 덧(2026-10-23 13:3x~13:5x)**: (1) d6 관찰 쪽에 '단원 바로 가기'(영역 · 1단계 단원을 골라 지금 단원으로 — 프리뷰 전용, 운영 거부, 기존 단원 시작 길 재사용)를 더한다 — 단원 통과(P12) 전에도 진짜 자료의 단원 2~5 를 프리뷰에서 쓰게. (2) 고르기 성공 뒤 router.refresh(d4 보고). (3) 검토 묶음은 d1 · d2 · d5 → d3 · d4 → d6 · d7 · d8 로 고침(d6 을 기다리지 않고 d3 · d4 먼저).


구현자는 implementer(Opus · high), 코드 검토는 code-reviewer(Opus · xhigh), 화면이 있는 묶음은 design-reviewer(Fable · max)도 — 호출마다 model · effort 를 적는다(CLAUDE.md). fix 라운드는 3회까지. 묶음마다 관문(Node 24 PATH — `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`): `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps`(장부 '시드 코드 브리프 · 검토 관문에 check:deps') · `pnpm seed:validate` · `pnpm check:ids`, 통합 · e2e 는 CI(이 Mac 은 새 Postgres 가 뜨지 않음). 커밋 · push 는 요청자 지시 때(CLAUDE.md — 프리뷰는 C139).

0. [컨트롤러] plan 승인(정할 것 권함대로) · 13절 한 줄(정할 것 1) · 브리프 d1 · d2 · d5. 완료: 13절 줄 · 브리프 셋.
1. **d1 자산 · 명단 · 자산 검사**(∥ d5)
   1. [검증] `src/core/seed/vrm.ts` · `scripts/teacher-reduce.ts` 의 순수 함수 · 단위(teacher-vrm · teacher-reduce). 완료: 단위 초록.
   2. [시드] Node 24 PATH 로 `pnpm teacher:reduce --key mina --src <원본> --write` · leo 같게 → `public/teachers/` 파일 넷 · 명단 model · portrait · source.reduction · voice · nameKoWordExceptions 채움 · 규격 필수(값 2). 2048 표본은 `--max-texture 2048 --out tests/.tmp/teacher-2048` 로 만들어 크기만 보고에. 완료: `pnpm seed:validate` 오류 0, 1024 표본 두 파일이 8MB 안. **여기까지 커밋되면 d2 를 띄운다.**
   3. [검증] 빼는 낱말 칸 · 대비 짝 · 자산 검사(값 2 · 4) · validate · seed-validate 연결 · `tests/unit/seed-teacher.test.ts`. 완료: 깨뜨린 가짜 자료마다 거부 하나 · 실제 파일 통과.
   4. [문서] CREDITS.md '회화 선생님' 절. 완료: 자산 검사 (f) 통과.
   5. [검증] 관문 · 코드 검토.
2. **d5 목소리 · 상태 순수 · 음성 층**(∥ d1 · d2 · d3 · d4 — 파일이 겹치지 않음)
   1. [순수] `src/core/teacher/state.ts` · 단위(시제품 다섯 포함). 2. [순수] `voice.ts` · 단위. 3. [음성] types · browser · fake · teacher.ts · 단위(speech-speak · teacher-speech). 4. [검증] 관문 · 코드 검토. 완료: 단위 초록 · navigator.audioSession 쓰기 없음.
3. **d2 DB · 명단 서버 · 고르기 · 회화 화면 자료**(d1 차례 2 뒤)
   1. [DB] profiles.teacherKey · `pnpm db:generate --name profiles_teacher_key`. 완료: SQL 한 줄 · tsc.
   2. [서버] seed-lists teachers · tracing · `src/core/teacher/roster.ts` · `src/server/teacher/index.ts` · 단위 teacher-roster. 완료: 보일 선생님 · 셋째 항목.
   3. [서버] chooseTeacher · 통합 `tests/integration/teacher.test.ts`. 완료: 401 · unknown · hidden · already · 겹침.
   4. [서버] attempt 꼴 · TalkState.teacher · TalkView · loadTalkView · ensureStarted · 통합 conversation-session. 완료: 스냅숏 키 · 선생님 없으면 스냅숏 미룸.
   5. [검증] 시험 집 선생님 기본값(e2e household · talk, 통합 talk-fixture). 완료: CI 기존 회화 e2e · 통합 초록.
   6. [검증] 관문 · 코드 검토 → [컨트롤러] 개발용 DB 0004 + 설정 키 다섯(최단 차례 3).
4. **d3 AI 고정부**(d2 뒤, ∥ d4)
   1. [서버] 고정부 · 스키마 설명 · 사용자 메시지 · 낱말 범위 이름 · 단위 conversation-call. 2. [서버] talkInputOf · turn · 통합 conversation-turn · conversation-call · 견본 입력(sample-inputs). 3. [서버] rev-p13b N-1 · N-4 · 단위 이름 · 단위 talk-stream-call. 4. [검증] `pnpm ai:contract --dry-run`(요청 꼴) · contract ai-schemas 확인 · 관문 · 코드 검토. 완료: 'Tori' · 'squirrel' 없음 · 블록 밖 같음 · 이어 하기 스냅숏 키.
5. **d4 이름 자리 문구**(d2 뒤, ∥ d3)
   1. [화면] `src/core/teacher/name.ts` · 단위 teacher-name. 2. [화면] provider · (child) layout · AiRest. 3. [화면] 회화 화면 글(tori · talk-frame · follow-along · child-turn · closing-cards). 4. [화면] 홈 · 배치 · 첫 실행 글. 5. [검증] teacher-scan · talk-follow · talk-bubble · e2e 문구 상수(conversation · first-run · home · placement · writing). 6. [검증] 관문 · 코드 검토 · 화면 검토(CI 사진 — 글자만 바뀐 화면). 완료: '토리' 훑기 0 · CI 초록.
6. **d6 고르는 화면 · 관찰 쪽**(d4 · d5 뒤)
   1. [화면] teacher-portrait · teacher-choice · talk-frame 고르기 차례. 2. [서버] teacher-preview 액션 · 관찰 쪽(지우기 · 목소리 목록) · 통합(운영 거부) · 단위 next-config. 3. [검증] e2e teacher-choice · 사진 `teacher-choice`(가로 · 세로) · 관문 · 코드 검토 · 화면 검토. 완료: AC-19b e2e 초록.
7. **d7 선생님 창(초상) · 상태 · 칭찬**(d5 · d6 뒤)
   1. [화면] teacher-window(초상 · 표시 · 이름표). 2. [화면] talk-frame 칸 · 상태 · 음성 감싸기 · 칭찬 · onPraise. 3. [화면] tori · follow-along 정리 · board N-3. 4. [검증] fixtures WebGL 끔 · e2e teacher-window · conversation(data-tori-state → data-teacher-state, 레이아웃 '보는 창 안' 단언, spokenTail 주석 — rev-p13b N-3) · 사진 `teacher-window-*`(인사 · 대화 · 칭찬 · 생각, 가로 · 세로) · 관문 · 코드 검토 · 화면 검토. 완료: AC-19c · 19g · 19h(초상 몫) · 19j e2e 초록(창은 아직 늘 초상 — 까닭 속성은 d8).
8. **d8 3D 그림 층**(d1 · d7 뒤)
   1. [화면] 판 고정 · avatar-3d.ts. 2. [순수] layer.ts · 단위 teacher-layer. 3. [화면] teacher-layer.tsx · teacher-window 3D 붙이기 · 세션 쪽 감쌈 · 마무리 닫기. 4. [화면] proxy · headers · 의존 규칙 · CREDITS 라이브러리 줄 · access-gate 단위. 5. [화면] 관찰 쪽 3D 재기. 6. [컨트롤러] 로컬 3D 눈 점검(next dev · 개발용 DB · GPU 있는 Chrome — 회화 1단계 수업: 3D 바꿈 · 다섯 상태 · 마무리 닫힘, 관찰 쪽 3D 보기 · 사진) → 화면 검토(사진). 7. [검증] e2e 기본 AC-19i(WebGL 없음 → no-webgl · 수업 정리 · 마무리까지, talk.teacher_render=portrait → setting · `.vrm` 요청 0) · 관문 · `pnpm build` · 코드 검토. 완료: 기본 e2e 초록 · 로컬 3D 눈 점검 통과.
9. [컨트롤러] 최단 차례 8~12(p08 합침 ⑤ · 실시드 전환 · 커밋 · push · 프리뷰 · 목소리 순서 손질).
10. **d9 3D e2e · 번들 검사**(d8 뒤, 9 와 나란히)
    1. [검증] playwright 3D 프로젝트 · fixtures on · ci.yml(e2e 프로젝트 고름 · e2e-3d · 번들 검사 줄). 2. [검증] `tests/e2e/teacher-3d.spec.ts`. 3. [검증] `scripts/check-teacher-bundle.ts` · 단위. 4. [검증] 코드 검토. 완료: CI e2e-3d 결과(초록이면 19f · 19h · 19i 3D 몫 증명, 러너 WebGL 이 안 되면 실패 그대로 보고 → 정할 것 12).
11. **d10 프리뷰 뒤**
    1. [사람] iPad 사파리 · 크롬 실측(AC-N11 점검표 — 관찰 쪽 3D 보기 · 교대 10턴 · 회화 1단계 수업 하나 · talk.teacher_render=portrait 로 같은 수업 하나 · talk_turns.perceived_wait_ms p95 · 발열 · 목소리 목록). 1024 표본은 프리뷰, 2048 표본은 임시 가지 프리뷰([컨트롤러] — 명단 model 칸 · 출처 문서 해시만 바꾼 가지, 합치지 않음). Safari 는 메모리 값을 주지 않으므로 '수업 하나 동안 쪽이 다시 열리지 않음'으로 대신 적는다(추측 — 실측 때 정함).
    2. [문서] 13절 한 줄(talk.teacher_model_max_mb · talk.teacher_load_timeout_seconds · 고른 표본 · 리오 목소리 순서 · 그리기 빈도 · 화소 비율) · 12절 · settings.json · 상수 · e2e 목소리 순서 길(명단 prefer 가 찬 뒤 가짜 목소리 목록으로 AC-19j 순서 길).
    3. [화면] 프리뷰 지적 손질(spec 미결 5 — 칭찬 때 · 창 크기 · '인사 듣기') · 시드 보기 이름 '토리 이야기' → '선생님 이야기'(`src/app/dev/seed-viewer/` 셋 · e2e-local) · `src/server/seed/load.ts` 370행 메시지.
    4. [문서] 완료 보고 · 장부 닫기.

## 위험 · 제약 (Risks)

### 위험

1. **기존 회화 시험이 선생님 없는 집으로 돌면 멈춘다.** d2 부터 선생님이 없으면 처음 스냅숏 · 토리 행 1 을 넣지 않는다 — d6 전에는 고르는 화면도 없다. d2 에서 e2e · 통합 회화 집에 teacher_key 'mina' 기본값을 넣는다(값 7). 되돌리기: 기본값 한 줄.
2. **talk-frame.tsx 를 네 묶음이 차례로 고친다**(d4 → d6 → d7 → d8). 나란히 두지 않는다. 묶음 사이에 컨트롤러가 합친 판을 다음 브리프의 바탕으로 적는다.
3. **회화 틀은 판(version)이 바뀌면 새로 그려진다**(세션 쪽 `key={talk.version}` — stale 되읽기 · 고른 뒤 다시 읽기). 그림 층을 회화 틀 안에 두면 다시 만들어진다(FR-6 '토막이 바뀌어도 다시 만들지 않음'). 그래서 보관 조각을 회화 틀 바깥(세션 id 키)에 둔다.
4. **원본 VRM 을 잃을 수 있다.** 원본은 본 저장소 작업 트리(추적 안 함)와 문서 가지 기록 000b3e6 에만 있다. 스크립트는 원본을 읽기만 하고, 시제품 폴더에 줄인 파일을 덮어쓰지 않는다. 잃으면 OpenGameArt 배포 파일(LICENSES.md 주소)에서 다시 받아 명단 해시로 대조한다.
5. **EXT_texture_webp.** three r180 WebP 확장은 지원 검사 없이 WebP 를 읽고, three-vrm MToon 은 GLTFLoader 로 텍스처를 받는다(코드로 확인). iPad 사파리 · 크롬에서 그려지는지는 프리뷰 · 실측에서 본다. 안 되면 다른 길 둘: 무손실 · PNG. PNG 1024 는 9.65 · 9.89MB 라 talk.teacher_model_max_mb 8 을 넘는다 — 13절 한 줄(값) 뒤.
6. **3D 묶음 크기.** three · three-vrm 동적 조각 약 700KB(압축 전, 시제품 빌드)를 회화 세션 첫 열기 때 '시작!' 화면에서 받는다. 둘째부터는 브라우저 캐시. 다른 경로는 의존 규칙 · 번들 검사가 막는다.
7. **가로 1180 × 820 높이.** 창 + 오늘 이야기 목록 칸이 몸 높이(약 550px — 820 에서 테 32 · 안쪽 여백 48 · 칸 사이 48 · 띠 약 80 · 약속 줄 약 60 을 뺀 값, 계산)에 들어가야 한다. 지금 e2e '가로 1180×820 … 보는 창 안' 단언이 지키고, 화면 검토가 크기를 고친다.
8. **개발용 DB 설정 키.** talk.teacher_* 다섯이 개발용 DB 에 없으면 회화 화면 자료를 읽다 던진다(SettingMissingError). 0004 와 함께 넣는다(최단 차례 3). 실시드 전환은 settings.json 을 함께 넣는다.
9. **p08 을 다시 합칠 때 부딪힘.** 선생님 시드 쪽 파일(check-teacher.ts · schema/teachers.ts · seed/teachers.json · structure.ts)을 p08 에서 고치면 d1 과 부딪힌다 — 선생님 몫은 p13d 에서만 고친다(컨트롤러가 p08 브리프에 한 줄).
10. **주 실행 줄(spec 우려 2).** 모델 풀기가 아이 차례 시간 재기(확인 2초 · 듣기 끝 대기)를 늦출 수 있다. 불러오기는 '시작!' 화면에서 시작해 첫 듣기 전에 끝날 때가 많다(추측). iPad 실측에서 본다.
11. **3D CI(spec 우려 11).** 러너에서 소프트웨어 WebGL 이 안 되면 19f · 19h · 19i 의 3D 몫은 로컬 눈 점검(next dev · Playwright MCP)과 프리뷰 점검으로만 남는다 — 이 Mac 은 로컬 e2e 를 못 돌린다.
12. **자원 풀기 두 번.** 마무리 닫기와 보관 조각 사라짐이 둘 다 dispose 를 부를 수 있다 — 한 번만(값 14), 사건도 한 번(AC-19h).
13. **React Compiler(reactCompiler: true).** 보관 조각 · 창의 ref · 효과가 렌더 중 ref 읽기 같은 규칙을 어기지 않게 한다. 그림 층은 effect 안에서만 만든다.
14. **proxy 를 거치지 않는 /teachers/.** 주소를 아는 누구나 모델 · 초상을 받는다 — 재배포가 허용된 공개 모델(파일 안 VRoid Hub 조건)이라 받아들인다(정할 것 6).
15. **@types/three 의 형 의존**(meshoptimizer · rapier3d-compat 등, dev 만) — 설치 시간만 는다.

### 구현하며 확인할 것

- CI 러너(ubuntu-24.04)에서 Playwright Chromium + `--enable-unsafe-swiftshader` 로 WebGL2 맥락이 생기는지(d9).
- next.config `headers()` 가 Vercel 의 public 파일 응답에도 붙는지 — 프리뷰에서 `curl -I` 로 `/teachers/…vrm` 의 Cache-Control.
- iPad 사파리 · 크롬에서 WebP 텍스처 · MToon 이 그려지는지, 3D 를 켠 채 교대 10턴(d10).
- `drizzle-kit generate --name` 꼴 · dependency-cruiser 18.6 의 dynamic-import 갈래 이름 · `@types/three` 0.180.0 과 TypeScript 5.9 strict.
- three-vrm 3.5.5 + three 0.180 콘솔 경고(시제품 Chrome 에서는 오류 기록 없음).
- `tests/contract/ai-schemas.test.ts` 가 스키마 설명 글을 견주는지 · `tests/unit/seed-validate-cli.test.ts` · `fake-web-speech-defaults.test.ts` · `ci-workflows.test.ts` · `dependency-rules.test.ts` 가 바뀐 꼴에 맞는지.
- C127 — 프리뷰 첫 실제 회화 턴의 서버 기록에서 stuck 이 tori_en 앞인지(장부 '구현하며 확인할 것', 최단 차례 12).

### 정할 것(컨트롤러 — 보고 `task-teacher-plan-report.md` 와 같은 글자)

1. **(13절 한 줄)** 명단 항목에 칸 `nameKoWordExceptions`(그 한글 이름으로 시작하는 보통 낱말)를 더한다 — 5절 명단 칸 · 6.4 '선생님 이름'. 까닭: C130 (1) '항목과 파일만 더하면 코드 고침 없이 는다'(장부 N-3). 토리 몫 '토리노'는 명단 밖이라 코드에 남는다. '리옹'은 원래 걸리지 않아 뺀다.
2. 미결 3: 제공 길 = 저장소에 넣기(`public/teachers/<키>.<8자>.{vrm,webp}`), 도구 = `scripts/teacher-reduce.ts` + libwebp 1.6.0, 값 = 텍스처 1024 · 색 WebP q85(알파 무손실) · 법선 WebP 무손실 · 썸네일 PNG 256 · EXT_texture_webp · 정점 · 뼈 · 표정 그대로, 초상 512² WebP q80. 표본 둘 = 1024(프리뷰) · 2048(iPad 실측 때 임시 가지 프리뷰).
3. 미결 6: DB · AI 스키마 · 저장 값 · 말풍선 조각과 그 속성은 그대로, ToriFigure · ToriState · TORI_TEXT · TORI_NAME · data-tori-figure/state 만 바꾸거나 지운다.
4. 화면 상태 속성 이름 — '정한 것' 절 그대로.
5. 이름표 = accent 바탕 · 종이색 글자, 명단 대비 짝을 accent ↔ #fffdf7 로(장부 M-1 닫힘).
6. `/teachers/` 를 proxy 거르는 목록에서 빼고 1년 immutable 캐시.
7. 가로 화면 '오늘 이야기 목록'을 창 아래(왼쪽 칸)로 옮김 · 창 크기 제안 값 — 화면 검토가 고침, 목업은 P6c.
8. '시작!' 화면은 초상(3D 는 '시작!' 뒤 바꿈), 마무리 세 장에 들어가면 그림 층을 닫음.
9. 명단 voice.prefer 는 프리뷰 때 요청자 iPad 목소리 목록으로 정한다(그 전 빈 목록 — 미나 · 리오는 높이만 다름, spec 우려 3).
10. 정본 밖 문구 표(제안) 그대로.
11. AI 고정부의 드문 길(스냅숏 · 프로필 키가 둘 다 명단에 없음)은 명단 첫 항목.
12. CI 새 일 `e2e-3d` 를 합침 필수 검사로 둘지는 첫 결과 뒤. AC-19i 의 '정리 · 마무리까지'는 WebGL 없음(기본) · 맥락 잃음(3D) 두 경우로 보이고, 나머지 셋(404 · 시간 넘김 · 설정)은 초상 · 까닭 속성 · 오류 글 없음 · 다음 활동으로 넘어감까지 본다 — 대신 표시가 같은 화면 길이라.
13. 회화 쪽 Minor: rev-p13b N-1 · N-4 · 단위 이름 · e2e 주석과 디자인 리뷰 2 N-3 은 이 plan 에 넣고, 디자인 리뷰 2 N-1 · N-2 · N-4 · N-5 · N-6 은 디자인 fix 2 그대로.
14. 넘김(아래 '다른 P 에 넘길 것') — 묶음 plan P12 · P13c 행에 한 줄씩(컨트롤러).
15. C136 (4): 뒤 명단 한글 이름 하나 · 준 · 나비 · 소라는 보통 낱말 그 자체라 빼는 낱말 칸으로 풀 수 없다. 명단을 늘리는 변경에서 이름을 바꾸기를 권한다(그때 요청자 · 13절).
16. d9(3D e2e · 번들 검사)는 프리뷰 길과 나란히(AC 그대로, 증명만 프리뷰 뒤).

### 제약

- 정본 · spec 을 이 plan 이 고치지 않는다. 바꿔야 하면 13절 한 줄 뒤(정할 것 1).
- 설계 숫자는 설정값이다(talk.teacher_* 다섯 · speech.rate.<구간>). 움직임 진폭 · 섞는 빠르기 · 화소 비율 · 그리기 빈도 · 창 크기는 화면 꼴 상수(C72 · spec '설정값 원칙').
- AI 호출은 서버에서만, 선생님 블록은 서버가 명단에서 만든다. 화면에는 personaEn · source 를 보내지 않는다.
- 녹음하지 않는다(듣기 상태는 표정만). navigator.audioSession 을 건드리지 않는다(C109).
- 1~3단계 영어 글을 미리 보이지 않는다(T2) — 인사는 소리만, 창에 자막이 없다.
- 칭찬을 대화 턴의 맞고 틀림에 묶지 않는다(R2).
- 아이 화면에 3D 오류 글 · 다시 불러오기 단추가 없다(C122).
- 시제품의 꾸밈 · 머리글 · 영어 자막 · 상태 이름 띠 · 빠르기 0.86 · 리오 인사의 질문은 가져오지 않는다(C115 · spec).
- 원본 모델은 저장소에 넣지 않는다. 비밀값 · 아이 이름은 대화 · 장부에 적지 않는다.

### 다른 P 에 넘길 것

- **P13c**: 홈 회화 카드 초상(`TeacherPortrait` · 공유 값 — 고르기 전 '선' 동그라미) · '선생님 이야기' 작은 단추 · 선생님 이야기 화면(초상 · 선생님 목소리 — `teacherSpeech`) · 회화 마무리 셋째 장 '선생님 이야기 듣기' · 4단계 둘째 장 `recastTitle` · 5~7단계 미션 체크 칭찬(같은 `praise()`) · 회화 평가 대화(초상 · 목소리 · 고정부는 talkInputOf 그대로) · AC-19c 홈 카드 몫 · AC-19f 이야기 · 평가 화면이 모델을 요청하지 않음 · AC-19d 수동 표본(c4 표본 평가 명령에 미나 · 리오 고정부, 대본에 'Are you a person?' · 'How old are you?').
- **P12**: 수업 목록 회화 문구 둘(`talkLockWords` · `talkWordPractice`) · 단계 평가(회화) 초상 · 선생님 목소리.
- **P6c**: 목업 캔버스에 '선생님을 골라요' · '회화 세션 선생님 창(가로 · 세로)' · '홈 회화 카드 초상'(11절 '새로 그림'). 이 plan 은 사진 검토로 갈음(plan-p13a 회15 선례).
- **1-나**: 부모 화면 선생님 바꾸기(보일 선생님만 · 다음 세션부터) · 대화 기록 화자 이름(처음 스냅숏의 선생님).
- **2차**: 앱 안 출처 표시(CREDITS 회화 선생님 절 · three · three-vrm MIT).
- **디자인 fix 2**: 디자인 리뷰 2 N-1 · N-2 · N-4 · N-5 · N-6.
- **명단을 늘리는 변경(차수 밖)**: 셋 이상일 때 고르는 화면 꼴 · 이모지 꼴(입 대신 흔들림 · 말풍선 · 소리 막대) · VRM 1.0 메타 대조 · C136 (4) 이름.

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 | 묶음 |
|---|---|---|---|
| AC-19a | 단위 '명단 검사' — 가짜 자료마다 하나씩 거부: 키 겹침 · 이름 겹침 · vocab 영어 이름 · 물음표 인사 · 성격 낱말이 셋 아님 · 이름표 대비(accent ↔ #fffdf7) 4.5 미만 · vrm 밖 꼴 · 모델 · 초상 파일 없음 · 빼는 낱말이 이름 자리 밖. 단위 '보일 선생님' — 셋째 항목을 더한 명단이면 셋. CI 시드 검증 | `tests/unit/seed-teacher.test.ts` · `tests/unit/teacher-roster.test.ts` · `pnpm seed:validate` | d1 · d2 |
| AC-19b | e2e — 선생님 없는 프로필: 막힘 · 쉼 확인 뒤 '시작!' 앞에 '선생님을 골라요'(마이크 못 씀 · 1-가 상한 날에는 막힘 · 쉼이 먼저), 미나 장 → '미나 선생님과 할래요' → teacher_key mina · 안내 '미나는 앱 속 AI 선생님이에요', 다음 회화는 고르는 화면 없이 '시작!', '인사 듣기'는 기록 pitch 1.08 · 화면에 영어 글 없음, 영어 이름 Mina 인 프로필은 리오 장만, 관찰 쪽 지우기 → 다음 회화에서 다시 고름. 통합 — 액션 쿠키 없이 401 · 명단 밖 · 보이지 않음 · 이미 고름 거부 · 두 요청 겹쳐도 한 번 · 지우기는 VERCEL_ENV=production 에서 거부 · 처음 스냅숏 키 · 선생님 없으면 스냅숏 미룸. 단위 — 운영 배포 쪽 확장자에 preview.tsx 없음 · 보일 선생님 | `tests/e2e/teacher-choice.spec.ts` · `tests/integration/teacher.test.ts` · `tests/integration/conversation-session.test.ts` · `tests/unit/next-config.test.ts` · `tests/unit/teacher-roster.test.ts` · `tests/unit/access-gate.test.ts`(첫 문장) | d2 · d6 |
| AC-19c | 단위 '조사 고르기' · '문구 표'(미나 · 리오 · 준 · 선생님 — '준이 생각하고 있어요' · '리오와 그만 이야기할까요?' · '선생님이 잠깐 쉬어요' · '미나에게 잘 안 들렸어요'). 단위 훑기 — 아이 화면 소스의 화면 글자에 '토리' 없음. e2e — 창 접근 이름 '미나 선생님' · 말풍선 '미나 말 다시 듣기' · 약속 · 그만하기 · 쉼 문구. 홈 회화 카드 몫은 P13c | `tests/unit/teacher-name.test.ts` · `tests/unit/teacher-scan.test.ts` · `tests/e2e/teacher-window.spec.ts` · `tests/e2e/conversation.spec.ts` | d4 · d7 |
| AC-19d | 단위 — 미나 고정부 첫머리 'You are Mina' · 성격 글 · 'Never say you are a human.' · 사람의 삶 줄 · 대문자 낱말 'Tori' · 'squirrel' 없음(칸 이름 tori_en · tori_ko 는 남음 — C130 (9)) · 리오로 만든 고정부와 선생님 블록 밖이 글자까지 같음 · 출력 스키마 글에 명단 이름 · Tori 없음 · 미나 · 리오 같음 · 첫 사용자 메시지 'Mina (app):' · 답 예시 'Hi, Mina!'는 낱말 범위 안. 통합(가짜 클라이언트) — 이어 하는 세션은 처음 스냅숏 키(리오)로, 스냅숏 키가 명단 밖이면 프로필 키(미나)로. 수동 표본 20 대본은 P13c c4 명령 | `tests/unit/conversation-call.test.ts` · `tests/integration/conversation-turn.test.ts` · `tests/integration/conversation-call.test.ts` | d3 |
| AC-19e | 끝남(p08 — C130 · C132 · C134 · C135). 빼는 낱말을 명단 칸으로 옮긴 뒤 같은 단위 · 시드 검증이 그대로 통과 | `tests/unit/seed-teacher.test.ts` · `pnpm seed:validate` | d1 |
| AC-19f | e2e 3D — 회화 1단계 수업 하나(인사 → 오늘 쓸 말 → 말해 보기 → 대화 → 정리) 동안 `.vrm` 요청 1 · 캔버스 1, 고르는 화면 · 마무리 · 홈은 `.vrm` 요청 0. 이야기 · 평가 화면 몫은 P12 · P13c | `tests/e2e/teacher-3d.spec.ts` | d9 |
| AC-19g | 단위 — 상태 차례 · 칭찬 시간 · 시제품 움직임 시험 다섯 · 감싸기의 시작 알림. e2e 기본 — 가짜 음성 시작 알림 뒤에만 speaking, 끝 · 취소 · 오류 뒤 아님, neverStart · 잠금 풀기에서 아님, 오늘 쓸 말 '잘 말했어요' → praise, 대화 아이 턴 뒤 목표 턴 밖 praise 없음, 목표 턴 닿은 턴 읽어 주기 뒤 praise. 단위 훑기 — 음성 층 audioSession 쓰기 없음 | `tests/unit/teacher-state.test.ts` · `tests/unit/teacher-speech.test.ts` · `tests/unit/teacher-scan.test.ts` · `tests/e2e/teacher-window.spec.ts` | d5 · d7 |
| AC-19h | 단위 — 움직임 줄이기면 sampleMotion 의 몸 · 고개 값이 시간과 관계없이 같고 말하기 입만 바뀜 · blinkAt 이 0. e2e 기본 — 움직임 줄이기 흉내에서 초상 표시가 멈춘 꼴 · 넘김 효과 없음. e2e 3D — 쪽 숨김(speech-probe 선례의 가짜 visibilitychange)에 그린 장 수 그대로 · 다시 보이면 늚, 회화를 떠나면 `momo:teacher` dispose 한 번 | `tests/unit/teacher-state.test.ts` · `tests/e2e/teacher-window.spec.ts` · `tests/e2e/teacher-3d.spec.ts` | d5 · d7 · d9 |
| AC-19i | e2e 기본 — WebGL 없음: `data-teacher-fallback=no-webgl` · 수업이 정리 · 마무리까지 · 오류 글 · 새 단추 없음 · 초상에서도 상태 속성과 말하기 · 생각 · 칭찬 표시, talk.teacher_render=portrait: setting · `.vrm` 요청 0. e2e 3D — 모델 404 → load-failed, 첫 장 시간 넘김 → timeout, WEBGL_lose_context → context-lost · 정리 · 마무리까지. 단위 — 그림 층 판정 · 늦은 결과 버림 | `tests/e2e/teacher-window.spec.ts` · `tests/e2e/teacher-3d.spec.ts` · `tests/unit/teacher-layer.test.ts` | d8 · d9 |
| AC-19j | 단위 '선생님 목소리 고르기'(순서 · en-US 만 · 없으면 pickVoice) · 음성 층(높이 · 목소리). e2e 기본 — 회화 읽어 주기 기록 pitch 1.08 · 빠르기 speech.rate.1-3 · 순서가 비면 pickVoice 목소리, 읽기 세션 읽어 주기는 pitch 1 · 순서 없음. 순서 길 e2e 는 명단 prefer 가 찬 뒤(d10) | `tests/unit/teacher-voice.test.ts` · `tests/unit/speech-speak.test.ts` · `tests/e2e/teacher-window.spec.ts` | d5 · d7 · d10 |
| AC-19k | 단위(가짜 VRM 머리글) — 해시 · 바이트 · 크기 상한 · 메타 넷 · 표정 · 뼈 · 원본 해시 · 명단 밖 .vrm · 출처 문서 칸을 하나씩 거부. CI 시드 검증(실제 파일) | `tests/unit/teacher-vrm.test.ts` · `tests/unit/seed-teacher.test.ts` · `pnpm seed:validate` | d1 |
| AC-N11 | 수동 점검표(iPad 사파리 · 크롬 — 관찰 쪽 3D 보기 · 교대 10턴 결과 10 · 멈춤 0 · 회화 1단계 수업 하나 · portrait 로 같은 수업 · 체감 대기 p95 · 불러오기 · 첫 장 · 초당 장 수 · 발열 · 목소리 목록) → 13절 값 | 장부 점검표 · `/dev/teacher-probe` | d10 |
| AC-N12 | CI 번들 검사 — 모든 경로(`/session/[id]` 포함)의 처음 받는 조각에 3D 표지 글 없음 · 3D 조각 크기 출력. 의존 규칙 — three 는 avatar-3d 만 · avatar-3d 는 동적만. e2e 3D — 선생님 그림 층 요청(코드 조각 · .vrm · 초상)이 모두 같은 출처 | `pnpm build && pnpm check:teacher-bundle` · `pnpm check:deps` · `tests/e2e/teacher-3d.spec.ts` | d8 · d9 |
| 공통 | 린트 · 형 · 단위 · 의존 · 시드 · 식별자 대조 · spec 추적 · 빌드 · 번들 비밀 · 통합 · e2e | Node 24 PATH 로 `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm seed:validate` · `pnpm check:ids` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm build` · `pnpm check:bundle`, CI(integration · e2e · e2e-3d) | 모두 |

시험 이름은 정본 번호로 시작한다(예 `test("AC-19b 선생님을 고르지 않은 프로필이 회화 수업을 열면 …")`). e2e 사진 이름: `teacher-choice` · `teacher-start` · `teacher-window-greeting` · `teacher-window-talk` · `teacher-window-praise` · `teacher-3d`(각 가로 · 세로).

## 완료 보고 (Done)

(구현 뒤 갱신 — 실제 바뀐 파일(계획과 다른 것 표시) · 시험 결과 · 남긴 것 · 프리뷰 · 13절 값)
