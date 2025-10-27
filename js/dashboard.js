let currentData = {};
let currentYear = '';
let fromYear = '';
let toYear = '';
let yearType = 'hijri';
let typeChart, categoryChart, teachersMaleChart, teachersFemaleChart;

// تحميل بيانات السنة
function loadYearData() {
    const yearInput = document.getElementById('year').value;
    if (!yearInput) {
        alert('يرجى إدخال السنة');
        return;
    }
    currentYear = yearInput;
    yearType = document.getElementById('yearType').value;
    const key = `${yearType}_${currentYear}`;
    currentData = JSON.parse(localStorage.getItem(key)) || {};

    updateDisplay();
}

// تحميل البيانات من صفحة الإدخال
function loadDataFromInput() {
    // البحث عن أحدث بيانات محفوظة
    const keys = Object.keys(localStorage);
    let latestData = null;
    let latestTimestamp = 0;

    keys.forEach(key => {
        if (key.startsWith('dashboard_hijri_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.timestamp) {
                    const timestamp = new Date(data.timestamp).getTime();
                    if (timestamp > latestTimestamp) {
                        latestTimestamp = timestamp;
                        latestData = data;
                    }
                }
            } catch (e) {
                // تجاهل البيانات التالفة
            }
        }
    });

    if (latestData) {
        currentData = latestData.data;
        fromYear = latestData.fromYear;
        toYear = latestData.toYear;
        yearType = latestData.yearType;
        updateDisplay();
    }
}

// تبديل السنة
function switchYear() {
    if (!currentYear) {
        alert('يرجى تحميل سنة أولاً');
        return;
    }
    const nextYear = parseInt(currentYear) + 1;
    document.getElementById('year').value = nextYear;
    loadYearData();
}

// تحديث العرض (النسخة المحسّنة)
function updateDisplay() {
    // تحويل السنين الهجرية إلى ميلادية
    let hijriFrom, hijriTo, miladiFrom, miladiTo;

    if (fromYear && toYear) {
        // استخدام نطاق السنين
        hijriFrom = fromYear;
        hijriTo = toYear;
        // تحويل تقريبي من الهجري إلى الميلادي
        miladiFrom = Math.floor((parseInt(hijriFrom) * 0.970224) + 621.5774);
        miladiTo = Math.floor((parseInt(hijriTo) * 0.970224) + 621.5774);
        document.getElementById('report-period').textContent = `إحصائيات سنة ${hijriFrom}/${hijriTo} (${miladiFrom}/${miladiTo})`;
    } else if (currentYear) {
        // استخدام سنة واحدة (للتوافق مع النظام القديم)
        hijriFrom = currentYear;
        hijriTo = currentYear;
        const hijriPrev = parseInt(hijriFrom) - 1;
        miladiFrom = Math.floor((parseInt(hijriFrom) * 0.970224) + 621.5774);
        miladiTo = Math.floor((parseInt(hijriTo) * 0.970224) + 621.5774);
        const miladiPrev = Math.floor((parseInt(hijriPrev) * 0.970224) + 621.5774);
        document.getElementById('report-period').textContent = `إحصائيات سنة ${hijriFrom}/${hijriPrev} (${miladiFrom}/${miladiPrev})`;
    }

    if (Object.keys(currentData).length === 0) {
        document.getElementById('statsDisplay').style.display = 'none';
        document.getElementById('displayByType').style.display = 'none';
        document.getElementById('displayByCategory').style.display = 'none';
        document.getElementById('teachersMaleSection').style.display = 'none';
        document.getElementById('teachersFemaleSection').style.display = 'none';
        document.getElementById('detailedTableSection').style.display = 'none';
        document.getElementById('noData').style.display = 'block';
        return;
    }

    document.getElementById('noData').style.display = 'none';
    document.getElementById('statsDisplay').style.display = 'grid';
    document.getElementById('displayByType').style.display = 'block';
    document.getElementById('displayByCategory').style.display = 'block';
    document.getElementById('teachersMaleSection').style.display = 'block';
    document.getElementById('teachersFemaleSection').style.display = 'block';
    document.getElementById('detailedTableSection').style.display = 'block';

    // حساب الإجمالي الكلي
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);
    // Animate the total count
    animateValue("totalCount", 0, total, 1500);

    // حساب الإجماليات حسب النوع والفئة
    const typeTotals = {
        normal: {
            total: 0
        },
        early: {
            total: 0
        },
        disability: {
            total: 0
        },
        death: {
            total: 0
        },
        resignation: {
            total: 0
        },
        force_closure: {
            total: 0
        },
        discontinuation: {
            total: 0
        },
        service_transfer: {
            total: 0
        }
    };

    const categoryTotals = {
        admin: {
            total: 0
        },
        wages: {
            total: 0
        },
        users: {
            total: 0
        },
        teachers_male: {
            total: 0
        },
        teachers_female: {
            total: 0
        }
    };

    // تجميع البيانات
    Object.entries(currentData).forEach(([key, value]) => {
        const parts = key.split('_');
        const type = parts[0];
        const category = parts.slice(1).join('_'); // للتعامل مع teachers_male و teachers_female

        if (typeTotals[type]) typeTotals[type].total += value;
        if (categoryTotals[category]) categoryTotals[category].total += value;
    });

    // تحديث البطاقات
    const typeList = document.getElementById('typeList');
    if (typeList) {
        typeList.innerHTML = Object.entries(typeTotals).map(([k, v]) => {
            const names = {
                normal: 'نظامي',
                early: 'مبكر',
                disability: 'عجز صحي',
                death: 'وفاة',
                resignation: 'طي قيد إستقالة',
                force_closure: 'طي قيد بقوة النظام',
                discontinuation: 'إنقطاع',
                service_transfer: 'نقل خدمات طي قيد'
            };
            const percentage = total > 0 ? ((v.total / total) * 100).toFixed(1) : 0;
            return `<li><span>${names[k]}</span><strong>${v.total.toLocaleString()} (${percentage}%)</strong></li>`;
        }).join('');
    }

    const categoryList = document.getElementById('categoryList');
    if (categoryList) {
        categoryList.innerHTML = Object.entries(categoryTotals).map(([k, v]) => {
            const names = {
                admin: 'إداريين',
                wages: 'أجور',
                users: 'مستخدمين',
                teachers_male: 'معلمين',
                teachers_female: 'معلمات'
            };
            const percentage = total > 0 ? ((v.total / total) * 100).toFixed(1) : 0;
            return `<li><span>${names[k]}</span><strong>${v.total.toLocaleString()} (${percentage}%)</strong></li>`;
        }).join('');
    }

    // تحديث الجداول
    updateTables(typeTotals, categoryTotals, total);

    // تحديث جداول المعلمين والمعلمات
    updateTeachersTables(total);

    // تأخير إنشاء الرسوم البيانية لضمان توفر العناصر
    setTimeout(() => {
        createCharts();
    }, 100);
}

// تحديث الجداول
function updateTables(typeTotals, categoryTotals, total) {
    // تحديث جدول الأنواع
    updateTypeTable(typeTotals, total);

    // تحديث جدول الفئات
    updateCategoryTable(categoryTotals, total);

    // تحديث الجدول التفصيلي
    updateDetailedTable(total);
}

// تحديث جداول المعلمين والمعلمات
function updateTeachersTables(total) {
    updateTeachersMaleTable(total);
    updateTeachersFemaleTable(total);
}

// تحديث جدول المعلمين
function updateTeachersMaleTable(total) {
    const teachersMaleTableBody = document.getElementById('teachersMaleTable');
    if (!teachersMaleTableBody) return;

    const typeNames = {
        normal: 'نظامي',
        early: 'مبكر',
        disability: 'عجز صحي',
        death: 'وفاة',
        resignation: 'طي قيد إستقالة',
        force_closure: 'طي قيد بقوة النظام',
        discontinuation: 'إنقطاع',
        service_transfer: 'نقل خدمات طي قيد'
    };

    let tableHTML = '';
    let teachersMaleTotal = 0;

    Object.entries(typeNames).forEach(([typeKey, typeName]) => {
        const key = `${typeKey}_teachers_male`;
        const value = currentData[key] || 0;
        teachersMaleTotal += value;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        tableHTML += `
            <tr>
                <td class="type-cell">${typeName}</td>
                <td class="data-cell">${value.toLocaleString()}</td>
                <td class="total-cell">${percentage}%</td>
            </tr>
        `;
    });

    teachersMaleTableBody.innerHTML = tableHTML;

    // إضافة الإجمالي
    const teachersMaleTableFoot = document.querySelector('#teachersMaleTable').parentElement.querySelector('tfoot');
    if (teachersMaleTableFoot) {
        const totalPercentage = total > 0 ? ((teachersMaleTotal / total) * 100).toFixed(1) : 0;
        teachersMaleTableFoot.innerHTML = `
            <tr class="grand-total">
                <td class="type-cell">إجمالي المعلمين</td>
                <td class="data-cell">${teachersMaleTotal.toLocaleString()}</td>
                <td class="total-cell">${totalPercentage}%</td>
            </tr>
        `;
    }
}

// تحديث جدول المعلمات
function updateTeachersFemaleTable(total) {
    const teachersFemaleTableBody = document.getElementById('teachersFemaleTable');
    if (!teachersFemaleTableBody) return;

    const typeNames = {
        normal: 'نظامي',
        early: 'مبكر',
        disability: 'عجز صحي',
        death: 'وفاة',
        resignation: 'طي قيد إستقالة',
        force_closure: 'طي قيد بقوة النظام',
        discontinuation: 'إنقطاع',
        service_transfer: 'نقل خدمات طي قيد'
    };

    let tableHTML = '';
    let teachersFemaleTotal = 0;

    Object.entries(typeNames).forEach(([typeKey, typeName]) => {
        const key = `${typeKey}_teachers_female`;
        const value = currentData[key] || 0;
        teachersFemaleTotal += value;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        tableHTML += `
            <tr>
                <td class="type-cell">${typeName}</td>
                <td class="data-cell">${value.toLocaleString()}</td>
                <td class="total-cell">${percentage}%</td>
            </tr>
        `;
    });

    teachersFemaleTableBody.innerHTML = tableHTML;

    // إضافة الإجمالي
    const teachersFemaleTableFoot = document.querySelector('#teachersFemaleTable').parentElement.querySelector('tfoot');
    if (teachersFemaleTableFoot) {
        const totalPercentage = total > 0 ? ((teachersFemaleTotal / total) * 100).toFixed(1) : 0;
        teachersFemaleTableFoot.innerHTML = `
            <tr class="grand-total">
                <td class="type-cell">إجمالي المعلمات</td>
                <td class="data-cell">${teachersFemaleTotal.toLocaleString()}</td>
                <td class="total-cell">${totalPercentage}%</td>
            </tr>
        `;
    }
}

// تحديث جدول الأنواع
function updateTypeTable(typeTotals, total) {
    const typeTableBody = document.getElementById('typeTable');
    if (!typeTableBody) return;

    const typeNames = {
        normal: 'نظامي',
        early: 'مبكر',
        disability: 'عجز صحي',
        death: 'وفاة',
        resignation: 'طي قيد إستقالة',
        force_closure: 'طي قيد بقوة النظام',
        discontinuation: 'إنقطاع',
        service_transfer: 'نقل خدمات طي قيد'
    };

    typeTableBody.innerHTML = Object.entries(typeTotals).map(([key, data]) => {
        const percentage = total > 0 ? ((data.total / total) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td class="type-cell">${typeNames[key]}</td>
                <td class="data-cell">${data.total.toLocaleString()}</td>
                <td class="total-cell">${percentage}%</td>
            </tr>
        `;
    }).join('');

    // إضافة الإجمالي
    const typeTableFoot = document.querySelector('#typeTable').parentElement.querySelector('tfoot');
    if (typeTableFoot) {
        typeTableFoot.innerHTML = `
            <tr class="grand-total">
                <td class="type-cell">الإجمالي</td>
                <td class="data-cell">${total.toLocaleString()}</td>
                <td class="total-cell">100%</td>
            </tr>
        `;
    }
}

// تحديث جدول الفئات
function updateCategoryTable(categoryTotals, total) {
    const categoryTableBody = document.getElementById('categoryTable');
    if (!categoryTableBody) return;

    const categoryNames = {
        admin: 'إداريين',
        wages: 'أجور',
        users: 'مستخدمين',
        teachers_male: 'معلمين',
        teachers_female: 'معلمات'
    };

    categoryTableBody.innerHTML = Object.entries(categoryTotals).map(([key, data]) => {
        const percentage = total > 0 ? ((data.total / total) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td class="type-cell">${categoryNames[key]}</td>
                <td class="data-cell">${data.total.toLocaleString()}</td>
                <td class="total-cell">${percentage}%</td>
            </tr>
        `;
    }).join('');

    // إضافة الإجمالي
    const categoryTableFoot = document.querySelector('#categoryTable').parentElement.querySelector('tfoot');
    if (categoryTableFoot) {
        categoryTableFoot.innerHTML = `
            <tr class="grand-total">
                <td class="type-cell">الإجمالي</td>
                <td class="data-cell">${total.toLocaleString()}</td>
                <td class="total-cell">100%</td>
            </tr>
        `;
    }
}

// تحديث الجدول التفصيلي
function updateDetailedTable(total) {
    const detailedTableBody = document.getElementById('dataTable');
    if (!detailedTableBody) return;

    const typeNames = {
        normal: 'نظامي',
        early: 'مبكر',
        disability: 'عجز صحي',
        death: 'وفاة',
        resignation: 'طي قيد إستقالة',
        force_closure: 'طي قيد بقوة النظام',
        discontinuation: 'إنقطاع',
        service_transfer: 'نقل خدمات طي قيد'
    };

    const categoryNames = {
        admin: 'إداريين',
        wages: 'أجور',
        users: 'مستخدمين',
        teachers_male: 'معلمين',
        teachers_female: 'معلمات'
    };

    let tableHTML = '';
    let grandTotal = 0;

    Object.entries(typeNames).forEach(([typeKey, typeName]) => {
        let typeTotal = 0;
        let rowHTML = `<tr><td class="type-cell">${typeName}</td>`;

        ['admin', 'wages', 'users', 'teachers_male', 'teachers_female'].forEach(categoryKey => {
            const key = `${typeKey}_${categoryKey}`;
            const value = currentData[key] || 0;
            typeTotal += value;
            rowHTML += `<td class="data-cell">${value.toLocaleString()}</td>`;
        });

        const percentage = total > 0 ? ((typeTotal / total) * 100).toFixed(1) : 0;
        rowHTML += `<td class="total-cell">${typeTotal.toLocaleString()}</td>`;
        rowHTML += `<td class="total-cell">${percentage}%</td></tr>`;

        tableHTML += rowHTML;
        grandTotal += typeTotal;
    });

    detailedTableBody.innerHTML = tableHTML;

    // تحديث الإجمالي العام
    const detailedTableFoot = document.querySelector('#detailedTableSection tfoot');
    if (detailedTableFoot) {
        let footHTML = '<tr class="grand-total"><td class="type-cell">الإجمالي العام</td>';

        ['admin', 'wages', 'users', 'teachers_male', 'teachers_female'].forEach(categoryKey => {
            let categoryTotal = 0;
            Object.keys(typeNames).forEach(typeKey => {
                const key = `${typeKey}_${categoryKey}`;
                categoryTotal += currentData[key] || 0;
            });
            const percentage = total > 0 ? ((categoryTotal / total) * 100).toFixed(1) : 0;
            footHTML += `<td class="total-cell">${categoryTotal.toLocaleString()}</td>`;
        });

        const grandPercentage = total > 0 ? 100 : 0;
        footHTML += `<td class="grand-total-cell">${grandTotal.toLocaleString()}</td>`;
        footHTML += `<td class="grand-total-cell">${grandPercentage}%</td></tr>`;

        detailedTableFoot.innerHTML = footHTML;
    }
}

// Function to animate numbers
function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);
    const timer = setInterval(function() {
        current += increment;
        obj.textContent = current.toLocaleString();
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}


// إنشاء الرسوم البيانية
function createCharts() {
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    // التحقق من وجود مكتبة Chart.js
    if (typeof Chart === 'undefined') {
        console.error('مكتبة Chart.js غير محملة!');
        return;
    }

    // التحقق من وجود العناصر
    const typeChartElement = document.getElementById('typeChart');
    const categoryChartElement = document.getElementById('categoryChart');

    if (!typeChartElement || !categoryChartElement) {
        setTimeout(() => {
            createCharts();
        }, 200);
        return;
    }

    const types = {
        normal: 0,
        early: 0,
        disability: 0,
        death: 0,
        resignation: 0,
        force_closure: 0,
        discontinuation: 0,
        service_transfer: 0
    };
    const categories = {
        admin: 0,
        wages: 0,
        users: 0,
        teachers_male: 0,
        teachers_female: 0
    };
    Object.keys(currentData).forEach(key => {
        const parts = key.split('_');
        const type = parts[0];
        const category = parts.slice(1).join('_');
        types[type] += currentData[key];
        categories[category] += currentData[key];
    });

    // التحقق من وجود مكتبة ChartDataLabels
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    const chartColors = {
        pie: [
            '#4A90E2', // أزرق فاتح
            '#50C878', // أخضر فاتح
            '#FF6B6B', // أحمر وردي
            '#FFD93D', // أصفر ذهبي
            '#9B59B6', // بنفسجي
            '#E67E22', // برتقالي
            '#1ABC9C', // تركوازي
            '#E74C3C' // أحمر
        ],
        bar: [
            '#4A90E2', // أزرق فاتح
            '#50C878', // أخضر فاتح
            '#FF6B6B', // أحمر وردي
            '#FFD93D', // أصفر ذهبي
            '#9B59B6' // بنفسجي
        ]
    };

    // رسم دائري للأنواع
    const ctxType = document.getElementById('typeChart').getContext('2d');
    if (typeChart) typeChart.destroy();
    typeChart = new Chart(ctxType, {
        type: 'pie',
        data: {
            labels: ['نظامي', 'مبكر', 'عجز صحي', 'وفاة', 'طي قيد إستقالة', 'طي قيد بقوة النظام', 'إنقطاع', 'نقل خدمات طي قيد'],
            datasets: [{
                data: Object.values(types),
                backgroundColor: [
                    '#4A90E2', // أزرق فاتح للنظامي
                    '#50C878', // أخضر فاتح للمبكر
                    '#FF6B6B', // أحمر وردي للعجز
                    '#9B59B6', // بنفسجي للوفاة
                    '#E67E22', // برتقالي لطي قيد إستقالة
                    '#E74C3C', // أحمر لطي قيد بقوة النظام
                    '#8E44AD', // بنفسجي داكن للإنقطاع
                    '#1ABC9C' // تركوازي لنقل خدمات طي قيد
                ],
                borderColor: [
                    '#357ABD', // أزرق داكن
                    '#3FAE5A', // أخضر داكن
                    '#E53E3E', // أحمر داكن
                    '#8E44AD', // بنفسجي داكن
                    '#D35400', // برتقالي داكن
                    '#C0392B', // أحمر داكن
                    '#7D3C98', // بنفسجي داكن جداً
                    '#16A085' // تركوازي داكن
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 2,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                datalabels: {
                    display: false
                }
            }
        }
    });

    // إضافة النسب أسفل الدائرة
    addPercentagesBelowChartWithColors('typeChart', Object.values(types), ['نظامي', 'مبكر', 'عجز صحي', 'وفاة', 'طي قيد إستقالة', 'طي قيد بقوة النظام', 'إنقطاع', 'نقل خدمات طي قيد'], total, [
        '#4A90E2', // أزرق فاتح للنظامي
        '#50C878', // أخضر فاتح للمبكر
        '#FF6B6B', // أحمر وردي للعجز
        '#9B59B6', // بنفسجي للوفاة
        '#E67E22', // برتقالي لطي قيد إستقالة
        '#E74C3C', // أحمر لطي قيد بقوة النظام
        '#8E44AD', // بنفسجي داكن للإنقطاع
        '#1ABC9C' // تركوازي لنقل خدمات طي قيد
    ]);

    // رسم عمودي للفئات
    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctxCategory, {
        type: 'bar',
        data: {
            labels: ['إداريين', 'أجور', 'مستخدمين', 'معلمين', 'معلمات'],
            datasets: [{
                label: 'عدد المتقاعدين',
                data: Object.values(categories),
                backgroundColor: [
                    '#4A90E2', // أزرق فاتح للإداريين
                    '#50C878', // أخضر فاتح للأجور
                    '#FF6B6B', // أحمر وردي للمستخدمين
                    '#FFD93D', // أصفر ذهبي للمعلمين
                    '#9B59B6' // بنفسجي للمعلمات
                ],
                borderColor: [
                    '#357ABD', // أزرق داكن
                    '#3FAE5A', // أخضر داكن
                    '#E53E3E', // أحمر داكن
                    '#F4D03F', // أصفر داكن
                    '#8E44AD' // بنفسجي داكن
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 2,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });

    // إضافة النسب أسفل الرسم البياني للفئات
    addPercentagesBelowChartWithColors('categoryChart', Object.values(categories), ['إداريين', 'أجور', 'مستخدمين', 'معلمين', 'معلمات'], total, [
        '#4A90E2', // أزرق فاتح للإداريين
        '#50C878', // أخضر فاتح للأجور
        '#FF6B6B', // أحمر وردي للمستخدمين
        '#FFD93D', // أصفر ذهبي للمعلمين
        '#9B59B6' // بنفسجي للمعلمات
    ]);

    createProgressBars(types, categories, total);

    // إنشاء الرسوم البيانية للمعلمين والمعلمات
    createTeachersCharts(total);
}

// إنشاء الرسوم البيانية للمعلمين والمعلمات
function createTeachersCharts(total) {
    // بيانات المعلمين
    const teachersMaleData = {
        normal: currentData['normal_teachers_male'] || 0,
        early: currentData['early_teachers_male'] || 0,
        disability: currentData['disability_teachers_male'] || 0,
        death: currentData['death_teachers_male'] || 0,
        resignation: currentData['resignation_teachers_male'] || 0,
        force_closure: currentData['force_closure_teachers_male'] || 0,
        discontinuation: currentData['discontinuation_teachers_male'] || 0,
        service_transfer: currentData['service_transfer_teachers_male'] || 0
    };

    // بيانات المعلمات
    const teachersFemaleData = {
        normal: currentData['normal_teachers_female'] || 0,
        early: currentData['early_teachers_female'] || 0,
        disability: currentData['disability_teachers_female'] || 0,
        death: currentData['death_teachers_female'] || 0,
        resignation: currentData['resignation_teachers_female'] || 0,
        force_closure: currentData['force_closure_teachers_female'] || 0,
        discontinuation: currentData['discontinuation_teachers_female'] || 0,
        service_transfer: currentData['service_transfer_teachers_female'] || 0
    };

    // رسم بياني للمعلمين
    createTeachersMaleChart(teachersMaleData, total);

    // رسم بياني للمعلمات
    createTeachersFemaleChart(teachersFemaleData, total);
}

// رسم بياني للمعلمين
function createTeachersMaleChart(data, total) {
    const ctx = document.getElementById('teachersMaleChart');
    if (!ctx) return;

    if (teachersMaleChart) teachersMaleChart.destroy();

    teachersMaleChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['نظامي', 'مبكر', 'عجز صحي', 'وفاة', 'طي قيد إستقالة', 'طي قيد بقوة النظام', 'إنقطاع', 'نقل خدمات طي قيد'],
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#4A90E2', // أزرق فاتح للنظامي
                    '#50C878', // أخضر فاتح للمبكر
                    '#FF6B6B', // أحمر وردي للعجز
                    '#9B59B6', // بنفسجي للوفاة
                    '#E67E22', // برتقالي لطي قيد إستقالة
                    '#E74C3C', // أحمر لطي قيد بقوة النظام
                    '#8E44AD', // بنفسجي داكن للإنقطاع
                    '#1ABC9C' // تركوازي لنقل خدمات طي قيد
                ],
                borderColor: [
                    '#357ABD', // أزرق داكن
                    '#3FAE5A', // أخضر داكن
                    '#E53E3E', // أحمر داكن
                    '#8E44AD', // بنفسجي داكن
                    '#D35400', // برتقالي داكن
                    '#C0392B', // أحمر داكن
                    '#7D3C98', // بنفسجي داكن جداً
                    '#16A085' // تركوازي داكن
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 2,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                datalabels: {
                    display: false
                }
            }
        }
    });

    // إضافة النسب أسفل الرسم
    addPercentagesBelowChartWithColors('teachersMaleChart', Object.values(data), ['نظامي', 'مبكر', 'عجز صحي', 'وفاة', 'طي قيد إستقالة', 'طي قيد بقوة النظام', 'إنقطاع', 'نقل خدمات طي قيد'], total, [
        '#4A90E2', // أزرق فاتح للنظامي
        '#50C878', // أخضر فاتح للمبكر
        '#FF6B6B', // أحمر وردي للعجز
        '#9B59B6', // بنفسجي للوفاة
        '#E67E22', // برتقالي لطي قيد إستقالة
        '#E74C3C', // أحمر لطي قيد بقوة النظام
        '#8E44AD', // بنفسجي داكن للإنقطاع
        '#1ABC9C' // تركوازي لنقل خدمات طي قيد
    ]);
}

// رسم بياني للمعلمات
function createTeachersFemaleChart(data, total) {
    const ctx = document.getElementById('teachersFemaleChart');
    if (!ctx) return;

    if (teachersFemaleChart) teachersFemaleChart.destroy();

    teachersFemaleChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['نظامي', 'مبكر', 'عجز صحي', 'وفاة', 'طي قيد إستقالة', 'طي قيد بقوة النظام', 'إنقطاع', 'نقل خدمات طي قيد'],
            datasets: [{
                data: Object.values(data),
                backgroundColor: [
                    '#FF6B6B', // أحمر وردي للنظامي
                    '#FFD93D', // أصفر ذهبي للمبكر
                    '#1ABC9C', // تركوازي للعجز
                    '#E67E22', // برتقالي للوفاة
                    '#9B59B6', // بنفسجي لطي قيد إستقالة
                    '#E74C3C', // أحمر لطي قيد بقوة النظام
                    '#8E44AD', // بنفسجي داكن للإنقطاع
                    '#4A90E2' // أزرق فاتح لنقل خدمات طي قيد
                ],
                borderColor: [
                    '#E53E3E', // أحمر داكن
                    '#F4D03F', // أصفر داكن
                    '#16A085', // تركوازي داكن
                    '#D35400', // برتقالي داكن
                    '#8E44AD', // بنفسجي داكن
                    '#C0392B', // أحمر داكن
                    '#7D3C98', // بنفسجي داكن جداً
                    '#357ABD' // أزرق داكن
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: window.devicePixelRatio || 2,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                datalabels: {
                    display: false
                }
            }
        }
    });

    // إضافة النسب أسفل الرسم
    addPercentagesBelowChartWithColors('teachersFemaleChart', Object.values(data), ['نظامي', 'مبكر', 'عجز صحي', 'وفاة', 'طي قيد إستقالة', 'طي قيد بقوة النظام', 'إنقطاع', 'نقل خدمات طي قيد'], total, [
        '#FF6B6B', // أحمر وردي للنظامي
        '#FFD93D', // أصفر ذهبي للمبكر
        '#1ABC9C', // تركوازي للعجز
        '#E67E22', // برتقالي للوفاة
        '#9B59B6', // بنفسجي لطي قيد إستقالة
        '#E74C3C', // أحمر لطي قيد بقوة النظام
        '#8E44AD', // بنفسجي داكن للإنقطاع
        '#4A90E2' // أزرق فاتح لنقل خدمات طي قيد
    ]);
}

// دالة لإضافة النسب أسفل الدائرة
function addPercentagesBelowChart(chartId, values, labels, total) {
    const chartContainer = document.querySelector(`#${chartId}`).parentElement;

    // إزالة النسب السابقة إن وجدت
    const existingPercentages = chartContainer.querySelector('.chart-percentages');
    if (existingPercentages) {
        existingPercentages.remove();
    }

    // إنشاء عنصر النسب
    const percentagesDiv = document.createElement('div');
    percentagesDiv.className = 'chart-percentages';

    const colors = [
        '#4A90E2', // أزرق فاتح
        '#50C878', // أخضر فاتح
        '#FF6B6B', // أحمر وردي
        '#FFD93D', // أصفر ذهبي
        '#9B59B6', // بنفسجي
        '#E67E22', // برتقالي
        '#1ABC9C', // تركوازي
        '#E74C3C' // أحمر
    ];

    values.forEach((value, index) => {
        if (value > 0) {
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            const percentageItem = document.createElement('div');
            percentageItem.className = 'percentage-item';
            percentageItem.style.backgroundColor = colors[index];
            percentageItem.textContent = `${labels[index]}: ${percentage}%`;
            percentagesDiv.appendChild(percentageItem);
        }
    });

    chartContainer.appendChild(percentagesDiv);
}

// دالة لإضافة النسب مع ألوان مخصصة
function addPercentagesBelowChartWithColors(chartId, values, labels, total, colors) {
    const chartContainer = document.querySelector(`#${chartId}`).parentElement;

    // إزالة النسب السابقة إن وجدت
    const existingPercentages = chartContainer.querySelector('.chart-percentages');
    if (existingPercentages) {
        existingPercentages.remove();
    }

    // إنشاء عنصر النسب
    const percentagesDiv = document.createElement('div');
    percentagesDiv.className = 'chart-percentages';

    values.forEach((value, index) => {
        if (value > 0) {
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            const percentageItem = document.createElement('div');
            percentageItem.className = 'percentage-item';
            percentageItem.style.backgroundColor = colors[index];
            percentageItem.textContent = `${labels[index]}: ${percentage}%`;
            percentagesDiv.appendChild(percentageItem);
        }
    });

    chartContainer.appendChild(percentagesDiv);
}

// Helper to get CSS variable
function varGet(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// دالة أشرطة التقدم (تم حذفها من HTML)
function createProgressBars(types, categories, total) {
    const progressContainer = document.getElementById('progressContainer');
    if (!progressContainer) {
        return;
    }
    let html = '<h4>📊 نسب أنواع التقاعد</h4>';

    const typeColors = {
        normal: 'green',
        early: 'blue',
        disability: 'gold',
        death: 'gray',
        resignation: 'orange',
        force_closure: 'red',
        discontinuation: 'purple',
        service_transfer: 'teal'
    };
    const typeNames = {
        normal: 'نظامي',
        early: 'مبكر',
        disability: 'عجز صحي',
        death: 'وفاة',
        resignation: 'طي قيد إستقالة',
        force_closure: 'طي قيد بقوة النظام',
        discontinuation: 'إنقطاع',
        service_transfer: 'نقل خدمات طي قيد'
    };

    Object.entries(types).forEach(([key, value]) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        html += `
            <div class="progress-item">
                <label>${typeNames[key]}</label>
                <div class="progress-bar">
                    <div class="progress-bar-fill ${typeColors[key]}" style="width: ${percentage}%;">
                        <span>${percentage}%</span>
                    </div>
                </div>
            </div>`;
    });

    html += '<h4 style="margin-top: 30px;">📊 نسب الفئات</h4>';

    const categoryNames = {
        admin: 'إداريين',
        wages: 'أجور',
        users: 'مستخدمين',
        teachers_male: 'معلمين',
        teachers_female: 'معلمات'
    };
    const categoryColors = ['green', 'blue', 'gold', 'gray', 'purple'];
    let colorIndex = 0;

    Object.entries(categories).forEach(([key, value]) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        const colorClass = categoryColors[colorIndex % categoryColors.length];
        colorIndex++;
        html += `
            <div class="progress-item">
                <label>${categoryNames[key]}</label>
                <div class="progress-bar">
                    <div class="progress-bar-fill ${colorClass}" style="width: ${percentage}%;">
                        <span>${percentage}%</span>
                    </div>
                </div>
            </div>`;
    });

    progressContainer.innerHTML = html;
}

// عرض الرسوم
function showCharts() {
    document.getElementById('chartsContainer').style.display = 'block';
    createCharts();
}

// إنشاء تقرير PDF
function generateReport() {
    if (Object.keys(currentData).length === 0) {
        alert('لا توجد بيانات لإنشاء التقرير');
        return;
    }

    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF();
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    // عنوان
    doc.setFontSize(18);
    doc.text('تقرير إحصائيات التقاعد', 105, 20, {
        align: 'center'
    });

    // السنة والإجمالي
    doc.setFontSize(12);
    doc.text(`${yearType === 'hijri' ? 'هجرية' : 'ميلادية'} ${currentYear}`, 105, 35, {
        align: 'center'
    });
    doc.text(`إجمالي المتقاعدين: ${total.toLocaleString()}`, 105, 45, {
        align: 'center'
    });

    // توزيع الأنواع
    let yPos = 60;
    doc.text('توزيع حسب نوع التقاعد:', 20, yPos);
    yPos += 10;
    const types = {
        normal: 0,
        early: 0,
        disability: 0,
        death: 0
    };
    Object.keys(currentData).forEach(key => {
        const [t] = key.split('_');
        types[t] += currentData[key];
    });
    Object.entries(types).forEach(([k, v]) => {
        const names = {
            normal: 'نظامي',
            early: 'مبكر',
            disability: 'عجز صحي',
            death: 'وفاة'
        };
        const percentage = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
        doc.text(`• ${names[k]}: ${v.toLocaleString()} (${percentage}%)`, 30, yPos);
        yPos += 8;
    });

    // توزيع الفئات
    yPos += 5;
    doc.text('توزيع حسب الفئة:', 20, yPos);
    yPos += 10;
    const categories = {
        admin: 0,
        wages: 0,
        users: 0,
        teachers_male: 0,
        teachers_female: 0
    };
    Object.keys(currentData).forEach(key => {
        const parts = key.split('_');
        const category = parts.slice(1).join('_');
        categories[category] += currentData[key];
    });
    Object.entries(categories).forEach(([k, v]) => {
        const names = {
            admin: 'إداريين',
            wages: 'أجور',
            users: 'مستخدمين',
            teachers_male: 'معلمين',
            teachers_female: 'معلمات'
        };
        const percentage = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
        doc.text(`• ${names[k]}: ${v.toLocaleString()} (${percentage}%)`, 30, yPos);
        yPos += 8;
    });

    // تاريخ التقرير
    const now = new Date();
    doc.text(`تم إنشاء التقرير في: ${now.toLocaleDateString('ar-SA')}`, 105, yPos + 10, {
        align: 'center'
    });

    doc.save(`تقرير_التقاعد_${yearType}_${currentYear}.pdf`);
}

// طباعة الجدول
function printTable() {
    const printWindow = window.open('', '_blank');
    const tableHTML = document.getElementById('retireesTable').outerHTML;
    printWindow.document.write(`
        <html dir="rtl">
        <head><title>جدول التقاعد</title>
        <style>
            table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            h1 { text-align: center; }
        </style>
        </head>
        <body>
            <h1>جدول بيانات التقاعد - ${yearType === 'hijri' ? 'هجرية' : 'ميلادية'} ${currentYear}</h1>
            ${tableHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// مقارنة السنوات
function compareYears() {
    if (!currentYear) {
        alert('يرجى تحميل سنة أولاً');
        return;
    }
    const prevYear = parseInt(currentYear) - 1;
    const prevKey = `${yearType}_${prevYear}`;
    const prevData = JSON.parse(localStorage.getItem(prevKey)) || {};
    const prevTotal = Object.values(prevData).reduce((a, b) => a + b, 0);
    const currentTotal = Object.values(currentData).reduce((a, b) => a + b, 0);
    const change = prevTotal > 0 ? (((currentTotal - prevTotal) / prevTotal) * 100).toFixed(1) : 'N/A';

    alert(`📊 مقارنة السنوات:\n\n` +
        `السنة الحالية (${currentYear}): ${currentTotal.toLocaleString()}\n` +
        `السنة السابقة (${prevYear}): ${prevTotal.toLocaleString()}\n` +
        `التغيير: ${change > 0 ? '+' : ''}${change}%\n\n` +
        `${change > 0 ? '📈 زيادة' : change < 0 ? '📉 انخفاض' : '➡️ استقرار'}`);
}


// دالة طباعة التقرير
function printReport() {
    // إخفاء العناصر غير المرغوب في الطباعة
    const elementsToHide = [
        '.nav-bar',
        '.header-actions'
    ];

    const originalDisplay = {};
    elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            originalDisplay[element.className || element.tagName] = element.style.display;
            element.style.display = 'none';
        });
    });

    // طباعة الصفحة
    window.print();

    // إعادة عرض العناصر المخفية
    elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.style.display = originalDisplay[element.className || element.tagName] || '';
        });
    });
}

// تحميل افتراضي
window.onload = function() {
    // محاولة تحميل البيانات من صفحة الإدخال أولاً
    loadDataFromInput();

    // إذا لم توجد بيانات من صفحة الإدخال، استخدم النظام القديم
    if (Object.keys(currentData).length === 0) {
        yearType = localStorage.getItem('selectedYearType') || 'hijri';
        currentYear = localStorage.getItem('selectedYear') || '1445';
        const key = `${yearType}_${currentYear}`;
        currentData = JSON.parse(localStorage.getItem(key)) || {};
    }

    updateDisplay();
    createCharts();
};