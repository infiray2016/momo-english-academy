# 브리프: P2a 음성 판정 함수(implementer · Opus · high)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md`(approved 컨트롤러 2026-10-16 14:4x)의 **P2a 몫**을 구현한다. plan 이 유일한 설계이고 이 브리프는 범위 · 허용 파일 · 명령 · 보고 자리를 정한다. 코드는 plan '파일별 값' 1~5 와 '정할 것' 끝의 컨트롤러 결정 문단(다-6: 공용 `src/core/level-band.ts`)을 글자 그대로 따른다.

## 작업 폴더 · 바탕
- 이 에이전트의 현재 폴더는 격리 워크트리다(바탕 커밋 08cce00, 브랜치 `feature/1a-p01b-quality-gates` 끝). 모든 경로는 그 폴더 기준이고, 메인 저장소 폴더(`/Users/hikaru/workspace/momo-english-academy`)의 파일은 읽기만 한다.
- 첫 명령: `source ~/.nvm/nvm.sh && nvm use >/dev/null && pnpm install --frozen-lockfile`(워크트리에는 node_modules 가 없다. 끝내기 관문이 node_modules 를 요구한다). 이후 모든 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null && ` 로 시작한다.
- git 쓰기 명령 금지(커밋은 요청자 지시 때 컨트롤러가 한다). 파일 이름 바꾸기는 `mv`.

## 먼저 읽을 것(순서)
1. `.claude/CLAUDE.md`. 2. plan-p02 전부(특히 '목표', '바뀌는 파일' P2a 표와 `level-band.ts` 행, '파일별 값' 1~5, '작업 순서' P2a 1~7, '정할 것' 표와 끝의 컨트롤러 결정 문단, '증명' 표의 P2a 행). 3. `specs/07-음성과-오류.md` 7절(C53 반영 뒤 판), `specs/05-AI-호출.md` 6.2, `specs/09-설정값.md` 의 `speech.*` 키 표, `specs/11-요구사항과-수용-기준.md` AC-5a · AC-5e. 4. `specs/10-결정-기록.md` 13절 C53. 5. 기존 시험 꼴 `tests/unit/*.test.ts` 와 `vitest.config.mts`(unit 프로젝트 include).

## 허용 파일(모두 새 파일)
`src/core/level-band.ts` · `src/core/speech/match-rate.ts` · `src/core/speech/listen.ts` · `src/core/speech/device.ts` · `src/core/speech/script.ts` · `tests/unit/match-rate.test.ts` · `tests/unit/listen-end.test.ts` · `tests/unit/speech-device.test.ts` · `tests/fixtures/speech/settings.json` · `tests/fixtures/speech/homophones.json` · `tests/fixtures/speech/scripts/*.json`(plan 값 5 표의 대본) · 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p02a-report.md`. 그 밖(공용 파일 · `src/lib/` · `src/app/` · 설정 파일)은 손대지 않는다. 새 패키지 없음(`package.json` · 잠금 파일 변화 0). `src/core` 는 db · next · react · `src/server` 를 가져올 수 없다(의존 규칙, `pnpm check:deps` 가 잡는다).

## 지킬 것
- 시험을 먼저 쓰고 실패를 본 뒤 구현한다(plan 작업 순서 P2a 2~5). 시험 이름은 plan 증명 표의 이름을 **글자 그대로**(AC-5a · AC-5e 로 시작하는 것, 접두 없는 것 그대로). 감시 타이머 시험에 AC-N3 를 붙이지 않는다(다-8).
- 숫자는 `tests/fixtures/speech/settings.json`(12절 키 이름 · 기본값 그대로)에서 읽는다. 코드 · 시험에 설계 숫자를 박지 않는다. 12절 대조 시험은 `specs/09-설정값.md` 표를 읽어 키 · 기본값이 같은지 본다(경로 NFC).
- `bandOf` 는 `src/core/level-band.ts` 에 두고 `listen.ts` 가 가져온다(컨트롤러 결정 다-6).
- 순수 함수만. 브라우저 · DOM · 네트워크 · 시각(`Date.now` · `performance.now`)을 직접 읽지 않고 `now` 를 입력으로 받는다. 단위 시험은 빠르게(끝내기 관문이 매번 전체를 돈다).
- 아이 이름 · 사람 이름을 시험 문장 · 대본에 넣지 않는다. 비밀값 없음.
- 모호하면 지어내지 말고 보고 '요청하는 변경'에 적는다. 정본과 다르게 해야 하면 멈추고 NEEDS_CONTEXT.

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace --plan intent/2026-10-15-모모-잉글리시-아카데미/plan.md`(missing-test 가 66 에서 AC-5a · AC-5e 만큼 줄어 64) · `pnpm check:bundle`(build 뒤). 보고 `task-p02a-report.md`: 바뀐 파일:줄, 설계와 다르게 한 것과 이유, 요청하는 변경, 시험 이름 전부, 명령과 출력(통과 수 · spec-trace 요약), 남은 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝낼 때 Stop 관문이 `biome ci` 와 단위 시험을 돈다. 실패하면 시험을 지우지 말고 고친다.
