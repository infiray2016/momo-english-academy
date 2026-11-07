# 검토 브리프: P4a 시드 규격 · 글 도구(code-reviewer · Opus · xhigh, 읽기 전용)

구현자 impl-p04a 가 격리 워크트리에서 끝낸 P4a(시드 Zod 규격 다섯 파일 · 꼴 상수 · 글 도구 · 시험용 시드 만들기)를 설계 준수와 품질로 판정한다. 첫 검토라 닫힌 장부는 없고 아래가 전부 열린 항목이다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p04a.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(바탕 024a4bc). 새 파일 열: `src/core/seed/structure.ts`(636) · `src/core/seed/text.ts`(534) · `src/core/seed/schema/{reference,lesson,talk,assessment,records}.ts` · `tests/unit/{seed-schema,seed-text}.test.ts` · `tests/fixtures/seed/builders.ts`(2280). 공용 파일 · 잠금 파일 변화 0 인지 `git -C <워크트리> status --short` 로 본다.
- 구현 보고: `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p04a-report.md`('다르게 한 것 · 해석' 1~13, 'b · c 가 쓸 내보내기', '남은 우려' 5).
- 명령은 읽기와 시험 실행만. 워크트리에서 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test` 꼴(`source` 가 막힘, node_modules 있음). 컨트롤러 재확인(18:5x): lint 0 · test 74 · check:deps 0 · build 통과 · check:bundle 0 · spec-trace missing-test 66(P4a 증명 표는 AC 접두가 없다).

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04a-규격.md` 전부 — 목표, 바뀌는 파일, 시드 파일 배치, 영어 값과 칸 키, 상수 표(structure.ts), 규격 칸 전부(설정값 시드 · level-specs · unit-specs · vocab · images · model-prices · 목록 넷 · 수업 파일 · 회화 카드 · 평가 · 토리 이야기 · 기록), 글 조각 목록, 글 도구 표, 시험용 시드 만들기 표, 작업 순서, 위험(특히 6 · 7 · 11), 정할 것 ㄱ~ㅍ 와 '컨트롤러 결정' 문단(15:5x 승인, 18:5x '구현 때 해석 수용' 덧붙임), 증명 표.
2. plan-p04b(`plan-p04b-배정-칸-검사.md`) · plan-p04c(`plan-p04c-묶음-검사-명령.md`)가 P4a 에서 가져다 쓰기로 한 이름(규격 · 상수 · 글 도구 · builders)과 견본 전제.
3. 정본: `specs/06-시드-생성.md` 6.3 출력 규격 · 6.4 검사 표(어느 글을 영어 검사 대상으로 삼는지) · `specs/02-1-영역-단원-승급.md` 3.2 배정 · 관계 표 · `specs/02-2-세션과-단계표.md` 3.3 · 3.4(원형 · 활용형) · 3.6(분량 · 형태 · 알파벳 단원) · `specs/04-데이터.md` 5절 vocab · lessons · placement_items 행 · `specs/09-설정값.md` 12절 키 · `specs/10-결정-기록.md` C54(기능어 품사 · 꼴 수 상수 원칙 · 영어 값 · 알파벳 단원 틀 · 예비 문항 수).
4. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04a.md`(허용 파일 · 지킬 것).

## 판정할 것
1. 설계 준수(빠진 것 · 넘친 것 · 잘못 이해한 것). (가) 규격 칸이 plan 표와 1:1 인지 — 칸 이름 · 꼴 · 필수 · 선택 · 범위 · 모르는 키 거부가 모든 객체에 있는지. (나) 상수 표 전부가 `structure.ts` 에 정본 절 주석과 함께 있고, 12절 키 값 · level_specs 값이 코드에 박히지 않았는지(C54 (2)). (다) 영어 값(C54 (3)): 수업 종류 · 처음 · 다시 묻는 턴 · 판 정수 둘 · 배치 벌 정수 · 주제 변형 정수 · vocab 은 `word` 가 시드 id. (라) 알파벳 단원(C54 (4))과 예비 문항 수(C54 (5)). (마) 칸 키 · 경로 함수(단원 0 을 읽기 · 쓰기 1단계에서만 받는 것이 3.6 알파벳 · 소리 단원 정의와 맞는지). (바) 글 조각 목록(위험 11): 모든 글 칸이 조각으로 나오는지와, 시험이 '문자열 칸 수 = 조각 수 + 빼는 칸 수'로 보는 방식의 빈틈(빼는 칸 목록이 늘면 시험이 저절로 통과하는가). (사) 글 도구 표의 함수마다 규칙이 3.4 · 3.6 · 6.4 문장과 맞는지 — 문장 끝(약어 · 소수), 토큰, 원형 찾기(활용형 · 축약형 · 소유격 · 여러 낱말 표제어), 범위 밖 비율(새 단어 · 고유 명사 · 수 · {NAME} 제외), 글로서리 빠짐, 형태 표, 금지 내용(영어 낱말 · 한국어 부분 글 · 정규식), 틀 자리. (아) 증명 표 네 행마다 시험이 있고 이름이 글자 그대로인지.
2. 구현자 '다르게 한 것 · 해석' 1~13 각각 판정. 1(TalkLessonSchema 를 lesson.ts 에 — 컨트롤러 수용, 순환이 실제로 생기는지 확인) · 2({NAME}'s 한 토큰 — 컨트롤러 수용, 3.6 낱말 셈과 맞는지) · 3(글 조각 role 배정 — 가장 중요. 글로서리 `surface` · `lemma` 와 그림 `picture` 를 내지 않고, 쓰기 `rubric` · 회화 카드 `topic` · 토리 이야기 `title` 을 ko 로 둔 것, `prepWords` hint · `wordBox` piece · `word` answer · `audioText` script · `frameEn` hint · 질문 `en` · 발표 `topic` · 예비 확인 질문 prompt. 6.4 검사 표가 어느 글을 검사하는지와 대조해, 아이가 읽거나 듣는 영어가 영어 검사 밖으로 빠지는 곳이 있으면 Important) · 4(newWords 빈 목록은 P4b — 컨트롤러 수용) · 5(그림 file = key, 금지 정규식 id 겹침 거부) · 6(iso datetime offset) · 7(아래 한계, introducedAt 범위는 P4b) · 8(단원 0 범위) · 9(원형 모호성 — 범위 밖 비율은 하나라도 범위 안이면 안, 기능어는 하나라도 기능어면 기능어: 6.4 취지와 맞는지, 너무 관대한가) · 10(builders 의 frame 값 나눔) · 11(알파벳 단원 견본 어휘 수) · 12(시험 이름 ＋ 셋) · 13(환경, 판정 불요).
3. 품질. Zod 4 쓰임(`z.iso.*`, strict 객체, 갈래 묶음), 형 내보내기(`z.infer` 이름), 순수성(fs · Date · 네트워크 없음), 시드 정규식 컴파일 처리(모듈 안 표가 남는 것, g 플래그 없음), 성능(builders 2280줄 · 시험 시간), 설계 숫자가 코드 · 시험에 박히지 않았는지(fixture `defaultSettings` 밖의 숫자), 한글 식별자 없음, `bandOf` · `Band` 꼴이 P2a `src/core/level-band.ts`(`'1-3' | '4-6' | '7-9' | '10-12'`, 밖이면 RangeError)와 같아 합칠 때 가져오기 두 줄로 끝나는지, TypeScript strict.
4. P4b · P4c 가 쓸 내보내기 이름(보고 'b · c 가 쓸 내보내기')이 plan-p04b · p04c 가 기대하는 이름과 맞는지. 어긋남은 Important.
5. 구현자 '남은 우려' 5 각각 판정(견본이 P4b · P4c 검사를 지키는지는 b · c 몫이라 판정 밖. 축약형 표가 P2a 일치율과 따로인 것은 1-나 결정 — 기록만).

## 보고 꼴(`review-p04a.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도(Critical · Important · Minor) · 파일:줄 · 근거(정본 절 · plan 줄 · 문장, 외부 사실은 출처와 확인 정도) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: 구현자 '다르게 한 것 · 해석' 1~13 · '남은 우려' 1~5 각각 '수용 · 고칠 것(근거)'.
- 표 하나: 증명 표 네 행마다 '시험 있음(이름) · 없음', 글 조각 role 배정 표(칸 → role → 판정).
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프로 부른다.
