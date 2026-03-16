import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Wine, AlertTriangle, Search, CheckCircle, PlusCircle, Edit2, TrendingUp, IndianRupee, X, ChefHat, Package } from 'lucide-react';

export default function Inventory() {
    const [menuItems, setMenuItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOption, setFilterOption] = useState('All');
    const [activeTab, setActiveTab] = useState('bar'); // 'bar' or 'kitchen'

    const [editingStock, setEditingStock] = useState({ id: null, variantIndex: null, mode: null, inputValue: '' });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMenuItems(items);
        });
        return () => unsubscribe();
    }, []);

    // 1. FLATTEN ALL ITEMS
    let allInventory = [];
    menuItems.forEach(item => {
        if (item.hasVariants && item.variants) {
            item.variants.forEach((v, index) => {
                allInventory.push({
                    id: item.id, variantIndex: index,
                    name: `${item.name} (${v.name})`, category: item.category,
                    price: Number(v.price || 0), type: item.type,
                    stock: v.stock !== undefined && v.stock !== null ? Number(v.stock) : 0,
                    isVariant: true, originalItem: item
                });
            });
        } else {
            allInventory.push({
                id: item.id, variantIndex: null,
                name: item.name, category: item.category,
                price: Number(item.price || 0), type: item.type,
                stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : 0,
                isVariant: false, originalItem: item
            });
        }
    });

    // 2. SPLIT TABS & APPLY FILTERS
    let displayedInventory = allInventory.filter(item => activeTab === 'bar' ? item.type === 'Drinks' : item.type !== 'Drinks');

    const totalUnits = displayedInventory.reduce((sum, item) => sum + item.stock, 0);
    const totalPotentialRevenue = displayedInventory.reduce((sum, item) => sum + (item.stock * item.price), 0);
    const lowStockItems = displayedInventory.filter(item => item.stock <= 10);

    displayedInventory = displayedInventory.filter(row => {
        const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) || (row.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        let matchesFilter = true;
        if (filterOption === 'Low Stock') matchesFilter = row.stock > 0 && row.stock <= 10;
        if (filterOption === 'Out of Stock') matchesFilter = row.stock === 0;
        return matchesSearch && matchesFilter;
    });

    displayedInventory.sort((a, b) => a.name.localeCompare(b.name));

    // --- SAVE STOCK LOGIC ---
    const handleSaveStock = async (row) => {
        const inputVal = Number(editingStock.inputValue);
        if (isNaN(inputVal) || inputVal < 0) return alert("Please enter a valid positive number.");

        try {
            const itemRef = doc(db, 'menu', row.id);
            let finalStockValue = editingStock.mode === 'add' ? row.stock + inputVal : inputVal;

            if (row.isVariant) {
                const updatedVariants = [...row.originalItem.variants];
                updatedVariants[row.variantIndex].stock = finalStockValue;
                await updateDoc(itemRef, { variants: updatedVariants });
            } else {
                await updateDoc(itemRef, { stock: finalStockValue });
            }
            setEditingStock({ id: null, variantIndex: null, mode: null, inputValue: '' });
        } catch (error) {
            console.error("Error updating stock: ", error);
            alert("Failed to update stock.");
        }
    };

    const isBar = activeTab === 'bar';
    const themeColor = isBar ? 'blue' : 'orange';

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 rounded-2xl p-2">

            {/* Header & Tabs */}
            <div className="flex justify-between items-end mb-6 shrink-0 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <Package size={32} className="text-indigo-600" /> Inventory Hub
                    </h1>
                    <div className="flex gap-2 mt-4 bg-gray-200/50 p-1 rounded-xl inline-flex">
                        <button
                            onClick={() => setActiveTab('bar')}
                            className={`px-6 py-2.5 font-bold rounded-lg transition-all flex items-center gap-2 ${isBar ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Wine size={18} /> Bar Vault
                        </button>
                        <button
                            onClick={() => setActiveTab('kitchen')}
                            className={`px-6 py-2.5 font-bold rounded-lg transition-all flex items-center gap-2 ${!isBar ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <ChefHat size={18} /> Kitchen Stock
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 text-gray-400" size={20} />
                        <input
                            type="text" placeholder="Search items..."
                            className={`pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-300 focus:outline-${themeColor}-500 font-bold shadow-sm`}
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className={`bg-white px-4 py-2 rounded-lg border border-gray-300 font-bold focus:outline-${themeColor}-500 cursor-pointer shadow-sm text-gray-700`}
                        value={filterOption} onChange={(e) => setFilterOption(e.target.value)}
                    >
                        <option value="All">All Items</option>
                        <option value="Low Stock">⚠️ Low Stock (1-10)</option>
                        <option value="Out of Stock">❌ Out of Stock</option>
                    </select>
                </div>
            </div>

            {/* TOP METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className={`w-12 h-12 rounded-xl bg-${themeColor}-50 flex items-center justify-center text-${themeColor}-600 shrink-0`}><IndianRupee size={24} /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total {isBar ? 'Vault' : 'Pantry'} Value</p>
                        <p className={`text-2xl font-black text-${themeColor}-900`}>₹{totalPotentialRevenue.toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0"><AlertTriangle size={24} /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                        <p className="text-2xl font-black text-red-600">{lowStockItems.length} Items</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0"><TrendingUp size={24} /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Units Tracking</p>
                        <p className="text-2xl font-black text-green-700">{totalUnits}</p>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`bg-${themeColor}-50 border-b border-${themeColor}-100 text-${themeColor}-800 text-xs uppercase tracking-wider`}>
                                <th className="p-4 font-black">Item / Size</th>
                                <th className="p-4 font-black text-right">Menu Price</th>
                                <th className="p-4 font-black text-center w-48">Live Stock Level</th>
                                <th className="p-4 font-black text-right">Manage Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayedInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-gray-400 font-bold border-2 border-dashed border-gray-100 m-4 rounded-xl">No items found matching your filters.</td>
                                </tr>
                            ) : (
                                displayedInventory.map((row) => {
                                    const isEditingAdd = editingStock.id === row.id && editingStock.variantIndex === row.variantIndex && editingStock.mode === 'add';
                                    const isEditingSet = editingStock.id === row.id && editingStock.variantIndex === row.variantIndex && editingStock.mode === 'set';
                                    const isEditing = isEditingAdd || isEditingSet;

                                    const stockPercentage = Math.min((row.stock / 50) * 100, 100);
                                    let barColor = 'bg-green-500';
                                    if (row.stock <= 10) barColor = 'bg-orange-500';
                                    if (row.stock === 0) barColor = 'bg-red-500';

                                    return (
                                        <tr key={`${row.id}-${row.variantIndex}`} className={`hover:bg-${themeColor}-50/30 transition-colors`}>
                                            <td className="p-4">
                                                <div className="font-black text-gray-900 text-lg">{row.name}</div>
                                                <div className={`text-xs text-${themeColor}-500 font-bold uppercase tracking-wider`}>{row.category}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-bold text-gray-600">₹{row.price.toFixed(2)}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-xl font-black ${row.stock === 0 ? 'text-red-500' : row.stock <= 10 ? 'text-orange-500' : 'text-gray-800'}`}>
                                                        {row.stock} <span className="text-xs text-gray-400">units</span>
                                                    </span>
                                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${stockPercentage}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                {isEditing ? (
                                                    <div className={`flex items-center justify-end gap-2 bg-${themeColor}-50 p-1.5 rounded-lg border border-${themeColor}-200 w-max ml-auto shadow-inner`}>
                                                        <span className={`text-xs font-black text-${themeColor}-800 uppercase px-2`}>
                                                            {editingStock.mode === 'add' ? '+ Receive:' : '= Audit:'}
                                                        </span>
                                                        <input
                                                            type="number" min="0" placeholder="Qty"
                                                            className={`w-20 border border-${themeColor}-300 rounded px-2 py-1 text-center font-bold focus:outline-${themeColor}-500`}
                                                            value={editingStock.inputValue} onChange={(e) => setEditingStock({ ...editingStock, inputValue: e.target.value })} autoFocus
                                                        />
                                                        <button onClick={() => handleSaveStock(row)} className={`bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white p-1.5 rounded transition-transform active:scale-95 shadow-sm`}><CheckCircle size={16} /></button>
                                                        <button onClick={() => setEditingStock({ id: null, variantIndex: null, mode: null, inputValue: '' })} className="bg-white hover:bg-gray-100 text-gray-500 border border-gray-200 p-1.5 rounded transition-colors"><X size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2 opacity-80 hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingStock({ id: row.id, variantIndex: row.variantIndex, mode: 'add', inputValue: '' })} className={`bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors text-xs shadow-sm`}>
                                                            <PlusCircle size={14} /> Receive
                                                        </button>
                                                        <button onClick={() => setEditingStock({ id: row.id, variantIndex: row.variantIndex, mode: 'set', inputValue: row.stock })} className="bg-gray-50 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors text-xs shadow-sm">
                                                            <Edit2 size={14} /> Audit
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}