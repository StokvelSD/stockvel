// tests/ratescontroller.test.js
jest.mock('node-fetch', () => jest.fn())

const { getSarbRates } = require('../controllers/ratesController')
const fetch = require('node-fetch')

describe('getSarbRates', () => {
  let req, res
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, FRED_API_KEY: 'test-api-key' }

    req = {}
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('should return prime and repo rates from FRED API', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        observations: [{ value: '11.25', date: '2024-01-01' }]
      })
    })

    await getSarbRates(req, res)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('IRLTLT01ZAA156N'))
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      primeRate: 11.25,
      repoRate: 7.75,
      source: expect.stringContaining('FRED API'),
      dataDate: '2024-01-01',
      lastUpdated: expect.any(String)
    }))
  })

  it('should correctly calculate repoRate as primeRate minus 3.5', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        observations: [{ value: '8.00', date: '2024-06-01' }]
      })
    })

    await getSarbRates(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload.primeRate).toBe(8.00)
    expect(payload.repoRate).toBe(4.50)
  })

  it('should use fallback rates when FRED_API_KEY is not set', async () => {
    delete process.env.FRED_API_KEY

    await getSarbRates(req, res)

    expect(fetch).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      primeRate: 10.23,
      repoRate: 6.73,
      source: expect.stringContaining('Fallback')
    }))
  })

  it('should return 500 when FRED API responds with non-ok status', async () => {
    fetch.mockResolvedValue({ ok: false, status: 503 })

    await getSarbRates(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      warning: expect.stringContaining('Failed to fetch live rates'),
      primeRate: expect.any(Number),
      repoRate: expect.any(Number)
    }))
  })

  it('should fall back when observations array is empty', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ observations: [] })
    })

    await getSarbRates(req, res)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      primeRate: 10.23,
      source: expect.stringContaining('Fallback')
    }))
  })

  it('should fall back when observations value is missing', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        observations: [{ date: '2024-01-01' }]
      })
    })

    await getSarbRates(req, res)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalled()
  })

  it('should fall back when observations key is absent', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    })

    await getSarbRates(req, res)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalled()
  })

  it('should return 500 with fallback values when fetch throws', async () => {
    fetch.mockRejectedValue(new Error('Network timeout'))

    await getSarbRates(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      primeRate: 10.23,
      repoRate: 6.73,
      source: expect.stringContaining('Fallback'),
      warning: expect.any(String)
    }))
  })

  it('should include the API key and series ID in the request URL', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        observations: [{ value: '10.50', date: '2024-01-01' }]
      })
    })

    await getSarbRates(req, res)

    const calledUrl = fetch.mock.calls[0][0]
    expect(calledUrl).toContain('test-api-key')
    expect(calledUrl).toContain('IRLTLT01ZAA156N')
    expect(calledUrl).toContain('stlouisfed.org')
  })
})