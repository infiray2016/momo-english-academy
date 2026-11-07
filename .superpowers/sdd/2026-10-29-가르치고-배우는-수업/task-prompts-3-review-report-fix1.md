# 재검토 보고(fix 1, 범위 한정): 생성 브리프 3판 · 틀 · 문법 용어 68(design-reviewer · Fable · max, 2026-10-30 02:0x)
판정 **Approved** — NOT ADDRESSED 0(I 3 · M 9 모두 ADDRESSED). 본 범위: 세 브리프 7 · 10 · 13 · 14절과 보고 3판이 적은 고친 자리(5 · 8 · 11절 줄, 틀 R8 · R10 · R14 · 인물 규칙 쓰기 줄, README 3단계 줄 · 7절). 해시는 보고 값과 같다: reading-3 fc57e2f0… · writing-3 f4554611… · speaking-3 5ee7f413… · _template efd84b0f… · grammar-terms.json 495bc121…(`wc -l` 은 972 · 888 · 954 로 보고의 973 · 889 · 955 와 끝 줄 셈만 다름, 참고). 파일은 고치지 않았다.

| 지적 | 판정 | 근거(파일 · 줄) |
|---|---|---|
| I-1 단원 1 단어 일곱이 '쓰지 않는 낱말'에 | ADDRESSED | reading-3.md:248 · speaking-3.md:262 에서 sleep · study · watch · listen · look · see · make 가 빠지고 clean · sit · stand · open · close(단원 4)만 남음(줄을 코드로 대조). writing-3.md:248 은 일곱이 단원 2 단어라 그대로(맞음) |
| I-2 뒤집힌 낱말 짝(L-25) | ADDRESSED | _template.md:202 R14 #1, reading-3.md:918 14절 #10(빈칸 답 · 함정 낱말), speaking-3.md:137 5절 질문 꼴(milk ↔ juice 보기 · 까닭) · 898 14절 #9. 승인 Q2' 는 정정 후보로 보고 3판에 기록 |
| I-3 동물 인물의 사람 일 | ADDRESSED | _template.md:127 R10, reading-3.md:336 · writing-3.md:336 · speaking-3.md:339 (10절, 사람 이름 일곱 명시), reading 14절 #13(921) · speaking 14절 #15. 승인 듣기 L3 는 정정 후보로 기록 |
| M-1 문법 용어 모자람 · 과함 | ADDRESSED | grammar-terms.json 68(제안한 21 모두 더함, '주어' 예외에 주어지 · 주어져 · 주어졌 · 주어집). `grammarTermHits` 로 다시 돌림: 타동사 · 정관사 · 미래시제 · 보어 · 지시대명사 · 소유대명사 · 부가의문문 · 가산명사 · 관계절 · 종속절 · 불규칙동사 · 능동태 · 감탄사 · 수식어 14줄 모두 걸림, '주어졌어요 · 주어집니다 · 주어지면 · 주어져 · 주어진 · 주어요' 6줄 0건, '낱말 · 문장 · 대문자 · 마침표 · 부사장' 0건, 승인 선생님 줄 셋 0건, '주어 자리예요' 걸림. 세 브리프 13절 사본에 68 모두 있음(코드로 대조). `seed:validate --areas reading,writing,speaking` 종료 0 · 경고 12(unit-goals) |
| M-2 '검증기가 대문자 카드를 모두 막는다' 낡은 까닭 | ADDRESSED | writing-3.md:122 · 292 · 322 · 886, _template.md:71, README.md:160 — 'C84 대로 받지만 첫 묶음은 단순하게(L-30)' |
| M-3 읽기 We 문구 | ADDRESSED | reading-3.md:359(빈칸으로 물을 때 글에 We 가 누구인지 쓰여 있으면 됨, 승인 Q3 꼴) · 921 14절 #13. 말하기는 그대로(speaking-3.md:364) |
| M-4 'The shops are far.' | ADDRESSED(컨트롤러 결정 범위) | writing-3.md:360 'They are far.'로 바꿈. 참고: far 술어는 여전히 'far away'가 보통이라 생성자가 'It is far.' 쪽을 쓰면 더 낫다(막지 않음) |
| M-5 말하기 배정 2 동사 · 읽기 배정 4 | ADDRESSED | speaking-3.md:375(sleep in the tent · listen to music · learn a song · study in the room · watch a bird, 범위 밖 낱말 경고), reading-3.md:369(앞 배정 동사로 틀, They eat soup. · We look at the balloons. — at 은 1~2단계 기능어, look 은 배정 3 이라 범위 안) |
| M-6 사실 규칙 범위 | ADDRESSED(컨트롤러 결정) | _template.md:126, reading-3.md:352 · writing-3.md:352 · speaking-3.md:355 '같은 수업 번호의 읽기 · 말하기 사이', 다른 수업 번호는 묶지 않음 |
| M-7 L-10 · L-22 · L-30 닫힘 확인 | 해당 없음 | 고칠 것이 없던 항목 |
| M-8 거르는 줄 id | ADDRESSED | 세 브리프 14절 검증 명령에 `x.get("id","")` (reading 928 · writing 850 · speaking 910 근처), .get 이라 오류 항목(키 cell · path)에도 돈다 |
| M-9 가운뎃점 | ADDRESSED | _template.md:105 R8, reading-3.md:305(승인 수업 'go · come …'은 고정이라 그대로라고 적음) · writing-3.md:294 · speaking-3.md:309, L-2 실측 항목으로 |

붙이기 · 해시 대조: 세 브리프 3판의 14절 덩이를 그대로 꺼내 스크래치 뿌리(승인 수업 자리를 비운 `lessons/<영역>/3/1.json`)에 보고의 승인 수업 해시 셋으로 돌렸다 — 셋 다 종료 0 · '붙임: 수업 1 · 승인 수업 해시 같음', 붙인 파일이 원본 `seed/lessons/<영역>/3/1.json` 과 바이트 같음. 정정 후보 둘(말하기 Q2' 뒤집힌 짝 · 듣기 L3 강아지 장면)은 보고 3판 끝에 요청자 표본 검토 몫으로 적혀 있다(L-25 는 그때 닫음).

새 지적 없음. 다음: 자-2(그림 열 · S10 비교 · 생성). 생성 보고의 '첫 검증'은 이 3판 해시로 manifest 첫 줄과 견준다.
