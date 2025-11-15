import React from 'react'

type Props = React.ComponentPropsWithoutRef<'img'>

export function Logo({ className, ...rest }: Props) {
  return (
    <img
      className={`max-w-[500px] max-h-[500px] ${className || ''}`}
      src="/pueo.png"
      alt="Pueo logo"
      {...rest}
    />
  )
}
