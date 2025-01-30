import { formatUnits, parseUnits } from 'viem'

export const exactToSimple = (bn?: bigint | string | number, scale?: number) => {
  let res = bn
  if (typeof bn === 'object') {
    if ((bn as { hex?: string }).hex) {
      res = BigInt((bn as { hex: string }).hex)
    } else {
      console.log('unknown object type', bn, Object.entries(bn))
      return 0
    }
  }
  return Number.parseFloat(formatUnits(BigInt(res ?? 0), scale ?? 18))
}

export const simpleToExact = (simple: number | string = 0, _scale = 18) =>
  parseUnits(simple.toString(), _scale)
