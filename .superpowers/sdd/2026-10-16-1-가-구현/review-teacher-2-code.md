# 코드 검토 묶음 2: P13d d3 · d4(code-reviewer rev-teacher-2 · Opus · xhigh, 2026-10-23 14:0x~14:1x)

(검토자는 읽기 전용이라 컨트롤러가 답장을 옮겼다. 대상 diff `8a4cba1..18dcf77`, 경로는 워크트리 p13d 기준.)

**판정: Approved.** Critical · Important 0, Minor 2. 통합 셋 · e2e 다섯 파일은 CI 미확인(검토 때 18dcf77 이 원격에 없었음).

## 설계 준수
- **d3**: 고정부 첫머리 선생님 블록이 spec 글 그대로(`src/core/ai/calls/talk.ts:342 · :348`), 'Never say you are a human.' 바로 뒤 사람의 삶 줄(:356). 블록 밖이 미나 · 리오에서 글자까지 같음(단위가 replace 로 견주고 블록이 한 번만 나옴 단언) — 대화 안 프롬프트 캐시가 깨지지 않음(6.1). 스키마 JSON 같고 이름 · Tori 없음(칸 이름 tori_en 은 C130 (9)). 한 대화는 시작 때 선생님(talkInputOf 가 state.teacher, 끝맺음 턴도 같은 state — `state.ts:938-942 · :1003`, `closing.ts:298 · :312`), 평가 대화도 같은 꼴. 이름표 'Mina (app):'(`talk.ts:455-475`, 저장 sentUserMessage 도 `turn.ts:959-963`). 낱말 범위는 그 대화 선생님 이름만(`talk.ts:884-889`, 다른 이름은 범위 밖 반대 단언). N-1(`src/server/ai/talk.ts:290-294 · :488`) · N-4(`talk.ts:674-679`) 권고대로.
- **d4**: 문구 표가 정본과 글자까지 같음(4절 · 3.3 · 7절 · 8절 · 첫 실행 · 홈 · 배치). 조사는 받침 있으면 이 · 은 · 과 · 을 · 아(`src/core/teacher/name.ts:9-37`), '준' · '선생님' · 미나 · 리오 단위. 레이아웃은 connection() 뒤 householdTeacher()(React cache), 접근은 proxy 거르기. 회화 틀 안은 view.teacher(처음 스냅숏). '토리' 훑기 우회 없음(남은 '토리'는 dev 시드 보기 · 시드 검사기 메시지뿐). e2e 문구 변경이 시험 뜻을 약하게 하지 않음(단언은 오히려 늘어남).

## 잘한 점
AC-19d 단위가 1 · 4 · 10단계 × 회화 · 끝맺음 턴에서 블록 첫 줄을 startsWith 로, 블록 두 번 회귀도 잡음 · 통합 conversation-turn AC-19d 가 스냅숏 리오 고정 · 'Leo (app):' 저장 · 명단 밖 스냅숏 → 미나를 한 흐름에서 · N-4 시험이 ai_calls 쓰기만 던지는 Proxy 로 정확한 기록 글까지 · talkUserMessage 겹친 꼴이 이름 없는 부름을 형으로 막음 · teacher-scan 이 '토리'와 명단 한글 이름(빼는 낱말 반영)을 함께 훑고 도구 자체도 시험.

## 지적
- **M-1 (Minor)** 빈 단언 `tests/unit/talk-stream-call.test.ts:287` `expect(sentences).toEqual([])` 는 onSentence 를 덮어써 늘 참(실제 증명은 :289 events 단언). → **컨트롤러가 직접 고침(14:1x)**: 그 줄과 쓰지 않게 된 sentences 분해를 지움, 그 시험 파일 21 통과 · biome 0.
- **M-2 (Minor)** AC-19g 의 src/components/teacher audioSession 훑기가 없음 — plan 값 9(plan.md:257) · 증명 표 AC-19g(plan.md:454)는 teacher-scan 에 src/lib/speech 와 src/components/teacher 두 범위를 둠, d5 훑기는 src/lib/speech 만, d4 브리프가 'd5 가 넣었다'며 뺌(컨트롤러 브리프 빈틈). → **d7 에 넘김(14:1x SendMessage)**: teacher-scan 에 components/teacher 훑기, 이름 AC-19g.

## 구현자가 정한 것
d3 1~5 · d4 1~8 모두 받음(d4-5 audioSession 뺌은 브리프대로, 남은 틈은 M-2).

## 범위 밖 관찰(지적 아님)
주석에 옛 문구 '토리가 잠깐 쉬어요'(session-frame.tsx:16 · ai-gate.ts:3 · session/index.ts:155 · :1049 · conversation/index.ts:403 · writing-guided.tsx:178 · use-lesson-start.ts:6 — 다음에 그 파일을 고치는 묶음이 함께) · d6 router.refresh 꼭 필요 · 고른 뒤에도 글자 동그라미 '선'(d7 이 초상 창으로 바꿈) · 스냅숏 · 프로필 키가 모두 명단 밖이면 AI 는 미나, 화면은 '선생님'(plan 정할 것 11 이 받은 길).
