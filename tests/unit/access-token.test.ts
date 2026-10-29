// AC-1a 의 P3b 몫(길이 규칙 — C147 로 10자 · argon2id · 코드 바꾸면 쿠키 무효)과 토큰 · IP 해시(plan-p03b 증명 표).
// 견본 코드 · 해시 · 난수는 실행 때 만든다. 시각은 인자로 넘긴다.
import { randomBytes, randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_VERSION,
  accessKeyMaterial,
  decodeAccessCodeHash,
  encodeAccessCodeHash,
  hashIp,
  issueAccessToken,
  verifyAccessToken,
} from "@/core/access-token";
import {
  ACCESS_CODE_MIN_LENGTH,
  AccessCodeRuleError,
  AccessNotConfiguredError,
  hashAccessCode,
  verifyAccessCode,
} from "@/server/access/code";
import { TEST_SETTINGS } from "../fixtures/settings";

const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SECONDS_PER_DAY = 86_400;
const MS_PER_SECOND = 1000;
const NONCE_BYTES = 16;
/** 시험의 기준 시각(시계를 읽지 않는다). */
const NOW = new Date("2026-10-16T03:00:00Z");
const TTL_SECONDS = TEST_SETTINGS["access.cookie_days"].value * SECONDS_PER_DAY;

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHANUMERIC[randomInt(ALPHANUMERIC.length)];
  }
  return out;
}

const nonce = () => new Uint8Array(randomBytes(NONCE_BYTES));

/** 실행 때 만든 열쇠 재료(진짜 해시 꼴일 필요는 없다). */
const randomKeyMaterial = () => randomBytes(32).toString("base64url");

describe("접근 코드 해시", () => {
  it("AC-1a 10자보다 짧거나 영문 · 숫자 밖 글자가 든 접근 코드는 해시를 만들지 않는다", async () => {
    const valid = randomCode(ACCESS_CODE_MIN_LENGTH);
    const bad = [
      randomCode(ACCESS_CODE_MIN_LENGTH - 1),
      "",
      `${valid.slice(1)}-`,
      `${valid.slice(1)} `,
      `${valid.slice(1)}가`,
    ];
    for (const code of bad) {
      await expect(
        hashAccessCode(code),
        JSON.stringify(code),
      ).rejects.toBeInstanceOf(AccessCodeRuleError);
    }
    await expect(hashAccessCode(valid)).resolves.toEqual(expect.any(String));
  });

  it("AC-1a 접근 코드 해시는 argon2id 이고 같은 코드도 매번 다른 값이며 $ 가 없다", async () => {
    const code = randomCode(ACCESS_CODE_MIN_LENGTH);
    const first = await hashAccessCode(code);
    const second = await hashAccessCode(code);
    expect(first).not.toBe(second);
    for (const value of [first, second]) {
      expect(value).not.toContain("$");
      expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(decodeAccessCodeHash(value)).toMatch(/^\$argon2id\$/);
    }
  });

  it("AC-1a 맞는 코드만 확인을 통과한다", async () => {
    const code = randomCode(ACCESS_CODE_MIN_LENGTH + 4);
    const stored = await hashAccessCode(code);
    expect(await verifyAccessCode(code, stored)).toBe(true);
    expect(await verifyAccessCode(randomCode(code.length), stored)).toBe(false);
    expect(await verifyAccessCode(code.slice(1), stored)).toBe(false);
    expect(await verifyAccessCode(`${code}!`, stored)).toBe(false);
    await expect(verifyAccessCode(code, null)).rejects.toBeInstanceOf(
      AccessNotConfiguredError,
    );
    await expect(
      verifyAccessCode(code, randomKeyMaterial()),
    ).rejects.toBeInstanceOf(AccessNotConfiguredError);
  });

  it("접근 코드 해시 값 꼴: 감싼 값을 풀면 PHC 이고 argon2id 가 아니면 null", () => {
    const phc = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA";
    const wrapped = encodeAccessCodeHash(phc);
    expect(wrapped).not.toContain("$");
    expect(decodeAccessCodeHash(wrapped)).toBe(phc);
    expect(decodeAccessCodeHash(` ${wrapped}\n`)).toBe(phc);
    expect(
      decodeAccessCodeHash(encodeAccessCodeHash("$argon2i$v=19$x")),
    ).toBeNull();
    expect(decodeAccessCodeHash("")).toBeNull();
    expect(decodeAccessCodeHash("%%%")).toBeNull();
  });
});

describe("접근 쿠키 토큰", () => {
  it("AC-1a 접근 코드(ACCESS_CODE_HASH)를 바꾸면 전에 받은 쿠키가 모두 무효다", async () => {
    const before = await hashAccessCode(randomCode(ACCESS_CODE_MIN_LENGTH));
    const after = await hashAccessCode(randomCode(ACCESS_CODE_MIN_LENGTH));
    const token = await issueAccessToken({
      keyMaterial: before,
      now: NOW,
      ttlSeconds: TTL_SECONDS,
      nonce: nonce(),
    });
    expect(
      await verifyAccessToken(token, { keyMaterial: before, now: NOW }),
    ).toBe(true);
    expect(
      await verifyAccessToken(token, { keyMaterial: after, now: NOW }),
    ).toBe(false);
  });

  it("접근 쿠키 토큰: v1.<만료 초>.<난수>.<서명> 꼴이고 만료 초가 지나면 무효다", async () => {
    const keyMaterial = randomKeyMaterial();
    const token = await issueAccessToken({
      keyMaterial,
      now: NOW,
      ttlSeconds: TTL_SECONDS,
      nonce: nonce(),
    });
    const parts = token.split(".");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe(ACCESS_TOKEN_VERSION);
    const expiresAt = Math.floor(NOW.getTime() / MS_PER_SECOND) + TTL_SECONDS;
    expect(parts[1]).toBe(String(expiresAt));
    const justBefore = new Date((expiresAt - 1) * MS_PER_SECOND);
    const atExpiry = new Date(expiresAt * MS_PER_SECOND);
    expect(
      await verifyAccessToken(token, { keyMaterial, now: justBefore }),
    ).toBe(true);
    expect(await verifyAccessToken(token, { keyMaterial, now: atExpiry })).toBe(
      false,
    );
  });

  it("접근 쿠키 토큰: 고친 토큰 · 다른 판 · 칸 수가 다른 값 · 빈 값 · 열쇠 없음은 무효다", async () => {
    const keyMaterial = randomKeyMaterial();
    const token = await issueAccessToken({
      keyMaterial,
      now: NOW,
      ttlSeconds: TTL_SECONDS,
      nonce: nonce(),
    });
    const [version, expires, nonceText, signature] = token.split(".");
    const forged = [
      [version, String(Number(expires) + 1), nonceText, signature].join("."),
      ["v2", expires, nonceText, signature].join("."),
      [version, expires, nonceText].join("."),
      `${token}.x`,
      [
        version,
        expires,
        nonceText,
        // 첫 글자를 바꾼다(끝 글자의 낮은 비트는 채움 비트라 바뀌어도 같은 바이트가 될 수 있다)
        `${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`,
      ].join("."),
      "",
    ];
    for (const value of forged) {
      expect(
        await verifyAccessToken(value, { keyMaterial, now: NOW }),
        value,
      ).toBe(false);
    }
    expect(await verifyAccessToken(undefined, { keyMaterial, now: NOW })).toBe(
      false,
    );
    expect(
      await verifyAccessToken(token, { keyMaterial: null, now: NOW }),
    ).toBe(false);
  });

  it("접근 쿠키 토큰: 열쇠 재료는 ACCESS_CODE_HASH 를 다듬은 값이고 없거나 비면 null", () => {
    const value = randomKeyMaterial();
    expect(accessKeyMaterial({ ACCESS_CODE_HASH: ` ${value}\n` })).toBe(value);
    expect(accessKeyMaterial({ ACCESS_CODE_HASH: "  " })).toBeNull();
    expect(accessKeyMaterial({})).toBeNull();
  });
});

describe("IP 해시", () => {
  it("IP 해시: 같은 열쇠 · 같은 IP 는 같은 값, 열쇠나 IP 가 다르면 다른 값이고 IP 가 드러나지 않는다", async () => {
    const keyA = randomKeyMaterial();
    const keyB = randomKeyMaterial();
    const ip = `198.51.100.${randomInt(1, 255)}`;
    const a1 = await hashIp(ip, keyA);
    expect(await hashIp(ip, keyA)).toBe(a1);
    expect(await hashIp(ip, keyB)).not.toBe(a1);
    expect(await hashIp(`${ip}0`, keyA)).not.toBe(a1);
    expect(a1).not.toContain(ip);
    expect(a1).toMatch(/^[A-Za-z0-9_-]+$/);
    // 쿠키 서명과 같은 열쇠를 쓰지 않는다(HKDF info 가 다르다)
    const token = await issueAccessToken({
      keyMaterial: keyA,
      now: NOW,
      ttlSeconds: TTL_SECONDS,
      nonce: nonce(),
    });
    expect(token.split(".")[3]).not.toBe(a1);
  });
});
