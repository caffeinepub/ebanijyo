import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  ShoppingBag,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../components/auth";
import { useCart } from "../context/CartContext";
import { formatBDT } from "../data/products";
import { useActor } from "../hooks/useActor";
import {
  useCreateCheckoutSession,
  useIsBkashConfigured,
  useIsNagadConfigured,
  useIsStripeConfigured,
} from "../hooks/useQueries";

const DISTRICTS = [
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Rangpur",
  "Mymensingh",
  "Comilla",
  "Gazipur",
  "Narayanganj",
  "Tangail",
  "Jessore",
  "Bogra",
  "Dinajpur",
  "Cox's Bazar",
  "Noakhali",
  "Pabna",
  "Jamalpur",
  "Kishoreganj",
  "Narsingdi",
  "Manikganj",
  "Munshiganj",
  "Faridpur",
  "Madaripur",
  "Gopalganj",
  "Sherpur",
  "Netrokona",
];

type PaymentMethod = "bkash" | "nagad" | "card";

interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
}

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
}

const STEPS = [
  { id: 1, label: "Cart Review", icon: ShoppingBag },
  { id: 2, label: "Shipping", icon: MapPin },
  { id: 3, label: "Payment", icon: CreditCard },
  { id: 4, label: "Confirmation", icon: CheckCircle2 },
];

export default function CheckoutPage({ onNavigate }: CheckoutPageProps) {
  const { items, totalPrice, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { actor } = useActor();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [orderId] = useState(
    () => `EB${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
  );
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: "",
    phone: "",
    address: "",
    city: "",
    district: "",
  });
  const [mobileNumber, setMobileNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const { data: stripeConfigured } = useIsStripeConfigured();
  const { data: bkashConfigured } = useIsBkashConfigured();
  const { data: nagadConfigured } = useIsNagadConfigured();
  const createCheckoutSession = useCreateCheckoutSession();

  const delivery = totalPrice >= 999 ? 0 : 60;
  const grandTotal = totalPrice + delivery;

  const saveOrderToBackend = async (method: string, status: string) => {
    if (!isAuthenticated || !actor) return;
    try {
      const cartItems = items.map((item) => ({
        productId: item.productId,
        quantity: BigInt(item.qty),
      }));
      await actor.saveOrder(
        orderId,
        cartItems,
        BigInt(Math.round(grandTotal)),
        method,
        status,
      );
    } catch (err) {
      console.error("Failed to save order:", err);
    }
  };

  const handlePlaceOrder = async () => {
    setPaymentError("");

    if (paymentMethod === "card") {
      if (!stripeConfigured) {
        toast.error(
          "Card payments not yet configured. Please use bKash or Nagad.",
        );
        return;
      }
      setIsProcessing(true);
      try {
        const shoppingItems = items.map((item) => ({
          productName: item.name,
          currency: "usd",
          quantity: BigInt(item.qty),
          priceInCents: BigInt(Math.round(item.price)),
          productDescription: item.name,
        }));
        const successUrl = `${window.location.origin}?stripe_session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}?stripe_cancelled=true`;
        const checkoutUrl = await createCheckoutSession.mutateAsync({
          items: shoppingItems,
          successUrl,
          cancelUrl,
        });
        window.location.href = checkoutUrl;
      } catch (err) {
        console.error("Stripe checkout error:", err);
        toast.error("Failed to initiate card payment. Please try again.");
        setIsProcessing(false);
      }
      return;
    }

    if (paymentMethod === "bkash") {
      if (!bkashConfigured) {
        // Simulated flow when not configured
        setStep(4);
        clearCart();
        toast.success("Order placed successfully!");
        await saveOrderToBackend("bkash", "completed");
        return;
      }

      if (!actor) {
        toast.error("Please sign in to continue.");
        return;
      }

      setIsProcessing(true);
      try {
        toast.info("Connecting to bKash...");
        const token = await actor.grantBkashToken();
        toast.info("Creating payment request...");
        const resultStr = await actor.createBkashPayment(
          String(Math.round(grandTotal / 100)), // amount in BDT
          orderId,
          token,
        );
        // resultStr is JSON: { paymentID, bkashURL }
        let paymentID = "";
        let bkashURL = "";
        try {
          const parsed = JSON.parse(resultStr);
          paymentID = parsed.paymentID;
          bkashURL = parsed.bkashURL;
        } catch {
          // May be a plain status
        }

        if (bkashURL) {
          toast.info("Redirecting to bKash payment page...");
          const popup = window.open(
            bkashURL,
            "bkash_payment",
            "width=480,height=700,scrollbars=yes",
          );
          if (popup) {
            // Poll until popup closes
            const pollTimer = setInterval(async () => {
              if (popup.closed) {
                clearInterval(pollTimer);
                toast.info("Verifying bKash payment...");
                try {
                  const status = await actor.executeBkashPayment(
                    paymentID,
                    token,
                  );
                  if (
                    status === "Completed" ||
                    status === "completed" ||
                    status.toLowerCase().includes("success")
                  ) {
                    await saveOrderToBackend("bkash", "completed");
                    clearCart();
                    toast.success(
                      `bKash payment confirmed! Order ${orderId} placed. 🎉`,
                    );
                    onNavigate("account");
                  } else {
                    setPaymentError(
                      `bKash payment status: ${status}. Please contact support if amount was deducted.`,
                    );
                    toast.error("bKash payment could not be verified.");
                  }
                } catch (err) {
                  console.error("bKash execute error:", err);
                  setPaymentError(
                    "Could not verify bKash payment. Please contact support.",
                  );
                } finally {
                  setIsProcessing(false);
                }
              }
            }, 1000);
          } else {
            // Popup blocked - fall back
            toast.warning(
              "Popup blocked. Please allow popups and try again, or complete payment manually.",
            );
            setIsProcessing(false);
          }
        } else {
          // No redirect URL — execute directly
          const status = await actor.executeBkashPayment(
            paymentID || resultStr,
            token,
          );
          if (
            status === "Completed" ||
            status === "completed" ||
            status.toLowerCase().includes("success")
          ) {
            await saveOrderToBackend("bkash", "completed");
            clearCart();
            toast.success(
              `bKash payment confirmed! Order ${orderId} placed. 🎉`,
            );
            onNavigate("account");
          } else {
            setPaymentError(`Payment status: ${status}`);
            toast.error("bKash payment could not be confirmed.");
          }
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("bKash error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        setPaymentError(`bKash payment failed: ${msg}`);
        toast.error("bKash payment failed. Please try again.");
        setIsProcessing(false);
      }
      return;
    }

    if (paymentMethod === "nagad") {
      if (!nagadConfigured) {
        // Simulated flow
        setStep(4);
        clearCart();
        toast.success("Order placed successfully!");
        await saveOrderToBackend("nagad", "completed");
        return;
      }

      if (!actor) {
        toast.error("Please sign in to continue.");
        return;
      }

      setIsProcessing(true);
      try {
        toast.info("Initiating Nagad payment...");
        const resultStr = await actor.initiateNagadPayment(
          String(Math.round(grandTotal / 100)),
          orderId,
        );
        let redirectURL = "";
        try {
          const parsed = JSON.parse(resultStr);
          redirectURL = parsed.redirectURL || parsed.callBackUrl || "";
        } catch {
          // May be a direct URL string
          if (resultStr.startsWith("http")) redirectURL = resultStr;
        }

        if (redirectURL) {
          toast.info("Redirecting to Nagad payment page...");
          const popup = window.open(
            redirectURL,
            "nagad_payment",
            "width=480,height=700,scrollbars=yes",
          );
          if (popup) {
            const pollTimer = setInterval(async () => {
              if (popup.closed) {
                clearInterval(pollTimer);
                toast.info("Verifying Nagad payment...");
                try {
                  const status = await actor.verifyNagadPayment(orderId);
                  if (
                    status === "Success" ||
                    status === "success" ||
                    status.toLowerCase().includes("success")
                  ) {
                    await saveOrderToBackend("nagad", "completed");
                    clearCart();
                    toast.success(
                      `Nagad payment confirmed! Order ${orderId} placed. 🎉`,
                    );
                    onNavigate("account");
                  } else {
                    setPaymentError(
                      `Nagad payment status: ${status}. Contact support if amount was deducted.`,
                    );
                    toast.error("Nagad payment could not be verified.");
                  }
                } catch (err) {
                  console.error("Nagad verify error:", err);
                  setPaymentError(
                    "Could not verify Nagad payment. Please contact support.",
                  );
                } finally {
                  setIsProcessing(false);
                }
              }
            }, 1000);
          } else {
            toast.warning("Popup blocked. Please allow popups and try again.");
            setIsProcessing(false);
          }
        } else {
          // Try to verify directly
          const status = await actor.verifyNagadPayment(orderId);
          if (
            status === "Success" ||
            status === "success" ||
            status.toLowerCase().includes("success")
          ) {
            await saveOrderToBackend("nagad", "completed");
            clearCart();
            toast.success(
              `Nagad payment confirmed! Order ${orderId} placed. 🎉`,
            );
            onNavigate("account");
          } else {
            setPaymentError(`Nagad payment status: ${status}`);
            toast.error("Nagad payment could not be confirmed.");
          }
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Nagad error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        setPaymentError(`Nagad payment failed: ${msg}`);
        toast.error("Nagad payment failed. Please try again.");
        setIsProcessing(false);
      }
      return;
    }
  };

  const canProceedStep2 =
    shipping.name && shipping.phone && shipping.address && shipping.district;

  const canProceedStep3 =
    paymentMethod === "card"
      ? true
      : bkashConfigured || nagadConfigured || true; // allow proceeding; unconfigured shows simulated

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      {step < 4 && (
        <button
          type="button"
          onClick={() => (step === 1 ? onNavigate("home") : setStep(step - 1))}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          data-ocid="checkout.link"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 1 ? "Continue Shopping" : "Back"}
        </button>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  step > s.id
                    ? "bg-emerald-500 text-white"
                    : step === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs mt-1 hidden sm:block ${
                  step >= s.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors ${
                  step > s.id ? "bg-emerald-500" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {/* Step 1: Cart Review */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-2xl p-6"
                data-ocid="checkout.panel"
              >
                <h2 className="font-display text-lg font-bold mb-4">
                  Review Your Order
                </h2>
                {items.length === 0 ? (
                  <div
                    className="text-center py-12"
                    data-ocid="checkout.empty_state"
                  >
                    <div className="text-5xl mb-3">🛒</div>
                    <p className="text-muted-foreground">Your cart is empty</p>
                    <Button className="mt-4" onClick={() => onNavigate("home")}>
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                        data-ocid={`checkout.item.${idx + 1}`}
                      >
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-2xl">
                          {item.emoji}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBDT(item.price)} × {item.qty}
                          </p>
                        </div>
                        <span className="font-semibold">
                          {formatBDT(item.price * item.qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-2xl p-6"
                data-ocid="checkout.panel"
              >
                <h2 className="font-display text-lg font-bold mb-4">
                  Shipping Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={shipping.name}
                      onChange={(e) =>
                        setShipping((p) => ({ ...p, name: e.target.value }))
                      }
                      data-ocid="checkout.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Mobile Number *</Label>
                    <Input
                      id="phone"
                      placeholder="01XXXXXXXXX"
                      value={shipping.phone}
                      onChange={(e) =>
                        setShipping((p) => ({ ...p, phone: e.target.value }))
                      }
                      data-ocid="checkout.input"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      placeholder="House #, Road #, Area"
                      value={shipping.address}
                      onChange={(e) =>
                        setShipping((p) => ({ ...p, address: e.target.value }))
                      }
                      data-ocid="checkout.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City / Thana</Label>
                    <Input
                      id="city"
                      placeholder="e.g. Dhanmondi"
                      value={shipping.city}
                      onChange={(e) =>
                        setShipping((p) => ({ ...p, city: e.target.value }))
                      }
                      data-ocid="checkout.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>District *</Label>
                    <Select
                      value={shipping.district}
                      onValueChange={(v) =>
                        setShipping((p) => ({ ...p, district: v }))
                      }
                    >
                      <SelectTrigger data-ocid="checkout.select">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-2xl p-6"
                data-ocid="checkout.panel"
              >
                <h2 className="font-display text-lg font-bold mb-4">
                  Payment Method
                </h2>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {(
                    [
                      {
                        id: "bkash",
                        label: "bKash",
                        emoji: "🟣",
                        color: "border-pink-400 bg-pink-50",
                      },
                      {
                        id: "nagad",
                        label: "Nagad",
                        emoji: "🟠",
                        color: "border-orange-400 bg-orange-50",
                      },
                      {
                        id: "card",
                        label: "Card",
                        emoji: "💳",
                        color: "border-blue-400 bg-blue-50",
                      },
                    ] as const
                  ).map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(pm.id);
                        setPaymentError("");
                      }}
                      data-ocid="checkout.tab"
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        paymentMethod === pm.id
                          ? `${pm.color} shadow-sm`
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="text-2xl mb-1">{pm.emoji}</div>
                      <div className="text-sm font-semibold">{pm.label}</div>
                      {pm.id === "bkash" && bkashConfigured && (
                        <div className="text-xs text-emerald-600 mt-0.5">
                          ● Live
                        </div>
                      )}
                      {pm.id === "nagad" && nagadConfigured && (
                        <div className="text-xs text-emerald-600 mt-0.5">
                          ● Live
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {paymentError && (
                  <div
                    className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 text-sm text-destructive"
                    data-ocid="checkout.error_state"
                  >
                    ⚠️ {paymentError}
                  </div>
                )}

                {paymentMethod === "bkash" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {bkashConfigured ? (
                      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">🟣</span>
                          <p className="font-semibold text-pink-700">
                            bKash — Live Payment
                          </p>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                            Configured
                          </Badge>
                        </div>
                        <p className="text-sm text-pink-600">
                          You'll be redirected to the secure bKash payment page
                          to complete your payment of{" "}
                          <strong>{formatBDT(grandTotal)}</strong>. Return to
                          this page after completing payment.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                        <p className="font-semibold text-pink-700 mb-1">
                          bKash Payment Instructions
                        </p>
                        <ol className="text-sm text-pink-600 space-y-1 list-decimal list-inside">
                          <li>Dial *247# or open bKash app</li>
                          <li>Select "Send Money"</li>
                          <li>
                            Merchant number: <strong>01700-XXXXXX</strong>
                          </li>
                          <li>
                            Amount: <strong>{formatBDT(grandTotal)}</strong>
                          </li>
                          <li>Enter your bKash PIN to confirm</li>
                        </ol>
                        <p className="text-xs text-pink-400 mt-2 italic">
                          Mobile payment coming soon — configure in admin
                        </p>
                      </div>
                    )}
                    {!bkashConfigured && (
                      <div className="space-y-1.5">
                        <Label>Your bKash Mobile Number *</Label>
                        <Input
                          placeholder="01XXXXXXXXX"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          data-ocid="checkout.input"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {paymentMethod === "nagad" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {nagadConfigured ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">🟠</span>
                          <p className="font-semibold text-orange-700">
                            Nagad — Live Payment
                          </p>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                            Configured
                          </Badge>
                        </div>
                        <p className="text-sm text-orange-600">
                          You'll be redirected to the secure Nagad payment page
                          to complete your payment of{" "}
                          <strong>{formatBDT(grandTotal)}</strong>. Return to
                          this page after completing payment.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <p className="font-semibold text-orange-700 mb-1">
                          Nagad Payment Instructions
                        </p>
                        <ol className="text-sm text-orange-600 space-y-1 list-decimal list-inside">
                          <li>Dial *167# or open Nagad app</li>
                          <li>Select "Send Money"</li>
                          <li>
                            Merchant number: <strong>01800-XXXXXX</strong>
                          </li>
                          <li>
                            Amount: <strong>{formatBDT(grandTotal)}</strong>
                          </li>
                          <li>Enter your Nagad PIN to confirm</li>
                        </ol>
                        <p className="text-xs text-orange-400 mt-2 italic">
                          Mobile payment coming soon — configure in admin
                        </p>
                      </div>
                    )}
                    {!nagadConfigured && (
                      <div className="space-y-1.5">
                        <Label>Your Nagad Mobile Number *</Label>
                        <Input
                          placeholder="01XXXXXXXXX"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          data-ocid="checkout.input"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {paymentMethod === "card" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {stripeConfigured === false ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="font-semibold text-amber-700 mb-1">
                          ⚠️ Card Payments Not Configured
                        </p>
                        <p className="text-sm text-amber-600">
                          Card payments are not yet configured. Please use bKash
                          or Nagad to complete your order.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                          <p className="font-semibold text-blue-700">
                            Secure Card Payment via Stripe
                          </p>
                        </div>
                        <p className="text-sm text-blue-600">
                          You'll be redirected to Stripe's secure checkout page
                          to enter your card details. We accept Visa,
                          Mastercard, and Amex.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline">Visa</Badge>
                          <Badge variant="outline">Mastercard</Badge>
                          <Badge variant="outline">Amex</Badge>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {isProcessing && (
                  <div
                    className="flex items-center gap-3 mt-4 p-3 bg-muted/50 rounded-xl text-sm text-muted-foreground"
                    data-ocid="checkout.loading_state"
                  >
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Processing your payment, please wait...</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-2xl p-8 text-center"
                data-ocid="checkout.success_state"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-emerald-700 mb-2">
                  Order Placed! 🎉
                </h2>
                <p className="text-muted-foreground mb-4">
                  Thank you for shopping with Ebanijyo!
                </p>
                <div className="bg-muted/40 rounded-xl p-4 mb-6 inline-block">
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-mono font-bold text-xl text-primary">
                    {orderId}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground mb-6 space-y-1">
                  <p>📦 Estimated delivery: 1-3 business days</p>
                  <p>
                    📱 SMS confirmation sent to{" "}
                    {shipping.phone || "your number"}
                  </p>
                  {isAuthenticated && (
                    <p className="text-emerald-600 font-medium">
                      ✅ Order saved to your account history
                    </p>
                  )}
                </div>
                <div className="flex gap-3 justify-center">
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      onClick={() => onNavigate("account")}
                      data-ocid="checkout.secondary_button"
                    >
                      View Order History
                    </Button>
                  )}
                  <Button
                    size="lg"
                    onClick={() => onNavigate("home")}
                    data-ocid="checkout.primary_button"
                  >
                    Continue Shopping
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 4 && (
            <div className="mt-4 flex justify-end">
              <Button
                size="lg"
                onClick={() => {
                  if (step === 3) {
                    handlePlaceOrder();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={
                  isProcessing ||
                  (step === 1 && items.length === 0) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3) ||
                  (step === 3 &&
                    paymentMethod === "card" &&
                    stripeConfigured === false)
                }
                data-ocid="checkout.primary_button"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : step === 3 ? (
                  paymentMethod === "card" ? (
                    <>
                      <ExternalLink className="mr-2 w-4 h-4" />
                      Pay with Stripe
                    </>
                  ) : paymentMethod === "bkash" && bkashConfigured ? (
                    "Pay with bKash →"
                  ) : paymentMethod === "nagad" && nagadConfigured ? (
                    "Pay with Nagad →"
                  ) : (
                    "Place Order"
                  )
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Order Summary sidebar */}
        {step < 4 && (
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-28">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" /> Order Summary
              </h3>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground line-clamp-1 flex-1 mr-2">
                      {item.emoji} {item.name} ×{item.qty}
                    </span>
                    <span className="font-medium flex-shrink-0">
                      {formatBDT(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBDT(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className={delivery === 0 ? "text-emerald-600" : ""}>
                    {delivery === 0 ? "Free" : formatBDT(delivery)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatBDT(grandTotal)}</span>
                </div>
              </div>
              {shipping.name && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    Delivering to:
                  </p>
                  <p>{shipping.name}</p>
                  {shipping.address && <p>{shipping.address}</p>}
                  {shipping.district && <p>{shipping.district}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
