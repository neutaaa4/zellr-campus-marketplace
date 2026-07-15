// public/admin/admin_layout.js

// CLONED ARCHITECTURE: Removed the top-right logout icon button and replaced it with a structural spacer to keep the title perfectly centered
const adminHeaderTemplate = `
    <div class="absolute top-4 inset-x-5 z-30">
        <div class="w-full h-14 bg-[#232325] rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.3)] flex items-center justify-between px-5 select-none border border-white/5">
            <button onclick="toggleAdminSidebar(true)" class="text-white hover:text-neutral-400 transition-colors focus:outline-none flex items-center justify-center p-1">
                <i class="ri-menu-line text-[20px]"></i>
            </button>
            <span class="text-[20px] font-bold text-white tracking-tight" style="font-family: 'Playfair Display', serif; letter-spacing: -0.01em;">Zellr Admin</span>
            <div class="w-[28px] h-[28px]"></div>
        </div>
    </div>
`;

function generateAdminSidebarTemplate(activeTab) {
    const links = [
        { id: 'inventory', label: 'Market Inventory', url: 'admin_overview.html', iconClass: 'ri-pie-chart-2-line' },
        { id: 'users', label: 'User Distribution', url: 'admin_users.html', iconClass: 'ri-group-line' },
        { id: 'sales', label: 'Sales Performance', url: 'admin_sales.html', iconClass: 'ri-coins-line' }
    ];

    let html = `
        <div id="adminSidebarBackdrop" onclick="toggleAdminSidebar(false)" class="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 pointer-events-none transition-opacity duration-300 z-45"></div>
        <div id="adminSidebarDrawer" class="absolute inset-y-0 left-0 w-[220px] bg-[#232325] border-r border-neutral-800 flex flex-col justify-between p-5 transform -translate-x-full transition-transform duration-300 ease-in-out z-50">
            <div class="space-y-8 pt-2 w-full">
                <div class="flex flex-col items-center pb-5 border-b border-neutral-800">
                    <span class="text-[26px] font-bold text-white tracking-tight leading-none mt-4" style="font-family: 'Playfair Display', serif; letter-spacing: -0.01em;">Zellr</span>
                    <p class="text-[8px] uppercase tracking-[0.24em] font-bold text-neutral-400 mt-2 font-sans-subtitle">Control Console</p>
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
                <span class="tracking-wide text-[10px] font-semibold">${link.label}</span>
            </button>
        `;
    });

    html += `
                </nav>
            </div>

            <div class="pt-4 border-t border-neutral-800/60 w-full mb-2">
                <button onclick="event.stopPropagation(); handleAdminLogout();" class="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all outline-none font-semibold group">
                    <i class="ri-logout-box-r-line text-[18px] shrink-0 text-neutral-400 group-hover:text-red-400 transition-colors"></i>
                    <span class="tracking-wide text-[10px] font-semibold group-hover:text-red-400 transition-colors">Logout</span>
                </button>
            </div>
        </div>
    `;
    return html;
}

window.toggleAdminSidebar = function(open) {
    const drawer = document.getElementById('adminSidebarDrawer');
    const backdrop = document.getElementById('adminSidebarBackdrop');
    const container = document.getElementById('admin-sidebar-container');
    
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

window.handleAdminLogout = function() {
    localStorage.removeItem('zellr_session_token');
    localStorage.removeItem('zellr_user_profile');
    window.location.replace('../login.html');
};

document.addEventListener('DOMContentLoaded', () => {
    const headerWrapper = document.getElementById('admin-header');
    const sidebarWrapper = document.getElementById('admin-sidebar-container');
    
    if (headerWrapper) headerWrapper.innerHTML = adminHeaderTemplate;
    if (sidebarWrapper) {
        const activeTabAttr = sidebarWrapper.getAttribute('data-active');
        sidebarWrapper.innerHTML = generateAdminSidebarTemplate(activeTabAttr);
    }
});