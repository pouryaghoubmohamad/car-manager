// src/utils/calculations.js

// ===== محاسبه هزینه‌های خودروهای فعال =====
export const calculateCarExpenses = (cars, expenses) => {
  // لیست ID خودروهای فعال
  const activeCarIds = cars.filter(car => !car.sold).map(car => car.id);
  
  // جمع هزینه‌هایی که carId توی لیست فعال هست
  return expenses.reduce((sum, exp) => {
    if (exp.carId && activeCarIds.includes(exp.carId)) {
      return sum + (Number(exp.amount) || 0);
    }
    return sum;
  }, 0);
};

// ===== محاسبه هزینه‌های یک خودرو خاص =====
export const getCarExpenses = (carId, expenses) => {
  if (!expenses || !Array.isArray(expenses)) return 0;
  
  return expenses
    .filter(exp => exp.carId === carId)
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
};

// ===== محاسبه تعداد هزینه‌های یک خودرو =====
export const getCarExpensesCount = (carId, expenses) => {
  if (!expenses || !Array.isArray(expenses)) return 0;
  
  return expenses.filter(exp => exp.carId === carId).length;
};