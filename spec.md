# Ebanijyo

## Current State
Full-stack ecommerce platform for Bangladesh with:
- 24 products across Electronics, Pharmacy, Fashion, Books
- User login via Internet Identity with order history
- Admin dashboard with product/order management and image uploads
- Working cart, 4-step checkout, bKash/Nagad/Stripe payment integrations
- Prescription upload modal for pharmacy products
- Roles: admin, user, guest

## Requested Changes (Diff)

### Add
- **Ebanijyo Logo** in navbar: replace the "E" text icon with the uploaded logo image at `/assets/uploads/646415690_122129959023039925_882986950918788078_n.jpg-ebanijyo-1.jpg`
- **Buyer/Seller Registration**: during signup, users choose role: Buyer or Seller
- **Seller Portal** (new page `seller-dashboard`):
  - Product upload: add/edit/delete their own products with images
  - View incoming buyer orders for their products
  - Order status management
  - Supplier management: add supplier info (name, contact, price)
  - Dropshipping workflow: send order to supplier, track supplier fulfillment
- **Buyer Portal** (enhancements to `AccountPage`):
  - View orders with invoice download/print per order
  - Order detail view with full line items, totals, payment method
- **Invoice & Print**:
  - Printable invoice page for both buyers (order receipt) and sellers (sales invoice)
  - Print button triggers browser print with formatted invoice layout
  - Invoice shows: order ID, date, buyer info, items, totals, payment method, Ebanijyo branding
- **Dropshipping Backend**:
  - Supplier type: id, name, contact, productIds, commissionRate
  - DropshippingOrder type: orderId, supplierId, items, status (pending/sent/fulfilled), buyerOrderId
  - Seller can assign supplier to product
  - When buyer places order, seller sees it and can forward to supplier

### Modify
- **Navbar**: replace `E` logo box with actual Ebanijyo logo image; add "Seller Dashboard" link for sellers
- **AccountPage**: add invoice print button per order; show buyer role badge
- **App.tsx**: add routing for `seller-dashboard` page
- **Backend**: extend with Supplier, DropshippingOrder types, seller role support, supplier CRUD, dropship order management

### Remove
- Nothing removed

## Implementation Plan
1. Update Motoko backend: add Supplier type, DropshippingOrder type, seller/buyer role tracking (use UserProfile.role field), supplier CRUD (admin/seller), dropship order creation/status update, get seller's products, get orders for seller's products
2. Update Navbar: swap `E` placeholder with `<img>` logo, add Seller Dashboard nav link
3. Create SellerDashboard page: product upload, incoming orders, supplier management, dropshipping workflow
4. Update AccountPage: add per-order invoice view with print functionality
5. Create InvoicePrint component: formatted invoice for print with Ebanijyo logo and branding
6. Add buyer/seller role selection on first login (profile setup step)
7. Update App.tsx routing for seller-dashboard page
