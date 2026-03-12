document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-password-form');
  const submitBtn = document.getElementById('reset-password-submit');
  const messageBox = document.getElementById('reset-password-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage();

    const otp = document.getElementById('otp').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmNewPassword = document.getElementById('confirmNewPassword').value.trim();

    if (!otp || !newPassword || !confirmNewPassword) {
      showMessage('All fields are required', 'error');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      showMessage('Verification code must be 6 digits', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showMessage('New password must be at least 8 characters', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showMessage('Confirm password does not match', 'error');
      return;
    }

    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, newPassword, confirmNewPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to process request');
      }

      form.reset();
      showMessage(data.message || 'Password reset successfully', 'success');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1800);
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
