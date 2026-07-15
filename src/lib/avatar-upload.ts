export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export interface AvatarUploadInput {
  fileData: string
  fileName: string
  mimeType: string
  fileSize: number
}

export async function uploadAvatarFile(
  file: File,
  upload: (input: AvatarUploadInput) => Promise<string>,
): Promise<string> {
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Avatar must be 2MB or smaller.')

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  })
  const fileData = dataUrl.split(',')[1]
  if (!fileData) throw new Error('Failed to read file.')

  return upload({ fileData, fileName: file.name, mimeType: file.type, fileSize: file.size })
}