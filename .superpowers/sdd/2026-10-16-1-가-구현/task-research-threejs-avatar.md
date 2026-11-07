# 브리프: 조사 — three.js 로 아바타를 예쁘고 품질 좋게 만드는 법, VRM 아바타의 조달(구현인가 · 표본 받기인가)

역할: 조사 담당(general-purpose · Sonnet · high). 웹 조사 · 공식 문서 읽기(WebSearch · WebFetch)와 보고서 쓰기(Write)만 한다. 설치 · 생성 명령(`pnpm add` · `npx` · `pnpm create`)은 실행하지 않고 코드도 만들지 않는다. 저장소의 다른 파일은 고치지 않는다. 하위 에이전트 · 커밋 없음. 비밀값 · 아이 이름을 적지 않는다.

## 요청자의 물음(2026-10-17 04:4x, 그대로)
"three.js로 아바타를 예쁘고 퀄리티 좋게 만들려면 어떻게 해야할지 조사를 해줄래 ? vrm 정도의 퀄리티로 vrm 아바타는 구현하는건지 샘플을 받는건지 그것도 궁금해"

## 배경(이미 한 것 — 되풀이하지 않고 이어 간다)
- 제품: 초등 4학년부터 혼자 하는 영어 학습 웹 앱(Next.js 16 · React 19, iPad Safari 가 주 기기). 회화 영역은 선생님 캐릭터(가제 토리)가 화상영어처럼 수업을 이끈다. 캐릭터는 아직 고르는 중이고, 상태 다섯(쉬는 중 · 말하는 중 · 듣는 중 · 칭찬 · 생각)으로 움직여야 한다. 아이가 보는 화면이라 귀엽고 예쁘게, 과한 움직임은 피한다(prefers-reduced-motion 존중). 비용은 0 에 가깝게, 저작권 · 라이선스는 깨끗해야 한다. 로블록스 · 프로젝트 세카이 실제 캐릭터는 쓰지 않고 꼴만 따른다.
- 표본 네 판을 만들어 보였다. 2판은 three.js r128 로 코드만으로 만든 3D(둥근 상자 · MeshToon · 복셀) — 요청자 평 "너무 못생겼어". 3판 · 4판은 공개 모델을 받아 three.js r160 ESM + `@pixiv/three-vrm` 2.1.3 으로 띄운 것: VRM 셋(Seed-san — VirtualCast, VRM Public License 1.0 · three-vrm-girl v0.6.11 표본 · VRM1_Constraint_Twist_Sample — pixiv) + glTF 둘(RobotExpressive · Fox, CC0). VRM 표정(aa · oh · blink · happy) · humanoid 뼈(head · neck · spine · 팔) · lookAt · AnimationMixer 를 썼다. 요청자 평 "three-vrm 으로 만든 건 좋은데". 요청자는 3D 아바타를 선호하고 "품질은 높게, 만들기 어려우면 모델이나 에셋을 구해도 좋다"고 했다.
- 컨트롤러가 요청자에게 이미 답한 것: VRM 은 파일 형식이고 모델은 VRoid Studio 같은 도구로 만들거나 받아 오는 것이며, 코드(three-vrm)는 불러와 움직이는 몫이라는 것. 이 조사는 그 답을 근거 · 출처 · 세부로 채운다.

## 조사할 것(절 번호 그대로 보고서 절로)
1. **VRM 아바타는 어디서 오나.** VRM 형식(glTF 확장, 0.x 와 1.0 차이 · 표정 · humanoid · 스프링본 · 라이선스 메타데이터)을 한 문단으로. 조달 길마다 비용 · 걸리는 시간 · 품질 · 라이선스(개인 가정용 앱 · 뒷날 공개 가능성까지) · 표정 · 입 모양 포함 여부를 표로: VRoid Studio(무료, 슬라이더 · 프리셋, 머리카락 · 옷, VRM 내보내기 옵션, 상업 이용 조건), VRoid Hub · BOOTH 의 공개 · 유료 모델(라이선스 종류 — 재배포 · 개조 · 상업 조건), 작가 의뢰(시세 범위 — 출처 있는 것만), Blender + VRM 애드온(직접 제작 난이도), 표본 모델(위 셋 — 상용 · 재배포 조건 확인), 그 밖 아바타 서비스(Ready Player Me — GLB · 자체 뼈대 · 표정 변형 · 약관 · 상업 이용 · 네트워크 의존, Avaturn 등). 결론: '구현하는 것'과 '받는 것'의 경계를 한 문장으로.
2. **three.js 로 아바타 품질을 높이는 법.** 항목마다 '무엇을 · 왜 · 어떻게(핵심 API 이름) · 비용(성능 · 작업량)'과 출처: (1) 모델 자체(폴리곤 수 · 텍스처 해상도 · MToon 셰이더 윤곽선 · 림 라이트 · 음영 램프) (2) 색 관리 · 조명 · 환경(ColorManagement · 톤 매핑(ACES · AgX) · sRGB 출력, RoomEnvironment · HDRI · PMREM, 3점 조명, 그림자 설정) (3) 후처리(SMAA · FXAA · 가벼운 bloom, 아이 화면에 맞는 정도) (4) 카메라 · 프레이밍 · 배경(가슴 위, 화상 통화 창 느낌, 배경 흐림 · 2D 배경 판) (5) 움직임: 대기 동작(숨 · 몸 흔들림), 깜빡임, 시선(lookAt), 고개 · 끄덕임, 손짓 — VRM Animation(.vrma) 형식과 공개 동작 자료, Mixamo FBX → VRM 리타기팅(three-vrm 예제 · 공개 도구), 스프링본(머리카락 · 옷) (6) 입 모양: Web Speech API TTS 와 맞추는 길(진폭 기반 · 음소(비세메) 추정 · 'aa · ih · ou · ee · oh' 표정 블렌딩 · 시간 맞춤의 한계 — 브라우저 TTS 는 음소 이벤트가 없음, 확인) (7) 표정 블렌딩 · 상태 전이(happy · relaxed 등을 섞는 법) (8) iPad Safari 성능: pixelRatio 상한 · 드로우콜 · 텍스처 KTX2 압축 · VRMUtils(removeUnnecessaryVertices · removeUnnecessaryJoints · combineSkeletons · combineMorphs — 설치판 2.1.3 과 최신판에 있는지) · 모델 용량(5~15MB)과 로딩 · 캐시 (9) 접근성 · 아이용 원칙(과한 움직임 · 깜빡임 빈도 · reduced motion).
3. **비슷한 품질의 다른 길(비교).** VRM + three-vrm, Ready Player Me(GLB + visage 등), Mixamo 캐릭터 + GLB, 2D 길(Live2D Cubism Web SDK — 라이선스 · 비용, Rive, Spine, 움직이는 이모지 Lottie)을 품질 · 비용 · 라이선스 · 제작 난이도 · 입 모양 · 표정 · iPad 성능 · 유지 보수로 표 하나에.
4. **권고.** 이 프로젝트에 맞는 길 2~3 과 단계별 할 일. 요청자가 VRoid Studio 로 직접 만든다면: 설치 · 만드는 데 걸리는 시간(출처 있는 추정) · 아이에게 맞는 꼴(동물 귀 · 꼬리 같은 꾸밈이 가능한지) · 표정 · 입 모양 자동 포함 여부 · 내보내기 옵션(VRM 0.x · 1.0, 폴리곤 줄이기 · 텍스처 아틀라스) · 라이선스 메타데이터 적는 법 · 우리 코드(three-vrm 2.1.3)에 바로 들어가는지. 작가 의뢰 · 구매라면 요청서에 적을 조건(표정 셋 · 입 모양 · 뼈대 · 라이선스).
5. **용어 표.** 영어 용어 → 우리말(직역 금지 — 예: blend shape → 표정 변형, rig → 뼈대, retargeting → 동작 옮기기, viseme → 입 모양 단위, spring bone → 흔들림 뼈대, post-processing → 뒷처리. 알맞은 말을 고른다).

## 지킬 것
- 공식 문서 · 1차 출처 먼저(three.js 문서 · 예제, `@pixiv/three-vrm` README · 예제 · 릴리스 노트, vrm.dev 규격, VRoid Studio · VRoid Hub 공식 안내 · 이용 약관, Ready Player Me 문서 · 약관, Mixamo 약관, Live2D 라이선스 페이지). 항목마다 출처 URL 과 확인 날짜(2026-10-17)를 적고, 확인 못 한 것은 '(추측)'. 가격 · 약관은 그 페이지 문구를 짧게 인용한다.
- 영어 직역 금지, 한국어로 쓴다. 코드 식별자 · API 이름 · 제품명은 원문 그대로. 군말 없이, 표를 적극.
- 길이: 본문 150~250줄. 요청자가 읽는 글이다 — 결론과 권고를 맨 앞 '요약' 절(10줄)에.
- 보고서: `/Users/hikaru/workspace/momo-english-academy/docs/research/2026-10-17-threejs-avatar-quality.md`(Write 도구). 마지막 메시지는 요약 10줄 안쪽(권고 길 · 가장 중요한 출처 셋 · 확인 못 한 것).
