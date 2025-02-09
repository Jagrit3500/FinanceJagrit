let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let chart = null;
let monthlyIncome = parseFloat(localStorage.getItem('monthlyIncome')) || 0;


const categoryIcons = {
    'Food': '🍽️',
    'Transport': '🚗',
    'Entertainment': '🎮',
    'Shopping': '🛍️',
    'Bills': '📃',
    'Other': '📌'
};


function init() {
    updateUI();
    createChart();
    updateIncomeDisplay();
}


document.getElementById('expense-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const expense = {
        id: Date.now(),
        name: document.getElementById('expense-name').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        category: document.getElementById('expense-category').value,
        date: new Date().toLocaleDateString()
    };

    expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    this.reset();
    updateUI();
});


function updateUI() {
    updateExpensesList();
    updateTotalAmount();
    updateChart();
    updateSummaryStats();
}


function formatToINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}


function updateExpensesList() {
    const expensesTable = document.getElementById('expenses-table');
    expensesTable.innerHTML = '';

    expenses.slice().reverse().forEach(expense => {
        const expenseElement = document.createElement('div');
        expenseElement.className = 'expense-item';
        expenseElement.innerHTML = `
            <div>${expense.name}</div>
            <div>${formatToINR(expense.amount)}</div>
            <div>${categoryIcons[expense.category]} ${expense.category}</div>
            <button class="delete-btn" onclick="deleteExpense(${expense.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        expensesTable.appendChild(expenseElement);
    });
}


function deleteExpense(id) {
    expenses = expenses.filter(expense => expense.id !== id);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    updateUI();
}


function updateTotalAmount() {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById('total-amount').textContent = formatToINR(total);
}


function createChart() {
    const ctx = document.getElementById('expense-chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff'
                    }
                }
            }
        }
    });
}


function updateChart() {
    const categoryTotals = {};
    expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    if (chart) {
        chart.data.labels = Object.keys(categoryTotals).map(category => 
            `${categoryIcons[category]} ${category}`
        );
        chart.data.datasets[0].data = Object.values(categoryTotals);
        chart.update();
    }
}


function updateSummaryStats() {
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
    });
    
    
    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById('month-total').textContent = formatToINR(monthlyTotal);
    
    
    if (expenses.length > 0) {
        const highestExpense = expenses.reduce((max, expense) => 
            expense.amount > max.amount ? expense : max
        );
        document.getElementById('highest-expense').textContent = formatToINR(highestExpense.amount);
        document.getElementById('highest-category').textContent = highestExpense.category;
    }
    
    
    const categoryTotals = {};
    const totalSpent = expenses.reduce((sum, expense) => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        return sum + expense.amount;
    }, 0);
    
    if (totalSpent > 0) {
        const topCategory = Object.entries(categoryTotals)
            .reduce((max, [category, amount]) => 
                amount > (categoryTotals[max] || 0) ? category : max
            );
        
        const percentage = ((categoryTotals[topCategory] / totalSpent) * 100).toFixed(1);
        document.getElementById('top-category').textContent = `${categoryIcons[topCategory]} ${topCategory}`;
        document.getElementById('category-percentage').textContent = `${percentage}% of total`;
    }
    

    generateInsights(monthlyTotal, categoryTotals, totalSpent);
}


function generateInsights(monthlyTotal, categoryTotals, totalSpent) {
    const insights = [];
    
    
    if (monthlyIncome > 0) {
        const remainingAmount = monthlyIncome - monthlyTotal;
        const savingsRate = ((monthlyIncome - monthlyTotal) / monthlyIncome * 100).toFixed(1);
        
        document.getElementById('remaining-amount').textContent = formatToINR(remainingAmount);
        document.getElementById('savings-rate').textContent = `${savingsRate}%`;
        
        if (monthlyTotal > monthlyIncome) {
            insights.push(`⚠️ Warning: You're spending more than your income this month!`);
        } else if (savingsRate > 20) {
            insights.push(`🎯 Great job! You're saving ${savingsRate}% of your income.`);
        }
        
       
        const spendingRatio = ((monthlyTotal / monthlyIncome) * 100).toFixed(1);
        insights.push(`💰 You've spent ${spendingRatio}% of your monthly income.`);
    }
    
    
    const previousMonthTotal = calculatePreviousMonthTotal();
    if (previousMonthTotal > 0) {
        const trend = ((monthlyTotal - previousMonthTotal) / previousMonthTotal * 100).toFixed(1);
        if (trend > 0) {
            insights.push(`📈 Your spending this month is up ${trend}% compared to last month.`);
        } else if (trend < 0) {
            insights.push(`📉 Your spending this month is down ${Math.abs(trend)}% compared to last month.`);
        }
    }
    
    
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a);
    
    if (sortedCategories.length > 1) {
        const [topCategory, topAmount] = sortedCategories[0];
        insights.push(`💡 Your highest spending category is ${categoryIcons[topCategory]} ${topCategory} at ${formatToINR(topAmount)}.`);
    }
    
    
    if (expenses.length > 0) {
        const daysWithExpenses = new Set(expenses.map(e => e.date)).size;
        const averagePerDay = totalSpent / daysWithExpenses;
        insights.push(`📊 On average, you spend ${formatToINR(averagePerDay)} per day of spending.`);
    }
    
    
    if (monthlyIncome > 0) {
        const recommendedBudget = monthlyIncome * 0.8; // 80% of income
        if (monthlyTotal > recommendedBudget) {
            const warningElement = document.getElementById('budget-warning');
            warningElement.innerHTML = `⚠️ You've exceeded the recommended spending limit of ${formatToINR(recommendedBudget)} (80% of income)!`;
            warningElement.classList.add('show');
        } else {
            document.getElementById('budget-warning').classList.remove('show');
        }
    }
    
    
    document.getElementById('spending-trends').innerHTML = insights
        .map(insight => `<p>${insight}</p>`)
        .join('');
}


function calculatePreviousMonthTotal() {
    const currentDate = new Date();
    const previousMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
    const year = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    
    return expenses
        .filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === previousMonth && 
                   expenseDate.getFullYear() === year;
        })
        .reduce((sum, expense) => sum + expense.amount, 0);
}


init();


document.getElementById('convert-currency').addEventListener('click', function() {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    localStorage.setItem('amountToConvert', totalAmount);
    window.location.href = '../../Landing/Currency_Converter/CurrencyConverter_Index.html?from=INR';
});

document.getElementById('save-income').addEventListener('click', function() {
    const incomeInput = document.getElementById('monthly-income');
    const income = parseFloat(incomeInput.value);
    
    if (income && income > 0) {
        monthlyIncome = income;
        localStorage.setItem('monthlyIncome', income);
        updateIncomeDisplay();
        updateUI();
        incomeInput.value = '';
    }
});


function updateIncomeDisplay() {
    document.getElementById('income-amount').textContent = formatToINR(monthlyIncome);
}


function resetAllData() {
    // Clear all data from localStorage
    localStorage.removeItem('expenses');
    localStorage.removeItem('monthlyIncome');
    
    
    expenses = [];
    monthlyIncome = 0;
    
    
    updateUI();
    updateIncomeDisplay();
    
    
    document.getElementById('monthly-income').value = '';
    document.getElementById('expense-form').reset();
    
   
    showResetSuccessMessage();
}

function showResetSuccessMessage() {
    const warningElement = document.getElementById('budget-warning');
    warningElement.innerHTML = `✅ All data has been successfully reset!`;
    warningElement.style.background = 'rgba(0, 255, 136, 0.1)';
    warningElement.style.borderLeft = '4px solid #00ff88';
    warningElement.classList.add('show');
    
    
    setTimeout(() => {
        warningElement.classList.remove('show');
        
        warningElement.style.background = 'rgba(255, 87, 87, 0.1)';
        warningElement.style.borderLeft = '4px solid #ff5757';
    }, 3000);
}


const modal = document.getElementById('reset-modal');
const resetBtn = document.getElementById('reset-button');
const confirmResetBtn = document.getElementById('confirm-reset');
const cancelResetBtn = document.getElementById('cancel-reset');

resetBtn.addEventListener('click', () => {
    modal.classList.add('show');
});

confirmResetBtn.addEventListener('click', () => {
    resetAllData();
    modal.classList.remove('show');
});

cancelResetBtn.addEventListener('click', () => {
    modal.classList.remove('show');
});


modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show');
    }
});


document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
        modal.classList.remove('show');
    }
}); 