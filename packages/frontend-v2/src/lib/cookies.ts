// Cookie管理工具函数

/**
 * 从cookie中获取指定名称的值
 * @param name cookie名称
 * @returns cookie值或null
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue || '');
    }
  }
  return null;
}

/**
 * 设置cookie
 * @param name cookie名称
 * @param value cookie值
 * @param options cookie选项
 */
export function setCookie(
  name: string, 
  value: string, 
  options: {
    maxAge?: number; // 秒
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
) {
  if (typeof document === 'undefined') {
    return;
  }

  const {
    maxAge,
    expires,
    path = '/',
    domain,
    secure = true,
    sameSite = 'strict'
  } = options;

  let cookieString = `${name}=${encodeURIComponent(value)}`;
  
  if (maxAge !== undefined) {
    cookieString += `; max-age=${maxAge}`;
  }
  
  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`;
  }
  
  cookieString += `; path=${path}`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  if (secure) {
    cookieString += `; secure`;
  }
  
  cookieString += `; samesite=${sameSite}`;
  
  document.cookie = cookieString;
}

/**
 * 删除cookie
 * @param name cookie名称
 * @param options cookie选项
 */
export function deleteCookie(
  name: string, 
  options: { path?: string; domain?: string } = {}
) {
  const { path = '/', domain } = options;
  
  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  document.cookie = cookieString;
}

// 认证token相关的便捷函数
export const authToken = {
  get: () => getCookie('auth_token'),
  set: (token: string, maxAge: number = 7 * 24 * 60 * 60) => 
    setCookie('auth_token', token, { maxAge }),
  clear: () => deleteCookie('auth_token')
};
