import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Instead of setting state synchronously in an effect, we should probably
    // use a different pattern, or just set it in a timeout if necessary, but
    // since we use a useEffect, the initial value can be handled differently.
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    mql.addEventListener("change", onChange)
    
    // Set initial value inside a timeout to avoid synchronous set state in effect
    const timeoutId = setTimeout(() => {
      if (isMobile === undefined) {
        setIsMobile(mql.matches)
      }
    }, 0)
    
    return () => {
      clearTimeout(timeoutId)
      mql.removeEventListener("change", onChange)
    }
  }, [isMobile])

  return !!isMobile
}
