"use client";

import { useCallback, useState } from "react";

export function useSingleState<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  const set = useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

  return {
    get: value,
    set,
  };
}
