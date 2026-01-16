export interface Coupon {
    id: string;
    threshold: number;
    discount: number;
    count: number;
}

export interface CouponUsage {
    couponId: string;
    count: number;
}

export interface OptimizationResult {
    totalOriginal: number;
    totalDiscount: number;
    finalPrice: number;
    solution: CouponUsage[];
    // We can also store the 'unused' counts for display if needed, 
    // but we can compute that from the input + solution.
}
