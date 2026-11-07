# 무료 VRM 후보 · OpenArt · 그림에서 3D 로 가는 길 조사

조사 2026-10-17(조사 담당, 앞 보고서 `2026-10-17-threejs-avatar-quality.md` 를 잇는다). 근거는 [R번호]로 달았고 끝의 출처 목록에 URL 과 확인일이 있다. 확인 못 한 것은 (추측). 모델 파일은 내려받지 않았고 미리보기 그림만 열어 꼴을 눈으로 봤다. 판단 기호는 ◎ 아이 선생님에 잘 맞음, ○ 쓸 만함, △ 아쉬움이다.

## 요약

1. 후보 22행을 찾았다. 로그인 없이 바로 받는 것이 11행(GitHub · OpenGameArt · itch.io · Arweave), pixiv 나 niconico 계정이 필요한 것이 11행(VRoid Hub 중심)이다.
2. "저 셋이 끝은 아니다". CC0 로 명시된 VRM 이 더 있다. OpenGameArt 의 VRoid 알파 표본 11종(VRM 0.x, 직접 받기)과 VRoid Hub 歴代サンプルモデル 6종(CC0, VRM 1.0, pixiv 로그인)이다.
3. 아이 선생님 꼴 상위 셋은 Vivi · Victoria_Rubin(둘 다 CC0, VRM 1.0)과 AvatarSample_A(허용 칸 모두 켜짐, CC0 아님)다. 셋 다 VRoid Hub 라서 요청자의 pixiv 계정으로 받아야 한다.
4. 컨트롤러가 바로 띄울 것은 hinzka 의 VRoid 기본 몸 여 · 남(GitHub, 상업 · 재배포 허용 문구, 표정 변형 52개)과 OpenGameArt CC0 zip, 그다음 itch.io Kaya 다. 꼴은 기본형이다.
5. 무료 후보에서 교사 꼴(안경 · 블라우스)은 못 찾았다. 대부분 학생복이나 평상복이다. 노출이 큰 Vita 와 짧은 치마 거리 패션의 AvatarSample_B 는 뺐다.
6. OpenArt 는 3D 메시를 못 만든다(공식 첫 화면 · 요금 · 도움말에 3D 없음, 3D 월드만 있음). 쓸 자리는 시안과 배경 그림이 1순위이고 상업 이용은 Plus($34/월)부터다.
7. 그림에서 3D: Tripo · Meshy 는 사람 꼴 자동 뼈대는 주지만 VRM 내보내기와 얼굴 표정 변형이 없다. 무료 Charakuru 가 VRM 1.0 까지 가나 표정과 눈 움직임이 없다. 입 모양까지 되는 VRM 을 한 번에 주는 서비스는 못 찾았다.
8. 확인 못 한 것: 표본 대부분의 파일 안 허용 설정, 각 모델의 용량과 최적화 상태, Hub · BOOTH 의 로그인 없는 받기, OpenArt 약관의 날짜 모순, 단일 그림 3D 의 애니 품질.

## 1. 후보 표

### 1.1 로그인 없이 바로 받을 수 있는 것(11행)

| # | 이름 | 받는 곳 | 꼴 · 적합 | VRM · 크기 | 허용 조건(원문) | 비고 | 근거 |
|---|---|---|---|---|---|---|---|
| A1 | VRoid_V110 여성 | `https://raw.githubusercontent.com/hinzka/52blendshapes-for-VRoid-face/main/VRoid_V110_Female_v1.1.3.vrm` | VRoid 기본 여성 몸, 옷은 기본형(사진은 못 봄) ○ | 판 미표기(추측 0.x) · 23.3MB | "This data may be used freely for both personal and commercial purposes." "Credit or license attribution is not required." 재배포 · 판매 허용 | 아이폰 얼굴 인식용 표정 변형 52개를 더한 판. LICENSE 파일은 없고 README 문구뿐 | [R15][R16] |
| A2 | VRoid_V110 남성 | 같은 저장소 `VRoid_V110_Male_v1.1.3.vrm` | 회색 머리, 흰 티셔츠 · 반바지, 단정한 소년 · 청년 ○ | 판 미표기 · 22.7MB | A1 과 같음 | 미리보기는 같은 계열인 PerfectSyncSample Male 사진 | [R15][R16][R17] |
| A3 | Seed-san | `https://raw.githubusercontent.com/vrm-c/vrm-specification/master/samples/Seed-san/vrm/Seed-san.vrm` | 검은 머리 소년, 흰 옷에 기계 팔 장신구 △ | VRM 1.0 · 10.9MB | "VRM Public License 1.0"(VirtualCast, Inc.). 허용 범위는 파일 안 설정이라 못 읽음 | 이미 쓴 표본 | [R18][R19] |
| A4 | VRM1_Constraint_Twist_Sample | `https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm` | 갈색 긴 머리 여성, 흰 티 · 검은 반바지, 단정한 기본형 ○ | VRM 1.0 · 10.8MB | "(c) 2022 pixiv Inc." + VRM Public License 1.0. 파일 안 설정은 못 읽음 | 이미 쓴 표본 | [R18][R19] |
| A5 | AvatarSample_D · D_Darkness · E · F · G | `https://opengameart.org/sites/default/files/avatarsample_d_0.zip` 외 `avatarsample_d_darkness.zip` `avatarsample_e.zip` `avatarsample_f.zip` `avatarsample_g.zip` | 꼴 미확인(VRoid 알파 표본, 모음 사진에 은발 요정 귀와 갈색 단발이 보임) △ | VRM 0.x · zip 11.2~17.2MB | "These models come from the alpha versions of VRoid Studio and were explicitly released by VRoid under CC0." | VRoid 0.14.0 에서 내보내고 최적화는 안 함. 확장자를 .glb 로 바꾸면 MToon 이 사라진다 | [R1][R2] |
| A6 | BaseFemale · BaseMale · HairSample_Female · HairSample_Male | `base_female.zip` `base_male.zip` `hairsample_female.zip` `hairsample_male.zip`(같은 폴더) | VRoid 기본 몸과 머리 견본, 꼴 미확인 △ | VRM 0.x · zip 13.1~15.5MB | CC0(A5 와 같은 문구) | 옷 · 꼴이 단순한 바탕용 | [R1] |
| A7 | Sakurada_Fumiriya · Sendagaya_Shino(알파판) | `sakurada_fumiriya.zip` `sendagaya_shino.zip`(같은 폴더) | 학생복 계열 남 · 여 ○(Hub 판 Shino 사진 기준이라 알파판은 다를 수 있음, 추측) | VRM 0.x · zip 15.9 · 11.7MB | CC0 | 페이지가 Fumiriya 는 손봐야 할 수 있다고 적음 | [R1][R6] |
| A8 | Kaya(Fox Jump) | `https://fox-jump.itch.io/kaya-anime-character` | 분홍 메시 단발, 토끼 무늬 스웨터 · 주름치마, 갈색 피부 ○ | VRM + FBX · zip 23MB | "You can use for comercial purposes." 이름 밝히기 불필요(옷 제작자 Ravenn 표기), 재배포 · 고쳐 쓰기는 말 없음 | 가격 직접 입력($0 가능). 브라우저에서 클릭해 받음. "게임을 만들면 알려 달라"는 부탁 | [R20] |
| A9 | Kai(Fox Jump) | `https://fox-jump.itch.io/kai-vroid-model` | 후디 입은 소년(렌더 사진만) △ | VRM + FBX · zip 29MB | A8 과 같은 상업 이용 문구 | 동작 파일 없음 | [R21] |
| A10 | Xmas Chibis(ToxSam, 80종) | 저장소 `ToxSam/open-source-avatars` 의 `data/avatars/xmas-chibis.json` 안 `model_file_url`(IPFS) | 요정 · 곰 · 토끼 · 쥐 · 눈사람 등 치비, 성탄 주제, 사진 못 봄 △ | VRM 판 미표기 · 크기 미확인 | CC0(`projects.json`) | 주소가 dweb.link 라서 이 환경에서는 이름 해석이 안 됐다. 다른 IPFS 게이트웨이가 필요할 수 있다(추측) | [R22] |
| A11 | 100Avatars R1~R3(ToxSam, 300종) | 같은 저장소(Arweave 주소) | NFT 풍 저폴리. 확인한 둘은 화난 얼굴의 곰(Teddy)과 가면형(Rabbit) △ | VRM · 크기 미확인 | CC0 | 아이 선생님 꼴이 아님 | [R22] |

### 1.2 pixiv · niconico 계정이 필요한 것(11행)

| # | 이름 | 받는 곳 | 꼴 · 적합 | VRM · 크기 | 허용 조건(원문) | 비고 | 근거 |
|---|---|---|---|---|---|---|---|
| B1 | AvatarSample_A(VRoid Project) | `https://hub.vroid.com/en/characters/2843975675147313744/models/5644550979324015604` | 갈색 단발, 크림 카디건 · 반바지 · 스타킹, 상냥한 인상 ◎ | VRM 0.0 · 크기 미확인 | "Avatar Use:Allow/ … Corporate use:Allow/ Individual commercial use:Allow/Redistribution: Allow/Alterations: Allow/Attribution: Not required" 단 "not under the CC0 license" | VRoid Project 공식 표본 | [R10] |
| B2 | β Ver AvatarSample_2 | `https://hub.vroid.com/en/characters/945152946522067123/models/3383751442912063017` | 갈색 단발 · 옥색 눈, 베이지 조끼 + 체크 치마 학생복, "과자 만들기가 특기인 막내" ○ | VRM 0.0 | B1 과 같은 Allow 칸 | 학생복 | [R12] |
| B3 | β Ver AvatarSample_1 | `https://hub.vroid.com/en/characters/675572020956181239/models/7175071267176594918` | 검은 단발 + P 핀, 같은 학생복, 미소 ○ | VRM 0.0 | B1 과 같은 Allow 칸 | 학생복 | [R13] |
| B4 | Vivi(歴代サンプル) | `https://hub.vroid.com/en/characters/4593660874193246717/models/6231093367809816026` | 갈색 단발, 연두 앞치마 원피스 + 끈 부츠, 동화 같은 인상 ◎ | VRM 1.0 | "All models are CC0 licensed, so feel free to use them." 조건 칸: Redistribution Allow, Alterations Allow, Redistribution of altered model Allow, Attribution Not required | 변환자 Coatie(Koh-Tee). 베타판 샘플을 1.0 으로 옮긴 것 | [R3][R5] |
| B5 | Victoria_Rubin | `https://hub.vroid.com/en/characters/4593660874193246717/models/2541762389476121920` | 연한 금발 사이드 포니, 분홍 · 크림 드레스, 밝고 귀여움 ◎ | VRM 1.0 | B4 와 같은 CC0 설명(조건 칸은 직접 안 읽음) | 노출 적음 | [R3][R7] |
| B6 | Sendagaya_Shino | `https://hub.vroid.com/en/characters/4593660874193246717/models/7956589129305596116` | 검은 긴 머리, 조끼 + 나비 리본 학생복 ○ | VRM 1.0 | B4 와 같음(조건 칸 읽음) | 학생복 | [R3][R6] |
| B7 | Sendagaya_Shibu | `https://hub.vroid.com/en/characters/4593660874193246717/models/1289835761881499317` | 검은 단발, 주황 리본 학생복 ○ | VRM 1.0 | B4 와 같은 CC0 설명 | 학생복 | [R3][R8] |
| B8 | Darkness_Shibu | `https://hub.vroid.com/en/characters/4593660874193246717/models/5008365454243263529` | 은발 요정 귀, 검은 고딕 드레스, 어두운 분위기 △ | VRM 1.0 | B4 와 같은 CC0 설명 | 아이 선생님에는 어두움 | [R3][R9] |
| B9 | AvatarSample_C | `https://hub.vroid.com/en/characters/1248981995540129234/models/8640547963669442173` | 검은 기능성 재킷의 소년, 팔짱 낀 차가운 인상 △ | VRM 0.0 | B1 과 같은 Allow 칸 | 사진상 무표정 | [R11] |
| B10 | Alicia Solid(ニコニ立体ちゃん) | `http://3d.nicovideo.jp/alicia/`(niconico 로그인) | 꼴은 못 봄 | VRM 판 · 크기 미확인(three.js 예제에 VRM 판이 실렸던 기록) | "営利・非営利問わず" "法人を除く団体を含む" "改変物を配布することができます" "利用者が未成年の場合には、事前に法定代理人の同意" | 법인은 이용자에서 빠진다. 뒷날 법인 공개엔 △. 모델 원본 재배포는 약관에 없음 | [R24] |
| B11 | Uka · Gene(Nitech 이강 연구실) | PMX 는 `https://github.com/mmdagent-ex/uka`, VRM 은 VRoid Hub(내려받기 불가 표기) | Uka: 중성적 청년, 일본 전통 복장, 귀 · 꼬리(끌 수 있음). Gene: 만화풍 중성 △ | PMX 만 받을 수 있음 | "Uka's 3D model is available under CC-BY 4.0 license." Gene 은 상업 이용 추가 제한 + 상표 · 디자인권 별도 | VRM 을 못 받아 변환 작업이 필요 | [R25] |

### 1.3 미리보기 그림 URL

| # | 그림 |
|---|---|
| A1 A2 | `https://vroid-hub.pximg.net/images/full_body_images/1723/7913291442063518283.png`(남성, 같은 계열) |
| A3 | `https://raw.githubusercontent.com/vrm-c/vrm-specification/master/samples/Seed-san/screenshot/screenshot.png` |
| A4 | `https://raw.githubusercontent.com/vrm-c/vrm-specification/master/samples/VRM1_Constraint_Twist_Sample/screenshot/screenshot.jpg` |
| A5 A6 A7 | `https://opengameart.org/sites/default/files/preview_mashup_0.png`(두 모델 합성 한 장뿐) |
| A8 | `https://img.itch.zone/aW1hZ2UvOTU2NDQ4LzU0MjI5NzAucG5n/original/qh7RuZ.png` |
| A9 | `https://img.itch.zone/aW1nLzUzOTA1MTYucG5n/original/odZVl1.png` |
| A10 | `https://dweb.link/ipfs/Qmcy2yaDm9PxvG3VTmFrUNJJKgDHYAv3DshjAn1GBRDAsp/Avatar09_Neutral_r1.png`(토끼 예) |
| A11 | `https://arweave.net/raw/RshgOJaFyAdcmupiH7pUl9-WdC-flIEM0NrPqZEtyfU`(Teddy), `https://arweave.net/raw/wBqJHzcXuHV0NpFcbtcBB4O2kHqdVN0Zv2QO0jHNkdI`(Rabbit) |
| B1 | `https://vroid-hub.pximg.net/images/full_body_images/13/4481737716959036240.png` |
| B2 B3 | `https://vroid-hub.pximg.net/images/full_body_images/13/2894581715972959889.png`(B2), `.../13/6626215500506147129.png`(B3) |
| B4 B5 | `https://vroid-hub.pximg.net/images/full_body_images/873926/3924178415326751084.png`(Vivi), `.../873926/6089757774195989448.png`(Victoria) |
| B6 B7 B8 | `.../873926/4700212816014196225.png`(Shino), `.../873926/5982818541097072104.png`(Shibu), `.../873926/7884725705068723628.png`(Darkness) |
| B9 | `https://vroid-hub.pximg.net/images/full_body_images/13/6728907180184640133.png` |

### 1.4 뺀 것

- 꼴 때문에 뺌: Vita(어깨 · 허벅지가 드러난 SF 의상) [R4], AvatarSample_B(짧은 치마의 거리 패션) [R11], wlily's characters 10종(CC0 이지만 낙서풍 · 기이한 꼴, 파일 안 허가 표기가 들쭉날쭉) [R23].
- 조건 때문에 뺌: itch.io Rose · Theresa(상업 이용엔 최소 $5 기부) [R46], Unity-chan(UCL 로고 표기 의무, VRM 판 공식 여부 못 확인) [R44], 미니 ずんだもん 공식 VRM(무료이나 상업 조건 못 확인) [R45], BOOTH SATOREPO 의 CC0 .vroid 4종(VRM 이 아니라 VRoid 원본이고 판매자가 pixiv 삭제 요청에 응하겠다고 적음) [R26].
- 못 봄: three-vrm-girl(앞 보고서에서도 조건을 못 찾음). 표본 셋 중 이것만 제품에 넣지 않는다.

## 2. 받는 길 가르기

| 곳 | 로그인 | 근거 |
|---|---|---|
| GitHub raw(A1~A4) | 필요 없음. 공개 저장소의 파일 주소 | [R15][R19] |
| OpenGameArt(A5~A7) | 페이지의 로그인 문구는 댓글용으로 보임. 받기에 필요 없다고 추측(직접 받아 보지 않음) | [R1] |
| itch.io(A8 A9) | 가격 직접 입력에 $0. 로그인 언급은 댓글 · 팔로우뿐(추측: 계정 없이 가능). 클릭 두 번이 필요해 스크립트로는 번거롭다 | [R20][R21] |
| Arweave · IPFS(A10 A11) | 필요 없음. 단 IPFS 게이트웨이 주소가 안 열릴 수 있다 | [R22] |
| VRoid Hub(B1~B9) | 필요. "Please make sure you're logged in to VRoid Hub before downloading model data." 일부 모델은 "Yes (download is not allowed)"라서 받을 수 없다 | [R14][R17] |
| niconico(B10) | 필요. "ダウンロードするためには…アカウントでログインする必要があります" | [R24] |
| BOOTH | 로그인 필요 여부를 못 확인(추측: 필요) | [R26] |

요청자가 받을 때는 B4 · B5 · B1 · B2 순으로 한 폴더에 담아 주면 컨트롤러가 바로 띄운다. Hub 판은 VRM 파일 크기를 페이지에 보이지 않으니 받은 뒤 크기를 잰다.

## 3. OpenArt

### 3.1 공식 페이지로 확인한 것

- 3D 메시는 없다. 첫 화면 기능 목록은 Image · Character · Video · Director Mode · VFX · Edit Video · Motion Sync 등이고 3D 생성은 언급이 없다 [R27]. 요금 페이지와 도움말에도 3D 기능이 없다 [R28][R30].
- 3D 는 "Turn any image into a navigable 3D world"라는 별도 도구(OpenArt Worlds)뿐이다 [R31]. World Labs 의 3D 세계 모델을 쓰고 3D Gaussian Splat 으로 내보낸다고 한다(검색 요약) [R32]. 걸어 다니는 장면이지 뼈대 있는 캐릭터가 아니다.
- 캐릭터 일관성: 참고 이미지 10~15장을 권하고 "While small variations may occur, consistency is significantly improved compared to independent generations."라고 적는다 [R30][R31]. 표정 · 자세는 "Use detailed prompts and reference images."뿐이다 [R30]. 인페인팅 · 배경 제거 기능이 있다 [R30].
- 요금: Starter $14, Plus $34(연간 결제 월 $27), Pro $56, Wonder $240. Plus 는 12,000 크레딧에 일관 캐릭터 약 40개 [R28].
- 약관: "OpenArt makes no claims of ownership or copyright of AI-generated Output." 모든 등급이 비상업 이용 가능, 상업 이용은 "at, and above, the 'Plus' level". 무료 플랜 산출물은 워터마크가 붙을 수 있고 지우면 안 된다. 같은 쪽에 갱신일이 7월 30일과 7월 20일로 어긋나 있다 [R29].

### 3.2 도움이 되는 자리 셋

| 자리 | 하는 일 | 비용 | 품질 | 라이선스 | 일의 크기 |
|---|---|---|---|---|---|
| (가) 시안 · 배경 | 설정 그림(정면 + 표정 몇 장)을 뽑아 모델을 고르거나 작가에게 의뢰할 때 참고로 붙인다. 교실 배경 그림도 같은 도구로 뽑는다 | Plus 한 달($34)이면 충분(추측). 체험 크레딧이 있는지는 못 확인 | 높음(Nano Banana Pro 등) | 상업 이용은 Plus 부터. 저작권 보호는 불확실하다. 미국 저작권청 보고서(2025-01)는 프롬프트만으로는 저작자가 못 된다고 본다(2차 자료) [R41]. 의뢰 때는 "분위기 참고"로만 붙이고 작가가 원안을 그리게 한다 | 반나절(추측) |
| (나) 그림에서 3D | 3.3 표 | Tripo Pro $20/월, Meshy Premium ₩58,000/월 | 단일 그림 3D 는 얼굴 일그러짐 · 관절 꺾임이 나올 수 있다 | 서비스별(3.3 표) | 며칠 이상(추측). 표정 변형을 블렌더에서 직접 만들어야 한다 |
| (다) 2D 종이 인형 | 기준 그림 1장에서 입 벌림 · 눈 감김을 인페인팅으로 부분만 바꿔 위치가 안 어긋나게 만들고, 배경을 지운 뒤 CSS 나 Rive 로 갈아 끼운다 | Plus 한 달 + CSS 무료(Rive 무료는 $0 이고 스플래시 포함) [R42] | 평면이라 얼굴 돌림이 없다. 그림 두 장을 따로 뽑으면 눈 · 입 위치가 어긋난다(일관성이 "작은 변화"를 인정하므로) | (가)와 같음 | 1~2일(추측) |

(다)의 입 모양도 앞 보고서와 같은 한계가 있다. 브라우저 소리 읽기는 소리 데이터가 없어서 입 벌림 그림 3~4장을 번갈아 보이는 정도가 비용 0 의 한계다.

### 3.3 그림에서 3D 서비스(2026-10 현재, 자동 뼈대 · 표정 · VRM)

| 서비스 | 자동 뼈대 | 얼굴 표정 변형 | VRM | 무료 · 가격 | 라이선스 · 비고 | 근거 |
|---|---|---|---|---|---|---|
| Tripo | 있음. biped 등, 이름표는 tripo 나 mixamo 선택, 20크레딧(API 25) | 문서에 없음 | 내보내기 GLB · FBX 만 | Free 월 200크레딧(약 13모델), Pro $20/월 3,000 | Free 는 "Public Models · Non-Commercial Use", Pro 부터 상업 이용 | [R33][R34] |
| Meshy | 사람 꼴만. FBX · GLB | 문서에 없음 | 내보내기 목록에 없음 | Free ₩0 100크레딧, 내려받기 월 10회. Premium ₩58,000/월 | Free 산출물은 CC BY 4.0, Premium 은 "you own all assets" | [R35][R36] |
| Hyper3D Rodin | 못 찾음 | 못 찾음 | 못 찾음 | 2차 자료: Creator $24/월 등 | GLB · FBX, 삼각형 메시라 정리가 어렵다는 평 | [R37] |
| Hunyuan3D 2.x(공개 가중치) | 없음 | 없음 | 없음 | 무료 | 라이선스가 EU · 영국 · 대한민국을 허가 영역에서 뺀다(2.0 · 2.1 문구, 검색 요약). 한국 앱에는 쓸 수 없다 | [R38] |
| Charakuru(nano) | 있음(Tripo + 블렌더) | "Expressions and eye movement are not included." | VRM 1.0 | 무료. 연매출과 누적 투자가 각각 1억 엔 미만이면 별도 계약 없음 | Tripo 계정 · Codex · Blender 5.2 · VRM 애드온 필요. 개발 중, UI 한국어 지원 | [R39] |
| Neural4D | 주장 | "mouth movement" 변형을 포함한다고 블로그가 주장 | 블로그가 주장 | 무료 한도가 글마다 다름 | 공식 첫 화면에는 AnimeArt · VRM · 표정 문구가 없다. 미검증 | [R40] |

결론: 2026-10 현재 입 모양과 깜빡임까지 들어간 VRM 을 한 번에 주는 서비스는 못 찾았다. Charakuru 가 VRM 1.0 에 가장 가깝지만 표정이 없어 우리 요건(깜빡임 · 입 모양)을 채우지 못한다. 표정 변형을 직접 만들어야 하므로 (나)는 권하지 않는다.

## 4. 권고

아이 선생님 기준 상위 후보와 시험 순서다.

| 순서 | 후보 | 받는 길 | 이유 | 주의 |
|---|---|---|---|---|
| 1 | A1 VRoid_V110 여성(+A2 남성) | GitHub raw, 컨트롤러 | 상업 · 재배포 허용 문구가 분명하고 표정 변형 52개가 있어 입 모양 시험에 좋다 ○ | 용량 23MB. 최적화를 못 해 iPad 에서 무거울 수 있다. 꼴은 기본형 |
| 2 | A5~A7 OpenGameArt CC0 | zip 직접 받기, 컨트롤러 | CC0 라서 가장 깨끗하다 | VRM 0.x, 최적화 안 됨, 꼴은 받아서 확인 |
| 3 | A8 Kaya | itch.io 클릭, 컨트롤러 | 상업 이용 가능 문구, 평상복이라 선생님 느낌을 내기 쉽다 ○ | CC0 아님, 재배포 · 고쳐 쓰기 조건이 비어 있어 작가에게 물어야 한다 |
| 4 | B4 Vivi ◎ | VRoid Hub, 요청자 | CC0 + VRM 1.0 + 조건 칸 모두 Allow. 앞치마 원피스가 학생복이 아니라 포근하다 | 파일 크기 미확인 |
| 5 | B5 Victoria_Rubin ◎ | VRoid Hub, 요청자 | CC0 + VRM 1.0, 밝고 노출이 적다 | 공주풍이라 "선생님" 설정은 설명이 필요 |
| 6 | B1 AvatarSample_A ◎ | VRoid Hub, 요청자 | 카디건 차림이 단정한 선생님 · 언니 인상. 모든 허용 칸이 켜져 있다 | CC0 가 아니라 pixiv 가 권리를 가진다. 고치지 않은 원본의 유료 재배포는 금지될 수 있다(추측) |
| 7 | B2 β AvatarSample_2 ○ · B6 Shino ○ | VRoid Hub, 요청자 | 학생복이지만 단정하고 허용 칸이 열려 있다 | 선생님 설정과 어긋남 |
| 8 | A4 Twist | GitHub, 이미 사용 | 파이프라인 기준선 | 파일 안 허용 설정을 읽어 개발용으로만 둔다 |

컨트롤러는 1 · 2 를 먼저 받아 iPad 에서 용량 · 프레임을 재고, 요청자는 4 · 5 · 6 을 pixiv 계정으로 받아 한 폴더에 둔다. 무료 후보에 교사 꼴이 없으므로 "학생복 캐릭터를 선생님으로 쓸지"를 먼저 정해야 한다. 앞 보고서의 결론대로 모델은 파일만 바꿔 끼울 수 있으니 시험은 코드를 바꾸지 않고 파일만 갈아 끼우며 한다.

OpenArt 는 3D 모델 자리가 아니라 (가) 시안과 배경 그림 자리에 한 달 Plus 로 쓴다. 고른 모델의 분위기에 맞춘 교실 배경과 설정 그림은 빠르게 얻는다. 그림에서 3D 를 만들려는 용도(나)는 입 모양 요건을 못 채워 접고, (다)는 3D 가 iPad 에서 막힐 때의 예비 길로만 둔다.

## 5. 확인 못 한 것

- 표본 대부분의 파일 안 허용 설정(VRM 안 meta). 페이지 문구와 다를 수 있다.
- VRoid Hub 모델의 용량과 최적화 상태, OpenGameArt · itch.io 가 로그인 없이 되는지(직접 받아 보지 않음), BOOTH 의 로그인 요구.
- A5~A7 의 개별 꼴(모음 사진 한 장뿐), A1 여성 판의 꼴(남성 판 사진만 봄), A10 의 꼴 · 크기, B10 Alicia 의 꼴.
- OpenArt 체험 크레딧 여부와 약관 날짜 모순, 한국법상 AI 산출물의 보호 범위(미국 쪽 2차 자료만 확인).
- 단일 그림 3D 의 애니 캐릭터 품질(근거 있는 사례를 못 찾음), Rodin · Neural4D 의 공식 기능.

## 출처 목록

확인일은 줄마다 적은 2026-10-17 이다. 괄호는 열람 상태 메모다.

R1 https://opengameart.org/content/vroid-studio-cc0-models · VRoid CC0 알파 표본 11종 · 2026-10-17
R2 https://opengameart.org/sites/default/files/preview_mashup_0.png · OpenGameArt 합성 미리보기 · 2026-10-17
R3 https://hub.vroid.com/en/characters/4593660874193246717 · 歴代サンプルモデル 6종 목록 · 2026-10-17
R4 https://hub.vroid.com/en/characters/4593660874193246717/models/7942721847119018516 · Vita vrm1.0 · 2026-10-17
R5 https://hub.vroid.com/en/characters/4593660874193246717/models/6231093367809816026 · Vivi · 2026-10-17
R6 https://hub.vroid.com/en/characters/4593660874193246717/models/7956589129305596116 · Sendagaya_Shino · 2026-10-17
R7 https://hub.vroid.com/en/characters/4593660874193246717/models/2541762389476121920 · Victoria_Rubin(설명만) · 2026-10-17
R8 https://hub.vroid.com/en/characters/4593660874193246717/models/1289835761881499317 · Sendagaya_Shibu(설명만) · 2026-10-17
R9 https://hub.vroid.com/en/characters/4593660874193246717/models/5008365454243263529 · Darkness_Shibu(설명만) · 2026-10-17
R10 https://hub.vroid.com/en/characters/2843975675147313744/models/5644550979324015604 · AvatarSample_A · 2026-10-17
R11 https://hub.vroid.com/en/characters/1248981995540129234/models/8640547963669442173 · AvatarSample_C, 그리고 B https://hub.vroid.com/en/characters/7939147878897061040/models/2292219474373673889 · 2026-10-17
R12 https://hub.vroid.com/en/characters/945152946522067123/models/3383751442912063017 · β Ver AvatarSample_2 · 2026-10-17
R13 https://hub.vroid.com/en/characters/675572020956181239/models/7175071267176594918 · β Ver AvatarSample_1 · 2026-10-17
R14 https://vroid.pixiv.help/hc/en-us/articles/360011744473-I-can-t-download-model-data · Hub 받기에 로그인 필요 · 2026-10-17
R15 https://github.com/hinzka/52blendshapes-for-VRoid-face · README 와 허용 문구(raw README 도 확인) · 2026-10-17
R16 https://api.github.com/repos/hinzka/52blendshapes-for-VRoid-face/contents · 파일 크기와 LICENSE 부재 · 2026-10-17
R17 https://hub.vroid.com/en/characters/2509120546947008623/models/5163931001903716096 · PerfectSyncSample Male(미리보기, "download is not allowed") · 2026-10-17
R18 https://github.com/vrm-c/vrm-specification/tree/master/samples · Seed-san · Twist 표본 README(라이선스 문구) · 2026-10-17
R19 https://api.github.com/repos/vrm-c/vrm-specification/contents/samples/Seed-san/vrm 와 https://api.github.com/repos/pixiv/three-vrm/contents/packages/three-vrm/examples/models · 파일 크기 · 2026-10-17
R20 https://fox-jump.itch.io/kaya-anime-character · Kaya · 2026-10-17
R21 https://fox-jump.itch.io/kai-vroid-model · Kai · 2026-10-17
R22 https://github.com/toxsam/open-source-avatars · 목록 저장소(data/projects.json · avatars/*.json 도 raw 로 확인) · 2026-10-17
R23 https://opengameart.org/content/wlilys-characters · wlily's characters(제외 근거, 미리보기 5장 확인) · 2026-10-17
R24 http://3d.nicovideo.jp/alicia/rule.html · Alicia Solid 약관 · 2026-10-17, 그리고 three.js r122 예제 readme 사본 https://designheritage.mit.edu/_dh_debug/THREEjs_122/examples/models/vrm/Alicia/readme.txt (VRM 판 언급, 제3자 사본)
R25 https://www.slp.nitech.ac.jp/en/avatar 와 https://github.com/mmdagent-ex/uka · Uka · Gene · 2026-10-17
R26 https://booth.pm/en/items/3094418 · SATOREPO 의 CC0 .vroid · 2026-10-17
R27 https://openart.ai/home · OpenArt 기능 목록 · 2026-10-17
R28 https://openart.ai/pricing · OpenArt 요금 · 2026-10-17
R29 https://openart.ai/terms 와 https://openart.ai/suite/terms · OpenArt 약관 · 2026-10-17
R30 https://openart.ai/help · 캐릭터 학습 · 표정 · 인페인팅 · 배경 제거 · 2026-10-17
R31 https://openart.ai/features/ai-character/ · 캐릭터 일관성과 3D 월드 언급 · 2026-10-17
R32 https://openart.ai/features/openart-worlds 와 https://www.worldlabs.ai/case-studies/openart · OpenArt Worlds · 2026-10-17 (검색 결과 요약만)
R33 https://www.tripo3d.ai/pricing · Tripo 요금 · 2026-10-17
R34 https://developers.tripo3d.com/en/docs/animations-rig · Tripo 자동 뼈대 · 2026-10-17 (검색 결과 요약만)
R35 https://www.meshy.ai/pricing · Meshy 요금 · 2026-10-17
R36 https://docs.meshy.ai/en/api/rigging-and-animation · Meshy 자동 뼈대 · 2026-10-17
R37 https://costbench.com/software/ai-3d-generation/rodin-hyper3d/ · Rodin 2차 자료 · 2026-10-17 (검색 결과 요약만)
R38 https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE · Hunyuan3D 영역 제외 · 2026-10-17 (검색 결과 요약만)
R39 https://github.com/nanocle/Charakuru 와 https://alphasignal.ai/news/charakuru-turns-a-single-2d-drawing-into-a-rigged-3d-avatar · Charakuru · 2026-10-17
R40 https://blog.neural4d.com/anime-art-generation/how-to-make-a-vrchat-avatar/ 와 https://www.neural4d.com/ · Neural4D(벤더 글, 첫 화면에는 문구 없음) · 2026-10-17
R41 https://www.copyright.gov/ai/ 와 https://datamatters.sidley.com/2025/02/07/u-s-copyright-office-issues-report-on-artificial-intelligence-and-copyrightability/ · 미국 저작권청 Part 2(공식 쪽은 날짜만, 결론은 2차) · 2026-10-17
R42 https://rive.app/pricing · Rive 요금 · 2026-10-17
R44 https://support.unity.com/hc/en-us/articles/30828129581588-Guidelines-for-Using-Unity-chan-Assets · Unity-chan · 2026-10-17 (검색 결과 요약만)
R45 https://booth.pm/ja/items/8600596 · 미니 ずんだもん 공식 VRM(검색 결과 요약만) · 2026-10-17
R46 https://thatnewdevgirl.itch.io/free-3d-anime-girl-rose · 상업 이용에 최소 기부 $5 · 2026-10-17 (검색 결과 요약만)
