(function() {
    'use strict';
    var Y = window.Yeahvin;
    var authContainer = document.getElementById('authContainer');
    var accountProfile = document.getElementById('accountProfile');
    var authLoading = document.getElementById('authLoading');
    var googleSignInBtn = document.getElementById('googleSignInBtn');
    var appleSignInBtn = document.getElementById('appleSignInBtn');
    var phoneSignInBtn = document.getElementById('phoneSignInBtn');
    var phoneSection = document.getElementById('phoneSection');
    var phoneSubmitBtn = document.getElementById('phoneSubmitBtn');
    var verifySection = document.getElementById('verifySection');
    var verifyCodeBtn = document.getElementById('verifyCodeBtn');
    var resendCodeBtn = document.getElementById('resendCodeBtn');
    var profileName = document.getElementById('profileName');
    var profileEmail = document.getElementById('profileEmail');
    var profileAvatar = document.getElementById('profileAvatar');
    var profileProvider = document.getElementById('profileProvider');
    var logoutBtn = document.getElementById('logoutBtn');
    var currentVerificationId = null;
    var pendingPhoneData = null;

    function showLoader() { if (authLoading) authLoading.classList.add('auth-loading--visible'); }
    function hideLoader() { if (authLoading) authLoading.classList.remove('auth-loading--visible'); }

    function handleAuthSuccess(data) {
        Y.state.auth = { token: data.token, user: data.user, provider: data.provider || 'phone' };
        localStorage.setItem('yeahvin_auth', JSON.stringify(Y.state.auth));
        hideLoader();
        Y.showToast('Connecté avec succès ! 🎉');
        renderProfile();
    }

    async function authenticateWithBackend(userData) {
        showLoader();
        try { var data = await Y.apiFetch('/api/auth/social', { method: 'POST', body: JSON.stringify(userData) }); handleAuthSuccess(data); }
        catch (e) { hideLoader(); Y.showToast(e.message, 'error'); }
    }

    function parseJwt(token) {
        try { var base64Url = token.split('.')[1]; var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); return JSON.parse(jsonPayload); } catch (e) { return {}; }
    }

    // GOOGLE SIGN-IN
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', function() {
            if (window.google && window.google.accounts) { showLoader(); window.google.accounts.id.prompt(); }
            else { Y.showToast('Google Sign-In en cours de chargement... Patientez.', 'error'); }
        });
    }

    // Initialiser Google Identity Services
    if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
            client_id: '834762059967-cc3j5r68lkn5ernjijvho7m22tb399t9.apps.googleusercontent.com',
            callback: function(response) {
                var payload = parseJwt(response.credential);
                authenticateWithBackend({
                    provider: 'google',
                    providerId: payload.sub,
                    email: payload.email,
                    fullName: payload.name,
                    picture: payload.picture,
                    emailVerified: payload.email_verified,
                    phone: ''
                });
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            ux_mode: 'popup'
        });
        window.google.accounts.id.prompt();
    }

    // APPLE SIGN-IN
    if (appleSignInBtn) {
        appleSignInBtn.addEventListener('click', function() {
            Y.showToast('Apple Sign-In sera disponible prochainement. Utilisez Google ou Téléphone.', 'error');
        });
    }

    // TÉLÉPHONE
    if (phoneSignInBtn) {
        phoneSignInBtn.addEventListener('click', function() {
            phoneSection.classList.toggle('phone-section--visible');
            if (phoneSection.classList.contains('phone-section--visible')) {
                phoneSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (phoneSubmitBtn) {
        phoneSubmitBtn.addEventListener('click', async function() {
            var name = document.getElementById('phoneFullName').value.trim();
            var phone = document.getElementById('phoneNumber').value.replace(/\s/g, '');
            var email = document.getElementById('phoneEmail').value.trim();
            if (!name) { Y.showToast('Entrez votre nom complet.', 'error'); return; }
            if (phone.length < 8) { Y.showToast('Numéro invalide. Format : 77 55 55 75', 'error'); return; }
            pendingPhoneData = { provider: 'phone', fullName: name, email: email, phone: '+223' + phone };
            try {
                showLoader();
                var data = await Y.apiFetch('/api/auth/phone/send-code', { method: 'POST', body: JSON.stringify({ phone: '+223' + phone }) });
                hideLoader();
                currentVerificationId = data.verificationId;
                verifySection.style.display = 'block';
                phoneSubmitBtn.style.display = 'none';
                resendCodeBtn.style.display = 'block';
                resendCodeBtn.disabled = true;
                setTimeout(function() { if (resendCodeBtn) resendCodeBtn.disabled = false; }, 30000);
                Y.showToast('Code envoyé sur WhatsApp ! 📱');
            } catch (e) { hideLoader(); Y.showToast(e.message, 'error'); }
        });
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', async function() {
            var code = document.getElementById('verificationCode').value.trim();
            if (!code || code.length < 4) { Y.showToast('Entrez le code reçu.', 'error'); return; }
            try {
                showLoader();
                var data = await Y.apiFetch('/api/auth/phone/verify', { method: 'POST', body: JSON.stringify({ verificationId: currentVerificationId, code: code, userData: pendingPhoneData }) });
                handleAuthSuccess(data);
                currentVerificationId = null; pendingPhoneData = null;
                verifySection.style.display = 'none'; phoneSubmitBtn.style.display = 'block';
                document.getElementById('verificationCode').value = '';
            } catch (e) { hideLoader(); Y.showToast(e.message, 'error'); }
        });
    }

    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', function() { if (phoneSubmitBtn) phoneSubmitBtn.click(); });
    }

    function renderProfile() {
        if (!accountProfile) return;
        var auth = Y.state.auth;
        if (!auth || !auth.user) { authContainer.style.display = 'block'; accountProfile.style.display = 'none'; return; }
        authContainer.style.display = 'none';
        accountProfile.style.display = 'block';
        var user = auth.user;
        var provider = auth.provider || 'phone';
        if (profileAvatar) { if (user.picture) { profileAvatar.innerHTML = '<img src="' + user.picture + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">'; } else { profileAvatar.textContent = (user.fullName || 'Y').charAt(0).toUpperCase(); } }
        if (profileName) profileName.textContent = user.fullName || 'Utilisateur';
        if (profileEmail) profileEmail.textContent = user.email || '';
        if (profileProvider) { var labels = { google: 'G 🔗 Google', apple: '🍎 Apple', phone: '📱 Téléphone' }; profileProvider.textContent = labels[provider] || provider; profileProvider.className = 'profile-provider profile-provider--' + provider; }
        if (document.getElementById('detailName')) document.getElementById('detailName').textContent = user.fullName || '—';
        if (document.getElementById('detailEmail')) document.getElementById('detailEmail').textContent = user.email || '—';
        if (document.getElementById('detailPhone')) document.getElementById('detailPhone').textContent = user.phone || 'Non renseigné';
        var providerNames = { google: 'Google', apple: 'Apple ID', phone: 'Numéro de téléphone' };
        if (document.getElementById('detailProvider')) document.getElementById('detailProvider').textContent = providerNames[provider] || provider;
        if (document.getElementById('detailMemberSince') && user.createdAt) {
            document.getElementById('detailMemberSince').textContent = new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect();
            Y.state.auth = null;
            localStorage.removeItem('yeahvin_auth');
            if (phoneSection) phoneSection.classList.remove('phone-section--visible');
            if (verifySection) verifySection.style.display = 'none';
            if (phoneSubmitBtn) phoneSubmitBtn.style.display = 'block';
            Y.showToast('Déconnecté');
            renderProfile();
        });
    }

    function init() { if (!authContainer) return; renderProfile(); }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();