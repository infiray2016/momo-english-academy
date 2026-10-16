# 검토 브리프: P2a 음성 판정 함수(code-reviewer · Opus · xhigh, 읽기 전용)

구현자 impl-p02a 가 격리 워크트리에서 끝낸 P2a(음성 판정 순수 함수 넷 + 공용 `level-band`)를 설계 준수와 품질로 판정한다. 첫 검토라 닫힌 장부는 없고 아래가 전부 열린 항목이다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p02a.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6`(바탕 b0be5ae). 새 파일 전부가 대상이다: `src/core/level-band.ts` · `src/core/speech/{match-rate,listen,device,script}.ts` · `tests/unit/{match-rate,listen-end,speech-device}.test.ts` · `tests/fixtures/speech/{settings,homophones}.json` · `tests/fixtures/speech/scripts/*.json`(11). 공용 파일 · 잠금 파일 변화 0 인지 `git -C <워크트리> status --short` 로 본다.
- 구현 보고: `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p02a-report.md`.
- 명령은 읽기와 시험 실행만. 워크트리에서 돌릴 때 `source ~/.nvm/nvm.sh` 가 막힐 수 있으니 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test` 꼴로 쓴다(node_modules 는 이미 있다). 컨트롤러 재확인(18:4x): lint 0 · test 84 · check:deps 0 · build 통과 · check:bundle 0 · spec-trace missing-test 64.

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md` — '목표', '바뀌는 파일' P2a 표, '파일별 값' 1~5(값 2 판정 표는 18:4x 에 컨트롤러가 고쳤다. '정할 것' 끝 결정 문단의 '구현 때 바로잡음' 참고), '작업 순서' P2a, '정할 것' 나-1~나-7 · 다-6 · 다-7 · 다-8, '위험' 1 · 4 · 5 · 10 · 20, '증명' 표의 P2a 행.
2. `specs/07-음성과-오류.md` 7절(듣기 끝 · 감시 타이머 · 오류 코드 표 · 브라우저 표, C53 반영 뒤 판), `specs/05-AI-호출.md` 6.2 일치율 정규화 (1)~(6), `specs/09-설정값.md` `speech.*` 키 표, `specs/11-요구사항과-수용-기준.md` AC-5a · AC-5e, `specs/10-결정-기록.md` C53.
3. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p02a.md`(허용 파일 · 지킬 것).

## 판정할 것
1. 설계 준수(빠진 것 · 넘친 것 · 잘못 이해한 것). (가) 일치율: 정규화 (1)~(6)의 순서와 내용, LCS(나-1), `{NAME}` 자리(아무 낱말 하나 · 빼기 옵션), 동음이의어 묶음(fixture 다섯), 허용 답 여럿의 최댓값, 덧붙인 말 감점 없음, 빈 입력 처리. (나) 듣기 끝: 한 문장 답의 조용함 종료(구간별 end_silence), 두 문장 이상 답의 버튼 종료, max_listen 의 cap · chunk 이어 붙이기, 브라우저 스스로 끝 다시 시작, 글 뒤 no-speech 처리, 말하기 버튼은 stop · cancel 은 abort, 옛 객체 일 버리기. (다) 감시 타이머: 고친 값 2 표(듣는 중 · 멈추는 중 두 줄)와 7절 감시 타이머 행에 맞는지, '객체가 시작 뒤 신호를 하나라도 냈음' 가름이 정확한지, 다시 시작 때 capAt · silenceAt 재측정이 두 문장 이상(chunk) 답에서 예상 밖 동작을 만들지 않는지. (라) 오류 갈래 표(7절 + C53: language-not-supported → mic-unavailable, phrases-not-supported · bad-grammar → retry). (마) 기기 판정(7절 브라우저 표 + C53 인앱 제외 · 표 밖 '목록 밖' · iPadOS 최소 판 기록). (바) 대본 규격과 손 대본 11 이 값 5 표와 같은지. (사) 시험 이름이 증명 표와 글자 그대로인지(AC-5a · AC-5e 접두, AC-N3 접두 없음 — 다-8), 시험용 설정값 = 12절 대조 시험이 실제 `specs/09-설정값.md` 표를 읽는지.
2. 구현자가 '설계와 다르게 한 것' 1~5 각각: 1 · 2 는 컨트롤러가 수용했으니 코드가 고친 표와 맞는지만, 3(`bandOf` 재내보내기 없음, 다-6 대로), 4(`restarts` 가 감시 밖 새 객체 전부 — plan 값 2 의 ListenOutcome 뜻과 맞는지), 5(표에 없는 코드는 retry · start 던짐은 start-failed retry — 7절 '그 밖' 처리와 맞는지).
3. '넘친 것'(script.ts 의 스키마 셋 · DEFAULT_* 상수, listen.ts 의 SPEECH_SETTING_KEYS · START_FAILED_CODE, 증명 표 밖 시험 다섯)이 설계를 바꾸는지, P2b 가 그대로 쓸 수 있는지.
4. 품질. 순수성(`Date.now` · `performance.now` · DOM · 네트워크 없음, `now` 는 입력), 상태 기계의 빠진 전이 · 무한 다시 시작 가능성 · 객체 번호 처리, 같은 때 타이머 순서(cap → silence → chunk → watchdog), 설계 숫자가 코드 · 시험에 박히지 않고 fixture 에서만 오는지, `{NAME}` 표지 U+E000(입력 글에 사설 영역 글자가 들어오면?), 정규화의 유니코드(’ 따옴표 · 대문자 · 하이픈 · 소수 · a.m.), 축약형 표('d → would 고정, 구현자 우려), 시험이 흉내 함수에만 기대는 약점, 큰 입력의 LCS 비용, 형 안전(TypeScript strict), 한국어 주석 · 식별자 영어.
5. 구현자 '남은 우려' 1~5 를 각각 판정. 특히 5(글 뒤 no-speech 로 두 문장 이상 답이 새 객체를 열 때 옛 객체를 abort 하지 않음)가 위험 20 · iPad WebKit 321436 맥락에서 괜찮은지.

## 보고 꼴(`review-p02a.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도(Critical · Important · Minor) · 파일:줄 · 근거(정본 절 · plan 줄 · 7절 문장, 외부 사실은 출처와 확인 정도) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: 구현자 '다르게 한 것' 1~5 · '넘친 것' · '남은 우려' 1~5 각각 '수용 · 고칠 것(근거)'.
- 표 하나: 증명 표의 P2a 행마다 '시험 있음(이름) · 없음'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프로 부른다.
