// Reports whether image search is configured, without exposing the backend
// URL (which is server-only env). Clients use this to decide whether to show
// image-search UI; the actual searches go through the sibling proxy route.
export async function GET() {
  return Response.json({ enabled: !!process.env.IMAGE_SEARCH_API_URL })
}
