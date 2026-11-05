# 코드 검토 보고: UI · UX 묶음 3 홈 카드 넷 · 홈 위 띠 · 수업 목록 위 띠 · 영역 그림 · 홈 작은 초상(검토자 · Opus · xhigh, 2026-10-30 03:0x)

판정: **Approved** · Critical 0 · Important 0 · Minor 2. 범위는 구현 보고의 파일과 브리프 밖 셋이다. 시험은 다시 돌리지 않았고, result-view 'reward is not defined' 실패 여섯(5-가 진행 중)은 판정에 넣지 않았다. 통합 · e2e 는 정적으로 대조했다.

## 1. 설계 준수
- ✅ [승인 UX2] · R-4: 홈 카드에서 UnitCells · Bar · RecentCells 가 빠졌고, 카드는 머리(영역 이름 + 회화 작은 초상) · 단계(크게) · 영역 그림 · 오늘 자리 · 아래 끝 큰 단추다(home-cards.tsx:215-346). 단원 5칸 · 막대는 목록 위 띠로 갔다. '이번 주 n일'은 보통 카드에 남고 첫 사용 꼴에서 숨는다.
- ✅ 첫 사용 꼴(R-4 · R-6 · C179 (1)): homeTodayOf(:162-178)가 끝낸 세션 없는 영역에 '첫 수업을 해 봐요' 한 줄만 돌리고(0 · 이번 주 · '오늘 아직이에요' 없음), 배치 전 카드도 첫 사용이면 이번 주를 숨긴다.
- ✅ R-8 회화 카드: 영역 이름 옆 TeacherPortrait shape="window" 56px(:61 · :228-236, 4-가 조각을 고치지 않고 씀), 고르기 전 null 이면 글자 동그라미 '선'이다. 오늘 자리는 오늘 이야기 제목이고 오늘 완료면 그 위에 표지, 큰 단추는 '이야기 고르기'다. 제목은 목록의 '여기부터 해요' 회화 수업과 같은 입력 · 같은 판정으로 읽고(lesson-list/index.ts:269-287), 오래 멈춘 세션을 닫지 않고 빼고 본다.
- ✅ R-12 위 띠: 왼쪽 '[홈 이름]의 공부 보드', 오른쪽 HomeBandChips(:103-143)가 0-다 homeBandChipsOf 로 연속 → 별 칸을 값 1 이상일 때만 그린다. 0-다 검토 M1(연속 칸 그리는 갈래)이 닫혔다. 얼굴 자리는 두지 않았고 부모 꼬리표는 kraft 종이 테다.
- ✅ R-13 목록 위 띠: ListBandDetail(lesson-board.tsx:161-227)이 단계 · 단원 줄, 단원 5칸, 막대(세 영역은 아는 단어 · 최근 성적, 회화는 아는 단어('말함') · 끝낸 대화 · 친한 정도 n/max)를 그린다. bandBarsOf(state.ts:432)가 끝낸 세션이 없으면 null 이라 막대가 숨는다.
- ✅ 영역 그림: area-art.tsx 의 넷이 시안 ② 기호 il-book-hand · il-pencil-hand · il-speak-hand · il-chat-hand 의 path 와 같고(design-samples.html 과 대조), 색은 fill-/stroke- 토큰 클래스(ink · paper · kraft · tape-1 · postit 넷)다. 토리 · 모모 그림은 없고 aria-hidden 이다. 흔들림 필터 · 빗금을 뺀 것은 새 그림이 아니라 덜어 낸 것이라 5.3 과 어긋나지 않는다.
- ✅ 문구: 설계 6 표의 '첫 수업을 해 봐요' · '여기부터 해요' · '말하기 단계 찾기' · '오늘 다 했어요' · '오늘 아직이에요'를 그대로 쓴다. 새 글 하나는 M1.
- ✅ 셈 옮김: band.ts 의 아는 단어(단어장 상태 · known · 단원 목표 단어) · 최근 성적(정규 · 끝냄 · 회차 시작 뒤, 점수 없는 세션 · 둘째 세션 뺌은 recentCellsOf) 조건이 HEAD 홈 셈(home/index.ts 207-262)과 같다. 끝낸 대화 분모만 복사본 unit.min_lessons → minLessonsOf(배정 수와 큰 값)로 바뀌었는데, 같은 목록의 '잠긴 다음 단원' 셈과 같은 값이라 목록 안에서 서로 맞는다(구현자 우려 6).
- ✅ 0-가 그대로: 닫힌 카드 다시 확인 줄(MicRecheck · micRecheckPressOf), 목록 쉼 한 줄 칸(AiRestLine · restShown)과 selectionKeptOf(lesson-board.tsx:260-267 · :336-348)가 바뀌지 않았다.
- ✅ e2e 정적 고르개: data-star-total(0개 → 1개) · data-streak · data-unit-cell · data-band-bars · data-recent-cells · data-home-portrait · data-story-title · data-week · data-first-lesson 이 모두 화면에 있다. AC-23c 첫 사용 띠(home.spec.ts:299-327)가 0-다 우려 1 을 닫는다.
- ✅ 브리프 밖 셋: lessons/page.tsx 의 band: true 는 세션 시작 · 결과 · 회화가 목록을 읽을 때 띠 질의를 붙이지 않으려는 것이라 맞다. ux-screen-feedback · integration/teacher 시험은 HomeCard 형 · 칸 자리가 옮겨져 같이 고친 것이다.

## 2. 잘한 점
- 오늘 자리 · 띠 칸 · 막대 숨김을 순수 함수로 두어(homeTodayOf · homeBandChipsOf · bandBarsOf) 첫 사용 · 배치 전 · 보통 · 회화 갈래를 단위 시험 열하나가 덮는다.
- 홈의 오늘 이야기 제목을 목록과 같은 판정으로 읽어 두 화면이 다른 수업을 가리킬 일이 없다.
- 띠 질의를 목록 쪽에서만 켜 세션 시작 트랜잭션이 무거워지지 않게 했다.

## 3. 지적
Critical · Important 는 없다.

Minor
- **M1 '연속 n일'은 설계 6 표에 없는 새 문구다(구현자 우려 1).** HOME_TEXT.streak(home-cards.tsx:95)가 시안 ② 띠 글을 옮겼지만 브리프 '새 문구 금지'와 설계 6 표 밖이다. 지금은 값을 넘기지 않아 보이지 않으니, P12 가 값을 넣는 브리프에서 문구를 설계 6 표(또는 13절)에 올려 확정하게 장부에 남기길 권한다.
- **M2 카드 꼴이 열쇠로 고정되지 않는다(spec 5.2 · D-9).** 홈 카드는 TILTS 이름 배열(home-cards.tsx:54 — left · right · slight · right, 5.2 목록의 1° 가 빠지고 1.2° 가 두 번)이고 수업 카드는 화면 차례(lesson-board.tsx:374 TILTS[i])로 기울며, 둘 다 paperKey 를 넘기지 않아 테이프 길이 · 각도 · 색이 영역 색으로만 갈린다. 5.2 '같은 카드는 늘 같은 꼴'은 홈 카드에서는 지켜지지만, 수업 카드는 목록 차례가 바뀌면 기울기가 바뀌고 한 목록의 테이프가 모두 같다. 2-가 보고가 '열쇠 넘기기는 묶음 3 몫'이라 했으니 PostIt 에 paperKey(`${area}:${unit}:${kind}:${lessonNo}` 꼴)를 넘기길 권한다(한 줄씩). 화면 검토의 D-9 판정 전에 하는 편이 낫다.

## 4. 구현자 우려 일곱
1. 연속 칸 글: M1. 2. '오늘 이야기' 이름표 없이 제목만 · 친한 정도 막대 이름: 새 문구를 피한 맞는 선택이고 R-13 '친한 정도 n/10'과 맞는다. 3. 그림 단순화 · 말풍선 종이 색 · 120px: 시각 판단이라 7-가 몫이다. 4. 배치 전 카드도 첫 사용이면 이번 주 숨김 · 그림 · 초상: AC-U3 '0 없음'과 R-4 '카드마다 영역 그림'에 맞는다. 5. 목록 띠를 PaperBand 둘째 줄 안에 그림: 공용 조각을 건드리지 않은 선택이라 지금은 맞고, 띠 아래 칸 분리는 5-가(화면 가족)가 board.tsx 를 잡을 때 정한다. 6. 홈의 질의 넷 안팎 · 분모: 성능은 받아들일 만하고 분모는 위 ✅ 대로 목록과 맞는다. 7. 실행 안 함: 정적 작성이라 첫 CI 실행에서 단언(카드 너비 같음 · 회화 띠)을 고칠 수 있다. 결함 아님.

## 5. 판정
**Approved.** 비차단: M1(P12 브리프 · 장부) · M2(paperKey 두 줄, 컨트롤러 직접 또는 5-가).
