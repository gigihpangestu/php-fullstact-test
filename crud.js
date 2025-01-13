const express = require("express");
const router = express.Router();
const { db, redis } = require("./connect");
const { uploadToS3 } = require("./helperaws");

// CREATE
router.post("/client", async (req, res) => {
  const { name, slug, client_prefix, client_logo, address, phone_number, city } = req.body;

  try {
    const query = `
      INSERT INTO my_client (name, slug, client_prefix, client_logo, address, phone_number, city)
      VALUES (?,?,?,?,?,?,?)
      RETURNING *;
    `;
    const values = [name, slug, client_prefix, client_logo, address, phone_number, city];
    const result = await db.query(query, values);

    const newClient = result.rows[0];

    await redis.set(slug, JSON.stringify(newClient));
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ
router.get("/client/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    
    const cachedClient = await redis.get(slug);
    if (cachedClient) {
      return res.json(JSON.parse(cachedClient));
    }

    const query = `
      SELECT * FROM my_client 
      WHERE slug = $1 AND deleted_at IS NULL;
    `;
    const result = await db.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    const client = result.rows[0];
    await redis.set(slug, JSON.stringify(client));
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
router.put("/client/:slug", async (req, res) => {
  const { slug } = req.params;
  const { name, client_prefix, client_logo, address, phone_number, city } = req.body;

  try {
    const query = `
      UPDATE my_client
      SET name = ?, client_prefix = ?, client_logo = ?,
          address = ?, phone_number = ?, city = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?
      RETURNING *;
    `;
    const values = [name, client_prefix, client_logo, address, phone_number, city, slug];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "CLIENT TIDAK DITEMUKAN" });
    }

    const updatedClient = result.rows[0];

    // UPDATE CACHE
    await redis.del(slug);
    await redis.set(slug, JSON.stringify(updatedClient));
    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE
router.delete("/client/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const query = `
      UPDATE my_client
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE slug = $1
      RETURNING *;
    `;
    const result = await db.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "CLIENT TIDAK DITEMUKAN" });
    }

    // DELETE CACHE
    await redis.del(slug);
    res.json({ message: "CLIENT BERHASI DI HAPUS" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
