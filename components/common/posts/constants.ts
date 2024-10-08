export type TypeFilterKey =
  | 'no_filter'
  | 'posts_no_replies'
  | 'posts_with_media'
  | 'reposts'
  | 'no_reposts'
  | 'quotes'
  | 'quotes_and_reposts'

export const TypeFiltersByKey: Record<
  TypeFilterKey,
  { key: TypeFilterKey; text: string }
> = {
  no_filter: { key: 'no_filter', text: 'No Filter' },
  posts_no_replies: { key: 'posts_no_replies', text: 'Exclude replies' },
  no_reposts: { key: 'no_reposts', text: 'Exclude reposts' },
  posts_with_media: { key: 'posts_with_media', text: 'Media Only' },
  reposts: { key: 'reposts', text: 'Reposts Only' },
  quotes: { key: 'quotes', text: 'Quotes Only' },
  quotes_and_reposts: {
    key: 'quotes_and_reposts',
    text: 'Quotes & Reposts Only',
  },
}
