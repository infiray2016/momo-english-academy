# 보고 5판: 말하기 Q2' 짝 장면 바꿈(학습 설계자 · Opus · xhigh, 2026-10-30)
상태 DONE. 고친 파일은 p13d `seed/lessons/speaking/3/1.json`(12,262 바이트)과 표본 `samples-l3u1.md` 의 Q2' 한 줄이다. 읽기 · 쓰기 시드와 다른 파일은 그대로다.
- 고른 길: 사람 쌍. 먹는 장면은 단원 안 eat 문항이 이미 다섯(Q1 · Q1' · 같이 해 보기 1 · 듣기 L1 · L1')이라 더 겹치고, 마시는 장면은 Q2 의 짝으로 같은 하는 일(drink)을 지킨다.
- 바뀐 값: 이야기 'Momo and Dad drink juice. I drink milk.' · 질문 'Do Momo and Dad drink milk?'(모모랑 아빠는 우유 마셔?) · 바른 답 'No, they drink juice.' · accepted 'No, they drink juice.' · 'They drink juice.' · 'They drink juice, not milk.' · acceptedMeaning 'Momo and Dad drink juice.' · whyKo 'Momo and Dad 는 juice 를 마셔요. They 로 말해요.'(39자).
- Momo and Dad 쌍은 본보기 · 같이 해 보기 · 혼자 문항 · 다른 짝 어디에도 없다. 질문 글의 milk(틀린 정보)와 답의 juice(바로잡은 정보)가 갈린다.
- seed:validate(`--areas reading,writing,speaking`): 종료 코드 0, failed 0, 경고 12(모두 unit-goals), referenceErrors 0.
- 영어 범위 검사 197개 통과, 허용 답 두 묶음 가르기 시험 62개 어긋남 0.
