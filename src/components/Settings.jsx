import React, { useState, useRef, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings as SettingsIcon, Database, Download, Upload, Percent, ShieldCheck, AlertCircle, AlertTriangle, Palette, Moon, Sun, Check } from 'lucide-react';

export default function Settings({ taxRate, setTaxRate }) {
    // --- STATE ---
    const [isExporting, setIsExporting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [taxInput, setTaxInput] = useState(taxRate);

    // Theme State
    const [appTheme, setAppTheme] = useState(() => localStorage.getItem('kafe_theme') || 'light');
    const [accentColor, setAccentColor] = useState(() => localStorage.getItem('kafe_accent') || 'green');

    const fileInputRef = useRef(null);

    // --- 1. FINANCIAL SETTINGS ---
    const handleSaveTax = () => {
        const newRate = parseFloat(taxInput);
        if (isNaN(newRate) || newRate < 0) {
            alert("Please enter a valid tax rate.");
            return;
        }
        setTaxRate(newRate);
        localStorage.setItem('kafe_tax_rate', newRate);
        alert(`✅ Tax rate successfully updated to ${newRate}%`);
    };

    // --- 2. THEME SETTINGS ---
    const handleThemeChange = (newTheme) => {
        setAppTheme(newTheme);
        localStorage.setItem('kafe_theme', newTheme);

        // NEW: Instantly apply the theme to the entire app!
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleAccentChange = (color) => {
        setAccentColor(color);
        localStorage.setItem('kafe_accent', color);
    };

    // --- 3. EXPORT BACKUP ENGINE ---
    const handleFullBackup = async () => {
        setIsExporting(true);
        try {
            const backupData = {};
            const collectionsToBackup = ['menu', 'orders', 'past_orders', 'daily_reports'];

            for (const colName of collectionsToBackup) {
                const querySnapshot = await getDocs(collection(db, colName));
                backupData[colName] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.download = `Kafe_Master_Backup_${dateStr}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Backup Error: ", error);
            alert("❌ Failed to generate full backup.");
        }
        setIsExporting(false);
    };

    // --- 4. IMPORT RESTORE ENGINE ---
    const handleRestoreClick = () => fileInputRef.current.click();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                const confirmRestore = window.confirm(
                    "🚨 CRITICAL WARNING 🚨\n\nAre you absolutely sure you want to restore this backup?\n\nThis will OVERWRITE your current live menu, inventory, and receipts with the data from the file. This action CANNOT be undone."
                );

                if (!confirmRestore) {
                    event.target.value = '';
                    return;
                }

                setIsRestoring(true);
                const promises = [];

                for (const colName of Object.keys(backupData)) {
                    for (const item of backupData[colName]) {
                        const docRef = doc(db, colName, item.id);
                        const itemData = { ...item };
                        delete itemData.id;
                        promises.push(setDoc(docRef, itemData));
                    }
                }

                await Promise.all(promises);
                alert("✅ SYSTEM RESTORE COMPLETE! Your data has been fully recovered. Please refresh the page.");
                window.location.reload();

            } catch (error) {
                console.error("Restore Error: ", error);
                alert("❌ Restore Failed. Please make sure you selected a valid Kafe Backup .json file.");
            } finally {
                setIsRestoring(false);
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // Helper for accent colors in the UI preview
    const accentColors = {
        green: 'bg-green-500 hover:bg-green-600',
        blue: 'bg-blue-500 hover:bg-blue-600',
        purple: 'bg-purple-500 hover:bg-purple-600',
        orange: 'bg-orange-500 hover:bg-orange-600'
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto pr-2 pb-10">
            {/* Header */}
            <div className="flex justify-between items-end mb-8 shrink-0 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-textPrimary flex items-center gap-3">
                        <SettingsIcon size={32} className="text-gray-400" /> System Settings
                    </h1>
                    <p className="text-textSecondary font-bold mt-1">Manage store configurations, themes, and data backups.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* --- LEFT COLUMN --- */}
                <div className="flex flex-col gap-8">
                    {/* FINANCIAL SETTINGS */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Percent size={24} /></div>
                            <h2 className="text-xl font-black text-gray-800">Financial Configuration</h2>
                        </div>

                        <div className="mb-2">
                            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Global Tax Rate (%)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    className="w-32 bg-gray-50 border border-gray-300 text-gray-900 text-xl font-black rounded-xl px-4 py-3 focus:outline-blue-500 shadow-inner"
                                    value={taxInput}
                                    onChange={(e) => setTaxInput(e.target.value)}
                                    step="0.1"
                                    min="0"
                                />
                                <button
                                    onClick={handleSaveTax}
                                    className="bg-gray-900 hover:bg-black text-white font-bold px-6 py-3 rounded-xl shadow-md transition-transform active:scale-95"
                                >
                                    Save Tax Rate
                                </button>
                            </div>
                            <p className="text-sm text-gray-400 font-bold mt-3 flex items-center gap-1">
                                <AlertCircle size={14} /> Applies to all future POS orders.
                            </p>
                        </div>
                    </div>

                    {/* NEW: THEME & VISUAL SETTINGS */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><Palette size={24} /></div>
                            <h2 className="text-xl font-black text-gray-800">Visual Preferences</h2>
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Interface Mode</label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center gap-2 border-2 transition-all ${appTheme === 'light' ? 'border-gray-900 bg-gray-50 text-gray-900 shadow-inner' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                >
                                    <Sun size={24} className={appTheme === 'light' ? 'text-orange-500' : ''} /> Light Mode
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center gap-2 border-2 transition-all ${appTheme === 'dark' ? 'border-gray-900 bg-gray-900 text-white shadow-inner' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                >
                                    <Moon size={24} className={appTheme === 'dark' ? 'text-blue-400' : ''} /> Dark Mode
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">App Accent Color</label>
                            <div className="flex gap-4">
                                {Object.keys(accentColors).map(color => (
                                    <button
                                        key={color}
                                        onClick={() => handleAccentChange(color)}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 border-4 ${accentColor === color ? 'border-gray-900 scale-110' : 'border-transparent'} ${accentColors[color]}`}
                                    >
                                        {accentColor === color && <Check size={24} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-gray-400 font-bold mt-4">
                                Settings saved automatically. <br />(Full dark mode tailwind integration coming soon!)
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN (BACKUP) --- */}
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                        <div className="bg-green-50 p-3 rounded-xl text-green-600"><Database size={24} /></div>
                        <h2 className="text-xl font-black text-gray-800">Database & Security</h2>
                    </div>

                    <div className="mb-8">
                        <h3 className="font-black text-gray-900 mb-2">Master Database Export</h3>
                        <p className="text-gray-500 font-medium mb-4 text-sm">
                            Download a complete JSON backup of your entire system. This includes your live menu items, inventory levels, active orders, the permanent receipt vault, and daily Z-Reports.
                        </p>

                        <button
                            onClick={handleFullBackup}
                            disabled={isExporting || isRestoring}
                            className={`w-full flex justify-center items-center gap-3 font-black text-lg py-4 rounded-xl shadow-md transition-transform active:scale-95 ${isExporting ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : `${accentColors[accentColor]} text-white`}`}
                        >
                            <Download size={24} className={isExporting ? 'animate-bounce' : ''} />
                            {isExporting ? 'Generating Backup...' : 'Download Full Backup (.json)'}
                        </button>
                    </div>

                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 relative overflow-hidden mt-auto">
                        <AlertTriangle size={120} className="absolute right-[-20px] top-[-20px] text-red-100 opacity-50" />
                        <h3 className="font-black text-red-800 mb-2 relative z-10">System Restore</h3>
                        <p className="text-red-600 font-medium mb-4 text-sm relative z-10">
                            Upload a previous `.json` backup file to restore your database. Warning: This will overwrite your current data.
                        </p>

                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />

                        <button
                            onClick={handleRestoreClick}
                            disabled={isExporting || isRestoring}
                            className={`relative z-10 w-full flex justify-center items-center gap-3 font-black text-lg py-4 rounded-xl shadow-sm transition-transform active:scale-95 border-2 ${isRestoring ? 'bg-red-200 text-red-500 border-red-300 cursor-not-allowed' : 'bg-white text-red-600 border-red-200 hover:bg-red-100'}`}
                        >
                            <Upload size={24} className={isRestoring ? 'animate-bounce' : ''} />
                            {isRestoring ? 'Restoring System...' : 'Upload & Restore Backup'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}