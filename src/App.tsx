import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, Calculator, Share2 } from 'lucide-react';
import type { Coupon, OptimizationResult } from './types';
import { calculateOptimization } from './lib/optimizer';
import { useUrlState } from './hooks/useUrlState';

function App() {
  const { state, updateState } = useUrlState();
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Debounced calculation could be better, but for now instant
  useEffect(() => {
    if (state.total >= 0) {
      try {
        const res = calculateOptimization(state.coupons, state.total);
        setResult(res);
      } catch (e) {
        console.error(e);
      }
    }
  }, [state]);

  const addCoupon = () => {
    const newCoupon: Coupon = {
      id: `c-${Date.now()}`,
      threshold: 100,
      discount: 10,
      count: 1,
    };
    updateState({ ...state, coupons: [...state.coupons, newCoupon] });
  };

  const removeCoupon = (id: string) => {
    updateState({
      ...state,
      coupons: state.coupons.filter((c) => c.id !== id),
    });
  };

  const updateCoupon = (id: string, field: keyof Coupon, value: number) => {
    updateState({
      ...state,
      coupons: state.coupons.map((c) => {
        if (c.id === id) {
          return { ...c, [field]: value };
        }
        return c;
      }),
    });
  };

  const updateTotal = (val: number) => {
    updateState({ ...state, total: val });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFloatInput = (val: string): number => {
    if (val === '') return NaN;
    return parseFloat(val);
  };

  const handleIntInput = (val: string): number => {
    if (val === '') return NaN;
    return parseInt(val, 10);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight mb-2">Discount Optimizer</h1>
          <p className="text-gray-500">Calculate the optimal coupon combination.</p>
        </header>

        <main className="space-y-8">
          {/* Total Input Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cart Amount ($)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={isNaN(state.total) ? '' : state.total}
                onChange={(e) => updateTotal(handleFloatInput(e.target.value))}
                className="w-full pl-8 pr-4 py-3 text-xl font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </section>

          {/* Coupons Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <Tag className="w-5 h-5 text-blue-500" />
                Available Coupons
              </h2>
              <button
                onClick={addCoupon}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Coupon
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {state.coupons.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p>No coupons added yet.</p>
                  <button onClick={addCoupon} className="text-blue-500 hover:underline mt-2">Add your first coupon</button>
                </div>
              ) : (
                state.coupons.map((coupon) => (
                  <div key={coupon.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center group hover:bg-gray-50 transition-colors">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Spend ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={isNaN(coupon.threshold) ? '' : coupon.threshold}
                          onChange={(e) => updateCoupon(coupon.id, 'threshold', handleFloatInput(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Get Off ($)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">-</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={isNaN(coupon.discount) ? '' : coupon.discount}
                            onChange={(e) => updateCoupon(coupon.id, 'discount', handleFloatInput(e.target.value))}
                            className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded-md focus:ring-green-500 focus:border-green-500 outline-none text-sm font-medium text-green-700"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={isNaN(coupon.count) ? '' : coupon.count}
                          onChange={(e) => updateCoupon(coupon.id, 'count', handleIntInput(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeCoupon(coupon.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all mt-4 sm:mt-0"
                      title="Remove Coupon"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Results Section */}
          {result && (state.total > 0) && (
            <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl text-white overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-6">
                  <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Final Price To Pay</h3>
                    <div className="text-5xl font-bold tracking-tight text-white">
                      ${result.finalPrice.toFixed(2)}
                    </div>
                    <div className="mt-2 text-green-400 font-medium flex items-center gap-2">
                      <span className="bg-green-500/20 px-2 py-0.5 rounded text-sm">Saved ${result.totalDiscount.toFixed(2)}</span>
                      <span className="text-gray-400 text-sm">from ${result.totalOriginal.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    {copied ? 'Link Copied!' : 'Share Result'}
                  </button>
                </div>

                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    Optimal Strategy
                  </h4>

                  {result.solution.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No coupons applied. (Either input is zero or no coupons fit)</p>
                  ) : (
                    <ul className="space-y-3">
                      {result.solution.map((usage, idx) => {
                        const original = state.coupons.find(c => c.id === usage.couponId);
                        if (!original) return null;
                        return (
                          <li key={idx} className="flex justify-between items-center text-sm border-b border-white/10 pb-2 last:border-0 last:pb-0">
                            <span className="text-gray-300">
                              <span className="text-white font-bold mr-2">{usage.count}x</span>
                              Use coupon
                              <span className="mx-1 text-blue-300">Spend ${original.threshold} / Get ${original.discount} Off</span>
                            </span>
                            <span className="text-green-400 font-mono">-${(original.discount * usage.count).toFixed(2)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          <footer className="text-center text-gray-400 text-sm py-8">
            <p>Discount Optimizer &copy; 2026.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
