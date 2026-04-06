import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraFacingMode = 'user' | 'environment';
export type CameraPermissionState = 'idle' | 'pending' | 'granted' | 'denied';

interface UseCameraOptions {
  active: boolean;
  preferredFacingMode?: CameraFacingMode;
}

export function useCamera({
  active,
  preferredFacingMode = 'user',
}: UseCameraOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>(preferredFacingMode);

  const attachStream = useCallback(async (nextStream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = nextStream;
    try {
      await video.play();
    } catch {
      setError('Camera preview could not start automatically. Tap anywhere on the preview and retry.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (nextFacingMode = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setError('This browser does not support secure camera access for live Video KYC.');
      return;
    }

    setPermissionState('pending');
    setError(null);
    stopCamera();

    const baseConstraints: MediaTrackConstraints = {
      facingMode: { ideal: nextFacingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: baseConstraints,
      });

      streamRef.current = nextStream;
      setStream(nextStream);
      setFacingMode(nextFacingMode);
      setPermissionState('granted');
      await attachStream(nextStream);
      return;
    } catch {
      if (nextFacingMode === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          setFacingMode('user');
          setPermissionState('granted');
          await attachStream(fallbackStream);
          return;
        } catch {
          // Fall through to shared error below.
        }
      }
    }

    setPermissionState('denied');
    setError('Camera permission was denied or no usable camera is available for this device.');
  }, [attachStream, facingMode, stopCamera]);

  const toggleFacingMode = useCallback(async () => {
    const nextFacingMode: CameraFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacingMode);

    if (active) {
      await startCamera(nextFacingMode);
    }
  }, [active, facingMode, startCamera]);

  // Keep a stable ref to startCamera so the mount effect doesn't re-fire
  // every time facingMode changes (which would cause an infinite stop/restart loop).
  const startCameraRef = useRef(startCamera);
  useEffect(() => { startCameraRef.current = startCamera; });

  useEffect(() => {
    if (!active) return;

    const videoElement = videoRef.current;
    const timeoutId = window.setTimeout(() => {
      void startCameraRef.current(preferredFacingMode);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, preferredFacingMode]);

  return {
    videoRef,
    stream,
    error,
    facingMode,
    permissionState,
    startCamera,
    stopCamera,
    toggleFacingMode,
  };
}
