import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Track the rendered size of an element so SVG charts can be drawn at real pixel size.
 * Returns a callback ref, so it keeps working when the element is unmounted and remounted.
 */
export function useSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef(null);
  const ref = useCallback((el) => {
    if (observer.current) {
      observer.current.disconnect();
      observer.current = null;
    }
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    update();
    observer.current = new ResizeObserver(update);
    observer.current.observe(el);
  }, []);
  return [ref, size];
}

/** Light / dark theme. Follows the OS until the viewer picks one; the choice is remembered. */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stamped = document.documentElement.dataset.theme;
    if (stamped === "dark" || stamped === "light") return stamped;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("n3-theme", next);
    } catch {
      /* storage unavailable - the choice lasts for this visit only */
    }
    setTheme(next);
  }, [theme]);
  return [theme, toggle];
}

/** Keep the active tab in the URL hash so a view can be linked to and survives reloads. */
export function useHashTab(tabs, fallback) {
  const read = useCallback(() => {
    const hash = window.location.hash.replace("#", "");
    return tabs.includes(hash) ? hash : fallback;
  }, [tabs, fallback]);
  const [tab, setTab] = useState(read);
  useEffect(() => {
    const onHash = () => setTab(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [read]);
  const select = useCallback((next) => {
    window.history.replaceState(null, "", `#${next}`);
    setTab(next);
  }, []);
  return [tab, select];
}
