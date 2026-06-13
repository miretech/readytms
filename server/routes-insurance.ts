// Insurance Management Routes
// Add these routes to routes.ts in the registerRoutes function

export const insuranceRoutes = `
  // Insurance records - Trucks
  app.get("/api/insurance", async (req: any, res) => {
    try {
      const records = await storage.db.query(
        'SELECT * FROM insurance_trucks UNION ALL SELECT * FROM insurance_trailers ORDER BY unit_number'
      );
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch insurance records:", error);
      res.status(500).json({ message: "Failed to fetch insurance records" });
    }
  });

  app.get("/api/insurance/:id", async (req, res) => {
    try {
      const record = await storage.db.query(
        'SELECT * FROM insurance_trucks WHERE id = ? UNION ALL SELECT * FROM insurance_trailers WHERE id = ?',
        [req.params.id, req.params.id]
      );
      if (record.length === 0) return res.status(404).json({ message: "Record not found" });
      res.json(record[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch record" });
    }
  });

  app.post("/api/insurance", async (req: any, res) => {
    try {
      const { unitNumber, unitType, year, make, model, vin, status } = req.body;
      
      if (!unitNumber || !unitType) {
        return res.status(400).json({ message: "Unit number and type are required" });
      }

      const table = unitType === 'truck' ? 'insurance_trucks' : 'insurance_trailers';
      const result = await storage.db.run(
        `INSERT INTO ${table} (unit_number, year, make, model, vin, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [unitNumber, year || null, make || null, model || null, vin || null, status || 'active']
      );

      const newRecord = await storage.db.query(
        `SELECT * FROM ${table} WHERE id = ?`,
        [result.lastID]
      );

      res.status(201).json(newRecord[0]);
    } catch (error) {
      console.error("Failed to create insurance record:", error);
      res.status(500).json({ message: "Failed to create insurance record" });
    }
  });

  app.patch("/api/insurance/:id", async (req, res) => {
    try {
      const { unitNumber, year, make, model, vin, status } = req.body;
      
      // Try updating in both tables (one will succeed)
      await storage.db.run(
        'UPDATE insurance_trucks SET unit_number = ?, year = ?, make = ?, model = ?, vin = ?, status = ?, updated_at = NOW() WHERE id = ?',
        [unitNumber, year, make, model, vin, status, req.params.id]
      );

      await storage.db.run(
        'UPDATE insurance_trailers SET unit_number = ?, year = ?, make = ?, model = ?, vin = ?, status = ?, updated_at = NOW() WHERE id = ?',
        [unitNumber, year, make, model, vin, status, req.params.id]
      );

      res.json({ message: "Record updated" });
    } catch (error) {
      console.error("Failed to update insurance record:", error);
      res.status(500).json({ message: "Failed to update record" });
    }
  });

  app.delete("/api/insurance/:id", async (req, res) => {
    try {
      await storage.db.run('DELETE FROM insurance_trucks WHERE id = ?', [req.params.id]);
      await storage.db.run('DELETE FROM insurance_trailers WHERE id = ?', [req.params.id]);
      res.json({ message: "Record deleted" });
    } catch (error) {
      console.error("Failed to delete insurance record:", error);
      res.status(500).json({ message: "Failed to delete record" });
    }
  });
`;
