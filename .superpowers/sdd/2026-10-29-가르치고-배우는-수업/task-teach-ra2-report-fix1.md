# 구현 보고 fix 1: 가르치고 배우는 수업 묶음 라-2 읽기 · 쓰기 연결(2026-10-30 04:0x, 구현자 Opus · high)
상태: DONE. 워크트리 p13d이고 커밋은 하지 않았다. 라-1 조각 · result.ts · result-view.tsx · tests/.tmp/l3-samples 는 손대지 않았다.

## 지적별
| 지적 | 판정 | 고친 곳 |
|---|---|---|
| I1 짝 '왜' 화면의 '다음'이 읽기 전부터 밝음 | ADDRESSED | 읽기 reading.tsx:497(spareWhyDone) · 짝 '왜' 말풍선의 onLineEnd 가 세션 틀 셈을 부른 뒤 spareWhyDone 을 켬 · :679~682 '다음'은 짝 틀림이고 '왜' 줄이 있으면 줄이 멈출 때까지 흐림. 쓰기 writing-items.tsx:196 · :374~376 같은 꼴. 줄이 멈추는 때는 라-1 teachLineStateOf 규칙(다 읽음 · 들려주지 못함 · 끊김 · 읽지 않음)이라 소리가 안 나도 밝아진다. '왜' 줄이 없는 짝과 혼자 문항 정답 보기 · 맞음의 '다음'은 그대로 바로 밝다 |
| M1 진행 막대가 내지 않을 짝 칸을 셈 | ADDRESSED | teach-frame.ts:94 progressFinalsOf → progressHiddenOf(혼자 해 보기를 다 끝낸 뒤의 skip 을 돌려줌, 도중에는 빈 모음). progress.ts:143 · :150 activityGroupsOf 넷째 인자 hidden(그 활동은 칸 · 묶음을 만들지 않음, 기본 빈 모음이라 다른 부르는 곳은 그대로). session-frame.tsx:1567 · :1618 이 끝낸 칸 대신 뺄 칸을 넘긴다 |
| M2 무음 모드 줄이 한 세션에 여러 번 | ADDRESSED | teach-frame.ts:114 TeachNotices 에 shown(이 세션에서 더했나) · :125 teachNoticesAfter: 두 번째 안내에서 한 번 켜고, 켜진 동안의 안내는 그대로, 소리가 난 줄이 끝나면 거두며 거둔 뒤의 안내에는 다시 켜지 않는다 |
| M3 · M4 | 고치지 않음 | 컨트롤러 지시대로 M3 은 7-가 화면 검토, M4 는 지금 규칙(정답의 is 자리) 유지 |

## 더한 · 고친 시험
- reading-teach 'AC-3d 짝도 틀린 '왜' 화면의 '다음'은 선생님이 줄을 읽기 전에는 흐리고(설계 5), 짝을 맞힌 화면의 '다음'은 바로 밝다'(혼자 문항 정답 보기의 '다음'도 밝음)
- writing-teach 같은 이름의 쓰기 시험
- teach-frame 'AC-22c 진행 막대는 혼자 해 보기를 다 끝낸 뒤 내지 않을 짝을 빼고 낸 짝만 센다(정한 것 3), 도중에는 빼지 않는다'(낸 짝 하나 · 짝 없음이면 묶음 없음) — 옛 'AC-22c 진행 막대는 … 끝낸 것으로 본다'를 바꿈
- ux-progress 'AC-22c 내지 않을 짝(hidden)은 막대에서 빠져 '스스로 해 보기'는 낸 짝만 센다(정한 것 3 · 위험 9)'
- teach-frame 'AC-N20 선생님 줄 안내가 한 세션에서 두 번째로 나면 무음 모드 줄을 켜고, 소리가 난 줄이 끝나면 거둔다'에 거둔 뒤 세 번째 · 네 번째 안내에 다시 붙지 않는 단언, 새 'AC-N20 무음 모드 줄은 안내가 세 번째로 나도 거둔 뒤라면 다시 붙지 않는다(…)'
- e2e teach.spec(정적): 쓰기 짝 틀림 단계에서 '다음'이 밝아지기를 기다린 뒤 누른다

## 관문(p13d, Node 24, 04:0x)
| 관문 | 결과 |
|---|---|
| pnpm lint(전체 biome) | 종료 0(라-4 파일 형식 오류도 이제 없음) |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 123 파일 · 1455 통과 · 6 todo(바뀐 넷: teach-frame · ux-progress · reading-teach · writing-teach 53 통과) |
| pnpm check:deps | 위반 0(271 모듈) |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(전과 같음) |

## 남은 우려
1. e2e · 통합은 여전히 정적이다(11-01 뒤 CI).
