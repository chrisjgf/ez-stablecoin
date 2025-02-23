export const shortAddress = (address: string) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not Connected'

export const formatLogMessage = (message: string): React.ReactNode => {
  // Regular expression to detect Ethereum transaction hashes
  const txHashRegex = /(0x[a-fA-F0-9]{64})/

  // Split the message by transaction hashes to handle multiple hashes in one message
  const parts = message.split(txHashRegex)

  return parts.map((part, index) => {
    if (txHashRegex.test(part)) {
      const etherscanUrl = `https://etherscan.io/tx/${part}`
      return (
        <a
          key={index}
          href={etherscanUrl}
          target='_blank'
          rel='noopener noreferrer'
          style={{ color: '#007bff', textDecoration: 'none' }}
        >
          {`${shortAddress(part)} ⇗`}
        </a>
      )
    }
    return part
  })
}
