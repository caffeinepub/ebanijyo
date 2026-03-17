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
  ArrowLeft,
  BookOpen,
  Edit,
  ImageIcon,
  Loader2,
  Package,
  Pill,
  Plus,
  SendHorizonal,
  Shirt,
  Smartphone,
  Store,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Category } from "../backend.d";
import type {
  AdminOrder,
  DropshippingOrder,
  Product,
  Supplier,
} from "../backend.d";
import { useAuth } from "../components/auth";
import { useActor } from "../hooks/useActor";

interface SellerDashboardProps {
  onNavigate: (page: string) => void;
}

function formatBDT(paisa: bigint): string {
  return `৳${(Number(paisa) / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function truncate(str: string, len = 10): string {
  if (str.length <= len) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

function formatDate(nanos: bigint): string {
  return new Date(Number(nanos / BigInt(1_000_000))).toLocaleDateString(
    "en-BD",
  );
}

const dropshipStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  sent_to_supplier: "bg-blue-100 text-blue-800 border-blue-200",
  supplier_confirmed: "bg-purple-100 text-purple-800 border-purple-200",
  fulfilled: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const categoryIcons: Record<string, React.ReactNode> = {
  electronics: <Smartphone className="w-3.5 h-3.5" />,
  pharmacy: <Pill className="w-3.5 h-3.5" />,
  fashion: <Shirt className="w-3.5 h-3.5" />,
  books: <BookOpen className="w-3.5 h-3.5" />,
};

const emptyProduct = {
  id: "",
  name: "",
  description: "",
  price: "",
  category: Category.electronics,
  requiresPrescription: false,
  inStock: true,
  imageUrl: "",
};

const emptySupplier = {
  id: "",
  name: "",
  contact: "",
  address: "",
  commissionRate: "",
};

export default function SellerDashboard({ onNavigate }: SellerDashboardProps) {
  const { actor, isFetching } = useActor();
  const { isAuthenticated, principal } = useAuth();
  const queryClient = useQueryClient();
  // Cast actor to any for extended methods not yet in generated types
  const actorExt = actor as any;

  // ── Products ──
  const { data: myProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["sellerProducts"],
    queryFn: async () => {
      if (!actor) return [];
      return actorExt.getMySellerProducts();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  const addProductMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("No actor");
      return actor.addProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
      toast.success("Product added!");
    },
    onError: () => toast.error("Failed to add product"),
  });

  const updateProductMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("No actor");
      return actor.updateProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
      toast.success("Product updated!");
    },
    onError: () => toast.error("Failed to update product"),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
      toast.success("Product deleted");
    },
    onError: () => toast.error("Failed to delete product"),
  });

  // ── Suppliers ──
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: ["sellerSuppliers"],
    queryFn: async () => {
      if (!actor) return [];
      return actorExt.getMySuppliers();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (supplier: Supplier) => {
      if (!actor) throw new Error("No actor");
      return actorExt.addSupplier(supplier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerSuppliers"] });
      toast.success("Supplier added!");
    },
    onError: () => toast.error("Failed to add supplier"),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (supplier: Supplier) => {
      if (!actor) throw new Error("No actor");
      return actorExt.updateSupplier(supplier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerSuppliers"] });
      toast.success("Supplier updated!");
    },
    onError: () => toast.error("Failed to update supplier"),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      if (!actor) throw new Error("No actor");
      return actorExt.deleteSupplier(supplierId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerSuppliers"] });
      toast.success("Supplier removed");
    },
    onError: () => toast.error("Failed to remove supplier"),
  });

  // ── Incoming Orders (buyer orders for my products) ──
  const { data: allOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["sellerIncomingOrders"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllOrders();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  const myProductIds = new Set((myProducts ?? []).map((p) => p.id));
  const incomingOrders = (allOrders ?? [])
    .flatMap((ao: AdminOrder) =>
      ao.orders.map((o) => ({ ...o, userPrincipal: ao.user.toString() })),
    )
    .filter((order) =>
      order.items.some((item) => myProductIds.has(item.productId)),
    );

  // ── Dropshipping Orders ──
  const { data: dropOrders, isLoading: loadingDropOrders } = useQuery({
    queryKey: ["sellerDropOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actorExt.getMyDropshippingOrders();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  const createDropOrderMutation = useMutation({
    mutationFn: async (dropOrder: DropshippingOrder) => {
      if (!actor) throw new Error("No actor");
      return actorExt.createDropshippingOrder(dropOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerDropOrders"] });
      toast.success("Order forwarded to supplier!");
    },
    onError: () => toast.error("Failed to forward order"),
  });

  const updateDropStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: { orderId: string; status: string }) => {
      if (!actor) throw new Error("No actor");
      return actorExt.updateDropshippingOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellerDropOrders"] });
      toast.success("Status updated!");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // ── Product form state ──
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  // ── Supplier form state ──
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [deleteSupId, setDeleteSupId] = useState<string | null>(null);

  // ── Forward to supplier modal ──
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardingOrder, setForwardingOrder] = useState<{
    orderId: string;
    items: Array<{ productId: string; quantity: bigint }>;
    total: bigint;
  } | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [dropNotes, setDropNotes] = useState("");

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ ...emptyProduct, id: crypto.randomUUID() });
    setProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
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
      id: productForm.id,
      name: productForm.name,
      description: productForm.description,
      price: BigInt(
        Math.round(Number.parseFloat(productForm.price || "0") * 100),
      ),
      category: productForm.category,
      requiresPrescription: productForm.requiresPrescription,
      inStock: productForm.inStock,
      imageUrl: productForm.imageUrl || undefined,
    };
    if (editingProduct) {
      updateProductMutation.mutate(product);
    } else {
      addProductMutation.mutate(product);
    }
    setProductModalOpen(false);
  };

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ ...emptySupplier, id: crypto.randomUUID() });
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact,
      address: supplier.address,
      commissionRate: supplier.commissionRate.toString(),
    });
    setSupplierModalOpen(true);
  };

  const handleSupplierSubmit = () => {
    if (!supplierForm.name || !supplierForm.contact) {
      toast.error("Please fill in required fields");
      return;
    }
    // We need a dummy Principal for sellerId — the backend should set it from caller
    const supplierData = {
      id: supplierForm.id,
      name: supplierForm.name,
      contact: supplierForm.contact,
      address: supplierForm.address,
      commissionRate: BigInt(
        Math.round(Number.parseFloat(supplierForm.commissionRate || "0")),
      ),
      sellerId: {} as import("@icp-sdk/core/principal").Principal, // Backend sets from caller
    };
    if (editingSupplier) {
      updateSupplierMutation.mutate(supplierData);
    } else {
      addSupplierMutation.mutate(supplierData);
    }
    setSupplierModalOpen(false);
  };

  const handleForwardToSupplier = () => {
    if (!forwardingOrder || !selectedSupplierId) {
      toast.error("Please select a supplier");
      return;
    }
    const dropOrder: DropshippingOrder = {
      id: crypto.randomUUID(),
      buyerOrderId: forwardingOrder.orderId,
      supplierId: selectedSupplierId,
      sellerId: {} as import("@icp-sdk/core/principal").Principal,
      items: forwardingOrder.items,
      total: forwardingOrder.total,
      status: "pending",
      createdAt: BigInt(Date.now()) * BigInt(1_000_000),
      notes: dropNotes,
    };
    createDropOrderMutation.mutate(dropOrder);
    setForwardModalOpen(false);
    setForwardingOrder(null);
    setSelectedSupplierId("");
    setDropNotes("");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Store className="w-12 h-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-bold">
          Seller access required
        </h2>
        <Button onClick={() => onNavigate("account")} data-ocid="seller.link">
          Go to Account
        </Button>
      </div>
    );
  }

  const _totalRevenue = (myProducts ?? []).reduce(
    (sum, p) => sum + p.price,
    BigInt(0),
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 py-8"
      data-ocid="seller.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">
              Seller Dashboard
            </h1>
            {principal && (
              <p className="text-xs text-muted-foreground font-mono">
                {truncate(principal, 20)}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("home")}
          data-ocid="seller.link"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Store
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="My Products"
          value={(myProducts ?? []).length.toString()}
          icon={<Package className="w-5 h-5" />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Incoming Orders"
          value={incomingOrders.length.toString()}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Suppliers"
          value={(suppliers ?? []).length.toString()}
          icon={<Truck className="w-5 h-5" />}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          label="Drop Orders"
          value={(dropOrders ?? []).length.toString()}
          icon={<SendHorizonal className="w-5 h-5" />}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <Tabs defaultValue="products">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="products" data-ocid="seller.tab">
            <Package className="w-4 h-4 mr-1.5" /> My Products
          </TabsTrigger>
          <TabsTrigger value="orders" data-ocid="seller.tab">
            <TrendingUp className="w-4 h-4 mr-1.5" /> Incoming Orders
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-ocid="seller.tab">
            <Truck className="w-4 h-4 mr-1.5" /> Suppliers
          </TabsTrigger>
          <TabsTrigger value="dropshipping" data-ocid="seller.tab">
            <SendHorizonal className="w-4 h-4 mr-1.5" /> Drop Orders
          </TabsTrigger>
        </TabsList>

        {/* ── MY PRODUCTS ── */}
        <TabsContent value="products">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">My Products</h2>
            <Button
              size="sm"
              onClick={openAddProduct}
              data-ocid="seller.open_modal_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Product
            </Button>
          </div>
          {loadingProducts ? (
            <div
              className="flex justify-center py-12"
              data-ocid="seller.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table data-ocid="seller.table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(myProducts ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-12"
                        data-ocid="seller.empty_state"
                      >
                        No products yet. Add your first product.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (myProducts ?? []).map((product, i) => (
                      <TableRow
                        key={product.id}
                        data-ocid={`seller.item.${i + 1}`}
                      >
                        <TableCell>
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditProduct(product)}
                              data-ocid={`seller.edit_button.${i + 1}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteProductId(product.id)}
                              data-ocid={`seller.delete_button.${i + 1}`}
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

        {/* ── INCOMING ORDERS ── */}
        <TabsContent value="orders">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Incoming Orders</h2>
            <Badge variant="outline">{incomingOrders.length} orders</Badge>
          </div>
          {loadingOrders ? (
            <div
              className="flex justify-center py-12"
              data-ocid="seller.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table data-ocid="seller.table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomingOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-12"
                        data-ocid="seller.empty_state"
                      >
                        No incoming orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    incomingOrders.map((order, i) => (
                      <TableRow
                        key={`${order.userPrincipal}-${order.orderId}`}
                        data-ocid={`seller.item.${i + 1}`}
                      >
                        <TableCell className="font-mono text-xs">
                          {truncate(order.orderId)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {truncate(order.userPrincipal)}
                        </TableCell>
                        <TableCell>{order.items.length}</TableCell>
                        <TableCell className="font-medium">
                          {formatBDT(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="capitalize text-xs"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setForwardingOrder({
                                orderId: order.orderId,
                                items: order.items,
                                total: order.total,
                              });
                              setForwardModalOpen(true);
                            }}
                            data-ocid={`seller.secondary_button.${i + 1}`}
                          >
                            <SendHorizonal className="w-3.5 h-3.5 mr-1" />
                            Forward
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── SUPPLIERS ── */}
        <TabsContent value="suppliers">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">My Suppliers</h2>
            <Button
              size="sm"
              onClick={openAddSupplier}
              data-ocid="seller.open_modal_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
            </Button>
          </div>
          {loadingSuppliers ? (
            <div
              className="flex justify-center py-12"
              data-ocid="seller.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(suppliers ?? []).length === 0 ? (
                <div
                  className="col-span-full text-center py-16 bg-muted/30 rounded-2xl"
                  data-ocid="seller.empty_state"
                >
                  <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No suppliers yet. Add your first supplier.
                  </p>
                </div>
              ) : (
                (suppliers ?? []).map((supplier, i) => (
                  <Card
                    key={supplier.id}
                    className="border border-border"
                    data-ocid={`seller.item.${i + 1}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {supplier.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                        >
                          {supplier.commissionRate.toString()}% commission
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">
                        📞 {supplier.contact}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        📍 {supplier.address}
                      </p>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditSupplier(supplier)}
                          data-ocid={`seller.edit_button.${i + 1}`}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/5"
                          onClick={() => setDeleteSupId(supplier.id)}
                          data-ocid={`seller.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* ── DROPSHIPPING ORDERS ── */}
        <TabsContent value="dropshipping">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Dropshipping Orders</h2>
            <Badge variant="outline">{(dropOrders ?? []).length} orders</Badge>
          </div>
          {loadingDropOrders ? (
            <div
              className="flex justify-center py-12"
              data-ocid="seller.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table data-ocid="seller.table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>ID</TableHead>
                    <TableHead>Buyer Order</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dropOrders ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-12"
                        data-ocid="seller.empty_state"
                      >
                        No dropshipping orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (dropOrders ?? []).map((drop, i) => {
                      const supplier = (suppliers ?? []).find(
                        (s) => s.id === drop.supplierId,
                      );
                      return (
                        <TableRow
                          key={drop.id}
                          data-ocid={`seller.item.${i + 1}`}
                        >
                          <TableCell className="font-mono text-xs">
                            {truncate(drop.id)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {truncate(drop.buyerOrderId)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {supplier?.name || truncate(drop.supplierId)}
                          </TableCell>
                          <TableCell>{drop.items.length}</TableCell>
                          <TableCell className="font-medium">
                            {formatBDT(drop.total)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                dropshipStatusColors[drop.status] ??
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {drop.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(drop.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Select
                              defaultValue={drop.status}
                              onValueChange={(status) =>
                                updateDropStatusMutation.mutate({
                                  orderId: drop.id,
                                  status,
                                })
                              }
                            >
                              <SelectTrigger
                                className="h-8 w-40"
                                data-ocid={`seller.select.${i + 1}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="sent_to_supplier">
                                  Sent to Supplier
                                </SelectItem>
                                <SelectItem value="supplier_confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="fulfilled">
                                  Fulfilled
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Product Form Modal ── */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-lg" data-ocid="seller.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sprod-name">Product Name *</Label>
              <Input
                id="sprod-name"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Handmade Kantha Stitch Bag"
                data-ocid="seller.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sprod-desc">Description</Label>
              <Textarea
                id="sprod-desc"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Product description"
                rows={3}
                data-ocid="seller.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="sprod-price">Price (BDT ৳) *</Label>
                <Input
                  id="sprod-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm((p) => ({ ...p, price: e.target.value }))
                  }
                  placeholder="0.00"
                  data-ocid="seller.input"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(v) =>
                    setProductForm((p) => ({ ...p, category: v as Category }))
                  }
                >
                  <SelectTrigger data-ocid="seller.select">
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
              {productForm.imageUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={productForm.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm((p) => ({ ...p, imageUrl: "" }))
                    }
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    data-ocid="seller.delete_button"
                  >
                    ✕
                  </button>
                </div>
              )}
              <label htmlFor="sprod-image" className="self-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  data-ocid="seller.upload_button"
                >
                  <span>
                    <Upload className="w-4 h-4 mr-1" />
                    {productForm.imageUrl ? "Change Image" : "Upload Image"}
                  </span>
                </Button>
                <input
                  id="sprod-image"
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
                      setProductForm((p) => ({
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
                  id="sinStock"
                  checked={productForm.inStock}
                  onCheckedChange={(v) =>
                    setProductForm((p) => ({ ...p, inStock: v }))
                  }
                  data-ocid="seller.switch"
                />
                <Label htmlFor="sinStock">In Stock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="sRx"
                  checked={productForm.requiresPrescription}
                  onCheckedChange={(v) =>
                    setProductForm((p) => ({ ...p, requiresPrescription: v }))
                  }
                  data-ocid="seller.switch"
                />
                <Label htmlFor="sRx">Requires Prescription</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductModalOpen(false)}
              data-ocid="seller.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProductSubmit}
              disabled={
                !productForm.name ||
                !productForm.price ||
                addProductMutation.isPending ||
                updateProductMutation.isPending
              }
              data-ocid="seller.submit_button"
            >
              {editingProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Product Confirm ── */}
      <Dialog
        open={!!deleteProductId}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
      >
        <DialogContent data-ocid="seller.dialog">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This will permanently remove the product from your listings.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteProductId(null)}
              data-ocid="seller.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteProductId) {
                  deleteProductMutation.mutate(deleteProductId);
                  setDeleteProductId(null);
                }
              }}
              data-ocid="seller.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Supplier Form Modal ── */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="max-w-md" data-ocid="seller.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sup-name">Supplier Name *</Label>
              <Input
                id="sup-name"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Dhaka Textile Suppliers"
                data-ocid="seller.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sup-contact">Contact *</Label>
              <Input
                id="sup-contact"
                value={supplierForm.contact}
                onChange={(e) =>
                  setSupplierForm((p) => ({ ...p, contact: e.target.value }))
                }
                placeholder="01XXXXXXXXX or email"
                data-ocid="seller.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sup-addr">Address</Label>
              <Input
                id="sup-addr"
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="Full address"
                data-ocid="seller.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sup-comm">Commission Rate (%)</Label>
              <Input
                id="sup-comm"
                type="number"
                min="0"
                max="100"
                value={supplierForm.commissionRate}
                onChange={(e) =>
                  setSupplierForm((p) => ({
                    ...p,
                    commissionRate: e.target.value,
                  }))
                }
                placeholder="5"
                data-ocid="seller.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSupplierModalOpen(false)}
              data-ocid="seller.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSupplierSubmit}
              disabled={
                !supplierForm.name ||
                !supplierForm.contact ||
                addSupplierMutation.isPending ||
                updateSupplierMutation.isPending
              }
              data-ocid="seller.submit_button"
            >
              {editingSupplier ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Supplier Confirm ── */}
      <Dialog
        open={!!deleteSupId}
        onOpenChange={(open) => !open && setDeleteSupId(null)}
      >
        <DialogContent data-ocid="seller.dialog">
          <DialogHeader>
            <DialogTitle>Remove Supplier?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This will remove the supplier from your list.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSupId(null)}
              data-ocid="seller.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteSupId) {
                  deleteSupplierMutation.mutate(deleteSupId);
                  setDeleteSupId(null);
                }
              }}
              data-ocid="seller.confirm_button"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Forward to Supplier Modal ── */}
      <Dialog open={forwardModalOpen} onOpenChange={setForwardModalOpen}>
        <DialogContent className="max-w-md" data-ocid="seller.dialog">
          <DialogHeader>
            <DialogTitle>Forward to Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Select a supplier to handle this order via dropshipping.
            </p>
            {forwardingOrder && (
              <div className="bg-muted/40 rounded-lg p-3 text-sm">
                <p>
                  <span className="font-medium">Order:</span> #
                  {forwardingOrder.orderId}
                </p>
                <p>
                  <span className="font-medium">Items:</span>{" "}
                  {forwardingOrder.items.length}
                </p>
                <p>
                  <span className="font-medium">Total:</span>{" "}
                  {formatBDT(forwardingOrder.total)}
                </p>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Select Supplier</Label>
              <Select
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
              >
                <SelectTrigger data-ocid="seller.select">
                  <SelectValue placeholder="Choose a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.commissionRate.toString()}% commission)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(suppliers ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No suppliers added yet. Add a supplier first.
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="drop-notes">Notes (optional)</Label>
              <Textarea
                id="drop-notes"
                value={dropNotes}
                onChange={(e) => setDropNotes(e.target.value)}
                placeholder="Any special instructions for the supplier..."
                rows={3}
                data-ocid="seller.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForwardModalOpen(false)}
              data-ocid="seller.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleForwardToSupplier}
              disabled={
                !selectedSupplierId || createDropOrderMutation.isPending
              }
              data-ocid="seller.confirm_button"
            >
              {createDropOrderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <SendHorizonal className="w-4 h-4 mr-2" />
              )}
              Forward Order
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
    <Card data-ocid="seller.card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
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
