import Set "mo:core/Set";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import Stripe "stripe/stripe";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import OutCall "http-outcalls/outcall";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  public type Category = {
    #electronics;
    #pharmacy;
    #fashion;
    #books;
  };

  // Stable stored type - UNCHANGED from previous version (no sellerId)
  type StoredProduct = {
    id : Text;
    name : Text;
    description : Text;
    price : Nat;
    category : Category;
    requiresPrescription : Bool;
    inStock : Bool;
    imageUrl : ?Text;
  };

  // Public API type with optional sellerId (computed from productSellers map)
  public type Product = {
    id : Text;
    name : Text;
    description : Text;
    price : Nat;
    category : Category;
    requiresPrescription : Bool;
    inStock : Bool;
    imageUrl : ?Text;
    sellerId : ?Principal;
  };

  public type CartItem = {
    productId : Text;
    quantity : Nat;
  };

  public type PrescriptionRecord = {
    productId : Text;
    fileName : Text;
    uploadTime : Int;
  };

  // Stable stored type - UNCHANGED from previous version (no accountType)
  type StoredUserProfile = {
    name : Text;
    email : Text;
    phone : Text;
    address : Text;
  };

  // Public API type with accountType (stored separately in userAccountTypes map)
  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
    address : Text;
    accountType : Text;
  };

  public type Order = {
    orderId : Text;
    items : [CartItem];
    total : Nat;
    paymentMethod : Text;
    status : Text;
    createdAt : Int;
  };

  public type AdminOrder = {
    user : Principal;
    orders : [Order];
  };

  public type OrderStatus = {
    user : Principal;
    orderId : Text;
    status : Text;
  };

  public type DashboardStats = {
    totalProducts : Nat;
    totalOrders : Nat;
    totalRevenue : Nat;
    outOfStockProducts : Nat;
  };

  public type BkashConfig = {
    appKey : Text;
    appSecret : Text;
    username : Text;
    password : Text;
    isSandbox : Bool;
  };

  public type NagadConfig = {
    merchantID : Text;
    merchantPrivateKey : Text;
    isSandbox : Bool;
  };

  public type Supplier = {
    id : Text;
    name : Text;
    contact : Text;
    address : Text;
    sellerId : Principal;
    commissionRate : Nat;
  };

  public type DropshippingOrder = {
    id : Text;
    buyerOrderId : Text;
    supplierId : Text;
    sellerId : Principal;
    items : [CartItem];
    total : Nat;
    status : Text;
    createdAt : Int;
    notes : Text;
  };

  // Stable variables - original types preserved for backward compatibility
  let products = Map.empty<Text, StoredProduct>();
  let cart = Map.empty<Text, Nat>();
  let prescriptionRecords = Set.empty<Text>();
  let userProfiles = Map.empty<Principal, StoredUserProfile>();
  let userOrders = Map.empty<Principal, [Order]>();

  // New stable variables (no compatibility issues - they are new)
  let productSellers = Map.empty<Text, Principal>();
  let userAccountTypes = Map.empty<Principal, Text>();
  let suppliers = Map.empty<Text, Supplier>();
  let dropshippingOrders = Map.empty<Text, DropshippingOrder>();

  var stripeConfiguration : ?Stripe.StripeConfiguration = null;
  var bkashConfiguration : ?BkashConfig = null;
  var nagadConfiguration : ?NagadConfig = null;

  // Helper: enrich StoredProduct with sellerId
  func enrichProduct(p : StoredProduct) : Product {
    {
      id = p.id;
      name = p.name;
      description = p.description;
      price = p.price;
      category = p.category;
      requiresPrescription = p.requiresPrescription;
      inStock = p.inStock;
      imageUrl = p.imageUrl;
      sellerId = productSellers.get(p.id);
    };
  };

  // Helper: extract StoredProduct from Product (drop sellerId)
  func toStoredProduct(p : Product) : StoredProduct {
    {
      id = p.id;
      name = p.name;
      description = p.description;
      price = p.price;
      category = p.category;
      requiresPrescription = p.requiresPrescription;
      inStock = p.inStock;
      imageUrl = p.imageUrl;
    };
  };

  // Helper: enrich StoredUserProfile with accountType
  func enrichProfile(p : StoredUserProfile, caller : Principal) : UserProfile {
    {
      name = p.name;
      email = p.email;
      phone = p.phone;
      address = p.address;
      accountType = switch (userAccountTypes.get(caller)) {
        case (null) { "buyer" };
        case (?t) { t };
      };
    };
  };

  public shared ({ caller }) func initializeProducts() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can initialize products");
    };
    let initialProducts : [StoredProduct] = [
      { id = "p1"; name = "Smartphone"; description = "Latest Android smartphone"; price = 150000; category = #electronics; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p2"; name = "Antibiotics"; description = "Prescription medicine"; price = 5000; category = #pharmacy; requiresPrescription = true; inStock = true; imageUrl = null },
      { id = "p3"; name = "Leather Wallet"; description = "Genuine leather wallet"; price = 2000; category = #fashion; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p4"; name = "Novel"; description = "Bestselling novel"; price = 800; category = #books; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p5"; name = "Laptop"; description = "High-performance laptop"; price = 800000; category = #electronics; requiresPrescription = false; inStock = false; imageUrl = null },
      { id = "p6"; name = "Pain Reliever"; description = "Over-the-counter pain medicine"; price = 1200; category = #pharmacy; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p7"; name = "Formal Shirt"; description = "Men's formal shirt"; price = 2500; category = #fashion; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p8"; name = "Textbook"; description = "Educational textbook"; price = 2000; category = #books; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p9"; name = "Headphones"; description = "Wireless headphones"; price = 3500; category = #electronics; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p10"; name = "Blood Pressure Monitor"; description = "Medical device"; price = 3200; category = #pharmacy; requiresPrescription = true; inStock = true; imageUrl = null },
      { id = "p11"; name = "Handbag"; description = "Women's handbag"; price = 4500; category = #fashion; requiresPrescription = false; inStock = true; imageUrl = null },
      { id = "p12"; name = "Children's Storybook"; description = "Colorful storybook for kids"; price = 600; category = #books; requiresPrescription = false; inStock = true; imageUrl = null },
    ];
    for (product in initialProducts.values()) {
      products.add(product.id, product);
    };
  };

  public query ({ caller }) func getAllOrders() : async [AdminOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all orders");
    };
    userOrders.toArray().map<((Principal, [Order])), AdminOrder>(func((user, orders)) { { user; orders } });
  };

  public shared ({ caller }) func addProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    products.add(product.id, toStoredProduct(product));
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      productSellers.add(product.id, caller);
    } else {
      switch (product.sellerId) {
        case (null) {};
        case (?sid) { productSellers.add(product.id, sid) };
      };
    };
  };

  public shared ({ caller }) func updateProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      switch (productSellers.get(product.id)) {
        case (null) { Runtime.trap("Unauthorized: Not your product") };
        case (?sid) {
          if (sid != caller) { Runtime.trap("Unauthorized: Not your product") };
        };
      };
    };
    products.add(product.id, toStoredProduct(product));
  };

  public shared ({ caller }) func deleteProduct(productId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      switch (productSellers.get(productId)) {
        case (null) { Runtime.trap("Unauthorized: Not your product") };
        case (?sid) {
          if (sid != caller) { Runtime.trap("Unauthorized: Not your product") };
        };
      };
    };
    products.remove(productId);
    productSellers.remove(productId);
  };

  public query ({ caller }) func getMySellerProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    products.values().toArray()
      .filter(func(p) {
        switch (productSellers.get(p.id)) {
          case (null) { false };
          case (?sid) { sid == caller };
        }
      })
      .map(enrichProduct);
  };

  public shared ({ caller }) func updateOrderStatus(statusUpdate : OrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update order status");
    };
    switch (userOrders.get(statusUpdate.user)) {
      case (null) { Runtime.trap("User has no orders") };
      case (?orders) {
        let updatedOrders = orders.map(func(order) {
          if (order.orderId == statusUpdate.orderId) { { order with status = statusUpdate.status } } else { order }
        });
        userOrders.add(statusUpdate.user, updatedOrders);
      };
    };
  };

  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access dashboard stats");
    };
    let totalProducts = products.size();
    let outOfStockProducts = products.values().toArray().filter(func(p) { not p.inStock }).size();
    var totalOrders = 0;
    var totalRevenue = 0;
    for (orders in userOrders.values()) {
      totalOrders += orders.size();
      for (order in orders.values()) { totalRevenue += order.total };
    };
    { totalProducts; totalOrders; totalRevenue; outOfStockProducts };
  };

  // Supplier management
  public shared ({ caller }) func addSupplier(supplier : Supplier) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    suppliers.add(supplier.id, { supplier with sellerId = caller });
  };

  public shared ({ caller }) func updateSupplier(supplier : Supplier) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (suppliers.get(supplier.id)) {
      case (null) { Runtime.trap("Supplier not found") };
      case (?existing) {
        if (existing.sellerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Not your supplier");
        };
        suppliers.add(supplier.id, supplier);
      };
    };
  };

  public shared ({ caller }) func deleteSupplier(supplierId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (suppliers.get(supplierId)) {
      case (null) { Runtime.trap("Supplier not found") };
      case (?existing) {
        if (existing.sellerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Not your supplier");
        };
        suppliers.remove(supplierId);
      };
    };
  };

  public query ({ caller }) func getMySuppliers() : async [Supplier] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    suppliers.values().toArray().filter(func(s) { s.sellerId == caller });
  };

  public query ({ caller }) func getAllSuppliers() : async [Supplier] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all suppliers");
    };
    suppliers.values().toArray();
  };

  // Dropshipping orders
  public shared ({ caller }) func createDropshippingOrder(dropOrder : DropshippingOrder) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    dropshippingOrders.add(dropOrder.id, { dropOrder with sellerId = caller; createdAt = Time.now() });
  };

  public shared ({ caller }) func updateDropshippingOrderStatus(orderId : Text, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (dropshippingOrders.get(orderId)) {
      case (null) { Runtime.trap("Dropshipping order not found") };
      case (?existing) {
        if (existing.sellerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Not your order");
        };
        dropshippingOrders.add(orderId, { existing with status });
      };
    };
  };

  public query ({ caller }) func getMyDropshippingOrders() : async [DropshippingOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    dropshippingOrders.values().toArray().filter(func(d) { d.sellerId == caller });
  };

  public query ({ caller }) func getAllDropshippingOrders() : async [DropshippingOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all dropshipping orders");
    };
    dropshippingOrders.values().toArray();
  };

  // Stripe
  public query ({ caller }) func isStripeConfigured() : async Bool { stripeConfiguration != null };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfiguration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?value) { value };
    };
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check payment status");
    };
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?p) { ?enrichProfile(p, caller) };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (userProfiles.get(user)) {
      case (null) { null };
      case (?p) { ?enrichProfile(p, user) };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, {
      name = profile.name;
      email = profile.email;
      phone = profile.phone;
      address = profile.address;
    });
    userAccountTypes.add(caller, profile.accountType);
  };

  public query ({ caller }) func getProducts() : async [Product] {
    products.values().toArray().map(enrichProduct);
  };

  public query ({ caller }) func getProductsByCategory(category : Category) : async [Product] {
    products.values().toArray()
      .filter(func(p) { p.category == category })
      .map(enrichProduct);
  };

  public shared ({ caller }) func addToCart(productId : Text, quantity : Nat) : async () {
    if (quantity <= 0) { Runtime.trap("Quantity must be greater than 0") };
    let existingQuantity = switch (cart.get(productId)) {
      case (null) { 0 };
      case (?qty) { qty };
    };
    cart.add(productId, existingQuantity + quantity);
  };

  public shared ({ caller }) func removeFromCart(productId : Text) : async () {
    if (not cart.containsKey(productId)) { Runtime.trap("Product not in cart") };
    cart.remove(productId);
  };

  public query ({ caller }) func getCart() : async [CartItem] {
    cart.toArray().map(func((productId, quantity)) { { productId; quantity } });
  };

  public shared ({ caller }) func clearCart() : async () { cart.clear() };

  public shared ({ caller }) func uploadPrescription(productId : Text, fileName : Text, _uploadTime : Int, _file : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload prescriptions");
    };
    if (not products.containsKey(productId)) { Runtime.trap("Product does not exist") };
    prescriptionRecords.add(productId # ":" # fileName);
  };

  public shared ({ caller }) func placeOrder() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place orders");
    };
    cart.clear();
  };

  public query ({ caller }) func hasPrescription(productId : Text, fileName : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check prescription status");
    };
    prescriptionRecords.contains(productId # ":" # fileName);
  };

  public shared ({ caller }) func saveOrder(orderId : Text, items : [CartItem], total : Nat, paymentMethod : Text, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save orders");
    };
    let newOrder : Order = { orderId; items; total; paymentMethod; status; createdAt = Time.now() };
    let existingOrders = switch (userOrders.get(caller)) {
      case (null) { [] };
      case (?orders) { orders };
    };
    userOrders.add(caller, existingOrders.concat([newOrder]));
  };

  public query ({ caller }) func getMyOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their orders");
    };
    switch (userOrders.get(caller)) {
      case (null) { [] };
      case (?orders) { orders };
    };
  };

  // bKash
  public shared ({ caller }) func setBkashConfiguration(config : BkashConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set bKash configuration");
    };
    bkashConfiguration := ?config;
  };

  public query ({ caller }) func isBkashConfigured() : async Bool { bkashConfiguration != null };

  func getBkashConfiguration() : BkashConfig {
    switch (bkashConfiguration) {
      case (null) { Runtime.trap("bKash needs to be first configured") };
      case (?value) { value };
    };
  };

  public shared ({ caller }) func grantBkashToken() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can request bKash tokens");
    };
    let config = getBkashConfiguration();
    let url = if (config.isSandbox) { "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant" } else { "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant" };
    await OutCall.httpPostRequest(url, [], "{\"app_key\": \"" # config.appKey # "\", \"app_secret\": \"" # config.appSecret # "\"}", transform);
  };

  public shared ({ caller }) func createBkashPayment(amount : Text, orderId : Text, token : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create bKash payments");
    };
    let config = getBkashConfiguration();
    let url = if (config.isSandbox) { "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/create" } else { "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/payment/create" };
    let headers = [ { name = "Authorization"; value = token } : OutCall.Header ];
    await OutCall.httpPostRequest(url, headers, "{\"amount\": \"" # amount # "\", \"invoice\": \"" # orderId # "\", \"intent\": \"sale\"}", transform);
  };

  public shared ({ caller }) func executeBkashPayment(paymentId : Text, token : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can execute bKash payments");
    };
    let config = getBkashConfiguration();
    let url = if (config.isSandbox) { "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/execute/" # paymentId } else { "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/payment/execute/" # paymentId };
    let headers = [ { name = "Authorization"; value = token } : OutCall.Header ];
    await OutCall.httpPostRequest(url, headers, "{}", transform);
  };

  // Nagad
  public shared ({ caller }) func setNagadConfiguration(config : NagadConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set Nagad configuration");
    };
    nagadConfiguration := ?config;
  };

  public query ({ caller }) func isNagadConfigured() : async Bool { nagadConfiguration != null };

  func getNagadConfiguration() : NagadConfig {
    switch (nagadConfiguration) {
      case (null) { Runtime.trap("Nagad needs to be first configured") };
      case (?value) { value };
    };
  };

  public shared ({ caller }) func initiateNagadPayment(amount : Text, orderId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can initiate Nagad payments");
    };
    let config = getNagadConfiguration();
    let url = if (config.isSandbox) { "https://sandbox.mynagad.com:10080/remote-payment-gateway/api/dfs/check-out/initialize/" # config.merchantID } else { "https://api.mynagad.com/remote-payment-gateway/api/dfs/check-out/initialize/" # config.merchantID };
    await OutCall.httpPostRequest(url, [], "{\"orderId\": \"" # orderId # "\"}", transform);
  };

  public shared ({ caller }) func verifyNagadPayment(orderId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can verify Nagad payments");
    };
    let config = getNagadConfiguration();
    let url = if (config.isSandbox) { "https://sandbox.mynagad.com:10080/remote-payment-gateway/api/dfs/check-out/verify/" # config.merchantID # "/" # orderId } else { "https://api.mynagad.com/remote-payment-gateway/api/dfs/check-out/verify/" # config.merchantID # "/" # orderId };
    await OutCall.httpGetRequest(url, [], transform);
  };
};
