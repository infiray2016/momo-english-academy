# 묶음 5 fix 1 범위 한정 재검토 · rev-5-fix1

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`. 지난 보고 `task-rev-5-report.md` 의 I-1 · M-1~M-3 과 범위 밖 관찰(통합 468줄), 그리고 고침이 만든 새 어긋남만 봤다. 시험은 다시 돌리지 않았다. 판정은 08:24 의 파일로 했다(마지막 수정 08:23:03).

## 라운드 판정: Approved (fix 라운드 1/3 · Critical 0 · Important 0)

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 e2e 'App question just before' · 'Follow up' 단언이 시스템 프롬프트로 늘 지남 | ADDRESSED | `tests/e2e/talk-lesson.spec.ts:1236~1240` 이 사용자 메시지 줄 꼴 `App question just before (not in the turns above): ${scene}` 과 `\\nFollow up on the child's answer: yes` 로 좁혔다. 앞 꼴은 core 사용자 메시지 줄(`src/core/ai/calls/talk-lesson.ts:1194`)과 글자가 같고, `scene` 은 칸 글 전체라 앱 질문 줄의 sceneText 와 같다. 뒤 꼴은 고정부 규칙 1018 처럼 따옴표 안이 아니라 줄 머리에만 맞는다. 가르기 확인 기록(`ai-scope-5-fix1-followprobe.txt`)에서 두 새 꼴은 인사 차례 본문에서 거짓, 장면 답 뒤 본문에서 참이고, 옛 낱말은 두 본문 모두 참이다 |
| (범위 밖 관찰) 통합 `talk-ai-scope.test.ts:468` 같은 꼴 | ADDRESSED | `tests/integration/talk-ai-scope.test.ts:466~472` 가 같은 두 줄 꼴로 바뀌었다. 장면 질문 단언은 앱 질문 줄 꼴에 합쳐 더 좁아졌다. 묶음 2 파일이지만 그 단언 줄만 바꿨다 |
| M-1 신호 말 시험 이름과 단언이 어긋남 | ADDRESSED | parity:708~753 이 다섯 차례를 단언한다. 받침 첫째 신호 말은 긴 꼴 목록 안(731), 받침 둘째 · 셋째는 null(732~733)이다. 닫기 뒤 다음 자리의 받침 첫째는 계획 단계가 1 임을 먼저 확인하고(741) 짧은 꼴 목록 안을 본다(742~744). 들리지 않음 차례는 null 이다(752). 늘 참이던 `record.no` 견줌은 지웠다 |
| M-2 열린 힌트 단 수를 서버와 견주지 않음 | ADDRESSED | parity:889~923 sameHints 가 대본 칸 hint 가 없을 때 서버 `lessonChildRowOf` 를 같은 상태(위치는 `talkLessonPositionOf(p.flowArgs)`, 행은 sim 행)와 빈 heard 로 불러 hintLevel · hintKind · heardHelp 를 도구 값과 견준다. 도구도 heard 를 앞 선생님 행 move 에서만 읽으므로(talk-observe.ts:2528) 같은 입력이다. 변형 기록 14(열린 단 수를 0 으로 → 1 실패)가 있다 |
| M-3 server-only 순수 도우미 사본이 늚 | ADDRESSED(장부 넘김) | 지난 보고의 권고대로 고치지 않고 core 이전을 장부 열린 항목으로 넘겼다(fix 1 표 M-3 행, T-163 (3) 과 합칠 수 있음). 장부에 한 줄을 적는 일은 컨트롤러 몫으로 남는다 |

## 2. 새로 깨뜨린 것

- 없음. 08:04 뒤에 바뀐 파일은 e2e 한 파일 · 통합 한 파일 · 짝 시험 · 대본 도구 넷이다. 대본 도구는 fix 1 표에 없는데 시각이 08:23 으로 바뀌었다. 지난 검토의 사본(스크래치패드 `ai-scope-5/talk-observe.backup3.ts`, 08:01)과 `cmp` 로 글자까지 같아, 변형 14 를 되돌린 흔적이다.
- 관문 기록이 고침 뒤(08:24)에 있다: 단위 166 파일 · 2211 통과(`ai-scope-5-fix1-unit.txt`), biome ci 633 파일 0(`ai-scope-5-fix1-biome.txt`), tsc 빈 출력(`ai-scope-5-fix1-tsc.txt`).

## 3. 범위 밖 관찰

- CI 위험 줄 여덟은 구현자가 e2e 와 같은 재료를 넣은 도구 sim(`ai-scope-5-fix1-e2esim.txt`)과 코드 읽기로 따라갔고, 고칠 것이 없다고 적었다. 지난 검토에서 코드로 따라간 결론과 같다. e2e 는 여전히 한 번도 돌지 않았으므로 첫 CI 실행에서 그 여덟 자리를 본다.
