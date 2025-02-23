import { sleep } from '@/helpers/utils'

const API_URL = 'http://localhost:3030'

export interface Status {
  gbp: number
  gbpKraken: number
  usdcOp: number
  usdcBase: number
  usdcKraken: number
  address?: string
}

export const updateGBPStatus = async (amount: number) => {
  const response = await fetch(`${API_URL}/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gbp: amount }),
  })
  if (!response.ok) {
    throw new Error('Failed to update gbp status')
  }
  return response.json()
}

export const updateAddressStatus = async (address: string) => {
  const response = await fetch(`${API_URL}/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })
  if (!response.ok) {
    throw new Error('Failed to update gbp status')
  }
  return response.json()
}

export const fetchStatus = async (): Promise<Omit<Status, 'address'>> => {
  try {
    const response = await fetch(`${API_URL}/status`)
    if (!response.ok) throw new Error('Failed to fetch status')
    return await response.json()
  } catch (error) {
    console.error('Error reading status:', error)
    return { gbp: 0, gbpKraken: 0, usdcOp: 0, usdcBase: 0, usdcKraken: 0 }
  }
}

export const waitForNonZeroStatus = async (key: keyof Omit<Status, 'address'>): Promise<number> => {
  let status = await fetchStatus()
  while (status[key] <= 0) {
    console.log(`Waiting for nonzero ${key} status...`)
    await sleep(5000)
    status = await fetchStatus()
  }
  console.log(`Detected ${key} status: ${status[key]}`)
  return status[key]
}
