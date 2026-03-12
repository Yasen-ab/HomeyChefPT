document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-password-form');
  const submitBtn = document.getElementById('forgot-password-submit');
  const messageBox = document.getElementById('forgot-password-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage();

    const email = document.getElementById('email').value.trim().toLowerCase();
    if (!email) {
      showMessage('Email is required', 'error');
      return;
    }

    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to process request');
      }

      form.reset();
      showMessage(
        data.message || 'A verification code has been sent to your email',
        'success'
      );

      setTimeout(() => {
        window.location.href = 'reset_password.html';
      }, 2000);
    } catch (error) {
      showMessage(error.message || 'Unable to process request', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = `message ${type} show`;
  }

  function hideMessage() {
    messageBox.textContent = '';
    messageBox.className = 'message';
  }
});
