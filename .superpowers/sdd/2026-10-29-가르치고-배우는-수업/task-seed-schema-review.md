# 브리프: 시드 규격 · 검증기 확장 코드 검토(검토자 · Opus · high, 범위 한정 — 가벼운 루프, 2026-10-29 23:5x)

구현자 impl-seed-schema 가 p13d 에서 수업 시드 Zod 규격과 검증기를 넓힌 작업(브리프 `task-seed-schema.md` + 컨트롤러 추가 지시: 목표 대조 필수 오류 · UnitSpec goals 규격 · 워크트리 12절 · settings 키 · 3판 검사 여섯 · e2e 네 줄 `?? ""`)을 검토한다. 보고는 `task-seed-schema-report.md`(2판). 관문 여섯은 모두 종료 0 이라고 보고됐다(seed:validate 원본 시드 셋 오류 0 · test 1079 · tsc 0 · lint · check:deps · check:ids CI 꼴 0).

## 검토 범위(diff 만)
`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d` 에서 `git -C <워크트리> status --short` 와 `git -C <워크트리> diff -- src/core/seed seed/settings.json seed/lists/grammar-terms.json seed/unit-specs.json specs/09-설정값.md tests/unit tests/e2e/reading.spec.ts tests/e2e-local/seed-viewer.spec.ts scripts` 로 본다. 불편 1차 묶음(검토 A · B Approved)과 UI · UX 묶음 0-가(진행 중 — `src/components/session/*` · `src/app/(child)/**` · `talk-frame.tsx` 등)의 변경은 범위 밖이다. 시드 내용(`seed/lessons/*/3/1.json`)은 학습 설계자 몫이라 '검증기가 잡아야 할 것을 못 잡는지'만 본다.

## 대조할 설계
- 델타 spec 3판 `intent/2026-10-29-가르치고-배우는-수업/spec.md` 설계 6(수업 시드 규격 — teach.* · 문항 goal · whyKo · askRole · retryHighlight · chunks · spare · storyEn · accepted · acceptedMeaning · chips[].from · repeat 배열 · preview.example 비움 · recap closeKo · closeKoPracticed) · 설계 7(검증 행: 자리 꼴 · 선생님 줄 길이 · 설명 시간 합 · 문법 용어 · 짝 · 혼자 문항과 본보기의 다름 · '왜' · 유형 경계 · 목표(필수 오류, C177 (5)) · 범위 넓힘 · 선생님 이름 · 말하기 질문 검사 여섯) · 설계 12(설정 키).
- 평가 spec 5판 `intent/2026-10-29-학습-평가-체계/spec.md` 2절(unit_specs.goals 꼴: id · ko · core · tasks · home · needs · accept · demands) · 8절(seed.goals_required_levels).
- 요청자 결정 C177 (5) · C182 (4): 원본 시드 셋이 새 칸을 품은 채 필수 검증(목표 검사 포함)을 통과해야 하고, 경고 우회 · 걷은 사본은 완료가 아니다. 13절 C170 · C174 · C175.

## 판정할 것
1. 설계 준수: 규격 칸 · 검사 행이 spec 6 · 7 과 같은가, 빠진 검사(특히 목표 대조 필수, 짝의 자극 겹침, 유형 경계, 선생님 이름 넓힘)는 없는가, spec 에 없는 검사를 더하지 않았는가. 구현자가 지시와 다르게 둔 둘('완전성 모드 필수 단계 단원 목표 없음' 막음을 뺀 것 — 지금 목표가 있는 단원이 셋뿐이라 1 · 3 · 4 · 5단계 나머지 단원이 막혀서; seed.goals_required_levels 행 추가)이 타당한지와 운영 적재에서 언제 막아야 하는지 의견.
2. 품질: Zod 가 옛 1단계 시드와 가짜 시드 나무에 그대로 통과하는지(선택 칸), 검사의 거짓 통과 · 거짓 실패 가능성(예: 문법 용어 목록이 '마침표' 같은 칩 이름을 잡지 않는지, 설명 시간 합의 글자 수 셈, 짝의 '글자가 같지 않다' 비교의 정규화), 오류 글 · 검사 이름이 지금 꼴과 맞는지, 설정 키 읽기(없을 때 기본값)가 설정값 원칙에 맞는지, 테스트가 실패 사례를 실제로 잡는지(실패 시험 10건).
3. 부작용: `tests/e2e/reading.spec.ts` 네 줄 `?? ""` 가 동작을 바꾸지 않는지, settings.json 판 칸 없음, 워크트리 12절 잠정 행이 본 저장소 정본 반영(canon-eval · 가르치고 반영) 때 겹칠 자리.

## 보고(`task-seed-schema-review-report.md`, 같은 폴더, 80줄 안)
Critical · Important · Minor 로 가르고 근거(파일 · 줄 · spec 절)를 적는다. 근거 없는 지적은 넣지 않는다. 마지막에 Approved / Changes requested 와 fix 가 필요한 항목 번호. 마지막 답은 판정 · C · I · M 수만. 코드를 고치지 않는다. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`, 작업 폴더를 옮기지(cd) 않는다.
