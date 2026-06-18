import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native'
import type { UploadRecord } from '@/sia/types'

type Status = 'idle' | 'capturing' | 'uploading' | 'done' | 'error'

type Props = {
  screenshotStatus: Status
  screenshotRecord: UploadRecord | null
  screenshotError: string | null
  screenshotUri: string | null
  recordingStatus: Status
  recordingRecord: UploadRecord | null
  recordingError: string | null
  recordingUri: string | null
}

function StatusRow({
  status,
  record,
  error,
  localUri,
}: {
  status: Status
  record: UploadRecord | null
  error: string | null
  localUri: string | null
}) {
  if (status === 'idle' && !record) return null

  const uri = record?.localUri ?? localUri
  const name = record?.name ?? (record?.type === 'screenshot' ? 'Screenshot' : 'Recording')

  return (
    <View style={styles.row}>
      {uri && record?.type === 'screenshot' && (
        <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
      )}
      {record?.type === 'recording' && (
        <View style={[styles.thumb, styles.videoThumb]}>
          <Text style={styles.videoThumbIcon}>🎥</Text>
        </View>
      )}
      {!record && (uri ? (
        <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.placeholderThumb]} />
      ))}

      <View style={styles.rowContent}>
        <Text style={styles.fileName} numberOfLines={1}>{name}</Text>

        {(status === 'capturing' || status === 'uploading') && (
          <View style={styles.statusLine}>
            <ActivityIndicator size="small" color="#1a8cff" style={styles.spinner} />
            <Text style={styles.statusText}>
              {status === 'capturing' ? 'Capturing…' : 'Uploading to Sia…'}
            </Text>
          </View>
        )}
        {status === 'done' && record && (
          <Text style={styles.doneText}>✓ Saved to Sia</Text>
        )}
        {status === 'error' && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  )
}

export default function UploadStatus({
  screenshotStatus,
  screenshotRecord,
  screenshotError,
  screenshotUri,
  recordingStatus,
  recordingRecord,
  recordingError,
  recordingUri,
}: Props) {
  const hasContent =
    screenshotStatus !== 'idle' ||
    screenshotRecord !== null ||
    recordingStatus !== 'idle' ||
    recordingRecord !== null

  if (!hasContent) return null

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Upload Status</Text>
      <StatusRow
        status={screenshotStatus}
        record={screenshotRecord}
        error={screenshotError}
        localUri={screenshotUri}
      />
      <StatusRow
        status={recordingStatus}
        record={recordingRecord}
        error={recordingError}
        localUri={recordingUri}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f6ff',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#dde',
  },
  videoThumb: {
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbIcon: { fontSize: 22 },
  placeholderThumb: { backgroundColor: '#ccd' },
  rowContent: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '600', color: '#222', marginBottom: 2 },
  statusLine: { flexDirection: 'row', alignItems: 'center' },
  spinner: { marginRight: 4 },
  statusText: { fontSize: 12, color: '#666' },
  doneText: { fontSize: 12, color: '#22a55a', fontWeight: '500' },
  errorText: { fontSize: 12, color: '#c00' },
})
