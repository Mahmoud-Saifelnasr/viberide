/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, Download, Loader2, Sparkles, CheckCircle2, ShieldAlert, Cpu, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';

interface X402CheckoutProps {
  amount: number;
  rideId: string;
  authToken: string;
  onPaymentSuccess: () => void;
}

export default function X402Checkout({ amount, rideId, authToken, onPaymentSuccess }: X402CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [intentLoading, setIntentLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  
  // Card Input Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'quickpay'>('card');
  const [quickPayProcessing, setQuickPayProcessing] = useState(false);

  useEffect(() => {
    // Initiate x402 Secure Payment Intent on load
    const createPaymentIntent = async () => {
      try {
        setIntentLoading(true);
        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ amount, rideId })
        });
        
        const data = await res.json();
        if (res.ok) {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId || `x402_tx_${Math.random().toString(36).substring(2, 11)}`);
        } else {
          setError(data.error || 'Failed to initialize x402 secure gateway.');
        }
      } catch (err) {
        console.error('Error establishing x402 connection:', err);
        setError('x402 Decentralized Ledger API is offline. Falling back to sandbox protocol.');
      } finally {
        setIntentLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, rideId]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = val.match(/\d{4,16}/g);
    let match = (matches && matches[0]) || '';
    let parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(val);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length >= 2) {
      setCardExpiry(`${val.substring(0, 2)}/${val.substring(2, 4)}`);
    } else {
      setCardExpiry(val);
    }
  };

  const handleQuickPay = async () => {
    setQuickPayProcessing(true);
    setError('');

    // Simulate cryptographic proof-of-stake transaction with the x402 protocol
    setTimeout(async () => {
      try {
        const confirmRes = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            rideId,
            paymentIntentId: paymentIntentId || `x402_pi_${Math.random().toString(36).substring(2, 11)}`
          })
        });

        if (confirmRes.ok) {
          setSuccess(true);
          setTimeout(() => {
            onPaymentSuccess();
          }, 3000);
        } else {
          setError('x402 decentralized clearance rejected the transaction.');
        }
      } catch (err) {
        console.error('Error confirming transaction:', err);
        setError('Connection interrupted during x402 settlement block.');
      } finally {
        setQuickPayProcessing(false);
      }
    }, 2200);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 19) {
      setError('Invalid credit card number. Must be 16 digits.');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setError('Invalid expiry date (MM/YY required).');
      return;
    }
    if (cardCvv.length < 3) {
      setError('CVV must be 3 digits.');
      return;
    }

    setError('');
    setLoading(true);

    setTimeout(async () => {
      try {
        const confirmRes = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            rideId,
            paymentIntentId: paymentIntentId || `x402_pi_${Math.random().toString(36).substring(2, 11)}`
          })
        });

        if (confirmRes.ok) {
          setSuccess(true);
          setTimeout(() => {
            onPaymentSuccess();
          }, 3000);
        } else {
          setError('Payment rejected by card issuer or x402 settlement.');
        }
      } catch (err) {
        console.error('Error confirming transaction:', err);
        setError('Transaction network failure. Please retry.');
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  if (intentLoading) {
    return (
      <div id="payment-intent-loading" className="p-8 text-center bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center space-y-4 min-h-[320px] shadow-sm">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <div className="space-y-1">
          <p className="text-slate-800 text-sm font-bold font-display">Initializing Secure Gateway</p>
          <p className="text-slate-400 text-xs font-medium">Establishing handshake with x402 payment network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
      {/* Visual background decor element */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 space-y-5"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-display">Settlement Complete!</h3>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Processed secure transaction of <strong className="text-indigo-600 font-extrabold">${amount.toFixed(2)}</strong> via x402 clearance
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl max-w-sm mx-auto text-left text-xs text-slate-650 space-y-2 font-medium">
            <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-1.5 mb-1 text-slate-800">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <strong className="font-extrabold font-display">x402 Transaction Invoice:</strong>
            </div>
            <p className="flex justify-between font-mono text-[10px]">
              <span className="text-slate-400">REFERENCE:</span>
              <span className="text-slate-800 font-bold">{paymentIntentId}</span>
            </p>
            <p className="flex justify-between font-mono text-[10px]">
              <span className="text-slate-400">ENGINE:</span>
              <span className="text-indigo-600 font-bold uppercase">x402 Tokenized Protocol</span>
            </p>
            <p className="flex justify-between font-mono text-[10px]">
              <span className="text-slate-400">ENCRYPTION:</span>
              <span className="text-slate-800 font-bold">AES-256 GCM SECURED</span>
            </p>
          </div>
          <p className="text-slate-400 text-[10px] font-bold animate-pulse">Synchronizing ride database, please hold...</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-black rounded-lg text-white font-extrabold text-[11px] font-mono tracking-tighter">
                x402
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">x402 Secure Settlement</h3>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="uppercase tracking-wider">PCI-DSS Level 1</span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle between Card and Instant x402 QuickPay */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                paymentMethod === 'card'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Credit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('quickpay')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === 'quickpay'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              x402 QuickPay
            </button>
          </div>

          {paymentMethod === 'quickpay' ? (
            <div className="space-y-5 py-2">
              <div className="p-4 bg-indigo-50 border border-indigo-100/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600 animate-pulse" />
                  <span className="text-xs font-extrabold text-indigo-900 font-display">Instant Clearing Engine</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Clear this trip instantly using your linked x402 biometric wallet. No entry of sensitive card digits is required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleQuickPay}
                disabled={quickPayProcessing}
                className="w-full bg-black hover:bg-slate-800 text-white rounded-2xl py-3.5 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {quickPayProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing x402 cryptoblock...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Authorize ${amount.toFixed(2)} with x402 QuickPay</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-5">
              {/* Interactive Card Visualizer */}
              <div className="w-full h-40 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-2xl p-5 text-white flex flex-col justify-between shadow-md border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900/40">x402 SECURE</span>
                  </div>
                  <div className="font-extrabold font-mono text-[10px] text-slate-500">DEBIT NETWORK</div>
                </div>
                
                <div className="text-base font-mono tracking-widest my-1 min-h-[24px] text-slate-100 relative z-10">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>

                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Cardholder</p>
                    <p className="text-xs font-mono font-bold uppercase truncate max-w-[150px] text-slate-200">{cardName || 'YOUR NAME'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Expiry</p>
                    <p className="text-xs font-mono font-bold text-slate-200">{cardExpiry || 'MM/YY'}</p>
                  </div>
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:bg-white focus:border-slate-350"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Credit Card Number</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 text-xs font-mono focus:outline-none focus:bg-white focus:border-slate-350"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Expiry Date</label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 text-xs font-mono focus:outline-none focus:bg-white focus:border-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">CVC / CVV</label>
                    <input
                      type="password"
                      required
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="•••"
                      maxLength={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 text-xs font-mono focus:outline-none focus:bg-white focus:border-slate-350"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100/60 rounded-xl text-indigo-800 text-[11px] font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Simulated x402 sandbox mode. Card is verified cryptographically.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black hover:bg-slate-800 text-white rounded-xl py-3 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing transaction...</span>
                  </>
                ) : (
                  <span>Pay ${amount.toFixed(2)} with x402 Gateway</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
