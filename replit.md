# Ready Carrier TMS - Transportation Management System

## Overview
A comprehensive Transportation Management System (TMS) built for Ready Carrier. This application provides end-to-end fleet management, load tracking, driver management, and financial accounting capabilities for trucking operations.

## Project Type
Full-stack web application using React, TypeScript, Express.js, and PostgreSQL database with Drizzle ORM.

## Core Features

### 1. Dashboard
- Real-time metrics showing active loads, available trucks, active drivers, and total revenue
- Recent load activity with status indicators
- Fleet status overview
- Trend indicators for key performance metrics

### 2. Load Management
- Create, edit, and delete loads with complete shipment details
- Track pickup and delivery locations, dates, and routes
- Assign drivers and trucks to loads
- Monitor load status through workflow (pending → assigned → in-transit → delivered → invoiced)
- Search and filter loads by load number, location, or status
- Rate and expense tracking per load

### 3. Fleet Management
- Comprehensive truck inventory with detailed vehicle information
- Track truck status (available, in-use, maintenance, out-of-service)
- Vehicle details including VIN, license plate, make, model, and year
- Support for multiple truck types (Dry Van, Refrigerated, Flatbed, Step Deck, Tanker, Box Truck)

### 4. Driver Management
- Driver roster with contact information and license details
- Driver status tracking (available, on-duty, off-duty, on-leave)
- Truck assignment management
- Driver profiles with avatars

### 5. Accounting & Financials
- Revenue and expense tracking per load
- Net profit calculations and profit margin analysis
- Pending revenue from delivered loads
- Load profitability breakdown table
- Financial metrics dashboard

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn UI with Radix primitives
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OAuth with Google, GitHub, email/password support)
- **Session Management**: Express sessions with PostgreSQL store
- **Validation**: Zod with Drizzle-Zod
- **Type Safety**: TypeScript with shared schemas

### Design System
- **Color Scheme**: Professional blue primary (#217091 @ 40% lightness in light mode)
- **Success/Completion**: Green (#142 76% 36%)
- **Warning/Alerts**: Orange (#38 92% 50%)
- **Danger/Critical**: Red (#0 84% 60%)
- **Typography**: Inter font family
- **Theme**: Light and dark mode support with system preference detection

## Data Models

### Load
- Load number, customer reference
- Pickup and delivery locations with dates
- Assigned driver and truck
- Rate, expenses, and profit calculations
- Weight, commodity type, and notes
- Status workflow tracking

### Truck
- Truck number and type
- Status (available/in-use/maintenance/out-of-service)
- Vehicle details (VIN, license plate, make, model, year)

### Driver
- Name, email, phone, license number
- Status (available/on-duty/off-duty/on-leave)
- Optional truck assignment

### Customer
- Name, email, phone, address
- Type (shipper/receiver)
- Pre-seeded with sample customers

### User
- Email, first name, last name
- Profile image URL
- Replit user ID for OAuth integration
- Session management with secure authentication

## Key User Journeys

1. **Create and Dispatch Load**:
   - Navigate to Loads → Create Load
   - Enter shipment details (customer, locations, dates, rate)
   - Assign available driver and truck
   - Track status progression through delivery

2. **Manage Fleet**:
   - View all trucks with current status
   - Add new trucks with vehicle details
   - Update truck status (maintenance, in-use, etc.)
   - Search and filter fleet inventory

3. **Track Financials**:
   - View dashboard metrics for overall financial health
   - Navigate to Accounting for detailed load profitability
   - Monitor revenue, expenses, and profit margins
   - Identify pending revenue from delivered loads

## API Endpoints

### Authentication
- `GET /api/login` - Initiate Replit Auth login flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Logout and destroy session
- `GET /api/auth/user` - Get current authenticated user

### Loads
- `GET /api/loads` - Get all loads
- `GET /api/loads/:id` - Get specific load
- `POST /api/loads` - Create new load
- `PATCH /api/loads/:id` - Update load
- `DELETE /api/loads/:id` - Delete load

### Trucks
- `GET /api/trucks` - Get all trucks
- `POST /api/trucks` - Create new truck
- `PATCH /api/trucks/:id` - Update truck
- `DELETE /api/trucks/:id` - Delete truck

### Drivers
- `GET /api/drivers` - Get all drivers
- `POST /api/drivers` - Create new driver
- `PATCH /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

## Navigation
- **Sidebar Navigation**: Persistent left sidebar with links to all main sections
- **Responsive Design**: Mobile-friendly with collapsible sidebar
- **Theme Toggle**: Light/dark mode switcher in header

## Recent Changes
- October 18, 2025: **Database Migration & Multi-User Authentication**
  - Migrated from in-memory storage to PostgreSQL database with Drizzle ORM
  - All data now persists across server restarts
  - Implemented Replit Auth for secure multi-user access
  - Created users table with OAuth integration
  - Added protected routes - authentication required for app access
  - Built professional landing page for unauthenticated users
  - Added user profile display with avatar and logout functionality
  - Session management with PostgreSQL-backed session store
  
- October 18, 2025: **Initial MVP Implementation**
  - Implemented comprehensive TMS with dashboard, loads, fleet, drivers, and accounting modules
  - Added professional UI with Shadcn components and custom design system
  - Fixed Select.Item empty value bug in driver and load dialogs
  - Successfully tested complete user journey: truck creation → driver addition → load creation → status updates → accounting view
  - All core features verified working through end-to-end testing

## Project Architecture
- Schema-first development approach with shared TypeScript types
- PostgreSQL database with Drizzle ORM for type-safe queries
- Replit Auth integration for OAuth authentication
- Session-based authentication with secure cookie storage
- Horizontal layer implementation (all frontend components → all backend routes → integration)
- Component-based architecture with reusable UI elements
- Type-safe API communication with TanStack Query
- Responsive design following mobile-first principles
- Protected routes requiring authentication

## Planned Features (Future Development)
1. **Document Management**: Upload and manage BOL, POD, invoices for loads
2. **Customer Management Module**: Dedicated page for customer CRUD operations
3. **Analytics & Reporting**: Revenue trends, fleet utilization charts, performance metrics
4. **Driver Settlements**: Payment tracking, settlement calculations, payment history
5. **GPS Tracking**: Real-time location tracking for loads and trucks
6. **Advanced Reporting**: Custom reports, data exports, business intelligence
