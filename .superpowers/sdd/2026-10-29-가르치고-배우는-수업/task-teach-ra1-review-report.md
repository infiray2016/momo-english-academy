# 코드 검토: 가르치고 배우는 수업 묶음 라-1(자리 조각) — 2026-10-30, 검토자 Opus · xhigh

판정: **Changes Requested** (Critical 0 · Important 1 · Minor 4). fix 라운드 항목은 I1 하나다. 범위는 `src/core/session/teach-line.ts` · `src/components/session/teach/*.tsx` 여덟 · `src/app/globals.css:52-64` · 시험 둘이다. 시험 두 파일은 직접 돌렸다(47 통과, 03:02).

## 1. 설계 준수
- ✅ 화면 표(spec 설계 5): 갈래마다 보이는 것 · 들리는 것 · 아이 행동이 표와 같다.
  - 오늘 배울 것: 초상 · 말풍선 · 영어 토막(EnglishLine) · '시작'을 그리고, 한국어 → 영어 차례로 읽는다.
  - 새 단어: 낱말 · 뜻 · 소리 · 그림 · parts 를 그리고 예문은 없다. 낱말을 차례로 읽은 뒤 선생님 한 줄을 읽는다.
  - 본보기: 칩을 단 문장 · 뜻 · 그림을 그리고, '본보기 → 선생님 한 줄' 차례로 읽는다.
  - 같이 해 보기: 띠 · 빈 자리 · 이름표 · 반응 줄(rightKo · wrongKo) · 칭찬 표지를 그린다.
  - '왜': 한 줄과 틀린 뒤 단추 셋 가운데 하나이고, 다시가 없으면 단추가 없다.
  - 이야기: 글자 없이 저절로 한 번 · '다시 듣기' 한 번 · '다음'이다.
  - 첫 장: 앱 문구 한 줄이다.
- ✅ 문구: TEACH_TEXT(`teacher-line.tsx:65`) · TEACH_SLOT_NAME(`teach-line.ts:16`) · CHIP_NAME(`chips.tsx`)이 spec 설계 5 '정본 밖 문구' 표의 글자 그대로다. 앱 문구와 칩 이름에는 문법 용어 목록(seed/lists/grammar-terms.json, 68 개)의 낱말이 0 건이다(대조함). 칩 이름은 role 에서, 이름표는 askRole 에서 나온다.
- ✅ 조각은 자료와 콜백만 받고 세션 상태를 모른다. 다른 src 파일이 이 조각을 가져오는 곳도 아직 없다.
- ✅ 선생님 줄 상태(teachLineStateOf, `teach-line.ts:50`): played · no_end 면 밝다. not_played 면 멈추고 밝히며, skip_notice 동안 안내를 띄운다(남은 토막은 읽지 않음 — 설계 10 '앱이 읽기를 멈춘다'). skipped 면 그 자리에서 밝고 안내가 없으며 영어 토막은 이어 읽는다. 읽는 중이면 흐리다. no_end 에 안내를 띄우지 않는 것은 0-라 의 들림 구분(소리는 났음)과 브리프를 따른 것이다.
- ✅ 목소리(설계 4): 한국어 줄은 lang ko-KR 로 선생님 감싸기(높이)를 쓰고, 선생님 영어는 teacherSpeech 를 쓴다. 이야기는 감싸지 않은 접점을 쓰고, 그동안 초상 대신 듣기 표시를 둔다. 예외는 M1 이다.
- ✅ NFR-11: 조각은 teacher-window(windowStatusOf · STATUS_BADGE_CLASS)를 가져오고, 그 파일은 teacher-layer 를 가져온다. teacher-layer 는 react 와 순수 함수만 정적으로 가져오고, 3D 는 `import("@/components/teacher/avatar-3d")` 동적 가져오기로만 받는다(`teacher-layer.tsx:347`). ⚠️ 첫 JS 3D 0 은 라-2 가 붙인 뒤 check:bundle 로 확인한다.
- ✅ 칩 토큰(plan 정한 것 15): 여덟 모두 ② 팔레트 토큰을 가리키고 새 색이 없다. 먹색 #262626 과의 대비를 직접 셈하니 who 8.55 · do 10.61 · what 9.71 · where 9.00 · is 8.42 · how 10.07 · end 11.80 · spare 11.55 로 모두 7:1 이상이다. 시험(teach-pieces '칩 토큰 여덟 …')도 7 이상을 단언한다. 한 화면에 함께 나오는 칩끼리는 색이 겹치지 않고, 칩마다 이름이 있어 색만으로 가르지 않는다.
- ✅ 다른 묶음 파일: 같은 시간대에 board.tsx(02:35) · progress.ts(02:42)가 고쳐졌다. 하지만 그 diff 는 UI · UX 묶음 것(아이콘 굵기 · 확인 쪽지 주석)이고 teach 흔적이 0 건이다. StatusLine 은 HEAD 에 있던 것이다. 세션 틀 · 활동 조각 · 선생님 창 · 음성 층 · 시드 · specs 는 손대지 않았다.

## 2. 지적
- **I1 '안내가 두 번이면 무음 모드 줄'을 셀 콜백이 같이 해 보기에만 있다**(우려 4). spec 설계 10 은 '한 세션에서 이 안내가 두 번 나오면 iPad 사파리에 무음 모드 한 줄을 더한다'고 한다. 구현자는 이 셈을 세션 틀(라-2) 몫으로 넘기며 'onEnd 가 {notice}를 넘긴다'고 적었다. 그런데 useTeachLine 의 onEnd 를 밖으로 내는 조각은 TogetherFrame 하나뿐이고, 그 prop 도 `onLineEnd?: () => void` 라 notice 를 타입에 담지 않는다(`together.tsx:168`). 안내가 가장 먼저 · 자주 나는 자리는 오늘 배울 것 · 새 단어 · 본보기 · '왜' · 첫 장이다. 이 다섯은 TodayScreen · NewWordsScreen · ModelScreen · WhyBubble · FirstLine 이고 onEnd 를 받지 않는다. 그래서 라-2 는 이 파일들을 다시 고치지 않고는 설계 10 을 채울 수 없다. 고칠 방법: 다섯 조각과 TogetherFrame 에 `onLineEnd?: (end: { notice: boolean }) => void` 를 내고, useTeachLine 의 onEnd 에 잇는다. 시험은 '들려주지 못함이면 onLineEnd 가 notice true 로 한 번 불린다'(오늘 배울 것 · '왜' 둘)를 더한다.
- **M1 읽기 같이 해 보기의 짧은 글을 글 자료 목소리로 읽는다**(`together.tsx` togetherPartsOf 의 `textEn → voice "material"`). spec 설계 4 목소리 표는 '같이 해 보기 문장'을 선생님 영어 목소리 쪽에 두고, 글 자료는 '읽기 지문 · 짝 글 · 듣기 대본 · 이야기'로 한정한다. 지금은 이 글을 읽는 동안 초상 대신 듣기 표시가 나와, 같이 하는 자리에서 선생님이 사라진다. teacher_en 으로 바꾸기를 권한다(말하기 이야기 storyEn 은 그대로 material).
- **M2 움직임 시범(S4 칩 옮겨 가기 · W3 · W4 카드 움직임)이 없다**(우려 2). spec 설계 2 '보여 주기' 칸(승인 C174)은 '질문의 칩이 답 쪽으로 옮겨 가는 시범' · '카드가 움직여 문장이 되는 시범'을 적었다. 그러니 표본만의 것이 아니다. 지금은 질문 칩을 위에 켜 두고 같은 색 답 칩을 켜거나, 앞 꼴 ↓ 화살표 같은 정적 대응으로 대신한다. 이것으로 충분한지는 화면 검토(Fable max)가 판정하도록 장부에 열린 항목으로 두고, 움직임을 더한다면 prefers-reduced-motion 대체를 함께 둔다. 정적 대응을 '완료'로 닫지 않는다.
- **M3 칩 이름표(한국어)가 lang="en" 문단 안에 있다**(`chips.tsx:143` ChipSentence 의 `<p lang="en">`). 화면 읽기 기능이 '누가' · '하는 일'을 영어 규칙으로 읽는다. 이름표 span 에 lang="ko" 를 달거나, lang="en" 을 영어 덩어리에만 둔다.
- **M4 새 단어가 열을 넘으면 '11개예요'다**(우려 7, `teacher-line.tsx:58~61`). 문구 표의 꼴('새 낱말 다섯이에요')은 우리말 수다. 지금 설정(unit.new_words_per_lesson.1-3 = 5)으로는 앞질러 고른 수업이 못 만난 단어를 많이 더할 때만 닿는다. 열하나 이상도 우리말 수(열하나 · 열둘 …)로 이어 가기를 권한다.

## 3. 구현자 우려 일곱
1. 칩 켜짐 셈: 받아들일 수 있다. '선생님 말에 맞춰 켜짐'의 근사이고, 줄 끝 · 읽지 않음(skipped)에서 모두 켜진다는 것을 시험(teach-line 'AC-3g 줄을 읽기 전에는 … 끝나면 모두 켜진다')이 단언한다. 늦음 정도는 화면 검토에서 본다.
2. 움직임 생략: spec 요구다(M2).
3. cancelled: 타당하다. 아이가 다른 소리(새 단어 카드 · 다시 듣기)를 고른 끊김이라 막지 않고 밝히며, 소리 실패가 아니라 안내도 없다.
4. 무음 모드 줄: 셈을 라-2 에 두는 것은 맞다. 하지만 콜백이 모자라다(I1).
5. teacher-layer 동반: 결함이 아니다(위 NFR-11). ⚠️ 라-2 뒤 check:bundle 로 확인한다.
6. '살펴보기' 대 progress.ts '보여 주기': 지금 결함이 아니다. TEACH_SLOT_NAME 이 문구 표 그대로이고, progress.ts 를 바꾸는 일은 plan 정한 것 16 에 따라 라-2 몫이다. 라-2 브리프에 적는다.
7. 접점이 없으면 흐림: 세션 틀이 늘 접점을 만들므로 막히지 않는다. '11개예요'는 M4 다.

## 4. 시험 · 관문
- 시험 47 의 이름은 모두 AC-3g · AC-N20 을 품는다. AC-N20 의 세 경우(시작 안 함 · ko 없음 · read_ko 끔)를 오늘 배울 것과 '왜' 모두에서 덮고, 이야기 '다시 듣기'가 살아 있는지와 heard(소리 없이 넘어감) 넘김도 덮는다. AC-3g 의 '혼자 · 짝 화면에 초상 없음' · '결과 첫머리' · '첫 JS'는 라-2 · 라-4 · CI 몫이다. 빠진 갈래는 I1 의 onLineEnd(notice) 시험뿐이다.
- 관문(구현자 보고 그대로, 02:4x): lint 종료 0(515 파일) · tsc 종료 0 · test 116 파일 · 1343 통과 · 6 todo · check:deps 위반 0 · check:ids 위반 0(design-number 47, 기준 49, 이 묶음 0) · spec:trace 종료 0(unknown-ac 0).
- 접근성: 안내 줄만 role=status(StatusLine)이고 말풍선은 live 가 아니다. 표지 · 듣기 표시 · 아이콘은 aria-hidden 이다. 새 단어 단추의 이름은 낱말(sr-only) + 뜻이다. 움직임 효과가 없어 줄일 것이 없다. M3 만 남는다.

## 5. 판정
**Changes Requested.** fix 1: I1. Minor M1~M4 는 컨트롤러가 직접 고치거나 장부에 올린다(M2 는 화면 검토 판정 항목).
