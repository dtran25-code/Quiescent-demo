// pdf.js (inside react-pdf) does its heavy lifting in a background "worker"
// script. This tells it where that script lives.
import { pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export { pdfjs }
