# 구현 보고 fix 1: 가르치고 배우는 수업 묶음 라-3 말하기 연결(2026-10-30 05:0x, 구현자 Opus · high)
상태: DONE. 워크트리 p13d이고 커밋은 하지 않았다. 판정 함수(attempt.ts · judge.ts · spare-outcome.ts) · 근거 함수(evidence/teach.ts) · 셈 함수(englishSentencesOf)는 바꾸지 않았다.

## 지적별
| 지적 | 판정 | 고친 곳 |
|---|---|---|
| I1 AI 질문 echo 가 따로 된 진행 시도 행으로 저장됨 | ADDRESSED | 서버 `src/server/speaking/index.ts`: 입력 칸 echo :77, 순수 함수 echoMergedInput :183(질문 끝 시도에 echo 를 한 번만 — 이미 있거나 빈 글이면 그대로), 같은 시도 id 갈래 :241~ 에서 그 행의 input.echo 와 word_count 를 갱신한다 :254~(AI 는 다시 부르지 않음, 동시 요청은 `input ->> 'echo' is null` 조건으로 한 번). 판정 전 echo 는 invalid :299. 화면 `src/components/session/speaking.tsx`: AiAnswerRequest.echo · sendEcho :1225(같은 시도 id 로 보냄 — 닿지 않으면 '인터넷이 끊겼어요 …'와 '다음'으로 다시 보내고, online 때도 다시 보냄 :1257 · 보내는 상태 :1099 · :1466). 세션 틀 `session-frame.tsx` 의 queueEcho(진행 시도)를 지웠다. 끝 시도 꼴 · 근거 retry { assist: [echo], accuracy } 읽기는 1~2단계 질문과 같은 자리(question 꼴 echo 칸)라 셈 함수는 그대로다 |
| M1 질문 · 바른 답을 선생님 영어 목소리로 | ADDRESSED | `speaking.tsx` teacherEnglishSpeech :152 · useTeacherEnglish :161(가르치는 수업이면 voicedSpeech — 높이 · 목소리 순서, 고르기 전이면 기본 목소리, 가르치는 수업 밖은 세션 접점 그대로). 쓰는 자리: 따라 말하기 본보기 · 끊어 들려주기 :301, 질문 읽기 · 질문 '다시 듣기' · 바른 답 :1110, 같이 해 보기의 바른 답(SpeakingTogetherInput teacher — 세션 틀 :513 이 넘김). 글 자료(듣기 대본 · 이야기)는 세션 접점 그대로다. `reading.tsx` 는 고치지 않았다. 읽기의 '읽어 주기'는 지문 · 짝 글(글 자료 — 지금 목소리)만 읽고, 읽기 문항을 읽어 주는 자리는 지금 화면에 없다 |
| M2 · M3 | 고치지 않음 | 컨트롤러 지시대로 장부 · 7-가 · 음성 점검으로 |

## 더한 · 고친 시험
- 단위 speaking-teach: 'AC-3h 가르치는 수업의 질문 · 바른 답 · 따라 말하기 본보기는 고른 선생님의 영어 목소리(높이 · 목소리 순서)로 읽고, 가르치는 수업 밖과 고르기 전은 세션 접점 그대로다' · 'AC-22k echo 를 합친 끝 시도는 한 행에서 영어로 말한 문장 둘(답 · echo)로 세고, 근거는 그 행의 retry(echo)로 읽는다'(englishSentencesOf 1 → 2, teachEvidenceOf retry { assist: [echo], accuracy: correct }) · 'AC-22k echo 는 한 번만 합친다(다시 보냄 · 끊김 뒤 같은 시도 id …)'
- 통합(정적) speaking-eval: 'AC-22k '같이 말해 볼까요' 뒤 말: 같은 시도 id 와 echo 로 다시 부르면 AI 를 다시 부르지 않고 저장된 그 끝 시도 행에 echo 가 한 번 들고 단어 수가 늘며, 다시 보내도 한 번이다(echo 만 먼저 오면 invalid)'
- e2e(정적) teach.spec 'AC-22c 말하기 …': echo 단언을 끝 시도 행(q0Final.echo)과 진행 시도 0 으로 바꾸고, 질문은 미나 높이 · 이야기는 높이 없이 읽었는지(가짜 음성 기록 pitches) 단언을 더했다

## 관문(p13d, Node 24, 05:0x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 533 파일, 오류 · 경고 0 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 126 파일 · 1504 통과 · 6 todo(새 3) |
| pnpm check:deps | 위반 0(273 모듈) |
| pnpm check:ids | 종료 0, fixture-setting 0, design-number 47(전과 같음) |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(전과 같음) |
| pnpm build · check:bundle | 종료 0 · 위반 0, 세션 첫 JS 25덩이 3D 표지 0 |

## 남은 우려
1. 정본 AC-19j 끝 문장('읽기 · 말하기 영역 읽어 주기는 높이 · 목소리 순서를 넘기지 않는다')은 가르치는 수업에서 설계 4 목소리 표(M1)와 어긋난다. 가르치는 수업 밖(1단계 시드 · 지금 화면)은 그대로라 기존 e2e 는 깨지지 않지만, 정본 문장은 컨트롤러가 '가르치는 수업 밖'으로 좁혀 적어야 한다.
2. echo 를 보내지 못하면 아이는 '다음'을 눌러 다시 보내야 넘어간다(같은 시도 id — 끝 시도 판정은 이미 저장됨). 통합 · e2e 는 정적이다(11-01 뒤 CI).
