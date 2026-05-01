const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzH9wcYB63yinLLf7KHUvOU4910XkC29__e11qv6T_rM7bZFEF3iBtu8d0BQX4f_48q_A/exec";

const form = document.getElementById("reservation-form");
const dateInput = document.getElementById("date");
const stylistSelect = document.getElementById("stylist");
const menuSelect = document.getElementById("menu");
const noteInput = document.getElementById("note");
const timeSlotsBox = document.getElementById("time-slots");
const timeMessage = document.getElementById("time-message");
const timeInput = document.getElementById("time");
const durationInput = document.getElementById("duration");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const submitBtn = document.getElementById("submit-btn");

let isSubmitting = false;

function showLoading(message = "読み込み中...") {
  if (loadingText) loadingText.textContent = message;
  if (loadingOverlay) loadingOverlay.style.display = "flex";
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "none";
}

function clearTimeSelection(message = "日時・担当・メニューを選択してください") {
  timeSlotsBox.innerHTML = "";
  timeInput.value = "";
  if (timeMessage) timeMessage.textContent = message;
}

function getSelectedMenuDuration() {
  const selected = menuSelect.options[menuSelect.selectedIndex];
  if (!selected) return "";
  return selected.dataset.duration || "";
}

function renderTimes(times) {
  timeSlotsBox.innerHTML = "";
  timeInput.value = "";

  if (!times || times.length === 0) {
    timeMessage.textContent = "空き枠がありません";
    return;
  }

  timeMessage.textContent = "時間を選択してください";

  times.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "time-slot";
    btn.textContent = t;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".time-slot").forEach((el) => {
        el.classList.remove("selected");
      });
      btn.classList.add("selected");
      timeInput.value = t;
    });

    timeSlotsBox.appendChild(btn);
  });
}

async function fetchTimes() {
  const date = dateInput.value;
  const stylist = stylistSelect.value;
  const menu = menuSelect.value;
  const duration = getSelectedMenuDuration();

  if (durationInput) durationInput.value = duration;

  console.log("fetchTimes", { date, stylist, menu, duration });

  if (!date || !stylist || !menu || !duration) {
    clearTimeSelection("日時・担当・メニューを選択してください");
    return;
  }

  showLoading("空き時間を読み込み中...");

  try {
    const url = `${WEB_APP_URL}?action=times&date=${encodeURIComponent(date)}&stylist=${encodeURIComponent(stylist)}&menu=${encodeURIComponent(menu)}&duration=${encodeURIComponent(duration)}`;

    console.log("times url:", url);

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    console.log("times response:", data);

    renderTimes(data.times || []);
  } catch (err) {
    console.error("fetchTimes error:", err);
    clearTimeSelection("空き時間の取得に失敗しました");
  } finally {
    hideLoading();
  }
}

async function submitReservation(e) {
  e.preventDefault();
  if (isSubmitting) return;

  const selectedMenuOption = menuSelect.options[menuSelect.selectedIndex];
  const menu = menuSelect.value;
  const menuName = selectedMenuOption ? selectedMenuOption.text : "";
  const duration = getSelectedMenuDuration();

  const data = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    menu: menu,
    menuName: menuName,
    duration: duration,
    date: form.date.value,
    stylist: form.stylist.value,
    time: form.time.value,
    note: noteInput ? noteInput.value.trim() : ""
  };

  if (!data.name || !data.phone || !data.menu || !data.duration || !data.date || !data.stylist || !data.time) {
    alert("必須項目を入力してください");
    return;
  }

  isSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;
  showLoading("予約内容を送信中...");

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: new URLSearchParams(data)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const result = await res.json();
    console.log("submit result:", result);

    if (result.success) {
      alert("予約完了が完了しました");
      form.reset();
      timeInput.value = "";
      if (durationInput) durationInput.value = "";
      clearTimeSelection("予約が完了しました");
    } else {
      alert(result.message || "予約が失敗しました");
      await fetchTimes();
    }
  } catch (err) {
    console.error("submitReservation error:", err);
    alert("送信失敗しました");
  } finally {
    isSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
    hideLoading();
  }
}

dateInput.addEventListener("change", async () => {
  try {
    dateInput.blur();
  } catch (e) {}
  await fetchTimes();
});

stylistSelect.addEventListener("change", fetchTimes);
menuSelect.addEventListener("change", fetchTimes);
form.addEventListener("submit", submitReservation);