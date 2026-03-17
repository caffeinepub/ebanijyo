import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Edit,
  ImageIcon,
  Loader2,
  Package,
  Pill,
  Plus,
  Settings,
  Shirt,
  ShoppingBag,
  Smartphone,
  Trash2,
  TrendingUp,
  Upload,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Category } from "../backend.d";
import type { AdminOrder, Product } from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  useIsBkashConfigured,
  useIsNagadConfigured,
  useIsStripeConfigured,
  useSetBkashConfiguration,
  useSetNagadConfiguration,
  useSetStripeConfiguration,
} from "../hooks/useQueries";

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

function formatBDT(amount: bigint): string {
  return `৳${(Number(amount) / 100).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function truncatePrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const categoryIcons: Record<string, React.ReactNode> = {
  electronics: <Smartphone className="w-3.5 h-3.5" />,
  pharmacy: <Pill className="w-3.5 h-3.5" />,
  fashion: <Shirt className="w-3.5 h-3.5" />,
  books: <BookOpen className="w-3.5 h-3.5" />,
};

const SKELETON_KEYS = ["stat-a", "stat-b", "stat-c", "stat-d"];

const emptyFormData = {
  id: "",
  name: "",
  description: "",
  price: "",
  category: Category.electronics,
  requiresPrescription: false,
  inStock: true,
  imageUrl: "",
};

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();

  // Access check
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getDashboardStats();
    },
    enabled: !!actor && !isFetching && !!isAdmin,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProducts();
    },
    enabled: !!actor && !isFetching && !!isAdmin,
  });

  const { data: allOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["allOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders();
    },
    enabled: !!actor && !isFetching && !!isAdmin,
  });

  // Product mutations
  const addProductMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("No actor");
      return actor.addProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Product added successfully");
    },
    onError: () => toast.error("Failed to add product"),
  });

  const updateProductMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("No actor");
      return actor.updateProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success("Product updated successfully");
    },
    onError: () => toast.error("Failed to update product"),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Product deleted");
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({
      user,
      orderId,
      status,
    }: {
      user: import("@icp-sdk/core/principal").Principal;
      orderId: string;
      status: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateOrderStatus({ user, orderId, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      toast.success("Order status updated");
    },
    onError: () => toast.error("Failed to update order status"),
  });

  // Product form state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Stripe settings state
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeCountries, setStripeCountries] = useState("US,BD");
  const { data: stripeConfigured, isLoading: loadingStripeStatus } =
    useIsStripeConfigured();
  const setStripeConfigMutation = useSetStripeConfiguration();

  // bKash settings state
  const [bkashAppKey, setBkashAppKey] = useState("");
  const [bkashAppSecret, setBkashAppSecret] = useState("");
  const [bkashUsername, setBkashUsername] = useState("");
  const [bkashPassword, setBkashPassword] = useState("");
  const [bkashSandbox, setBkashSandbox] = useState(true);
  const { data: bkashConfigured, isLoading: loadingBkashStatus } =
    useIsBkashConfigured();
  const setBkashConfigMutation = useSetBkashConfiguration();

  const handleSaveBkashConfig = async () => {
    if (!bkashAppKey || !bkashAppSecret || !bkashUsername || !bkashPassword) {
      toast.error("Please fill in all bKash fields");
      return;
    }
    try {
      await setBkashConfigMutation.mutateAsync({
        appKey: bkashAppKey,
        appSecret: bkashAppSecret,
        username: bkashUsername,
        password: bkashPassword,
        isSandbox: bkashSandbox,
      });
      toast.success("bKash configuration saved successfully");
      setBkashAppKey("");
      setBkashAppSecret("");
      setBkashUsername("");
      setBkashPassword("");
    } catch {
      toast.error("Failed to save bKash configuration");
    }
  };

  // Nagad settings state
  const [nagadMerchantId, setNagadMerchantId] = useState("");
  const [nagadPrivateKey, setNagadPrivateKey] = useState("");
  const [nagadSandbox, setNagadSandbox] = useState(true);
  const { data: nagadConfigured, isLoading: loadingNagadStatus } =
    useIsNagadConfigured();
  const setNagadConfigMutation = useSetNagadConfiguration();

  const handleSaveNagadConfig = async () => {
    if (!nagadMerchantId || !nagadPrivateKey) {
      toast.error("Please fill in all Nagad fields");
      return;
    }
    try {
      await setNagadConfigMutation.mutateAsync({
        merchantID: nagadMerchantId,
        merchantPrivateKey: nagadPrivateKey,
        isSandbox: nagadSandbox,
      });
      toast.success("Nagad configuration saved successfully");
      setNagadMerchantId("");
      setNagadPrivateKey("");
    } catch {
      toast.error("Failed to save Nagad configuration");
    }
  };

  const handleSaveStripeConfig = async () => {
    if (!stripeSecretKey) {
      toast.error("Please enter a Stripe secret key");
      return;
    }
    try {
      await setStripeConfigMutation.mutateAsync({
        secretKey: stripeSecretKey,
        allowedCountries: stripeCountries
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });
      toast.success("Stripe configuration saved successfully");
      setStripeSecretKey("");
    } catch {
      toast.error("Failed to save Stripe configuration");
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setFormData({ ...emptyFormData, id: crypto.randomUUID() });
    setProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description,
      price: (Number(product.price) / 100).toString(),
      category: product.category,
      requiresPrescription: product.requiresPrescription,
      inStock: product.inStock,
      imageUrl: product.imageUrl ?? "",
    });
    setProductModalOpen(true);
  };

  const handleProductSubmit = () => {
    const product: Product = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      price: BigInt(Math.round(Number.parseFloat(formData.price || "0") * 100)),
      category: formData.category,
      requiresPrescription: formData.requiresPrescription,
      inStock: formData.inStock,
      imageUrl: formData.imageUrl || undefined,
    };
    if (editingProduct) {
      updateProductMutation.mutate(product);
    } else {
      addProductMutation.mutate(product);
    }
    setProductModalOpen(false);
  };

  // Loading / access denied
  if (checkingAdmin || isFetching) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        data-ocid="admin.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
        data-ocid="admin.error_state"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Access Denied
          </h2>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
        <Button onClick={() => onNavigate("home")} data-ocid="admin.link">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>
      </div>
    );
  }

  const flatOrders = (allOrders ?? []).flatMap((ao: AdminOrder) =>
    ao.orders.map((order) => ({
      ...order,
      userPrincipal: ao.user.toString(),
    })),
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 py-8"
      data-ocid="admin.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your Ebanijyo store
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("home")}
          data-ocid="admin.link"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Store
        </Button>
      </div>

      <Tabs defaultValue="overview" data-ocid="admin.tab">
        <TabsList className="mb-6">
          <TabsTrigger value="overview" data-ocid="admin.tab">
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" data-ocid="admin.tab">
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" data-ocid="admin.tab">
            Orders
          </TabsTrigger>
          <TabsTrigger value="payments" data-ocid="admin.tab">
            <CreditCard className="w-4 h-4 mr-1.5" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview">
          {loadingStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {SKELETON_KEYS.map((key) => (
                <Card key={key} className="animate-pulse">
                  <CardContent className="p-6 h-28" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Products"
                value={stats ? stats.totalProducts.toString() : "0"}
                icon={<Package className="w-5 h-5" />}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Total Orders"
                value={stats ? stats.totalOrders.toString() : "0"}
                icon={<ShoppingBag className="w-5 h-5" />}
                color="bg-green-50 text-green-600"
              />
              <StatCard
                label="Total Revenue"
                value={stats ? formatBDT(stats.totalRevenue) : "৳0"}
                icon={<TrendingUp className="w-5 h-5" />}
                color="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="Out of Stock"
                value={stats ? stats.outOfStockProducts.toString() : "0"}
                icon={<AlertTriangle className="w-5 h-5" />}
                color="bg-red-50 text-red-600"
              />
            </div>
          )}
        </TabsContent>

        {/* ── PRODUCTS ── */}
        <TabsContent value="products">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Product Inventory</h2>
            <Button
              onClick={openAddProduct}
              size="sm"
              data-ocid="admin.open_modal_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Product
            </Button>
          </div>

          {loadingProducts ? (
            <div
              className="flex justify-center py-12"
              data-ocid="admin.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table data-ocid="admin.table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Prescription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-12"
                        data-ocid="admin.empty_state"
                      >
                        No products found. Add your first product.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (products ?? []).map((product, i) => (
                      <TableRow
                        key={product.id}
                        data-ocid={`admin.item.${i + 1}`}
                      >
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 capitalize">
                            {categoryIcons[product.category]}
                            {product.category}
                          </span>
                        </TableCell>
                        <TableCell>{formatBDT(product.price)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              product.inStock
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {product.inStock ? "In Stock" : "Out of Stock"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.requiresPrescription ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Required
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditProduct(product)}
                              data-ocid={`admin.edit_button.${i + 1}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(product.id)}
                              data-ocid={`admin.delete_button.${i + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── ORDERS ── */}
        <TabsContent value="orders">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">All Orders</h2>
            <Badge variant="outline">{flatOrders.length} total</Badge>
          </div>

          {loadingOrders ? (
            <div
              className="flex justify-center py-12"
              data-ocid="admin.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table data-ocid="admin.table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Order ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Update Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flatOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-12"
                        data-ocid="admin.empty_state"
                      >
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    flatOrders.map((order, i) => (
                      <TableRow
                        key={`${order.userPrincipal}-${order.orderId}`}
                        data-ocid={`admin.item.${i + 1}`}
                      >
                        <TableCell className="font-mono text-xs">
                          {truncatePrincipal(order.orderId)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {truncatePrincipal(order.userPrincipal)}
                        </TableCell>
                        <TableCell>{order.items.length}</TableCell>
                        <TableCell className="font-medium">
                          {formatBDT(order.total)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {order.paymentMethod}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              statusColors[order.status] ??
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(
                            Number(order.createdAt) / 1_000_000,
                          ).toLocaleDateString("en-BD")}
                        </TableCell>
                        <TableCell>
                          <OrderStatusSelect
                            currentStatus={order.status}
                            onUpdate={(status) => {
                              const adminOrder = (allOrders ?? []).find(
                                (ao: AdminOrder) =>
                                  ao.user.toString() === order.userPrincipal,
                              );
                              if (adminOrder) {
                                updateOrderStatusMutation.mutate({
                                  user: adminOrder.user,
                                  orderId: order.orderId,
                                  status,
                                });
                              }
                            }}
                            index={i + 1}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        {/* ── PAYMENT SETTINGS ── */}
        <TabsContent value="payments">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Payment Settings</h2>
            </div>

            {/* Stripe status */}
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Stripe (Card Payments)
              </h3>
              {loadingStripeStatus ? (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="admin.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking
                  status...
                </div>
              ) : stripeConfigured ? (
                <div
                  className="flex items-center gap-2 text-emerald-600 text-sm font-medium"
                  data-ocid="admin.success_state"
                >
                  <CheckCircle2 className="w-4 h-4" /> Configured — card
                  payments are active
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 text-destructive text-sm font-medium"
                  data-ocid="admin.error_state"
                >
                  <XCircle className="w-4 h-4" /> Not configured — card payments
                  are disabled
                </div>
              )}
            </div>

            {/* Stripe config form */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-medium">Configure Stripe</h3>

              <div className="space-y-1.5">
                <Label htmlFor="stripe-key">Stripe Secret Key</Label>
                <Input
                  id="stripe-key"
                  type="password"
                  placeholder="sk_live_... or sk_test_..."
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  data-ocid="admin.input"
                />
                <p className="text-xs text-muted-foreground">
                  Find your secret key in the Stripe Dashboard → Developers →
                  API keys.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stripe-countries">Allowed Countries</Label>
                <Input
                  id="stripe-countries"
                  placeholder="US,BD,GB,..."
                  value={stripeCountries}
                  onChange={(e) => setStripeCountries(e.target.value)}
                  data-ocid="admin.input"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated ISO country codes (e.g. US,BD,GB).
                </p>
              </div>

              <Button
                onClick={handleSaveStripeConfig}
                disabled={setStripeConfigMutation.isPending || !stripeSecretKey}
                data-ocid="admin.submit_button"
              >
                {setStripeConfigMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Stripe Configuration"
                )}
              </Button>
            </div>

            {/* bKash section */}
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-xl">🟣</span>
                <span>bKash (Mobile Payments)</span>
              </h3>
              {loadingBkashStatus ? (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="admin.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking
                  status...
                </div>
              ) : bkashConfigured ? (
                <div
                  className="flex items-center gap-2 text-emerald-600 text-sm font-medium"
                  data-ocid="admin.success_state"
                >
                  <CheckCircle2 className="w-4 h-4" /> Configured — bKash
                  payments are live
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 text-destructive text-sm font-medium"
                  data-ocid="admin.error_state"
                >
                  <XCircle className="w-4 h-4" /> Not configured — bKash
                  payments use simulation
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-4 mb-6">
              <h3 className="font-medium">Configure bKash</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bkash-key">App Key</Label>
                  <Input
                    id="bkash-key"
                    type="password"
                    placeholder="bKash App Key"
                    value={bkashAppKey}
                    onChange={(e) => setBkashAppKey(e.target.value)}
                    data-ocid="admin.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bkash-secret">App Secret</Label>
                  <Input
                    id="bkash-secret"
                    type="password"
                    placeholder="bKash App Secret"
                    value={bkashAppSecret}
                    onChange={(e) => setBkashAppSecret(e.target.value)}
                    data-ocid="admin.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bkash-user">Username</Label>
                  <Input
                    id="bkash-user"
                    placeholder="bKash Username"
                    value={bkashUsername}
                    onChange={(e) => setBkashUsername(e.target.value)}
                    data-ocid="admin.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bkash-pass">Password</Label>
                  <Input
                    id="bkash-pass"
                    type="password"
                    placeholder="bKash Password"
                    value={bkashPassword}
                    onChange={(e) => setBkashPassword(e.target.value)}
                    data-ocid="admin.input"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={bkashSandbox}
                  onCheckedChange={setBkashSandbox}
                  data-ocid="admin.switch"
                  id="bkash-sandbox"
                />
                <Label htmlFor="bkash-sandbox">
                  Sandbox / Test mode{" "}
                  {bkashSandbox ? "(enabled)" : "(disabled — live)"}
                </Label>
              </div>
              <Button
                onClick={handleSaveBkashConfig}
                disabled={
                  setBkashConfigMutation.isPending ||
                  !bkashAppKey ||
                  !bkashAppSecret ||
                  !bkashUsername ||
                  !bkashPassword
                }
                className="bg-[#E2136E] hover:bg-[#c01060] text-white"
                data-ocid="admin.submit_button"
              >
                {setBkashConfigMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save bKash Configuration"
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Obtain credentials from the bKash Developer Portal
                (developer.bkash.com).
              </p>
            </div>

            {/* Nagad section */}
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-xl">🟠</span>
                <span>Nagad (Mobile Payments)</span>
              </h3>
              {loadingNagadStatus ? (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="admin.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking
                  status...
                </div>
              ) : nagadConfigured ? (
                <div
                  className="flex items-center gap-2 text-emerald-600 text-sm font-medium"
                  data-ocid="admin.success_state"
                >
                  <CheckCircle2 className="w-4 h-4" /> Configured — Nagad
                  payments are live
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 text-destructive text-sm font-medium"
                  data-ocid="admin.error_state"
                >
                  <XCircle className="w-4 h-4" /> Not configured — Nagad
                  payments use simulation
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-4 mb-6">
              <h3 className="font-medium">Configure Nagad</h3>
              <div className="space-y-1.5">
                <Label htmlFor="nagad-merchant">Merchant ID</Label>
                <Input
                  id="nagad-merchant"
                  placeholder="Nagad Merchant ID"
                  value={nagadMerchantId}
                  onChange={(e) => setNagadMerchantId(e.target.value)}
                  data-ocid="admin.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nagad-key">Merchant Private Key</Label>
                <Textarea
                  id="nagad-key"
                  placeholder="Paste your RSA private key here..."
                  value={nagadPrivateKey}
                  onChange={(e) => setNagadPrivateKey(e.target.value)}
                  rows={4}
                  data-ocid="admin.textarea"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  RSA private key from Nagad merchant portal. Keep this secret.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={nagadSandbox}
                  onCheckedChange={setNagadSandbox}
                  data-ocid="admin.switch"
                  id="nagad-sandbox"
                />
                <Label htmlFor="nagad-sandbox">
                  Sandbox / Test mode{" "}
                  {nagadSandbox ? "(enabled)" : "(disabled — live)"}
                </Label>
              </div>
              <Button
                onClick={handleSaveNagadConfig}
                disabled={
                  setNagadConfigMutation.isPending ||
                  !nagadMerchantId ||
                  !nagadPrivateKey
                }
                className="bg-[#F05A28] hover:bg-[#d44d1f] text-white"
                data-ocid="admin.submit_button"
              >
                {setNagadConfigMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Nagad Configuration"
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Obtain credentials from the Nagad Merchant Portal
                (merchant.nagad.com.bd).
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Product Form Modal ── */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-lg" data-ocid="admin.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="prod-name">Product Name</Label>
              <Input
                id="prod-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Samsung Galaxy A54"
                data-ocid="admin.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea
                id="prod-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Product description"
                rows={3}
                data-ocid="admin.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="prod-price">Price (BDT ৳)</Label>
                <Input
                  id="prod-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, price: e.target.value }))
                  }
                  placeholder="0.00"
                  data-ocid="admin.input"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, category: v as Category }))
                  }
                >
                  <SelectTrigger data-ocid="admin.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Category.electronics}>
                      Electronics
                    </SelectItem>
                    <SelectItem value={Category.pharmacy}>Pharmacy</SelectItem>
                    <SelectItem value={Category.fashion}>Fashion</SelectItem>
                    <SelectItem value={Category.books}>Books</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Product Image</Label>
              {formData.imageUrl && (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={formData.imageUrl}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, imageUrl: "" }))}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:opacity-90"
                    data-ocid="admin.delete_button"
                  >
                    ✕
                  </button>
                </div>
              )}
              {!formData.imageUrl && (
                <div className="flex items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="w-7 h-7" />
                    <span className="text-xs">No image selected</span>
                  </div>
                </div>
              )}
              <label
                htmlFor="prod-image"
                className="inline-flex items-center gap-2 cursor-pointer self-start"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  data-ocid="admin.upload_button"
                >
                  <span>
                    <Upload className="w-4 h-4 mr-1" />
                    {formData.imageUrl ? "Change Image" : "Upload Image"}
                  </span>
                </Button>
                <input
                  id="prod-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Image must be under 5MB");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setFormData((p) => ({
                        ...p,
                        imageUrl: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="in-stock"
                  checked={formData.inStock}
                  onCheckedChange={(v) =>
                    setFormData((p) => ({ ...p, inStock: v }))
                  }
                  data-ocid="admin.switch"
                />
                <Label htmlFor="in-stock">In Stock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="prescription"
                  checked={formData.requiresPrescription}
                  onCheckedChange={(v) =>
                    setFormData((p) => ({ ...p, requiresPrescription: v }))
                  }
                  data-ocid="admin.switch"
                />
                <Label htmlFor="prescription">Requires Prescription</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductModalOpen(false)}
              data-ocid="admin.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProductSubmit}
              disabled={!formData.name || !formData.price}
              data-ocid="admin.submit_button"
            >
              {editingProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent data-ocid="admin.dialog">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This action cannot be undone. The product will be permanently
            removed.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              data-ocid="admin.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteProductMutation.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              data-ocid="admin.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.main>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card data-ocid="admin.card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}
          >
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-display font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function OrderStatusSelect({
  currentStatus,
  onUpdate,
  index,
}: {
  currentStatus: string;
  onUpdate: (status: string) => void;
  index: number;
}) {
  return (
    <Select defaultValue={currentStatus} onValueChange={onUpdate}>
      <SelectTrigger className="h-8 w-36" data-ocid={`admin.select.${index}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="processing">Processing</SelectItem>
        <SelectItem value="shipped">Shipped</SelectItem>
        <SelectItem value="delivered">Delivered</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}
