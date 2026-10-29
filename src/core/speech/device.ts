// 기기 판정(7절 브라우저 표 · C53, plan-p02 '파일별 값' 3). 브라우저에서 모은 사실을 받아 판정한다.
// navigator · window 를 직접 읽지 않는다(사실을 모으는 일은 P2b browser.ts 몫).
// UA 토큰 가운데 인앱 브라우저 · Opera · Whale · Google 앱 토큰은 공식 문서가 없어 추측이다.

export type DeviceFacts = {
  userAgent: string;
  maxTouchPoints: number;
  hasStandardRecognition: boolean;
  hasWebkitRecognition: boolean;
  hasSynthesis: boolean;
  isSecureContext: boolean;
};

export type DeviceVerdict = {
  /** ok: 인식을 쓴다. no-api · not-listed · insecure: '마이크를 쓸 수 없음'(7절). */
  verdict: "ok" | "no-api" | "not-listed" | "insecure";
  /** 7절 표의 지원 줄(Windows · macOS 의 Chrome · Edge, Android Chrome, iPad Safari)인가. */
  listed: boolean;
  synthesis: boolean;
  /** 알림에 적을 '<기기> <브라우저> <판>'. 예 'iPad Safari 26.1'. */
  name: string;
};

type BrowserKind =
  | "safari"
  | "chrome"
  | "edge"
  | "firefox"
  | "in-app"
  | "other";
type Browser = { name: string; kind: BrowserKind; version: string | undefined };

// iPadOS 13 부터 iPad Safari 는 데스크톱(Macintosh) UA 를 보낸다. 터치 점이 이만큼 이상이면 iPad 로 본다.
const IPAD_MIN_TOUCH_POINTS = 2;

function platformOf(ua: string, maxTouchPoints: number): string {
  if (/\biPad\b/.test(ua)) return "iPad";
  if (/\b(iPhone|iPod)\b/.test(ua)) return "iPhone";
  if (/\bAndroid\b/.test(ua)) return "Android";
  if (/\bWindows\b/.test(ua)) return "Windows";
  if (/\bMacintosh\b/.test(ua)) {
    return maxTouchPoints >= IPAD_MIN_TOUCH_POINTS ? "iPad" : "macOS";
  }
  if (/\bCrOS\b/.test(ua)) return "ChromeOS";
  if (/\b(Linux|X11)\b/.test(ua)) return "Linux";
  return "기타 기기";
}

// 차례가 뜻을 가진다. 인앱 → Chromium 갈래 브라우저 → Firefox → Chrome → Safari.
const BROWSERS: readonly {
  pattern: RegExp;
  name: string;
  kind: BrowserKind;
}[] = [
  {
    pattern: /\bKAKAOTALK(?:[ /]([\d.]+))?/i,
    name: "KakaoTalk",
    kind: "in-app",
  },
  { pattern: /\bNAVER\(inapp;/, name: "Naver", kind: "in-app" },
  { pattern: /\bDaumApps(?:\/([\d.]+))?/, name: "Daum", kind: "in-app" },
  { pattern: /\bLine\/([\d.]+)/, name: "LINE", kind: "in-app" },
  { pattern: /\bInstagram(?: ([\d.]+))?/, name: "Instagram", kind: "in-app" },
  { pattern: /\bFB(?:AN|AV)(?:\/([\d.]+))?/, name: "Facebook", kind: "in-app" },
  { pattern: /\bGSA\/([\d.]+)/, name: "Google", kind: "in-app" },
  // Android WebView(앱 안 화면)는 UA 에 '; wv)' 가 있다.
  { pattern: /; wv\)/, name: "WebView", kind: "in-app" },
  { pattern: /\bEdg(?:e|A|iOS)?\/([\d.]+)/, name: "Edge", kind: "edge" },
  {
    pattern: /\bSamsungBrowser\/([\d.]+)/,
    name: "Samsung Internet",
    kind: "other",
  },
  { pattern: /\b(?:OPR|OPiOS)\/([\d.]+)/, name: "Opera", kind: "other" },
  { pattern: /\bWhale\/([\d.]+)/, name: "Whale", kind: "other" },
  {
    pattern: /\b(?:Firefox|FxiOS)\/([\d.]+)/,
    name: "Firefox",
    kind: "firefox",
  },
  { pattern: /\b(?:CriOS|Chrome)\/([\d.]+)/, name: "Chrome", kind: "chrome" },
  {
    pattern: /\bVersion\/([\d.]+).*\bSafari\//,
    name: "Safari",
    kind: "safari",
  },
];

function browserOf(ua: string): Browser {
  for (const { pattern, name, kind } of BROWSERS) {
    const match = pattern.exec(ua);
    if (match === null) continue;
    const raw = match[1];
    // Safari 는 Version 판을 그대로(26.1), 나머지는 큰 판만(143).
    const version = kind === "safari" ? raw : raw?.split(".")[0];
    return { name, kind, version };
  }
  return { name: "기타 브라우저", kind: "other", version: undefined };
}

function isListed(platform: string, browser: Browser): boolean {
  if (platform === "Windows" || platform === "macOS") {
    return browser.kind === "chrome" || browser.kind === "edge";
  }
  if (platform === "Android") return browser.kind === "chrome";
  if (platform === "iPad") return browser.kind === "safari";
  return false;
}

function verdictOf(
  facts: DeviceFacts,
  platform: string,
  browser: Browser,
): DeviceVerdict["verdict"] {
  if (!facts.isSecureContext) return "insecure";
  if (!facts.hasStandardRecognition && !facts.hasWebkitRecognition) {
    return "no-api";
  }
  if (browser.kind === "firefox" || browser.kind === "in-app") {
    return "not-listed";
  }
  if (platform === "iPad" && browser.kind !== "safari") return "not-listed";
  // 7절 표 밖의 다른 브라우저는 인식 API 가 있으면 쓴다(listed 거짓으로 남김, C53).
  // iPadOS 최소 판은 막지 않고 이름의 판으로만 남긴다.
  return "ok";
}

export function describeDevice(facts: DeviceFacts): DeviceVerdict {
  const platform = platformOf(facts.userAgent, facts.maxTouchPoints);
  const browser = browserOf(facts.userAgent);
  const name = [platform, browser.name, browser.version]
    .filter((part) => part !== undefined && part !== "")
    .join(" ");
  return {
    verdict: verdictOf(facts, platform, browser),
    listed: isListed(platform, browser),
    synthesis: facts.hasSynthesis,
    name,
  };
}

/** iPad 의 Safari 인가(판정 이름 — 무음 모드 안내는 이 기기에서만, 13절 C111 · 7절). */
export function isIpadSafari(verdict: Pick<DeviceVerdict, "name">): boolean {
  return verdict.name.startsWith("iPad Safari");
}
