# 재검토 브리프: P6b 작업 5 fix 1(design-reviewer des-p06b 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 22:4x)

범위 한정 재검토다. `review-p06b-5.md` 의 Important 다섯과 Minor 열하나가 fix 1 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 것(다시 그린 셋 · 다듬은 여덟 · CREDITS.md · sheet.html · 사진)에서 생긴 것만. 저장소 · 워크트리 파일을 고치지 않는다. 보고 파일 하나만.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`(커밋 없음). fix 1: catch(두 손을 가슴 앞에 모아 받음) · hungry(옆 탁자 빈 그릇 · 숟가락, 배 앞 나선 하나) · toe(foot 과 같은 옆모습 발에서 발가락 짚음) 다시 그림 · arm · neck · shoulder · student · nurse · white · skate · doll 다듬음(나머지 37장 바이트 같음) · 저장소 뿌리 `CREDITS.md`(Twemoji 159 · 자체 48 · 어휘 출처, plan 글 차례) · `tests/.tmp/p06b/sheet.html`(머리글 · 흰 보기 칸 · fan 예문 · teacher 메모 · 다시 그린 넷 메모) · 사진 `tests/.tmp/p06b/shot5-*.png` · 작업 6 용 사진 다섯 `tests/.tmp/p06b/h7/`(1-self-a · 2-self-b 200px '고침' 표시 · 3-small 64px 노랑 · 4-units 읽기 2-2 · 2-1 · 2-5 · 5-twemoji 아홉). 안 한 것: M-8 knee · M-10 예문(선택 항목이라 구현자가 뺌 — 판정해 달라).
- 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06b-report.md` 'fix 1' 절. 컨트롤러 판정: I-4 헷갈리는 짝 아홉은 ledger-open(P8 브리프 규칙: 같은 문항 보기에 함께 두지 않음, tired≠sleepy · strong≠arm) → 닫힘으로 봐도 되는지 판정.
- 컨트롤러 재확인(22:4x): images:check 0 · seed:validate 0 · test 167 · lint 0 · CREDITS.md 있음 · h7 사진 다섯.

## 볼 것
1. I-1~I-3 다시 그린 셋이 한 번에 읽히는지(catch ≠ throw, hungry = 배고픔, toe = 발가락), 지침(36칸 · 평면 · 가운데 · 도형만)과 색감. I-5 `CREDITS.md` — plan '그림 규칙 — CREDITS.md' 글 차례 · attribution 글이 plan 과 글자 그대로인지 · 수(159 · 48)가 images.json 과 맞는지 · CC-BY 4.0 주소 · '받은 SVG 를 바꾸지 않고 씀' · 어휘 출처(2022 고시 [별책 14] · CEFR-J 인용 꼴이 P6a 근거 문서와 맞는지). Twemoji README 의 정해진 인용 문장은 네트워크가 없으면 plan 글 기준으로만 보고 '미확인'으로 적는다.
2. Minor 열하나 — 다듬은 여덟 · sheet.html 둘 · 그 밖 하나씩 ADDRESSED 여부, 안 한 M-8 · M-10 이 정말 선택이었는지(아니면 Minor 로 남김).
3. 작업 6 사진 다섯이 요청자 표본 확인에 충분한지(권고 5절 그대로인지 · 크기 · 읽힘), bank 선택지 ① 🏦 ② 자체 그림이 사진에 보이는지.
4. 바뀐 그림만 다시 봤을 때 새로 생긴 문제.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p06b-5b.md`(메인 저장소): 판정(Approved · Changes requested) · 지적마다 ADDRESSED · NOT ADDRESSED 근거(사진 · 키) · 새 지적 · 작업 6 사진 판정과 요청자에게 보일 요지(한두 문장 + 고를 것). 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
