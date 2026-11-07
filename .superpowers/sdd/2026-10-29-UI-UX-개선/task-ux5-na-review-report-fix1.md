# 재검토 보고: UI · UX 묶음 5-나 fix 1(검토자 · Opus · xhigh, 2026-10-30 03:2x, fix 라운드 1/3)

판정: **Approved** · M2 ADDRESSED · NOT ADDRESSED 0 · 새로 깨뜨린 것 없음. 범위는 M2(배치 서버 기술 오류 갈래 시험)뿐이다. M1(겹친 단추)은 지시대로 7-가 와 함께 정할 비차단 항목으로 남는다.

## M2 ADDRESSED — 근거
- **옮긴 순수 함수가 서버 전 동작과 같다.** soundSpareAllowed(core/placement/adaptive.ts:70-84)는 '본 문항 · 듣기 또는 따라 말하기 · 같은 번호 예비 있음'으로, 지운 isSoundItem(item.type listening · repeat)과 techSpareOf 의 옛 식과 같다. placementCorrectCount(:87-95)는 옛 totalScore 식(`!repeatFailed && !techError && correct` 의 수)과 글자까지 같다. 서버는 techSpareOf(server/placement/index.ts:299-309)가 새 함수를 그대로 부르고, totalScore(:739)가 placementCorrectCount 를 부른다. invalid 조건(기술 오류인데 예비로 못 넘김 · 실패 3회와 함께, :660-665)과 채점 생략 · 점수 null · 기록 칸 techError 는 바뀌지 않았다. 다른 동작 변경은 없다.
- **단위 시험 둘이 갈래를 단언한다.** placement.test.ts:289-315 'AC-23a R-56 배치: …'가 본 문항의 듣기 · 따라 말하기는 참, 예비 문항 · 예비 없음 · 소리 아닌 넷(picture · fact · copy-tiles · dictation)은 거짓임을 본다. :317-329 'AC-23a R-56 배치 총점: …'가 기술 오류 · 실패 3회 · 틀림을 빼고 맞힌 답만 세는지(5개 중 2), 빈 목록 0 을 본다. 직접 돌려 placement.test 15건 통과를 봤다.
- **통합 시험 둘의 기대값이 시험 자료와 맞는다(정적).** 같은 파일의 기존 시험 '예비 문항을 쓴 말하기 배치 …'(:368-391)가 보이듯 시험 시드의 말하기 배치 첫 문항은 따라 말하기 본 문항이고 같은 번호 예비가 있다. 그래서 techSpare 참 → 기술 오류 뒤 같은 번호 · 같은 단계 예비(techSpare 거짓, isSpare 참), 시도 점수 null · input `{ techError: "speak_fail" }`(서버가 쓰는 꼴, :708-710), 기록 [0] main · techError · correct 거짓, 총점 = 답 수 − 1 이 서버 동작과 맞는다. 거부 시험은 실패 3회 + 기술 오류 · 빈 입력(스키마 refine → :584-585 invalid) · 예비의 기술 오류 · 읽기 문항의 기술 오류를 보고, invalid 는 기록을 남기지 않아 순서대로 보내도 본 문항이 그대로다. tsc 에서 placement 관련 오류는 0 이다. 실행 확인은 첫 CI 통합 실행 몫이다.
- **다른 묶음 파일을 건드리지 않았다.** fix 1 이 고친 파일은 adaptive.ts · server/placement/index.ts · 시험 둘(모두 03:15)이다. 0-라(pace · paced 01:15~16) · 5-가(session-frame 02:21 · family-board 02:40) · 가르치고(attempt.ts 02:52)는 그 전 시각 그대로다. 새 core 파일은 없고 기존 core 모듈에 순수 함수만 더해 의존 경계 안이다(check:deps 위반 0, 구현 보고).

## 판정
**Approved**(fix 라운드 1 에서 닫힘). 남은 것: M1(7-가 와 함께) · 통합 시험 둘의 첫 CI 실행 확인.
