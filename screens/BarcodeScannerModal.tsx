import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera'

type BarcodeScannerModalProps = {
  visible: boolean
  onClose: () => void
  onBarcodeScanned: (barcode: string) => Promise<void> | void
}

export default function BarcodeScannerModal({
  visible,
  onClose,
  onBarcodeScanned,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions()
  const [hasScanned, setHasScanned] = useState(false)
  const [lookingUpFood, setLookingUpFood] = useState(false)

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (hasScanned || lookingUpFood) {
      return
    }

    setHasScanned(true)
    setLookingUpFood(true)

    try {
      await onBarcodeScanned(result.data)
    } catch (error: any) {
      console.error('Barcode lookup error:', error)

      Alert.alert(
        'Could not find food',
        error?.message ??
          'This barcode was scanned, but food information could not be found.'
      )

      setHasScanned(false)
    } finally {
      setLookingUpFood(false)
    }
  }

  function handleClose() {
    setHasScanned(false)
    setLookingUpFood(false)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Scan food barcode</Text>

        {!permission ? (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color="#1E5C35" />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centeredContent}>
            <Text style={styles.permissionText}>
              BiteWise needs camera access to scan food barcodes.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void requestPermission()}
            >
              <Text style={styles.primaryButtonText}>Allow Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                }}
                onBarcodeScanned={
                  hasScanned ? undefined : handleBarcodeScanned
                }
              />

              <View pointerEvents="none" style={styles.scanFrame} />

              {lookingUpFood ? (
                <View style={styles.lookupOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.lookupText}>
                    Looking up food details...
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.helpText}>
              Hold the barcode inside the frame. Make sure there is good lighting.
            </Text>
          </>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5FAF6',
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  title: {
    color: '#16281D',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  centeredContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  permissionText: {
    color: '#5C7267',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 18,
    textAlign: 'center',
  },
  cameraContainer: {
    backgroundColor: '#16281D',
    borderRadius: 18,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    borderColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 3,
    height: 150,
    left: '10%',
    position: 'absolute',
    top: '40%',
    width: '80%',
  },
  lookupOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  lookupText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  helpText: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  cancelButtonText: {
    color: '#B3261E',
    fontSize: 15,
    fontWeight: '800',
  },
})