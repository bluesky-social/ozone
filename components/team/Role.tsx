import { LabelChip } from '@/common/labels/List'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { getRoleText } from './helpers'

export function RoleTag({ role }: { role: ToolsOzoneTeamDefs.Member['role'] }) {
  return <LabelChip>{getRoleText(role)}</LabelChip>
}
