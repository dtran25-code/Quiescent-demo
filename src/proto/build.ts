// Tester build: the same app with the prototype tools taken out (Dev menu and
// Event log, dev notes, /screens, /events, the simulated Chrome extension).
// Set VITE_TESTER_BUILD=true in the environment of the site you send to testers.
export const TESTER_BUILD = import.meta.env.VITE_TESTER_BUILD === 'true'
