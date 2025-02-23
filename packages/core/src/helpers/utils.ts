import readline from 'node:readline/promises'

/* Sleep helper */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* Prompt user for an amount. */
export const promptForAmount = async (): Promise<number> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question('Please enter an amount: ').then((answer: string) => {
      const parsed = Number.parseFloat(answer)
      rl.close()
      if (Number.isNaN(parsed)) {
        console.error('Invalid number. Defaulting to 1.')
        resolve(1)
      } else {
        resolve(parsed)
      }
    })
  })
}
