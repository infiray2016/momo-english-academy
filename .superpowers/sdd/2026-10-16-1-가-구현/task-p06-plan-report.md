# 보고: P6 하위 plan 작성(계획자 plan-p06, 2026-10-16)

상태: DONE_WITH_CONCERNS — plan 셋을 draft 로 썼다. 걱정은 셋이다. H5 가 1-가 길목이고, 브리프와 달리 P6 를 셋으로 나눴으며, P6b · P6c 에 코드 · 화면 편집이 들어 curriculum-designer · design-reviewer 밖의 역할(implementer)을 쓴다.

## 쓴 파일

| 파일 | 줄 | 무엇 |
|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06a-규격-파일.md` | 약 300 | 규격 파일 열(settings · level-specs · unit-specs · vocab · images 빈 목록 · model-prices · 목록 넷)과 근거 문서, H5 제안, 세 plan 공통 사실(어휘 시드 구성 · 정할 것 가~거 · 확인한 사실 1~16). 작업 8, 파일 열하나 + 공용 하나 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06b-그림-카탈로그.md` | 약 145 | 그림 카탈로그(Twemoji v17.0.3 + 자체 SVG), 스크립트 `scripts/vocab-images.ts`(fetch · check), P4 규격 svg 한 줄, CREDITS.md, H7. 작업 8, 손 파일 여덟 + 공용 둘 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06c-목업-맞추기.md` | 약 125 | 11절 목업 표대로 고칠 13 + 글자만 3 + 새 15 + 첫 실행 2, canvas.json, H6. 작업 7 |
| 이 보고 | — | — |

브랜치 제안: `feature/1a-p06a-seed-reference`(바탕 P4c 6bd6015) · `feature/1a-p06b-vocab-images`(바탕 P6a 끝, 스크립트 단계는 6bd6015 에서 먼저 하고 합침) · `feature/1a-p06c-mockups`(바탕 문서 브랜치 끝 d55ead3). 셋 다 격리 워크트리. 작업 장부는 그대로.

## 확인한 사실(출처 · 판 · 날짜는 plan-p06a '확인한 사실과 출처' 표 1~16)

- 가격 쪽(2026-10-16 받음): Opus 5.5 입력 4 · 5분 쓰기 5 · 1시간 쓰기 8 · 캐시 읽기 0.20 · 출력 20. Sonnet 5.5 2 · 2.50 · 4 · 0.10 · 10(캐시 읽기 0.05배 각주). Haiku 5.5 0.10 · 0.125 · 0.20 · 0.01 · 0.50(입력 10만 넘으면 다섯 배). Opus 5 · Opus 4.8 5 · 6.25 · 10 · 0.50 · 25. Sonnet 5 2 · 2.50 · 4 · 0.20 · 10. → 정본 6.6 의 Sonnet 5.5 캐시 읽기 0.10 은 맞고, claude-api 스킬 묶음 캐시의 '0.20' 이 낡았다. 6.6 의 Opus 5.5 캐시 빈칸을 채울 수 있다.
- 대체 모델 문서: `fallbacks: "default"` 는 거절 범주마다 권하는 대체 모델로 보내고, Haiku 5.5 는 서버 측 대체가 없으며, 허용 목록은 베타 헤더를 단 Models API 의 `allowed_fallback_models` 다. Sonnet 5.5 between_tools 요청은 Sonnet 5 에서 disabled 로 돈다.
- 2022 개정 기본 어휘 3,000(`*` 800 초등 · `**` 1,200 중 · 고 공통 · 나머지 1,000, 고시 제2022-33호 [별책 14] pp. 254-290). KICE Word Lister 안내 PDF(경기도교육청 게시)에 목록 본문이 있어 글로 뽑힌다(`*` 819 · `**` 1,215, 철자 쌍 포함). `*` 안 기능어 약 79.
- Twemoji v17.0.3(b6b55fe): 그래픽 CC-BY 4.0, README 가 README · '정보' 쪽 · HTML 소스 언급을 저작자 표시로 받는다. jsDelivr 고정 판 주소가 200. CC BY 4.0 2(a)(4) 형식 바꾸기 허용. OpenMoji 는 CC-BY-SA(묶음 밖). Openclipart 는 CC0(보관본).
- P4 코드(6bd6015): 규격 파일 열이 다 있어야 오류 0, level_specs 48 · unit_specs 242 완전성은 늘 봄, 그림 파일 꼴은 png · webp · jpg 만, 설정 값 꼴 여섯.
- 6bd6015 의 biome 에 `!seed/**/*.json` 이 없다(P4a ㅌ 미반영). 저장소에 `public/` · README 가 없다. 워크트리 바탕의 specs/ 는 문서 브랜치보다 낡았다(C55~C60 없음).
- 12절 표 121행(바꾸는 곳: 고급 82 · 시드 18 · 결정 기록 먼저 18 · 기본 2 · 첫 실행 화면 1), 펼치면 약 180행.
- 목업 캔버스: Design 아티팩트, `project/` 아래 21장 + canvas.json. 저장소 사본과 B_Reading · B_Sticky 가 12바이트씩 다르다. 저장소에 canvas.json 이 없다.

## (추측)

- 1~4단계 그림 낱말 약 330~400, Twemoji 로 덮이는 비율 약 60~70%.
- vocab 약 1,950~2,050항목, curriculum-designer 출력 약 160~180K 토큰(구간 묶음 하나 35~50K).
- 대체 모델 행: Opus 5.5 → Opus 5 · Opus 4.8, Sonnet 5.5 → Sonnet 5. Sonnet 5 · Opus 4.8 의 xhigh · max 와 disabled 조합.
- 저작권법 제7조 제2호는 2차 출처로만 확인(국가법령정보센터 원문 미확인). CEFR-J v1.6 의 공식 사용 조건 미확인.
- `pnpm -s` 가 JSON 만 낸다, Playwright 1.64.1 CLI `screenshot` 의 옵션 이름, Next.js `next/image` 가 svg 를 막는다.

## 묶음 plan 과 다르게 한 것

1. P6 을 셋(a 규격 파일 · b 그림 · c 목업)으로 나눴다. 브리프는 a · b 둘(b 에 vocab)을 예상했지만 검증기가 규격 파일 열을 함께 요구해 vocab 이 a 밖이면 a 가 오류 0 에 닿지 못한다.
2. settings.json 은 12절 키 전부(약 180행)다. 브리프의 '45키'는 검증기가 읽는 키 수다.
3. P6b 에 작은 스크립트와 P4 규격 한 줄(svg)을 넣었다(가벼운 루프). P6c 는 파일이 약 33 이다.
4. 그림 범위를 1~4단계와 알파벳 대표 낱말로 좁혔다(첫 운영 배포 몫). 5~12단계 그림은 2차.
5. 증명에 일회 검사(설정값 12절 대조 · 예문 · 형태 표 · 금지어 시험 문장)를 더했다.
6. 브리프의 '`specs/01-개요.md` 11절 (3) · 목업 표'는 `specs/08-테스트와-기술.md` 의 11절로 읽었다.

## 컨트롤러가 정할 것(권하는 답 · 13절 한 줄 필요 여부)

| 글자 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| 가 | P6 셋으로 나누기 | 셋 | 불필요 |
| 나 | 역할: a curriculum-designer(xhigh) 하나 이어 쓰기 + design-reviewer 두 번, b 스크립트 · 자체 그림 implementer(high, 가벼운 루프), 그림 고르기 curriculum-designer(high), c 목업 편집 implementer(high) + design-reviewer | 이대로 | 불필요 |
| 다 | 어휘 시드 구성: 단계마다 내용어 = unit.vocab_count × 5, 네 영역이 같은 모음을 단원으로 다르게 나눔, `*` → 1~6 · `**` → 7~12, 알파벳 대표 낱말 따로(단계 1, 읽기 · 쓰기 단원 0 만), 기능어는 닫힌 품사 · 단계 있음 · 단원 단어 아님, 지문 전용 낱말 없음 | 이대로 | 필요(3.4 해석) |
| 라 | `profile.start_level.<영역>` 기본 행 두지 않음(비움 = 행 없음, P10 이 '고르지 않음'으로 읽음) | 이대로 | 필요(12절 '기본 행을 시드로'의 예외) |
| 마 | 값 꼴: 단계마다 다른 값은 단계 → 수 사전, `ai.thinking.*` 는 `off` · `adaptive` | 이대로, P9 와 맞춤 | 불필요 |
| 바 | 쓰기 교정 상한 이중 출처(level_specs · 12절) | 같은 값, P7 이 맞댐 | 불필요 |
| 사 | 6.6 Opus 5.5 캐시 단가 · 대체 모델 단가 채우기 | 위 사실대로 | 필요(6.6) |
| 아 | model_prices `thinkingDefault` 가 'adaptive' 뿐(Opus 4.8 기본은 생각 없음) | P9 가 'none' 을 더함, 그때까지 adaptive + 근거 문서 메모 | 불필요 |
| 자 | H5: 1~3구간 단원 단어 25 대 30 과 단원 틀 값 · 유형별 문항 수 · `speaking.answer_max_seconds` | 요청자 확인 | 필요 |
| 차 | 그림: Twemoji v17.0.3 + Claude SVG(generated) + svg 꼴 + CREDITS.md | 요청자 확인(H7) | 필요(잠정 그림 행 구체화) |
| 카 | 그림 범위 1~4단계 + 알파벳, 1~2단계 먼저 | 이대로 | 불필요 |
| 타 | 첫 실행 목업 두 장 더하기, P6c 파일 약 33 을 한 PR 두 검토로 | 더함 · 한 PR(원하면 c1 · c2) | 필요(11절 목업 표에 줄 더함) |
| 파 | vocab 예문은 일회 검사, 검증기 경고 규칙은 P8 전 작은 고침 | 이대로 | 불필요 |
| 하 | P8 표본 시작은 P6a 끝(+ P6b 1~2단계) 뒤 | 이대로 | 불필요 |
| 거 | design-reviewer 정의의 낡은 기준(44px · 색 셋)을 4절(56px · 연두 회화)로 | 고침(컨트롤러) | 불필요 |

13절 한 줄 초안(컨트롤러가 다듬는다).

- (plan 승인 때) "P6 plan 의 해석 · 보완 셋. (1) 어휘 시드 구성 — 단계 n 의 내용어는 unit.vocab_count.<구간> × 5 이고 네 영역이 같은 모음을 단원으로 다르게 나눈다(영역마다 누계 = 3.4). 1~6단계는 2022 기본 어휘 `*`(초등 권장)를 먼저, 7~12단계는 `**` 에서 고른다. 알파벳 · 소리 단원(단원 0)의 단원 단어는 단계 1 의 글자 대표 낱말로 따로 두고 읽기 · 쓰기 단원 1~5 와 겹치지 않는다. 기능어는 닫힌 품사만 `function` 이고 3.6 도입 차례로 단계를 둔다. 단원 단어가 아닌 지문 전용 낱말은 두지 않는다(P8 표본에서 범위 밖 걸림이 많으면 다시 본다). (2) `profile.start_level.<영역>` 은 기본 행을 두지 않는다(12절 '비움'을 행 없음으로, P10 이 '고르지 않음'으로 읽음). (3) 6.6 의 Opus 5.5 캐시 단가(5분 쓰기 5 · 1시간 8 · 읽기 0.20)와 대체 모델 Opus 5 · Opus 4.8(5 · 25 · 6.25 · 0.50) · Sonnet 5(2 · 10 · 2.50 · 0.20) 단가를 채운다(가격 쪽 2026-10-16) | 계획자 plan-p06(Opus xhigh) 조사 · 컨트롤러"
- (H5 뒤) "단원 틀 구간별 값 확정(H5, 6.3 순서 (1), R9 · C49 의 남은 하나): 1~3 …, 4~6 …, 7~9 …, 10~12 …, 쓰기 6~9 · 10~12 단원 틀 …. 단계 평가 영역 × 구간 유형별 문항 수 …(단계 예외 …). speaking.answer_max_seconds.<구간> … . 3.2 표 · 12절 기본값(· 3.4 누계 · 6.3 시드 수) 반영 | 요청자 확인(날짜). 학습 설계자 제안, 근거 `docs/research/…-seed-reference-basis.md` (6)절"
- (H7 뒤) "그림 카탈로그: 주 묶음 Twemoji v17.0.3(그래픽 CC-BY 4.0, 받은 SVG 그대로), 모자란 낱말은 Claude 가 그린 SVG(license generated), 그림 파일 꼴 svg, 저작자 표시는 `CREDITS.md` 와 images.json(앱 안 표시는 2차 부모 화면), 범위는 1~4단계 그림 낱말과 알파벳 대표 낱말 | 요청자 확인(H7). 13절 2026-10-15 'Pre-A1 그림은 …' 잠정 행을 구체화"
- (정할 것 타를 받으면) "11절 목업 표에 첫 실행 화면 두 장(1~4 · 5~8)을 더한다 | AC-1c 의 기준 화면이 없다"

## 요청자 확인이 필요한 것

- H5(1-가 길목): 단원 틀 구간별 값, 1~3구간 단원 단어 25 대 30, 단계 평가 유형별 문항 수, `speaking.answer_max_seconds.<구간>`. P6a 묶음 0 뒤 컨트롤러가 항목마다 풀어 쓴 읽기용 쪽으로 묻는다.
- H7: 그림 묶음(Twemoji)과 저작자 표시 자리, 자체 그림 방식, 자체 그림 표본 승인. H5 와 같은 쪽에 붙여 한 번에 물을 수 있다.
- H6: 고친 목업 · 새 목업 승인(캔버스).

## 요청하는 공용 변경

- P6a: `biome.json` `files.includes` 에 `"!seed/**/*.json"`(P4a ㅌ).
- P6b: `package.json` scripts `images:fetch` · `images:check`, `.github/workflows/ci.yml` seed-validate 작업 끝에 `pnpm images:check`(seed/images.json 이 있을 때).
- P6c: 없음.

## 다른 P 에 넘길 것

- P5: 그림은 `/images/vocab/<키>.svg`(`<img>`), 시드 보기 화면은 P6a 뒤 실데이터 규격 파일을 읽는다.
- P7: `tests/fixtures/settings.ts` 를 seed/settings.json 읽기로(P3a 정할 것 사). check-ids 는 settings.json ↔ 12절 ↔ 코드를 맞대고 `profile.start_level` 없음 · 값 꼴(사전 · 목록 · `off`/`adaptive`)을 안다. 교정 상한 이중 출처를 맞댄다. model_prices numeric(10,4)에 0.125 · 0.01 이 든다. 그림 파일은 정적 자산이라 적재하지 않는다(images 행만).
- P8: 어휘 시드 구성 · 기능어 · 알파벳 단원 단어, 형태 표 검출 표(근거 문서), 예문 · 표기 규칙, 그림 문제는 카탈로그 키 있는 낱말만, testMix, 첫 표본은 P6a 끝 뒤(읽기 1단계 그림 고르기는 P6b 1~2단계 뒤), seed.remedial_coverage 는 표본에서, vocab 예문 경고 규칙(정할 것 파).
- P9: model-prices 칸 값과 대체 모델 행 셋, `thinkingDefault` 에 'none' 더하기, H4 뒤 `allowed_fallback_models` 로 대체 모델 확인, `ai.thinking.*` 값 `off` · `adaptive`, `writing.max_corrections` 사전 꼴, Haiku 5.5 입력 10만 넘는 가격 칸 없음, 6.6 캐시 단가.
- P10: `profile.start_level` 행 없음 = 고르지 않음, 그림은 `<img>`, 첫 실행 목업(정할 것 타), 배치 가 벌 그림 낱말.
- P11 · P12: `speaking.answer_max_seconds` 값(H5), 그림 `<img>`, 목업 기준.
- 1-나 회화: level_specs `segments` 에 `more_talk` 을 넣지 않았다(턴 표시), `talk.next_time_lines` 사전 꼴.
- 2차 부모 화면: 앱 안 저작자 표시('정보').
- 컨트롤러: design-reviewer 정의 고침(거), 캔버스 다시 올리기(H6), 13절 줄들, P6b 와 P6a 합치기.
