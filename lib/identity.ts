import clientManager from './client'

export const getDidFromHandle = async (
  handle: string,
): Promise<string | null> => {
  try {
    const { data } = await clientManager.api.com.atproto.identity.resolveHandle(
      {
        handle,
      },
    )
    return data.did
  } catch (err) {
    return null
  }
}
