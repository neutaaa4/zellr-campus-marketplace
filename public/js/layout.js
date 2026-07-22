// public/js/layout.js

// GLOBAL CONFIGURATION: Centralized routing matrix ensures shared layout headers talk directly to Render
const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://zellr-backend-engine.onrender.com';

// UPGRADE: Added a dynamic absolute badge marker over the top navigation button link
const headerTemplate = `
    <div class="absolute top-4 inset-x-5 z-30">
        <div class="w-full h-14 bg-[#232325] rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.3)] flex items-center justify-between px-5 select-none border border-white/5">
            <button onclick="toggleWebSidebar(true)" class="text-white hover:text-neutral-400 transition-colors focus:outline-none flex items-center justify-center p-1">
                <i class="ri-menu-line text-[20px]"></i>
            </button>
            <span class="text-[20px] font-bold text-white font-serif-logo tracking-tight">Zellr</span>
            <button onclick="window.location.href='messages.html'" class="text-white hover:text-neutral-400 transition-colors focus:outline-none flex items-center justify-center p-1 relative">
                <i class="ri-chat-3-line text-[20px]"></i>
                <span id="globalHeaderUnreadBadge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center">0</span>
            </button>
        </div>
    </div>
    <button onclick="window.location.href='cart.html'" class="absolute bottom-6 right-6 w-14 h-14 bg-[#232325] rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.4)] flex items-center justify-center text-white border border-white/5 focus:outline-none z-30 hover:scale-105 transition-transform">
        <i class="ri-shopping-bag-3-line text-[22px]"></i>
    </button>
`;

function generateSidebarTemplate(activeTab) {
    const links = [
        { id: 'home', label: 'DASHBOARD', url: 'dashboard.html', iconClass: 'ri-home-5-line' },
        { id: 'listing', label: 'MY LISTINGS', url: 'listings.html', iconClass: 'ri-advertisement-line' },
        { id: 'account', label: 'PROFILE SETTINGS', url: 'account.html', iconClass: 'ri-user-3-line' }
    ];

    let html = `
        <div id="sidebarBackdrop" onclick="toggleWebSidebar(false)" class="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 pointer-events-none transition-opacity duration-300 z-45"></div>
        <div id="sidebarDrawer" class="absolute inset-y-0 left-0 w-[220px] bg-[#232325] border-r border-neutral-800 flex flex-col justify-between p-5 transform -translate-x-full transition-transform duration-300 ease-in-out z-50">
            <div class="space-y-8 pt-2 w-full">
                <div class="flex flex-col items-center pb-5 border-b border-neutral-800">
                    <span class="text-[26px] font-bold text-white font-serif-logo tracking-tight leading-none mt-4">Zellr</span>
                    <p class="text-[8px] uppercase tracking-[0.24em] font-bold text-neutral-400 mt-2 font-sans-subtitle">Campus Marketplace</p>
                </div>
                <nav class="flex flex-col gap-2">
    `;

    links.forEach(link => {
        const isSelf = link.id === activeTab;
        const activeClass = isSelf 
            ? 'bg-white text-neutral-950 font-bold shadow-md opacity-100' 
            : 'text-neutral-300 hover:text-white hover:bg-white/10 opacity-50 hover:opacity-100';
        const displayIcon = isSelf ? link.iconClass.replace('-line', '-fill') : link.iconClass;

        html += `
            <button onclick="event.stopPropagation(); window.location.href='${link.url}'" class="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all focus:outline-none ${activeClass}">
                <i class="${displayIcon} text-[18px] shrink-0"></i>
                <span class="tracking-widest uppercase font-sans-subtitle text-[9px] font-bold">${link.label}</span>
            </button>
        `;
    });

    html += `
                </nav>
            </div>

            <div class="pt-4 border-t border-neutral-800/60 w-full mb-2">
                <button onclick="event.stopPropagation(); handleSessionTermination();" class="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all outline-none font-semibold group">
                    <i class="ri-logout-box-r-line text-[18px] shrink-0 text-neutral-400 group-hover:text-red-400 transition-colors"></i>
                    <span class="tracking-widest uppercase font-sans-subtitle text-[9px] font-bold group-hover:text-red-400 transition-colors">Logout</span>
                </button>
            </div>
        </div>
    `;
    return html;
}

// public/js/layout.js

async function syncGlobalHeaderNotificationBadge() {
    const badgeElement = document.getElementById('globalHeaderUnreadBadge');
    if (!badgeElement) return;

    let sessionUserId = 3;
    const cachedProfile = localStorage.getItem('zellr_user_profile');
    if (cachedProfile) {
        try {
            const user = JSON.parse(cachedProfile);
            if (user && user.id) sessionUserId = parseInt(user.id);
        } catch(e) {}
    }
    try {
        const response = await fetch(`${API_BASE}/api/messages`);
        if (!response.ok) return;
        const chatLogs = await response.json();
        
        // Scan for rows where the current user is the recipient and is_read is false (0)
        let unreadCount = chatLogs.filter(msg => {
            const isTargetRecipient = parseInt(msg.receiver_id) === sessionUserId;
            return isTargetRecipient && parseInt(msg.is_read) === 0;
        }).length;

        if (unreadCount > 0) {
            badgeElement.textContent = unreadCount;
            badgeElement.classList.remove('hidden');
        } else {
            badgeElement.classList.add('hidden');
        }
    } catch (err) {
        console.error("Global background badge sync exception:", err);
    }
}

window.handleSessionTermination = function() {
    // SECURITY FIX: Explicitly strip both identity keys and tokens to lock down the head auth gates completely
    localStorage.removeItem('zellr_user_profile');
    localStorage.removeItem('zellr_session_token');
    window.location.href = 'login.html';
};

window.toggleWebSidebar = function(open) {
    const drawer = document.getElementById('sidebarDrawer');
    const backdrop = document.getElementById('sidebarBackdrop');
    const container = document.getElementById('sidebar-container');
    
    if (drawer && backdrop && container) {
        if (open) {
            container.classList.add('pointer-events-auto');
            backdrop.classList.remove('pointer-events-none', 'opacity-0');
            backdrop.classList.add('opacity-100', 'pointer-events-auto');
            drawer.classList.remove('-translate-x-full');
            drawer.classList.add('translate-x-0');
        } else {
            container.classList.remove('pointer-events-auto');
            backdrop.classList.remove('opacity-100', 'pointer-events-auto');
            backdrop.classList.add('opacity-0', 'pointer-events-none');
            drawer.classList.remove('translate-x-0');
            drawer.classList.add('-translate-x-full');
        }
    }
};

// GLOBAL SOCKET INSTANCE: Establish a single persistent background handshake thread with your backend
let globalNotificationSocketInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const headerWrapper = document.getElementById('app-header');
    const sidebarWrapper = document.getElementById('sidebar-container');
    if (headerWrapper) headerWrapper.innerHTML = headerTemplate;
    if (sidebarWrapper) sidebarWrapper.innerHTML = generateSidebarTemplate(sidebarWrapper.getAttribute('data-active'));
    
    // Initial calculate check on view instance mount
    syncGlobalHeaderNotificationBadge();
    
    // SURGICAL FIX: Initialize the websocket channel client layer instead of generating interval loop polling locks
    if (typeof io !== 'undefined') {
        globalNotificationSocketInstance = io(API_BASE);

        let sessionUserId = 3;
        const cachedProfile = localStorage.getItem('zellr_user_profile');
        if (cachedProfile) {
            try {
                const user = JSON.parse(cachedProfile);
                if (user && user.id) sessionUserId = parseInt(user.id);
            } catch(e) {}
        }

        globalNotificationSocketInstance.on('connect', () => {
            // Bind this tab session instance inside your backend private user room matrix
            globalNotificationSocketInstance.emit('register_notification_agent', sessionUserId);
        });

        // Event listener intercepts mutations instantly to refresh the unread badges smoothly
        globalNotificationSocketInstance.on('unread_inbox_mutation', () => {
            syncGlobalHeaderNotificationBadge();
        });
    } else {
        console.warn("Socket.io client script missing from viewport head context layout rows.");
    }
});