# 보고: P6a 규격 파일 묶음 0(학습 설계자 cd-p06a, 2026-10-16 22:4x ~ 10-17 00:0x)

상태: DONE_WITH_CONCERNS — 완료 판정 넷(필터 명령 0 · 설정값 12절 대조 0 · lint 0 · test 159)을 채웠다. 걱정은 셋이다. forms.json 에 120 요소 id 를 다 넣지 못했고(규격이 검출기 없는 항목을 거부), 형태 표의 범위 규칙 둘(같은 단계 앞 단원 · 한쪽 열에만 있는 형태)이 묶음 1~4 의 시드를 지나치게 막을 수 있으며, 4~12단계 후보의 단계 경계가 거칠다.

워크트리: `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(feature/1a-p06a-seed-reference, 바탕 6bd6015). 커밋 · 하위 에이전트 없음. 코드 · 시험 · 정본 · 공용 파일은 고치지 않았다(biome.json 변경은 컨트롤러가 옮긴 것 그대로).

## 만든 파일과 건수

| 파일 | 건수 | 비고 |
|---|---|---|
| `seed/settings.json` | 180행 | 12절 121행을 펼침. profile.start_level.<영역> 행 없음(C61 (2)). H5 키는 12절 잠정 값, speaking.answer_max_seconds 는 제안 값 30 · 30 · 60 · 150 |
| `seed/level-specs.json` | 48행 | can-do 48 새로 씀. testMix 36행 · frame 7행은 H5 잠정 |
| `seed/model-prices.json` | 6행 | plan 표 그대로. thinkingDefault 전부 adaptive(Opus 4.8 메모는 근거 문서 (7)) |
| `seed/images.json` · `vocab.json` · `unit-specs.json` | 빈 목록 | 뿌리 키 images · vocab · unitSpecs(reference.ts 확인) |
| `seed/lists/homophones.json` | 33묶음 | vocab 계획(두 안)에 드는 묶음만. 9묶음은 vocab 확정 뒤 다시 |
| `seed/lists/forbidden.json` | 낱말 en 45 · ko 19, 정규식 11 | personal-info en 5 · ko 1, contact 3, violence 2 |
| `seed/lists/forms.json` | 6항목 | 1~3단계 도입 요소의 검출기(have · can · can-not · there-is · there-are · lets) |
| `seed/lists/meta-sentences.json` | 13 | 6.4 목록 + as a language model · the assistant · the card says |
| `docs/research/2026-10-16-seed-reference-basis.md` | 절 (1)~(8) | (1) 어휘 출처 · 수 표 · 기능어 165 · 알파벳 26 · 1~3단계 후보, (2) can-do 48 근거, (3) 단원 주제 · 학습 요소 240 + 단원 0, (4) 형태 표 120 요소 표 · 시험 문장, (5) 금지어 시험 문장, (6) H5 제안서 1~7, (7) 견본에서 고친 곳, (8) 일회 검사 |
| `tests/.tmp/p06/candidates-1.json` ~ `-12.json`(저장소 밖) | 1,973 후보 | 단계마다 154~192, 순위 · 출처 표시 · CEFR-J · 1단계 철자 패턴. `stats.json` 은 수 표 원자료 |
| `tests/.tmp/p06/` 스크립트(저장소 밖) | 13 | 생성 gen_settings · gen_level_specs · gen_lists, 후보 cand_src · build_candidates · marks · summarize · cefrj_compare, 검사 check_settings · check_level_specs · check_lists.ts · diff_level_specs.ts · check_homophones |

## 필터 명령과 일회 검사(명령 · 출력 첫 줄)

```
PATH=…/node/v24.22.0/bin:$PATH pnpm -s seed:validate --json | jq '[.errors[] | select(.rule != "reference-complete")] | length'
0
PATH=…/node/v24.22.0/bin:$PATH pnpm -s seed:validate --json | jq -r '.errors[] | select(.rule == "reference-complete") | .message' | head
reading 1단계 단원 0 규격 행이 없다
pnpm -s seed:validate
seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 1300 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 242
python3 -I tests/.tmp/p06/check_settings.py /Users/hikaru/workspace/momo-english-academy/specs seed/settings.json
12절 표 행 121  …  RESULT 0
python3 -I tests/.tmp/p06/check_level_specs.py /Users/hikaru/workspace/momo-english-academy/specs seed/level-specs.json
다름 없음 / RESULT 0
pnpm exec tsx tests/.tmp/p06/check_lists.ts
| I have a red bag. | have | have | 맞음 |  …  RESULT 0
pnpm lint → Checked 50 files … No fixes applied.(종료 0)
pnpm test → Test Files 16 passed (16) · Tests 159 passed (159)
```

남은 규격 오류 242 는 모두 reference-complete(단원 규격 242행이 빈 목록)다. 빈 vocab 때문에 따로 나는 오류는 없다. 경고 0 이라 can-do 숫자 경고도 0 이다. 25 안을 시험하려고 settings 사본(unit.vocab_count.1-3 = 25)을 `--root` 로 돌려도 frame-* 오류 0 이었다.

## 3.3 · 6.3 · 12절과 대조한 결과

- 12절: 121행을 따로 읽어 펼친 키 180 = settings.json 180. 범위 · 바꾸는 곳 · 값 다름 0(H5 키 값은 12절 잠정 값과 같고, 12절에 값이 없는 speaking.answer_max_seconds 넷만 값 맞대기 밖). 6.1 표의 모델 · effort 도 맞댔다.
- 3.3: 읽기(지문 단어 · 문장 · 글 종류 · 문제 수 · 목표 시간) · 쓰기(분량 · 목표 시간 · 교정 상한) · 말하기(따라 말하기 · 듣기 문항 · 보기 꼴 · 질문 수 · 그림 과제 문장 · 발표 초 · 확인 질문 · 목표 시간) · 회화(목표 턴 · 목표 시간 · 미션 · 힌트 단 수 · 쓸 수 있는 말) · CEFR 다름 0. 값을 넷 바꾼 사본을 넣으면 넷 모두 잡는다.
- 3.6: 문장 길이 상한 48행 다름 0.
- 6.3 단계 경계: 말하기 바른 답 1~3 · 허용 답 셋 1~2 · 한국어 뜻 1~4, 회화 턴 카드 1~3 · 답 두 개 1 · 턴 영어 틀 3 · 턴 그림 1~3 · 더 이야기할 거리 1~3 · 한국어 뜻 1~4 · 말해 보기 토막 1~3 · more_talk 토막 없음 다름 0.
- 정할 것 바: level_specs maxCorrections 6~12 = 12절 writing.max_corrections, 다름 0.

## 견본에서 고친 곳

수치 칸은 한 곳도 바꾸지 않았다(견본 수치가 위 대조에서 정본과 같음). 고친 곳: canDo 48(틀 문장 → 3.1 · 3.3 에 맞춘 문장), 회화 mode 12(3.3 대화 방식에 더 가깝게), testMix 36 추가(H5 잠정). frame 은 견본과 같은 3.2 값(H5 잠정).

## 근거가 약한 항목

1. CEFR Companion Volume(2020) 척도 이름: 원문(rm.coe.int)이 403 이라 기억에 기댔다(can-do 근거 열, (추측)).
2. 2022 성취기준 · [별표 4] 는 GitHub 사본(고시 제2022-33호 [별책 14], sha256 기록)에서 읽었다. 교육부 누리집 첨부는 2011 판이었다. 쪽수 대조는 하지 않았다.
3. 4~12단계 후보의 단계 경계 · 순위가 거칠다. CEFR-J 대조에서 7~9단계 앞 150 에 A1 86, 10~12단계에 A2 154 가 있다. 묶음 2~4 에서 단원 주제와 함께 다듬는다.
4. 기능어 단계 가운데 3.6 과 다른 것(my · your · it · me 1, or 2, so 4)은 3.3 1단계 회화가 요구해서다. 검토자가 볼 곳.
5. speaking.answer_max_seconds 와 testMix 비율은 판단값이다(측정 없음). 말하기 9~12 의 허용 답 question 13 은 표본에서 만들기 어려울 수 있다.
6. 1단계 쓰기 철자 패턴 단원은 패턴 낱말이 25 안 81% · 30 안 79% 다(나머지는 숫자 · 색 · 몸 같은 패턴 밖 기본 낱말).
7. model-prices 의 대체 모델 effort 목록은 plan 의 (추측) 그대로다(H4 뒤 P9).

## H5 제안서 요지(근거 문서 (6))

- 갈림길: 1~3구간 단원 단어 25(배정 5 + 다지기 5) 대 30(6 + 4). 25 면 영역 누계 375 · 825 · 1,275 · 1,725, 30 이면 450 · 900 · 1,350 · 1,800. 시드 수(수업 3,821 · 변형까지 7,642)와 생성 시간은 둘 다 같고, vocab 은 25 안이 75 낱말 적다.
- 권하는 값: 1~3 25 · 5 · 10(5 + 5) · 3 · 2 · 6 · 4, 4~6 · 7~9 · 10~12 · 쓰기 6~9 · 10~12 는 지금 값 그대로. 단계 평가 testMix 는 근거 문서 (6) 5 표. speaking.answer_max_seconds 30 · 30 · 60 · 150.
- 까닭 세 줄: (1) 가장 어린 구간의 단원 단어를 17% 줄여 초3~4 300 · 초등 600 과의 차이를 줄인다(825 ≈ `*` 800). (2) 다지기 수업이 4 → 5 로 늘고 관계 표(5 ≤ 25 × 0.2)와 회화 자리(필요 40 · 자리 105~115)를 지킨다. (3) 시드 수 · 생성 시간은 그대로이고 vocab · 그림이 줄어 P6b · P8 이 가볍다. 대가는 3.4 누계 문장 고침과 관계 표 여유 0.

## 결정이 필요한 것

1. H5(요청자): 위 갈림길과 단원 틀 · testMix · answer_max_seconds. 13절 초안은 근거 문서 (6) 7.
2. 형태 범위 — 같은 단계 앞 단원(컨트롤러, 13절 + P4b 한 줄): `allowedForms` 가 3.6 글자대로라 같은 단계의 앞 단원 요소도 막는다. 예: 3단계 단원 3 '위치 전치사' 지문이 'There is a cat under the table.'을 못 쓴다(There is 는 단원 2). 권함: 같은 단계의 앞 단원까지 허용(`at.unit <= scope`).
3. 형태 범위 — 한 열에만 있는 형태(컨트롤러, 13절): plan 규칙대로 다른 열을 null 로 두면 그 형태를 검출하는 순간 그 영역 글에서 영영 막힌다. 예: 쓰기 글의 Let's · -ly 부사(쓰기 7-4 finally 와 부딪침) · 과거진행, 읽기 글의 while · for example · because of. 권함: null 대신 다른 열 자리를 같은 (단계, 단원)으로 채운다. 묶음 2 전에 정해야 한다(이번 묶음의 lets 만 쓰기 null).
4. forms.json 뼈대(컨트롤러): 규격 `FormEntry` 가 검출기 없는 항목을 거부해 120 요소 id 를 forms.json 에 다 넣지 못했다. 120 요소의 id · introducedAt · 검출 여부는 근거 문서 (4) 표에 두고, forms.json 은 검출기 있는 6항목만이다. 묶음 2~4 에서 검출기와 함께 더한다(브리프와 다르게 한 것).
5. 3.3 과 3.6 의 어긋남 해석(컨트롤러, 13절 한 줄 권함): 1단계 회화 질문(What color is it? · How old are you? · How many ~?)이 3.6 의 2-5 · 3-5 · 5-4 보다 앞서고, 회화 10 '의견과 이유'가 3.6 12-1 '의견 표현'보다 앞선다. 의문문 요소 · How many · I think 는 검출하지 않는 쪽으로 했다.
6. 알파벳 대표 낱말(제안): 26개(bear · cow · lion · monkey · tiger · elephant · horse · star · key 등)는 단계 1 vocab 이지만 말하기 · 회화 단원 단어가 되지 않는다(C61 (1) 의 네 영역 같은 모음 때문). 이대로 갈지.
7. 'May'(달): vocab 은 대소문자를 가리지 않아 조동사 may 와 겹친다. 달 May 는 vocab 에서 빼고 고유 명사로 둔다(제안).
8. 기능어 165 는 plan 추정 100~130 보다 많다(대명사 꼴 따로 · 인사 · 감탄 · 호칭). 이대로 갈지.

## 묶음 2(4~6단계, 2026-10-17 00:1x ~ 01:0x)

상태: DONE_WITH_CONCERNS — 필터 명령 0 · 예문 일회 검사 0 · test 160 은 채웠다. lint 는 1 인데, 원인은 컨트롤러가 고친 `src/core/seed/reference-index.ts` 549~551줄 서식(biome format)이고 지시대로 그 파일은 건드리지 않았다(컨트롤러에게 알림).

### 만든 것 · 건수

| 파일 | 건수 | 비고 |
|---|---|---|
| `seed/vocab.json` | 501항목(4단계 175 · 5단계 165 · 6단계 161) | 내용어 450(단계마다 후보 앞 150) + 그 단계 기능어 51. 뜻 · 예문 · 품사 · 단계 · 활용형(모두 생성 규칙 + 불규칙 표). 1~3 · 7~12단계 행 없음 |
| `seed/unit-specs.json` | 60행(영역 넷 × 4~6단계 × 단원 5) | learningElement 는 생성기가 정본 3.6 표를 읽어 글자 그대로, words 30(배정 차례), 판 1.0 |
| `seed/lists/forms.json` | 21항목(묶음 0 의 6 + 15) | 4~6단계 도입 요소 검출기 15, lets 쓰기 자리를 (3, 4)로(C64 (2)) |
| 근거 문서 | (1) 4~6단계 vocab · (3) 4~6단계 확정과 단원 단어 배치 · (4) 묶음 2 검출기 표와 시험 문장 67 · (8) 묶음 2 검사 | 기능어 표 164(Ms. 뺌) |
| `tests/.tmp/p06/`(저장소 밖) | 생성 · 검사 스크립트 | forms_gen.py · vocab456_src.py · build_bundle.py · check_examples.ts · provisional-lexicon.json · later-forms.json |

### 명령 · 출력 첫 줄

```
pnpm -s seed:validate --json | jq '[.errors[] | select(.rule != "reference-complete")] | length'
0
pnpm -s seed:validate --json | jq -r '.errors[] | select(.rule == "reference-complete") | .message' | head
reading 1단계 단원 0 규격 행이 없다   (모두 182, 1~3 · 7~12단계 행뿐, 4~6단계 0)
pnpm -s seed:validate
seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 3280 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 182
pnpm exec tsx tests/.tmp/p06/check_examples.ts 4,5,6
검사한 예문 {"4":175,"5":165,"6":161} / RESULT 0
pnpm exec tsx tests/.tmp/p06/check_lists.ts
… RESULT 0   (형태 96 · 금지어 43)
pnpm test → Tests 160 passed (160)
pnpm lint → 1: src/core/seed/reference-index.ts format(549~551줄)
```

예문 검사는 사전을 vocab + 1~3단계 후보 앞 125(H5 와 상관없는 몫) + 기능어 전부 + 알파벳으로, 형태를 forms.json + 뒤 단계 임시 형태(불규칙 과거 · will · going to · 비교 · 최상급 · to 부정사 · 동명사 · 현재완료 · must · should · if 등)로 본다. 망가뜨린 예문 11개를 모두 잡는 것도 확인했다.

### 이번 묶음에서 바꾼 것 · 판단

- 6단계 people 을 agree 로 바꿨다. person 의 활용형 people 이 4단계 범위가 되기 때문이다(근거 문서 (1)).
- Ms. 를 기능어에서 뺐다(164). 5절 문장 자르기 줄임말 목록(`SENTENCE_END_ABBREVIATIONS`)에 없어 'Ms. Park …'이 두 문장으로 잘린다.
- 회화 5-4 주제를 '문구점 계산'에서 '시장에서 계산'으로 바꿨다(단원 낱말이 수 · 시장 음식).
- 검출기 열 채우기(C64 (2)): be-not rst 4-4 · time-at 쓰기 4-5 · would-like 쓰기 5-2 · how-much 쓰기 5-4 · when-question 쓰기 6-4 · lets 쓰기 3-4.
- want-to 의 쓰기 자리는 4-3 으로 읽었다(3.6 쓰기 4-3 'have · like · want 문장'). 9-1(to 부정사)로 두면 쓰기 4~8단계 글이 'I want to …'를 못 쓴다.

### 근거가 약한 항목

1. 3인칭 단수 검출은 명사로도 쓰는 동사(starts · works · plays)를 주어가 he · she · it 일 때만 잡는다(놓침은 P8 사람 표본이 맡음).
2. 활용형은 규칙 생성이다. 표본으로 보았지만 501항목 전부를 눈으로 보지는 않았다(design-reviewer 표본 10% 몫).
3. 단원 단어는 주제 묶음 둘을 이어 붙인 차례라, 둘째 묶음의 넷씩 묶음은 배정 수업 경계와 한 칸 어긋난다(수업 4 가 앞 묶음 끝 셋 + 뒤 묶음 첫 하나).
4. 예문 검사의 1~3단계 사전은 후보 앞 125 다. 묶음 1 에서 1~3단계 vocab 이 확정되면 4~6단계 예문을 한 번 더 돌린다.

### 결정이 필요한 것

1. lint 1(컨트롤러): `reference-index.ts` 서식. `pnpm format` 이면 된다.
2. want-to 쓰기 자리 4-3(해석)을 13절에 적을지(컨트롤러).
3. Ms. 를 5절 줄임말 목록에 더할지(그러면 다시 기능어로), 아니면 그대로 뺄지(컨트롤러).

## 묶음 1(1~3단계, H5 확정 C66 뒤, 2026-10-17 01:1x ~ 02:0x)

상태: DONE — 완료 판정을 모두 채웠다: 필터 명령 0, 남은 reference-complete 120 은 7~12단계 행뿐(1~6단계 완성), 예문 일회 검사 0(1~6 전부 960), 형태 · 금지어 시험 문장 0(139), `pnpm lint` 0, `pnpm test` 160, can-do 숫자 경고 0.

### 만든 것 · 건수

| 파일 | 건수 | 비고 |
|---|---|---|
| `seed/settings.json` | 180행 | unit.vocab_count.1-3 = 25(C66). 12절 대조 0(H5 키 · answer_max_seconds 까지 정본과 같음) |
| `seed/level-specs.json` | 48행 | 값 그대로. testMix 36 · frame 7 은 확정(근거 문서 (6) · (7) 의 '잠정'을 거둠) |
| `seed/vocab.json` | 960항목(1~3단계 459 더함) | 1단계 내용어 125 + 알파벳 대표 낱말 26 + 기능어 31, 2단계 125 + 12, 3단계 125 + 15. 활용형 1~6단계 모두 1,144. 달 May 없음 |
| `seed/unit-specs.json` | 122행(1~3단계 60 + 단원 0 둘 더함) | 1~3단계 단원 단어 25(배정 차례), 읽기 · 쓰기 1단계 단원 0 은 대표 낱말 26 · '알파벳 이름과 기본 소리' · '알파벳 친구들' |
| `seed/lists/forms.json` | 21항목 | 1~3단계 요소 검출기는 묶음 0 의 여섯이 전부(나머지 24 는 검출하지 않음, C64 (3)). 3인칭 단수 · -ing · -ed 낱말 목록을 1~6단계 동사에서 다시 뽑음 |
| 근거 문서 | (1) · (3) · (4) · (6) · (7) · (8) | 1~6단계 vocab 요약, 1~6단계 단원 단어 배치(묶음 표 · 영역별 짝 · 쓰기 1단계 철자 패턴 표 · 읽기 1~2 그림 낱말 비율), 묶음 1 검출기 절, H5 확정 머리, 묶음 1 검사 |

### 명령 · 출력 첫 줄

```
python3 -I tests/.tmp/p06/check_settings.py <specs> seed/settings.json → RESULT 0
pnpm -s seed:validate --json | jq '[.errors[] | select(.rule != "reference-complete")] | length' → 0
pnpm -s seed:validate --json | jq -r '.errors[] | select(.rule == "reference-complete") | .message' | head → reading 7단계 단원 1 규격 행이 없다 (모두 120, 7~12단계뿐)
pnpm -s seed:validate → seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 120
pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6 → 검사한 예문 {"1":182,"2":137,"3":140,"4":175,"5":165,"6":161} / RESULT 0
pnpm exec tsx tests/.tmp/p06/check_lists.ts → RESULT 0 (139 문장)
pnpm lint → 0 · pnpm test → Tests 160 passed (160)
```

예문 검사는 이제 확정 vocab 으로 돈다(7~12단계 기능어만 임시). 1~3단계 예문 10개를 일부러 망가뜨린 사본도 모두 잡았다.

### 판단

- 1단계 a · an 단원에 an 낱말(apple · egg)이 들게 1단계 읽기 · 회화 단원 1 · 4 의 묶음 짝을 바꿨다(읽기 주제 '간식과 장난감' · '좋아하는 물건'). 쓰기 3-2 주제 '아침에 먹는 것' → '내가 하는 일'(단원 낱말에 음식이 없음).
- 4단계 쓰기 단원 2 와 회화 단원 5 의 단원 단어 모음이 같았다(묶음 2, 차례만 다름). 쓰기 2 · 4 의 짝을 바꿔 같은 단계 안에서 영역 사이에 똑같은 단원이 없게 했다.
- 쓰기 1단계 철자 패턴 단원: 단원마다 패턴 낱말 25 · 18 · 18 · 19 · 21(81%). 패턴 밖 24 낱말(one · two · blue · green · banana · book · ball · eye …)은 뒤쪽에 놓았다.
- 읽기 1단계 단원마다 그림이 되는 낱말 21~25/25, 2단계 15~24/25(2-1 '오늘 내 기분'이 기분 · 상태 낱말이라 15 로 가장 낮다).
- 1~3단계 예문은 3인칭 단수 · 부정문 · 진행형을 쓰지 않아 짧고 단순하다(1단계 'This is a red apple.' 꼴).

### 근거가 약한 항목

1. 읽기 2-1 그림 낱말 15/25 — fine · good · sorry · glad · ready 같은 낱말은 그림 고르기에 내기 어렵다. 2단계 읽기 그림 문제(5문제 가운데 2)는 다른 단원 단어 · 1단계 낱말로 채워야 한다(P8 표본에서 봄).
2. 1~3단계 단원 묶음은 주제가 섞인 것이 있다(예: 3단계 B4 squirrel · puzzle · soup · fire · move …). 수업 글은 주제와 단원 단어로 만들므로 P8 표본에서 어색하면 묶음을 다시 짠다.
3. 활용형은 규칙 생성이다(1,144). 표본으로 보았고 비교급이 붙지 않을 낱말(very · really · back · left · fun · 색 이름)을 막았지만 전부를 눈으로 보지는 않았다(design-reviewer 표본 몫).
4. 동음이의어 33묶음 가운데 13 낱말이 아직 vocab 밖이다(모두 7~12단계 후보) — 묶음 3 · 4 에서 다시 맞댄다.

### 결정이 필요한 것

없음. 묶음 0 · 2 · 1 의 결정은 C64 · C66 과 컨트롤러 답으로 닫혔다.

## fix 1(검토 review-p06a 반영, 브리프 task-p06a-fix1.md, 2026-10-17 03:1x ~ 04:3x)

상태: DONE. 지적 열일곱(I 5 · M 12)을 모두 고쳤고 완료 판정 열 가지가 모두 맞는다. 코드 파일은 건드리지 않았다(워크트리의 `biome.json` · `src/core/seed/reference-index.ts` · `tests/unit/seed-validator-reading.test.ts` 변경은 앞 라운드의 컨트롤러 것 그대로). 고친 것은 `seed/` 파일 · 근거 문서 · 일회 스크립트(`tests/.tmp/p06/`)뿐이다.

### 완료 판정 대조

| 판정 | 명령 | 결과 |
|---|---|---|
| 필터 명령 0 | `pnpm -s seed:validate --json \| jq '[.errors[] \| select(.rule != "reference-complete")] \| length'` | 0 |
| 남은 reference-complete 는 7~12단계 행뿐 | `… select(.rule == "reference-complete") …` | 120, 가장 낮은 단계 7 |
| 예문 일회 검사 1~6 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6` | 965 예문(183 · 137 · 139 · 175 · 170 · 161), RESULT 0 |
| 형태 · 금지어 시험 문장(더한 것 포함) | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 183 줄(형태 118 · 금지어 65), RESULT 0 |
| 단원 단어 × allowedForms 맞대기 | `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts`(새로 만듦) | 단원 122 · 단원 단어 3,352, RESULT 0. fix 전 꼴로 되돌린 사본은 5건을 잡음 |
| 설정값 12절 대조 | `python3 -I tests/.tmp/p06/check_settings.py <specs> seed/settings.json` | RESULT 0 |
| can-do 경고 0 | `pnpm -s seed:validate` 의 경고 · `check_level_specs.py` | 경고 0 · 다름 0 |
| lint | `pnpm lint` | Checked 50 files, 0 |
| test | `pnpm test` | Tests 160 passed (160) |
| 검증기 첫 줄 | `pnpm -s seed:validate` | `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 120` |

더 돌린 검사: 생성기 맞대기 `build_bundle.py` 문제 0(vocab 965 · 단원 규격 122 · 형태 표 25), vocab 뜻 · 예문 × 금지어 `check_meanings.ts`(새로) 965 RESULT 0, 동음이의어 `check_homophones.py` 32묶음 빠진 낱말 0.

### 지적마다

줄 번호는 워크트리 파일 기준이다. 근거 문서는 `docs/research/2026-10-16-seed-reference-basis.md`.

| 지적 | 판정 | 고친 곳(파일 · 줄) | 검사 |
|---|---|---|---|
| I-1 자기 단원에서 막히는 단원 단어 9 | ADDRESSED | (가) `seed/lists/forms.json` 14줄 time-at 낱말에서 o'clock 뺌. (나) 3줄 have 의 writing 을 1-1 로(쓰기 열 검출 안 함, C67 (1)). (다) `seed/vocab.json` always 638 · usually 799 · often 740 · sometimes 775 · never 736줄을 pos adverb + function · 5단계로, `seed/unit-specs.json` 5단계 행에서 다섯을 빼고 빈자리를 I-2 낱말로 채움 | `check_unit_words.ts` RESULT 0. 사본 검사 5건 잡음(o'clock 3 · have 1 · usually 1) |
| I-2 뺀 75 낱말(초등 권장 35 · easy · onion) | ADDRESSED | `seed/vocab.json` 37 낱말(아래 표의 줄) · `seed/unit-specs.json` 4~6단계 행 · 근거 문서 (1) 수 표 · 'fix 1 맞바꿈' 절. 뺀 32 는 7단계 후보 끝으로. 걸린 예문 9개를 새로 씀 | `build_bundle.py` 문제 0 · 예문 4~6 RESULT 0 · 형태 낱말 목록 다시 뽑음(3인칭 단수 113 · 규칙 과거 103) · 동음이의어 빠진 0(guest · guessed 묶음 뺌) |
| I-3 한국어 개인 정보 정규식 | ADDRESSED | `seed/lists/forbidden.json` 14줄 personal-info-ko. '어디 살아'는 문장 첫머리 · 너 · 넌 · 너는 · 너희 · 너네 뒤만, '너희 집은 어디' 더함, '성이 뭐'는 너(의) · 넌 · 네 · 니 뒤 · '성씨'만. 근거 문서 (5) | `check_lists.ts` 걸릴 셋 · 안 걸릴 다섯(개구리 · 곰 · 펭귄 · 그 성은 · 왕자는 성에) 맞음. `check_meanings.ts` vocab 뜻 965 RESULT 0 |
| I-4 집 주소 꼴 | ADDRESSED | `forbidden.json` 17줄 contact-address-ko · 18줄 contact-address-en(C67 (4)). 근거 문서 (5) | 걸릴 넷(테헤란로 123 · 101동 1203호 · 행복아파트 3동 · 25 Green Street) · 안 걸릴 여덟(도로 위에 · 우리 동네 · I live in Seoul. · 앞으로 3칸 · 버스로 2정거장 · The road is long. · 2 miles on the road · I have 2 big dogs.) 맞음 |
| I-5 거짓 양성 둘 | ADDRESSED | `forms.json` 14줄 time-at('at + 수' 뒤에 o'clock · 시각 · 문장 부호 · 글 끝이 올 때만, at noon · on + 요일) · 9줄 third-person-s(thanks · helps · plays · looks · lives · needs · wants 등 명사로도 흔한 꼴을 낱말 목록에서 빼고 he · she · it 정규식에 맡김, 낱말 113) | 검토의 다섯 문장(Look at two dogs. · Point at three cats. · Look at one bird. · Thanks, Tori! · Thanks for the gift.) '없음' 맞음 |
| M-1 be-not 's not · 're not | ADDRESSED | `forms.json` 13줄에 `'(?:s\|re)\s+not\s+[a-z]` | It's not a cat. → be-not, No, it's not. → 없음 |
| M-2 부정 명령문 | ADDRESSED | `forms.json` 10줄 dont 를 주어 I · you · we · they 꼴로 좁힘. 부정 명령문은 3-4(C67 (1)), 근거 문서 (4) 묶음 2 표 · 120 표 3-4 · 4-2 행 | Don't run. · Wait! Don't go. · Do not run in the hall. → 없음, We do not swim. · You don't like milk. → dont |
| M-3 낱말 검출기 · 까닭 문구 | ADDRESSED | `forms.json` 24~27줄 he-she(2-2 · 2-2) · we-they(3-1 · 3-1) · object-pronouns(5-5 · 6-4) · some-any(6-5 · 6-5). 근거 문서 (4) 'fix 1 검출기' 표 · 120 표 머리말과 3-3 · 3-5 · 4-4 · 쓰기 6-4 행 까닭('읽기는 범위 밖 비율, 나머지 영역은 사람 표본') | He is tall. · They like cats. · I like him. · I want some juice. 맞음. 단원 단어 맞대기 0(이 넷이 앞 단원 단어를 막지 않음) |
| M-4 주제 · 단원 단어 어긋남 9 | ADDRESSED | `seed/unit-specs.json` topic: 읽기 1-2 '동물과 탈것'(5줄) · 3-2 '우리 동네와 자연'(15줄), 말하기 1-3 '내 얼굴과 몸'(67줄) · 2-4 '몸으로 할 수 있는 일'(73줄) · 3-2 '우리 동네와 탈것'(76줄), 회화 3-2 '동네 나들이'(106줄) · 3-5 '교실 물건 묻기'(109줄), 쓰기 3-1 '방과 교실'(45줄) · 3-4 '우리 동네에 있는 것'(48줄). 낱말은 옮기지 않음. 근거 문서 (3) 주제 표 | 같은 (영역, 단계) 안 주제 겹침 0. 근거 문서 주제 표 30행 × 네 영역 = unit-specs 다름 0 |
| M-5 old · many | ADDRESSED | `seed/vocab.json` old 113줄 1단계 · head 248줄 2단계(맞바꿈, 단계 수 그대로) · many 95줄 기능어 1단계(예문 'Many cats are cute.'). 근거 문서 (1) 기능어 표 · 까닭 문장 | 예문 1~2 RESULT 0 · 단원 단어 맞대기 0 |
| M-6 배정 차례 둘 | ADDRESSED | (가) `seed/unit-specs.json` 36~39줄(쓰기 1-2~1-5): 배정 수업마다 패턴 밖 낱말 1~2개, 패턴 낱말 101/125(81%) 그대로. (나) 7줄 읽기 1-4 · 68줄 말하기 1-4 의 like, 95줄 회화 1-1 의 name 을 첫 배정 수업 첫 자리로. 근거 문서 (3) 배치 절(쓰기 1단계 표는 배정 수업별 괄호 표기) | `build_bundle.py` 문제 0 · 검증기 frame-* 0 |
| M-7 can-do 둘 | ADDRESSED | `seed/level-specs.json` 5줄 읽기 3('그림 없이' 뺌, 분량 35~55 · 사실 확인 3 으로 2단계와 가름) · 39줄 회화 1('처음 듣는 질문은 토리가 들려준 두 답에서 골라 말하고 다시 묻는 질문에는 스스로 답하며'). 근거 문서 (2) | `check_level_specs.py` 다름 0 · 검증기 can-do 경고 0 |
| M-8 (2) 척도 수준 | ADDRESSED | 근거 문서 (2) 3단계 척도 수준을 'Pre-A1 ~ A1'로 | 문서 고침 |
| M-9 활용형 · 뜻 셋 | ADDRESSED | (가) `seed/vocab.json` east 850 · west 960 · north 910 · south 939 · corn 209 · world 805줄 forms [] (생성기 NO_PLURAL). (나) hard 375 · back 328 · paint 402 · turn 450 · brush 25 · free 519 · just 534 · surprise 599 · order 742 · break 825 · care 829 · pass 919줄 뜻 둘로. 친족 낱말 넷은 그대로 | `build_bundle.py` 문제 0 · `check_meanings.ts` 0 |
| M-10 (4) 3-4 행 | ADDRESSED | 근거 문서 (4) 120 표 3-4 행 'lets · w 3-4(C64 (2))'(forms.json 과 같음) | 문서 고침 |
| M-11 drunk | ADDRESSED | 근거 문서 (5)에 알고 둔 한계로(현재완료 9-3 뒤 글에서만, 묶음 3 예문에서 drunk 를 쓰지 않음) | 시험 문장 'I have drunk milk.' → en-word:drunk(기대대로) |
| M-12 알파벳 대표 낱말 | ADDRESSED | 근거 문서 (1) 알파벳 절에 한 줄(대부분의 아이에게 단원 단어가 되지 않음, 단어장은 눌러 본 단어로 채워짐) | 문서 고침 |

검토 4 · 5절의 '받음(조건)'은 그대로 두었다. 메모 1(낱말 자체가 형태인 요소는 도입 자리 앞 단원에 두지 않음)은 근거 문서 (4) '묶음 3 · 4 검출기에 넘길 것'에 다음 묶음 규칙으로 적었고, 묶음 3 · 4 도 단원 단어 맞대기를 0 으로 맞춘다. board · bored 는 묶음 4 끝에서 정한다(메모 6).

### 맞바꾼 낱말(I-2 · I-1 (다) · M-5)

누계 1,725 는 그대로다. 넣은 낱말은 모두 초등 권장(`*`)이거나 그 파생(easy · onion)이다. 줄은 `seed/vocab.json`.

| 단계 | 묶음 | 넣은 낱말(줄) | 뺀 낱말 |
|---|---|---|---|
| 4 | C4 | warm(620) | plant |
| 4 | C9 | bread(483) | toast |
| 4 | C6 | letter(540) · thing(605) | message · seat |
| 4 | C3 | pilot(570) | dentist |
| 4 | C5 | easy(505) · difficult(500) | uniform · subject |
| 5 | D9 | boat(649) · ticket(793) · restroom(761) | bicycle · nest · wave |
| 5 | D4 | tomato(794) · carrot(659) · onion(741) | pumpkin · pork · oven |
| 5 | D3 | spoon(779) · knife(718) · glass(697) | noodle · pancake · dessert |
| 5 | D8 | prince(756) · shy(771) · quiet(758) · brave(654) | giant · guest · noise · ghost |
| 5 | D2 | poor(752) · rich(763) | coin · thousand |
| 5 | D10 | gray(701) | mask |
| 5 | D5(빈도부사 빈자리) | lip(723) · gum(703) · full(696) · heavy(706) · light(722) | always · usually · often · sometimes · never(기능어 5단계로) |
| 6 | E6 | wet(961) · dry(848) · hill(873) · moon(905) | bush · mud · dust · fog |
| 6 | E5 | bee(820) | tray |
| 6 | E4 | lazy(893) | wonder |
| 6 | E10 | mouse(906) · bone(824) · brown(826) | bubble · cage · nail |
| 1 ↔ 2 | M-5 | old(113, 1단계) · many(95, 기능어 1단계) | head(248, 2단계로) |

### 다르게 한 것

1. **dont 정규식 끝.** 브리프 꼴의 끝 `\b` 대신 `\s+[a-z]`(뒤에 동사가 올 때만)로 했다. `\b` 로 두면 짧은 답 'No, I don't.'이 dont 로 잡혀, 2-5 'Do you ~?' 단원의 답이 4-2 전에 막힌다. doesn't 는 그대로 does 검출기(4-2)가 맡는다.
2. **have 의 '쓰기 열 검출 안 함' 표현.** 규격(`FormEntry`)이 writing 자리를 null 로 두면 '늘 범위 밖'이 되므로, writing 을 1-1 로 두어 쓰기에서 늘 열리게 했다(like 와 같은 C64 (3) 꼴).
3. **동음이의어 guest · guessed 뺌.** guest 가 7단계 후보로 밀려 1~6 vocab 에 없어 묶음을 뺐다(32묶음). 묶음 3 에서 guest 가 들어오면 다시 맞댄다. 근거 문서 (5)의 묶음 목록은 지금 `homophones.json` 에서 다시 뽑아 적었다(옛 문장에는 piece · peace 가 빠져 있었다).
4. **브리프 밖에 더한 검사 하나.** vocab 한국어 뜻 · 예문을 금지어에 맞대는 `check_meanings.ts` 를 더했다(I-3 이 뜻 풀이에서 나왔기 때문).

### 알릴 것

1. **4단계 그림 낱말(P6b 작업 3, 그림 범위 1~4단계 C65).** 4단계에 그림 낱말 bread · letter · pilot 이 들어왔고, plant · toast · dentist · uniform · seat 가 빠졌다. P6b 그림 목록을 이 vocab 으로 다시 뽑아야 한다.
2. **1~2단계 단계 바뀜.** head 는 1단계에서 2단계로, old 는 2단계에서 1단계로 옮겼다. many 는 1단계 기능어다. 1~2단계 그림 목록에서 head 의 단계가 바뀐다.
3. **집 주소 꼴(I-4).** contact-address-ko · contact-address-en 두 정규식이 새로 생겼다. 컨트롤러가 P9b 쪽에 알렸다.
4. **빈도부사.** 다섯 낱말이 5단계 기능어가 되어 단원 단어에서 빠졌다. frequency-adverbs 검출기(rst 5-1 · 쓰기 6-3)는 그대로라 읽기 · 말하기 · 회화는 4단계까지, 쓰기는 6-2 까지의 글에서 여전히 막힌다.

### 남은 우려

1. **7~12단계 후보 경계.** 뺀 32 낱말을 7단계 후보 끝(여분)으로 보냈다. 묶음 3 에서 7단계 150 을 정할 때 이 낱말이 다른 후보를 밀어내는지 다시 본다.
2. **동음이의어 board · bored.** 묶음 4 끝에서 정한다(검토 메모 6).
3. **he-she · we-they 검출기의 범위.** 낱말로만 잡으므로 명사 주어 문장('My mom is kind.' · 'The kids play.')의 2-2 · 3-1 형태는 잡지 못하고 사람 표본이 맡는다. 1단계 회화 'What color is it?'를 위해 it 은 넣지 않았다.

### 결정이 필요한 것

없음.

## fix 2(검토 review-p06a-2 반영, 브리프 task-p06a-fix2-batch3.md 1절, 2026-10-17)

상태: DONE. 새 지적 넷(Important 1 · Minor 3)과 장부 18줄의 contact 추가 꼴을 고쳤고, 묶음 3 값을 건드리기 전에 fix 2 완료 판정을 모두 0 으로 확인했다. 코드 파일은 건드리지 않았다.

### 완료 판정 대조(fix 2 끝난 때, 묶음 3 전)

| 판정 | 명령 | 결과 |
|---|---|---|
| 시험 문장(더한 것 포함) | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 207 줄, RESULT 0 |
| 뜻 · 예문 × 금지어 | `check_meanings.ts` | vocab 965, RESULT 0 |
| 단원 단어 × allowedForms | `check_unit_words.ts` | 단원 122 · 3,352, RESULT 0 |
| 생성기 맞대기 | `build_bundle.py . <specs>` | 문제 0 |
| 예문 1~6 | `check_examples.ts 1,2,3,4,5,6` | RESULT 0 |
| 필터 | `seed:validate --json \| jq …` | 0 |
| 검증기 첫 줄 | `pnpm -s seed:validate` | `… 실패 0 · … · 경고 0 · 규격 파일 오류 120` |

### 지적마다

| 지적 | 판정 | 고친 곳(파일 · 줄) | 검사 |
|---|---|---|---|
| N-1(Important) 띄어 쓴 수 + 단위를 주소로 잡음 | ADDRESSED | `seed/lists/forbidden.json` 17줄 contact-address-ko 셋째 갈래 앞보기 `(?=\s?(?:번지\|에\|이야\|야)\|\s*(?:$\|[,.!?)]))`. 뒤보기 `(?<!으)` 는 그대로(7절 4). 근거 문서 (5) 'fix 2 에서 고친 것' | 안 걸림 8(버스로 2 정거장 가요 · 기차로 3 시간 가 · 자전거로 5 분이면 돼 · 택시로 10 분 걸려 · 지하철로 2 정거장이야 · 다리로 2 개를 건너 · 기차로 2 시간이야 · 학교까지 버스로 20 분), 걸림 8(테헤란로 123 이야 · 101동 1203호 · 행복아파트 3동 · 중앙로 45에 · 강남대로 302 · 세종로 1-2번지 · 테헤란로 123, 서울 · 중앙로 45 야) 모두 맞음 |
| 장부 18줄 contact 추가 꼴(컨트롤러 판정: 이번에 함께) | ADDRESSED | `forbidden.json` 15줄 contact-phone 에 괄호 지역 번호 갈래 `\(0\d{1,2}\)\s?\d{3,4}[-. ]?\d{4}` · 국가 번호 갈래 `\+\d{1,3}[-. ]?\d{1,4}[-. ]?\d{3,4}[-. ]?\d{4}`. 말소리 숫자 꼴은 넣지 않고 근거 문서 (5)에 사람 표본 몫으로 | 걸림 4((02)123-4567 · (031) 123-4567 · +82 10-1234-5678 · +82-2-123-4567), 안 걸림 4('(2) 3 + 4 = 7' · 'Call me at 3.' · 'We need + 2 more.' · 'Look at picture (2) on page 12.') 모두 맞음 |
| N-2(Minor) 빈자리 낱말이 첫 배정 수업에 몰림 | ADDRESSED | `tests/.tmp/p06/vocab456_src.py` D5 차례를 enjoy · hate · headache · fever · medicine 먼저, lip · gum · full · heavy · light 뒤로 → `seed/unit-specs.json` 24 · 72 · 115 · 160줄(읽기 5-1 · 쓰기 5-3 · 말하기 5-1 · 회화 5-1)의 첫 배정 수업이 enjoy · hate · headache · fever. head 는 B4 몸 낱말 묶음으로, B4 의 jeans 를 A3 로(11 · 13 · 55 · 58 · 101 · 103 · 146 · 147줄). 근거 문서 (3) 배치 절 | 단계 낱말 모음 그대로. `build_bundle.py` 문제 0 · 맞대기 0 · frame-* 0 · 같은 단계 영역 사이 같은 짝 0 |
| N-3(Minor) dry 비교 꼴 | ADDRESSED | `seed/vocab.json` 848줄 dry forms = dries · dried · drying · drier · driest(dryer · dryest 뺌) | 예문 6 RESULT 0 |
| N-4 (가)(Minor) 7단계 후보 순위 · 문구 | ADDRESSED(컨트롤러 판정: 실제를 문구에 맞춤) | `tests/.tmp/p06/build_candidates.py` — 7단계를 CEFR-J 차례로 다시 매길 때 fix 1 여분 표시를 첫 기준으로 둠 → 원래 후보 30 이 131~160위, 32 는 161~192위. 근거 문서 154줄 문구, (1) 수 표 7단계 줄은 묶음 3 vocab 으로 다시 셈(아래 묶음 3 절) | 후보 파일 순위 확인 |
| N-4 (나)(Minor) some-any 까닭 문구 | ADDRESSED | 근거 문서 564줄 '읽기는 범위 밖 비율, 나머지 영역은 사람 표본이 맡는다' | 문서 고침 |

### 다르게 한 것

1. **head 의 자리.** 검토가 권한 대로 head 를 몸 낱말 묶음 B4 로 옮기되, B4 의 jeans 를 A3 에 넣어 묶음 크기(13 · 12)를 지켰다. jeans 는 형용사 + 명사(쓰기 2-1 '빨간 사과 큰 공')와 '내가 가진 것'(회화 2-3)에 맞는다.
2. **전화 꼴은 contact-phone 의 갈래로.** 새 id 를 만들지 않고 contact-phone 정규식에 갈래 둘을 더했다. lang 칸은 en · ko 만 받는데(`schema/reference.ts` 413줄) `forbiddenHits` 가 언어를 가리지 않고 모든 글에 정규식을 걸어 한 갈래로 두 언어를 덮는다.

### 알릴 것

1. **P9b contact 범주 값이 바뀌었다.** contact-address-ko 앞보기와 contact-phone 의 갈래 둘이 새 값이다(위 표). 컨트롤러가 P9b 쪽에 알린다.

## 묶음 3(7~9단계, 브리프 task-p06a-fix2-batch3.md 2절, 2026-10-17 12:3x 끝남)

상태: DONE. 7~9단계 vocab 487항목(내용어 450 · 기능어 37) · 단원 규격 60 · 형태 검출기 17 을 넣었고 묶음 3 완료 판정 열 가지가 모두 맞는다. 코드 파일은 건드리지 않았다.

### 완료 판정 대조

| 판정 | 명령 | 결과 |
|---|---|---|
| 필터 명령 0 | `pnpm -s seed:validate --json \| jq '[.errors[] \| select(.rule != "reference-complete")] \| length'` | 0 |
| 남은 reference-complete 는 10~12단계 행뿐 | `… select(.rule == "reference-complete") …` | 60, 가장 낮은 단계 10 |
| 예문 7~9 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6,7,8,9` | 1~9 모두 1,452(7단계 165 · 8단계 163 · 9단계 159), RESULT 0 |
| 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 310 줄(형태 221 · 금지어 89), RESULT 0 |
| 단원 단어 × allowedForms | `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts` | 단원 182 · 5,152, RESULT 0 |
| 주제 겹침 0 | `build_bundle.py`(같은 (영역, 단계) 주제 · 같은 단계 영역 사이 같은 묶음 짝) | 문제 0 |
| can-do 경고 0 | `pnpm -s seed:validate` 경고 · `check_level_specs.py`(7~9 testMix = C66) | 경고 0 · RESULT 0 |
| lint | `pnpm lint` | Checked 50 files, 0 |
| test | `pnpm test` | Tests 160 passed (160) |
| 검증기 첫 줄 | `pnpm -s seed:validate` | `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 60` |

더 돌린 검사: 예문 검사의 검사(7~9단계 예문 12개를 망가뜨린 사본 12 모두 잡음), `check_meanings.ts` 1,452 RESULT 0, 활용형 × 금지어 낱말(drunk 하나, 알고 둔 한계), `check_homophones.py` 빠진 낱말 0, `check_settings.py` RESULT 0.

### 만든 것 · 건수

| 파일 | 건수 | 내용 |
|---|---|---|
| `seed/vocab.json` | 1,452항목(7~9단계 487 더함, 968~1454줄) | 내용어 150 × 3, 기능어 15 · 13 · 9. 활용형 7~9단계 782 |
| `seed/unit-specs.json` | 182행(7~9단계 60 더함) | 주제 · 3.6 학습 요소 · 단원 단어 30(묶음 둘, 첫 배정 수업은 학습 요소 낱말 먼저), 단원 틀 C66 7~9구간 값(단원 단어 30 · k 4, 쓰기 k 6)과 frame-* 0 |
| `seed/lists/forms.json` | 42항목(17 더함, 28~44줄) | past-irregular · did · going-to · will · comparative · superlative · past-progressive · when-clause · adverb-ly · must · have-to · should · gerund · to-infinitive · present-perfect · if · conj-so-after-before. he-she(24줄) · we-they(25줄)에 줄임꼴, third-person-s(9줄)에서 명사 꼴 뺌 |
| `seed/level-specs.json` | 바꾸지 않음 | 7~9 행 testMix 가 C66 과 같음(check_level_specs 0) |
| 근거 문서 | (1) · (3) · (4) · (5) · (8) | 수 표 · CEFR-J 표 7~12 줄, '7~9단계 150 정하기' · '7~9단계 vocab' 절, 주제 표 7~9 · 1~9 배치 절, 묶음 3 검출기 · 알고 둔 한계 절 · 120 표 7~9 행 · 시험 문장 전체 표, 금지어 표 · fix 2 설명, 검사 표 |

### 7단계 150 선정 결과(컨트롤러 판정 1)

| 무엇 | 낱말 |
|---|---|
| 기본 | 7단계 후보 순위 1~150(fix 2 로 되돌린 순위) |
| 넣은 여분 · 당긴 낱말 | dialogue(`*`, 151위) · marathon(`*`, 154위) — 초등 권장, finally(8단계 37위) — 3.6 쓰기 7-4 '순서 말(first · then · finally)'의 낱말 |
| 넘긴 낱말 | 7 → 8단계 앞: lift · mess · switch / 8 → 9단계 앞: comfort · cruel / 9 → 10단계 앞: pole · pipe · port(9단계는 초등 권장 tire 를 165위에서 당김) |
| 돌아온 30(review-p06a-2 N-4 (가) 목록) | 22 가 앱 어휘에 듦 — 7단계 vocab 에 deliver · guide · comedy · cart · champion · league · prize · tongue · muscle · lamb · bark · dozen · total · able · bounce · bow · exit · dialogue · marathon, 8단계 vocab 에 lift · mess · switch. 8(route · sweep · jaw · throat · pine · ceiling · chew · crawl)은 원래부터 여분이고 모두 `**` |
| 빠지는 낱말(1~9단계 어디에도 안 듦) | 94, 초등 권장(`*`) 0 — 7단계 여분 40(원래 여분 8 + fix 1 이 4~6단계에서 뺀 32 전부): route · sweep · jaw · throat · pine · ceiling · chew · crawl · message · seat · subject · bicycle · guest · noise · ghost · plant · toast · dentist · uniform · wave · oven · dessert · coin · thousand · bush · dust · fog · wonder · nest · pork · noodle · giant · mud · bubble · cage · nail · pumpkin · pancake · mask · tray / 8단계 여분 13: forgive · respect · flame · navy · curl · crack · decorate · hint · label · neat · punch · amaze · amuse / 9단계 여분 41: plain · powder · pump · press · recommend · shave · spoil · stare · stream · steam · studio · tin · treat · wire · dump · rail · recipe · chop · donate · sail · cottage · microwave · triangle · species · tough · spin · rub · wipe · cable · dawn · deck · evil · grand · lawn · master · mate · pitch · spray · smash · snap · spare |

guest 가 7단계 vocab 에 들지 않아 동음이의어 guest · guessed 는 되살리지 않았다(32묶음, 판정 2).

### 판정 3~5

- **거짓 음성 목록(판정 3).** 근거 문서 (4) '알고 둔 한계' 표에 모았다: 명사 주어 + 3인칭 단수 · don't, 명사 주어 문장의 2-2 · 3-1, 'Let us go.'(5-5 전 막힘), 전치사 + -ing, 쉼표 없는 so 절, 목적지 낱말 + to, lost · found · got 의 일부, 주어가 낀 진행형, 관용구 거짓 양성(Do your best · 이름 Will).
- **7~9 검출기 시험 문장(판정 4).** 검출기 열일곱마다 걸릴 셋 · 안 걸릴 셋 이상(형태 표 시험 문장 103 줄 더함). 활용형 × 금지어 충돌은 drunk 하나뿐이다(새로 생긴 것 없음).
- **낱말 검출기 × 7~9 단원 단어(판정 5).** 단원 단어 맞대기 0. 8단계 -ly 부사 아홉은 한 묶음(H3)에 모아 네 영역 모두 단원 3 이후(읽기 · 말하기 · 회화 8-3, 쓰기 8-5)에 두었다(메모 1).

### 다르게 한 것

1. **finally 를 8단계에서 7단계로 당겼다.** 브리프의 당기기는 여분 낱말을 말하지만, finally 는 3.6 쓰기 7-4 '순서 말(first · then · finally)'의 학습 요소 낱말이라 8단계 37위에서 당겼다. 그 자리만큼 7단계 맨 뒤(lift · mess · switch 가운데 하나)가 8단계로 넘어갔다. adverb-ly 검출기에서 finally 를 뺐다.
2. **밀려난 원래 150 안 낱말도 다음 단계로.** 당긴 낱말 수만큼만 넘기면 8단계에서 7단계에서 넘어온 셋 때문에 comfort · cruel(원래 149~150위)이 여분으로 떨어진다. 원래 앞 150 안이던 낱말은 밀리면 다음 단계 앞으로 넘기고 원래 여분만 여분으로 두었다(같은 규칙을 8 · 9단계에도).
3. **주제 셋을 바꿨다.** 회화 7-4 '날씨와 계획' → '학교 축제 준비', 쓰기 7-4 '라면 끓이기' → '숙제하는 순서', 읽기 9-5 '하루의 순서' → '요리하는 순서'. 7~12단계 주제는 초안이었고, 낱말을 옮기지 않고 주제를 단원 단어에 맞추는 M-4 꼴을 따랐다.
4. **going to · to 부정사의 동사 목록.** 명사로도 쓰는 동사(visit · play)를 빼면 'They are going to visit Jeju.'를 놓쳐서, 목적지로 흔한 낱말(work · camp · shop · practice · school …)만 빼는 목록으로 했다.

### 알릴 것

1. **P6b 그림 범위는 1~4단계라 영향 없다.** 7~9단계 vocab 은 그림 카탈로그 몫이 아니다.
2. **P9b contact 범주 값이 바뀌었다(fix 2).** contact-address-ko 앞보기 · contact-phone 갈래 둘.
3. **10단계 후보 앞에 pole · pipe · port 가 들어갔다.** 묶음 4 의 10단계 150 은 이 셋을 앞에 둔 순위에서 같은 규칙으로 정한다(근거 문서 (1) 수 표 10단계 줄).
4. **정규식 뒤보기.** to-infinitive · past-irregular(got) 정규식과 contact-address-ko 가 뒤보기를 쓴다. 서버 Node 컴파일만이라 지금은 문제없고, 브라우저에서 컴파일할 일이 생기면 바꿔야 한다(review-p06a-2 7절 4 와 같은 까닭).

### 근거가 약한 항목

1. **7~9단계 CEFR-J 경계.** 7~9단계에 A1 86 이 남는다(후보 순위를 그대로 쓰는 판정이라 옮기지 않음). P8 표본에서 지문이 쉬우면 단계 안 차례로 다듬는다.
2. **묶음이 섞인 곳.** 7단계 G10(leave · spend · guide · exit · bar · fair · terrible …) · 8단계 H10(moment · still · even · teenage · bless · fool …) · 9단계 I10(complete · gather · form · main · poison …)은 남은 낱말 묶음이라 주제가 섞였다. 첫 배정 수업 낱말을 앞에 둔 단원(FRONT 18)으로 학습 요소를 지켰지만, P8 표본에서 어색하면 묶음을 다시 짠다.
3. **빠지는 낱말 94.** 모두 `**` · 목록 밖 · 합성이지만 bicycle · dentist · plant · noise · coin · ghost 처럼 아이에게 친숙한 낱말이 있다. 묶음 4 에서 10~12단계 주제가 쓰면 당길 수 있다.

### 남은 우려

1. **7~12 경계(장부 34줄).** 7~9단계는 닫을 수 있고, 10~12단계는 묶음 4 몫이다.
2. **board · bored(장부 35줄).** bore 가 9단계 vocab 이 되어 bored 가 활용형으로 들었다. 묶음 4 끝에서 정한다(메모 6).

### 결정이 필요한 것

없음. 컨트롤러 재확인 뒤 묶음 4(10~12단계)로 간다.

## 묶음 4(10~12단계, 컨트롤러 지시 2026-10-17 — 규칙은 task-p06a-fix2-batch3.md 2절과 같음, 14:0x 끝남)

상태: DONE. 10~12단계 vocab 468 · 단원 규격 60 · 형태 검출기 16 을 넣었다. 1~6단계 여분에 남아 있던 초등 권장 16 은 컨트롤러 판정(4 · 5 · 6단계 같은 묶음에서 맞바꿈)대로 넣었고, 그 뒤 완료 판정 전체를 다시 돌려 모두 맞는다. 이미 검토한 4~6단계 vocab · 단원 단어가 바뀌었으니 2차 검토 범위에 든다. 코드 파일은 건드리지 않았고 커밋하지 않았다.

### 완료 판정 대조

| 판정 | 명령 | 결과 |
|---|---|---|
| 필터 명령 0 · reference-complete 0 | `pnpm -s seed:validate --json \| jq '.errors \| length'` | 0 |
| 예문 1~12 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6,7,8,9,10,11,12` | 1,920(10단계 155 · 11단계 159 · 12단계 154 포함), RESULT 0 |
| 시험 문장 | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 407 줄(형태 318 · 금지어 89), RESULT 0 |
| 단원 단어 × allowedForms 맞대기 | `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts` | 단원 242 · 6,952, RESULT 0 |
| 주제 겹침 0 | `build_bundle.py`(같은 (영역, 단계) 주제 · 같은 단계 영역 사이 같은 묶음 짝) | 문제 0 |
| can-do 경고 0 | `pnpm -s seed:validate --json` 의 warnings · `check_level_specs.py` | 0 · RESULT 0 |
| lint | `pnpm lint` | Checked 50 files, 0 |
| test | `pnpm test` | Tests 160 passed (160) |
| `pnpm seed:validate` 종료 0 · 첫 줄 | `pnpm -s seed:validate` | 종료 0. `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0` |

더 돌린 검사: 10~12단계 예문 검사의 검사(망가뜨린 10 모두 잡음, 12단계 허용 대조 통과), `check_meanings.ts` 1,920 RESULT 0, 활용형 × 금지어(drunk 하나, 알고 둔 한계), `check_homophones.py` 48묶음 RESULT 0, `check_settings.py` RESULT 0, 2022 목록 맞대기(초등 권장 가운데 앱 어휘 밖은 일부러 뺀 8 뿐).

### 만든 것 · 건수

| 파일 | 건수 | 내용 |
|---|---|---|
| `seed/vocab.json` | 1,920항목(10~12단계 468 더함, 1455~1922줄) | 내용어 150 × 3, 기능어 5 · 9 · 4. 4~6단계 16 항목 맞바꿈(아래) |
| `seed/unit-specs.json` | 242행(10~12단계 60 더함) | 주제 · 3.6 학습 요소 · 단원 단어 30(첫 배정 수업은 학습 요소 낱말 먼저, 앞 낱말 21 단원), 단원 틀 C66 10~12구간 값(k 3, 쓰기 k 5)과 frame-* 0 |
| `seed/lists/forms.json` | 58항목(16 더함, 45~60줄) | relative-who-which · passive · indirect-question · however · relative-adverb · second-conditional · as-as · although · contrast-connector · for-example · opinion-phrase · so-that · used-to · modal-passive · paragraph-connector · cause-effect. 앞 묶음 고침 셋(he-she · we-they 'd, past-regular 대명사 + used, to-infinitive 뒤보기 use) |
| `seed/lists/homophones.json` | 48묶음(16 더함) | board · bored 판정(둘 다 vocab 이라 둠) |
| `seed/level-specs.json` | 바꾸지 않음 | 10~12 행 testMix 가 C66 과 같음 |
| 근거 문서 | (1) · (3) · (4) · (5) · (8) | 수 표 · CEFR-J 표 1~12, '1~6단계 여분의 초등 권장 16 맞바꿈' · '10~12단계 150 정하기' · '빠지는 낱말 누계' · '10~12단계 vocab' 절, 주제 표 1~12 확정 · 1~12 배치 절, 묶음 4 검출기 · 한계 · 120 표 10~12 행 · 시험 문장 전체 표, 동음이의어 판정, 검사 표 |

### 10~12단계 선정 결과

| 무엇 | 낱말 |
|---|---|
| 기본 | 10~12단계 후보 순위 1~150. 10단계 앞에는 9단계에서 넘어온 pole · pipe · port |
| 당긴 낱말 | 10단계: service · energy · project · compute · laser(초등 권장 여분). 11단계: campaign · recreation(초등 권장 여분). 12단계: conclusion(3.6 rst 12-5 '문단 연결(… in conclusion)' · 쓰기 10-4 · 12-4 의 낱말. 2022 목록 conclude 의 -sion 파생형이라 후보 끝에 더해 당김) |
| 넘긴 낱말 | 10 → 11단계 앞: risk · series · settle · shame · select · shelter · spirit · solid / 11 → 12단계 앞: client · constant · converse · detect · ease · elect · exhaust · factor · found · illustrate / 12 → 앱 어휘 밖: commerce · contract · cope · domestic · discipline · employ · faith · frankly · intent · manufacture |
| 원본 고침 | 10단계 원본 줄의 거름 표시가 빠져 후보에 들어가 있던 'however x' · 'discover x' 찌꺼기 둘을 거름. 11단계 advertize → advertise(2022 목록의 다른 표기, 표준 철자) |

### 빠지는 낱말 누계(1~12단계)

후보에 있었으나 vocab 원형에 들지 않은 낱말은 모두 242 이다(1단계 19 · 2단계 9 · 3단계 23 · 4단계 11 · 5단계 7 · 6단계 17 · 7단계 56 · 8단계 13 · 9단계 41 · 10단계 18 · 11단계 13 · 12단계 5 · 12단계에서 밀림 10). 초등 권장은 people 하나인데 person 의 활용형으로 vocab 에 든다. 2022 목록 전체로 맞대면 초등 권장 800 가운데 앱 어휘 밖은 8 이고, 모두 '뺀 낱말'(kill · wine · god 같은 금지어 · 아동 범위 밖과 alright · thirst · twenty-first~third 같은 철자 변이)이다. 낱말 목록은 근거 문서 (1) '앱 어휘에서 빠지는 낱말 누계' 표.

### 다르게 한 것

1. **1~6단계 여분의 초등 권장 16 맞바꿈(컨트롤러 판정 — 제안 뒤 세부 지시).** 1~12단계 전체를 2022 목록과 맞대 보니 초등 권장 16 이 1~6단계 여분에 남아 앱 어휘 밖이었다(fix 1 I-2 의 35 밖, math 포함). 처음에는 5 · 6단계에 넣었다가, 판정('1~3단계 여분 8 은 4단계, 5단계 여분은 5단계, 6단계 여분은 6단계')을 받고 4단계에 아홉(1~3단계 여분 8 과 같은 처지의 math), 5단계에 넷, 6단계에 셋으로 다시 넣었다. 그 단계 같은 묶음의 `**` · 파생 · 합성 낱말과 맞바꿨고, 뺀 16 은 7단계 여분(151 이후)으로 보냈다. 7~12단계 당김 · 넘김과 단계마다 내용어 수 · 누계 1,725 는 그대로다. 뺀 낱말을 쓴 예문 여덟(exciting · firefighter 둘 · picnic 셋 · pool · practice)을 고쳤다.

| 단계 | 넣은 낱말(vocab 줄) | 뺀 낱말 |
|---|---|---|
| 4 | math(545) · mail(544) · tape(599) · ice(527) · point(570) · touch(613) · tail(598) · kitchen(535) · skin(584) | practice · diary · wonderful · pool · surprise · picnic · exciting · neighbor · firefighter |
| 5 | check(663) · gentleman(698) · lady(720) · score(767) | meal · twin · magic · golf |
| 6 | congratulate(835) · guy(868) · mad(899) | contest · silver · lonely |

   math 는 2022 목록 mathematics 의 대표형으로 정해 둔 낱말인데 1단계 여분에 남아 있어, 판정의 15 에 더해 같은 규칙(1~3단계 여분 → 4단계)으로 넣었다. 4단계 C3 묶음에서는 kitchen · skin 을 묶음 끝에 두어 직업 단원의 첫 배정 수업을 지켰다.
2. **conclusion 을 목록 밖에서 당겼다.** 2022 목록에는 conclude 만 있고(표시 없음 무리) conclusion 이 따로 없다. 3.6 요소 글자에 든 낱말이라 12단계로 당겼다(12단계 목록 밖 비율 0.7%).
3. **'Would you …?'는 가정법 검출기에서 뺐다.** would + 낱말을 모두 잡으면 공손한 부탁(Would you help me?)이 11-2 전에 막힌다. would like · would rather · would you 를 빼고, 가정법은 'if + 주어 + were'와 평서문의 would 로 잡는다.
4. **주제 셋을 바꿨다.** 읽기 12-1 '교복은 필요할까' → '학교에 휴대폰을 가져와도 될까'(uniform 이 vocab 밖), 쓰기 12-1 '미세 먼지와 건강' → '대기 오염과 건강'(dust 가 vocab 밖), 쓰기 11-4 '비가 온다면' → '새로운 일에 도전하면'(날씨 낱말이 그 단원 묶음에 없음).
5. **동음이의어 판정.** board · bored 는 둘 다 vocab 이라 둔다(메모 6). 양쪽이 vocab 에 든 묶음 16 을 더했다(48묶음, pear · pair 는 pair 가 5단계 vocab 이라 그대로). `check_homophones.py` 는 묶음 4 부터 vocab 원형 · 활용형 기준이다.

### 알릴 것

1. **4단계 그림 낱말이 바뀌었다(P6b 작업 3, 그림 범위 1~4단계 C65).** 들어온 그림 낱말은 kitchen · tape · tail · ice · mail · skin 이고, 빠진 그림 낱말은 pool · picnic · firefighter · diary 다. math · point · touch 와 빠진 practice · wonderful · surprise · exciting · neighbor 는 그림 문제로 내기 어려운 낱말이다. P6b 는 이 목록으로 그림을 고르면 된다.
2. **이미 검토한 4~6단계 값이 바뀌었다.** vocab 16 항목, 그 묶음(4단계 C3 · C5~C7, 5단계 D3 · D7 · D8, 6단계 E3 · E4 · E10)을 쓰는 단원의 단원 단어, 예문 여덟이 바뀌었다. 2차 검토 범위에 든다.
3. **P9b 쪽 변화 없음.** 금지어 목록은 묶음 4 에서 바꾸지 않았다.
4. **정규식 뒤보기.** used-to 정규식이 뒤보기를 더 쓴다(서버 Node 컴파일만).

### 남은 우려

1. **7~12단계 CEFR-J 경계.** 후보 순위를 그대로 쓰는 판정이라 10~12단계에 A2 154 가 남는다. P8 표본에서 지문 난도를 보고 단계 안 차례로 다듬는다.
2. **12단계에서 빠진 10.** commerce · contract · employ · manufacture 같은 `**` 낱말이 앱 어휘에서 빠졌다. 다음 단계가 없어 같은 규칙으로는 넣을 곳이 없다.
3. **10~12단계 묶음의 섞임.** J10 · K10 · L10 은 남은 낱말 묶음이다. 앞 낱말(FRONT)로 학습 요소를 지켰지만 P8 표본에서 어색하면 다시 짠다.

### 결정이 필요한 것

없음. 1~6단계 맞바꿈은 컨트롤러 판정대로 했다.

## fix 3(검토 review-p06a-3 반영, 브리프 task-p06a-fix3.md — fix 라운드 3, 2026-10-17)

상태: DONE. R-1~R-5 를 모두 고쳤고 완료 판정 열여섯이 모두 맞는다. 코드 파일은 건드리지 않았고 커밋하지 않았다(코드 변화는 앞 라운드 컨트롤러 것 셋 그대로).

### 완료 판정 대조

| 판정 | 명령 | 결과 |
|---|---|---|
| 필터 0 · reference-complete 0 | `pnpm -s seed:validate --json \| jq '.errors \| length'` | 0 |
| 예문 1~12 | `pnpm exec tsx tests/.tmp/p06/check_examples.ts 1,2,3,4,5,6,7,8,9,10,11,12` | 1,920(183 · 137 · 139 · 175 · 170 · 161 · 165 · 163 · 159 · 155 · 159 · 154), RESULT 0 |
| 시험 문장(더한 문장 포함) | `pnpm exec tsx tests/.tmp/p06/check_lists.ts` | 450 줄(형태 361 · 금지어 89), RESULT 0 |
| 단원 단어 × allowedForms | `pnpm exec tsx tests/.tmp/p06/check_unit_words.ts` | 단원 242 · 6,952, RESULT 0 |
| 주제 겹침 0 | `python3 -I tests/.tmp/p06/build_bundle.py . <specs>` | 문제 0(같은 (영역, 단계) 주제 겹침 0) |
| can-do 경고 0 | `pnpm -s seed:validate --json` warnings · `check_level_specs.py` | 0 · RESULT 0 |
| lint | `pnpm lint` | Checked 50 files, 0 |
| test | `pnpm test` | Tests 160 passed (160) |
| `pnpm -s seed:validate` 종료 0 · 첫 줄 | `pnpm -s seed:validate` | 종료 0. `seed-validate: 칸 0 · 통과 0 · 실패 0 · 빈 칸 4892 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0` |
| python 셋 | `check_settings.py` · `check_level_specs.py` · `check_homophones.py` | RESULT 0 · RESULT 0 · RESULT 0(48묶음) |
| R-1 네 묶음과 훑기 — 1~8단계 거짓 양성 0 | `pnpm exec tsx tests/.tmp/p06/scan_phrases.ts` · check_lists 의 R-1 문장 | 훑기 79 문장 막힘 0, 예외 통과 20 · 진짜 형태 잡힘 15 모두 맞음 |
| 단계별 수 · 누계 | 일회 맞대기 | 내용어 125 · 125 · 125 · 150 × 9, 누계 375 · 825 · 1,275 · 1,725 그대로 |
| 뜻 · 예문 × 금지어 | `pnpm exec tsx tests/.tmp/p06/check_meanings.ts` | vocab 1,920, RESULT 0 |

### 지적마다

| 지적 | 판정 | 고친 곳(파일 · 줄 · 값) |
|---|---|---|
| R-1(Important) 정형 표현 거짓 양성 | ADDRESSED | `seed/lists/forms.json` 41줄 to-infinitive(nice · glad · good · happy · pleased · sorry + to meet · see · hear 와 time to 를 빼고, 그 밖의 'happy to + 동사'는 다른 갈래로 잡음), 32줄 comparative(older · younger + brother · sister · cousin, feel · get + better 를 뺌 — 낱말 목록의 older · younger · better 를 정규식으로 옮김), 33줄 superlative(best + friend 를 뺌). 훑기에서 찾아 같은 방법으로 뺀 것: 3줄 have(문장 첫 'Have a nice day!' · 'Have fun!'), 8줄 lets(Let's + learn · talk · keep 같은 수업 진행 말), 4줄 can('Can you say it again?'), 27줄 some-any('some new words' · 'Would you like some ~'), 16줄 want-to('want to talk more'), 40줄 gerund(keep + -ing). 근거 문서 (4) 'fix 3 정형 표현 예외' 표 · 훑기 표 · 9-2 앞 to 꼴 표 · '관용구 거짓 양성' 줄 |
| R-2(Minor) 주제 이름 아홉 | ADDRESSED | `seed/unit-specs.json` topic 만 바꿈(아래 표). 근거 문서 (3) 주제 표 · 배치 절 |
| R-3(Minor) 활용형 목록 | ADDRESSED | `tests/.tmp/p06/build_bundle.py` 가 vocab forms 에서 뽑음 → forms.json 12 · 21 · 28 · 34 · 40 · 42 · 46줄. 시험 문장 8 더함 |
| R-4(Minor) 아이 눈높이 | ADDRESSED | 판정 셋 + 같은 꼴 여섯(아래 표) |
| R-5(Minor) 154줄 순위 수 | ADDRESSED | 근거 문서 154줄 '7단계 후보 151위 이후 여분(묶음 4 의 맞바꿈 16 과 함께)' |

### R-1 예외 목록과 근거

| 검출기(도입 rst) | 예외 | 정본 근거 | 여전히 잡는 것(시험 문장) |
|---|---|---|---|
| to-infinitive(9-2) | (nice · glad · good · happy · pleased · sorry) to (meet · see · hear), time to + 동사 | 3.3 인사 토막(모든 단계, 회화 1-1 '토리와 첫 만남'), 회화 5-1 공감 'I'm sorry to hear that.', 시각 4-5 'It's time to go home.' | I am happy to help you. · It is nice to swim. · I went there to buy milk. |
| comparative(7-5) | (older · younger) + brother · sister · cousin, (feel · get 꼴) + better | 가족 단원(읽기 · 회화 · 말하기 2-2, 쓰기 6-4), 회화 5-1 '보건실에서' | She is taller than me. · My brother is older than me. · This one is better. |
| superlative(7-5) | best + friend(s) | 말하기 2-2 '내 친구 소개' | It is the biggest city. · He is the best player. · You are the best! |
| have(2-3) | 문장 첫 Have a nice · good · great day · time · weekend · trip · night, Have fun | 3.3 정리 토막 끝인사(1단계부터) — 검토 범위 밖 관찰을 같은 방법으로 처리 | I have a nice day. · Have you seen it? |
| lets(3-4) | Let's + learn · talk · keep · start · begin · try · read · listen · say · look · review · practice | 3.3 연결 말 'Let's learn some new words!' · 'Nice! Now let's talk about colors.', 6.3 예 'Let's keep talking.' | Let's play soccer. · Let us go home. |
| can(2-4) | Can you say it · that again | 1단계 다시 말하기 힌트 | Can you swim? |
| some-any(6-5) | some new words, Would you like some ~ | 3.3 연결 말(모든 단계), 5-2 would like 의 권하는 말 | I want some juice. · Do you want some cake? |
| want-to(5-2) | want to talk more | 3.3 'Do you want to talk more?'(목표 턴, 모든 단계) | I want to learn English. |
| gerund(9-1) | keep + -ing | 6.3 예 'Let's keep talking.' | I like swimming. · Reading is fun. |

훑기: 정본 3.3 · 6.3 의 영어 예와 인사 · 안부 · 칭찬 · 힌트 · 끝인사 전형 문장, 가족 · 보건실 · 가게 · 시각 정형 표현 79 문장을 그 꼴이 필요한 가장 이른 (영역, 단계, 단원)에서 돌렸다(`scan_phrases.json` · `scan_phrases.ts`). 첫 판 막힘 11 → 예외 뒤 0. 1~8단계 vocab 예문 1,293 은 예문 검사가 이미 0. 전체 표는 근거 문서 (4).

9-2 보다 앞선 to 꼴: want to(rst 5-2 · 쓰기 4-3) · would like to(5-2) · be going to(7-3 · 쓰기 8-1) · have to(8-4) · used to(12-3)는 to-infinitive 뒤보기로 빠지고 각자의 검출기가 맡는다. like to · need to · how to 는 3.6 에 9-2 앞 자리가 없어 9-2 로 잡는다.

### 바뀐 주제 아홉(R-2, 낱말 · 학습 요소는 그대로)

| 단원(unit-specs 줄) | 전 | 뒤 | 단원 단어 앞쪽 |
|---|---|---|---|
| 쓰기 8-1(100) | 다가올 방학 | 탐정 놀이 계획 | mission · search · clue · crowd · moment · instant |
| 쓰기 8-3(102) | 우리 반 최고 기록 | 가장 좋은 선택 | choice · possible · title · prefer · screen · tip |
| 회화 8-5(224) | 감기 걸린 친구 | 다친 친구 돕기 | pain · sore · hurt · injure |
| 말하기 9-4(168) | 시간이 있으면 | 과학 실험을 한다면 | experiment · record · result · report |
| 말하기 9-5(169) | 학교 가기 전후 | 학교 가는 길 | complete · gather · form · main |
| 회화 9-3(227) | 경험 나누기 | 요리해 본 경험 | spread · mix · pour · stir |
| 회화 9-5(229) | 주말 일과 | 방 정리하는 날 | furniture · carpet · item · pile |
| 쓰기 10-3(112) | 반려동물 기르기 | 규칙과 벌 | however · recent · necessary · enormous · express |
| 쓰기 10-4(113) | 급식 메뉴 제안 | 환경을 지키는 제안 | waste · reduce · service · fee · charge |

쓰기 8-3 은 검토 예('친구에게 주는 조언') 대신 학습 요소 '최상급'에 맞춰 '가장 좋은 선택'으로 했다. 나머지 여덟은 검토 예 그대로다.

### 활용형 다시 뽑은 차이(R-3)

| 목록 | 들어온 꼴 | 빠진 꼴 |
|---|---|---|
| -ing(present-progressive · past-progressive · gerund) | panicking · travelling | panicing |
| -ed(past-regular · present-perfect · passive) | lied · panicked · sewed · showed · travelled | paniced · upsetted |
| 불규칙 과거(past-irregular) | — | forgave · lied · lit · sank · sewed · showed · spun · stuck · swept(vocab 에 없는 동사 꼴, lied · sewed · showed 는 규칙 과거로) |
| 불규칙 과거분사(present-perfect · passive) | — | bet · forgiven · lit · spun · stuck · sunk · swept(vocab 에 없는 동사 꼴) |

형용사로 뺀 bored · tired · worried 같은 제외 목록은 그대로다. 더한 시험 문장: She was panicking. · Everyone is panicking. · He panicked. · They have panicked before. · He lied to me. · My grandmother sewed a doll. · She sews well. · They are lying on the grass.

### R-4 고친 것

| 낱말(vocab 줄) | 전 | 뒤 | 까닭 |
|---|---|---|---|
| church(1003) | My family goes to church on Sunday. | The church is next to the park. | 특정 신앙을 아이 자신의 일로 전제(판정) |
| pray(1408) | We pray before dinner. | Some people pray before dinner. | 같음(판정의 'before meals'는 meal 이 묶음 4 맞바꿈으로 vocab 밖이라 dinner 로) |
| guy(868) | 뜻 '녀석, 사람' | 뜻 '사람, 남자' | 낮춤말 뜻(판정) |
| fellow(1350) | 뜻 '친구, 녀석' | 뜻 '친구, 사람' | 같은 꼴의 낮춤말 뜻 |
| afford(1457) | We can't afford a new car. | Tom can't afford the expensive game. | 가정 형편을 아이 집의 일로 전제 |
| fund(1677) | We raised funds for the poor children. | We raised funds for the school library. | 가정 형편(가난한 아이) 전제 |
| income(1858) | His income is not very high. | The farm's income was higher this year. | 한 사람의 소득 형편 |
| adopt(1613) | They adopted a little girl. | Our class adopted a new plan. | 가족 형태(입양)를 예로 듦 — 뜻 순서도 '받아들이다, 입양하다' |
| parent(565) | My parents work at a bank. | Parents love their children. | 가족 형태 · 맞벌이 전제(4단계지만 같은 꼴이라 함께) |

### 다르게 한 것

1. **훑기 예외를 네 묶음 밖으로 넓혔다.** 판정의 네 묶음 말고도, 훑기에서 정본 3.3 이 앞 단계에 쓰는 꼴이 막힌 것(have 끝인사 · Let's 수업 진행 말 · some new words · Would you like some · Can you say it again · want to talk more · keep + -ing · sorry to hear · time to)을 같은 '좁은 구 단위 예외'로 뺐다. 검토가 범위 밖 관찰로 남긴 'Have a nice day!'도 여기서 다뤘다.
2. **쓰기 8-3 주제.** 검토 예 대신 학습 요소(최상급)에 맞춰 '가장 좋은 선택'으로 했다.
3. **R-4 를 판정 셋보다 넓혔다.** 같은 꼴 여섯(fellow · afford · fund · income · adopt · parent)을 함께 고쳤다. parent 는 4단계다.
4. **(3) 주제 표의 학습 요소 칸.** 동기화하면서 괄호를 줄여 적었던 칸(2-3 · 2-4 · 3-1 · 5-1 행)도 3.6 글자 그대로가 되었다.

### 알릴 것

1. **P6b 그림 판정.** touch · point 는 동작어라 그림 여부를 P6b 가 정한다고 근거 문서를 고쳤다(review-p06a-3 5절).
2. **P8 생성.** 예외로 뺀 꼴(인사 · 끝인사 · 수업 진행 말 · 가족 호칭 · feel better · best friend)은 앞 단계 시드에 써도 된다. 'You are the best!' · 'Do your best.' · 'You did it!'(did 7-2) · 'That was fun!'(was 6-1)은 진짜 형태라 앞 단계에서는 막히므로 'Good job!' · 'That's fun!'을 쓴다.

### 남은 우려

없음(이번 지적 범위 안). 검토 6절 메모(most + 두 음절 형용사 · vocab 밖 -ly 부사 거짓 음성)는 근거 문서 '알고 둔 한계'에 더했다.

### 결정이 필요한 것

없음.

### Minor 정리(review-p06a-4 N-1~N-3, 브리프 task-p06a-minor.md — fix 라운드 아님)

상태: DONE. 검토의 '고치는 법' 그대로 셋을 좁혔고 완료 판정 열여섯을 다시 돌려 모두 맞는다. 코드 파일은 건드리지 않았고 커밋하지 않았다.

| 지적 | 바뀐 정규식(`seed/lists/forms.json`) | 더한 시험 문장 |
|---|---|---|
| N-1 Let's 예외 | lets(8줄): `\blet's\b(?!\s+(?:learn\|talk\|keep)\b)` — 정본에 영어 예가 있는 셋(02-2 'Let's learn some new words!' · 'Nice! Now let's talk about colors.', 06 'Let's keep talking.')만. 더 뺄 수업 진행 구는 정본 근거가 없어 두지 않았다 | Let's read a book. → lets(1~3단계에서 걸림), Let's talk about animals. → 없음 |
| N-2 to 부정사 예외 | to-infinitive(41줄)에 갈래 둘 더함: `\b(?:nice\|glad\|good\|happy\|pleased)\s+to\s+(?:meet\|see)\s+(?!you\b)` · `\bsorry\s+to\s+hear\s+(?!(?:that\|about)\b)`. better 쪽은 그대로 두고 근거 문서 '알고 둔 한계'에 'get better + 명사' 한 줄 | It is good to see the stars. → to-infinitive, I was sorry to hear the news. → to-infinitive · past-be, I'm sorry to hear about your cold. → 없음(Nice to see you again. → 없음은 이미 있음) |
| N-3 keep + -ing | gerund(40줄): 트리거 목록은 그대로 두고 keep · keeps · kept · keeping 갈래를 따로 더함 `\b(?:keep\|keeps\|kept\|keeping)\s+(?!talking\b)` + -ing — 'Stop talking'은 계속 잡히게 talking 을 빼는 앞보기는 keep 갈래에만 둠 | Keep trying! → gerund, He kept running. → gerund · he-she · past-irregular, Let's keep talking. → 없음, Stop talking, please. → gerund |

| 완료 판정 | 결과 |
|---|---|
| 필터 0 · reference-complete 0 | 0 |
| 예문 1~12 | 1,920, RESULT 0 |
| 시험 문장(더한 9 포함) | 459 줄(형태 370 · 금지어 89), RESULT 0 |
| 훑기(scan_phrases) | 79 문장 막힘 0 |
| 단원 단어 × allowedForms | 단원 242 · 6,952, RESULT 0 |
| 주제 겹침 | 0 |
| can-do 경고 | 0 |
| lint · test | 0 · 160 passed |
| `pnpm -s seed:validate` | 종료 0, 첫 줄 '실패 0 · 규격 파일 오류 0', `--json` errors 0 · warnings 0 |
| python 셋(설정 · 단계 규격 · 동음이의어) | RESULT 0 · 0 · 0 |
| 뜻 · 예문 × 금지어 | vocab 1,920, RESULT 0 |
| 단계별 수 · 누계 | 375 · 825 · 1,275 · 1,725 그대로 |
| 생성기 맞대기 | 문제 0(vocab 1,920 · 단원 규격 242 · 형태 표 58) |

