import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronRight,
  Headphones,
  RefreshCw,
  Shield,
  Star,
  Truck,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import {
  type Category,
  type Product,
  categoryInfo,
  formatBDT,
  products,
} from "../data/products";

interface HomePageProps {
  onNavigate: (page: string) => void;
  onPrescriptionRequired: (product: Product) => void;
}

const featuredByCategory: Record<Category, Product[]> = {
  electronics: products.filter((p) => p.category === "electronics").slice(0, 3),
  pharmacy: products.filter((p) => p.category === "pharmacy").slice(0, 3),
  fashion: products.filter((p) => p.category === "fashion").slice(0, 3),
  books: products.filter((p) => p.category === "books").slice(0, 3),
};

function ProductCard({
  product,
  onAdd,
  onPrescriptionRequired,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  onPrescriptionRequired: (product: Product) => void;
}) {
  const { items } = useCart();
  const inCart = items.some((i) => i.productId === product.id);

  const handleAdd = () => {
    if (product.requiresPrescription) {
      onPrescriptionRequired(product);
    } else {
      onAdd(product);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200 overflow-hidden border-border">
      <div className="relative h-36 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
        {product.imageUrl || product.image ? (
          <img
            src={(product.imageUrl || product.image)!}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl">{product.emoji}</span>
        )}
        {product.requiresPrescription && (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-1.5">
            Rx Required
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm line-clamp-1 mb-0.5">
          {product.name}
        </p>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-muted-foreground">
            {product.rating} ({product.reviews})
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-primary">
            {formatBDT(product.price)}
          </span>
          <Button
            size="sm"
            variant={inCart ? "secondary" : "default"}
            className="h-7 text-xs px-3"
            onClick={handleAdd}
            data-ocid="product.primary_button"
          >
            {inCart ? "In Cart" : "Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage({
  onNavigate,
  onPrescriptionRequired,
}: HomePageProps) {
  const { addItem } = useCart();

  const handleAdd = (product: Product) => {
    addItem(product);
    toast.success(`${product.name} added to cart!`, {
      description: formatBDT(product.price),
    });
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-teal-700">
        <div className="absolute inset-0 opacity-10">
          <img
            src="/assets/generated/hero-banner.dim_1200x500.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-white"
          >
            <Badge className="bg-white/20 text-white border-white/30 mb-4">
              🇧🇩 Bangladesh's Trusted Store
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
              Shop Smart,
              <br />
              Shop <span className="text-accent">Local</span>
            </h1>
            <p className="text-white/80 text-lg mb-6 max-w-md">
              Electronics, Pharmacy, Fashion & Books — all in one place.
              Delivered to your door across Bangladesh.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold"
                onClick={() => onNavigate("category-electronics")}
                data-ocid="hero.primary_button"
              >
                Shop Now <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
                onClick={() => onNavigate("category-pharmacy")}
                data-ocid="hero.secondary_button"
              >
                Pharmacy
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 grid grid-cols-2 gap-3 max-w-sm"
          >
            {[
              {
                emoji: "📱",
                label: "Electronics",
                count: "500+",
                page: "category-electronics",
              },
              {
                emoji: "💊",
                label: "Pharmacy",
                count: "1200+",
                page: "category-pharmacy",
              },
              {
                emoji: "👗",
                label: "Fashion",
                count: "800+",
                page: "category-fashion",
              },
              {
                emoji: "📚",
                label: "Books",
                count: "3000+",
                page: "category-books",
              },
            ].map((item) => (
              <motion.button
                key={item.page}
                type="button"
                whileHover={{ scale: 1.05 }}
                onClick={() => onNavigate(item.page)}
                className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-white text-left hover:bg-white/25 transition-colors"
                data-ocid="hero.card"
              >
                <div className="text-3xl mb-1">{item.emoji}</div>
                <div className="font-semibold text-sm">{item.label}</div>
                <div className="text-white/60 text-xs">
                  {item.count} products
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(
            Object.entries(categoryInfo) as [
              Category,
              (typeof categoryInfo)[Category],
            ][]
          ).map(([key, info], idx) => (
            <motion.button
              key={key}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              onClick={() => onNavigate(`category-${key}`)}
              data-ocid="category.card"
              className={`${info.bg} rounded-2xl p-6 text-left hover:shadow-lg transition-all duration-200 border border-transparent hover:border-border`}
            >
              <div className="text-4xl mb-3">{info.emoji}</div>
              <h3 className={`font-bold text-lg ${info.color}`}>
                {info.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {products.filter((p) => p.category === key).length} products
              </p>
              <div
                className={`flex items-center gap-1 mt-3 text-xs font-medium ${info.color}`}
              >
                Browse <ChevronRight className="w-3 h-3" />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Featured Products by Category */}
      {(Object.entries(featuredByCategory) as [Category, Product[]][]).map(
        ([cat, prods]) => (
          <section key={cat} className="max-w-7xl mx-auto px-4 pb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <span>{categoryInfo[cat].emoji}</span>
                {categoryInfo[cat].label}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate(`category-${cat}`)}
                className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                data-ocid="category.link"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {prods.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={handleAdd}
                  onPrescriptionRequired={onPrescriptionRequired}
                />
              ))}
            </div>
          </section>
        ),
      )}

      {/* Trust badges */}
      <section className="bg-muted/30 border-y border-border py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "100% Authentic",
                desc: "All products verified genuine",
                color: "text-emerald-600",
              },
              {
                icon: Truck,
                title: "Fast Delivery",
                desc: "Dhaka: same day, nationwide: 2-3 days",
                color: "text-blue-600",
              },
              {
                icon: RefreshCw,
                title: "Easy Returns",
                desc: "7-day hassle-free return policy",
                color: "text-violet-600",
              },
              {
                icon: Headphones,
                title: "24/7 Support",
                desc: "Call, chat, or WhatsApp anytime",
                color: "text-rose-600",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl bg-white shadow-sm ${item.color}`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
