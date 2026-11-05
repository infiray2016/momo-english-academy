# 보고 4판: 3단계 단원 1 정규 시드를 새 검사에 맞춤(학습 설계자 · Opus · xhigh, 2026-10-30)
상태 DONE_WITH_CONCERNS. 고친 파일은 p13d `seed/lessons/reading/3/1.json`(9,256 → 10,322 바이트) · `seed/lessons/speaking/3/1.json`(12,262 바이트 그대로)와 표본 `samples-l3u1.md` 두 줄이다. p08 에는 3단계 수업 파일이 없어 맞출 사본이 없었다. 다른 시드 · 규격 · 검증기 코드는 손대지 않았다.
## 바꾼 문항(말하기, 규칙 teach-differ 2건)
- content.questions[1].spare(Q2' 짝): 이야기 'Momo and Max drink water. I drink milk.' → 'Momo and Max drink juice. I drink milk.', 바른 답 'No, they drink water.' → 'No, they drink juice.'.
- accepted: No, they drink juice. · They drink juice. · They drink juice, not milk. / acceptedMeaning: Momo and Max drink juice. / whyKo: 'Momo and Max 는 juice 를 마셔요. They 로 말해요.'(38자). 질문 'Do Momo and Max drink milk?'와 아니요 꼴은 그대로다.
- 새 바른 답과 허용 답은 본보기 · 같이 해 보기 · 혼자 문항 · 다른 짝의 글과 같지 않다. 인물 Momo and Max 는 본보기(Max and Gus) · 같이 해 보기(Momo and Ted · Mom and Dad) · 혼자 질문(Dan and Tess)과 다른 쌍이다.
## 더한 표제어(읽기 content.glossary, 열하나)
- Dan(댄(사람 이름), proper) · Tess(테스(사람 이름), proper) · room(방) · cookie(쿠키) · rice(밥) · apples → apple(사과) · shop(가게) · cups → cup(컵) · car(자동차) · bank(은행) · Dad → dad(아빠). 기존 항목과 같은 꼴(surface · lemma · meaningKo)이다.
- 이름 둘을 proper 로 넣어 범위 밖 비율 3건(같이 해 보기 1 · 짝 1 · 짝 3)도 함께 풀렸다.
## seed:validate 결과(`pnpm -s seed:validate --areas reading,writing,speaking`, 서브셸 · Node 24)
- 고치기 전: 종료 코드 1, failed 2 · 오류 10건(읽기 glossary 5 · offband 3, 말하기 teach-differ 2) · 경고 12.
- 고친 뒤: 종료 코드 0, cells 769 · passed 766 · failed 0 · warnings 12(모두 unit-goals '필수 단계 단원 목표 없음') · referenceErrors 0.
- 영어 범위 검사(내 스크립트): 시드 영어 글 197개 모두 통과.
## 우려 2
- unchecked 3 은 세 수업에 풀이 검사(seed:check, API 호출) 기록이 없어서다. 이번에는 돌리지 않았고, 운영 적재 전에 요청자 키로 돌려야 한다.
- 1~2단계 마실 것 낱말이 milk · water · juice 셋뿐이라, 새 짝의 답 낱말 juice 가 혼자 Q2 질문 글에도 나온다(답 자리 낱말과 글은 다름). Max 는 강아지라 '주스를 마시는 강아지' 장면이 된다.
