import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function CartSidebar({ cart, updateQty, clearCart, taxRate, editingOrderData, setEditingOrderData }) {
    const [table, setTable] = useState("1");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editingOrderData) {
            setTable(editingOrderData.table || "1");
            setName(editingOrderData.customerName || "");
            setPhone(editingOrderData.customerPhone || "");
        }
    }, [editingOrderData]);

    const cartItems = Object.values(cart);
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxAmt = subtotal * (taxRate / 100);
    const total = subtotal + taxAmt;

    const generateOrderNumber = () => Math.floor(100000 + Math.random() * 900000);

    const processOrder = async () => {
        if (cartItems.length === 0) return;
        setIsSubmitting(true);

        try {
            const hasDrinks = cartItems.some(item => item.type === 'Drinks');
            const hasFood = cartItems.some(item => item.type !== 'Drinks');

            const orderData = {
                table,
                customerName: name,
                customerPhone: phone,
                items: cartItems.map(item => `${item.qty}x ${item.name}`),
                cart_items: cartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    qty: item.qty,
                    type: item.type || 'Veg'
                })),
                subtotal, taxAmt, taxRate, totalPrice: total,
                kitchenStatus: hasFood ? "Pending" : "None",
                barStatus: hasDrinks ? "Pending" : "None",
                status: "Pending"
            };

            if (editingOrderData) {
                orderData.orderNumber = editingOrderData.orderNumber;
                await updateDoc(doc(db, "orders", editingOrderData.id), orderData);
                alert(`Order #${orderData.orderNumber} Updated! ✅`);
            } else {
                orderData.orderNumber = generateOrderNumber();
                orderData.timestamp = serverTimestamp();
                await addDoc(collection(db, "orders"), orderData);
                alert(`Order #${orderData.orderNumber} Sent! ✅`);

                // ----------------------------------------------------
                // NEW: FOOLPROOF AUTO-DEDUCTION ENGINE
                // ----------------------------------------------------
                for (const item of cartItems) {
                    try {
                        // Firebase IDs don't have dashes. We added a dash for variants (e.g. 12345-60ml).
                        // This safely grabs the real database ID no matter what.
                        const docId = item.id.split('-')[0];
                        const itemRef = doc(db, 'menu', docId);
                        const itemSnap = await getDoc(itemRef);

                        if (itemSnap.exists()) {
                            const data = itemSnap.data();
                            const orderQty = Number(item.qty);

                            // If the database says this is a liquor with sizes (variants)...
                            if (data.hasVariants && data.variants) {
                                const updatedVariants = data.variants.map(v => {
                                    // Check if the cart name (e.g. "Bacardi (60ml)") contains the variant name ("60ml")
                                    if (item.name.includes(`(${v.name})`)) {
                                        const currentStock = Number(v.stock || 0);
                                        return { ...v, stock: Math.max(0, currentStock - orderQty) };
                                    }
                                    return v;
                                });
                                await updateDoc(itemRef, { variants: updatedVariants });
                            }
                            // If it's a standard food item...
                            else {
                                const currentStock = Number(data.stock || 0);
                                await updateDoc(itemRef, { stock: Math.max(0, currentStock - orderQty) });
                            }
                        }
                    } catch (err) {
                        console.error("Auto-deduction failed for:", item.name, err);
                    }
                }
            }

            clearCart();
            setTable("1");
            setName("");
            setPhone("");
        } catch (error) {
            console.error("Order Error: ", error);
            alert("Failed to process order.");
        }

        setIsSubmitting(false);
    };

    const handleCancelEdit = () => {
        clearCart();
        setTable("1");
        setName("");
        setPhone("");
    }

    return (
        <div className="w-[500px] bg-bgCard border-l border-gray-200 shrink-0 flex flex-col h-full relative shadow-xl z-10">
            <div className="p-6 border-b border-gray-100 relative bg-gray-50">
                <h2 className="text-2xl font-black text-textPrimary mb-4">
                    {editingOrderData ? `Editing Order #${editingOrderData.orderNumber}` : "Order Details"}
                </h2>

                {editingOrderData && (
                    <button onClick={handleCancelEdit} className="absolute top-6 right-6 text-sm text-red-500 font-bold hover:underline bg-red-50 px-3 py-1 rounded">
                        Cancel Edit
                    </button>
                )}

                <div className="space-y-4 mt-2">
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200">
                        <label className="text-textSecondary text-sm font-bold pl-2">Table No:</label>
                        <input type="text" value={table} onChange={(e) => setTable(e.target.value)} className="w-24 bg-gray-100 border border-gray-200 rounded px-3 py-1.5 text-right font-bold focus:outline-accentGreen focus:bg-white" />
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Customer Name (Optional)" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-accentGreen" />
                        <input type="text" placeholder="Phone (Optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-accentGreen" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bgMain inner-shadow">
                {cartItems.length === 0 ? (
                    <div className="text-center text-textSecondary mt-10 font-medium text-lg flex flex-col items-center gap-3">
                        <span className="text-4xl">🛒</span> Cart is empty. Add items!
                    </div>
                ) : (
                    cartItems.map(item => (
                        <div key={item.id} className="bg-bgCard p-3 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                            <div className="flex-1 pr-2 overflow-hidden">
                                <div className="font-bold text-textPrimary truncate">{item.name}</div>
                                <div className="text-sm text-textSecondary font-bold">₹{Number(item.price).toFixed(2)}</div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="font-black text-lg mb-2 text-textPrimary">₹{(item.price * item.qty).toFixed(2)}</div>
                                <div className="flex bg-gray-100 rounded-md items-center border border-gray-200 overflow-hidden">
                                    <button onClick={() => updateQty(item.id, -1)} className="px-3 py-1 hover:bg-gray-200 text-lg font-bold text-red-500 transition-colors">-</button>
                                    <span className="px-3 font-bold bg-white py-1 min-w-[2.5rem] text-center border-x border-gray-200">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="px-3 py-1 hover:bg-gray-200 text-lg font-bold text-green-600 transition-colors">+</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 bg-bgCard border-t border-gray-200">
                <div className="bg-bgMain p-4 rounded-xl mb-4 border border-gray-200 shadow-inner">
                    <div className="flex justify-between text-textSecondary font-bold mb-2">
                        <span>Subtotal:</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-textSecondary font-bold mb-2">
                        <span>Tax ({taxRate}%):</span>
                        <span>₹{taxAmt.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-300 my-3 pt-3 flex justify-between font-black text-2xl text-textPrimary">
                        <span>Total:</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>
                </div>

                <button
                    onClick={processOrder}
                    disabled={cartItems.length === 0 || isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold text-xl text-white transition-all transform ${cartItems.length === 0 ? 'bg-gray-400 cursor-not-allowed' : (editingOrderData ? 'bg-blue-500 hover:bg-blue-600 active:scale-[0.98]' : 'bg-accentGreen hover:bg-green-600 active:scale-[0.98]')} shadow-lg`}
                >
                    {isSubmitting
                        ? "Processing..."
                        : (editingOrderData ? `Update Order ➔ (₹${total.toFixed(2)})` : `Send Order ➔ (₹${total.toFixed(2)})`)
                    }
                </button>
            </div>
        </div>
    );
}