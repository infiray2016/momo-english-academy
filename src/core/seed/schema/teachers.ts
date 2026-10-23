// 회화 선생님 명단 seed/teachers.json 의 Zod 규격(5절 · 6.4 명단 자료 · C130 (1)).
// 칸 꼴(글자 종류 · 범위)은 여기서, 칸끼리 · 다른 규격 파일과 견주는 검사(겹침 · vocab · 문장 · 대비)는 check-teacher.ts 가 본다.
// 지금(1-가 P8 앞, C128)은 이름 칸이 쓰이는 몫만 필수다. 모델(model) · 초상(portrait) · 목소리(voice) · 줄인 방법(source.reduction)은
// 선생님 화면 plan(C118 차례) 때 필수로 바꾼다 — 그때 이 파일의 `.optional()` 넷을 뗀다.
import { z } from "zod";
import { Text } from "@/core/seed/schema/reference";
import { TEACHER_KINDS, TEACHER_PITCH } from "@/core/seed/structure";

/** 창 바탕 · 이름표 색(`#rrggbb`). */
const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: "색은 #rrggbb 꼴이다" });
const Sha256 = z
  .string()
  .regex(/^[0-9a-f]{64}$/, { message: "SHA-256 은 소문자 16진 64자다" });
/** public/ 기준 정적 자산 경로(같은 출처, 앞 `/` 없음). */
const AssetPath = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._/-]*$/, {
    message: "자산 경로는 public/ 기준 소문자 경로다(앞 / 없음)",
  })
  .refine(
    (p) =>
      p
        .split("/")
        .every((part) => part !== "" && part !== "." && part !== ".."),
    { message: "자산 경로 조각이 비거나 . · .. 이다('//' · 끝 '/' 포함)" },
  );
const Bytes = z.int().positive();

export const TeacherSourceSchema = z.strictObject({
  /** 원 제작자. */
  creator: Text,
  /** 배포처 주소. */
  distributionUrl: z.url(),
  /** 원본 제목. */
  originalTitle: Text,
  /** 원본 파일(배포 묶음 안 파일 이름). */
  originalFile: Text,
  /** 원본 SHA-256. */
  originalSha256: Sha256,
  /** 파일 안 licenseName. */
  licenseName: Text,
  /** 파일 안 허용 설정(allowedUserName · commercialUssageName …). */
  permissions: Text,
  /** 파일 안 조건 주소(otherPermissionUrl · otherLicenseUrl). */
  conditionsUrl: z.url(),
  /** 줄인 방법. 모델(줄인 VRM)이 들어올 때 함께 채운다(검사는 check-teacher). */
  reduction: Text.optional(),
});

export const TeacherSchema = z.strictObject({
  /** 키(영어 소문자). profiles.teacher_key 값이다. */
  key: z.string().regex(/^[a-z]+$/, { message: "키는 영어 소문자다" }),
  /** 꼴(1-가는 vrm 만). */
  kind: z.enum(TEACHER_KINDS),
  /** 한글 이름(화면 · 조사). */
  nameKo: z.string().regex(/^[가-힣]+$/, { message: "한글 이름은 한글만" }),
  /** 영어 이름(AI · 읽어 주기). */
  nameEn: z.string().regex(/^[A-Za-z]+$/, { message: "영어 이름은 영문자만" }),
  /** 소개 한두 줄(해요체). 줄은 `\n` 으로 나눈다. */
  introKo: Text,
  /** 성격 세 낱말(수는 check-teacher). */
  traitsKo: z.array(Text),
  /** AI 성격 글(영어, 두 문장 이하는 check-teacher). 화면에 보내지 않는다. */
  personaEn: Text,
  /** 고르는 화면 인사(영어). */
  greetingEn: Text,
  /** 창 바탕(room) · 이름표 색(accent). */
  color: z.strictObject({ room: HexColor, accent: HexColor }),
  /** 줄인 VRM(public/ 기준 경로 · 바이트 · SHA-256). 선생님 화면 plan 때 필수. */
  model: z
    .strictObject({ path: AssetPath, bytes: Bytes, sha256: Sha256 })
    .optional(),
  /** 초상 그림(public/ 기준 경로 · 바이트). 선생님 화면 plan 때 필수. */
  portrait: z.strictObject({ path: AssetPath, bytes: Bytes }).optional(),
  /** 목소리(높이 0~2 · 목소리 이름 조각 순서). prefer 는 기기 실측 뒤. 선생님 화면 plan 때 필수. */
  voice: z
    .strictObject({
      pitch: z.number().min(TEACHER_PITCH.min).max(TEACHER_PITCH.max),
      prefer: z.array(Text).optional(),
    })
    .optional(),
  /** 출처(빈칸 없음). 화면에 보내지 않는다. */
  source: TeacherSourceSchema,
});
export type Teacher = z.infer<typeof TeacherSchema>;

export const TeachersFileSchema = z.strictObject({
  teachers: z.array(TeacherSchema).min(1),
});
export type TeachersFile = z.infer<typeof TeachersFileSchema>;
