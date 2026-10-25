export interface MidtransSnapResult {
  status_code?: string
  status_message?: string
  transaction_id?: string
  order_id?: string
  gross_amount?: string
  payment_type?: string
  transaction_time?: string
  transaction_status?: string
  fraud_status?: string
  va_numbers?: Array<{ bank: string; va_number: string }>
  permata_va_number?: string
  bill_key?: string
  biller_code?: string
  payment_code?: string
  pdf_url?: string
}

export interface MidtransSnapCallbacks {
  onSuccess?: (result: MidtransSnapResult) => void
  onPending?: (result: MidtransSnapResult) => void
  onError?: (result: MidtransSnapResult) => void
  onClose?: () => void
}

export interface MidtransSnapInstance {
  pay: (snapToken: string, callbacks?: MidtransSnapCallbacks) => void
  hide?: () => void
}

declare global {
  interface Window {
    snap?: MidtransSnapInstance
  }
}

let snapScriptPromise: Promise<MidtransSnapInstance> | null = null

export function loadMidtransSnap(
  clientKey: string,
  isProduction = false
): Promise<MidtransSnapInstance> {
  if (typeof window !== 'undefined' && window.snap && typeof window.snap.pay === 'function') {
    return Promise.resolve(window.snap)
  }

  if (snapScriptPromise) {
    return snapScriptPromise
  }

  snapScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('midtrans-snap-script') as HTMLScriptElement | null
    if (existingScript) {
      existingScript.remove()
    }

    const script = document.createElement('script')
    script.id = 'midtrans-snap-script'
    script.src = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)
    script.async = true

    script.onload = () => {
      if (window.snap && typeof window.snap.pay === 'function') {
        resolve(window.snap)
      } else {
        snapScriptPromise = null
        reject(new Error('Midtrans Snap SDK berhasil dimuat tetapi window.snap tidak tersedia'))
      }
    }

    script.onerror = () => {
      snapScriptPromise = null
      reject(new Error('Gagal memuat script Midtrans Snap dari server Midtrans'))
    }

    document.body.appendChild(script)
  })

  return snapScriptPromise
}

export function getMidtransSimulatorInfo(
  paymentType?: string,
  vaBank?: string
): { label: string; simulatorUrl: string } {
  const bank = (vaBank || '').toLowerCase()
  switch (paymentType) {
    case 'bank_transfer':
      if (bank === 'bca') {
        return {
          label: 'BCA Virtual Account',
          simulatorUrl: 'https://simulator.sandbox.midtrans.com/bca/va/index',
        }
      }
      if (bank === 'bni') {
        return {
          label: 'BNI Virtual Account',
          simulatorUrl: 'https://simulator.sandbox.midtrans.com/bni/va/index',
        }
      }
      if (bank === 'bri') {
        return {
          label: 'BRI Virtual Account',
          simulatorUrl: 'https://simulator.sandbox.midtrans.com/bri/va/index',
        }
      }
      if (bank === 'cimb') {
        return {
          label: 'CIMB Virtual Account',
          simulatorUrl: 'https://simulator.sandbox.midtrans.com/cimb/va/index',
        }
      }
      return {
        label: `Virtual Account ${bank ? bank.toUpperCase() : 'Bank'}`,
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/bca/va/index',
      }
    case 'permata':
      return {
        label: 'Permata Virtual Account',
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/permata/va/index',
      }
    case 'echannel':
      return {
        label: 'Mandiri Bill Payment',
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/mandiri/bill/index',
      }
    case 'qris':
      return {
        label: 'QRIS Midtrans',
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/v2/qris/index',
      }
    case 'gopay':
      return {
        label: 'GoPay / QRIS',
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/v2/qris/index',
      }
    case 'cstore':
      return {
        label: 'Gerai Retail (Indomaret / Alfamart)',
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/indomaret/index',
      }
    case 'credit_card':
      return {
        label: 'Kartu Kredit / Debit',
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/',
      }
    default:
      return {
        label: 'Midtrans Sandbox Simulator',
        simulatorUrl: 'https://simulator.sandbox.midtrans.com/bca/va/index',
      }
  }
}
