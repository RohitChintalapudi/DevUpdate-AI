import { LuFlaskConical } from 'react-icons/lu'
import Badge from './Badge'

export default function DemoLabel({ label = 'Demonstration data', className = '' }) {
  return (
    <Badge tone="violet" icon={LuFlaskConical} className={className}>
      {label}
    </Badge>
  )
}
