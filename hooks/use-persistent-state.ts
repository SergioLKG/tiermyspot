"use client"

import { useState, useEffect } from "react"

// Hook personalizado para mantener el estado entre cambios de pestaña
export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Inicializar el estado
  const [state, setState] = useState<T>(() => {
    // Intentar obtener el valor del sessionStorage
    if (typeof window !== "undefined") {
      const storedValue = sessionStorage.getItem(key)
      if (storedValue) {
        try {
          return JSON.parse(storedValue)
        } catch (error) {
          console.error("Error parsing stored value:", error)
        }
      }
    }
    return initialValue
  })

  // Actualizar sessionStorage cuando el estado cambie
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(key, JSON.stringify(state))
    }
  }, [key, state])

  return [state, setState]
}