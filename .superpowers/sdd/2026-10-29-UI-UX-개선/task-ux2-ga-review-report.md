# 코드 검토 보고: UI · UX 묶음 2-가 디자인 ② 토큰 · 책상 바탕 · 꾸밈 층 · 공용 조각(검토자 · Opus · xhigh, 2026-10-30 02:2x)

판정: **Approved** · Critical 0 · Important 0 · Minor 2. 범위는 구현 보고가 적은 파일이다. 회화 파일(talk-frame 01:02 · tori 00:46 · teacher-window 10-29)과 활동 조각(activities/* 10-23)은 2-가 시작(01:1x) 뒤 바뀌지 않았다. 시험은 다시 돌리지 않았고, 남아 있던 01:46 빌드로 check:bundle 만 돌렸다(읽기만 함).

## 1. 설계 준수
- ✅ 5.1 색 토큰(globals.css:14-55): postit 넷 #FFDF37 · #88CFFF · #FF9EB9 · #ADF480, ink #262626, ink-soft #5A4C3C, paper #FFFFFB, desk #FBF5E9, kraft #F0E2C4, talk-deep #3F9A2A, tape-1~5, grid · margin-line · doodle(흐림 .8 은 --doodle-opacity)이 표와 글자까지 같다. cork-frame 은 지웠고 cork 는 첫 실행 한 곳(first-run-flow.tsx:733, 2-나 몫)만 남아 정한 것 4 와 맞는다.
- ✅ 대비: 직접 셈(WCAG 상대 휘도)이 표와 같다 — 먹색 글자 종이 15.10 · 책상 13.94 · 노랑 11.43 · 하늘 8.95 · 분홍 7.81 · 연두 11.55 · 꼬리표 11.80, ink-soft 종이 8.27 · 책상 7.63 · 색 종이 4.28~6.33(7 아래라 색 종이 위 뜻 줄은 ink, NFR-U1), talk-deep 종이 위 3.57. 종이색 글자의 큰 단추도 15.1.
- ✅ 5.2 모양: 종이 테 2.6px(--paper-edge), 모서리 셋 카드 16 · 10 · 18 · 12 / 판 14 · 9 · 16 · 10 / 단추 20 · 14 · 22 · 16(:51-53), 그림자 셋 6 7 0 먹색 12% · 6 7 0 10% · 4 5 0 22%(:55-57), 모눈 28px · 여백 선 58px(2px) · 종이 결 한 겹(:65-97), 아이콘 획 2.75(board.tsx:43), 화면 테 없음(ChildScreen).
- ✅ 흐린 단추: BUTTON_BASE 의 disabled 갈래가 종이 바탕 · ink-off 글 · ink-off-edge 테 · 그림자 없음이고(board.tsx:315-320), 갈래 선택자가 먹색 단추 값보다 세다. 값은 oklab 섞기라 sRGB 투명도 42% 보다 조금 진하지만(대략 156 대 164), 흐린 단추 글은 NFR-U1 예외라 화면 검토가 보면 된다.
- ✅ 테이프 열쇠(paper-key.ts:57-66): FNV-1a 에 값마다 다른 꼬리를 붙여 고르므로 같은 열쇠는 같은 꼴이다. 길이 104 × (1 ± 0.12) 다섯 값 · 두께 30 · 각도 −3 + (−3~+3) · 모서리 −34° · 32° · 기울기 −1.4 · 1 · −0.6 · 1.2 · 쪽지 1.4 가 5.2 범위 안이다.
- ✅ 꾸밈 층(decor.tsx): 바탕은 `fixed inset-0 -z-10` 한 장이고(ChildScreen 의 isolate 안 맨 뒤), 낙서 넷은 aria-hidden · pointer-events 없음 · 움직임 없음, 화면 끝 3px 에서 너비 18px 라 옆 여백 24px 안이다. 선은 시안 ② 파일(design-samples.html)의 path 와 같고, 물결만 x · y 를 맞바꿨다. 새 그림 자산이 없다(5.3).
- ✅ 테이프가 글을 가리지 않음: 가운데 테이프는 종이 위 끝에 반(15px) 걸치고 PostIt 위 여백은 pt-9(36px)라 글과 떨어진다. 띠 모서리 테이프는 대부분 띠 밖이다(눈 점검 사진에서 확인).
- ✅ 설계 숫자: 토큰과 파일 머리 상수(paper-key · decor · BAND_TAPE_OFFSET)에만 있고 check:ids design-number 47(기준 49)이다.
- ✅ stuck-buttons 분리: stuck-buttons.ts 는 import 가 없고, app-trouble 은 그 모듈과 board 만 들인다(board → activities/common · decor · paper-key, 음성 없음). 01:46 빌드의 없는 주소 쪽 HTML 이 싣는 첫 JS 열 조각 어디에도 speechSynthesis · webkitSpeechRecognition 이 없고, check:bundle 은 위반 0 이다. 212KB → 87KB 는 구현자의 셈 방식(그 경계 몫만)이라 같은 수로 다시 재지는 못했다.
- ✅ 이름표: TEACHER_LABEL_TEXT 가 새 paper 값이고(structure.ts:384), seed-teacher 'AC-19a' 의 같은 값 단언과 teacher-window.spec 글자색 rgb(255, 255, 251) 가 맞다. 명단 accent 대비 검사는 그대로다.

## 2. 잘한 점
- 토큰 시험이 globals.css 를 직접 읽어 5.1 · 5.2 값과 대비를 셈으로 단언하므로, 토큰 한 줄을 바꾸면 시험이 바로 알린다(ux-tokens.test.ts 의 AC-23e (1) 일곱 건).
- 열쇠 꼴을 값마다 다른 꼬리로 골라 길이 · 각도 · 기울기 · 색이 서로 묶이지 않는다.
- 단추 차례 · 문구를 의존 없는 모듈로 떼고, 앱 오류 판이 막힘 판을 들이지 않는다는 것을 시험으로 잠갔다(stuck-buttons.test.ts:35).

## 3. 지적
Critical · Important 는 없다.

Minor
- **M1 ai-rest.tsx 가 아직 막힘 판에서 단추 차례를 가져온다.** ai-rest.tsx:20 이 stuckButtonsOf 를 mic-blocked 에서 들여서, AiRest · AiRestLine 만 쓰는 수업 목록 · 지난 수업 · 결과 쪽 첫 JS 에 음성 층(mic-state → lib/speech/browser)이 실린다. 보탬의 뜻과 같게 stuck-buttons 에서 가져오도록 한 줄 바꾸길 권한다(동작 같음).
- **M2 대비 시험이 시드 검사 모듈에 기댄다(구현자 우려 6).** ux-tokens.test.ts:19 가 core/seed/check-teacher 의 contrastRatio 를 쓴다. 이름이 바뀌면 시험이 크게 깨지므로 조용히 틀리지는 않지만, 화면 토큰 시험이 시드 검사기에 묶인다. 셈 함수를 core 의 색 모듈로 옮기는 일을 2-다(검사) 때 하길 권한다.

## 4. 구현자 우려 여섯
1. 낙서 18px: 결함 아님. 옆 여백 안에 두라는 5.3 을 지킨 결과이고 크기는 화면 검토(7-가)가 정한다.
2. 표지 둘(data-desk · data-decor): 맞는 나눔이다. 2-다 겹침 훑기 브리프에 '[data-decor] 만 본다'를 적는다.
3. 각도 ±3°: spec · plan 의 ±3° 가 맞다(브리프의 '%'는 잘못 적힌 것).
4. 기울기 이름별 값: 5.2 목록 값으로 맞춘 것이 맞고, 옛 값을 단언하는 시험은 없다(grep).
5. 쪽지 통째 1.4°: spec 5.2 '쪽지 1.4°' · 5.4 와 맞는다. 화면 검토에서 어색하면 NOTE_TILT 한 줄이다.
6. contrastRatio: M2.

## 5. 판정
**Approved.** 비차단: M1(한 줄, 컨트롤러가 직접 해도 됨) · M2(2-다 몫).
