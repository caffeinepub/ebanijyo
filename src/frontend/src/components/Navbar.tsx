import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  Search,
  Shirt,
  ShoppingCart,
  Smartphone,
  Store,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useActor } from "../hooks/useActor";
import { LoginButton, useAuth } from "./auth";

type Page = string;

interface NavbarProps {
  onNavigate: (page: Page) => void;
  currentPage: string;
  onCartOpen: () => void;
}

const categories = [
  { label: "Electronics", icon: Smartphone, page: "category-electronics" },
  { label: "Pharmacy", icon: Pill, page: "category-pharmacy" },
  { label: "Fashion", icon: Shirt, page: "category-fashion" },
  { label: "Books", icon: BookOpen, page: "category-books" },
];

export default function Navbar({
  onNavigate,
  currentPage,
  onCartOpen,
}: NavbarProps) {
  const { totalItems } = useCart();
  const { isAuthenticated, logout, isInitializing } = useAuth();
  const { actor, isFetching } = useActor();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
  });

  const isSeller = (profile as any)?.accountType === "seller";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-border">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1.5 text-center">
        🚚 Free delivery on orders above ৳999 &nbsp;|&nbsp; 📞 Hotline:
        01700-000000
      </div>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 flex-shrink-0"
          data-ocid="nav.link"
        >
          <img
            src="/assets/uploads/646415690_122129959023039925_882986950918788078_n.jpg-ebanijyo-1.jpg"
            alt="Ebanijyo"
            className="h-9 w-auto object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const sibling = target.nextElementSibling as HTMLElement | null;
              if (sibling) sibling.style.display = "flex";
            }}
          />
          <div
            className="w-9 h-9 rounded-xl bg-primary items-center justify-center hidden"
            aria-hidden="true"
          >
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <span className="font-display font-bold text-xl text-primary hidden sm:block">
            Ebanijyo
          </span>
        </button>

        {/* Search */}
        <div className="flex-1 max-w-xl hidden md:flex items-center relative">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products, brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full border border-input bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            data-ocid="nav.search_input"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {!isInitializing &&
            (isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:flex items-center gap-1.5"
                    data-ocid="nav.toggle"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">My Account</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52"
                  data-ocid="nav.dropdown_menu"
                >
                  <DropdownMenuItem
                    onClick={() => onNavigate("account")}
                    data-ocid="nav.link"
                  >
                    <User className="w-4 h-4 mr-2" /> Account
                  </DropdownMenuItem>
                  {isSeller && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onNavigate("seller-dashboard")}
                        data-ocid="nav.link"
                      >
                        <Store className="w-4 h-4 mr-2" /> Seller Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onNavigate("admin")}
                        data-ocid="nav.link"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Admin
                        Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive"
                    data-ocid="nav.secondary_button"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <LoginButton
                variant="outline"
                size="sm"
                label="Login"
                className="hidden md:flex"
              />
            ))}

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onCartOpen}
            data-ocid="nav.cart_button"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground rounded-full">
                {totalItems > 99 ? "99+" : totalItems}
              </Badge>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-ocid="nav.menu_toggle"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Category nav */}
      <nav className="hidden md:flex max-w-7xl mx-auto px-4 pb-2 gap-1">
        {categories.map((cat) => (
          <button
            key={cat.page}
            type="button"
            onClick={() => onNavigate(cat.page)}
            data-ocid="nav.tab"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              currentPage === cat.page
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            }`}
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.label}
          </button>
        ))}
        {isSeller && (
          <button
            type="button"
            onClick={() => onNavigate("seller-dashboard")}
            data-ocid="nav.tab"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              currentPage === "seller-dashboard"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Seller
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onNavigate("admin")}
            data-ocid="nav.tab"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ml-auto ${
              currentPage === "admin"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Admin
          </button>
        )}
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border overflow-hidden"
          >
            <div className="px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center relative">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2 rounded-full border border-input bg-muted/40 text-sm focus:outline-none"
                />
              </div>
              {categories.map((cat) => (
                <button
                  key={cat.page}
                  type="button"
                  onClick={() => {
                    onNavigate(cat.page);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium"
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
              <NavSeparator />
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate("account");
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium"
                    data-ocid="nav.link"
                  >
                    <User className="w-4 h-4" /> My Account
                  </button>
                  {isSeller && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("seller-dashboard");
                        setMobileOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium"
                      data-ocid="nav.link"
                    >
                      <Store className="w-4 h-4" /> Seller Dashboard
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("admin");
                        setMobileOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium"
                      data-ocid="nav.link"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium text-destructive"
                    data-ocid="nav.secondary_button"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <LoginButton label="Login" className="w-full justify-center" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavSeparator() {
  return <div className="h-px bg-border my-1" />;
}
