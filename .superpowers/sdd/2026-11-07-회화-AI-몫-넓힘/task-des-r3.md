# 판정 브리프 — 대본 회차 r3b(fix 라운드 2 · 2 더함 뒤, 상황 차례 대본 다섯 × 2바퀴) 설계 재판정

판정자: 설계 · 화면 검토자 대체(Opus · max). 정해진 판정자(Fable · max, des-r1)는 사용 한도에 닿아 멈췄다(2026-11-07 09:4x). 같은 판정자의 이어 맡김 대신, 이 브리프와 앞 판정 보고 둘을 읽고 같은 기준으로 판정한다.

## 맥락(열 줄 안)
- 닿는 결정: 13절 C211 + 보완(목표 '아이가 정해진 대본을 따라가는 것이 아니라 실제 선생님과 영어로 이야기한다고 느끼는 것', 수치는 검증 기준이지 목표 아님, 측정 구분 넷, 자기 이야기 참고값 · 지어내기 금지, 발화 길이 아이 중심, 기술 오류 책임 구분, iPad 검증 완료 아님) · C204 (2) · C205 · C206 · C207 · C202 · C203 · C210. 재발 목록 일곱(일방통행 · 같은 질문 반복 · 두 번 읽기 · 형식적 인사 · 한글 해석 · 한국어로 묻기 · 지어낸 경험).
- 앞 판정: `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-des-r1-report.md`(r1 조건부 통과, I-1~I-6) · `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-des-r2-report.md`(r2 조건부 통과 — I-2~I-6 닫힘, I-1 은 되풀이만 닫힘, 새 Important N-1 인사 끝 반응 지워짐 11/16 · N-2 받침 겹침 7 · N-3 방금 답한 질문 되물음 1). 둘 다 먼저 읽는다.
- 고침: `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-fix-r1-report.md` 의 'fix 2' · 'fix 2 더함' 절(N-1 맞장구 남기고 넘김 문장만 앱 줄 · 시드 인사 끝 넷 교체 · yummy · fun 허용, N-2 상황 줄 뒤 AI 문장 지움 · 같은 뜻 지움 · 앞 차례 문장 건너뜀 · 'That's okay! You can do it!' 뺌, N-3 노린 단어 되묻기 echo · 고정부 금지 줄, 코드 검토 Minor 1~6, M-5 지표 (가) 앱 교체 · (나) AI 베끼기 가름). 관문 전체 0(단위 2260).
- 자료: r3b `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-r3b/<대본>/`(stuck-three · preview-1 · word-answers · greet-more · scene-other, 각 폴더에 전문 md · metrics(새 꼴 (가)/(나)) · review · run.log). 기준선 (가) `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-base/2026-11-06-talk-observe-settings.md`, r2 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-r2/<대본>/`. 그보다 앞서 돈 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-r3/` 은 마지막 고침 전 코드라 판정에 쓰지 않는다.

## 판정할 것
1. N-1 · N-2 · N-3 닫힘 여부(근거: 대본 · 바퀴 · 차례 글). 특히 인사 끝에서 아이 답에 대한 반응이 남는가, 밋밋한 시작 줄만 남는 차례가 사라졌는가, 받침에서 같은 뜻 겹침 · 말을 위한 말이 0 인가, 방금 답한 질문을 되묻는가.
2. 구현자가 권고 밖으로 더한 둘(같은 턴 같은 뜻 문장 지움 · 앞 차례 문장 든 상황 줄 건너뜀)과 넘김 낱말 표(코드 상수)가 대화를 해치지 않는가(필요한 말이 지워진 차례가 있는가).
3. 대본마다 '대화 같다 · 아니다'(사람 판정 칸 — r2 보고의 표 꼴), 재발 목록 일곱, 지표 (나) AI 베끼기 · (가) 앱 교체 건수의 해석, stuck-three 의 말 양(막힘 대본이라 상황 줄이 많음)이 '선생님 혼자 긴 말'인가.
4. 종합 판정(통과 · 조건부 통과 · 불통과)과 남은 고칠 것(심각도 · 근거 차례). 통과면 'iPad 시험 부탁 가능(iPad 검증 전)'을 명시.

## 보고
`.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-des-r3-report.md`(판정 표 · N-1~N-3 · 권고 밖 둘 · 재발 일곱 · 종합). 저에게는 종합 판정과 남은 Critical · Important 요지만 다섯 줄. 고치지 않는다. 세션 cd 금지(경로로 읽기).
