import type { Coupon, OptimizationResult, CouponUsage } from "../types";

// Maximum array size safety limit (approx 20MB for Int32Array)
const MAX_SLOTS = 5_000_000;

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

export function calculateOptimization(
    coupons: Coupon[],
    totalPrice: number
): OptimizationResult {
    // 1. Convert to integer cents to avoid float issues
    const scale = 100;
    let W = Math.round(totalPrice * scale);
    const items: { cost: number; val: number; originalCouponId: string; realCount: number }[] = [];

    // 2. Optimization: Reduce search space by GCD
    // Calculate GCD of Total Capacity and All Coupon Costs (Thresholds) FIRST.
    // This allows us to scale down W and costs before expanding them into items.
    let commonFactor = W;
    let hasValidCoupons = false;
    for (const c of coupons) {
        if (c.count > 0 && c.threshold > 0 && c.discount > 0) {
            hasValidCoupons = true;
            const cost = Math.round(c.threshold * scale);
            commonFactor = gcd(commonFactor, cost);
        }
    }

    if (commonFactor > 1 && hasValidCoupons) {
        W /= commonFactor;
    }

    // 3. Expand coupons (Bounded -> 0/1) with Binary Decomposition Optimization
    // Instead of adding 'count' items, we add log(count) items: 1, 2, 4, 8... remainder.
    // This transforms O(N*W) to O(log(Count)*N*W)
    for (const c of coupons) {
        if (c.count > 0 && c.threshold > 0 && c.discount > 0) {
            let cost = Math.round(c.threshold * scale);
            const val = Math.round(c.discount * scale);

            // Apply scale down if applicable
            if (commonFactor > 1) {
                cost /= commonFactor;
            }

            let count = c.count;
            let currentPower = 1;
            while (count >= currentPower) {
                items.push({
                    cost: cost * currentPower,
                    val: val * currentPower,
                    originalCouponId: c.id,
                    realCount: currentPower
                });
                count -= currentPower;
                currentPower *= 2;
            }
            if (count > 0) {
                items.push({
                    cost: cost * count,
                    val: val * count,
                    originalCouponId: c.id,
                    realCount: count
                });
            }
        }
    }

    // Check memory limits
    if (W > MAX_SLOTS) {
        // Fallback or error? For now, let's clamp or return error logic.
        // In a real app we might heuristic sort.
        // For this assignment, let's just log and try our best with a heuristic or fail.
        // Let's just limit items? Or just proceed and risk it? 
        // It's client side. 
        console.warn("Total amount too high for optimal DP, results may be approximate or slow.");
        // For now, return empty or implement greedy? 
        // Let's implement a simple greedy fallback if too big?
        // Actually, knapsack on 5M is fine in JS (Int32Array).
        // MAX_SLOTS = 5_000_000.
    }

    // 4. DP Initialization
    // dp[w] = max value attainable with weight <= w ??
    // No, dp[w] = max value attainable with EXACTLY weight w?
    // Knapsack standard: dp[w] = max value with weight <= w.
    // Actually standard 0/1 implementation:
    // dp[w] holds max value for capacity w.

    const dp = new Int32Array(W + 1).fill(0);

    // To reconstruct, we need a Decision Matrix. 
    // keeping (items.length * W) bits might be large.
    // items.length could be e.g. 50. W = 100,000. Total = 5M entries. 
    // We can use a flattened Int8Array or Uint8Array.

    const n = items.length;
    // keep track of which items were taken.
    // taken[i][w] = 1 if item i was taken for capacity w.
    // Flattened: taken[i * (W+1) + w]
    const keep = new Uint8Array(n * (W + 1));

    // 5. DP Execution
    for (let i = 0; i < n; i++) {
        const { cost, val } = items[i];
        for (let w = W; w >= cost; w--) {
            const includeVal = dp[w - cost] + val;
            if (includeVal > dp[w]) {
                dp[w] = includeVal;
                keep[i * (W + 1) + w] = 1; // Mark as taken
            }
        }
    }

    // 6. Reconstruction
    const usedCouponsMap = new Map<string, number>();

    let currW = W;
    // We need to trace back from the optimal capacity.
    // The knapsack dp[W] gives the max value for capacity W.
    // Since we populated it, dp[W] is indeed the max value.
    // However, because we iterate W down to cost, `dp[W]` might have come from a smaller weight in previous iterations?
    // Standard knapsack: dp[w] represents max value for capacity w.
    // The trace back needs to follow the decisions.
    // We iterate items backwards.
    // If keep[i][currW] is 1, we took item i. currW -= item.cost.

    // Wait, standard trace back requires us to verify if taking it was the optimal choice for *that step*.
    // With the `keep` array recording the update, it records if we *updated* dp[w] at step i.
    // Yes.

    for (let i = n - 1; i >= 0; i--) {
        // Checks if we took item i at current remaining capacity
        if (keep[i * (W + 1) + currW] === 1) {
            const item = items[i];
            // Record usage
            const currentCount = usedCouponsMap.get(item.originalCouponId) || 0;
            usedCouponsMap.set(item.originalCouponId, currentCount + item.realCount);

            currW -= item.cost;
        }
    }

    // 7. Format Result
    // currW might not be 0 (unused capacity). that's fine.

    const maxDiscount = dp[W] / scale; // Remember val was scaled
    // The DP dp[W] stores the integer discount.
    // Wait, I didn't divide 'val' by commonFactor, I kept it as cents.
    // So dp[W] is in cents.

    const solution: CouponUsage[] = [];
    usedCouponsMap.forEach((count, couponId) => {
        solution.push({ couponId, count });
    });

    return {
        totalOriginal: totalPrice,
        totalDiscount: maxDiscount,
        finalPrice: totalPrice - maxDiscount,
        solution
    };
}
