import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Home, Power, Sun, BatteryCharging, PowerOff, Trash2, Plus, Info, Printer, Briefcase, ArrowLeft, Edit, Save, AlertTriangle, ArrowRight, Check, Zap } from 'lucide-react';

// --- Constants ---
const PSH_OPTIONS = [
    { value: 3, label: '3 Hours (Heavy Clouds/Shade)' },
    { value: 4, label: '4 Hours (Cloudy Regions)' },
    { value: 5, label: '5 Hours (Standard Average)' },
    { value: 6, label: '6 Hours (Sunnier Regions)' },
    { value: 7, label: '7 Hours (Desert Climates)' }
];
const BATTERY_DOD_OPTIONS = [
    { value: 0.9, label: 'Lithium-ion (90% DoD)' },
    { value: 0.8, label: 'Tubular / LiFePO4 (80% DoD)' },
    { value: 0.75, label: 'Tubular (75% DoD)' },
    { value: 0.70, label: 'Tubular (70% DoD)' },
    { value: 0.5, label: 'Lead-Acid (50% DoD)' }
];
const SYSTEM_VOLTAGE_OPTIONS = [
    { value: 12, label: '12V' }, { value: 24, label: '24V' }, { value: 48, label: '48V' }
];
const AVAILABLE_BATTERY_VOLTAGE_OPTIONS = [
    { value: 2, label: '2V' }, { value: 6, label: '6V' }, { value: 12, label: '12V' }
];
// Inverter sizes in kVA
const INVERTER_SIZES_KVA = [1, 1.5, 2, 2.5, 3, 4, 5, 8, 10, 12];
const INVERTER_SAFETY_FACTOR = 1.25;
const CHARGE_CONTROLLER_SAFETY_FACTOR = 1.25;
const POWER_FACTOR = 0.8; // Typical for residential loads

// --- Reusable UI Components ---

const Tooltip = ({ text, children }) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs px-3 py-2 text-xs font-semibold text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            {text}
        </div>
    </div>
);

const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-500 mt-1">{subtitle}</p>
    </div>
);

const InputField = React.memo(React.forwardRef(({ label, type, value, onChange, unit, min = 0, tooltip, placeholder, autoFocus = false, disabled = false }, ref) => (
    <div className="w-full">
        {label && <label className="flex items-center text-sm font-medium text-gray-600 mb-2">
            {label}
            {tooltip && <Tooltip text={tooltip}><Info size={14} className="ml-1.5 text-gray-400 cursor-help" /></Tooltip>}
        </label>}
        <div className="relative">
            <input 
                ref={ref} 
                type={type} 
                value={value === 0 && !disabled ? '' : value} 
                onChange={onChange} 
                min={min} 
                placeholder={placeholder} 
                autoFocus={autoFocus} 
                disabled={disabled}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition text-gray-900 placeholder-gray-400 disabled:bg-gray-100" 
            />
            {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{unit}</span>}
        </div>
    </div>
)));

const SelectField = React.memo(({ label, value, onChange, options, tooltip }) => (
    <div className="w-full">
        {label && <label className="flex items-center text-sm font-medium text-gray-600 mb-2">
            {label}
            {tooltip && <Tooltip text={tooltip}><Info size={14} className="ml-1.5 text-gray-400 cursor-help" /></Tooltip>}
        </label>}
        <select value={value} onChange={onChange} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition appearance-none text-gray-900">
            {options.map(opt => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
));

const Modal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-medium text-gray-900" id="modal-title">{title}</h3>
                <div className="mt-2"><p className="text-sm text-gray-500">{children}</p></div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={onConfirm}>Delete</button>
                    <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:mt-0 sm:w-auto sm:text-sm" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

// --- Page Components ---

const CalculatorPage = ({ project, updateProject, goBack, isNew }) => {
    const [projectData, setProjectData] = useState(project);
    const [currentStep, setCurrentStep] = useState(1);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (JSON.stringify(projectData) !== JSON.stringify(project)) {
                updateProject(projectData);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [projectData, updateProject, project]);

     // Scroll to top when step changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentStep]);
    
    const handleInputChange = (field, value) => {
        const fieldType = typeof project[field];
        let parsedValue = value;
        if (fieldType === 'number' || field === 'panelWattage') {
            parsedValue = parseFloat(value) || 0;
        }
        setProjectData(prevData => ({ ...prevData, [field]: parsedValue }));
    };
    
    const handleApplianceChange = (id, field, value) => {
        const updatedAppliances = projectData.appliances.map(app =>
            app.id === id ? { ...app, [field]: value } : app
        );
        setProjectData(prevData => ({ ...prevData, appliances: updatedAppliances }));
    };

    const addAppliance = () => {
        const newAppliance = { id: Date.now(), name: '', quantity: 1, wattage: 0, hours: 0 };
        setProjectData(prevData => ({ ...prevData, appliances: [...(prevData.appliances || []), newAppliance] }));
    };

    const removeAppliance = (id) => {
        const updatedAppliances = projectData.appliances.filter(app => app.id !== id);
        setProjectData(prevData => ({ ...prevData, appliances: updatedAppliances }));
    };

    const totalWattHoursFromAudit = useMemo(() => {
        if (!projectData.appliances) return 0;
        return projectData.appliances.reduce((total, app) => total + (Number(app.quantity) * Number(app.wattage) * Number(app.hours)), 0);
    }, [projectData.appliances]);
    
    const estimatedPeakLoadFromAudit = useMemo(() => {
        if (!projectData.appliances || projectData.calcMethod !== 'audit') return 0;
        return projectData.appliances.reduce((total, app) => total + (Number(app.quantity) * Number(app.wattage)), 0);
    }, [projectData.appliances, projectData.calcMethod]);

    useEffect(() => {
        if (projectData.calcMethod === 'audit') {
            const newKwh = totalWattHoursFromAudit / 1000;
            if (projectData.dailyEnergyKwh !== newKwh) {
                 setProjectData(prevData => ({ ...prevData, dailyEnergyKwh: newKwh }));
            }
            if (!projectData.isPeakLoadCustom) {
                setProjectData(prevData => ({...prevData, peakLoad: estimatedPeakLoadFromAudit}));
            }
        }
    }, [totalWattHoursFromAudit, estimatedPeakLoadFromAudit, projectData.calcMethod, projectData.isPeakLoadCustom]);

    const calculations = useMemo(() => {
        const { dailyEnergyKwh, peakSunHours, systemEfficiency, panelWattage, daysOfAutonomy, batteryDoD, batteryVoltage, peakLoad, availableBatteryAh, availableBatteryVoltage } = projectData;
        const safePeakSunHours = Number(peakSunHours) > 0 ? Number(peakSunHours) : 1;
        const safeSystemEfficiency = Number(systemEfficiency) > 0 ? Number(systemEfficiency) / 100 : 0.8;
        const safeBatteryDoD = Number(batteryDoD) > 0 ? Number(batteryDoD) : 1;
        const safeBatteryVoltage = Number(batteryVoltage) > 0 ? Number(batteryVoltage) : 1;
        const safeAvailableBatteryVoltage = Number(availableBatteryVoltage) > 0 ? Number(availableBatteryVoltage) : 1;
        const safeAvailableBatteryAh = Number(availableBatteryAh) > 0 ? Number(availableBatteryAh) : 1;
        const effectivePanelWattage = Number(panelWattage) || 1;
        const dailyEnergyWh = Number(dailyEnergyKwh) * 1000;
        
        const inverterSizeInWatts = Number(peakLoad) * INVERTER_SAFETY_FACTOR;
        const inverterSizeKva = (inverterSizeInWatts / 1000) / POWER_FACTOR;
        
        const totalStorageWh = dailyEnergyWh * Number(daysOfAutonomy);
        const requiredBatteryCapacityWh = safeBatteryDoD > 0 ? totalStorageWh / safeBatteryDoD : 0;
        const requiredBatteryCapacityAh = safeBatteryVoltage > 0 ? Math.ceil(requiredBatteryCapacityWh / safeBatteryVoltage) : 0;
        let totalNumberOfBatteries = 0;
        const isVoltageCompatible = safeBatteryVoltage > 0 && safeAvailableBatteryVoltage > 0 && safeBatteryVoltage % safeAvailableBatteryVoltage === 0;
        if (isVoltageCompatible && safeAvailableBatteryAh > 0) {
            const batteriesInSeries = safeBatteryVoltage / safeAvailableBatteryVoltage;
            const numberOfParallelStrings = Math.ceil(requiredBatteryCapacityAh / safeAvailableBatteryAh);
            totalNumberOfBatteries = isFinite(batteriesInSeries * numberOfParallelStrings) ? batteriesInSeries * numberOfParallelStrings : 0;
        }
        const denominatorForPanelWattage = safePeakSunHours * safeSystemEfficiency;
        const requiredPanelWattage = denominatorForPanelWattage > 0 ? (dailyEnergyWh / denominatorForPanelWattage) : 0;
        const numberOfPanels = effectivePanelWattage > 0 ? Math.ceil(requiredPanelWattage / effectivePanelWattage) : 0;
        const actualSystemSizeKw = (numberOfPanels * effectivePanelWattage) / 1000;
        const totalSolarPanelCurrent = safeBatteryVoltage > 0 ? (numberOfPanels * effectivePanelWattage) / safeBatteryVoltage : 0;
        const chargeControllerAmps = Math.ceil(totalSolarPanelCurrent * CHARGE_CONTROLLER_SAFETY_FACTOR) || 0;
        
        return {
            actualSystemSizeKw: actualSystemSizeKw.toFixed(2),
            numberOfPanels: isFinite(numberOfPanels) ? numberOfPanels : 0,
            requiredBatteryCapacityWh: isFinite(requiredBatteryCapacityWh) ? Math.ceil(requiredBatteryCapacityWh) : 0,
            requiredBatteryCapacityAh: isFinite(requiredBatteryCapacityAh) ? Math.ceil(requiredBatteryCapacityAh) : 0,
            inverterSizeKva: isFinite(inverterSizeKva) ? inverterSizeKva.toFixed(1) : 0,
            chargeControllerAmps: isFinite(chargeControllerAmps) ? chargeControllerAmps : 0,
            totalNumberOfBatteries,
            effectivePanelWattage
        };
    }, [projectData]);

    const suggestedInverters = useMemo(() => {
        return INVERTER_SIZES_KVA.filter(size => size >= calculations.inverterSizeKva).slice(0, 3);
    }, [calculations.inverterSizeKva]);

    useEffect(() => {
        if (currentStep === 3 && suggestedInverters.length > 0 && projectData.selectedInverterKva === 0) {
            handleInputChange('selectedInverterKva', suggestedInverters[0]);
        }
    }, [currentStep, suggestedInverters, projectData.selectedInverterKva]);

    const TOTAL_STEPS = 6;
    const isStepValid = useMemo(() => {
      switch(currentStep) {
        case 1: return projectData.projectName?.trim() !== '';
        case 2: return projectData.calcMethod === 'bill' ? projectData.dailyEnergyKwh > 0 : totalWattHoursFromAudit > 0;
        case 3: return projectData.peakLoad > 0;
        case 4: return projectData.daysOfAutonomy > 0 && projectData.availableBatteryAh > 0;
        case 5: return projectData.peakSunHours > 0 && projectData.systemEfficiency > 0 && projectData.panelWattage > 0;
        default: return true;
      }
    }, [currentStep, projectData, totalWattHoursFromAudit]);

    const handleNext = () => {
        if ((isNew && isStepValid) || !isNew) {
            if (currentStep < TOTAL_STEPS) setCurrentStep(step => step + 1);
        }
    };
    
    const steps = [
        { number: 1, icon: <Briefcase size={20} />, title: 'Project Details' },
        { number: 2, icon: <Power size={20} />, title: 'Energy Consumption' },
        { number: 3, icon: <PowerOff size={20} />, title: 'Inverter Sizing' },
        { number: 4, icon: <BatteryCharging size={20} />, title: 'Battery Sizing' },
        { number: 5, icon: <Sun size={20} />, title: 'Panel Sizing' },
        { number: 6, icon: <Check size={20} />, title: 'Summary' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto py-6 sm:py-12">
            <style>{`
                /* Hide number input spinners */
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
                input[type=number] {
                  -moz-appearance: textfield;
                }
                @media print {
                    body { background-color: white !important; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-hidden { display: none; }
                    @page { size: A4; margin: 15mm; }
                }
            `}</style>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* --- Left Column: Stepper (Desktop) --- */}
                <div className="hidden lg:block lg:col-span-1 print-hidden">
                    <div className="sticky top-12">
                        <button onClick={goBack} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 mb-8 group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span>All Projects</span>
                        </button>
                        <div className="space-y-2">
                            {steps.map((step) => (
                                <div key={step.number} onClick={() => setCurrentStep(step.number)} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 border-l-4 ${currentStep === step.number ? 'bg-amber-100/50 border-amber-500 text-gray-900' : 'border-transparent hover:bg-gray-100 text-gray-500'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${currentStep === step.number ? 'text-amber-600' : 'text-gray-400'}`}>
                                        {step.icon}
                                    </div>
                                    <span className="font-semibold">{step.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    {/* --- Top Bar: Stepper (Mobile) & Back Button --- */}
                     <div className="lg:hidden print-hidden mb-8">
                         <button onClick={goBack} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 mb-4 group">
                            <ArrowLeft size={16} />
                            <span>All Projects</span>
                        </button>
                        <div className="relative">
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 -z-10">
                                <div className="bg-amber-500 h-full transition-all duration-300" style={{width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`}}></div>
                            </div>
                            <div className="flex justify-between items-center">
                                {steps.map(step => (
                                    <div key={step.number} onClick={() => setCurrentStep(step.number)} className="flex flex-col items-center flex-1 cursor-pointer z-10">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${currentStep >= step.number ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-300 text-gray-500'}`}>
                                            {step.number}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                    <div className="bg-white p-6 sm:p-12 rounded-2xl shadow-sm border border-gray-200 min-h-[600px]">
                        <div className="transition-all duration-300">
                            {currentStep === 1 && <SectionHeader title="Project Details" subtitle="Start by defining the project scope." />}
                            {currentStep === 2 && <SectionHeader title="Daily Energy Consumption" subtitle="Determine the total daily power your system needs to provide." />}
                            {currentStep === 3 && <SectionHeader title="Inverter Sizing" subtitle="Size the core component that converts DC to AC power." />}
                            {currentStep === 4 && <SectionHeader title="Battery Bank Sizing" subtitle="Determine the storage capacity and number of batteries needed." />}
                            {currentStep === 5 && <SectionHeader title="Solar Panel & Controller Sizing" subtitle="Calculate the required solar array and charge controller." />}
                            
                            {currentStep === 1 && <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><InputField label="Project Name" type="text" value={projectData.projectName} onChange={e => handleInputChange('projectName', e.target.value)} placeholder="e.g. Client A Residence"/><InputField label="Client Name" type="text" value={projectData.clientName} onChange={e => handleInputChange('clientName', e.target.value)} placeholder="e.g. John Doe"/></div>}
                            
                            {currentStep === 2 && <div><div className="flex justify-center mb-8"><div className="flex rounded-lg p-1 bg-gray-100 border border-gray-200"><button onClick={() => handleInputChange('calcMethod', 'audit')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${projectData.calcMethod === 'audit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Appliance Audit</button><button onClick={() => handleInputChange('calcMethod', 'bill')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${projectData.calcMethod === 'bill' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>From Utility Bill</button></div></div>{projectData.calcMethod === 'audit' ? (<div><div className="space-y-4">{projectData.appliances && projectData.appliances.map(app => (<div key={app.id} className="grid grid-cols-12 gap-x-4 items-end border-b border-gray-200 pb-3"><div className="col-span-12 sm:col-span-4"><InputField label="Appliance" type="text" value={app.name} onChange={e => handleApplianceChange(app.id, 'name', e.target.value)} placeholder="e.g. Fridge" /></div><div className="col-span-4 sm:col-span-2"><InputField label="Qty" type="number" value={app.quantity} onChange={e => handleApplianceChange(app.id, 'quantity', Number(e.target.value))} /></div><div className="col-span-4 sm:col-span-2"><InputField label="Wattage" type="number" value={app.wattage} onChange={e => handleApplianceChange(app.id, 'wattage', Number(e.target.value))} unit="W" /></div><div className="col-span-4 sm:col-span-2"><InputField label="Hours" type="number" value={app.hours} onChange={e => handleApplianceChange(app.id, 'hours', Number(e.target.value))} unit="H" /></div><div className="col-span-12 sm:col-span-2 flex justify-end"><button onClick={() => removeAppliance(app.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-100 p-2 rounded-full"><Trash2 size={18} /></button></div></div>))}</div><button onClick={addAppliance} className="mt-4 flex items-center space-x-2 text-amber-600 font-semibold hover:text-amber-700"><Plus size={18} /><span>Add Appliance</span></button><div className="mt-6 border-t border-gray-200 pt-4 text-right"><p className="text-gray-500">Total Daily Energy Consumption</p><p className=" mt-2 text-xl font-bold text-gray-900">{totalWattHoursFromAudit.toLocaleString()} Wh/day</p><p className="mt-1 text-4xl font-bold text-gray-900 -mt-1">{(totalWattHoursFromAudit / 1000).toFixed(2)} <span className="text-2xl">kWh/day</span></p></div></div>) : (<div className="max-w-md mx-auto"><InputField label="Average Daily Energy Use" type="number" value={projectData.dailyEnergyKwh} onChange={e => handleInputChange('dailyEnergyKwh', e.target.value)} unit="kWh" tooltip="Find this on your monthly electricity bill."/></div>)}</div>}

                            {currentStep === 3 && <div><InputField label="Peak Load" type="number" value={projectData.peakLoad} onChange={e => handleInputChange('peakLoad', e.target.value)} unit="W" tooltip="The maximum total wattage of all appliances you might run at the same time." disabled={!projectData.isPeakLoadCustom && projectData.calcMethod === 'audit'}/><div className="mt-2 flex items-center space-x-3"><input type="checkbox" id="is-peak-load-custom" checked={projectData.isPeakLoadCustom} onChange={e => handleInputChange('isPeakLoadCustom', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" /><label htmlFor="is-peak-load-custom" className="text-sm text-gray-600">Manually specify peak load</label></div><div className="mt-8 bg-gray-50 border border-gray-200 p-6 rounded-lg"><h4 className="font-semibold text-gray-800">Select Inverter Size</h4><p className="text-sm text-gray-500 mb-3">Based on {calculations.inverterSizeKva} kVA required (with safety margin & 0.8 PF):</p>{suggestedInverters.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{suggestedInverters.map((size) => (<button key={size} onClick={() => handleInputChange('selectedInverterKva', size)} className={`p-3 rounded-md text-center transition-colors ${projectData.selectedInverterKva === size ? 'bg-amber-400 text-gray-900 font-bold ring-2 ring-amber-500' : 'bg-white hover:bg-amber-100/50 border border-gray-300'}`}><span className="font-bold text-lg">{size.toLocaleString()}</span> kVA</button>))}</div>) : (<p className="text-gray-500">No standard inverters match. Check Peak Load.</p>)}</div></div>}
                            
                            {currentStep === 4 && <div><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><InputField label="Days of Autonomy" type="number" value={projectData.daysOfAutonomy} onChange={e => handleInputChange('daysOfAutonomy', e.target.value)} unit="days" tooltip="How many days the system should run on battery power without sun."/><SelectField label="Battery Type (DoD)" value={projectData.batteryDoD} onChange={e => handleInputChange('batteryDoD', e.target.value)} options={BATTERY_DOD_OPTIONS} tooltip="Depth of Discharge: The usable percentage of the battery."/><SelectField label="System Voltage" value={projectData.batteryVoltage} onChange={e => handleInputChange('batteryVoltage', e.target.value)} options={SYSTEM_VOLTAGE_OPTIONS} tooltip="Higher voltage is generally more efficient."/></div><div className="mt-8 pt-6 border-t border-gray-200"><h3 className="text-lg font-semibold text-gray-800 mb-4">Individual Battery Specs</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><InputField label="Single Battery Capacity" type="number" value={projectData.availableBatteryAh} onChange={e => handleInputChange('availableBatteryAh', e.target.value)} unit="Ah" tooltip="The Amp-hour rating of a single battery you plan to use."/><SelectField label="Single Battery Voltage" value={projectData.availableBatteryVoltage} onChange={e => handleInputChange('availableBatteryVoltage', e.target.value)} options={AVAILABLE_BATTERY_VOLTAGE_OPTIONS} tooltip="The voltage of a single battery unit."/></div>{projectData.batteryVoltage > 0 && projectData.availableBatteryVoltage > 0 && projectData.batteryVoltage % projectData.availableBatteryVoltage !== 0 && (<p className="text-red-600 text-sm mt-3">Warning: System Voltage is not a multiple of the single battery voltage.</p>)}</div></div>}

                            {currentStep === 5 && <div><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><SelectField label="Peak Sun Hours" value={projectData.peakSunHours} onChange={e => handleInputChange('peakSunHours', e.target.value)} options={PSH_OPTIONS} tooltip="The average daily hours of intense sunlight for your location."/><InputField label="System Efficiency" type="number" value={projectData.systemEfficiency} onChange={e => handleInputChange('systemEfficiency', e.target.value)} unit="%" tooltip="Accounts for energy loss in wires, inverter, etc. 80-85% is typical."/><InputField label="Panel Wattage" type="number" value={projectData.panelWattage} onChange={e => handleInputChange('panelWattage', e.target.value)} unit="W" tooltip="Enter the power rating of a single solar panel you plan to use." placeholder="e.g. 450"/></div><div className="mt-6 flex items-center space-x-3"><input type="checkbox" id="has-controller" checked={projectData.hasBuiltInController} onChange={e => handleInputChange('hasBuiltInController', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" /><label htmlFor="has-controller" className="text-sm text-gray-600">My inverter has a built-in charge controller (e.g., Hybrid Inverter)</label></div>{!projectData.hasBuiltInController && <div className="mt-8 bg-gray-50 border border-gray-200 p-4 rounded-lg text-center"><p className="text-gray-500">Required Charge Controller Size</p><p className="text-3xl font-bold text-gray-900">{calculations.chargeControllerAmps.toLocaleString()} <span className="text-xl">Amps</span></p><p className="text-xs text-gray-500 mt-1">Based on solar array output, with a 25% safety factor.</p></div>}</div>}
                            
                            {currentStep === 6 && (
                                <>
                                    <div className="print-area">
                                        <div className="text-center mb-10">
                                            <h2 className="text-3xl font-bold text-gray-900">System Requirement Summary</h2>
                                            <p className="text-gray-500">A complete overview of your off-grid solar system.</p>
                                        </div>
                                        <div className="border-b border-t border-gray-200 py-4 mb-8">
                                            <div className="flex justify-between text-gray-900">
                                                <div className="text-left"><p className="text-sm text-gray-500">Project</p><p className="font-semibold">{projectData.projectName}</p></div>
                                                <div className="text-left"><p className="text-sm text-gray-500">Client</p><p className="font-semibold">{projectData.clientName || 'N/A'}</p></div>
                                                <div className="text-left"><p className="text-sm text-gray-500">Date</p><p className="font-semibold">{new Date().toLocaleDateString()}</p></div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg text-center"><p className="text-sm font-semibold text-amber-800">Inverter Size</p><p className="text-4xl font-bold text-gray-900">{projectData.selectedInverterKva} <span className="text-2xl">kVA</span></p></div>
                                            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center"><p className="text-sm font-semibold text-gray-600">Solar Array</p><p className="text-4xl font-bold text-gray-900">{calculations.actualSystemSizeKw} <span className="text-2xl">kW</span></p></div>
                                            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center"><p className="text-sm font-semibold text-gray-600">Battery Capacity</p><p className="text-4xl font-bold text-gray-900">{(calculations.requiredBatteryCapacityWh / 1000).toFixed(2)} <span className="text-2xl">kWh</span></p></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Power Core</h3>
                                                <div className="flex justify-between items-center"><span className="text-gray-500">Daily Energy Need</span><span className="font-bold text-gray-900">{projectData.dailyEnergyKwh} kWh</span></div>
                                                <div className="flex justify-between items-center"><span className="text-gray-500">Peak Load</span><span className="font-bold text-gray-900">{projectData.peakLoad} W</span></div>
                                                <div className="flex justify-between items-center"><span className="text-gray-500">System Voltage</span><span className="font-bold text-gray-900">{projectData.batteryVoltage}V</span></div>
                                            </div>
                                             <div className="space-y-4">
                                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Energy Storage</h3>
                                                <div className="flex justify-between items-center"><span className="text-gray-500">Required Capacity (Wh)</span><span className="font-bold text-gray-900">{calculations.requiredBatteryCapacityWh.toLocaleString()} Wh</span></div>
                                                <div className="flex justify-between items-center"><span className="text-gray-500">Required Capacity (Ah)</span><span className="font-bold text-gray-900">{calculations.requiredBatteryCapacityAh.toLocaleString()} Ah</span></div>
                                                <div className="flex justify-between items-center"><span className="text-gray-500">Number of Batteries</span><span className="font-bold text-gray-900">{calculations.totalNumberOfBatteries} <span className="text-sm font-normal">({projectData.availableBatteryAh}Ah, {projectData.availableBatteryVoltage}V)</span></span></div>
                                            </div>
                                             <div className="space-y-4 md:col-span-2">
                                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Generation & Charging</h3>
                                                <div className="flex justify-between items-center"><span className="text-gray-500">Number of Panels</span><span className="font-bold text-gray-900">{calculations.numberOfPanels} <span className="text-sm font-normal">({calculations.effectivePanelWattage}W)</span></span></div>
                                                {!projectData.hasBuiltInController && <div className="flex justify-between items-center"><span className="text-gray-500">Charge Controller</span><span className="font-bold text-gray-900">{calculations.chargeControllerAmps.toLocaleString()} A</span></div>}
                                                {projectData.hasBuiltInController && <div className="flex justify-between items-center"><span className="text-gray-500">Charge Controller</span><span className="font-bold text-gray-900">Built into Inverter</span></div>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => window.print()} className="mt-8 w-full flex items-center justify-center gap-2 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-900 transition duration-300 shadow-lg print-hidden"><Printer size={20} /><span>Print Summary</span></button>
                                </>
                            )}
                        </div>
                    </div>
                     <div className="mt-8 flex justify-end items-center print-hidden">
                        <button onClick={handleNext} className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-gray-900 transition-all duration-300 ${currentStep < TOTAL_STEPS ? 'bg-amber-400 hover:bg-amber-500 shadow-lg' : 'opacity-0 invisible'} ${!isStepValid ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}`} disabled={!isStepValid || currentStep >= TOTAL_STEPS}>
                            <span>Next</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectDashboard = ({ projects, createNewProject, openProject, deleteProject, updateProjectName }) => {
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectName, setEditingProjectName] = useState('');

    const startEditing = (project) => {
        setEditingProjectId(project.id);
        setEditingProjectName(project.projectName);
    };

    const saveProjectName = (projectId) => {
        updateProjectName(projectId, editingProjectName);
        setEditingProjectId(null);
    };

    return (
        <div className="py-12">
            <header className="text-center mb-12">
                <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900">Solisys</h1>
                <p className="text-lg text-gray-500 mt-2">Manage all your solar calculation projects in one place.</p>
            </header>
            <div className="max-w-3xl mx-auto">
                <button onClick={createNewProject} className="w-full mb-10 flex items-center justify-center space-x-3 bg-amber-400 text-gray-900 font-bold py-4 px-6 rounded-lg hover:bg-amber-500 transition duration-300 shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 transform hover:-translate-y-1">
                    <Plus size={22} />
                    <span>Create New Project</span>
                </button>
                <div className="space-y-4">
                    {projects.length > 0 ? [...projects].sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)).map(project => (
                        <div key={project.id} className="bg-white border border-gray-200 rounded-lg hover:border-amber-400/50 transition-all duration-300 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex-grow w-full mb-3 sm:mb-0" >
                                     {editingProjectId === project.id ? (
                                        <input type="text" value={editingProjectName} onChange={(e) => setEditingProjectName(e.target.value)} className="font-semibold text-lg text-gray-900 bg-gray-100 border border-amber-400 rounded px-2 py-1 w-full" autoFocus onClick={(e) => e.stopPropagation()} onBlur={() => saveProjectName(project.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveProjectName(project.id) }} />
                                    ) : (
                                        <div className="cursor-pointer" onClick={() => openProject(project.id)}>
                                            <span className="font-semibold text-lg text-gray-900 hover:text-amber-600 transition-colors">{project.projectName}</span>
                                            <p className="text-sm text-gray-500">Last updated: {new Date(project.lastUpdated).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0 w-full sm:w-auto justify-start">
                                    <Tooltip text="Edit Name"><button onClick={(e) => {e.stopPropagation(); startEditing(project)}} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full"><Edit size={18} /></button></Tooltip>
                                    <Tooltip text="Delete"><button onClick={(e) => {e.stopPropagation(); deleteProject(project.id)}} className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full"><Trash2 size={18} /></button></Tooltip>
                                    <button onClick={() => openProject(project.id)} className="bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-900">Open</button>
                                </div>
                            </div>
                        </div>
                    )) : <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg"><div className="flex justify-center mb-4"><Zap size={32} className="text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-800">No Projects Found</h3><p className="text-gray-500">Get started by creating your first solar project.</p></div>}
                </div>
            </div>
        </div>
    );
};

// --- Main App Component (Root) ---
export default function App() {
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isNewProject, setIsNewProject] = useState(false);

    useEffect(() => {
        try {
            const savedProjects = localStorage.getItem('solarProjects');
            if (savedProjects) setProjects(JSON.parse(savedProjects));
        } catch (error) {
            console.error("Could not load from local storage", error);
        }
    }, []);

    const saveProjectsToStorage = useCallback((projectsToSave) => {
         try {
             localStorage.setItem('solarProjects', JSON.stringify(projectsToSave));
         } catch (error) {
             console.error("Could not save projects to local storage", error);
         }
    }, []);

    const createNewProject = () => {
        const newProject = {
            id: Date.now(),
            projectName: `New Project - ${new Date().toLocaleDateString()}`,
            clientName: '',
            dailyEnergyKwh: 10,
            appliances: [],
            calcMethod: 'audit',
            peakSunHours: 5,
            systemEfficiency: 80, 
            panelWattage: 450,
            daysOfAutonomy: 1,
            batteryDoD: 0.8,
            batteryVoltage: 24,
            availableBatteryAh: 200,
            availableBatteryVoltage: 12,
            peakLoad: 1500,
            selectedInverterKva: 0,
            hasBuiltInController: false,
            isPeakLoadCustom: true,
            lastUpdated: new Date().toISOString(),
        };
        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        saveProjectsToStorage(updatedProjects);
        setActiveProjectId(newProject.id);
        setIsNewProject(true);
    };
    
    const updateProject = useCallback((updatedProjectData) => {
        setProjects(currentProjects => {
            const newProjects = currentProjects.map(p =>
                p.id === updatedProjectData.id ? { ...updatedProjectData, lastUpdated: new Date().toISOString() } : p
            );
            localStorage.setItem('solarProjects', JSON.stringify(newProjects));
            return newProjects;
        });
        if (isNewProject) setIsNewProject(false);
    }, [isNewProject, saveProjectsToStorage]);

    const updateProjectName = (projectId, newName) => {
        setProjects(currentProjects => {
            const updatedProjects = currentProjects.map(p => p.id === projectId ? { ...p, projectName: newName, lastUpdated: new Date().toISOString() } : p);
            saveProjectsToStorage(updatedProjects);
            return updatedProjects;
        });
    };
    
    const handleDeleteRequest = (projectId) => {
        setProjectToDelete(projectId);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if(projectToDelete) {
            setProjects(currentProjects => {
                const updatedProjects = currentProjects.filter(p => p.id !== projectToDelete);
                saveProjectsToStorage(updatedProjects);
                return updatedProjects;
            });
        }
        setIsModalOpen(false);
        setProjectToDelete(null);
    };
    
    const openProject = (projectId) => {
        setActiveProjectId(projectId);
        setIsNewProject(false);
    };
    
    const goBackToProjects = () => {
        setActiveProjectId(null);
        setIsNewProject(false);
    }

    const activeProject = projects.find(p => p.id === activeProjectId);
    const svgBg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' fill='none' stroke='%23e5e7eb' stroke-width='0.5'/></svg>`;

    return (
        <div className="bg-gray-50 text-gray-900 min-h-screen font-sans relative isolate">
             <div className="absolute inset-0 -z-10" style={{
                backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svgBg)}")`,
                backgroundSize: '100px 100px',
                maskImage: 'linear-gradient(to bottom, white 5%, transparent 80%)',
                WebkitMaskImage: 'linear-gradient(to bottom, white 5%, transparent 80%)',
            }}></div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                 {activeProject ? (
                    <CalculatorPage 
                        project={activeProject} 
                        updateProject={updateProject} 
                        goBack={goBackToProjects}
                        isNew={isNewProject}
                    />
                ) : (
                    <ProjectDashboard 
                        projects={projects}
                        createNewProject={createNewProject}
                        openProject={openProject}
                        deleteProject={handleDeleteRequest}
                        updateProjectName={updateProjectName}
                    />
                )}
                 <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onConfirm={handleConfirmDelete}
                    title="Delete Project"
                >
                    Are you sure you want to permanently delete this project? This action cannot be undone.
                </Modal>
            </div>
        </div>
    );
}
