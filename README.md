# Solisys
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A PWA built with React and Tailwind CSS to accurately design and calculate the requirements for off-grid solar power systems.

## Overview

This tool streamlines the complex process of solar system sizing by guiding the user through a logical, step-by-step workflow. It replaces manual calculations and spreadsheets, allowing solar installers, technicians, and homeowners to quickly generate detailed system specifications, manage multiple projects, and produce professional, client-ready summaries.

The application is fully responsive, installable on any device, and works offline.

## Key Features

- **Professional Workflow**: A guided, six-step process that mirrors a professional design flow: Project Details -> Energy Consumption -> Inverter -> Batteries -> Panels -> Summary.

- **Dual Calculation Methods**:
  - **Appliance Audit**: A detailed method to list all appliances with quantities, wattage, and daily usage hours to calculate total energy consumption.
  - **From Utility Bill**: A quick estimation method using the average daily energy consumption (kWh) from an electricity bill.

- **Comprehensive Sizing Calculations**:
  - Total Solar Array Size (kW)
  - Number of Solar Panels Needed
  - Required Battery Bank Capacity (Wh and Ah)
  - Total Number of Individual Batteries
  - Recommended Inverter Size (kVA) with selectable options.
  - Required Charge Controller Size (Amps), with an option for hybrid inverters.

- **Full Project Management**:
  - Create, save, and manage multiple projects.
  - Data persists in the browser’s localStorage.
  - Edit project names and update calculations at any time.

- **Intuitive & Responsive UI**:
  - Clean, professional, high-contrast light theme.
  - Fully responsive layout for desktop, tablet, and mobile.
  - Interactive stepper for clear navigation.

- **Printable Summaries**: Generate clean, professional, and printable reports suitable for client presentations or personal records.

- **PWA Ready**: Installable on any compatible device (iOS, Android, Windows, macOS) for an offline, native app-like experience.

## Tech Stack

- **Frontend**: React (with Hooks)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

**Clone the repository:**
```bash
git clone https://github.com/charlzx/solar-calculator.git
```

## Setup Instructions

### Navigate to the project directory:
```bash
cd solar-calculator
```

## Install Dependencies

```bash
npm install
```

## Start the Development Server

```bash
npm run dev 
```
The application will be available at http://localhost:5173 or the next available port.

## How to Use

### 1. Project Dashboard

This is your main hub for managing calculations.

- **Create New Project**: Click `+ Create New Project` to begin a new system.
- **Open Existing Project**: Click any project card to resume work.
- **Edit & Delete**: Hover over a project card to rename or delete it.

---

### 2. The Calculation Workflow

Follow each step in order. Complete all required fields to continue.

#### Step 1: Project Details

- Enter a **Project Name**
- Optionally enter a **Client Name**

#### Step 2: Energy Consumption

Choose one method:

- **Appliance Audit** (recommended)
- **From Utility Bill**

#### Step 3: Inverter Sizing

- Enter **Peak Load (W)** — the max power your appliances will draw at once
- If using Appliance Audit, this value is calculated automatically but can be edited
- Select an **Inverter Size** based on the Peak Load

#### Step 4: Battery Bank Sizing

Enter:

- **Days of Autonomy**
- **Battery Type / Depth of Discharge (DoD)**
- **System Voltage (V)**
- **Battery Capacity (Ah)**
- **Battery Voltage (V)**

#### Step 5: Panel Sizing & Charging

Provide:

- **Peak Sun Hours (PSH)** for your location
- **System Efficiency**
- **Panel Wattage (W)**
- Indicate if you're using a **hybrid inverter** with a charge controller

#### Step 6: Summary

- Review the full report with all calculated values
- The report is printable and professional

---

## Terminology & Key Concepts

- **Peak Load (W)**: Max power demand at a single moment
- **kVA (Kilovolt-Ampere)**: Unit for apparent power; used to size inverters
- **System Voltage (V)**: Common options are 12V, 24V, or 48V
- **Amp-hour (Ah)**: Battery storage capacity
- **Depth of Discharge (DoD)**: Safe usable battery capacity as a percentage
- **Days of Autonomy**: Number of days the system can run without sunlight
- **Peak Sun Hours (PSH)**: Total hours of full-strength sunlight per day



_____________________________