const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    attachments: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    category: { type: String, enum: ['order', 'payment', 'product', 'technical', 'other'], default: 'other' },
    description: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    messages: [ticketMessageSchema],
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
