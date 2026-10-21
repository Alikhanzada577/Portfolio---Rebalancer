const THEME_KEY = "theme";

/** Flips light/dark, applies it immediately and remembers the choice. */
export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // storage blocked (private mode): the choice still applies for this page view
  }
}

/**
 * Runs inline in <head> before first paint, so there is no flash of the wrong theme.
 * With no saved choice the OS preference is used.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;
