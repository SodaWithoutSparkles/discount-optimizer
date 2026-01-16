import { useState, useEffect, useCallback } from 'react';
import type { Coupon } from '../types';

interface AppState {
    total: number;
    coupons: Coupon[];
}

export function useUrlState() {
    const [state, setState] = useState<AppState>({
        total: 0,
        coupons: []
    });

    // Load from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const totalParam = params.get('t');
        const couponsParam = params.get('c');

        let newTotal = 0;
        let newCoupons: Coupon[] = [];

        if (totalParam) {
            const parsed = parseFloat(totalParam);
            if (!isNaN(parsed)) newTotal = parsed;
        }

        if (couponsParam) {
            try {
                // Try to detect old format first (simple heuristic: contains :)
                if (couponsParam.includes(':')) {
                    // Legacy format support (optional based on user request "no need backward", but good for robustness if mixed)
                    // Actually user said "We dont need to be backward compatible."
                    // So I'll proceed with strictly new format, OR just fail on old format.
                    // But the code block must be replaced.
                    throw new Error("Old format not supported");
                }

                // New Format: Base64 URL Safe of JSON [[threshold, discount, count], ...]
                let base64 = couponsParam.replace(/-/g, '+').replace(/_/g, '/');
                // Pad with =
                while (base64.length % 4) {
                    base64 += '=';
                }

                const json = atob(base64);
                const data = JSON.parse(json);

                if (Array.isArray(data)) {
                    newCoupons = data.map((item: any, idx: number) => {
                        if (Array.isArray(item) && item.length === 3) {
                            return {
                                id: `c-${Date.now()}-${idx}`,
                                threshold: Number(item[0]),
                                discount: Number(item[1]),
                                count: Number(item[2])
                            };
                        }
                        return null;
                    }).filter((c): c is Coupon => c !== null);
                }
            } catch (e) {
                console.error("Failed to parse coupons", e);
            }
        }

        setState({ total: newTotal, coupons: newCoupons });
    }, []);

    // Update URL when state changes
    const updateState = useCallback((newState: AppState) => {
        setState(newState);
        const params = new URLSearchParams();
        if (newState.total > 0) {
            params.set('t', newState.total.toString());
        }

        if (newState.coupons.length > 0) {
            // Serialize
            const simplified = newState.coupons.map(c => [c.threshold, c.discount, c.count]);
            const json = JSON.stringify(simplified);
            const base64 = btoa(json);
            // Make URL safe
            const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            params.set('c', urlSafe);
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    }, []);

    return { state, updateState };
}
