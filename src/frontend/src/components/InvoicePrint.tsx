import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import type { Order, Product, UserProfile } from "../backend";

interface InvoicePrintProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  profile: UserProfile | null;
  products: Product[];
}

function formatDate(nanos: bigint): string {
  const ms = Number(nanos / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatBDT(paisa: bigint): string {
  return `৳${(Number(paisa) / 100).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function InvoicePrint({
  open,
  onClose,
  order,
  profile,
  products,
}: InvoicePrintProps) {
  const getProduct = (productId: string) =>
    products.find((p) => p.id === productId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { margin: 0; padding: 20px; }
          body > *:not(.print-area) { display: none !important; }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="invoice.dialog"
        >
          <DialogHeader className="no-print">
            <DialogTitle>Invoice #{order.orderId}</DialogTitle>
          </DialogHeader>

          {/* Invoice content */}
          <div
            className="print-area bg-white p-6 rounded-lg"
            id="invoice-content"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/uploads/646415690_122129959023039925_882986950918788078_n.jpg-ebanijyo-1.jpg"
                  alt="Ebanijyo"
                  className="h-14 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
                <div>
                  <h2 className="font-bold text-xl text-primary">Ebanijyo</h2>
                  <p className="text-xs text-muted-foreground">
                    www.ebanijyo.com
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dhaka, Bangladesh
                  </p>
                  <p className="text-xs text-muted-foreground">
                    support@ebanijyo.com
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold text-foreground tracking-wide">
                  INVOICE
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">#</span>
                  {order.orderId}
                </p>
                <p className="text-sm text-muted-foreground">
                  Date: {formatDate(order.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  Payment: {order.paymentMethod}
                </p>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Bill To */}
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                Bill To
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="font-semibold text-foreground">
                  {profile?.name || "Customer"}
                </p>
                {profile?.email && (
                  <p className="text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                )}
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground">
                    {profile.phone}
                  </p>
                )}
                {profile?.address && (
                  <p className="text-sm text-muted-foreground">
                    {profile.address}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                Order Items
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-3 font-semibold text-foreground">
                        Product
                      </th>
                      <th className="px-4 py-3 font-semibold text-foreground text-center">
                        Qty
                      </th>
                      <th className="px-4 py-3 font-semibold text-foreground text-right">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 font-semibold text-foreground text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => {
                      const product = getProduct(item.productId);
                      const qty = Number(item.quantity);
                      const unitPrice = product ? Number(product.price) : 0;
                      const lineTotal = unitPrice * qty;
                      return (
                        <tr
                          key={`${item.productId}-${idx}`}
                          className="border-t border-border"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">
                              {product?.name || item.productId}
                            </p>
                            {product?.category && (
                              <p className="text-xs text-muted-foreground capitalize">
                                {product.category}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">{qty}</td>
                          <td className="px-4 py-3 text-right">
                            {product ? formatBDT(product.price) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {product
                              ? `৳${lineTotal.toLocaleString("en-BD")}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBDT(order.total)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-emerald-600">Free</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between py-2 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatBDT(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Thank you for shopping with Ebanijyo!
                </p>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    order.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : order.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Print button */}
          <div className="flex justify-end gap-3 pt-2 no-print">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="invoice.cancel_button"
            >
              Close
            </Button>
            <Button onClick={handlePrint} data-ocid="invoice.primary_button">
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
