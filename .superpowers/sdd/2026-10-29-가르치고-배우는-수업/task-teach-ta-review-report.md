# 코드 검토: 묶음 타(의미 검사 · 검증기 보탬 · 풀이 대상, 검토자 · Opus, 2026-10-30)
판정: **Changes requested**. Critical 0 · Important 2 · Minor 3. fix 할 항목은 I1 · I2 이다(I1 은 spec 한 줄 보완이 먼저).
근거 확인: 지금 원본 seed 사본(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev/base3`)으로 seed:validate 를 돌렸고, 의미 검사는 스크래치 스크립트(`probe-meaning.ts` · `probe-extra.ts` · `probe-subset.ts`)를 tsx 로 돌려 보았다. 워크트리는 고치지 않았다.

## 1. 설계 준수
- [지킴] 의미 검사 넷(설계 8 348~351줄). 정규화는 normalizeForMatch 그대로(meaning.ts:7 · :144-166)다. 기본형 · forms 는 같은 낱말이고(:68-81), 핵심 낱말은 function · pronoun 이 없는 낱말이며 사전에 없는 이름도 핵심이다(:83-86). 바른 답은 they 뒤(:94-103), 질문은 do 뒤 첫 동사부터(:106-118) 뽑는다.
  - 방향(:169-174)과 핵심 정보(:175-184)를 본다. 예 질문은 do 나, 동사를 두고 it · them 으로 받아도 된다.
  - 부정(:185-188)은 not 뒤 and · but · 대명사 앞까지를 범위로 보고, 예 질문의 not 은 막는다. 틀린 정보(:189-190)도 본다.
  - 결과 값은 plan 이름 표 judge.meaning 다섯과 같다.
- [지킴] 증명 절 예문 18(부정 11 · 긍정 7)이 시험에 있다(speaking-meaning.test.ts:52-100). 일치율이 문턱을 넘는 글(Q1 1.0 · Q3 park ≥0.8)도 단언한다.
- [지킴] 정규 시드 셋 바른 답 · 허용 답 52개가 모두 ok 이다. 시험이 seed/lessons/speaking 을 읽는다(:102-141). 스크래치 셈도 52 다.
- [지킴] (7) answer(check-teach.ts:1583-1651)와 (8) speaking-meaning(:1657-1723)이 들어갔다. 원본 말하기 변형 셋이 끝까지 막힌다.
  - 허용 답 'Yes, they eat pizza.': direction.
  - 같이 해 보기 'Momo and Ted eat cake.': key.
  - 듣기 짝 answerNo 바꿈: answer.
- [지킴] 풀이 대상: 읽기 · 쓰기 같이 해 보기 · 짝과 듣기 짝을 지금 번호 뒤에 붙였다(validate.ts:187-224). 한 칸이 한 요청이고, 짝 글은 passage 로 싣는다(solve-check.ts:220-230). 지시문 한 줄은 :361 이다. 정본 06:199(C184)와 같다.
- [지킴] 원본 셋은 그대로 통과한다(종료 0 · 실패 0 · 경고 12, 수업 시드 바뀜 없음). 설계 숫자 없음 · 식별자 영어 · 규칙 이름 kebab-case. 묶음 파일 여섯은 biome check 0 이다.
- [지킴] 기존 풀이 기록은 깨지지 않는다. 내용 해시는 칸 키와 칸 JSON 만 쓴다(validate.ts:133-150). teach 없는 칸은 itemsOf 가 그대로이고, 기준 실행에서도 통과 766 · 풀이 검사 안 됨 3 이 그대로다.

## 2. 잘한 점
- 의미 검사를 사전 행 꼴 그대로 받는 순수 함수로 두었다. 검증기와 판정이 같은 함수를 쓰고, 처음 어긋난 갈래를 이름으로 돌려준다.
- 새 문항 번호를 뒤에 붙여 기존 기록 · 시드 보기 번호를 지켰다. 시험이 그 차례와 '요청에 answerNo 가 새지 않음'까지 단언한다(seed-validator-teach.test.ts:1756-).
- (7) 이 정답을 빈칸에 넣은 문장을 짝 글 안에서 찾는다. 보기 번호 범위만으로는 못 잡는 '틀린 보기를 정답으로 둔' 시드를 잡는다.

## 3. 지적
### Important
- **I1. 덧붙인 · 엇갈린 정보가 의미 검사를 통과하고, 일치율 1.0 으로 맞음이 된다.** 예 질문 'Do Ted and Max wash the cups?'(바른 답 'Yes, they wash the cups.')에 'Yes, they do wash the dog.' · 'Yes, they do. They wash the dog.'를 넣으면 ok 이다. do 받기가 핵심 정보를 대신해 주기 때문이다(meaning.ts:180-183). 아니요 질문(바른 답 'No, they drink milk.')의 'No, they drink milk and cake.'도 ok 이다. 틀린 정보는 질문 낱말만 보기 때문이다(:189). 셋 모두 허용 답과 일치율 1.00 이다.
  - 함수는 spec 글대로이지만, C182 (1) '핵심 정보가 틀린 사례를 부정 시험에 넣는다'를 채우지 못한다.
  - 고칠 것: 다섯째 갈래를 둔다. '답의 핵심 낱말 가운데 질문 · 바른 답 어디에도 없는 낱말이 not 범위 밖에 있으면 wrong_info'다. 이름은 질문에 있으므로 통과한다.
  - 원본 52개는 이 규칙에도 0건이고 위 세 문장은 걸린다(probe-extra). spec 설계 8 · 정본 3.3 에 한 줄을 먼저 더할지는 컨트롤러가 정한다(C182 범위 안 보완).
- **I2. 묶음 다가 그대로 쓸 품사 표의 계약이 없다.** MeaningWord[] 는 직렬화되는 꼴이라 세션 자료에 실을 수 있다. 그러나 plan 정한 것 7 글대로 '그 수업 질문 · 짝 · 같이 해 보기 글의 낱말'만 실으면 판정이 갈린다. 그 표에 없는 대명사가 not 범위를 닫지 못하기 때문이다(meaning.ts:131).
  - 실측: 그 질문 글로 만든 10행 표에서 'They don't drink juice, she drinks milk.' · 'Not juice. We drink milk.'가 전체 어휘로는 ok, 좁힌 표로는 negated 다.
  - 고칠 것: meaning.ts 에 표를 만드는 순수 함수를 둔다. 수업 글의 낱말 행에 function · pronoun 행 전부를 더하는 함수다. 좁힌 표와 전체 어휘의 판정이 같다는 시험을 더하고, plan 정한 것 7 글을 그에 맞춘다.
### Minor
- **M1. 말하기 같이 해 보기(고르기 꼴)를 풀이 대상에서 뺐다**(구현자 우려 4). 정본 06:199 는 '세 영역 수업의 정답이 있는 같이 해 보기'라, choices · answerNo 가 있는 말하기 같이 해 보기도 들 수 있다. 빼려면 정본에 한 줄로 적고, 넣으려면 choice 꼴로 낸다. 지금은 (7) 이 틀에 넣은 글 = 바른 답만 본다.
- **M2. 시드 답 셈 시험은 `checked > 0` 만 단언한다**(speaking-meaning.test.ts:140). 3단계 단원 1 파일이 빠져도 다른 가르치는 수업 하나로 통과한다. 그 파일이 셈에 들었는지를 단언한다.
- **M3. spec:trace 종료 1**(구현자 우려 1). 본 저장소 15절에는 AC-22k · 22l 이 있으니 워크트리 specs/11 을 맞춘 뒤 0 을 확인하고 커밋한다.

## 4. 구현자 우려 넷의 심각도
1. spec:trace: Minor(M3, 과정 몫).
2. Do 질문 꼴에만 건다: 지적 아님. 설계 8 끝 문장대로다.
3. 지시문 한 줄 · 비용: Minor. 기록은 내용 해시라 무효가 되지 않음을 확인했다. 다시 풀지는 '정할 것 카' 몫이다. 호출 수는 칸마다 하나로 같고 문항 수만 는다(3단계 단원 1 기준 읽기 3 → 8, 쓰기 5 → 12, 듣기 3 → 6).
4. 말하기 같이 해 보기 제외: Minor(M1).

## 범위 밖 관찰
- src/core/speaking/judge.ts 의 바뀜은 의미 검사를 쓰지 않아 다른 묶음 몫으로 보고 판정하지 않았다.
