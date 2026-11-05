# 보고 3판: 표본 C175 반영과 시드 고침(학습 설계자 · Opus · xhigh, 2026-10-29)
상태 DONE_WITH_CONCERNS. 표본 `.superpowers/sdd/2026-10-29-가르치고-배우는-수업/samples-l3u1.md` 3판 452줄(끝 절 '3판에서 바뀐 자리'). C177 추가분(unit-specs goals · 이야기 다시 듣기)까지 반영했다. 정본 · 코드 · 다른 시드는 고치지 않았고, 시드 검증기는 지시대로 돌리지 않았다.
## 바뀐 자리
- (1) R8 · R14 · 1.5: 앱이 읽어 주기 · 뜻 보기 사용을 기록하고, 그 결과를 독립 읽기로 단정하지 않는다는 줄을 더했다(시드 칸 없음).
- (2) 말하기 허용 답을 accepted(완전 수행 꼴 셋) · acceptedMeaning(의사소통 정답: 'Yes, they do.' · 이름을 그대로 쓴 답)으로 갈랐다. 화면 반응은 같고 근거만 갈린다. 낱말 하나 답은 어느 쪽에도 없다.
- (2) 가르는 법을 적었다: 두 묶음 각각의 가장 높은 일치율 가운데 높은 쪽(같으면 accepted). 지금 일치율 함수로 답 62개를 넣어 모두 바르게 갈림을 확인했다.
- (3) 혼자 질문 Q1~Q4 는 직전에 짧은 이야기(소리만)를 들려준 뒤 묻는다. 이야기는 과제 자극이고 힌트가 아니며, 답 낱말은 이야기에만 있다(예 문항 Q4 만 질문에). 따라 말하기 여섯 문장은 그대로이고 질문은 그 기억에 기대지 않는다. 말하기 추정은 475초(+24초).
- (4) R15 · W12 · S15 · 0.3: closeKo 는 유효 문항(U 뺌) 2 이상(lesson.recap_min_evidence 후보 2)이고 독립 비율 0.8 이상일 때만이다. 도움 기록 · 의사소통 정답은 독립 셈에 넣지 않는다.
- (6) C-라 를 '단원 목표 초안 다섯(read-3-1-1 · write-3-1-1 · speak-3-1-1 · speak-3-1-2 · speak-3-1-3)'으로 고쳤다.
- C177 (3): 혼자 질문 · 질문 짝의 이야기는 이야기 화면에서 저절로 한 번 들려주고 '다시 듣기'를 한 번 둔다고 0.3 · S11 · S14 · 3.4 에 적었다(이야기는 자극, 힌트 아님).
- C177 (4): speak-3-1-3 의 needs 를 response · expression 으로 고쳤다. accepted 꼴만 expression 을 채우므로 'Yes, they do.'는 응답 근거로 남되 목표 달성은 아니다. expression 이 견줄 글은 그 질문의 accepted 다(규격이 받아야 함).
## 시드 변경(p13d `seed/lessons/*/3/1.json`, 말하기만 바뀜)
- speaking/3/1.json 11,213 → 12,262 바이트. 질문 넷에 storyEn 을 더했다. 질문 · 질문 짝 · 같이 해 보기 둘의 허용 답을 accepted(셋) · acceptedMeaning 으로 나눴다. 이름 앞에 No · Yes 를 붙인 꼴은 8낱말이 생겨 빼고, '높은 쪽' 규칙이 그 꼴을 의사소통 정답으로 가르는 것을 확인했다.
- reading/3/1.json 9,256 · writing/3/1.json 8,808 바이트는 그대로다(C175 (1) 은 시드 칸 없음).
- 영어 범위 검사: 시드 영어 글 195개 모두 통과(낱말 수 7 이하 · 1~2단계 + 새 단어 + we · they · 금지어 · 범위 밖 꼴). 선생님 한국어 줄 65개 모두 40자 · 두 문장 안. JSON 셋은 읽힌다.
## unit-specs 변경(C177 (5))
- `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d/seed/unit-specs.json` 의 읽기 · 쓰기 · 말하기 3단계 단원 1 세 항목(14 · 75 · 135줄)에만 `goals[]` 를 words 바로 뒤에 넣었다. 꼴은 평가 spec 4판 2절(id · ko · core · tasks · home · needs · accept)이고 demands 는 과제 칸이라 넣지 않았다.
- read-3-1-1(사실 정보 찾기 · fact · 이야기 · comprehension · correct) · write-3-1-1(문장 꼴 바르게 쓰기 · assemble-sentence · 낱말 카드 · form · correct) · speak-3-1-1(듣고 따라 말하기 · repeat · 친구와 놀이 · repeat · correct) · speak-3-1-2(듣고 뜻 잡기 · listening · 친구와 놀이 · comprehension · correct) · speak-3-1-3(정보 묻고 답하기 · question · 친구와 놀이 · response · expression · correct).
- 항목 수 같고 goals 밖 내용은 바뀐 것이 없음을 견줘 확인했다. 한 항목 한 줄 꼴을 지켰고 revision · correction 은 그대로 두었다.
## 우려 7
- 지금 단원 규격 스키마(UnitSpecSchema)는 엄격한 꼴이라 goals 를 모른다. 구현자가 받기 전까지 seed:validate 와 통합 테스트 '저장소 seed/ 규격 파일을 규격만 적재'(tests/integration/seed-load.test.ts 711줄)가 걸릴 것으로 본다(돌려 보지 않음). home 낱말 · core 를 대조할 목표 용어 목록(seed/lists/goal-terms.json)도 아직 없다.
- '높은 쪽' 규칙은 표본의 제안이다. accepted 를 먼저 보는 구현이면 'No, Dan and Tess go to the lake.' 같은 답이 0.83 으로 완전 수행이 된다(확인함). 델타 spec · 구현이 이 규칙을 받아야 한다.
- 원본 시드 셋은 지금 검증기에서 여전히 스키마 오류다(2판 24건 + 3판의 storyEn · acceptedMeaning). 구현자가 스키마 · 검증기를 고칠 때까지 p13d 의 seed:validate · seed:load 는 막힌다.
- 델타 spec 6.3 에 없는 칸이 다섯 묶음이다: 혼자 질문 storyEn · acceptedMeaning(3판), askRole · chips[].from · repeat.goal · repeat.chunks · repeat.spares(2판). 스키마 고침 전에 spec 이 받아야 한다.
- 지금 스키마가 preview.example 을 요구해 예문을 본보기 문장으로 채운 상태다(C170 (3) 과 어긋남, 2판 우려 그대로).
- 읽기는 읽어 주기를 쓴 문항을 독립 셈에서 빼므로, 읽어 주기를 늘 쓰는 아이는 closeKo 를 듣기 어렵다. 의도와 맞지만 사용 시험에서 비율을 본다.
- 말하기 한 세션의 인물 쌍이 여럿이다(Dan · Tess · Max · Gus · Momo · Ted · Mom · Dad). 이름 수 상한은 단원 전체를 만든 뒤 센다.
