// Telegram Web App API
const tg = window.Telegram?.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();

    // Use Telegram theme colors
    // Force Monochrome Premium Theme (Ignore Telegram Dark Mode)
    tg.setHeaderColor('#ffffff');
    tg.setBackgroundColor('#ffffff');

    // Reset CSS variables to strict white theme
    document.documentElement.style.setProperty('--tg-bg-color', '#ffffff');
    document.documentElement.style.setProperty('--tg-text-color', '#000000');
    document.documentElement.style.setProperty('--tg-secondary-bg-color', '#f9f9f9');
    document.documentElement.style.setProperty('--tg-button-color', '#000000');
    document.documentElement.style.setProperty('--tg-button-text-color', '#ffffff');

    // Handle viewport changes (only expand)
    tg.onEvent('viewportChanged', () => {
        tg.expand();
    });

    // Force light theme status bar
    if (tg.setHeaderColor) {
        tg.setHeaderColor('#ffffff');
    }
}

// Global state
let currentSection = null;
let userData = null;
let cartItems = [];

// API Base URL - adjust based on your backend
const API_BASE = '/webapp/api';

// Get Telegram user data
function getTelegramUserData() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        return tg.initDataUnsafe.user;
    }

    // Fallback for development
    return {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'ru'
    };
}

// Get headers with Telegram user data
function getApiHeaders() {
    const user = getTelegramUserData();
    return {
        'Content-Type': 'application/json',
        'X-Telegram-User': JSON.stringify(user)
    };
}

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    loadUserData();
    loadCartItems();
    updateBadges();
    loadProductsOnMainPage(); // Load products immediately on main page

    // Apply Telegram theme colors on load
    // Force Telegram Theme Variables Override on Load
    if (tg) {
        document.documentElement.style.setProperty('--tg-bg-color', '#ffffff');
        document.documentElement.style.setProperty('--tg-text-color', '#000000');
        document.documentElement.style.setProperty('--tg-secondary-bg-color', '#f9f9f9');
        document.documentElement.style.setProperty('--tg-button-color', '#000000');
        document.documentElement.style.setProperty('--tg-button-text-color', '#ffffff');
        document.documentElement.style.setProperty('--accent', '#000000');
    }

    // Add haptic feedback for buttons (if available)
    function addHapticFeedback(element) {
        element.addEventListener('click', function () {
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    }

    // Add haptic feedback to all buttons
    document.querySelectorAll('.btn, .control-btn, .back-btn, .content-card, .nav-item').forEach(addHapticFeedback);
});

// Navigation functions
function closeApp() {
    if (tg) {
        tg.close();
    } else {
        // Fallback for development
        console.log('Closing app...');
    }
}

// Menu functions
function openMenu() {
    const drawer = document.getElementById('menu-drawer');
    drawer.classList.remove('hidden');
    setTimeout(() => {
        drawer.classList.add('open');
    }, 10);
}

function closeMenu() {
    const drawer = document.getElementById('menu-drawer');
    drawer.classList.remove('open');
    setTimeout(() => {
        drawer.classList.add('hidden');
    }, 300);
}

// Search functions
function openSearch() {
    const overlay = document.getElementById('search-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.add('open');
        loadCategoriesForSearch();
    }, 10);
}

function closeSearch() {
    const overlay = document.getElementById('search-overlay');
    overlay.classList.remove('open');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
}

async function loadCategoriesForSearch() {
    const container = document.getElementById('search-body');
    try {
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');

        const categories = await response.json();
        if (categories && categories.length > 0) {
            let html = '<div class="categories-list">';
            categories.forEach(category => {
                html += `
                    <div class="category-item" onclick="showCategoryProducts('${category.id}')">
                        <span class="category-icon">📁</span>
                        <span class="category-name">${escapeHtml(category.name)}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="empty-state"><p>Категории не найдены</p></div>';
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = '<div class="error-message"><p>Ошибка загрузки категорий</p></div>';
    }
}

function showCategoryProducts(categoryId) {
    closeSearch();
    openSection('shop');
    loadProductsByCategory(categoryId);
}

async function loadProductsByCategory(categoryId) {
    const container = document.getElementById('section-body');
    try {
        const response = await fetch(`${API_BASE}/categories/${categoryId}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');

        const products = await response.json();
        if (products && products.length > 0) {
            let html = '<div class="products-grid">';
            products.forEach(product => {
                html += renderProductCard(product);
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="empty-state"><p>Товары в этой категории не найдены</p></div>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = '<div class="error-message"><p>Ошибка загрузки товаров</p></div>';
    }
}

// Profile functions
function openProfile() {
    const overlay = document.getElementById('profile-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.add('open');
        loadProfileContent();
    }, 10);
}

function closeProfile() {
    const overlay = document.getElementById('profile-overlay');
    overlay.classList.remove('open');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
}

async function loadProfileContent() {
    const container = document.getElementById('profile-body');
    try {
        // Load user profile and partner data
        const [userResponse, partnerResponse] = await Promise.all([
            fetch(`${API_BASE}/user/profile`, { headers: getApiHeaders() }),
            fetch(`${API_BASE}/partner/dashboard`, { headers: getApiHeaders() }).catch(() => ({ ok: false }))
        ]);

        const user = await userResponse.json();
        const partner = partnerResponse.ok ? await partnerResponse.json() : null;

        const telegramUser = getTelegramUserData();
        // Реферальная ссылка с юзернеймом в конце
        const botUsername = 'Vital_shop_bot';
        let referralLink = `https://t.me/${botUsername}`;

        // Получаем username пользователя для реферальной ссылки
        let username = null;
        if (telegramUser && telegramUser.username && telegramUser.username !== 'undefined' && telegramUser.username.trim() !== '') {
            username = telegramUser.username.trim();
        } else if (user && user.username && user.username !== 'undefined' && user.username.trim() !== '') {
            username = user.username.trim();
        }

        // Формируем ссылку с username в конце
        if (username) {
            referralLink = `https://t.me/${botUsername}?start=${username}`;
        } else {
            // Fallback: используем ID если нет username
            const userId = telegramUser?.id || user?.telegramId;
            if (userId && userId !== 'undefined') {
                referralLink = `https://t.me/${botUsername}?start=${userId}`;
            }
        }

        // Final check: ensure referralLink is never undefined, null, or contains "undefined"
        if (!referralLink ||
            referralLink === 'undefined' ||
            referralLink === 'null' ||
            referralLink.includes('undefined') ||
            referralLink.includes('null')) {
            referralLink = `https://t.me/${botUsername}`;
        }

        // Log for debugging
        console.log('🔗 Referral link generated:', {
            hasPartner: !!partner,
            referralCode: partner?.referralCode,
            telegramUsername: telegramUser?.username,
            telegramId: telegramUser?.id,
            finalLink: referralLink
        });

        let html = `
            <div class="profile-content-wrapper">
                <div class="profile-header-info">
                    <div class="profile-avatar">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h3>${escapeHtml(user.firstName || 'Пользователь')} ${escapeHtml(user.lastName || '')}</h3>
                    ${user.username ? `<p class="profile-username">@${escapeHtml(user.username)}</p>` : ''}
                </div>
                
                <div class="profile-section">
                    <h4>Реферальная ссылка</h4>
                    <div class="referral-link-box">
                        <input type="text" id="referral-link-input" value="${escapeHtml(referralLink)}" readonly onclick="this.select();">
                        <button class="btn-copy" onclick="copyReferralLink()">📋</button>
                    </div>
                    <p class="referral-hint">Поделитесь этой ссылкой с друзьями и получайте бонусы!</p>
                </div>
        `;

        if (partner && partner.isActive) {
            html += `
                <div class="profile-section">
                    <h4>Статистика</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Баланс</span>
                            <span class="stat-value">${(partner.balance || 0).toFixed(2)} PZ</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Бонусы</span>
                            <span class="stat-value">${(partner.bonus || 0).toFixed(2)} PZ</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Партнеры</span>
                            <span class="stat-value">${partner.totalPartners || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Прямые</span>
                            <span class="stat-value">${partner.directPartners || 0}</span>
                        </div>
                    </div>
                    <button class="btn" onclick="showPartners(); loadSectionContent('partners', document.getElementById('section-body'))" style="margin-top: 16px; width: 100%;">
                        👥 Посмотреть рефералов
                    </button>
                </div>
            `;
        } else {
            html += `
                <div class="profile-section">
                    <h4>Партнерская программа</h4>
                    <p>Активируйте партнерскую программу для получения реферальных бонусов</p>
                    <button class="btn" onclick="openSection('partner')">Активировать</button>
                </div>
            `;
        }

        html += `
                <div class="profile-section">
                    <h4>Баланс</h4>
                    <div class="balance-display">
                        <span class="balance-value">${(user.balance || 0).toFixed(2)} PZ</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading profile:', error);
        container.innerHTML = '<div class="error-message"><p>Ошибка загрузки профиля</p></div>';
    }
}

async function copyReferralLink(link) {
    const input = document.getElementById('referral-link-input');

    let linkText = (link ?? (input?.value ?? '')).toString();

    // Clean up the link text - remove any undefined/null values
    if (linkText.includes('undefined') || linkText.includes('null')) {
        console.warn('Link contains undefined/null, cleaning up...');
        linkText = linkText.replace(/undefined/g, '').replace(/null/g, '');
    }

    linkText = linkText.trim();

    // Final validation
    if (!linkText || linkText === 'undefined' || linkText === 'null') {
        console.error('Referral link is empty or invalid:', linkText);
        showError('Ошибка: ссылка не загружена. Попробуйте обновить страницу.');
        return;
    }

    // Ensure it's a valid URL
    if (!linkText.startsWith('http')) {
        console.error('Invalid link format:', linkText);
        showError('Ошибка: неверный формат ссылки');
        return;
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(linkText);
        } else {
            // Fallback for older browsers
            if (input) {
                input.value = linkText;
                input.select();
                input.setSelectionRange(0, 99999);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = linkText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        }

        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        showSuccess('✅ Реферальная ссылка скопирована!');
    } catch (error) {
        console.error('Error copying referral link:', error);
        showError('Ошибка копирования ссылки. Попробуйте выделить и скопировать вручную.');
    }
}

// Cart function
function openCart() {
    openSection('cart');
}

async function loadCartContent() {
    try {
        const response = await fetch(`${API_BASE}/cart/items`, { headers: getApiHeaders() });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn('⚠️ Unauthorized - user not authenticated');
                return `
                    <div class="content-section">
                        <h3>Корзина</h3>
                        <p>Для просмотра корзины необходимо авторизоваться</p>
                        <button class="btn" onclick="closeSection(); loadProductsOnMainPage();">Перейти к каталогу</button>
                    </div>
                `;
            }

            if (response.status === 503) {
                console.error('❌ Service unavailable');
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: 'Сервис временно недоступен' };
                }
                return `
                    <div class="content-section">
                        <div class="error-message">
                            <h3>Сервис временно недоступен</h3>
                            <p>${errorData.error || 'База данных временно недоступна. Попробуйте позже.'}</p>
                            <button class="btn" onclick="closeSection(); loadProductsOnMainPage();" style="margin-top: 16px;">
                                Перейти к каталогу
                            </button>
                        </div>
                    </div>
                `;
            }

            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {
                const errorText = await response.text();
                errorData = { error: errorText || 'Неизвестная ошибка' };
            }

            console.error('❌ Cart loading error:', response.status, errorData);
            return `
                <div class="content-section">
                    <div class="error-message">
                        <h3>Ошибка загрузки корзины</h3>
                        <p>${errorData.error || 'Произошла ошибка при загрузке корзины. Попробуйте обновить страницу.'}</p>
                        <button class="btn" onclick="closeSection(); location.reload();" style="margin-top: 16px;">
                            Обновить страницу
                        </button>
                        <button class="btn btn-secondary" onclick="closeSection(); loadProductsOnMainPage();" style="margin-top: 12px;">
                            Перейти к каталогу
                        </button>
                    </div>
                </div>
            `;
        }

        const items = await response.json();

        // Загружаем данные пользователя для отображения баланса
        let userBalance = 0;
        try {
            const userResponse = await fetch(`${API_BASE}/user/profile`, { headers: getApiHeaders() });
            if (userResponse.ok) {
                const userData = await userResponse.json();
                userBalance = userData.balance || 0;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load user balance:', error);
            // Продолжаем без баланса
        }

        if (!items || items.length === 0) {
            return `
                <div class="content-section">
                    <h3>Корзина пуста</h3>
                    <p>Добавьте товары в корзину, чтобы продолжить</p>
                    <button class="btn" onclick="closeSection(); loadProductsOnMainPage();">Перейти к каталогу</button>
                </div>
            `;
        }

        let total = 0;
        let html = '<div class="cart-items-grid">';

        items.forEach(item => {
            // Пропускаем товары без продукта (удаленные/деактивированные)
            if (!item.product) {
                console.warn('⚠️ Cart item without product:', item.id);
                return;
            }

            const product = item.product;
            const itemTotal = (product.price || 0) * (item.quantity || 1);
            total += itemTotal;

            html += `
                <div class="cart-item-tile">
                    <div class="cart-item-image-wrapper">
                        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${escapeHtml(product.title || 'Товар')}" class="cart-item-image">` : '<div class="cart-item-image-placeholder">📦</div>'}
                        <button class="btn-cart-remove" onclick="removeFromCart('${item.id}')">✕</button>
                    </div>
                    <div class="cart-item-info">
                        <h4>${escapeHtml(product.title || 'Без названия')}</h4>
                        <p class="cart-item-price">${(product.price || 0).toFixed(2)} PZ</p>
                        <div class="cart-item-quantity-controls">
                            <button class="btn-quantity" onclick="updateCartQuantity('${item.id}', ${(item.quantity || 1) - 1})" ${(item.quantity || 1) <= 1 ? 'disabled' : ''}>−</button>
                            <span class="cart-item-quantity">${item.quantity || 1}</span>
                            <button class="btn-quantity" onclick="updateCartQuantity('${item.id}', ${(item.quantity || 1) + 1})">+</button>
                        </div>
                        <p class="cart-item-total">${itemTotal.toFixed(2)} PZ</p>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        html += `
            <div class="cart-summary">
                <div class="balance-display">
                    <span class="balance-label">Ваш баланс:</span>
                    <span class="balance-value">${userBalance.toFixed(2)} PZ</span>
                </div>
                <div class="cart-total">
                    <div class="cart-total-row">
                        <span>Итого:</span>
                        <strong>${total.toFixed(2)} PZ</strong>
                    </div>
                </div>
                <button class="btn btn-primary checkout-btn" onclick="checkoutCart()" style="width: 100%; margin-top: 16px;">
                    Оформить заказ (${total.toFixed(2)} PZ)
                </button>
            </div>
        `;

        return html;
    } catch (error) {
        console.error('❌ Error loading cart:', error);
        return `
            <div class="content-section">
                <div class="error-message">
                    <h3>Ошибка загрузки корзины</h3>
                    <p>Попробуйте обновить страницу или вернуться позже</p>
                    <button class="btn" onclick="closeSection(); loadProductsOnMainPage();" style="margin-top: 16px;">
                        Перейти к каталогу
                    </button>
                </div>
            </div>
        `;
    }
}

async function updateCartQuantity(cartItemId, newQuantity) {
    if (newQuantity < 1) {
        // Если количество 0 или меньше, удаляем товар
        await removeFromCart(cartItemId);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/cart/update/${cartItemId}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (response.ok) {
            await loadCartItems();
            updateCartBadge();
            // Reload cart content
            const container = document.getElementById('section-body');
            if (container) {
                container.innerHTML = await loadCartContent();
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            showError(errorData.error || 'Ошибка обновления количества');
        }
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        showError('Ошибка обновления количества');
    }
}

async function removeFromCart(cartItemId) {
    try {
        const response = await fetch(`${API_BASE}/cart/remove/${cartItemId}`, {
            method: 'DELETE',
            headers: getApiHeaders()
        });

        if (response.ok) {
            await loadCartItems();
            updateCartBadge();
            // Reload cart content
            const container = document.getElementById('section-body');
            if (container) {
                container.innerHTML = await loadCartContent();
            }
            showSuccess('Товар удален из корзины');
        } else {
            showError('Ошибка удаления товара');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showError('Ошибка удаления товара');
    }
}

async function checkoutCart() {
    try {
        const response = await fetch(`${API_BASE}/cart/items`, { headers: getApiHeaders() });
        if (!response.ok) throw new Error('Failed to fetch cart items');

        const items = await response.json();
        if (!items || items.length === 0) {
            showError('Корзина пуста');
            return;
        }

        // Фильтруем только валидные товары (с продуктом и ценой)
        const validItems = items.filter(item => item.product && item.product.price);

        if (validItems.length === 0) {
            showError('В корзине нет доступных товаров');
            return;
        }

        // Вычисляем общую сумму
        const total = validItems.reduce((sum, item) => {
            return sum + (item.product.price || 0) * (item.quantity || 1);
        }, 0);

        // Загружаем баланс пользователя
        const userResponse = await fetch(`${API_BASE}/user/profile`, { headers: getApiHeaders() });
        let userBalance = 0;
        if (userResponse.ok) {
            const userData = await userResponse.json();
            userBalance = userData.balance || 0;
        }

        // Показываем форму для ввода телефона и адреса
        showDeliveryForm(validItems, total, userBalance);

    } catch (error) {
        console.error('❌ Error checkout:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        showError(`Ошибка оформления заказа: ${error.message || 'Неизвестная ошибка'}`);
    }
}

// Обработка заказа с оплатой с баланса
async function processOrderWithBalance(items, total, partialAmount = null, phone = null, address = null) {
    try {
        const orderItems = items.map(item => ({
            productId: item.product.id,
            title: item.product.title,
            price: item.product.price,
            quantity: item.quantity
        }));

        const amountToPay = partialAmount || total;
        const contactInfo = phone && address
            ? `Телефон: ${phone}\nАдрес: ${address}`
            : '';
        const message = (partialAmount
            ? `Заказ из корзины. Оплачено с баланса: ${amountToPay.toFixed(2)} PZ из ${total.toFixed(2)} PZ`
            : `Заказ из корзины. Оплачено с баланса: ${total.toFixed(2)} PZ`) + (contactInfo ? `\n\n${contactInfo}` : '');

        const orderResponse = await fetch(`${API_BASE}/orders/create`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                items: orderItems,
                message: message,
                paidFromBalance: amountToPay,
                phone: phone,
                deliveryAddress: address
            })
        });

        if (orderResponse.ok) {
            // Списываем с баланса
            const balanceResponse = await fetch(`${API_BASE}/user/deduct-balance`, {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({ amount: amountToPay })
            });

            if (balanceResponse.ok) {
                showSuccess(`Заказ оформлен! С баланса списано ${amountToPay.toFixed(2)} PZ.`);
            } else {
                showSuccess('Заказ оформлен! Ожидайте подтверждения.');
            }

            closeSection();
            await loadCartItems();
            updateCartBadge();
        } else {
            const errorData = await orderResponse.json();
            showError(`Ошибка оформления заказа: ${errorData.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        console.error('Error processing order with balance:', error);
        showError('Ошибка оформления заказа');
    }
}

// Обычное оформление заказа
async function processOrderNormal(items, phone = null, address = null) {
    try {
        const orderItems = items.map(item => ({
            productId: item.product.id,
            title: item.product.title,
            price: item.product.price,
            quantity: item.quantity
        }));

        const contactInfo = phone && address
            ? `Телефон: ${phone}\nАдрес: ${address}`
            : '';
        const message = 'Заказ из корзины' + (contactInfo ? `\n\n${contactInfo}` : '');

        const orderResponse = await fetch(`${API_BASE}/orders/create`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                items: orderItems,
                message: message,
                phone: phone,
                deliveryAddress: address
            })
        });

        if (orderResponse.ok) {
            showSuccess('Заказ оформлен! Администратор свяжется с вами.');
            closeSection();
            await loadCartItems();
            updateCartBadge();
        } else {
            const errorData = await orderResponse.json();
            showError(`Ошибка оформления заказа: ${errorData.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        console.error('Error processing order:', error);
        showError('Ошибка оформления заказа');
    }
}

function showHome() {
    closeSection();
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.nav-item').classList.add('active');
}

function showFavorites() {
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item')[3].classList.add('active');

    // Show favorites section
    openSection('favorites');
}

function openSection(sectionName) {
    currentSection = sectionName;
    const overlay = document.getElementById('section-overlay');
    const title = document.getElementById('section-title');
    const body = document.getElementById('section-body');

    // Set section title
    const titles = {
        shop: 'Магазин',
        partner: 'Партнёрка',
        audio: 'Звуковые матрицы',
        reviews: 'Отзывы',
        about: 'О нас',
        chats: 'Чаты',
        support: 'Поддержка',
        favorites: 'Избранное',
        cart: 'Корзина',
        certificates: 'Сертификаты',
        promotions: 'Акции',
        contacts: 'Контакты',
        'plazma-product-detail': 'Товар'
    };

    title.textContent = titles[sectionName] || 'Раздел';

    // Load section content
    loadSectionContent(sectionName, body);

    // Show overlay
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.add('open');
    }, 10);
}

function closeSection() {
    const overlay = document.getElementById('section-overlay');
    overlay.classList.remove('open');
    setTimeout(() => {
        overlay.classList.add('hidden');
        currentSection = null;
    }, 300);
}

// Load section content
async function loadSectionContent(sectionName, container) {
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

    try {
        let content = '';

        switch (sectionName) {
            case 'shop':
                content = await loadShopContent();
                break;
            case 'partner':
                content = await loadPartnerContent();
                break;
            case 'reviews':
                content = await loadReviewsContent();
                break;
            case 'about':
                content = await loadAboutContent();
                break;
            case 'chats':
                content = await loadChatsContent();
                break;
            case 'support':
                content = await loadSupportContent();
                break;
            case 'favorites':
                content = await loadFavoritesContent();
                break;
            case 'certificates':
                content = loadCertificatesContent();
                break;
            case 'promotions':
                content = loadPromotionsContent();
                break;
            case 'contacts':
                content = loadContactsContent();
                break;
            case 'cart':
                content = await loadCartContent();
                break;
            case 'partners':
                await showPartners();
                return; // showPartners already sets innerHTML
            default:
                content = '<div class="error-message"><h3>Раздел не найден</h3><p>Попробуйте позже</p></div>';
        }

        container.innerHTML = content;

        // Post-render hooks
        if (sectionName === 'support') {
            initSupportChat();
        }
    } catch (error) {
        console.error('Error loading section:', error);
        container.innerHTML = '<div class="error-message"><h3>Ошибка загрузки</h3><p>Попробуйте позже</p></div>';
    }
}

// Load products on main page immediately
async function loadProductsOnMainPage() {
    const container = document.getElementById('products-container');
    if (!container) return; // Container might not exist in overlay mode

    try {
        console.log('🛒 Loading products on main page...');
        const response = await fetch(`${API_BASE}/products`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const products = await response.json();
        console.log(`✅ Loaded ${products?.length || 0} products`);

        if (products && Array.isArray(products) && products.length > 0) {
            // Группируем товары по категориям
            const productsByCategory = {};
            products.forEach(product => {
                const categoryName = product.category?.name || 'Без категории';
                const categoryId = product.category?.id || 'uncategorized';

                if (!productsByCategory[categoryId]) {
                    productsByCategory[categoryId] = {
                        name: categoryName,
                        products: []
                    };
                }
                productsByCategory[categoryId].products.push(product);
            });
            // Получаем все категории для определения подкатегорий Косметики
            let cosmeticsSubcategories = [];
            let cosmeticsCategoryId = null;
            let cosmeticsProducts = [];

            try {
                const categoriesResponse = await fetch(`${API_BASE}/categories`);
                if (categoriesResponse.ok) {
                    const allCategories = await categoriesResponse.json();
                    cosmeticsSubcategories = allCategories.filter(cat =>
                        cat.name && cat.name.startsWith('Косметика >') && cat.name !== 'Косметика'
                    );

                    // Находим категорию "Косметика"
                    const cosmeticsCategory = allCategories.find(cat => cat.name === 'Косметика');
                    if (cosmeticsCategory) {
                        cosmeticsCategoryId = cosmeticsCategory.id;

                        // Собираем товары из самой категории "Косметика"
                        cosmeticsProducts = productsByCategory[cosmeticsCategoryId]?.products || [];

                        // Добавляем товары из всех подкатегорий "Косметика"
                        cosmeticsSubcategories.forEach(subcat => {
                            const subcatProducts = productsByCategory[subcat.id]?.products || [];
                            cosmeticsProducts = cosmeticsProducts.concat(subcatProducts);
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching categories for cosmetics:', error);
            }

            // Если не нашли через API, ищем в productsByCategory
            if (!cosmeticsCategoryId) {
                for (const [catId, cat] of Object.entries(productsByCategory)) {
                    if (cat.name === 'Косметика') {
                        cosmeticsCategoryId = catId;
                        cosmeticsProducts = cat.products;
                        break;
                    }
                }

                // Также ищем товары в подкатегориях
                if (cosmeticsCategoryId) {
                    for (const [catId, cat] of Object.entries(productsByCategory)) {
                        if (cat.name && cat.name.startsWith('Косметика >')) {
                            cosmeticsProducts = cosmeticsProducts.concat(cat.products);
                        }
                    }
                }
            }

            let html = '';

            // 1. Отображаем категорию "Косметика" специальным блоком
            if (cosmeticsCategoryId && cosmeticsProducts.length > 0) {
                html += renderCosmeticsCategory(cosmeticsCategoryId, cosmeticsProducts, cosmeticsSubcategories);
            }

            // 2. Отображаем остальные категории
            const categoryOrder = ['Живая вода', 'Практики'];
            const sortedCategories = Object.keys(productsByCategory).sort((a, b) => {
                const nameA = productsByCategory[a].name;
                const nameB = productsByCategory[b].name;
                const indexA = categoryOrder.indexOf(nameA);
                const indexB = categoryOrder.indexOf(nameB);

                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return nameA.localeCompare(nameB);
            });

            sortedCategories.forEach(categoryId => {
                const category = productsByCategory[categoryId];

                // Пропускаем Косметику и подкатегории (они уже обработаны)
                if (category.name === 'Косметика' || (category.name && category.name.startsWith('Косметика >'))) {
                    return;
                }

                html += `
                    <div class="products-scroll-container">
                        <div class="section-header-inline">
                            <h2 class="section-title-inline">${escapeHtml(category.name)}</h2>
                        </div>
                        <div class="products-scroll-wrapper">
                            <div class="products-horizontal">
                `;

                category.products.forEach(product => {
                    html += renderProductCardHorizontal(product);
                });

                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                    <p style="font-size: 18px; margin-bottom: 20px;">📦 Каталог пока пуст</p>
                </div>
            `;
        }

        // Загружаем товары из Plazma API
        await loadPlazmaProducts();

    } catch (error) {
        console.error('❌ Error loading products:', error);
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="padding: 40px 20px; text-align: center;">
                    <p>Ошибка загрузки товаров</p>
                    <button class="btn" onclick="loadProductsOnMainPage()" style="margin-top: 20px;">
                        🔄 Попробовать снова
                    </button>
                </div>
            `;
        }
    }
}

// Загрузка товаров из Plazma API
async function loadPlazmaProducts() {
    const plazmaSection = document.getElementById('plazma-products-section');
    const plazmaContainer = document.getElementById('plazma-products-container');

    if (!plazmaSection || !plazmaContainer) {
        console.warn('⚠️ Plazma products section not found');
        return;
    }

    // Показываем секцию с индикатором загрузки
    plazmaSection.style.display = 'block';

    try {
        console.log('🛒 Loading products from Plazma API...');
        console.log('📍 API endpoint:', `${API_BASE}/plazma/products`);

        // Используем бэкенд endpoint для получения товаров из Plazma API
        const response = await fetch(`${API_BASE}/plazma/products`);

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.warn('⚠️ Failed to load Plazma products:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData.error || errorData.message
            });

            // Если это 404 или 503 (сервис недоступен), просто скрываем секцию
            if (response.status === 404 || response.status === 503) {
                console.log('ℹ️ Plazma API не настроен или недоступен, скрываем секцию');
                plazmaSection.style.display = 'none';
                return;
            }

            // Для других ошибок показываем сообщение
            const horizontalContainer = plazmaContainer.querySelector('.products-horizontal');
            if (horizontalContainer) {
                horizontalContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #999;">
                        <p>Товары временно недоступны</p>
                    </div>
                `;
            }
            return;
        }

        const result = await response.json();
        console.log('📦 Response from backend:', {
            success: result.success,
            hasProducts: !!result.products,
            productsLength: Array.isArray(result.products) ? result.products.length : 'not array',
            error: result.error
        });

        const products = result.products || result.data || [];

        console.log(`✅ Loaded ${products?.length || 0} products from Plazma API`);

        const horizontalContainer = plazmaContainer.querySelector('.products-horizontal');
        if (!horizontalContainer) {
            console.error('❌ Horizontal container not found in Plazma section');
            plazmaSection.style.display = 'none';
            return;
        }

        if (products && Array.isArray(products) && products.length > 0) {
            let html = '';
            products.forEach((product, index) => {
                console.log(`📦 Product ${index + 1}:`, {
                    id: product.id,
                    title: product.title,
                    hasImage: !!product.imageUrl,
                    price: product.price || product.priceRub
                });
                html += renderPlazmaProductCard(product);
            });
            horizontalContainer.innerHTML = html;
            plazmaSection.style.display = 'block';
            console.log('✅ Plazma products section displayed with', products.length, 'products');
        } else {
            console.warn('⚠️ No products to display, hiding Plazma section');
            plazmaSection.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error loading Plazma products:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        // При ошибке сети или других ошибках скрываем секцию
        plazmaSection.style.display = 'none';
    }
}

// Render cosmetics category with mixed products from subcategories
function renderCosmeticsCategory(categoryId, allProducts, cosmeticsSubcategories) {
    try {
        // Группируем товары по подкатегориям
        const productsBySubcategory = {};
        cosmeticsSubcategories.forEach(subcat => {
            productsBySubcategory[subcat.id] = allProducts.filter(p => p.category?.id === subcat.id);
        });

        // Создаем микс: по одному товару из каждой подкатегории по очереди
        const mixedProducts = [];
        const subcategoryIds = Object.keys(productsBySubcategory).filter(id => productsBySubcategory[id].length > 0);

        if (subcategoryIds.length === 0) {
            // Если нет подкатегорий, берем первые товары из всех
            return `
                <div class="products-scroll-container">
                    <div class="section-header-inline">
                        <h2 class="section-title-inline" onclick="showCosmeticsSubcategories('${categoryId}')" style="cursor: pointer;">${escapeHtml('Косметика')} <span style="font-size: 18px; margin-left: 8px;">→</span></h2>
                    </div>
                    <div class="products-scroll-wrapper">
                        <div class="products-horizontal">
                            ${allProducts.slice(0, 10).map(p => renderProductCardHorizontal(p)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Берем по одному товару из каждой подкатегории по очереди, максимум 9 товаров
        let maxProducts = 0;
        subcategoryIds.forEach(subcatId => {
            if (productsBySubcategory[subcatId].length > maxProducts) {
                maxProducts = productsBySubcategory[subcatId].length;
            }
        });

        // Берем товары по кругу из каждой подкатегории, но не более 9
        for (let round = 0; round < maxProducts && mixedProducts.length < 9; round++) {
            for (const subcatId of subcategoryIds) {
                if (mixedProducts.length >= 9) break;
                const subcatProducts = productsBySubcategory[subcatId];
                if (subcatProducts && subcatProducts.length > round) {
                    mixedProducts.push(subcatProducts[round]);
                }
            }
        }

        let html = `
            <div class="products-scroll-container">
                <div class="section-header-inline">
                    <h2 class="section-title-inline" onclick="showCosmeticsSubcategories('${categoryId}')" style="cursor: pointer;">${escapeHtml('Косметика')}</h2>
                </div>
                <div class="products-scroll-wrapper">
                    <div class="products-horizontal">
        `;

        mixedProducts.forEach(product => {
            html += renderProductCardHorizontal(product);
        });

        // Кнопка "Перейти на все категории"
        html += `
                        <div class="product-card-more" onclick="showCosmeticsSubcategories('${categoryId}')">
                            <div class="more-icon">📁</div>
                            <div class="more-text">Все категории</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return html;
    } catch (error) {
        console.error('Error rendering cosmetics category:', error);
        // Fallback: показываем все товары как обычно
        return `
            <div class="products-scroll-container">
                <div class="section-header-inline">
                    <h2 class="section-title-inline">${escapeHtml('Косметика')}</h2>
                </div>
                <div class="products-scroll-wrapper">
                    <div class="products-horizontal">
                        ${allProducts.slice(0, 9).map(p => renderProductCardHorizontal(p)).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

// Show cosmetics subcategories - отображаем товары из всех подкатегорий горизонтально
async function showCosmeticsSubcategories(parentCategoryId) {
    try {
        // Открываем секцию каталога
        openSection('shop');

        const container = document.getElementById('section-body');
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

        // Загружаем категории и товары
        const [categoriesResponse, productsResponse] = await Promise.all([
            fetch(`${API_BASE}/categories`),
            fetch(`${API_BASE}/products`)
        ]);

        if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
        if (!productsResponse.ok) throw new Error('Failed to fetch products');

        const allCategories = await categoriesResponse.json();
        const products = await productsResponse.json();

        // Находим подкатегории "Косметика"
        const cosmeticsSubcategories = allCategories.filter(cat =>
            cat.name && cat.name.startsWith('Косметика >') && cat.name !== 'Косметика'
        );

        // Группируем товары по категориям
        const productsByCategory = {};
        products.forEach(product => {
            const categoryId = product.category?.id || 'uncategorized';
            if (!productsByCategory[categoryId]) {
                productsByCategory[categoryId] = [];
            }
            productsByCategory[categoryId].push(product);
        });

        let html = '<div class="products-main-container">';

        // Отображаем каждую подкатегорию как горизонтальную линию
        cosmeticsSubcategories.forEach(subcat => {
            const subcatProducts = productsByCategory[subcat.id] || [];
            if (subcatProducts.length === 0) return;

            html += `
                <div class="products-scroll-container">
                    <div class="section-header-inline">
                        <h2 class="section-title-inline" onclick="showCategoryProducts('${subcat.id}')" style="cursor: pointer;">${escapeHtml(subcat.name)}</h2>
                    </div>
                    <div class="products-scroll-wrapper">
                        <div class="products-horizontal">
            `;

            subcatProducts.forEach(product => {
                html += renderProductCardHorizontal(product);
            });

            html += `
                        </div>
                    </div>
                </div>
            `;
        });

        if (cosmeticsSubcategories.length === 0 || cosmeticsSubcategories.every(subcat => !productsByCategory[subcat.id] || productsByCategory[subcat.id].length === 0)) {
            html += `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                <p style="font-size: 18px; margin-bottom: 20px;">📦 В подкатегориях пока нет товаров</p>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading cosmetics subcategories:', error);
        showError('Ошибка загрузки подкатегорий');
    }
}

// Helper: Clean product title
function cleanProductTitle(title) {
    if (!title) return '';
    // Take part before " - " or " | " (removed " with " to keep full names)
    let clean = title.split(/ - | \| /i)[0];

    // Remove trailing weight info like " 50g", " 50 G", " 50 г"
    clean = clean.replace(/\s+\d+\s*[gг]$/i, '');

    return escapeHtml(clean.trim());
}

// Helper: Extract product weight from text
function extractProductWeight(text) {
    if (!text) return { weight: null, cleanSummary: '' };

    // Look for patterns like "BEC: 50 г" or "50g" or "50 г"
    // The specific user pattern: "/ 55 BEC: 50 г /"

    // Regex to find "BEC: <value>"
    const weightMatch = text.match(/(?:BEC|ВЕС|Вес|Weight)[:\s]+(\d+\s*[гg])/i);
    let weight = weightMatch ? weightMatch[1] : null;

    // Also try to find just "50 g" if BEC line matches
    if (!weight) {
        const simpleMatch = text.match(/(\d+\s*[гg])/i);
        if (simpleMatch && (text.includes('BEC') || text.includes('ВЕС') || text.includes('Weight'))) {
            weight = simpleMatch[1];
        }
    }

    // Clean the text by removing the weight line/segment
    let cleanSummary = text;

    // 1. Remove specific "/ 55 BEC: 50 г /" pattern
    cleanSummary = cleanSummary.replace(/\/ \d+ (?:BEC|ВЕС|Вес|Weight):.*?(\/|$)/gi, '');

    // 2. Remove standalone "BEC: 50 g" or "ВЕС: 50 г"
    cleanSummary = cleanSummary.replace(/(?:BEC|ВЕС|Вес|Weight)[:\s]+\d+\s*[гg][\s\.,]*/gi, '');

    // 3. Remove "КРАТКОЕ ОПИСАНИЕ:" prefix
    cleanSummary = cleanSummary.replace(/^КРАТКОЕ ОПИСАНИЕ:\s*/i, '');

    // 5. Remove leading weight like "55 г" or "55g" at start of string
    cleanSummary = cleanSummary.replace(/^\s*\d+\s*[гg]\s+/i, '');

    // 4. Remove extra slashes or whitespace left over
    cleanSummary = cleanSummary.replace(/^\s*[\/\|]\s*/, '').trim();

    return { weight, cleanSummary };
}

// Render product card in horizontal scroll format
function renderProductCardHorizontal(product) {
    const imageHtml = product.imageUrl
        ? `<div class="product-card-image" onclick="event.stopPropagation(); showProductDetails('${product.id}')"><img src="${product.imageUrl}" alt="${escapeHtml(product.title || 'Товар')}" onerror="this.style.display='none'; this.parentElement.classList.add('no-image');"></div>`
        : `<div class="product-card-image no-image" onclick="event.stopPropagation(); showProductDetails('${product.id}')"><div class="product-image-placeholder-icon">📦</div></div>`;
    const title = cleanProductTitle(product.title || 'Без названия');
    const { weight, cleanSummary } = extractProductWeight(product.summary || product.description || '');
    const summary = escapeHtml(cleanSummary.substring(0, 80));
    const priceRub = product.price ? (product.price * 100).toFixed(0) : '0';
    return `
        <div class="product-card-forma-horizontal" onclick="showProductDetails('${product.id}')">
            ${imageHtml}
            <div class="product-card-content">
                <h3 class="product-card-title">${title}</h3>
                <div class="product-card-footer">
                    <div class="product-card-price">
                        <span class="price-value">${priceRub} ₽</span>
                    </div>
                    <button class="product-card-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">
                        В корзину
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render product card in FORMA Store style (for grid view)
function renderProductCard(product) {
    const imageHtml = product.imageUrl
        ? `<div class="product-card-image" onclick="event.stopPropagation(); showProductDetails('${product.id}')"><img src="${product.imageUrl}" alt="${escapeHtml(product.title || 'Товар')}" onerror="this.style.display='none'; this.parentElement.classList.add('no-image');"></div>`
        : `<div class="product-card-image no-image" onclick="event.stopPropagation(); showProductDetails('${product.id}')"><div class="product-image-placeholder-icon">📦</div></div>`;
    const title = cleanProductTitle(product.title || 'Без названия');
    const { weight, cleanSummary } = extractProductWeight(product.summary || product.description || '');
    const summary = escapeHtml(cleanSummary.substring(0, 100));
    const priceRub = product.price ? (product.price * 100).toFixed(0) : '0';
    return `
        <div class="product-card-forma" onclick="showProductDetails('${product.id}')">
            ${imageHtml}
            <div class="product-card-content">
                <h3 class="product-card-title">${title}</h3>
                <div class="product-card-footer">
                    <div class="product-card-price">
                        <span class="price-value">${priceRub} ₽</span>
                    </div>
                    <button class="product-card-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">
                        В корзину
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render Plazma API product card
function renderPlazmaProductCard(product) {
    const imageHtml = product.imageUrl
        ? `<div class="product-card-image" onclick="event.stopPropagation(); showPlazmaProductDetails('${product.id}')"><img src="${product.imageUrl}" alt="${escapeHtml(product.title || 'Товар')}" onerror="this.style.display='none'; this.parentElement.classList.add('no-image');"></div>`
        : `<div class="product-card-image no-image" onclick="event.stopPropagation(); showPlazmaProductDetails('${product.id}')"><div class="product-image-placeholder-icon">📦</div></div>`;
    const title = cleanProductTitle(product.title || 'Без названия');
    const { weight, cleanSummary } = extractProductWeight(product.summary || product.description || '');
    const summary = escapeHtml(cleanSummary.substring(0, 80));
    const priceRub = product.priceRub || (product.price ? (product.price * 100).toFixed(0) : '0');
    return `
        <div class="product-card-forma-horizontal" onclick="showPlazmaProductDetails('${product.id}')">
            ${imageHtml}
            <div class="product-card-content">
                <h3 class="product-card-title">${title}</h3>
                <div class="product-card-footer">
                    <div class="product-card-price">
                        <span class="price-value">${priceRub} ₽</span>
                    </div>
                    <button class="product-card-btn" onclick="event.stopPropagation(); addPlazmaProductToCart('${product.id}', '${escapeHtml(title)}', ${product.price || 0})">
                        В корзину
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Show Plazma product details
async function showPlazmaProductDetails(productId) {
    try {
        const response = await fetch(`${API_BASE}/plazma/products/${productId}`);
        if (!response.ok) {
            showError('Товар не найден');
            return;
        }

        const result = await response.json();
        const product = result.product || result.data;

        if (!product) {
            showError('Товар не найден');
            return;
        }

        // Открываем детали товара в отдельном окне или показываем информацию
        showPlazmaProductModal(product);
    } catch (error) {
        console.error('Error loading Plazma product:', error);
        showError('Ошибка загрузки товара');
    }
}

// Show Plazma product modal
function showPlazmaProductModal(product) {
    const title = cleanProductTitle(product.title || 'Товар');
    const { weight, cleanSummary } = extractProductWeight(product.description || product.summary || '');
    const description = escapeHtml(cleanSummary || 'Описание отсутствует');
    const priceRub = product.priceRub || (product.price ? (product.price * 100).toFixed(0) : '0');
    const imageUrl = product.imageUrl || '';

    openSection('plazma-product-detail');
    document.getElementById('section-title').textContent = title;
    document.getElementById('section-body').innerHTML = `
        <div class="content-section">
            ${imageUrl ? `<div class="product-image-full"><img src="${imageUrl}" alt="${title}" style="width: 100%; border-radius: 12px;"></div>` : ''}
            <div class="product-details-content">
                <div class="product-details-header">
                    <h2>${title}</h2>
                </div>
                <div class="product-header-row">
                    <div class="product-price">💰 ${priceRub} ₽</div>
                    ${weight ? `<div class="product-weight-badge-large">${weight}</div>` : ''}
                </div>
                <p>${description}</p>
                <button class="btn" onclick="addPlazmaProductToCart('${product.id}', '${escapeHtml(title)}', ${product.price || 0}); closeSection();" style="margin-top: 20px;">
                    🛒 Добавить в корзину
                </button>
            </div>
        </div>
    `;
}

// Add Plazma product to cart (creates a special order request)
async function addPlazmaProductToCart(productId, productTitle, price) {
    try {
        // Создаем заказ через Plazma API
        const response = await fetch(`${API_BASE}/plazma/orders`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                productId: productId,
                productTitle: productTitle,
                price: price,
                quantity: 1
            })
        });

        if (response.ok) {
            showSuccess(`Товар "${productTitle}" добавлен в заказ! Администратор свяжется с вами.`);
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            showError(errorData.error || 'Ошибка добавления товара');
        }
    } catch (error) {
        console.error('Error adding Plazma product:', error);
        showError('Ошибка добавления товара');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Shop content - показываем все товары сразу
async function loadShopContent() {
    try {
        console.log('🛒 Loading shop content...');
        // Загружаем категории и товары
        const [categoriesResponse, productsResponse] = await Promise.all([
            fetch(`${API_BASE}/categories`),
            fetch(`${API_BASE}/products`)
        ]);

        if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
        if (!productsResponse.ok) throw new Error('Failed to fetch products');

        const categories = await categoriesResponse.json();
        const products = await productsResponse.json();

        console.log(`✅ Loaded ${categories?.length || 0} categories and ${products?.length || 0} products`);

        // Группируем товары по категориям
        const productsByCategory = {};
        products.forEach(product => {
            const categoryId = product.category?.id || 'uncategorized';
            if (!productsByCategory[categoryId]) {
                productsByCategory[categoryId] = [];
            }
            productsByCategory[categoryId].push(product);
        });

        // Группируем подкатегории по родительским категориям
        const categoriesByParent = {};
        const mainCategories = [];

        categories.forEach(cat => {
            if (cat.name && cat.name.includes(' > ')) {
                // Это подкатегория
                const parentName = cat.name.split(' > ')[0];
                if (!categoriesByParent[parentName]) {
                    categoriesByParent[parentName] = [];
                }
                categoriesByParent[parentName].push(cat);
            } else {
                // Это основная категория
                mainCategories.push(cat);
            }
        });

        let content = '<div class="products-main-container">';

        // Отображаем каждую подкатегорию как горизонтальную линию
        Object.keys(categoriesByParent).forEach(parentName => {
            const subcategories = categoriesByParent[parentName];

            subcategories.forEach(subcat => {
                const subcatProducts = productsByCategory[subcat.id] || [];
                if (subcatProducts.length === 0) return;

                // Ограничиваем до 9 товаров
                const displayProducts = subcatProducts.slice(0, 9);

                content += `
                    <div class="products-scroll-container">
                        <div class="section-header-inline">
                            <h2 class="section-title-inline" onclick="showCategoryProducts('${subcat.id}')" style="cursor: pointer;">${escapeHtml(subcat.name)}</h2>
                        </div>
                        <div class="products-scroll-wrapper">
                            <div class="products-horizontal">
                `;

                displayProducts.forEach(product => {
                    content += renderProductCardHorizontal(product);
                });

                // Кнопка "Больше" если товаров больше 9
                if (subcatProducts.length > 9) {
                    content += `
                        <div class="product-card-more" onclick="showCategoryProducts('${subcat.id}')">
                            <div class="more-icon">➕</div>
                            <div class="more-text">Больше</div>
                        </div>
                    `;
                }

                content += `
                            </div>
                        </div>
                    </div>
                `;
            });
        });

        // Отображаем основные категории без подкатегорий
        mainCategories.forEach(cat => {
            if (categoriesByParent[cat.name]) return; // Пропускаем, если есть подкатегории

            const catProducts = productsByCategory[cat.id] || [];
            if (catProducts.length === 0) return;

            const displayProducts = catProducts.slice(0, 9);

            content += `
                <div class="products-scroll-container">
                    <div class="section-header-inline">
                        <h2 class="section-title-inline" onclick="showCategoryProducts('${cat.id}')" style="cursor: pointer;">${escapeHtml(cat.name)}</h2>
                    </div>
                    <div class="products-scroll-wrapper">
                        <div class="products-horizontal">
            `;

            displayProducts.forEach(product => {
                content += renderProductCardHorizontal(product);
            });

            if (catProducts.length > 9) {
                content += `
                    <div class="product-card-more" onclick="showCategoryProducts('${cat.id}')">
                        <div class="more-icon">➕</div>
                        <div class="more-text">Больше</div>
                    </div>
                `;
            }

            content += `
                        </div>
                    </div>
                </div>
            `;
        });

        if (Object.keys(categoriesByParent).length === 0 && mainCategories.length === 0) {
            content += `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                    <p style="font-size: 18px; margin-bottom: 20px;">📦 Каталог пока пуст</p>
                </div>
            `;
        }

        content += '</div>';
        return content;
    } catch (error) {
        console.error('❌ Error loading shop content:', error);
        return `
            <div class="error-message">
                <h3>Ошибка загрузки каталога</h3>
                <p>${error?.message || 'Попробуйте позже'}</p>
                <button class="btn" onclick="loadShopContent()" style="margin-top: 20px;">
                    🔄 Попробовать снова
                </button>
            </div>
        `;
    }
}

// Import products function
async function importProducts() {
    try {
        console.log('🤖 Starting product import...');
        showSuccess('Запускаю импорт товаров...');

        const response = await fetch(`${API_BASE}/import-products`, {
            method: 'POST',
            headers: getApiHeaders()
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Импорт запущен! Обновите страницу через минуту.');
            setTimeout(() => {
                location.reload();
            }, 5000);
        } else {
            showError(result.message || 'Ошибка импорта');
        }
    } catch (error) {
        console.error('❌ Error importing products:', error);
        showError('Ошибка запуска импорта');
    }
}

// Partner content
async function loadPartnerContent() {
    return `
        <div class="content-section">
            <h3>Партнёрская программа</h3>
            <p>Станьте партнёром Vital и получайте бонусы 15% + 5% + 5% по вашей ссылке!</p>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="activatePartnerProgram('MULTI_LEVEL')">
                    📈 Многоуровневая 15% + 5% + 5%
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="showPartnerDashboard()">
                    📊 Личный кабинет
                </button>
            </div>
        </div>
    `;
}

// Audio content
async function loadAudioContent() {
    return `
        <div class="content-section">
            <h3>Звуковые матрицы Гаряева</h3>
            <p>Уникальные аудиофайлы для оздоровления, записанные методом Гаряева.</p>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="playAudio('matrix1')">
                    🎵 Матрица 1 - Восстановление
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="playAudio('matrix2')">
                    🎵 Матрица 2 - Энергия
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="playAudio('matrix3')">
                    🎵 Матрица 3 - Гармония
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="playAudio('matrix4')">
                    🎵 Матрица 4 - Исцеление
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="playAudio('matrix5')">
                    🎵 Матрица 5 - Трансформация
                </button>
            </div>
        </div>
    `;
}

// Reviews content
async function loadReviewsContent() {
    try {
        const response = await fetch(`${API_BASE}/reviews`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reviews = await response.json();

        let content = '<div class="content-section"><h3>Отзывы клиентов</h3>';

        if (reviews && reviews.length > 0) {
            reviews.forEach(review => {
                content += `
                    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow-soft);">
                        <h4 style="color: #000000; margin-bottom: 8px;">⭐ ${review.name}</h4>
                        <p style="color: #333333; line-height: 1.6;">${review.content}</p>
                        ${review.link ? `<p style="margin-top: 12px;"><a href="${review.link}" style="color: #000000; text-decoration: underline;">Подробнее</a></p>` : ''}
                    </div>
                `;
            });
        } else {
            content += '<p>Отзывов пока нет</p>';
        }

        content += '</div>';
        return content;
    } catch (error) {
        return '<div class="error-message"><h3>Ошибка загрузки отзывов</h3><p>Попробуйте позже</p></div>';
    }
}

// About content
async function loadAboutContent() {
    return `
        <div class="content-section">
            <h3>О нас</h3>
            <p>Добро пожаловать в Портал здоровья и молодости Vital!</p>
            <p>🛍️ Мы предлагаем широкий ассортимент качественных товаров для здоровья, красоты и благополучия.</p>
            
            <div style="margin: 20px 0;">
                <h4>Почему выбирают нас:</h4>
                <ul style="color: #666666; margin: 12px 0; padding-left: 20px; line-height: 1.8;">
                    <li>✨ Только проверенные и сертифицированные продукты</li>
                    <li>🌿 Натуральные органические товары для всей семьи</li>
                    <li>💧 Косметика и средства по уходу премиум-класса</li>
                    <li>🚀 Быстрая доставка по всей России</li>
                    <li>💎 Индивидуальный подход к каждому клиенту</li>
                </ul>
            </div>
            
            <div style="margin: 20px 0;">
                <h4>Наша миссия:</h4>
                <p style="color: #666666; line-height: 1.6;">
                    Мы заботимся о вашем здоровье и красоте, предлагая только лучшие продукты, 
                    которые помогают чувствовать себя лучше каждый день. Наша цель — сделать 
                    качественные натуральные товары доступными для каждого.
                </p>
            </div>
            
            <div style="margin: 20px 0;">
                <h4>Контакты:</h4>
                <p style="color: #666666;">Свяжитесь с нами, если у вас есть вопросы или нужна консультация.</p>
                <button class="btn btn-secondary" onclick="openSection('support')" style="margin-top: 10px;">
                    💬 Написать в поддержку
                </button>
            </div>
        </div>
    `;
}

// Support content
async function loadSupportContent() {
    return `
        <div class="content-section">
            <h3>Служба поддержки</h3>
            <p>Напишите свой вопрос прямо здесь — команда Vital ответит как можно быстрее.</p>

            <div id="support-chat" style="margin-top: 16px;">
                <div id="support-messages" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; height: 340px; overflow-y: auto;">
                    <div class="loading"><div class="loading-spinner"></div></div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <input id="supportMessageInput" type="text" placeholder="Напишите сообщение…" style="flex: 1; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color);" />
                    <button class="btn" onclick="sendSupportChatMessage()" style="white-space: nowrap;">Отправить</button>
                </div>

                <p style="margin-top: 10px; color: #9ca3af; font-size: 12px;">
                    Поддержка 24/7. Если нужен срочный контакт — напишите номер телефона, и мы перезвоним.
                </p>
            </div>
        </div>
    `;
}

// Chats list (for bottom navigation)
async function loadChatsContent() {
    return `
        <div class="content-section">
            <h3>Чаты</h3>
            <div style="margin-top: 14px; display: grid; gap: 12px;">
                <div class="content-card support-card" onclick="openSection('support')" style="cursor: pointer;">
                    <div class="card-image"></div>
                    <div class="card-content">
                        <h4>Служба поддержки</h4>
                        <p>Написать в поддержку</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Favorites content
async function loadFavoritesContent() {
    return `
        <div class="content-section">
            <h3>Избранное</h3>
            <p>Ваши сохранённые товары и материалы</p>
            
            <div style="margin: 20px 0;">
                <p style="color: #666666; text-align: center;">Пока ничего не добавлено в избранное</p>
            </div>
        </div>
    `;
}

// Action functions

async function addToCart(productId) {
    if (!productId) {
        console.error('❌ No productId provided');
        showError('Ошибка: не указан товар');
        return;
    }

    try {
        console.log('🛒 Adding product to cart:', productId);

        const response = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ productId })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Product added to cart:', result);

            // Анимация корзины
            animateCartIcon();

            // Сразу увеличиваем счетчик на 1 (оптимистичное обновление)
            incrementCartBadge();

            // Загружаем обновленную корзину (счетчик обновится с точными данными)
            await loadCartItems();

            showSuccess('Товар добавлен в корзину!');
        } else {
            // Получаем детали ошибки
            let errorMessage = 'Ошибка добавления в корзину';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                console.error('❌ Add to cart error response:', errorData);
            } catch (e) {
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        errorMessage = errorText;
                    }
                } catch (textError) {
                    console.error('❌ Failed to parse error:', textError);
                }
            }

            console.error('❌ Add to cart error:', response.status, errorMessage);

            if (response.status === 401) {
                showError('Необходимо авторизоваться для добавления в корзину');
            } else if (response.status === 400) {
                showError(errorMessage || 'Неверные данные товара');
            } else if (response.status === 404) {
                showError('Товар не найден');
            } else if (response.status === 503) {
                showError('Сервис временно недоступен. Попробуйте позже.');
            } else {
                showError(errorMessage || 'Ошибка добавления в корзину');
            }
        }
    } catch (error) {
        console.error('❌ Error adding to cart:', error);
        showError('Ошибка добавления в корзину. Проверьте подключение к интернету.');
    }
}

// Анимация иконки корзины при добавлении товара
function animateCartIcon() {
    const cartButton = document.querySelector('.control-btn[onclick="openCart()"]');
    if (cartButton) {
        cartButton.style.transform = 'scale(1.2)';
        cartButton.style.transition = 'transform 0.3s ease';

        setTimeout(() => {
            cartButton.style.transform = 'scale(1)';
        }, 300);
    }

    // Анимация бейджа
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        cartBadge.style.transform = 'scale(1.5)';
        cartBadge.style.transition = 'transform 0.3s ease';

        setTimeout(() => {
            cartBadge.style.transform = 'scale(1)';
        }, 300);
    }
}

async function buyProduct(productId) {
    try {
        const response = await fetch(`${API_BASE}/orders/create`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                items: [{ productId, quantity: 1 }],
                message: 'Покупка через веб-приложение'
            })
        });

        if (response.ok) {
            showSuccess('Заказ создан! Ожидайте подтверждения.');
            // После создания заказа запрашиваем телефон и адрес
            await requestContactAndAddress();
        } else {
            const errorData = await response.json().catch(() => ({}));
            showError(`Ошибка создания заказа: ${errorData.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        console.error('Error creating order:', error);
        showError('Ошибка создания заказа');
    }
}

async function activatePartnerProgram(type) {
    try {
        console.log('🤝 Showing partner program info:', type);

        // Генерируем простой реферальный код для демонстрации
        const referralCode = 'VITAL' + Math.random().toString(36).substr(2, 6).toUpperCase();

        // Создаем реферальную ссылку
        const referralLink = `https://t.me/ivitalbot?start=${referralCode}`;

        // Текст как в боте
        let message = '';
        let shareText = '';

        // Только многоуровневая программа
        if (type === 'MULTI_LEVEL') {
            message = `📈 Многоуровневая система — 15% + 5% + 5%
• 15% с покупок ваших друзей (1-й уровень)
• 5% с покупок их друзей (2-й уровень)
• 5% с покупок следующего уровня (3-й уровень)

💡 Условия бонуса:
• Ваш бонус 10%
• Бонус 15%+5%+5% начнет действовать при Вашей активности 120PZ в месяц

📲 Выбирайте удобный формат и начинайте зарабатывать уже сегодня!`;

            shareText = `Дружище 🌟
Я желаю тебе энергии, здоровья и внутренней силы, поэтому делюсь с тобой этим ботом 💧
Попробуй VITAL — технология будущего, которая реально меняет состояние ⚡️
🔗 Твоя ссылка (сеть 15% + 5% + 5%):
${referralLink}`;
        }

        // Показываем информацию о программе
        showSuccess('Партнёрская программа активирована!');

        // Показываем реферальную ссылку
        setTimeout(() => {
            const content = `
                <div class="content-section">
                    <h3>🎉 Партнёрская программа активирована!</h3>
                    <p>${message}</p>
                    
                    <div style="background: #f9f9f9; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin: 20px 0;">
                        <h4 style="color: #000000; margin-bottom: 8px;">🔗 Ваша реферальная ссылка:</h4>
                        <p style="color: #333333; word-break: break-all; font-family: monospace;">${referralLink}</p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <button class="btn" onclick="copyReferralLink('${referralLink}')">
                            📋 Скопировать ссылку
                        </button>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <button class="btn btn-secondary" onclick="showShareText('${shareText.replace(/'/g, "\\'")}')">
                            📤 Показать текст для отправки
                        </button>
                    </div>
                </div>
            `;

            showProductsSection(content);
        }, 1000);

    } catch (error) {
        console.error('Error showing partner program:', error);
        showError('Ошибка отображения программы');
    }
}

async function showPartnerDashboard() {
    try {
        const response = await fetch(`${API_BASE}/partner/dashboard`);
        const dashboard = await response.json();

        let content = '<div class="content-section">';
        content += '<button class="btn btn-secondary" onclick="openSection(\'partner\')" style="margin-bottom: 20px;">← Назад</button>';
        content += '<h3>Личный кабинет партнёра</h3>';

        if (dashboard) {
            content += `
                <div style="background: #f9f9f9; 
                            border: 1px solid var(--border-color); 
                            border-radius: 12px; 
                            padding: 20px; 
                            margin-bottom: 20px;">
                    <h4 style="color: #000000; margin-bottom: 16px;">📊 Статистика</h4>
                    <p style="color: #333333; margin-bottom: 8px;">💰 Баланс: ${dashboard.balance || 0} PZ</p>
                    <p style="color: #333333; margin-bottom: 8px;">👥 Партнёры: ${dashboard.partners || 0}</p>
                    <p style="color: #333333; margin-bottom: 8px;">🎁 Всего бонусов: ${dashboard.bonus || 0} PZ</p>
                </div>
                
                <div style="margin: 20px 0;">
                    <button class="btn" onclick="showReferralLink()">
                        🔗 Моя реферальная ссылка
                    </button>
                </div>
                
                <div style="margin: 20px 0;">
                    <button class="btn btn-secondary" onclick="showPartners()">
                        👥 Мои партнёры
                    </button>
                </div>
            `;
        } else {
            content += '<p>Сначала активируйте партнёрскую программу</p>';
        }

        content += '</div>';

        document.getElementById('section-body').innerHTML = content;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('section-body').innerHTML = '<div class="error-message"><h3>Ошибка загрузки кабинета</h3><p>Попробуйте позже</p></div>';
    }
}

function playAudio(matrixId) {
    showSuccess(`Воспроизведение матрицы ${matrixId}...`);
    // Здесь можно добавить логику воспроизведения аудио
}

async function showVideo() {
    try {
        console.log('🎥 Getting video URL...');

        // Получаем ссылку на видео с сервера
        const response = await fetch(`${API_BASE}/video/url`);
        if (response.ok) {
            const data = await response.json();
            const videoUrl = data.videoUrl;

            console.log('✅ Video URL received:', videoUrl);

            if (tg && tg.openLink) {
                // Открываем видео в Telegram
                tg.openLink(videoUrl);
            } else if (tg && tg.openTelegramLink) {
                // Альтернативный способ открытия ссылки
                tg.openTelegramLink(videoUrl);
            } else {
                // Fallback - открываем в новом окне/вкладке
                window.open(videoUrl, '_blank');
            }
        } else {
            console.error('Failed to get video URL:', response.status);
            showError('Ошибка получения ссылки на видео');
        }
    } catch (error) {
        console.error('Error getting video URL:', error);
        showError('Ошибка открытия видео');
    }
}

function openTelegram() {
    // Ссылка на Telegram канал (замените на реальную)
    const telegramUrl = 'https://t.me/your_channel_username'; // Замените на реальную ссылку

    if (tg && tg.openLink) {
        // Открываем Telegram канал в Telegram
        tg.openLink(telegramUrl);
    } else if (tg && tg.openTelegramLink) {
        // Альтернативный способ открытия ссылки
        tg.openTelegramLink(telegramUrl);
    } else {
        // Fallback - открываем в новом окне/вкладке
        window.open(telegramUrl, '_blank');
    }
}

// Функции для партнёрской программы

function showShareText(text) {
    const content = `
        <div class="content-section">
            <h3>📤 Текст для отправки друзьям</h3>
            <div style="background: linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%); 
                        border: 1px solid rgba(255, 255, 255, 0.1); 
                        border-radius: 12px; 
                        padding: 16px; 
                        margin: 20px 0;">
                <p style="color: #ffffff; white-space: pre-line; line-height: 1.5;">${text}</p>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="copyShareText('${text.replace(/'/g, "\\'")}')">
                    📋 Скопировать текст
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="showPartnerProgram()">
                    ← Назад к программе
                </button>
            </div>
        </div>
    `;

    showProductsSection(content);
}

function copyShareText(text) {
    try {
        navigator.clipboard.writeText(text).then(() => {
            showSuccess('Текст скопирован в буфер обмена!');
        }).catch(() => {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showSuccess('Текст скопирован!');
        });
    } catch (error) {
        console.error('Error copying text:', error);
        showError('Не удалось скопировать текст');
    }
}

function showPartnerProgram() {
    const content = `
        <div class="content-section">
            <h3>Партнёрская программа</h3>
            <p>Станьте партнёром Vital и получайте бонусы 15% + 5% + 5% по вашей ссылке!</p>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="activatePartnerProgram('MULTI_LEVEL')">
                    📈 Многоуровневая 15% + 5% + 5%
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="showPartnerDashboard()">
                    📊 Личный кабинет
                </button>
            </div>
        </div>
    `;

    showProductsSection(content);
}

// Support chat (webapp)
let supportMessages = [];

function initSupportChat() {
    // Only run if the section is present
    const box = document.getElementById('support-messages');
    if (!box) return;

    // Enter-to-send
    const input = document.getElementById('supportMessageInput');
    if (input && !input.__supportEnterBound) {
        input.__supportEnterBound = true;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendSupportChatMessage();
            }
        });
    }

    loadSupportChatMessages();
}

function renderSupportMessages() {
    const box = document.getElementById('support-messages');
    if (!box) return;

    if (!supportMessages || supportMessages.length === 0) {
        box.innerHTML = `
            <div style="text-align:center; padding: 24px 10px; color:#6b7280;">
                <p style="margin:0 0 8px 0;">Сообщений пока нет</p>
                <p style="margin:0; font-size:12px;">Напишите нам — мы ответим как можно быстрее.</p>
            </div>
        `;
        return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
    supportMessages.forEach((m) => {
        const isUser = m.direction === 'user';
        const align = isUser ? 'flex-end' : 'flex-start';
        const bg = isUser ? '#111827' : '#f3f4f6';
        const color = isUser ? '#ffffff' : '#111827';
        const time = m.createdAt ? new Date(m.createdAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

        html += `
            <div style="display:flex; justify-content:${align};">
                <div style="max-width: 85%; background:${bg}; color:${color}; border-radius: 14px; padding: 10px 12px; line-height:1.35;">
                    <div style="white-space:pre-wrap; word-break:break-word;">${escapeHtml(m.text || '')}</div>
                    ${time ? `<div style="margin-top:6px; font-size:11px; opacity:0.7; text-align:right;">${escapeHtml(time)}</div>` : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';

    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
}

async function loadSupportChatMessages() {
    const box = document.getElementById('support-messages');
    if (!box) return;

    try {
        const response = await fetch(`${API_BASE}/support/messages`, { headers: getApiHeaders() });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Failed to load support messages: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        supportMessages = Array.isArray(data) ? data : [];
        renderSupportMessages();
    } catch (error) {
        console.error('❌ Error loading support messages:', error);
        box.innerHTML = `
            <div class="error-message">
                <h3>Ошибка загрузки чата</h3>
                <p>Попробуйте обновить страницу.</p>
                <button class="btn" onclick="loadSupportChatMessages()" style="margin-top:12px;">Обновить</button>
            </div>
        `;
    }
}

async function sendSupportChatMessage() {
    const input = document.getElementById('supportMessageInput');
    const text = (input?.value || '').trim();
    if (!text) return;

    try {
        if (input) input.value = '';
        // Optimistic UI
        supportMessages = [...(supportMessages || []), { direction: 'user', text, createdAt: new Date().toISOString() }];
        renderSupportMessages();

        const response = await fetch(`${API_BASE}/support/messages`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.error || `HTTP ${response.status}`);
        }

        // Refresh from server (ensures order + IDs)
        await loadSupportChatMessages();
    } catch (error) {
        console.error('❌ Error sending support message:', error);
        showError('Не удалось отправить сообщение. Попробуйте еще раз.');
        // Reload to avoid diverging optimistic state
        await loadSupportChatMessages().catch(() => {});
    }
}

function showReferralLink() {
    showSuccess('Копирование реферальной ссылки...');
    // Здесь можно добавить логику показа ссылки
}

async function showPartners() {
    try {
        const response = await fetch(`${API_BASE}/partner/referrals`, { headers: getApiHeaders() });
        if (!response.ok) {
            throw new Error('Failed to fetch referrals');
        }

        const data = await response.json();
        const directPartners = data.directPartners || [];
        const multiPartners = data.multiPartners || [];

        let html = '<div class="partners-list-container">';
        html += '<h3>👥 Мои рефералы</h3>';

        if (directPartners.length === 0 && multiPartners.length === 0) {
            html += '<p>Пока нет рефералов. Приглашайте друзей по вашей реферальной ссылке!</p>';
        } else {
            if (directPartners.length > 0) {
                html += '<h4>🎯 Прямые рефералы (1-й уровень)</h4>';
                html += '<ul class="referrals-list">';
                directPartners.forEach((partner, index) => {
                    const displayName = partner.username ? `@${partner.username}` : (partner.firstName || `ID:${partner.telegramId?.slice(-5) || ''}`);
                    const joinedDate = partner.joinedAt ? new Date(partner.joinedAt).toLocaleDateString('ru-RU') : '';
                    html += `<li>${index + 1}. ${escapeHtml(displayName)}${joinedDate ? ` (с ${joinedDate})` : ''}</li>`;
                });
                html += '</ul>';
            }

            if (multiPartners.length > 0) {
                html += '<h4>🌳 Многоуровневые рефералы</h4>';
                html += '<ul class="referrals-list">';
                multiPartners.forEach((partner, index) => {
                    const displayName = partner.username ? `@${partner.username}` : (partner.firstName || `ID:${partner.telegramId?.slice(-5) || ''}`);
                    const level = partner.level || 2;
                    const joinedDate = partner.joinedAt ? new Date(partner.joinedAt).toLocaleDateString('ru-RU') : '';
                    html += `<li>${index + 1}. ${escapeHtml(displayName)} (${level}-й уровень)${joinedDate ? ` - с ${joinedDate}` : ''}</li>`;
                });
                html += '</ul>';
            }
        }

        html += '</div>';

        const container = document.getElementById('section-body');
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading partners:', error);
        showError('Ошибка загрузки списка рефералов');
    }
}

// Show products section with custom content
function showProductsSection(content) {
    currentSection = 'shop';
    const overlay = document.getElementById('section-overlay');
    const title = document.getElementById('section-title');
    const body = document.getElementById('section-body');

    // Set section title
    title.textContent = 'Товары';

    // Set custom content
    body.innerHTML = content;

    // Show overlay
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.add('open');
    }, 10);
}

// Show instruction modal
function showInstruction(productId, instructionText) {
    const modal = document.createElement('div');
    modal.className = 'instruction-modal';
    modal.innerHTML = `
        <div class="instruction-overlay" onclick="closeInstruction()">
            <div class="instruction-content" onclick="event.stopPropagation()">
                <div class="instruction-header">
                    <h3>📋 Инструкция по применению</h3>
                    <button class="btn-close" onclick="closeInstruction()">×</button>
                </div>
                <div class="instruction-body">
                    <div class="instruction-text">${instructionText.replace(/\n/g, '<br>')}</div>
                </div>
                <div class="instruction-footer">
                    <button class="btn btn-secondary" onclick="closeInstruction()">Закрыть</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add animation
    setTimeout(() => {
        modal.querySelector('.instruction-content').style.transform = 'scale(1)';
    }, 10);
}

// Close instruction modal
function closeInstruction() {
    const modal = document.querySelector('.instruction-modal');
    if (modal) {
        modal.querySelector('.instruction-content').style.transform = 'scale(0.8)';
        setTimeout(() => {
            modal.remove();
        }, 200);
    }
}

// Show category products
async function showCategoryProducts(categoryId) {
    try {
        const response = await fetch(`${API_BASE}/categories/${categoryId}/products`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();

        let content = `
            <div class="content-section">
                    <button class="btn-back-to-catalog" onclick="openSection('shop')">
                        ← Назад к каталогу
                    </button>
                <h3>Товары категории</h3>
        `;

        if (products && products.length > 0) {
            content += '<div class="products-grid">';
            products.forEach(product => {
                content += `
                    <div class="product-tile">
                        ${product.imageUrl ? `<div class="product-image" onclick="showProductDetails('${product.id}')"><img src="${product.imageUrl}" alt="${product.title}" onerror="this.style.display='none'"></div>` : '<div class="product-image-placeholder" onclick="showProductDetails(\'' + product.id + '\')">📦</div>'}
                        <h4 onclick="showProductDetails('${product.id}')">${product.title}</h4>
                        <div class="product-description" onclick="showProductDetails('${product.id}')">${product.summary || product.description || 'Описание товара'}</div>
                        <div class="product-actions">
                            <button class="btn-add-to-cart" onclick="addToCart('${product.id}')">
                                🛒 В корзину
                            </button>
                            <button class="btn-buy" onclick="buyProduct('${product.id}')">
                                🛍 Купить
                            </button>
                            ${product.instruction ? `<button class="btn-instruction" onclick="showInstruction('${product.id}', \`${product.instruction.replace(/`/g, '\\`')}\`)">📋 Инструкция</button>` : ''}
                        </div>
                    </div>
                `;
            });
            content += '</div>';
        } else {
            content += '<p>В этой категории пока нет товаров</p>';
        }

        content += '</div>';

        // Show the products section
        showProductsSection(content);
    } catch (error) {
        console.error('Error loading category products:', error);
        showError('Ошибка загрузки товаров');
    }
}

// NOTE: do not add duplicate addToCart/buyProduct implementations below.

// Contact and address collection functions
async function requestContactAndAddress() {
    // Сначала проверяем, есть ли у пользователя уже сохраненные данные
    const user = await loadUserData();

    if (user && user.phone && user.deliveryAddress) {
        // У пользователя есть и телефон и адрес - показываем подтверждение
        await showAddressConfirmation(user.deliveryAddress);
    } else if (user && user.phone) {
        // Есть только телефон - запрашиваем адрес
        await requestDeliveryAddress();
    } else {
        // Нет ни телефона, ни адреса - запрашиваем телефон
        await requestPhoneNumber();
    }
}

async function requestPhoneNumber() {
    const content = `
        <div class="content-section">
            <h3>📞 Номер телефона</h3>
            <p>Для быстрой связи поделитесь своим номером телефона:</p>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="shareContact()">
                    📞 Поделиться контактом
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="enterPhoneManually()">
                    ✏️ Ввести номер вручную
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="skipPhone()">
                    ⏭️ Пропустить
                </button>
            </div>
        </div>
    `;

    showProductsSection(content);
}

async function requestDeliveryAddress() {
    const content = `
        <div class="content-section">
            <h3>📍 Адрес доставки</h3>
            <p>Укажите адрес для доставки заказа:</p>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="selectAddressType('bali')">
                    🇮🇩 Бали - район и вилла
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="selectAddressType('russia')">
                    🇷🇺 РФ - город и адрес
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="selectAddressType('custom')">
                    ✏️ Ввести свой вариант
                </button>
            </div>
            
            <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <button class="btn btn-outline" onclick="skipAddress()" style="margin-right: 10px;">
                    ⏭️ Пропустить
                </button>
                <button class="btn btn-outline" onclick="closeSection()">
                    ❌ Отмена
                </button>
            </div>
        </div>
    `;

    showProductsSection(content);
}

async function showAddressConfirmation(address) {
    const content = `
        <div class="content-section">
            <h3>📍 Подтверждение адреса</h3>
            <p>Вам доставить на этот адрес?</p>
            
            <div style="background: #f9f9f9; 
                        border: 1px solid var(--border-color); 
                        border-radius: 12px; 
                        padding: 16px; 
                        margin: 20px 0;">
                <p style="color: #000000; font-weight: bold;">${address}</p>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="confirmAddress('${address}')">
                    💾 Сохранить и продолжить
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-secondary" onclick="changeAddress()">
                    ✏️ Изменить адрес
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-outline" onclick="skipAddress()">
                    ⏭️ Пропустить адрес
                </button>
            </div>
        </div>
    `;

    showProductsSection(content);
}

// Contact sharing functions
async function shareContact() {
    if (tg && tg.requestContact) {
        try {
            const contact = await tg.requestContact();
            if (contact && contact.phone_number) {
                await savePhoneNumber(contact.phone_number);
                await requestDeliveryAddress();
            }
        } catch (error) {
            console.error('Error requesting contact:', error);
            showError('Ошибка получения контакта');
        }
    } else {
        // Fallback to manual input if Telegram API is not available
        await enterPhoneManually();
    }
}

async function enterPhoneManually() {
    const phone = prompt('Введите номер телефона:');
    if (phone) {
        await savePhoneNumber(phone);
        await requestDeliveryAddress();
    }
}

async function skipPhone() {
    await requestDeliveryAddress();
}

async function savePhoneNumber(phone) {
    try {
        const response = await fetch(`${API_BASE}/user/phone`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ phone })
        });

        if (response.ok) {
            showSuccess('Номер телефона сохранен!');
        } else {
            showError('Ошибка сохранения номера');
        }
    } catch (error) {
        console.error('Error saving phone:', error);
        showError('Ошибка сохранения номера');
    }
}

// Address functions
async function selectAddressType(type) {
    let title = '';
    let placeholder = '';
    let example = '';

    switch (type) {
        case 'bali':
            title = '🇮🇩 Адрес для Бали';
            placeholder = 'Например: Семиньяк, Villa Seminyak Resort';
            example = 'Укажите район и название виллы';
            break;
        case 'russia':
            title = '🇷🇺 Адрес для России';
            placeholder = 'Например: Москва, ул. Тверская, д. 10, кв. 5';
            example = 'Укажите город и точный адрес';
            break;
        case 'custom':
            title = '✏️ Ваш адрес';
            placeholder = 'Введите полный адрес доставки';
            example = 'Укажите адрес в произвольной форме';
            break;
    }

    const content = `
        <div class="content-section">
            <h3>${title}</h3>
            <p>${example}:</p>
            
            <div style="margin: 20px 0;">
                <input type="text" id="addressInput" placeholder="${placeholder}" 
                       style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); 
                              background: rgba(255, 255, 255, 0.1); color: white; font-size: 16px;">
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="saveAddressFromInput('${type}')">
                    💾 Сохранить адрес
                </button>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn btn-outline" onclick="requestDeliveryAddress()">
                    ← Назад к выбору
                </button>
            </div>
        </div>
    `;

    showProductsSection(content);

    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('addressInput');
        if (input) {
            input.focus();
        }
    }, 100);
}

async function saveAddressFromInput(type) {
    const input = document.getElementById('addressInput');
    const address = input ? input.value.trim() : '';

    if (!address) {
        showError('Пожалуйста, введите адрес');
        return;
    }

    await saveDeliveryAddress(type, address);
}

async function skipAddress() {
    showSuccess('Адрес пропущен. Заказ будет обработан без указания адреса.');
    closeSection();
}

async function changeAddress() {
    await requestDeliveryAddress();
}

async function saveDeliveryAddress(type, address) {
    try {
        const fullAddress = `${type}: ${address}`;
        const response = await fetch(`${API_BASE}/user/address`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ address: fullAddress })
        });

        if (response.ok) {
            showSuccess('Адрес сохранен!');
            closeSection();
        } else {
            showError('Ошибка сохранения адреса');
        }
    } catch (error) {
        console.error('Error saving address:', error);
        showError('Ошибка сохранения адреса');
    }
}

async function confirmAddress(address) {
    showSuccess('Адрес подтвержден! Заказ будет доставлен по указанному адресу.');
    closeSection();
}

async function changeAddress() {
    await requestDeliveryAddress();
}

// New section content loaders
function loadCertificatesContent() {
    return `
        <div class="content-section">
            <h3>🎁 Подарочные сертификаты</h3>
            <p>Скоро здесь будут доступны подарочные сертификаты!</p>
        </div>
    `;
}

function loadPromotionsContent() {
    return `
        <div class="content-section">
            <h3>🎉 Акции и скидки</h3>
            <p>Следите за нашими акциями и специальными предложениями!</p>
        </div>
    `;
}

function loadContactsContent() {
    return `
        <div class="content-section">
            <h3>📞 Контакты</h3>
            <div class="contacts-list">
                <div class="contact-item">
                    <strong>Телефон:</strong>
                    <a href="tel:+79999999999">+7 (999) 999-99-99</a>
                </div>
                <div class="contact-item">
                    <strong>Email:</strong>
                    <a href="mailto:info@vital.ru">info@vital.ru</a>
                </div>
                <div class="contact-item">
                    <strong>Telegram:</strong>
                    <a href="https://t.me/ivitalbot" target="_blank">@ivitalbot</a>
                </div>
                <div class="contact-item">
                    <strong>ВКонтакте:</strong>
                    <a href="https://vk.com/ivital" target="_blank">vk.com/ivital</a>
                </div>
                <div class="contact-item">
                    <strong>Instagram:</strong>
                    <a href="https://www.instagram.com/ivitalnano/" target="_blank">@ivitalnano</a>
                </div>
            </div>
        </div>
    `;
}

// Balance top-up dialog
function showBalanceTopUpDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'balance-topup-modal';
    dialog.innerHTML = `
        <div class="balance-topup-overlay" onclick="closeBalanceTopUpDialog()"></div>
        <div class="balance-topup-content">
            <div class="balance-topup-header">
                <h3>💰 Пополнить баланс</h3>
                <button class="balance-topup-close" onclick="closeBalanceTopUpDialog()">×</button>
            </div>
            <div class="balance-topup-body">
                <p style="margin-bottom: 16px; color: var(--text-secondary);">Для пополнения баланса перейдите в бота и используйте команду:</p>
                <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <code style="font-size: 16px; font-weight: 600; color: var(--accent);">/add_balance</code>
                </div>
                <p style="margin-bottom: 16px; color: var(--text-secondary);">Или нажмите кнопку ниже для быстрого перехода:</p>
                <button class="btn" onclick="openBotForBalance()" style="width: 100%; margin-bottom: 12px;">
                    📱 Перейти в бота
                </button>
                <button class="btn btn-secondary" onclick="closeBalanceTopUpDialog()" style="width: 100%;">
                    Отмена
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    setTimeout(() => dialog.classList.add('open'), 10);
}

function closeBalanceTopUpDialog() {
    const dialog = document.querySelector('.balance-topup-modal');
    if (dialog) {
        dialog.classList.remove('open');
        setTimeout(() => dialog.remove(), 300);
    }
}

function openBotForBalance() {
    // Открываем бота с командой пополнения баланса
    const botUsername = 'Vital_shop_bot';
    const botUrl = `https://t.me/${botUsername}?start=add_balance`;

    // Пытаемся открыть через Telegram WebApp
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(botUrl);
    } else {
        // Fallback: открываем в новом окне
        window.open(botUrl, '_blank');
    }

    closeBalanceTopUpDialog();
}

// Показать форму доставки
function showDeliveryForm(items, total, userBalance) {
    // Загружаем данные пользователя для предзаполнения
    fetch(`${API_BASE}/user/profile`, { headers: getApiHeaders() })
        .then(response => response.ok ? response.json() : {})
        .then(userData => {
            const dialog = document.createElement('div');
            dialog.className = 'delivery-form-modal';
            dialog.innerHTML = `
                <div class="delivery-form-overlay" onclick="closeDeliveryForm()"></div>
                <div class="delivery-form-content">
                    <div class="delivery-form-header">
                        <h3>📦 Оформление заказа</h3>
                        <button class="delivery-form-close" onclick="closeDeliveryForm()">×</button>
                    </div>
                    <div class="delivery-form-body">
                        <div style="margin-bottom: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>💰 Ваш баланс:</span>
                                <strong>${userBalance.toFixed(2)} PZ</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>📦 Сумма заказа:</span>
                                <strong>${total.toFixed(2)} PZ</strong>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">Телефон *</label>
                            <input type="tel" id="delivery-phone" class="delivery-input" placeholder="+7 (999) 123-45-67" value="${userData.phone || ''}" required>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">Адрес доставки *</label>
                            <textarea id="delivery-address" class="delivery-textarea" placeholder="Город, улица, дом, квартира" rows="3" required>${userData.deliveryAddress || ''}</textarea>
                        </div>
                        
                        ${userBalance >= total ? `
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; cursor: pointer;">
                                <input type="checkbox" id="pay-from-balance" checked>
                                <span>Оплатить с баланса (${total.toFixed(2)} PZ)</span>
                            </label>
                        ` : userBalance > 0 ? `
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; cursor: pointer;">
                                <input type="checkbox" id="pay-from-balance-partial" checked>
                                <span>Использовать баланс (${userBalance.toFixed(2)} PZ из ${total.toFixed(2)} PZ)</span>
                            </label>
                        ` : ''}
                        
                        <button class="btn" onclick="submitDeliveryForm(${JSON.stringify(items).replace(/"/g, '&quot;')}, ${total}, ${userBalance})" style="width: 100%;">
                            Оформить заказ
                        </button>
                        <button class="btn btn-secondary" onclick="closeDeliveryForm()" style="width: 100%; margin-top: 12px;">
                            Отмена
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
            setTimeout(() => dialog.classList.add('open'), 10);
        })
        .catch(error => {
            console.error('Error loading user data:', error);
            showError('Ошибка загрузки данных пользователя');
        });
}

function closeDeliveryForm() {
    const dialog = document.querySelector('.delivery-form-modal');
    if (dialog) {
        dialog.classList.remove('open');
        setTimeout(() => dialog.remove(), 300);
    }
}

async function submitDeliveryForm(items, total, userBalance) {
    const phone = document.getElementById('delivery-phone')?.value?.trim();
    const address = document.getElementById('delivery-address')?.value?.trim();
    const payFromBalance = document.getElementById('pay-from-balance')?.checked || false;
    const payFromBalancePartial = document.getElementById('pay-from-balance-partial')?.checked || false;

    if (!phone) {
        showError('Укажите номер телефона');
        return;
    }

    if (!address) {
        showError('Укажите адрес доставки');
        return;
    }

    // Сохраняем телефон и адрес
    try {
        await fetch(`${API_BASE}/user/profile`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ phone, deliveryAddress: address })
        });
    } catch (error) {
        console.error('Error saving user data:', error);
    }

    // Определяем способ оплаты
    if (payFromBalance && userBalance >= total) {
        // Полная оплата с баланса
        await processOrderWithBalance(items, total, null, phone, address);
    } else if (payFromBalancePartial && userBalance > 0) {
        // Частичная оплата с баланса
        await processOrderWithBalance(items, total, userBalance, phone, address);
    } else {
        // Обычная оплата
        await processOrderNormal(items, phone, address);
    }

    closeDeliveryForm();
}

// Utility functions
async function loadUserData() {
    try {
        const response = await fetch(`${API_BASE}/user/profile`, { headers: getApiHeaders() });
        if (response.ok) {
            userData = await response.json();
        } else if (response.status === 401) {
            console.log('User not authenticated - this is normal for web preview');
            userData = null;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        userData = null;
    }
}

async function loadCartItems() {
    try {
        console.log('🛒 Loading cart items...');
        const response = await fetch(`${API_BASE}/cart/items`, { headers: getApiHeaders() });
        if (response.ok) {
            cartItems = await response.json();
            console.log('✅ Cart items loaded:', cartItems.length);

            // Фильтруем валидные товары
            cartItems = cartItems.filter(item => item.product && item.product.isActive);
        } else if (response.status === 401) {
            console.log('User not authenticated - this is normal for web preview');
            cartItems = [];
        } else {
            console.error('Failed to load cart items:', response.status);
            cartItems = [];
        }

        // Обновляем счетчик корзины после загрузки
        updateCartBadge();
        console.log(`🛒 Cart items: ${cartItems.length} items`);
    } catch (error) {
        console.error('Error loading cart items:', error);
        cartItems = [];
        updateCartBadge();
        console.log('🛒 Cart items: 0 items (error)');
    }
}

// Load product count for shop badge
async function loadProductCount() {
    try {
        console.log('📦 Loading product count...');
        const response = await fetch(`${API_BASE}/products/count`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Product count data:', data);
            const shopBadge = document.getElementById('shop-badge');
            if (shopBadge) {
                shopBadge.textContent = data.totalProducts || '0';
                console.log(`📦 Shop badge updated: ${data.totalProducts || '0'} products`);
            } else {
                console.log('❌ Shop badge element not found');
            }
        } else {
            console.error('❌ Failed to load product count:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading product count:', error);
    }
}

// Load reviews count for reviews badge
async function loadReviewsCount() {
    try {
        const response = await fetch(`${API_BASE}/reviews/count`);
        if (response.ok) {
            const data = await response.json();
            const reviewsBadge = document.getElementById('reviews-badge');
            if (reviewsBadge) {
                reviewsBadge.textContent = data.totalReviews || '0';
            }
        }
    } catch (error) {
        console.error('Error loading reviews count:', error);
    }
}

function updateCartBadge() {
    try {
        // Calculate total quantity of items in cart
        let totalQuantity = 0;
        if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
            totalQuantity = cartItems.reduce((sum, item) => {
                // Пропускаем товары без продукта
                if (!item.product || !item.product.isActive) {
                    return sum;
                }
                return sum + (item.quantity || 1);
            }, 0);
        }

        // Update cart badge with item count
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            if (totalQuantity > 0) {
                cartBadge.textContent = totalQuantity.toString();
                cartBadge.style.display = 'grid';
                cartBadge.classList.add('animate');
                setTimeout(() => cartBadge.classList.remove('animate'), 300);
            } else {
                cartBadge.textContent = '0';
                cartBadge.style.display = 'none';
            }
        } else {
            console.warn('⚠️ Cart badge element not found');
        }

        console.log(`🛒 Cart badge updated: ${totalQuantity} items`);
    } catch (error) {
        console.error('Error updating cart badge:', error);
    }
}

// Принудительное обновление счетчика корзины
async function refreshCartBadge() {
    try {
        await loadCartItems();
        updateCartBadge();
    } catch (error) {
        console.error('Error refreshing cart badge:', error);
    }
}

// Оптимистичное увеличение счетчика корзины (до загрузки данных)
function incrementCartBadge() {
    try {
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            const currentCount = parseInt(cartBadge.textContent) || 0;
            const newCount = currentCount + 1;
            cartBadge.textContent = newCount.toString();
            cartBadge.style.display = 'grid';
            cartBadge.classList.add('animate');
            setTimeout(() => cartBadge.classList.remove('animate'), 300);
            console.log(`🛒 Cart badge incremented: ${newCount}`);
        }
    } catch (error) {
        console.error('Error incrementing cart badge:', error);
    }
}

function updateBadges() {
    // Update shop badge with total products count (not cart sum)
    loadProductCount();

    // Update reviews badge with total reviews count
    loadReviewsCount();

    // Update other badges based on data
    // This would be populated from actual data
}

function showSuccess(message) {
    // Show success message (could be a toast notification)
    console.log('Success:', message);
    if (tg) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

function showError(message) {
    // Show error message (could be a toast notification)
    console.log('Error:', message);
    if (tg) {
        tg.showAlert(message);
    } else {
        alert(message);
    }

    // Close any open sections on error
    if (currentSection) {
        closeSection();
    }
}

// Search functionality
document.querySelector('.search-input').addEventListener('input', function (e) {
    const query = e.target.value.toLowerCase();
    if (query.length > 2) {
        // Implement search logic here
        console.log('Searching for:', query);
    }
});

// Keyboard navigation
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentSection) {
        closeSection();
    }
});

// Handle back button
window.addEventListener('popstate', function (e) {
    if (currentSection) {
        closeSection();
    }
});

// Show product details function
async function showProductDetails(productId) {
    try {
        console.log('📖 Showing product details for:', productId);

        const response = await fetch(`${API_BASE}/products/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }

        const product = await response.json();

        // Create detailed product view
        let content = `
            <div class="product-details">
                <div class="product-details-header">
                    <h2>${cleanProductTitle(product.title)}</h2>
                </div>
                
                <div class="product-details-content">
                    ${product.imageUrl ? `<div class="product-details-image"><img src="${product.imageUrl}" alt="${product.title}" onerror="this.style.display='none'"></div>` : ''}
                    
                    <div class="product-details-info">
                        <div class="product-header-row">
                            <div class="product-price">💰 Цена: ${(product.price * 100).toFixed(2)} ₽ / ${product.price} PZ</div>
                            ${extractProductWeight(product.summary).weight ? `<div class="product-weight-badge-large">${extractProductWeight(product.summary).weight}</div>` : ''}
                        </div>
                        
                        ${product.summary ? `<div class="product-summary"><h4>Краткое описание:</h4><p>${product.summary}</p></div>` : ''}
                        
                        ${product.description ? `<div class="product-description-full"><h4>Подробное описание:</h4><p>${product.description}</p></div>` : ''}
                        
                        ${product.instruction ? `<div class="product-instruction"><h4>📋 Инструкция по применению:</h4><p>${product.instruction}</p></div>` : ''}
                    </div>
                    
                    <div class="product-details-actions">
                        <button class="btn-add-to-cart" onclick="addToCart('${product.id}')">
                            🛒 В корзину
                        </button>
                        <button class="btn-buy" onclick="buyProduct('${product.id}')">
                            🛍 Купить
                        </button>
                        ${product.instruction ? `<button class="btn-instruction" onclick="showInstruction('${product.id}', \`${product.instruction.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">📋 Инструкция</button>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Show the product details section
        showProductsSection(content);

    } catch (error) {
        console.error('Error loading product details:', error);
        showError('Ошибка загрузки подробной информации о товаре');
    }
}
