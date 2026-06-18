import { useState, useCallback } from 'react'
import { Platform } from 'react-native'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system'
import { captureRef } from 'react-native-view-shot'
import { uploadFile } from '@/sia/upload'
import { addRecord } from '@/storage/records'
import { useSdk } from '@/context/SiaContext'
import { logger } from '@/logger'
import type { UploadRecord } from '@/sia/types'
import type { MediaType } from '@/sia/types'

type CaptureStatus = 'idle' | 'capturing' | 'uploading' | 'done' | 'error'

const MEDIA_DIR = FileSystem.documentDirectory + 'screenvault/'

function makeFilename(type: MediaType): string {
  const now = new Date()
  const ts = now.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')
  return type === 'screenshot' ? `Screenshot_${ts}.png` : `Recording_${ts}.mp4`
}

async function persistFile(tempUri: string, name: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true })
  const dest = MEDIA_DIR + name
  await FileSystem.copyAsync({ from: tempUri, to: dest })
  return dest
}

export function useScreenshot(viewRef: React.RefObject<any>) {
  const sdk = useSdk()
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [lastRecord, setLastRecord] = useState<UploadRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const takeScreenshot = useCallback(async () => {
    if (!sdk) {
      setError('Not connected to Sia')
      setStatus('error')
      return
    }
    setStatus('capturing')
    setError(null)
    logger.info('Screenshot', 'Capturing screen')
    try {
      const tempUri = await captureRef(viewRef, { format: 'png', quality: 1 })
      const name = makeFilename('screenshot')
      const localUri = await persistFile(tempUri, name)
      logger.info('Screenshot', 'Capture saved', { name })

      setStatus('uploading')
      const result = await uploadFile(sdk, localUri)
      const record: UploadRecord = {
        id: result.id,
        name,
        type: 'screenshot',
        size: result.size,
        createdAt: result.createdAt.getTime(),
        localUri,
      }
      await addRecord(record)
      setLastRecord(record)
      setStatus('done')
      logger.info('Screenshot', 'Screenshot saved to Sia', { id: result.id })
    } catch (err) {
      logger.error('Screenshot', 'Screenshot failed', err)
      setError(err instanceof Error ? err.message : 'Screenshot failed')
      setStatus('error')
    }
  }, [sdk, viewRef])

  return { takeScreenshot, status, lastRecord, error }
}

export function useScreenRecording() {
  const sdk = useSdk()
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [lastRecord, setLastRecord] = useState<UploadRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingName, setPendingName] = useState<string | null>(null)

  const startRecording = useCallback(async () => {
    if (!sdk) {
      setError('Not connected to Sia')
      setStatus('error')
      return
    }
    if (Platform.OS !== 'ios') {
      logger.warn('Recording', 'Screen recording attempted on non-iOS platform')
      setError('Screen recording is iOS only')
      return
    }
    logger.info('Recording', 'Starting screen recording')
    try {
      const { default: ScreenRecorder } = await import('expo-screen-recorder')
      await ScreenRecorder.startRecording()
      const name = makeFilename('recording')
      setPendingName(name)
      setIsRecording(true)
      setStatus('capturing')
      setError(null)
      logger.info('Recording', 'Screen recording started', { name })
    } catch (err) {
      logger.error('Recording', 'Failed to start recording', err)
      setError(err instanceof Error ? err.message : 'Could not start recording')
      setStatus('error')
    }
  }, [sdk])

  const stopRecording = useCallback(async () => {
    if (!sdk) {
      setError('Not connected to Sia')
      setStatus('error')
      return
    }
    logger.info('Recording', 'Stopping screen recording')
    try {
      const { default: ScreenRecorder } = await import('expo-screen-recorder')
      const tempUri = await ScreenRecorder.stopRecording()
      setIsRecording(false)
      setStatus('uploading')

      const name = pendingName ?? makeFilename('recording')
      const localUri = await persistFile(tempUri, name)
      logger.info('Recording', 'Recording saved', { name })

      const result = await uploadFile(sdk, localUri)
      const record: UploadRecord = {
        id: result.id,
        name,
        type: 'recording',
        size: result.size,
        createdAt: result.createdAt.getTime(),
        localUri,
      }
      await addRecord(record)
      setLastRecord(record)
      setStatus('done')
      logger.info('Recording', 'Recording saved to Sia', { id: result.id })
    } catch (err) {
      setIsRecording(false)
      logger.error('Recording', 'Recording upload failed', err)
      setError(err instanceof Error ? err.message : 'Recording upload failed')
      setStatus('error')
    }
  }, [sdk, pendingName])

  return { startRecording, stopRecording, isRecording, status, lastRecord, error }
}

export function useMediaPermission() {
  const [granted, setGranted] = useState(false)

  const request = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync()
    setGranted(status === 'granted')
    return status === 'granted'
  }, [])

  return { granted, request }
}
