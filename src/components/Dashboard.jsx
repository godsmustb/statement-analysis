import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import PieChart from './Charts/PieChart';
import BarChart from './Charts/BarChart';
import LineChart from './Charts/LineChart';
import CategoryTable from './Charts/CategoryTable';

export default function Dashboard() {
  const { transactions, categories, selectedMonth, setSelectedMonth } = useApp();
  const [viewMode, setViewMode] = useState('current'); // 'current' or 'ytd'

  // Calculate analytics data
  const analytics = useMemo(() => {
    let filteredTransactions = transactions;

    if (viewMode === 'current' && selectedMonth) {
      filteredTransactions = transactions.filter(t => t.month === selectedMonth);
    } else if (viewMode === 'ytd') {
      const currentYear = selectedMonth ? selectedMonth.substring(0, 4) : new Date().getFullYear().toString();
      filteredTransactions = transactions.filter(t => t.date.startsWith(currentYear));
    }

    // Calculate totals
    const income = filteredTransactions
      .filter(t => t.isIncome)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expenses = filteredTransactions
      .filter(t => !t.isIncome)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const net = income - expenses;

    // Category breakdown
    const categoryData = categories
      .map(category => {
        const categoryTransactions = filteredTransactions.filter(t => t.category === category && !t.isIncome);
        const total = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return { name: category, value: total };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    // Month-over-month trend
    const monthlyData = {};
    transactions.forEach(t => {
      if (!monthlyData[t.month]) {
        monthlyData[t.month] = { income: 0, expenses: 0 };
      }
      if (t.isIncome) {
        monthlyData[t.month].income += Math.abs(t.amount);
      } else {
        monthlyData[t.month].expenses += Math.abs(t.amount);
      }
    });

    const trendData = Object.keys(monthlyData)
      .sort()
      .slice(-12) // Last 12 months
      .map(month => ({
        month: month.substring(5) + '/' + month.substring(2, 4), // MM/YY format
        income: monthlyData[month].income,
        expenses: monthlyData[month].expenses
      }));

    // Category table data
    const allMonths = [...new Set(transactions.map(t => t.month))].sort().slice(-12);
    const categoryTableData = categories
      .map(category => {
        const monthlyTotals = {};
        allMonths.forEach(month => {
          const monthTransactions = transactions.filter(
            t => t.month === month && t.category === category && !t.isIncome
          );
          monthlyTotals[month] = monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        });

        const total = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0);

        return {
          name: category,
          monthlyTotals,
          total
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      income,
      expenses,
      net,
      categoryData,
      trendData,
      categoryTableData: {
        months: allMonths.map(m => m.substring(5) + '/' + m.substring(2, 4)),
        categories: categoryTableData
      }
    };
  }, [transactions, categories, selectedMonth, viewMode]);

  // Get available months for selector
  const availableMonths = useMemo(() => {
    const months = [...new Set(transactions.map(t => t.month))].sort();
    return months;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-textDark">Dashboard</h1>

          <div className="flex gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field"
            >
              <option value="">All Time</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>

            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('current')}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'current'
                    ? 'bg-white text-textDark shadow'
                    : 'text-gray-600 hover:text-textDark'
                }`}
              >
                Current Month
              </button>
              <button
                onClick={() => setViewMode('ytd')}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'ytd'
                    ? 'bg-white text-textDark shadow'
                    : 'text-gray-600 hover:text-textDark'
                }`}
              >
                Year to Date
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-success bg-opacity-20 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-success">
              ${analytics.income.toFixed(2)}
            </p>
          </div>

          <div className="p-4 bg-red-100 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              ${analytics.expenses.toFixed(2)}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${analytics.net >= 0 ? 'bg-primary bg-opacity-20' : 'bg-warning bg-opacity-20'}`}>
            <p className="text-sm text-gray-600 mb-1">Net</p>
            <p className={`text-2xl font-bold ${analytics.net >= 0 ? 'text-primary' : 'text-warning'}`}>
              ${analytics.net.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Pie Chart: Income vs Expenses by Category */}
      <div className="card">
        <h2 className="text-xl font-bold text-textDark mb-4">
          Expenses by Category
        </h2>
        <PieChart data={analytics.categoryData} />
      </div>

      {/* Bar Chart: Category Breakdown */}
      <div className="card">
        <h2 className="text-xl font-bold text-textDark mb-4">
          Category Breakdown
        </h2>
        <BarChart data={analytics.categoryData} />
      </div>

      {/* Line Chart: Month-over-Month Trend */}
      <div className="card">
        <h2 className="text-xl font-bold text-textDark mb-4">
          Income & Expenses Trend (Last 12 Months)
        </h2>
        <LineChart data={analytics.trendData} />
      </div>

      {/* Category Table */}
      <div className="card">
        <h2 className="text-xl font-bold text-textDark mb-4">
          Category Totals by Month
        </h2>
        <CategoryTable data={analytics.categoryTableData} />
      </div>
    </div>
  );
}
