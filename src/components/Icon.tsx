import {
  User,
  Settings,
  Home,
  LogOut,
} from 'lucide-react'

const icons = {
  user: User,
  settings: Settings,
  home: Home,
  logout: LogOut,
}

interface IconProps {
  name: keyof typeof icons
  size?: number
  className?: string
}

export function Icon({ name, size = 24, className }: IconProps) {
  const IconComponent = icons[name]
  return <IconComponent size={size} className={className} />
}