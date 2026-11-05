# 브리프: 가르치고 배우는 수업 plan(계획자 · Opus · xhigh, 2026-10-29 23:4x)

최종 승인된 델타 spec `intent/2026-10-29-가르치고-배우는-수업/spec.md`(3판, 요청자 최종 승인 C182 — fix 3 로 AC-6g 추가 둘을 넣는 중)와 intent(2판 C169)를 받아 `intent/2026-10-29-가르치고-배우는-수업/plan.md` 를 쓴다. 절차 · 템플릿은 `.claude/skills/plan-build/SKILL.md`. 코드는 `.claude/worktrees/p13d`(머리 0c664c3 위 커밋 전: 불편 1차 묶음 64파일 + 시드 규격 · 검증기 확장(구현자 impl-seed-schema 2판 진행 중 — 보고 `task-seed-schema-report.md`)). 코드 · 정본 · 시드는 읽기만 하고 고치지 않는다. 쓰는 파일은 plan.md 하나다.

## 입력(절대 경로 /Users/hikaru/workspace/momo-english-academy)
- spec 3판 · 고침표 `fix1-changes.md` · `fix2-changes.md`(맨 위 AC 변경 모음) · 곧 `fix3-changes.md`(AC-6g 추가 둘) · 요청자 원문 셋(`docs/research/2026-10-29-가르치고-배우는-수업-intent-요청자-승인-원문.md` · `…-spec-2판-요청자-승인-원문.md` · `…-spec-3판-요청자-최종-승인-원문.md`) · 13절 C169 · C170 · C174 · C175 · C177 · C178 · C182.
- 표본 3판 `samples-l3u1.md`(452줄) · 보고 v1~v3 · 정규 시드 `.claude/worktrees/p13d/seed/lessons/{reading,writing,speaking}/3/1.json` · `seed/unit-specs.json`(3단계 단원 1 goals 다섯) · 구현 보고 `task-seed-schema-report.md`(새 칸 · 검사, 남은 둘) · 장부 `ledger-open.md`(L-1 그림 자산 · L-2 한국어 목소리 · L-3 시간 · L-4~L-10 · L-12 검증 · L-13 칸 · L-14 …).
- 평가 spec 5판 `intent/2026-10-29-학습-평가-체계/spec.md`(근거 칸 · 수준 · A9 잠정 · read_aloud · gloss · 연습 목록) · UI · UX spec 2판과 plan(`intent/2026-10-29-UI-UX-개선/plan.md` — 디자인 ② 토큰 위에 세션 새 자리를 얹는 차례, 커밋 · push 는 회화 적용과 함께 L-19) · 회화 spec 3판(최종 승인 대기 — 선생님 창 · 짧은 준비와의 겹침).
- 코드 현황(읽기만, spec 설계 14 표): `src/core/session/preview.ts`(activitiesOf) · `src/core/session/attempt.ts` · `src/server/session/result.ts` · `src/components/session/reading.tsx` · `writing-items.tsx` · `speaking.tsx` · `src/core/seed/schema/lesson.ts` · `check-lesson.ts` · `solve-check.ts` · `src/core/teacher/roster.ts` · `voice.ts` · `src/core/speech/` · `seed/prompts/_template.md` · `seed/lists/` · `seed/teachers.json` · `tests/`.

## plan 에 꼭 담을 것
1. **첫 묶음(3단계 단원 1 세 영역, 프리뷰)** 을 작은 묶음으로: (가) 규격 · 검증기 마무리(구현자 2판 뒤 코드 검토 · 관문 — 원본 시드 셋 필수 검증(목표 검사 포함) 통과, 경고 우회 · 걷은 사본 금지) (나) 활동 차례 · 시도 꼴(여섯 자리, 짝 활동 고정 번호, 짝 고르기 순수 함수, 이어 하기) (다) 채점 · 틀린 뒤 차례(쓰기 틀린 까닭 가르기 · 색 칸 · 둘째 틀림 정답, 읽기 띠, 말하기 끊어 들려주기 · 허용 답 두 묶음 '높은 쪽' + **의미 검증**(Yes/No 방향 · 핵심 정보 확인 뒤 accepted · acceptedMeaning 가름, 부정 테스트) + **AI 판정과 허용 답의 일관성**(AI '부분'이어도 유효한 acceptedMeaning 이면 의사소통 정답, 혼자 질문(AI)과 짝(앱)에서 같은 응답이 모순 없게 — C182 추가 둘)) (라) 화면(오늘 배울 것 · 새 단어 · 본보기와 칩 · 같이 해 보기 · '왜' 말풍선 · 다른 예시 · 되짚기 결과 첫머리 '오늘 만난 말' · 선생님 초상 · 읽기 지문 늘 함께 · 이야기 다시 듣기 · 소리 못 들려줌 다시 듣기) (마) 선생님 고르는 때 당기기(세 영역 첫 수업, C177 L3) · 한국어 목소리(ko-KR 고르기 · 감시 · 없을 때 글만, 명단 · 기기 상태에 칸 없음 · 알림 없음 — spec 설계 4 · 9 · 10) (바) 근거 기록(평가 spec 3절 값 — 같이 해 보기 practice · 도움 retry_after_answer · echo · read_aloud · gloss · 짝 새 행 · 의사소통 정답 표시, A9 는 잠정 표시만 기록하고 운영 판정에 쓰지 않음) (사) 되짚기 판정 함수(핵심 목표 문항 단위 독립 해냄 · recap_min_evidence · recap_can_ratio · U 제외) (아) 수업 설계 지표 순수 함수 (자) 생성 브리프 `_template.md` · 3단계 영역 브리프 · 문법 용어 목록 → 3단계 단원 1 나머지 수업 생성 · 검증 · 풀이 검사 (차) 정본 반영 뒤 p13d specs 사본 맞춤 · 12절 키 · check:ids (카) 프리뷰(커밋 · push 는 회화 적용과 함께) → 요청자 iPad 시험 · 화면 검토(Fable max) · 음성 점검.
2. **묶음마다** 바뀌는 파일 · 작업 순서 · 증명(단위 — 특히 C182 의 부정 테스트와 일관성 테스트, 통합(이 Mac 못 돌림 → CI 11-01 뒤) · Playwright · 시드 검증 · 화면 검토) · 위험(겹치는 파일: UI · UX 토큰 · 회화 선생님 창 · 음성 층, 그림 자산 없음 L-1, 한국어 목소리 iPad 실측 L-2, 세션 시간 L-3, 1차 묶음 64파일 섞임 L-19) · 되돌리는 길.
3. **차례와 겹침**: UI · UX plan 묶음 2(토큰) 뒤에 화면 꼴을 얹고, 회화 spec 구현(승인 뒤)과 선생님 창 · 음성 층 파일이 겹치면 누가 먼저인지. 평가 spec 정본 반영(23:4x 시작)과 근거 칸 코드 이름(plan 이 정함 — 이 plan 에서 제안).
4. **완료 조건**: 원본 시드 셋 필수 검증 통과 · 요청자 iPad 시험 · 화면 검토, A9 확정 전 운영 미반영, 4~12단계 · 세션 시간은 후속.
5. **둘째 · 셋째 묶음**(1 · 4 · 5단계 다시 생성, 나머지)은 범위와 조건만 한 표로.

## 지키는 것
plan-build 템플릿 그대로. 300~450줄 한국어, 영어 개발 용어 직역 금지, 용어(영역 · 단계 · 단원 · 활동 · 자리 · 목표 · 기회). 설계 숫자는 설정값. 아이 이름 · 비밀값 없음. 승인된 흐름 · 교육적 방향은 다시 설계하지 않는다(요청자 C182). 마지막 답은 파일 경로 · 줄 수 · 묶음 수 · 위험 수만.

보정(10-30 00:0x): '(마)'의 voice.preferKo · 부모 알림은 spec 1판 기준이라 틀렸다. spec 3판 fix 3 설계 4 · 9 · 10 대로.
