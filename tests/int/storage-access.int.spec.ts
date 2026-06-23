import { describe, expect, it, vi } from 'vitest'

import { ensureStorageAccess } from '@/lib/auth/storage-access'

describe('embedded storage access', () => {
  it('requests access when the app is embedded', async () => {
    const requestAccess = vi.fn().mockResolvedValue(undefined)

    await expect(
      ensureStorageAccess({ embedded: true, requestAccess }),
    ).resolves.toBe(true)
    expect(requestAccess).toHaveBeenCalledOnce()
  })

  it('continues when the browser rejects the request', async () => {
    await expect(
      ensureStorageAccess({
        embedded: true,
        requestAccess: vi.fn().mockRejectedValue(new Error('denied')),
      }),
    ).resolves.toBe(false)
  })

  it('does not request storage access in a top-level window', async () => {
    const requestAccess = vi.fn()

    await expect(
      ensureStorageAccess({ embedded: false, requestAccess }),
    ).resolves.toBe(false)
    expect(requestAccess).not.toHaveBeenCalled()
  })
})
