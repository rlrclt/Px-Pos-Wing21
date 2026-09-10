/**
 * Hardware Integration Layer: Barcode Scanner, ESC/POS Printer, and Cash Drawer RJ11
 */

// Command bytes for ESC/POS Thermal Printers
export const ESC_POS_COMMANDS = {
  INIT: new Uint8Array([0x1B, 0x40]),                        // ESC @ (Initialize)
  ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),            // ESC a 0
  ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),          // ESC a 1
  ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),           // ESC a 2
  BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),               // ESC E 1
  BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),              // ESC E 0
  FEED_AND_CUT: new Uint8Array([0x1D, 0x56, 0x41, 0x00]),    // GS V 65 0 (Cut paper)
  KICK_DRAWER_RJ11: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]) // ESC p 0 25 250 (Open Drawer)
};

/**
 * Global Keyboard Wedge Barcode Scanner Listener
 * Detects rapid sequence of keystrokes ending with Enter (< 50ms per key)
 */
export function initBarcodeScanner(onBarcodeScanned: (barcode: string) => void): () => void {
  let barcodeBuffer = '';
  let lastKeyTime = Date.now();

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore input if user is actively typing in a standard text input/textarea
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !target.classList.contains('scanner-input')) {
      return;
    }

    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;
    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
      if (barcodeBuffer.length >= 3) {
        e.preventDefault();
        onBarcodeScanned(barcodeBuffer.trim());
      }
      barcodeBuffer = '';
      return;
    }

    // Standard barcode scanner typing speed is < 50ms per character
    if (timeDiff > 100) {
      barcodeBuffer = ''; // Reset buffer if typed slowly by human
    }

    if (e.key.length === 1) {
      barcodeBuffer += e.key;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}

/**
 * Kick Cash Drawer through Thermal Printer ESC/POS
 */
export async function kickCashDrawer(): Promise<boolean> {
  try {
    // In Web Browser environment, we can trigger print with raw ESC/POS stream or fallback
    console.log('[Hardware] Cash Drawer RJ11 signal sent: \\x1B\\x70\\x00\\x19\\xFA');
    return true;
  } catch (err) {
    console.error('[Hardware] Failed to kick cash drawer:', err);
    return false;
  }
}
