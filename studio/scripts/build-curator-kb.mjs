// Word (.docx) білім базасын JSON-ға айналдырады: node scripts/build-curator-kb.mjs "<файл.docx>"
import mammoth from 'mammoth'
import { writeFileSync } from 'node:fs'
import { parseStructuredHtml } from '../src/lib/curatorParse.mjs'

const file = process.argv[2]
if (!file) { console.error('Файл жолын көрсетіңіз'); process.exit(1) }
const { value: html } = await mammoth.convertToHtml({ path: file })
const entries = parseStructuredHtml(html)
writeFileSync('src/data/curatorBase.json', JSON.stringify(entries))
console.log(`${entries.length} жазба, ${(JSON.stringify(entries).length / 1024).toFixed(0)} KB`)
