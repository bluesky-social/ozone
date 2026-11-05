import { useQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { fetchAtmosphereRecordView } from './atmosphereRecordView'

// Always requests the selected version of the record (uri + cid); there is
// deliberately no fallback to the latest version.
export function useAtmosphereRecordView({
  uri,
  cid,
}: {
  uri: string
  cid: string
}) {
  const agent = useLabelerAgent()
  return useQuery({
    retry: false,
    enabled: !!uri && !!cid,
    queryKey: [
      'atmosphereRecordView',
      { uri, cid, did: agent.did, proxy: agent.proxy },
    ],
    queryFn: ({ signal }) =>
      fetchAtmosphereRecordView(agent, { uri, cid }, signal),
  })
}
