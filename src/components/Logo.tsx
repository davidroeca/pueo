import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'

type Props = React.ComponentPropsWithoutRef<'img'>

export function Logo({ className, ...rest }: Props) {
  const { theme } = useSettingsStore()
  return (
    <img
      className={`max-w-[500px] max-h-[500px] ${className || ''}`}
      src={theme === 'light' ? "/pueo.png" : "pueo-dark.png"}
      alt="Pueo logo"
      {...rest}
    />
  )
}
