export type Lang = 'sq' | 'en' | 'sr'

export interface Page {
  id: string
  slug: string
  title_sq: string | null
  title_en: string | null
  hero_title_sq: string | null
  hero_title_en: string | null
  hero_subtitle_sq: string | null
  hero_subtitle_en: string | null
  hero_image_url: string | null
  published: boolean
}

export interface Section {
  id: string
  page_id: string
  title_sq: string | null
  title_en: string | null
  content_sq: string | null
  content_en: string | null
  image_url: string | null
  sort_order: number
}

export interface Article {
  id: string
  page_id: string | null
  title_sq: string | null
  title_en: string | null
  body_sq: string | null
  body_en: string | null
  cover_image_url: string | null
  published: boolean
  published_at: string | null
}

export interface FaqItem {
  id: string
  page_id: string | null
  question_sq: string | null
  question_en: string | null
  question_sr: string | null
  answer_sq: string | null
  answer_en: string | null
  answer_sr: string | null
  sort_order: number
}

export interface Infographic {
  id: string
  title_sq: string | null
  title_en: string | null
  image_url: string
  description_sq: string | null
  description_en: string | null
  sort_order: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
