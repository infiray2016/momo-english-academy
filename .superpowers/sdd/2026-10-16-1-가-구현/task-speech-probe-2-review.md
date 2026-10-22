# 검토 브리프: 음성 관찰 페이지 2판 — 코드(code-reviewer rev-probe · Opus · high, 2026-10-22 20:3x, 가벼운 루프 · 범위 한정)

코드: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p11` 작업 트리(HEAD cce2238, 커밋 전 — `git -C <워크트리> diff` 와 새 파일 셋 `src/app/dev/speech-probe/probe-audio.ts` · `probe-browser.ts` · `tests/unit/speech-probe-audio.test.ts`; 고친 셋 `speech-probe.tsx` · `src/lib/speech/types.ts` · `tests/e2e/speech-probe.spec.ts`). CI 가지 `ci/p11-c2` 274ce92 가 같은 내용(CI 20차 — 결과는 컨트롤러가 덧으로). 브리프 `task-speech-probe-2.md` + 컨트롤러 SendMessage 셋(보고에 '추가' · '추가 2' 절로 반영) · 구현 보고 `task-speech-probe-2-report.md`.

배경(장부 `ledger-open.md` H2 실측 1~5 · 13절 C102 · C106): iPad 사파리 음성 실패의 원인은 iPad 무음 모드로 확정됐다. 2판은 요청자가 사파리에서 세 묶음(무음 모드 켠 채 스위치 없이 → '자동으로 두기' 켜고 → 무음 모드 끄고)을 재어 Audio Session API 로 앱이 무음 모드를 넘을 수 있는지 가리는 도구다. 아이 화면 · 음성 접점(`src/lib/speech/browser.ts` · `checkMicrophone`)은 바꾸지 않는 것이 조건이다.

볼 것(지적마다 Critical · Important · Minor 와 근거 — 파일:줄 · 정본 절 · 브리프 항목):
1. **범위 지킴**: `src/lib/speech/browser.ts` 무변경, `types.ts` 는 trace 종류 추가만(기존 종류 · 필드 이름 그대로 — 기존 e2e `speech-probe.spec.ts` 의 옛 단언이 그대로 초록인지), 아이 화면 파일 무변경, 개발용 쪽이 접근 쿠키 뒤인지(기존 `/dev/*` 보호 그대로).
2. **녹음 없음(7절 · CLAUDE.md)**: `getUserMedia` 스트림이 AnalyserNode 로 수치(RMS 최대 · 평균 · 들린 비율)만 남기고 저장 · 전송 · 재생이 없는지, 재기 끝 · 듣기 끝 · 쪽 떠남 · 오류 때 트랙을 반드시 멈추는지(변이 시험 했다는 보고 확인), AudioContext 를 닫는지(누수).
3. **Audio Session API 사용 꼴**: `navigator.audioSession.type` 값 집합(`auto` · `playback` · `transient` · `transient-solo` · `ambient` · `play-and-record`) · 없을 때 안전한 비활성 · '자동으로 두기' 가 읽어 주기 · 교대 매 문장 · 비프 앞 `playback`, 듣기 · 마이크 확인 · 마이크 소리 재기 앞 `play-and-record` 로 두는 자리가 사용자 동작 안인지(둘째 문장부터는 동작 밖 — 보고 우려 — 그 한계를 기록이 드러내는지), 바꾼 값 · 읽은 값이 trace 에 남는지, 기본 꺼짐.
4. **기록 · 복사 꼴**: 새 사건 여섯(`env` · `devices` · `mic-level` · `beep` · `heard` · `audio-session`) + 지연 요약 한 줄(듣기 · 객체마다 start 호출 → start 이벤트 → audiostart(같은 ms 표시) → 첫 소리 → 첫 결과 → 끝) · 듣기 중 함께 재기 결과(listen-done 끝)가 요청자가 붙여 넣는 복사 글에 그대로 들어가는지, 장치 이름 · UA 같은 사실이 아이 이름 · 비밀값을 담을 길이 없는지.
5. **설계 숫자**: 3초 · 440Hz · 0.5초 · 들린 문턱 0.01 이 이름 붙인 관찰 페이지 상수인지(`check:ids` 0 보고 확인), 설정값과 섞이지 않는지.
6. **시험**: 단위(RMS 요약 순수 함수 · trace 꼴) 16 + 4 + 2, 관찰 페이지 e2e 13 → 16 → 18(가짜 `getUserMedia` · `AudioContext` · `audioSession`) — 가짜가 실제 API 꼴과 어긋나 통과만 하는 자리가 없는지, 전체 e2e 는 CI 20차 몫.
7. 범위 밖 관찰(앱 음성 접점에 audioSession 을 넣을 때 주의할 것)은 '참고' 절에 따로 — 다음 fix 브리프의 재료.

보고 `.superpowers/sdd/2026-10-16-1-가-구현/review-speech-probe-2.md`(첫 줄 판정 Approved · Changes requested, 지적 표, 맞는 것 표, 참고). 끝나면 SendMessage 한 줄. 코드 · 문서는 고치지 않는다. 시험을 돌릴 때는 `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"` 뒤 `pnpm test`(단위만).

## 덧(20:5x) — fix 1 재검토(범위 한정)
fix 1(`task-speech-probe-2-fix1.md`, 보고 'fix 1' 절)이 작업 트리에 들어갔다(CI 가지 ci/p11-c2 6b584b4 = 작업 트리, CI 21차). **I-1 · I-2 만 ADDRESSED · NOT ADDRESSED 로 판정**(근거 파일:줄 · 시험 이름). M-1~M-5 는 컨트롤러 결정대로 고쳤는지 한 줄씩만 확인(새 지적은 fix 1 이 건드린 자리에서 생긴 것만). 구현자가 다르게 한 것 — M-4 읽어 주기 쪽은 browser.ts 를 안 고치려고 바로 앞 새 줄 `speak-request`(교대 몇째 문장 · 세션 · 누름 안 여부)로 — 가 M-4 의 뜻을 채우는지 판정. RESUME_WAIT_MS 2000 · 이름 갈래 낱말 목록은 어림(관찰 페이지 상수) — 지적 아님. 보고 `review-speech-probe-2-fix1.md`, SendMessage 한 줄.
