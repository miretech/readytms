-- ReadyTMS Insurance Section Schema
-- Run this in your ReadyTMS PostgreSQL database to create insurance tracking tables

-- Insurance Trucks Table
CREATE TABLE IF NOT EXISTS insurance_trucks (
    id SERIAL PRIMARY KEY,
    unit_number VARCHAR(50) NOT NULL UNIQUE,
    vin VARCHAR(17),
    year INTEGER,
    make VARCHAR(100),
    model VARCHAR(100),
    specific_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    physical_damage VARCHAR(255),
    owner_operator BOOLEAN DEFAULT FALSE,
    loss_payee_name VARCHAR(255),
    loss_payee_address VARCHAR(255),
    loss_payee_city VARCHAR(100),
    loss_payee_state VARCHAR(2),
    loss_payee_zip VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insurance_trucks_unit_number ON insurance_trucks(unit_number);
CREATE INDEX idx_insurance_trucks_vin ON insurance_trucks(vin);
CREATE INDEX idx_insurance_trucks_status ON insurance_trucks(status);

-- Insurance Trailers Table
CREATE TABLE IF NOT EXISTS insurance_trailers (
    id SERIAL PRIMARY KEY,
    unit_number VARCHAR(50) NOT NULL UNIQUE,
    vin VARCHAR(17),
    year INTEGER,
    make VARCHAR(100),
    model VARCHAR(100),
    specific_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    loss_payee_name VARCHAR(255),
    loss_payee_address VARCHAR(255),
    loss_payee_city VARCHAR(100),
    loss_payee_state VARCHAR(2),
    loss_payee_zip VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insurance_trailers_unit_number ON insurance_trailers(unit_number);
CREATE INDEX idx_insurance_trailers_vin ON insurance_trailers(vin);
CREATE INDEX idx_insurance_trailers_status ON insurance_trailers(status);

-- Insurance Sync Log Table
CREATE TABLE IF NOT EXISTS insurance_sync_log (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255),
    sync_date TIMESTAMP DEFAULT NOW(),
    trucks_updated INTEGER DEFAULT 0,
    trucks_added INTEGER DEFAULT 0,
    trailers_updated INTEGER DEFAULT 0,
    trailers_added INTEGER DEFAULT 0,
    status VARCHAR(50),
    notes TEXT
);

CREATE INDEX idx_insurance_sync_log_date ON insurance_sync_log(sync_date DESC);

-- Insurance Claims & Incidents Table
CREATE TABLE IF NOT EXISTS insurance_claims (
    id SERIAL PRIMARY KEY,
    incident_date TIMESTAMP,
    driver_name VARCHAR(255),
    truck_number VARCHAR(50),
    trailer_number VARCHAR(50),
    location VARCHAR(500),
    description TEXT,
    claim_type VARCHAR(100),
    amount DECIMAL(10, 2),
    status VARCHAR(50),
    email_subject VARCHAR(500),
    email_from VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insurance_claims_truck ON insurance_claims(truck_number);
CREATE INDEX idx_insurance_claims_driver ON insurance_claims(driver_name);
CREATE INDEX idx_insurance_claims_status ON insurance_claims(status);

-- Audit Trail for Insurance Updates
CREATE TABLE IF NOT EXISTS insurance_audit_trail (
    id SERIAL PRIMARY KEY,
    record_type VARCHAR(50),
    record_id INTEGER,
    action VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insurance_audit_trail_record ON insurance_audit_trail(record_type, record_id);
CREATE INDEX idx_insurance_audit_trail_date ON insurance_audit_trail(changed_at DESC);

-- Grant permissions if using a separate user
-- GRANT ALL PRIVILEGES ON insurance_trucks TO readytms_user;
-- GRANT ALL PRIVILEGES ON insurance_trailers TO readytms_user;
-- GRANT ALL PRIVILEGES ON insurance_sync_log TO readytms_user;
-- GRANT ALL PRIVILEGES ON insurance_claims TO readytms_user;
-- GRANT ALL PRIVILEGES ON insurance_audit_trail TO readytms_user;
