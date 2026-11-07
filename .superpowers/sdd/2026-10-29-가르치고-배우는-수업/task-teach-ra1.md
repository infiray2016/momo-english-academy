# 브리프: 가르치고 배우는 수업 plan 묶음 라-1 — 자리 조각(새 파일)(구현자 · Opus · high, 2026-10-30 02:1x 작성, UI · UX 2-가 · 4-가 · 마-1 Approved 뒤 시작 — 모두 닫힘)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 129~134줄 라 표의 라-1 행(새 파일 · 잠금 없음) · 작업 순서 7 · 정한 것 15(칩 토큰: 2-가 토큰 이름 위에 role 여덟 토큰을 더하기만, 값은 디자인 ② 팔레트 안에서 고르고 화면 검토로 정함) · 16(위 띠 자리 이름)을 구현한다. 근거는 spec 3판 `intent/2026-10-29-가르치고-배우는-수업/spec.md` 설계 5(화면 표 — 오늘 배울 것 · 보여 주기(새 단어 · 본보기) · 같이 해 보기 · '왜' 한 줄 · 같은 문제 다시 · 혼자 해 보기 첫 화면 · 다른 예시 첫 장, 선생님 말 화면의 단추는 읽어 주기가 끝나면 밝아짐, 정본 밖 문구 표 — '시작' · 위 띠 자리 이름 다섯 · 칩 이름 · 문항 이름표 · 새 단어 한 줄 · 혼자 첫 화면 · 다른 예시 첫 장 셋 · '혼자 해냈어요!' · 쓰기 '왜' 둘 · 따라 말하기 '왜' · 틀린 뒤 단추 셋 · '소리가 안 나와서 글로 봐요.') · 설계 4(선생님 초상 · 말투 · 한국어 줄 → 영어 토막 24px) · 설계 10(읽어 주기 실패: 감시가 넘기면 단추 밝음 · '소리가 안 나와서 글로 봐요.' speech.skip_notice_seconds; ko-KR 없음 · read_ko 끔(skipped)이면 글로만 · 단추 바로 밝음 · 안내 없음 — 마-1 검토 M3) · 설계 6(시드 칸 teach.* · todayKo · lineKo · whyKo · chips · askRole 등 — 정규 시드 `seed/lessons/{reading,writing,speaking}/3/1.json` 이 실제 꼴) · 15절 AC-3g(정본, 델타 3a 조각) · AC-N20(단위), UI · UX 2-가 보고(토큰 · 모양 · 테이프 열쇠 · 흐린 단추 규칙 · stuck-buttons) · 4-가 보고(TeacherPortrait 둥근 꼴 갈래 · 상태 표지 — 가져다 쓰고 그 파일은 고치지 않음) · 마-1 보고(voiceFor · SpeakOptions.lang · skipped 결과) · 0-라(speakHeardOutcomeOf — 화면은 heard 를 직접 보지 않음). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 할 것(plan 라-1 표)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/session/teach/{teacher-line,chips,today,show,together,why-bubble,story,spare-intro}.tsx`(제안) | 신규 | 선생님 줄(초상 · 말풍선 · 한국어 줄 읽기 → 영어 토막 읽기(마-1 voiceFor 쓰임 teacher_ko · teacher_en) · 감시 끝에 단추 밝힘 · '소리가 안 나와서 글로 봐요'(not_played 일 때만, speech.skip_notice_seconds) · skipped 면 바로 밝음 · 안내 없음) · 칩(role → 이름 · 색 토큰) · 이름표(askRole) · 오늘 배울 것('시작') · 새 단어 카드(낱말 · 뜻 · 소리 · 그림 · parts, 예문 없음) · 본보기(문장 + 칩이 선생님 말에 맞춰 켜짐 · 뜻 · 1~2단계 그림) · 같이 해 보기 틀(거의 채운 문장 · 글 · 띠 · 빈 자리 — 영역 입력은 라-2 · 라-3 이 붙임) · '왜' 말풍선(같은 문항 위에 초상 + 한 줄 + 틀린 뒤 단추 셋 가운데 하나) · 이야기 화면(글자 없이 소리만 · 저절로 한 번 · '다시 듣기' 한 번 · '다음') · 짝 첫 장(앱 문구 셋 가운데 하나). 조각은 자료(시드 칸)와 콜백만 받고 세션 상태를 모른다 |
| `src/core/session/teach-line.ts`(제안) · `tests/unit/teach-line.test.ts`(제안) | 신규 | 선생님 줄 단추 상태 순수 함수: 읽기 끝(played · no_end) → 밝음, 감시 끝(not_played) → 밝음 + 안내 한 줄, skipped(ko 없음 · read_ko 끔) → 바로 밝음 · 안내 없음, 읽는 중 → 흐림. AC-N20 단위 갈래 |
| `src/app/globals.css` | 수정 | 칩 토큰(role 여덟: 누가 · 하는 일 · 무엇 · 어디 · is · 어때요 · 마침표 · 예비) 더하기만, 값은 ② 팔레트 안(글자 대비 7:1 또는 글자 아님 3:1), check:ids design-number 기준 49 안 |
| `tests/unit/teach-pieces.test.ts`(제안) | 신규 | 조각마다 자료 → 그려지는 것(문구 표 글자 그대로 · 칩 이름 · 이름표 · 단추 상태) |

## 지키는 것
아이 화면 문구는 spec 설계 5 '정본 밖 문구' 표 글자 그대로(새 문구 금지), 해요체, 한 화면 한 행동, 큰 글자(4절 크기). 선생님 초상은 TeacherPortrait(4-가) 를 가져다 쓰고 3D 를 들이지 않는다(NFR-11 · 첫 JS 검사). 설계 숫자는 토큰 · 파일 머리 상수. 세션 틀(session-frame — 5-가 가 고치는 중) · 활동 조각(reading · writing-items · speaking — 라-2 · 라-3) · 시드 · specs 는 손대지 않는다(새 파일만). 영어 토막은 선생님 영어 목소리, 한국어 줄은 ko-KR + 선생님 높이(마-1). 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름 AC-3g · AC-N20). 로컬 눈 점검은 라-2 가 세션에 붙인 뒤 컨트롤러가 찍는다. 보고 `task-teach-ra1-report.md`(50줄 안): 조각마다 입력 꼴(시드 칸 이름) · 콜백 · 칩 토큰 값 표 · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
