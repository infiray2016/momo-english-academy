// 음성 관찰 페이지(plan-p02 '파일별 값' 9). 운영 배포 빌드에서는 빠지는 이름이다(next.config.ts 의
// pageExtensions, 다-1). 관찰 도구라 시험용 설정 · 시험 글 · 시험용 동음이의어를 쓴다(다-5).
import type { Metadata } from "next";
import homophones from "../../../../tests/fixtures/speech/homophones.json";
import probeText from "../../../../tests/fixtures/speech/probe-text.json";
import settingsFixture from "../../../../tests/fixtures/speech/settings.json";
import { SpeechProbe } from "./speech-probe";

export const metadata: Metadata = {
  title: "음성 관찰",
  robots: { index: false, follow: false },
};

export default function SpeechProbePage() {
  return (
    <SpeechProbe
      settingsFixture={settingsFixture}
      homophones={homophones}
      sentences={probeText.sentences}
      speechText={probeText.speech}
    />
  );
}
