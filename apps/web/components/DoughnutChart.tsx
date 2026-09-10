"use client"

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChart = ({ accounts = [] }: DoughnutChartProps) => {
  const accountNames = accounts.map((a) => a.name);
  const balances = accounts.map((a) => a.currentBalance);

  const data = {
    datasets: [
      {
        label: 'Balance',
        data: balances.length ? balances : [1],
        backgroundColor: [
          '#002766', // Deep Royal Navy
          '#1570EF', // Vibrant Cobalt
          '#6172F3', // Indigo Accent
          '#027A48', // Emerald Accent
          '#F26522', // Amber / Orange Accent
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 4,
      }
    ],
    labels: accountNames.length ? accountNames : ['Primary']
  }

  return (
    <div className="size-full flex items-center justify-center p-1">
      <Doughnut 
        data={data} 
        options={{
          cutout: '72%',
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const val = context.parsed || 0;
                  return ` ₹${val.toLocaleString('en-IN')}`;
                }
              }
            }
          }
        }}
      />
    </div>
  )
}

export default DoughnutChart