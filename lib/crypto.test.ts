import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { encryptToken, decryptToken } from './crypto'

const ORIGINAL_KEY = process.env.TOKEN_ENCRYPTION_KEY

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('hex')
})

afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.TOKEN_ENCRYPTION_KEY
  else process.env.TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY
})

describe('crypto', () => {
  it('encrypts and decrypts a token round-trip', () => {
    const plain = 'EAAGm0PX4ZCpsBABCDEFGHIJ1234567890_real-meta-token'
    const cipher = encryptToken(plain)
    expect(cipher).not.toEqual(plain)
    expect(cipher.split(':')).toHaveLength(3)
    expect(decryptToken(cipher)).toEqual(plain)
  })

  it('produces a different ciphertext each call (IV randomization)', () => {
    const plain = 'same-token'
    const a = encryptToken(plain)
    const b = encryptToken(plain)
    expect(a).not.toEqual(b)
    expect(decryptToken(a)).toEqual(plain)
    expect(decryptToken(b)).toEqual(plain)
  })

  it('throws on malformed ciphertext', () => {
    expect(() => decryptToken('not:a:valid:ciphertext')).toThrow()
    expect(() => decryptToken('only-one-part')).toThrow(/Invalid ciphertext format/)
  })

  it('throws when TOKEN_ENCRYPTION_KEY is missing', () => {
    const saved = process.env.TOKEN_ENCRYPTION_KEY
    delete process.env.TOKEN_ENCRYPTION_KEY
    try {
      expect(() => encryptToken('x')).toThrow(/TOKEN_ENCRYPTION_KEY/)
    } finally {
      process.env.TOKEN_ENCRYPTION_KEY = saved
    }
  })

  it('throws when TOKEN_ENCRYPTION_KEY has wrong length', () => {
    const saved = process.env.TOKEN_ENCRYPTION_KEY
    process.env.TOKEN_ENCRYPTION_KEY = 'abcd'
    try {
      expect(() => encryptToken('x')).toThrow(/64 hex characters/)
    } finally {
      process.env.TOKEN_ENCRYPTION_KEY = saved
    }
  })
})
