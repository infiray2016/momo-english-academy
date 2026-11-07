# 재검토: P6b 작업 5 fix 1(design-reviewer des-p06b · Opus · xhigh, 범위 한정, 읽기 전용, 2026-10-17 22:5x)

브리프 `task-p06b-review5b.md`. 기준은 `review-p06b-5.md` 의 Important 다섯 · Minor 열하나다. 대상 워크트리는 `.claude/worktrees/p06b`(커밋 없음)이고, 구현 보고는 같은 워크트리 `task-p06b-report.md` 'fix 1' 절이다.

## 판정

**Approved** — Important 다섯 모두 ADDRESSED, Minor 열하나 가운데 아홉 ADDRESSED · 둘(M-8 · M-10)은 검토가 '선택'으로 둔 것이라 그대로 닫는다. 새 지적은 Minor 다섯이었고, 그 가운데 N-3 은 구현 보고가 바로잡혀 닫혔다. 남은 넷은 컨트롤러가 직접 고칠 수 있다. 그 가운데 N-1(bank 선택지)은 작업 6 전에 정해야 한다.

## 본 것

- 작업 6 사진 다섯 `tests/.tmp/p06b/shot5-0.png ~ shot5-4.png`(컨트롤러 알림 22:5x 뒤 자리. 처음에는 `h7/` 의 같은 다섯 장을 봤고, 다섯 장 모두 md5 가 같다).
- 모아 보기 쪽은 직접 다시 찍었고, 워크트리의 `tests/.tmp/p06b/sheet5-0.png ~ sheet5-9.png` 와 바이트가 같다(sheet5-0 md5 일치).
- 자체 그림 48장의 크기를 작업 4 보고 표의 바이트와 견줬다. 바뀐 것은 꼭 열한 장(arm · doll · neck · nurse · white · catch · hungry · shoulder · skate · student · toe)이고 37장은 같다.
- 바뀐 열한 장의 SVG: 모두 `viewBox="0 0 36 36"` 머리, 요소는 path · circle · ellipse · rect · g 만, 글자 · 글꼴 · href · image · script · 이벤트 속성 · url() 없음.
- `CREDITS.md` 를 plan 'CREDITS.md' 절, images.json, 근거 문서 `docs/research/2026-10-16-seed-reference-basis.md` 15 · 19줄, P6a 확인한 사실 7 과 견줬다.
- 장부 `ledger-open.md` 9줄(P8 그림 문항 규칙).

## 지적마다

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 catch | ADDRESSED | `shot5-0.png` · `shot5-3.png` 읽기 2-5 줄. 두 손으로 공을 가슴 앞에 받는 정면 아이다. throw(한 팔 들고 공이 떠남)와 110px · 64px 모두에서 갈린다 |
| I-2 hungry | ADDRESSED | `shot5-1.png` · `shot5-3.png` 읽기 2-1 줄. 배를 감싼 아이와 옆 탁자의 빈 그릇 · 숟가락이 따로 있어 '배고픔'으로 읽힌다. 떨림 물결이 없어졌다. 손으로 배를 잡은 꼴은 '배 아픔'도 떠올리지만, 같은 단원 sick 은 체온계 얼굴이라 갈린다 |
| I-3 toe | ADDRESSED | `shot5-1.png` · `shot5-2.png` · `shot5-3.png`. 🦶 foot 과 같은 방향의 옆모습 발이고 앞쪽 발가락 다섯을 점선이 짚는다. 64px 에서도 발로 읽힌다 |
| I-4 헷갈리는 짝 | ADDRESSED | `ledger-open.md` 9줄에 P8 그림 문항 규칙(같은 문항 보기에 함께 두지 않음, tired≠sleepy · strong≠arm, 검증기 목록은 P8 때 13절)으로 들어갔다. 단원 밖 짝 열은 줄에 빠졌다(N-4) |
| I-5 CREDITS.md | ADDRESSED | 아래 'CREDITS.md' 표 |
| M-1 arm | ADDRESSED | 칸 대각선을 채우고 파란 소매 단 · 엄지가 또렷한 손. 64px 에서 막대로 보이지 않는다 |
| M-2 neck · shoulder | ADDRESSED(남은 우려) | shoulder 는 동그라미 반쯤이 몸 밖이라 '표시'로 읽힌다. neck 은 고리를 키웠지만 가로 타원이 목을 감아 64px 에서 여전히 깃 · 목걸이를 떠올린다. 권한 고칠 길대로 했고, 위험은 face · neck 짝 피하기(I-4)가 덮는다. 작업 6 사진 `shot5-0` · `shot5-2` 에서 요청자가 본다 |
| M-3 student | ADDRESSED | 옆으로 걸어가는 아이와 등을 덮는 책가방. `shot5-3.png` 읽기 2-2 줄에서 boy · girl 얼굴과 갈린다 |
| M-4 nurse | ADDRESSED | 양옆이 접힌 흰 모자. 십자 · 청진기 없음 |
| M-5 white | ADDRESSED | 흰 칸에서도 초승달 그늘로 흰 원판으로 읽힌다 |
| M-6 skate | ADDRESSED | 흰 부츠 아래 은색 날 |
| M-7 doll | ADDRESSED | 칸을 채우는 앉은 헝겊 인형, 64px 에서도 인형으로 읽힌다 |
| M-8 knee | 닫음(선택, 그대로) | 검토가 '선택'으로 적었다. 지금 그림도 읽힌다 |
| M-9 모아 보기 쪽 | ADDRESSED | `sheet5-0.png` 머리글 'fix 1 반영', 자체 그림 칸 흰 바탕, fan 예문 'The fan is red.'. arm 메모만 옛 꼴(N-2) |
| M-10 예문 셋 | 닫음(선택, 그대로) | 검토가 '셋 다 그림과 맞서지는 않아 선택'으로 적었다 |
| M-11 teacher | ADDRESSED | sheet 메모에 '칠판 셈이 선생님의 표지라 유지, shop 은 간판 숫자가 표지가 아니라 뺌' 한 줄 |

## CREDITS.md

| 볼 것 | 결과 |
|---|---|
| 글 차례 | plan 절 차례대로 (1) 그림(Twemoji · 자체) (2) 어휘 (3) 앱 안 표시 2차 |
| attribution 글 | images.json 159행의 attribution 과 글자까지 같고 plan 글과 같다 |
| 수 | Twemoji 159 · 자체 48 이 images.json license 칸 수와 같다. 자체 48 키 목록도 generated 행과 꼭 같다 |
| CC-BY 4.0 | 주소 https://creativecommons.org/licenses/by/4.0/ 있음. '받은 SVG 를 바꾸지 않고 그대로 쓴다, 파일 이름만 키로' 있음. 이름 바꾸기는 내용 변경이 아니다(P6a 확인한 사실 8 의 기술적 바꿈 범위 안) |
| Twemoji 인용 꼴 | P6a 확인한 사실 7 은 README · About · HTML 소스의 언급도 받는다고 적고, 정해진 문장은 없다. 그래서 plan 글로 충분하다. README 원문은 이번에 다시 보지 않았다(네트워크 없음, 미확인) |
| 어휘 출처 | 고시 제2022-33호 [별책 14] [별표 3] pp. 254-290 · KICE Word Lister 안내서(경기도교육청 게시)가 근거 문서 15줄과 같다. CEFR-J v1.5 · TUFS Tono Laboratory · 받은 곳 · 2026-10-16 이 19줄과 같다 |
| CEFR-J 인용 꼴 | 근거 문서는 README 가 '바르게 인용하는 조건'을 단다고만 적었다. README 의 정해진 인용 문장과 맞췄는지는 미확인이다(구현자도 '남긴 것'에 적음). 장부에는 아직 없다(N-5) |

## 새 지적(fix 1 이 바꾼 것에서)

모두 Minor 다.

**N-1. 작업 6 의 다섯째 사진에 bank 선택지가 보이지 않는다** (`shot5-4.png`)
- 사진에는 🏦 하나만 '유지'로 있고 ② 자체 그림 표본도, ① · ② 번호도 없다. 요청자는 시각 결정을 표본으로 보고 번호로 고른다.
- 작업 6 전에 둘 가운데 하나로 정한다. 권하는 길은 컨트롤러가 ①(🏦 유지)로 정하고 요지에서 선택지를 빼는 것이다. 다섯째 사진에 bank 가 있으니 요청자가 보고 고칠 수 있다. 선택지를 남기려면 ② 표본을 먼저 그려 다섯째 사진에 ① 옆에 번호와 함께 둔다.

**N-2. sheet.html 의 arm 메모가 옛 꼴이다** (`sheet5-1.png` arm 칸)
- 메모가 아직 '어깨에서 손끝까지 곧게 뻗은 팔 하나(🦵 leg 처럼 떼어 낸 모양 …)'다. 새 그림은 파란 소매 단이 있다. 사진 다섯에는 메모가 안 나오므로 작업 6 에 영향은 없다.

**N-3. (닫힘) 모아 보기 사진 이름** (`tests/.tmp/p06b/shot5-*` · `sheet5-*`)
- 처음 구현 보고는 '다시 찍은 모아 보기 shot5-0 ~ shot5-9'라 적었는데 shot5 는 작업 6 사진의 사본이었다. 지금 보고(작업 5 fix 1 절 469줄)는 모아 보기를 `sheet5-0~9`, 작업 6 사진을 `shot5-0~4` 로 바로 적는다. 장부 progress 22:4x 줄의 'sheet.html 고침 · shot5' 만 같은 뜻으로 맞추면 된다.

**N-4. 장부 9줄에 단원 밖 짝 열이 빠졌다** (`ledger-open.md` 9줄 · `review-p06b-5.md` '헷갈리는 짝' 표 아래 줄)
- 줄은 '짝 표 아홉; tired≠sleepy · strong≠arm'만 적는다. 복습 · 배치 평가에서 섞일 수 있는 leg · knee, foot · toe, hand · finger, face · head, bird · fly, cup · water, jacket · coat, pants · jeans, girl · doll 도 P8 브리프에 가야 한다. '단원 밖 짝 열(같은 보고 표 아래 줄)'을 줄에 더한다.

**N-5. CEFR-J 인용 꼴 확인이 장부에 없다** (`CREDITS.md` 25줄 · 구현 보고 '남긴 것' 첫 줄)
- 커밋(작업 8) 전에 olp-en-cefrj README 의 인용 꼴과 CREDITS.md 25줄을 맞춰 보는 일을 ledger-open '구현하며 확인할 것'에 한 줄로 둔다.

## 작업 6 사진 판정

사진 다섯은 권고(`review-p06b-5.md` '요청자 표본 묶음 권고') 그대로이고 요청자 확인에 충분하다.

| 사진 | 판정 |
|---|---|
| `shot5-0` · `shot5-1` 자체 그림 200px | 충분. 바뀐 열한 장에 빨간 '고침' 표시가 있다 |
| `shot5-2` 자체 그림 64px 노랑 바탕 | 충분. 앱에서 작게 보일 때를 본다 |
| `shot5-3` 단원 보기 묶음 110px | 충분. 읽기 2-2 · 2-1 · 2-5 의 그림 낱말 전부(13 · 14 · 22) |
| `shot5-4` Twemoji 아홉 180px | 그림은 충분. bank 선택지는 안 보인다(N-1) |

요청자에게 보일 요지(N-1 을 ①로 정했을 때):
> 1~2단계 그림 낱말 207장 가운데 이 앱이 직접 그린 48장 전부와, 뜻이 갈릴 수 있어 검토가 따로 본 Twemoji 아홉 장을 사진 다섯 장으로 보여 드려요. 빨간 '고침'은 검토 뒤 다시 그리거나 다듬은 그림이에요. 승인하시거나, 고칠 그림이 있으면 사진 번호와 낱말을 알려 주세요.

고를 것은 없다. N-1 에서 선택지를 남기면 'bank ① 🏦 그대로 ② 새로 그린 그림'을 한 줄 더한다.
