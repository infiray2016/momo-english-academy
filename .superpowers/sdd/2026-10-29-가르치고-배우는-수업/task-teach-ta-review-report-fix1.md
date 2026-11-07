# 재검토: 묶음 타 fix 1(검토자 · Opus, 2026-10-30, 범위 한정)
판정: **Approved**. NOT ADDRESSED 0 · 새로 깨뜨린 것 0(주석 다듬기 Minor 하나).
근거 확인: 지난 probe 스크립트와 새 `probe-wordsfor.ts` 를 tsx 로 돌렸다. 지금 seed 의 사본(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev/base4`, 수업 시드는 지난 사본과 같음)으로 seed:validate 를 돌렸다. 기준 실행은 종료 0 · 실패 0 · 통과 766 · 풀이 검사 안 됨 3 · 경고 12 이다. 워크트리는 고치지 않았다.

## 지적별 판정
- **I1 ADDRESSED.** (마)가 meaning.ts:191-205 에 있다. 질문 · 바른 답 낱말의 기본형 모음에 없는 핵심 낱말이 not 범위 밖에 있으면 wrong_info 다. 정본 3.3(02-2:72)과 델타 spec 350줄의 (마) 문장, C187 과 같다.
  - probe 결과: 'Yes, they do wash the dog.' · 'Yes, they do. They wash the dog.' · 'No, they drink milk and cake.'가 모두 wrong_info 다.
  - 'No, Dan and Tess drink milk.' · 'No, they go to the lake, not home.'은 ok 그대로다.
  - 원본 52개는 그대로 ok 이다(시드 셈 시험 통과 보고, 지난 probe-extra 0건). 시험 '다섯째 갈래'(speaking-meaning.test.ts:103).
- **I2 ADDRESSED.** meaningWordsFor(meaning.ts:213-227)가 수업 글 낱말 행에 function · pronoun 행 전부를 더한다. 시험 '품사 표 계약'(:115)은 지난 예문 둘을 포함한 여덟 답에서 좁힌 표와 전체 어휘의 판정이 같다고 단언한다. 정본 3.3 · C187 의 표 정의와 같다.
  - 말하기 3단계 단원 1 의 글로 만든 표(193행)로 문항 열다섯 × (아이 답 여덟 · 바른 답 · 허용 답) 120쌍을 따로 견주었다. 다른 판정은 0건이다(probe-wordsfor).
- **M1 ADDRESSED.** 고르기 꼴(choices · answerNo) 말하기 같이 해 보기만 번호 뒤에 붙여 풀이 대상에 넣는다(validate.ts itemsOf · solveTargets). 보기는 choice 꼴이다(듣기 = 이야기 + 질문, prompt = 틀, solve-check.ts:218-232). 시험(seed-validator-teach.test.ts:1825)이 정답 번호가 요청에 없음을 단언한다.
- **M2 ADDRESSED.** 셈한 파일에 '3/1.json'이 든다고 단언한다(speaking-meaning.test.ts:196).
- **C84 고침 맞음.** capitalAllowed(check-lesson.ts:679-694)는 'I'와, 어휘 목록에 없고 첫 허용 정답에 같은 꼴로 나오며 첫 글자만 대문자인 낱말만 받는다. 쓰기 원본 변형 넷의 결과는 이렇다.
  - 'The' · 'Bedroom' 카드: writing-cards 로 막힌다.
  - 'Momo' · 'I' 카드: 통과한다.
  - 기존 시험이 'I 카드 거부'를 'The 카드 거부'로 바꾼 것(seed-validator-writing.test.ts:192)은 C84 '고유 명사와 I 는 정답 꼴'에 맞는다. 받음 · 막음 시험은 :1854 · :1869 이다.
- 회귀: 지난 변형 여덟(방향 · 같이 해 보기 key · 듣기 짝 정답 · 옛 짝 · 쓰기 정답 = 본보기 · 겹침 · 짝 type · 같이 해 보기 낱말 하나)이 모두 그대로 막힌다.

## Minor(다듬기)
- meaning.ts 머리(:2)와 checkMeaning 주석이 아직 '넷'이고 (가)~(라)만 적는다. (마)를 더해 다섯으로 고친다.

## 구현자 우려 둘
1. 어휘 목록에 같은 철자가 있는 이름(Rose 등)은 막힌다: Minor 이다. 틀린 통과가 아니라 막는 쪽으로 틀리고, 지금 시드에는 해당이 없다. 인물 이름 목록이 생기면 바꾸는 것에 동의한다.
2. 무해한 덧붙임('… with Mom.')도 맞음이 아니다: C187 문장 그대로의 결과라 코드 지적은 아니다. 혼자 질문에서는 AI 가 맞음이라 해도 의미 실패가 이기므로, 사용 시험 지표에서 이 갈래의 빈도를 보도록 장부에 남긴다.

## 범위 밖 관찰
- C84 의 다른 반쪽(문장 가운데 I · 이름 카드를 소문자 'i' · 'momo'로 적은 시드)은 카드 대조가 소문자로 고르기 때문에 지금도 통과한다. 현재 쓰기 시드에는 문장 가운데 대문자 낱말이 없어 해당은 없다.
