import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Filter, Star } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import {
  type Category,
  type Product,
  categoryInfo,
  formatBDT,
  products,
} from "../data/products";

interface CategoryPageProps {
  category: Category;
  onNavigate: (page: string) => void;
  onPrescriptionRequired: (product: Product) => void;
}

export default function CategoryPage({
  category,
  onNavigate,
  onPrescriptionRequired,
}: CategoryPageProps) {
  const { addItem, items } = useCart();
  const [sortBy, setSortBy] = useState<
    "default" | "price-asc" | "price-desc" | "rating"
  >("default");
  const info = categoryInfo[category];
  const categoryProducts = products.filter((p) => p.category === category);

  const sorted = [...categoryProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  const handleAdd = (product: Product) => {
    if (product.requiresPrescription) {
      onPrescriptionRequired(product);
    } else {
      addItem(product);
      toast.success(`${product.name} added to cart!`);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="category.link"
        >
          <ChevronLeft className="w-4 h-4" /> Home
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{info.label}</span>
      </div>

      {/* Header */}
      <div
        className={`${info.bg} rounded-2xl p-6 mb-8 flex items-center gap-4`}
      >
        <div className="text-5xl">{info.emoji}</div>
        <div>
          <h1 className={`font-display text-2xl font-bold ${info.color}`}>
            {info.label}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {categoryProducts.length} products available
            {category === "pharmacy" &&
              " · Prescription items require valid Rx"}
          </p>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {(["default", "price-asc", "price-desc", "rating"] as const).map(
          (opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSortBy(opt)}
              data-ocid="category.tab"
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                sortBy === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt === "default"
                ? "Featured"
                : opt === "price-asc"
                  ? "Price ↑"
                  : opt === "price-desc"
                    ? "Price ↓"
                    : "Top Rated"}
            </button>
          ),
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sorted.map((product, idx) => {
          const inCart = items.some((i) => i.productId === product.id);
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              data-ocid={`product.item.${idx + 1}`}
            >
              <Card className="h-full flex flex-col hover:shadow-md transition-shadow border-border overflow-hidden">
                <div className="relative h-44 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  {product.imageUrl || product.image ? (
                    <img
                      src={(product.imageUrl || product.image)!}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl">{product.emoji}</span>
                  )}
                  {product.requiresPrescription && (
                    <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[10px]">
                      Rx Required
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-muted-foreground">
                      {product.rating} · {product.reviews} reviews
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="font-bold text-primary text-lg">
                      {formatBDT(product.price)}
                    </span>
                    <Button
                      size="sm"
                      variant={inCart ? "secondary" : "default"}
                      onClick={() => handleAdd(product)}
                      data-ocid="product.primary_button"
                    >
                      {inCart
                        ? "✓ Added"
                        : product.requiresPrescription
                          ? "Upload Rx"
                          : "Add to Cart"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
