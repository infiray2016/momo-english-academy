// 점검 틀용 대역: next/navigation 의 useRouter(쪽을 옮기지 않고 부른 것만 window.__chat.router 에 남긴다).
type RouterLog = { refresh: number; push: string[] };

function log(): RouterLog {
  const w = window as unknown as { __chat?: { router: RouterLog } };
  return w.__chat?.router ?? { refresh: 0, push: [] };
}

const router = {
  push: (href: string) => {
    log().push.push(href);
  },
  replace: (href: string) => {
    log().push.push(href);
  },
  refresh: () => {
    log().refresh += 1;
  },
  back: () => {},
  forward: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return router;
}
