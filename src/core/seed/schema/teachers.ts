// 회화 선생님 명단 seed/teachers.json 의 Zod 규격(5절 · 6.4 명단 자료 · C130 (1)).
// 칸 꼴(글자 종류 · 범위)은 여기서, 칸끼리 · 다른 규격 파일과 견주는 검사(겹침 · vocab · 문장 · 대비)는 check-teacher.ts 가 본다.
// 모델(model) · 초상(portrait) · 목소리(voice) · 줄인 방법(source.reduction)은 필수다(선생님 화면 plan 값 2, C141 — 파일 · 해시 · 메타는 자산 검사가 본다).
// 목소리 순서(voice.prefer)는 빈 목록을 받는다(값은 프리뷰 때 받은 기기 목소리 목록으로, plan 정할 것 9).
import { z } from "zod";
import { Text } from "@/core/seed/schema/reference";
import {
  TEACHER_KEY,
  TEACHER_KINDS,
  TEACHER_PITCH,
} from "@/core/seed/structure";

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
  /** 줄인 방법(pnpm teacher:reduce 가 쓰는 글 — 출처 문서에도 글자 그대로). */
  reduction: Text,
});

export const TeacherSchema = z.strictObject({
  /** 키(영어 소문자). profiles.teacher_key 값이다. */
  key: z.string().regex(TEACHER_KEY, { message: "키는 영어 소문자다" }),
  /** 꼴(1-가는 vrm 만). */
  kind: z.enum(TEACHER_KINDS),
  /** 한글 이름(화면 · 조사). */
  nameKo: z.string().regex(/^[가-힣]+$/, { message: "한글 이름은 한글만" }),
  /** 영어 이름(AI · 읽어 주기). */
  nameEn: z.string().regex(/^[A-Za-z]+$/, { message: "영어 이름은 영문자만" }),
  /**
   * 한글 이름으로 시작하는 보통 낱말('선생님 이름' 검사가 이 자리에서 시작하는 낱말은 이름으로 보지 않는다 — 미나리 · 리오넬 …, 장부 N-3 · C141).
   * 낱말마다 그 이름 자리에서 걸려야 한다(명단 검사).
   */
  nameKoWordExceptions: z.array(
    z.string().regex(/^[가-힣]+$/, { message: "빼는 낱말은 한글만" }),
  ),
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
  /** 줄인 VRM(public/ 기준 경로 · 바이트 · SHA-256). */
  model: z.strictObject({ path: AssetPath, bytes: Bytes, sha256: Sha256 }),
  /** 초상 그림(public/ 기준 경로 · 바이트). */
  portrait: z.strictObject({ path: AssetPath, bytes: Bytes }),
  /** 목소리(높이 0~2 · 목소리 이름 조각 순서). prefer 는 기기 실측 뒤(빈 목록 허용). */
  voice: z.strictObject({
    pitch: z.number().min(TEACHER_PITCH.min).max(TEACHER_PITCH.max),
    prefer: z.array(Text),
  }),
  /** 출처(빈칸 없음). 화면에 보내지 않는다. */
  source: TeacherSourceSchema,
});
export type Teacher = z.infer<typeof TeacherSchema>;

export const TeachersFileSchema = z.strictObject({
  teachers: z.array(TeacherSchema).min(1),
});
export type TeachersFile = z.infer<typeof TeachersFileSchema>;
