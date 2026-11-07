export const TEACHERS = {
  mina: {
    id: "mina", name: "미나", englishName: "Mina", model: "/models/mina.vrm",
    description: "작은 목소리도 귀 기울여 듣는,\n다정한 영어 친구예요.",
    traits: ["다정하게", "차근차근", "함께 웃어요"],
    greeting: "Hello! I'm Mina. It's nice to meet you. Let's learn English together!",
    accent: "#386449", room: "#e8e9d9",
  },
  leo: {
    id: "leo", name: "리오", englishName: "Leo", model: "/models/leo.vrm",
    description: "새로운 이야기가 늘 궁금한,\n밝고 편안한 영어 친구예요.",
    traits: ["호기심 가득", "편안하게", "한 번 더 해요"],
    greeting: "Hey! I'm Leo. I'm happy you're here. What do you like to do?",
    accent: "#43667b", room: "#e0e8e8",
  },
};

export const STATES = {
  idle: { label: "편안히 기다리는 중", description: "눈을 맞추며, 다음 이야기를 기다려요." },
  speaking: { label: "이야기하는 표정", description: "입 모양과 고개 움직임을 함께 살펴보세요." },
  listening: { label: "귀 기울이는 표정", description: "천천히 말해도 괜찮아요. 끝까지 기다려 줄게요." },
  praise: { label: "정말 잘했어요!", description: "작은 도전에도, 환한 미소로 응원해요." },
  thinking: { label: "잠깐 생각하는 중", description: "음… 어떤 이야기를 들려줄까요?" },
};
