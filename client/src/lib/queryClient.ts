import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    const error = new Error(`${res.status}: ${errorData.error || errorData.message || res.statusText}`);
    (error as any).data = errorData;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey.join("/");
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        const error = new Error(`${res.status}: ${errorData.error || res.statusText}`);
        (error as any).data = errorData;
        (error as any).course = errorData.course;
        throw error;
      }

      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
