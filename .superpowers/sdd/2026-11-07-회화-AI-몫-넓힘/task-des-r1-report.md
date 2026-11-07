# 대본 회차 r1 설계 판정(고친 코드 · 대본 열둘 × 2바퀴 · effort low · 2026-11-07)

작성: 설계 · 화면 검토자(Fable · max, 읽기 전용) · 맡긴 곳: 컨트롤러 브리프 `task-des-r1.md` · **iPad 검증 전**(C211 (5): 이 판정은 대화 논리 검증이고 iPad 회화 품질 검증 완료가 아니다)

읽는 법. 판정 대상은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-r1/`(전문 · 지표 · 검토 목록 · JSON)이고, 기준선 (가)는 같은 자리의 `ai-scope-base/`(고침 전 p13d-base 한 바퀴), (나)는 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/task-talk-quality-review-3.md`(5 · 6회차 판정)다. 'L1 · L2' 는 바퀴, '대본 L1 n' 은 그 대본 첫 바퀴 n차례다. 지표 정의는 spec 판 4 설계 8(`intent/2026-11-06-회화-AI-몫-넓힘/spec.md` 119~148줄). 코드는 고정부 예문(`.claude/worktrees/p13d/src/core/ai/calls/talk-lesson.ts` 839~877 · 896 · 998~1003줄)과 지표 규칙(`scripts/talk-metrics.ts` 600~614줄)만 읽었고 바꾸지 않았다. 실호출은 하지 않았다. 둘째 세션 끔 바퀴(`ai-scope-second-off/`)와 effort medium 두 바퀴(`ai-scope-medium/`)는 판정 중에 도착해 8절(8.1 요약 밖 기억 · 8.2 low 대 medium 아이 눈)에 더했다. 주 판정은 low r1 이다.

## 1 판정 한 줄

**조건부 통과(수정 필요, iPad 시험 부탁은 r2 재판정 뒤).** 대화 토막은 고침 전보다 뚜렷이 대화 같다: 장면 여는 질문 덕에 고침 전의 둘째 차례 오판 넷(예 · 아니요를 막힘으로)이 사라졌고, 들리지 않음 말 넷이 모두 다른 말이며, 답 소리 자리 밖이 12 → 1, 대화 토막 AI 차례 104 가운데 고정 문장 0 · 두 바퀴 같은 글 6, 지어낸 경험 0 · 요약 밖 기억 0 · 말을 위한 말 0, 선생님 말 양은 늘지 않았다. 그러나 설계 8 이 0 이어야 한다고 둔 항목 셋이 남았고(막힘 판정 틀림 1 · 설계 밖 답 먼저 2 · 억지 끼움 2), 상황 반응 되풀이 3 과 '고정 문장' 35 는 전부 상황 차례(인사 끝 21/24 · 받침 14/15)에 몰려 있어 요청자의 '형식적 인사 · 반응이 일관적' 소감이 그 자리에서 그대로 재현된다. Critical 0 · Important 6 · Minor 7. 고칠 것은 7절.

## 2 대본마다 사람 판정(metrics.md 빈 표 꼴)

이어짐 칸은 '말로 답한 뒤 AI 차례' 분모에 ✓(반응과 질문이 아이 말을 이음) · 반(반응은 아이 말을 받았으나 질문은 카드 · 딴 것) · ✗(둘 다 아님). 자동 보조 셈(112/128)과 달리 기술 오류 자리 · 막힘 말 뒤는 뺐다.

| 대본 | 대화 같다 · 아니다(까닭) | 이어짐(✓ · 반 · ✗ / 분모) | 맥락 낱말 · 불필요하게 어려운 낱말 | 말을 위한 말 | 아이 말 끊음 | 지어낸 경험 | 요약 밖 기억 | 막힘 판정 틀림 | 답 먼저(설계 밖) | 카드 질문 억지 끼움(억지 · 반) |
|---|---|---|---|---|---|---|---|---|---|---|
| l3-child-topic | L1 같다(강아지 · 축구 이야기를 넷 이어 물음, 'Is the lake big, too?' 가 오늘 장면으로 잇는 다리) · L2 같다(약함: 3 에서 검사 두 번 걸려 카드, 3 · 4 · 5 · 8 네 차례가 카드 쪽) | 7 · 7 · 0 / 14 | words 2 · 0 | 0(L2 5 'The sun is hot at the lake.' 는 카드 다리) | 0(설계 길 1: L2 3 검사 두 번 걸림 → 카드) | 0(L2 2 'I like dogs.' 허용) | — | 0 | 0 | 0 · 5(L1 5 · 8, L2 3 · 5 · 8) |
| l3-greet-fine | L1 · L2 같다(장면 여는 질문 뒤 이어 물음, 필수 2 를 'Do you have juice with lunch?' · 'Do you like the juice, too?' 자기 말로) | 6 · 0 · 0 / 6 | words 2 · 0 | 0 | 0 | 0 | — | 0 | 0 | 0 · 0 |
| l3-greet-more | L1 같다(인사 끝이 축구에 닿고 질문 없음, 'Me too! Bikes are fun.') · **L2 아니다**(3: 아이가 'We eat rice and fish.' 라 했는데 'What do you do at the table?' 을 붙임 — 방금 한 말을 되묻는 카드 질문) | 5 · 0 · 1 / 6 | sounds 1 · words 2 · 0 | 0 | 0 | 0 | — | 0 | 0 | **1(L2 3)** · 0 |
| l3-greet-tired | L1 · L2 같다('Oh, tired! That's okay.' 다그치지 않음, 밥 → 생선 → 주스 따라감) | 6 · 0 · 0 / 6 | words 2 · 0 | 0 | 0 | 0 | — | 0 | 0 | 0 · 0 |
| l3-nospeech | L1 · L2 같다(들리지 않음 넷이 모두 다른 말, 소리 · 귀 탓, 아이 탓 · 들은 척 0, 답 한 번 + 다음 질문) | 3 · 1 · 0 / 4 | words 2 · 0 | 0 | 0 | 0 | — | — (앱 판단) | 0(닫기 답 소리는 설계) | 0 · 0 |
| l3-preview-1 | L1 같다(흠 하나: 7 'Do you like the fish?' 는 5 'Yes I like fish.' 를 되물음) · L2 같다(4 'Oh, you like bikes! You are hungry too.' 가 두 말을 다 받음, 5 · 7 카드는 장면 다리 있음) | 7 · 3 · 0 / 10 | words 2 · 0 | 0(L2 5 네 문장, N-11) | 0 | 0(L1 4 'Me too.' · L2 5 'Me too!' 지금 느낌) | — | 0(2 · 3 단추) | 0(받침 1 은 설계) | 0 · 2(L2 5 · 7) |
| l3-scene-no | L1 같다('No.' 를 받아 오리로, 설득 · 같은 질문 없음) · L2 같다(약함: 4 · 5 · 6 반) | 7 · 3 · 0 / 10 | words 2 · 0 | 0 | 0 | 0 | — | 0 | 0 | 0 · 2(L2 4 · 6) |
| l3-scene-other | L1 · L2 같다(고양이에 한 턴 이어 묻고 돌아옴, 'I like cats.' 허용). 두 바퀴 다 같은 자리에서 고양이 이야기가 끊김(검사 두 번 걸림) | 8 · 2 · 0 / 10 | words 2 · 0 | 0 | 0(설계 길 2: L1 3 · L2 3) | 0 | — | 0 | 0 | 0 · 2(L1 3 · L2 3) |
| l3-scene-yes | L1 같다(흠: 5 'Is the lake with your family?' 는 말이 안 되는 문장, 6 'Sand is on your hands.' 아이 상태 단정) · L2 같다(열둘 가운데 가장 좋음: 'The sun is down. Who is with you at home?') | 8 · 2 · 0 / 10 | words 2 · 0 | 0 | 0 | 0 | — | 0 | 0 | 0 · 1(L1 6) |
| l3-second-session | L1 같다(흠: 8 집에 온다는 말 뒤 '식탁에서 뭘 해?' 카드) · **L2 아니다**(3: greet-more L2 3 과 같은 되묻는 카드 질문) | 11 · 2 · 1 / 14 | words 2 · 0 | 0 | 0 | 0 | **0**(켬 2바퀴 · 끔 1바퀴 모두 요약 밖 기억 없음, 켬에서도 요약을 꺼내지 않음) | 0 | 0 | **1(L2 3)** · 3(L1 7 · 8, L2 7) |
| l3-stuck-three | L1 · L2 **조건부**(받침 흐름은 설계대로이고 막힘 판정 · 같은 질문 · 답 두 번 0, 그러나 'That's okay! You can do it!' 이 L1 에서 세 번(2 · 5 · 7) · L2 두 번(2 · 7) — 요청자의 '반응이 일관적') | 3 · 1 · 0 / 4 | words 2 · 0 | 0 | 0 | 0 | — | 0('Huh?' · 'I don't know.' 막힘 맞음) | 0(받침은 설계) | 0 · 0 |
| l3-word-answers | L1 **조건부**(2 'Rice.' 를 막힘으로 봐 'Yes, I ride a bike.' 를 따라 하게 함, 7 읽지 못함) · **L2 아니다**(7 'Big.' → 'Is the lake big or small?' 되묻기, 8 'What do you do with water?' 뒤 〈I wash my hands.〉 답 먼저, 2 읽지 못함, 3 문구 · 행동 불일치) | 6 · 2 · 2 / 10(L2 3 'Yes.' 막힘은 분모 밖) | words 2 · 0 | 0 | 0 | 0 | — | **1(L1 2)** | **2(L1 2 · L2 8)** | 0 · 2(L2 4 · 6) |
| **합계** | 같다 20바퀴 · 조건부 3 · 아니다 3 / 24 | 77 · 24 · 4 / 105 | 맥락 25 · 불필요 0 / 417 | 0 | 0(설계 길 3) | 0 | 0 | 1 | 2 | 2 · 17 |

사람 이어짐 101/105(96%) · 온전한 이어 묻기 77/105(73%). 기준선 (가)는 자동 85% 이고 사람 눈으로도 둘째 차례 오판 넷 · 답 소리 12 가 이어짐을 끊어 r1 이 높다. (나) 5회차는 AI 질문 14 가운데 진짜 이어 묻기 6 · 반 2 였다(43%).

## 3 재발 목록 일곱(고정 점검 항목)

| 항목 | 판정 | 근거(대본 · 바퀴 · 차례) |
|---|---|---|
| 일방통행 | **있음 1** | word-answers L1 2: 'Rice.' → unrelated_words · 막힘 → 받침 1 'Oh, rice! Yum!' + 신호 말 + 〈Yes, I ride a bike.〉. 아이 말을 한마디 받고는 상관없는 답을 따라 하게 한다. C204 (2) 가 'Rice.' 를 답으로 받으라는 예로 쓴 바로 그 말이고, 대본의 설계된 대화도 이어 묻기(followUp: true)다. 그 밖의 말로 답한 105차례는 모두 반응이 아이 말을 받았다 |
| 같은 질문 반복 | **있음 4** | (가) 앱 길 2: greet-more L2 3 · second-session L2 3 — 아이가 'We eat rice and fish.' 라 한 바로 뒤에 검사 두 번 걸림 → 카드 자리가 남은 기회 가운데 맨 앞인 필수 1 'What do you do at the table?' 을 붙여 방금 한 말을 되묻는다. (나) 프롬프트 길 2: word-answers L2 7 'Big.' → 'Oh, a big lake! Is the lake big or small?'(고정부 924줄이 금지한 꼴 그대로, 4회차 N-1 재발), preview-1 L1 7 'Yes I like fish.'(5) 뒤 'Do you like the fish?'. 자동 '같은 질문 표시' 는 0 이라 지표가 못 잡는다 |
| 두 번 읽기 | 없음 | 같은 소리 두 번 0/143(자동 · 사람). 받침 첫째 · 셋째가 같은 답 소리를 두 번 내는 것(stuck-three L1 2 · 4 〈Yes, I ride a bike.〉)은 02-2:259~261 설계다 |
| 형식적 인사 | **있음 21/24** | 인사 끝 24차례 가운데 'Good to hear! Let's learn some new words!' 그대로 20, 'Oh, soccer! Good to hear! Let's learn some new words!' 1. 나머지 셋('Oh, tired! That's okay. …' ×2, 'Oh, soccer! That sounds fun. …')도 끝 문장은 같다 — 24/24 가 'Let's learn some new words!' 로 끝난다. 둘째 세션 켬에서도 요약을 꺼내지 않았다. 기준선 (가) 9/12 와 같은 비율이고 effort medium 도 20/24(8절) |
| 한글 해석(뜻) | **있음 3** | 응답을 읽지 못한 차례의 대신 줄에 뜻이 없다: word-answers L1 7 'Very good!' · L2 2 'Wow!', stuck-three L2 5 'Nice!'(tori_ko —). 1~3단계는 영어 글을 보이지 않으므로 아이는 아무 글도 못 본다. 그 밖 140차례는 뜻이 있고 자연스럽다('오, 강아지구나! 네 강아지는 크니?') |
| 한국어로 묻기 | 없음 | 선생님 질문 121 모두 영어. 뜻 · 설명에 영어 답 문장 없음(기록 범위) |
| 지어낸 경험 | 없음 | 자기 이야기 5차례 모두 좋아하는 것 · 지금 느낌: scene-other L1 2 'I like cats.', child-topic L2 2 'I like dogs.', preview-1 L1 4 'Me too.'(배고픔) · L2 5 'Me too!'(생선), greet-more L1 2 'Me too! Bikes are fun.'. 과거 경험 · 가족 · 사는 곳 0 |

## 4 '고정 문장 차례' 35/143(24%) 의 해석

**분자 35 의 가름(정규화 글이 같은 줄로 셈).**

| 자리 | 차례 수 | 고정 | 글 |
|---|---|---|---|
| 인사 끝(AI) | 24 | **21** | 'Good to hear! Let's learn some new words!' 20 · 'Oh, soccer! Good to hear! Let's learn some new words!' 1(짧은 반응을 떼면 예문 그대로) |
| 받침 첫째(AI 반응) | 9 | 8 | 'That's okay! You can do it!' 7(preview-1 L1 2 · L2 2, stuck-three L1 2 · 5 · 7 · L2 2 · 7) · 'It's okay! Let me ask in a new way.' 1(word-answers L2 3, 받침 둘째 예를 첫째에 씀) |
| 받침 둘째 | 4 | 4 | 'No problem! Here is an easy one.' ×4 |
| 받침 셋째 | 2 | 2 | 'That's okay! Here is the answer.' · 'That's okay! Let's go on.' |
| 대화 토막 AI 차례 | 104 | **0** | — |
| (들리지 않음 8 — 분모 밖) | (8) | (7) | 'Oops, my ears! Let's go on.' · 'Hmm, the sound is not good. Let's go on.' 꼴, 예문 목록을 차례대로 베낌 |

- **설계상 앱이 붙이는 줄은 분자 · 분모에 없다.** 신호 말(C207) · 장면 여는 질문(C206) · 받침 답 소리(C205) · 들리지 않음 안내(C210)는 AI 글이 아니라 정의대로 세지 않았고, 들리지 않음 차례는 기술 오류 자리로 따로 셌다(7/8). 그러므로 이 24% 는 **모두 AI 가 쓴 글이 고정부 예문과 같은 것**이고, 정의를 바꿔 낮출 자리가 아니다. 고정부에는 '예를 그대로 쓰지 않는다 · 이 대화에서 쓴 반응을 되풀이하지 않는다' 줄(1003줄)이 있으나 effort low 의 Sonnet 은 예문 목록의 첫째를 베끼고(인사 끝 21/24) 받침은 예문 둘을 섞어 한 문장('That's okay!' + 'You can do it!')으로 굳혔다. 들리지 않음 넷이 '달라 보이는' 것도 예문 셋을 차례대로 베낀 결과라 다음 수업에서 같은 순서로 되풀이된다.
- **수치를 맞추려 말을 보탠 흔적은 없다(C211 (2)).** 선생님 낱말 ÷ 아이 낱말 4.78(고침 전 4.89), 아이 차례 앞 선생님 낱말 중앙값 10 같음, 자기 이야기 5차례 모두 세 낱말 안이고 아이 말이 부른 것, 둘째 문장은 되풀이(설계 3 기본 꼴)나 카드 장면 다리뿐, 맞장구 꼴 0/110. 상한을 넘긴 네 문장 차례 하나(preview-1 L2 5)는 다리 둘을 넣다 넘긴 것으로 5회차 N-11 그대로다.
- **대본 느낌이 줄었는가.** 대화 토막은 줄었다: 고정 0/104, 두 바퀴 같은 글 6/104(6%: child-topic 6 · scene-other 5 · 6 · greet-tired 2 · second-session 2 · stuck-three 8). 상황 차례는 줄지 않았다: 고정 35/39(90%), 두 바퀴 같은 글 16/39(41%). 고침 전(19/73)도 같은 두 자리에 몰려 있었으므로 '인사 끝 · 받침의 AI 말을 자기 말로' 라는 설계 1 · 2 의 핵심이 아직 실현되지 않았다.
- **정의 조정 권고(묶음 4-나, Minor).** (1) 고정 문장 차례를 자리별(인사 끝 · 받침 · 대화 토막)로 나눠 보고한다 — 1/10 기준은 수업에 한 번뿐인 인사 끝과 수업 안에서 되풀이되는 받침을 섞어 고칠 곳을 가린다. (2) '같은 대본 두 바퀴에서 같은 글이 나온 AI 차례' 를 더한다(수업을 거듭할 때의 대본 느낌, 지금 39 자리 가운데 16). (3) 되풀이 셈을 상황 차례 밖 AI 차례로 넓힌다(stuck-three 처럼 같은 반응이 세 번 나오는지는 대화 토막에서도 봐야 한다). (4) 범위 밖 낱말 셈이 'word' 는 허용 목록에 있으면서 'words' 를 걸었다 — 실시간 검사와 같은 정규화(복수 · 축약형)를 쓴다. 수치는 목표가 아니므로 기준 1/10 자체는 두되, 판정은 자리별 수로 한다.

## 5 하나씩 본 것

**범위 밖 낱말 25/417.** 'words' 24 는 전부 'Let's learn some new words!'(수업 말), 'sounds' 1 은 'That sounds fun.'(관용 반응). **맥락 낱말 25 · 불필요하게 어려운 낱말 0** → 기준 안. 허용 목록(some · word · …) 후보에 'sound(s)' 를 더할 만하다. 들리지 않음 차례 0/38.

**긴 차례 후보 5 → 사람 0.** ㉠ word-answers L1 1 · L2 1 은 인사 끝 넘김 문장(자기 이야기 · 장면 말이 아님, 셈의 오탐). ㉠ word-answers L2 4 'Oh, juice! The sun is hot! What do you do with the juice?' · L2 8 'Sand on your hands! What do you do with water?' 의 장면 문장은 카드 필수 질문 글의 일부(nospeech 의 붙인 줄과 같은 단위)라 AI 가 보탠 장면 말이 아니다. ㉡ preview-1 L1 4 'Oh, hungry! Me too. Do you want rice or sandwiches?' 는 'Me too.' 한마디 뒤 배고픔을 이어 물은 것이라 화제를 옮기지 않았다. 아이 차례 앞 선생님 낱말 p90 19 로 고침 전 20 이하.

**상황 반응 되풀이 3 → 사람 3(맞음).** stuck-three L1 5 · 7, L2 7 모두 'That's okay! You can do it!' 이 같은 대화의 받침 1(2차례)과 같은 글. 신호 말은 돌려 썼다('Listen, then say it with me!' → 'Say it with me!' → 'Let's say it together!', C207 작동). 즉 앱 몫(신호 말)은 다양하고 AI 몫(반응)은 굳었다.

**소리 줄 자리 밖 1 → 사람 1(맞음, C205 위반).** word-answers L2 8: 갈래 ai · required(필수 4, 노리는 단어 wash)인데 따라 할 말 〈I wash my hands.〉 가 신호 말 'Listen to this, then say it!' 과 함께 나갔다. 지표 규칙(talk-metrics.ts 600~614: 받침 첫째 · 셋째 · 들리지 않음 · next=introduce 만 허용)으로는 자리 밖이고, 고정부 998줄은 "'Chances, new words to introduce' 의 낱말을 처음 꺼낼 때" 를 허용한다. 카드에서 wash 는 newWords 와 필수 4 의 노리는 단어 둘 다여서 AI 는 '꺼내기' 로, 앱은 '필수' 로 봤다. 서버 거름(설계 4)이 이 경우를 거르지 않았다. 같은 자리의 second-session L1 7 · L2 7 은 소리 줄 없이 나갔으므로 AI 쪽 흔들림이고, 거름이 받아야 한다. 아이 귀에는 질문 바로 뒤 답이 들려 '1단계 따라 말하기' 느낌이 그대로다.

**끼움 자동 의심 6 → 억지 0 · 반 4 · 아니요 2.** scene-yes L1 6(집에 간다 → 'Sand is on your hands. What do you do with water?': 다리 없음 + 아이 상태 단정, 반), second-session L1 8(집에 온다 → 식탁 질문, 검사 두 번 걸림, 반), child-topic L2 4(강아지 이야기 중 'Do you like rice and fish?', 반), child-topic L2 5(주스 → 'The sun is hot at the lake. With your family, what do you do?', 장면 다리, 반), scene-yes L2 6('The sun is down. Who is with you at home?' 아이 말을 따름, 아니요), word-answers L1 7(읽지 못함 대신 줄 — 기술 오류 자리, 아니요). **자동이 못 잡은 억지 2** 는 greet-more L2 3 · second-session L2 3(3절 '같은 질문 반복' (가))이다 — 셈 보정 권고: 카드 자리에 붙인 필수 질문의 답 예시 · 노리는 단어가 아이의 바로 앞 말에 있으면 표시.

**기회 알림 둘 → 판정 아님, 까닭 설명됨.** greet-tired(바퀴당 0 < 1 × 0.5): 고침 전엔 대화 첫 질문이 필수 1 이라 네 차례 대본에서도 1 이 셌고, 지금은 장면 여는 질문이 그 자리를 대신해 짧은 대본에서 바퀴당 하나가 준다. scene-other(1 < 3 × 0.5): 고양이가 두 차례를 쓰고, 아이가 필수 2 · 3 의 답('I drink the juice.' · 'We go to the lake.')을 묻기 전에 먼저 말해 AI 가 이어 물었다. 둘 다 끼움으로 풀 일이 아니다(C172 · C188). 다만 **아이가 묻기 전에 한 필수 답을 '다룸' 으로 세지 않아** 뒤에 그 질문을 다시 붙이는 일(second-session L1 8 의 필수 1, 3절 (가))과 이월로 이어진다 — 7절 I-2.

## 6 기준선 (가)(나) 대비

**나아진 자리(고침 전 → 지금).**
1. 둘째 차례 오판 넷이 사라짐: 고침 전 greet-fine 2 'Yes.' · greet-tired 2 'Yes.' · scene-no 2 'No.' · scene-yes 2 'Yes!' 가 모두 막힘 → 'That's okay! Let's say it together.' + 〈We eat rice and fish.〉 였다(첫 질문이 wh 꼴 필수 1). 지금은 장면 여는 질문(예 · 아니요)에 여덟 번 모두 답으로 받아 이어 물었다(16/17 자동, 사람 17/17).
2. 들리지 않음: 'I couldn't hear you. That's okay! Let's move on.' ×4 → 네 가지 다른 말, 아이 탓 0.
3. 답 소리 자리 밖 12 → 1(고침 전은 이어 묻는 고르기마다 〈It is cold.〉〈It is hot.〉 를 들려줌).
4. 신호 말이 돌려 쓰임(고침 전 없음).
5. 첫 문장 p95 2347 → 2026ms, 턴 전체 p95 4367 → 3881ms, 선생님 말 양 4.89 → 4.78.
6. 되풀이가 노리는 동사를 담음(6회차 N-10 유지): 'You drink juice!' · 'You go to the lake!' · 'You eat apples!'.

**같은 자리.** 인사 끝 고정(9/12 → 21/24, 같은 비율) · 받침 반응 고정(글만 'Let's say it together.' → 'You can do it!' 로 바뀜) · 되풀이 4 → 3 · 'Do you like X?' · 'A or B?' 꼴 질문이 AI 질문 121 가운데 약 37(고침 전과 같은 버릇, 재질문 다시 쓰기가 'like' 로 떨어지는 5회차 N-3).

**나빠진 자리.**
1. 응답을 읽지 못함 0/77 → 3/154(word-answers L1 7 · L2 2, stuck-three L2 5). 출력 246~248 토큰에서 구조 검증에 걸린 듯하나 기록에 원문 · 사유가 없다. 대신 줄은 칭찬 한마디('Very good!' · 'Wow!' · 'Nice!')에 뜻 없음, 'Huh?' 에 'Nice!' 는 들은 척이다.
2. 검사 두 번 걸림 → 카드 자리 1 → 7(바퀴당 0.5 → 3.5). AI 가 이어 묻기를 더 시도하면서 노리는 단어(18/33) · 3인칭 꼴 · 길이에 걸리고, 둘 다 걸리면 다리 없는 카드 질문이 붙는다. 그 가운데 둘(greet-more L2 3 · second-session L2 3)은 방금 한 말을 되묻는 질문이 됐다.
3. 재질문 13 → 33(바퀴당 6.5 → 16.5). 첫 문장 지연은 늘지 않았으나 호출당 비용이 재질문 몫만큼 든다(0.617 → 바퀴당 0.571 + 재질문, 운영 값 표).
4. 되묻는 고르기 재발 1(word-answers L2 7, 4회차 N-1).

## 7 종합 판정과 고칠 것

**조건부 통과(수정 필요).** 설계 8 의 '사람 판정 0 항목' 가운데 막힘 판정 틀림 1 · 답 먼저 2 · 억지 끼움 2 가 남고 되풀이 3 이라 글자대로는 통과가 아니다. 그러나 남은 것은 모두 상황 차례 · 카드 자리 고르기 · 거름 한 곳의 문제이고 대화 토막 자체는 요청자 목표('실제 선생님과 이야기한다고 느끼는 것')에 고침 전보다 가깝다. 아래 Important 여섯을 고친 뒤 r2(걸린 대본 일곱: word-answers · stuck-three · greet-more · second-session · scene-other · preview-1 · scene-yes × 2바퀴 ≈ 100호출 · 약 0.7달러)로 재판정하고, 그 뒤 iPad 시험을 부탁한다. iPad 검증 완료는 마이크 우회 뒤(C210 · C211 (5)).

| 번호 | 심각도 | 묶음 | 고칠 것 | 근거 차례 |
|---|---|---|---|---|
| I-1 | Important | 1(고정부) · 2(대신 줄) | **상황 차례의 AI 말이 예문 그대로다(인사 끝 21/24 · 받침 14/15 · 들리지 않음 7/8).** 고정부의 '그대로 쓰지 않는다' 줄(1003)은 effort low 에서도 medium 에서도 듣지 않는다(8절). 권고 둘: (가) 상황 차례 예문을 통째로 주지 않고 턴 번호로 하나씩 돌려 보인다(상황 줄과 같은 돌림) — 베껴도 수업마다 다른 말이 된다. (나) 앱 검사에 '이 대화에서 이미 쓴 반응과 같은 글 · 예문과 같은 글' 을 더해 걸리면 아직 안 쓴 상황 줄로 바꾼다 — 되풀이 0 을 앱이 보장. 인사 끝은 (가)만으로도 'Let's learn some new words!' 24/24 가 풀리는지 r2 에서 본다 | 인사 끝 전 대본 1차례, stuck-three L1 2 · 5 · 7, preview-1 L1 2 · 3 · L2 2 · 3 |
| I-2 | Important | 1 · 2(카드 자리 고르기 · 기회 셈) | **카드 자리가 아이가 방금 답한 필수 질문을 붙인다.** 검사 두 번 걸림의 대신 줄이 '남은 기회 가운데 맨 앞' 을 고르는데, 아이가 묻기 전에 그 답을 말한 경우를 보지 않는다. 권고: 아이 말이 남은 필수 질문의 노리는 단어 · 답 예시에 닿으면 그 기회를 '다룸'(또는 '아이가 먼저 말함')으로 세고 카드 자리 · 이월에서 뺀다(늦은 카드 답 lateCardAnswerOf 와 같은 자격). 기회 알림 둘의 까닭 셋째도 같은 셈이다 | greet-more L2 3, second-session L2 3(되묻기), second-session L1 8 · scene-other(필수 2 · 3 을 아이가 먼저 말함) |
| I-3 | Important | 2(실시간 검사 뒤) · 4-가(기록) | **응답을 읽지 못한 차례 3 과 그 대신 줄.** (가) 원인: 기록에 원문 · 검증 사유를 남겨(talk-observe · ai_calls error_code) 어느 칸이 깨지는지 본다 — 고침 전 0/77 이라 이번 변경이 넓힌 출력 칸 쪽을 먼저. medium 까지 합치면 6/308 이고 모두 한 낱말 · 막힘 꼴 입력('Rice.' ×3 · 'Big.' · 'Huh?' ×2) 바로 뒤라(8.2) 한 낱말 입력에서만 달라지는 칸의 검증부터. (나) 대신 줄: 1~3단계 칭찬 대사 · 안전한 대사도 뜻을 붙인다(한글 해석 없음 재발). (다) 아이 말이 막힘 꼴('Huh?')이면 칭찬이 아니라 중립 상황 줄을 쓴다 | word-answers L1 7 · L2 2, stuck-three L2 5 |
| I-4 | Important | 1(고정부 child_kind 예) · 2(앱 무름) | **'Rice.' 를 막힘으로 봄(C204 (2) 의 예 그대로).** 6회차 8.2 가 권한 고정부 예('선생님이 방금 말한 것을 꾸미는 한 낱말은 short_related') 에 더해, 앱 안전망(C204 (3) effectiveStuckOf)을 '한 낱말이라도 카드 · 장면 낱말이면 무른다' 로 넓힌다 — 한 낱말 장면 말의 오판이 5회차 뒤 두 번째(6회차 'Big.' · 이번 'Rice.')이고 틀리면 아이가 상관없는 답을 따라 하게 되는 비대칭이 크다 | word-answers L1 2 |
| I-5 | Important | 2(서버 거름) · 5(짝 시험) | **필수 질문 차례에 따라 할 말이 나감(C205).** 서버 거름이 next=required 차례의 model_line 을 버리게 하고, 거름과 지표 규칙(soundOutsideOf)이 같은 순수 함수를 쓰게 짝 시험에 넣는다. '꺼낼 새 단어' 가 newWords 전부인지 준비에서 건너뛴 낱말인지도 한 줄로 정한다(고정부 998줄과 설계 4 의 뜻 맞추기) | word-answers L2 8(second-session L1 7 · L2 7 같은 자리는 소리 줄 없음) |
| I-6 | Important | 1(고정부) | **되묻는 고르기 · 같은 질문 재발.** 924줄 규칙이 있어도 'Big.' → 'Is the lake big or small?', 'Yes I like fish.' → 'Do you like the fish?' 가 나왔다. 앱 거름(choicesEchoChild)은 소리 선택지만 보고 질문 글은 안 본다 — 질문 글에 아이의 바로 앞 낱말이 든 'A or B?' · 'Do you like X?' 를 걸어 재질문(C203) 길로 보낸다 | word-answers L2 7, preview-1 L1 7 |
| M-1 | Minor | 1 | 받침 둘째 예('Let me ask in a new way.')를 받침 첫째에 써 말과 행동(답 소리 재생)이 어긋남. 자리별 예를 섞지 않게 사용자 메시지에 '지금 자리' 를 더 세게 | word-answers L2 3 |
| M-2 | Minor | 1 | 길이 상한 재질문이 문장을 비틀어 말이 안 됨('Is the lake with your family?' ← 'Do you go to the lake with your family?' too_long). 다시 쓰기 지시에 '낱말을 줄이되 구조는 두라' 한 줄, 또는 3단계 길이 상한(설정값) 재검토 | scene-yes L1 5 |
| M-3 | Minor | 1 | 아이 상태 단정 'Sand is on your hands.'(C202 (3)). 카드 글 'Sand on your hands!' 자체도 M-5(열림) | scene-yes L1 6 |
| M-4 | Minor | 1 | 네 문장 차례(상한 3, N-11 그대로) | preview-1 L2 5 |
| M-5 | Minor | 4-나 | 지표 정의 조정 넷(4절) · 끼움 자동 셈 보정(5절) | — |
| M-6 | Minor | 2 | 상황 줄 돌림이 턴 번호 기준이라 두 바퀴 같은 자리에 같은 줄('Oh no, my ears! Here is the answer.' nospeech L1 5 · L2 5). 수업 번호를 섞는다 | nospeech L1 5 · L2 5 |
| M-7 | Minor | 1 | 'Do you like X?' · 'A or B?' 꼴이 AI 질문의 약 30%. 재질문 다시 쓰기에 '무엇을 · 누구와 · 어디서' 꼴을 먼저 들게 한 줄(5회차 N-3 의 버릇) | word-answers L1 4 · 5 · 8, scene-no L2 5 등 |

확인한 것(닫힘 · 유지): 지어낸 경험 0, 요약 밖 기억 0(켬 2 · 끔 1), 말을 위한 말 0, 맞장구 꼴 0/110, 불필요하게 어려운 낱말 0/417, 나간 답 글 0, 신호 말 겹침 0, 호출 수 고침 전과 같음(바퀴당 77), 첫 문장 p95 기준 안, 기술 오류 자리의 말에 아이 탓 0, 장면 여는 질문 뒤 이어 물음 17/17(사람).

## 8 덧붙임(판정 중 도착한 바퀴 · 컨트롤러 요청 둘)

### 8.1 둘째 세션 끔 바퀴 — 요약 밖 기억 0

`ai-scope-second-off/`(talk.greeting_recall=off 한 바퀴, 요약 '좋아하는 과일과 놀이 · I like apples. · 사과, 공놀이'). 여덟 차례 모두 지난 대화를 말하지 않았다: 인사 끝 'Good to hear! Let's learn some new words!', 2 'Cool, you ride a bike! Do you ride with your mom?', 4 'Oh, apples! You like apple juice! Do you like it cold?'(사과는 아이가 방금 말함), 5 'Nice, you drink the juice! Who drinks with you?', 8 'Oh, you come home! Is home near the lake?'. **요약 밖 기억 0**(켬 2바퀴 + 끔 1바퀴 = 0/3). 켬 2바퀴에서도 요약의 것(사과 · 공놀이)을 꺼낸 차례가 0 이라 켬 · 끔이 같은 대화를 냈다. AC-2 (라) 의 '0 이어야' 는 만족하고, '켬에서 꺼내는 것' 은 하한이 없으므로 판정이 아니다. 다만 켜기(설계 9 '요약 밖 기억 0 확인 뒤 13절 한 줄과 함께 켠다')의 근거로 쓰려면 꺼낸 표본이 하나는 있어야 하므로, r2 에서 둘째 세션 대본의 인사 답을 '사과를 먹었다' 꼴로 하나 더 두어 켬이 요약을 쓰는지 보기를 권한다(호출 8 · 0.1달러).

### 8.2 low 대 medium 아이 눈(가림 아님: 파일 이름에 effort 가 적혀 있어 A · B 를 가릴 수 없었다. A = low r1, B = medium 두 바퀴, `ai-scope-medium/`)

자동 지표(B): 고정 문장 30/143 · 되풀이 2 · 맞장구 꼴 1/108 · 이어짐 112/126 · 범위 밖 27/418 · 장면 뒤 16/18 · 긴 차례 후보 6 · 1 · 0 · 자기 이야기 3 · 첫 문장 p95 1848ms(A 2026) · 재질문 34(A 33) · 검사 걸림 6(A 2) · 두 바퀴 비용 1.11달러(A 1.14). **이 표본에서 medium 은 느리지도 비싸지도 않았다.**

| 대본 | A(low) | B(medium) | 아이 눈 | 까닭 |
|---|---|---|---|---|
| scene-other(고양이) | 두 바퀴 다 한 턴 뒤 끊김('A white cat! So pretty.' + 식탁 카드) | 두 바퀴 다 이어감: 'A white cat, so cute! Is your cat at home?', 'What do you do with your cat?' → 'Is your cat big or small?' | **B** | B 는 다시 쓰기가 be 동사 꼴로 통과해 아이 이야기가 두 턴 산다. B L1 은 필수 질문을 하나도 안 꺼냈지만 C172 대로 문제 아님 |
| child-topic(강아지 · 축구) | L1 'Is the lake big, too?' 다리, 같은 질문 0 | L1 'Is your dog at the lake?' 다리는 좋음. L2 4 'What do you do at the table?' 가 3 의 카드 질문을 같은 말로 두 번째, L2 8 'What do you do with the juice?' 는 5 에서 아이가 'I drink the juice.' 라 답한 기회를 다시 물음. L1 6 'Oh, soccer! Me too! With your family, what do you do?' 는 자기 이야기 뒤 다리 없는 카드 | **A** | B L2 에 같은 질문 꼴 둘(I-2 · 924줄 규칙) |
| word-answers(낱말 답) | L1 'Rice.' 막힘 오판 1, L2 'big or small?' 되묻기 1, 읽지 못함 2 | 'Big.' 을 두 바퀴 다 막힘으로 봄('Oh, big!' + 'Say it with me!' + 〈We go to the lake.〉, 6회차 8.2 의 그 자리), 읽지 못함 2('Rice.' 두 바퀴), L2 8 'You wash with water!' 로 필수 4 의 노리는 단어를 질문 앞에 말함, L1 8 따라 할 말 자리 밖 같음. 되풀이 'You drink juice at the table!' 은 A 보다 풍성 | 비김 | 둘 다 조건부. 막힘 오판은 effort 와 무관(I-4 앱 무름 필요) |
| stuck-three(받침) | 'That's okay! You can do it!' ×3 | 'That's okay! We can do it together!' · 'That's okay!' ×2(되풀이 1) · L2 'That's okay! We can do it!' ×2(되풀이 1). 6 'Yum, cold juice! Do you drink juice at home too?' 는 아이 말을 따름 | B 조금 | 예문 베끼기는 같고 섞는 폭만 넓음 |
| greet-fine · greet-more(카드 되묻기) | L2 3 둘('We eat rice and fish.' 뒤 식탁 카드) | **넷**(greet-fine L1 3 · L2 3, greet-more L1 3 · L2 3 모두 같은 되묻기) | A 조금 | I-2 는 effort 로 풀리지 않고 더 자주 남 |
| scene-yes | L1 5 말 안 되는 문장, L2 좋음 | 'What is in your cup?' · 'What do you have with the fish?' · 'The sun is down. What do you do at home?' 처럼 노리는 단어를 말하지 않고 끌어내는 질문이 셋. L2 5 'Where do you and your family swim?' 는 주스 답 뒤 수영으로 되돌아감 | B 조금 | — |
| 인사 끝 | 21/24 예문 그대로 | 20/24 예문 그대로('Oh, soccer! Fun!' 하나 더 다름) | 같음 | I-1 은 effort 와 무관 |
| 들리지 않음 · 신호 말 | 예문 셋 차례대로 | 같음(L2 5 원문 'Oops, sorry, I can't hear it well.' 상황 줄로 바뀜) | 같음 | 앱 몫 |

**결론.** 아이 눈 차이는 대본마다 엇갈리고(B 가 나은 둘 · A 가 나은 둘 · 비김 셋) effort 가 판정을 바꾸지 않는다. 7절의 Important 여섯은 두 effort 에서 똑같이 나타나므로(인사 끝 고정 20~21/24 · 받침 예문 베끼기 · 읽지 못함 3/154 씩 · 카드 되묻기 2 → 4 · 따라 할 말 자리 밖 1 씩 · 한 낱말 막힘 오판) 고정부 · 앱 몫이고 effort 몫이 아니다. 권고: 지금 effort 를 바꾸지 않고(C211 (5) 그대로) I-1~I-6 을 고친 r2 뒤에 같은 대본으로 한 번 더 견준다 — 이 표본에서 medium 의 지연 · 비용 반대 근거가 사라졌으므로 그때는 품질 차이만 보면 된다. B 가 더 나았던 자리(고양이 두 턴 · 노리는 단어 없이 끌어내는 질문)는 다시 쓰기 지시 한 줄(M-7)로 low 에서도 얻을 수 있는지 r2 가 보여 준다.

**새로 보인 단서(I-3 에 더함).** 읽지 못한 응답은 두 effort 를 합쳐 6/308 이고 **모두 한 낱말 · 막힘 꼴 입력 바로 뒤**다: 'Rice.' ×3(low L2 2, medium L1 2 · L2 2), 'Big.' ×1(low L1 7), 'Huh?' ×2(low L2 5, medium L2 5). 긴 말 뒤에는 0/250 이다. 한 낱말 입력에서만 달라지는 출력 칸(아이 말 갈래 · 되풀이 · 막힘 · 설명)의 검증을 먼저 본다.

## 9 아이 눈 소감(세 줄)

"자전거 타?" 에 "응" 하면 "가족이랑 타?" 로 받아 주고, 강아지 · 고양이 · 축구 이야기를 하면 한두 번은 정말 물어봐 준다. 못 들었을 때 "내 귀가 이상하네" 하는 선생님은 사람 같다. 그런데 수업을 시작할 때마다 똑같이 "다행이다! 새 단어 배워 보자" 하고, 모르겠다고 할 때마다 "괜찮아! 넌 할 수 있어!" 를 세 번 되풀이하고, 내가 "밥이랑 생선 먹어" 라 했는데 "식탁에서 뭘 해?" 라고 다시 물을 때는 대본을 읽는 선생님으로 돌아온다.
