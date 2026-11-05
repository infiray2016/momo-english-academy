# 코드 검토 보고: UI · UX 묶음 2-나 토큰 밖 색 걷기 · 아이콘 획 · 듣는 중 고리(검토자 · Opus · xhigh, 2026-10-30 02:4x)

판정: **Approved** · Critical 0 · Important 0 · Minor 1. 범위는 구현 보고의 파일이고, 다른 묶음 변경과 섞인 파일(세션 조각 · 첫 실행 · 말하기 단추)은 색 · 획 · 고리 줄만 판정했다. 시험은 다시 돌리지 않았고, 다른 손 때문인 lint · tsc 실패는 판정에 넣지 않았다.

## 1. 설계 준수
- ✅ 색만 바뀜: activities/* · answer/{tiles,typing,choice} · access-code-form 의 diff 는 기본 팔레트 → 토큰(neutral-900 · 700 → ink, neutral-500 → ink-soft, white → paper), [#FFFDF7] → bg-paper, strokeWidth → ICON_STROKE 뿐이다. 세션 조각 넷과 첫 실행도 색 · 획 줄만 이 묶음 몫이고(bg-cork/20 → bg-desk 한 곳 포함), 문구 · 동작 · 구조(가르치고 라-2 가 고칠 자리)는 그대로다.
- ✅ 색 종이 위 뜻 줄 ink(NFR-U1 · 5.1): 화면 소스(dev 뺌)에 text-ink-soft · text-ink/70 같은 옅은 글자가 없다. ink-soft 는 종이 위 테 둘(access-code-form.tsx:80 입력 테 · common.tsx:159 점선 빈칸)에만 쓰이고, 종이 위 8.27:1 이다. 고쳐 쓰기 원문 줄은 text-ink/70 → text-ink 로 바뀌어 색 종이 위 대비가 섰다.
- ✅ 듣는 중 고리 · 소리 물결(5.1): 남은 시간 고리가 conic talk-deep 이고(speak-button.tsx:166, HEAD 는 ink) 소리 물결 표지가 text-talk-deep 이다(:199). 셈해 보면 종이 위 3.57:1, 먹색 단추 위 약 4.2:1 이라 글자 아닌 표시의 3:1 을 넘는다.
- ✅ 아이콘 획: ICON_STROKE 정의를 common.tsx 로 옮기고 board.tsx 가 다시 내보낸다. common 은 board 를 들이지 않아 순환이 없다(check:deps 위반 0). MARK_STROKE(3)를 지우고 같은 상수를 쓴다.
- ✅ cork 토큰을 지웠다(사용처 0). 옛 tape 는 회화 파일이 써서 남겼다(정한 것 4).
- ✅ 남은 날값 색: src/app/(child)/page.tsx:66 의 주석 안 목업 값 하나이고 화면 값이 아니다. 2-다 design-color 규칙은 주석과 src/app/dev 를 빼야 한다(ux-tokens 새 시험도 같은 기준).
- ✅ ai-rest 한 줄(2-가 M1): ai-rest.tsx:20 이 stuck-buttons 에서 단추 차례를 가져온다. 수업 목록(lesson-board · past-lessons) · 결과(result-view)와 그 의존(use-lesson-start · lesson-start-text · attempt-queue · reward · wait-hint · board)을 따라가면 mic-blocked · mic-state · lib/speech 로 가는 import 가 없다. 빌드는 다른 손 형 오류로 못 돌려 정적으로만 확인했다.

## 2. 잘한 점
- 바꾼 자리를 plan 수(팔레트 28 · 날값 셋 · cork 하나)와 맞춰 셌고, 2-다 가 막을 것을 단위 시험으로 미리 잠갔다(ux-tokens '날값 색 · 기본 팔레트 없음' · '2-나 파일의 strokeWidth 는 ICON_STROKE').
- 회색 단계를 토큰으로 옮기는 규칙을 보고에 적어(글자는 ink, 종이 위 테만 ink-soft) 다음 묶음이 같은 기준을 쓸 수 있다.

## 3. 지적
Critical · Important 는 없다.

Minor
- **M1 흐림(opacity)으로 옅게 한 글자가 남아 2-다 대비 훑기와 부딪칠 수 있다.** 틀린 보기 opacity-70(choice.tsx:143 · reading.tsx:367), 낱말 칩 disabled 흐림(writing-composition.tsx:513), 따라 말하기 읽는 중 단추 opacity-50(speak-button.tsx:184, 구현자 우려 2)은 색 클래스가 아니라 이 묶음 범위 밖이지만, 글자 대비를 7:1 아래로 내린다(먹색 70% 를 종이에 얹으면 약 5.8:1). NFR-U1 의 예외는 '흐린 단추 글'뿐이다. 2-다 대비 훑기 브리프에 이 넷을 흐린 단추로 볼지(그러면 5.2 흐린 단추 꼴 ink-off 로 맞춤 — 묶음 5) 대비 위반으로 볼지를 적어 두길 권한다.

## 4. 구현자 우려 다섯
1. 소리 물결 talk-deep: spec 5.1 그대로라 결함이 아니다. 시안 ② 의 연두 막대와 견주는 것은 7-가 화면 검토 몫이다.
2. 읽는 중 단추 opacity-50: M1 에 묶었다. 누를 수 있는 단추라 '꺼진 단추'의 5.2 규칙 밖이고, 꼴 맞춤은 묶음 5 가 맞는 자리다.
3. speaking.spec 낡은 주석: 단언이 맞아 결함이 아니다. 그 파일을 다음에 고치는 묶음이 한 줄 고치면 된다.
4. Tailwind 기본 그림자(shadow-md · shadow-sm): 5.2 그림자 토큰으로 바꾸는 일은 화면 가족 묶음(5-가)이 맞다. 색 걷기 범위가 아니다.
5. 회색 → 토큰 규칙(점선 빈칸 테가 조금 진해짐): 정보 표시가 또렷해지는 쪽이라 결함이 아니고, 눈에 거슬리는지는 7-가 가 본다.

## 5. 판정
**Approved.** 비차단: M1(2-다 브리프 한 줄 · 묶음 5).
