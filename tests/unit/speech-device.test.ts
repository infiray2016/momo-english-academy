import { describe, expect, it } from "vitest";
import { type DeviceFacts, describeDevice } from "@/core/speech/device";

// UA 표본. 출처는 줄마다 적는다(2026-10-16 받음).
// MDN = https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/User-Agent (mdn/content main)
// Chromium = https://chromium.googlesource.com/chromium/src/+/HEAD/docs/ios/user_agent.md
// Samsung = https://developer.samsung.com/internet/user-agent-string-format.html
const UA = {
  // MDN 'Safari' 데스크톱 예. iPadOS 13 부터 iPad Safari 는 데스크톱 UA 를 보낸다(터치 점으로 가름).
  desktopSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  // MDN 'Safari' iPhone 예.
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  // Chromium 문서의 '데스크톱 사이트 요청' Chrome iOS 예(CriOS 가 남는다).
  chromeIosDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/85 Version/11.1.1 Safari/605.1.15",
  // Chromium 문서의 Chrome iOS 예에서 기기 토큰을 iPad 로 바꾼 것(추측: iPad 모바일 UA 꼴).
  chromeIpad:
    "Mozilla/5.0 (iPad; CPU OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1",
  // 인앱 브라우저. 공식 문서가 없다(추측: 앱 토큰을 끝에 붙이는 꼴).
  kakaoIpad:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5",
  kakaoAndroid:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.4.5",
  naverIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.0.0)",
  // MDN 'Firefox' 예.
  firefoxWindows:
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0",
  // MDN 'Chrome' Android 예(UA 축소 꼴).
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
  // MDN 'Chrome' Windows 예.
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  // MDN 'Chrome' macOS 예.
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  // MDN 'Edge' Windows 예.
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
  // Samsung 문서의 Android 예.
  samsungInternet:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
} as const;

function facts(
  userAgent: string,
  overrides: Partial<Omit<DeviceFacts, "userAgent">> = {},
): DeviceFacts {
  return {
    userAgent,
    maxTouchPoints: 0,
    hasStandardRecognition: true,
    hasWebkitRecognition: true,
    hasSynthesis: true,
    isSecureContext: true,
    ...overrides,
  };
}

describe("기기 판정(7절 브라우저 표 · C53)", () => {
  it("기기 판정: iPad Safari(데스크톱 UA · 터치)는 ok 이고 이름이 'iPad Safari <판>' 이다", () => {
    const ipad = describeDevice(
      facts(UA.desktopSafari, {
        maxTouchPoints: 5,
        hasStandardRecognition: false,
      }),
    );
    expect(ipad).toEqual({
      verdict: "ok",
      listed: true,
      synthesis: true,
      name: "iPad Safari 26.0",
    });
    // iPadOS 최소 판은 막지 않고 이름의 판으로만 남긴다.
    const old = describeDevice(
      facts(UA.desktopSafari.replace("Version/26.0", "Version/16.6"), {
        maxTouchPoints: 5,
      }),
    );
    expect(old).toMatchObject({ verdict: "ok", name: "iPad Safari 16.6" });
  });

  it("기기 판정: iPad 의 Chrome(CriOS) · 인앱 브라우저는 not-listed", () => {
    expect(
      describeDevice(facts(UA.chromeIosDesktop, { maxTouchPoints: 5 })),
    ).toMatchObject({ verdict: "not-listed", listed: false });
    expect(describeDevice(facts(UA.chromeIpad, { maxTouchPoints: 5 }))).toEqual(
      {
        verdict: "not-listed",
        listed: false,
        synthesis: true,
        name: "iPad Chrome 56",
      },
    );
    expect(
      describeDevice(facts(UA.kakaoIpad, { maxTouchPoints: 5 })),
    ).toMatchObject({ verdict: "not-listed", name: "iPad KakaoTalk 10" });
    // 인앱 브라우저는 기기와 관계없이 not-listed.
    expect(describeDevice(facts(UA.kakaoAndroid))).toMatchObject({
      verdict: "not-listed",
      listed: false,
    });
    expect(describeDevice(facts(UA.naverIphone))).toMatchObject({
      verdict: "not-listed",
      listed: false,
    });
  });

  it("기기 판정: Firefox 는 not-listed, 인식 API 가 없으면 no-api", () => {
    expect(describeDevice(facts(UA.firefoxWindows))).toEqual({
      verdict: "not-listed",
      listed: false,
      synthesis: true,
      name: "Windows Firefox 47",
    });
    const noApi = {
      hasStandardRecognition: false,
      hasWebkitRecognition: false,
    };
    expect(describeDevice(facts(UA.firefoxWindows, noApi)).verdict).toBe(
      "no-api",
    );
    expect(describeDevice(facts(UA.windowsChrome, noApi))).toMatchObject({
      verdict: "no-api",
      listed: true,
    });
  });

  it("기기 판정: Android Chrome · Windows Edge · Windows Chrome 은 ok", () => {
    expect(
      describeDevice(facts(UA.androidChrome, { maxTouchPoints: 5 })),
    ).toEqual({
      verdict: "ok",
      listed: true,
      synthesis: true,
      name: "Android Chrome 143",
    });
    expect(describeDevice(facts(UA.windowsEdge))).toEqual({
      verdict: "ok",
      listed: true,
      synthesis: true,
      name: "Windows Edge 143",
    });
    expect(describeDevice(facts(UA.windowsChrome))).toEqual({
      verdict: "ok",
      listed: true,
      synthesis: true,
      name: "Windows Chrome 143",
    });
    expect(describeDevice(facts(UA.macChrome))).toMatchObject({
      verdict: "ok",
      listed: true,
      name: "macOS Chrome 143",
    });
    // 읽어 주기가 없으면 그대로 적는다(판정은 인식으로 한다).
    expect(
      describeDevice(facts(UA.windowsChrome, { hasSynthesis: false })),
    ).toMatchObject({ verdict: "ok", synthesis: false });
  });

  it("기기 판정: 7절 표 밖(macOS Safari · 삼성 인터넷)은 API 가 있으면 ok 이고 listed 는 거짓", () => {
    expect(describeDevice(facts(UA.desktopSafari))).toEqual({
      verdict: "ok",
      listed: false,
      synthesis: true,
      name: "macOS Safari 26.0",
    });
    expect(describeDevice(facts(UA.samsungInternet))).toEqual({
      verdict: "ok",
      listed: false,
      synthesis: true,
      name: "Android Samsung Internet 24",
    });
    expect(describeDevice(facts(UA.iphoneSafari))).toMatchObject({
      verdict: "ok",
      listed: false,
      name: "iPhone Safari 26.0",
    });
  });

  it("기기 판정: 안전한 출처가 아니면 insecure", () => {
    for (const ua of [UA.desktopSafari, UA.androidChrome, UA.windowsEdge]) {
      expect(
        describeDevice(facts(ua, { isSecureContext: false, maxTouchPoints: 5 }))
          .verdict,
      ).toBe("insecure");
    }
  });
});
