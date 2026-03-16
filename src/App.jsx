import React, { useState, useEffect } from 'react';
import POSView from './components/POSView';
import CartSidebar from './components/CartSidebar';
import KitchenOrders from './components/KitchenOrders';
import BillsReceipts from './components/BillsReceipts';
import Inventory from './components/Inventory';
import AdminMenu from './components/AdminMenu';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { LayoutDashboard, Utensils, ChefHat, ReceiptText, Settings as SettingsIcon, MenuSquare, Wine, Package } from 'lucide-react';

function App() {
  // NEW: Check if this is a customer scanning a QR code!
  const queryParams = new URLSearchParams(window.location.search);
  const tableParam = queryParams.get('table');

  // If there is a table parameter, DO NOT show the Admin dashboard. Show the Mobile App!
  if (tableParam) {
    return <CustomerMenu tableNumber={tableParam} />;
  }

  // --- The rest of your normal Admin state starts here ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [time, setTime] = useState(new Date());

  // --- Global State ---
  const [cart, setCart] = useState({});
  const [taxRate, setTaxRate] = useState(() => {
    const saved = localStorage.getItem('kafe_tax_rate');
    return saved ? parseFloat(saved) : 5.0;
  });

  // --- Routing & Edit States ---
  const [orderTab, setOrderTab] = useState('Pending');
  const [editingOrderData, setEditingOrderData] = useState(null);

  const navigateToOrders = (tab) => {
    setOrderTab(tab);
    setCurrentView('orders');
  };

  const handleEditOrder = (order) => {
    if (!order.cart_items) {
      alert("This is a legacy order and cannot be edited. Please delete and recreate it.");
      return;
    }
    const rebuiltCart = {};
    order.cart_items.forEach(item => {
      rebuiltCart[item.id] = { ...item };
    });
    setCart(rebuiltCart);
    setEditingOrderData(order);
    setCurrentView('pos');
  };

  // --- Cart Logic ---
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev[item.id];
      if (existing) {
        return { ...prev, [item.id]: { ...existing, qty: existing.qty + 1 } };
      }
      // FIXED: We now pass the ENTIRE item object so the secret database IDs don't get deleted!
      return { ...prev, [item.id]: { ...item, qty: 1 } };
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      const item = prev[id];
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: { ...item, qty: newQty } };
    });
  };

  const clearCart = () => {
    setCart({});
    setEditingOrderData(null);
  };

  // --- Clock ---
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'pos', label: 'Menu (POS)', icon: <Utensils size={20} /> },
    { id: 'orders', label: 'Kitchen Orders', icon: <ChefHat size={20} /> },
    { id: 'bar', label: 'Bar Orders', icon: <Wine size={20} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={20} /> },
    { id: 'bills', label: 'Bills / Receipts', icon: <ReceiptText size={20} /> },
    { id: 'admin', label: 'Manage Menu', icon: <MenuSquare size={20} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
  ];

  return (
    <div className="flex flex-col h-screen bg-bgMain overflow-hidden">
      <nav className="bg-bgCard h-20 px-8 flex items-center justify-between border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-black text-textPrimary">🍽️ Resto Admin</h1>
          <div className="flex gap-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${currentView === item.id ? 'text-accentGreen bg-green-50' : 'text-textSecondary hover:bg-gray-100'
                  }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-textSecondary font-bold text-sm text-right min-w-[200px]">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          <br />
          {time.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-8 overflow-hidden">
          {currentView === 'dashboard' && <Dashboard navigateToOrders={navigateToOrders} setCurrentView={setCurrentView} />}
          {currentView === 'pos' && <POSView addToCart={addToCart} />}
          {currentView === 'orders' && <KitchenOrders orderTab={orderTab} setOrderTab={setOrderTab} handleEditOrder={handleEditOrder} counter="kitchen" />}
          {currentView === 'bar' && <KitchenOrders orderTab={orderTab} setOrderTab={setOrderTab} handleEditOrder={handleEditOrder} counter="bar" />}
          {currentView === 'inventory' && <Inventory />}
          {currentView === 'bills' && <BillsReceipts />}
          {currentView === 'admin' && <AdminMenu />}
          {currentView === 'settings' && <Settings taxRate={taxRate} setTaxRate={setTaxRate} />}
        </div>

        {currentView === 'pos' && (
          <CartSidebar
            cart={cart}
            updateQty={updateQty}
            clearCart={clearCart}
            taxRate={taxRate}
            editingOrderData={editingOrderData}
            setEditingOrderData={setEditingOrderData}
          />
        )}
      </div>
    </div>
  );
}

export default App;