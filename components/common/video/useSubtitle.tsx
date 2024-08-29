import client from '@/lib/client'
import { useState } from 'react'
import { toast } from 'react-toastify'

export const useSubtitle = (source: string) => {
  const [subtitle, setSubtitle] = useState<{
    isLoading: boolean
    error?: string
    url: string
  }>({
    isLoading: false,
    error: '',
    url: '',
  })

  const loadSubtitle = async () => {
    setSubtitle({
      isLoading: true,
      error: '',
      url: '',
    })
    try {
      const videoUrl = new URL(source)
      const sourceFragments = source.split('/')
      const videoCid = sourceFragments[sourceFragments.length - 2]
      const authorDid = sourceFragments[sourceFragments.length - 3]

      const { data: serviceAuth } =
        await client.api.com.atproto.server.getServiceAuth({
          aud: videoUrl.host,
          lxm: 'app.bsky.video.getTranscript',
        })

      if (!serviceAuth?.token) {
        toast.error('Failed to get auth token')
        setSubtitle({
          isLoading: false,
          error: 'Failed to get auth token',
          url: '',
        })
        return
      }

      setSubtitle({
        isLoading: false,
        error: '',
        // TODO: does the endpoint expect the token only in the header of the req? or does query param work?
        url: `${videoUrl.origin}/video/${authorDid}/${videoCid}/transcription_eng.vtt?token=${serviceAuth.token}`,
      })
    } catch (error) {
      console.error(error)
      const err = `Failed to get subtitle: ${error?.['message']}`
      setSubtitle({
        isLoading: false,
        error: err,
        url: '',
      })
      toast.error(err)
    }
  }

  return {
    subtitle,
    loadSubtitle,
  }
}
