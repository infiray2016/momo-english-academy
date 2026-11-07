# 마이크 점검 쪽 fix 8 검토 브리프(가벼운 루프 · 범위 한정 · Opus high)

## 맥락(열 줄 안)

- 닿는 결정: 13절 C210 · 요청자 결정 2026-11-06 6 가. 요청자 강조: 안내는 아주 쉽게, 한 라운드로 끝내기(지난 라운드는 fix 7 의 결함 셋으로 네 차례가 오염됨).
- 지난 검토 `task-mic-probe-fix7-review.md`(같은 검토자): Critical C1(읽기 전 cancel 없음) · C2(버림 stop 이 소리 끝을 기다리지 않음) · C3(banana 를 아무 final 로 셈) · Important I1(S 꼴 apple 을 final 로만 셈). 이번 fix 8 이 이것을 고친다.
- 구현 브리프 `task-mic-probe-fix8.md`(분석 보고 10.19.3 Y-1~Y-6 · 차례 0~13(10.19.5 갱신 표)). 구현 보고 `task-mic-probe-report.md` 'fix 8' 절. diff 는 `scratchpad/diff-mic-probe-8.patch`(p13d f5c3361 뒤 변경).
- **이번 검토는 배포 안내 전에 본다.** 측정 해석을 바꾸는 결함(차례 순서 · 소리 종류 · 때 · 소리 끝 뒤 stop · speaking 확인 · cancel 유무(차례 8 예외) · 1.5초 하한 · 차례 11 의 banana 셈 · 차례 12 의 45초 쉼 · 기록 칸)은 Critical 로 첫 줄에.

## 볼 것(범위 한정)

1. C1~C3 · I1 이 ADDRESSED 인가(지난 보고 지적별로 판정).
2. 자동 차례 0~13(10.19.5 갱신 표) 가 브리프 표와 같은가(소리 종류 · 부른 때 · 버림 하한 · 차례 8 의 '1.0초 시작 · 1.5초 stop · cancel 없음' · 차례 11 S 꼴 · 차례 12 쉼).
3. Y-3: 소리 끝 + 300ms 와 하한을 둘 다 채운 뒤 stop, 읽기 끝 알림 누락 때 감시 상한, stop 뒤 speaking 거짓 확인(폴링 상한) → 1초 → 진짜. 실제 읽기 길이가 하한보다 길 때(예: 문장 2.6초 > 1.5초) 진짜가 읽는 중에 열리는 길이 남아 있지 않은가(차례 8 만 의도).
4. WebAudio: AudioContext 를 누름 안에서 만들고 resume 하는가, 띵이 버림 audiostart 뒤 0.2초에 시작해 1초 뒤 끝나는가, 끝을 기다린 뒤 stop 하는가.
5. 기록 칸 Y-6 과 갈래별 줄 셈, zod 기본값 호환, 8KB 상한.
6. 단위 시험이 가짜 읽기 길이를 차례마다 달리 주어 3 을 실제로 가르는가(빈 단언 금지).
7. 타이머 · 리스너 정리, 녹음 · getUserMedia · DB 쓰기 없음, 앱 본 코드 · 설정값 · 로그 끝점 변경 없음.

## 보고

`task-mic-probe-fix8-review.md`: 판정(Approved · 수정 필요) · 지난 지적별 ADDRESSED 여부 · 새 지적(심각도 · 파일 · 줄) · 측정 해석에 영향 있는 결함 여부 한 줄.
