// "Add to Chrome" everywhere on the website opens the Quiescent Chrome Web Store
// listing in a new tab (landing PRD, acceptance criteria).
// PLACEHOLDER: the listing isn't published yet, so this opens a store search for
// "Quiescent". Swap in the real listing URL once it exists.
export const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/search/Quiescent'

export function openChromeStore() {
  window.open(CHROME_WEB_STORE_URL, '_blank', 'noopener,noreferrer')
}
