import { useState, useEffect } from "react";

/**
 * هوک تشخیص حالت موبایل بر اساس عرض صفحه
 * @param {number} breakpoint - عرضی که زیرش موبایل در نظر گرفته می‌شود (پیش‌فرض 768px)
 */
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);

    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
