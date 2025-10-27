// إدارة الألوان
class ColorManager {
    constructor() {
        this.colorSchemes = {
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

        this.currentScheme = 'saudi-green';
        this.customColors = {};
        this.isUpdating = false;
        this.updateTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.updateUI();
        this.updatePreview();
    }

    setupEventListeners() {
        // أزرار اختيار مجموعات الألوان
        document.querySelectorAll('.select-scheme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scheme = e.target.getAttribute('data-scheme');
                this.selectScheme(scheme);
            });
        });

        // أزرار تخصيص الألوان
        document.querySelectorAll('.color-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.debouncedUpdateColor(e.target);
            });
            input.addEventListener('change', (e) => {
                this.debouncedUpdateColor(e.target);
            });
        });
    }

    selectScheme(schemeName) {
        if (this.isUpdating) return;

        this.isUpdating = true;
        this.currentScheme = schemeName;
        this.loadSchemeColors();
        this.updateUI();
        this.updatePreview();
        this.applyColors();
        this.saveSettings(); // حفظ بدون رسالة

        setTimeout(() => {
            this.isUpdating = false;
        }, 100);
    }

    loadSchemeColors() {
        const scheme = this.colorSchemes[this.currentScheme];
        if (scheme) {
            document.getElementById('primaryColor').value = scheme.colors.primary;
            document.getElementById('secondaryColor').value = scheme.colors.secondary;
            document.getElementById('accentColor').value = scheme.colors.accent;

            // تحديث قيم الألوان المعروضة
            document.querySelectorAll('.color-value').forEach(span => {
                const input = span.previousElementSibling;
                span.textContent = input.value;
            });
        }
    }

    debouncedUpdateColor(input) {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        // تحديث فوري للقيمة المعروضة
        this.updateColorValue(input.id, input.value);

        this.updateTimeout = setTimeout(() => {
            if (!this.isUpdating) {
                this.updateCustomColor(input.id, input.value);
                this.updatePreview();
                this.applyColors();
                this.saveSettings(); // حفظ بدون رسالة
            }
        }, 500);
    }

    updateColorValue(inputId, value) {
        const span = document.querySelector(`#${inputId}`).nextElementSibling;
        if (span) {
            span.textContent = value;
        }
    }

    updateCustomColor(inputId, value) {
        const colorType = inputId.replace('Color', '');
        this.customColors[colorType] = value;
    }

    applyColors() {
        if (this.isUpdating) return;

        const colors = this.getCurrentColors();

        // تطبيق الألوان على CSS Variables
        document.documentElement.style.setProperty('--fluent-primary', colors.primary);
        document.documentElement.style.setProperty('--fluent-primary-dark', this.darkenColor(colors.primary, 0.1));
        document.documentElement.style.setProperty('--fluent-secondary', colors.secondary);
        document.documentElement.style.setProperty('--fluent-accent', colors.accent);
        document.documentElement.style.setProperty('--fluent-text-primary', colors.text);
        document.documentElement.style.setProperty('--fluent-text-secondary', this.lightenColor(colors.text, 0.3));
        document.documentElement.style.setProperty('--fluent-background-primary', colors.background);
        document.documentElement.style.setProperty('--fluent-background-secondary', this.lightenColor(colors.background, 0.02));
        document.documentElement.style.setProperty('--fluent-background-tertiary', this.lightenColor(colors.background, 0.05));
        document.documentElement.style.setProperty('--fluent-border-primary', this.lightenColor(colors.text, 0.8));
        document.documentElement.style.setProperty('--fluent-border-secondary', this.lightenColor(colors.text, 0.9));
        document.documentElement.style.setProperty('--fluent-surface-primary', colors.background);
        document.documentElement.style.setProperty('--fluent-surface-secondary', this.lightenColor(colors.background, 0.02));
        document.documentElement.style.setProperty('--fluent-surface-tertiary', this.lightenColor(colors.background, 0.05));

        // إرسال التحديث للتبويبات الأخرى
        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('design-update');
            channel.postMessage({
                scheme: this.currentScheme,
                customColors: this.customColors
            });
        }
    }

    getCurrentColors() {
        const scheme = this.colorSchemes[this.currentScheme];
        return {
            primary: this.customColors.primary || scheme.colors.primary,
            secondary: this.customColors.secondary || scheme.colors.secondary,
            accent: this.customColors.accent || scheme.colors.accent,
            text: scheme.colors.text,
            background: scheme.colors.background
        };
    }

    updateUI() {
        // تحديث حالة بطاقات الألوان
        document.querySelectorAll('.scheme-card').forEach(card => {
            card.classList.remove('selected');
            if (card.getAttribute('data-scheme') === this.currentScheme) {
                card.classList.add('selected');
            }
        });
    }

    updatePreview() {
        const colors = this.getCurrentColors();
        const preview = document.getElementById('designPreviewLarge');
        if (preview) {
            preview.style.setProperty('--preview-primary', colors.primary);
            preview.style.setProperty('--preview-secondary', colors.secondary);
            preview.style.setProperty('--preview-accent', colors.accent);
        }
    }

    saveSettings(showMessage = false) {
        const settings = {
            scheme: this.currentScheme,
            customColors: this.customColors
        };

        localStorage.setItem('designSettings', JSON.stringify(settings));

        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('design-update');
            channel.postMessage(settings);
        }

        if (showMessage) {
            this.showSuccessMessage('تم حفظ الإعدادات بنجاح!');
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('designSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.currentScheme = settings.scheme || 'saudi-green';
                this.customColors = settings.customColors || {};
                this.loadSchemeColors();
                this.applyColors();
            } catch (e) {
                console.error('خطأ في تحميل الإعدادات:', e);
            }
        }
    }

    resetSettings() {
        this.currentScheme = 'saudi-green';
        this.customColors = {};
        this.loadSchemeColors();
        this.updateUI();
        this.updatePreview();
        this.applyColors();
        this.saveSettings(); // حفظ بدون رسالة
    }

    showSuccessMessage(message) {
        // إنشاء رسالة نجاح مؤقتة
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--fluent-primary);
            color: white;
            padding: 12px 24px;
            border-radius: var(--fluent-radius-medium);
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // دوال مساعدة للألوان
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    lightenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(255 * amount));
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(255 * amount));
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(255 * amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}

// تهيئة المدير عند تحميل الصفحة
let colorManager;

document.addEventListener('DOMContentLoaded', function() {
    colorManager = new ColorManager();
});

// دالة حفظ الإعدادات العامة (تم حذفها - الألوان تطبق تلقائياً)

// دالة إعادة تعيين الإعدادات
function resetThemeSettings() {
    if (colorManager) {
        colorManager.resetSettings();
    }
}