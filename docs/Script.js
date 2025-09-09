// This piece of code is responsible for the front-end programming in the Order Now section

let currentStep = 1;
const totalSteps = 5;
let selectedDate = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function showStep(step) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
  updateProgressBar(step);
}
function nextStep() {
  if (currentStep < totalSteps) {
    currentStep++;
    showStep(currentStep);
    if (currentStep === 5) calculateDistanceAndPrice();
	window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
	window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
function updateProgressBar(step) {
  const progress = (step - 1) / (totalSteps - 1) * 100;
  document.getElementById('progressBar').style.width = progress + "%";
}

// Calendar rendering
function renderCalendar(month, year) {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
  document.getElementById('calendarMonth').textContent = `${monthName} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  let date = 1;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) {
        calendar.innerHTML += "<div></div>";
      } else if (date > daysInMonth) {
        break;
      } else {
        const cellDate = new Date(year, month, date);
        let div = document.createElement("div");
        div.textContent = date;

        if (cellDate <= today) {
          div.classList.add("red");
        } else {
          let rand = Math.random();
          if (rand < 0.7) div.classList.add("green");
          else if (rand < 0.9) div.classList.add("yellow");
          else div.classList.add("red");

          div.addEventListener("click", () => {
            if (!div.classList.contains("red")) {
              document.querySelectorAll('#calendar div').forEach(d => d.classList.remove('selected-date'));
              div.classList.add("selected-date");
              selectedDate = cellDate.toISOString().split('T')[0];
              document.getElementById("moveDate").value = selectedDate;
              document.getElementById("step1Next").disabled = false;
            }
          });
        }
        calendar.appendChild(div);
        date++;
      }
    }
  }
}
function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
}

// Toggle flat fields
function toggleFlatFields(prefix) {
  const type = document.getElementById(prefix + "Type").value;
  document.getElementById(prefix + "FlatFields").style.display = type === "flat" ? "block" : "none";
}

  // --- Step 2: Postcodes & Access Validation ---
  const pickupPostcodeInput = document.getElementById("pickupPostcode");
  const dropoffPostcodeInput = document.getElementById("dropoffPostcode");
  const step2NextButton = document.querySelector('[data-step="2"].primary');

  // Create error spans
  const pickupError = document.createElement("div");
  pickupError.style.color = "red";
  pickupError.style.fontSize = "0.85rem";
  pickupError.style.display = "none";
  pickupPostcodeInput.insertAdjacentElement("afterend", pickupError);

  const dropoffError = document.createElement("div");
  dropoffError.style.color = "red";
  dropoffError.style.fontSize = "0.85rem";
  dropoffError.style.display = "none";
  dropoffPostcodeInput.insertAdjacentElement("afterend", dropoffError);

  async function validatePostcode(pc) {
    if (!pc || pc.trim().length < 5) return false;
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}/validate`
      );
      const data = await res.json();
      return data.result === true;
    } catch (err) {
      console.error("Postcode validation error:", err);
      return false;
    }
  }

  async function checkPostcodes() {
    step2NextButton.disabled = true;
    pickupError.style.display = "none";
    dropoffError.style.display = "none";

    const pickupValid = await validatePostcode(pickupPostcodeInput.value);
    const dropoffValid = await validatePostcode(dropoffPostcodeInput.value);

    if (!pickupValid && pickupPostcodeInput.value.trim() !== "") {
      pickupError.textContent = "Invalid postcode.";
      pickupError.style.display = "block";
    }
    if (!dropoffValid && dropoffPostcodeInput.value.trim() !== "") {
      dropoffError.textContent = "Invalid postcode.";
      dropoffError.style.display = "block";
    }

    if (pickupValid && dropoffValid) {
      step2NextButton.disabled = false;
    }
  }

  [pickupPostcodeInput, dropoffPostcodeInput].forEach((input) => {
    input.addEventListener("input", () => {
      clearTimeout(input._timer);
      input._timer = setTimeout(checkPostcodes, 600);
    });
  });


// Update slider display
function updateSizeDisplay() {
  const size = document.getElementById("houseSize").value;
  document.getElementById("sizeSqFt").textContent = size;
  document.getElementById("sizeSqM").textContent = (size / 10.764).toFixed(1);
}

// 📏 Haversine formula for aerial distance
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = angle => angle * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // km
}

// 🚚 Distance + Price calculation
async function calculateDistanceAndPrice() {
  const pickup = document.getElementById("pickupPostcode").value;
  const dropoff = document.getElementById("dropoffPostcode").value;

  try {
    // 1. Get lat/lng from Postcodes.io
    const [pickupRes, dropoffRes] = await Promise.all([
      fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pickup)}`).then(r => r.json()),
      fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(dropoff)}`).then(r => r.json())
    ]);

    if (pickupRes.status !== 200 || dropoffRes.status !== 200) {
      throw new Error("Invalid postcode(s). Please check and try again.");
    }

    const pickupLat = pickupRes.result.latitude;
    const pickupLng = pickupRes.result.longitude;
    const dropoffLat = dropoffRes.result.latitude;
    const dropoffLng = dropoffRes.result.longitude;

    // 2. Calculate aerial distance
    const distanceKm = haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng).toFixed(1);

    document.getElementById("postcodeDistance").textContent = distanceKm + " km";

    // 3. Price calculation
    let basePrice = 200;
    let bedrooms = parseInt(document.getElementById("bedrooms").value);
    basePrice += bedrooms * 50;
    basePrice += distanceKm * 1.0; // slightly lower multiplier than driving

    document.getElementById("finalPriceDisplay").textContent = "£" + basePrice.toFixed(2);
    document.getElementById("priceReason").textContent =
      "Price based on aerial distance (" + distanceKm + " km), number of bedrooms, and selected date.";
  } catch (err) {
    document.getElementById("postcodeDistance").textContent = "Error";
    document.getElementById("finalPriceDisplay").textContent = "£0.00";
    document.getElementById("priceReason").textContent = err.message;
    console.error(err);
  }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar(currentMonth, currentYear);
  showStep(currentStep);
  updateSizeDisplay();
});

const bookNowButton = document.getElementById("book-now");

bookNowButton.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const origin = document.getElementById("origin").value.trim();
  const destination = document.getElementById("destination").value.trim();
  const distance = document.getElementById("distance-output").textContent.replace(" km", "");
  const price = document.getElementById("price-output").textContent.replace("£", "");

  try {
    const response = await fetch("/save-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, origin, destination, distance, price }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Order confirmed! Your Order ID is #${data.orderId}`);
    } else {
      alert("Error: " + data.error);
    }
  } catch (err) {
    alert("Server error. Please try again.");
  }
});
