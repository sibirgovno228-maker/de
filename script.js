// ========== РАБОТА С ХРАНИЛИЩЕМ ==========
function getUsers() { return JSON.parse(localStorage.getItem('users') || '[]'); }
function saveUsers(u) { localStorage.setItem('users', JSON.stringify(u)); }
function getRequests() { return JSON.parse(localStorage.getItem('requests') || '[]'); }
function saveRequests(r) { localStorage.setItem('requests', JSON.stringify(r)); }

// ========== РЕГИСТРАЦИЯ ==========
const regForm = document.getElementById('registerForm');
if (regForm) {
    regForm.onsubmit = (e) => {
        e.preventDefault();
        let login = document.getElementById('regLogin').value.trim();
        let pass = document.getElementById('regPassword').value.trim();
        let fio = document.getElementById('regFio').value.trim();
        let phone = document.getElementById('regPhone').value.trim();
        let email = document.getElementById('regEmail').value.trim();
        let users = getUsers();
        if (users.find(u => u.login === login)) {
            document.getElementById('registerMessage').innerHTML = '<span style="color:red">Логин занят</span>';
            return;
        }
        users.push({ login, password: pass, fio, phone, email });
        saveUsers(users);
        document.getElementById('registerMessage').innerHTML = '<span style="color:green">Регистрация успешна! Войдите.</span>';
        setTimeout(() => location.href = 'index.html', 1500);
    };
}

// ========== ВХОД (admin / 123456) ==========
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        let login = document.getElementById('authLogin').value.trim();
        let pass = document.getElementById('authPassword').value.trim();
        // Админ
        if (login === 'admin' && pass === '123456') {
            localStorage.setItem('currentUser', 'admin');
            location.href = 'admin.html';
            return;
        }
        // Обычный пользователь
        let users = getUsers();
        let user = users.find(u => u.login === login && u.password === pass);
        if (user) {
            localStorage.setItem('currentUser', login);
            location.href = 'cabinet.html';
        } else {
            document.getElementById('loginMessage').innerHTML = '<span style="color:red">Неверный логин или пароль</span>';
        }
    };
}

// ========== ВЫХОД ==========
document.querySelectorAll('#logoutBtn').forEach(btn => btn.onclick = () => {
    localStorage.removeItem('currentUser');
    location.href = 'index.html';
});

// ========== СОЗДАНИЕ ЗАЯВКИ (пользователем) ==========
const requestForm = document.getElementById('requestForm');
if (requestForm) {
    requestForm.onsubmit = (e) => {
        e.preventDefault();
        let course = document.getElementById('course').value;
        let date = document.getElementById('startDate').value;
        let payment = document.querySelector('input[name="payment"]:checked')?.value;
        let currentUser = localStorage.getItem('currentUser');
        if (!currentUser || currentUser === 'admin') {
            alert('Только обычные пользователи могут создавать заявки');
            return;
        }
        if (!course || !date || !payment) {
            document.getElementById('requestMessage').innerHTML = '<span style="color:red">Заполните все поля</span>';
            return;
        }
        let requests = getRequests();
        requests.push({
            id: Date.now(),
            user: currentUser,
            course: course,
            date: date,
            payment: payment,
            status: 'Новая',
            createdAt: new Date().toISOString()
        });
        saveRequests(requests);
        document.getElementById('requestMessage').innerHTML = '<span style="color:green">✅ Заявка отправлена! Переход в кабинет...</span>';
        setTimeout(() => location.href = 'cabinet.html', 1000);
    };
}

// ========== ЛИЧНЫЙ КАБИНЕТ: показать свои заявки + слайдер ==========
const userContainer = document.getElementById('userRequests');
if (userContainer) {
    let currentUser = localStorage.getItem('currentUser');
    let all = getRequests();
    let my = all.filter(r => r.user === currentUser);
    if (my.length === 0) {
        userContainer.innerHTML = '<div class="request-card">📭 У вас пока нет заявок. Создайте новую.</div>';
    } else {
        userContainer.innerHTML = my.map(r => `
            <div class="request-card">
                <h3>${escapeHtml(r.course)}</h3>
                <p>📅 ${escapeHtml(r.date)} | 💰 ${escapeHtml(r.payment)}</p>
                <p>Статус: <strong>${escapeHtml(r.status)}</strong></p>
            </div>
        `).join('');
    }
    // Слайдер (3 фото, авто 3 сек)
    const track = document.getElementById('sliderTrack');
    if (track && document.querySelectorAll('.slide').length) {
        let idx = 0, slides = document.querySelectorAll('.slide');
        let dotsDiv = document.getElementById('sliderDots');
        if (dotsDiv) {
            dotsDiv.innerHTML = '';
            for (let i = 0; i < slides.length; i++) {
                let dot = document.createElement('div');
                dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
                dot.onclick = () => go(i);
                dotsDiv.appendChild(dot);
            }
        }
        function go(n) { idx = (n + slides.length) % slides.length; track.style.transform = `translateX(-${idx * 100}%)`; document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === idx)); }
        function next() { go(idx + 1); }
        document.getElementById('prevSlide')?.addEventListener('click', () => go(idx - 1));
        document.getElementById('nextSlide')?.addEventListener('click', next);
        setInterval(next, 3000);
        go(0);
    }
}

// ========== АДМИНКА: показать ВСЕ заявки ==========
const adminContainer = document.getElementById('adminRequestsList');
if (adminContainer) {
    function renderAdmin() {
        let allRequests = getRequests();
        let users = getUsers();
        if (allRequests.length === 0) {
            adminContainer.innerHTML = '<div class="request-card" style="text-align:center">📭 Пока нет ни одной заявки. Попросите пользователя создать заявку.</div>';
            return;
        }
        // Сортируем по дате создания (новые сверху)
        allRequests.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        adminContainer.innerHTML = allRequests.map(req => {
            let userInfo = users.find(u => u.login === req.user);
            let fio = userInfo ? userInfo.fio : req.user;
            return `
                <div class="request-card">
                    <h3>${escapeHtml(req.course)}</h3>
                    <p><strong>${escapeHtml(fio)}</strong> (логин: ${escapeHtml(req.user)})</p>
                    <p>📅 ${escapeHtml(req.date)} | 💰 ${escapeHtml(req.payment)}</p>
                    <p>Статус: 
                        <select class="admin-status-select" data-id="${req.id}">
                            <option ${req.status === 'Новая' ? 'selected' : ''}>Новая</option>
                            <option ${req.status === 'Идет обучение' ? 'selected' : ''}>Идет обучение</option>
                            <option ${req.status === 'Обучение завершено' ? 'selected' : ''}>Обучение завершено</option>
                        </select>
                    </p>
                    <small>Создана: ${new Date(req.createdAt).toLocaleString()}</small>
                </div>
            `;
        }).join('');
        // Обработчик изменения статуса
        document.querySelectorAll('.admin-status-select').forEach(select => {
            select.onchange = (e) => {
                let id = parseInt(select.dataset.id);
                let newStatus = select.value;
                let requests = getRequests();
                let req = requests.find(r => r.id === id);
                if (req) {
                    req.status = newStatus;
                    saveRequests(requests);
                    renderAdmin(); // обновить список
                }
            };
        });
    }
    renderAdmin();
    // Кнопка обновления вручную
    const refreshBtn = document.getElementById('refreshAdminBtn');
    if (refreshBtn) refreshBtn.onclick = () => renderAdmin();
}

// ========== ЗАЩИТА СТРАНИЦ ==========
let protectedAttr = document.body.getAttribute('data-protected');
if (protectedAttr) {
    let user = localStorage.getItem('currentUser');
    if (!user) location.href = 'index.html';
    if (protectedAttr === 'admin' && user !== 'admin') location.href = 'cabinet.html';
    if (protectedAttr === 'user' && user === 'admin') location.href = 'admin.html';
}

// ========== ВСПОМОГАТЕЛЬНАЯ ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}