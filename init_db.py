#!/usr/bin/env python3
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / 'insurance_audit.db'

def init_sqlite():
    """Initialize SQLite database for local audit trail."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Insurance reconciliations
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS insurance_reconciliations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        file_name TEXT,
        equipment_count INTEGER,
        driver_count INTEGER,
        discrepancy_count INTEGER,
        status TEXT DEFAULT 'completed'
    )
    ''')

    # Equipment (tractors/trailers)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS insurance_equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reconciliation_id INTEGER NOT NULL,
        unit_number TEXT,
        unit_type TEXT,
        vin TEXT,
        year INTEGER,
        make TEXT,
        model TEXT,
        status TEXT,
        in_readytms BOOLEAN,
        in_insurance BOOLEAN,
        FOREIGN KEY(reconciliation_id) REFERENCES insurance_reconciliations(id)
    )
    ''')

    # Drivers
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS insurance_drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reconciliation_id INTEGER NOT NULL,
        name TEXT,
        license_number TEXT,
        status TEXT,
        in_readytms BOOLEAN,
        in_insurance BOOLEAN,
        FOREIGN KEY(reconciliation_id) REFERENCES insurance_reconciliations(id)
    )
    ''')

    # Discrepancies
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS insurance_discrepancies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reconciliation_id INTEGER NOT NULL,
        discrepancy_type TEXT,
        unit_number TEXT,
        unit_type TEXT,
        driver_name TEXT,
        details TEXT,
        flagged_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_date TIMESTAMP,
        resolution_notes TEXT,
        telegram_posted BOOLEAN DEFAULT 0,
        FOREIGN KEY(reconciliation_id) REFERENCES insurance_reconciliations(id)
    )
    ''')

    # Claims & incidents
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS claims_incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        driver_name TEXT,
        truck_number TEXT,
        location TEXT,
        description TEXT,
        claim_type TEXT,
        email_subject TEXT,
        email_from TEXT,
        telegram_posted BOOLEAN DEFAULT 0
    )
    ''')

    conn.commit()
    conn.close()
    print(f"✅ Initialized SQLite database at {DB_PATH}")

if __name__ == '__main__':
    init_sqlite()
