import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartModal } from './components/CartModal';
import { CheckoutModal } from './components/CheckoutModal';
import { PaymentSimModal } from './components/PaymentSimModal';
import { AuthModal } from './components/AuthModal';
import { MyOrdersModal } from './components/MyOrdersModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Footer } from './components/Footer';
import { ChatWidget } from './components/ChatWidget';
import { Product, Category, CartItem, Order, Payment, api } from './services/api';

export function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'home' | 'catalog' | 'product_detail'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [paymentSimData, setPaymentSimData] = useState<{ order: Order; payment: Payment } | null>(null);

  // Load initial data from backend API & handle URL Routing
  useEffect(() => {
    // 1. Categories
    api.getCategories().then(setCategories).catch(console.error);

    // 2. Products & Routing /product/:id
    api.getProducts().then((prods) => {
      setProducts(prods);
      const path = window.location.pathname;
      const match = path.match(/\/product\/(\d+)/);
      if (match) {
        const prodId = parseInt(match[1]);
        const found = prods.find((p) => p.id === prodId);
        if (found) {
          setSelectedProduct(found);
          setCurrentView('product_detail');
        }
      }
    }).catch(console.error);

    // 3. User & Cart
    if (api.getToken()) {
      api.getCurrentUser().then(setCurrentUser).catch(() => api.clearToken());
    }
    api.getCart().then((c) => setCartItems(c.items || [])).catch(console.error);
  }, []);

  const handleSearchFromNavbar = (query: string) => {
    setSearchQuery(query);
    setCurrentView('catalog');
    window.history.pushState({}, '', '/catalog');
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product_detail');
    window.history.pushState({}, '', `/product/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = async (sku: string, quantity: number) => {
    try {
      const updatedCart = await api.addToCart(sku, quantity);
      setCartItems(updatedCart.items || []);
      setIsCartOpen(true);
    } catch (err) {
      console.error('Lỗi thêm giỏ hàng:', err);
    }
  };

  const handleQuickAddToCart = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      handleAddToCart(product.variants[0].sku, 1);
    } else {
      handleSelectProduct(product);
    }
  };

  const handleUpdateQuantity = async (sku: string, quantity: number) => {
    try {
      const updatedCart = await api.updateCartItemQuantity(sku, quantity);
      setCartItems(updatedCart.items || []);
    } catch (err) {
      console.error('Lỗi cập nhật số lượng:', err);
    }
  };

  const handleRemoveCartItem = async (sku: string) => {
    try {
      const updatedCart = await api.removeFromCart(sku);
      setCartItems(updatedCart.items || []);
    } catch (err) {
      console.error('Lỗi xóa giỏ hàng:', err);
    }
  };

  const handleOrderCreated = (order: Order, payment: Payment) => {
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setCartItems([]);
    setPaymentSimData({ order, payment });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f7] font-sans selection:bg-[#111111] selection:text-white">
      {/* LocknLock Style Header Navbar */}
      <Navbar
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSearch={handleSearchFromNavbar}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateCatalog={() => setCurrentView('catalog')}
        currentUser={currentUser}
        onLogout={() => {
          api.clearToken();
          setCurrentUser(null);
          setCartItems([]);
          localStorage.removeItem('demo_cart');
        }}
        categories={categories}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        onOpenProfile={() => setIsUserProfileOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            products={products}
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onQuickAddToCart={handleQuickAddToCart}
            onNavigateCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogPage
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onQuickAddToCart={handleQuickAddToCart}
            initialSearch={searchQuery}
          />
        )}

        {currentView === 'product_detail' && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => setCurrentView('catalog')}
            onAddToCart={handleAddToCart}
          />
        )}
      </main>

      {/* Corporate Footer */}
      <Footer onOpenChat={() => setIsChatOpen(true)} />

      {/* Slide-over & Dialog Modals */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onUpdateQuantity={handleUpdateQuantity}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          if (!api.getToken()) {
            setIsAuthOpen(true);
          } else {
            setIsCheckoutOpen(true);
          }
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderCreated={handleOrderCreated}
      />

      {paymentSimData && (
        <PaymentSimModal
          isOpen={!!paymentSimData}
          onClose={() => setPaymentSimData(null)}
          order={paymentSimData.order}
          payment={paymentSimData.payment}
          onPaymentComplete={() => {
            setPaymentSimData(null);
            setIsMyOrdersOpen(true);
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialTab={authInitialTab}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          api.getCart().then((c) => setCartItems(c.items || [])).catch(console.error);
        }}
      />

      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        onSelectOrderForPayment={(order) => {
          // Re-trigger payment simulation for pending order
          setPaymentSimData({
            order,
            payment: {
              id: order.id * 10,
              order_id: order.id,
              provider: 'vnpay',
              amount: order.total_amount,
              status: 'pending',
              created_at: new Date().toISOString(),
            },
          });
        }}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
      />
      {/* Live Chat Widget */}
      <ChatWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
      />
    </div>
  );
}

export default App;
