declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown> | null
    version: string
  }
  function pdfParse(buffer: Buffer | Uint8Array): Promise<PDFParseResult>
  export default pdfParse
}
