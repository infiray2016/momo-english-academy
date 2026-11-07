# 브리프 A: 불편 1차 묶음 — 음성 · 듣기 피드백(구현자 · Opus · high, 2026-10-29 17:5x)

바탕 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(0c664c3 위). 근거 UX 검토 3판 `ux-review-report.md`(2절 ⑤ ⑥ ⑦ · 4절 (다) · 2절 끝 불편 장면 4 · 5 · 6 · 9 · 10 · 11 · 12) · 13절 C166. 다른 구현자(브리프 B)가 같은 워크트리의 화면 조각을 고치므로 **아래 파일만** 만진다. 보고 `task-ux-fix-a-report.md`.

## 고칠 것(파일 소유: src/lib/speech/browser.ts · src/core/speech/*.ts · src/components/session/speak-button.tsx(또는 말하기 단추 조각) · src/components/conversation/child-turn.tsx · src/components/conversation/follow-along.tsx · src/components/session/speaking.tsx · src/components/session/mic-blocked.tsx · 관련 시험)
1. **U5-1 읽어 주기 감시(Critical)**: speak 에 '시작 안 옴 N초 · 끝 안 옴 상한'을 두고 못 오면 ended 로 처리. 값은 12절 설정 키(speech.speak_start_timeout_seconds · speech.speak_end_timeout_extra_seconds 꼴, seed/settings.json 잠정값 + 코드 기본값 아님 — 설정값 원칙). 대화 턴에서 읽는 중에도 말하기 단추를 보이고 누르면 읽기를 멈춘다(R1, 7절 C53 (2)).
2. **U4-2 듣는 중 표시(Important)**: 말하기 단추 글 '듣고 있어요' + 소리 들어옴 표시(browser.ts soundstart · speechstart 를 단추에 전달). 말하기 · 회화 · 배치가 같이 쓰는 조각이라 한 번에.
3. **R2 따라 말하기 읽는 중 단추**: 읽는 중 흐리게(disabled 아님 — 누르면 '다 읽은 뒤 눌러요' 한 줄) · 끝나면 켬. 회화 follow-along 과 말하기 speaking 둘 다.
4. **U4-4 세 번 실패 건너뜀 한 줄 안내**('이건 다음에 다시 해요' 해요체 한 줄, 1.5초 설정값) — speaking.tsx · follow-along.tsx.
5. **U5-4 조용한 '모름' 전환 한 줄 안내**('잘 안 들려서 다음으로 가요' 꼴) — child-turn.tsx.
6. **U6-1 · U4-5 막힘 화면 '다시 해 볼래요'**(R6): mic-blocked 에 단추 하나 더 — 누르면 그 기기 마이크 다시 확인 → 되면 같은 자리로, 안 되면 같은 막힘 화면.
7. **U5-3 · U5-9 아이 말풍선 남기기**: 보낸 뒤에도 내 말풍선을 다음 선생님 턴까지 남기고, 1~3단계 바로 보내는 턴도 말풍선을 띄운다(인식 글). child-turn.tsx(+ talk-frame 의 표시 상태가 필요하면 최소로, B 와 겹치지 않게 함수 하나만).

## 시험 · 관문
먼저 쓰고 실패를 본 뒤 고친다. 단위(감시 타이머 · 단추 상태 · 안내 문구 노출) · 통합(가능하면) · e2e(사진 꼴 시험 이름에 U 번호). `export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH` 뒤 `pnpm test` · `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm check:deps` · `pnpm check:ids` 통과(새 설정 키는 seed/settings.json · 12절 사본 specs/09 에 더해 check:ids 통과). 커밋하지 않는다. 아이 이름 · 비밀값 금지. 마지막 답은 상태 · 보고 경로만.
