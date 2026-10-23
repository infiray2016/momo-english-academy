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

## 3. 회화 선생님(`public/teachers/`)

회화 선생님 미나 · 리오의 3D 모델(VRM)과 초상 그림이다. 미나 · 리오는 앱이 붙인 표시 이름이고, 원 모델은 아래 배포처의 VRoid 견본 모델이다. 명단 `seed/teachers.json` 의 `source` 칸에 같은 값이 있고, 시드 검증(`pnpm seed:validate`)의 자산 검사가 이 절의 값과 파일을 대조한다.

- 원 제작자: VRoid Project (VRoidプロジェクト)
- 배포처: OpenGameArt 'VRoid Studio CC0 Models' https://opengameart.org/content/vroid-studio-cc0-models (게시자 hecko). 배포 페이지는 이 견본들을 CC0 로 설명한다.
- 파일 안 조건: 두 파일 모두 `allowedUserName=Everyone` · `commercialUssageName=Allow` 이고, `otherPermissionUrl` · `otherLicenseUrl` 이 아래 VRoid Hub 조건 주소다. 그 조건은 개인 · 법인 상업 이용, 고쳐 쓰기, 재배포를 허용하고 크레딧을 요구하지 않는다. 크레딧이 필요 없지만 출처를 남긴다.
  - https://hub.vroid.com/license?allowed_to_use_user=everyone&characterization_allowed_user=everyone&corporate_commercial_use=allow&credit=unnecessary&modification=allow&personal_commercial_use=profit&redistribution=allow&sexual_expression=allow&version=1&violent_expression=allow
- 원본 파일은 저장소에 넣지 않는다. 줄인 파일만 넣는다. 줄인 파일의 VRM 메타 칸(제작자 · 제목 · 조건)은 원본 그대로이고, 메타가 가리키는 썸네일 그림만 256² 로 줄였다.

### 미나(`teachers/mina.9c5152a7.vrm` · `teachers/mina.fdc5f7f2.webp`)

- 원본 제목: ビビ
- 배포 파일: avatarsample_e.zip / oga_e.vrm
- 파일 안 licenseName: Other
- 원본 SHA-256: aea824cc43a95dd022a57d460ed901534a45fc2ac195f26ffc4d0d5beb0d7911
- 줄인 파일 SHA-256: 9c5152a7a0247fa9c9164482512c889e9bddf14056d8f49ddf751d7ce3565a8a
- 줄인 방법: pnpm teacher:reduce --max-texture 1024 (scripts/teacher-reduce.ts) · libwebp cwebp/dwebp 1.6.0 · 텍스처 한 변 1024 · 색 WebP q85(알파 무손실) · 법선 WebP 무손실 · 썸네일 PNG 256 · EXT_texture_webp(되돌림 PNG 없음) · 정점 · 뼈 · 표정 · 머티리얼 · VRM 메타 그대로
- 초상: 원본 VRM 안 썸네일(meta.texture)을 512² WebP q80 으로 줄였다. 따로 그린 그림이 아니다.

### 리오(`teachers/leo.45154cde.vrm` · `teachers/leo.669c5d28.webp`)

- 원본 제목: HairSample_Male
- 배포 파일: hairsample_male.zip / oga_hair_m.vrm
- 파일 안 licenseName: CC0
- 원본 SHA-256: 4af2194f90ba846f3b13c00b50b14262419062d2171d17de922bcce2f89979c7
- 줄인 파일 SHA-256: 45154cdee6c1d486cfc1cb9509c8776de494b3b3eede0eae1fdff1c1a0e4e7df
- 줄인 방법: pnpm teacher:reduce --max-texture 1024 (scripts/teacher-reduce.ts) · libwebp cwebp/dwebp 1.6.0 · 텍스처 한 변 1024 · 색 WebP q85(알파 무손실) · 법선 WebP 무손실 · 썸네일 PNG 256 · EXT_texture_webp(되돌림 PNG 없음) · 정점 · 뼈 · 표정 · 머티리얼 · VRM 메타 그대로
- 초상: 원본 VRM 안 썸네일(meta.texture)을 512² WebP q80 으로 줄였다. 따로 그린 그림이 아니다.

## 4. 앱 안 표시

부모 화면의 '정보' 쪽에 같은 내용을 보이는 일은 2차 부모 화면에서 한다.
