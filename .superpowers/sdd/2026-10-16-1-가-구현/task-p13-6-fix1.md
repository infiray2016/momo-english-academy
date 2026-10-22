# fix 브리프: P13b 차례 6 fix 1 — 코드 검토 b3 I 3(implementer impl-p13-2 이어 보기 · Opus · high, 2026-10-23 00:0x)

`review-p13-6-code.md`(Changes requested — I-1 · I-2 · I-3, M-1~M-4 는 문서 · c 몫으로 컨트롤러가 처리)를 읽고 셋을 고친다. 워크트리 p13 작업 트리(차례 6, 커밋 전 — CI 가지 a866ba0 과 같음). 시험 먼저. 커밋은 하지 않는다. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 화면 검토(des-p13)는 CI 10차 사진으로 나란히 — 그 지적은 fix 2 로.

| 번호 | 지적 | 할 일 | 선 위 검증 |
|---|---|---|---|
| I-3 | CI 10차 통합 빨강(224 중 1) — `readTalkWrap` 되짚을 말에 `source` 칸이 있어 닫힘 줄과 통째 견줌이 어긋남(`conversation-session.test.ts:761`) | 코드는 맞음. 시험 견줌을 en · ko 로(`map(({ en, ko }) => …)` 또는 `toMatchObject`). 화면 자료에 `source` 를 내릴 까닭이 없으면 `wrapViewOf` 가 en · ko 만 내리게 해도 됨(둘 중 하나, 보고에 적기) | CI 11차 통합 초록 |
| I-1 | 정리의 따라 말하지 않는 장(1~3단계 끝인사 · 4단계부터 되짚을 말)에서 말풍선을 눌러 다시 들으면 `read` 가 서지 않아 저절로 넘어가지 않음(`follow-along.tsx:690-693 · :708-710 · :761-764`) | 다시 읽기의 끝도 `read` 를 세운다(`onReplay` 에서 `.then(ok => ok && setRead(true))`) 또는 '한 번이라도 다 읽었음'을 세대와 관계없이 남김 | e2e 하나: 끝인사 읽는 중 말풍선 누름 → 다시 읽기 끝 → 마무리 첫 장이 저절로 열림 |
| I-2 | plan-p13b 증명 표(`plan-p13b-회화-수업-1-3단계.md:156-175`)의 e2e 이름 열 개가 시험 파일에 없음(차례 5 · 6 브리프가 넘기지 않음 — 컨트롤러 몫의 빈틈) | **열 개를 증명 표 글자 그대로 더한다**(`conversation.spec.ts` 또는 알맞은 spec 파일): AC-15a '위 띠는 말 주고받기 n / 목표 턴 … 더 이야기하기 n / talk.more_talk_round_turns …' · AC-15g 셋('같은 질문에서 no-speech … talk.nospeech_dontknow_count …' · ''I don't know' 라고 말한 턴 …' · '질문 하나를 talk.dontknow_max 번 …') · AC-15h '1단계 다지기 수업 …' · AC-15l ''막히면 눌러요'가 한 번 …' · AC-15m '… 만나지 않았으면 답 두 개를 들려준다' · AC-16b '회화 말풍선에는 영어 이름 … 홈에는 한글 이름' · AC-N3 둘('… 회화 질문 셋이 모름으로 …' · '… no-speech 가 여섯 번이어도 …'). 견본 · 가짜 규칙이 모자라면 `tests/e2e/talk.ts` 에 더함(C22 셈 · 다지기 수업 kind · 이름 묻기 턴 {NAME}). 각 시험이 증명 표의 뜻(설정 키 · 정본 절)을 단언하는지 보고에 표로 | e2e 열 개 CI 초록 · `spec:trace` 그대로 |

관문: 차례 6 과 같음. 보고 `task-p13-report.md` '차례 6 fix 1' 절(지적별 어떻게 · 열 개 시험 표 · 시험 수) · SendMessage 한 줄 → 컨트롤러 CI 11차 → rev-p13b 재검토(I 셋) · des-p13 지적(fix 2) 합쳐 → 차례 6 커밋 → 프리뷰 · 견본 적재 → 전체 디자인 리뷰.
