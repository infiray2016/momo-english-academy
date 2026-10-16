import "server-only";

// 가족 접근 코드 해시 · 확인(10절 접근 제어, plan-p03b 파일별 값 2, C55 (5) · C57).
// argon2id 는 @node-rs/argon2 기본값(Argon2id · 19456 KiB · 2회 · 병렬 1 = OWASP 최소 권고)을 쓴다.
// Algorithm 은 const enum 이라 isolatedModules 에서 가져오지 않는다(기본값이 Argon2id 다).
import { hash, verify } from "@node-rs/argon2";
import {
  ACCESS_CODE_MIN_LENGTH,
  decodeAccessCodeHash,
  encodeAccessCodeHash,
  isValidAccessCode,
} from "@/core/access-token";

export {
  ACCESS_CODE_MIN_LENGTH,
  ACCESS_CODE_PATTERN,
  isValidAccessCode,
} from "@/core/access-token";

export class AccessCodeRuleError extends Error {
  constructor() {
    super(
      `접근 코드는 영문 · 숫자 ${ACCESS_CODE_MIN_LENGTH}자 이상이어야 합니다`,
    );
    this.name = "AccessCodeRuleError";
  }
}

export class AccessNotConfiguredError extends Error {
  constructor() {
    super("ACCESS_CODE_HASH 가 없거나 풀리지 않습니다");
    this.name = "AccessNotConfiguredError";
  }
}

/** ACCESS_CODE_HASH 에 넣을 값. 꼴이 어긋나면 AccessCodeRuleError. */
export async function hashAccessCode(code: string): Promise<string> {
  if (!isValidAccessCode(code)) throw new AccessCodeRuleError();
  return encodeAccessCodeHash(await hash(code));
}

/** 코드가 ACCESS_CODE_HASH(키 재료)와 맞으면 true. 키 재료가 풀리지 않으면 AccessNotConfiguredError. */
export async function verifyAccessCode(
  code: string,
  keyMaterial: string | null,
): Promise<boolean> {
  const phc = decodeAccessCodeHash(keyMaterial);
  if (!phc) throw new AccessNotConfiguredError();
  if (!isValidAccessCode(code)) return false;
  return verify(phc, code);
}
