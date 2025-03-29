"use client"

import { useState, useEffect } from "react"

// Hook personalizado para mantener el estado entre cambios de pestaña
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  dependencies: any[] = [],
): [T, (value: T | ((val: T) => T)) => void] {
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
          return initialValue
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

  // Recargar el estado cuando cambien las dependencias
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedValue = sessionStorage.getItem(key)
      if (storedValue) {
        try {
          setState(JSON.parse(storedValue))
        } catch (error) {
          console.error("Error parsing stored value:", error)
          setState(initialValue)
        }
      } else {
        setState(initialValue)
      }
    }
  }, [key, initialValue, ...dependencies])

  // Función para limpiar el estado persistente
  const setStateAndPersist = (value: T | ((val: T) => T)) => {
    setState(value)
    if (typeof window !== "undefined") {
      const newValue = typeof value === "function" ? (value as (val: T) => T)(state) : value
      sessionStorage.setItem(key, JSON.stringify(newValue))
    }
  }

  return [state, setStateAndPersist]
}

// Función para limpiar todos los estados persistentes relacionados con un prefijo
export function clearPersistentStates(prefix: string) {
  if (typeof window !== "undefined") {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key)
      }
    })
  }
}