import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import PrescriptionModal from "./components/PrescriptionModal";
import { CartProvider } from "./context/CartContext";
import { useCart } from "./context/CartContext";
import type { Product } from "./data/products";
import type { Category } from "./data/products";
import { useActor } from "./hooks/useActor";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import AccountPage from "./pages/AccountPage";
import AdminDashboard from "./pages/AdminDashboard";
import CategoryPage from "./pages/CategoryPage";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import SellerDashboard from "./pages/SellerDashboard";

const queryClient = new QueryClient();

function StripeReturnHandler({
  onNavigate,
}: { onNavigate: (page: string) => void }) {
  const { actor } = useActor();
  const { items, clearCart } = useCart();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !actor) return;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("stripe_session_id");
    const cancelled = params.get("stripe_cancelled");

    if (!sessionId && !cancelled) return;
    handled.current = true;

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    if (cancelled) {
      toast.info("Payment cancelled. Your cart has been preserved.");
      onNavigate("checkout");
      return;
    }

    if (sessionId) {
      const orderId = `EB${Math.random().toString(36).toUpperCase().slice(2, 8)}`;
      actor
        .getStripeSessionStatus(sessionId)
        .then(async (status) => {
          if (status.__kind__ === "completed") {
            const cartItems = items.map((item) => ({
              productId: item.productId,
              quantity: BigInt(item.qty),
            }));
            const total = items.reduce(
              (sum, item) => sum + item.price * item.qty,
              0,
            );
            try {
              await actor.saveOrder(
                orderId,
                cartItems,
                BigInt(Math.round(total)),
                "card",
                "completed",
              );
            } catch (err) {
              console.error("Failed to save order:", err);
            }
            clearCart();
            toast.success(`Payment successful! Order ${orderId} confirmed. 🎉`);
            onNavigate("account");
          } else if (status.__kind__ === "failed") {
            toast.error(
              `Payment failed: ${status.failed.error || "Unknown error"}`,
            );
            onNavigate("checkout");
          }
        })
        .catch((err) => {
          console.error("Stripe status check failed:", err);
          toast.error(
            "Could not verify payment status. Please contact support.",
          );
        });
    }
  }, [actor, items, clearCart, onNavigate]);

  return null;
}

function AppInner() {
  const [currentPage, setCurrentPage] = useState("home");
  const [cartOpen, setCartOpen] = useState(false);
  const [prescriptionProduct, setPrescriptionProduct] =
    useState<Product | null>(null);
  const { addItem } = useCart();

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrescriptionRequired = (product: Product) => {
    setPrescriptionProduct(product);
  };

  const handlePrescriptionSuccess = () => {
    if (prescriptionProduct) {
      addItem(prescriptionProduct, true);
      toast.success(`${prescriptionProduct.name} added to cart!`);
    }
    setPrescriptionProduct(null);
  };

  const renderPage = () => {
    if (currentPage === "home") {
      return (
        <HomePage
          onNavigate={handleNavigate}
          onPrescriptionRequired={handlePrescriptionRequired}
        />
      );
    }
    if (currentPage.startsWith("category-")) {
      const cat = currentPage.replace("category-", "") as Category;
      return (
        <CategoryPage
          category={cat}
          onNavigate={handleNavigate}
          onPrescriptionRequired={handlePrescriptionRequired}
        />
      );
    }
    if (currentPage === "checkout") {
      return <CheckoutPage onNavigate={handleNavigate} />;
    }
    if (currentPage === "account") {
      return <AccountPage onNavigate={handleNavigate} />;
    }
    if (currentPage === "admin") {
      return <AdminDashboard onNavigate={handleNavigate} />;
    }
    if (currentPage === "seller-dashboard") {
      return <SellerDashboard onNavigate={handleNavigate} />;
    }
    return (
      <HomePage
        onNavigate={handleNavigate}
        onPrescriptionRequired={handlePrescriptionRequired}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StripeReturnHandler onNavigate={handleNavigate} />
      <Navbar
        onNavigate={handleNavigate}
        currentPage={currentPage}
        onCartOpen={() => setCartOpen(true)}
      />
      <div className="flex-1">{renderPage()}</div>
      <Footer onNavigate={handleNavigate} />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => handleNavigate("checkout")}
      />

      <PrescriptionModal
        open={!!prescriptionProduct}
        onClose={() => setPrescriptionProduct(null)}
        product={prescriptionProduct}
        onSuccess={handlePrescriptionSuccess}
      />

      <Toaster richColors />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider>
        <CartProvider>
          <AppInner />
        </CartProvider>
      </InternetIdentityProvider>
    </QueryClientProvider>
  );
}
