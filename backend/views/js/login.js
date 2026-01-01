document.addEventListener('DOMContentLoaded', function() {
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('login-form');
    const submitBtn = loginForm.querySelector('.btn-auth');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const errorDiv = document.getElementById('login-error');

    // Toggle password visibility
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Clear previous errors
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // Show loading
        submitBtn.classList.add('loading');
        btnLoading.style.display = 'block';
        submitBtn.disabled = true;

        try {
            // Call actual API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Show server error
                throw new Error(data.message || 'Login failed');
            }

            // Save token and user data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = 'Login successful! Redirecting...';
            loginForm.insertBefore(successMsg, loginForm.firstChild);

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
        } finally {
            // Hide loading
            submitBtn.classList.remove('loading');
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    });

    // Input focus effect
    const inputs = document.querySelectorAll('.input-with-icon input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });
});