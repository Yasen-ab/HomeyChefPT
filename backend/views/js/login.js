document.addEventListener('DOMContentLoaded', function () {

    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('login-form');
    const submitBtn = loginForm ? loginForm.querySelector('.btn-auth') : null;

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
