import Counter from '../models/Counter.js'

// Atomic counter, so two sales at the same moment never get the same number.
export async function nextInvoiceNo() {
  const c = await Counter.findOneAndUpdate({ _id: 'invoice' }, { $inc: { seq: 1 } }, { new: true, upsert: true })
  return 'INV-' + String(c.seq).padStart(4, '0')
}