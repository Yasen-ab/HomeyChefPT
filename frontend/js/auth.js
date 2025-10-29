// Authentication logic
let currentUserType = 'user';

// Initialize authentication page
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initForms();
});

// Initialize user type tabs
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked tab
            btn.classList.add('active');
            
            currentUserType = btn.dataset.type;
            updateFormFields();
        });
    });
}

// Update form fields based on user type
function updateFormFields() {
    const phoneGroup = document.getElementById('phone-group');
    const addressGroup = document.getElementById('address-group');
    
    if (currentUserType === 'chef') {
        if (phoneGroup) phoneGroup.style.display = 'block';
        if (addressGroup) addressGroup.style.display = 'block';
    } else if (currentUserType === 'user' || currentUserType === 'admin') {
        if (phoneGroup) phoneGroup.style.display = 'none';
        if (addressGroup) addressGroup.style.display = 'none';
    }
}

// Initialize forms
function initForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const errorDiv = document.getElementById('login-error');
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                userType: currentUserType
            })
        });
        
        setAuthToken(response.token);
        setUserData(response.user);
        
        showNotification('Login successful!');
        
        setTimeout(() => {
            redirectToDashboard();
        }, 1000);
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const errorDiv = document.getElementById('register-error');
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone')?.value || '';
    const address = document.getElementById('address')?.value || '';
    
    try {
        let response;
        
        if (currentUserType === 'chef') {
            response = await apiRequest('/auth/register/chef', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    phone,
                    address
                })
            });
        } else {
            response = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role: currentUserType
                })
            });
        }
        
        setAuthToken(response.token);
        setUserData(response.user || response.chef);
        
        showNotification('Registration successful!');
        
        setTimeout(() => {
            redirectToDashboard();
        }, 1000);
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
    }
}

