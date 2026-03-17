import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserProfile {
    name: string;
    email: string;
    address: string;
    phone: string;
    accountType: string; // "buyer" | "seller" | "admin"
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface BkashConfig {
    isSandbox: boolean;
    username: string;
    password: string;
    appKey: string;
    appSecret: string;
}
export interface NagadConfig {
    isSandbox: boolean;
    merchantID: string;
    merchantPrivateKey: string;
}
export interface Order {
    status: string;
    total: bigint;
    paymentMethod: string;
    createdAt: bigint;
    orderId: string;
    items: Array<CartItem>;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface DashboardStats {
    totalProducts: bigint;
    totalOrders: bigint;
    outOfStockProducts: bigint;
    totalRevenue: bigint;
}
export interface OrderStatus {
    status: string;
    user: Principal;
    orderId: string;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface CartItem {
    productId: string;
    quantity: bigint;
}
export interface AdminOrder {
    orders: Array<Order>;
    user: Principal;
}
export interface Product {
    id: string;
    inStock: boolean;
    name: string;
    description: string;
    imageUrl?: string;
    category: Category;
    requiresPrescription: boolean;
    price: bigint;
    sellerId?: Principal;
}
export interface Supplier {
    id: string;
    name: string;
    contact: string;
    address: string;
    sellerId: Principal;
    commissionRate: bigint;
}
export interface DropshippingOrder {
    id: string;
    buyerOrderId: string;
    supplierId: string;
    sellerId: Principal;
    items: Array<CartItem>;
    total: bigint;
    status: string; // pending | sent_to_supplier | supplier_confirmed | fulfilled | cancelled
    createdAt: bigint;
    notes: string;
}
export enum Category {
    pharmacy = "pharmacy",
    books = "books",
    fashion = "fashion",
    electronics = "electronics"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addProduct(product: Product): Promise<void>;
    addSupplier(supplier: Supplier): Promise<void>;
    addToCart(productId: string, quantity: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearCart(): Promise<void>;
    createBkashPayment(amount: string, orderId: string, token: string): Promise<string>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createDropshippingOrder(dropOrder: DropshippingOrder): Promise<void>;
    deleteProduct(productId: string): Promise<void>;
    deleteSupplier(supplierId: string): Promise<void>;
    executeBkashPayment(paymentId: string, token: string): Promise<string>;
    getAllDropshippingOrders(): Promise<Array<DropshippingOrder>>;
    getAllOrders(): Promise<Array<AdminOrder>>;
    getAllSuppliers(): Promise<Array<Supplier>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCart(): Promise<Array<CartItem>>;
    getDashboardStats(): Promise<DashboardStats>;
    getMyDropshippingOrders(): Promise<Array<DropshippingOrder>>;
    getMyOrders(): Promise<Array<Order>>;
    getMySellerProducts(): Promise<Array<Product>>;
    getMySuppliers(): Promise<Array<Supplier>>;
    getProducts(): Promise<Array<Product>>;
    getProductsByCategory(category: Category): Promise<Array<Product>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    grantBkashToken(): Promise<string>;
    hasPrescription(productId: string, fileName: string): Promise<boolean>;
    initializeProducts(): Promise<void>;
    initiateNagadPayment(amount: string, orderId: string): Promise<string>;
    isBkashConfigured(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isNagadConfigured(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    placeOrder(): Promise<void>;
    removeFromCart(productId: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveOrder(orderId: string, items: Array<CartItem>, total: bigint, paymentMethod: string, status: string): Promise<void>;
    setBkashConfiguration(config: BkashConfig): Promise<void>;
    setNagadConfiguration(config: NagadConfig): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateDropshippingOrderStatus(orderId: string, status: string): Promise<void>;
    updateOrderStatus(statusUpdate: OrderStatus): Promise<void>;
    updateProduct(product: Product): Promise<void>;
    updateSupplier(supplier: Supplier): Promise<void>;
    uploadPrescription(productId: string, fileName: string, _uploadTime: bigint, _file: ExternalBlob): Promise<void>;
    verifyNagadPayment(orderId: string): Promise<string>;
}
