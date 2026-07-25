'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Send, ImageOff, Building2, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useListAssignedDeliveriesQuery, useListDeliveryHistoryQuery } from '@/store/deliveryApi';
import { buildDeliveryMessages } from '@/lib/mockDeliveryMessages';
import { initials } from '@/lib/deliveryHelpers';

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function formatDay(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DeliveryMessagesPage() {
  const { data: assignedData, isLoading: assignedLoading } = useListAssignedDeliveriesQuery();
  const { data: historyData, isLoading: historyLoading } = useListDeliveryHistoryQuery();

  const isLoading = assignedLoading || historyLoading;
  const items = useMemo(() => [...(assignedData?.data || []), ...(historyData?.data || [])], [assignedData, historyData]);
  const threads = useMemo(() => buildDeliveryMessages(items, 12), [items]);

  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  // Delivery-partner replies sent this session, keyed by thread id — merged on top of each
  // thread's seeded conversation history for display, so a reply appears in the chat
  // immediately instead of only surfacing as a toast (same pattern as the Vendor portal's
  // Messages page — see frontend/app/vendor/messages/page.js).
  const [sentByThread, setSentByThread] = useState({});
  const scrollRef = useRef(null);

  const active = threads.find((t) => t.id === activeId) || threads[0];
  const activeMessages = useMemo(() => {
    if (!active) return [];
    return [...active.conversation, ...(sentByThread[active.id] || [])];
  }, [active, sentByThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeMessages.length, active?.id]);

  const handleSend = () => {
    if (!draft.trim() || !active) return;
    const message = { id: `local-${Date.now()}`, sender: 'me', text: draft.trim(), timestamp: new Date() };
    setSentByThread((prev) => ({ ...prev, [active.id]: [...(prev[active.id] || []), message] }));
    setDraft('');
    toast.success('Message sent.');
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-1" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
        <MessageSquare size={32} className="text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No conversations yet — accept a delivery to start coordinating with vendors and customers.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Coordination threads with vendors (pickup) and customers (drop-off) for your deliveries.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="glass" className="max-h-[36rem] overflow-y-auto p-2 lg:col-span-1">
          {threads.map((t) => {
            const extra = sentByThread[t.id];
            const lastText = extra?.length ? extra[extra.length - 1].text : t.lastMessage;
            const isVendor = t.counterpartType === 'vendor';
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                  (active?.id || threads[0].id) === t.id ? 'bg-brand-500/10' : 'hover:bg-slate-900/5 dark:hover:bg-white/5'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    isVendor ? 'bg-gradient-to-br from-accent-500 to-amber-500' : 'bg-gradient-to-br from-brand-500 to-accent-500'
                  }`}
                >
                  {initials(t.counterpartName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t.counterpartName}</p>
                    {t.unread && !extra?.length && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={isVendor ? 'accent' : 'brand'} className="!px-1.5 !py-0 !text-[10px]">
                      {isVendor ? <Building2 size={9} /> : <User size={9} />}
                      {isVendor ? 'Vendor' : 'Customer'}
                    </Badge>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{lastText}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </Card>

        <Card variant="glass" className="flex h-[36rem] flex-col p-0 lg:col-span-2">
          {active && (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200/70 p-4 dark:border-white/10">
                {active.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active.product.images[0]} alt={active.product.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ImageOff size={14} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{active.counterpartName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    Re: {active.product?.name} · {active.orderNumber}
                  </p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                <AnimatePresence initial={false}>
                  {activeMessages.map((msg, i) => {
                    const isMe = msg.sender === 'me';
                    const prev = activeMessages[i - 1];
                    const showDaySeparator = !prev || formatDay(prev.timestamp) !== formatDay(msg.timestamp);
                    return (
                      <div key={msg.id}>
                        {showDaySeparator && (
                          <div className="my-3 flex items-center justify-center">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
                              {formatDay(msg.timestamp)}
                            </span>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex max-w-[80%] flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm ${
                                isMe
                                  ? 'rounded-tr-sm bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-premium'
                                  : 'rounded-tl-sm bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="px-1 text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-200/70 p-3 dark:border-white/10">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a reply…"
                  className="focus-ring flex-1 rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <motion.button
                  type="button"
                  onClick={handleSend}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={!draft.trim()}
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-premium transition-shadow hover:shadow-glow disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
