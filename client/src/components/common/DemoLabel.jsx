import { FlaskConical } from 'lucide-react'
import Badge from './Badge'

export default function DemoLabel({ label = 'Demonstration data', className = '' }) {
  return (
    <Badge tone="violet" icon={FlaskConical} className={className}>
      {label}
    </Badge>
  )
}
