"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const initialValueRef = useRef(initialValue)

  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(key)
        if (stored !== null) return JSON.parse(stored)
      } catch {}
    }
    return initialValueRef.current
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(state))
    }
  }, [key, state])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try { setState(JSON.parse(e.newValue)) } catch {}
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [key])

  const setStateAndPersist = useCallback((value: T | ((val: T) => T)) => {
    setState((prev: T) => {
      const nextValue = typeof value === "function" ? (value as (val: T) => T)(prev) : value
      try {
        localStorage.setItem(key, JSON.stringify(nextValue))
      } catch (e) {
        console.error("Error persisting state:", e)
      }
      return nextValue
    })
  }, [key])

  return [state, setStateAndPersist]
}

export function clearPersistentStates(prefix: string) {
  if (typeof window !== "undefined") {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key)
      }
    })
  }
}
