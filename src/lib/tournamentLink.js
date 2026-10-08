export const CLOUDFLARE_APP_URL =
  'https://veritas-esportss.veritasesports.workers.dev'

export function getTournamentLink(tournamentCode) {
  return `${CLOUDFLARE_APP_URL}/tournaments/${tournamentCode}`
}
