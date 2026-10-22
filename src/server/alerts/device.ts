import "server-only";
// 기기 알림(7절 '마이크를 쓸 수 없음' · '마이크가 멈춤' · '말소리가 들어오지 않음' · 4절 부모 화면 '브라우저 이름과 시각',
// plan-p11a 값 12 · 정할 것 자 · C22 · C56 (4)). 배치 평가(P10 recordPlacementMicAlert 몸통을 옮김)와 말하기 세션이 같이 부른다.
// 그 학습일에 종류마다 한 번(createAlertOnce once day). 값은 오류 코드 · 브라우저 이름만 — 인식 글 · 시도 입력을 넣지 않는다.
import { z } from "zod";
import { learningDayOf } from "@/core/learning-day";
import { MIC_BROWSER_MAX, MIC_CODE_MAX } from "@/core/profile/start";
import { createAlertOnce } from "@/server/ai/store";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
  SettingMissingError,
} from "@/server/settings";

/** 기기 알림 종류(snake_case — P9 AI_ALERT_KINDS · P10 mic_* 와 같은 꼴, 정할 것 자). */
export const DEVICE_ALERT_KINDS = [
  "mic_unavailable",
  "mic_stalled",
  "speech_silent",
] as const;
export type DeviceAlertKind = (typeof DEVICE_ALERT_KINDS)[number];

export const DeviceAlertSchema = z.strictObject({
  kind: z.enum(DEVICE_ALERT_KINDS),
  code: z.string().min(1).max(MIC_CODE_MAX),
  browser: z.string().max(MIC_BROWSER_MAX),
});

export type DeviceAlertOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "no_profile" | "unavailable" };

export type DeviceAlertDeps = { db?: Db; now: () => Date };

/** 그 프로필의 기기 알림 하나(그 학습일에 종류마다 한 번). */
export async function recordDeviceAlert(
  raw: unknown,
  { db = getDb(), now }: DeviceAlertDeps,
): Promise<DeviceAlertOutcome> {
  const parsed = DeviceAlertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    const profile = await readHouseholdProfile({ db });
    if (!profile) return { ok: false, reason: "no_profile" };
    const s = await getSettings(
      {
        "app.timezone": appTimezoneSchema,
        "app.day_start_hour": appDayStartHourSchema,
      },
      { db, profileId: profile.id },
    );
    const at = now();
    await createAlertOnce(db, {
      kind: parsed.data.kind,
      profileId: profile.id,
      thresholdKey: null,
      learningDay: learningDayOf(
        at,
        s["app.timezone"],
        s["app.day_start_hour"],
      ),
      value: { code: parsed.data.code, browser: parsed.data.browser },
      createdAt: at,
      once: "day",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof SettingMissingError)
      console.error(`기기 알림 실패(설정 ${error.key} 가 없습니다)`);
    else console.error(`기기 알림 실패(${dbErrorTag(error)})`);
    return { ok: false, reason: "unavailable" };
  }
}
