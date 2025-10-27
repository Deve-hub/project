// تحميل إعدادات الألوان
document.addEventListener('DOMContentLoaded', function() {
    loadColorSettings();

    // الاستماع لتحديثات الألوان من النوافذ الأخرى
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('design-update');
        channel.addEventListener('message', (event) => {
            const settings = event.data;
            applyColorSettings(settings);
        });
    }
});

function loadColorSettings() {
    const savedSettings = localStorage.getItem('designSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            applyColorSettings(settings);
        } catch (error) {
            console.error('خطأ في تحميل إعدادات الألوان:', error);
        }
    }
}

function applyColorSettings(settings) {
    const root = document.documentElement;

    // تطبيق الألوان
    if (settings.scheme) {
        const colorScheme = getColorScheme(settings.scheme);
        if (colorScheme) {
            // تطبيق الألوان الأساسية
            root.style.setProperty('--fluent-primary', colorScheme.colors.primary);
            root.style.setProperty('--fluent-primary-dark', darkenColor(colorScheme.colors.primary, 0.1));
            root.style.setProperty('--fluent-secondary', colorScheme.colors.secondary);
            root.style.setProperty('--fluent-accent', colorScheme.colors.accent);

            // تطبيق ألوان النصوص والخلفيات
            root.style.setProperty('--fluent-text-primary', colorScheme.colors.text);
            root.style.setProperty('--fluent-text-secondary', lightenColor(colorScheme.colors.text, 0.3));
            root.style.setProperty('--fluent-background-primary', colorScheme.colors.background);
            root.style.setProperty('--fluent-background-secondary', lightenColor(colorScheme.colors.background, 0.02));
            root.style.setProperty('--fluent-background-tertiary', lightenColor(colorScheme.colors.background, 0.05));
            root.style.setProperty('--fluent-border-primary', lightenColor(colorScheme.colors.text, 0.8));
            root.style.setProperty('--fluent-border-secondary', lightenColor(colorScheme.colors.text, 0.9));
            root.style.setProperty('--fluent-surface-primary', colorScheme.colors.background);
            root.style.setProperty('--fluent-surface-secondary', lightenColor(colorScheme.colors.background, 0.02));
            root.style.setProperty('--fluent-surface-tertiary', lightenColor(colorScheme.colors.background, 0.05));
        }
    }

    // تطبيق الألوان المخصصة
    if (settings.customColors) {
        if (settings.customColors.primary) {
            root.style.setProperty('--fluent-primary', settings.customColors.primary);
            root.style.setProperty('--fluent-primary-dark', darkenColor(settings.customColors.primary, 0.1));
        }
        if (settings.customColors.secondary) {
            root.style.setProperty('--fluent-secondary', settings.customColors.secondary);
        }
        if (settings.customColors.accent) {
            root.style.setProperty('--fluent-accent', settings.customColors.accent);
        }
    }
}

function getColorScheme(schemeName) {
    const colorSchemes = {
        'saudi-green': {
            name: 'الأخضر السعودي',
            colors: {
                primary: '#166534',
                secondary: '#15803D',
                accent: '#059669',
                text: '#1F2937',
                background: '#F9FAFB'
            }
        },
        'royal-blue': {
            name: 'الأزرق الملكي',
            colors: {
                primary: '#1E40AF',
                secondary: '#2563EB',
                accent: '#3B82F6',
                text: '#1F2937',
                background: '#F8FAFC'
            }
        },
        'deep-purple': {
            name: 'البنفسجي العميق',
            colors: {
                primary: '#7C3AED',
                secondary: '#8B5CF6',
                accent: '#A78BFA',
                text: '#1F2937',
                background: '#FAFAFA'
            }
        },
        'warm-orange': {
            name: 'البرتقالي الدافئ',
            colors: {
                primary: '#EA580C',
                secondary: '#F97316',
                accent: '#FB923C',
                text: '#1F2937',
                background: '#FFF7ED'
            }
        },
        'elegant-gold': {
            name: 'الذهبي الأنيق',
            colors: {
                primary: '#D97706',
                secondary: '#F59E0B',
                accent: '#FCD34D',
                text: '#1F2937',
                background: '#FFFBEB'
            }
        },
        'modern-teal': {
            name: 'التركوازي الحديث',
            colors: {
                primary: '#0D9488',
                secondary: '#14B8A6',
                accent: '#5EEAD4',
                text: '#1F2937',
                background: '#F0FDFA'
            }
        },
        'soft-pink': {
            name: 'الوردي الناعم',
            colors: {
                primary: '#DB2777',
                secondary: '#EC4899',
                accent: '#F472B6',
                text: '#1F2937',
                background: '#FDF2F8'
            }
        },
        'gradient-sunset': {
            name: 'غروب الشمس',
            colors: {
                primary: '#F97316',
                secondary: '#FB923C',
                accent: '#FCD34D',
                text: '#1F2937',
                background: '#FFF7ED'
            }
        },
        'luxury-emerald': {
            name: 'الزمردي الفاخر',
            colors: {
                primary: '#059669',
                secondary: '#10B981',
                accent: '#34D399',
                text: '#1F2937',
                background: '#ECFDF5'
            }
        },
        'ocean-breeze': {
            name: 'نسمة المحيط',
            colors: {
                primary: '#0891B2',
                secondary: '#06B6D4',
                accent: '#67E8F9',
                text: '#1F2937',
                background: '#F0F9FF'
            }
        }
    };

    return colorSchemes[schemeName] || colorSchemes['saudi-green'];
}

// دوال مساعدة للألوان
function darkenColor(color, amount) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function lightenColor(color, amount) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}