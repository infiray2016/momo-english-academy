# 재검토 3/3: 시드 규격 · 검증기 fix 3(검토자 · Opus, 2026-10-30, 범위 한정)
판정: **Approved**. NOT ADDRESSED 0 · 새로 깨뜨린 것 0.
근거 확인: 지금 원본 seed 를 스크래치(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev/base3`)에 떠서 지난 변형을 다시 만들어 돌렸다. 기준 실행은 종료 0 · 실패 0 · 경고 12(unit-goals), 인자를 켜면 종료 1 · unit-goals 오류 59 건으로 지난 라운드와 같다. 수업 시드 세 파일은 지난 사본과 같다.

## 지적별 판정
- **I1(나머지) ADDRESSED.** sentenceForms(check-teach.ts:1217-1221)가 글과 그 문장들을 answerForm 으로 고르고, shownTexts(:1223-1245)와 checkDiffer(:1309-1327)가 문장 단위로 맞댄다. soloTexts 에 읽기 지문 · retryHighlight(:1260 · :1264)와 듣기 retryHighlight(:1285)가 들어갔다. 사본 결과는 이렇다.
  - 본보기 en = 지문 정답 문장: content.passage · questions.1.retryHighlight 에 teach-differ.
  - 본보기 storyEn = 대본 한 문장: listening.0.script · retryHighlight 에 teach-differ.
  - 끝 부호만 '!'인 옛 짝: spare.modelAnswer · accepted.0 에 teach-differ.
  - 쓰기 정답 = 본보기, 옛 짝 되돌림: 그대로 막힌다.
  시험 '혼자 문항과 본보기의 다름(문장 단위, fix 3) …'(seed-validator-teach.test.ts:1310).
- **N1 ADDRESSED.** 3단계 단원 1~4 말하기 같이 해 보기에 singleWordAnswers 를 건다(:937-952 · :1019-1022). 같이 해 보기 acceptedMeaning 'Cookies.' 사본이 speaking-question 오류다(타 의 speaking-meaning 도 함께 남). 시험 :1240.
- **N2 ADDRESSED.** goalsBlocking 인데 키가 없거나 꼴이 틀리면 settings.json 에 unit-goals 오류를 낸다(validate.ts:1230-1239). settings.json 에서 seed.goals_required_levels 를 지운 사본에 인자를 켜면 unit-goals(settings) 오류로 종료 1 이다. 인자가 없으면 가르치는 수업 칸의 settings 오류만 난다(기존 동작). 시험 :1653.

## 그 밖
- 회귀 확인: 겹침 · 짝 type 사본은 그대로 막힌다. 원본 셋은 문장 단위 대조에서도 0건이다. 걷은 사본이나 경고로 돌린 곳은 없다.
- 남은 우려 둘은 지난 의견과 같다. 풀이 검사는 묶음 타가 맡고, 원형 일치 해석은 정본 반영 때 한 줄로 적는다.
- 범위 밖: grammar-terms.json 에 낱말 스물다섯(일반동사 · 어순 …)이 더해졌다. 이 라운드 diff 밖이고, 원본 시드는 걸리지 않는다.
