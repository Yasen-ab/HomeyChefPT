// // social-auth.js - Social Authentication for HomeyChef (FedCM Compatible)

// class SocialAuth {
//     constructor() {
//         // Google Client ID - يجب تحديثه في ملف .env في backend
//         // يمكنك أيضاً تمريره من خلال script tag data attribute
//         this.googleClientId = '528298969514-aq4htpt99eopq0ri4f9ijbn1c5usfpu7.apps.googleusercontent.com';
//         this.facebookAppId = 'YOUR_FACEBOOK_APP_ID';
        
//         // تعطيل FedCM لتجنب المشاكل
//         this.useFedCM = false; // typeof window.FedCm !== 'undefined';
//         this.useMockMode = false;
//         this.baseApiUrl = 'http://localhost:3001/api';
        
//         // محاولة قراءة Google Client ID من script tag إذا كان موجوداً
//         const googleScript = document.querySelector('script[data-google-client-id]');
//         if (googleScript) {
//             this.googleClientId = googleScript.getAttribute('data-google-client-id');
//         }
        
//         this.initializeGoogle();
//         this.initializeFacebook();
//         this.setupEventListeners();
//     }

//     // ========== Google OAuth مع دعم FedCM ==========
//     initializeGoogle() {
//         // التحقق من أن Google script تم تحميله (يجب أن يكون موجوداً في HTML)
//         const checkGoogleScript = () => {
//             if (typeof google !== 'undefined' && google.accounts) {
//                 try {
//                     this.initializeGoogleLegacy();
//                 } catch (error) {
//                     console.error('Error initializing Google OAuth:', error);
//                     this.showError('Failed to initialize Google Sign-In');
//                 }
//             } else {
//                 // إذا لم يتم تحميله بعد، انتظر قليلاً ثم حاول مرة أخرى
//                 setTimeout(() => {
//                     if (typeof google !== 'undefined' && google.accounts) {
//                         this.initializeGoogleLegacy();
//                     } else {
//                         console.warn('Google accounts object not available');
//                         this.showError('Google Sign-In service is not available. Please refresh the page.');
//                     }
//                 }, 1000);
//             }
//         };

//         // إذا كان script محمّل بالفعل
//         if (document.readyState === 'complete' || document.readyState === 'interactive') {
//             checkGoogleScript();
//         } else {
//             // انتظر حتى يتم تحميل الصفحة
//             window.addEventListener('load', checkGoogleScript);
//         }
//     }

//     initializeGoogleWithFedCM() {
//         console.log('Initializing Google OAuth with FedCM');
        
//         // تهيئة FedCM
//         window.FedCm.register({
//             id: 'google',
//             providers: [{
//                 configURL: `https://accounts.google.com/.well-known/web-identity?client_id=${this.googleClientId}`,
//                 clientId: this.googleClientId,
//                 nonce: this.generateNonce()
//             }]
//         }).then(() => {
//             console.log('FedCM registered successfully');
//         }).catch(error => {
//             console.error('FedCM registration failed:', error);
//             // Fallback to legacy method
//             this.initializeGoogleLegacy();
//         });
//     }

//     initializeGoogleLegacy() {
//         console.log('Initializing Google OAuth');
        
//         google.accounts.id.initialize({
//             client_id: this.googleClientId,
//             callback: this.handleGoogleResponse.bind(this),
//             auto_select: false,
//             cancel_on_tap_outside: true,
//             context: 'signin',
//             use_fedcm_for_prompt: false  // تعطيل FedCM لتجنب المشاكل
//         });
//     }

//     generateNonce() {
//         const array = new Uint8Array(32);
//         window.crypto.getRandomValues(array);
//         return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
//     }

//     handleGoogleResponse(response) {
//         console.log('Google OAuth response:', response);
        
//         if (!response || !response.credential) {
//             this.showError('No credential received from Google');
//             return;
//         }
        
//         this.showLoading(true);
//         this.sendGoogleTokenToBackend(response.credential);
//     }

//     async sendGoogleTokenToBackend(credential) {
//         try {
//             const response = await fetch(`${this.baseApiUrl}/auth/google`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ credential })
//             });

//             const data = await response.json();

//             if (!response.ok) {
//                 throw new Error(data.error || 'Google authentication failed');
//             }

//             this.handleSuccess(data.user, data.token);
//         } catch (error) {
//             console.error('Google login error:', error);
//             this.showError(error.message || 'Failed to authenticate with Google');
//             this.showLoading(false);
//         }
//     }

//     handleFedCMResponse(response) {
//         try {
//             // مع FedCM، response قد يكون مختلفاً
//             const credential = response.credential || response;
            
//             const payload = this.decodeJWT(credential);
            
//             const mockUser = {
//                 id: payload.sub || 'fedcm_' + Date.now(),
//                 email: payload.email || 'user@example.com',
//                 name: payload.name || 'Google User',
//                 picture: payload.picture || 'https://via.placeholder.com/150',
//                 verified: payload.email_verified || true,
//                 provider: 'google',
//                 role: 'customer',
//                 createdAt: new Date().toISOString()
//             };
            
//             const mockToken = 'fedcm_jwt_token_' + Date.now();
            
//             setTimeout(() => {
//                 this.handleSuccess(mockUser, mockToken);
//             }, 1000);
            
//         } catch (error) {
//             console.error('Error handling FedCM response:', error);
//             this.showError('Failed to process Google login');
//             this.showLoading(false);
//         }
//     }

//     googleLogin() {
//         if (typeof google === 'undefined' || !google.accounts) {
//             this.showError('Google Sign-In service not loaded yet. Please wait or refresh the page.');
//             return;
//         }
        
//         this.showLoading(true);
        
//         // Use Google Identity Services - trigger the sign-in flow
//         // The callback will be handled by handleGoogleResponse
//         google.accounts.id.prompt((notification) => {
//             if (notification.isNotDisplayed()) {
//                 console.log('One-tap not displayed:', notification.getNotDisplayedReason());
//                 // إذا لم يظهر One-tap، استخدم renderButton
//                 this.showGoogleSignInButton();
//             } else if (notification.isSkippedMoment()) {
//                 console.log('One-tap skipped:', notification.getSkippedReason());
//                 this.showGoogleSignInButton();
//             } else if (notification.isDismissedMoment()) {
//                 console.log('One-tap dismissed:', notification.getDismissedReason());
//                 this.showGoogleSignInButton();
//             }
//         });
//     }

//     showGoogleSignInButton() {
//         // استخدام container الموجود في HTML
//         const buttonContainer = document.getElementById('google-signin-button-container');
//         if (!buttonContainer) {
//             this.showError('Could not find Google sign-in container');
//             this.showLoading(false);
//             return;
//         }
        
//         // إظهار container
//         buttonContainer.style.display = 'flex';
//         buttonContainer.style.justifyContent = 'center';
//         buttonContainer.style.marginTop = '15px';
        
//         // Render Google Sign-In button
//         try {
//             google.accounts.id.renderButton(
//                 buttonContainer,
//                 {
//                     theme: 'outline',
//                     size: 'large',
//                     text: 'signin_with',
//                     width: 300,
//                     type: 'standard'
//                 }
//             );
//         } catch (error) {
//             console.error('Error rendering Google button:', error);
//             // إذا فشل renderButton، استخدم الطريقة البديلة
//             this.showAlternativeGoogleLogin();
//         }
        
//         this.showLoading(false);
//     }

//     showAlternativeGoogleLogin() {
//         // طريقة بديلة: استخدام popup window
//         const popup = window.open(
//             `https://accounts.google.com/o/oauth2/v2/auth?` +
//             `client_id=${this.googleClientId}&` +
//             `redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname)}&` +
//             `response_type=id_token&` +
//             `scope=openid email profile&` +
//             `nonce=${this.generateNonce()}`,
//             'Google Sign-In',
//             'width=500,height=600'
//         );
        
//         // الاستماع لرسائل من popup
//         window.addEventListener('message', (event) => {
//             if (event.origin !== window.location.origin) return;
            
//             if (event.data.type === 'googleAuthToken' && event.data.credential) {
//                 popup.close();
//                 this.handleGoogleResponse({ credential: event.data.credential });
//             }
//         });
//     }

//     googleLoginWithFedCM() {
//         if (typeof window.FedCm === 'undefined') {
//             this.showError('Federated Credentials API not supported in this browser');
//             return;
//         }
        
//         window.FedCm.get({
//             providers: [{
//                 configURL: `https://accounts.google.com/.well-known/web-identity?client_id=${this.googleClientId}`,
//                 clientId: this.googleClientId,
//                 nonce: this.generateNonce()
//             }]
//         }).then(credential => {
//             console.log('FedCM credential received:', credential);
//             this.handleFedCMResponse(credential);
//         }).catch(error => {
//             console.error('FedCM login error:', error);
//             this.showError('Google login failed. Please try again.');
            
//             // Fallback to legacy method
//             this.googleLoginLegacy();
//         });
//     }

//     googleLoginLegacy() {
//         if (typeof google === 'undefined' || !google.accounts) {
//             this.showError('Google Sign-In service not loaded yet. Please wait or refresh the page.');
//             return;
//         }
        
//         // Use renderButton for explicit sign-in button
//         google.accounts.id.prompt(notification => {
//             if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
//                 // If one-tap is not available, trigger the button click handler
//                 console.log('One-tap not available, using button click');
//             }
//         });
//     }

//     showOneTapAlternative() {
//         // عرض بديل لـ One-tap (مثل نافذة منبثقة تقليدية)
//         const popup = window.open(
//             'https://accounts.google.com/o/oauth2/v2/auth?' +
//             `client_id=${this.googleClientId}&` +
//             `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
//             'response_type=code&' +
//             'scope=email profile&' +
//             'access_type=offline&' +
//             'prompt=consent',
//             'Google Sign-In',
//             'width=500,height=600,left=' + (window.screen.width - 500) / 2 + ',top=' + (window.screen.height - 600) / 2
//         );
        
//         if (!popup) {
//             this.showError('Please allow pop-ups to sign in with Google');
//             return;
//         }
        
//         // الاستماع لرسائل النافذة المنبثقة
//         window.addEventListener('message', event => {
//             if (event.origin === window.location.origin && event.data.type === 'googleAuthCode') {
//                 popup.close();
//                 this.handleAuthCode(event.data.code);
//             }
//         });
//     }

//     handleAuthCode(code) {
//         this.showLoading(true);
        
//         // في الواقع، ستحتاج إلى إرسال الكود إلى الخادم الخاص بك
//         const mockUser = {
//             id: 'authcode_' + Date.now(),
//             email: 'user@example.com',
//             name: 'Google User',
//             picture: 'https://via.placeholder.com/150',
//             provider: 'google',
//             role: 'customer',
//             createdAt: new Date().toISOString()
//         };
        
//         const mockToken = 'authcode_token_' + Date.now();
        
//         setTimeout(() => {
//             this.handleSuccess(mockUser, mockToken);
//         }, 1000);
//     }

//     // ========== Facebook OAuth ==========
//     initializeFacebook() {
//         // تأجيل تهيئة Facebook
//         console.log('Facebook OAuth will be initialized on demand');
//     }

//     facebookLogin() {
//         this.showError('Facebook login is temporarily unavailable. Please use Google or email login.');
//     }

//     // ========== إعداد مستمعي الأحداث ==========
//     setupEventListeners() {
//         // Google Sign In
//         const googleBtn = document.getElementById('googleSignIn');
//         if (googleBtn) {
//             googleBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 this.googleLogin();
//             });
//         }

//         // Facebook Sign In
//         const facebookBtn = document.getElementById('facebookSignIn');
//         if (facebookBtn) {
//             facebookBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 this.facebookLogin();
//             });
//         }
//     }

//     // ========== دوال مساعدة ==========
//     handleSuccess(user, token) {
//         console.log('Login successful:', user);
        
//         // حفظ بيانات المستخدم
//         this.saveUserData(user, token);
        
//         // تحديث واجهة المستخدم
//         this.updateUIAfterLogin(user);
        
//         // حفظ في localStorage باستخدام نفس المفاتيح التي يستخدمها auth.js
//         if (typeof setAuthToken === 'function') {
//             setAuthToken(token);
//         }
//         if (typeof setUserData === 'function') {
//             setUserData(user);
//         }
        
//         // عرض رسالة النجاح
//         this.showSuccess(`Welcome, ${user.name || user.email}!`);
        
//         // إعادة التوجيه بعد 1.5 ثانية
//         setTimeout(() => {
//             if (typeof redirectToDashboard === 'function') {
//                 redirectToDashboard();
//             } else {
//                 this.redirectAfterLogin();
//             }
//         }, 1500);
//     }

//     saveUserData(user, token) {
//         localStorage.setItem('homeychef_user', JSON.stringify(user));
//         localStorage.setItem('homeychef_token', token);
//         localStorage.setItem('homeychef_login_time', new Date().toISOString());
//         localStorage.setItem('homeychef_provider', user.provider || 'google');
//         localStorage.setItem('homeychef_fedcm', this.useFedCM.toString());
        
//         // Also save using the same keys as auth.js for compatibility
//         if (typeof setAuthToken === 'function') {
//             setAuthToken(token);
//         }
//         if (typeof setUserData === 'function') {
//             setUserData(user);
//         }
//     }

//     updateUIAfterLogin(user) {
//         // تحديث شريط التنقل
//         const userProfileContainer = document.getElementById('userProfileContainer');
//         const authLinks = document.getElementById('authLinks');
        
//         if (userProfileContainer && authLinks) {
//             authLinks.style.display = 'none';
//             userProfileContainer.style.display = 'flex';
            
//             // تحديث معلومات المستخدم
//             this.updateUserProfile(user);
//         }
//     }

//     updateUserProfile(user) {
//         const userAvatar = document.getElementById('userAvatar');
//         const userName = document.getElementById('userName');
//         const userRole = document.getElementById('userRole');
        
//         if (userAvatar) {
//             if (user.picture) {
//                 userAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}" 
//                     style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
//             } else {
//                 userAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
//             }
//         }
        
//         if (userName) {
//             userName.textContent = user.name || user.email.split('@')[0];
//         }
        
//         if (userRole) {
//             userRole.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Customer';
//         }
//     }

//     redirectAfterLogin() {
//         const redirectTo = sessionStorage.getItem('loginRedirect') || 'index.html';
//         sessionStorage.removeItem('loginRedirect');
        
//         window.location.href = redirectTo;
//     }

//     showLoading(show) {
//         const googleBtn = document.getElementById('googleSignIn');
//         const facebookBtn = document.getElementById('facebookSignIn');
        
//         [googleBtn, facebookBtn].forEach(btn => {
//             if (btn) {
//                 if (show) {
//                     btn.disabled = true;
//                     const originalHTML = btn.innerHTML;
//                     btn.setAttribute('data-original', originalHTML);
//                     btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
//                 } else {
//                     btn.disabled = false;
//                     const originalHTML = btn.getAttribute('data-original');
//                     if (originalHTML) {
//                         btn.innerHTML = originalHTML;
//                     }
//                 }
//             }
//         });
//     }

//     showError(message) {
//         this.showMessage(message, 'error');
//     }

//     showSuccess(message) {
//         this.showMessage(message, 'success');
//     }

//     showMessage(message, type) {
//         // إزالة أي رسائل سابقة من نفس النوع
//         const existingMessages = document.querySelectorAll(`.social-auth-${type}`);
//         existingMessages.forEach(msg => msg.remove());
        
//         const messageDiv = document.createElement('div');
//         messageDiv.className = `social-auth-${type}`;
        
//         const styles = {
//             error: {
//                 background: 'rgba(255, 235, 238, 0.95)',
//                 color: '#C62828',
//                 borderColor: '#C62828'
//             },
//             success: {
//                 background: 'rgba(232, 245, 233, 0.95)',
//                 color: '#2E7D32',
//                 borderColor: '#2E7D32'
//             }
//         };
        
//         const style = styles[type] || styles.error;
        
//         messageDiv.style.cssText = `
//             background: ${style.background};
//             color: ${style.color};
//             padding: 12px 16px;
//             border-radius: 10px;
//             margin: 15px 0;
//             display: flex;
//             align-items: center;
//             gap: 10px;
//             border-left: 4px solid ${style.borderColor};
//             animation: slideIn 0.3s ease;
//             font-size: 14px;
//             backdrop-filter: blur(10px);
//         `;
        
//         const icon = type === 'error' ? 'exclamation-triangle' : 'check-circle';
        
//         messageDiv.innerHTML = `
//             <i class="fas fa-${icon}"></i>
//             <span>${message}</span>
//             ${type === 'error' ? `
//             <button onclick="this.parentElement.remove()" 
//                     style="margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; 
//                            padding: 4px 8px; border-radius: 50%; transition: background 0.3s;">
//                 <i class="fas fa-times"></i>
//             </button>
//             ` : ''}
//         `;
        
//         const socialLogin = document.querySelector('.social-login');
//         if (socialLogin) {
//             socialLogin.parentNode.insertBefore(messageDiv, socialLogin.nextSibling);
//         }
        
//         // إزالة تلقائية
//         setTimeout(() => {
//             if (messageDiv.parentElement) {
//                 messageDiv.remove();
//             }
//         }, type === 'error' ? 5000 : 3000);
//     }

//     decodeJWT(token) {
//         try {
//             const base64Url = token.split('.')[1];
//             const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//             const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
//                 return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//             }).join(''));
            
//             return JSON.parse(jsonPayload);
//         } catch (error) {
//             console.error('Error decoding JWT:', error);
//             return {};
//         }
//     }

//     checkAuthStatus() {
//         const user = localStorage.getItem('homeychef_user');
//         const token = localStorage.getItem('homeychef_token');
//         const loginTime = localStorage.getItem('homeychef_login_time');
        
//         if (user && token && loginTime) {
//             try {
//                 const userData = JSON.parse(user);
//                 const loginDate = new Date(loginTime);
//                 const now = new Date();
//                 const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
                
//                 if (hoursDiff < 24) {
//                     this.updateUIAfterLogin(userData);
//                     return true;
//                 } else {
//                     this.logout();
//                     return false;
//                 }
//             } catch (error) {
//                 console.error('Error checking auth status:', error);
//                 return false;
//             }
//         }
        
//         return false;
//     }

//     logout() {
//         // مسح بيانات المستخدم
//         ['homeychef_user', 'homeychef_token', 'homeychef_login_time', 'homeychef_provider', 'homeychef_fedcm']
//             .forEach(key => localStorage.removeItem(key));
        
//         // تسجيل الخروج من Google
//         if (typeof google !== 'undefined' && google.accounts) {
//             google.accounts.id.disableAutoSelect();
//             google.accounts.id.cancel();
//         }
        
//         // تحديث واجهة المستخدم
//         const userProfileContainer = document.getElementById('userProfileContainer');
//         const authLinks = document.getElementById('authLinks');
        
//         if (userProfileContainer && authLinks) {
//             userProfileContainer.style.display = 'none';
//             authLinks.style.display = 'flex';
            
//             this.updateUserProfile({
//                 name: 'User',
//                 email: '',
//                 picture: null,
//                 role: 'Customer'
//             });
//         }
        
//         this.showSuccess('Logged out successfully');
        
//         if (window.location.pathname.includes('dashboard') || 
//             window.location.pathname.includes('orders')) {
//             setTimeout(() => {
//                 window.location.href = 'login.html';
//             }, 1500);
//         }
//     }
// }

// // تهيئة عندما يتم تحميل DOM
// document.addEventListener('DOMContentLoaded', function() {
//     // إضافة أنماط CSS
//     const style = document.createElement('style');
//     style.textContent = `
//         @keyframes slideIn {
//             from {
//                 opacity: 0;
//                 transform: translateY(-10px);
//             }
//             to {
//                 opacity: 1;
//                 transform: translateY(0);
//             }
//         }
        
//         @keyframes spin {
//             0% { transform: rotate(0deg); }
//             100% { transform: rotate(360deg); }
//         }
        
//         .social-btn {
//             transition: all 0.3s ease;
//             position: relative;
//             overflow: hidden;
//         }
        
//         .social-btn:disabled {
//             opacity: 0.6;
//             cursor: not-allowed;
//             transform: none !important;
//         }
        
//         .social-btn:hover:not(:disabled) {
//             transform: translateY(-2px);
//             box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
//         }
        
//         .google-btn:hover:not(:disabled) {
//             border-color: #DB4437 !important;
//             color: #DB4437 !important;
//         }
        
//         .facebook-btn:hover:not(:disabled) {
//             border-color: #4267B2 !important;
//             color: #4267B2 !important;
//         }
        
//         .fa-spinner {
//             animation: spin 1s linear infinite;
//         }
        
//         .social-btn::after {
//             content: '';
//             position: absolute;
//             top: 0;
//             left: -100%;
//             width: 100%;
//             height: 100%;
//             background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
//             transition: left 0.5s;
//         }
        
//         .social-btn:not(:disabled):hover::after {
//             left: 100%;
//         }
//     `;
//     document.head.appendChild(style);
    
//     // تهيئة SocialAuth
//     let socialAuth;
//     try {
//         socialAuth = new SocialAuth();
//         socialAuth.checkAuthStatus();
        
//         // جعل الدوال متاحة عالمياً
//         window.logout = () => socialAuth.logout();
//         window.checkAuth = () => socialAuth.checkAuthStatus();
        
//         console.log('Social Auth initialized (FedCM: ' + socialAuth.useFedCM + ')');
        
//     } catch (error) {
//         console.error('Failed to initialize Social Auth:', error);
        
//         // عرض رسالة خطأ للمستخدم
//         const errorDiv = document.createElement('div');
//         errorDiv.className = 'social-auth-error';
//         errorDiv.style.cssText = `
//             background: rgba(255, 235, 238, 0.95);
//             color: #C62828;
//             padding: 15px;
//             border-radius: 10px;
//             margin: 20px;
//             text-align: center;
//             border: 1px solid #ffcdd2;
//         `;
//         errorDiv.innerHTML = `
//             <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
//             <p style="margin: 0;">Authentication service is temporarily unavailable. Please try again later.</p>
//         `;
        
//         const socialLogin = document.querySelector('.social-login');
//         if (socialLogin) {
//             socialLogin.parentNode.insertBefore(errorDiv, socialLogin);
//         }
//     }
// });

// // دوال مساعدة متاحة عالمياً
// window.getCurrentUser = () => {
//     try {
//         const user = localStorage.getItem('homeychef_user');
//         return user ? JSON.parse(user) : null;
//     } catch {
//         return null;
//     }
// };

// window.isLoggedIn = () => localStorage.getItem('homeychef_token') !== null;
// window.getAuthToken = () => localStorage.getItem('homeychef_token');

// social-auth.js - Social Authentication for HomeyChef (Google OAuth Only)

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
