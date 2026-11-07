# 검토 브리프: P6b 작업 5 — 그림 카탈로그 화면 검토(design-reviewer des-p06b · Opus · xhigh, 읽기 전용, 2026-10-17 22:1x)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06b-그림-카탈로그.md` 작업 5 다. 작업 3(그림 낱말 고르기 · Twemoji 159)과 작업 4(자체 그림 48)로 만든 그림 카탈로그 207장을 **모아 보기 사진으로** 낱말 ↔ 그림, 아이 눈(한 그림 한 뜻 · 헷갈리지 않음 · 무섭지 않음), 자체 그림 품질, 라이선스 칸, 정본 규칙(C65 · plan '그림 규칙')으로 판정한다. fix 는 3회까지(고르기는 curriculum-designer, 그림은 implementer). 저장소 · 워크트리 파일을 고치지 않는다(사진 찍기 · 일회 스크립트는 된다). 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 네트워크 없음.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`(feature/1a-p06b-vocab-images, P6a 합친 d3bc9fe 위, 커밋 없음). `seed/images.json` 207행(cc_by 159 · generated 48) · `seed/vocab.json` imageKey 207 + 그림에 맞춘 예문 35 · `public/images/vocab/*.svg` 207장 · 모아 보기 `tests/.tmp/p06b/sheet.html`(키 · 낱말 · 뜻 · 그림 · 출처 · 라이선스 · 메모, 뺀 낱말 69 표) · 사진 `tests/.tmp/p06b/shot4-0.png ~ shot4-9.png`(`node tests/.tmp/p06b/shot.mjs <html> <앞이름> [높이]` 로 다시 찍을 수 있음) · 그릴 목록 `to-draw.json` · 생성기 `tests/.tmp/p06b/draw/`.
- 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06b-report.md` 의 '작업 3' · '보충 — 예문 18' · '작업 4' 절(고른 규칙 · 뺀 낱말과 까닭 · 결정 · 48장 표 · 지침 대조 · 어려웠던 낱말 — toe · head · arm · student · knee).
- 컨트롤러 판정(작업 3 뒤): hot · cold 는 뺀 채 · doctor 🧑‍⚕️ · nurse 그림 · student · white · glasses 는 자체 그림 · tired · family · strong · bank · piano · boy · girl · man · woman 은 **이 검토에서 판정** · head · hair · face 가리키기 틀(빨간 점선 동그라미)은 안 읽히면 head 뺌.
- 컨트롤러 재확인(22:1x): images:check 0(행 207 · 파일 207 · 위반 0) · seed:validate 종료 0 · test 167 · lint 0(biome.json 에 `public/images/vocab` 제외 — SVG 207장이 a11y/noSvgWithoutTitle 에 걸려서, 앱은 alt 있는 img 로 보임) · 3KB 넘는 그림 14장.

## 볼 것
1. **낱말 ↔ 그림 207**: 사진 열 장을 보고 그림이 그 낱말의 뜻(수업에서 쓰일 뜻, 뜻 칸 · 예문)을 바로 보여 주는지. 비슷한 그림으로 때운 곳(plan '출처 차례')이 없는지. 한 그림이 두 낱말에 쓰이지 않는지.
2. **아이 눈**: 헷갈리는 짝(boy · girl · man · woman, head · hair · face, sleepy · tired · sad, strong, family, bank, piano, glasses, white, student), 무섭거나 다치는 모습, 글자 · 숫자 · 상표 · 실제 인물(가게 간판 · 가수 꼴은 작업 3 이 걸러 냄).
3. **자체 그림 48**: 지침(36칸 · 평면 · 가운데 · 도형만) · Twemoji 와 어울리는 색감 · 알아보기(toe · knee · arm · head 가리키기 틀 포함). 고칠 그림은 '다시 그릴 것' 표(키 · 무엇이 문제 · 어떻게)로.
4. **뺀 낱말 69**: 까닭이 규칙(추상 · 비교 · 범주 · 관계 · 같은 그림)에 맞는지, 그림이 가능한데 뺀 것이 있는지(표본).
5. **라이선스 · 카탈로그**: Twemoji 행 source 코드 · attribution 글 · cc_by, 자체 행 self-made 날짜 · generated, 키 꼴 `^[a-z0-9-]+$`, vocab imageKey 와 1:1, 예문 35 가 그림과 맞는지 표본.
6. 작업 6(H7 표본 확인 — 요청자가 사진으로 본다)에 올릴 **사진 묶음과 요지**를 권한다: 어떤 사진 몇 장을 어떤 순서로, 요청자가 고를 것이 있다면(예: 그림 둘 가운데 하나) 번호로.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p06b-5.md`(메인 저장소): 판정(Approved · Changes requested) · 지적(심각도 Critical · Important · Minor, 근거 — 사진 파일 · 칸 · 키) · 다시 그릴 것 표 · 다시 고를 것 표 · 뺀 낱말 판정 · 라이선스 칸 판정 · 요청자 표본 묶음 권고. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
