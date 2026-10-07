import mongoose from 'mongoose'

const repaymentSchema = new mongoose.Schema(
  { amount: { type: Number, required: true, min: 1 }, date: { type: Date, default: Date.now } },
  { _id: false }
)

// Money lent out. Loans are never deleted, only their status changes.
const loanSchema = new mongoose.Schema(
  {
    personName: { type: String, required: [true, 'Person name is required.'], trim: true, maxlength: 100 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    amount: { type: Number, required: true, min: [1, 'Enter the loan amount.'] },
    amountReceived: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending', index: true },
    dueDate: { type: String, default: '' }, // YYYY-MM-DD
    notes: { type: String, default: '', trim: true, maxlength: 500 },
    payments: { type: [repaymentSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
)

export default mongoose.model('Loan', loanSchema)