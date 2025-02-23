import fs from 'node:fs/promises'
import path from 'node:path'
import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'

const app = express()
const port = process.env.PORT || 3030

app.use(express.json())
app.use(cors({ origin: 'http://localhost:5173' }))

app.get('/status', async (req: Request, res: Response) => {
  try {
    const statusFilePath = path.join(process.cwd(), 'status.json')
    const fileContent = await fs.readFile(statusFilePath, 'utf8')
    const jsonData = JSON.parse(fileContent)
    res.json(jsonData)
  } catch (error) {
    console.error('Error reading status file:', error)
    res.status(500).json({ error: 'Failed to read status file' })
  }
})

app.post('/update-status', async (req: Request, res: Response) => {
  try {
    console.log('Updating status file...')
    const statusFilePath = path.join(process.cwd(), 'status.json')
    let currentStatus = {}
    try {
      const fileContent = await fs.readFile(statusFilePath, 'utf8')
      currentStatus = JSON.parse(fileContent)
    } catch (readError) {
      // File might not exist; start with an empty object
      currentStatus = {}
    }

    const newStatus = req.body || {}
    const mergedStatus = { ...currentStatus, ...newStatus }
    await fs.writeFile(statusFilePath, JSON.stringify(mergedStatus, null, 2))
    res.json({ status: mergedStatus })
  } catch (error) {
    console.error('Error updating status file:', error)
    res.status(500).json({ error: 'Failed to update status file' })
  }
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
