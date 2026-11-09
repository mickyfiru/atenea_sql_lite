import NativeAteneaBridge from '../../specs/NativeAteneaBridge';

export function getJavaBridgeDiagnostic(): string {
  if (!NativeAteneaBridge) {
    throw new Error('El puente Java requiere una compilación nativa de ATENEA para Android.');
  }

  return NativeAteneaBridge.getDiagnosticMessage();
}
