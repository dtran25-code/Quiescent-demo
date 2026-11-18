// Sign-in and Consent spec: the user agrees to the Privacy Policy on the sign-in
// screen, before Quiescent collects any data (Chrome Web Store policy).
// PMs own this copy; keep it word for word with the spec.

/** Bump when quiescent.app/privacy changes in a way users must agree to again. */
export const PRIVACY_POLICY_VERSION = '2026-11-18'

/** The real address. The prototype opens its own /privacy. */
export const PRIVACY_POLICY_URL = 'https://quiescent.app/privacy'
export const PRIVACY_POLICY_PATH = '/privacy'

export const CONSENT_COPY = {
  subtitle: 'New here? Signing in creates your account.',
  collectsIntro: 'Quiescent collects:',
  collects: [
    'Your name, email and profile photo',
    'The text, title and link of articles you save',
    'Where you stopped reading',
    'How you use Quiescent, to improve it',
  ],
  reassurance: 'The extension only reads a page when you click the Q. We never sell your data.',
  checkboxBefore: 'I’ve read and agree to the ',
  checkboxLink: 'Privacy Policy',
} as const
