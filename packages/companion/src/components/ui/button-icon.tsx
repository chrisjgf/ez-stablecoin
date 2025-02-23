import type { FC } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'

export const ButtonWithChevron: FC<ButtonProps & { title: string }> = ({
  title,
  children,
  ...props
}) => {
  return (
    <Button {...props}>
      {title}
      <ChevronDown />
    </Button>
  )
}

export const ButtonWithChevronAndIcon: FC<ButtonProps & { title: string; icon: string }> = ({
  title,
  icon,
  children,
  ...props
}) => {
  return (
    <Button {...props}>
      <div className='flex items-center gap-2'>
        <img src={icon} className='w-4 h-4' />
        {title}
      </div>
      <ChevronDown />
    </Button>
  )
}
