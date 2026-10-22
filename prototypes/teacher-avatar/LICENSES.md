# 캐릭터 에셋 출처

확인일: 2026-10-20. 미나와 리오는 모모 화면에서 사용하는 표시 이름입니다. 원본 모델 제작자는 VRoid Project(`VRoidプロジェクト`)입니다. 기존 임시 샘플 폴더에서 아래 원본 VRM을 변경 없이 복사했으며, 썸네일도 각 VRM에 포함된 PNG를 그대로 추출했습니다.

## 배포 출처

[OpenGameArt: VRoid Studio CC0 Models](https://opengameart.org/content/vroid-studio-cc0-models), 게시자 hecko, 원 제작자 VRoid Project. 해당 페이지는 첨부된 구형 샘플들을 CC0로 설명하며 다른 버전의 VRoid 샘플과 구분합니다. 이 설명을 모든 VRoid 모델에 일반화하지 않습니다.

| 표시 이름 | 로컬 파일 | 원본 제목 / 파일 | 배포 파일 |
| --- | --- | --- | --- |
| 미나 / Mina | `public/models/mina.vrm` | `ビビ` / `oga_e.vrm` | [avatarsample_e.zip](https://opengameart.org/sites/default/files/avatarsample_e.zip) |
| 리오 / Leo | `public/models/leo.vrm` | `HairSample_Male` / `oga_hair_m.vrm` | [hairsample_male.zip](https://opengameart.org/sites/default/files/hairsample_male.zip) |

## 파일 내부 메타데이터

미나 파일의 `licenseName`은 `Other`, 리오 파일은 `CC0`입니다. 배포 페이지의 설명과 구분하여 이 차이를 그대로 기록합니다. 두 파일 모두 `allowedUserName=Everyone`, `commercialUssageName=Allow`이며, 다음 URL을 `otherPermissionUrl`과 `otherLicenseUrl`에 포함합니다.

[파일에 내장된 VRoid Hub 사용 조건](https://hub.vroid.com/license?allowed_to_use_user=everyone&characterization_allowed_user=everyone&corporate_commercial_use=allow&credit=unnecessary&modification=allow&personal_commercial_use=profit&redistribution=allow&sexual_expression=allow&version=1&violent_expression=allow)

해당 페이지에는 개인·법인 상업 이용, 개조, 재배포 허용과 크레딧 불필요가 표시되어 있습니다. 원본 메타데이터는 보존했으며, 프로토타입에는 출처도 표시합니다. 최종 제품에서 다른 모델로 교체할 때는 그 파일의 조건을 별도로 확인해야 합니다.

## 무결성

| 파일 | 바이트 수 | SHA-256 |
| --- | ---: | --- |
| `mina.vrm` | 17,936,516 | `aea824cc43a95dd022a57d460ed901534a45fc2ac195f26ffc4d0d5beb0d7911` |
| `leo.vrm` | 18,947,896 | `4af2194f90ba846f3b13c00b50b14262419062d2171d17de922bcce2f89979c7` |

`public/portraits/mina.png`와 `leo.png`는 각 모델의 `meta.texture`가 가리키는 이미지를 추출한 파일이며, 독립적으로 제작한 일러스트가 아닙니다.

## 실행 라이브러리

- [Three.js](https://github.com/mrdoob/three): MIT
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm): MIT
- [Vite](https://github.com/vitejs/vite): MIT

의존성의 실제 라이선스 전문은 설치된 패키지에 포함되어 있습니다. Google Fonts에서 제공하는 Jua, Gowun Dodum, Fredoka는 원격 CSS로 불러오며, 폰트가 로드되지 않으면 시스템 sans-serif를 사용합니다.
