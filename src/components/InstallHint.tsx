import { useState } from "react";

const KEY = "open-av-toolkit.install-hint";

const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** iPhones and iPads have no install button, so say where it is. Shown once on the project page. */
function shouldShow(): boolean {
  try {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    return ios && !standalone && !read();
  } catch {
    return false;
  }
}

export default function InstallHint() {
  const [show, setShow] = useState(shouldShow);
  if (!show) return null;
  const hide = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className="panel flex items-start justify-between gap-3" role="note">
      <p className="text-sm text-zinc-300">
        Keep PixelPlan on your home screen: tap the <strong className="text-zinc-50">Share</strong> button in Safari, then{" "}
        <strong className="text-zinc-50">Add to Home Screen</strong>. It opens full screen and works without a signal.
      </p>
      <button type="button" className="btn shrink-0" onClick={hide}>
        Got it
      </button>
    </div>
  );
}
