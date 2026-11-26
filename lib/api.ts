const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {'Content-Type':'application/json', ...(options.headers || {})},
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json();
}

export const authApi = {
  login: (body: {username:string; password:string}) => api('/auth/login',{method:'POST',body:JSON.stringify(body)}),
  logout: () => api('/auth/logout',{method:'POST'}),
};
