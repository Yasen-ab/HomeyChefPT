class SocialAuth {
    constructor() {
        this.googleClientId = '528298969514-aq4htpt99eopq0ri4f9ijbn1c5usfpu7.apps.googleusercontent.com';
        this.useFedCM = false;
        this.baseApiUrl = 'http://localhost:3001/api';

        const googleScript = document.querySelector('script[data-google-client-id]');
        if (googleScript) {
            this.googleClientId = googleScript.getAttribute('data-google-client-id');
        }

        this.initializeGoogle();
        this.setupEventListeners();
    }

    // ========== Google OAuth ==========

    initializeGoogle() {
        const checkGoogleScript = () => {
            if (typeof google !== 'undefined' && google.accounts) {
                try {
                    this.initializeGoogleLegacy();
                } catch (error) {
                    console.error('Error initializing Google OAuth:', error);
                    this.showError('Failed to initialize Google Sign-In');
                }
            } else {
                setTimeout(() => {
                    if (typeof google !== 'undefined' && google.accounts) {
                        this.initializeGoogleLegacy();
                    } else {
                        console.warn('Google accounts object not available');
                        this.showError('Google Sign-In service is not available. Please refresh the page.');
                    }
                }, 1000);
            }
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            checkGoogleScript();
        } else {
            window.addEventListener('load', checkGoogleScript);
        }
    }

    initializeGoogleLegacy() {
        google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: this.handleGoogleResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            use_fedcm_for_prompt: false
        });
    }

    generateNonce() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    handleGoogleResponse(response) {
        if (!response || !response.credential) {
            this.showError('No credential received from Google');
            return;
        }

        this.showLoading(true);
        this.sendGoogleTokenToBackend(response.credential);
    }

    async sendGoogleTokenToBackend(credential) {
        try {
            const response = await fetch(`${this.baseApiUrl}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Google authentication failed');

            this.handleSuccess(data.user, data.token);
        } catch (error) {
            console.error('Google login error:', error);
            this.showError(error.message || 'Failed to authenticate with Google');
            this.showLoading(false);
        }
    }

    googleLogin() {
        if (typeof google === 'undefined' || !google.accounts) {
            this.showError('Google Sign-In service not loaded yet. Please wait or refresh the page.');
            return;
        }

        this.showLoading(true);

        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
                this.showGoogleSignInButton();
            }
        });
    }

    showGoogleSignInButton() {
        const buttonContainer = document.getElementById('google-signin-button-container');
        if (!buttonContainer) {
            this.showError('Could not find Google sign-in container');
            this.showLoading(false);
            return;
        }

        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '15px';

        try {
            google.accounts.id.renderButton(
                buttonContainer,
                { theme: 'outline', size: 'large', text: 'signin_with', width: 300, type: 'standard' }
            );
        } catch (error) {
            console.error('Error rendering Google button:', error);
        }

        this.showLoading(false);
    }

    // ========== إعداد مستمعي الأحداث ==========

    setupEventListeners() {
        const googleBtn = document.getElementById('googleSignIn');
        if (googleBtn) {
            googleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.googleLogin();
            });
        }
    }

    // ========== دوال مساعدة ==========

    handleSuccess(user, token) {
        this.saveUserData(user, token);
        this.updateUIAfterLogin(user);
        if (typeof setAuthToken === 'function') setAuthToken(token);
        if (typeof setUserData === 'function') setUserData(user);
        this.showSuccess(`Welcome, ${user.name || user.email}!`);
        setTimeout(() => {
            if (typeof redirectToDashboard === 'function') redirectToDashboard();
            else this.redirectAfterLogin();
        }, 1500);
    }

    saveUserData(user, token) {
        localStorage.setItem('homeychef_user', JSON.stringify(user));
        localStorage.setItem('homeychef_token', token);
        localStorage.setItem('homeychef_login_time', new Date().toISOString());
        localStorage.setItem('homeychef_provider', 'google');
        localStorage.setItem('homeychef_fedcm', this.useFedCM.toString());
    }

    updateUIAfterLogin(user) {
        const userProfileContainer = document.getElementById('userProfileContainer');
        const authLinks = document.getElementById('authLinks');

        if (userProfileContainer && authLinks) {
            authLinks.style.display = 'none';
            userProfileContainer.style.display = 'flex';
            this.updateUserProfile(user);
        }
    }

    updateUserProfile(user) {
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');

        if (userAvatar) {
            if (user.picture) {
                userAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}" 
                    style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else userAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        }
        if (userName) userName.textContent = user.name || user.email.split('@')[0];
        if (userRole) userRole.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Customer';
    }

    redirectAfterLogin() {
        const redirectTo = sessionStorage.getItem('loginRedirect') || 'index.html';
        sessionStorage.removeItem('loginRedirect');
        window.location.href = redirectTo;
    }

    showLoading(show) {
        const googleBtn = document.getElementById('googleSignIn');
        if (googleBtn) {
            if (show) {
                googleBtn.disabled = true;
                googleBtn.setAttribute('data-original', googleBtn.innerHTML);
                googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            } else {
                googleBtn.disabled = false;
                const originalHTML = googleBtn.getAttribute('data-original');
                if (originalHTML) googleBtn.innerHTML = originalHTML;
            }
        }
    }

    showError(message) { this.showMessage(message, 'error'); }
    showSuccess(message) { this.showMessage(message, 'success'); }

    showMessage(message, type) {
        const existingMessages = document.querySelectorAll(`.social-auth-${type}`);
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `social-auth-${type}`;
        const styles = {
            error: { background: 'rgba(255, 235, 238, 0.95)', color: '#C62828', borderColor: '#C62828' },
            success: { background: 'rgba(232, 245, 233, 0.95)', color: '#2E7D32', borderColor: '#2E7D32' }
        };
        const style = styles[type] || styles.error;
        messageDiv.style.cssText = `
            background: ${style.background};
            color: ${style.color};
            padding: 12px 16px;
            border-radius: 10px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 4px solid ${style.borderColor};
            animation: slideIn 0.3s ease;
            font-size: 14px;
            backdrop-filter: blur(10px);
        `;
        const icon = type === 'error' ? 'exclamation-triangle' : 'check-circle';
        messageDiv.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
        const socialLogin = document.querySelector('.social-login');
        if (socialLogin) socialLogin.parentNode.insertBefore(messageDiv, socialLogin.nextSibling);
        setTimeout(() => { if (messageDiv.parentElement) messageDiv.remove(); }, type === 'error' ? 5000 : 3000);
    }

    decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch {
            return {};
        }
    }

    checkAuthStatus() {
        const user = localStorage.getItem('homeychef_user');
        const token = localStorage.getItem('homeychef_token');
        const loginTime = localStorage.getItem('homeychef_login_time');

        if (user && token && loginTime) {
            try {
                const userData = JSON.parse(user);
                const loginDate = new Date(loginTime);
                const hoursDiff = (new Date() - loginDate) / (1000 * 60 * 60);
                if (hoursDiff < 24) {
                    this.updateUIAfterLogin(userData);
                    return true;
                } else this.logout();
            } catch { return false; }
        }
        return false;
    }

    logout() {
        ['homeychef_user','homeychef_token','homeychef_login_time','homeychef_provider','homeychef_fedcm']
            .forEach(key => localStorage.removeItem(key));
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.disableAutoSelect();
            google.accounts.id.cancel();
        }
        const userProfileContainer = document.getElementById('userProfileContainer');
        const authLinks = document.getElementById('authLinks');
        if (userProfileContainer && authLinks) {
            userProfileContainer.style.display = 'none';
            authLinks.style.display = 'flex';
            this.updateUserProfile({ name:'User', email:'', picture:null, role:'Customer' });
        }
        this.showSuccess('Logged out successfully');
        if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('orders')) {
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        }
    }
}

// تهيئة عند تحميل DOM
document.addEventListener('DOMContentLoaded', function() {
    let socialAuth;
    try {
        socialAuth = new SocialAuth();
        socialAuth.checkAuthStatus();
        window.logout = () => socialAuth.logout();
        window.checkAuth = () => socialAuth.checkAuthStatus();
        console.log('Social Auth initialized (Google OAuth only)');
    } catch (error) {
        console.error('Failed to initialize Social Auth:', error);
    }
});

window.getCurrentUser = () => {
    try { return JSON.parse(localStorage.getItem('homeychef_user')) || null; } 
    catch { return null; }
};
window.isLoggedIn = () => localStorage.getItem('homeychef_token') !== null;
window.getAuthToken = () => localStorage.getItem('homeychef_token');
