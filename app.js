const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const CARD_DATA_FILE = 'cards.json';
const USER_DATA_FILE = 'users.json';

app.use(bodyParser.json());

// Load user data from JSON file
const users = JSON.parse(fs.readFileSync(USER_DATA_FILE));

// Helper function to load card data from JSON file
const loadCardData = () => {
  try {
    const data = fs.readFileSync(CARD_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Helper function to save card data to JSON file
const saveCardData = (data) => {
  fs.writeFileSync(CARD_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// Authentication endpoint
app.post('/getToken', (req, res) => {
  const { username, password } = req.body;

  // Check if user exists and password is correct
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Generate JWT token
  const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET);

  res.json({ token });
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
};

// Get all cards endpoint with filtering
app.get('/cards', verifyToken, (req, res) => {
  const { set, type, rarity } = req.query;
  let cards = loadCardData();

  if (set) {
    cards = cards.filter(card => card.set === set);
  }
  if (type) {
    cards = cards.filter(card => card.type === type);
  }
  if (rarity) {
    cards = cards.filter(card => card.rarity === rarity);
  }

  res.json(cards);
});

// Create a new card endpoint
app.post('/cards/create', verifyToken, (req, res) => {
  const newCard = req.body;
  let cards = loadCardData();
  newCard.id = cards.length > 0 ? Math.max(...cards.map(c => c.id)) + 1 : 1;
  cards.push(newCard);
  saveCardData(cards);
  res.json({ successMessage: 'Card created successfully', card: newCard });
});

// Update an existing card endpoint
app.put('/cards/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const updatedCard = req.body;
  let cards = loadCardData();

  const index = cards.findIndex(card => card.id == id);

  if (index === -1) {
    return res.status(404).json({ errorMessage: 'Card not found' });
  }

  cards[index] = { ...cards[index], ...updatedCard };
  saveCardData(cards);
  res.json({ successMessage: 'Card updated successfully', card: cards[index] });
});

// Delete an existing card endpoint
app.delete('/cards/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  let cards = loadCardData();

  const index = cards.findIndex(card => card.id == id);

  if (index === -1) {
    return res.status(404).json({ errorMessage: 'Card not found' });
  }

  const deletedCard = cards.splice(index, 1)[0];
  saveCardData(cards);
  res.json({ successMessage: 'Card deleted successfully', card: deletedCard });
});

// Get total number of cards endpoint
app.get('/cards/count', verifyToken, (req, res) => {
  const cards = loadCardData();
  res.json({ cardCount: cards.length });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Get all card sets endpoint
app.get('/sets', verifyToken, (req, res) => {
  const cards = loadCardData();
  const sets = [...new Set(cards.map(card => card.set))];
  res.json(sets);
});

// Get all card types endpoint
app.get('/types', verifyToken, (req, res) => {
  const cards = loadCardData();
  const types = [...new Set(cards.map(card => card.type))];
  res.json(types);
});

// Get all card rarities endpoint
app.get('/rarities', verifyToken, (req, res) => {
  const cards = loadCardData();
  const rarities = [...new Set(cards.map(card => card.rarity))];
  res.json(rarities);
});

// Get a random card endpoint
app.get('/cards/random', verifyToken, (req, res) => {
  const cards = loadCardData();
  const randomCard = cards[Math.floor(Math.random() * cards.length)];
  res.json(randomCard);
});
