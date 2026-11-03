import { useEffect, useRef, useState } from 'react';
import { Modal } from '../Modal';

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

/** Retail product barcodes (EAN/UPC); QR codes are not food products. */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;
const SCAN_INTERVAL_MS = 250;

interface Detector {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}

/**
 * Android Chrome ships a native BarcodeDetector. iPhone Safari doesn't, so the ZXing
 * WebAssembly ponyfill is loaded on first use; its .wasm is served from this app, not a CDN.
 */
async function createDetector(): Promise<Detector> {
  const native = (globalThis as { BarcodeDetector?: { getSupportedFormats: () => Promise<string[]>; new (options: { formats: string[] }): Detector } }).BarcodeDetector;
  if (native !== undefined) {
    const supported = await native.getSupportedFormats();
    if (FORMATS.every((format) => supported.includes(format))) {
      return new native({ formats: [...FORMATS] });
    }
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } });
  return new BarcodeDetector({ formats: [...FORMATS] });
}

type Status = { kind: 'starting' } | { kind: 'scanning' } | { kind: 'error'; message: string };

function cameraErrorMessage(reason: unknown): string {
  const name = reason instanceof DOMException ? reason.name : '';
  if (name === 'NotAllowedError') return 'Camera access was blocked. Allow the camera for this app in your phone settings, or type the barcode below.';
  if (name === 'NotFoundError') return 'No camera found. Type the barcode below.';
  return 'The scanner could not start (it needs a connection the first time on iPhone). Type the barcode below.';
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The camera starts once per open scanner; always call the latest callback without restarting it.
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [status, setStatus] = useState<Status>({ kind: 'starting' });
  // Kept as text: barcodes can start with 0, which a number would drop.
  const [typedCode, setTypedCode] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const scanLoop = (detector: Detector, video: HTMLVideoElement) => {
      if (stopped) return;
      void detector.detect(video).then((codes) => {
        const code = codes[0]?.rawValue;
        if (code !== undefined && !stopped) {
          stop();
          onDetectedRef.current(code);
          return;
        }
        timer = window.setTimeout(() => scanLoop(detector, video), SCAN_INTERVAL_MS);
      });
    };

    // Camera permission and hardware are outside the app's control, so failures become a visible state.
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(
        async (media) => {
          stream = media;
          const video = videoRef.current;
          if (stopped || video === null) {
            stop();
            return;
          }
          video.srcObject = media;
          await video.play();
          const detector = await createDetector();
          setStatus({ kind: 'scanning' });
          scanLoop(detector, video);
        },
      )
      // Covers both a refused camera and a scanner engine that failed to load.
      .then(undefined, (reason: unknown) => {
        stop();
        setStatus({ kind: 'error', message: cameraErrorMessage(reason) });
      });
    return stop;
  }, []);

  return (
    <Modal title="Scan barcode" onClose={onClose}>
      <div className="scanner-frame">
        <video ref={videoRef} playsInline muted className="scanner-video" />
        <div className="scanner-guide" aria-hidden="true" />
      </div>
      <p className="muted small center-text">
        {status.kind === 'starting' && 'Starting camera…'}
        {status.kind === 'scanning' && 'Point the camera at the barcode.'}
        {status.kind === 'error' && status.message}
      </p>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (typedCode.length >= 8) onDetected(typedCode);
        }}
      >
        <input
          className="text-input"
          inputMode="numeric"
          aria-label="Barcode number"
          placeholder="Or type the barcode"
          value={typedCode}
          onChange={(event) => setTypedCode(event.target.value.replace(/\D/g, ''))}
        />
        <button type="submit" className="button button-secondary" disabled={typedCode.length < 8}>
          Look up
        </button>
      </form>
    </Modal>
  );
}
