import React from 'react';

export default function CategoryTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  const months = data.months || [];
  const categories = data.categories || [];

  const getColorIntensity = (value, max) => {
    if (!value || value === 0) return 'bg-gray-50';
    const intensity = Math.min((value / max) * 100, 100);
    if (intensity < 20) return 'bg-primary bg-opacity-10';
    if (intensity < 40) return 'bg-primary bg-opacity-20';
    if (intensity < 60) return 'bg-primary bg-opacity-40';
    if (intensity < 80) return 'bg-primary bg-opacity-60';
    return 'bg-primary bg-opacity-80';
  };

  const maxValue = Math.max(
    ...categories.flatMap(cat =>
      months.map(month => cat.monthlyTotals[month] || 0)
    )
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left p-2 sticky left-0 bg-white font-semibold">
              Category
            </th>
            {months.map(month => (
              <th key={month} className="text-center p-2 font-semibold">
                {month}
              </th>
            ))}
            <th className="text-center p-2 font-semibold bg-background">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category, catIndex) => (
            <tr key={catIndex} className="border-b border-gray-100 hover:bg-background">
              <td className="p-2 font-medium sticky left-0 bg-white">
                {category.name}
              </td>
              {months.map(month => {
                const value = category.monthlyTotals[month] || 0;
                return (
                  <td
                    key={month}
                    className={`text-center p-2 ${getColorIntensity(value, maxValue)}`}
                  >
                    {value > 0 ? `$${value.toFixed(0)}` : '-'}
                  </td>
                );
              })}
              <td className="text-center p-2 font-semibold bg-background">
                ${category.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 font-bold">
            <td className="p-2 sticky left-0 bg-white">Total</td>
            {months.map(month => {
              const total = categories.reduce((sum, cat) => sum + (cat.monthlyTotals[month] || 0), 0);
              return (
                <td key={month} className="text-center p-2 bg-background">
                  ${total.toFixed(0)}
                </td>
              );
            })}
            <td className="text-center p-2 bg-background">
              ${categories.reduce((sum, cat) => sum + cat.total, 0).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
