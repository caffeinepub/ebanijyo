import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  FileText,
  Loader2,
  LogOut,
  Package,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Order, UserProfile } from "../backend";

interface ExtendedUserProfile extends UserProfile {
  accountType?: string;
}
import InvoicePrint from "../components/InvoicePrint";
import { LoginButton, useAuth } from "../components/auth";
import { formatBDT } from "../data/products";
import { useActor } from "../hooks/useActor";

interface AccountPageProps {
  onNavigate: (page: string) => void;
}

function formatDate(nanos: bigint): string {
  const ms = Number(nanos / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "cancelled":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getPaymentBadge(method: string) {
  switch (method.toLowerCase()) {
    case "bkash":
      return "bg-pink-100 text-pink-700 border-pink-200";
    case "nagad":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "card":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function AccountPage({ onNavigate }: AccountPageProps) {
  const { isAuthenticated, logout, principal, isInitializing } = useAuth();
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller" | "">("");
  const [profileForm, setProfileForm] = useState<ExtendedUserProfile>({
    name: "",
    email: "",
    phone: "",
    address: "",
    accountType: "",
  });
  const [formLoaded, setFormLoaded] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    select: (data) => {
      if (data && !formLoaded) {
        setProfileForm(data);
        setFormLoaded(true);
      }
      return data;
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyOrders();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProducts();
    },
    enabled: !!actor && !isFetching,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (p: ExtendedUserProfile) => {
      if (!actor) throw new Error("No actor");
      return actor.saveCallerUserProfile(p);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved!");
    },
    onError: () => toast.error("Failed to save profile"),
  });

  if (isInitializing) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <div
          className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
          data-ocid="account.panel"
        >
          <User className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">
          Sign in to Your Account
        </h1>
        <p className="text-muted-foreground mb-6">
          Log in to view your order history, manage your profile, and track
          deliveries.
        </p>
        <LoginButton size="lg" label="Login to Continue" />
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="mt-4 block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="account.link"
        >
          ← Back to shopping
        </button>
      </main>
    );
  }

  // Show role selection if profile has no accountType
  const showRoleSelection =
    !profileLoading &&
    (!profile || !(profile as ExtendedUserProfile).accountType) &&
    !selectedRole;

  if (showRoleSelection) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold mb-3">
            Welcome to Ebanijyo!
          </h1>
          <p className="text-muted-foreground">
            Please select how you want to use the platform.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Buyer Card */}
          <button
            type="button"
            onClick={() => {
              setSelectedRole("buyer");
              setProfileForm((p) => ({ ...p, accountType: "buyer" }));
            }}
            className="group text-left p-8 rounded-2xl border-2 border-border hover:border-primary hover:shadow-lg transition-all bg-white"
            data-ocid="account.primary_button"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <ShoppingCart className="w-7 h-7 text-blue-600 group-hover:text-primary transition-colors" />
            </div>
            <h2 className="text-xl font-bold mb-2">Register as Buyer</h2>
            <p className="text-muted-foreground text-sm">
              Browse and buy products from sellers across Bangladesh. Track your
              orders and get fast delivery.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-primary font-medium text-sm">
              Continue as Buyer →
            </div>
          </button>

          {/* Seller Card */}
          <button
            type="button"
            onClick={() => {
              setSelectedRole("seller");
              setProfileForm((p) => ({ ...p, accountType: "seller" }));
            }}
            className="group text-left p-8 rounded-2xl border-2 border-border hover:border-primary hover:shadow-lg transition-all bg-white"
            data-ocid="account.secondary_button"
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <Store className="w-7 h-7 text-orange-600 group-hover:text-primary transition-colors" />
            </div>
            <h2 className="text-xl font-bold mb-2">Register as Seller</h2>
            <p className="text-muted-foreground text-sm">
              List your products, manage suppliers, and grow your business.
              Access dropshipping tools and analytics.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-primary font-medium text-sm">
              Continue as Seller →
            </div>
          </button>
        </div>
      </main>
    );
  }

  const effectiveAccountType =
    (profile as ExtendedUserProfile)?.accountType || selectedRole;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="account.link"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Shop
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
          data-ocid="account.secondary_button"
        >
          <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          {effectiveAccountType === "seller" ? (
            <Store className="w-7 h-7 text-primary" />
          ) : (
            <User className="w-7 h-7 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold">
              {profile?.name || "My Account"}
            </h1>
            {effectiveAccountType && (
              <Badge
                variant="outline"
                className={`capitalize text-xs ${
                  effectiveAccountType === "seller"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {effectiveAccountType}
              </Badge>
            )}
          </div>
          {principal && (
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[240px]">
              {principal}
            </p>
          )}
        </div>
        {effectiveAccountType === "seller" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("seller-dashboard")}
            className="ml-auto"
            data-ocid="account.link"
          >
            <Store className="w-3.5 h-3.5 mr-1.5" /> Seller Dashboard
          </Button>
        )}
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders" data-ocid="account.tab">
            <ShoppingBag className="w-4 h-4 mr-1.5" /> Order History
          </TabsTrigger>
          <TabsTrigger value="profile" data-ocid="account.tab">
            <User className="w-4 h-4 mr-1.5" /> Profile
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          {ordersLoading ? (
            <div className="space-y-3" data-ocid="account.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <div
              className="text-center py-16 bg-muted/30 rounded-2xl"
              data-ocid="account.empty_state"
            >
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">No orders yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Your order history will appear here after your first purchase.
              </p>
              <Button
                onClick={() => onNavigate("home")}
                data-ocid="account.primary_button"
              >
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, idx) => (
                <Card
                  key={order.orderId}
                  className="border border-border hover:shadow-md transition-shadow"
                  data-ocid={`account.item.${idx + 1}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-mono">
                          #{order.orderId}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {formatDate(order.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPaymentBadge(order.paymentMethod)}`}
                        >
                          {order.paymentMethod.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(order.status)}`}
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "item" : "items"}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary">
                          {formatBDT(Number(order.total) / 100)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInvoiceOrder(order)}
                          data-ocid={`account.secondary_button.${idx + 1}`}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> Invoice
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card data-ocid="account.card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your name, contact details, and delivery address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-4" data-ocid="account.loading_state">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveProfileMutation.mutate(profileForm);
                  }}
                  className="space-y-4"
                >
                  {/* Account type display */}
                  {effectiveAccountType && (
                    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        Account type:
                      </span>
                      <Badge
                        variant="outline"
                        className={`capitalize ${
                          effectiveAccountType === "seller"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {effectiveAccountType}
                      </Badge>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="pname">Full Name</Label>
                      <Input
                        id="pname"
                        placeholder="Your full name"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        data-ocid="account.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pemail">Email</Label>
                      <Input
                        id="pemail"
                        type="email"
                        placeholder="you@example.com"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                        data-ocid="account.input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pphone">Mobile Number</Label>
                      <Input
                        id="pphone"
                        placeholder="01XXXXXXXXX"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            phone: e.target.value,
                          }))
                        }
                        data-ocid="account.input"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="paddress">Delivery Address</Label>
                      <Input
                        id="paddress"
                        placeholder="House, Road, Area, City"
                        value={profileForm.address}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            address: e.target.value,
                          }))
                        }
                        data-ocid="account.input"
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={saveProfileMutation.isPending}
                      data-ocid="account.submit_button"
                    >
                      {saveProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {saveProfileMutation.isPending
                        ? "Saving..."
                        : "Save Profile"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Dialog */}
      {invoiceOrder && (
        <InvoicePrint
          open={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          order={invoiceOrder}
          profile={profile ?? null}
          products={allProducts ?? []}
        />
      )}
    </main>
  );
}
