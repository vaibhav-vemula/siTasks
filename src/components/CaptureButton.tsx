import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native'

type Props = {
  label: string
  icon: string
  loading?: boolean
  active?: boolean
  onPress: () => void
}

export default function CaptureButton({ label, icon, loading = false, active = false, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, active && styles.btnActive]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: '#1a8cff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  btnActive: {
    backgroundColor: '#e53935',
  },
  icon: { fontSize: 28 },
  label: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
