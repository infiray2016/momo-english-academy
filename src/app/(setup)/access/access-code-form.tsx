"use client";

// 접근 코드 입력 · 제출 · 안내 한 줄(4절 접근 코드 행 · C57 · 끊김은 7절 네트워크 행 문구, plan-p03b 파일별 값 8).
// 서버 액션을 쓰지 않는다. 다시 쓴 화면의 주소가 / 라서 서버 액션 POST 는 proxy 가 막는다(위험 3).
import { type FormEvent, useRef, useState } from "react";

const SUBMIT_PATH = "/access/submit";
const HOME_PATH = "/";

/** 화면 문구(4절 · C57 그대로, 끊김은 7절 네트워크 행). */
const MESSAGES = {
  wrong: "코드가 맞지 않아요. 다시 넣어 주세요",
  locked: "잠시 뒤에 다시 넣어 주세요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  other: "지금은 들어갈 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;

export function AccessCodeForm() {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 빈 칸이면 요청 없이 입력칸으로 초점만 돌린다(브라우저 말풍선 문구를 띄우지 않는다, 화면 검토 M2)
    if (code.trim() === "") {
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    setMessage("");
    let response: Response;
    try {
      response = await fetch(SUBMIT_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {
      setMessage(MESSAGES.offline);
      setPending(false);
      inputRef.current?.focus();
      return;
    }
    if (response.status === 204) {
      window.location.assign(HOME_PATH);
      return;
    }
    if (response.status === 401) {
      setMessage(MESSAGES.wrong);
      setCode("");
    } else if (response.status === 429) {
      setMessage(MESSAGES.locked);
    } else {
      setMessage(MESSAGES.other);
    }
    setPending(false);
    // 204 가 아닌 모든 결과 뒤 입력칸으로 초점을 돌린다(화면 검토 M3)
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label htmlFor="access-code" className="text-xl font-semibold">
          가족 접근 코드
        </label>
        <input
          id="access-code"
          type="password"
          name="code"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-14 rounded-2xl border-2 border-neutral-500 bg-white px-4 text-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-2xl bg-neutral-900 px-6 text-2xl font-bold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-60"
      >
        들어가기
      </button>
      <p role="status" className="min-h-8 text-center text-xl">
        {message}
      </p>
    </form>
  );
}
