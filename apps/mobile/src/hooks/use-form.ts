import { useCallback, useRef, useState } from 'react';

export function useForm<T extends object>(initialValues: T) {
  const initialRef = useRef(initialValues);
  const [values, setValues] = useState<T>(initialValues);

  const setFieldValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback((nextValues?: Partial<T>) => {
    if (nextValues) {
      setValues({ ...initialRef.current, ...nextValues } as T);
      return;
    }
    setValues(initialRef.current);
  }, []);

  return [values, setFieldValue, reset] as const;
}
