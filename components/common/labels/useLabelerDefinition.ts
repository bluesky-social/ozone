import { ComAtprotoLabelDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { ExtendedLabelerServiceDef } from './util'
import { usePdsAgent } from '@/shell/AuthContext'

export const useLabelerDefinitionQuery = (did: string) => {
  const pdsAgent = usePdsAgent()

  return useQuery<ExtendedLabelerServiceDef | null>({
    queryKey: ['labelerDef', { did }],
    queryFn: async () => {
      if (!did?.startsWith('did:')) {
        return null
      }
      const { data } = await pdsAgent.app.bsky.labeler.getServices({
        dids: [did],
        detailed: true,
      })
      if (!data.views?.[0]) {
        return null
      }

      const labelerDef = data.views[0] as ExtendedLabelerServiceDef
      if (labelerDef?.policies.labelValueDefinitions) {
        const definitionsById: Record<
          string,
          ComAtprotoLabelDefs.LabelValueDefinition
        > = {}
        labelerDef.policies.labelValueDefinitions.forEach((def) => {
          definitionsById[def.identifier] = def
        })
        labelerDef.policies.definitionById = definitionsById
      }

      return labelerDef
    },
    // These are not super likely to change frequently but labels will be rendered quite a lot
    // so caching them for longer period is ideal
    staleTime: 60 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
  })
}
