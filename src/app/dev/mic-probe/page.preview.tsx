// 마이크 점검 쪽(/dev/mic-probe, 브리프 task-mic-probe 2026-11-06). 운영 배포 빌드에서는 빠지는 이름이다(next.config.ts 의
// pageExtensions — 단위 tests/unit/next-config.test.ts). 가족 접근 쿠키 뒤에 있다(proxy). DB 를 읽거나 쓰지 않는다.
import type { Metadata } from "next";
import { MicProbe } from "./mic-probe";

export const metadata: Metadata = {
  title: "마이크 점검",
  robots: { index: false, follow: false },
};

export default function MicProbePage() {
  return <MicProbe />;
}
