# Ready TMS - Enterprise Transportation Management System

## Overview
Ready TMS is a comprehensive, enterprise-level Transportation Management System designed for readytms.com. This production-ready web application provides complete trucking operations management, encompassing load dispatch, fleet tracking, driver management, DOT compliance, full accounting (AR/AP), customer relationship management, driver settlements, maintenance tracking, and financial analytics. It aims to be a robust solution for managing an entire trucking business, similar to leading enterprise TMS platforms.

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to folder Z.
- Do not make changes to file Y.

## System Architecture

### UI/UX Decisions
The system features a professional UI built with Shadcn UI and Radix primitives, styled with Tailwind CSS. It uses a consistent design system with a primary blue color scheme, specific colors for success, warning, and danger states, and the Inter font family. It supports both light and dark modes, detecting system preferences. Common UI patterns include searchable tables with status badges and action buttons, form-based dialogs with validation, helpful empty states, skeleton loaders for loading states, and toast notifications for user feedback.

### Technical Implementations
The application is a full-stack web application. The frontend is built with React 18 and TypeScript, using Wouter for routing, TanStack Query v5 for state management, React Hook Form with Zod for form validation, and date-fns for date handling. The backend uses Express.js with a PostgreSQL database (Neon-backed on Replit) and Drizzle ORM for type-safe queries. Authentication is handled via Replit Auth (OAuth with Google, GitHub, email/password) with Express sessions backed by a PostgreSQL store. End-to-end type safety is maintained using shared schemas.

### Feature Specifications
The system provides a comprehensive set of modules:
- **Dashboard**: Real-time operational metrics, recent activity, fleet status, and quick navigation.
- **Load Management**: Full load lifecycle, driver/truck assignment, status workflow, expense/profit tracking.
- **Fleet Management**: Truck inventory, status tracking, maintenance records.
- **Driver Management**: Comprehensive driver roster with full DOT compliance tracking including:
  - CDL license information with number, expiration date, issued place, and file attachment upload
  - Medical card tracking with issued date, expiration date (with automated alerts), and card number
  - Social Security Number and document attachment upload
  - Employment information: date hired, date terminated, active/inactive status
  - Contact information: name, email, phone, and full address
  - Truck assignments
  - DOT compliance status badges with expiration monitoring
- **GPS Driver Tracking**: Real-time location tracking with API endpoints for GPS data submission from mobile apps, live location display with coordinates and Google Maps links, search and filter capabilities, and speed/heading tracking.
- **Driver Self-Registration**: Public-facing driver signup page at `/driver-signup` where new drivers can create their own accounts. Drivers fill out a registration form with their name, email, phone, CDL license information, and medical card details. The system validates that email addresses and license numbers are unique before creating accounts. After successful registration, drivers are redirected to log in and can immediately access the Driver Portal. This eliminates the need for admin-created driver accounts and allows drivers to self-onboard.
- **Driver Portal**: Mobile-friendly web portal for drivers to share their GPS location using their phone's browser. Features include On Duty/Off Duty toggle, automatic location updates every 3 minutes when on duty, manual "Share Location Now" button, current load assignment display, and real-time tracking status. Drivers are matched to their profile via email authentication, and location data includes truck and load assignments. No app download required - works in any phone browser.
- **Safety & Compliance**: Includes Inspections (Pre-Trip, DOT, etc.), Accidents & Incidents reporting, and Violations & Citations tracking.
- **Accounting & Financial Management**: Financial Overview, Invoices (AR), Expense Management, and Payments & Cash Management.
- **Customer Management**: Full CRM for shippers and receivers, contact information, and load history.
- **Driver Settlements**: Automated payroll calculations with percentage-based pay, deduction tracking, net pay, and settlement history with PDF export. **Settlement Calculation Flow (Oct 2025)**: Driver pay is calculated as a percentage of GROSS revenue (total revenue before any deductions). The `settlement.deductions` field stores ALL deductions including factoring fee, tolls, fuel, advance, insurance, trailer fees, and repairs. Net Pay = Driver Pay - Total Deductions. Example: $6,000 revenue, 30% driver pay = $1,800, factoring 2% = $120, other deductions = $600, total deductions = $720, net pay = $1,080.
- **Maintenance Management**: Service record system, preventive maintenance scheduling, and overdue alerts.
- **Fuel Tracking & Management**: Comprehensive fuel card account management with FleetOne (WEX) and Pilot Flying J integration. Features include fuel card account setup with portal links, manual fuel transaction entry, expense tracking by truck/driver/load, vendor tracking, and future-ready API integration framework. Direct portal links to https://manage.fleetone.com/ and https://customerportal.pilotflyingj.com/ for easy access to fuel card provider portals.
- **Automation & Workflows**: Enterprise-grade automation engine that eliminates manual tasks and ensures consistent operations. Features include:
  - **Auto-Invoice Generation**: Automatically creates invoices when loads are marked as "delivered", with duplicate prevention and activity logging
  - **Expiring Document Alerts**: Proactive notifications for CDL licenses and medical cards expiring within configurable thresholds (default 30 days)
  - **Load Status Notifications**: Real-time alerts when load status changes (dispatched, in-transit, delivered, etc.)
  - **Activity Logging**: Comprehensive audit trail of all automation actions for compliance and troubleshooting
  - **Configurable Settings**: Dashboard-managed automation settings with enable/disable toggles and customizable parameters
  - Database schema includes automation_settings, notifications, and activity_log tables with full CRUD API support

### System Design Choices
- **Development Approach**: Employs a schema-first design with all data models defined for type consistency, followed by horizontal layer implementation (schemas → storage → API → frontend).
- **Authentication & Security**: Replit Auth for OAuth, session-based authentication with secure cookie storage, PostgreSQL-backed session persistence, and protected routes.
- **Data Layer**: PostgreSQL with Drizzle ORM, proper foreign key relationships, data normalization, and Drizzle Kit for migrations. Date fields properly handle empty strings by converting to null for optional timestamps.
- **API Design**: RESTful endpoint structure with Zod validation on request bodies, consistent response formats, and proper HTTP status codes. GPS tracking endpoints support mobile app integration.
- **Performance**: Utilizes TanStack Query for caching, database indexing, and optimized SQL queries.
- **Compliance Monitoring**: Automated expiration tracking for CDL licenses and medical cards with visual status indicators (Expired/Expiring Soon/Valid) using date-fns calculations.

## External Dependencies
- **Database**: PostgreSQL (Neon-backed on Replit)
- **Authentication**: Replit Auth (OAuth with Google, GitHub, email/password support)
- **Session Management**: connect-pg-simple (PostgreSQL store for Express sessions)
- **UI Components**: Shadcn UI, Radix primitives
- **Icons**: Lucide React
- **Date Handling**: date-fns