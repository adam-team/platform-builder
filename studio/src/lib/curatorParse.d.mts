export interface ParsedEntry {
  id: string
  question: string
  questionKz: string
  keywords: string
  keywordsKz: string
  answer: string
  answerKz: string
}
export function parseStructuredHtml(html: string): ParsedEntry[]
