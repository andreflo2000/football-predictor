interface LogoProps {
  size?: number
  className?: string
}

export default function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <img
      src="/logo.svg"
      alt="Flopi San"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
