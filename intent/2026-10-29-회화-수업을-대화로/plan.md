# Plan: 회화 수업을 대화로 — 카드는 목표를 관리하고 선생님은 아이 말에 반응하며 이끈다

spec: `intent/2026-10-29-회화-수업을-대화로/spec.md`(4판, approved 요청자 C188, 정본 반영 C189) · intent: `intent/2026-10-29-회화-수업을-대화로/intent.md`(2판, C164) · 작성일: 2026-10-30 · 상태: approved(컨트롤러 2026-10-30 05:4x, 13절 C192 — 보정 넷: 12절 82줄 꼴은 컨트롤러가 고침 · 정한 것 11 · 18 수용 · 1단계 회화 닫기(정한 것 2)는 요청자 확인 대기(묶음 12 전까지 이의 없으면 그대로) · UI · UX 묶음 6 과 P12 넘김은 컨트롤러가 처리)
승인: 컨트롤러 2026-10-30 05:4x(13절 C192, C139 · C141 의 하위 plan 승인 규칙. 승인 뒤 P12 경계 맞춤은 정한 것 22 · 겹침 표, plan-eval 과 10-30) · 브랜치 · 워크트리: `feature/1a-p13d-teacher`(`.claude/worktrees/p13d`, 머리 0c664c3 위 커밋 전 255자리: UI · UX 1차 묶음 · 시드 규격 · 가르치고 배우는 수업 진행분) · 작업 장부: `.superpowers/sdd/2026-10-29-회화-수업을-대화로/`

읽는 법. 파일 경로는 p13d 기준이다. 정본에 없는 새 이름(파일 · 함수 · 칸)에는 '(제안)'을 붙였다. 수용 기준은 정본 15절 번호(C189 반영 뒤)로 적고, 델타 spec 의 번호는 'AC-' 없이 '델타 n'으로만 적는다(spec:trace unknown-ac). '설계 n'은 델타 spec 의 절이고, 'T-n'은 이 변경 단위 장부, 'UI · UX 6'은 UI · UX plan 의 묶음 6 이다. '새 꼴'은 C189 의 카드 · 단계 규격 · 응답 꼴이고, '옛 꼴'은 그 앞 꼴(1~3단계 turns, 4단계부터 questions)이다. 첫 프리뷰는 3단계, 둘째 프리뷰는 1 · 4 · 5단계이며 설계 11 의 첫 · 둘째 묶음과 같다. 코드 사실은 2026-10-30 05시대의 p13d 에서 확인했다(끝 절).

## 목표 (Goal)

회화 수업을 인사 → 짧은 준비 → 대화 → 정리 네 토막으로 바꾸고(정본 3.3, 말해 보기와 오늘 쓸 말 일괄 따라 말하기는 없앤다), 모든 단계에서 선생님(Claude)이 아이 말에 먼저 반응한 뒤 다음 질문을 쓰게 한다. 카드는 필수 질문 · 새 단어 · 단원 목표를 준비된 기회로 두고, 앱은 그 기회를 사용자 메시지의 기회 알림으로만 넘긴다. 카드 자리는 따라가기 상한(talk.follow_child_turns) · AI 질문 검사 실패 · 같은 질문 되풀이(talk.same_question_max) · 받침 단계와 참고 턴의 마무리 물음('Do you want to talk more?')에서만 만든다(6.1 · 6.2 · 6.4). 막힌 뒤에는 같은 질문을 다시 묻지 않고 같이 말하기 → 쉬운 질문 → 닫기로 돕고(talk.dontknow_max), 말소리 없음 · 인식 실패 · 마이크는 받침 셈 밖의 기기 쪽으로 다룬다(7 · 8절). 수업은 마무리 물음에 답하거나, 바닥선으로 정리에 가거나, 참여가 거의 없음이 아닌 채 '그만하기'를 고르면 참여 완료가 되고, 참여가 거의 없을 때만 확인 쪽지(C34)를 묻는다(3.3 끝난 길 표). 아이 말 인식 글과 나눈 대화는 대화 기록 칸에 남고(4절), 선생님 행에는 차례 정보 칸 talk_turns.move 를 더한다(5절). 첫 프리뷰는 3단계 단원 1 수업 1 · 2 · 6(변형 1)의 새 꼴 정규 카드로 연다(6.3 (4-나)). 유효 수행 턴 조건을 3.2 최소 수업 수에 쓰는 운영 변경은 요청자가 승인하지 않았으므로(C188) 넣지 않고, 병행 검증 후보 셈으로만 계산한다.

## 묶음과 배정

구현자는 Opus · high, 코드 검토는 Opus · xhigh, 화면 · 시드 · 브리프 검토(design-reviewer)는 Fable · max, 단원 목표 · 브리프를 쓰는 학습 설계자는 Opus · xhigh, 카드 본 생성(seed-generator)은 Opus · xhigh(3단계 S10 결론, `seed/prompts/README.md` 3절), 실호출 표본 평가 판정(analyst)은 Opus · xhigh 이다. 호출마다 model · effort 를 적고, 구현자와 검토자는 다른 에이전트로 띄운다. 동시에 다섯까지 돌리고 한 파일은 한 구현자만 고친다(위험 1). 설정 · 도구 묶음(1 · 2 · 13)은 가벼운 루프(컨트롤러 브리프, 검토 high · 범위 한정, Minor 는 컨트롤러)이고, 나머지는 전체 루프(브리프 → 구현 → 코드 검토 → fix 3회까지 → 화면이면 화면 검토)다. fix 가 3회를 넘으면 컨트롤러가 요청자에게 묻는다.

| 묶음 | 범위 | 먼저 끝날 것 | 검토 | 증명하는 AC |
|---|---|---|---|---|
| 1 | 설정 키 · 사본: 12절 새 키 15(24행) 적재, talk.dontknow_max 바꾸는 곳, p13d specs 사본, check:ids, 개발 DB 설정 적재 | 정본 12절 82줄 꼴 고침(컨트롤러) | 가벼운 | 늘(식별자) |
| 2 | 개발 적재 일부 받기: seed:load `--partial`(제안) · dev-load.yml 입력 | 없음 | 가벼운 | 7a |
| 3 | 카드 · 단계 규격 새 꼴과 검증기: 새 TalkCardSchema, 옛 꼴은 런타임 전용 이름, 관계 검사 둘, 문항 번호, 시드 보기, 옛 1단계 회화 시드 빼기 | 1 | 코드 | 15m · 7a |
| 4 | 3단계 단원 1 목표 · 브리프 · 카드 세 장 · 시드 검토 · 개발 일부 적재 | 2 · 3 | 브리프 · 시드(Fable max) | 15m(실시드) |
| 5 | 흐름 핵심(순수 모듈): 토막 · 질문 자리 · 받침 · 이어진 막힘 · 들리지 않음 · 따라가기 · 같은 질문 · 기회 · 참고 턴 · 끝난 길 · move 꼴 | 3 | 코드 | 15g · 15i · 15r · 15s · 15t(단위) |
| 6 | 회화 턴 호출 새 꼴: 응답 칸 · 고정부 · 사용자 메시지 · 정규화 · 출력 검사 · 계약 표본 | 3(5 와 나란히) | 코드 | 15c · 15b · 15k · 15d(단위) |
| 7 | 서버 상태 · 기록: 마이그레이션(move · prep) · 시도 꼴 · 상태 읽기 새 갈래 · 끝맺음 까닭 · 감시 기록 칸 | 5 · 6 | 코드 | 15v(move) · 16a |
| 8 | 서버 턴 길: 차례 계획 · 1~3단계 질문 잡아 두기 · 같은 질문 막기 · 붙일 줄 · move 저장 · 참여 완료 | 7 | 코드 | 15b · 15i · 15k · 15r · 15s · 15v |
| 9 | 서버 액션 · 화면 자료: 토막 넘김 · 짧은 준비 저장 · 고르기 · 확인 조건 · 대화 기록 자료 · 맞장구 목록 | 7(8 과 나란히) | 코드 | 15f · 15t · 16a · 12h |
| 10 | 화면: 대화 기록 · 아이 말풍선 · 맞장구 · 소리 줄 단추 | 9 | 코드 + 눈 점검 | 15q · N10 |
| 11 | 화면: 네 토막 · 짧은 준비 쪽지 · 받침 · 단추 반짝임 · 두 버튼 · 확인 쪽지 · 위 띠 · 처음 회화 안내 | 8 · 10 | 코드 + 화면 | 15a · 15e · 15f · 15g · 15l · 15m · 15p · 15q · 15s · 15t · N8 · N10(Playwright 몫) |
| 12 | 옛 흐름 걷기: 옛 갈래 · 옛 응답 꼴 · 옛 시험 지우기, 옛 꼴 카드 닫기, 없앤 키 둘, 회화 e2e 를 새 꼴 견본으로 | 11 | 코드 | 15d · 15h · 15j · 7a(회귀) |
| 13 | 실호출 표본 평가 도구 `talk:observe`(제안) · 3단계 대본 | 5 · 6 | 가벼운 | 15o |
| 14 | 첫 프리뷰: 사본 다시 맞춤 · 관문 · 단원 바로 가기 · 커밋 · push · 화면 검토 · 요청자 3단계 시험 | 4 · 12 · 13 | 화면 · 사람 | 15w · N8 · N2(첫 값) |
| 15 | 3단계 단원 1 나머지 스물셋(같은 판) · 단원 단위 검사 · 적재 | 14(브리프가 그대로일 때) | 시드 | 7a · 15m |
| 16 | 둘째: 바닥선(흐름 · 듣기 활동 · 끝맺음 · 첫 장 줄) · 짧은 준비 (가) · 1단계 첫 꼴 · ①② · 그림 낱말 | 12 · UI · UX 6 | 코드 + 화면 | 15g(바닥선) · 15u · 15a(1단계) · 15h · 15l · 15p · 16a |
| 17 | 둘째: 4단계 쉬운 질문 받침 · 5단계 미션 목표 · 역할 바꾸기 | 16 | 코드 + 화면 | 15n · 15x |
| 18 | 둘째: 아이가 보인 능력 확인(이은 목표 · 확인 보류를 move 에) · 아이가 물음 · 이월 · 후보 셈 · 진도 막힘 후보 · `talk:metrics`(제안) · 근거 쓰기 한 줄(P12 함수 · 열이 있으면) | 순수 모듈은 12 뒤 16 과 나란히(노출 판정은 P12 함수), 서버 잇기는 17 뒤(같은 서버 파일) | 코드 | 15v · 15y · 15u(후보 셈) · 15s(validity, 열 뒤) · 15z(함수 몫) · N2(셈) |
| 19 | 둘째: 1 · 4 · 5단계 단원 1 목표 · talk-1 둘째 판 · talk-4 · talk-5 첫 판 · 세 장 먼저 · 1단계 평가 카드 겹침 | 3 | 브리프 · 시드 | 15m · 7a |
| 20 | 둘째 프리뷰: 1 → 4 → 5 | 16~19 | 화면 · 사람 | 15w · 15o(4단계) · 15x(실호출) |

UI · UX 6 은 묶음 12 가 Approved 된 뒤 회화 화면 파일을 잡고, 묶음 16 · 17 의 화면 몫은 UI · UX 6 이 Approved 된 뒤에 한다(차례와 겹침 절). 셋째(나머지 단원)는 범위만 적는다(둘째 · 셋째 절).

plan 이 정한 것(spec 이 plan 에 맡긴 자리와 구현 길, T-2 · T-3 · T-4 · T-6 · T-7 의 답 포함):
1. **새 흐름은 새 꼴 카드에서만 켠다.** p13d 는 다른 변경 단위가 함께 쓰는 커밋 전 워크트리라 묶음마다 로컬 관문(lint · tsc · 단위 시험)이 0 이어야 한다. 그래서 묶음 3 이 옛 카드 형을 런타임 전용 이름(`TalkCardV1Schema` · `TalkLessonV1Schema`, 제안)으로 바꾸고 옛 갈래가 카드에서 꼴을 읽게만 고친다(동작 그대로). 묶음 5~11 은 새 갈래만 더하고 옛 갈래 · 옛 시험은 고치지 않으며, 묶음 12 가 옛 갈래를 지운다. 꼴 가르기는 순수 함수 `talkCardKindOf`(제안: 새 꼴 · 옛 꼴 · 틀림) 하나다. 묶음 3 부터 12 사이에는 push 가 없으므로, 개발 서버의 옛 흐름이 새 단계 규격 행에서 틀려도 아이가 쓰지 않는다.
2. **옛 꼴 카드(우려 8)는 묶음 12 부터 열지 않는다.** 회화 수업 목록은 새 꼴 카드만 후보로 두고, 옛 꼴 카드로 진행 중인 세션은 열 때 끝맺음 없이 중단으로 닫는다(이어 하기 시간이 지난 세션과 같은 길, 8절). 그래서 1단계 회화는 talk-1 둘째 판이 적재되는 둘째 프리뷰까지 빈 목록이다(개발 DB 에만 있는 상태이고 운영 배포 전이다). 옛 흐름을 둘째 프리뷰까지 함께 돌리는 안은 버린다. 옛 응답 꼴과 S5 프롬프트가 승인된 설계와 어긋나고, 새 검증기가 옛 칸을 거부해(AC-15m) 시드 나무에 둘 수 없으며, 두 흐름의 시험을 함께 지켜야 하기 때문이다. 프리뷰 상태표 '안 되는 것' 첫 줄에 적는다.
3. **옛 1단계 회화 시드 파일 다섯(130장, talk-1 첫 판 해시 09f5c7af)은 묶음 3 에서 `seed/lessons/talk/1/` 에서 뺀다.** git(0c664c3)과 개발 DB 에는 남고, `seed/manifest/talk-1.jsonl` 의 첫 판 줄은 둔다. 1단계 회화 평가 카드(level-test-talk-1)는 그대로이고 겹침 검사(06:101)는 둘째 판 뒤 다시 본다(설계 9 ⑥). C151 은 1단계를 영어를 모르는 아이 자리로 두라는 결정이라, 1단계 회화 카드를 새 꼴로 다시 만드는 설계 9 와 부딪치지 않는다.
4. **응답 칸은 첫 프리뷰부터 새 칸을 모두 둔다**('이름' 절 표, 아이가 보인 능력 · 아이가 물음 · 그림 낱말 포함). 응답 꼴과 고정부를 한 번만 바꿔 첫 · 둘째 프리뷰의 대화를 같은 꼴로 견주려는 것이다. 첫 프리뷰는 그 셋을 move.suggest 에 적기만 하고 화면 · 흐름 · 근거에 쓰지 않는다. 앱 확인 · 연결 · 그림은 묶음 16 · 18 이 한다.
5. **move 와 선생님 행 원문.** move 꼴은 '이름' 절 표다. 선생님 행 text 에는 화면에 글로 나온 줄만 둔다(검사를 지난 AI 글, 앱이 붙인 카드 질문 · 받침 줄 · 마무리 물음). 1~3단계 소리 줄(따라 할 말 · 선택지 · 받침의 답 · 답 예시)은 move.sound 에만 두고, 다시 쓸 선생님 차례(tori_rewrite)에는 화면 차례대로 넣는다(6.1). 그러면 대화 기록을 talk_turns 로 다시 그릴 때 T2 가 꼴로 지켜진다. 지울 글은 move.sound 와 근거 한 줄(move.suggest.goals[].why)뿐이고, 순수 함수 `eraseTalkMoveText`(제안) 하나가 지운다. 원문 정리 Cron 과 부모의 대화 지우기(1-나)가 이 함수를 부르고, 이 plan 의 통합 시험은 같은 함수로 지운 뒤 남는 값을 본다(AC-15v).
6. **끝난 길 · 바닥선 · 확인 보류의 자리.** 끝맺음 기록(attempts talk-closing)의 reason 에 closing_question · suggestion · floor · stop_confirmed 를 더한다(구석 '그만하기'는 stop 그대로다). 바닥선은 move.floor, 확인 보류는 move.held, 마무리 자리는 move.kind 'closing_slot', 근거 한 줄은 move.suggest 에 둔다. sessions 에 칸을 더하지 않는다(5절).
7. **학습 기회 제공 · 유효 수행 턴(후보 셈) · 이월 목록은 저장하지 않는다.** talk_turns · move 에서 순수 함수로 그때그때 센다(설계 8 의 기본). 이월 목록만 세션 시작 때 한 번 계산해 talk-start 스냅숏(attempts.input)에 둔다. 이어 하기 · 같은 시도 id 다시 받기에서 같은 값을 쓰기 위해서다.
8. **DB 열거 값.** talk_segment 열거형에 'prep' 을 더한다(마이그레이션은 더하기만, 옛 today_words · practice 값은 둔다). 바닥선은 토막이 아니라 대화 토막 안의 갈래(move.floor)다. 들은 도움(heard_help) 열거형은 그대로 쓴다: 선택지는 two_answers, 따라 할 말 · 같이 말하기의 답 · 답 예시는 answer_example 이다. 서버가 붙인 소리 줄의 종류는 move.app 에 적는다(정본 5절 '서버가 붙인 소리 줄은 앞 선생님 행 move 로 안다').
9. **tori_ko 저장(T-7).** 뜻을 보이는 단계(level_specs koMeaning, 1~4단계)면 모두 저장한다. 1~3단계의 겹침 규칙(toriKoShownOf)은 그대로다. 4단계 이어 하기는 대화 기록을 다시 그릴 때 1~3단계와 같이 지난 선생님 말 아래 뜻을 보인다. 칸은 그대로라 5절과 마이그레이션이 바뀌지 않고, 자유 대화 spec 239 · 250줄의 안과 같다.
10. **7절 감시 기록 칸(T-7 · UI · UX L-15).** client_listen 꼴에 선택 칸 `sp`(제안)를 둔다. 앞 기록 뒤 선생님 쪽 발화 가운데 감시가 끝낸 것만 `{ w: tori · card · sound · wait · prep · floor · wrap, h: no_end · not_played }` 로 최근 CLIENT_LISTENS_MAX 개 남긴다. 들려줌 · 글 · 소리는 남기지 않는다. 아이 행과 따라 말하기 시도가 같은 꼴을 쓴다.
11. **마무리 제안의 두 버튼(T-3).** 마무리 물음의 고르기 단추 둘(talk-frame 의 data-talk-choice)을 그대로 다시 쓰고, 앱 고정 대사는 붙이지 않는다. 갈래 '마무리'는 그 턴 사용자 메시지에 '카드 기회 다 다룸: 예'를 보낸 응답에서만 받고, 다른 턴은 '없음'으로 바꾼다(고정부 규칙과 같은 조건, 우려 21). '더 이야기하기'를 고르면 지금 chooseMoreTalk 길처럼 앱이 더 이야기할 거리 하나를 카드 자리로 붙이고(AI 호출 없음, 턴 셈 없음), 말로 답하면 보통 턴이다. 꼴은 UI · UX 6 이 마무리 물음과 함께 한 번에 입힌다.
12. **확인 쪽지.** 서버 stopTalk 의 확인 조건만 '참고 턴 전'에서 '참여가 거의 없음'(순수 함수 `talkNearlySilent`(제안): 인사 토막 뒤 대화 토막에 입력이 말이고 막힘이 아닌 아이 턴이 하나도 없음)으로 바꾸고, 쪽지 조각과 글(C34)은 그대로 둔다. 판정 함수의 입력에 참고 턴 · 비율을 두지 않아 숫자 문턱이 생길 자리가 없다.
13. **talk.participation_ratio(T-2) 의 코드 반영 범위는 0 이다.** 키 · 코드 · 시험 · settings.json · 정본 12절 어디에도 없고 13절 C181 · C188 · C189 문장에만 있다(10-30 확인). 다시 생기지 않게 증명 표에 grep 0 을 둔다.
14. **없앤 키 둘(talk.practice_rounds · talk.reask_sentence_every_turns)은 묶음 12 에서 settings.json · 시험 고정값 · 코드와 함께 지운다.** 그때까지 p13d 12절 사본에 두 행을 p13d 전용 줄로 남겨 check:ids 를 0 으로 둔다(UI · UX 위험 2 와 같은 손 합치기). 개발 DB 의 두 행은 적재가 지우지 않는 고아 키로 남고 쓰는 곳은 0 이다.
15. **개발 적재와 일부 단원.** seed:load 에 `--partial`(제안)을 더해 완전성 빈 칸은 보고만 하고(검증 오류 · 판 규칙 위반은 그대로 막음) 단원 일부를 받는다. dev-load.yml 에 입력 partial(기본 끔)을 두고 main.yml 은 쓰지 않는다(AC-7a 운영 완전성 그대로, C160). 검증기는 단원 파일의 칸이 다 차지 않았으면 단원 덮기 · 평가 spec 기회 수를 경고 `talk-unit-incomplete`(제안)로만 내고, 다 차면 오류로 낸다(설계 9).
16. **카드 생성 차례(T-7).** 3단계 단원 1 수업 1 · 2(배정) · 6(다지기) 변형 1 → 카드 단위 검사 → 개발 일부 적재 → 첫 프리뷰 순서다. 브리프가 그대로면 같은 판으로 나머지 스물셋을 만들고, 브리프 14절의 '세 장 고정 붙이기 명령'이 세 장의 정규화 해시(키 정렬 · 빈칸 없는 JSON 의 sha256)를 호출 값과 대조한다. 브리프가 바뀌면 26장을 다시 만든다(우려 6). 개정 번호는 적재 앞 개발 DB 최신 개정 + 1 이고(5절 개정 판), 컨트롤러가 `seed:load --dry-run` 보고의 '최신 개정'을 호출 값에 넣는다. 같은 적재에 드는 회화 단계 규격 행과 목표를 더한 단원 규격 행(talk 3단계 단원 1)도 같은 개정이다. 1 · 4 · 5단계 단원 1 은 묶음 19(설계 9 차례 2 · 3 · 4), 나머지는 셋째다.
17. **첫 프리뷰 범위.** 바닥선 · 1단계 첫 꼴 · 4단계 AI 쉬운 질문 · 5단계 미션은 둘째다(FR-3 · 4 · 5 의 묶음 칸). 첫 프리뷰 동안 이어진 아이 쪽 막힘(move.streak)은 세기만 하고 바닥선으로 가지 않으며, 셋째 막힘은 받침 셋째의 닫기다. 짧은 준비 여는 때 (나)(막힌 차례 talk.prep_offer_stuck 번)는 첫 묶음에 넣는다. spec 미결의 'talk.prep_mode 두 값을 3단계 프리뷰에서 견준다'에 when_needed 가 열리는 길이 있어야 하기 때문이다. (가)(앞 수업 바닥선)는 바닥선과 함께 둘째다.
18. **질문이 지워진 카드 자리의 대신 질문.** 까닭 (2) AI 질문 검사 · (3) 같은 질문으로 질문 문장이 지워졌는데 붙일 남은 기회가 없으면, 가장 오래전에 쓴 더 이야기할 거리를 붙인다(지금 AC-15i 의 대신 질문 꼴). 까닭 (1) 따라가기 상한은 설계 2 대로 AI 차례로 둔다. 질문 없는 선생님 차례가 아이 앞에 남지 않게 하려는 것이다.
19. **1~3단계 물음표 문장은 응답 끝까지 잡아 둔다.** 검사(길이 · 어휘 범위 · 이 대화에서 아이가 말한 낱말 · {NAME} · 선생님 영어 이름 · A4-03 · 같은 질문)를 지나면 내보내고 걸리면 지운다(createAnswerHold 와 같은 잡아 두기). A4-03 에 쓰는 next_targets 가 응답 끝에 오기 때문이다. 4단계부터는 같은 질문 검사만 문장이 끝날 때 한다. 1~3단계 AI 차례의 '힌트'는 응답이 끝날 때까지 흐리다(정본 4절 힌트 행).
20. **맞장구 목록.** `seed/lists/talk-wait-lines.json`(제안) 영어 다섯 줄을 빌드에 묶는다(5절 '시드 목록'). 검증기는 금지어 · 선생님 이름 · 물음표 · 1단계 문장 길이 상한을 보고, 고르기는 턴 번호로 돌린다(safeLineOf 꼴). 첫 안은 'Hmm, let me see.' · 'Let me think.' · 'Oh, I see.' · 'Okay!' · 'Hmm.' 이고 요청자가 프리뷰에서 듣고 고친다.
21. **프리뷰 프로필.** 새 개정 카드는 그 개정으로 시작한 단원 회차에서만 보인다(5절). 그래서 관찰 쪽 '단원 바로 가기'에 단계 고르기와 '그 단원 새 회차로 열기'(시작 개정 = 지금 최신) 갈래를 더한다. 관찰 쪽 전용이라 운영 빌드에 없고, 가르치고 카 와 같은 파일이라 먼저 끝난 쪽 위에 얹는다.
22. **근거 칸과 평가 plan(P12)의 경계(둘째, plan-eval 과 맞춤 10-30).** talk_turns.evidence 열 · 근거 칸 Zod · 회화 턴 근거 값 함수 `talkEvidenceOf`(제안: 앞 선생님 행 move + 아이 행 사실 + 카드 · 단원 목표 → 근거 칸, teachEvidenceOf 와 같은 형 이름) · 노출 판정 · 근거 상태 · 집계는 P12 몫이다(평가 spec 9절 '근거 기록 함수(… 회화 수업 …)'). 이 plan 은 그 함수가 읽을 사실(move 와 아이 행 칸)을 남기고, 아이가 보인 능력의 앱 확인(이은 목표 · 확인 보류를 move 에)과 이월 · 유효 수행 턴 후보 셈 · 진도 막힘 후보 함수를 만든다. 앱 확인의 word 노출은 P12 의 노출 판정 함수 `exposureOf`(P12 제안, `src/core/evidence/exposure.ts`, P12 평8 가)를 쓴다. 그 함수와 evidence.match_cut(P12 평3)은 회화 첫 프리뷰 뒤 P12 첫 차례에 들어와 회화 18 보다 먼저 닿는다. 근거 쓰기 한 줄은 응답 뒤 아이 행 '말했다' 갱신과 같은 쓰기에 들고, 묶음 18 때 P12 함수와 열이 있으면 18 이 넣고 없으면 P12 가 18 Approved 뒤에 넣는다. 그 앞 행은 P12 의 채움 명령(`evidence:fill`, 제안, 빈 행만)이 move 와 원문이 남은 개발 DB 행에서 채운다. 짧은 준비 · 바닥선 듣기 활동 · 정리 따라 말하기 시도의 근거 칸(attempts.evidence, validity 연습) 쓰기 줄은 그 시도를 저장하는 saveFollowAlong(`src/server/conversation/index.ts`)에 들고, 같은 규칙(그 회화 묶음 때 열 · 함수가 있으면 그 묶음이, 없으면 P12 평10 이 뒤에)을 따른다. expression needs 의 경계 evidence.match_cut 은 P12 가 settings 에 넣은 뒤 읽고, 그 전에는 expression needs 를 '앱이 확인할 수 없음'으로 보아 확인 보류로 둔다. 이월 · 후보 셈은 이 열을 기다리지 않는다(입력 방식 · 힌트 종류 · 들은 도움 · move 로 센다). 마이그레이션은 move 열 · prep 값을 P12 의 열 넷과 다른 파일로 두고, 번호는 먼저 닿는 쪽이 0006 이며 drizzle generate 는 한 워크트리에서 한 번에 한 사람이 한다.

## 이름 · 설정값 · 문구

응답 칸(talk_turn · talk_closing 같은 꼴, 모두 required, 쓰지 않으면 빈 값 · 6.2 표의 코드 이름 그대로):

| 차례 | 칸 | 꼴 | 앱 확인(설계 5 · 6.1 정규화) |
|---|---|---|---|
| 1 · 2 | stuck · tori_en | 그대로(C127) | tori_en 문장마다 검사(금지어 · 개인 정보 · 메타, 1~3단계 물음표 잡아 두기, 모든 단계 같은 질문) |
| 3 | model_line | 문자열(1~3단계, 그 밖 "") | 길이 · 어휘 · 형태 범위. 걸리면 카드 답 예시 · 들려줄 말 |
| 4 | choices | 문자열 0개 또는 2개(1~3단계) | 같은 꼴 · 하나는 노리는 단어. 걸리면 [] |
| 5~7 | tori_ko · recast · explanation | 그대로 | '모름' 턴 recast 비움(0c664c3) 그대로 |
| 8 | new_words | 문자열 목록(뜻: 이번 차례에 꺼낸 새 단어) | 이번 수업 새 단어이고 tori_en · model_line 에 있을 때만 |
| 9 · 10 | self_used_words · mission_done | 그대로 | 미션은 말 입력 턴만 |
| 11~13 | response_fit · child_topic · child_asked | 참 · 거짓 | 기록만(move.suggest) |
| 14 | goal_suggest | `{ goal, why_ko }` 목록 | 카드 목표 · 이월 목표 ID 만 |
| 15 | next_move | required · more · follow_up · follow_child · introduce · mission · role_swap · closing · none | closing 은 정한 것 11 의 턴만 |
| 16 | card_item | `{ kind: required · more · none, no }` | 카드에 있는 번호만, 아니면 none · 0 |
| 17 | next_goal | 목표 ID 목록 | 카드 목표 · 이월 목표만 |
| 18 | support | none · together · easy_question · choices · model_line | 그대로 |
| 19~23 | next_targets · next_hint_ko · next_hints · next_usable_phrases · next_answer_example | 그대로(1~3단계 AI 차례에도 씀) | 지금 정규화. 힌트 묶음이 걸리면 카드 항목의 힌트, 카드 항목이 없으면 '힌트' 단추 없음 |
| 24 | image_word | 문자열 | 카탈로그에 있을 때만(둘째) |
| 25~ | farewell · farewell_ko · good_lines · next_time_lines · summary | 그대로 | 그대로 |

없애는 칸은 card_question_no · next_question_en · next_question_ko 다. ai_calls 목적 이름(talk_turn · talk_closing)은 그대로다.

move(talk_turns.move, 선생님 행, jsonb, 꼴 판 v 1):

| 칸 | 값 | 뜻 | 원문을 지울 때 |
|---|---|---|---|
| kind | first_question · ai · card_slot · closing_slot | 차례 종류 | 남음 |
| why | follow_cap · question_check · same_question · support · cut · fail | 카드 자리의 까닭(끊긴 턴 · 실패 길 포함) | 남음 |
| next · item | next_move 값 · `{ kind, no }` | 갈래 · 카드 항목(카드 자리는 붙인 항목) | 남음 |
| goals · words | 목록 | 노린 목표 · 노린 단원 단어(원형) | 남음 |
| stage · cause · streak | 0~3 · button · stuck · nospeech · 수 | 받침 단계 · 앞 아이 차례의 까닭 · 질문 자리와 관계없이 이어진 아이 쪽 막힘 | 남음 |
| app · ai | together · easy_question · choices · model_line · answer_example · listen · floor · prep 목록 · support 값 | 서버가 붙인 도움 · AI 가 준 도움 | 남음 |
| intro | 목록 | 꺼낸 새 단어(확인 뒤) | 남음 |
| suggest | `{ fit, topic, asked, goals: [{ id, why }] }` | 앞 아이 말에 대한 AI 제안 | why 만 지움 |
| linked · held | 목록 | 앱 확인으로 이은 목표 · 확인 보류(둘째) | 남음 |
| sound | `{ model?, choices?, answer? }` | 1~3단계 소리 줄 글 | 통째로 지움 |
| floor · prep | 참 · `{ words }` | 바닥선에 든 차례(둘째) · 대화 중 연 짧은 준비 낱말 | 남음 |

사용자 메시지(턴마다 바뀌는 값만, 영어 이름표 줄). 지금 줄 가운데 Child · Input · Segment · Hint · Heard help · Closing · Level test 와 바뀐 값 줄(아직 '안다'가 아닌 단원 단어 등)은 그대로 둔다. Don't-know count · Target reached · More-talk material used up · AI question slot 은 뺀다. 더하는 줄(이름표는 제안)은 `Reason`(- · button · stuck · nospeech) · `Turn`(ai · card_slot · closing_slot) · `Card line`(붙일 카드 항목 · 받침 단계) · `Support stage`와 `Stuck question` · `Chances`(이월 → 필수 질문(번호 · 노리는 단어) → 다시 쓰기 → 꺼낼 새 단어) · `Return to today's topic` · `All card chances used`(참고 정보) · `Following child's topic`(이어진 턴 수) · `Turns left before closing question`(채울 몫이 아님) · `Floor` 다. 시스템 프롬프트에는 넣지 않는다(캐시 규칙 그대로, AC-15k).

시도 꼴(attempts.input, 판 1 그대로 더하기만): talk-start 에 prepWords · carry(선택), talk-prep(새, 따라 말하기 시도), talk-floor(새, 둘째, skipped 에 next), talk-closing reason 넷(정한 것 6)을 더한다. 활동 번호는 처음 스냅숏 뒤로 짧은 준비 → 바닥선 → 정리 → 한 번 더 말해 보기이고, 범위는 카드 오늘 쓸 말 수로 잡는다(→ 보정 11-05 (1): max(오늘 쓸 말 수, talk.prep_words.<구간>)).

설정값. 묶음 1 이 seed/settings.json · tests/fixtures/settings.ts 에 넣는 24행(범위 household, 정본 12절 75~89줄과 같은 값 · 바꾸는 곳)은 talk.prep_mode.{1-3 always · 4-6 · 7-9 · 10-12 when_needed}(advanced) · talk.prep_words.{3 · 2 · 2 · 2}(seed) · talk.prep_offer_stuck 2 · talk.follow_child_turns 2 · talk.required_gap_turns 3 · talk.reask_per_word 1 · talk.required_max_ratio 0.5(seed) · talk.valid_turns_ratio 0.3 · talk.floor_after_stuck 3(decision-first) · talk.same_question_max 2 · talk.self_goal_link true · talk.carry_independent_min 2 · talk.teacher_sentences_max.{3 · 3 · 4 · 5} · talk.wait_line_seconds 1.5 · talk.role_swap_turns 4 이다(적지 않은 바꾸는 곳은 advanced). talk.dontknow_max 는 바꾸는 곳만 decision-first 로 바꾼다. 함께 쓰는 지금 키는 talk.dontknow_max · nospeech_dontknow_count · more_talk_turns · more_talk_round_turns · follow_up_min_every_turns · hint_read_match · confirm_seconds · friendship_per_talk · safety_max_turns · idle_close_minutes · known_days · said_ratio, speech.max_retries · silent_items_max · skip_notice_seconds, ui.auto_next_seconds · wait_hint_seconds, unit.new_words_per_lesson.<구간>, seed.goals_required_levels 다. 숫자는 모두 설정에서 읽고, 고정부에 넣는 수도 고정부를 만들 때 읽는다(C44).

문구(아이 화면 새 글은 아래가 전부이고, 이 plan 은 정본 밖 글을 여기서 굳힌다):

| 자리 | 글 | 출처 |
|---|---|---|
| 위 띠 | '말 주고받기 n'(분모 없음), 마무리 물음 뒤 '다 했어요! 더 이야기하기 n / (talk.more_talk_round_turns)' | 4절 |
| 아이 말풍선 | 회색 '못 들었어요'(인식 실패 시도 · 들리지 않음 차례), '잘 모르겠어요' | 4절 · 7절 |
| 들리지 않음으로 넘길 때 | '말소리가 안 들려서 [이름](이/가) 도와줄게요'(speech.skip_notice_seconds, 지금 CHILD_TURN_TEXT.nospeechMove) | 7절 |
| 확인 쪽지 · 고르기 | C34 글 · '그만할래요' · '더 이야기할래요', '더 이야기하기' · '그만하기' | 그대로 |
| 글 없는 소리 줄 단추의 접근 이름 | '따라 할 말 듣기'(제안) · '첫째 답 듣기' · '둘째 답 듣기'(지금 BUBBLE_TEXT) | 정본 밖 |
| 바닥선(둘째) | 첫 장 '오늘은 잘 들었어요. 다음에 또 같이 말해 봐요', 듣기 활동의 작은 '다음' | 3.3 |
| 처음 회화 안내 | '[이름](은/는) 오늘 이야기에 나오는 것만 물어요' 문장을 지운다(`src/core/teacher/name.ts`) | 4절(C145) |
| 앱 대사(영어) | 'Do you want to talk more?' · 'Now let's talk.'(대화 중 연 준비 끝) · 맞장구 다섯(정한 것 20) | 3.3 · 4절 |
| 선생님이 쓰는 말(고정부 예) | 'That's okay! Let's say it together.' · 'I couldn't hear you.' 꼴 · 'Listen and say!' 꼴 | 3.3 · 6.1 |

## 바뀌는 파일 (Files that change)

### 1 · 2 · 3 · 설정 · 적재 · 새 꼴

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 1 | `seed/settings.json` · `tests/fixtures/settings.ts` | 수정 | 위 24행 · talk.dontknow_max 바꾸는 곳 |
| 1 | `specs/*.md`(p13d 사본 13장) | 수정 | 정본(C189 · C190 · C191, 12절 82줄 꼴 고친 뒤)을 장마다 복사하고 09 에 없앤 키 두 행을 전용 줄로 되돌림(정한 것 14) |
| 2 | `scripts/seed-load.ts` · `src/server/seed/load.ts` · `.github/workflows/dev-load.yml` · `tests/integration/seed-load.test.ts` · `tests/unit/seed-validate-cli.test.ts` | 수정 | `--partial`(--reference-only 와 함께 못 씀), 완전성 빈 칸 보고만, dev-load 입력 partial(기본 끔) |
| 3 | `src/core/seed/schema/talk.ts` · `lesson.ts` | 수정 | 새 TalkCardSchema(목표 goals · todayWords 에 그림 키 · 들려줄 말 · prep · required · more · 미션 목표 · 요구 능력 · roleSwap, 칸 표는 설계 6), 1단계 인사 답 두 개 칸 없앰, firstQuestion 없앰(첫 필수 질문 글을 되풀이한 칸이고 지금도 같은지 검사만 함), textsOfTalkCard 새 칸 role. 옛 꼴은 V1 이름(정한 것 1) |
| 3 | `src/core/seed/schema/reference.ts` · `structure.ts` | 수정 | 회화 단계 규격: segments 에 prep, cardShape 'required', twoAnswers → choices(옛 판 행을 읽도록 옛 칸은 묶음 12 까지 선택). 새 열거(제안: TALK_NEXT_MOVES · TALK_SUPPORTS · TALK_FIRST_FORMS · TALK_CARD_ITEM_KINDS) |
| 3 | `src/core/seed/check-talk.ts` · `check-cross.ts` · `check-assessment.ts` · `validate.ts`(itemsOf: 인사 → 필수 질문 → 더 이야기할 거리) · `src/core/vocab/allocate.ts`(관계 둘) · `reference-index.ts`(시드 파일의 옛 꼴 회화 규격 행은 오류) | 수정 | 설계 6 검증기 표 전부, 일부 단원은 경고(정한 것 15), 평가 spec 2절 목표 · 요구 능력 검사(evidence.* 기회 수는 P12 키가 들어온 뒤) |
| 3 | `seed/level-specs.json` | 수정 | 회화 1~12단계 행: segments · mode(설계 1 단계표 글) · cardShape · choices · moreTalk, 개정 판 |
| 3 | `seed/lessons/talk/1/{1..5}.json` | 지움 | 정한 것 3 |
| 3 | `src/app/dev/seed-viewer/talk-card.tsx` | 수정 | 새 꼴 보기(요청자 표본 읽기, H11) |
| 3 | `src/core/conversation/flow.ts` · `src/core/ai/calls/talk.ts` · `src/server/conversation/*.ts` · `src/components/conversation/*.tsx` | 수정(이름 · 꼴 읽기만) | 옛 갈래가 V1 형을 쓰고 꼴을 카드에서 읽음. 동작 그대로 |
| 3 | `tests/fixtures/seed/builders.ts` · `tests/unit/seed-validator-talk.test.ts` · `seed-schema.test.ts` · `seed-validator-complete.test.ts` | 수정 | talkCard(새 꼴) · talkCardV1(제안, 옛 갈래 시험 전용), 회화 단계 규격 새 꼴, AC-15m 부정 시험 |

되돌리기: 설정 행 · 키 고정값은 더하기만이라 행을 지우면 앞과 같다. 사본은 복사 전 판을 스크래치패드에 둔다. 새 꼴 검증기는 V1 이름을 되돌리면 옛 검사로 돌아가고, 옛 1단계 시드는 git 0c664c3 에서 되살린다.

### 4 · 15 · 19 · 시드

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 4 | `seed/unit-specs.json`(talk 3단계 단원 1 goals) | 수정 | 학습 설계자의 잠정 목표(id `talk-3-1-n`, needs 는 word · response · expression · form 안)와 덮음 표(작업 장부). 평가 spec 일의 차례 ②, 요청자 승인 전 잠정 |
| 4 | `seed/prompts/talk-3.md` · `seed/prompts/README.md` | 신규 · 수정 | `_template.md` 열일곱 절 꼴 그대로. 5절 첫 줄에 으뜸 원칙(C172), 네 토막 · 필수 질문 · 받침 줄 · 짧은 준비 · 더 이야기할 거리 · 꺼내기 쓰는 법, 6절 단원 목표 · purpose, 11절 수업 종류별 필수 질문 수, 12절 새 꼴 Zod, 14절 스스로 확인 · 세 장 고정 붙이기 명령 · 검증 명령, 승인 표본 2 · B · C 의 대화 줄을 흐름 예로 인용(출처 · 표본 파일 해시). README 표에 판 해시 |
| 4 · 15 | `seed/lessons/talk/3/1.json` · `seed/manifest/talk-3.jsonl` · `seed/reviews/talk-3.json` | 신규 | 세 장 → 26장, 생성 기록(effort xhigh · 개정), 요청자 판정 행(AC-15w 꼴) |
| 19 | `seed/unit-specs.json`(1-1 · 4-1 · 5-1) · `seed/prompts/talk-1.md`(둘째 판) · `talk-4.md` · `talk-5.md` · `seed/lessons/talk/{1,4,5}/1.json` · manifest | 수정 · 신규 | 둘째 프리뷰 시드(같은 세 장 먼저 → 나머지) |

되돌리기: 생성 전 파일 상태를 스크래치패드에 두고, 카드 칸은 개정 판이라 적재 뒤에도 앞 판이 DB 에 남는다.

### 5 · 6 · 7 · 8 · 9 · 흐름 · 호출 · 서버

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 5 | `src/core/conversation/lesson-flow.ts`(제안) | 신규 | 새 꼴 위치 되짚기(`talkLessonPositionOf`, 제안): 토막 · 질문 자리 · 받침 단계 · 이어진 막힘 · 들리지 않음 닫힘 수 · 따라가기 이어짐 · 같은 질문 셈 · 말 주고받기 수(인사 턴 포함, 막힘 · 들리지 않음 · 한국어 질문 턴 뺌) · 참고 턴 · 고르기 차례 · 짧은 준비 열기 (나). 다음 선생님 차례 계획(`nextTeacherTurnOf`, 제안): 종류 · 까닭 · 붙일 카드 항목 · 받침 줄 |
| 5 | `src/core/conversation/chances.ts` · `question-check.ts` · `ending.ts` · `move.ts`(모두 제안) | 신규 | 기회(필수 질문 · 다시 쓰기 · 꺼낼 새 단어 · 미션)의 남은 목록 · 다룬 수 · 다 다룸 · 돌아오기 알림 · 붙일 가장 앞 기회 · 짧은 준비 낱말 고르기 / 1~3단계 질문 문장 검사 · 같은 질문(normalizeSpoken) · 소리 줄 검사 / 참여가 거의 없음 · 끝난 길 · 참여 완료 · 친한 정도 오름 / TalkMove Zod · 만들기 · 읽기 · eraseTalkMoveText |
| 5 | `src/core/conversation/spoken.ts`(제안) · `hints.ts` · `wrap-up.ts` · `said.ts` | 신규(옮김) · 수정 | flow.ts 의 normalizeSpoken · sayingAnswer · createAnswerHold · shownTurnOf · toriKoShownOf 를 옮김(동작 그대로), 카드 항목 힌트, 1~3단계 정리 한 번, 소리 줄을 들은 턴은 '영어' |
| 6 | `src/core/ai/calls/talk-lesson.ts`(제안) · `talk.ts` | 신규 · 수정 | 새 응답 꼴 · 고정부(정본 6.1 표 글을 영어로, 수는 설정) · 가변부(새 꼴 카드: 목표 · 필수 질문 · 더 이야기할 거리 · 미션 · 역할 바꾸기) · 사용자 메시지 · 정규화 · 출력 검사 칸(model_line · choices 포함) · CallSpec 둘. 함께 쓰는 형은 새 파일에서 내보냄 |
| 6 | `tests/fixtures/ai/samples/talk_turn.v2-*.json`(제안) · `tests/contract/ai-schemas.test.ts` | 신규 · 수정 | 3단계 AI 차례 · 카드 자리 · 받침 셋 · 들리지 않음 · 마무리 제안 · 4단계 · 5단계 미션 · 끝맺음 표본 |
| 7 | `drizzle/<다음 번호>_talk_turns_move.sql`(제안, P12 의 열 넷과 다른 파일 · 정한 것 22) · `drizzle/meta/*` · `src/db/schema/content.ts` · `learning.ts` | 신규 · 수정 | `ALTER TYPE talk_segment ADD VALUE 'prep'` · `ALTER TABLE talk_turns ADD COLUMN move jsonb` |
| 7 | `src/core/conversation/attempt.ts` · `client-listen.ts` | 수정 | 시도 꼴(이름 절) · 감시 칸 sp(정한 것 10) |
| 7 | `src/server/conversation/state.ts` · `closing.ts` | 수정 | 카드 꼴 갈래, 새 위치 · 짧은 준비 시도 · move 읽기 · 새 설정, tori_ko 저장 조건(정한 것 9), 끝맺음 까닭 · 바닥선 뒤 끝맺음(정본 3.3 끝맺음 턴 행) |
| 8 | `src/server/conversation/turn.ts` · `src/server/ai/talk.ts` · `src/app/api/talk/turn/route.ts` · `closing.ts`(→ 보정 11-05 (2)) | 수정 | 새 갈래: 차례 계획 → 사용자 메시지 → 흘려 받기(문장 문, 1~3단계 물음표 잡아 두기, 같은 질문 막기) → 끝난 뒤 카드 자리(까닭 2 · 3) · 붙일 줄(카드 질문 · 받침 줄 · 소리 줄 · 마무리 물음, 겹침 없애기 C125) · move · 저장(text 는 화면 글 줄) · 참여 완료(`completeTalk`, 제안: reachTalkTarget 을 바꾼 이름, 친한 정도 · 이음매 onTalkSessionEnded completed. 확인 뒤 중단은 aborted, 겹침 표 P12 행). 실패 길(1~3단계 칭찬 대사 + 카드 자리, 4단계부터 'Oops') · 거절 · 끊김 · 'AI 쉬는 중'(8절 바뀐 행) |
| 9 | `src/server/conversation/index.ts` | 수정 | 새 갈래: ensureStarted(prepWords), 화면 자료(대화 기록 줄 · 짧은 준비 쪽지 · 맞장구 · 고르기 · 마무리 제안), advanceTalk(인사 → 짧은 준비 → 대화 첫 질문, 대화 중 연 준비 끝 → 'Now let's talk.' + 다음 필수 질문), saveFollowAlong(짧은 준비 · 만남 · 영어 문장 수), chooseMoreTalk(마무리 물음 · 마무리 제안 뒤), stopTalk(정한 것 12 · 끝난 길) |
| 9 | `seed/lists/talk-wait-lines.json`(제안) · `src/server/seed-lists.ts` · `src/core/seed/structure.ts`(SEED_FILES) · 목록 검사 | 신규 · 수정 | 정한 것 20 |
| 5~9 | `tests/unit/talk-lesson-flow.test.ts` · `talk-chances.test.ts` · `talk-question-check.test.ts` · `talk-ending.test.ts` · `talk-move.test.ts` · `talk-lesson-call.test.ts` · `tests/integration/talk-lesson-turn.test.ts` · `talk-lesson-session.test.ts`(모두 제안) | 신규 | 증명 표 |

되돌리기: 새 갈래는 새 꼴 카드에서만 돌므로 갈래 고르기 한 줄을 빼면 옛 흐름 그대로다. move 칸 · prep 값은 더하기만이라 비워도 읽힌다.

### 10 · 11 · 12 · 13 · 14 · 화면 · 걷기 · 도구 · 프리뷰

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 10 | `src/core/conversation/log.ts`(제안) · `src/components/conversation/talk-log.tsx`(제안) | 신규 | 대화 기록 고르기(`talkLogOf`, 제안: 선생님 화면 글 줄 · 뜻 · 아이 말 · '잘 모르겠어요' · '못 들었어요'. 소리 줄 · 1~3단계 답 예시 · 힌트 글 · 맞장구는 없음)와 기록 칸(지금 턴 맨 아래 · 위로 넘김 · 지난 선생님 말을 누르면 그 말만 다시 읽음, data-talk-log). 자유 대화 (나)가 다시 쓴다 |
| 10 | `src/components/conversation/child-turn.tsx` · `tori.tsx` | 수정 | 보낸 뒤 말풍선 남김(바로 보낸 턴 포함), 인식 실패 '못 들었어요', 들리지 않음 뒤 '잘 모르겠어요' 한 번 반짝임, 1~3단계 AI 차례 힌트 흐림, sp 모으기 / 맞장구(talk.wait_line_seconds, 선생님 목소리, 첫 문장은 맞장구 뒤), 글 없는 듣기 단추(따라 할 말 · ①②), 붙인 카드 줄 · 받침 줄 |
| 11 | `src/components/conversation/talk-frame.tsx` · `follow-along.tsx` · `closing-cards.tsx` · `src/core/teacher/name.ts` | 수정 | 네 토막 · 기록 칸 배치 · 위 띠 분모 없음 · 고르기 단추(정한 것 11) · '그만하기'와 needs_confirm 쪽지 · 막힘 화면 / 짧은 준비 쪽지(1단계 그림 · 뜻 · 소리, 2~3단계 낱말 글, 4단계부터 예문 글) · 인식 글 + 결과 말 · 정리 1~3단계 한 번 / 첫 장 끝난 길, '단어 듣기: <낱말>' 두 줄 지킴(T-4) / 처음 회화 안내 한 문장 지움 |
| 10 · 11 | `tests/unit/talk-log.test.ts`(제안) · `talk-bubble.test.ts` · `talk-follow.test.ts` · `tests/e2e/talk-lesson.spec.ts`(제안) · `tests/e2e/talk.ts` | 신규 · 수정 | 증명 표. e2e 는 정적 |
| 12 | 옛 갈래 파일 몫(`flow.ts` 옛 위치 · 말해 보기 · `talk.ts` 옛 꼴 · 서버 옛 갈래 · 화면 today_words · practice · V1 형 · 단계 규격 옛 칸 · 시드 보기 옛 몫) | 지움 | 정한 것 1 |
| 12 | `src/server/lesson-list/index.ts` · `src/server/conversation/index.ts` | 수정 | 옛 꼴 카드 닫기(정한 것 2) |
| 12 | `seed/settings.json` · `tests/fixtures/settings.ts` · `specs/09-설정값.md`(p13d) | 수정 | 없앤 키 둘 지움(사본 = 정본) |
| 12 | 옛 시험(conversation-flow · conversation-call · conversation-server · talk-* 옛 몫 · 통합 conversation-* · e2e conversation.spec · required-utterance · required-recovery 의 회화 몫) | 지움 · 수정 | 새 꼴 견본으로 바꿈, 표지(data-child-said · data-tori-* · data-wait-hint)는 지킴 |
| 13 | `scripts/talk-observe.ts`(제안) · `package.json`(talk:observe) · `tests/fixtures/talk-observe/*.json`(제안) · `tests/unit/talk-observe.test.ts`(제안) | 신규 | ai:observe 꼴: `--yes` 없으면 계획 · 예상 비용만. 대본은 3단계 넷(낱말 답 · 아이가 꺼낸 이야기 · 막힘 셋 · 말소리 없음)과 4단계 하나(둘째). 보고는 턴마다 갈래 · 카드 자리 까닭 · 되돌림 · 같은 질문 · 사람 판정 칸(맥락 없이 끼운 카드 질문) · 토큰 · 비용 |
| 14 | `src/server/preview/index.ts` · `src/app/dev/teacher-probe/teacher-probe.tsx` · 작업 장부 `review-screen-talk.md` · `observe-3.md`(제안) | 수정 · 신규 | 정한 것 21, 화면 검토 · 표본 평가 보고 |

되돌리기: 화면 새 갈래는 새 꼴 카드에서만 그려지므로 연결 줄을 빼면 옛 화면이다. 커밋 전 파일은 묶음 보고의 바꾼 줄 목록으로 손으로 되돌린다(위험 1). 묶음 12 는 git diff 를 묶음 보고에 남겨 되돌릴 수 있게 한다.

### 16 · 17 · 18 · 둘째 코드

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 16 | `src/core/conversation/lesson-flow.ts` · `chances.ts` · `ending.ts` · `wrap-up.ts` | 수정 | 바닥선(talk.floor_after_stuck, 들리지 않음은 셈 밖, 남은 필수 질문은 묻지 않고 아직 꺼내지 않은 새 단어의 듣기 활동 차례) · 짧은 준비 (가)(앞 회화 수업이 바닥선) · 1단계 처음 묻는 턴의 첫 꼴(짧은 준비 낱말이면 선택지 없이, 아니면 선택지 · 꺼내기) · 바닥선 참여 완료 · 바닥선 정리는 아이가 실제로 한 말만 |
| 16 | `src/server/conversation/turn.ts` · `index.ts` · `closing.ts` | 수정 | 바닥선에 들기(move.floor) · 듣기 활동 시도 저장(talk-floor, 따라 한 낱말만 만남) · 끝 → 정리 · 참여 완료 · 끝맺음 · 끝난 길 floor, image_word 확인(카탈로그에 있을 때만) |
| 16 | `src/components/conversation/follow-along.tsx` · `talk-frame.tsx` · `tori.tsx` · `closing-cards.tsx` | 수정 | 바닥선 듣기 활동(낱말 그림 크게 · 들려줄 말 · 말하기 단추 · 작은 '다음', 그동안 '그만하기' 숨김) · ①② 선택지 꼴 턴 다시 듣기 · 그림 낱말 · 바닥선 첫 장 줄. 꼴은 UI · UX 6 의 조각 위에 |
| 17 | `lesson-flow.ts` · `src/core/ai/calls/talk-lesson.ts` · `turn.ts` | 수정 | 4단계부터 받침(AI 답 예시 · AI 쉬운 질문, 같은 질문이면 카드 쉬운 질문) · 5~7단계 미션 목표 · 미션 체크는 말 입력만 · 역할 바꾸기(talk.role_swap_turns, 미션 체크 밖, roleSwap purpose) |
| 18 | `src/core/conversation/goal-link.ts` · `carry.ts` · `candidates.ts` · `metrics.ts` · `scripts/talk-metrics.ts`(모두 제안) · `package.json` | 신규 | 아이가 보인 능력 확인(목표 범위 · 말 · 막힘 아님 · 도움 없음 · needs 마다 노출(P12 노출 판정 함수) · 앱이 확인할 수 없는 needs 는 확인 보류, talk.self_goal_link) · 이월 넷의 차례(talk.carry_independent_min, 근거 상태 · 성패를 읽지 않음) · 유효 수행 턴 후보 셈(talk.valid_turns_ratio, 올림) · 진도 막힘 후보 · 사용 시험 지표 표(아이 이름 없음) |
| 18 | `turn.ts` · `index.ts` · `state.ts`(17 뒤) | 수정 | 확인 결과를 move.linked · held 에, 시작 때 이월 계산 → 스냅숏 · 기회 알림 맨 앞 · 다지기 · 보강 짧은 준비 낱말 앞세움, 노린 목표 허용 범위를 이월 목표까지, 근거 쓰기 한 줄(P12 함수와 열이 있을 때만, 정한 것 22) |
| 16~18 | `tests/unit/talk-carry.test.ts` · `talk-goal-link.test.ts` · `talk-candidates.test.ts` · `talk-metrics.test.ts`(모두 제안) · 5~11 의 시험 파일 | 신규 · 수정 | 증명 표. talkEvidenceOf 의 단위 시험은 P12 몫 |

되돌리기: 바닥선은 문턱 설정값을 크게 두면 들지 않고, 앱 확인 · 이월 · 후보 셈은 순수 함수라 부르는 곳을 빼면 영향이 없다.

## 작업 순서 (Order of work)

명령은 `( cd .claude/worktrees/p13d && PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm … )` 서브셸로만 하고, 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 로컬 관문은 lint · tsc · 단위 시험이다. 통합 · e2e 는 이 Mac 에서 돌지 않으므로(UI · UX L-2) 정적으로 쓰고, 실행은 11-01 뒤 CI 다(분 한도).

1. [문서 · 컨트롤러] 정본 12절 82줄(talk.valid_turns_ratio)의 바꾸는 곳 칸 '고급(운영 반영 때 결정 기록 먼저)'을 '고급'으로 두고 괄호 글을 뜻 칸 끝으로 옮긴다(꼴 고침, 뜻 그대로). 끝 판정: p13d 의 check:ids 를 정본 specs 로 돌려 '입력을 못 읽었다'가 없다.
2. [사람 · 컨트롤러] plan 검토 · 승인(13절 한 줄) → 브리프 1 · 2 · 3. 끝 판정: approved, 브리프가 장부에 있다.
3. [설정] 1 ∥ 2(가벼운 루프). 끝 판정: CI 와 같은 `check:ids --fail-on …` 종료 0(spec-setting-missing 24 · seed-setting-unknown 2 · code-setting-unknown 7 · setting-change-via 1 이 모두 0), spec:trace 0, 단위 · seed:validate 0. [컨트롤러] 개발 DB `seed:load --reference-only --complete-through 1` 보고에 설정 넣음 24(T-6 닫힘).
4. [서버] 3(1 뒤). 끝 판정: 관문 · 검토 Approved, 옛 1단계 회화 파일을 뺀 시드 나무의 seed:validate 오류 0, AC-15m 부정 시험 통과.
5. [시드] 4(2 · 3 뒤): (가) 학습 설계자가 단원 목표 · 덮음 표 → (나) talk-3.md → 브리프 검토(Fable max) → (다) 카드 세 장(seed-generator Opus · xhigh, 개정 호출 값) → seed:validate(카드 단위 오류 0, 단원 단위는 경고) → 시드 검토(Fable max: 아이 눈 · T2 · 필수 질문이 꺼내기 좋은 흐름인가 · 받침 줄) → [컨트롤러] `seed:load --complete-through 1 --areas talk --partial` → manifest. 이와 나란히 5 ∥ 6(3 뒤). 끝 판정: 세 장 검증 오류 0 · 적재 보고, 5 · 6 은 단위 · 관문 · 검토 Approved.
6. [서버] 7(5 · 6 뒤) → 8 ∥ 9. 이와 나란히 13(5 · 6 뒤) → [컨트롤러] 개발 키로 `talk:observe --yes`(3단계 대본) → analyst 판정 보고. 끝 판정: 단위 · 관문 · 검토 Approved, 통합 시험은 작성됨, 표본 평가 보고에 되돌림 비율 · 같은 질문 0 · 사람 판정 칸이 있다.
7. [화면] 10(9 뒤) → 11(8 · 10 뒤). 끝 판정: 단위 · 관문 · 검토 Approved, 로컬 눈 점검 사진(next dev · 개발 DB · 세로 820 · 가로 1180).
8. [서버 · 화면] 12(11 뒤). 끝 판정: `grep -rn "TalkCardV1\|today_words\|practice_rounds\|reask_sentence_every_turns\|participation_ratio" src tests scripts seed` 가 DB 열거 · 마이그레이션 자리 밖에서 0, p13d 사본 = 정본, 관문.
9. [검증] 화면 검토 1(Fable max, 로컬 사진: 짧은 준비 · AI 차례 · 카드 자리 · 받침 셋 · 들리지 않음 · 대화 기록 넘김 · 마무리 물음 · 마무리 제안 · 확인 쪽지 · 마무리 첫 장, 가로 · 세로), fix 3회까지.
10. [사람] 14 첫 프리뷰: 요청자 커밋 지시(L-19, UI · UX 1차 묶음 · 가르치고 첫 묶음과 함께 '회화 적용' 때, 11-01 전이면 [skip ci]) → push → [컨트롤러] 개발 DB migrate · 적재 → 관찰 쪽 단원 바로 가기(3단계 단원 1, 새 회차) → 프리뷰 상태표 첫 줄에 되는 것 · 안 되는 것(1단계 회화 닫힘 · 바닥선 없음 · 1 · 4 · 5단계 없음 · D-6 미완료)과 정규 시드임 → 요청자 3단계 시험(seed/reviews/talk-3.json, 'talk.prep_mode.1-3' 두 값 견줌) → 화면 검토 2(CI 사진). 끝 판정: AC-15w(3단계) 기록.
11. [시드] 15: 브리프가 그대로면 같은 판 나머지 스물셋(세 장 고정 해시 대조) → 단원 단위 검사 오류 0 → 적재. 바뀌면 브리프를 고친 새 판으로 26장(우려 6).
12. [검증] 11-01 뒤 CI 통합 · e2e 한 번(workflow_dispatch e2e 또는 PR 'e2e' 라벨). 실패면 고친 뒤 다시 돌린다. 끝 판정: 실행 기록(일시 · 커밋 · 시험 수 · 통과).
13. [서버 · 화면] 16 의 흐름 · 서버 몫 ∥ 18 순수 모듈(12 뒤) → UI · UX 6(그 plan) 뒤 16 화면 몫 → 17 → 18 서버 잇기, 19 는 3 뒤 언제든(학습 설계자 목표 → 브리프 → 세 장) → 20 둘째 프리뷰(1 → 4 → 5, 표본 단원으로 바꿀지는 요청자 의견). 끝 판정: AC-15w(1 · 4 · 5) 기록 · 둘째 묶음 시험 실행 기록.
14. [문서] 완료 보고 · 장부(T-1~T-8 판정) · plan done. 셋째는 그 차례에 이 plan 을 고쳐 잇거나 따로 쓴다.

## 차례와 겹침(다른 변경 단위)

| 다른 일 | 겹치는 파일 · 자리 | 먼저 | 까닭 |
|---|---|---|---|
| UI · UX 6(회화 화면 꼴) | talk-frame · tori · child-turn · follow-along · closing-cards · globals.css(tape) · e2e conversation · required-utterance · speech-feedback | 회화 10~12 → UI · UX 6 → 회화 16 · 17 화면 몫 | 동작 · 자료 · 토막 흐름(무엇이 언제 보이고 무엇을 남기는가, data-* 표지)은 이 plan, 꼴(판 · 기록 칸 모양 · 쪽지 · 단추 크기 · 말풍선 모서리 · 테이프 띠 · 마무리 첫 장 판 · sound-retry 화면)은 6 이다. 새 조각 talk-log.tsx 도 6 이 꼴만 입힌다(D-6). 두 버튼(T-3)은 마무리 물음 단추를 다시 쓰고, 확인 쪽지는 지금 ConfirmSheet 그대로다(단추 강조는 UX 개선 단위) |
| 가르치고 라-3(검토 중) · 마-2 | session-frame · speaking.tsx · repeat.tsx · lib/speech/pieces.ts | 겹침 없음 | 회화는 lib/speech 를 고치지 않는다(맞장구는 지금 선생님 읽기 길) |
| 가르치고 카 | `src/server/preview/index.ts` · teacher-probe.tsx | 먼저 끝난 쪽 위에 | 정한 것 21 |
| 가르치고 마-1(끝) | `src/core/teacher/name.ts` | 회화 11 이 한 문장만 지움 | 처음 회화 안내(C145) |
| 시드 규격 · 가르치고 자-2 | `src/core/seed/**` · `seed/settings.json` · `seed/manifest` · `seed/prompts/README.md` | 그 작업이 파일을 놓은 뒤 회화 1 · 3 · 4 | 같은 파일 동시 편집 금지 |
| 평가 plan(P12, `intent/2026-10-29-학습-평가-체계/plan.md`) | talk_turns.evidence 열 · 근거 칸 Zod · talkEvidenceOf · exposureOf · 근거 상태 · 집계 · evidence.* 키 · 합성 사례 · 보고 스크립트 · 마이그레이션 번호 · seed/settings.json · 12절 사본 · `src/server/conversation/state.ts`(onTalkSessionEnded 안 한 줄, P12 평11) | 설정 파일은 회화 1 이 먼저 고치고 P12 평가 키 15(평3)는 그 Approved 뒤, 마이그레이션은 먼저 닿는 쪽이 0006(파일 따로, generate 는 한 사람), 근거 쓰기 한 줄은 회화 18 이나 그 뒤 P12(평10), 이음매 한 줄은 회화 8 뒤이면서 회화 7 · 12 · 18 이 state.ts 를 잡지 않은 때 | 정한 것 22. P12 는 12절 사본의 회화 전용 줄 두 행(정한 것 14)을 회화 12 까지 지킨다. 이음매는 참여 완료 셋(마무리 물음 답 · 바닥선 끝 · 참여 있는 '그만하기')에서 completed, 확인 뒤 중단 · 옛 꼴 카드 닫기 · 이어 하기 시간 지남에서 aborted 로 불린다(회화 8 · 9 · 12). AC-15v 는 이 plan 이, AC-15z 는 P12 가 증명 주인이다 |
| 자유 대화 spec(draft) | 대화 기록 조각 · 대화 기록 고르기 · tori_ko 1~4단계 | 회화 10 이 먼저 만들고 자유 대화 (나)가 다시 씀 | 자유 대화 (가)는 이 plan 의 10 · 11 이다(C189). 그 spec 의 수용 기준 7 은 정본 AC-15q 로 여기서 증명한다 |
| 변경 단위 ⑤(수업 중 한국어 질문) | 바닥선의 단추 짚기 · ko_help | 이 plan 은 자리만 | C144 |

## 위험 · 제약 (Risks)

| 번호 | 위험 | 막는 법 | 되돌리기 |
|---|---|---|---|
| 1 | 겹치는 파일(위 표). 커밋 전 한 워크트리에 세 변경 단위가 섞인다 | 파일 잠금: 한 파일은 한 구현자, 먼저 잡은 쪽이 Approved 될 때까지 기다린다. 묶음 보고에 바꾼 줄 목록을 남긴다 | `git checkout -- <파일>` 은 다른 묶음까지 지우므로 쓰지 않고 줄 목록으로 되돌린다 |
| 2 | 옛 갈래 · 새 갈래가 함께 있는 동안(3~11) 개발 서버의 옛 흐름이 새 단계 규격 행에서 틀린다 | 그 사이 push 가 없고, 옛 흐름은 시험만 지킨다(정한 것 1). 묶음 12 끝 판정의 grep 0 | 갈래 고르기 한 줄 |
| 3 | 정본 사본을 덮으면 check:ids 가 12절 82줄에서 멈추고, 없앤 키 둘 · 새 키 24 가 위반이 된다(10-30 실측) | 차례 1(정본 꼴 고침) → 묶음 1(키 적재 · 전용 줄 둘) → 묶음 12(전용 줄 지움) | 복사 전 사본 |
| 4 | 판 규칙: 새 개정 카드는 그 개정으로 시작한 단원 회차에서만 보여 프리뷰에서 안 보일 수 있다 | 정한 것 21(단원 바로 가기 새 회차) | 관찰 쪽 전용 |
| 5 | 열거형 값 더하기(prep): 같은 트랜잭션에서 그 값을 쓰면 실패한다 | 마이그레이션 파일은 더하기만 하고 값을 쓰지 않는다. 개발 DB 에 먼저 돌리고 운영은 배포 때 | 열 · 값은 비워 두면 영향 없음 |
| 6 | 카드 질이 낮거나 프리뷰 뒤 브리프를 고치면 26장을 다시 만든다(우려 6) | 세 장 먼저 · 시드 검토(Fable max) · S10 결론 xhigh · 같은 종류 오류 둘이면 브리프 고침(README 5절) | 개정 판이라 앞 판이 남음 |
| 7 | 단원 목표가 잠정이다(우려 7) | 학습 설계자 안 → 설계 검토 → 요청자 승인, 바뀌면 카드 목표 칸만 정정 판 | 정정 판 |
| 8 | 1~3단계 AI 질문의 되돌림이 잦으면 다시 카드 차례처럼 들린다(우려 1) | talk:observe 로 되돌림 비율을 재고, 높으면 고정부에 단계 낱말 목록을 좁혀 넣는다 | 고정부 한 줄 |
| 9 | 첫 소리 · 체감 대기(우려 2). 질문 잡아 두기로 1~3단계 질문 소리가 늦을 수 있다 | 반응 문장은 바로 흘리고 질문만 잡는다. 맞장구(talk.wait_line_seconds)로 빈 시간을 채운다. ai_calls 첫 문장 시간과 체감 대기를 프리뷰에서 잰다(AC-N8) | 잡아 두기 갈래 |
| 10 | 비용(우려 3, NFR-2: 1~3단계 한 대화 0.21달러의 1.2배 안) | talk:observe · ai_calls 로 재고, 넘으면 사용자 메시지 · 가변부를 줄인다 | 설정 · 고정부 |
| 11 | iPad 실측이 모자라고 말없이 막힌 아이가 기기 쪽으로 다뤄진다(우려 9 · 17, C148 · C149) | '잘 모르겠어요' 반짝임, client_listen · sp 기록, 사용 시험에서 기기별 들리지 않음 비율 | 설정값 |
| 12 | 0c664c3 고침(1~3단계 '모름' 턴 A~E · C148 no-speech · C149 client_listen · 듣는 동안 단추 끔 · 체감 대기)이 새 갈래에서 빠질 수 있다 | 그 시험(talk-hold · talk-child-listen · talk-listen-log · conversation-said 등)을 새 갈래 시험으로 옮기고 묶음 12 에서 옛 몫만 지운다 | 없음 |
| 13 | 통합 · e2e 를 이 Mac 에서 못 돌리고 11-01 전에는 CI push 를 하지 않는다 | 정적으로 쓰고 차례 12 에서 몰아 고친다(fix 3회). 실행 기록 전에는 완료로 적지 않는다 | 없음 |
| 14 | 1단계 회화가 둘째 프리뷰까지 닫힌다(정한 것 2) | 프리뷰 상태표 첫 줄 · 요청자에게 알림. 이의가 있으면 묶음 12 의 '닫기'만 미룬다 | 닫기 한 줄 |
| 15 | 평가 plan 순서: 근거 칸 열 · talkEvidenceOf · 노출 판정 · evidence.match_cut 이 P12 에서 늦다 | 18 은 move 사실 · 앱 확인 · 후보 셈만 하고 근거 쓰기 한 줄은 P12 가 뒤에 넣으며, 앞 행은 P12 채움 함수가 채운다. expression needs 는 확인 보류이고, 노출 판정 함수가 늦으면 18 의 앱 확인이 그 함수를 기다린다(정한 것 22) | 없음 |
| 16 | 원칙 경계: T2(1~3단계 영어 글 미리 안 보임) · R2(채점 없음) · 녹음 없음 · AI 는 서버만 · Zod · 숫자는 설정값 · 횟수로 통과시키지 않음 · 유효 수행 턴 운영 반영 없음(C188) | 대화 기록 고르기 시험 · 응답 꼴에 판정 칸 없음 · 단원 판정이 후보 셈을 읽지 않음(AC-15u) · check:ids design-number 상한 · participation_ratio grep 0 | 없음 |

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 | 묶음 |
|---|---|---|---|
| AC-15a | Playwright 고정 표본: 3단계 네 토막 · 쪽지 글 · 다지기 낱말 없음 · 위 띠 · 마무리 물음 · 정리 한 번(1단계 첫 꼴은 16) | `tests/e2e/talk-lesson.spec.ts`(제안) | 11 · 16 |
| AC-15b | 통합(가짜 클라이언트): 문장 검사 · 1~3단계 카드 자리 물음표 지움 · 힌트 대신 · 끊긴 턴 · 두 번 실패 · 거절. 단위: 질문 문장 검사 | `tests/integration/talk-lesson-turn.test.ts`(제안) · `tests/unit/talk-question-check.test.ts`(제안) | 6 · 8 |
| AC-15c | 단위: 새 칸 · 칸 차례 · 정규화 · 점수 없음 · '말했다' · S-3. 계약 표본 | `tests/unit/talk-lesson-call.test.ts`(제안) · `tests/contract/ai-schemas.test.ts` · `conversation-said.test.ts` | 6 |
| AC-15d | 단위(끝맺음 정규화) + Playwright 회귀(둘째 장은 4단계부터라 둘째 장이 화면에 생긴 뒤 — 보정 11-05 (14)) | `talk-lesson-call.test.ts` · `talk-lesson.spec.ts` | 6 · 16~17 |
| AC-15e | Playwright 회귀: 마무리 세 장 · 1~3단계 둘째 장 없음 | `talk-lesson.spec.ts` | 11 |
| AC-15f | 통합: 홈 · 참여가 거의 없을 때만 확인 · 이어 하기 · 30분 끝맺음 · 같은 시도 id. Playwright | `tests/integration/talk-lesson-session.test.ts` · `talk-lesson-closing.test.ts`(30분 끝맺음 · 다른 기기 · 같은 시도 id · 마지막 턴 다시 받기 — 보정 (15)) · `talk-lesson.spec.ts` | 9 · 11 · 12 |
| AC-8c(끝맺음 몫) | 통합: 참여 있는 '그만하기' 뒤 끝맺음 호출의 최대 출력 · 기다림 · 기록 칸, 끝맺음 두 요청이면 호출 하나, 옛 꼴 대기 기록 건너뜀(보정 (15), 옛 통합에서 옮김) | `tests/integration/talk-lesson-call.test.ts` · `talk-lesson-closing.test.ts` | 12 |
| AC-8f · AC-8i(회화 몫) | 통합: 회화 턴 요청 꼴 — 모델 설정이 Haiku 면 thinking disabled · fallbacks 없음, 1~3단계 기본(C112), 4단계부터, 대체 모델 비용, 4~6 Haiku, effort 구간(보정 (15)) | `tests/integration/talk-lesson-call.test.ts` | 12 |
| AC-16b · AC-16c · AC-N4(회화 몫) | 통합: 요약 저장(한국어 · 가림 · talk.memory_summaries 개) · 다음 대화 요청에 실림 · 아이 원문 가림 · 끝난 뒤 보낸 메시지 지움 · 요청 본문 가림(보정 (15)) | `tests/integration/talk-lesson-call.test.ts` · `talk-lesson-closing.test.ts` | 12 |
| 1-가 하루 안전 상한(회화 셋) · 같은 시도 id 겹침 · 두 기기 · AC-2c 회화 다시 하기 | 통합: 상한 날 새 회화 막힘 · 도중 쉬는 안내와 다음 학습일 같은 시도 id · 쉬는 날 '그만하기' 끝맺음 없이 중단, 진행 중 두 기기는 AI 없이 다시 읽으라는 답, 같은 주제 변형 · 친한 정도 안 오름; 요청 꼴 쪽은 safety_cap 행 · 설정 문제 config · 첫 문장 시간 · 연결 오류 한 번 다시(보정 (15)) | `tests/integration/talk-lesson-closing.test.ts` · `talk-lesson-call.test.ts` | 12 |
| AC-23f(회화 몫) | Playwright: 말로 보낸 아이 턴마다 측정 — 바로 보낸 1~3단계 턴은 선택지를 말해 바로 보내는 턴으로(보정 (15), 묶음 12 검토 I-1) | `tests/e2e/required-utterance.spec.ts` | 12 |
| AC-15g | 단위: 받침 셋 · 들리지 않음 · 셈. Playwright: 짧은 준비 · 받침 · 막힘 화면 · 한국어 설명 · 힌트 열림(바닥선 몫은 16) | `tests/unit/talk-lesson-flow.test.ts`(제안) · `talk-lesson.spec.ts` | 5 · 11 · 16 |
| AC-15h | 단위 회귀(힌트 · '말했다'), Playwright 1단계 몫 | `conversation-said.test.ts` · `talk-lesson.spec.ts` | 12 · 16 |
| AC-15i | 통합: 카드 자리 넷 · 붙일 기회 차례 · 이월 안 붙음 · 걸린 뒤 같은 질문 없음. 단위: 붙일 기회 | `talk-lesson-turn.test.ts` · `tests/unit/talk-chances.test.ts`(제안) | 5 · 8 |
| AC-15j | 통합 회귀: 80턴 닫기 · 둘째 알림 | `talk-lesson-session.test.ts` | 12 |
| AC-15k | 통합: 요청 본문 앞부분 같음 · 앞 선생님 차례에 소리 줄 · 받침 줄 · 카드 질문, 맞장구 없음. 단위: 사용자 메시지 줄 | `talk-lesson-turn.test.ts` · `talk-lesson-call.test.ts` | 6 · 8 |
| AC-15l | Playwright: 말풍선 다시 읽기 · 힌트 안내 한 번 · 응답 끝까지 힌트 흐림(선택지 다시 듣기는 16) | `talk-lesson.spec.ts` | 11 · 16 |
| AC-15m | 단위: 거부 목록 · 안 거부 목록 · 일부 단원 경고. Playwright: 처음 · 다시 묻는 턴 보임 | `tests/unit/seed-validator-talk.test.ts` · `talk-lesson.spec.ts` | 3 · 4 · 11 |
| AC-15n | Playwright + 단위: 4단계 준비 없이 · (가)(나)로 열림 · 인사 턴 셈 · 첫 질문 AI 0회 | `talk-lesson.spec.ts` · `talk-lesson-flow.test.ts` | 17 |
| AC-15o | 수동 스크립트(개발 키): 3단계(첫) · 4단계(둘째) 대본, 사람 판정 칸 | `pnpm talk:observe --yes`(제안) · 작업 장부 `observe-3.md` · `observe-4.md` | 13 · 20 |
| AC-15p | Playwright: 3단계 힌트 차례(1단계 그림은 16) | `talk-lesson.spec.ts` | 11 · 16 |
| AC-15q | 단위: 대화 기록 고르기(T2). Playwright: 남음 · 넘김 · 이어 하기 다시 그림 · 따라 말하기 인식 글 | `tests/unit/talk-log.test.ts`(제안) · `talk-lesson.spec.ts` | 10 · 11 |
| AC-15r | 단위: 돌아오기 알림 · 기회 때문의 카드 자리 없음 · 같은 질문. 통합 | `talk-chances.test.ts` · `talk-question-check.test.ts` · `talk-lesson-turn.test.ts` | 5 · 8 |
| AC-15s | 통합 + Playwright: '못 들었어요' · 들리지 않음 · 까닭 · 반짝임. validity(technical(nospeech) · dont_know)는 P12 의 talkEvidenceOf 단위 시험과 이 plan 의 통합(열이 생긴 뒤) | `talk-lesson-turn.test.ts` · `talk-lesson.spec.ts` · P12 시험 | 8 · 11 · 18 |
| AC-15t | 단위: 끝난 길 (가)~(마) · 참여가 거의 없음. 통합 · Playwright | `tests/unit/talk-ending.test.ts`(제안) · `talk-lesson-session.test.ts` · `talk-lesson.spec.ts` | 5 · 9 · 11 |
| AC-15u | 단위 + Playwright: 바닥선 완료 · 별 · 첫 장 줄 · 연습 · 통과 실적 · 후보 셈 안 오름 · 이월 | `talk-ending.test.ts` · `tests/unit/talk-candidates.test.ts`(제안) · `talk-carry.test.ts`(제안) · `talk-lesson.spec.ts` | 16 · 18 |
| AC-15v | 단위: move 꼴 · 지움 · 아이가 보인 능력 확인(18). 통합: 선생님 행마다 move, 열이 생긴 뒤 근거 칸 task · goal · 확인 보류 · 노출 · assist(P12 의 talkEvidenceOf 를 씀) | `tests/unit/talk-move.test.ts` · `talk-goal-link.test.ts`(제안) · `talk-lesson-turn.test.ts` | 7 · 8 · 18 |
| AC-15w | 요청자 프리뷰 기록 | `seed/reviews/talk-{3,1,4,5}.json` | 14 · 20 |
| AC-15x | Playwright + 통합: 미션 체크 말 입력만 · 역할 바꾸기 상한 · purpose. 수동: 거절 대화 | `talk-lesson.spec.ts` · `talk-lesson-turn.test.ts` · `talk:observe` | 17 · 20 |
| AC-15y | 단위 + 통합: 이월 차례 · 카드 자리에 안 붙음 · 2 에 닿으면 빠짐 · 근거 상태 함수를 부르지 않음 | `talk-carry.test.ts` · `talk-lesson-session.test.ts` | 18 |
| AC-15z | P12 의 합성 사례 · 보고 스크립트가 증명 주인이다(1단계 입문자 단원의 통과 실적 · 후보 셈 · 진도 막힘 후보). 이 plan 은 후보 셈 · 진도 막힘 후보 함수와 그 단위 시험, 사용 시험 기록 꼴 항목을 준다 | P12 합성 사례 파일 · `talk-candidates.test.ts`(제안) · 작업 장부 `usage-test-form.md`(제안) | 18 · P12 |
| AC-16a | 단위 + 통합: 그만하기 · 바닥선 완료에 1칸, 확인 뒤 중단은 그대로 | `talk-ending.test.ts` · `talk-lesson-session.test.ts` | 7 · 9 · 16 |
| AC-7a | 단위 + 통합: 회화 1~6단계 빈 칸이면 완전성 실패, `--partial` 은 보고만 · main.yml 그대로 | `seed-validator-complete.test.ts` · `tests/integration/seed-load.test.ts` | 2 · 3 · 15 |
| AC-12h | 통합: 짧은 준비 셋 · 정리 한 번이 오늘 영어로 말한 문장에 든다 | `talk-lesson-session.test.ts` | 9 |
| AC-N2 | 수동: 표본 평가 · 사용 시험 ai_calls 의 1~3단계 한 대화 비용 · 캐시 읽기 비율을 6.6 추정(캐시 없음 약 0.24 · 캐시가 맞을 때 약 0.10달러, NFR-2 는 0.21 의 1.2배 안)과 견줌 | `talk:observe` · `talk:metrics`(제안) | 14 · 18 |
| AC-N8 | Playwright 흘려 받기 + 사용 시험 첫 문장 p95 · 체감 대기 | `talk-lesson.spec.ts` · ai_calls | 11 · 14 |
| AC-N10 | Playwright: 점 셋 · '생각' · 1.5초 맞장구 · 첫 문장은 그 뒤 · 기록에 없음 · 말풍선 남음 | `talk-lesson.spec.ts` | 10 · 11 |
| 늘 | 린트 · 형 · 단위 · 의존 · 식별자 · 추적 · 시드 · 그림 · 빌드 · 첫 JS(Node 24 PATH) | `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids --fail-on …`(CI 목록) · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec --plan intent/2026-10-29-회화-수업을-대화로/plan.md` · `pnpm seed:validate` · `pnpm images:check` · `pnpm build` · `pnpm check:bundle` | 모두 |
| T-2 | 진행 참고값 키가 다시 생기지 않음 | `grep -rn participation_ratio src seed tests scripts` 0 | 5 · 12 |

시험 이름 머리에는 정본 번호를 쓴다(예 'AC-15r 기회 때문의 카드 자리 없음'). 1~3단계 회화 턴은 실호출이라 단위 · 통합은 가짜 응답(fixtures)과 출력 검사로 증명하고, 실호출은 talk:observe(컨트롤러) · 프리뷰 사용(요청자)으로 가른다.

## 완료 조건 · 커밋 · 프리뷰

- **첫 프리뷰 완료.** (1) 3단계 단원 1 카드(세 장, 뒤에 26장)가 새 검증기를 그대로 통과하고 개발 DB 에 적재됐다(경고 우회 · 고친 사본이 아님). (2) 묶음 1~13 이 검토 Approved 이고 늘 하는 관문을 지났다. (3) 요청자가 3단계로 '선생님과 대화한다는 느낌'을 기록했고(AC-15w), 화면 검토 보고와 talk:observe 보고가 있다. (4) 옛 갈래 0 · 사본 = 정본이다. (5) 통합 · e2e 실행 기록이 있다(11-01 뒤).
- **커밋.** 후보 경계는 1 · 2 끝 / 3 끝 / 4 끝 / 5~9 끝 / 10~12 끝 / 화면 검토 뒤다. 실제 커밋 · push 는 요청자 지시로 UI · UX 1차 묶음 · 가르치고 첫 묶음과 함께 하고(L-19), 11-01 전 push 면 [skip ci] 를 단다. 이 plan 은 push 하지 않는다. 여러 묶음 · 변경 단위가 고치는 파일(talk-frame · tori · child-turn · follow-along · closing-cards · conversation/index.ts · specs 사본)은 뒤 묶음의 커밋에 함께 든다.
- **프리뷰.** 프리뷰 상태표(아티팩트) 첫 줄에 되는 것 · 안 되는 것과 정규 시드임을 적고, 관찰 쪽 단원 바로 가기로 3단계 단원 1 에 들어간다. 첫 · 둘째 프리뷰는 정본 11절 1-가 (9)이고, 셋째의 1~6단계 시드가 차면 운영 배포(1-나 끝), 7~12단계는 2차다.

## 둘째 · 셋째

| 묶음 | 범위 | 조건 | 이 plan 에서 |
|---|---|---|---|
| 둘째(16~20) | 1단계(선택지 첫 꼴 · 꺼내기 소리 줄 · 바닥선과 끝맺음 · 그림 낱말 · talk-1 둘째 판 · 단원 1), 4단계(필요할 때만 짧은 준비 (가) · AI 쉬운 질문 · talk-4 · 단원 1), 5단계(미션 목표 · 역할 바꾸기 · talk-5 · 단원 1), 기록(근거 칸 출처 · 아이가 보인 능력과 앱 확인 · 아이가 물음 · 이월 · 후보 셈 · 단원 단위 검증기), 바닥선 듣기 활동 동안 '그만하기' 숨김(바닥선은 앱이 끝을 정한 길) | 첫 프리뷰 완료, UI · UX 6, 1 · 4 · 5단계 단원 목표 | 묶음 · 파일 · 증명까지 적음. 시작 때 이 plan 의 바뀌는 파일 표를 그 묶음 몫으로 고쳐 쓴다 |
| 셋째 | 설계 9 (나) ②~⑦(3단계 단원 2~5 · 1단계 단원 2~5 다시 · 4 · 5단계 2~5 · 2 · 6단계 · 회화 평가 카드 2~6단계 · 7~12단계 2차), 회화 평가 카드 겹침 다시 셈, 사용 시험 측정(카드 자리 되돌림 비율 · 받침 · 바닥선 빈도 · 들리지 않음 비율(기기별) · 따라가기와 돌아온 비율 · 참여 완료까지 말 주고받기 수와 시간 · 다룬 기회 비율 · 이월 크기 · 자발 연결과 사람 판정 · 끝난 길 비율 · 마무리 제안 위치 · 진도 막힘 후보 · 확인 보류 수 · 비용 · 설계 10 기본값) | 둘째 끝, 단원 목표 승인, 운영 배포 전 완전성 | 범위만 |

## plan 밖 · 열린 질문

| 항목 | 몫 | 이 plan 이 하는 것 |
|---|---|---|
| 1단계 회화를 둘째 프리뷰까지 닫는 것(정한 것 2) | 요청자(이의가 있으면 묶음 12 의 닫기만 미룸) | 상태표 첫 줄 · 알림 |
| 3단계 단원 1 회화 목표(잠정) 승인 · 첫 프리뷰 뒤 talk.prep_mode.1-3 · 맞장구 다섯 줄 · 브리프 고침 여부 · 4 · 5단계 프리뷰 단원(4-2 · 5-4로 바꿀지) | 요청자 | 묶음 4 안 · 프리뷰에서 견줌 |
| 정본 12절 82줄 꼴 고침 · plan 승인 13절 한 줄 · 사본 전용 줄 둘 · 개발 DB 쓰기 · 개정 호출 값 | 컨트롤러 | 차례 1 · 3 · 5 · 10 |
| 저장소 CLAUDE.md 13줄의 회화 흐름 문장(C189 와 어긋남, 정본 반영 보고) | 컨트롤러 | 없음 |
| UI · UX plan 묶음 6 의 파일 목록에 talk-log.tsx 를 더하고 6 을 회화 12 뒤로 두기 | 컨트롤러 | 경계 표 |
| 평가 plan(P12)과의 경계: 근거 칸 · talkEvidenceOf · 노출 · 상태 · 집계 · 합성 사례 · 보고는 P12, move · 앱 확인 · 후보 셈 · 이월은 이 plan(10-30 plan-eval 과 맞춤) | P12 | move 사실 · 앱 확인 · 후보 셈 함수 |
| spec 문장을 좁힌 해석 둘(정한 것 11 마무리 제안은 '다 다룸' 턴만, 정한 것 18 질문이 지워진 카드 자리의 대신 질문)의 수용 | 컨트롤러(넓히려면 요청자) | 정한 것 |
| 부모 화면 대화 기록 · 원문 정리 Cron · 부모의 대화 지우기 | 1-나 | eraseTalkMoveText 를 둠 |

## 확인한 사실과 출처

모두 2026-10-30 05시대의 p13d 와 본 저장소에서 확인했다.
- p13d 는 머리 0c664c3 위 커밋 전 255자리다. seed/settings.json 은 225행이고 12절 새 키 15 가 없으며, talk.practice_rounds · talk.reask_sentence_every_turns 가 있고 talk.dontknow_max 의 바꾸는 곳은 advanced 다.
- p13d 의 check:ids 로 본 저장소 specs 를 읽으면 '12절 82줄 모르는 바꾸는 곳: 고급(운영 반영 때 결정 기록 먼저)'으로 멈춘다. 그 칸만 '고급'으로 바꾼 스크래치패드 사본으로 돌리면 spec-setting-missing 24 · seed-setting-unknown 2 · code-setting-unknown 7(talk.ts · conversation/index.ts · state.ts · 시험 고정값) · setting-change-via 1(talk.dontknow_max) · design-number 47 이다.
- talk.participation_ratio 는 src · seed · tests · scripts · settings.json · 정본 12절 표에 없고 13절 C181 · C188 · C189 문장에만 있다. 13절의 마지막 줄은 C191 이다.
- unit-specs 의 회화 60행에는 goals 가 하나도 없다. 회화 3단계 단원 1 은 '주말에 하는 일'(일반동사 현재, 단어 25)이다. evidence.match_cut 은 평가 spec 8절에만 있고 settings.json · 12절에 없다.
- 회화 시드는 `seed/lessons/talk/1/1~5.json`(옛 꼴)뿐이고 `seed/prompts/talk-3.md` 는 없다. 회화 단계 규격 행은 segments 에 today_words · practice, cardShape turns · questions, twoAnswers 가 있고 koMeaning 은 1~4단계만 참이다.
- 런타임은 `state.ts` 에서 `LESSON_SCHEMAS.talk.parse` · `TalkLevelSpecSchema.parse` 로 카드 · 단계 규격을 엄격히 읽는다(옛 행은 새 꼴로 읽으면 던진다). 시작 개정은 단원에 들 때의 시드 전체 최신 개정이다(`src/server/seed/read.ts` 머리).
- talk_turns 에 move · evidence 칸이 없고, talk_segment 열거형에 prep 이 없으며, heard_help 는 two_answers · answer_example 이다. 끝맺음 기록은 attempts 의 talk-closing(까닭 stop · leave · safety · resting · idle · aborted)이다.
- seed:load 에는 일부 받기가 없고 완전성 끝은 인자나 settings(seed.complete_through_level 6)다. dev-load.yml 입력은 complete_through · areas · reference_only 셋이고 main.yml 은 운영 적재 때만 돈다. 관찰 쪽 단원 바로 가기는 1단계만 옮긴다(PREVIEW_JUMP_LEVEL).
- client_listen 꼴에는 읽어 주기 감시 결과 칸이 없고(UI · UX L-15), 음성 층의 감시 결과는 played · no_end · not_played 다(`src/core/speech/pace.ts`).
- 로컬 `pnpm test` 는 단위 · 계약 시험만 돈다(vitest unit 프로젝트). 회화 시험은 단위 열여섯 파일(conversation-* · talk-* · seed-validator-talk), 통합 셋(conversation-*)과 견본 talk-fixture, e2e 의 conversation.spec 과 required-utterance · required-recovery 의 회화 몫, 도우미 tests/e2e/talk.ts 다.
- UI · UX 묶음 6 은 회화 구현을 기다리고, 그 앞 묶음(0 · 2 · 3 · 4-가 · 5-가 · 5-나)의 검토 결과는 그 장부 L-29~L-48 에 있다. 가르치고는 라-3 이 검토 중이고(세션 틀 · 말하기 조각), 라-4 fix 1 이 closing-cards.tsx 의 단어 소리 단추 접근 이름 두 줄을 바꿨다(T-4).

## 완료 보고 (Done)

구현 뒤 채운다: 실제 바뀐 파일(계획과 다른 것 표시) · 시험 결과(단위 수 · 통합 · e2e 실행 기록) · 시드 검증 · 적재 보고 · 표본 평가 보고 · 요청자 시험 · 화면 검토 결과 · 남긴 것 · 커밋.

보정(10-30 08:2x, 요청자 지시 '회화 3단계 전부 만들지 않고 일단 변경된 거 볼려고 하니까 시드 한두 개여도 상관없어'): 첫 프리뷰의 카드는 두 장(3단계 단원 1 배정 수업 1 · 다지기 수업 6, 변형 1 — 처음 묻는 턴과 다시 묻는 턴을 둘 다 보이게)으로 줄인다(정한 것 16 의 세 장 → 두 장, 단원 목표 · 브리프는 그대로 만들되 덮음 표는 두 장 중심). 묶음 15(나머지 스물넷)와 묶음 13(실호출 관찰 도구 talk:observe)은 첫 프리뷰 뒤로 옮겨, 첫 프리뷰 전 묶음은 3~12 와 14 다. 개발 적재는 --partial 로 두 장만.

보정(10-30 09:2x, C194 — 묶음 5 검토 I-3): 정한 것 18 의 대신 질문을 받침 셋째 닫기 · 들리지 않음 닫기와 대화 중 짧은 준비 뒤 첫 질문에도 쓴다(1~3단계 '답 소리 → 다음 질문' 차례를 지킬 자리가 AI 차례에 없음). 잠정이고 첫 프리뷰에서 요청자 확인을 받는다. 같은 때 1~4단계 쉬운 질문의 한국어 뜻(C194 (2))과 AC-19d 끝 문장 고침(C194 (3))을 정했다.

보정(11-05 14:0x, 묶음 7 코드 검토 I-1 · M-4): (1) 107줄의 짧은 준비 활동 번호 범위는 '카드 오늘 쓸 말 수'가 아니라 max(카드 오늘 쓸 말 수, talk.prep_words.<구간>)이다. 다지기 · 보강 카드는 오늘 쓸 말이 비어 있는데 정본 02-2 173줄은 그 수업도 이월 단어를 앞세워 talk.prep_words.<구간> 개까지 준비하므로, 107줄을 글자대로 따르면 범위가 0 이 되어 첫 낱말부터 RangeError 가 난다(묶음 7 fix 1 이 고침, 정본이 plan 보다 우선). (2) 168줄 묶음 8 행의 파일에 `src/server/conversation/closing.ts` 를 더한다. 묶음 7 이 runTalkClosing · talkClosingStatus 를 옛 갈래(readTalkState)로 남겼고 새 꼴 세션의 끝맺음은 묶음 8 이 잇는다. 서버 파일 잠금표(장부 T-19)의 closing.ts 는 3 · 7 · 8 · 12 · 16 이 되고, talkClosingStatus 를 부르는 화면 쪽은 묶음 9 · 11 이다.

보정(11-05 15:1x, 묶음 9 코드 검토 I-1): (3) 새 꼴 세션의 '힌트' 단을 여는 서버 길(current 의 힌트 단 보기 — 옛 HintView 꼴, 1~3단계 영어 단 글은 비움 — 과 revealTalkLessonHint: 마지막 선생님 행 move.item 의 카드 항목, 없으면 그 행의 AI 힌트 → lessonHintTiersOf → 그 단의 글, 연 단 기록)은 파일 표 어느 묶음에도 없었다. 묶음 9(index.ts) 몫으로 더한다(fix 1). AC-15a · 15p 의 서버 몫은 묶음 9, 화면 몫은 묶음 11 이 증명한다.

보정(11-05 15:1x, 묶음 9 코드 검토 M-1 · 확인 둘): (4) 대화 중 짧은 준비가 끝날 때 앱이 붙이는 'Now let's talk.' 의 한국어 뜻은 '이제 이야기해 보자!' 다(문구 절의 아이 화면 새 글에 더함, 잠정 · 첫 프리뷰에서 요청자 확인). (5) 서버 액션 감싸기 파일과 회화 쪽 page.tsx 는 파일 표 어느 묶음에도 없었다 — 묶음 11 파일에 넣고, 감싸기 첫 문장은 가족 접근 쿠키 확인(requireAccess)이다. (6) 묶음 12 브리프에는 묶음 9 가 옛 이름과 따로 둔 새 액션 일곱의 짝인 옛 이름(지울 것)을 적는다.

보정(11-05 15:2x, 묶음 8 코드 검토 — 우려 2 · 잠금표): (7) 단원 목표 글(goalTexts)은 적재기가 단원 규격 행에 담지 않아 개정 3 을 적재해도 가변부가 'G1: -' 꼴로 남는다. 묶음 8 fix 1 이 한 묶음으로 한다 — 다음 번호 마이그레이션으로 unit_specs 에 goals jsonb(비울 수 있음), Drizzle 스키마, 적재기(행 값 · 해시 몸통)에 goals, 읽기 함수, lesson-turn.ts · closing.ts 두 부름이 goalTexts 를 넘김. P12 의 열은 그다음 번호다(정한 것 22 의 '다른 파일' 그대로). (8) 묶음 8 이 turn.ts 를 `lesson-turn.ts`(턴 길) · `lesson-input.ts`(호출 입력 공용)로 나눴다. 서버 파일 잠금표에 두 파일을 더한다: lesson-turn.ts 8 · 12 · 16 · 17 · 18, lesson-input.ts 8 · 12 · 16 · 18(묶음 16 · 17 · 18 행의 turn.ts 몫은 그 두 파일을 함께 가리킨다).

보정(11-05 15:2x, 묶음 11 구현자 물음): (9) 새 꼴 턴 줄(TalkLessonLine · 끝 줄 lesson 칸)을 읽는 화면 쪽 흘려 받기 `src/lib/talk-stream.ts` 가 파일 표 어느 묶음에도 없었다. 묶음 11 파일로 더한다 — 더하기만: 새 이름 `sendTalkLessonTurnRetrying`(같은 되풀이 · 같은 시도 id 규칙, 처리기 onSentence · onKo · onAdd · onSound · onEnd · onResting · onBreak · onClose · onError)과 단위 시험, 옛 이름은 묶음 12 가 지운다.

보정(11-05 15:4x, 묶음 10 코드 검토 — 컨트롤러 결정 둘): (10) 1~3단계 소리 줄(따라 할 말 · 선택지)을 들려주지 못했을 때 작은 '다음' 단추를 두지 않는다 — 회화는 읽는 동안에도 말하기 단추가 열려 있어(C166 R1) 막다른 화면이 되지 않고, 안내 한 줄과 다시 듣기 단추만 둔다(7절 34줄의 '소리가 과제 자극인 자리' 규칙과의 차이, 첫 프리뷰에서 확인). (11) '1~3단계 AI 차례 힌트 흐림'(파일 표 180줄)은 아이 차례가 응답 끝 줄 뒤에만 열려 참이 될 자리가 없으므로 지운다. 07절 34줄의 회화 말풍선 안내 '소리가 안 나와서 글로 봐요'는 파일 표에 주인이 없었다 — 묶음 10 몫(fix 1).

보정(11-05 16:0x, 묶음 10 fix 1 재검토 N-1): (12) 회화 새 꼴 말풍선의 '소리가 안 나와서 글로 봐요' 안내도 세 영역 수업(07절 33줄)과 같이 한 세션에서 둘째부터 iPad 사파리 무음 모드 한 줄을 더한다(07절 34줄의 회화 말풍선 안내에 33줄 규칙을 넓힘, 첫 프리뷰에서 확인).

보정(11-05 16:0x, 묶음 11 코드 검토 I-2 · I-3 · I-4): (13) 끝 줄(TalkLessonNext)과 화면 자료 current 에 stuckInSlot(같은 질문 자리의 막힘 수 — 둘째 막힘부터 힌트 다 열기 AC-15p 의 서버 몫)과 imageKey(1~3단계 그림 턴, C32 · 03절 96줄 — 카드 항목의 그림 키)를 더한다. 파일은 묶음 8(lesson-turn.ts) · 9(index.ts) 것이지만 더하기만이라 묶음 11 fix 1 이 한 번에 한다(묶음 8 · 9 시험 그대로 통과). 정리 화면의 대화 기록 반짝임(03절 92줄)은 동작은 묶음 11, 꼴은 UI · UX 개선 묶음 6 이다.

보정(11-05 18:3x, 묶음 12 코드 검토 8절 · 컨트롤러): (14) AC-15d 의 Playwright 회귀는 묶음 12 에 쓸 자리가 없다 — 마무리 둘째 장은 4단계부터이고 `closing-cards.tsx` 가 두 구간 모두 첫째 · 셋째 장만 고르므로, 둘째 장이 화면에 생기는 묶음 16 · 17 로 옮긴다(증명 표 AC-15d 행 '12' → '16~17'). 묶음 12 가 지운 옛 통합 시험 가운데 새 꼴 세션도 지나는 공용 길(끝맺음 AC-8c · 요약 AC-16b · 지움 AC-16c · 요청 꼴 AC-8f · 안전 상한 · 같은 시도 id · AC-2c)의 뜻은 묶음 12 fix 1 이 새 꼴 견본으로 옮기고, 그 행은 fix 1 보고 뒤 증명 표에 더한다(보정 (15) 예정). `spec:trace` 가 1차 plan 의 증명 표만 읽어 이 plan 의 증명 표 빠짐을 못 잡는 틈은 첫 프리뷰 뒤 도구 몫이다.

보정(11-05 18:5x, 묶음 12 fix 1 · 컨트롤러): (15) 묶음 12 가 지운 옛 통합 시험 가운데 새 꼴 세션도 지나는 공용 길의 뜻을 새 통합 파일 둘로 옮겼다 — `tests/integration/talk-lesson-call.test.ts`(회화 턴 · 끝맺음 턴 요청 꼴 14건)와 `talk-lesson-closing.test.ts`(끝맺음 실행 · 홈 진입 정리 · 옛 꼴 대기 건너뜀 · 상한 셋 · 두 기기 · 겹침 · 마지막 턴 다시 받기 · AC-2c 17건). 증명 표에 AC-8c(끝맺음) · AC-8f · 8i · AC-16b · 16c · N4 · 1-가 상한 셋 · AC-23f 행을 더하고 AC-15f 행에 새 파일을 적었다. 모두 이 Mac 에서는 정적이고 CI 첫 실행에서 확인된다. 묶음 11 의 기존 e2e 두 곳(시험 어휘 밖 'Sunday' · N3 선택지 시험의 next_targets 없음)이 CI 에서 걸릴 수 있다는 구현자 우려는 fix 1 재검토가 판정한다.
