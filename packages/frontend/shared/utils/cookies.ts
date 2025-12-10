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
