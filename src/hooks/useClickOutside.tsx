"use client";

import { RefObject, useEffect } from "react";

/**
 * Custom hook that detects clicks outside of a referenced element
 *
 * @param ref - React ref object pointing to the element to detect clicks outside of
 * @param handler - Function to call when a click outside is detected
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 *
 * useClickOutside(ref, () => setIsOpen(false));
 *
 * return (
 *   <div ref={ref}>
 *     {isOpen && <Dropdown />}
 *   </div>
 * );
 * ```
 */
function useClickOutside(
  ref: RefObject<Element | null>,
  handler: (_event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    // Add event listeners
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    // Cleanup function
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default useClickOutside;
