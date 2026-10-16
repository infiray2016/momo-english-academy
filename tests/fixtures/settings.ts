/** 시험용 설정값(12절 기본값). 숫자를 시험 안에 다시 적지 않고 여기서 읽는다(묶음 위험 4) */
export const TEST_SETTINGS = {
  "app.timezone": { scope: "household", value: "Asia/Seoul" },
  "app.day_start_hour": { scope: "household", value: 4 },
  "access.cookie_days": { scope: "household", value: 365 },
  "parent.pin_max_attempts": { scope: "household", value: 5 },
  "parent.lock_minutes": { scope: "household", value: 15 },
  "session.length_factor": { scope: "profile", value: 1.0 },
} as const;
