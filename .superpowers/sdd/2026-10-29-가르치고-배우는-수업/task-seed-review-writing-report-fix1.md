# 쓰기 3단계 단원 1 정정 1판 재검토(범위 한정) — 설계 · 화면 검토자 보고(2026-10-30 08:1x)

**판정: Approved(적재 가능).** 정정 아홉 줄이 모두 ADDRESSED 이고, 판 칸은 규격대로이며, 새 겹침 'The trains are small.'은 학습에 해가 되지 않는다. 검증기는 이 파일 오류 0 · 경고 0 이다. 정정 2판은 필요 없고, 원하면 아래 3절의 선택 줄 하나로 변형 사이 글자 같은 문장을 하나 줄일 수 있다.

- 파일: `.claude/worktrees/p13d/tests/.tmp/l3-samples/xhigh/lessons/writing/3/1.json`(sha256 앞 16자 `bcb6581b0ec1b2b6` · 211,585바이트, 1판보다 37바이트 작음)
- 정정 기록: `gen-writing-3-fix1.md` · manifest `tests/.tmp/l3-samples/xhigh/manifest/writing-3.jsonl`
- 방법: 1판 때 뽑아 둔 읽기 꼴(26수업 전부)과 정정 뒤 같은 꼴을 diff 해 바뀐 칸만 가려냈고, 1판 때 쓴 전수 검사(카드 = 정답 낱말 · 섞임 · 빈칸 수 = 남은 카드 수 · 칩 글 = 문장 · 수업 안 낱말 짝 · 어휘 범위 · 틀 하나 · 해요체 · 문법 용어 · 가운뎃점)를 다시 돌렸으며, 검증기를 다시 돌렸다. 범위 밖(정정하지 않은 칸의 내용)은 보지 않았다.

## 1. 정정 아홉 줄 — 모두 ADDRESSED

diff 에서 바뀐 칸은 아래 아홉 줄의 칸과 고친 일곱 수업의 맨 위 `correction` 뿐이다. 승인 수업(배정 1 · 변형 1)은 브리프 12절 JSON 과 해시 · 키 차례까지 그대로다.

| # | 수업 · 칸 | 들어간 글 | 함께 고친 칸끼리 맞는지 | 판정 |
|---|---|---|---|---|
| I-1 | assigned:5:v1 teach.models[2] | en `We are glad.` · ko `우리는 기뻐.` · chips [We]thing [are]is [glad]how [.]end · lineKo `we 로 시작해도 are 를 놓아요.` | 칩 글을 이으면 문장과 같음. glad 는 2단계, 이 수업 안 다른 문장에 없음. todayEn · recap 은 model1 그대로라 바꿀 것 없음 | ADDRESSED |
| M-1 | assigned:3:v2 teach.together[0] | cards [the, lamp, is, bright, .] · meaningKo `전등이 밝아.` · accepted [`The lamp is bright.`] · filled [the, lamp, null, null, .] capital true · slot [3, 4] · choices [bright, is] · rightKo `맞아요! lamp 다음에 is 예요.` · wrongKo `lamp 다음에 is, 그다음 bright 예요.` | 빈칸 2 = 남은 카드 2, 남은 카드가 빈칸 정답(is · bright)과 같고 정답 차례와 다르게 섞임, filled 의 채운 칸이 정답 차례. lineKo 는 표대로 그대로. lamp 는 이 수업 안에 없음 | ADDRESSED |
| M-2 | assigned:4:v2 teach.together[1] | cards [the, tents, are, low, .] · meaningKo `텐트들이 낮아.` · accepted [`The tents are low.`] · filled [the, tents, are, low, .] capital false · slot "capital" | filled = 정답 차례 전부, choices 없음. tents 는 이 수업 안에 없음 | ADDRESSED |
| M-3 | reinforce:10:v2 content.items[2] | cards [long, roads, the, are, .] · meaningKo `길들이 길어.` · accepted [`The roads are long.`] · whyKo `roads 다음에 are, 그다음 long 이에요.` | 카드 = 정답 낱말 + "." 한 장씩, 정답 차례와 다름, 조사(long 이에요) 맞음 | ADDRESSED |
| M-3 | reinforce:10:v2 content.items[2].spare | cards [old, are, the, roads, .] · meaningKo `길들이 오래됐어.` · accepted [`The roads are old.`] · whyKo `roads 다음에 are, 그다음 old 예요.` | 같음. long · old 는 이 수업 안 다른 문장에 없음(짝끼리 · 본보기와 낱말 짝 다름) | ADDRESSED |
| M-4 | assigned:1:v2 content.items[0].spare.meaningKo | `교실이 북적여.` | en · cards · whyKo 그대로(고칠 것 없음) | ADDRESSED |
| M-5 | assigned:5:v1 content.items[2].spare.meaningKo | `길들이 새로 생겼어.` | 같음 | ADDRESSED |
| M-6 | reinforce:9:v1 content.items[0].spare | cards [fun, it, is, .] · meaningKo `재미있어.` · accepted [`It is fun.`] · whyKo `it 다음에 is, 그다음 fun 이에요.` | 카드 = 정답, 섞임, fun 은 이 수업 안에 없음, 틀(is) 그대로 | ADDRESSED |
| M-7 | remedial:3:v1 title · teach.todayEn · models[0] · recap | title `기차들이 작아요` · todayEn `The trains are small.` · model1 en `The trains are small.` · ko `기차들이 작아.` · fromEn `the small trains` · chips [The trains]thing [are]is [small]how [.]end · lineKo `'기차들이 작아요'도 무엇, are, 어때요 차례예요.` · recap frameEn `The trains are small.` · chips 같음 | todayEn = recap.frameEn = model1.en, 칩 글 = 문장, fromEn 은 어구 꼴(소문자 · 마침표 없음). 이 수업 안 trains 문장(far · yellow · big)과 낱말 짝 다름. 제목 26개 여전히 모두 다름 | ADDRESSED |

전수 검사 결과(정정 뒤): 승인 수업 해시 같음 · 문항 130 = 짝 130 · 수업 안 낱말 짝 겹침 0 · 글자 같은 문장(수업 안) 0 · 변형 안 다른 수업 사이 글자 같은 문장 0 · 어휘 범위 밖 0 · 앞질러 쓴 단원 단어 0 · unitWords = 쓰임 · 틀 하나 · 선생님 말 문법 용어 0 · 해요체 · 가운뎃점 0 · 보강 덮기 25 · 25.

## 2. 판 칸과 manifest — 규격대로

- **맨 위 `correction` 을 올린 것이 맞다.** 수업 스키마의 판은 수업 맨 위 `seedVersionShape = { revision, correction }`(`src/core/seed/schema/reference.ts` 62줄, `src/core/seed/schema/lesson.ts` 의 `lessonBaseShape` 가 펼침)이고, `GenerationSchema` 는 `strictObject` 라 `generation.correction` 은 모르는 키로 거부된다. 정본 5절(04-데이터 11~13줄)도 "시드 판은 '개정.정정' 두 자리다 … 정정 판은 문제 자체와 정답 표시만 고친 판이다 … 정정 자리는 행마다 센다 … 정정은 고칠 행과 같은 개정 번호에 정정 자리를 하나 올려 만든다(2.0 행을 고치면 2.1) … 판을 올릴 때 바뀌지 않은 칸은 새 행을 만들지 않는다"고 한다. 그래서 고친 일곱 수업만 1.1(revision 1 · correction 1)이고 나머지 열아홉(승인 수업 포함)은 1.0 그대로인 지금 상태가 규격이다. 1판 보고 끝에 내가 "`generation.correction` 을 올리고"라고 쓴 것은 내 잘못이었다. 정정자가 바르게 고쳤다.
- **manifest 정정 줄.** 줄의 briefHash · agentHash · model · effort 가 같은 파일의 start 줄과 같고(같은 판), lessons 일곱이 correction 1 인 일곱 수업과 정확히 같으며, correction 1 · createdOn · reason 이 있다. README 4절(제안)은 start · unit · warning-decision · load 네 줄 종류만 적고 있어 `correction` 은 제안 밖의 새 종류이지만, 검증기는 manifest 폴더를 걷지 않아 막히지 않고 필요한 정보(판 · 고친 칸 · 까닭 · 같은 해시)를 다 담았다. 받되, README 4절에 `correction` 줄 꼴 한 줄을 더하기를 권한다(컨트롤러 몫, 범위 밖). README 는 "쓰는 이는 컨트롤러 하나다"라고 하므로 정정자가 쓴 이 줄은 컨트롤러가 확인한 것으로 두면 된다.
- 적재 때 빠지기 쉬운 것(범위 밖, 참고): 이 뿌리의 `manifest/writing-3.jsonl`(start · correction 두 줄)은 시드 파일을 `seed/lessons/writing/3/1.json` 으로 옮길 때 `seed/manifest/writing-3.jsonl` 로 함께 옮겨야 한다(지금 `seed/manifest/` 에는 writing-3 이 없다).

## 3. 새 겹침 'The trains are small.' — 학습에 해 없음

M-7 로 remedial:3:v1 의 본보기 1 · 되짚기(`The trains are small.`)와 remedial:3:v2 의 다섯째 문항(`The trains are small.` · 기차들이 작아.)이 글자가 같아졌다. 판단은 '해 없음, 두어도 됨'이다.

- 규칙: 6.4 '짝' · '혼자 문항과 본보기의 다름'과 브리프 14절 10 은 **한 수업 안**의 겹침만 막는다. 변형 사이를 막는 규칙은 없고(브리프 10절은 변형끼리 본보기 · 같이 해 보기 · 혼자 문항 · 짝을 주제에 맞춰 달리 쓴다고만 함), 검증기 `teach-differ` 도 수업 안만 본다. 1판 검토에서 M-3 의 `The roads are long.`(reinforce:10 두 변형)을 괜찮다고 한 것과 같은 판단이다.
- 아이: 한 아이는 부모가 고른 묶음 하나의 변형으로 배우고, 다른 묶음의 변형은 '단어 익히기' 상태의 연습 수업과 '이 단원 처음부터'에만 쓴다(정본 6.3 "관심 주제는 시드의 주제 묶음으로 반영한다" 문단). 두 변형의 보강 3 을 다 만나려면 자기 변형의 보강 3 을 받을 만큼 막힌 뒤 다른 변형의 보강 3 이 연습 수업으로 걸려야 하고, 그때 앞서 본 것은 보여 주기의 본보기이며 다시 만나는 것은 카드 조립 문항이다. 쓰기 3단계 조립 문항 130 이 모두 같은 틀이라 같은 문장을 본 이점은 틀을 아는 것 이상이 아니고, 카드 차례를 놓는 일은 그대로 남는다.
- 선택 정정 2판 줄(변형 사이 글자 같은 문장을 하나 줄이고 싶을 때만): remedial:3:v2 content.items[4] — cards `["small","trains","are","the","."]` → `["old","trains","are","the","."]` · meaningKo `기차들이 작아.` → `기차들이 오래됐어.` · accepted `["The trains are small."]` → `["The trains are old."]` · whyKo `trains 다음에 are, 그다음 small 이에요.` → `trains 다음에 are, 그다음 old 예요.`(old 는 remedial:3:v2 안에 없고 `The trains are old.` 는 단원 어디에도 없다. 짝 `The trains are cute.` 와 낱말 짝 다름). 고치면 그 수업도 correction 1(정정 자리는 행마다 셈)이고 manifest 줄의 lessons 에 더한다. `The roads are long.`(reinforce:10 두 변형)은 roads 문장이 단원에 많아 겹침 없는 대안이 없고 해도 없으므로 둔다.

## 4. 검증기

`pnpm -s seed:validate --root tests/.tmp/l3-samples/xhigh --areas writing --json`: 칸 26 · 이 파일 오류 0 · 경고 0. 전체 경고 4 는 `unit-specs.json` 의 `unit-goals`(다른 단계 · 단원의 목표 없음)로 이 파일 밖이다.

## 5. 참고(범위 밖, 고치지 않아도 됨)

- I-1 의 `We are glad.`(우리는 기뻐.)와 remedial:3:v1 의 `We are happy.`(우리는 기뻐.)가 변형 1 안에서 뜻 글이 같다. 다른 수업이고 영어가 다르며 뜻도 맞으므로 둔다. 가르고 싶으면 happy 쪽을 `우리는 행복해.` 로(정정 목록 밖이라 이번에 넣지 않음).
