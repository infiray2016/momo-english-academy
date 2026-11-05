# Plan: 가르치고 배우는 수업 — 단어를 던지고 맞히게 하는 대신, 보여 주고 같이 해 본 뒤에 혼자 하게

spec: `intent/2026-10-29-가르치고-배우는-수업/spec.md`(3판 fix 3 · 596줄, approved 최종, 요청자 C182) · intent: `intent/2026-10-29-가르치고-배우는-수업/intent.md`(2판, C169) · 작성일: 2026-10-30 · 상태: approved(2판)
승인: 컨트롤러 2026-10-30 00:4x(C186, C139 · C141 의 하위 plan 승인 규칙 — 요청자 결정 C169 · C174 · C175 · C177 · C182 범위 안). 2판 보정 넷: 정한 것 6(의미 검사 실패는 '다시') · 정한 것 12(fix 1 이 켠 막음을 인자로 옮김) · 가(fix 2 · 원본 시드 둘 정정) · 설정값 문장(read_ko 는 fix 1 이 넣음) · 브랜치 · 워크트리: `feature/1a-p13d-teacher`(`.claude/worktrees/p13d`, 머리 0c664c3 위 커밋 전 78자리: 불편 1차 묶음 64 · 시드 규격 · 검증기 확장 · UI · UX 묶음 0-가 진행분) · 작업 장부: `.superpowers/sdd/2026-10-29-가르치고-배우는-수업/`

읽는 법. 파일 경로는 p13d 기준이다. 정본에 없는 새 이름(파일 · 함수 · 칸)에는 '(제안)'을 붙였다. 수용 기준은 델타 spec 번호(AC-1a~AC-N4)로 적었고, 시험 이름에는 정본 반영(C184) 뒤의 15절 번호를 쓴다. 델타 번호에 'AC-' 머리를 붙인 시험 이름은 CI 의 spec:trace(unknown-ac)에 걸린다. L-n 은 이 변경 단위 장부, 'UI · UX L-n' 은 UI · UX 장부의 항목이다. 묶음 가~카 는 브리프 차례를 따랐다. 코드 사실은 2026-10-29 23시대의 p13d 에서 확인했다(끝 절).

## 목표 (Goal)

읽기 · 쓰기 · 말하기 세션을 여섯 자리(오늘 배울 것 → 보여 주기 → 같이 해 보기 → 혼자 해 보기 → 다른 예시에서 스스로 → 되짚기)로 다시 짜고, 아이가 고른 선생님이 초상과 목소리로 그 자리를 이끈다(spec 설계 1 · 4, 정본 3.3 · 4절 · 7절은 C184 반영 뒤). 혼자 문항을 처음 틀리면 '왜' 한 줄 뒤에 같은 문제를 다시 하고(읽기 답 문장 띠 · 쓰기 색 칸 · 말하기 끊어 들려주기), 혼자 해 보기가 끝나면 틀린 문항의 짝을 lesson.spares_per_session.<영역> 까지 모아 내며, 세션 점수는 혼자 첫 시도만 센다(3.7). 말하기 3단계 질문 · 질문 짝 · 같이 해 보기는 한 순수 함수가 의미 검사(방향 · 핵심 정보 · 부정 · 틀린 정보) → 두 묶음 가르기(speaking.answer_match_pass 와 높은 쪽) → 혼자 질문의 AI 판정과 합치기 차례로 판정하고, 평가 spec [승인 A9] 확정 전에는 의사소통 정답의 수준 값을 운영 판정에 쓰지 않는다(C182 (1)~(3)). 결과 첫머리의 되짚기는 teach.goals 첫 목표의 독립 해냄이 lesson.recap_min_evidence 개 이상이고 비율이 lesson.recap_can_ratio 이상일 때만 closeKo 를 읽고 아니면 closeKoPracticed 를 읽으며, '오늘 만난 말'은 그 세션 보여 주기의 단원 단어 · 뜻과 칩을 단 문장 틀이다. 첫 묶음은 3단계 단원 1 세 영역이며, 새 칸이 든 원본 정규 시드 셋이 필수 검증(목표 검사 포함)을 그대로 통과하고 나머지 수업과 새 단어 그림 열 개를 만든 뒤 프리뷰에서 요청자 iPad 시험 · 화면 검토(Fable max) · 음성 점검으로 끝낸다(C177 (5) · C182 (4)).

## 묶음과 배정

구현자는 Opus · high, 코드 검토는 Opus · xhigh, 화면 · 시드 검토(design-reviewer)는 Fable · max, 브리프 작성(학습 설계자)은 Opus · xhigh, 시드 본 생성은 Opus · high 이고 호출마다 model · effort 를 적는다. 동시에 다섯까지 돌리고 한 파일은 한 구현자만 고친다(위험 1). 기능 묶음은 전체 루프(브리프 → 구현 → 코드 검토 → fix 3회까지 → 화면이면 화면 검토)이고, 가 는 이미 시작한 가벼운 루프(검토 high · 범위 한정)의 끝 부분만 남았다. 묶음 이름은 브리프 차례 가~카 에, 2판 보고가 남긴 검사를 맡는 타 를 더했다.

| 묶음 | 범위 | 먼저 끝날 것 | 검토 | 증명하는 AC |
|---|---|---|---|---|
| 가 | 검토 · 관문 확인: 코드 검토(Changes requested, I 5 · M 6)의 fix 1(끝, 10-30 00:3x) → fix 2(단원 목표 막음을 `--require-unit-goals` 인자로 옮김, 정한 것 12) → 범위 한정 재검토. 새 검사에 걸린 원본 시드 둘(말하기 짝 답이 본보기와 같음 · 읽기 짝 글 낱말이 글로서리에 없음, L-22)은 학습 설계자가 정정(v4). 그 뒤 관문 여섯(원본 시드 셋 그대로 필수 검증 통과) 다시 확인 | 구현자 2판(끝, 관문 여섯 종료 0) | 코드(범위 한정) | 1d · 4d · 6b · 6e · N4(검증 몫) · 8a(검증 몫) |
| 타 | 검증기 보탬: 2판 보고가 남긴 검사(같이 해 보기 빈칸 = 남은 카드 · 이름표 꼴 · 예 하나와 한 문장 답 · 되짚기 단정 꼴 · 유형 경계 · 짝의 유형 · 목표 같음과 본보기 다름 · 짝과 같이 해 보기 정답 검사), fix 3 의 시드 답 의미 검사, 짝 · 같이 해 보기 풀이 대상. 가 의 검토가 이미 지적해 고친 것은 뺀다 | 가 | 코드 | 1a · 2e · 4b · 4c · 5a · 5b · 7c · 6g(시드 몫) |
| 나 | 여섯 자리 활동 차례 · 짝 활동 고정 번호 · 짝 고르기 · 시도 꼴 판 2 · 이어 하기 · 서버 다시 셈 | 가 | 코드 | 2a · 1b · 2c |
| 다 | 판정: 쓰기 틀린 까닭 · 말하기 질문 판정(의미 검사 → 두 묶음 → AI 합치기) · 짝 · 같이 해 보기 채점 · P11c 질문 답 AI 길(이야기 넣기) | 나(attempt.ts 잠금) · 타(meaning.ts) | 코드 | 2b(함수) · 6g(단위 · 통합) |
| 라-1 | 자리 조각(새 파일): 선생님 줄 · 칩 · 이름표 · 오늘 배울 것 · 새 단어 · 본보기 · 같이 해 보기 · '왜' 말풍선 · 이야기 화면 · 짝 첫 장 | UI · UX 2-가 · 4-가, 마-1 | 코드 + 눈 점검 | 3a(조각) · N3(단위) |
| 라-2 | 읽기 · 쓰기 연결: 지문 늘 함께 · 이름표 · 띠 · 읽기 도움 모으기 · 까닭별 '왜' · 색 칸 · 둘째 틀림 정답 · 같이 해 보기 조립 | 라-1 · 나 · 다, UI · UX 5-가(session-frame) · 2-나(tiles · common) | 코드 + 화면 | 1c · 2b · 2e · 4b |
| 라-3 | 말하기 연결: 끊어 들려주기 · 듣기 다시 · 이야기 화면 · AI 질문 화면(P11c 몫) · 짝 · 같이 해 보기 말하기 | 라-2 · 마-2, UI · UX 5-나(speaking.tsx · repeat.tsx) | 코드 + 화면 | 1c · 4d · N3 |
| 라-4 | 결과 첫머리 되짚기 · 오늘 만난 말 · 칩 단 문장 틀 | 사, UI · UX 5-가(result-view · reward) | 코드 + 화면 | 7a |
| 마-1 | 음성 층: 목소리 고르기 · 한국어 lang · 한국어 감시 · speech.read_ko | UI · UX 0-라 | 코드 | 3b · N3(단위) |
| 마-2 | 선생님 고르는 때 당기기 · 첫 화면 읽어 주기 잠금 풀기 | 마-1 · 라-2(session-frame 잠금) · UI · UX 4-가 | 코드 + 화면 | 3c |
| 바 | 근거 값 함수(평가 spec 3절 이름) · 열이 생기면 저장 길 | 나 · 다 | 코드 | 6a · 6c · 6d · 6f · 6g(근거 몫) |
| 사 | 되짚기 마무리 줄 고르기 순수 함수 | 나 · 다 | 코드 | 7b |
| 아 | 수업 설계 지표 순수 함수 · 보고 명령 | 나 | 코드 | 10a |
| 자 | 브리프 틀 · 3단계 영역 브리프 셋 · 새 단어 그림 열 · S10 비교 · 나머지 수업 생성 · 검증 · 풀이 검사 · 적재 | 가 · 타(생성 전) | 시드 검토(Fable max) | 4a · 8a · 8b(3단계 몫) |
| 차 | 정본 반영 확인 · p13d specs 사본 맞춤 · check:ids · spec:trace | C183 · C184 · 가~아 · 타 | 컨트롤러 | 늘 |
| 카 | 프리뷰(회화 적용과 함께 커밋 · push) · 음성 점검 · 화면 검토 · 요청자 iPad 시험 · 지표 첫 주 보고 | 차 · 회화 적용 | 화면 · 사람 | 2d · N1 · 10a(보고) |

plan 이 정한 것(spec 이 plan 에 맡긴 자리와 구현 길):
1. **여섯 자리는 teach 칸이 있는 수업에서만 켠다.** teach 가 없는 수업(지금의 1단계 시드와 e2e 견본)은 다시 만들 때까지 지금 차례다. activitiesOf · 서버 · 화면이 같은 갈래를 쓰고, 선생님을 고르는 때(마-2)와 읽기 '지문 늘 함께'(C170 (7))도 같은 조건으로 켠다. 단계 숫자를 코드에 두지 않으려는 것이고, 1 · 4 · 5단계에서 이 조건이 맞는지는 둘째 묶음 표본에서 다시 본다.
2. **활동 · 시도 꼴 이름**은 아래 '이름' 표다. 짝 시도는 짝을 둔 혼자 문항과 같은 꼴에 slot "spare" 를 달아, 채점 함수 · 영어로 말한 문장 셈 · 단어별 정오가 그대로 쓰게 한다. 시도 꼴 판은 INPUT_VERSION 2 이고, 판 1 시도(기기 대기열의 옛 시도)도 그대로 읽는다.
3. **짝 활동 번호.** 활동 목록에는 모든 짝 활동을 영역 차례(말하기 질문 → 듣기 → 문장 → 낱말, 읽기 · 쓰기는 문항 차례)로 늘 넣는다. 낼 짝은 순수 함수 `sparesToShow`(제안)가 혼자 첫 시도 결과와 상한으로 정한다. 내지 않은 짝과 U 문항(건너뜀 · 'AI 쉬는 중' · 소리 없음)의 짝은 시도 행 없이 끝난 것으로 본다. 기기와 서버가 같은 함수를 쓰고 서버 값이 정본이다.
4. **미리보기 활동 번호.** 상수 PREVIEW_ACTIVITY(= 1)는 오늘 배울 것이 앞에 오면 틀린다. 활동 목록에서 preview 번호를 찾는 함수(제안 `previewActivityNoOf`)로 바꾸고, 다른 세션의 만난 단어를 모으는 질의(`src/server/session/index.ts` 1290~1305줄 근처)는 활동 번호가 아니라 시도 꼴 kind "preview" 로 찾는다. 옛 세션(1번)과 새 세션(2번)이 섞이기 때문이다.
5. **P11c 질문 답 몫을 당긴다.** 말하기 3단계 수업에는 AI 로 판정하는 혼자 질문 넷이 있는데, 그 길(서버 함수 · 서버 액션 · 화면)은 approved plan-p11c 차례 8 에만 있고 코드에 없다(`evaluateSpeaking` 을 부르는 곳 0). 질문 답 몫만 plan-p11c 값 1~4 그대로 다 · 라-3 에서 만들고, 그림 보고 말하기 · 발표 · 확인 질문은 P11c 에 남긴다. 말하기 평가 요청에는 질문 직전 이야기(storyEn)를 더한다. 이야기 없이는 'Do Dan and Tess eat rice?'에 대한 답의 맞고 틀림을 정할 수 없어서다.
6. **AI 판정 합치기의 남은 칸.** fix 3 규칙(spec 설계 8)대로 의미 검사가 실패하면 AI 가 맞음이라 해도 맞음이 아니다. 이때 판정은 '다시'(오답, 점수 0)로 적고 AI 원 판정(judge.ai)을 함께 남긴다. 짝 · 같이 해 보기에서 같은 답이 오답인 것과 맞추기 위해서다(C182 (2) 혼자 질문과 짝의 일관성 — 컨트롤러 2026-10-30, 1판의 '부분'을 고침). 아이 반응은 틀린 뒤 차례다.
7. **의미 검사 자료.** 핵심 낱말을 가르는 데 어휘 목록 품사(function · pronoun)를 쓰므로, 세션 화면 자료에 그 수업 질문 · 짝 · 같이 해 보기 글의 낱말 품사 표를 싣되, 어휘 목록의 function · pronoun 행 전부를 더한 표다(좁힌 표는 not 범위를 닫는 대명사를 놓쳐 판정이 갈린다 — 타 검토 I2, meaning.ts 의 표 만드는 순수 함수가 정본). 기기의 바로 판정과 서버의 다시 판정이 같은 표를 쓴다. 의미 검사는 C187 의 다섯째 갈래(덧붙인 정보)까지 다섯이다.
8. **쓰기 까닭 가르기 차례.** 낱말 차례가 다르면 시드 whyKo, 차례가 같고 첫 글자가 대문자가 아니면 대문자 문구, 그 밖에 마침표 자리가 다르면 마침표 문구다. 대문자와 마침표가 함께 틀리면 대문자 문구 하나만 보인다(한 화면 한 줄).
9. **근거 칸.** attempts.evidence 열과 근거 기록 함수는 평가 plan(P12 앞머리) 몫이다. 이 plan 은 시도 꼴에 사실(자리 · 도움 · 가른 묶음 · 의사소통 정답 · 표현 수행 · 이야기 다시 듣기 · 소리 없음)을 남기고, 그 사실을 평가 spec 3절 값으로 바꾸는 순수 함수 `teachEvidenceOf`(제안)를 만든다. 열이 먼저 생기면 바 가 저장 길에서 함께 쓰고, 늦으면 평가 plan 의 채움 함수가 시도 꼴에서 채운다(평가 spec 3절 '원문이 남은 개발 DB 행'). 의사소통 정답은 communicative 표시와 가른 묶음만 남기고, 그 수준(A9)은 근거 상태 함수가 '잠정 A9' 규칙으로만 계산한다. 보정(10-30 03:2x, 컨트롤러 — 바 검토 I1): 의사소통 정답의 정확도는 정본 3.8 A1 표 · A9 문단 · 04 accuracy 칸대로 '부분' + 의사소통 정답 표시로 적는다. C182 (3)이 막는 것은 수준 값의 운영 반영뿐이다.
10. **한국어 목소리는 spec 그대로다.** 명단(seed/teachers.json)과 기기 상태에 칸을 더하지 않고(설계 4 · 9), 기기에 ko-KR 목소리가 없으면 글로만 보이며 안내 줄 · 부모 알림을 두지 않는다(설계 10). 기기마다의 한국어 목소리 목록은 음성 점검 · 사용 시험 기록에 적는다. 브리프에 있던 'voice.preferKo · 부모 알림'은 spec 1판 기준 구절이었고, 컨트롤러가 확인해 브리프를 고쳤다(2026-10-30).
11. **첫 화면 읽어 주기 잠금 풀기.** 오늘 배울 것은 누르기 전에 선생님 줄을 읽어야 한다. 수업 목록 카드 누름(`use-lesson-start.ts`)에서 문서 단위 잠금 풀기를 불러, 클라이언트 이동으로 연 세션의 첫 줄이 iPad 에서도 읽히게 한다. 같은 문서에서 풀림이 이어진다는 것은 추측이라 음성 점검에서 확인한다. 새로 고침이나 이어 하기로 연 세션은 감시 길(설계 10)대로 단추가 밝아진다.
12. **완전성 모드의 단원 목표 막음(L-19)은 둘째 묶음 끝에 켠다.** 시드 규격 fix 1(10-30 00:3x, M5)은 '필수 단계 단원 규격에 목표 없음'을 `--complete-through settings` 에서 오류로 켰는데, dev-load.yml 도 완전성 모드라 1단계 단원에 목표가 없는 지금은 개발 적재가 막힌다(C162 '개발 적재는 보고만'과 어긋남). 그래서 가 의 fix 2 로 이 막음을 새 인자(제안 `--require-unit-goals`, 기본 끔, 모든 모드 경고는 그대로)로 옮겨, 1 · 4 · 5단계 단원 목표가 생긴 둘째 묶음 끝에 main.yml(운영 DB, PROD_RELEASE 켬일 때만 돎)에만 건다. 3단계 단원 2~5 는 셋째 묶음에 목표가 생기지만, main.yml 은 운영 배포(H8) 전에는 돌지 않고 운영 배포 전에 셋째 묶음의 운영 몫이 끝나므로 막히는 일이 없다. dev-load.yml · ci.yml 은 계속 보고만 한다(평가 spec 8절 '개발 적재는 보고만', C162). 첫 묶음은 가르치는 수업 칸의 필수 목표 오류(구현자 2판에 있음)로 C177 (5) · C182 (4)를 채운다.
13. **생성.** 승인 표본 수업(배정 1 · 변형 1)은 글자 그대로 두고, 영역마다 나머지 스물다섯(배정 · 다지기 · 보강 × 변형 둘)을 새 3단계 브리프로 만든다. S10 비교는 말하기 한 단원(나머지 스물다섯)을 high · xhigh 로 만들어 견주고, 같으면 high 로 간다(C121 기본값, 요청자가 바꿀 수 있음).
14. **그림 열 개**(eat · drink · go · come · wash · classroom · bedroom · bathroom · living room · restaurant)는 Twemoji 에 그 뜻의 그림이 있으면 그것을, 없으면 Claude 가 그린 SVG(C65 꼴: viewBox 36 · 평면 채색 · 글자 없음)를 쓴다.
15. **칩 색.** 칩 색은 UI · UX 단위 몫인데 그 plan 에 칩 행이 없다. 2-가 의 토큰 이름 위에 칩 토큰(role 여덟)을 더하기만 하고, 값은 디자인 ② 팔레트 안에서 고른 뒤 화면 검토로 정한다. 컨트롤러가 UI · UX 장부에 한 줄을 남긴다.
16. **진행 막대 · 위 띠 이름.** UI · UX 5-가 의 진행 막대 묶음 이름(UI · UX 정한 것 8)을 여섯 자리 이름(spec 설계 5 '위 띠 자리 이름' 글)으로 바꾼다.

## 이름 · 설정값 · 문구

시도 꼴 판 2(spec 설계 9 가 plan 에 맡긴 이름):

| 자리 | 활동(Activity) | 시도 꼴(attempts.input, v 2) | 점수 · 단어별 정오 · 기회 |
|---|---|---|---|
| 1 오늘 배울 것 | `today` | `{ kind: "today" }` | 없음 |
| 2 새 단어 · 본보기 | `preview`(그대로) · `model`(index) | preview 그대로 · `{ kind: "model", index }` | 없음 |
| 3 같이 해 보기 | `together`(index) | `{ kind: "together", index, tries: [{ choice?, pieces?, heard? }], judge? }` | 셋 다 없음(연습) |
| 4 혼자 해 보기 | 지금 종류 그대로 | 지금 꼴에 선택 칸: 읽기 `aid { readAloud?, gloss? }`, 질문 `story { replayed }` · `judge`, 듣기 · 질문 · 따라 말하기 `techError: "speak_fail"`(UI · UX 5-나 가 정한 칸 그대로, 소리를 못 들려준 채 낸 답) | 첫 시도만 점수, 정오 · 기회 |
| 5 다른 예시 | `spare`(base · index) | base 꼴 + `slot: "spare"` | 점수 없음, 정오 · 새 기회 |
| 말하기 질문 판정 | | `judge { meaning: "ok" \| "direction" \| "key" \| "negated" \| "wrong_info", bundle?: "accepted" \| "meaning", ai?: "correct" \| "partial" \| "retry", final, by: "app" \| "ai", communicative?: true, expressionDone: boolean }`(묶음 나 가 둘을 judge 안에 둠 — 나 검토 M2 로 표를 맞춤, 다 · 바 · 사 도 같은 자리) | 표현 수행은 accepted 쪽일 때만 참 |

근거 칸 값 이름 제안(평가 spec 3절 '코드 이름은 plan 이 정한다'. 평가 plan 이 받거나 고친다):

| 평가 spec 값 | 코드 이름(제안) | 이 plan 의 자리가 채우는 것 |
|---|---|---|
| task · goal | `task` · `goals: string[]` | 시드 type, 문항 goal. 하나도 목록으로 두고 목표마다 나누지 않으며, 상태 함수가 목표마다 그 목표의 성공 기준으로 센다 |
| assist | `assist: string[]` | 같이 해 보기 together, '왜' 뒤 다시는 retry_after_answer(읽기 · 쓰기 · 듣기) · echo(질문), 따라 말하기 끊어 듣기 뒤는 model_heard(평가 spec 목록 안의 값), 읽기 read_aloud · gloss |
| exposure | `exposure: { [단원 단어]: "answer_exposed" \| "choice" \| "question_word" \| "none" }` | 질문 속 낱말은 question_word, 이야기 낱말은 none |
| accuracy · result | `accuracy` · `result { …, bundle?, communicative? }` | 판정 결과 그대로다. 의사소통 정답도 맞음 + communicative 이고, A9 의 '부분'은 저장하지 않고 상태 함수가 잠정으로 센다 |
| validity | `validity: "valid" \| "practice" \| { technical }` | 같이 해 보기 practice, 소리 없이 낸 답 technical(종류 이름은 평가 정본 반영과 맞춤, 제안 speak_fail) |
| ctx · source · purpose | `ctx { item, example }` · `source` · `purpose` 비움 | 짝은 ctx.item 에 짝 키, example 에 짝 자극, purpose 는 비움(home), 읽기 도움 출처 device |

설정값. 새 키 열셋 가운데 열둘(lesson.* · speech.speak_chars_per_second_ko · speech.rate_ko)은 시드 규격 작업이 `seed/settings.json` 과 p13d 12절 사본에 잠정 값으로 넣었다(spares_per_session 은 영역 세 행, slot_seconds_max 는 자리 다섯 행으로 풀어 적음). speech.read_ko(켬)와 seed.unit_goals_max(4)는 시드 규격 fix 1 이 settings.json 과 12절 사본에 넣었다(마-1 은 시험 고정값 둘에만 더한다). 새 키는 판정에 쓰지 않으므로 단원 시작 복사본에 들지 않는다(spec 설계 12). 함께 쓰는 지금 키: speaking.answer_match_pass(0.8) · ui.match_phrase_levels · speech.speak_* 넷 · speech.rate.<구간> · talk.teacher_praise_seconds · unit.new_words_per_lesson.<구간> · seed.goals_required_levels.

문구. 아이 화면의 새 글은 spec 설계 5 '정본 밖 문구' 표 글자 그대로이고, 선생님 줄(todayKo · lineKo · whyKo · rightKo · wrongKo · closeKo · closeKoPracticed)은 시드다. 이 plan 은 새 문구를 만들지 않는다. '선생님을 골라요'는 C141 (3) 그대로이고, '소리가 안 나와서 글로 봐요'는 UI · UX 묶음 6 과 같은 글 · 같은 키(speech.skip_notice_seconds)다.

## 바뀌는 파일 (Files that change)

### 가 · 검토 · 관문 확인

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| 검토가 지적한 `src/core/seed/**` · `seed/settings.json` · `tests/unit/seed-*` 자리 | 수정 | 코드 검토 보고(`task-seed-schema-review-report.md`)의 Critical · Important 를 fix 라운드(3회까지)에서 고치고, Minor 는 컨트롤러가 직접 고친다(가벼운 루프). 새 범위를 더하지 않는다 |
| 작업 장부 `task-seed-schema-report.md` | 수정 | 관문 여섯을 다시 돌린 결과(명령 · 종료 코드 · 수)와 원본 시드 셋 검증 결과 |

되돌리기: 지적 고침은 지적마다 바꾼 줄 목록으로 되돌린다.

### 타 · 검증기 보탬(가 뒤, 자-2 생성 전)

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/check-teach.ts` | 수정 | 2판 보고가 남긴 검사. (1) 같이 해 보기 조립의 빈칸 수 = 남은 카드 수, 빈칸마다 올바른 카드(AC-2e) (2) 3단계 단원 1~4 읽기 사실 확인 · 듣기 이해의 빈칸 하나와 askRole(AC-4b) (3) 말하기 질문 넷 가운데 예 하나와 한 문장 답(AC-4c) (4) closeKoPracticed 의 '할 수 있' 단정 꼴(AC-7c) (5) 유형 경계: 같이 해 보기 · 짝 유형이 level_specs itemTypes · 질문 꼴 안, 쓰기 1~3 은 고르기 · 베끼기 · 조립(AC-5a) (6) 짝의 과제 유형 · 목표가 문항과 같고, 혼자 문항 · 짝 문장이 본보기 · 같이 해 보기와 다름(AC-1a) (7) 짝 · 같이 해 보기의 정답 검사(answerNo 가 보기 안 · 허용 정답이 카드로 놓임) (8) 말하기 질문의 바른 답 · 허용 답이 그 문항 의미 검사를 통과하고 아니요 질문에 틀린 정보 낱말이 있음(fix 3). 가 의 검토가 이미 고친 것은 뺀다 |
| `src/core/speaking/meaning.ts`(제안) | 신규 | 의미 검사 순수 함수(spec 설계 8 '의미 검사': 핵심 낱말 뽑기 · 바로잡은 정보 · 틀린 정보 · 방향 · 핵심 정보 · not 범위). 검증기와 다 의 판정이 같이 쓴다 |
| `src/core/seed/solve-check.ts` | 수정 | 정답이 있는 같이 해 보기 · 짝을 풀이 대상에 넣고, 한 수업의 짝은 한 호출로 푼다(06:106) |
| `tests/unit/seed-validator-teach.test.ts` · `speaking-meaning.test.ts`(제안) · `solve-check.test.ts` | 수정 · 신규 | AC 마다 부정 시험, 의미 검사(증명 절), 풀이 대상 · 한 호출 |

되돌리기: 검사 하나는 그 검사를 부르는 한 줄을 빼면 앞과 같다.

### 나 · 활동 차례 · 시도 꼴

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/session/preview.ts` | 수정 | Activity 에 today · model · together · spare 를 더하고, teach 가 있으면 여섯 자리 차례(정한 것 1 · 3), previewActivityNoOf |
| `src/core/session/spares.ts`(제안) | 신규 | sparesToShow(영역 차례 · 상한 · U 뺌) · 끝난 것으로 볼 짝 번호 |
| `src/core/session/attempt.ts` | 수정 | INPUT_VERSION 2(판 1 읽기 유지) · 새 꼴 · inputFitsActivity(spare 의 base) · resumePointOf 가 내지 않은 짝을 건너뜀 · 같이 해 보기와 짝의 결과(점수 null, 정오는 짝만) |
| `src/core/speaking/judge.ts` | 수정 | englishSentencesOf 가 말하기 같이 해 보기를 센다(짝은 base 종류라 이미 셈) |
| `src/server/session/index.ts` · `src/server/session/result.ts` | 수정 | 활동 차례에 teach 를 넘김, PREVIEW_ACTIVITY 를 함수와 kind 질의로(정한 것 4), 짝 시도는 서버가 다시 고른 짝만 받음, 끝내기가 내지 않은 짝을 끝난 것으로 셈 |
| `tests/unit/session-preview.test.ts` · `session-attempt.test.ts` · `session-input.test.ts` · `session-spares.test.ts`(제안) · `tests/integration/session-flow.test.ts` · `tests/fixtures/seed/builders.ts` | 수정 · 신규 | AC-2a · 1b · 2c, 판 1 시도 읽기, teach 견본(3단계 정규 시드 셋을 읽어 만듦) |

되돌리기: teach 가 없는 수업은 차례가 같아 옛 길이 그대로 돈다. 판 2 시도는 jsonb 라 칸을 지워도 저장된 행이 읽힌다.

### 다 · 판정

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/writing/why.ts`(제안) | 신규 | writingWhyOf(정한 것 8) |
| `src/core/speaking/judge.ts` | 수정 | judgeSpeakingQuestion(제안): 의미 검사 → 두 묶음(문턱 · 높은 쪽 · 같으면 accepted) → AI 판정 합치기(설계 8 · 정한 것 6), expressionDone · communicative. plan-p11c 값 2 의 aiAnswerScore · skipAfterAiRest |
| `src/core/session/attempt.ts` | 수정 | 짝 · 같이 해 보기 앱 채점(읽기 · 듣기 · 쓰기는 checkAnswer, 따라 말하기는 repeatResult, 질문은 judgeSpeakingQuestion), plan-p11c 값 3 의 질문 끝 시도 꼴 |
| `src/core/ai/calls/speaking.ts` | 수정 | SpeakingAnswerInput 에 story(시드 storyEn)와 가변부 'Story the child heard'(정한 것 5) |
| `src/server/speaking/index.ts` · `src/server/actions/speaking.ts` | 신규 | plan-p11c 값 1 의 evaluateAnswer(질문 답만): 접근 확인, 같은 시도 id 는 저장된 결과, 판정 합치기를 서버가 다시 함, 'AI 쉬는 중'은 건너뜀 끝 시도 |
| `tests/unit/writing-why.test.ts`(제안) · `speaking-judge.test.ts` · `tests/integration/speaking-eval.test.ts`(P11c 신규) · `retry.test.ts` | 수정 · 신규 | AC-2b(함수) · AC-6g(증명 절) · plan-p11c 의 말하기 평가 몫 |

되돌리기: 판정 함수는 새 이름이라 부르는 곳만 되돌리면 1~2단계 judgeAppAnswer 길이 그대로다.

### 라 · 화면

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 라-1 | `src/components/session/teach/{teacher-line,chips,today,show,together,why-bubble,story,spare-intro}.tsx`(제안) | 신규 | 선생님 줄(초상 · 말풍선 · 한국어 → 영어 읽기 · 감시 끝에 단추 밝힘 · '소리가 안 나와서 글로 봐요') · 칩 · 이름표 · 자리 조각. 초상은 TeacherPortrait 와 4-가 상태 표지를 가져다 쓰고 그 파일은 고치지 않는다 |
| 라-1 | `src/core/session/teach-line.ts`(제안) · `tests/unit/teach-line.test.ts`(제안) | 신규 | 선생님 줄 단추 상태 순수 함수(읽기 끝 · 감시 끝 · 한국어 목소리 없음 · read_ko 끔이면 밝음) |
| 라-1 | `src/app/globals.css` | 수정 | 칩 토큰 더하기만(정한 것 15) |
| 라-2 | `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 자리 조각 고르기 · 위 띠 자리 이름 · 혼자 첫 화면 줄 · 짝 첫 장 · 진행 막대 이름(정한 것 16) |
| 라-2 | `src/components/session/reading.tsx` | 수정 | teach 수업은 지문 늘 함께 · 이름표 · '왜' 말풍선 · 같은 문제 다시의 retryHighlight 띠 · 첫 답 전 읽어 주기와 뜻 보기 모으기(aid) |
| 라-2 | `src/components/session/writing-items.tsx` · `src/components/answer/tiles.tsx` | 수정 | 까닭별 '왜' · 색 칸 켬 · 대문자 단추 반짝임 · 둘째 틀림에 정답 · 같이 해 보기의 채운 칸 |
| 라-2 | `src/components/activities/common.tsx` · `src/server/session/index.ts` | 수정 | 새 단어 카드 parts 띄움 · 예문 없음(C170 (3)), 화면 자료(teach · 짝 · 낼 짝 · 낱말 품사 표 · 그림) |
| 라-3 | `src/components/session/speaking.tsx` · `src/components/answer/repeat.tsx` | 수정 | 끊어 들려주기(chunks) · 듣기 다시(대본 뒤 답 덩어리를 천천히) · 이야기 화면(저절로 한 번 · '다시 듣기' 한 번 · 소리가 안 나면 UI · UX 의 sound-retry) · AI 질문 화면(plan-p11c 값 4, 판정 글자 없음 · 기다림 표시) · 짝 · 같이 해 보기 말하기 |
| 라-4 | `src/server/session/result.ts` · `src/app/(child)/result/[id]/result-view.tsx` · `src/components/session/reward.tsx` · `src/components/session/teach/recap.tsx`(제안) | 수정 · 신규 | 되짚기 첫머리(마무리 줄 · 오늘 만난 말 · 칩 단 문장 틀 · 듣기) |
| 라 | `tests/e2e/teach.spec.ts`(제안) · `reading.spec.ts` · `writing.spec.ts` · `speaking.spec.ts` · `speech-feedback.spec.ts` · `tests/e2e/lessons.ts` | 신규 · 수정 | AC-1c · 2b · 2e · 3a · 4b · 4d · 7a · N3 |

되돌리기: 자리 조각은 teach 수업에서만 그려지므로 연결 줄을 빼면 옛 수업 화면이 그대로다. 커밋 전 파일은 묶음 보고의 줄 목록으로 손으로 되돌린다(위험 1).

### 마 · 선생님 · 목소리

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 마-1 | `src/core/teacher/voice.ts` | 수정 | voiceFor(제안): 쓰임(선생님 한국어 · 선생님 영어 · 글 자료)과 기기 목록 · 명단 voice 로 목소리 · lang · 높이 · 빠르기를 고른다(AC-3b) |
| 마-1 | `src/lib/speech/types.ts` · `browser.ts` · `teacher.ts` · `src/core/speech/pace.ts` · `listen.ts` | 수정 | SpeakOptions.lang, lang 에 맞는 목소리, 한국어 감시 상한(speech.speak_chars_per_second_ko), 선생님 한국어 줄(ko-KR + 높이), speech.read_ko 끔이면 읽지 않음 |
| 마-1 | `tests/fixtures/settings.ts` · `tests/fixtures/speech/settings.json` | 수정 | speech.read_ko 켬(settings.json · 12절 사본은 fix 1 이 넣음, 시험 고정값만 더함) |
| 마-1 | `tests/unit/teacher-voice.test.ts` · `speech-pace.test.ts` · `speech-speak.test.ts` · `teacher-speech.test.ts` | 수정 | AC-3b · N3(감시) |
| 마-2 | `src/app/(child)/session/[id]/page.tsx` · `session-frame.tsx` · `src/server/session/index.ts` | 수정 | 고를 선생님 · 고른 선생님을 화면 자료로 싣고, 고른 선생님이 없는 teach 수업이면 막힘 · 쉼 · 마이크 뒤, 오늘 배울 것 앞에 '선생님을 골라요'(TeacherChoice 그대로, 고르면 router.refresh) |
| 마-2 | `src/app/(child)/[area]/lessons/use-lesson-start.ts` · `src/lib/speech/unlock.ts`(제안) | 수정 · 신규 | 카드 누름에서 문서 단위 잠금 풀기(정한 것 11) |
| 마-2 | `tests/e2e/teacher-choice.spec.ts` | 수정 | AC-3c |

되돌리기: voiceFor 가 고르지 못하면 지금 pickVoice 길이다. speech.read_ko 를 끄면 한국어 줄은 글로만 보인다(설정값만 바꿈).

### 바 · 사 · 아(근거 · 되짚기 · 지표)

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 바 | `src/core/evidence/teach.ts`(제안) · `tests/unit/teach-evidence.test.ts`(제안) | 신규 | teachEvidenceOf(위 이름 표), A9 잠정 표시 |
| 바 | `src/server/session/index.ts` · `src/server/speaking/index.ts` | 수정 | 평가 plan 의 열이 있으면 끝 시도와 같은 트랜잭션에 근거 칸을 쓴다(열이 없으면 이 줄은 없다) |
| 사 | `src/core/session/recap.ts`(제안) · `tests/unit/session-recap.test.ts`(제안) | 신규 | recapLineOf(설계 5): 첫 목표에 이은 혼자 문항마다 해냄 · 독립 · U 를 정하고 유효 수 · 비율로 closeKo · closeKoPracticed |
| 아 | `src/core/session/teach-metrics.ts`(제안) · `scripts/teach-metrics.ts`(제안) · `package.json`(teach:metrics) · `tests/unit/teach-metrics.test.ts`(제안) | 신규 · 수정 | 스스로 해냄 · 혼자 첫 시도 정답률(문항별) · 같이 해 보기 첫 시도 정답률 · 자리별 시간. 개발 DB 를 읽어 표로 낸다(아이 이름 없음) |

되돌리기: 순수 함수는 부르는 곳을 빼면 영향이 없고, 근거 칸 쓰기는 열이 있을 때만 도는 한 줄이다.

### 자 · 시드

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `seed/prompts/_template.md` | 수정 | spec 설계 7 '생성 브리프' 문단 그대로(5 · 8 · 10 · 11 · 12 · 13 · 14 · 16절) |
| `seed/prompts/{reading,writing,speaking}-3.md` | 신규 | 3단계 영역 브리프: 영역 방법과 까닭, 단원 1~4 빈칸 문장 · 이름표 · 질문 꼴 · 이야기 · 허용 답 두 묶음 · 의미 검사를 통과하는 답, 인물 · 사실 겹침 피하기(L-8), 두 낱말 단어는 카드 둘(L-10), 승인 수업을 그대로 두라는 호출 값 |
| `seed/prompts/README.md` · `seed/manifest/{reading,writing,speaking}-3.jsonl` | 수정 · 신규 | 판 해시 · 생성 기록(effort 포함) |
| `seed/lists/grammar-terms.json` | 확인 | 학습 설계자가 22 항목을 보고, 요청자가 첫 묶음 표본 검토 때 본다(미결 4) |
| `seed/images.json` · `public/images/vocab/*.svg`(열) · `CREDITS.md` | 수정 · 신규 | 새 단어 그림 열(정한 것 14) |
| `seed/lessons/{reading,writing,speaking}/3/1.json` · `seed/checks/lessons/…` | 수정 | 승인 수업 그대로 + 스물다섯씩, 풀이 검사 기록 |

되돌리기: 생성 전 단원 파일 셋을 스크래치패드에 두고, 승인 수업 하나만 든 판으로 되돌릴 수 있다.

### 차 · 카

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 차 | `specs/*.md`(p13d 사본) | 수정 | C183 · C184 정본에서 장마다 diff 를 보고 p13d 전용 줄(12절 행 · 13절 시드 규격 줄)을 지킨다(UI · UX 위험 2 와 같은 차례). 수업 크기(5절 04:9 문단, spec 설계 6 끝)는 잰 값을 컨트롤러에게 넘긴다 |
| 카 | `src/server/preview/index.ts` · `src/app/dev/teacher-probe/teacher-probe.tsx` | 수정 | 관찰 쪽 '단원 바로 가기'에 단계를 더해 3단계 단원 1 로 옮긴다(운영 빌드에 없음) |
| 카 | 작업 장부 `review-screen-teach.md` · `voice-check.md` · `metrics-week1.md`(모두 제안) | 신규 | 화면 검토 · 음성 점검 · 지표 첫 주 보고 |

되돌리기: 사본은 맞추기 전 판을 스크래치패드에 두고, 관찰 쪽 고침은 운영 빌드에 들지 않는다.

## 작업 순서 (Order of work)

명령은 `( cd .claude/worktrees/p13d && PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH … )` 서브셸로만 하고, 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 통합 · e2e 는 이 Mac 에서 돌지 않으므로(UI · UX L-2) 정적으로 쓰고 실행은 차례 12 다.

1. [문서] 정본 반영을 확인한다. 평가 5판(C183)과 이 spec(C184)의 편집이 끝났는지 본다. 끝 판정: 13절 C183 · C184 줄과 12절 lesson.* · evidence.* 행. 구현은 기다리지 않고 시작하고, 시험 이름 번호와 사본 맞춤(차)만 그 뒤에 한다.
2. [사람] 컨트롤러 검토 · 승인(C185 와 같은 하위 plan 승인 규칙) → 브리프(타 · 나 · 마-1 · 자-1 · 아). 끝 판정: plan approved, 브리프가 장부에 있다.
3. [검증] 가: 진행 중인 코드 검토의 판정을 받아 지적을 고치고(가벼운 루프, fix 3회까지), 관문 여섯을 다시 돌린다. 끝 판정: 검토 Approved, 관문(lint · tsc · test · check:deps · check:ids · seed:validate) 종료 0, 원본 시드 셋이 필수 목표 검사를 그대로 통과한다(걷은 사본 · 경고 우회가 아님, C182 (4)).
4. [서버] 타 ∥ 나 ∥ 마-1(UI · UX 0-라 뒤) ∥ 아(나 의 시도 꼴 이름이 정해진 뒤) ∥ [문서] 자-1 브리프 틀 · 3단계 영역 브리프(학습 설계자) → 시드 검토. 끝 판정: 단위 · 관문 통과와 코드 검토 Approved, 원본 시드 셋이 타 의 새 검사도 그대로 통과한다(걸리면 학습 설계자가 원본을 고친 정정 판), 브리프는 시드 검토 Approved.
5. [서버] 다(나 · 타 뒤, attempt.ts · judge.ts 잠금) → 사 ∥ 바. 끝 판정: 단위 통과(AC-6g 의 의미 검사 부정 시험 · 일관성 시험 포함), 통합 시험은 작성됨.
6. [시드] 자-2(타 뒤): 그림 열(images:check) → S10 비교(말하기, seed-generator high · xhigh 한 단원씩) → 나머지 생성(영역마다 스물다섯) → seed:validate(원본 그대로) → seed:check 풀이 검사 실호출([사람] 개발용 키 H4, 컨트롤러가 돌림) → 시드 검토(Fable max: 아이 눈 · 혼자 문항과 본보기의 낱말 짝 다름 · 문법 용어 목록) → 개발 DB 적재([사람] dev-load 작업 흐름 또는 .env.local 개발 DB). 끝 판정: AC-8a 의 시드 몫 전부.
7. [화면] 라-1(UI · UX 2-가 · 4-가 · 마-1 뒤, 새 파일이라 잠금 없음). 끝 판정: 단위 · 관문, 로컬 눈 점검 사진(next dev · 개발 DB · 세로 820 · 가로 1180).
8. [화면] 라-2(UI · UX 5-가 가 session-frame · result-view 를, 2-나 가 tiles · common 을 놓은 뒤) → 마-2 → 라-3(UI · UX 5-나 가 speaking.tsx · repeat.tsx 를 놓은 뒤) → 라-4. 끝 판정: 묶음마다 단위 · 관문 · 코드 검토 Approved, e2e 는 작성됨.
9. [검증] 화면 검토 1(Fable max, 로컬 눈 점검 사진: 세 영역 여섯 자리 · 틀린 뒤 · 짝 · 결과 · 고르기 · 소리 없음), fix 3회까지. 끝 판정: 보고에 '맞히기만 하는 과정' 항목의 잠정 판정이 있다.
10. [문서] 차: specs 사본을 맞추고 check:ids 보고 규칙 0 · spec:trace unknown-ac 0 을 보며, 시험 이름을 15절 번호로 바꾼다. 끝 판정: 두 명령 종료 0.
11. [사람] 카: 커밋 · push 는 회화 적용과 함께(UI · UX L-19, 11-01 전이면 [skip ci]) → 프리뷰 → 관찰 쪽으로 3단계 단원 1 → 음성 점검(iPad 한국어 목소리 목록 · 높이 · 무음 모드 · 첫 화면 잠금 풀기 · 감시 잠정값, voice-check.md) → 요청자 iPad 시험(세 영역 수업 셋, 프리뷰 상태표 첫 줄에 되는 것 · 안 되는 것) → 화면 검토 2(CI e2e 사진). 끝 판정: AC-2d 기록.
12. [검증] 11-01 뒤 CI 통합 · e2e 를 한 번 돌린다(workflow_dispatch e2e 또는 PR 'e2e' 라벨, 분 한도). 실패면 고친 뒤 다시 돌린다. 끝 판정: 실행 기록(일시 · 커밋 · 시험 수 · 통과).
13. [문서] 지표 첫 주 보고(teach:metrics → metrics-week1.md, 목표 값은 요청자가 정함, 미결 3) · 세션 시간 실측(L-3) · 완료 보고 · 장부(L-1 · L-2 · L-3 · L-12 · L-17 · L-18 · L-19 · L-20 판정) → plan done.

## 차례와 겹침(다른 변경 단위)

| 다른 일 | 겹치는 파일 · 자리 | 먼저 | 까닭 |
|---|---|---|---|
| UI · UX 묶음 0(0-가 진행 중 · 0-다 · 0-라) | session-frame · result-view · reward · result.ts(met 이름) · server/session/index.ts · 음성 층 types · pace · browser · paced | UI · UX 0 | 커밋 후보 ① 이 회화 구현 전에 끝나야 하고, met 이름과 감시 결과 셋(heard)을 우리 조각이 받아 쓴다 |
| UI · UX 2-가 · 2-나 | globals.css · board.tsx · structure.ts · tiles.tsx · common.tsx | UI · UX 2 | 화면 꼴은 토큰 위에 얹는다(spec 설계 13). 칩 토큰은 2-가 뒤에 더하기만 한다 |
| UI · UX 4-가 | teacher-portrait · teacher-choice · teacher-window(상태 표지) | UI · UX 4-가 | 세 영역 초상은 새 조각에서 가져다 쓰고 그 파일들은 고치지 않는다 |
| UI · UX 5-가 · 5-나 | session-frame · result-view · reward · activity-progress · speaking.tsx · repeat.tsx · attempt.ts(소리 없음 칸) | 5-가 → 5-나 → 라-2 · 라-3 · 라-4. attempt.ts 는 나 가 먼저 판 2 를 놓고 5-나 가 선택 칸을 더한다 | 5-가 가 판 · 진행 막대를 잡은 뒤 자리 화면을 넣고 막대 이름을 바꾼다(UI · UX 정한 것 8). 이야기 · 대본의 소리 없음은 5-나 의 sound-retry 를 쓴다 |
| 회화 spec 구현(최종 승인 뒤) | talk-frame · teacher-window · lib/speech/teacher.ts(맞장구도 선생님 목소리) · teacher/state.ts · 정본 02-2:9 · 03:22 | 마-1 이 teacher.ts 의 한국어 줄 갈래를 회화 구현 시작 전에 끝낸다. talk-frame · teacher-window 는 회화 구현이 잡는다 | 회화는 고르는 때를 이 spec 에서 참조만 하므로 talk-frame 의 고르기 길은 그대로 둔다 |
| 평가 정본 반영(C183) · 평가 plan(P12 앞머리) | attempts.evidence 열 · 근거 값 이름 · 기술 오류 종류 이름 · 12절 seed.goals_required_levels(L-20) | 이름은 이 plan 이 제안하고 평가 plan 이 받는다. 열이 먼저면 바 가 함께 쓴다 | 같은 이름을 두 곳에서 짓지 않게 한다 |
| P11c(approved, 미구현) | src/server/speaking · actions/speaking · judge.ts · speaking.tsx · attempt.ts | 질문 답 몫은 다 · 라-3 이 당겨 만든다(정한 것 5) | 3단계 말하기 수업의 혼자 질문 넷이 AI 판정 없이는 프리뷰가 안 된다 |
| 시드 규격 작업(impl-seed-schema, 2판 관문 여섯 종료 0 · 검토 중) | src/core/seed/** · seed/settings.json · specs 09 사본 | 가 가 검토를 끝내고 타 가 남은 검사를 잇는다 | 같은 구현 줄을 잇고, 같은 파일을 두 구현자가 동시에 고치지 않는다 |

## 위험 · 제약 (Risks)

| 번호 | 위험 | 막는 법 | 되돌리기 |
|---|---|---|---|
| 1 | 겹치는 파일(위 표). 커밋 전 한 워크트리에 1차 묶음 64 · 시드 규격 · UI · UX 묶음 · 이 plan 이 섞인다(UI · UX L-19) | 파일 잠금: 한 파일은 한 구현자, 먼저 잡은 쪽이 Approved 될 때까지 기다린다. 묶음 보고에 바꾼 줄 목록을 남긴다 | `git checkout -- <파일>` 은 다른 묶음 변경까지 지우므로 쓰지 않고, 줄 목록으로 손으로 되돌린다 |
| 2 | 3단계 새 단어 그림이 없다(L-1). 그림 없이 적재하면 AC-8a 가 안 닫힌다 | 자-2 첫 일로 열 개를 만들고 images:check 를 통과한 뒤 생성한다(생성자가 그림 키를 안다) | images.json 행과 파일을 지운다 |
| 3 | 한국어 목소리(L-2): 높이만 얹어 리오가 다른 사람처럼 들리거나, 기기에 ko-KR 이 없거나, 무음 모드가 막는다 | 음성 점검에서 기기 목록 · 높이를 적고(voice-check.md), 어색하면 speech.read_ko 를 끈다(spec 우려 6) | 설정값 하나 |
| 4 | 첫 화면 읽어 주기(정한 것 11). 오늘 배울 것은 누르기 전에 읽어야 하는데 iOS 는 누름 뒤에만 읽는다 | 카드 누름 잠금 풀기, 안 되면 감시 길(speech.speak_start_timeout_seconds 뒤 단추 밝음 · '소리가 안 나와서 글로 봐요') | unlock 한 줄을 뺀다 |
| 5 | 세션 시간(L-3, NFR-1)이 2~3분 는다 | 지표의 자리별 시간을 첫 주에 재고, 넘으면 설계 11 차례(같이 해 보기 1문항 → 짝 상한 줄임 → level_specs 새 개정안을 요청자에게) | 설정값만 바꾼다 |
| 6 | 의미 검사의 한계(spec 우려 19). 어휘 목록에 없는 바꿔 말하기 · 인식 오류는 뜻이 맞아도 맞음이 아닐 수 있고, AI 맞음을 '부분'으로 낮춘 판정(정한 것 6)이 인식 오류 때문일 수 있다 | 시도 기록의 judge 로 프리뷰 판정을 사람 판정과 견준다(우려 15 · 19). 바꿔 말하기만 혼자 · 짝이 다를 수 있음을 시험에 '알려진 차이'로 적는다 | 판정 함수의 합치기 칸 하나 |
| 7 | A9 미확정(L-18). 의사소통 정답의 수준이 운영 판정에 새면 C182 (3) 위반이다 | 저장은 communicative 표시뿐이고 세션 점수 · 단원 판정 입력은 맞음 그대로다(통합 시험). 부모 화면 표시는 1-나 와 A9 확정 뒤 | 없음 |
| 8 | 시도 꼴 판 2. 기기 대기열에 판 1 시도가 남아 있고, strictObject 라 새 칸이 섞이면 거부된다 | parseAttemptInput 이 두 판을 읽고 서버 · 화면은 한 배포로 나간다(UI · UX 위험 11 과 같은 결) | 칸을 지워도 저장된 행은 jsonb 라 읽힌다 |
| 9 | 짝 활동 고정 번호로 활동 수가 는다(말하기 3단계는 짝만 열여덟). 끝내기 · 진행 막대 · 활동 번호 상한(200)이 내지 않은 짝을 잘못 셀 수 있다 | 내지 않은 짝은 끝난 것으로 보는 같은 함수를 기기 · 서버가 쓰고, 진행 막대는 낸 짝만 센다. 단위 · 통합 시험 | teach 없는 수업은 영향이 없다 |
| 10 | 만난 단어 질의가 활동 번호 1 에 묶여 있다(정한 것 4) | kind "preview" 로 찾고, 옛 세션 · 새 세션이 섞인 통합 시험을 둔다 | 질의 한 곳 |
| 11 | AI 판정 입력에 시드 storyEn 을 더한다(정한 것 5) | 시드 글이고 아이 자료가 아니라 NFR-4 의 '보내는 것'(이름 · 소리)은 늘지 않는다. 질문마다 1~2문장이라 비용은 소폭이고 ai_calls 로 본다 | 가변부 한 줄 |
| 12 | 통합 · e2e 를 이 Mac 에서 못 돌리고 11-01 전에는 CI push 를 하지 않는다(UI · UX L-2, 분 한도) | 정적으로 쓰고 차례 12 에서 몰아 고친다(fix 3회까지). 실행 기록 전에는 완료로 적지 않는다 | 없음 |
| 13 | 커밋 · push 가 회화 적용과 함께라, 회화 spec 최종 승인이 늦으면 프리뷰와 요청자 시험도 늦다 | 로컬 눈 점검 · 화면 검토 1 까지는 기다리지 않고 한다. 늦어지면 컨트롤러가 요청자에게 따로 프리뷰할지 묻는다 | 없음 |
| 14 | 생성 비용 · 시간. S10 비교로 말하기 한 단원을 두 번 만든다 | 비교는 한 영역만 하고 같으면 high 로 간다(정한 것 13). 동시에 셋까지 돌린다 | 없음 |
| 15 | 원칙 경계. 1~3단계 새 자리 AI 0회(NFR-2), 문법 용어 · 선생님 이름 막음, 세 영역에 3D 코드 없음(NFR-11), 녹음 없음, 1~3단계 쓰기는 고르기 · 베끼기 · 조립, 횟수로 통과시키지 않음 | 가 · 타 의 검사, AC-N2 통합(가짜 Anthropic 호출 수), check:bundle, 3.7 · 단원 판정은 그대로 | 없음 |

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| AC-1a · 1d · 2e(검증) · 4b(검증) · 4c · 5a · 6b · 7c · N4(검증) | 단위: 기준마다 어긴 가짜 시드 조각 하나 이상이 오류로 걸리고, 원본 셋은 통과 | `tests/unit/seed-validator-teach.test.ts` · `pnpm seed:validate --areas reading,writing,speaking` |
| AC-1b | 단위: 빈 목록 · 읽기 둘 틀림 → 그 둘 · 말하기 섞어 여섯 틀림 → 질문 → 듣기 → 문장 → 낱말 앞 넷 · U 문항 뺌 | `tests/unit/session-spares.test.ts`(제안) |
| AC-1c | Playwright: 세 영역에서 하나 틀림 → '스스로 해 보기'에 그 짝, 다 맞힘 → 짝 없이 결과 | `tests/e2e/teach.spec.ts`(제안) |
| AC-2a | 단위: 3단계 teach 수업 차례와 짝 번호 고정, teach 없는 수업은 지금 차례 | `tests/unit/session-preview.test.ts` |
| AC-2b | 단위: 까닭 셋과 둘 다 틀림 · 첫 시도 점수. Playwright: 쓰기 까닭별 '왜' · 색 칸 · 둘째 정답, 읽기 띠, 짝 틀림 뒤 끝 | `tests/unit/writing-why.test.ts`(제안) · `session-attempt.test.ts` · `tests/e2e/teach.spec.ts` · `writing.spec.ts` · `reading.spec.ts` |
| AC-2c | 통합: 짝 활동 중 닫고 열면 같은 짝, 서버가 다시 고른 짝이 기기와 같음. 단위: 이어 할 자리 | `tests/integration/session-flow.test.ts` · `session-attempt.test.ts` |
| AC-2d | 요청자 iPad 시험 기록 · 화면 검토 보고 | `review-screen-teach.md`(제안) · 프리뷰 상태표 |
| AC-2e | 단위(검증기) + Playwright(쓰기 같이 해 보기에서 남은 카드를 다 놓으면 문장 완성) | `seed-validator-teach.test.ts` · `teach.spec.ts` |
| AC-3a | Playwright: 초상이 선생님 말 자리에만 있고 혼자 · 짝 문항 화면에는 '왜' 밖에서 없음. 첫 JS 에 3D 없음 | `teach.spec.ts` · `pnpm check:bundle` |
| AC-3b | 단위: 한국어 줄은 기기 ko-KR 기본 → 첫 ko-KR → 없음, 선생님 높이. 선생님 영어는 voice.prefer 의 en-US. 글 자료는 지금 목소리. read_ko 끔이면 읽지 않음 | `tests/unit/teacher-voice.test.ts` |
| AC-3c | Playwright: 고르지 않은 프로필의 첫 teach 수업에서 한 번(오늘 배울 것 앞), 고른 뒤 다른 영역 첫 수업에서 다시 묻지 않음 | `tests/e2e/teacher-choice.spec.ts` |
| AC-4a · 6e | 시드 검증(원본 셋)과 문서 확인(브리프 5절 영역 방법 · 까닭, 말하기 goal 셋) | `pnpm seed:validate` · `seed/prompts/*-3.md` |
| AC-4b · 4d | 단위(검증기) + Playwright(3단계 읽기 지문 늘 함께 · 이름표, 말하기 이야기 화면: 저절로 한 번 · '다시 듣기' 한 번 · 질문 화면에 이야기 글 없음) | `seed-validator-teach.test.ts` · `reading.spec.ts` · `speaking.spec.ts` |
| AC-5b | 단위: 3단계 'Do + 복수 주어 ~?'는 범위 밖이 아니고 does 문장은 4단계 앞에서 막힘 | `tests/unit/seed-validator-teach.test.ts` |
| AC-6a · 6c · 6d · 6f(근거 값) | 단위: 같이 해 보기 practice · '왜' 뒤 같은 행 도움 · 짝은 새 행(같은 task · goals, 다른 ctx.item) · 질문 속 낱말 question_word · 읽기 도움 read_aloud · gloss(출처 device). 수준 셈(6c · 6d)은 평가 plan 의 근거 함수와 같이 돈다 | `tests/unit/teach-evidence.test.ts`(제안) |
| AC-6f(통합) | 통합: 읽어 주기 · 뜻 보기 뒤의 첫 답에만 aid 값이 남고 아이 반응은 같음 | `tests/integration/session-flow.test.ts` |
| AC-6g · C182 (1) 의미 검증 | 단위, 아래 '말하기 질문 판정의 증명' | `tests/unit/speaking-meaning.test.ts`(제안) · `speaking-judge.test.ts` |
| AC-6g · C182 (2) 일관성 | 단위 + 통합, 아래 | `speaking-judge.test.ts` · `tests/integration/speaking-eval.test.ts` |
| AC-6g · C182 (3) A9 | 통합, 아래 | `tests/integration/speaking-eval.test.ts` |
| AC-7a | Playwright: 결과 첫머리 초상 · 마무리 줄 · 오늘 만난 말(보여 주기 단어 차례 그대로) · 칩 단 문장 틀 · 듣기 | `teach.spec.ts` |
| AC-7b | 단위: 합성 경우(U 빼고 하나만 남음 · U 가 많음 · 읽어 주기 쓴 해냄 · 'Yes, they do.' · 상한으로 짝을 못 낸 문항 → closeKoPracticed, 문턱을 넘으면 closeKo) | `tests/unit/session-recap.test.ts`(제안) |
| AC-8a | 시드 검증(원본 그대로) · 풀이 검사 · 그림 검사 · 개발 DB 적재 기록 · CI checks | `pnpm seed:validate` · `pnpm seed:check` · `pnpm images:check` · dev-load 기록 |
| AC-8b | 3단계 브리프 해시가 manifest 에 있음(1단계 몫은 둘째 묶음) | `seed/manifest/*-3.jsonl` |
| AC-9a | 둘째 묶음(4 · 5단계 표본 · 쓰기 4~5 고칠 곳 하나 이하)에서 증명한다. 이 묶음은 피드백 상한 코드를 바꾸지 않는다 | 그 묶음 plan |
| AC-10a | 단위: 합성 시도 묶음에서 지표 넷. 보고: 프리뷰 첫 주 표 | `tests/unit/teach-metrics.test.ts`(제안) · `metrics-week1.md` |
| AC-N1 | 사용 시험 측정(자리별 시간 · 세션 시간) | `metrics-week1.md` · 장부 L-3 |
| AC-N2 | 통합: 가짜 Anthropic 으로 1~3단계 세 영역 세션 끝까지 → 새 자리 호출 0(말하기 3단계 혼자 질문만), 'AI 쉬는 중'에 읽기 · 쓰기 1~3 · 말하기 1~2 는 여섯 자리를 다 하고 말하기 3단계는 혼자 질문 · 이야기만 건너뛰며 그 짝을 내지 않음 | `tests/integration/session-flow.test.ts` · `safety-cap.test.ts` |
| AC-N3 | 단위: 단추 상태(시작 안 함 · ko 없음 · read_ko 끔), 한국어 감시 상한. Playwright: 가짜 음성 셋에서 단추가 밝아지고 첫 경우만 안내 줄, 소리 없이 넘어간 대본 · 이야기의 '다시 듣기'와 U | `teach-line.test.ts` · `speech-pace.test.ts` · `speech-feedback.spec.ts` · `speaking.spec.ts` |
| AC-N4(통합) | 통합: 새 자리 시도 행 · ai_calls 에 아이 이름 · 소리가 없음 | `session-flow.test.ts` · `speaking-eval.test.ts` |
| 늘 | 린트 · 형 · 단위 · 의존 · 식별자 · 추적 · 시드 · 그림 · 빌드 · 첫 JS(Node 24 PATH) | `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm seed:validate` · `pnpm images:check` · `pnpm build` · `pnpm check:bundle` |

말하기 질문 판정의 증명(AC-6g, C182 (1) · (2) · (3)). 판정 함수 하나(judgeSpeakingQuestion)를 혼자 · 짝 · 같이 해 보기가 같이 쓰므로, 시험도 그 함수 하나에 묶는다.
- **의미 검증 긍정.** p13d 정규 시드 셋 말하기 수업의 바른 답 · 허용 답 전부(fix 3 셈 52개)가 그 문항의 의미 검사를 통과한다. 시험이 시드 파일을 읽으므로 생성 수업이 들어오면 함께 돈다.
- **의미 검증 부정(일치율과 상관없이 맞음 아님).** 바른 답 'No, they drink milk.' 문항에 'Yes, they drink milk.'(방향) · 'They drink juice.' · 'No, they drink juice.'(핵심 정보) · 'They do not drink milk.'(부정) · 'They drink milk and juice.'(틀린 정보). 일치율만이면 문턱(0.8)을 넘는 글도 넣는다: Q1 'Yes, they eat pizza.'(accepted 'They eat pizza.'와 1.0), Q3 'Yes, they go to the lake.'(accepted 'They go to the lake.'와 1.0) · 'No, they go to the park.'(0.83), Q4 'No, they wash the cups.'(accepted 'They wash the cups.'와 1.0) · 'Yes, they wash the bike.'(0.8). 값은 p13d 일치율 함수로 2026-10-30 에 잰 것이다.
- **의미 검증 긍정 예문.** 'They drink milk, not juice.' · 'They don't drink juice, they drink milk.'은 맞음이다.
- **가르기.** Q3 'No, they go to the lake.' → accepted, 'No, Dan and Tess go to the lake.' → acceptedMeaning, Q4 'Yes, they do.' → acceptedMeaning(높은 쪽, 같으면 accepted). accepted 쪽만 expressionDone 이 참이다.
- **일관성.** 같은 인식 글 묶음(문항마다 accepted · acceptedMeaning 전부, 위 부정 글, 바꿔 말하기 하나)을 혼자 질문(가짜 AI 판정 맞음 · 부분 · 다시 세 갈래)과 짝(앱 판정)에 넣는다. 묶음 글과 의미 실패 글은 세 갈래 모두에서 맞음 여부 · 묶음 · expressionDone 이 짝과 같다. AI '부분' + 'Yes, they do.'는 맞음 · acceptedMeaning · communicative · expressionDone 거짓이다(의사소통 정답 인정과 완전 수행 근거를 가름). AI '맞음' + 'Yes, they drink milk.'는 맞음이 아니고 판정은 '다시'(오답)이며 judge.ai 에 맞음이 남는다(정한 것 6). 의미가 맞고 두 묶음 모두와 문턱 아래인 바꿔 말하기('They have pizza.' 꼴)만 혼자(AI 맞음)와 짝(아님)이 다르고, 시험은 이를 알려진 차이(우려 19)로 단언한다.
- **통합(가짜 AI 클라이언트).** 혼자 질문을 '부분'으로 판정시키고 'Yes, they do.'를 내면 저장된 끝 시도가 맞음 · bundle meaning · communicative · expressionDone 거짓이고, 세션 점수에는 맞음(1)으로 든다. A9 확정 전 확인: 의사소통 정답으로 끝낸 세션과 accepted 로 끝낸 세션의 세션 점수가 같고, 단원 판정 입력(unit_progress · 최근 성적)에 의사소통 정답의 수준 값('부분' 낮춤)이 없다(C182 (3)).

## 완료 조건 · 커밋 · 프리뷰

- **완료 조건(첫 묶음).** (1) 원본 정규 시드 셋(3단계 단원 1 세 영역, 승인 수업과 생성 수업 전부)이 새 검사 전부와 필수 목표 검사를 그대로 통과하고, 풀이 검사 · 그림 검사를 통과해 개발 DB 에 적재됐다. 경고 우회 · 수정 사본은 완료가 아니다(C177 (5) · C182 (4)). (2) 가~아 · 타 가 코드 검토 Approved 이고 늘 하는 관문을 통과했다. (3) 요청자 iPad 시험에서 3단계 수업 셋이 여섯 자리를 거쳤고, 화면 검토(Fable max)가 '맞히기만 하는 과정' 항목을 닫았으며, 음성 점검 기록이 있다(AC-2d). (4) A9 확정 전 운영 미반영이 통합 시험으로 확인됐다. (5) 통합 · e2e 실행 기록과 지표 첫 값이 있다.
- **후속(이 묶음의 완료 조건 밖).** 4~12단계 꼴(L2) · 세션 시간(NFR-1)은 후속 표본 · iPad 시험에서 확정한다(C182 (5)). 지표 목표 값(미결 3) · 되짚기 문턱 영역별(미결 10) · 다시 하기 줄이기(미결 6)는 첫 주 보고 뒤 요청자가 정한다.
- **커밋.** 커밋 후보 경계는 가 · 타 끝 · 나~사 끝 · 자 끝 · 라 · 마 끝 · 화면 검토 뒤다. 실제 커밋 · push 는 요청자 지시대로 회화 적용과 함께 하고(UI · UX L-19), 11-01 전 push 면 [skip ci] 를 단다. 이 plan 은 push 하지 않는다. 여러 묶음이 고치는 파일(session-frame · result-view · reward · speaking.tsx · attempt.ts · server/session/index.ts · specs 사본)은 뒤 묶음의 커밋에 함께 든다.
- **프리뷰.** 회화 적용 push 뒤 프리뷰 가지에 나간다. 관찰 쪽 '단원 바로 가기'로 3단계 단원 1 에 들어가고, 프리뷰 상태표(아티팩트) 첫 줄에 되는 것 · 안 되는 것과 시험용 자료 여부를 적는다.

## 둘째 · 셋째 묶음

| 묶음 | 범위 | 조건 | 이 plan 에서 |
|---|---|---|---|
| 둘째 | 1단계 시드를 새 개정으로 다시 만들기(읽기 · 쓰기 단원 0~5, 말하기 단원 1~5) · 4 · 5단계 새 꼴 처음 생성 · L2 4~5 확정 · 4단계부터 짝 판정(AI 짝 호출, 우려 15) · AI 출력의 문법 용어 검사(우려 13) · 1 · 4 · 5단계에서 teach 조건(정한 것 1) 다시 보기 · 끝에 완전성 모드 단원 목표 막음을 main.yml 에 켬(정한 것 12) | 첫 묶음 완료, 4 · 5단계 표본 승인, 1 · 4 · 5단계 단원 목표(평가 spec) | 범위만. 그 묶음 plan 을 따로 쓴다 |
| 셋째 | 3단계 단원 2~5 · 2 · 6단계(운영 배포 전, S4) · 7~12단계(2차) · L2 6~12 확정 · main.yml 첫 실행(H8) 전에 1 · 3 · 4 · 5단계 모든 단원 목표가 있는지 확인 | 둘째 끝, 6~12단계 표본 승인 | 범위만 |

## plan 밖 · 정할 것

| 항목 | 몫 | 이 plan 이 하는 것 |
|---|---|---|
| 근거 칸 열 · 근거 상태 · 수준 셈 · A9 확정 | 평가 plan(P12) · 요청자 | 값 이름 제안 · 근거 값 함수 · 운영 미반영 시험 |
| 부모 화면 '오늘의 대화 거리'의 출처(본보기 en · ko) · 부모 근거 표시 | 1-나 부모 화면 | 화면 자료에 teach.models 를 실어 둔다 |
| 회화의 짧은 준비 · 회화 선생님 창 | 회화 spec 구현 | teacher.ts 한국어 갈래만 먼저 |
| 그림 보고 말하기 · 발표 · 확인 질문 AI 판정 | P11c | 질문 답 몫만 당김 |
| 수업 크기 문단(04:9) · 13절 줄 | 정본(컨트롤러) | 첫 묶음에서 잰 값을 넘긴다 |
| 칩 색 값 | UI · UX 단위 | 토큰 이름만 더하고 값은 화면 검토로 |

## 확인한 사실과 출처

모두 2026-10-29 23시대의 p13d 와 본 저장소에서 확인했다.
- p13d 커밋 전 78자리이고, 3단계 단원 1 시드 파일 셋은 수업 하나씩(배정 1 · 변형 1, generation effort xhigh)이다. 1단계 단원 파일은 수업 스물여섯(배정 10 · 다지기 10 · 보강 6, 변형 둘)이다.
- 시드 규격 보고 2판: 원본 셋 seed:validate 오류 0(칸 769 · 통과 766 · 풀이 검사 안 됨 3), test 1079 통과, check:ids 0. 3판(10-30 00:3x, fix 1): 지적 열하나 ADDRESSED, test 1117, 새 검사가 원본 시드 둘을 막음(L-22, 학습 설계자 정정 중), speech.read_ko · seed.unit_goals_max 가 settings 에 들어감. 남은 우려 넷(표 밖 검사와 짝 · 같이 해 보기 정답 검사 없음 · 문법 용어 낱말 머리 일치 · 운영 적재 목표 막음 없음 · settings 판 칸 없음).
- `src/server/session/index.ts:90` PREVIEW_ACTIVITY = 1 을 결과 · 이어 할 자리 · 만난 단어 질의가 쓴다. `evaluateSpeaking`(src/server/ai/index.ts)을 부르는 곳이 없고 말하기 3단계 질문 화면이 없다(세션 틀 머리 주석 '말하기 3~12 AI 활동 — b · c').
- 말하기 평가 요청(src/core/ai/calls/speaking.ts)의 가변부는 Question · Picture scene 뿐이라 이야기가 없다.
- `src/lib/speech/browser.ts` 의 speak 는 utterance.lang 을 settings.lang(en-US)으로 고정하고, 감시 상한(pace.ts speakWatchOf)은 speech.speak_chars_per_second 하나다. 잠금 풀기는 세션 틀 첫 누름 · 고르기 '인사 듣기' 등에서만 부른다.
- '선생님을 골라요'(TeacherChoice)는 talk-frame 에서만 쓰이고, 관찰 쪽 '단원 바로 가기'는 1단계 단원만 옮긴다.
- seed/settings.json: speaking.answer_match_pass 0.8 · ui.match_phrase_levels [0.9, 0.6] · lesson.* 와 speech.speak_chars_per_second_ko · speech.rate_ko 는 있고 speech.read_ko 는 없다. 일치율은 목표 낱말 기준이라 덧붙인 말을 깎지 않는다(match-rate.ts 머리).
- main.yml 은 운영 DB 적재(PROD_RELEASE 켬일 때만)이고 seed:validate --complete-through settings 를 돈다. dev-load.yml 도 완전성 모드다.
- 시드 그림은 Twemoji 159 · 자체 48 의 207장이고(C116), 3단계 단원 1 새 단어 열 개는 하나도 없다.

## 완료 보고 (Done)

구현 뒤 채운다: 실제 바뀐 파일(계획과 다른 것 표시) · 시험 결과(단위 수 · 통합 · e2e 실행 기록) · 시드 검증 · 풀이 검사 · 그림 검사 결과 · 요청자 시험 · 화면 검토 · 음성 점검 결과 · 남긴 것 · 커밋.
