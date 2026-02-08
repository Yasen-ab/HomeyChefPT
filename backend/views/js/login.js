document.addEventListener('DOMContentLoaded', function () {

    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('login-form');
    const submitBtn = loginForm.querySelector('.btn-auth');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const errorDiv = document.getElementById('login-error');

    // ===== Login Attempts Control (E1) =====
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    // Toggle password visibility
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML =
                type === 'password'
                    ? '<i class="fas fa-eye"></i>'
                    : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Form submission
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // If max attempts reached, block submission
        if (attempts >= MAX_ATTEMPTS) {
            errorDiv.textContent = 'Login failed after 3 unsuccessful attempts.';
            errorDiv.style.display = 'block';
            return;
        }

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
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Invalid email or password');
            }

            // Reset attempts on success
            attempts = 0;

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
            attempts++;

            if (attempts >= MAX_ATTEMPTS) {
                errorDiv.textContent = 'Login failed after 3 unsuccessful attempts.';
                submitBtn.disabled = true;
            } else {
                errorDiv.textContent = err.message;
            }

            errorDiv.style.display = 'block';

        } finally {
            submitBtn.classList.remove('loading');
            btnLoading.style.display = 'none';
            submitBtn.disabled = attempts >= MAX_ATTEMPTS;
        }
    });

    // Input focus effect
    const inputs = document.querySelectorAll('.input-with-icon input');
    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        input.addEventListener('blur', function () {
            this.parentElement.style.transform = 'translateY(0)';
        });
    });

});
