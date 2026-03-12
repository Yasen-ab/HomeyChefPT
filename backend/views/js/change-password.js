document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('change-password-form');
  const submitBtn = document.getElementById('change-password-submit');
  const messageBox = document.getElementById('change-password-message');
  const footerLink = document.querySelector('.auth-footer a');
  const token = localStorage.getItem('authToken');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const userData = getUserData();
  if (footerLink && userData) {
    if (userData.role === 'admin') footerLink.href = 'dashboard-admin.html';
    else if (userData.role === 'chef') footerLink.href = 'dashboard-chef.html';
    else footerLink.href = 'dashboard-user.html';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage();

    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmNewPassword = document.getElementById('confirmNewPassword').value.trim();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showMessage('All fields are required', 'error');
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
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to process request');
      }

      form.reset();
      showMessage(data.message || 'Password changed successfully', 'success');
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
