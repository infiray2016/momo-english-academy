"use server";
// 세션 틀 서버 액션(5절 · 8절, plan-p10b 파일별 값 6 · plan-p11a 값 5). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// 입력은 화면에서 온 그대로 받아 서버에서 다시 본다(src/server/session 의 Zod). 시도 입력을 로그에 내지 않는다.
// 수업 시작만, 쓰기 6~12 첫 세션의 첨삭을 기다리는 중이면 그 첨삭을 한 번 부른 뒤 다시 판정한다(plan-p11b 값 9 — 쓰기 서버).
// UI · UX 묶음 0-가: 쉬는 화면 '다시 해 볼래요'의 다시 확인(recheckAiRest — [승인 UX4] · 8절 R-50)과 홈 닫힌 카드 다시 확인이 쓰는 음성
// 설정(micCheckSpeech — 3절 R-10, 막힘 판과 같은 확인).
import { z } from "zod";
import {
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { requireAccess } from "@/server/access/guard";
import {
  type DeviceAlertOutcome,
  recordDeviceAlert,
} from "@/server/alerts/device";
import { now } from "@/server/clock";
import { getDb } from "@/server/db";
import { readHouseholdProfile } from "@/server/profile";
import {
  type FinishOutcome,
  finishLessonSession,
  type LeaveOutcome,
  leaveLessonSession,
  type SaveOutcome,
  type StartOutcome,
  saveSessionAttempts,
} from "@/server/session";
import { aiRestingToday } from "@/server/session/ai-gate";
import { getSettings } from "@/server/settings";
import { startLessonAfterFeedback } from "@/server/writing";

/** 수업 시작(재판정 · 하던 수업이 있으면 확인 · 이어 하기 · 첨삭이 오면 둘째 세션 · 대기면 한 번 더 부름). */
export async function startLesson(input: unknown): Promise<StartOutcome> {
  await requireAccess();
  return startLessonAfterFeedback(input, { now });
}

/** 시도 묶음 저장(기기 대기열이 부른다). */
export async function saveAttempts(batch: unknown): Promise<SaveOutcome> {
  await requireAccess();
  return saveSessionAttempts(batch, { now });
}

/** '홈': 첫 활동이고 시도가 없으면 세션 행을 지운다. */
export async function leaveSession(input: unknown): Promise<LeaveOutcome> {
  await requireAccess();
  return leaveLessonSession(input, { now });
}

/** 마지막 활동 뒤 세션 끝내기(모든 활동의 끝 시도가 있어야 — 없으면 incomplete, 화면이 대기열을 비우고 다시 부른다). */
export async function finishSession(input: unknown): Promise<FinishOutcome> {
  await requireAccess();
  return finishLessonSession(input, { now });
}

/** 말하기 세션 도중 기기 알림(마이크를 쓸 수 없음 · 마이크가 멈춤 · 말소리가 들어오지 않음 — 코드 · 브라우저 이름만). */
export async function reportSessionMic(
  input: unknown,
): Promise<DeviceAlertOutcome> {
  await requireAccess();
  return recordDeviceAlert(input, { now });
}

/**
 * 쉬는 화면 '다시 해 볼래요'([승인 UX4] · 8절 R-50): 접근 확인 뒤 그 프로필 · 지금 시각으로 수업 시작과 같은 판정 함수(aiRestingToday)를
 * 다시 읽는다. 1-나는 같은 판정 함수에 ai_status 읽기와 응답 뒤 확인 호출(다음 확인 시각이 지났을 때만 — 간격 그대로, T1)을 더한다(plan 위험 10).
 * 프로필이 없으면 쉬지 않음(화면이 다시 읽어 첫 실행으로 간다).
 */
export async function recheckAiRest(): Promise<{ resting: boolean }> {
  await requireAccess();
  const db = getDb();
  const profile = await readHouseholdProfile({ db });
  if (!profile) return { resting: false };
  return {
    resting: await aiRestingToday({ profileId: profile.id, at: now() }, { db }),
  };
}

/** 홈 닫힌 말하기 카드의 다시 확인이 쓰는 음성 설정(3절 R-10 — 막힘 판과 같은 마이크 확인, 키가 없으면 던짐). */
export async function micCheckSpeech(): Promise<SpeechSettings> {
  await requireAccess();
  const values = await getSettings(
    Object.fromEntries(SPEECH_SETTING_KEYS.map((k) => [k, z.unknown()])),
    { db: getDb() },
  );
  return speechSettingsFrom((key) => values[key]);
}
