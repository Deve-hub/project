// متغيرات عامة
let fromYear = '';
let toYear = '';
let currentData = {};

// معالجة تغيير السنة
function handleYearChange() {
    const fromYearInput = document.getElementById('fromYear').value;
    const toYearInput = document.getElementById('toYear');

    // إذا تم إدخال سنة "من" كاملة، حدد "إلى" تلقائياً
    if (fromYearInput && fromYearInput.length >= 4) {
        const fromYearNum = parseInt(fromYearInput);
        if (fromYearNum >= 1400 && fromYearNum <= 1500) {
            toYearInput.value = fromYearNum + 1;
        }
    }

    // تحميل البيانات إذا كانت كلاهما مكتملة
    if (fromYearInput && fromYearInput.length >= 4 && toYearInput.value && toYearInput.value.length >= 4) {
        loadYear();
    }
}

// تحميل السنة
function loadYear() {
    const fromYearInput = document.getElementById('fromYear').value;
    const toYearInput = document.getElementById('toYear').value;

    if (!fromYearInput || !toYearInput) {
        return;
    }

    // التحقق من صحة نطاق السنين
    if (parseInt(fromYearInput) < 1400 || parseInt(fromYearInput) > 1500 ||
        parseInt(toYearInput) < 1400 || parseInt(toYearInput) > 1500) {
        alert('السنة يجب أن تكون بين 1400 و 1500');
        return;
    }

    if (parseInt(fromYearInput) >= parseInt(toYearInput)) {
        alert('السنة الثانية يجب أن تكون أكبر من السنة الأولى');
        return;
    }

    fromYear = fromYearInput;
    toYear = toYearInput;

    // تحميل البيانات من جميع السنين في النطاق
    currentData = {};
    for (let year = parseInt(fromYear); year <= parseInt(toYear); year++) {
        const key = `hijri_${year}`;
        const yearData = JSON.parse(localStorage.getItem(key)) || {};
        // دمج البيانات
        Object.keys(yearData).forEach(key => {
            currentData[key] = (currentData[key] || 0) + (yearData[key] || 0);
        });
    }

    updateCurrentYearDisplay();
    updateDataPreview();
}

// تحديث عرض السنة الحالية
function updateCurrentYearDisplay() {
    if (!fromYear || !toYear) {
        document.getElementById('currentYearDisplay').style.display = 'none';
        return;
    }

    // تحويل السنين الهجرية إلى ميلادية
    const miladiFrom = Math.floor((parseInt(fromYear) * 0.970224) + 621.5774);
    const miladiTo = Math.floor((parseInt(toYear) * 0.970224) + 621.5774);

    document.getElementById('yearInfoText').textContent =
        `إحصائيات سنة ${fromYear}/${toYear} (${miladiFrom}/${miladiTo})`;
    document.getElementById('currentYearDisplay').style.display = 'block';
}

// عرض الفئات حسب نوع التقاعد
function showCategories() {
    const retirementType = document.getElementById('retirementType').value;
    const categoriesSection = document.getElementById('categoriesSection');
    const categoriesContainer = document.getElementById('categoriesContainer');

    if (!retirementType) {
        categoriesSection.style.display = 'none';
        return;
    }

    // تعريف الفئات لكل نوع
    const categories = {
        normal: [{
                key: 'normal_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'normal_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'normal_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'normal_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'normal_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ],
        early: [{
                key: 'early_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'early_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'early_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'early_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'early_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ],
        disability: [{
                key: 'disability_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'disability_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'disability_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'disability_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'disability_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ],
        death: [{
                key: 'death_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'death_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'death_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'death_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'death_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ],
        resignation: [{
                key: 'resignation_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'resignation_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'resignation_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'resignation_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'resignation_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ],
        force_closure: [{
                key: 'force_closure_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'force_closure_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'force_closure_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'force_closure_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'force_closure_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ],
        discontinuation: [{
                key: 'discontinuation_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'discontinuation_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'discontinuation_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'discontinuation_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'discontinuation_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ],
        service_transfer: [{
                key: 'service_transfer_admin',
                name: 'إداريين',
                icon: 'fas fa-user-tie'
            },
            {
                key: 'service_transfer_teachers_male',
                name: 'معلمين',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'service_transfer_teachers_female',
                name: 'معلمات',
                icon: 'fas fa-chalkboard-teacher'
            },
            {
                key: 'service_transfer_users',
                name: 'مستخدمين',
                icon: 'fas fa-users'
            },
            {
                key: 'service_transfer_wages',
                name: 'أجور',
                icon: 'fas fa-money-bill-wave'
            }
        ]
    };

    const selectedCategories = categories[retirementType] || [];

    // إنشاء حقول الإدخال
    categoriesContainer.innerHTML = '';
    selectedCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <div class="category-header">
                <i class="${category.icon}"></i>
                <h4>${category.name}</h4>
            </div>
            <input type="number" 
                   class="category-input" 
                   data-key="${category.key}"
                   placeholder="أدخل العدد"
                   min="0"
                   value="${currentData[category.key] || ''}"
                   oninput="validateInput(this); enableSubmitButton(); updateDataPreview();">
        `;
        categoriesContainer.appendChild(categoryItem);
    });

    categoriesSection.style.display = 'block';
    enableSubmitButton();
}

// التحقق من صحة الإدخال
function validateInput(input) {
    const value = parseInt(input.value);

    if (input.value === '' || isNaN(value)) {
        input.className = 'category-input';
        return false;
    }

    if (value < 0) {
        input.className = 'category-input invalid';
        return false;
    }

    if (value > 10000) {
        input.className = 'category-input invalid';
        return false;
    }

    input.className = 'category-input valid';
    return true;
}

// تفعيل زر الإرسال
function enableSubmitButton() {
    const inputs = document.querySelectorAll('.category-input');
    let hasValidInput = false;

    inputs.forEach(input => {
        const value = parseInt(input.value);
        if (!isNaN(value) && value > 0) {
            hasValidInput = true;
        }
    });

    document.getElementById('submitBtn').disabled = !hasValidInput;
    document.getElementById('saveToDashboardBtn').disabled = !hasValidInput;
}

// تحديث معاينة البيانات
function updateDataPreview() {
    const inputs = document.querySelectorAll('.category-input');
    let total = 0;

    inputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        total += value;
    });

    document.getElementById('previewTotal').textContent = total;

    if (total > 0) {
        document.getElementById('dataPreview').style.display = 'block';
    } else {
        document.getElementById('dataPreview').style.display = 'none';
    }
}

// حفظ في لوحة العرض
function saveToDashboard() {
    if (!fromYear || !toYear) {
        alert('يرجى اختيار السنة أولاً');
        return;
    }

    if (Object.keys(currentData).length === 0) {
        alert('لا توجد بيانات لحفظها');
        return;
    }

    // حفظ البيانات مع معلومات السنة
    const dataToSave = {
        data: currentData,
        fromYear: fromYear,
        toYear: toYear,
        yearType: 'hijri',
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('dashboard_hijri_fromYear_toYear', JSON.stringify(dataToSave));

    alert('تم حفظ البيانات بنجاح!');
    window.location.href = 'dashboard.html';
}

// تحميل الصفحة
window.onload = function() {
    // تعيين القيم الافتراضية
    document.getElementById('fromYear').value = '1445';
    // تحديد "إلى" تلقائياً
    document.getElementById('toYear').value = '1446';
    loadYear();
};

// معالجة إرسال النموذج
document.getElementById('dataForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // جمع البيانات من الحقول
    const inputs = document.querySelectorAll('.category-input');
    inputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        if (value > 0) {
            currentData[input.dataset.key] = value;
        }
    });

    // توزيع البيانات على السنين في النطاق
    const yearsInRange = parseInt(toYear) - parseInt(fromYear) + 1;
    const dataPerYear = {};

    Object.keys(currentData).forEach(key => {
        const totalValue = currentData[key];
        const valuePerYear = Math.floor(totalValue / yearsInRange);
        const remainder = totalValue % yearsInRange;

        for (let year = parseInt(fromYear); year <= parseInt(toYear); year++) {
            if (!dataPerYear[year]) dataPerYear[year] = {};
            dataPerYear[year][key] = valuePerYear;
        }

        // توزيع الباقي على السنوات الأولى
        for (let i = 0; i < remainder; i++) {
            const year = parseInt(fromYear) + i;
            dataPerYear[year][key] += 1;
        }
    });

    // حفظ البيانات لكل سنة
    Object.keys(dataPerYear).forEach(year => {
        const key = `hijri_${year}`;
        localStorage.setItem(key, JSON.stringify(dataPerYear[year]));
    });

    // إعادة تحميل البيانات المدمجة
    currentData = {};
    for (let year = parseInt(fromYear); year <= parseInt(toYear); year++) {
        const key = `hijri_${year}`;
        const yearData = JSON.parse(localStorage.getItem(key)) || {};
        Object.keys(yearData).forEach(key => {
            currentData[key] = (currentData[key] || 0) + (yearData[key] || 0);
        });
    }

    updateDataPreview();
    alert('تم إضافة البيانات بنجاح!');
});