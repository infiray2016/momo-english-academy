// 401 화면 = 접근 코드 화면(4절 접근 코드 행 · C57, plan-p03b 파일별 값 7).
// 한 화면 한 행동. 글자는 4절 기준을 넘긴다(안내 text-xl 이상, 버튼 text-2xl, 입력칸 · 버튼 min-h-14).
// 포스트잇 보드 꾸밈과 글꼴은 P5 · P10 몫이다.
import { AccessCodeForm } from "./access-code-form";

export default function AccessUnauthorized() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-10 px-8 py-12">
      <h1 className="text-center text-3xl font-bold leading-snug">
        부모님이 코드를 넣어 주세요
      </h1>
      <AccessCodeForm />
    </main>
  );
}
