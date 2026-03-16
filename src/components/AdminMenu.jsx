import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, PlusCircle, UploadCloud, X, Crop, Edit, Plus, Package } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../cropUtils';

const IMGBB_API_KEY = "0f15f12b647b0aa01dd7c5883074afd7";

export default function AdminMenu() {
    const [menuItems, setMenuItems] = useState([]);

    // Form States
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [dietaryType, setDietaryType] = useState('Veg');

    // --- NEW: INVENTORY & VARIANT STATES ---
    const [hasVariants, setHasVariants] = useState(false);
    const [price, setPrice] = useState(''); // Standard price
    const [stock, setStock] = useState(''); // Standard stock
    const [variants, setVariants] = useState([{ name: '30ml', price: '', stock: '' }]);

    // Image & Cropper States
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [rawImageSrc, setRawImageSrc] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Filtering & Sorting States
    const [filterCategory, setFilterCategory] = useState('All');
    const [sortOption, setSortOption] = useState('Name (A-Z)');

    // Load Menu Items
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMenuItems(items);
        });
        return () => unsubscribe();
    }, []);

    const dynamicCategories = [...new Set(menuItems.map(item => item.category || 'Uncategorized'))].filter(Boolean);

    let displayedItems = menuItems.filter(item => {
        if (filterCategory === 'All') return true;
        return (item.category || 'Uncategorized') === filterCategory;
    });

    displayedItems.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        const priceA = Number(a.price || 0);
        const priceB = Number(b.price || 0);

        if (sortOption === 'Name (A-Z)') return nameA.localeCompare(nameB);
        if (sortOption === 'Name (Z-A)') return nameB.localeCompare(nameA);
        if (sortOption === 'Price (Low to High)') return priceA - priceB;
        if (sortOption === 'Price (High to Low)') return priceB - priceA;
        return 0;
    });

    // --- CROPPER LOGIC ---
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setRawImageSrc(reader.result);
                setShowCropper(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSaveCrop = async () => {
        try {
            const croppedBlob = await getCroppedImg(rawImageSrc, croppedAreaPixels);
            setImageFile(croppedBlob);
            setImagePreview(URL.createObjectURL(croppedBlob));
            setShowCropper(false);
        } catch (e) {
            console.error(e);
            alert("Failed to crop image.");
        }
    };

    // --- VARIANT LOGIC ---
    const addVariantRow = () => {
        setVariants([...variants, { name: '', price: '', stock: '' }]);
    };

    const updateVariant = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const removeVariant = (index) => {
        const newVariants = variants.filter((_, i) => i !== index);
        setVariants(newVariants);
    };

    // --- EDIT / CANCEL LOGIC ---
    const handleEditClick = (item) => {
        setEditingId(item.id);
        setName(item.name);
        setCategory(item.category || '');
        setDietaryType(item.type || 'Veg');
        setImagePreview(item.imageUrl);
        setImageFile(null);

        // Load Variant & Inventory Data
        setHasVariants(item.hasVariants || false);
        setPrice(item.price ? item.price.toString() : '');
        setStock(item.stock !== undefined ? item.stock.toString() : '');
        setVariants(item.variants || [{ name: '30ml', price: '', stock: '' }]);

        const formElement = document.getElementById('admin-form-container');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setPrice('');
        setStock('');
        setCategory('');
        setDietaryType('Veg');
        setHasVariants(false);
        setVariants([{ name: '30ml', price: '', stock: '' }]);
        setImagePreview(null);
        setImageFile(null);
    };

    // --- SAVE / UPDATE / DELETE LOGIC ---
    const handleSaveItem = async (e) => {
        e.preventDefault();
        if (!name || !category) return alert("Please fill out Name and Category.");
        if (!hasVariants && !price) return alert("Please set a base price.");

        setIsUploading(true);
        let imageUrl = imagePreview || "https://via.placeholder.com/400";

        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append("image", imageFile, "menu_item.jpg");

                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) imageUrl = data.data.url;
            }

            const itemData = {
                name: name,
                category: category,
                type: dietaryType,
                imageUrl: imageUrl,
                hasVariants: hasVariants,
                // Default base price for sorting logic
                price: hasVariants && variants.length > 0 ? parseFloat(variants[0].price || 0) : parseFloat(price || 0)
            };

            // Attach specific inventory/variant data
            if (hasVariants) {
                itemData.variants = variants.filter(v => v.name && v.price).map(v => ({
                    ...v,
                    price: parseFloat(v.price),
                    stock: v.stock ? parseInt(v.stock) : null
                }));
                itemData.stock = null; // Use variant stock instead
            } else {
                itemData.variants = [];
                itemData.stock = stock ? parseInt(stock) : null;
            }

            if (editingId) {
                await updateDoc(doc(db, 'menu', editingId), itemData);
            } else {
                await addDoc(collection(db, 'menu'), itemData);
            }
            resetForm();
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to upload image or save item.");
        }
        setIsUploading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this item?")) {
            await deleteDoc(doc(db, 'menu', id));
            if (editingId === id) resetForm();
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            <h1 className="text-3xl font-bold text-textPrimary mb-4 shrink-0">Menu & Inventory Management</h1>

            {/* --- COMPACT REDESIGNED FORM --- */}
            <div id="admin-form-container" className={`p-5 rounded-xl border shadow-sm mb-6 shrink-0 transition-colors ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>

                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className={`text-base font-black flex items-center gap-2 ${editingId ? 'text-blue-600' : 'text-textPrimary'}`}>
                        {editingId ? <><Edit size={18} /> Editing: {name}</> : <><PlusCircle className="text-accentGreen" size={18} /> Add New Menu Item / Liquor</>}
                    </h2>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1 bg-white px-2 py-1 rounded border shadow-sm transition-colors">
                            <X size={14} /> Cancel Edit
                        </button>
                    )}
                </div>

                <form id="add-item-form" onSubmit={handleSaveItem} className="flex flex-col md:flex-row gap-5 items-start">

                    {/* Image Upload Square */}
                    <div className="shrink-0 pt-2">
                        <label className="cursor-pointer w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden relative group shadow-sm">
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white gap-2 font-bold text-xs">
                                        <Crop size={16} /> Edit
                                    </div>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={28} className="text-gray-400 mb-2" />
                                    <span className="text-[11px] font-bold text-gray-500 text-center uppercase tracking-wider">Add Image</span>
                                </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </label>
                    </div>

                    {/* Inputs Area */}
                    <div className="flex-1 w-full flex flex-col gap-4">

                        {/* Top Row: Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Item Name *</label>
                                <input type="text" placeholder="e.g. Garlic Bread, Black Dog" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:border-accentGreen focus:ring-1 focus:ring-accentGreen outline-none font-medium text-sm shadow-sm" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Category *</label>
                                <input type="text" list="dynamicCategoryOptions" placeholder="e.g. Starters, Liquors" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:border-accentGreen focus:ring-1 focus:ring-accentGreen outline-none font-medium text-sm shadow-sm" value={category} onChange={(e) => setCategory(e.target.value)} required />
                                <datalist id="dynamicCategoryOptions">
                                    {dynamicCategories.map(cat => <option key={cat} value={cat} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Dietary / Type</label>
                                <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:border-accentGreen focus:ring-1 focus:ring-accentGreen outline-none font-bold text-sm shadow-sm" value={dietaryType} onChange={(e) => setDietaryType(e.target.value)}>
                                    <option value="Veg" className="text-green-600">🟩 Veg</option>
                                    <option value="Non-Veg" className="text-red-500">🟥 Non-Veg</option>
                                    <option value="Egg" className="text-yellow-600">🟨 Egg</option>
                                    <option value="Drinks" className="text-blue-500">🧊 Drinks / Bar</option>
                                </select>
                            </div>
                        </div>

                        {/* Mid Row: Toggle Variants */}
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <input type="checkbox" id="variantToggle" className="w-4 h-4 accent-accentGreen" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} />
                            <label htmlFor="variantToggle" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                Item has multiple sizes/variants (e.g., 30ml, 60ml, Half, Full)
                            </label>
                        </div>

                        {/* Bottom Row: Pricing & Inventory */}
                        {!hasVariants ? (
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Standard Price (₹) *</label>
                                    <input type="number" step="0.01" placeholder="0.00" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 focus:border-accentGreen outline-none font-medium text-sm shadow-sm" value={price} onChange={(e) => setPrice(e.target.value)} required={!hasVariants} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Package size={12} /> Track Stock Qty (Optional)</label>
                                    <input type="number" placeholder="e.g. 50" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none font-medium text-sm shadow-sm" value={stock} onChange={(e) => setStock(e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Manage Variants & Inventory</label>
                                {variants.map((v, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input type="text" placeholder="Name (e.g. 30ml)" className="w-1/3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:border-accentGreen outline-none" value={v.name} onChange={(e) => updateVariant(index, 'name', e.target.value)} required />
                                        <input type="number" placeholder="Price (₹)" className="w-1/3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:border-accentGreen outline-none" value={v.price} onChange={(e) => updateVariant(index, 'price', e.target.value)} required />
                                        <input type="number" placeholder="Stock Qty (Opt)" className="w-1/3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:border-blue-500 outline-none" value={v.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} />
                                        {variants.length > 1 && (
                                            <button type="button" onClick={() => removeVariant(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addVariantRow} className="self-start mt-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded flex items-center gap-1 transition-colors">
                                    <Plus size={14} /> Add Another Variant
                                </button>
                            </div>
                        )}

                        {/* Action Button */}
                        <div className="flex justify-end mt-2">
                            <button type="submit" disabled={isUploading} className={`px-8 py-2.5 rounded-lg font-black text-sm text-white transition-transform ${isUploading ? 'bg-gray-400' : (editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-accentGreen hover:bg-green-600')} active:scale-95 shadow-sm`}>
                                {isUploading ? "Wait..." : (editingId ? "Update Item" : "Save Item")}
                            </button>
                        </div>

                    </div>
                </form>
            </div>

            {/* --- CROPPER MODAL (Unchanged) --- */}
            {showCropper && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-bgCard w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Crop /> Adjust Image Layout</h3>
                            <button onClick={() => setShowCropper(false)} className="text-gray-500 hover:text-red-500"><X size={28} /></button>
                        </div>
                        <div className="relative flex-1 bg-gray-900">
                            <Cropper image={rawImageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                        </div>
                        <div className="p-6 bg-bgCard border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-4 w-1/2">
                                <span className="font-bold text-textSecondary">Zoom</span>
                                <input type="range" value={zoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setZoom(e.target.value)} className="w-full accent-accentGreen" />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowCropper(false)} className="px-6 py-3 font-bold text-textSecondary hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                                <button onClick={handleSaveCrop} className="px-8 py-3 bg-accentGreen hover:bg-green-600 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95">Save Crop ✅</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CURRENT MENU LIST --- */}
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-xl font-bold">Current Live Menu</h2>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-md">
                        {['All', ...dynamicCategories].map(cat => (
                            <button
                                key={cat}
                                className={`px-4 py-1.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border shadow-sm ${filterCategory === cat ? 'bg-accentGreen text-white border-accentGreen' : 'bg-white text-textSecondary border-gray-200 hover:bg-gray-50'}`}
                                onClick={() => setFilterCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <select className="bg-white border border-gray-300 rounded-lg px-4 py-2 font-bold text-sm focus:outline-accentGreen shadow-sm cursor-pointer" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                        <option value="Name (A-Z)">Sort: Name (A-Z)</option>
                        <option value="Name (Z-A)">Sort: Name (Z-A)</option>
                        <option value="Price (Low to High)">Sort: Price (Low-High)</option>
                        <option value="Price (High to Low)">Sort: Price (High-Low)</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-10">
                {displayedItems.map(item => (
                    <div key={item.id} className="bg-bgCard p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">

                        <div className="flex items-center gap-5">
                            <div className="w-16 aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                {item.imageUrl && !item.imageUrl.includes('via.placeholder') ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                ) : (<span className="text-2xl">🍽️</span>)}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-accentOrange uppercase tracking-wider px-2 py-0.5 bg-orange-50 rounded border border-orange-100">{item.category}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.type === 'Drinks' ? 'text-blue-600 border-blue-200 bg-blue-50' : item.type === 'Non-Veg' ? 'text-red-600 border-red-200 bg-red-50' : item.type === 'Egg' ? 'text-yellow-600 border-yellow-200 bg-yellow-50' : 'text-green-600 border-green-200 bg-green-50'}`}>
                                        {item.type === 'Drinks' ? '🧊 Drinks' : item.type === 'Non-Veg' ? '🟥 Non-Veg' : item.type === 'Egg' ? '🟨 Egg' : '🟩 Veg'}
                                    </span>
                                    {/* Show Standard Stock if available */}
                                    {!item.hasVariants && item.stock !== null && item.stock !== undefined && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-blue-600 border-blue-200 bg-blue-50 flex items-center gap-1"><Package size={10} /> Stock: {item.stock}</span>
                                    )}
                                </div>
                                <span className="text-lg font-black text-textPrimary">
                                    {item.name} <span className="text-gray-300 mx-2">|</span>
                                    {item.hasVariants ? (
                                        <span className="text-sm font-bold text-gray-500">
                                            Starts at ₹{item.price} ({item.variants?.length || 0} variants)
                                        </span>
                                    ) : (
                                        `₹${Number(item.price || 0).toFixed(2)}`
                                    )}
                                </span>
                                {/* Quick preview of variants */}
                                {item.hasVariants && item.variants && (
                                    <div className="text-[11px] text-gray-400 font-medium mt-1">
                                        {item.variants.map(v => `${v.name} (₹${v.price}${v.stock ? ` - Qty: ${v.stock}` : ''})`).join(' • ')}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 font-bold border border-transparent hover:border-blue-100 text-sm">
                                <Edit size={16} /> Edit
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 font-bold border border-transparent hover:border-red-100 text-sm">
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
}