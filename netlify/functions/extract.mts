// Netlify Function: the deployed version of the link-fetch helper.
// Same code as local development (server/extractArticle.ts), served at /api/extract.

import { extract } from '../../server/extractArticle.ts'

export default async (req: Request) => {
  const target = new URL(req.url).searchParams.get('url') ?? ''
  const { status, body } = await extract(target)
  return Response.json(body, { status })
}

export const config = { path: '/api/extract' }
