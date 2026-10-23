// 회화 선생님 상태 · 칭찬 · 움직임 · 깜빡임 · 불러오기 차례 번호(plan 회화-선생님-캐릭터 값 11). DB · 화면 없는 순수 함수.
// 움직임 셈은 시제품 prototypes/teacher-avatar/src/motion.js 그대로이고, 진폭 · 주기는 아래 MOTION 묶음에 이름을 붙였다
// (화면 꼴 상수 — C72, 설정값이 아니다). 입 움직임은 그림 설명용이고 소리 단위 입모양 맞추기가 아니다.

/** 선생님 창의 다섯 상태(4절 '선생님 창'). 화면 속성 data-teacher-state 값과 같다. */
export const TEACHER_STATES = [
  "idle",
  "speaking",
  "listening",
  "praise",
  "thinking",
] as const;
export type TeacherState = (typeof TEACHER_STATES)[number];

/**
 * 하나만 낸다. 듣기 → 생각 → 말하기 → 칭찬 → 쉬기 차례로 앞이 이긴다.
 * speaking 은 읽어 주기가 실제로 시작한 알림부터 그 문장의 결과까지(선생님 음성 감싸기가 알린다),
 * 칭찬은 now 가 praiseUntil 앞일 때만이다.
 */
export function teacherStateOf(input: {
  listening: boolean;
  thinking: boolean;
  speaking: boolean;
  praiseUntil: number | null;
  now: number;
}): TeacherState {
  if (input.listening) return "listening";
  if (input.thinking) return "thinking";
  if (input.speaking) return "speaking";
  if (input.praiseUntil !== null && input.now < input.praiseUntil)
    return "praise";
  return "idle";
}

/** 칭찬이 끝나는 시각(ms). praiseSeconds 는 설정 talk.teacher_praise_seconds. */
export function praiseUntilOf(now: number, praiseSeconds: number): number {
  return now + praiseSeconds * 1000;
}

/** 시제품 motion.js 의 진폭(라디안 · 표정 무게) · 주기(초당 라디안). */
export const MOTION = {
  /** 모든 상태에 깔리는 숨쉬기 흔들림. */
  base: {
    headX: { rate: 0.8, amp: 0.018 },
    headY: { rate: 0.45, amp: 0.035 },
    headZ: { rate: 0.6, amp: 0.018 },
    bodyX: { rate: 1.3, amp: 0.006 },
    bodyY: { rate: 0.5, amp: 0.008 },
    smile: 0.16,
  },
  speaking: {
    nod: { rate: 2.7, amp: 0.025 },
    smile: 0.2,
    /** 입 = max(0, sin(t·13)·0.22 + sin(t·21)·0.1 + 0.24). 움직임 줄이기에도 시간대로 움직인다. */
    mouth: {
      first: { rate: 13, amp: 0.22 },
      second: { rate: 21, amp: 0.1 },
      offset: 0.24,
    },
  },
  listening: { tiltZ: 0.11, nodX: 0.025, smile: 0.22 },
  praise: { nod: { rate: 4.2, amp: 0.065 }, tiltZ: 0.035, smile: 0.7 },
  thinking: { turnY: 0.12, nodX: -0.06, tiltZ: -0.07, smile: 0.08 },
  /** 깜빡임 한 번의 길이(초, 사인 반 주기). 다음 깜빡임 간격(3~6초)은 그림 층이 정한다. */
  blinkSeconds: 0.18,
} as const;

export type TeacherPose = {
  headX: number;
  headY: number;
  headZ: number;
  bodyX: number;
  bodyY: number;
  smile: number;
  mouth: number;
};

/**
 * 상태와 흐른 시간(초)의 자세 목표. 모르는 상태는 쉬기다. 움직임 줄이기(reduced)면 몸 · 고개는 시간 0 으로 멈추고
 * 말하기 입만 시간대로 움직인다(AC-19h).
 */
export function sampleMotion(
  state: TeacherState,
  seconds: number,
  reduced: boolean,
): TeacherPose {
  const time = reduced ? 0 : seconds;
  const { base } = MOTION;
  const pose: TeacherPose = {
    headX: Math.sin(time * base.headX.rate) * base.headX.amp,
    headY: Math.sin(time * base.headY.rate) * base.headY.amp,
    headZ: Math.sin(time * base.headZ.rate) * base.headZ.amp,
    bodyX: Math.sin(time * base.bodyX.rate) * base.bodyX.amp,
    bodyY: Math.sin(time * base.bodyY.rate) * base.bodyY.amp,
    smile: base.smile,
    mouth: 0,
  };
  switch (state) {
    case "speaking": {
      const { nod, smile, mouth } = MOTION.speaking;
      pose.headX += Math.sin(time * nod.rate) * nod.amp;
      pose.smile = smile;
      pose.mouth = Math.max(
        0,
        Math.sin(seconds * mouth.first.rate) * mouth.first.amp +
          Math.sin(seconds * mouth.second.rate) * mouth.second.amp +
          mouth.offset,
      );
      break;
    }
    case "listening": {
      const { tiltZ, nodX, smile } = MOTION.listening;
      pose.headZ += tiltZ;
      pose.headX += nodX;
      pose.smile = smile;
      break;
    }
    case "praise": {
      const { nod, tiltZ, smile } = MOTION.praise;
      pose.headX += Math.sin(time * nod.rate) * nod.amp;
      pose.headZ += tiltZ;
      pose.smile = smile;
      break;
    }
    case "thinking": {
      const { turnY, nodX, tiltZ, smile } = MOTION.thinking;
      pose.headY += turnY;
      pose.headX += nodX;
      pose.headZ += tiltZ;
      pose.smile = smile;
      break;
    }
    default:
      break;
  }
  return pose;
}

/**
 * 깜빡임 무게 0~1. 시작(blinkStart, 초) 뒤 blinkSeconds 동안 사인 곡선, 그 밖은 0. 움직임 줄이기면 늘 0(AC-19h).
 * 시제품 tick 의 깜빡임 셈을 옮겼다.
 */
export function blinkAt(input: {
  elapsed: number;
  blinkStart: number;
  reduced: boolean;
}): number {
  if (input.reduced) return 0;
  const age = input.elapsed - input.blinkStart;
  if (age <= 0 || age >= MOTION.blinkSeconds) return 0;
  return Math.sin((age / MOTION.blinkSeconds) * Math.PI);
}

/** 불러오기 차례 번호. 새로 불러올 때 next(), 늦게 온 결과는 isCurrent 가 거짓이면 버린다(시제품 generation). */
export function createLoadTurn(): {
  next(): number;
  isCurrent(turn: number): boolean;
} {
  let current = 0;
  return {
    next() {
      current += 1;
      return current;
    },
    isCurrent(turn) {
      return turn === current;
    },
  };
}
