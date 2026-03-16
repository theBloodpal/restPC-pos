import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { IndianRupee, Utensils, Wine, ReceiptText, ChefHat, Archive, TrendingUp, ShieldCheck, ArrowRight, Activity } from 'lucide-react';

export default function Dashboard({ navigateToOrders, setCurrentView }) {
    const [orders, setOrders] = useState([]);
    const [isClosing, setIsClosing] = useState(false);
    const [isAutoZRunning, setIsAutoZRunning] = useState(true);

    // --- 1. THE SMART AUTO-Z ENGINE ---
    useEffect(() => {
        const runAutoZReport = async () => {
            try {
                const todayStr = new Date().toLocaleDateString();

                const lastZRun = localStorage.getItem('kafe_last_autoz_date');
                if (lastZRun === todayStr) {
                    setIsAutoZRunning(false);
                    return;
                }

                const ordersSnap = await getDocs(collection(db, 'orders'));
                const ordersToArchiveByDate = {};
                let foundPastOrders = false;

                ordersSnap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const orderDate = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : todayStr;

                    if (orderDate !== todayStr && data.status === 'Completed') {
                        if (!ordersToArchiveByDate[orderDate]) ordersToArchiveByDate[orderDate] = [];
                        ordersToArchiveByDate[orderDate].push({ id: docSnap.id, ...data });
                        foundPastOrders = true;
                    }
                });

                if (foundPastOrders) {
                    for (const date of Object.keys(ordersToArchiveByDate)) {
                        const dayOrders = ordersToArchiveByDate[date];
                        let tSales = 0, fSales = 0, lSales = 0;

                        dayOrders.forEach(order => {
                            tSales += Number(order.totalPrice || 0);
                            const items = order.cart_items || [];
                            items.forEach(item => {
                                const lineTotal = Number(item.price || 0) * Number(item.qty || 1);
                                if (item.type === 'Drinks') lSales += lineTotal;
                                else fSales += lineTotal;
                            });
                        });

                        await addDoc(collection(db, 'daily_reports'), {
                            date: date,
                            timestamp: serverTimestamp(),
                            totalSales: tSales, foodSales: fSales, liquorSales: lSales,
                            totalOrders: dayOrders.length,
                            autoClosed: true
                        });

                        const batch = writeBatch(db);
                        dayOrders.forEach(order => {
                            const pastRef = doc(db, 'past_orders', order.id);
                            const liveRef = doc(db, 'orders', order.id);
                            batch.set(pastRef, { ...order, status: 'Archived', archivedAt: serverTimestamp() });
                            batch.delete(liveRef);
                        });
                        await batch.commit();
                    }
                }

                localStorage.setItem('kafe_last_autoz_date', todayStr);

            } catch (error) {
                console.error("Auto-Z Engine Error:", error);
            } finally {
                setIsAutoZRunning(false);
            }
        };

        runAutoZReport();
    }, []);

    // --- 2. LIVE LISTENER FOR TODAY ---
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(fetchedOrders);
        });
        return () => unsubscribe();
    }, []);

    // --- 3. MATH & METRICS ---
    const completedOrders = orders.filter(o => o.status === 'Completed' || o.status === 'Archived');
    const pendingKitchen = orders.filter(o => o.kitchenStatus === 'Pending' || o.kitchenStatus === 'Preparing');
    const pendingBar = orders.filter(o => o.barStatus === 'Pending' || o.barStatus === 'Preparing');
    const allPending = orders.filter(o => o.status === 'Pending');

    let totalSales = 0;
    let foodSales = 0;
    let liquorSales = 0;

    completedOrders.forEach(order => {
        totalSales += Number(order.totalPrice || 0);
        const items = order.cart_items || [];
        items.forEach(item => {
            const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
            if (item.type === 'Drinks') {
                liquorSales += itemTotal;
            } else {
                foodSales += itemTotal;
            }
        });
    });

    const foodPercent = totalSales > 0 ? ((foodSales / totalSales) * 100).toFixed(0) : 0;
    const liquorPercent = totalSales > 0 ? ((liquorSales / totalSales) * 100).toFixed(0) : 0;
    const avgOrder = completedOrders.length > 0 ? (totalSales / completedOrders.length).toFixed(2) : '0.00';

    const handleCloseRegister = async () => {
        if (allPending.length > 0) {
            alert("You cannot close the register while there are still Pending orders! Please complete or cancel them first.");
            return;
        }

        if (completedOrders.length === 0) {
            alert("There are no completed orders to close today.");
            return;
        }

        const confirmClose = window.confirm(
            `Are you sure you want to Close the Register?\n\nTotal Sales: ₹${totalSales.toFixed(2)}\n\nThis will safely move today's tickets into your permanent Archive Vault AND download a backup to your computer.`
        );

        if (!confirmClose) return;
        setIsClosing(true);

        try {
            // 1. Generate and Download the Local CSV Backup
            let csvContent = "data:text/csv;charset=utf-8,Order ID,Time,Table,Customer,Total Amount,Items Ordered\n";
            completedOrders.forEach(order => {
                const timeStr = order.timestamp ? new Date(order.timestamp.toDate()).toLocaleTimeString() : "Unknown";
                const itemsStr = order.items ? order.items.join(" | ").replace(/,/g, "") : "N/A";
                csvContent += `${order.orderNumber || order.id},${timeStr},${order.table || 'N/A'},"${order.customerName || 'Walk-in'}",${order.totalPrice || 0},"${itemsStr}"\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Daily_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 2. Save the Daily Totals to Database
            const reportData = {
                date: new Date().toLocaleDateString(),
                timestamp: serverTimestamp(),
                totalSales, foodSales, liquorSales,
                totalOrders: completedOrders.length,
                autoClosed: false
            };
            await addDoc(collection(db, 'daily_reports'), reportData);

            // 3. Move orders to the Archive Vault
            const batch = writeBatch(db);
            completedOrders.forEach(order => {
                const pastRef = doc(db, 'past_orders', order.id);
                batch.set(pastRef, { ...order, status: 'Archived', archivedAt: serverTimestamp() });
                const activeRef = doc(db, 'orders', order.id);
                batch.delete(activeRef);
            });

            await batch.commit();

            localStorage.setItem('kafe_last_autoz_date', new Date().toLocaleDateString());

            alert("Register Closed! Data safely archived and backup downloaded to your device. 🌙");
        } catch (error) {
            console.error("Error closing register: ", error);
            alert("Failed to close register.");
        }
        setIsClosing(false);
    };

    if (isAutoZRunning) {
        return <div className="flex h-full items-center justify-center font-black text-2xl text-gray-400 animate-pulse">Running Auto-Z Diagnostics...</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto pr-2 pb-10">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-end mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-textPrimary mb-2 flex items-center gap-3">
                        Today's Overview
                        <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 border border-green-200">
                            <ShieldCheck size={16} /> Auto-Z Protected
                        </span>
                    </h1>
                    <p className="text-textSecondary font-bold">Live shift monitoring and terminal control.</p>
                </div>

                <button
                    onClick={handleCloseRegister}
                    disabled={isClosing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-white shadow-lg transition-transform active:scale-95 ${isClosing ? 'bg-gray-400' : 'bg-gray-900 hover:bg-black'}`}
                >
                    <Archive size={20} />
                    {isClosing ? 'Archiving Data...' : 'Archive Shift & Close'}
                </button>
            </div>

            {/* --- TOP REVENUE CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-3xl shadow-md text-white flex flex-col justify-between relative overflow-hidden">
                    <IndianRupee size={120} className="absolute right-[-20px] bottom-[-20px] opacity-10" />
                    <p className="text-sm font-bold text-green-100 uppercase tracking-wider mb-2 relative z-10">Total Revenue</p>
                    <p className="text-4xl font-black relative z-10">₹{totalSales.toFixed(2)}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Food Sales</p>
                        <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><Utensils size={20} /></div>
                    </div>
                    <p className="text-3xl font-black text-gray-900">₹{foodSales.toFixed(2)}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Bar Sales</p>
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-500"><Wine size={20} /></div>
                    </div>
                    <p className="text-3xl font-black text-gray-900">₹{liquorSales.toFixed(2)}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Orders Served</p>
                        <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><TrendingUp size={20} /></div>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{completedOrders.length} <span className="text-sm text-gray-400 font-bold">tables</span></p>
                </div>
            </div>

            {/* --- ANALYTICS ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 shrink-0">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4 text-gray-800 font-black text-lg">
                        <Activity className="text-blue-500" /> Today's Shift Split
                    </div>
                    <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden flex mb-3">
                        <div className="h-full bg-orange-400 transition-all duration-1000" style={{ width: `${foodPercent}%` }}></div>
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${liquorPercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                        <span className="text-orange-600 flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400"></span> Kitchen: {foodPercent}%</span>
                        <span className="text-blue-600 flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Bar: {liquorPercent}%</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Avg. Order Value (Today)</p>
                    <p className="text-4xl font-black text-gray-900">₹{avgOrder}</p>
                    <p className="text-xs text-green-500 font-bold mt-2 bg-green-50 px-3 py-1 rounded-full">Per completed ticket</p>
                </div>
            </div>

            {/* --- JUMP ACTION CARDS --- */}
            <h2 className="text-xl font-black text-gray-800 mb-4">Terminal Navigation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div onClick={() => navigateToOrders('Pending')} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start cursor-pointer group hover:border-orange-300 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ChefHat size={24} /></div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">Kitchen Queue</h3>
                    <p className="text-gray-500 font-medium text-sm mb-4"><strong className="text-orange-500">{pendingKitchen.length}</strong> food orders cooking.</p>
                    <div className="mt-auto text-orange-500 font-bold text-sm flex items-center gap-1 group-hover:translate-x-2 transition-transform">View Kitchen <ArrowRight size={16} /></div>
                </div>

                <div onClick={() => { setCurrentView('bar'); setOrderTab('Pending'); }} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start cursor-pointer group hover:border-purple-300 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Wine size={24} /></div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">Bar Queue</h3>
                    <p className="text-gray-500 font-medium text-sm mb-4"><strong className="text-purple-600">{pendingBar.length}</strong> drinks pending.</p>
                    <div className="mt-auto text-purple-600 font-bold text-sm flex items-center gap-1 group-hover:translate-x-2 transition-transform">View Bar <ArrowRight size={16} /></div>
                </div>

                <div onClick={() => setCurrentView('bills')} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start cursor-pointer group hover:border-green-300 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ReceiptText size={24} /></div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">Receipts & Accounting</h3>
                    <p className="text-gray-500 font-medium text-sm mb-4"><strong className="text-green-600">{completedOrders.length}</strong> orders served today.</p>
                    <div className="mt-auto text-green-600 font-bold text-sm flex items-center gap-1 group-hover:translate-x-2 transition-transform">View History <ArrowRight size={16} /></div>
                </div>

            </div>
        </div>
    );
}