const Datastore = require('nedb-promises');

// Initialize in-memory databases (perfect for Render testing)
const restaurants = Datastore.create();
const menuItems = Datastore.create();
const orders = Datastore.create();

// Seed function to populate initial data
const seed = async () => {
  try {
    // Clear existing data (for in-memory, this is optional)
    await restaurants.remove({}, { multi: true });
    await menuItems.remove({}, { multi: true });
    await orders.remove({}, { multi: true });

    // Sample restaurant data
    await restaurants.insert([
      {
        rid: "rest1",
        name: "Pizza Palace",
        description: "Authentic Italian pizzas",
        address: "123 Main Street",
        phone: "+65 1234 5678"
      },
      {
        rid: "rest2", 
        name: "Burger Barn",
        description: "Gourmet burgers and fries",
        address: "456 Food Street",
        phone: "+65 2345 6789"
      }
    ]);

    // Sample menu items
    await menuItems.insert([
      // Pizza Palace menu
      { mid: "p1", restaurantRid: "rest1", name: "Margherita Pizza", description: "Fresh tomatoes, mozzarella, basil", price: 18.90, category: "Pizza" },
      { mid: "p2", restaurantRid: "rest1", name: "Pepperoni Pizza", description: "Pepperoni, mozzarella cheese", price: 22.90, category: "Pizza" },
      { mid: "p3", restaurantRid: "rest1", name: "Caesar Salad", description: "Romaine lettuce, parmesan, croutons", price: 12.90, category: "Salad" },
      
      // Burger Barn menu
      { mid: "b1", restaurantRid: "rest2", name: "Classic Burger", description: "Beef patty, lettuce, tomato, onion", price: 15.90, category: "Burger" },
      { mid: "b2", restaurantRid: "rest2", name: "Cheese Burger", description: "Beef patty with cheese", price: 17.90, category: "Burger" },
      { mid: "b3", restaurantRid: "rest2", name: "French Fries", description: "Crispy golden fries", price: 8.90, category: "Sides" }
    ]);

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

module.exports = { restaurants, menuItems, orders, seed };
