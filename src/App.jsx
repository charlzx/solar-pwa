import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Home, Power, Sun, BatteryCharging, PowerOff, List, Trash2, Plus, Info, Printer, Briefcase, ArrowLeft, Edit, Save, Moon, SunDim, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

// --- Constants (defined outside components for performance) ---

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
    { value: 0.5, label: 'Lead-Acid (50% DoD)' }
];

const SYSTEM_VOLTAGE_OPTIONS = [
    { value: 12, label: '12V' }, { value: 24, label: '24V' }, { value: 48, label: '48V' }
];

const AVAILABLE_BATTERY_VOLTAGE_OPTIONS = [
    { value: 2, label: '2V' }, { value: 6, label: '6V' }, { value: 12, label: '12V' }
];

const INVERTER_SIZES = [1000, 1500, 2000, 2500, 3000, 4000, 5000, 8000, 10000, 12000];
const INVERTER_SAFETY_FACTOR = 1.25;
const CHARGE_CONTROLLER_SAFETY_FACTOR = 1.25;


// --- Helper Components ---

const Tooltip = ({ text, children, disabled = false }) => (
    <div className="relative flex items-center group">
        {children}
        {/* Show tooltip text only if it exists and the target is not disabled */}
        {text && !disabled && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {text}
                <div className="tooltip-arrow" data-popper-arrow></div>
            </div>
        )}
    </div>
);


const SectionHeader = ({ icon, title, subtitle, step }) => (
    <div className="flex items-start space-x-4 mb-6">
        <div className="flex-shrink-0 flex flex-col items-center">
            <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 w-12 h-12 flex items-center justify-center rounded-full font-bold text-lg">
                {step}
            </div>
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
            <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
    </div>
);

const InputField = React.memo(React.forwardRef(({ label, type, value, onChange, unit, min = 0, tooltip, placeholder, autoFocus = false }, ref) => (
    <div className="w-full">
        {label && <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {tooltip && <Tooltip text={tooltip}><Info size={14} className="ml-1.5 text-gray-400 cursor-help" /></Tooltip>}
        </label>}
        <div className="relative">
            <input ref={ref} type={type} value={value} onChange={onChange} min={min} placeholder={placeholder} autoFocus={autoFocus} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900 dark:text-gray-100" />
            {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">{unit}</span>}
        </div>
    </div>
)));

const SelectField = React.memo(({ label, value, onChange, options, tooltip }) => (
    <div className="w-full">
        {label && <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {tooltip && <Tooltip text={tooltip}><Info size={14} className="ml-1.5 text-gray-400 cursor-help" /></Tooltip>}
        </label>}
        <select value={value} onChange={onChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none text-gray-900 dark:text-gray-100">
            {options.map(opt => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
));

const ResultCard = ({ label, value, unit, large = false, className = '' }) => (
    <div className={`bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-lg text-center backdrop-blur-sm print-result-card ${className}`}>
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{label}</p>
        <p className={`font-bold text-blue-900 dark:text-white ${large ? 'text-3xl' : 'text-2xl'}`}>
            {value} <span className="text-lg font-medium">{unit}</span>
        </p>
    </div>
);

const Modal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-4 text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
                            {title}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {children}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const StepCard = ({ children, isActive }) => (
    <div className={`transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0 hidden'}`}>
      {children}
    </div>
);

// --- Calculator View Component ---
const CalculatorPage = ({ project, updateProject, goBack, isNew }) => {
    const [projectData, setProjectData] = useState(project);
    const [currentStep, setCurrentStep] = useState(1);
    const [lastAddedApplianceId, setLastAddedApplianceId] = useState(null);
    const applianceNameInputRef = useRef(null);

    // Debounced effect to save data.
    useEffect(() => {
        const handler = setTimeout(() => {
            if (JSON.stringify(projectData) !== JSON.stringify(project)) {
                updateProject(projectData);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [projectData, updateProject, project]);
    
    useEffect(() => {
        if (lastAddedApplianceId && applianceNameInputRef.current) {
            applianceNameInputRef.current.focus();
            setLastAddedApplianceId(null);
        }
    }, [lastAddedApplianceId]);

    const handleInputChange = (field, value) => {
        const fieldType = typeof project[field];
        let parsedValue = value;
        if (fieldType === 'number' || field === 'panelWattage') { // Ensure panel wattage is treated as a number
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
        setLastAddedApplianceId(newAppliance.id);
    };

    const removeAppliance = (id) => {
        const updatedAppliances = projectData.appliances.filter(app => app.id !== id);
        setProjectData(prevData => ({ ...prevData, appliances: updatedAppliances }));
    };

    const totalWattHoursFromAudit = useMemo(() => {
        if (!projectData.appliances) return 0;
        return projectData.appliances.reduce((total, app) => total + (Number(app.quantity) * Number(app.wattage) * Number(app.hours)), 0);
    }, [projectData.appliances]);

    useEffect(() => {
        if (projectData.calcMethod === 'audit') {
            const newKwh = totalWattHoursFromAudit / 1000;
            if (projectData.dailyEnergyKwh !== newKwh) {
                 setProjectData(prevData => ({ ...prevData, dailyEnergyKwh: newKwh }));
            }
        }
    }, [totalWattHoursFromAudit, projectData.calcMethod, projectData.dailyEnergyKwh]);

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
        
        const denominatorForPanelWattage = safePeakSunHours * safeSystemEfficiency;
        const requiredPanelWattage = denominatorForPanelWattage > 0 ? (dailyEnergyWh / denominatorForPanelWattage) : 0;
        
        const numberOfPanels = effectivePanelWattage > 0 ? Math.ceil(requiredPanelWattage / effectivePanelWattage) : 0;
        const actualSystemSizeKw = (numberOfPanels * effectivePanelWattage) / 1000;
        
        const totalStorageWh = dailyEnergyWh * Number(daysOfAutonomy);
        const requiredBatteryCapacityWh = safeBatteryDoD > 0 ? totalStorageWh / safeBatteryDoD : 0;
        const requiredBatteryCapacityAh = safeBatteryVoltage > 0 ? Math.ceil(requiredBatteryCapacityWh / safeBatteryVoltage) : 0;
        
        const inverterSize = Math.ceil(Number(peakLoad) * INVERTER_SAFETY_FACTOR) || 0;
        
        const totalSolarPanelCurrent = safeBatteryVoltage > 0 ? (numberOfPanels * effectivePanelWattage) / safeBatteryVoltage : 0;
        const chargeControllerAmps = Math.ceil(totalSolarPanelCurrent * CHARGE_CONTROLLER_SAFETY_FACTOR) || 0;
        
        let totalNumberOfBatteries = 0;
        const isVoltageCompatible = safeBatteryVoltage > 0 && safeAvailableBatteryVoltage > 0 && safeBatteryVoltage % safeAvailableBatteryVoltage === 0;

        if (isVoltageCompatible && safeAvailableBatteryAh > 0) {
            const batteriesInSeries = safeBatteryVoltage / safeAvailableBatteryVoltage;
            const numberOfParallelStrings = Math.ceil(requiredBatteryCapacityAh / safeAvailableBatteryAh);
            totalNumberOfBatteries = isFinite(batteriesInSeries * numberOfParallelStrings) ? batteriesInSeries * numberOfParallelStrings : 0;
        }

        return {
            actualSystemSizeKw: actualSystemSizeKw.toFixed(2),
            numberOfPanels: isFinite(numberOfPanels) ? numberOfPanels : 0,
            requiredBatteryCapacityWh: isFinite(requiredBatteryCapacityWh) ? requiredBatteryCapacityWh.toLocaleString() : 0,
            requiredBatteryCapacityAh: isFinite(requiredBatteryCapacityAh) ? requiredBatteryCapacityAh.toLocaleString() : 0,
            inverterSize: isFinite(inverterSize) ? inverterSize : 0,
            chargeControllerAmps: isFinite(chargeControllerAmps) ? chargeControllerAmps : 0,
            totalNumberOfBatteries,
            effectivePanelWattage
        };
    }, [projectData]);

    const suggestedInverters = useMemo(() => {
        return INVERTER_SIZES.filter(size => size >= calculations.inverterSize).slice(0, 3);
    }, [calculations.inverterSize]);

    // --- Step Navigation and Validation ---
    const TOTAL_STEPS = 6;
    const isStepValid = useMemo(() => {
      switch(currentStep) {
        case 1: return projectData.projectName?.trim() !== '';
        case 2: return projectData.calcMethod === 'bill' ? projectData.dailyEnergyKwh > 0 : totalWattHoursFromAudit > 0;
        case 3: return projectData.peakSunHours > 0 && projectData.systemEfficiency > 0 && projectData.panelWattage > 0;
        case 4: return projectData.daysOfAutonomy > 0 && projectData.availableBatteryAh > 0;
        case 5: return projectData.peakLoad > 0;
        default: return true;
      }
    }, [currentStep, projectData, totalWattHoursFromAudit]);

    const validationMessage = useMemo(() => {
        if (isStepValid) return null;
        switch(currentStep) {
            case 1: return 'Please enter a project name.';
            case 2: return 'Please add an appliance or enter energy use from a bill.';
            case 3: return 'Peak Sun Hours, System Efficiency, and Panel Wattage must be greater than zero.';
            case 4: return 'Days of Autonomy and Battery Capacity must be greater than zero.';
            case 5: return 'Peak Load must be greater than zero.';
            default: return 'Please complete all fields to continue.';
        }
    }, [isStepValid, currentStep]);

    const handleNext = () => {
        if ((isNew && isStepValid) || !isNew) {
            if (currentStep < TOTAL_STEPS) {
                setCurrentStep(step => step + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(step => step - 1);
        }
    };
    
    const steps = [
        { number: 1, title: 'Project Details' },
        { number: 2, title: 'Energy Use' },
        { number: 3, title: 'Panel Sizing' },
        { number: 4, title: 'Battery Sizing' },
        { number: 5, title: 'Component Sizing' },
        { number: 6, title: 'Summary' },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto py-8">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-hidden { display: none; }
                    .print-only { display: block !important; }
                    .print-result-card { background-color: #f0f9ff !important; border: 1px solid #e0f2fe; }
                    @page { size: A4; margin: 20mm; }
                }
            `}</style>
            
            <div className="mb-8 print-hidden">
                {/* Desktop Progress Bar */}
                <div className="hidden md:flex justify-between mb-2">
                    {steps.map(step => (
                        <div 
                            key={step.number} 
                            className={`text-xs text-center flex-1 ${currentStep >= step.number ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-400 dark:text-gray-500'} cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors`}
                            onClick={() => setCurrentStep(step.number)}
                        >
                            {step.title}
                        </div>
                    ))}
                </div>
                <div className="relative hidden md:block bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}></div>
                </div>

                {/* Mobile Progress Bar with clickable numbers */}
                <div className="md:hidden">
                    <div className="flex justify-between items-center relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 -z-10">
                             <div className="bg-blue-600 h-full transition-all duration-300" style={{width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`}}></div>
                        </div>
                        {steps.map(step => (
                            <div
                                key={step.number}
                                onClick={() => setCurrentStep(step.number)}
                                className="flex flex-col items-center flex-1 cursor-pointer z-10"
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                                        currentStep >= step.number
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    {step.number}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-4">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{steps[currentStep-1].title}</span>
                    </div>
                </div>
            </div>

            <div className="relative">
                 <StepCard isActive={currentStep === 1}>
                    <div className="bg-white dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg">
                        <SectionHeader icon={<Briefcase size={28} />} title="Project Details" subtitle="Start by defining the project scope." step={1} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Project Name" type="text" value={projectData.projectName} onChange={e => handleInputChange('projectName', e.target.value)} placeholder="e.g. Client A Residence"/>
                            <InputField label="Client Name" type="text" value={projectData.clientName} onChange={e => handleInputChange('clientName', e.target.value)} placeholder="e.g. John Doe"/>
                        </div>
                    </div>
                </StepCard>
                <StepCard isActive={currentStep === 2}>
                    <div className="bg-white dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg">
                        <SectionHeader icon={<Power size={28} />} title="Daily Energy Consumption" subtitle="Determine the total daily power your system needs to provide." step={2} />
                        <div className="flex justify-center mb-6"><div className="flex rounded-lg p-1 bg-gray-200 dark:bg-gray-900/50">
                            <button onClick={() => handleInputChange('calcMethod', 'audit')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${projectData.calcMethod === 'audit' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Appliance Audit</button>
                            <button onClick={() => handleInputChange('calcMethod', 'bill')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${projectData.calcMethod === 'bill' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow' : 'text-gray-600 dark:text-gray-300'}`}>From Utility Bill</button>
                        </div></div>
                        {projectData.calcMethod === 'audit' ? (<div>
                             <div className="space-y-4">{projectData.appliances && projectData.appliances.map(app => (
                                 <div key={app.id} className="flex flex-col sm:flex-row sm:items-end gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                                     <div className="flex-grow min-w-[150px]"><InputField ref={app.id === lastAddedApplianceId ? applianceNameInputRef : null} label="Appliance" type="text" value={app.name} onChange={e => handleApplianceChange(app.id, 'name', e.target.value)} placeholder="e.g. Fridge" /></div>
                                     <div className="w-full sm:w-20"><InputField label="Qty" type="number" value={app.quantity} onChange={e => handleApplianceChange(app.id, 'quantity', Number(e.target.value))} /></div>
                                     <div className="w-full sm:w-24"><InputField label="Wattage (W)" type="number" value={app.wattage} onChange={e => handleApplianceChange(app.id, 'wattage', Number(e.target.value))} /></div>
                                     <div className="w-full sm:w-24"><InputField label="Hours/Day" type="number" value={app.hours} onChange={e => handleApplianceChange(app.id, 'hours', Number(e.target.value))} /></div>
                                     <div className="flex-grow text-right pr-2"><label className="text-xs font-medium text-gray-500 dark:text-gray-400">Daily Use</label><p className="font-medium text-gray-700 dark:text-gray-200 mt-1">= {(Number(app.quantity) * Number(app.wattage) * Number(app.hours)).toLocaleString()} Wh</p></div>
                                     <div className="flex-shrink-0"><button onClick={() => removeAppliance(app.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-2 rounded-full flex justify-center items-center"><Trash2 size={18} /></button></div>
                                 </div>))}
                             </div>
                             <button onClick={addAppliance} className="mt-4 flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300"><Plus size={18} /><span>Add Appliance</span></button>
                             <div className="mt-6 border-t dark:border-gray-700 pt-4 text-right"><p className="text-gray-600 dark:text-gray-300">Total from Audit:</p><p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{(totalWattHoursFromAudit / 1000).toFixed(2)} kWh/day</p></div>
                        </div>) : (<div className="max-w-md mx-auto"><InputField label="Average Daily Energy Use" type="number" value={projectData.dailyEnergyKwh} onChange={e => handleInputChange('dailyEnergyKwh', e.target.value)} unit="kWh" tooltip="Find this on your monthly electricity bill."/></div>)}
                    </div>
                </StepCard>
                <StepCard isActive={currentStep === 3}>
                    <div className="bg-white dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg">
                        <SectionHeader icon={<Sun size={28} />} title="Solar Panel Sizing" subtitle="Calculate the required solar array size." step={3} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SelectField label="Peak Sun Hours" value={projectData.peakSunHours} onChange={e => handleInputChange('peakSunHours', e.target.value)} options={PSH_OPTIONS} tooltip="The average daily hours of intense sunlight for your location."/>
                            <InputField label="System Efficiency" type="number" value={projectData.systemEfficiency} onChange={e => handleInputChange('systemEfficiency', e.target.value)} unit="%" tooltip="Accounts for energy loss in wires, inverter, etc. 80-85% is typical."/>
                            {/* UPDATE: Panel Wattage converted to a direct text input */}
                            <InputField 
                                label="Panel Wattage"
                                type="number"
                                value={projectData.panelWattage}
                                onChange={e => handleInputChange('panelWattage', e.target.value)}
                                unit="W"
                                tooltip="Enter the power rating of a single solar panel you plan to use."
                                placeholder="e.g. 450"
                            />
                        </div>
                    </div>
                </StepCard>
                <StepCard isActive={currentStep === 4}>
                    <div className="bg-white dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg">
                        <SectionHeader icon={<BatteryCharging size={28} />} title="Battery Bank Sizing" subtitle="Determine the storage capacity and number of batteries needed." step={4} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="Days of Autonomy" type="number" value={projectData.daysOfAutonomy} onChange={e => handleInputChange('daysOfAutonomy', e.target.value)} unit="days" tooltip="How many days the system should run on battery power without sun."/>
                            <SelectField label="Battery Type (DoD)" value={projectData.batteryDoD} onChange={e => handleInputChange('batteryDoD', e.target.value)} options={BATTERY_DOD_OPTIONS} tooltip="Depth of Discharge: The usable percentage of the battery."/>
                            <SelectField label="System Voltage" value={projectData.batteryVoltage} onChange={e => handleInputChange('batteryVoltage', e.target.value)} options={SYSTEM_VOLTAGE_OPTIONS} tooltip="Higher voltage is generally more efficient."/>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Calculate Number of Batteries</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Available Battery Capacity" type="number" value={projectData.availableBatteryAh} onChange={e => handleInputChange('availableBatteryAh', e.target.value)} unit="Ah" tooltip="The Amp-hour rating of a single battery you plan to use."/>
                                <SelectField label="Available Battery Voltage" value={projectData.availableBatteryVoltage} onChange={e => handleInputChange('availableBatteryVoltage', e.target.value)} options={AVAILABLE_BATTERY_VOLTAGE_OPTIONS} tooltip="The voltage of a single battery unit."/>
                            </div>
                            {projectData.batteryVoltage > 0 && projectData.availableBatteryVoltage > 0 && projectData.batteryVoltage % projectData.availableBatteryVoltage !== 0 && (<p className="text-red-600 text-sm mt-2">Warning: System Voltage is not a multiple of the voltage of a single battery.</p>)}
                        </div>
                    </div>
                </StepCard>
                <StepCard isActive={currentStep === 5}>
                     <div className="bg-white dark:bg-gray-800/50 p-8 rounded-2xl shadow-lg">
                         <SectionHeader icon={<PowerOff size={28} />} title="Inverter & Controller Sizing" subtitle="Size the core components that manage your power." step={5} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                              <div className="space-y-6">
                                  <InputField label="Peak Load" type="number" value={projectData.peakLoad} onChange={e => handleInputChange('peakLoad', e.target.value)} unit="W" tooltip="The maximum total wattage of all appliances you might run at the same time."/>
                                  <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg text-center">
                                      <p className="text-gray-600 dark:text-gray-300">Required Controller Size</p>
                                      <p className="text-3xl font-bold text-gray-800 dark:text-white">{calculations.chargeControllerAmps.toLocaleString()} <span className="text-xl">Amps</span></p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Based on solar array output and battery voltage, with a 25% safety factor.</p>
                                  </div>
                              </div>
                              <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                                  <h4 className="font-semibold text-gray-700 dark:text-gray-200">Inverter Suggestions</h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Based on a 25% safety margin ({calculations.inverterSize.toLocaleString()}W required):</p>
                                  {suggestedInverters.length > 0 ? (
                                      <ul className="space-y-1">
                                          {suggestedInverters.map((size, index) => (
                                              <li key={size} className={`flex items-center space-x-2 p-2 rounded-md ${index === 0 ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}>
                                                  {index === 0 && <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                                                  <span className={`text-gray-800 dark:text-gray-200 ${index === 0 ? 'font-bold' : ''}`}>{size.toLocaleString()}W</span>
                                                  {index === 0 && <span className="text-xs text-white bg-blue-500 font-bold px-2 py-0.5 rounded-full">Recommended</span>}
                                              </li>
                                          ))}
                                      </ul>
                                  ) : (<p className="text-gray-600 dark:text-gray-300">No standard inverters match. Check Peak Load.</p>)}
                              </div>
                          </div>
                     </div>
                </StepCard>
                <StepCard isActive={currentStep === 6}>
                     <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-2xl shadow-2xl print-area">
                         <div className="hidden print:block print-only mb-6 border-b border-white/30 pb-4">
                             <h3 className="text-2xl font-bold">Project Report: {projectData.projectName}</h3>
                             <p className="text-lg text-blue-200">Prepared for: {projectData.clientName}</p>
                             <p className="text-sm text-blue-300">Date: {new Date().toLocaleDateString()}</p>
                         </div>
                         <h2 className="text-3xl font-bold text-center mb-6">System Requirement Summary</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             <ResultCard label="Solar Array Size" value={calculations.actualSystemSizeKw} unit="kW" large className="md:col-span-2 lg:col-span-1 lg:row-span-2 h-full flex flex-col justify-center" />
                             <ResultCard label="Panels" value={calculations.numberOfPanels} unit={`x ${calculations.effectivePanelWattage}W`} />
                             <ResultCard label="Inverter Size" value={calculations.inverterSize.toLocaleString()} unit="W" />
                             <ResultCard label="Total Battery Capacity (Wh)" value={calculations.requiredBatteryCapacityWh} unit="Wh" />
                             <ResultCard label="Batteries Needed" value={calculations.totalNumberOfBatteries} unit={`x ${projectData.availableBatteryAh}Ah ${projectData.availableBatteryVoltage}V`} />
                             <ResultCard label="Charge Controller" value={calculations.chargeControllerAmps.toLocaleString()} unit="A" />
                         </div>
                     </div>
                     <button onClick={() => window.print()} className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition duration-300 shadow-lg print-hidden">
                         <Printer size={20} />
                         <span>Print Summary</span>
                     </button>
                </StepCard>
            </div>

            <div className="mt-8 flex justify-between items-center print-hidden">
                <Tooltip text="Back">
                    <button
                        onClick={handleBack}
                        className={`p-3 rounded-full font-semibold transition-all duration-300 ${currentStep > 1 ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600' : 'opacity-0 invisible'}`}
                        disabled={currentStep <= 1}
                    >
                        <ArrowLeft size={24} className="text-gray-700 dark:text-gray-200" />
                    </button>
                </Tooltip>
                
                <Tooltip text="Back to All Projects">
                    <button
                        onClick={goBack}
                        className="p-3 rounded-full font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                    >
                        <Home size={24} className="text-blue-600 dark:text-blue-400" />
                    </button>
                </Tooltip>

                <Tooltip text={isNew && !isStepValid ? validationMessage : "Next"}>
                    <div> {/* Wrapper div is necessary for tooltip on a disabled button */}
                        <button
                            onClick={handleNext}
                            className={`p-3 rounded-full font-semibold text-white transition-all duration-300 ${currentStep < TOTAL_STEPS ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' : 'opacity-0 invisible'} ${(isNew && !isStepValid) ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : ''}`}
                            disabled={(isNew && !isStepValid) || currentStep >= TOTAL_STEPS}
                        >
                            <ArrowRight size={24} />
                        </button>
                    </div>
                </Tooltip>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectName, setEditingProjectName] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [isNewProject, setIsNewProject] = useState(false);

    // Load projects and theme from local storage on initial mount
    useEffect(() => {
        try {
            const savedProjects = localStorage.getItem('solarProjects');
            if (savedProjects) {
                setProjects(JSON.parse(savedProjects));
            }

            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark')
                setDarkMode(true)
            } else {
                document.documentElement.classList.remove('dark')
                setDarkMode(false)
            }
        } catch (error) {
            console.error("Could not load from local storage", error);
        }
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(prevMode => {
            const newMode = !prevMode;
            if (newMode) {
                localStorage.theme = 'dark';
                document.documentElement.classList.add('dark');
            } else {
                localStorage.theme = 'light';
                document.documentElement.classList.remove('dark');
            }
            return newMode;
        });
    };

    const saveProjectsToStorage = useCallback((projectsToSave) => {
         try {
             localStorage.setItem('solarProjects', JSON.stringify(projectsToSave));
             setShowSaveConfirm(true);
             const timer = setTimeout(() => setShowSaveConfirm(false), 2000);
             return () => clearTimeout(timer);
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
            peakSunHours: 5.5,
            systemEfficiency: 80, 
            panelWattage: 450, // UPDATE: Simplified to a single numeric value
            daysOfAutonomy: 1,
            batteryDoD: 0.8,
            batteryVoltage: 24,
            availableBatteryAh: 200,
            availableBatteryVoltage: 12,
            peakLoad: 1500,
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
        if (isNewProject) {
            setIsNewProject(false);
        }
    }, [isNewProject]);
    
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
    
    const startEditing = (project) => {
        setEditingProjectId(project.id);
        setEditingProjectName(project.projectName);
    };

    const saveProjectName = (projectId) => {
        setProjects(currentProjects => {
            const updatedProjects = currentProjects.map(p => p.id === projectId ? { ...p, projectName: editingProjectName, lastUpdated: new Date().toISOString() } : p);
            saveProjectsToStorage(updatedProjects);
            return updatedProjects;
        });
        setEditingProjectId(null);
    };
    
    const openProject = (projectId) => {
        setActiveProjectId(projectId);
        setIsNewProject(false);
    };
    
    const goBackToProjects = () => {
        setActiveProjectId(null);
        setIsNewProject(false);
    }

    const svgBodyBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="%239ca3af" fill-opacity="0.07"><circle cx="20" cy="20" r="1.5"/></g></svg>`;
    const darkSvgBodyBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="%234b5563" fill-opacity="0.1"><circle cx="20" cy="20" r="1.5"/></g></svg>`;

    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen" style={{backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(darkMode ? darkSvgBodyBackground : svgBodyBackground)}")`}}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                 {activeProject ? (
                    <CalculatorPage 
                        project={activeProject} 
                        updateProject={updateProject} 
                        goBack={goBackToProjects}
                        isNew={isNewProject}
                    />
                ) : (
                    <div>
                        <header className="text-center mb-10 pt-8 sm:pt-12 flex justify-between items-start">
                            <div className="w-10 h-10"></div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-gray-100">Solar Projects</h1>
                                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">Manage all your solar calculation projects in one place.</p>
                            </div>
                            {/* dark mode toggle */}
                            {/* <button onClick={toggleDarkMode} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                                {darkMode ? <SunDim size={20} /> : <Moon size={20} />}
                            </button> */}
                        </header>
                        <div className="max-w-4xl mx-auto">
                            <button onClick={createNewProject} className="w-full mb-8 flex items-center justify-center space-x-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                <Plus size={20} />
                                <span>Create New Project</span>
                            </button>
                            <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg p-6 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Existing Projects</h2>
                                    <div className={`flex items-center space-x-2 text-green-600 dark:text-green-400 transition-opacity duration-500 ${showSaveConfirm ? 'opacity-100' : 'opacity-0'}`}>
                                        {/* <CheckCircle size={20} /> */}
                                        {/* <span className="font-semibold">Saved!</span> */}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {projects.length > 0 ? [...projects].sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)).map(project => (
                                        <div key={project.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex-grow w-full mb-3 sm:mb-0" >
                                                     {editingProjectId === project.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingProjectName}
                                                            onChange={(e) => setEditingProjectName(e.target.value)}
                                                            className="font-semibold text-lg text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 border border-blue-400 rounded px-2 py-1 w-full"
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onBlur={() => saveProjectName(project.id)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') saveProjectName(project.id) }}
                                                        />
                                                    ) : (
                                                        <div className="cursor-pointer" onClick={() => openProject(project.id)}>
                                                            <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">{project.projectName}</span>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: {new Date(project.lastUpdated).toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-start">
                                                    {editingProjectId === project.id ? (
                                                        <Tooltip text="Save"><button onClick={(e) => {e.stopPropagation(); saveProjectName(project.id)}} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full"><Save size={18} /></button></Tooltip>
                                                    ) : (
                                                        <Tooltip text="Edit Name"><button onClick={(e) => {e.stopPropagation(); startEditing(project)}} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><Edit size={18} /></button></Tooltip>
                                                    )}
                                                    <Tooltip text="Delete"><button onClick={(e) => {e.stopPropagation(); handleDeleteRequest(project.id)}} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><Trash2 size={18} /></button></Tooltip>
                                                    <button onClick={() => openProject(project.id)} className="bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-600">Open</button>
                                                </div>
                                            </div>
                                        </div>
                                    )) : <p className="text-gray-500 dark:text-gray-400 text-center py-8">No projects yet. Click the button above to create one!</p>}
                                </div>
                            </div>
                        </div>
                        <Modal 
                            isOpen={isModalOpen} 
                            onClose={() => setIsModalOpen(false)} 
                            onConfirm={handleConfirmDelete}
                            title="Delete Project"
                        >
                            Are you sure you want to permanently delete this project? This action cannot be undone.
                        </Modal>
                    </div>
                )}
            </div>
        </div>
    );
}
