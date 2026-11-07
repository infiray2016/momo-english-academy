# 재검토 fix 1: 묶음 라-3(I1 · M1, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). M2 · M3 은 지시대로 장부 · 7-가 · 음성 점검 몫이라 보지 않았다. 직접 확인한 것은 둘이다. 단위 셋(speaking-teach · together-speaking · teach-evidence)은 63 통과이고, 바뀐 파일 여섯의 biome check 오류는 0 이다(05:06). 통합 · e2e 는 정적이다.

## 지적별
- **I1 ADDRESSED.**
  - 서버(`src/server/speaking/index.ts`): 입력 꼴에 선택 칸 echo(:77)를 더했다. 같은 시도 id 갈래(:241~)에서 echoMergedInput(:183 — 질문 끝 시도이고 echo 가 아직 없고 빈 글이 아닐 때만)으로 그 끝 시도 행의 input.echo 와 word_count 를 갱신한다. AI 는 다시 부르지 않는다. 동시 요청은 갱신 조건 `input ->> 'echo' is null` 로 한 번만 합쳐진다. 판정 전(저장된 시도 없음)의 echo 는 invalid 다.
  - 다 의 계약: 기존 입력 칸은 그대로이고 echo 만 선택 칸으로 늘었다. 같은 시도 id 는 저장한 결과를 돌려준다는 성질도 그대로다(storedOutcome).
  - 화면(speaking.tsx sendEcho :1225~): 같은 시도 id · 같은 인식 글과 echo 를 보낸다. 서버의 '인식 글 필수'를 지키고, 닿지 않으면 '다음'과 online 때 다시 보낸다. 세션 틀의 진행 시도 queueEcho 는 지웠다(grep 0).
  - 이로써 echo 가 끝 시도 꼴(판 2 question 의 echo 칸)에 들어간다. 델타 spec 설계 8 · 정본 3.8 '같은 행의 도움받은 시도'와 맞는다.
  - 시험 'AC-22k echo 를 합친 끝 시도는 …'(`tests/unit/speaking-teach.test.ts:727~742`)가 셈 셋을 단언한다. englishSentencesOf 가 echo 를 합치기 전 1 → 뒤 2 이고(정본 03:112), teachEvidenceOf 는 accuracy wrong · retry { assist: [echo], accuracy: correct } 다(바 근거). 이미 합친 행에 다시 합쳐도 그대로라는 것(:757)도 단언한다. 통합 'AC-22k 같이 말해 볼까요 뒤 말 …'(정적)은 AI 재호출 없음 · 한 번 합침 · 단어 수 증가 · echo 만 먼저면 invalid 를 본다.
- **M1 ADDRESSED.** teacherEnglishSpeech · useTeacherEnglish(speaking.tsx:152~173)는 가르치는 수업이면 voicedSpeech(높이 · 목소리 순서, 고르기 전이면 기본)이고, 아니면 세션 접점이다. 쓰는 자리는 셋이다. 따라 말하기 본보기 · 끊어 들려주기(:301), 질문 읽기 · 질문 다시 듣기 · 바른 답(:1110), 같이 해 보기 바른 답(:1594)이다. 듣기 대본 · 이야기는 세션 접점(지금 목소리)이다. 이는 델타 spec 설계 4 목소리 표(선생님이 보이는 영어 ↔ 글 자료)와 맞는다.
  - reading.tsx 미수정은 맞다. QuestionActivity 의 '읽어 주기'(ReadAloudButton)는 PassageText 안의 지문 · 짝 글(글 자료)만 읽는다. 문항 · 보기(OptionButton)에는 읽어 주는 자리가 없어 표의 '읽어 줄 때의 읽기 문항'이 지금 화면에 없다. 읽기 같이 해 보기 글은 라-1 fix 1 M1 로 이미 teacher_en 이다.
  - 정본 AC-19j 끝 문장을 컨트롤러가 C191 로 '가르치는 수업의 선생님이 보이는 영어만 선생님 목소리'로 좁혔으므로, 가르치는 수업 밖의 지금 화면 · 기존 e2e 와도 맞는다.

## 새로 깨뜨린 것
없음. 1~2단계 앱 판정 질문은 echo 를 끝 시도로 바로 내므로(onServerSaved 아님) 그대로다. 근거 · 셈 함수와 판정 함수는 바뀌지 않았다.

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다. 통합 · e2e 는 CI 첫 실행에서 확인한다(⚠️).
