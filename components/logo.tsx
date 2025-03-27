import Image from "next/image"
import Link from "next/link"

export function Logo({ size = "default", showText = true, className = "" }) {
  const iconSize = size === "small" ? 20 : size === "large" ? 32 : 24
  const textSize = size === "small" ? "text-sm" : size === "large" ? "text-xl" : "text-base"

  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center">
        <Image src="/logo.svg" alt="TierMySpot Logo" width={iconSize} height={iconSize} />
      </div>
      {showText && (
        <span
          className={`font-bold ${textSize} bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-700`}
        >
          TierMySpot
        </span>
      )}
    </Link>
  )
}

