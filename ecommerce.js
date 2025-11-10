// E-commerce JavaScript functionality

// Cart state
let cart = [];
let cartTotal = 0;

// Wishlist state
let wishlist = [];

// Theme state
let isDarkTheme = false;

// Current filter state
let currentFilter = 'all';

// DOM elements
let cartSidebar, cartOverlay, cartItems, cartCount, cartTotalElement, themeToggle;
let wishlistSidebar, wishlistOverlay, wishlistItems, wishlistCount, wishlistTotalCount;

// Initialize the app - wait for auth gate first
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthGate().then(() => {
        // Initialize DOM elements
        cartSidebar = document.getElementById('cart-sidebar');
        cartOverlay = document.getElementById('cart-overlay');
        cartItems = document.getElementById('cart-items');
        cartCount = document.getElementById('cart-count');
        cartTotalElement = document.getElementById('cart-total');
        themeToggle = document.getElementById('theme-toggle');
        
        wishlistSidebar = document.getElementById('wishlist-sidebar');
        wishlistOverlay = document.getElementById('wishlist-overlay');
        wishlistItems = document.getElementById('wishlist-items');
        wishlistCount = document.getElementById('wishlist-count');
        wishlistTotalCount = document.getElementById('wishlist-total-count');
        
        loadTheme();
        loadWishlist();
        updateCartDisplay();
        updateWishlistDisplay();
        initializeCategoryFilter();
        initializeContactForm();
    });
});

// ---------- Auth Gate (Login / Create Account) ----------
function isAuthenticated() {
    try {
        return !!localStorage.getItem('qz_auth_user');
    } catch { return false; }
}

function setAuthenticated(email) {
    try {
        localStorage.setItem('qz_auth_user', email || 'guest@local');
    } catch {}
}

function initializeAuthGate() {
    return new Promise(resolve => {
        // If already authenticated, proceed immediately
        if (isAuthenticated()) {
            resolve();
            return;
        }
        // Build overlay + modal
        const overlay = document.createElement('div');
        overlay.className = 'auth-overlay show';
        overlay.id = 'auth-overlay';
        overlay.innerHTML = `
            <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
                <div class="auth-header">
                    <button class="auth-tab active" id="tab-login" type="button">Log in</button>
                    <button class="auth-tab" id="tab-signup" type="button">Create account</button>
                </div>
                <div class="auth-body">
                    <h3 class="auth-title" id="auth-title">Welcome to QZ Stores</h3>
                    <p class="auth-desc">Log in or create an account to continue.</p>
                    <form id="auth-form" class="auth-form" novalidate>
                        <div class="form-group">
                            <label for="auth-email">Email *</label>
                            <input type="email" id="auth-email" name="email" required inputmode="email" autocomplete="email" aria-describedby="auth-email-error">
                            <small class="auth-error" id="auth-email-error"></small>
                        </div>
                        <div class="form-group" id="name-group" style="display:none">
                            <label for="auth-name">Full name *</label>
                            <input type="text" id="auth-name" name="name" minlength="2" autocomplete="name" aria-describedby="auth-name-error">
                            <small class="auth-error" id="auth-name-error"></small>
                        </div>
                        <div class="form-group">
                            <label for="auth-password">Password *</label>
                            <input type="password" id="auth-password" name="password" required minlength="6" aria-describedby="auth-password-error" autocomplete="current-password">
                            <small class="auth-error" id="auth-password-error"></small>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="auth-btn" id="auth-submit">Continue</button>
                            <div class="auth-note">By continuing, you agree to our simple terms.</div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const tabLogin = overlay.querySelector('#tab-login');
        const tabSignup = overlay.querySelector('#tab-signup');
        const nameGroup = overlay.querySelector('#name-group');
        const form = overlay.querySelector('#auth-form');
        const submitBtn = overlay.querySelector('#auth-submit');

        let mode = 'login';
        tabLogin.addEventListener('click', () => {
            mode = 'login';
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            nameGroup.style.display = 'none';
            submitBtn.textContent = 'Log in';
            form.querySelector('#auth-password').setAttribute('autocomplete', 'current-password');
            clearAuthErrors(form);
        });
        tabSignup.addEventListener('click', () => {
            mode = 'signup';
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            nameGroup.style.display = '';
            submitBtn.textContent = 'Create account';
            form.querySelector('#auth-password').setAttribute('autocomplete', 'new-password');
            clearAuthErrors(form);
        });

        // Live validation
        ['input', 'change', 'blur'].forEach(evt => {
            form.addEventListener(evt, e => {
                const t = e.target;
                if (!(t instanceof HTMLElement)) return;
                if (['INPUT'].includes(t.tagName)) {
                    validateAuthField(t, mode);
                }
            });
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            const emailEl = form.querySelector('#auth-email');
            const nameEl = form.querySelector('#auth-name');
            const passEl = form.querySelector('#auth-password');

            const okEmail = validateAuthField(emailEl, mode);
            const okName = mode === 'signup' ? validateAuthField(nameEl, mode) : true;
            const okPass = validateAuthField(passEl, mode);

            if (!(okEmail && okName && okPass)) {
                (form.querySelector('.auth-error:not(:empty)') || emailEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // Fake auth success
            setAuthenticated(emailEl.value.trim());
            // Remove modal and resume app init
            document.body.style.overflow = '';
            overlay.remove();
            showNotification('Welcome to QZ Stores!', 'success');
            resolve();
        });
    });
}

function clearAuthErrors(form) {
    form.querySelectorAll('.auth-error').forEach(e => e.textContent = '');
}

function validateAuthField(field, mode) {
    const id = field.id;
    const val = (field.value || '').trim();
    const setError = (msg) => {
        const err = document.getElementById(field.id + '-error');
        if (err) err.textContent = msg || '';
    };
    setError('');
    // rules
    if (id === 'auth-email') {
        if (!val) { setError('Email is required.'); return false; }
        if (!isValidEmail(val)) { setError('Enter a valid email.'); return false; }
        return true;
    }
    if (id === 'auth-name' && mode === 'signup') {
        if (!val) { setError('Full name is required.'); return false; }
        if (val.length < 2) { setError('Please enter at least 2 characters.'); return false; }
        return true;
    }
    if (id === 'auth-password') {
        if (!val) { setError('Password is required.'); return false; }
        if (val.length < 6) { setError('Password must be at least 6 characters.'); return false; }
        return true;
    }
    return true;
}

// Theme functionality
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    const body = document.body;
    
    // Add smooth transition class
    body.style.transition = 'all 0.3s ease';
    
    if (isDarkTheme) {
        body.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '☀️ Light';
        }
        localStorage.setItem('theme', 'dark');
    } else {
        body.removeAttribute('data-theme');
        if (themeToggle) {
            themeToggle.innerHTML = '🌙 Dark';
        }
        localStorage.setItem('theme', 'light');
    }
    
    // Remove transition class after animation
    setTimeout(() => {
        body.style.transition = '';
    }, 300);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkTheme = true;
        document.body.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '☀️ Light';
        }
    } else {
        isDarkTheme = false;
        document.body.removeAttribute('data-theme');
        if (themeToggle) {
            themeToggle.innerHTML = '🌙 Dark';
        }
    }
}

// Cart functionality
function toggleCart() {
    cartSidebar.classList.toggle('open');
    cartOverlay.classList.toggle('show');
}

function addToCart(name, price, image) {
    // Check if item already exists in cart
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            price: price,
            image: image,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    showAddToCartMessage(name);
}

function removeFromCart(name) {
    cart = cart.filter(item => item.name !== name);
    updateCartDisplay();
}

function updateCartDisplay() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart total
    cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalElement.textContent = cartTotal.toFixed(2);
    
    // Update cart items display
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>£${item.price.toFixed(2)} x ${item.quantity}</p>
                    <p>Total: £${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.name}')">Remove</button>
            </div>
        `).join('');
    }
}

function showAddToCartMessage(itemName) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        z-index: 1001;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = `${itemName} added to cart!`;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Event listeners
themeToggle.addEventListener('click', toggleTheme);

// Close cart when clicking outside
cartOverlay.addEventListener('click', toggleCart);

// Close cart with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && cartSidebar.classList.contains('open')) {
        toggleCart();
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add some interactive animations
document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Checkout functionality (placeholder)
document.querySelector('.checkout-btn').addEventListener('click', function() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    alert(`Checkout Summary:\nItems: ${itemCount}\nTotal: £${total.toFixed(2)}\n\nThank you for your purchase!`);
    
    // Clear cart after checkout
    cart = [];
    updateCartDisplay();
    toggleCart();
});

// Add loading animation for images
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', function() {
        this.style.opacity = '1';
    });
    
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
});

// Category Filtering Functions
function initializeCategoryFilter() {
    // Set up filter button event listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            filterProducts(category);
        });
    });
}

function filterProducts(category) {
    currentFilter = category;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Safely set active if event exists, else find matching button
    if (typeof event !== 'undefined' && event.target) {
        event.target.classList.add('active');
    } else {
        const matchBtn = Array.from(document.querySelectorAll('.filter-btn'))
            .find(b => (b.getAttribute('onclick') || '').includes(`'${category}'`));
        if (matchBtn) matchBtn.classList.add('active');
    }
    
    // Filter products
    const products = document.querySelectorAll('.product-card');
    products.forEach(product => {
        const productCategory = product.getAttribute('data-category');
        
        if (category === 'all' || productCategory === category) {
            product.classList.remove('hidden');
            product.style.display = 'block';
        } else {
            product.classList.add('hidden');
            product.style.display = 'none';
        }
    });
    
    // Add smooth animation
    products.forEach(product => {
        if (!product.classList.contains('hidden')) {
            product.style.opacity = '0';
            product.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                product.style.opacity = '1';
                product.style.transform = 'translateY(0)';
            }, 100);
        }
    });
}

// Enhanced product search functionality
function searchProducts(searchTerm) {
    const products = document.querySelectorAll('.product-card');
    const term = searchTerm.toLowerCase();
    
    products.forEach(product => {
        const name = product.querySelector('h3').textContent.toLowerCase();
        const description = product.querySelector('.description').textContent.toLowerCase();
        
        if (name.includes(term) || description.includes(term)) {
            product.style.display = 'block';
            product.classList.remove('hidden');
        } else {
            product.style.display = 'none';
            product.classList.add('hidden');
        }
    });
}

// Add search functionality (optional enhancement)
function addSearchBar() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" id="product-search" placeholder="Search products..." 
               style="padding: 0.75rem; border: 2px solid var(--border-color); border-radius: 25px; width: 300px; max-width: 100%;">
    `;
    
    const productsSection = document.querySelector('.products-section');
    productsSection.insertBefore(searchContainer, document.querySelector('.category-filter'));
    
    // Add search event listener
    document.getElementById('product-search').addEventListener('input', function() {
        searchProducts(this.value);
    });
}

// Contact Form Functionality
function initializeContactForm() {
    const contactForm = document.querySelector('.contact-form form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
        // Live validation
        ['input', 'change', 'blur'].forEach(evt => {
            contactForm.addEventListener(evt, function(e) {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                    validateField(target);
                }
            });
        });
    }
}

function handleContactFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const fields = Array.from(form.querySelectorAll('input, textarea, select'));
    let firstErrorEl = null;
    let hasErrors = false;

    fields.forEach(el => {
        const ok = validateField(el);
        if (!ok && !firstErrorEl) firstErrorEl = el;
        if (!ok) hasErrors = true;
    });

    if (hasErrors) {
        if (firstErrorEl && typeof firstErrorEl.scrollIntoView === 'function') {
            firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorEl.focus({ preventScroll: true });
        }
        showNotification('Please correct the highlighted fields.', 'error');
        return;
    }
    
    // Simulate form submission
    showNotification('Thank you for your message! We\'ll get back to you within 24 hours.', 'success');
    
    // Reset form
    form.reset();
    // Clear validation states
    form.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('invalid', 'valid');
        const err = group.querySelector('.form-error');
        if (err) err.textContent = '';
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateField(field) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return true;
    const errorEl = formGroup.querySelector('.form-error');
    let valid = true;
    let message = '';

    if (field.required && !field.value.trim()) {
        valid = false;
        message = 'This field is required.';
    }

    if (valid && field.id === 'name' && field.value.trim().length < 2) {
        valid = false;
        message = 'Please enter at least 2 characters.';
    }

    if (valid && field.id === 'email' && !isValidEmail(field.value.trim())) {
        valid = false;
        message = 'Please enter a valid email address.';
    }

    if (valid && field.id === 'message' && field.value.trim().length < 10) {
        valid = false;
        message = 'Message should be at least 10 characters.';
    }

    if (valid && field.id === 'phone' && field.value.trim()) {
        const phoneOk = /^\+?[0-9\s()-]{7,20}$/.test(field.value.trim());
        if (!phoneOk) {
            valid = false;
            message = 'Please enter a valid phone number.';
        }
    }

    if (!valid) {
        formGroup.classList.add('invalid');
        formGroup.classList.remove('valid');
        if (errorEl) errorEl.textContent = message;
    } else {
        formGroup.classList.remove('invalid');
        if (field.value.trim()) {
            formGroup.classList.add('valid');
        } else {
            formGroup.classList.remove('valid');
        }
        if (errorEl) errorEl.textContent = '';
    }

    return valid;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${bgColor};
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        z-index: 1001;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Wishlist functionality
function toggleWishlist() {
    if (wishlistSidebar && wishlistOverlay) {
        wishlistSidebar.classList.toggle('open');
        wishlistOverlay.classList.toggle('show');
    }
}

function toggleWishlistItem(name, price, image) {
    const existingItem = wishlist.find(item => item.name === name);
    
    if (existingItem) {
        // Remove from wishlist
        wishlist = wishlist.filter(item => item.name !== name);
        showNotification(`${name} removed from wishlist`, 'info');
    } else {
        // Add to wishlist
        wishlist.push({ name, price, image });
        showNotification(`${name} added to wishlist`, 'success');
    }
    
    updateWishlistDisplay();
    saveWishlist();
}

function updateWishlistDisplay() {
    if (!wishlistItems || !wishlistCount || !wishlistTotalCount) return;
    
    // Update wishlist count in header
    if (wishlistCount) {
        wishlistCount.textContent = wishlist.length;
    }
    
    // Update total count in sidebar
    if (wishlistTotalCount) {
        wishlistTotalCount.textContent = wishlist.length;
    }
    
    // Clear current wishlist items
    if (wishlistItems) {
        wishlistItems.innerHTML = '';
    }
    
    // Add wishlist items
    wishlist.forEach(item => {
        const wishlistItem = document.createElement('div');
        wishlistItem.className = 'wishlist-item';
        wishlistItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="wishlist-item-info">
                <h4>${item.name}</h4>
                <p>£${item.price.toFixed(2)}</p>
            </div>
            <div class="wishlist-item-controls">
                <button onclick="addToCart('${item.name}', ${item.price}, '${item.image}')">Add to Cart</button>
                <button class="remove-btn" onclick="removeFromWishlist('${item.name}')">Remove</button>
            </div>
        `;
        wishlistItems.appendChild(wishlistItem);
    });
    
    // Update wishlist buttons on product cards
    updateWishlistButtons();
}

function removeFromWishlist(name) {
    wishlist = wishlist.filter(item => item.name !== name);
    updateWishlistDisplay();
    saveWishlist();
    showNotification(`${name} removed from wishlist`, 'info');
}

function updateWishlistButtons() {
    // Find all wishlist buttons and update their state
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');
    wishlistButtons.forEach(button => {
        const productName = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        const isInWishlist = wishlist.some(item => item.name === productName);
        
        if (isInWishlist) {
            button.textContent = '❤️';
            button.classList.add('active');
        } else {
            button.textContent = '🤍';
            button.classList.remove('active');
        }
    });
}

function loadWishlist() {
    const savedWishlist = localStorage.getItem('wishlist');
    if (savedWishlist) {
        wishlist = JSON.parse(savedWishlist);
    }
}

function saveWishlist() {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}
