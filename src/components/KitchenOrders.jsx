import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function KitchenOrders({ orderTab, setOrderTab, handleEditOrder, counter = 'kitchen' }) {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            fetchedOrders.sort((a, b) => {
                const timeA = a.timestamp?.toMillis() || 0;
                const timeB = b.timestamp?.toMillis() || 0;
                return timeB - timeA;
            });
            setOrders(fetchedOrders);
        });
        return () => unsubscribe();
    }, []);

    // NEW: Smart "Mark Ready" function that only updates ONE side!
    const markReady = async (order) => {
        try {
            const updateData = {};

            if (counter === 'bar') {
                updateData.barStatus = 'Completed';
                // If Kitchen is already done (or didn't have food), mark the whole order completed
                if (order.kitchenStatus === 'Completed' || order.kitchenStatus === 'None') {
                    updateData.status = 'Completed';
                }
            } else {
                updateData.kitchenStatus = 'Completed';
                // If Bar is already done (or didn't have drinks), mark the whole order completed
                if (order.barStatus === 'Completed' || order.barStatus === 'None') {
                    updateData.status = 'Completed';
                }
            }

            await updateDoc(doc(db, 'orders', order.id), updateData);
        } catch (error) { console.error("Error:", error); }
    };

    const deleteOrder = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this order?")) {
            try { await deleteDoc(doc(db, 'orders', id)); }
            catch (error) { console.error("Error:", error); }
        }
    };

    const filteredOrders = orders
        .filter(order => {
            // NEW: Look at the specific status for this counter
            let stationStatus = counter === 'bar' ? order.barStatus : order.kitchenStatus;

            // Legacy support for orders created before we added the split status
            if (!stationStatus || stationStatus === undefined) {
                stationStatus = order.status;
            }

            return stationStatus === orderTab;
        })
        .map(order => {
            const itemsToProcess = order.cart_items || [];
            const relevantItems = itemsToProcess.filter(item => {
                if (counter === 'bar') return item.type === 'Drinks';
                return item.type !== 'Drinks';
            });

            if (itemsToProcess.length === 0 && order.items && counter === 'kitchen') {
                return { ...order, relevantItems: order.items.map(name => ({ name, qty: 1, isLegacy: true })) };
            }

            return { ...order, relevantItems };
        })
        .filter(order => order.relevantItems && order.relevantItems.length > 0);

    const isBar = counter === 'bar';
    const accentHex = isBar ? 'bg-blue-500' : 'bg-accentGreen';
    const textHex = isBar ? 'text-blue-600' : 'text-accentGreen';
    const borderHex = isBar ? 'border-blue-500' : 'border-accentGreen';

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-3xl font-bold text-textPrimary mb-6">
                {isBar ? '🧊 Bar Order Queue' : '🍳 Kitchen Order Queue'}
            </h1>

            <div className="flex gap-6 mb-6 border-b border-gray-200 pb-2 shrink-0">
                <button
                    className={`text-lg font-bold pb-2 transition-colors ${orderTab === 'Pending' ? `${textHex} border-b-2 ${borderHex}` : 'text-textSecondary hover:text-textPrimary'}`}
                    onClick={() => setOrderTab('Pending')}
                >
                    ⏳ Active (Pending)
                </button>
                <button
                    className={`text-lg font-bold pb-2 transition-colors ${orderTab === 'Completed' ? `${textHex} border-b-2 ${borderHex}` : 'text-textSecondary hover:text-textPrimary'}`}
                    onClick={() => setOrderTab('Completed')}
                >
                    ✅ Completed
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-10">
                {filteredOrders.length === 0 ? (
                    <div className="text-textSecondary text-lg mt-8 font-medium">No {orderTab.toLowerCase()} orders right now.</div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order.id} className={`bg-bgCard p-6 rounded-xl border ${isBar ? 'border-blue-100' : 'border-gray-200'} shadow-sm flex flex-col md:flex-row gap-6 justify-between hover:shadow-md transition-shadow relative overflow-hidden`}>

                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${orderTab === 'Pending' ? (isBar ? 'bg-blue-400' : 'bg-accentOrange') : accentHex}`}></div>

                            <div className="flex-1 pl-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="text-2xl font-black text-textPrimary">
                                        Order #{order.orderNumber || order.id.slice(0, 6).toUpperCase()}
                                    </span>
                                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg font-bold border border-gray-200">
                                        Table {order.table || 'N/A'}
                                    </span>
                                </div>

                                {order.customerName && (
                                    <div className="text-md font-bold text-textSecondary mb-2 flex items-center gap-2">
                                        👤 Customer: <span className="text-textPrimary">{order.customerName}</span> {order.customerPhone && `(${order.customerPhone})`}
                                    </div>
                                )}

                                <div className="text-sm font-bold text-gray-400 mb-4">
                                    🕒 Placed: {order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown Time'}
                                </div>

                                <div className={`bg-bgMain p-4 rounded-lg border ${isBar ? 'border-blue-100' : 'border-gray-200'} mb-4`}>
                                    <ul className="space-y-2">
                                        {order.relevantItems.map((item, idx) => (
                                            <li key={idx} className="text-textPrimary font-bold text-lg border-b border-gray-200 pb-2 last:border-0 last:pb-0 flex items-center">
                                                <span className={`w-2 h-2 rounded-full ${accentHex} mr-3`}></span>
                                                {item.isLegacy ? item.name : `${item.qty}x ${item.name}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="text-sm font-bold text-gray-400">
                                    {order.relevantItems.length} items for this station
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[140px] justify-center shrink-0">
                                {orderTab === 'Pending' ? (
                                    <>
                                        {/* NEW: Passed the whole 'order' object here so the function knows what to update */}
                                        <button
                                            onClick={() => markReady(order)}
                                            className={`${accentHex} hover:opacity-80 text-white py-3 px-4 rounded-xl font-bold shadow-sm transition-transform active:scale-95`}
                                        >
                                            Mark Ready ✅
                                        </button>
                                        <button
                                            onClick={() => handleEditOrder(order)}
                                            className="bg-gray-800 hover:bg-gray-900 text-white py-3 px-4 rounded-xl font-bold shadow-sm transition-transform active:scale-95"
                                        >
                                            Edit Order ✏️
                                        </button>
                                        <button
                                            onClick={() => deleteOrder(order.id)}
                                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 px-4 rounded-xl font-bold shadow-sm transition-transform active:scale-95 mt-2"
                                        >
                                            Cancel 🗑️
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className={`${textHex} font-black text-lg text-center mb-2 border-2 ${borderHex} ${isBar ? 'bg-blue-50' : 'bg-green-50'} py-3 rounded-xl shadow-inner`}>
                                            Completed
                                        </div>
                                        <button
                                            onClick={() => deleteOrder(order.id)}
                                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 px-4 rounded-xl font-bold shadow-sm transition-transform active:scale-95"
                                        >
                                            Delete 🗑️
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}