import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { FaCheckCircle } from 'react-icons/fa'
import { useInterval } from 'react-use'
import { fetchStatus, type Status, updateGBPStatus } from './api'
import { AlertDescription } from './components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { formatLogMessage, shortAddress } from './helpers/formatters'
import type { LogEntry, LogMessage } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ButtonWithChevronAndIcon } from '@/components/ui/button-icon'

import gbpIcon from '@/assets/uk.png'
import baseIcon from '@/assets/base.png'
import usdcIcon from '@/assets/usdc.png'
import { CheckCircle, CheckCircle2 } from 'lucide-react'

const steps: {
  key: keyof Omit<Status, 'address'>
  pendingLabel: string
  completedLabel: string
}[] = [
  {
    key: 'gbp',
    pendingLabel: 'Order detected for GBP',
    completedLabel: 'Order detected for GBP',
  },
  {
    key: 'gbpKraken',
    pendingLabel: 'Pending GBP deposit to XX-XX-XX / XXXXXXXX – PAYWARD LTD',
    completedLabel: 'Detected GBP on Kraken',
  },
  {
    key: 'usdcKraken',
    pendingLabel: 'Pending detection of USDC on Kraken',
    completedLabel: 'Detected USDC on Kraken',
  },
  {
    key: 'usdcOp',
    pendingLabel: 'Pending detection of USDC on Optimism',
    completedLabel: 'Detected USDC on Optimism',
  },
  {
    key: 'usdcBase',
    pendingLabel: 'Pending detection of USDC on Base',
    completedLabel: 'Detected USDC on Base',
  },
]

const App: FC = () => {
  const [row, setRow] = useState<LogEntry | null>(null)
  const [logs, setLogs] = useState<LogMessage[]>([])
  const [nextLogId, setNextLogId] = useState(1)
  const [nextId] = useState(1)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [input, setInput] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  const addLog = (
    text: string,
    status: 'completed' | 'pending',
    stepKey: keyof Omit<Status, 'address'>,
  ) => {
    setLogs((prevLogs) => {
      const existingLogIndex = prevLogs.findIndex((log) =>
        log.text.includes(steps.find((step) => step.key === stepKey)?.pendingLabel || ''),
      )
      if (existingLogIndex !== -1) {
        if (status === 'completed') {
          const updatedLogs = [...prevLogs]
          updatedLogs[existingLogIndex] = {
            ...updatedLogs[existingLogIndex],
            text,
            status,
            stepKey,
          }
          return updatedLogs
        }
        return prevLogs
      }
      return [...prevLogs, { id: nextLogId, text, status, stepKey }]
    })
    setNextLogId((id) => id + 1)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (row) return

    const amount = input.trim()

    const newRow: LogEntry = {
      id: nextId,
      input: amount,
      status: 'pending',
      logs: [],
    }
    setRow(newRow)
    updateGBPStatus(Number(amount))
  }

  useInterval(async () => {
    if (!row) return
    try {
      const status = await fetchStatus()
      let highestIndex = -1
      for (let i = currentStep; i < steps.length; i++) {
        if (status[steps[i].key] > 0) {
          highestIndex = i
        }
      }
      if (highestIndex !== -1) {
        for (let i = currentStep; i <= highestIndex; i++) {
          addLog(`${steps[i].completedLabel}: ${status[steps[i].key]}`, 'completed', steps[i].key)
        }
        setCurrentStep(highestIndex + 1)
        if (highestIndex + 1 === steps.length) {
          setRow((prevRow) => (prevRow ? { ...prevRow, status: 'pending' } : null))
        }
      } else {
        addLog(steps[currentStep].pendingLabel, 'pending', steps[currentStep].key)
      }
    } catch (err) {
      console.error(err)
    }
  }, 1000)

  useEffect(() => {
    if (!!exchangeRate) return
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/GBP')
        const data = await response.json()
        setExchangeRate(data.rates.USD)
      } catch (error) {
        console.error('Error fetching exchange rate:', error)
      }
    }
    fetchExchangeRate()
  }, [])

  const convertedAmount =
    !!exchangeRate && !!input ? ((Number.parseFloat(input) ?? 0) * exchangeRate).toFixed(2) : '0.00'

  return (
    <div className='container mx-auto p-4 max-w-2xl dark'>
      {logs.find((log) => log.stepKey === 'usdcBase')?.status === 'completed' ? (
        <Card className={'mb-8 mt-12 flex h-32 items-center justify-center'}>
          <CardContent className='flex flex-col items-center justify-center gap-4 p-0'>
            <CheckCircle2 className='w-10 h-10 text-green-500' />
            <p className='text-lg font-semibold'>USDC sent to {shortAddress(address)}</p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className={`mb-8 mt-12 ${!!row ? 'opacity-50' : ''}`}>
            <CardHeader>
              <CardTitle className='text-xl font-semibold'>Swap GBP to USDC</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <Card className='flex-col items-center gap-2 justify-between p-4'>
                <label htmlFor='send-amount' className='block text-xs font-light text-gray-400'>
                  You send
                </label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='text'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className='flex-1 border-none'
                    placeholder='0.00'
                    style={{ fontSize: '1.5rem', padding: '0rem', boxShadow: 'none' }}
                  />
                  <ButtonWithChevronAndIcon
                    icon={gbpIcon}
                    title='GBP'
                    className='bg-slate-200 text-slate-800 rounded-full hover:bg-slate-300'
                  />
                </div>
              </Card>
              <Card className='flex items-center gap-2 justify-between p-4'>
                <label
                  htmlFor='chain-destination'
                  className='block text-xs font-light text-gray-400 '
                >
                  Chain destination
                </label>
                <ButtonWithChevronAndIcon
                  icon={baseIcon}
                  title='Base'
                  className='bg-slate-200 text-slate-800 rounded-full hover:bg-slate-300'
                />
              </Card>
              <Card className='flex-col items-center gap-2 justify-between p-4'>
                <label htmlFor='receive-amount' className='block text-xs font-light text-gray-400 '>
                  You receive
                </label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='text'
                    value={convertedAmount}
                    disabled={true}
                    className='flex-1 border-none'
                    placeholder='0.00'
                    style={{ fontSize: '1.5rem', padding: '0rem', boxShadow: 'none' }}
                  />
                  <ButtonWithChevronAndIcon
                    icon={usdcIcon}
                    title='USDC'
                    className='bg-slate-200 text-slate-800 rounded-full hover:bg-slate-300'
                  />
                </div>
              </Card>
              {/* <Card className='flex-col items-center gap-2 justify-between p-4'>
                <label
                  htmlFor='recipient-address'
                  className='block text-xs font-light text-gray-400'
                >
                  Recipient Address
                </label>
                <Input
                  type='text'
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className='flex-1 border-none'
                  placeholder='0x0000...00000'
                  style={{ fontSize: '1.25rem', padding: '0rem', boxShadow: 'none' }}
                />
              </Card> */}
              <Button
                type='submit'
                variant='default'
                className='bg-blue-500 text-white rounded-full hover:bg-blue-600 text-md'
                style={{ height: '3rem' }}
              >
                Swap
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
      <div className='mt-6 space-y-3'>
        {logs.map((log) => (
          <Card key={log.id} className='flex items-center justify-start p-4'>
            <div className='flex items-center'>
              {log.status === 'completed' ? (
                <FaCheckCircle className='text-green-500 w-5 h-5' />
              ) : (
                <div className='w-5 h-5 bg-gray-300 rounded-full animate-pulse' />
              )}
              <AlertDescription className='ml-2'>{formatLogMessage(log.text)}</AlertDescription>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default App
