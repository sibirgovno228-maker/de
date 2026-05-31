// ========== Хранилище ==========
const STORAGE = {
    users: "korochki_users",
    requests: "korochki_requests",
    session: "korochki_session"
};

function get(key) { return JSON.parse(localStorage.getItem(STORAGE[key])) || []; }
function set(key, data) { localStorage.setItem(STORAGE[key], JSON.stringify(data)); }
function getSession() { return JSON.parse(localStorage.getItem(STORAGE.session)) || null; }
function saveSession(s) { localStorage.setItem(STORAGE.session, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(STORAGE.session); }

// Создаём админа (admin / 123456) если нет
let users = get("users");
if (!users.some(u => u.login === "admin")) {
    users.push({ id: Date.now(), login: "admin", password: "123456", fio: "Администратор", phone: "80000000000", email: "admin@korochki.est" });
    set("users", users);
}

// ========== Вспомогательные ==========
function msg(id, text, type) {
    let el = document.getElementById(id);
    if (el) { el.textContent = text; el.className = "message " + (type || ""); }
}
function escape(s) { return String(s).replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }

// Маски
function phoneMask(input) {
    if (!input) return;
    input.addEventListener("input", () => {
        let d = input.value.replace(/\D/g, "");
        if (d.startsWith("7")) d = "8" + d.slice(1);
        if (!d.startsWith("8")) d = "8" + d;
        d = d.slice(0,11);
        input.value = d[0] + (d[1] ? "("+d.slice(1,4) : "") + (d[4] ? ")"+d.slice(4,7) : "") + (d[7] ? "-"+d.slice(7,9) : "") + (d[9] ? "-"+d.slice(9,11) : "");
    });
}
function dateMask(input) {
    if (!input) return;
    input.addEventListener("input", () => {
        let v = input.value.replace(/\D/g, "").slice(0,8);
        input.value = (v[0]?v.slice(0,2):"") + (v[2]?"."+v.slice(2,4):"") + (v[4]?"."+v.slice(4,8):"");
    });
}
function validDate(s) { return /^\d{2}\.\d{2}\.\d{4}$/.test(s) && !isNaN(new Date(s.split(".").reverse().join("-"))); }

// ========== Регистрация ==========
function register(e) {
    e.preventDefault();
    let login = document.getElementById("regLogin").value.trim();
    let pwd = document.getElementById("regPassword").value;
    let fio = document.getElementById("regFio").value.trim();
    let phone = document.getElementById("regPhone").value.trim();
    let email = document.getElementById("regEmail").value.trim();
    let usersNow = get("users");
    let err = [];
    if (!login.match(/^[a-zA-Z0-9]{6,}$/)) err.push("Логин латиница, ≥6 символов");
    if (login === "admin") err.push("Логин admin зарезервирован");
    if (usersNow.some(u => u.login === login)) err.push("Логин занят");
    if (pwd.length < 8) err.push("Пароль ≥8 символов");
    if (!fio.match(/^[А-Яа-яЁё\s]+$/)) err.push("ФИО только кириллица");
    if (!phone.match(/^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/)) err.push("Телефон 8(XXX)XXX-XX-XX");
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) err.push("Email неверный");
    if (err.length) return msg("registerMessage", err.join(". "), "fail");
    usersNow.push({ id: Date.now(), login, password: pwd, fio, phone, email });
    set("users", usersNow);
    msg("registerMessage", "Успешно! Перенаправление...", "success");
    setTimeout(() => location.href = "index.html", 1200);
}

// ========== Авторизация ==========
function login(e) {
    e.preventDefault();
    let login = document.getElementById("authLogin").value.trim();
    let pwd = document.getElementById("authPassword").value.trim();
    if (!login || !pwd) return msg("loginMessage", "Заполните поля", "fail");
    if (login === "admin" && pwd === "123456") {
        saveSession({ role: "admin", login: "admin" });
        return location.href = "admin.html";
    }
    let user = get("users").find(u => u.login === login && u.password === pwd);
    if (!user) return msg("loginMessage", "Неверный логин/пароль", "fail");
    saveSession({ role: "user", userId: user.id, login: user.login });
    location.href = "cabinet.html";
}

function logout() { clearSession(); location.href = "index.html"; }

// ========== Проверки доступа ==========
function needUser() {
    let s = getSession();
    if (!s || s.role !== "user") { location.href = "index.html"; return null; }
    return get("users").find(u => u.id === s.userId);
}
function needAdmin() {
    let s = getSession();
    if (!s || s.role !== "admin") { location.href = "index.html"; return false; }
    return true;
}

// ========== Создание заявки ==========
function createReq(e) {
    e.preventDefault();
    let user = needUser();
    if (!user) return;
    let course = document.getElementById("course").value;
    let date = document.getElementById("startDate").value.trim();
    let payment = document.querySelector("input[name='payment']:checked");
    if (!course) return msg("requestMessage", "Выберите курс", "fail");
    if (!date || !validDate(date)) return msg("requestMessage", "Дата ДД.ММ.ГГГГ", "fail");
    if (!payment) return msg("requestMessage", "Выберите оплату", "fail");
    let reqs = get("requests");
    reqs.push({ id: Date.now(), userId: user.id, fio: user.fio, phone: user.phone, email: user.email, course, startDate: date, payment: payment.value, status: "Новая", review: "" });
    set("requests", reqs);
    msg("requestMessage", "Заявка отправлена!", "success");
    setTimeout(() => location.href = "cabinet.html", 1000);
}

// ========== Личный кабинет (таблица + отзывы) ==========
function renderUserRequests() {
    let user = needUser();
    if (!user) return;
    let myReqs = get("requests").filter(r => r.userId === user.id);
    let container = document.getElementById("userRequests");
    if (!myReqs.length) { container.innerHTML = "<div class='empty-requests'>Заявок нет</div>"; return; }
    let html = `<table class="requests-table"><thead><tr><th>#</th><th>Курс</th><th>Дата</th><th>Оплата</th><th>Статус</th><th>Отзыв</th></tr></thead><tbody>`;
    myReqs.forEach((r, i) => {
        let canReview = (r.status === "Обучение завершено" && !r.review);
        let reviewHtml = r.review ? `<em>${escape(r.review)}</em>` : (canReview ? `<button class="review-btn" data-id="${r.id}">Оставить отзыв</button><div class="review-form" id="revForm${r.id}"><textarea id="revText${r.id}" placeholder="Отзыв"></textarea><button class="submit-review" data-id="${r.id}">Сохранить</button></div>` : "—");
        html += `<tr><td>${i+1}</td><td>${escape(r.course)}</td><td>${escape(r.startDate)}</td><td>${escape(r.payment)}</td><td>${escape(r.status)}</td><td class="review-cell">${reviewHtml}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
    document.querySelectorAll(".review-btn").forEach(btn => btn.onclick = () => { let f = document.getElementById(`revForm${btn.dataset.id}`); if(f) f.style.display = f.style.display === "none" ? "flex" : "none"; });
    document.querySelectorAll(".submit-review").forEach(btn => btn.onclick = () => {
        let id = parseInt(btn.dataset.id);
        let txt = document.getElementById(`revText${id}`).value.trim();
        if (!txt) return alert("Введите отзыв");
        let reqs = get("requests");
        let req = reqs.find(r => r.id === id);
        if (req) { req.review = txt; set("requests", reqs); alert("Отзыв сохранён"); renderUserRequests(); }
    });
}

// ========== Админка ==========
let adminPage = 1;
function renderAdmin() {
    if (!needAdmin()) return;
    let all = get("requests").sort((a,b) => (a.status==="Новая"?0:1) - (b.status==="Новая"?0:1) || b.id - a.id);
    let total = Math.ceil(all.length / 5);
    if (adminPage > total) adminPage = total || 1;
    let page = all.slice((adminPage-1)*5, adminPage*5);
    let container = document.getElementById("adminRequestsList");
    if (!page.length) { container.innerHTML = "<div class='empty-requests'>Нет заявок</div>"; return; }
    let html = `<table class="admin-table"><thead><tr><th>ID</th><th>ФИО</th><th>Контакты</th><th>Курс</th><th>Дата</th><th>Оплата</th><th>Статус</th><th></th></tr></thead><tbody>`;
    page.forEach(r => {
        html += `<tr><td>${r.id}</td><td>${escape(r.fio)}</td><td>${escape(r.phone)}<br><small>${escape(r.email)}</small></td><td>${escape(r.course)}</td><td>${escape(r.startDate)}</td><td>${escape(r.payment)}</td>
        <td><select class="status-select" data-id="${r.id}"><option ${r.status==="Новая"?"selected":""}>Новая</option><option ${r.status==="Идет обучение"?"selected":""}>Идет обучение</option><option ${r.status==="Обучение завершено"?"selected":""}>Обучение завершено</option></select></td>
        <td><button class="save-status" data-id="${r.id}">Сохранить</button></td></tr>`;
    });
    html += `</tbody></table><div class="pagination">`;
    for (let i=1; i<=total; i++) html += `<button class="page-btn ${i===adminPage?"active":""}" data-page="${i}">${i}</button>`;
    html += `</div>`;
    container.innerHTML = html;
    document.querySelectorAll(".save-status").forEach(btn => btn.onclick = () => {
        let id = parseInt(btn.dataset.id);
        let newStatus = document.querySelector(`.status-select[data-id="${id}"]`).value;
        let reqs = get("requests");
        let req = reqs.find(r => r.id === id);
        if (req) { req.status = newStatus; set("requests", reqs); alert("Статус обновлён"); renderAdmin(); }
    });
    document.querySelectorAll(".page-btn").forEach(btn => btn.onclick = () => { adminPage = parseInt(btn.dataset.page); renderAdmin(); });
}

// ========== Слайдер ==========
function initSlider() {
    let track = document.getElementById("sliderTrack");
    if (!track) return;
    let slides = track.querySelectorAll(".slide");
    let dots = document.getElementById("sliderDots");
    let prev = document.getElementById("prevSlide");
    let next = document.getElementById("nextSlide");
    let idx = 0, timer;
    function go(i) { idx = (i + slides.length) % slides.length; track.style.transform = `translateX(-${idx*100}%)`; if(dots) dots.querySelectorAll(".slider-dot").forEach((d,j)=>d.classList.toggle("active",j===idx)); }
    function start() { if(timer) clearInterval(timer); timer = setInterval(()=>go(idx+1),3000); }
    if(dots) { dots.innerHTML = ""; slides.forEach((_,i)=>{ let d = document.createElement("div"); d.className = "slider-dot"+(i===0?" active":""); d.onclick = ()=>go(i); dots.appendChild(d); }); }
    if(prev) prev.onclick = ()=>{go(idx-1); start();};
    if(next) next.onclick = ()=>{go(idx+1); start();};
    start();
}

// ========== Инициализация ==========
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("registerForm")) {
        document.getElementById("registerForm").addEventListener("submit", register);
        phoneMask(document.getElementById("regPhone"));
    }
    if (document.getElementById("loginForm")) document.getElementById("loginForm").addEventListener("submit", login);
    if (document.getElementById("requestForm")) {
        document.getElementById("requestForm").addEventListener("submit", createReq);
        dateMask(document.getElementById("startDate"));
    }
    let logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
    if (document.getElementById("userRequests")) { renderUserRequests(); initSlider(); }
    if (document.getElementById("adminRequestsList")) renderAdmin();
});
