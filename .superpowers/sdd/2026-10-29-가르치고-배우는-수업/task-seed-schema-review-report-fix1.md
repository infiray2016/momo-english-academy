# 재검토: 시드 규격 · 검증기 fix 1 · fix 2(검토자 · Opus, 2026-10-30, 범위 한정)
판정: **Changes requested**(fix 라운드 2/3). NOT ADDRESSED 1(I1 일부) · 새로 깨뜨린 것 2(Minor). 남은 것은 코드만 고치면 되고, 원본 시드는 다시 고치지 않아도 된다(아래 문장 단위 셈 0건).
근거 확인: 지금 원본 seed 를 스크래치(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/rev/base2`)에 떠서 seed:validate 를 돌렸다. 기준 실행은 종료 0 · 실패 0 · 경고 12(모두 unit-goals)이다. `--require-unit-goals` 를 켜면 종료 1 · unit-goals 오류 59 건이다. 변형 사본은 `mutate2.py` · `mutate3.py` 로 만들었다. 워크트리는 고치지 않았다.

## 지적별 판정
- **I1 NOT ADDRESSED(일부).** 쓰기 정답 · 말하기 질문 · 이야기 · 바른 답 · 허용 답 대조는 들어갔다(check-teach.ts:1201-1296, 규칙 teach-differ, 시험 '혼자 문항과 본보기의 다름…' :1257). 고치기 전 말하기 짝을 되돌린 사본과 쓰기 정답을 본보기로 바꾼 사본은 이제 막힌다. 그러나 지난 보고가 적은 지문 · 대본 대조가 빠졌다. 읽기는 지문을 아예 보지 않고(:1235-1243), 대본 · 짝 글은 통째로만 맞댄다(:1240 · :1258 · :1261). 본보기 en 을 지문의 정답 문장 'They drink juice.'(retryHighlight)로 바꾼 사본, 본보기 storyEn 을 듣기 대본의 문장 'Ted and Gus eat bananas.'로 바꾼 사본이 모두 실패 0 이다. 끝 문장 부호만 '!'로 바꾼 짝(옛 'No, they drink water')도 통과한다(norm 이 문장 부호를 남김, :119-121). 근거: 설계 7 '혼자 문항 · 짝의 영어 문장과 정답 문장', AC-1a. 고칠 것: 지문 · 대본 · 짝 글 · 이야기를 splitSentences 로 나눠 본보기 · 같이 해 보기 문장(같이 나눔)과 맞대고, retryHighlight 를 정답 문장으로 넣고, answerForm 처럼 문장 부호를 고른다. 지금 원본 셋은 이렇게 맞대도 0건이다.
- **I2 ADDRESSED.** 짝 꼴(check-teach.ts:1299-1337), 짝 · 같이 해 보기의 보기 번호 · 그림 키(check-lesson.ts:572-608 · :929 부근), 쓰기 정답 꼴(check-lesson.ts:781 부근). 짝 type 'sequence' · 짝 answerNo 7 사본이 각각 spare · answer 오류다. 시험 '짝 꼴: …' :1287.
- **I3 ADDRESSED.** 겹침 · storyEn 필수 · '예' 하나(:949-1058, 규칙 speaking-question). 겹침 · storyEn 지움 · '예' 둘 사본이 모두 막힌다. 시험 :1142 · :1169 · :1232.
- **I4 ADDRESSED.** 0 이면 goal 오류, 미만이면 경고(:1077-1089). 사본(read-3-1-2 첫 값)이 teach.goals.0 goal 오류다. 시험 :1433(0 사례 포함).
- **I5 ADDRESSED.** 이름표(:1340) · 되짚기 줄(:1379) · 유형 경계(:1391) · 조립 빈칸(:1421) · 자리별 시간 경고(:1463). askRole 지움 · 빈칸 둘 · '찾을 수 있어요' · 같이 해 보기 type sequence · 카드 하나 · 틀린 카드 사본이 모두 막힌다. 시험 :1336 · :1353 · :1362 · :1387 · :1404.
- **M1 ADDRESSED.** 예외 낱말(grammarTermHits :469-495, reference.ts 항목 exceptions, grammar-terms.json 주어 · 부사). 원본 시드에는 '주어' · '부사'가 없어 예외에 기대지 않는다. 칩 화면 이름표 시험은 문구 표가 생길 때로 남긴다.
- **M2 ADDRESSED.** 잠정 상수를 지웠고 칸 검사는 settings 오류다(:875, 시험 :811). 다만 validate.ts 쪽은 아래 N2.
- **M3 · M4 · M5 · M6 ADDRESSED.** 글로서리 proper 만 이름으로 보고 glossaryMissing 을 더함(:1093-1129). 짝 셋은 1~3단계 · 혼자 셋은 3단계 단원 1~4 · 이야기 낱말은 no · yes · they 만 뺌(시험 :1200). 목표 수 · tasks 는 reference-index unit-goals(시험 :1531). 예문 union(lesson.ts:79) · reference.ts:327-331 주석 · seed-viewer.spec.ts 해설 있을 때만.

## fix 2 와 plan 정한 것 12
- 인자 기본 끔: parseArgs 기본 false(scripts/seed-validate.ts:64 · :114 · :322), 시험 :1578. 지킴.
- 모든 모드 경고 유지: 끄면 영역 · 단계마다 경고(validate.ts:1215-1245). 기준 실행 경고 12. 지킴.
- 작업 흐름 파일에 안 넣음: `.github` 에 인자 없음, 작업 흐름 파일 바뀜 없음. 지킴.
- 수업 단위 teach.goals 필수 오류: check-teach.ts:873-884 그대로, 시험 :1103. 지킴. 12절 행 글(09:140)도 인자 꼴로 바뀌었다.

## 원본 시드 정정 확인(C182 (4))
규칙을 지킨 정정이고 우회가 아니다. 말하기는 content.questions.1.spare 의 이야기 · 질문 · 바른 답 · 허용 답 · 뜻 묶음 · '왜'가 함께 water → juice, Max → Dad 로 바뀌었다. 옛 짝을 되돌린 사본은 teach-differ 둘로 막힌다. 읽기는 글로서리에 Dan · Tess(proper) 와 같이 해 보기 · 짝 글의 낱말 아홉이 더해졌다. 더한 열하나를 지운 사본은 glossary · offband 로 막힌다. 칸을 걷거나 경고로 돌린 곳은 없고, 경고 12 는 평가 2절이 정한 보고만이다. 글로서리 표제어는 지문에 없고 같이 해 보기 · 짝 글에만 있다. 수업 하나의 글로서리를 짝에 쓰는 것은 C64 (1) '짝의 범위는 그 수업과 같다'에 맞는다. 다만 그 화면에서 뜻 보기가 이 글로서리를 읽어야 실제로 뜻을 볼 수 있다(라 단계 화면 몫).

## 새로 깨뜨린 것(Minor)
- **N1.** 같이 해 보기의 낱말 하나 답 검사가 빠졌다. M4 로 범위를 좁히며 together 를 건너뛴다(check-teach.ts:999). 설계 6 accepted 행은 '말하기 같이 해 보기'도 대상이다. 같이 해 보기 acceptedMeaning 'Cookies.' 사본이 실패 0 이고, 지난 판의 together 시험도 사라졌다.
- **N2.** `--require-unit-goals` 를 켜도 seed.goals_required_levels 가 없거나 꼴이 틀리면 조용히 건너뛴다(validate.ts:1215-1216). 막겠다고 켠 자리에서 열리는 꼴이다. 켰을 때 키가 없으면 오류로 둔다. CI 에서는 check:ids 의 12절 ↔ settings 대조가 같은 빈틈을 덮는다.

## 구현자의 남은 우려 둘
- 짝 · 같이 해 보기 풀이 검사: plan '타'의 solve-check.ts(plan 98줄)가 맡고 자-2 생성 전이다. AC-8a 와 완료 조건 (1)이 적재 전에 요구하므로 이 검토의 막음은 아니다. 새 칸 셋은 '풀이 검사 안 됨'이라 완전성 모드 적재가 저절로 막힌다.
- 이야기 낱말의 원형 일치(eats ↔ eat): 받는 것이 맞다고 본다. C175 (3)의 뜻은 답의 내용이 이야기에 있다는 것이고, they 에 맞춘 꼴 바꿈이 이 단원이 가르치는 것이다. 원형 일치는 꼴만 다른 같은 낱말을 받을 뿐 새 내용을 들이지 않는다. 다만 AC-4d 의 '낱말'을 원형으로 읽는다는 해석을 정본 반영 때 한 줄로 적고, eats → eat 은 받고 다른 내용 낱말은 막는 시험을 둔다(지금 시험에 없음).

## 범위 밖 관찰
- 말하기 짝 1 은 혼자 질문 1 과 낱말 짝(milk · juice)이 같고 뒤집힌 꼴이다. 설계 1 '짝은 … 낱말이 다르다'는 설계 7 이 시드 검토(자-2, Fable)에 맡긴 자리라 그쪽에 넘긴다.
- 허용 답의 한 문장 검사('No. They eat pizza.'를 accepted 에 넣은 사본 실패 0)는 plan '타' (3)의 '한 문장 답'이 맡는다.
- 지난 보고의 읽기 화면 빈 해설 줄(reading.tsx:502)은 그대로다.
