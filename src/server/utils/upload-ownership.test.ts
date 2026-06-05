import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbState = vi.hoisted(() => ({
  uploads: [] as Array<{ id: string; url: string; userId: string; deletedAt: Date | null }>,
}))

const deleteFromBlobMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/storage/blob', () => ({
  deleteFromBlob: deleteFromBlobMock,
}))

vi.mock('@/server/db/schema', () => ({
  mediaUploads: {
    id: 'id',
    userId: 'userId',
    url: 'url',
    deletedAt: 'deletedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: (field: string, value: unknown) => ({ type: 'eq', field, value }),
  isNull: (field: string) => ({ type: 'isNull', field }),
  and: (...conditions: Array<{ type: string; field: string; value?: unknown }>) => ({ conditions }),
}))

vi.mock('@/server/db', () => ({
  db: {
    insert: () => ({
      values: (row: { url: string; userId: string }) => {
        dbState.uploads.push({ id: `upload-${dbState.uploads.length + 1}`, ...row, deletedAt: null })
        return Promise.resolve()
      },
    }),
    select: () => ({
      from: () => ({
        where: (query: { conditions: Array<{ type: string; field: string; value?: unknown }> }) => ({
          limit: () => {
            const url = query.conditions.find((condition) => condition.field === 'url')?.value
            const userId = query.conditions.find((condition) => condition.field === 'userId')?.value
            return Promise.resolve(
              dbState.uploads
                .filter((upload) => upload.url === url && upload.userId === userId && upload.deletedAt === null)
                .map((upload) => ({ id: upload.id }))
            )
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: { deletedAt: Date }) => ({
        where: (condition: { value: string }) => {
          const upload = dbState.uploads.find((row) => row.id === condition.value)
          if (upload) upload.deletedAt = values.deletedAt
          return Promise.resolve()
        },
      }),
    }),
  },
}))

import { deleteOwnedMedia, recordMediaUpload } from './upload-ownership'

describe('upload ownership', () => {
  beforeEach(() => {
    dbState.uploads = []
    deleteFromBlobMock.mockReset()
  })

  it('records the uploading user and allows that user to delete the file', async () => {
    deleteFromBlobMock.mockResolvedValue(true)

    await recordMediaUpload({
      userId: 'owner-1',
      url: 'https://blob.example/media/1.png',
      pathname: 'media/1.png',
      originalName: '1.png',
      mimeType: 'image/png',
      mediaType: 'image',
      fileSize: 123,
    })

    await expect(deleteOwnedMedia('https://blob.example/media/1.png', 'owner-1')).resolves.toEqual({ success: true })
    expect(deleteFromBlobMock).toHaveBeenCalledWith('https://blob.example/media/1.png')
    expect(dbState.uploads[0].deletedAt).toBeInstanceOf(Date)
  })

  it('refuses deletion when the requester is not the upload owner', async () => {
    await recordMediaUpload({
      userId: 'owner-1',
      url: 'https://blob.example/media/1.png',
      pathname: 'media/1.png',
      originalName: '1.png',
      mimeType: 'image/png',
      mediaType: 'image',
      fileSize: 123,
    })

    await expect(deleteOwnedMedia('https://blob.example/media/1.png', 'owner-2')).resolves.toMatchObject({
      success: false,
      code: 'NOT_FOUND_OR_NOT_OWNER',
    })
    expect(deleteFromBlobMock).not.toHaveBeenCalled()
  })
})
