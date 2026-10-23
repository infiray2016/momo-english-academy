# 출처와 저작자 표시

모모 잉글리시 아카데미가 쓰는 남의 저작물과 그 조건을 적는다. 그림 한 장마다의 출처는 `seed/images.json` 의 `source` · `license` · `attribution` 칸에 있다.

## 1. 그림(`public/images/vocab/`)

### Twemoji 그림 159장

Twemoji v17.0.3 (github.com/jdecked/twemoji) © 2014–2021 Twitter, © 2022– Jason Sofonia & Justine De Caires, CC-BY 4.0

- 라이선스: Creative Commons Attribution 4.0 International(CC BY 4.0), https://creativecommons.org/licenses/by/4.0/
- 받은 곳: https://cdn.jsdelivr.net/gh/jdecked/twemoji@v17.0.3/assets/svg/ (태그 v17.0.3 에 고정)
- 받은 SVG 파일을 바꾸지 않고 그대로 쓴다. 파일 이름만 그 낱말의 키(`<키>.svg`)로 바꾸어 두었다.
- 행마다 `source` 칸이 `twemoji v17.0.3 <코드>` 꼴이고, `<코드>` 가 Twemoji 원래 파일 이름이다.

### 자체 그림 48장

이 프로젝트가 만든 그림이다(`license` 칸 `generated`, `source` 칸 `self-made <만든 날>`). Twemoji 에 그 뜻을 바로 그린 그림이 없는 낱말에만 그렸다.

arm, ball, catch, coat, cup, desk, dish, doll, draw, face, finger, fly, fork, glasses, hair, head, hungry, insect, jam, jump, kick, king, knee, lake, lamp, neck, nurse, pants, pink, pot, queen, read, sand, shop, shoulder, sing, skate, skirt, student, sweater, swing, table, thirsty, throw, toe, top, water, white

## 2. 어휘(`seed/vocab.json`)

- 뼈대: 2022 개정 교육과정 기본 어휘 목록(교육부 고시 제2022-33호 [별책 14] 영어과 교육과정 [별표 3], pp. 254-290). 목록 본문은 한국교육과정평가원 교과서검정연구기획단 'KICE Word Lister' 안내서(경기도교육청 게시)에서 읽었다.
- 참고: The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from http://www.cefr-j.org/download.html (공식 인용 문장). 저작권은 TUFS Tono Laboratory 에 있고, 출처를 밝히면 연구 · 상업 목적에 무상으로 쓸 수 있다(Open Language Profiles README 'Terms of use'). 우리는 https://github.com/openlanguageprofiles/olp-en-cefrj 의 `cefrj-vocabulary-profile-1.5.csv` 를 2026-10-16 에 받아 단계 대조에만 썼고 목록을 옮기지 않았다(2026-10-22 공식 README 와 대조해 인용 꼴을 맞춤).
- 한국어 뜻 · 예문 · 활용형은 이 프로젝트가 썼다. 고른 규칙과 근거는 `docs/research/2026-10-16-seed-reference-basis.md` 에 있다.

## 3. 앱 안 표시

부모 화면의 '정보' 쪽에 같은 내용을 보이는 일은 2차 부모 화면에서 한다.
