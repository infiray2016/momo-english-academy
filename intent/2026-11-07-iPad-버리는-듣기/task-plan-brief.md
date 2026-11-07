# 브리프 — 'iPad 버리는 듣기' plan 작성(Opus xhigh, 컨트롤러 승인)

## 맥락(열 줄 안)
- 닿는 결정: 13절 **C212(컨트롤러 잠정 2026-11-07 14:3x) — spec 대로 plan · 구현 · 검토하되 speech.discard_mode 시드 기본값 'off', 켜기는 요청자 정할 것 8 · 9 · 10 '가' 답 뒤 'ios' 적재** · C211 닫음(요청자 '마이크 안정화 최우선', 질문은 승인 범위 밖 충돌 · 설계 변경일 때만) · C210(마이크 안 잡힘 감지 · 보완 잠정) · C53 (2) · C166 R1 · C201(listen-gap — spec 이 '조정') · 요청자 결정 2026-11-06 6 가(녹음 안 함 · 서버형 인식 불승인 · 기술 오류 비기록). 정본 13절 `specs/10-결정-기록.md` 끝.
- spec: `intent/2026-11-07-iPad-버리는-듣기/spec.md`(판 2 · fix 1 · 다듬음 1, 설계 검토 `spec-review-1.md` · `spec-review-1-fix1.md` '승인 가능') — FR 13 · AC 13 · 설계 1(듣기 차례 기계: 대기 · 버림 · 닫는 중 · 간격 · 진짜 · 갈래 rest · discard · live) · 설계 2(읽기 줄과 소리 끝 알림 계약 · 앱 줄 목록 · 훅 useSpeakQueue · useWaitLine · useSayer) · 설계 3(화면 문구) · 설계 4(새 키 여섯 changeVia 시드) · 우려 7(측정 0 갈래 둘). 근거 분석 보고 10.20(`.superpowers/sdd/2026-10-29-회화-수업을-대화로/task-mic-probe-analysis-report.md` 1401줄부터, F1~F12 · 15분 점검표 10.20.7 · U23).
- 코드: 워크트리 `.claude/worktrees/p13d`. **지금 '회화 AI 몫 넓힘' 변경(묶음 0~5 · fix 1 · 2, 관문 0)이 커밋 전으로 같은 트리에 있다** — 그 변경은 `src/core/ai/calls/talk-lesson.ts` · `src/core/conversation/{lesson-flow,situation,cue-line,made-up,question-check,chances,child-kind,log}.ts` · `src/server/conversation/{lesson-turn,closing,turn}.ts` · `src/server/ai/talk.ts` · `scripts/talk-*.ts` · 시드 목록 · 카드 · 시험 다수를 만졌고, **`src/lib/speech/*` · `src/core/speech/*` · `src/components/conversation/{talk-frame,child-turn,follow-along,tori}.tsx` 는 만지지 않았다.** 마이크 묶음은 그 위에서 시작한다(컨트롤러가 AI 몫 넓힘을 먼저 커밋하면 깨끗한 바탕, 아니면 파일 범위가 겹치지 않게).
- 측정에 쓴 참고 구현: `src/app/dev/mic-probe/w-round2.ts`(dev 전용, 앱에 안 들어감).
- 요청자 강조: "iPad 마이크 안정화는 계속 최우선", 녹음하지 않음, '말하기 → 한 번 더 눌러 멈춤 → 선생님 말 → 다시 말하기' 를 15분 실측에서 꼭 본다.

## 할 것
스킬 `.claude/skills/plan-build/SKILL.md` 템플릿대로 `intent/2026-11-07-iPad-버리는-듣기/plan.md`(draft → 컨트롤러 승인). 담을 것:
1. **묶음 나누기**(동시 다섯까지, 파일 범위가 겹치지 않게): 예) (0) 설정 키 여섯(seed/settings.json — discard_mode 기본 **'off'**(C212) · 나머지 spec 값, TEST_SETTINGS, 설정 규격, check:ids 0) · (1) 순수 '듣기 차례 기계'(core, DB 없음, spec 설계 1 표 그대로, U23 의 F6 · F8 을 시험으로 고정 — 진짜는 소리 끝 · speaking 거짓 뒤 gap 에만, 진짜 중 읽지 않음) · (2) 음성 접점 감싸개(browser.ts — 버림 세션 열기 · 닫기 · 글 즉시 폐기 · synthState · openDiscard, 기존 listen 그대로) · (3) 틀 · 화면 잇기(talk-frame 읽기 줄의 '소리 끝' 명시 알림 · 보류한 읽기 · child-turn · follow-along · 준비 중이에요 · 말해 보세요 · 잠깐만요 마이크를 다시 켤게요 · 부모 한 줄은 discard_mode 켜질 때만) · (4) 기록 칸(client_listen 새 칸 — 갈래 · 버림 as · 길이 · 소리 종류 · 시작 · 끝 · 진짜 시작 때 speaking · 진짜 as, 4절) · (5) e2e(가짜 음성으로 버림 → 진짜 순서 · off 일 때 지금과 같음). 묶음마다 바뀌는 파일 · 안 바뀌는 파일 · 시험 · AC 번호.
2. **off 기본값의 증명**: discard_mode 'off' 에서 지금 동작과 글자까지 같음(기존 단위 · e2e 그대로 통과), 'ios' 에서 spec AC 13 — 둘 다 시험으로.
3. **증명**: 묶음별 단위 · CI(통합 · e2e), 점검 쪽(/dev/mic-probe)과 같은 순서를 앱 경로로 흉내 내는 단위 시험(기록 7 · 8 의 사건 순서를 가짜 음성으로 재현), 켠 뒤 요청자 15분 수업 실측(10.20.7 열두 항목, 통과 S7 교대 10턴 결과 10 · 멈춤 0, 소리 종류별 낱말 인식 셈).
4. **배포 차례**: 설정 적재(off) → push · 배포 → 서버 확인 → (요청자 '가' 답) → discard_mode 'ios' 적재 → 요청자 15분 수업. 되돌림은 'off' 적재 한 번.
5. **위험**: 읽기 줄 굳음(F7 cancel) · 살아 있는 버림 · 숨김 · 오래 생각한 뒤 · 측정 0 갈래 둘(우려 7) · iOS 판 바뀜(U22) · 'AI 몫 넓힘' 변경과의 겹침.
6. **구현 브리프 머리 '맥락' 절**(묶음마다 열 줄 안).

길이 150~250줄. 파일 경로는 실제 존재 확인. 저에게는 요지 다섯 줄(묶음 수 · 나란히 띄울 조합 · 첫 묶음 · off 기본값 증명 · 위험)만.
