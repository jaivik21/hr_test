import { useEffect } from "react";

export default function useTabCheatDetector(onCheat) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onCheat(); // user switched tab or minimized
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onCheat]);
}