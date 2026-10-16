// 가족 접근 쿠키 토큰 · IP 해시 · ACCESS_CODE_HASH 값 꼴(10절 접근 제어, plan-p03b 파일별 값 1, C55 (6)).
// 순수 함수다. Web Crypto 만 쓰고 현재 시각 · 난수는 인자로 받는다.
// proxy · 서버 · e2e 도우미(Playwright) · playwright.config 가 함께 가져오므로 server-only 를 두지 않는다.

export const ACCESS_COOKIE_NAME = "momo_access";
export const ACCESS_TOKEN_VERSION = "v1";
/** HKDF info. 쿠키 서명 열쇠와 IP 해시 열쇠가 서로 다르게 한다. */
export const COOKIE_KEY_INFO = "momo/access-cookie/v1";
export const IP_KEY_INFO = "momo/access-ip/v1";
/** 접근 코드 입력의 길이 상한(기술 값, 해시 계산을 지나치게 길게 하지 않게). */
export const ACCESS_CODE_MAX_LENGTH = 128;
/**
 * 10절 '영문 · 숫자 12자 이상'. 보안 고정 규칙이라 설정값이 아니라 이름 붙인 상수다(C57).
 * server-only 가 없는 이곳에 두어 해시 스크립트(tsx, Node)도 같은 규칙을 쓴다. src/server/access/code.ts 가 다시 내보낸다.
 */
export const ACCESS_CODE_MIN_LENGTH = 12;
/** 영문 · 숫자만(둘 다 섞여야 한다는 뜻으로 읽지 않는다). */
export const ACCESS_CODE_PATTERN = /^[A-Za-z0-9]+$/;

export function isValidAccessCode(code: string): boolean {
  return (
    code.length >= ACCESS_CODE_MIN_LENGTH &&
    code.length <= ACCESS_CODE_MAX_LENGTH &&
    ACCESS_CODE_PATTERN.test(code)
  );
}

const MS_PER_SECOND = 1000;
const TOKEN_PARTS = 4;
const PHC_ARGON2ID_PREFIX = "$argon2id$";
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const DIGITS = /^\d+$/;

const encoder = new TextEncoder();

function utf8(text: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(text);
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** base64url 을 바이트로. 꼴이 어긋나면 null. */
export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!BASE64URL.test(text)) return null;
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** env.ACCESS_CODE_HASH 를 다듬은 값. 없거나 비면 null. */
export function accessKeyMaterial(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const value = env.ACCESS_CODE_HASH?.trim();
  return value ? value : null;
}

/** argon2 PHC 문자열을 환경 변수에 둘 꼴로 감싼다(base64url, `$` 없음 — Next 는 .env* 의 `$` 를 펼친다). */
export function encodeAccessCodeHash(phc: string): string {
  return toBase64Url(utf8(phc));
}

/** 감싼 값을 풀어 argon2id PHC 면 돌려주고, 아니면 null. */
export function decodeAccessCodeHash(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const bytes = fromBase64Url(trimmed);
  if (!bytes) return null;
  let phc: string;
  try {
    phc = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  return phc.startsWith(PHC_ARGON2ID_PREFIX) ? phc : null;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

/** 키 재료에서 HKDF-SHA256 으로 HMAC-SHA256 열쇠를 만든다(salt 빈 값, info 로 쓰임을 가른다). */
function hmacKey(keyMaterial: string, info: string): Promise<CryptoKey> {
  const cacheKey = `${info}\u0000${keyMaterial}`;
  let key = keyCache.get(cacheKey);
  if (!key) {
    key = (async () => {
      const base = await crypto.subtle.importKey(
        "raw",
        utf8(keyMaterial),
        "HKDF",
        false,
        ["deriveKey"],
      );
      return crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new Uint8Array(0),
          info: utf8(info),
        },
        base,
        { name: "HMAC", hash: "SHA-256", length: 256 },
        false,
        ["sign", "verify"],
      );
    })();
    keyCache.set(cacheKey, key);
  }
  return key;
}

async function sign(key: CryptoKey, text: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", key, utf8(text));
  return toBase64Url(new Uint8Array(signature));
}

/** `v1.<만료 초>.<nonce base64url>.<서명 base64url>`. 서명은 앞 세 칸을 점으로 이은 글의 HMAC. */
export async function issueAccessToken({
  keyMaterial,
  now,
  ttlSeconds,
  nonce,
}: {
  keyMaterial: string;
  now: Date;
  ttlSeconds: number;
  nonce: Uint8Array;
}): Promise<string> {
  const expiresAt = Math.floor(now.getTime() / MS_PER_SECOND) + ttlSeconds;
  const body = [
    ACCESS_TOKEN_VERSION,
    String(expiresAt),
    toBase64Url(nonce),
  ].join(".");
  const key = await hmacKey(keyMaterial, COOKIE_KEY_INFO);
  return `${body}.${await sign(key, body)}`;
}

/** 토큰이 이 열쇠로 서명됐고 아직 만료되지 않았으면 true. 서명 비교는 crypto.subtle.verify(상수 시간). */
export async function verifyAccessToken(
  token: string | null | undefined,
  { keyMaterial, now }: { keyMaterial: string | null; now: Date },
): Promise<boolean> {
  if (!token || !keyMaterial) return false;
  const parts = token.split(".");
  if (parts.length !== TOKEN_PARTS) return false;
  const [version, expires, nonceText, signatureText] = parts;
  if (version !== ACCESS_TOKEN_VERSION) return false;
  if (!DIGITS.test(expires) || !BASE64URL.test(nonceText)) return false;
  if (Number(expires) <= Math.floor(now.getTime() / MS_PER_SECOND)) {
    return false;
  }
  const signature = fromBase64Url(signatureText);
  if (!signature) return false;
  const key = await hmacKey(keyMaterial, COOKIE_KEY_INFO);
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    utf8([version, expires, nonceText].join(".")),
  );
}

/** base64url(HMAC(IP 열쇠, ip)). 원래 IP 를 되돌릴 수 없다. */
export async function hashIp(ip: string, keyMaterial: string): Promise<string> {
  const key = await hmacKey(keyMaterial, IP_KEY_INFO);
  return sign(key, ip);
}
