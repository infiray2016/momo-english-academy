# 브리프 B fix 3: 재검토 B 의 새 Minor 넷(구현자 impl-ux-b · Opus · high, 2026-10-29 19:1x)

근거: 재검토 보고 `.superpowers/sdd/2026-10-29-UI-UX-개선/review-b-round2-report.md` 3절(Approved, 새 Minor N-1~N-4). 작업 자리 · 파일 소유 · 관문은 전과 같다. 커밋하지 않는다. 작은 고침 넷이다.

| 지적 | 결정 | 할 일 |
|---|---|---|
| N-1 낱말 셈을 바꾸며 '다 썼어요' 켜짐 기준이 바뀜(한글만 쓴 초고는 못 보냄) | 의도 아님 — 되돌린다. 아이가 막히는 길을 두지 않는다 | '다 썼어요' 켜짐은 '글이 비었는가(trim)'로 되돌리고, 보이는 낱말 수와 분량 아래 판정은 sentenceWords 그대로. 단위 시험 한 줄(한글만 쓴 글 → 단추 켜짐, 보내면 분량 아래 쪽지) |
| N-2 끝맺음 상태 묻기가 실패하면 읽은 끝인사가 첫 장에 안 남음 | 고친다('읽은 것은 남김') | 콜백이 오류일 때도 setBye(wrap.farewell)(또는 정리 조각이 고른 끝인사를 onDone 으로 넘김). 단위 시험 하나 |
| N-3 서버의 별 수 싣기를 잠그는 시험 없음 | 통합 단언 두 줄(돌리지는 못해도 정적으로 맞춤) | session-flow.test.ts 결과 toMatchObject 에 starsPerLesson, conversation-session.test.ts 마무리 단언에 같은 칸 |
| N-4 '별 하나' 글 두 곳 | 고친다 | closing-cards.tsx 설명 · star-count.test.ts 시험 이름 |

관문 다섯 통과 뒤 보고 끝에 'fix round 3' 절을 더하고, 마지막 답은 상태와 보고 경로만.
