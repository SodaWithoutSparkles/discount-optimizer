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
    warning?: string;
}
