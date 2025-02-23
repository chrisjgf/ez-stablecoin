import { sleep } from './helpers/utils'

const API_URL = 'http://localhost:3030'

export async function fetchStatus(): Promise<{ gbp: number }> {
  try {
    const response = await fetch(`${API_URL}/status`)
    if (!response.ok) throw new Error('Failed to fetch status')
    return await response.json()
  } catch (error) {
    console.error('Error reading status:', error)
    return { gbp: 0 }
  }
}

export async function waitForGbp(): Promise<number> {
  let status = await fetchStatus()
  while ((status.gbp ?? 0) <= 0) {
    console.log('Waiting for nonzero GBP status...')
    await sleep(5000)
    status = await fetchStatus()
  }
  console.log(`Detected GBP status: ${status.gbp ?? 0}`)
  return status.gbp ?? 0
}

export async function updateStatus(
  newStatus: Partial<{
    gbp?: number
    gbpKraken?: number
    usdcKraken?: number
    usdcOp?: number
    usdcBase?: number
  }>,
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStatus),
    })
    if (!response.ok) {
      throw new Error('Failed to update status')
    }
    const data = await response.json()
    console.log('Status updated:', data.status)
  } catch (error) {
    console.error('Failed to update status:', error)
  }
}
