const express = require('express');
const cors = require('cors');
// Importing from your db.js
const { restaurants, menuItems, orders, seed } = require('./db');

const PORT = process.env.PORT || 4000;
const app = express();

// 1. Middleware
app.use(cors()); 
app.use(express.json());

// 2. Health Check & Root (Good for Render to see the service is live)
app.get('/', (req, res) => {
  res.json({ message: "QR Menu API is live!", status: "In-Memory DB Active" });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), message: "Server is healthy!" });
});

// 3. Get all restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    // Note: Using cfind().sort().exec() for sorting in nedb-promises
    const list = await restaurants.cfind({}, { _id: 0 }).sort({ rid: 1 }).exec();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get specific restaurant
app.get('/api/restaurants/:rid', async (req, res) => {
  try {
    const { rid } = req.params;
    const doc = await restaurants.findOne({ rid }, { _id: 0 });
    if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Menu for a restaurant
app.get('/api/restaurants/:rid/menu', async (req, res) => {
  try {
    const { rid } = req.params;
    const rest = await restaurants.findOne({ rid });
    if (!rest) return res.status(404).json({ error: 'Restaurant not found' });
    
    const items = await menuItems.cfind({ restaurantRid: rid }, { _id: 0 }).sort({ mid: 1 }).exec();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Create an Order
app.post('/api/orders', async (req, res) => {
  try {
    const { restaurantId, tableNumber, items } = req.body;
    
    if (!restaurantId || !tableNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'restaurantId, tableNumber and items are required' });
    }

    const rest = await restaurants.findOne({ rid: restaurantId });
    if (!rest) return res.status(400).json({ error: 'Invalid restaurantId' });

    const mids = items.map(i => i.mid);
    // Corrected to use $$in (single dollar sign)
    const dbItems = await menuItems.find({ restaurantRid: restaurantId, mid: { $$in: mids } });

    if (dbItems.length !== items.length) {
      return res.status(400).json({ error: 'One or more menu items are invalid' });
    }

    let total = 0;
    const orderLines = items.map(reqItem => {
      const dbItem = dbItems.find(d => d.mid === reqItem.mid);
      const qty = Number(reqItem.qty);
      
      if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for item mid=$${reqItem.mid}`);
      }
      
      const lineSubtotal = dbItem.price * qty;
      total += lineSubtotal;
      
      return {
        mid: dbItem.mid,
        name: dbItem.name,
        unitPrice: dbItem.price,
        qty,
        subtotal: lineSubtotal
      };
    });

    const orderDoc = {
      restaurantRid: restaurantId,
      tableNumber: String(tableNumber),
      items: orderLines,
      total,
      status: 'placed',
      createdAt: new Date().toISOString()
    };

    const inserted = await orders.insert(orderDoc);

    res.status(201).json({
      orderId: inserted._id,
      restaurantId,
      tableNumber,
      items: orderLines,
      total,
      status: inserted.status,
      createdAt: inserted.createdAt
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Invalid order' });
  }
});

// 7. Update Order Status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['placed', 'preparing', 'ready', 'served', 'cancelled'];
    
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Corrected to use $$set (single dollar sign)
    const updated = await orders.update(
      { _id: req.params.id },
      { $$set: { status } },
      { returnUpdatedDocs: true }
    );
    
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Start Server
// We run seed() first to make sure the in-memory DB has data when the app starts
seed()
  .then(() => {
    app.listen(PORT, () => {
      // Fixed interpolation with single $$
      console.log(`✅ API listening on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error('❌ Failed to seed DB', e);
    process.exit(1);
  });
