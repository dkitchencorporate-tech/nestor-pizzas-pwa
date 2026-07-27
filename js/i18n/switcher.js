window.app = window.app || {};

// Idioma por defecto
window.app.currentLang = localStorage.getItem('nestor_lang') || 'es';

window.app.toggleLanguage = function() {
    window.app.currentLang = window.app.currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem('nestor_lang', window.app.currentLang);
    window.app.applyTranslations();
    
    // Si la carta está cargada, re-renderizar para traducir los nombres de los productos si tienen name_en
    if(window.app.renderCategoryGrid) {
        window.app.renderCategoryGrid();
    }
};

window.app.applyTranslations = function() {
    const dict = window.I18N_DICT[window.app.currentLang];
    if(!dict) return;
    
    // 1. Traducir textos estáticos con data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(dict[key]) {
            // Si es un input, traducir el placeholder, si no, el textContent
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = dict[key];
            } else {
                el.textContent = dict[key];
            }
        }
    });
    
    // 2. Actualizar la bandera en la cabecera (Muestra la bandera a la que puedes CAMBIAR)
    // Si estamos en español, mostramos la bandera inglesa (para cambiar a inglés)
    // Si estamos en inglés, mostramos la bandera española (para cambiar a español)
    const flagBtn = document.getElementById('lang-switcher-flag');
    if(flagBtn) {
        if(window.app.currentLang === 'es') {
            flagBtn.innerHTML = '🇬🇧'; // Bandera inglesa
        } else {
            flagBtn.innerHTML = '🇪🇸'; // Bandera española
        }
    }
    
    // Actualizar también la bandera móvil si hay una específica
    const mobileFlagBtn = document.getElementById('mobile-lang-switcher-flag');
    if(mobileFlagBtn) {
        if(window.app.currentLang === 'es') {
            mobileFlagBtn.innerHTML = '🇬🇧';
        } else {
            mobileFlagBtn.innerHTML = '🇪🇸';
        }
    }
};

// Aplicar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    window.app.applyTranslations();
});
