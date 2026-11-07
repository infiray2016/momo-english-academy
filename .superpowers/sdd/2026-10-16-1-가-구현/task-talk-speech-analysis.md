# 브리프: 회화 중 '음성 인식이 안 됨' · 입력이 dont_know 로 기록되는 길 — 클라이언트 음성 분석(읽기 전용, 2026-10-29)

바탕 가지 p13d(`/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, 1e44de5). 고치지 않는다. 보고는 `task-talk-speech-analysis-report.md`(같은 폴더).

## 요청자 말(10-26, 3D 프리뷰, 기기는 iPad 로 추정 — 10-22 에 iPad 사파리 · 크롬 둘 다 지원 C102, 무음 모드가 원인이던 일 C106)
(2) "진행하다 보면 음성 인식이 안 됨" (1) "처음 대화가 인사만 계속 반복하는 것".

## 개발용 DB 기록(아이 이름 가림): `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/talk/talk-dump.md`
- 10-26 08:02 세션 eb16ecf4: 아이 턴 셋이 모두 input_mode=dont_know, listen_end_seconds 없음, 첫 턴 perceived_wait_ms 6073 · 둘째 1915. 10-24 09:42 세션 f2c26a00 은 speech 로 "I'm good today" 인식(듣기끝 3s).
- 요청자가 '모름' 단추를 눌렀는지, 말을 했는데 인식이 비어 앱이 dont_know 로 보냈는지 기록만으로는 모른다.

## 물음(각각 파일:줄 근거로)
1. 아이 턴에서 input_mode=dont_know 가 서버로 가는 모든 길: '모름' 단추, 듣기 시간 끝(무음 · no-speech), 인식 오류(aborted · not-allowed · network), 기다림 초과 등. 각 길이 기록에 남기는 칸(perceived_wait_ms · listen_end_seconds · hint_level · heard_help)과 대조해 eb16ecf4 의 세 턴이 어느 길로 보였을 가능성이 큰지 추정(근거 있는 것만). 코드: src/components/conversation/child-turn.tsx · talk-frame.tsx · src/core/conversation/listen.ts · attempt.ts · src/lib/speech/* · src/core/speech/*.
2. 듣기(SpeechRecognition)가 몇 턴 뒤 멈추는 길: 인스턴스 재사용 · 다시 시작(restart) 규칙 · 읽어 주기(TTS) 뒤 오디오 세션 · iOS 사파리 제약(audioSession 'playback', 사용자 제스처 없이 start 불가, visibilitychange · 자리 비움) · 정본 7절(specs/ 의 7절 장) 요구와 대조. 10-22 관찰 페이지(impl-probe, src/app/dev/* 의 음성 관찰 쪽)에서 알게 된 사실(무음 모드 · audiostart 지연)이 회화 화면에도 반영돼 있는지.
3. 인식이 비었을 때 아이에게 보이는 것: '다시 말해 봐' 안내인지, 곧바로 '모름' 처리인지, 몇 번까지 다시 듣는지. 아이 눈에는 '인식이 안 됨'으로 보이는 흐름을 짚는다.
4. 서버 쪽에 클라이언트 음성 사건(듣기 시작 · 끝 · 오류)을 남기는 기록이 있는가(talk_turns 칸 · 다른 표 · 관찰 쪽). 없으면 다음 재현 때 무엇을 남기면 원인을 가를 수 있을지(최소 칸) 제안.
5. 결론: (가) 10-26 '인식 안 됨'의 가장 유력한 원인과 근거 등급(확인됨 · 유력 · 추정) (나) 결함이면 고칠 자리 · 최소 변경 · 시험 (다) 요청자에게 다음 시험 때 확인을 부탁할 조건(기기 · 브라우저 · 무음 모드 · 어느 턴에서 멈췄는지).

## 지키는 것
- 사실과 가설을 가른다. 심각도 · 근거(파일:줄) 필수. 아이 이름 · 비밀값 금지. DB 접속 금지. 보고는 한국어, 300줄 안.
