/** Gentle pose targets. Mouth motion is illustrative, not phoneme-level lip sync. */
export function sampleMotion(state, seconds, reduced = false) {
  const time = reduced ? 0 : seconds;
  const pose = {
    headX: Math.sin(time * 0.8) * 0.018,
    headY: Math.sin(time * 0.45) * 0.035,
    headZ: Math.sin(time * 0.6) * 0.018,
    bodyX: Math.sin(time * 1.3) * 0.006,
    bodyY: Math.sin(time * 0.5) * 0.008,
    smile: 0.16,
    mouth: 0,
  };
  if (state === 'speaking') {
    pose.headX += Math.sin(time * 2.7) * 0.025;
    pose.smile = 0.2;
    pose.mouth = Math.max(0, Math.sin(seconds * 13) * 0.22 + Math.sin(seconds * 21) * 0.1 + 0.24);
  } else if (state === 'listening') {
    pose.headZ += 0.11;
    pose.headX += 0.025;
    pose.smile = 0.22;
  } else if (state === 'praise') {
    pose.headX += Math.sin(time * 4.2) * 0.065;
    pose.headZ += 0.035;
    pose.smile = 0.7;
  } else if (state === 'thinking') {
    pose.headY += 0.12;
    pose.headX -= 0.06;
    pose.headZ -= 0.07;
    pose.smile = 0.08;
  }
  return pose;
}
