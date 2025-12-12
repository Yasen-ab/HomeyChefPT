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
    const specialtiesGroup = document.getElementById('specialties-group');
    const bioGroup = document.getElementById('bio-group');

    if (currentUserType === 'chef') {
        // show chef-only fields
        phoneGroup.style.display = 'block';
        addressGroup.style.display = 'block';
        specialtiesGroup.style.display = 'block';
        bioGroup.style.display = 'block';
    } else {
        // hide EVERYTHING that belongs to chef
        phoneGroup.style.display = 'none';
        addressGroup.style.display = 'none';
        specialtiesGroup.style.display = 'none';
        bioGroup.style.display = 'none';
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
        // Send only email & password. Server will detect whether account is chef or user/admin.
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password
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
    const specialties = document.getElementById('specialties')?.value || '';
    const bio = document.getElementById('bio')?.value || '';

    response = await apiRequest('/auth/register/chef', {
        method: 'POST',
        body: JSON.stringify({
            name,
            email,
            password,
            phone,
            address,
            specialties,
            bio
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

