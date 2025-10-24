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
- **Driver Management**: Driver roster, CDL license tracking with expiration alerts, medical card tracking with expiration monitoring, assignment history, and DOT compliance status badges.
- **GPS Driver Tracking**: Real-time location tracking with API endpoints for GPS data submission from mobile apps, live location display with coordinates and Google Maps links, search and filter capabilities, and speed/heading tracking.
- **Driver Portal**: Mobile-friendly web portal for drivers to share their GPS location using their phone's browser. Features include On Duty/Off Duty toggle, automatic location updates every 3 minutes when on duty, manual "Share Location Now" button, current load assignment display, and real-time tracking status. Drivers are matched to their profile via email authentication, and location data includes truck and load assignments. No app download required - works in any phone browser.
- **Safety & Compliance**: Includes Inspections (Pre-Trip, DOT, etc.), Accidents & Incidents reporting, and Violations & Citations tracking.
- **Accounting & Financial Management**: Financial Overview, Invoices (AR), Expense Management, and Payments & Cash Management.
- **Customer Management**: Full CRM for shippers and receivers, contact information, and load history.
- **Driver Settlements**: Automated payroll calculations, deduction tracking, net pay, and settlement history.
- **Maintenance Management**: Service record system, preventive maintenance scheduling, and overdue alerts.
- **Fuel Tracking & Management**: Comprehensive fuel card account management with FleetOne (WEX) and Pilot Flying J integration. Features include fuel card account setup with portal links, manual fuel transaction entry, expense tracking by truck/driver/load, vendor tracking, and future-ready API integration framework. Direct portal links to https://manage.fleetone.com/ and https://customerportal.pilotflyingj.com/ for easy access to fuel card provider portals.

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