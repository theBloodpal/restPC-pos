import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, X } from 'lucide-react';

export default function POSView({ addToCart }) {
    const [menuItems, setMenuItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const [variantModalItem, setVariantModalItem] = useState(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMenuItems(items);
        });
        return () => unsubscribe();
    }, []);

    const categories = ['All', ...new Set(menuItems.map(item => item.category || 'Uncategorized'))];

    const filteredMenu = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || (item.category || 'Uncategorized') === selectedCategory;
        const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVeg = vegOnly ? (item.type === 'Veg' || item.type === 'Vegan') : true;
        return matchesCategory && matchesSearch && matchesVeg;
    });

    const handleAddClick = (item) => {
        if (item.hasVariants && item.variants && item.variants.length > 0) {
            setVariantModalItem(item);
        } else {
            // NEW: Explicitly pass the menuId and isVariant flags for auto-deduction
            addToCart({ ...item, menuId: item.id, isVariant: false });
        }
    };

    const handleVariantSelect = (variant) => {
        const customCartItem = {
            ...variantModalItem,
            id: `${variantModalItem.id}-${variant.name}`,
            menuId: variantModalItem.id, // NEW: Secret database ID
            isVariant: true,             // NEW: Tells the database this is a variant
            variantName: variant.name,   // NEW: Tells the database which size to deduct
            name: `${variantModalItem.name} (${variant.name})`,
            price: variant.price,
            stock: variant.stock
        };

        addToCart(customCartItem);
        setVariantModalItem(null);
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h1 className="text-3xl font-bold text-textPrimary">Menu Ordering</h1>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
                        <input type="checkbox" className="w-5 h-5 accent-green-600 rounded cursor-pointer" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />
                        <span className="font-bold text-green-700">Veg Only 🟩</span>
                    </label>
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 text-gray-400" size={20} />
                        <input type="text" placeholder="Search Menu..." className="pl-10 pr-4 py-2.5 w-72 rounded-xl border border-gray-300 focus:outline-none focus:border-accentGreen shadow-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide shrink-0">
                {categories.map(cat => (
                    <button key={cat} className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all shadow-sm border ${selectedCategory === cat ? 'bg-accentGreen text-white border-accentGreen' : 'bg-white text-textSecondary border-gray-200 hover:bg-gray-50'}`} onClick={() => setSelectedCategory(cat)}>
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-10">
                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 items-stretch">
                    {filteredMenu.map(item => (
                        <div key={item.id} className="bg-bgCard rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col h-full hover:shadow-lg transition-all relative overflow-hidden group">
                            <div className={`absolute top-6 right-6 px-2 py-1 rounded shadow-md text-xs font-black border bg-white z-10 ${item.type === 'Drinks' ? 'border-blue-500 text-blue-600' : item.type === 'Non-Veg' ? 'border-red-500 text-red-600' : item.type === 'Egg' ? 'border-yellow-500 text-yellow-600' : 'border-green-500 text-green-600'}`}>
                                {item.type === 'Drinks' ? '🧊' : item.type === 'Non-Veg' ? '🟥' : item.type === 'Egg' ? '🟨' : '🟩'}
                            </div>
                            <div className="w-full aspect-square bg-gray-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                                {item.imageUrl && !item.imageUrl.includes('via.placeholder') ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" loading="lazy" />
                                ) : (<span className="text-6xl text-gray-300">🍽️</span>)}
                            </div>
                            <div className="flex flex-col flex-1 justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-textPrimary leading-tight mb-1 line-clamp-2" title={item.name}>{item.name}</h3>
                                    <p className="text-[11px] text-textSecondary font-black uppercase tracking-wider mb-2">{item.category}</p>
                                    {!item.hasVariants && item.stock !== null && item.stock !== undefined && (
                                        <p className={`text-xs font-bold ${item.stock <= 5 ? 'text-red-500' : 'text-blue-500'}`}>📦 Stock: {item.stock}</p>
                                    )}
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto gap-2">
                                    <span className="font-black text-xl text-textPrimary shrink min-w-0">
                                        {item.hasVariants ? <span className="text-sm text-gray-400">from </span> : null}₹{Number(item.price || 0).toFixed(2)}
                                    </span>
                                    <button className="bg-accentOrange hover:bg-orange-500 text-white px-4 py-2 rounded-xl font-black transition-transform active:scale-95 shadow-sm whitespace-nowrap shrink-0 text-sm xl:text-base" onClick={() => handleAddClick(item)}>
                                        {item.hasVariants ? 'Select +' : 'Add +'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {variantModalItem && (
                <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm rounded-2xl">
                    <div className="bg-white rounded-2xl p-6 w-96 max-w-full shadow-2xl flex flex-col transform transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 leading-tight">{variantModalItem.name}</h3>
                                <p className="text-sm text-gray-500 font-bold mt-1">Select Size / Quantity</p>
                            </div>
                            <button onClick={() => setVariantModalItem(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="flex flex-col gap-3 my-4 max-h-60 overflow-y-auto pr-2">
                            {variantModalItem.variants.map((v, index) => (
                                <button key={index} onClick={() => handleVariantSelect(v)} className="flex justify-between items-center p-4 border-2 border-gray-100 rounded-xl hover:border-accentGreen hover:bg-green-50 transition-all group">
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-lg text-gray-800 group-hover:text-green-700">{v.name}</span>
                                        {v.stock !== null && v.stock !== undefined && <span className={`text-xs font-bold ${v.stock <= 5 ? 'text-red-500' : 'text-gray-500'}`}>Stock: {v.stock}</span>}
                                    </div>
                                    <span className="font-black text-xl text-gray-900 group-hover:text-green-700">₹{Number(v.price).toFixed(2)}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setVariantModalItem(null)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl mt-2 transition-colors">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}