# three.js 아바타 품질 · VRM 아바타 조달 조사

조사 2026-10-17(조사 담당). 근거는 [S번호]로 달았고 끝의 출처 목록에 URL 과 확인일이 있다. 확인 못 한 것은 (추측). 코드 · 설치 · 실측은 하지 않았다.

## 요약

1. 경계: VRM 은 코드로 구현하는 것이 아니라 만들거나 받는 파일(.vrm)이다. three-vrm 은 그 파일을 불러 표정 · 동작 · 조명을 얹는 코드이고, 둘은 파일 규약으로만 만나서 모델은 나중에 파일만 바꿔 끼울 수 있다.
2. 권고 1: 요청자가 VRoid Studio(무료, v2.14.0, Mac · Windows · iPad 판)로 캐릭터를 직접 만들어 VRM 1.0 으로 내보낸다. 고양이 · 토끼 귀, 고양이 · 여우 · 토끼 꼬리 장신구, 표정 편집기, 입 모양 A I U E O, 깜빡임, 머리카락 흔들림이 기본이다.
3. 권고 2(병행): 개발은 VRoid 기본 제공 표본(상업 이용 가능 · 크레딧 불필요 · CC0 아님)으로 먼저 하고 완성 모델로 파일만 교체한다. 지금 쓰는 표본 셋은 파일 안 허용 설정을 못 읽어 제품 반입 전에 확인이 필요하다.
4. 권고 3: 작가 의뢰는 예산이 있을 때. 시세 표본은 £500~600부터, $600부터(저폴리 $200, 작은 SD 체형 $350부터)다. 사람 뼈대가 없는 마스코트(동물 · 둥근 꼴)는 VRM 이 안 되므로 GLB 를 직접 만들어야 한다.
5. 품질의 큰 몫은 모델 파일과 MToon 설정이고 코드가 더하는 것은 조명 · 움직임 · 입 모양이다. 핵심 발견: MToon 셰이더는 환경 맵 반사를 쓰지 않으므로(소스 확인) RoomEnvironment 가 아니라 방향광 + 반구광으로 비춘다.
6. 입 모양: 브라우저 소리 읽기(Web Speech)는 소리 데이터도 입 모양 단위 신호도 없고 단어 경계 신호만 있다. 비용 0 길은 말하는 동안 aa · ih · ou · ee · oh 를 번갈아 섞고 경계 신호가 오면 박자를 맞추는 것이다. 정확한 입 모양은 소리 파일을 주는 TTS 로 바꿔야 한다.
7. 업그레이드: three-vrm 2.1.3 을 3.5.5(2026-07-09)로 올린다. combineSkeletons(3.2.0)와 combineMorphs(3.3.0)는 3.x 에만 있는 성능 개선용 도구다(릴리스 노트: combineMorphs 는 "성능이 좋아질 수 있다").
8. 막힌 길: Ready Player Me 는 2026-01-31 서비스 종료. VRoid 공식 무료 동작 7종은 "꺼낼 수 있는 상태의 재배포 금지" 조항이 웹 앱 탑재와 충돌할 수 있다.
9. VRoid Studio 는 무료지만 광고 배너가 들어왔다(iPad 판 2026-06-29 적용, 숨기려면 VRoid Plus 구독).
10. 확인 못 한 것: iPad 실측 성능, iPad Safari 의 경계 신호 실제 동작, 표본 모델 셋의 파일 안 허용 설정, VRM 의 KTX2 지원 보증, VRoid 제작 시간의 공식 수치, 작가 의뢰 기간.

## 1. VRM 아바타는 어디서 오나

### 1.1 형식

VRM 은 glTF 2.0 위에 사람 꼴 캐릭터용 확장을 얹은 .vrm 파일이다 [S1]. 1.0(2022-09-22 정식 [S3])의 주요 확장은 VRMC_vrm(사람 뼈대 · 표정 · 시선 · 사용 허가 정보), VRMC_springBone(흔들림 뼈대), VRMC_node_constraint(뼈대 연결 제약), VRMC_materials_mtoon(만화풍 음영 재질), VRMC_vrm_animation(.vrma 동작 파일)이다 [S2][S4][S8]. 사람 뼈대는 hips · spine · head · 다리 · 팔이 필수라 사람 꼴만 담을 수 있다 [S5]. 표정 이름은 규격이 정한다: 감정 happy · angry · sad · relaxed · surprised, 입 aa · ih · ou · ee · oh, 눈 blink · blinkLeft · blinkRight, 시선 lookUp · lookDown · lookLeft · lookRight [S6].

| 항목 | 0.x | 1.0 | 근거 |
|---|---|---|---|
| 표정 이름 | JOY · FUN · SORROW · A I U E O(VRoid 가 이 이름으로 저장) | happy · relaxed · sad · aa ih ou ee oh. three-vrm 이 0.x 이름을 1.0 이름으로 바꿔 준다 | [S24][S13] |
| 정면 | -Z. 불러온 뒤 VRMUtils.rotateVRM0 로 돌린다 | +Z | [S14][S18] |
| 사용 허가 | 상업 이용 두 칸(기업 · 개인)과 재배포 · 고쳐 쓰기 유형 고르기(CC 계열 포함) | commercialUsage 한 칸에서 두 항목이 나오고 정치 · 종교, 반사회 · 혐오, 고쳐 쓴 판 재배포 3칸이 추가 | [S12][S16] |
| 흔들림 뼈대 · 재질 | 기본형 | 캡슐 충돌체, 관절별 조정, MToon 의 MatCap 마스킹 | [S17] |
| 뼈대 연결 제약 | 없음 | VRMC_node_constraint | [S4] |

### 1.2 조달 길

| 길 | 비용 · 시간 | 품질 | 사용 허가(가정용 앱 → 뒷날 공개) | 표정 · 입 모양 | 근거 |
|---|---|---|---|---|---|
| VRoid Studio 로 직접 제작 | 무료, 광고 배너 도입. 첫 모델은 하루 안팎(일화 1건) | 중~상(질감을 직접 그리면 상) | 만든 사람이 정한다. 기본 제공 몸 · 옷은 "특별 조항이 없으면" 판매 · 상업 이용 가능, 단 CC0 아님. VRoid 조각으로 아바타를 만들어 내는 앱(아이가 꾸미는 기능 등)은 pixiv 별도 허가 | 표정 편집기 + A I U E O + 깜빡임이 기본. 내보내면 파일에 들어간다 | [S19][S20][S24][S27][S29] |
| VRoid 기본 제공 표본(VRoidPreset_A~Z) | 무료, 즉시 | 중 | 영리 · 비영리 누구나, 크레딧 불필요, 고쳐서 올리고 팔 수 있다. 금지: CC0 로 풀기, 원본 VRM · .vroid 유료 재배포, 캐릭터 제작 서비스에 쓰기 | 포함 | [S30] |
| VRoid Hub 공개 모델 | 대부분 무료 | 천차만별 | 모델마다 내려받기 허용 · 재배포 · 고쳐 쓰기 · 상업 · 크레딧이 다르다. 앱에 실으려면 사실상 재배포 허용이 필요 | 모델마다 | [S16][S31] |
| BOOTH 유료 · 무료 모델 | VRM 태그 3D 캐릭터 첫 화면 59건: 100~34,600엔, 중앙값 약 5,000엔(열람 도구의 계산), 무료 4건 | 천차만별 | 판매자별 약관. 목록에는 안 보인다. 재배포 금지가 흔하다는 것은 추측이고 항목별 확인이 필요하다 | 모델마다 | [S32] |
| 작가 의뢰 | £500~600(약 $690~825)부터, $600부터(저폴리 $200 · SD 체형 $350부터), 일본 크라우드소싱 1건은 VRoid 기반 1만 엔 + 추가 소재 3천 엔. 기간은 공개 자료 없음(추측: 수 주) | 상 | 계약으로 정한다. 저작권 양도 또는 독점, 재배포 허용을 적는다 | 요청서에 적은 만큼 | [S33][S34][S35] |
| Blender + VRM 애드온 | 무료(MIT · GPL-3.0 이중). 모델링 · 뼈대 · 표정 변형 · MToon 설정을 모두 직접. 수 주 이상(추측) | 상한 없음 | 내 것 | 직접 만든다 | [S36] |
| 표본 3종(3 · 4판) | 즉시 | 개발용 | Seed-san: VirtualCast, VRM Public License 1.0. Twist 표본: pixiv, 같은 라이선스. three-vrm-girl: 조건을 못 찾았다. 라이선스 본문은 허용 범위가 파일 안 설정에 있다고 하는데 그 설정을 못 읽었다 | 포함 | [S37][S38][S39][S11] |
| 그 밖 서비스 | Ready Player Me: 2026-01-31 서비스 종료. Avaturn: 사진 기반 사실적 아바타, 2차 자료상 개발자 요금 월 약 $800(추측) | 해당 없음 | 해당 없음 | 해당 없음 | [S40][S41] |

재배포 메모: VRM Public License 1.0 은 재배포를 "VRM 파일을 공중이 스스로 고른 곳 · 때에 접근하게 하는 것"으로 정의한다 [S11]. 공개 웹 앱이 .vrm 을 내려 주면 해당할 수 있어, 공개 때는 재배포 허용 모델이나 직접 만든 모델이어야 한다. 가족 접근 쿠키 뒤의 비공개 앱이 "공중"인지는 해석 문제다(추측, 법률 자문 아님).

경계 한 문장: 구현하는 것은 파일을 불러 표정 · 동작 · 조명을 얹는 코드이고, 받는 것은 모델 파일이다. 파일을 만드는 일(VRoid 에서 만들기 · 의뢰 · 구매)은 구현이 아니라 제작이다.

## 2. three.js 로 아바타 품질을 높이는 법

효과 큰 순서(추측): 모델과 MToon 값, 조명, 움직임(깜빡임 · 시선 · 숨), 입 모양, 구도 · 배경. 뒷처리는 마지막이고 없어도 된다.

**(1) 모델 자체** [S10][S42][S43]
- 무엇 · 왜: 윤곽선 · 테두리 빛 · 음영 경계가 만화풍 인상을 정한다. MToon 값은 shadeColorFactor(그늘 색), shadingShiftFactor(밝고 어두운 경계 위치), shadingToonyFactor(경계 부드러움), parametricRim*(테두리 빛), outlineWidthMode · outlineWidthFactor · outlineColorFactor(윤곽선)다. 음영 띠(램프) 그림이 아니라 경계 두 값으로 정한다 [S10].
- 어떻게: 값은 모델 제작 단계(VRoid 재질 편집, Blender MToon 설정)에서 정하고 코드는 불러올 뿐이다. 윤곽선은 면을 뒷면 복제로 한 번 더 그려서 윤곽선이 있는 면마다 그리기 호출이 2배가 된다 [S42].
- 비용: 면 수 · 재질 수 · 표정 변형 수가 용량과 그리기 호출을 정한다. 표정 변형 하나는 정점마다 약 24바이트다(5만 정점이면 1.2MB, 60개면 72MB). 규격 문서는 면 수 · 용량 기준을 주지 않는다 [S43]. 표본 파일은 10.8~10.9MB [S39]. VRoid 내보내기는 폴리곤 · 재질 · 뼈대 줄이기와 텍스처 품질 조절을 주고 모바일용이면 품질을 낮추라고 안내한다 [S21][S22][S23]. "투명 메쉬 삭제 + 재질 2개"를 써 본 기록 [S44]이 있고, 뼈대 · 폴리곤을 줄였다가 역바인드 행렬 오류가 난 보고 [S45]도 있으니 줄인 뒤 반드시 불러 본다.

**(2) 색 관리 · 조명 · 환경** [S46][S47][S49][S50]
- 색 관리: ColorManagement.enabled 는 기본 켜짐, 출력 색 공간 기본 sRGB, 색 텍스처는 SRGBColorSpace, 뒷처리를 쓰면 마지막에 OutputPass 다 [S46][S47][S48]. 손댈 것이 없다.
- 톤 매핑: ACESFilmicToneMapping · AgXToneMapping · NeutralToneMapping 등을 고를 수 있고 기본은 없음이다 [S47]. MToon 셰이더가 톤 매핑 단계를 포함하므로 켜면 만화풍 색이 달라진다 [S49]. 기본은 끄고, 켠다면 Neutral 부터 눈으로 비교한다(추측).
- 환경 맵(RoomEnvironment + PMREMGenerator.fromScene → scene.environment)은 glTF 물리 재질에는 듣지만 MToon 에는 듣지 않는다. MToon 셰이더는 환경 맵 반사 코드를 주석 처리했고 간접광을 전체광 · 반구광 · 빛 표본(light probe)으로만 만든다 [S49][S50].
- 그래서 MToon 조명은 방향광(주광, 공식 예제는 DirectionalLight 세기 Math.PI) + HemisphereLight 또는 AmbientLight(그늘 채우기) + 뒤쪽 약한 방향광(테두리 빛)이다 [S51]. 3점 조명이 그대로 맞는다.
- 그림자: shadowMap.enabled 기본 꺼짐, 종류는 Basic · PCF · VSM [S47]. 가슴 위 구도에 배경 그림이면 필요 없다(MToon 이 스스로 음영을 만든다). 켜면 그림자 맵 렌더가 추가된다.

**(3) 뒷처리** [S47][S48][S52]
- 가장자리는 WebGLRenderer({ antialias: true })의 기본 MSAA 로 충분하다. 뒷처리 파이프라인을 쓰면 기본 MSAA 가 캔버스에만 적용돼 효과가 없어지므로 다중 표본 렌더 타깃이나 SMAA 가 필요하다(pmndrs postprocessing 문서 기준이고 three.js 기본 EffectComposer 도 같은 원리라고 본다, 추측) [S52]. 번짐 효과(UnrealBloomPass)는 패스마다 전체 화면을 한 번 더 그려 비용이 늘고 만화풍엔 필요 없다(추측).
- 권고: 뒷처리 없음. 꼭 넣으면 SMAA 하나.

**(4) 카메라 · 프레이밍 · 배경** [S51][S53][S54]
- 카메라: PerspectiveCamera fov 30(공식 예제는 near 0.1, far 20, 위치 (0,1,5), 조준점 (0,1,0)) [S51]. 화상 통화 창 느낌의 가슴 위 구도는 fov 20~30에 눈높이 카메라, 조준점을 목 근처에 둔다(추측, 모델 키에 맞춰 조정).
- 배경: 캔버스를 투명하게(alpha: true) 하고 뒤에 CSS 배경(교실 그림 · 그라데이션)을 깔면 가장 가볍다 [S53]. scene.background 의 backgroundBlurriness 는 환경 맵 배경에만 적용되므로 [S54] 흐린 교실은 미리 흐리게 만든 그림이나 CSS filter: blur 로 한다.

**(5) 움직임** [S55][S56][S57][S58][S59][S60]
- 대기 동작(코드): 숨은 spine · chest 뼈대의 작은 회전을 느린 사인파로(약 0.2~0.3Hz, 추측), 몸 흔들림은 hips · spine 미세 회전으로 만든다. 뼈대는 vrm.humanoid.getNormalizedBoneNode(…)로 잡는다. 공식 예제 bones · lookat · expressions 가 해당 API 를 보여 준다 [S55].
- 깜빡임: expressionManager.setValue('blink', 0→1→0)을 불규칙 간격으로 쓴다. 성인 표본 연구의 평균은 분당 16회(표준편차 6.4, 범위 4~33)다 [S56]. 3~6초 불규칙을 권한다. 아이 수치는 확인 못 했다(추측).
- 시선: vrm.lookAt.target 에 카메라 쪽 Object3D 를 넣고 autoUpdate 를 켜 둔다(기본 켜짐) [S14].
- 고개 · 끄덕임 · 손짓은 AnimationMixer 클립으로 만든다. 클립을 얻는 길 셋:
  - .vrma 파일: @pixiv/three-vrm-animation 의 VRMAnimationLoaderPlugin · createVRMAnimationClip · VRMLookAtQuaternionProxy 를 쓰고 mixer.update 다음에 vrm.update 순서로 갱신한다 [S57]. 공개 자료는 VRoid 공식 BOOTH 무료 7종(전신 보이기 · 인사 · V · 쏘기 · 회전 · 모델 포즈 · 굴신, 3.29MB)이다 [S58][S59]. 상업 이용은 가능하나 크레딧 문구가 필수이고 "꺼낼 수 있는 상태로 허락 없이 재배포 금지" 조항이 있어, 웹 앱이 파일을 그대로 내려 주는 구조와 충돌할 수 있다(문의 필요, 추측). 열람 시 상품 페이지에 '비공개' 안내가 보여 지금 받을 수 있는지도 확인해야 한다.
  - Mixamo FBX → 동작 옮기기: three-vrm 예제 humanoidAnimation 이 FBXLoader + mixamoVRMRigMap(뼈대 이름 대응) + 쉬는 자세 보정 + hips 이동량의 키 비율 보정을 보여 주고, 전환은 crossFadeTo(0.5초)다 [S18]. Mixamo 는 캐릭터 · 동작 모두 개인 · 상업 · 비영리 프로젝트에 로열티 없이 쓸 수 있고 두 발 사람 꼴만 지원한다 [S60].
  - 직접 제작: Blender VRM 애드온, bvh2vrma, VRM Posing Desktop 이 VRoid 공식 소식에 소개돼 있다 [S58].
- 흔들림 뼈대: vrm.update(delta)가 갱신한다 [S51]. 머리카락 흔들림은 VRoid 에서 덩어리마다 정한다 [S19]. 규격 값은 stiffness · gravityPower · gravityDir · dragForce · hitRadius 다 [S9]. 1.0 의 캡슐 충돌체가 머리카락이 어깨를 뚫는 것을 막는다 [S17].

**(6) 입 모양** [S11][S62][S63][S64][S65][S66][S67][S68][S69]
- 사실: Web Speech(speechSynthesis)는 단어 · 문장 경계 신호(boundary: charIndex · elapsedTime)만 주고 소리 데이터와 입 모양 단위 신호는 없다 [S62][S64]. 소리 출력을 Web Audio 로 받는 제안(#69, 2019)은 지금도 열려 있다 [S65]. 브라우저별: MDN 호환표는 Safari 7+ · iOS 지원이고 크롬은 "예상대로 안 뜬다"는 부분 구현 표시다 [S63]. 크롬의 원격(Google) 목소리와 안드로이드는 경계 신호가 오지 않고 [S66], Safari 는 charLength 가 없고 cancel() 때 end 가 안 온다 [S64]. 그래서 iPad Safari 에서도 목소리에 따라 다를 수 있어 실기기 확인이 필요하다(추측). 무음 스위치가 켜져 있으면 iOS 는 소리가 안 난다 [S64].
- 길 ①(비용 0, 지금 가능): 말하는 상태 동안 aa · ih · ou · ee · oh 를 0.08~0.15초 간격으로 불규칙하게 섞고(앞 값에서 부드럽게 이동), 경계 신호가 오면 그 순간 입을 크게 열어 단어 박자를 맞춘다. 신호가 없으면 일정 주기로 돌고 end · cancel 에서 닫는다(구현 안, 추측). 입 이름이 VRM 표준이라 모델을 바꿔도 코드는 같다 [S6].
- 길 ②(소리 분석): 오디오 파일을 돌려주는 TTS 로 바꾸고 wawa-lipsync(MIT, 오디오 요소에서 입 모양 단위 계산) 또는 wLipSync(MIT, MFCC · WebAssembly, 프로필을 Unity 의 uLipSync 로 만들어야 하고 Three.js · VRM 예제 있음)로 소리에서 입을 만든다 [S68][S69]. wLipSync 의 Safari · iOS 지원은 문서에 없다. 비용 · 지연이 생기고 현재 방침(브라우저 소리 읽기)과 다르다.
- 길 ③(단어 시간표 + 글자 → 입 모양 단위): TalkingHead 방식이다. 단어 시간표를 주는 TTS 가 필요하고 아바타가 Mixamo 호환 뼈대 + ARKit · Oculus 입 모양 변형을 가져야 해 VRM 에 바로 맞지 않는다. 이 문서도 "브라우저 Web Speech 는 시간표를 못 준다"고 적는다 [S67].
- 주의: VRM 1.0 에서 감정 표정이 overrideMouth 를 block 이나 blend 로 두면 그 감정이 켜진 동안 입 값이 줄거나 0 이 된다 [S6][S15].

**(7) 표정 블렌딩 · 상태 전이** [S6][S15]
- expressionManager.setValue(name, 0~1)(범위 밖은 자동으로 자름)로 이름별 가중치를 매 프레임 쓴다. 눈 · 입 · 시선 그룹은 override 합만큼 서로 줄인다. 없는 이름은 조용히 무시되므로 로드 직후 expressionMap 키를 점검한다 [S15].
- 상태 다섯(쉬는 중 · 말하는 중 · 듣는 중 · 칭찬 · 생각): 상태별 목표 가중치 표를 두고 프레임마다 현재 값이 목표를 0.15~0.25초에 걸쳐 따라가게 한다(구현 안, 추측). 예: 칭찬 = happy 0.7 + relaxed 0.2, 생각 = 시선 위쪽 + surprised 0.1, 듣는 중 = neutral + 고개 살짝 기울임.
- isBinary 표정은 0.5 를 기준으로 켜짐 · 꺼짐만 되어 섞는 용도에 맞지 않는다 [S6].

**(8) iPad Safari 성능** [S18][S39][S42][S61][S70][S71][S72][S73][S74]
- 화소 비율: setPixelRatio(Math.min(devicePixelRatio, 2))가 관례다. iPad 는 보통 2라 효과가 작고 3인 iPhone 에서 크다(추측). iOS 에서 WebGL 캔버스 크기를 반복해서 바꾸면 메모리가 늘어 프로세스가 종료된 WebKit 버그 보고가 있어 크기 변경을 줄인다 [S70]. iOS 웹 메모리 한도는 기기 · 버전마다 다르고, antialias 를 끄고 powerPreference 를 기본으로 두자 오류가 사라졌다는 포럼 사례도 있다 [S71]. antialias 는 실기기에서 켜고 끄며 비교한다.
- VRMUtils(설치판 2.1.3 대 최신): removeUnnecessaryVertices 는 2.x 에도 있고 3.5.0 에서 인터리브 버퍼를 지원한다. removeUnnecessaryJoints 는 3.2.0 에서 폐기 예고, combineSkeletons 는 3.2.0(2024-11-27) 신설, combineMorphs 는 3.3.0(2024-12-04) 신설이다 [S61]. 즉 2.1.3 에는 없고 3.5.5 에는 있다. 공식 basic 예제가 세 함수를 모두 부르고 frustumCulled 를 끈다 [S51].
- 그리기 호출: 재질 수 × (윤곽선이면 2배) [S42]. VRoid 내보내기에서 재질 수를 줄인다 [S21].
- 텍스처 압축: KTX2Loader 가 Basis Universal 을 기기가 받는 GPU 압축 형식으로 바꾼다(renderer 로 detectSupport 필요) [S72]. VRM 파일이 KTX2 · meshopt · Draco 를 써도 되는지는 규격에서 근거를 못 찾았다(추측: GLTFLoader 위에서 동작하니 될 수 있으나 VRoid 가 내보내지 못해 변환 도구가 필요). 우선 VRoid 의 텍스처 품질 낮추기와 2048px 이하로 간다. 2048px 정사각 한 장은 GPU 메모리 약 16MB(밉맵 포함 약 21MB, 계산값)다.
- 모델 용량: 표본이 약 10.8MB다 [S39]. 5~15MB 는 첫 로딩 때 한 번 받고 HTTP 캐시 · 서비스 워커로 보관한다(추측).
- WebGPU: Safari 26(iOS · iPadOS 26)부터 출하됐고 WebKit 은 "새 사이트에는 WebGPU 우선"이라 한다 [S73]. three-vrm 3.x 는 MToonNodeMaterial 로 지원하나 "다른 부분보다 호환이 더 자주 깨질 수 있다"고 경고한다 [S74]. 지금은 WebGL 을 유지한다. three.js 는 r163 부터 WebGL2 만 지원한다 [S47]. 최신 three.js 는 r186(2026-09-24) [S75].
- three-vrm 의 iOS · iPad 전용 알려진 이슈는 이슈 검색에서 못 찾았다(추측). 실측은 하지 않았다.

**(9) 접근성 · 아이용 원칙** [S76][S77][S78]
- prefers-reduced-motion: reduce 이면 몸 흔들림 · 대기 동작 진폭을 없애고 깜빡임 · 표정만 남긴다. 크기 변화 · 화면 이동은 전정 장애 자극이 될 수 있다 [S76].
- 깜빡임은 초당 3회를 넘기지 않는다(번쩍임 기준) [S77]. 5초 넘게 자동으로 움직이는 내용에는 멈춤 수단이 요구되고 필수 활동은 예외다 [S78]. 대기 동작은 필수가 아니므로 설정에 "움직임 줄이기" 스위치를 둔다(추측).
- 회전 · 큰 손짓(VRoid 무료 동작의 "회전" 등)은 쓰지 않는다(추측).

## 3. 비슷한 품질의 다른 길

| 길 | 품질 | 비용 · 라이선스 | 제작 난이도 | 입 모양 · 표정 | iPad 성능 | 유지 보수 |
|---|---|---|---|---|---|---|
| VRM + three-vrm | 상(만화풍 3D, 윤곽선 · 흔들림) | 라이브러리 MIT [S79], 모델은 1.2절 표 | 중(VRoid) ~ 상(Blender) | 표준 이름 표정 · 입 · 시선, 동작 .vrma [S6] | 중(실측 필요, 추측) | 3.5.5(2026-07), 릴리스 활발 [S61] |
| Ready Player Me | 해당 없음 | 2026-01-31 서비스 종료 [S40] | 해당 없음 | 해당 없음 | 해당 없음 | 제외 |
| Avaturn | 사진 닮은 사실적 아바타(추측) | 월 약 $800(2차 자료) [S41], 약관 못 봄 | 쉬움 | ARKit 표정 + 입 모양 변형(2차 자료) | 중(추측) | 서비스 의존, 제외 권고(추측) |
| Mixamo 캐릭터 + GLB | 중(사실풍 스톡 캐릭터, 추측) | 무료(Adobe ID), 개인 · 상업 · 비영리 로열티 없음 [S60]. 원본 단독 배포 금지(포럼) | 쉬움 | 얼굴 변형 없음(Fuse 의 변형 기능이 제거됐다는 포럼 글) → 입 모양을 못 만든다 [S80] | 중 | Adobe 서비스 의존, FAQ 는 2021-09 이후 갱신 없음 |
| Live2D Cubism Web | 상(2D 일러스트 질감) | SDK 무료, 공개 때만 계약. 연매출 1천만 엔 미만 일반 · 소규모는 계약 불필요 [S81][S82]. Editor FREE 는 텍스처 1장 2048px · ArtMesh 100 한도 [S83] | 상(일러스트 + 리깅) | 입 = ParamMouthOpenY 에 음량 값. 소리 데이터가 필요해 Web Speech 로는 같은 한계 [S84] | 가벼움(추측) | SDK 버전을 따라가야 함 |
| Rive | 중~상(2D 벡터) | Free $0(스플래시 포함), Cadet $9 [S85]. 런타임 MIT [S86]. 상업 조건은 요금 페이지에 명시 없음 | 중 | 입 모양 그림을 직접 설계, 상태 전환 장치 | 가벼움(추측) | Rive 도구 의존 |
| Spine | 중~상(2D 뼈대) | Essential $69, Professional $379 [S87]. 런타임은 Spine 라이선스 보유가 전제(추측, 페이지는 "라이선스가 런타임 통합을 허용한다"고 적음) | 중 | 입 모양 교체를 직접 | 가벼움(추측) | Esoteric 도구 의존 |
| Lottie / dotLottie | 중(반복 클립) | 무료, lottie-web MIT [S88] | 쉬움 | 상태 전환 장치는 dotLottie 기능 [S89]. 입 맞추기에는 부적합(추측) | 매우 가벼움(추측) | 낮음 |
| Blender GLB(비사람 마스코트) | 상한 없음 | 내 것. 시간 비용 큼 | 상 | 표정 변형 · 입 모양을 직접 만들고 이름 규약이 없다 | 중 | 규약을 직접 관리 |

## 4. 권고

- **길 1(권장) VRoid Studio 직접 제작 → VRM 1.0 → three-vrm 3.5.5.** 무료이고 요청자가 Mac · iPad 에서 만들 수 있다. 표정 · 입 · 깜빡임 · 머리카락 흔들림이 기본이고 사용 허가를 요청자가 정한다. 3 · 4판이 이미 같은 형식을 띄웠다. 약점은 사람 뼈대 한정과 광고 배너, 제작 시간이다.
- **길 2(병행) 표본으로 먼저.** VRoidPreset 표본으로 표정 · 동작 · 입 코드를 먼저 만들고 완성 모델로 파일만 교체한다. 고치지 않은 표본을 유료 서비스에 그대로 싣는 것은 "원본 VRM 유료 재배포 금지" 조항에 걸릴 수 있어(추측) 뒷날 공개 땐 고친 모델을 쓴다 [S30].
- **길 3 작가 의뢰 · 블렌더 GLB.** 예산이 있거나 캐릭터가 사람 꼴이 아닐 때. 비사람이면 VRM 이 안 되어 GLB 를 직접 만들고 표정 · 입 규약을 우리가 정해야 한다.

**단계별 할 일**

1. (코드, 지금) three-vrm 3.5.5 + three r180~r186 으로 올려 3 · 4판 표본이 그대로 뜨는지 본다. VRMUtils 세 함수를 적용한다. 3.5.0 에서 MToon 의 테두리 빛 계산이 바뀌어 모양이 달라질 수 있다 [S61].
2. (표본 정리) 제품에 임시로 넣을 모델은 VRoidPreset 표본으로 바꾸고 3 · 4판 표본 셋은 개발 확인용으로만 둔다. 파일 안 허용 설정은 three-vrm 예제 meta.html 로 읽어 기록한다 [S55].
3. (요청자) 캐릭터 시안이 정해지면 VRoid Studio 로 제작한다. 기본 몸, 얼굴, 머리카락(덩어리별 흔들림), 옷, 귀 · 꼬리, 표정 편집기, VRM 1.0 내보내기, 허가 입력 순서다.
4. (코드) 상태 다섯 대 표정 · 동작 표를 만든다(2절 (7)). 대기 동작 · 깜빡임 · 시선은 코드로, 칭찬 · 생각 몸짓만 .vrma 로 한다.
5. (입 모양) 길 ①로 시작하고 iPad 실기기에서 경계 신호가 오는 목소리를 확인한다. 부족하면 길 ②를 검토한다.
6. (iPad 실측) 프레임 · 메모리를 재서 예산을 확정한다. 시작값은 삼각형 5만 이하, 재질 10개 이하, 텍스처 2048px 이하, 파일 10MB 안팎이다(모두 추측).

**요청자가 VRoid Studio 로 직접 만들 때**
- 설치: 무료. Windows · macOS 설치 파일, Steam, iPad(App Store). macOS 11 이상 · 2015년형 이상, iPad 는 iPadOS 15 이상 · 2018년형 이상이다. 현재 v2.14.0 [S19]. 광고 배너가 도입됐고 숨김은 VRoid Plus 구독(1 · 3 · 6개월 요금제, 가격 못 찾음)이며 영상 광고로 120분 숨길 수 있다 [S27][S28]. iPad 앱 후기에 내보내기 충돌 일화가 있어 내보내기는 Mac 에서 하는 편이 안전하다(추측).
- 걸리는 시간: 공식 수치 없음. 입문서 저자가 첫 모델을 하루 종일 걸려 밤에 완성했다는 일화가 있다 [S29]. 프리셋 위주면 반나절 안팎, 옷 질감을 직접 그리면 며칠(추측).
- 아이에게 맞는 꼴: 얼굴 · 몸 슬라이더, 머리카락 한 획 그리기, 고양이 · 토끼 귀 장신구 [S19], 고양이 · 여우 · 토끼 꼬리 장신구(v1.27.0, 2024-04-11) [S26]. 그 밖 동물은 맞춤 아이템으로 만든 사례가 판매 중(2차). 사람 뼈대가 필수라 둥근 마스코트는 불가다 [S5].
- 표정 · 입 모양 자동 포함: 표정 편집기의 기본 세트(Neutral · Smiling · Sad · Angry · Happy · Surprised)와 입 A I U E O, 눈 감기, 깜빡임 켜기가 기본이고 내보내면 VRM 표정으로 저장된다 [S24][S25]. 0.x 로 내보내면 JOY · FUN 이 three-vrm 에서 happy · relaxed 로 바뀐다 [S13]. surprised 는 0.x 프리셋에 없어 사용자 정의 이름이 될 수 있으므로 1.0 을 권한다(추측).
- 내보내기: 편집 화면의 내보내기 아이콘 → "VRM 내보내기" → 폴리곤 · 재질 · 뼈대 줄이기 → 형식 VRM0.0 또는 VRM1.0 선택 → 필수 입력은 이름과 제작자다 [S21]. v2.0.0 부터 텍스처 품질 조절과 권장 옵션(UpperChest 제거, 렌더러 루트를 Hips 로, 법선 길이 1)이 있다 [S23]. 모바일용이면 텍스처 품질을 낮추라는 공식 안내 [S22]. VRM 은 VRoid 에서 다시 편집할 수 없으니 .vroid 원본을 보관한다 [S21].
- 사용 허가 입력: 1.0 칸은 avatarPermission, commercialUsage(personalNonProfit · personalProfit · corporation), creditNotation, allowRedistribution, modification, 폭력 · 성적 · 정치종교 · 반사회 허용 4 플래그다 [S7]. 이 칸은 외부에 허용하는 범위이므로 우리 앱 안의 사용에는 제약이 없다. 아이용이라 4 플래그는 기본값(모두 false)을 유지하고, 파일이 공개 주소에 놓일 수 있으니 외부에는 닫는 쪽(재배포 금지 · 고쳐 쓰기 금지)이 안전하다(추측).
- 우리 코드에 바로 들어가는가: 예. 3 · 4판이 2.1.3 으로 VRM 1.0 표본을 이미 띄웠고 3.5.5 는 0.x · 1.0 을 모두 읽는다 [S61][S13]. VRoid 내보내기에서 UniVRM 에 흰색으로 보이던 문제가 v1.29.55 에서 고쳐졌으므로 최신판을 쓴다 [S23].

**작가 의뢰 · 구매 요청서 조건**
1. 형식: VRM 1.0(.vrm) + 원본(.blend 또는 .vroid, 텍스처 PSD) 납품. 사람 뼈대 필수에 chest · neck · 눈 · 어깨 · 손가락 권장 [S5].
2. 표정: happy · relaxed · sad · surprised(필수), angry · neutral, 입 aa · ih · ou · ee · oh, 눈 blink · blinkLeft · blinkRight, 시선 lookUp · lookDown · lookLeft · lookRight(뼈대 방식인지 표정 방식인지 명시) [S6]. 우리 상태 다섯에 쓸 표정(칭찬용 웃는 눈 등) 추가 요청.
3. 감정 표정이 입 값을 막는 설정(overrideMouth)을 어떻게 했는지 보고받는다 [S6].
4. 흔들림 뼈대: 머리카락 · 귀 · 꼬리, 머리 · 어깨 캡슐 충돌체 [S9].
5. 재질: MToon 1.0, 윤곽선 켬(폭 방식 world 또는 screen 명시) [S10]. 재질 10개 이하, 텍스처 2048px 이하, 삼각형 5만 이하, 파일 10MB 안팎(추측). 표정 변형은 얼굴 메쉬를 분리해 용량을 줄인다 [S43].
6. 사용 허가: 저작권 양도 또는 독점 이용권, 앱 내장 · 재배포(서버에서 사용자 기기로 전송) 허용, 색 · 표정 수정 허용, 크레딧 불필요, 뒷날 유료 서비스 허용, 제3자 소재 출처 명시 [S11].
7. 검수: 우리 뷰어(meta · expressions 예제)로 표정 슬라이더를 시험, 수정 횟수와 일정 명시.
8. 어린이용: 노출 없는 옷, 폭력 · 성적 사용 허용 플래그 false.

## 5. 용어 표

| 영어 | 우리말 | 풀이 |
|---|---|---|
| humanoid | 사람 뼈대 | hips · head 같은 정해진 이름의 뼈대 묶음 |
| bone, rig, skeleton | 뼈대 | |
| blend shape, morph target | 표정 변형 | 얼굴 모양을 바꾸는 값 묶음(three.js 이름은 morph target) |
| expression | 표정 | VRM 1.0 이름(0.x 는 BlendShapeProxy) |
| viseme | 입 모양 단위 | aa · ih · ou · ee · oh |
| lip sync | 입 모양 맞추기 | |
| spring bone | 흔들림 뼈대 | 머리카락 · 귀 · 꼬리가 관성으로 흔들림 |
| collider | 충돌체 | 흔들림이 몸을 뚫지 않게 하는 구 · 캡슐 |
| constraint | 뼈대 연결 제약 | 한 뼈대가 다른 뼈대를 따라 돌게 함 |
| retargeting | 동작 옮기기 | 다른 뼈대의 동작을 내 모델에 맞춤 |
| idle animation | 대기 동작 | 가만히 있을 때의 숨 · 흔들림 |
| look at | 시선 맞추기 | |
| T-pose | T자 자세 | 팔을 옆으로 벌린 기준 자세 |
| MToon | MToon(만화풍 음영 재질) | 제품명이라 그대로 쓴다 |
| shade, shading shift, toony | 그늘 색, 음영 경계 위치, 경계 부드러움 | |
| rim light | 테두리 빛 | |
| outline | 윤곽선 | |
| MatCap | 반사 그림 입히기 | 그림 한 장으로 흉내 낸 광택 |
| tone mapping | 톤 매핑(밝기 범위 맞추기) | |
| color space | 색 공간 | sRGB · 선형 |
| environment map, PMREM, IBL | 주변 빛 그림, 미리 흐려 둔 주변 빛 그림, 그림으로 비추기 | |
| directional, hemisphere, ambient light | 방향광, 반구광, 전체광 | |
| light probe | 빛 표본 | 한 점의 주변 빛을 요약한 값 |
| shadow map | 그림자 맵 | |
| post-processing | 뒷처리 | 다 그린 화면에 입히는 효과 |
| anti-aliasing, MSAA, SMAA, FXAA | 가장자리 매끄럽게, 다중 표본 방식, 화면 뒤처리 방식 | |
| bloom | 번짐 효과 | |
| draw call | 그리기 호출 | 한 번에 그리라고 GPU 에 보내는 요청 |
| pixel ratio | 화소 비율 | |
| texture, atlas | 표면 그림, 합본 그림 | |
| polygon, triangle | 면, 삼각형 | |
| KTX2, Basis | 압축 표면 그림 형식 | |
| Draco, meshopt | 모양 압축 방식 | |
| bust-up shot | 가슴 위 구도 | |
| state machine | 상태 전환 장치 | |
| runtime | 실행 라이브러리 | |
| override | 덮어 줄이기 | 다른 표정이 켜질 때 눈 · 입 움직임을 막거나 줄임 |
| boundary event | 경계 신호 | 단어 · 문장이 바뀔 때 오는 알림 |
| TTS | 소리 읽기 | |
| redistribution, modification, credit | 다시 배포, 고쳐 쓰기, 이름 밝히기 | |
| commercial use | 상업 이용 | |
| preset, sample | 기본 제공, 표본 | |

## 6. 확인 못 한 것

- 표본 3종의 파일 안 허용 설정(meta). three-vrm-girl 은 출처 · 조건 자체를 못 찾았다.
- iPad Safari 에서 경계 신호가 실제로 오는 목소리 목록. MDN 호환표는 Safari 7+ 지원이지만 신뢰성은 실기기 확인이 필요하다.
- VRM 파일의 KTX2 · meshopt · Draco 지원 보증(VRM 규격과 UniVRM 문서에서 근거 없음).
- VRoid 기본 모델의 면 수, 제작 시간의 공식 수치(일화 1건뿐), VRoid Plus 요금.
- VRoid 무료 동작 7종의 BOOTH 페이지 현재 상태(열람 시 '비공개' 안내)와 웹 앱 탑재 허용 여부.
- 작가 의뢰의 기간, 일본 크라우드소싱 가격(직접 열람은 429 로 실패, 검색 요약만). 영국 · 해외 작가 가격은 개인 가격표 두 건 기준이라 시세가 아니라 표본이다.
- Avaturn 공식 요금 · 약관, Rive 의 상업 이용 조건과 요금의 월 · 연 기준.
- iPad 실측 성능과 메모리(코드 금지라 하지 않음), 아이의 평균 깜빡임 횟수.

## 출처 목록

확인일은 줄마다 적은 2026-10-17 이다. 괄호는 열람 상태 메모다.

S1 https://vrm.dev/en/vrm/vrm_about/ · VRM 소개 · 2026-10-17
S2 https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/README.md · VRMC_vrm 1.0 개요 · 2026-10-17
S3 https://www.moguravr.com/vrm-version-1-0-official-release/ · 1.0 정식 공개 2022-09-22 보도 · 2026-10-17 (검색 결과 요약만)
S4 https://registry.npmjs.org/@pixiv/three-vrm/latest · three-vrm 3.5.5 의존 패키지(springbone · mtoon · node-constraint) · 2026-10-17
S5 https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/humanoid.md · 필수 뼈대 · 2026-10-17
S6 https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/expressions.md · 표정 이름 · override · isBinary · 2026-10-17
S7 https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/meta.md · 사용 허가 칸 · 2026-10-17
S8 https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm_animation-1.0/README.md · VRMA 규격 · 2026-10-17
S9 https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_springBone-1.0/README.md · 흔들림 뼈대 규격 · 2026-10-17
S10 https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_materials_mtoon-1.0/README.md · MToon 규격 · 2026-10-17
S11 https://vrm.dev/en/licenses/1.0/ · VRM Public License 1.0(재배포 정의 1.11) · 2026-10-17
S12 https://vrm.dev/en/vrm/meta/license/ · VRM 0.x 사용 허가 설정 · 2026-10-17
S13 https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm-core/src/expressions/VRMExpressionLoaderPlugin.ts · 0.x → 1.0 표정 이름표 · 2026-10-17
S14 https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm-core/src/lookAt/VRMLookAt.ts · target · autoUpdate · faceFront · 2026-10-17
S15 https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm-core/src/expressions/VRMExpressionManager.ts · setValue · override · 2026-10-17
S16 https://developer.vroid.com/en/guidelines/conditions_of_use.html · VRoid Hub 사용 조건 칸(0.0 대 1.0) · 2026-10-17
S17 https://vroid.pixiv.help/hc/en-us/articles/39513600013721-Q-Can-I-export-in-VRM-0-x-format · VRM 1.0 신기능 요약 · 2026-10-17
S18 https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/humanoidAnimation · Mixamo 동작 옮기기 예제(main.js · loadMixamoAnimation.js) · 2026-10-17
S19 https://vroid.com/en/studio · VRoid Studio 제품 페이지(v2.14.0, 요구 사양, 귀 장신구, 흔들림) · 2026-10-17
S20 https://vroid.com/en/studio/guidelines · VRoid Studio 가이드라인(2023-12-21 수정) · 2026-10-17
S21 https://vroid.pixiv.help/hc/en-us/articles/15760756822297-I-want-to-learn-more-about-the-VRM-export-feature · VRM 내보내기 · 2026-10-17
S22 https://vroid.pixiv.help/hc/en-us/articles/38726063278233-How-do-I-export-a-model-as-VRM · 모바일용 텍스처 품질 안내 · 2026-10-17
S23 https://vroid.com/en/studio/notice/3rgHw1j8oCVkdWM0LKHBH6 · v2.0.0 내보내기 옵션 · 2026-10-17
S24 https://vroid.pixiv.help/hc/en-us/articles/4408150140825-How-to-use-the-Expression-Editor · 표정 편집기 · 2026-10-17
S25 https://vroid.pixiv.help/hc/en-us/articles/900006969003-I-want-to-know-more-about-the-parameters-in-Photo-Booth · 표정 · 입 A I U E O · 깜빡임 · 2026-10-17
S26 https://vroid.com/en/studio/notice/4qHpZB8TgtooNKXSNvlWx6 · v1.27.0 꼬리 장신구 · 2026-10-17 (검색 결과 제목만)
S27 https://vroid.com/en/news/1PDI63YsK9iLAvYaNQaCma · 광고 배너 예고(2026-04-23) · 2026-10-17
S28 https://www.moguravr.com/?p=317186 · v2.14.0 광고 · VRoid Plus 보도(2026-06-30) · 2026-10-17
S29 https://www.maruzenjunkudo.co.jp/products/9784839988654 · 입문서 소개(첫 모델 하루) · 2026-10-17
S30 https://vroid.pixiv.help/hc/en-us/articles/4402394424089-VRoidPreset-A-Z · 기본 제공 표본 조건(2024-12-26 갱신) · 2026-10-17
S31 https://hub.vroid.com/en/characters/2959613577921218423/models/1323282077604556117 · Hub 내려받기 불가 표시 예 · 2026-10-17 (검색 결과 요약만)
S32 https://booth.pm/en/browse/3D%20Characters?tags%5B%5D=VRM · BOOTH VRM 태그 목록 · 2026-10-17
S33 https://mysteryem.carrd.co/ · 영국 작가 가격표(£500~600부터) · 2026-10-17
S34 https://ryuniiko-commissions.carrd.co · 작가 가격표($600+, $200+, $350+) · 2026-10-17
S35 https://www.lancers.jp/profile/sumeragi_subaru · 일본 크라우드소싱 가격(1만 엔) · 2026-10-17 (직접 열람 429, 검색 요약만)
S36 https://github.com/saturday06/VRM-Addon-for-Blender · Blender VRM 애드온 · 2026-10-17
S37 https://github.com/vrm-c/vrm-specification/blob/master/samples/Seed-san/README.md · Seed-san 라이선스 · 2026-10-17
S38 https://github.com/vrm-c/vrm-specification/blob/master/samples/VRM1_Constraint_Twist_Sample/README.md · Twist 표본 라이선스 · 2026-10-17
S39 https://api.github.com/repos/vrm-c/vrm-specification/contents/samples/Seed-san/vrm 와 https://api.github.com/repos/pixiv/three-vrm/contents/packages/three-vrm/examples/models · 파일 크기 10.9MB · 10.8MB · 2026-10-17
S40 https://techcrunch.com/2025/12/19/netflix-acquires-gaming-avatar-maker-ready-player-me/ · RPM 2026-01-31 종료 · 2026-10-17 (readyplayer.me · docs.readyplayer.me 는 이 환경에서 이름 해석 실패, 네트워크 제한일 수 있어 보조 근거)
S41 https://www.goodfirms.co/software/avaturn · Avaturn 2차 자료 · 2026-10-17
S42 https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm-materials-mtoon/src/MToonMaterialLoaderPlugin.ts · 윤곽선 이중 그리기 · 2026-10-17
S43 https://vrm.dev/en/univrm/export/vrm_size/ · 용량 구성(표정 변형이 위험) · 2026-10-17
S44 https://tips.clip-studio.com/en-us/articles/9053 · 폴리곤 · 재질 줄이기 사용 기록 · 2026-10-17
S45 https://itch.io/post/6385577 · 줄이기 후 역바인드 오류 보고 · 2026-10-17 (검색 결과 요약만)
S46 https://threejs.org/manual/en/color-management.html · 색 관리 · 2026-10-17
S47 https://threejs.org/docs/pages/WebGLRenderer.html · 톤 매핑 · 그림자 · antialias · WebGL2 · 2026-10-17
S48 https://threejs.org/docs/pages/OutputPass.html · OutputPass · 2026-10-17
S49 https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm-materials-mtoon/src/shaders/mtoon.frag · 톤 매핑 포함, 환경 맵 주석 처리 · 2026-10-17
S50 https://threejs.org/docs/pages/RoomEnvironment.html · RoomEnvironment + PMREM · 2026-10-17
S51 https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/basic.html · 공식 기본 예제(카메라 · 조명 · VRMUtils) · 2026-10-17
S52 https://github.com/pmndrs/postprocessing/wiki/Antialiasing · 뒷처리와 MSAA · 2026-10-17
S53 https://threejs.org/manual/pages/tips.html · 투명 캔버스 · 2026-10-17
S54 https://threejs.org/docs/pages/Scene.html · backgroundBlurriness · 2026-10-17
S55 https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples · 예제 목록(bones · lookat · expressions · meta · animations) · 2026-10-17
S56 https://pmc.ncbi.nlm.nih.gov/articles/PMC9899223 · 성인 깜빡임 평균 16회/분 · 2026-10-17
S57 https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm-animation/examples/loader-plugin.html · .vrma 로드 예제 · 2026-10-17
S58 https://vroid.com/en/news/6HozzBIV0KkcKf9dc1fZGW · VRMA 무료 7종 · 제작 도구 소개 · 2026-10-17
S59 https://vroid.booth.pm/items/5512385 · VRMA 7종 약관 · 2026-10-17 (열람 시 '비공개' 안내)
S60 https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html · Mixamo FAQ(2021-09-14 갱신) · 2026-10-17
S61 https://github.com/pixiv/three-vrm/releases · 릴리스 목록(API 로 날짜 확인: https://api.github.com/repos/pixiv/three-vrm/releases) · 2026-10-17
S62 https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event · boundary 이벤트 · 2026-10-17
S63 https://github.com/mdn/browser-compat-data/blob/main/api/SpeechSynthesisUtterance.json · 호환 자료(크롬 부분 구현) · 2026-10-17
S64 https://codersblock.com/blog/javascript-text-to-speech-and-its-many-quirks/ · 브라우저별 괴벽(Safari · 안드로이드) · 2026-10-17
S65 https://github.com/WebAudio/web-speech-api/issues/69 · 합성 소리 스트림 제안(열림) · 2026-10-17
S66 https://lists.w3.org/Archives/Public/public-speech-api/2021Jun/0000.html 와 https://github.com/phetsims/utterance-queue/issues/60 · 원격 목소리 경계 신호 없음 · 2026-10-17 (검색 결과 요약만)
S67 https://github.com/met4citizen/TalkingHead · "Web Speech 는 시간표를 못 준다" · 2026-10-17
S68 https://github.com/mrxz/wlipsync · wLipSync(MIT) · 2026-10-17
S69 https://unpkg.com/wawa-lipsync@0.0.2/README.md · wawa-lipsync(MIT) · 2026-10-17
S70 https://bugs.webkit.org/show_bug.cgi?id=219780 · iOS 캔버스 크기 변경 메모리 · 2026-10-17 (검색 결과 요약만)
S71 https://discourse.threejs.org/t/ios-18-2-causing-webgl-error/75143 와 https://discourse.threejs.org/t/error-creating-webgl-contextios/70916 · iOS 메모리 한도 · antialias 사례 · 2026-10-17 (검색 결과 요약만)
S72 https://threejs.org/docs/pages/KTX2Loader.html · KTX2Loader · 2026-10-17
S73 https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ · Safari 26 WebGPU · 2026-10-17
S74 https://github.com/pixiv/three-vrm · README(WebGPU · MToonNodeMaterial 경고) · 2026-10-17
S75 https://api.github.com/repos/mrdoob/three.js/releases · three.js r186(2026-09-24) · 2026-10-17
S76 https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion · 움직임 줄이기 · 2026-10-17
S77 https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html · 번쩍임 기준 · 2026-10-17
S78 https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html · 멈춤 수단 · 2026-10-17
S79 https://github.com/pixiv/three-vrm/blob/dev/LICENSE · MIT, pixiv · 2026-10-17
S80 https://community.adobe.com/t5/mixamo-discussions/can-i-add-facial-expressions-with-mixamo/m-p/12092736/highlight/true · Fuse 표정 변형 제거 포럼 글 · 2026-10-17 (검색 결과 요약만)
S81 https://www.live2d.com/en/sdk/license/ · Live2D SDK 라이선스 · 2026-10-17
S82 https://help.live2d.com/en/other/other_14/ · 소규모 면제 기준 · 2026-10-17 (검색 결과 요약만)
S83 https://www.live2d.com/en/cubism/comparison/ · Editor FREE 대 PRO · 2026-10-17
S84 https://docs.live2d.com/en/cubism-sdk-manual/lipsync/ · 음량 기반 입 맞추기 · 2026-10-17 (검색 결과 요약만)
S85 https://rive.app/pricing · Rive 요금 · 2026-10-17
S86 https://github.com/rive-app/rive-wasm · Rive 런타임 MIT · 2026-10-17
S87 https://esotericsoftware.com/spine-purchase · Spine 요금 · 2026-10-17
S88 https://github.com/airbnb/lottie-web · lottie-web MIT · 2026-10-17
S89 https://docs.lottiefiles.com/en/format/dotlottie/interactivity/state-machines · dotLottie 상태 전환 · 2026-10-17
