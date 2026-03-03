import type { User } from 'shared/types/auth';

import { navigateToPath } from './config';

// Set a cookie
export const setCookie = (name: string, value: string, days: number): void => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000); // days → milliseconds
  const expires = 'expires=' + date.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/`;
};

//Read a cookie
export const getCookie = (name: string): string | null => {
  const cookies = document.cookie.split('; ');
  for (const c of cookies) {
    const [key, val] = c.split('=');
    if (key === name) return decodeURIComponent(val);
  }
  return null;
};

// 3. Delete a cookie
export const deleteCookie = (name: string): void => {
  setCookie(name, '', -1); // set negative expiry to remove
};

//middleware check
export const processMiddleware = (): string | null => {
  const cookie = getCookie('accessToken');
  if (!cookie) {
    navigateToPath('/login?error=unauthorized');
  }
  return cookie;
};

export const logoutUser = () => {
  deleteCookie('accessToken');
  localStorage.removeItem('x-team-id');
  localStorage.removeItem('user');
  navigateToPath('/login?error=logged-out');
};

export const getUserRole = () => {
  const admin = localStorage.getItem('user');
  const user = admin && (JSON.parse(admin) as User);
  return user && user?.role;
};

export const isAdmin = () => {
  const role = getUserRole();
  return role === 'admin';
};
