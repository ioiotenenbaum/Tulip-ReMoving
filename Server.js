const express = require("express");
const bodyParser = require('body-parser');
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(bodyParser.json());
app.use(express.static("public"));

const ordersFile = path.join(__dirname, "orders.csv");

// Track order IDs
let lastOrderId = 0;

// === Existing price calculation ===
app.post("/calculate-price", async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: "Origin and destination required" });
  }

  try {
    const [originRes, destRes] = await Promise.all([
      fetch(`https://api.postcodes.io/postcodes/${origin}`),
      fetch(`https://api.postcodes.io/postcodes/${destination}`),
    ]);

    const originData = await originRes.json();
    const destData = await destRes.json();

    if (originData.status !== 200 || destData.status !== 200) {
      return res.status(400).json({ error: "Invalid origin or destination postcode." });
    }

    const { latitude: lat1, longitude: lon1 } = originData.result;
    const { latitude: lat2, longitude: lon2 } = destData.result;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Math.round(R * c);

    const price = (distance * 1.2).toFixed(2);

    res.json({ distance, price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error calculating distance." });
  }
});

// Ensure orders.csv exists with headers
if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(
    ordersFile,
    'orderId,timestamp,moveDate,pickupPostcode,pickupType,pickupFloor,pickupElevator,pickupParking,dropoffPostcode,dropoffType,dropoffFloor,dropoffElevator,dropoffParking,bedrooms,houseSize,itemPiano,itemPool,itemArt,multipleLocations,notes,finalPrice,paid\n'
  );
} else {
  // Read the last orderId from existing file
  const lines = fs.readFileSync(ordersFile, 'utf8').trim().split('\n');
  if (lines.length > 1) {
    const lastLine = lines[lines.length - 1];
    const lastId = parseInt(lastLine.split(',')[0], 10);
    if (!isNaN(lastId)) lastOrderId = lastId;
  }
}

app.post('/submit-booking', (req, res) => {
  const {
    moveDate,
    pickupPostcode,
    pickupType,
    pickupFloor,
    pickupElevator,
    pickupParking,
    dropoffPostcode,
    dropoffType,
    dropoffFloor,
    dropoffElevator,
    dropoffParking,
    bedrooms,
    houseSize,
    itemPiano,
    itemPool,
    itemArt,
    multipleLocations,
    notes,
    finalPrice,
	paid
  } = req.body;

  // Increment persistent order ID
  lastOrderId += 1;
  const orderId = lastOrderId;
  const timestamp = new Date().toISOString();

  const line = [
    orderId,
    timestamp,
    moveDate,
    pickupPostcode,
    pickupType,
    pickupFloor,
    pickupElevator,
    pickupParking,
    dropoffPostcode,
    dropoffType,
    dropoffFloor,
    dropoffElevator,
    dropoffParking,
    bedrooms,
    houseSize,
    itemPiano,
    itemPool,
    itemArt,
    multipleLocations,
    notes ? `"${notes.replace(/"/g, '""')}"` : "",
    finalPrice,
	paid
  ].join(',') + '\n';

  fs.appendFile(ordersFile, line, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to save booking.' });
    }
    res.json({ message: `Booking received! Order ID: ${orderId}` });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});