const express = require('express');
const cors = require('cors');
const { restaurants, menuItems, orders, seed } = require('./db');

const PORT = process.env.PORT || 4000;
const app = express();

// 1. CORS Configuration (Allows your frontend to talk to this backend)
app.use(cors()); 
app.use(express.json());

// 2. Health Check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), message: "Server is healthy!" });
});

// 3. Get all restaurants
app.get('/api/restaurants', async (req, res) => {
  const list = await restaurants.find({}, { _id: 0 }).sort({ rid: 1 });
  res.json(list);
});

// 4. Get specific restaurant
app.get('/api/restaurants/:rid', async (req, res) => {
  const { rid } = req.params;
  const doc = await restaurants.findOne({ rid }, { _id: 0 });
  if (!doc) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(doc);
});

// 5. Get Menu for a restaurant
app.get('/api/restaurants/:rid/menu', async (req, res) => {
  const { rid } = req.params;
  const rest = await restaurants.findOne({ rid });
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });
  const items = await menuItems.find({ restaurantRid: rid }, { _id: 0 }).sort({ mid: 1 });
  res.json(items);
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
    // FIXED: Changed $$in to $$in
    const dbItems = await menuItems.find({ restaurantRid: restaurantId, mid: { $$in: mids } });

    if (dbItems.length !== items.length) {
      return res.status(400).json({ error: 'One or more menu items are invalid' });
    }

    let total = 0;
    const orderLines = items.map(reqItem => {
      const dbItem = dbItems.find(d => d.mid === reqItem.mid);
      const qty = Number(reqItem.qty);
      // FIXED: Interpolation corrected
      if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Invalid quantity for item mid=$${reqItem.mid}`);
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
  const { status } = req.body;
  const allowed = ['placed', 'preparing', 'ready', 'served', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  // FIXED: Changed $$set to $$set
  const updated = await orders.update(
    { _id: req.params.id },
    { $$set: { status } },
    { returnUpdatedDocs: true }
  );
  if (!updated) return res.status(404).json({ error: 'Order not found' });
  res.json(updated);
});

// Start Server
seed()
  .then(() => {
    app.listen(PORT, () => {
      // FIXED: Fixed console log string
      console.log(`✅ API listening on http://localhost:$${PORT}`);
    });
  })
  .catch((e) => {
    console.error('❌ Failed to seed DB', e);
    process.exit(1);
  });
