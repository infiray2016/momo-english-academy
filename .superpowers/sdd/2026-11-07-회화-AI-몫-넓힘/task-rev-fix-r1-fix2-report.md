# fix 라운드 1 · 2 합친 범위 한정 재검토 — 코드 검토 Important 1 · Minor 1~7 · 설계 재판정 N-1~N-3 · M-5

검토자: code-reviewer(Opus · xhigh) · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(마지막 수정 09:45:46 뒤 멎은 판) · 읽기 전용 · 지난 보고 `task-rev-fix-r1-report.md`.

## 라운드 판정
**Approved.** 지난 Important 1 과 Minor 1~6 은 모두 ADDRESSED 이고, Minor 7 은 컨트롤러 결정으로 닫혔다(장부 T-246). 설계 재판정 N-1 · N-2 · N-3 도 코드에서 닫혔다. 고침이 새로 만든 문제는 Minor 셋이고 Important 이상은 없다. M-5 는 r3 전에 필요하다고 본 가름은 들어갔고, 판정 r1 의 자리별 · 두 바퀴 셈은 아직이다(r3 손셈으로 대신할 수 있음).

## 검토 방법
- 합친 diff 는 fix 1 직전 판(지난 검토에서 복원한 판)과 최종 판을 견줬다. 몫을 가르려고 09:14 판(fix 1)과 09:40 판(fix 2)도 복원해 '결정 반영 + fix 2'와 'fix 2 더함'을 따로 떴다. 새 파일(`situation.ts` · `talk-metrics.ts` · 시드 목록)은 보고가 가리킨 함수를 읽었다.
- 시험은 다시 돌리지 않았다(컨트롤러 관문 단위 2260 · lint · tsc · seed:validate · check:ids 0). 의심 셋은 탐침으로 확인했고, r2 기록의 상황 차례 AI 원문을 최종 판 규칙으로 다시 흘렸다(어휘 범위 검사는 빼고 흉내 냄).
- 자료: 스크래치패드 `rev-fix-r1/`(`fix2/` · `fix2b/` diff · `replay-r2-final.txt` · `probe-fix2.txt` · `probe-i6-fix2.txt`).

## 1. 지난 지적별 판정
| 지적 | 판정 | 근거 |
|---|---|---|
| Important 1 예 베끼기가 문장 단위라 반응이 지워지고 말이 겹침 | **ADDRESSED** | 맞장구 한 문장은 베끼기에서 뺀다(`situation.ts:403~414` · `:145~152`). 상황 줄로 바꾼 뒤 AI 문장은 지우고, AI 맞장구가 남았으면 시드 줄의 넘김만 붙인다(`lesson-turn.ts:806~843`, 도구 같은 꼴). r2 상황 차례 원문 32 를 다시 흘리면 인사 끝 반응 16/16 이 남고, 세 문장 넘김 0 · 같은 뜻 겹침 0 이다(`replay-r2-final.txt`). 짝 시험이 'Good to hear! Let's learn some new words!' 가 두 문장으로 남는지 본다(`talk-observe-parity.test.ts:1131~1153`) |
| Minor 1 'A or B' 꾸밈말 + 같은 명사 오탐 | **ADDRESSED** | `question-check.ts:447~462` 이 기능어를 건너뛰고 되풀이 명사 앞 꾸밈말을 견준다. 탐침에서 'Red apples or green apples?' · 'big dogs or small dogs' 는 지나고 'Is it a cat or a dog?' ← 'A dog.' 는 잡힌다(`probe-i6-fix2.txt`). medium 기록 되묻기는 2 → 1(정탐 'Do you play with a ball?' 만) |
| Minor 2 따라 말한 말을 먼저 답함으로 셈 · 기회 셈 어긋남 | **ADDRESSED** | 소리 줄 뒤 아이 말은 뺀다(`lesson-flow.ts:612~648`, 서버 `lesson-turn.ts:2474~2481` · 도구 같은 인자). 먼저 답한 번호는 `chances.ts:123` covered 로 들어가 남은 목록 · allDealt · offered 가 같은 셈이다. 다른 호출부 `server/conversation/index.ts:606`(더 이야기하기)는 남은 필수 목록을 쓰지 않아 영향이 없다 |
| Minor 3 'Huh?' 실패 줄이 '쉬운'을 약속 | **ADDRESSED** | `situation.ts:253~267` failSituationLineOf 가 모름 꼴에서 온 자리면 easy · easier 든 줄을 건너뛴다. 진짜 받침 둘째는 그대로다. 남은 틈은 새 Minor 2 |
| Minor 4 정본 문구 · 칸 설명 | **ADDRESSED(코드 몫)** | `operations.ts:138` 에 두 경우(읽었지만 앱이 고친 행은 비움 · 받은 빈 tori_en 막힘은 empty_tori_en_stuck)가 들었다. 정본 8절 '칭찬 대사' · 05절 예 자리는 문서 몫이라 컨트롤러 장부로 넘긴다 |
| Minor 5 지표의 고르기 단계 | **ADDRESSED** | `talk-metrics.ts:348` 이 단계 규격 choices 를 재료로 두고 `:876` 이 넘긴다. `:635` 의 '1단계' 기본값은 옛 부름 길에만 쓰인다 |
| Minor 6 결과 글 질 · 대조군 시험 | **ADDRESSED** | 반응 남음 · 넘김 하나 · 문장 수(`talk-observe-parity.test.ts:1153` · `:1389`), 같은 명사 대조군(`talk-fix-r1.test.ts:991~1011`), 따라 말한 말(`:1019`), '쉬운' 약속(`:1052`). 변이 다섯을 끄면 모두 붉다(`fix2b-mutations.txt`) |
| Minor 7 무름 차례의 다시 쓰기 1회 | **닫힘(결정)** | 컨트롤러 수용, 결정 문구를 '진짜 막힘 차례에서는'으로 좁힘(T-246). 코드 변경 없음 |
| M-5 지표 가름(r3 전 필요) | **ADDRESSED(가름) · 부분(나머지)** | (나) AI 몫 문장만으로 베끼기를 세고, (가) 앱 상황 줄 차례는 건수로 따로 보인다(`talk-metrics.ts:809~822`). 옛 보고는 표시 글에서 읽는다(`:549~559`). 판정 r1 4절의 (1) 자리별 셈 · (2) 두 바퀴 같은 글 · (4) 복수 · 비교급 정규화(M-r2-2)는 아직이다. r3 판정이 손으로 셀 수 있어 막지 않는다 |

## 2. 설계 재판정(r2) N-1~N-3 · M-r2
| 항목 | 판정 | 근거 |
|---|---|---|
| N-1 인사 끝 반응 지워짐 | 닫힘 | 맞장구 제외 · 넘김만 교체(위), 시드 인사 끝 넷이 넘김 꼴로 바뀌고 'Hmm, okay!' 꼴이 없다(`seed/lists/talk-situation-lines.json`), yummy 가 허용 목록에 들었고(43), 1~3단계 고정부에 짧은 반응 예 줄이 들었다(`talk-lesson.ts:1003`, lowBandRules 안) |
| N-2 받침 같은 뜻 두 번 | 닫힘 | 교체 뒤 AI 문장 지움 · 같은 턴 같은 뜻 지움 · 시드 'That's okay! You can do it!' 뺌. 다시 흘리기에서 받침 16 겹침 0 |
| N-3 아이가 방금 답한 질문 | 닫힘 | 되묻기 (다)(`question-check.ts:432~446`): 'What do … do' 꼴이 노리는 단어를 아이가 방금 말했는데 질문에 없으면 걸린다. 다시 쓰기 안내 · 고정부에 같은 예 줄. AI 의 next_targets 에 기대는 한계는 구현 보고 우려 2 그대로다 |
| M-r2-1 한 차례 두 질문 | 닫힘 | `question-retry.ts` keepLastHeldQuestion 이 1~3단계에서만 잡아 둔 AI 질문 가운데 마지막 것만 남긴다(신호 말 · 앱 붙임 줄은 건드리지 않음) |
| M-r2-2 · 4 · 5 | 안 고침(까닭 타당) | 파생 정규화는 지표와 함께여야 하고, 꺼내기 판단 주체는 C205 해석 · 설계 결정 거리다. 컨트롤러 판단 |

## 3. 컨트롤러가 특히 물은 것
- **판정 권고 밖으로 더한 둘.**
  - 같은 턴 같은 뜻 지움(`situation.ts:158~171`)은 맞장구를 베끼기에서 빼면서 다시 열린 AI 자신의 겹침('You can do it! You can do it with me.')을 막는 데 필요하다. 상황 차례 안에서만 걸리고 지우기만 한다. 다만 기능어까지 견주어 다른 뜻 문장도 지울 수 있다(새 Minor 1).
  - 앞 차례 문장 건너뜀(`situation.ts:452~470`)은 설계 8 '상황 반응 되풀이 0'과 같은 방향이고, 모두 걸리면 돌림 줄로 돌아가 길이 끊기지 않는다. 타당하다.
- **넘김 낱말 표가 코드 상수인 점.** 설정값 원칙(`settings` — 단계 구간별 숫자 · 문턱)의 대상이 아니라고 본다. 이 표는 앱이 가진 고정 문장(예 · 시드 줄)을 맞장구 · 넘김으로 가르는 닫힌 담화 낱말 목록이다. 이미 코드에 둔 문법 목록(장면 여는 질문의 조동사 목록 — spec 판 4 설계 5 '문법 목록이라 코드에 둠', 되묻기 기능어 · 장면 낱말 제외 목록)과 같은 꼴이다. 다만 두 가지는 짚는다.
  - 표가 맞는지는 시드 데이터에 달렸다. 지금 시드 줄 가운데 'Sorry, I can't hear well. Let's go on.' 의 첫 문장은 다섯 낱말이라 맞장구로 안 잡힌다(새 Minor 2). 시드 꼴 검사(여러 문장 시드 줄은 '맞장구 + 넘김')를 두면 표와 시드가 어긋날 때 시험이 잡는다.
  - SHORT_REACTION_MAX_WORDS(4)는 정본 05절 38줄 '네 낱말 안의 짧은 반응' 규칙이고 설정 키가 아니다. 그런데 고정부 글(`talk-lesson.ts:897` 'at most four words')과 출처가 둘이다(새 Minor 3).

## 4. 새로 깨뜨린 것(Minor 셋, Important 이상 없음)
- **Minor 1. 같은 뜻 지움이 기능어 겹침으로 다른 뜻 문장을 지운다.** `situation.ts:158~171` 은 낱말 전부(it's · okay 같은 기능어 포함)를 견준다. 'It's okay!' 뒤 'Okay, it's hard!' 가 지워진다(`probe-fix2.txt`). 상황 차례에서만 생기고 지우기만 하므로 해는 작다. 고칠 길: 내용 낱말(기능어 표 밖)로만 견주거나 내용 낱말 둘 이상을 요구한다.
- **Minor 2. 넘김만 붙이기가 첫 문장이 긴 시드 줄에서는 줄 전체를 붙인다.** `situationTailOf`(`situation.ts:178~193`)는 시드 줄 첫 문장이 맞장구가 아니면 줄 그대로다. 들리지 않음 차례에서 AI 맞장구('Oops, my ears!')가 남고 넘김이 베끼기로 걸려 'Sorry, I can't hear well. Let's go on.' 이 골라지면 반응이 둘인 세 문장이 된다. 또 모름 꼴 실패 줄에서 easy 줄을 다 건너뛰면 돌림 줄(`situation.ts:473`)로 돌아가 '쉬운' 줄이 나올 수 있다(다른 두 줄을 이미 쓴 대화에서만). 고칠 길: 그 시드 줄을 '맞장구 + 넘김' 꼴로 바꾸고(예 'Sorry! Let's go on.'), 시드 꼴 검사를 `talk-lists` 시험에 둔다. 돌림 줄로 돌아갈 때도 피할 낱말 든 줄은 뒤로 미룬다.
- **Minor 3. 짧은 반응 기준 수의 출처가 둘이다.** `situation.ts:110` 의 4 와 고정부 글 'at most four words'(`talk-lesson.ts:897`)가 따로 적혀 있다. 고칠 길: 고정부 줄을 상수로 만들거나(4단계 골든 글은 같은 값이면 그대로) 둘이 같은지 단언하는 시험 한 줄을 둔다.

## 5. 4단계 골든 · 호출 수 · C210
- 골든 shasum `0ad2d535549f6221de855dcee75683c501c1472d` 그대로다. fix 2 의 새 줄은 모두 1~3단계 몫이다(lowBandRules · 상황 차례 문장 문 · `low` 로 막은 keepLastHeldQuestion · 1~3단계 질문 검사).
- 새 AI 호출 자리는 없다. 바퀴당 85(77 + recall 8)는 그대로다. 되묻기 (다)가 늘릴 수 있는 것은 C203 턴당 1회 재질문뿐이다. 빈 tori_en 무름 차례의 다시 쓰기 1회는 결정으로 받아들여졌다.
- C210 은 바뀌지 않았다. 마이크 · 무음 · 인식 오류는 AI 에 가지 않고, 빈 tori_en 막힘은 기술 오류 자리에 들지 않는다(지난 보고 6절).

## 6. 범위 밖 관찰(판정에 넣지 않음)
- r2 받침 첫째에서 AI 가 쓴 "Let's try it together!" 는 다시 흘려도 남고(맞장구 · 넘김 검사 밖), 앱 신호 말과 함께 나간다. 신호 구 목록에 이 꼴이 없어서다. r3 설계 판정에서 볼 일이다.
- e2e · 통합 시험은 돌리지 않았다(CI 몫). 시드 상황 줄이 바뀌었으므로 화면 글 단언은 CI 에서 본다.
