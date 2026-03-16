import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Printer, X, ReceiptText, HardDriveDownload, CalendarDays, Filter, IndianRupee, Archive, TrendingUp, Utensils, Wine, Award } from 'lucide-react';

export default function BillsReceipts() {
    const [viewMode, setViewMode] = useState('receipts'); // 'receipts', 'reports', or 'lifetime'
    const [receiptTab, setReceiptTab] = useState('today');

    const [activeOrders, setActiveOrders] = useState([]);
    const [archivedOrders, setArchivedOrders] = useState([]);
    const [dailyReports, setDailyReports] = useState([]);

    // --- Advanced Filters ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState('Date: Newest');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [selectedBill, setSelectedBill] = useState(null);

    useEffect(() => {
        const unsubActive = onSnapshot(collection(db, 'orders'), (snapshot) => {
            setActiveOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubArchive = onSnapshot(collection(db, 'past_orders'), (snapshot) => {
            setArchivedOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubReports = onSnapshot(collection(db, 'daily_reports'), (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetched.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            setDailyReports(fetched);
        });

        return () => { unsubActive(); unsubArchive(); unsubReports(); };
    }, []);

    const todaysCompleted = activeOrders.filter(o => o.status === 'Completed' || o.status === 'Archived');
    const targetReceipts = receiptTab === 'today' ? todaysCompleted : archivedOrders;

    // --- SMART FILTERING LOGIC ---
    let filteredOrders = targetReceipts.filter(order => {
        const search = searchTerm.toLowerCase();
        const orderNumStr = order.orderNumber ? order.orderNumber.toString() : order.id.toLowerCase();
        const matchesSearch = orderNumStr.includes(search) ||
            (order.customerName || '').toLowerCase().includes(search) ||
            (order.customerPhone || '').toLowerCase().includes(search);

        let matchesDate = true;
        const orderDate = order.archivedAt ? order.archivedAt.toDate() : (order.timestamp ? order.timestamp.toDate() : null);

        if (orderDate) {
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                matchesDate = matchesDate && (orderDate >= start);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && (orderDate <= end);
            }
        }
        return matchesSearch && matchesDate;
    });

    filteredOrders.sort((a, b) => {
        const timeA = a.archivedAt?.toMillis() || a.timestamp?.toMillis() || 0;
        const timeB = b.archivedAt?.toMillis() || b.timestamp?.toMillis() || 0;
        const totalA = Number(a.totalPrice || 0);
        const totalB = Number(b.totalPrice || 0);

        if (sortMode === 'Date: Newest') return timeB - timeA;
        if (sortMode === 'Date: Oldest') return timeA - timeB;
        if (sortMode === 'Total: High to Low') return totalB - totalA;
        if (sortMode === 'Total: Low to High') return totalA - totalB;
        return 0;
    });

    // --- LIVE CALCULATIONS FOR RECEIPTS ---
    const filteredTotalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    const filteredTotalOrders = filteredOrders.length;

    // --- LIFETIME CALCULATIONS ---
    let lifetimeTotal = 0;
    let lifetimeFood = 0;
    let lifetimeLiquor = 0;
    let lifetimeOrders = 0;

    // 1. Add all historical Z-Reports
    dailyReports.forEach(r => {
        lifetimeTotal += Number(r.totalSales || 0);
        lifetimeFood += Number(r.foodSales || 0);
        lifetimeLiquor += Number(r.liquorSales || 0);
        lifetimeOrders += Number(r.totalOrders || 0);
    });

    // 2. Add today's live completed orders (which haven't been Z-Reported yet)
    todaysCompleted.forEach(order => {
        lifetimeTotal += Number(order.totalPrice || 0);
        lifetimeOrders += 1;
        const items = order.cart_items || [];
        items.forEach(item => {
            const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
            if (item.type === 'Drinks') lifetimeLiquor += itemTotal;
            else lifetimeFood += itemTotal;
        });
    });

    // --- CSV EXPORT ---
    const exportToCSV = () => {
        if (viewMode === 'receipts') {
            if (filteredOrders.length === 0) return alert("No receipts to export matching your filters.");
            let csvContent = "data:text/csv;charset=utf-8,Order ID,Date,Table,Customer,Phone,Total Amount,Items Ordered\n";
            filteredOrders.forEach(order => {
                const dateStr = order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString() : "Unknown";
                const itemsStr = order.items ? order.items.join(" | ").replace(/,/g, "") : "N/A";
                csvContent += `${order.orderNumber || order.id},"${dateStr}",${order.table || 'N/A'},"${order.customerName || 'Walk-in'}","${order.customerPhone || 'N/A'}",${order.totalPrice || 0},"${itemsStr}"\n`;
            });
            triggerDownload(csvContent, `Receipts_Filtered_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        } else if (viewMode === 'reports') {
            if (dailyReports.length === 0) return alert("No daily reports to export.");
            let csvContent = "data:text/csv;charset=utf-8,Closing Date,Total Revenue,Food Sales,Liquor Sales,Total Orders\n";
            dailyReports.forEach(report => {
                csvContent += `"${report.date}",${report.totalSales},${report.foodSales},${report.liquorSales},${report.totalOrders}\n`;
            });
            triggerDownload(csvContent, `Daily_Z_Reports.csv`);
        } else {
            // Export Lifetime Stats
            let csvContent = "data:text/csv;charset=utf-8,Metric,Value\n";
            csvContent += `Total Lifetime Revenue,${lifetimeTotal.toFixed(2)}\n`;
            csvContent += `Total Food Sales,${lifetimeFood.toFixed(2)}\n`;
            csvContent += `Total Liquor Sales,${lifetimeLiquor.toFixed(2)}\n`;
            csvContent += `Total Lifetime Orders,${lifetimeOrders}\n`;
            triggerDownload(csvContent, `Lifetime_Analytics_Snapshot.csv`);
        }
    };

    const triggerDownload = (csvContent, fileName) => {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- THERMAL PRINTER ---
    const printReceipt = (order) => {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        const dateStr = order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString() : 'Unknown Date';
        const displayId = order.orderNumber ? `#${order.orderNumber}` : order.id.slice(0, 8).toUpperCase();

        const cartItems = order.cart_items || [];
        const foodItems = cartItems.filter(item => item.type !== 'Drinks');
        const barItems = cartItems.filter(item => item.type === 'Drinks');

        const buildRows = (items) => items.map(item => `
            <div class="flex-between" style="margin-bottom: 5px;">
              <span style="width: 60%">${item.name}</span>
              <span style="width: 15%">${item.qty}</span>
              <span style="width: 25%; text-align: right;">${(item.price * item.qty).toFixed(2)}</span>
            </div>
        `).join('');

        const html = `
      <html>
        <head>
          <title>Receipt ${displayId}</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; }
            .text-center { text-align: center; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .section-title { text-align: center; font-weight: bold; margin: 8px 0; padding: 2px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
          </style>
        </head>
        <body>
          <h2 class="text-center" style="font-size: 24px; margin-bottom: 5px;">KAFE POS</h2>
          <div class="text-center" style="margin-bottom: 10px;">Your Tagline Here</div>
          <div class="divider"></div>
          <div><span class="bold">Order No:</span> ${displayId}</div>
          <div><span class="bold">Date:</span> ${dateStr}</div>
          <div><span class="bold">Table:</span> ${order.table || 'N/A'}</div>
          ${order.customerName ? `<div><span class="bold">Customer:</span> ${order.customerName}</div>` : ''}
          
          <div class="divider"></div>
          <div class="flex-between bold">
            <span style="width: 60%">Item</span>
            <span style="width: 15%">Qty</span>
            <span style="width: 25%; text-align: right;">Total</span>
          </div>
          
          ${foodItems.length > 0 ? `
              <div class="section-title">--- KITCHEN / FOOD ---</div>
              ${buildRows(foodItems)}
          ` : ''}

          ${barItems.length > 0 ? `
              <div class="section-title">--- BAR / LIQUOR ---</div>
              ${buildRows(barItems)}
          ` : ''}
          
          <div class="divider"></div>
          <div class="flex-between"><span>Subtotal:</span> <span>${Number(order.subtotal || 0).toFixed(2)}</span></div>
          <div class="flex-between"><span>Tax (${order.taxRate || 5}%):</span> <span>${Number(order.taxAmt || 0).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="flex-between bold" style="font-size: 1.3em;">
            <span>TOTAL:</span> <span>₹${Number(order.totalPrice || 0).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="text-center mt-4 bold">Thank you for your visit!</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="flex flex-col h-full relative">

            {/* --- HEADER & TOP TABS --- */}
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-textPrimary">Accounting & History</h1>
                    <div className="flex gap-2 mt-4 bg-gray-100 p-1 rounded-xl inline-flex overflow-x-auto">
                        <button
                            onClick={() => setViewMode('receipts')}
                            className={`px-6 py-2.5 font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'receipts' ? 'bg-white text-textPrimary shadow-sm' : 'text-gray-500 hover:text-textPrimary'}`}
                        >
                            <ReceiptText size={18} /> All Receipts
                        </button>
                        <button
                            onClick={() => setViewMode('reports')}
                            className={`px-6 py-2.5 font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'reports' ? 'bg-white text-textPrimary shadow-sm' : 'text-gray-500 hover:text-textPrimary'}`}
                        >
                            <CalendarDays size={18} /> Daily Z-Reports
                        </button>
                        {/* NEW LIFETIME TAB */}
                        <button
                            onClick={() => setViewMode('lifetime')}
                            className={`px-6 py-2.5 font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'lifetime' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-textPrimary'}`}
                        >
                            <TrendingUp size={18} /> All-Time Analytics
                        </button>
                    </div>
                </div>

                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-transform active:scale-95"
                >
                    <HardDriveDownload size={20} /> Export to Excel
                </button>
            </div>

            {/* --- TODAY VS ARCHIVE TABS (Only for Receipts) --- */}
            {viewMode === 'receipts' && (
                <div className="flex gap-4 mb-4 shrink-0">
                    <button onClick={() => setReceiptTab('today')} className={`px-5 py-2 rounded-lg font-bold border-2 transition-all ${receiptTab === 'today' ? 'border-accentGreen bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                        🟢 Today's Live Bills
                    </button>
                    <button onClick={() => setReceiptTab('archive')} className={`px-5 py-2 rounded-lg font-bold border-2 transition-all flex items-center gap-2 ${receiptTab === 'archive' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                        <Archive size={16} /> Archived Vault
                    </button>
                </div>
            )}

            {/* --- ADVANCED FILTER BAR --- */}
            {viewMode === 'receipts' && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 shrink-0 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[250px]">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search Database</label>
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 text-gray-400" size={18} />
                            <input type="text" placeholder="Order ID, Customer Name, or Phone..." className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-gray-300 focus:outline-accentGreen font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Date</label>
                        <input type="date" className="px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-accentGreen font-bold text-gray-700" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To Date</label>
                        <input type="date" className="px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-accentGreen font-bold text-gray-700" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sort By</label>
                        <select className="px-4 py-2.5 rounded-lg border border-gray-300 font-bold focus:outline-accentGreen cursor-pointer" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                            <option value="Date: Newest">Newest First</option>
                            <option value="Date: Oldest">Oldest First</option>
                            <option value="Total: High to Low">Highest Amount</option>
                            <option value="Total: Low to High">Lowest Amount</option>
                        </select>
                    </div>
                    {(searchTerm || startDate || endDate) && (
                        <button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }} className="px-4 py-2.5 rounded-lg text-red-500 font-bold hover:bg-red-50 flex items-center gap-1">
                            <X size={16} /> Clear
                        </button>
                    )}
                </div>
            )}

            {/* --- LIVE CALCULATION BANNER --- */}
            {viewMode === 'receipts' && (
                <div className="flex justify-between items-center bg-green-50 border border-green-200 p-4 rounded-xl mb-6 shrink-0">
                    <div className="flex items-center gap-3 text-green-800">
                        <Filter size={20} />
                        <span className="font-bold">Showing <span className="text-xl font-black">{filteredTotalOrders}</span> matching receipts</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-green-700 uppercase tracking-wider mr-3">Calculated Revenue:</span>
                        <span className="text-2xl font-black text-accentGreen flex items-center inline-flex">
                            ₹{filteredTotalRevenue.toFixed(2)}
                        </span>
                    </div>
                </div>
            )}

            {/* =========================================
                NEW VIEW: LIFETIME ALL-TIME ANALYTICS
            ========================================= */}
            {viewMode === 'lifetime' && (
                <div className="flex-1 overflow-y-auto pr-2 pb-10 fade-in">
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-10 rounded-3xl shadow-xl text-white mb-8 relative overflow-hidden">
                        <Award size={160} className="absolute right-[-20px] top-[-20px] text-white opacity-10" />
                        <h2 className="text-sm font-black text-blue-200 uppercase tracking-widest mb-2">Empire Overview</h2>
                        <h1 className="text-4xl md:text-5xl font-black mb-8 relative z-10">Lifetime Business Analytics</h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
                                <div className="text-blue-200 font-bold mb-2 flex items-center gap-2"><IndianRupee size={18} /> All-Time Revenue</div>
                                <div className="text-3xl font-black text-white">₹{lifetimeTotal.toFixed(2)}</div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
                                <div className="text-orange-200 font-bold mb-2 flex items-center gap-2"><Utensils size={18} /> Total Food Sales</div>
                                <div className="text-3xl font-black text-white">₹{lifetimeFood.toFixed(2)}</div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
                                <div className="text-purple-200 font-bold mb-2 flex items-center gap-2"><Wine size={18} /> Total Liquor Sales</div>
                                <div className="text-3xl font-black text-white">₹{lifetimeLiquor.toFixed(2)}</div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
                                <div className="text-green-200 font-bold mb-2 flex items-center gap-2"><TrendingUp size={18} /> Total Orders Served</div>
                                <div className="text-3xl font-black text-white">{lifetimeOrders} Orders</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-xl font-black text-gray-800 mb-6 border-b border-gray-100 pb-4">Revenue Split Breakdown</h3>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <div className="flex justify-between font-bold text-gray-600 mb-2">
                                        <span>Food Revenue</span>
                                        <span>{lifetimeTotal > 0 ? ((lifetimeFood / lifetimeTotal) * 100).toFixed(1) : 0}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500" style={{ width: `${lifetimeTotal > 0 ? (lifetimeFood / lifetimeTotal) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between font-bold text-gray-600 mb-2">
                                        <span>Liquor/Bar Revenue</span>
                                        <span>{lifetimeTotal > 0 ? ((lifetimeLiquor / lifetimeTotal) * 100).toFixed(1) : 0}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${lifetimeTotal > 0 ? (lifetimeLiquor / lifetimeTotal) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center items-center text-center">
                            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                                <IndianRupee size={40} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-2">Average Order Value</h3>
                            <div className="text-4xl font-black text-gray-900">
                                ₹{lifetimeOrders > 0 ? (lifetimeTotal / lifetimeOrders).toFixed(2) : '0.00'}
                            </div>
                            <p className="text-gray-400 mt-4 font-medium text-sm">This is the average amount a customer spends per table.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW: DAILY Z-REPORTS --- */}
            {viewMode === 'reports' && (
                <div className="flex-1 overflow-y-auto pr-2 pb-10">
                    {dailyReports.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl">No Daily Reports closed yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {dailyReports.map(report => (
                                <div key={report.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center hover:shadow-md transition-all border-l-4 border-l-accentOrange">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black text-textPrimary flex items-center gap-2">
                                            <CalendarDays className="text-accentOrange" /> Closing Date: {report.date}
                                        </span>
                                        <span className="text-gray-500 font-bold mt-1">Closed at: {report.timestamp ? new Date(report.timestamp.toDate()).toLocaleTimeString() : 'Unknown'} • {report.totalOrders} Orders Processed</span>
                                    </div>
                                    <div className="flex gap-8 mt-4 md:mt-0">
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-gray-400 uppercase">Food Sales</div>
                                            <div className="text-xl font-black text-orange-500">₹{Number(report.foodSales || 0).toFixed(2)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-gray-400 uppercase">Liquor Sales</div>
                                            <div className="text-xl font-black text-blue-500">₹{Number(report.liquorSales || 0).toFixed(2)}</div>
                                        </div>
                                        <div className="text-right pl-6 border-l border-gray-200">
                                            <div className="text-xs font-bold text-gray-400 uppercase">Total Revenue</div>
                                            <div className="text-3xl font-black text-accentGreen">₹{Number(report.totalSales || 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- VIEW: ALL RECEIPTS --- */}
            {viewMode === 'receipts' && (
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-10">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl">No bills found matching your current filters.</div>
                    ) : (
                        filteredOrders.map(order => (
                            <div key={order.id} className="bg-bgCard p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-all group">
                                <div className="flex flex-col">
                                    <span className="text-xl font-black text-textPrimary mb-1 flex items-center gap-2">
                                        Order {order.orderNumber ? `#${order.orderNumber}` : order.id.slice(0, 8).toUpperCase()}
                                        {order.status === 'Archived' ?
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider font-bold">Archived</span>
                                            :
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 uppercase tracking-wider font-bold">Today</span>
                                        }
                                    </span>
                                    <span className="text-md font-bold text-textSecondary">
                                        Table {order.table || 'N/A'} {order.customerName ? <span className="text-accentOrange ml-2">• {order.customerName}</span> : ''}
                                    </span>
                                    <span className="text-sm font-bold text-gray-400 mt-2">
                                        🕒 {order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown Time'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Amount</div>
                                        <div className="text-3xl font-black text-accentGreen">₹{Number(order.totalPrice || 0).toFixed(2)}</div>
                                    </div>
                                    <button onClick={() => setSelectedBill(order)} className="bg-gray-100 hover:bg-gray-200 text-textPrimary px-6 py-4 rounded-xl font-bold flex items-center gap-3 transition-colors shadow-sm border border-gray-200">
                                        <ReceiptText size={20} className="text-gray-500" /> View Bill
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* --- RECEIPT MODAL (SPLIT VIEW) --- */}
            {selectedBill && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bgMain w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-300">

                        <div className="flex justify-between items-center p-5 bg-bgCard rounded-t-2xl border-b border-gray-200">
                            <h3 className="text-xl font-black text-textPrimary flex items-center gap-2">
                                <ReceiptText size={24} className="text-accentGreen" /> Digital Receipt
                            </h3>
                            <button onClick={() => setSelectedBill(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-white m-4 rounded-xl border border-gray-200 font-mono text-sm shadow-inner relative">
                            <div className="text-center font-bold text-xl mb-6 tracking-widest border-b-2 border-black pb-2">KAFE POS</div>
                            <div className="font-bold text-lg mb-1">Order No: {selectedBill.orderNumber ? `#${selectedBill.orderNumber}` : selectedBill.id.slice(0, 8).toUpperCase()}</div>
                            <div className="text-gray-600 mb-4">Date: {selectedBill.timestamp ? new Date(selectedBill.timestamp.toDate()).toLocaleString() : 'Unknown'}</div>

                            <div className="border-b border-dashed border-gray-400 my-3"></div>

                            {/* DYNAMIC SPLIT RENDERING */}
                            {(() => {
                                const cartItems = selectedBill.cart_items || [];
                                const foodItems = cartItems.filter(i => i.type !== 'Drinks');
                                const barItems = cartItems.filter(i => i.type === 'Drinks');

                                return (
                                    <>
                                        {foodItems.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-center font-bold bg-gray-100 py-1 mb-2 border-y border-gray-300 tracking-wider">--- KITCHEN / FOOD ---</div>
                                                {foodItems.map(item => (
                                                    <div key={item.id} className="flex justify-between text-sm mb-1">
                                                        <span className="w-3/5 pr-2 font-bold">{item.name}</span>
                                                        <span className="w-1/5 text-center">{item.qty}</span>
                                                        <span className="w-1/5 text-right font-bold">{(item.price * item.qty).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {barItems.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-center font-bold bg-blue-50 py-1 mb-2 border-y border-blue-200 text-blue-800 tracking-wider">--- BAR / LIQUOR ---</div>
                                                {barItems.map(item => (
                                                    <div key={item.id} className="flex justify-between text-sm mb-1 text-blue-900">
                                                        <span className="w-3/5 pr-2 font-bold">{item.name}</span>
                                                        <span className="w-1/5 text-center">{item.qty}</span>
                                                        <span className="w-1/5 text-right font-bold">{(item.price * item.qty).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="border-b border-dashed border-gray-400 my-4"></div>

                            <div className="flex justify-between text-gray-600 mb-2">
                                <span>Subtotal:</span>
                                <span className="font-bold">{Number(selectedBill.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600 mb-4">
                                <span>Tax ({selectedBill.taxRate || 5}%):</span>
                                <span className="font-bold">{Number(selectedBill.taxAmt || 0).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between font-black text-2xl border-t-2 border-black pt-3">
                                <span>TOTAL:</span>
                                <span>₹{Number(selectedBill.totalPrice || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="p-5 bg-bgCard rounded-b-2xl border-t border-gray-200">
                            <button
                                onClick={() => printReceipt(selectedBill)}
                                className="w-full bg-accentGreen hover:bg-green-600 text-white py-4 rounded-xl font-bold text-xl flex justify-center items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95"
                            >
                                <Printer size={24} /> Print Receipt to Thermal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}