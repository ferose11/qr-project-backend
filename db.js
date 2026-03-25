const Datastore = require('nedb-promises');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const restaurants = Datastore.create({
  filename: path.join(dataDir, 'restaurants.db'),
  autoload: true
});
const menuItems = Datastore.create({
  filename: path.join(dataDir, 'menu_items.db'),
  autoload: true
});
const orders = Datastore.create({
  filename: path.join(dataDir, 'orders.db'),
  autoload: true
});

menuItems.ensureIndex({ fieldName: 'restaurantRid' }).catch(()=>{});
menuItems.ensureIndex({ fieldName: 'mid' }).catch(()=>{});
orders.ensureIndex({ fieldName: 'restaurantRid' }).catch(()=>{});

async function seed() {
  const count = await restaurants.count({});
  if (count > 0) return;

  const seedRestaurants = [
    { rid: "101", name: "Himalayan Cafe" },
    { rid: "102", name: "Pizza House" },
    { rid: "103", name: "Burger Junction" }
  ];
  await restaurants.insert(seedRestaurants);

  const seedMenu = [
    { restaurantRid: "101", mid: 1, name: "Cheeseburger", price: 250, description: "Juicy beef patty with cheese, lettuce, and tomato" },
    { restaurantRid: "101", mid: 2, name: "Coke", price: 100, description: "Refreshing cold Coca-Cola" },
    { restaurantRid: "101", mid: 5, name: "French Fries", price: 150, description: "Crispy golden french fries" },

    { restaurantRid: "102", mid: 3, name: "Margherita Pizza", price: 350, description: "Classic pizza with fresh mozzarella and basil" },
    { restaurantRid: "102", mid: 4, name: "Sprite", price: 100, description: "Lemon-lime flavored soft drink" },
    { restaurantRid: "102", mid: 6, name: "Pepperoni Pizza", price: 450, description: "Pizza topped with pepperoni and cheese" },

    { restaurantRid: "103", mid: 7, name: "Chicken Burger", price: 280, description: "Grilled chicken breast burger" },
    { restaurantRid: "103", mid: 8, name: "Milkshake", price: 180, description: "Creamy vanilla milkshake" }
  ];
  await menuItems.insert(seedMenu);

  console.log("Seeded restaurants and menu items.");
}

module.exports = { restaurants, menuItems, orders, seed };
