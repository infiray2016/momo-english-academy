# 구현 브리프: 회화 선생님 — 시드 쪽 몫(implementer 새로 · Opus · high, 2026-10-23 09:0x)

까닭: 13절 C128(네 영역 1단계 실시드로 한 번에) — 회화 카드 본 생성 전에 선생님 변경의 시드 쪽 몫이 들어가야 한다(C122 · C130 (3), 델타 spec '시드와 검증' 절 · 차수 '1-가, P8 회화 묶음 앞'). 나머지(선생님 화면 · 3D · 목소리 · 고르기)는 C118 차례로 뒤 — 이번에 하지 않는다.

자리: 워크트리 p08(`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p08`, 가지 feature/1a-p08-seed-generation). 정본은 본 저장소 `specs/`(최신, 커밋 2095549 · C130 · C131) — p08 의 specs 는 옛 판이니 컨트롤러가 옮겨 준다(아래 0). 시험 먼저. 커밋 없음. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`.

0. 시작 전: 본 저장소 `specs/` 를 p08 `specs/` 로 덮어 맞춤(컨트롤러가 이미 했으면 건너뜀 — `diff -rq` 로 확인).
1. **명단 자료 `seed/teachers.json` + Zod 규격** — 5절 · C130 (1) 의 항목 꼴(키 · 꼴 · 한글 이름 · 영어 이름 · 소개 · 성격 세 낱말 · AI 성격 글 · 인사 · 색 · 모델 파일 · 초상 그림 · 목소리 값 · 출처). 1-가 명단 미나 · 리오(이름 · 소개 · 인사 · 성격은 델타 spec `intent/2026-10-17-회화-선생님-캐릭터/spec.md` · 명단 쪽 https://claude.ai/artifact/VJFgzXHGQXUDKEUSdApjQd 의 미나 · 리오 글). **지금은 이름 칸이 쓰이는 몫만 필수** — 모델 · 초상 · 목소리 값 칸은 선생님 화면 plan 때 필수로 바꾼다(규격 주석 · 장부). 명단 검사 함수(키 겹침 · 이름 겹침 · vocab 단어인 영어 이름 · 성격 낱말 셋)를 순수 함수로, 파일이 있어야 하는 검사(없는 모델 · 초상)는 그 칸이 채워질 때만.
2. **시드 검증 '선생님 이름' 검사**(6.4 새 행 · AC-5 · AC-19 의 시드 몫): 회화 시나리오 카드 · 회화 평가 카드 · 선생님 이야기(지금 칸 kind tori_story)의 모든 글 칸에 'Tori' · '토리'와 명단의 영어 · 한글 이름이 있으면 그 칸 오류. 영어는 대소문자 무시 · 낱말 경계, 한국어는 이름 뒤 조사 허용(이 · 가 · 와 · 과 · 아 · 야 · 는 · 은 · 를 · 을 · 의 · 에게 …). 읽기 · 쓰기 · 말하기 글은 보지 않음. `{TEACHER}` 는 지금 '틀 자리' 오류 그대로. 명단을 늘리면 모든 시드를 다시 봄(명단이 검사 입력).
3. **설정 키 다섯**(12절 · C130 · C131): `seed/settings.json` 실시드 · `tests/fixtures/settings.ts`(시험) · 시험용 나무 설정에 같은 값 — talk.teacher_model_max_mb 8 · talk.teacher_portrait_max_kb 100 · talk.teacher_load_timeout_seconds 6 · talk.teacher_praise_seconds 2 · talk.teacher_render 3d(범위 · 바꾸는 곳은 12절 행 그대로). `pnpm check:ids --specs <본 저장소 specs>` 0.
4. **시험용 시드 나무 고침**: 시험용 회화 카드 · 평가 장 · 토리 이야기 견본에 'Tori' · '토리' · 명단 이름이 있으면 새 검사에 걸리므로 이름 없는 글로(뜻은 그대로). 시험 이름이 바뀌면 그 시험 단언도.
5. vocab.json 예문 넷은 **학습 설계자 몫**(같은 시간에 고치는 중) — 손대지 않는다.

시험: 단위 '시드 검증 선생님 이름'(영어 대소문자 · 낱말 경계 · 한국어 조사 · 읽기 글은 안 봄 · {TEACHER} 는 틀 자리) · 명단 검사(가짜 자료마다 거부 하나) · 규격. 관문: `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm -s seed:validate`(실시드 오류 0 — 읽기 · 쓰기 · 말하기 442칸 그대로 통과) · `pnpm check:ids`.

보고: `task-teacher-seed-side-report.md`(같은 폴더) — 파일 · 시험 · 관문 결과 · 정본으로 풀리지 않아 정한 것 · 우려. 마지막 답장 한 줄 요약.
