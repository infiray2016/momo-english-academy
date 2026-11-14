// 재현 틀용 대역: 아이 말풍선(오른쪽 정렬의 짧은 상자).
export function ChildBubble({ said }: { said: { text?: string } | string }) {
  const text = typeof said === "string" ? said : (said.text ?? "");
  return (
    <div data-child-bubble="" className="childbubble">
      {text}
    </div>
  );
}
