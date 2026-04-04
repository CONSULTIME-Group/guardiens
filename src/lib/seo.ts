const SITE_URL = "https://guardiens.fr";

export const normalizePathname = (pathname: string) => {
  const basePath = (pathname || "/").split(/[?#]/)[0] || "/";
  const normalized = `/${basePath}`.replace(/\/+/g, "/");

  if (normalized === "/") {
    return "/";
  }

  return normalized.replace(/\/+$/g, "");
};

export const buildAbsoluteUrl = (pathname: string) => {
  const normalizedPath = normalizePathname(pathname);
  return `${SITE_URL}${normalizedPath}`;
};

export { SITE_URL };