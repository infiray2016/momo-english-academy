# 보고 2판: 표본 C174 반영과 정규 시드 옮기기(학습 설계자 · Opus · xhigh, 2026-10-29)
상태 DONE_WITH_CONCERNS. 표본 `.superpowers/sdd/2026-10-29-가르치고-배우는-수업/samples-l3u1.md` 2판 421줄. 정본 · 코드 · 다른 시드는 고치지 않았고, `seed:check`(API 를 부르는 풀이 검사)는 돌리지 않았다.
## 2판에서 바뀐 자리(표본 끝 절에 전부)
- 말하기 질문은 아니요 셋 · 예 하나다. R5 를 Dan and Tess wash the cups. 로, Q4 를 Do Dan and Tess wash the cups? → Yes, they wash the cups. 로 바꿔 We 를 없앴다(C174 결정 · (4)). we 는 듣기 L2 글로 옮겼다.
- 근거의 두 갈래를 적었다(C174 (1)). 이 수업 질문에는 단원 단어가 늘 들어 있어 회상 근거는 질문에서 나오지 않고, 질문은 응답 근거만 낸다. 예 문항도 응답은 독립이다.
- 말하기 목표를 셋으로 갈랐다(C174 (2)). 쓰기 W6 은 칸 넷을 앱이 놓고 남은 is · cold 두 장을 빈칸 둘에 놓는다(C174 (3)).
- 되짚기는 closeKo · closeKoPracticed 두 줄이고, 앱이 teach.goals 첫 목표의 혼자 · 짝 첫 시도로 고른다(설정값 후보 lesson.recap_can_ratio 0.8, C174 (5)).
- 1판의 정할 것은 모두 '결정됨(C170 · C174)'으로 표시했다.
- 검증기가 잡아 고친 것 둘: 말하기 답 'No. They …'는 두 문장으로 세어져 'No, they …' 한 문장으로 바꿨고, 쓰기 카드 'living room' 한 장은 living · room 두 장으로 나눴다.
## 목표 ID(초안, 확정은 A8 덮음 표 · 설계 검토자)
| ID | 핵심 능력 | tasks | needs · accept | 기회 |
|---|---|---|---|---|
| read-3-1-1 | 사실 정보 찾기 | fact | comprehension · correct | 문항 3 + 짝 |
| write-3-1-1 | 문장 꼴 바르게 쓰기 | assemble-sentence | form · correct | 문장 5 + 짝 |
| speak-3-1-1 | 듣고 따라 말하기 | repeat | repeat · correct | 낱말 5 · 문장 6 + 짝 |
| speak-3-1-2 | 듣고 뜻 잡기(평가 spec 에 없음) | listening | comprehension(말하기 needs 에 없음) · correct | 듣기 3 + 짝 |
| speak-3-1-3 | 정보 묻고 답하기 | question | response · correct | 질문 4 + 짝 |
## 시드 파일(p13d, 단원 1 파일에 배정 수업 1 하나, generation generated · claude-opus-5-5 · xhigh · createdOn 2026-10-29)
- `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d/seed/lessons/reading/3/1.json` 9,256 바이트 · `writing/3/1.json` 8,808 바이트 · `speaking/3/1.json` 11,213 바이트
- briefHash 9970145e…(task-samples.md) · agentHash f3ecb56e…(.claude/agents/curriculum-designer.md) · revision 1 · correction 0
## 검증 결과(`pnpm -s seed:validate --areas reading,writing,speaking --json`, 서브셸 · Node 24)
- 실제 시드: 종료 코드 1, cells 769 · passed 766 · failed 3 · warnings 0. 오류 24건이 모두 schema 검사다(읽기 7 · 쓰기 8 · 말하기 9).
- 걸린 자리: 수업마다 Unrecognized key "teach"(3). 읽기 문항마다 explanationKo 없음 + askRole · goal · whyKo · retryHighlight · spare(6). 쓰기 preview.parts(2) · 문항 goal · whyKo · spare(5). 말하기 repeat 의 goal · chunks · spares(1) · 듣기 askRole · goal · whyKo · retryHighlight · spare(3) · 질문 goal · whyKo · spare(4).
- 스키마가 막혀 뒤 검사가 돌지 않으므로, 새 칸을 걷고 whyKo 를 explanationKo 로 되돌린 사본(스크래치)도 돌렸다: 종료 코드 0, 오류 0 · 경고 0(분량 · 어휘 배정 · 범위 · 글로서리 · 금지어 · 정답 통과).
- 범위 검사(내 스크립트): 시드 영어 글 184개 통과, 선생님 한국어 줄 65개 모두 40자 · 두 문장 안.
## 우려 8
- p13d 실제 seed 폴더에 검증 실패 파일 셋이 생겼다. 단위 테스트는 가짜 시드 나무라 영향이 없지만, 실제 폴더를 도는 seed:validate · seed:load(개발 DB 적재)는 스키마 · 검증기를 고칠 때까지 막힌다.
- 델타 spec 6.3 에 없는 칸을 더했다: askRole(문항 이름표) · chips[].from(말하기 본보기 2) · repeat.goal · repeat.chunks · repeat.spares(따라 말하기가 글 배열이라 같은 차례 배열). spec 에 맞춰야 한다.
- 지금 스키마는 preview.example 을 요구해 예문을 본보기 문장으로 채웠다. spec 의 '비울 수 있다'를 스키마가 받아야 C170 (3) 과 맞는다.
- 평가 spec: 말하기 핵심 능력 '듣고 뜻 잡기'와 needs comprehension 이 없어 speak-3-1-2 가 목표 꼴 검사에 걸린다. A1 표의 '정답 노출 = 도움'을 단어 근거에만 걸게 고쳐야 C174 (1) 과 맞는다.
- 되짚기 두 줄을 고르는 기준(teach.goals 첫 값 규칙 · lesson.recap_can_ratio)은 spec 에 없는 제안이다. 0.8 이면 읽기 · 말하기는 모든 문항을 해내야 closeKo 다.
- 예 문항의 'Yes, they do.'를 받는다. 문장 틀 없이도 맞으므로 사용 시험에서 이 꼴만 쓰는 아이가 많은지 본다.
- 질문 짝은 앞 화면 이야기에 대해 묻는다. 평가 spec 의 정답 노출 판정이 이를 노출로 세면 짝의 단어 근거가 도움이 된다(응답 근거는 C174 (1) 로 그대로).
- 3단계 새 단어 그림 자산 없음(장부), 혼자 질문의 기억 짐, 말하기 한 세션 인물 쌍이 여럿인 점은 1판 그대로 남는다.
