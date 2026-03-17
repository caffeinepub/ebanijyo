import {
  BookOpen,
  Mail,
  MapPin,
  Phone,
  Pill,
  Shirt,
  Smartphone,
} from "lucide-react";

export default function Footer({
  onNavigate,
}: { onNavigate: (page: string) => void }) {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "ebanijyo.com";

  return (
    <footer className="bg-primary text-primary-foreground mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="font-display font-bold text-xl">Ebanijyo</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Bangladesh's trusted online marketplace for electronics, pharmacy,
              fashion, and books.
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="tel:01700000000"
                className="flex items-center gap-1.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> 01700-000000
              </a>
            </div>
            <div className="mt-2">
              <a
                href="mailto:support@ebanijyo.com"
                className="flex items-center gap-1.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> support@ebanijyo.com
              </a>
            </div>
            <div className="mt-2">
              <span className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
                <MapPin className="w-3.5 h-3.5" /> Dhaka, Bangladesh
              </span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-3">Categories</h4>
            <ul className="space-y-2">
              {[
                {
                  label: "Electronics",
                  page: "category-electronics",
                  Icon: Smartphone,
                },
                { label: "Pharmacy", page: "category-pharmacy", Icon: Pill },
                { label: "Fashion", page: "category-fashion", Icon: Shirt },
                { label: "Books", page: "category-books", Icon: BookOpen },
              ].map((item) => (
                <li key={item.page}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    className="flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    <item.Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <span className="cursor-pointer hover:text-primary-foreground transition-colors">
                  About Us
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-primary-foreground transition-colors">
                  Track Order
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-primary-foreground transition-colors">
                  Return Policy
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-primary-foreground transition-colors">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-primary-foreground transition-colors">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>

          {/* Payment */}
          <div>
            <h4 className="font-semibold mb-3">We Accept</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "bKash", emoji: "🟣", bg: "bg-pink-600" },
                { label: "Nagad", emoji: "🟠", bg: "bg-orange-500" },
                { label: "Visa", emoji: "💳", bg: "bg-blue-700" },
                { label: "Mastercard", emoji: "🔴", bg: "bg-red-600" },
                { label: "COD", emoji: "💵", bg: "bg-emerald-700" },
              ].map((pm) => (
                <span
                  key={pm.label}
                  className={`${pm.bg} text-white text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1`}
                >
                  {pm.emoji} {pm.label}
                </span>
              ))}
            </div>
            <div className="mt-4 text-xs text-primary-foreground/60">
              <p>🔒 SSL Secured Payments</p>
              <p className="mt-1">🛡️ Buyer Protection Guaranteed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-primary-foreground/60">
          <p>© {year} Ebanijyo. All rights reserved. | www.ebanijyo.com</p>
          <p>
            Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
