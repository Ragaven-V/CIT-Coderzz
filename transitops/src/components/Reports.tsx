import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { formatIndianCurrency } from '../utils';
import { jsPDF } from 'jspdf';

interface ReportsProps {
  showToast: (msg: string, type?: 'success' | 'warning' | 'danger') => void;
  refreshSignal: number;
}

export default function Reports({ showToast, refreshSignal }: ReportsProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReports();
      setReports(res.reports);
    } catch (error) {
      showToast('Failed to generate operational report.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [refreshSignal]);

  // Aggregate Totals
  const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0);
  const totalCost = reports.reduce((sum, r) => sum + r.operationalCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalAcquisition = reports.reduce((sum, r) => sum + r.acquisitionCost, 0);
  const overallDistance = reports.reduce((sum, r) => sum + r.distance, 0);
  const overallFuel = reports.reduce((sum, r) => sum + r.fuelLiters, 0);

  const overallRoi = totalAcquisition > 0 ? (totalProfit / totalAcquisition) * 100 : 0;
  const overallFuelEfficiency = overallFuel > 0 ? (overallDistance / overallFuel) : 0;

  // CSV Exporter
  const handleExportCSV = () => {
    if (reports.length === 0) {
      showToast('No report rows to export.', 'warning');
      return;
    }

    let csv = 'Vehicle,Model,Acquisition Cost (INR),Distance Completed (km),Fuel Consumed (L),Fuel Efficiency (km/L),Operational Cost (INR),Revenue (INR),ROI (%)\n';
    reports.forEach((r) => {
      csv += `${r.registrationNumber},"${r.nameModel}",${r.acquisitionCost},${r.distance},${r.fuelLiters},${r.fuelEfficiency > 0 ? r.fuelEfficiency.toFixed(2) : '0'},${r.operationalCost},${r.revenue},${r.roi.toFixed(2)}%\n`;
    });

    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TransitOps_Fleet_ROI_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('CSV report file generated and downloaded successfully.', 'success');
    } catch (err) {
      try {
        const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.setAttribute('download', `TransitOps_Fleet_ROI_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV report downloaded via fallback data URI.', 'success');
      } catch (fallbackErr) {
        showToast('Download blocked by iframe sandbox. Please open the app in a new tab to download.', 'danger');
      }
    }
  };

  const handleExportPDF = () => {
    if (reports.length === 0) {
      showToast('No report rows to export.', 'warning');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("TRANSITOPS - FLEET ROI & PERFORMANCE REPORT", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Generated on: ${new Date().toLocaleString()} (UTC)`, 14, 26);
      doc.text("-----------------------------------------------------------------------------------------------------------------", 14, 30);
      
      // Summary Cards
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("EXECUTIVE SUMMARY", 14, 37);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Gross Revenue: INR ${totalRevenue.toLocaleString()}`, 14, 44);
      doc.text(`Operational Cost: INR ${totalCost.toLocaleString()}`, 14, 50);
      doc.text(`Net Profit: INR ${totalProfit.toLocaleString()}`, 14, 56);
      doc.text(`Overall ROI: ${overallRoi.toFixed(2)}%`, 110, 44);
      doc.text(`Total Distance: ${overallDistance.toLocaleString()} km`, 110, 50);
      doc.text(`Overall Fuel Efficiency: ${overallFuelEfficiency > 0 ? overallFuelEfficiency.toFixed(2) : '0'} km/L`, 110, 56);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("-----------------------------------------------------------------------------------------------------------------", 14, 62);
      
      // Table Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("VEHICLE PERFORMANCE METRICS", 14, 69);
      
      let y = 78;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      
      // Header Columns
      doc.text("Vehicle", 14, y);
      doc.text("Model", 32, y);
      doc.text("Distance", 74, y);
      doc.text("Fuel Used", 94, y);
      doc.text("Efficiency", 114, y);
      doc.text("Op Cost", 134, y);
      doc.text("Revenue", 160, y);
      doc.text("ROI (%)", 186, y);
      
      doc.text("-----------------------------------------------------------------------------------------------------------------", 14, y + 4);
      
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      
      reports.forEach((r) => {
        // Draw each row
        if (y > 275) {
          doc.addPage();
          y = 20;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text("Vehicle", 14, y);
          doc.text("Model", 32, y);
          doc.text("Distance", 74, y);
          doc.text("Fuel Used", 94, y);
          doc.text("Efficiency", 114, y);
          doc.text("Op Cost", 134, y);
          doc.text("Revenue", 160, y);
          doc.text("ROI (%)", 186, y);
          doc.text("-----------------------------------------------------------------------------------------------------------------", 14, y + 4);
          y += 10;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(r.registrationNumber, 14, y);
        doc.setFont("helvetica", "normal");
        
        const modelName = r.nameModel.length > 20 ? r.nameModel.substring(0, 18) + ".." : r.nameModel;
        doc.text(modelName, 32, y);
        
        doc.text(`${r.distance.toLocaleString()} km`, 74, y);
        doc.text(`${r.fuelLiters > 0 ? r.fuelLiters.toLocaleString() : '0'} L`, 94, y);
        doc.text(r.fuelEfficiency > 0 ? `${r.fuelEfficiency.toFixed(1)} km/L` : 'N/A', 114, y);
        doc.text(`Rs ${r.operationalCost.toLocaleString()}`, 134, y);
        doc.text(`Rs ${r.revenue.toLocaleString()}`, 160, y);
        doc.text(`${r.roi.toFixed(1)}%`, 186, y);
        
        y += 8;
      });
      
      doc.save(`TransitOps_Fleet_ROI_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Analytics PDF report file generated and downloaded successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to generate PDF. Please try again.', 'danger');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-emerald-500">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center text-lg">
            <i className="fas fa-rupee-sign"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Revenue</span>
            <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{formatIndianCurrency(totalRevenue)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-red-500">
          <div className="w-10 h-10 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center text-lg">
            <i className="fas fa-hand-holding-usd"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Cost</span>
            <span className="text-lg font-bold text-red-400 font-mono mt-0.5">{formatIndianCurrency(totalCost)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-500">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-lg">
            <i className="fas fa-balance-scale"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Profit</span>
            <span className="text-lg font-bold text-indigo-400 font-mono mt-0.5">{formatIndianCurrency(totalProfit)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-violet-500">
          <div className="w-10 h-10 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center text-lg">
            <i className="fas fa-percent"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Fleet ROI</span>
            <span className="text-lg font-bold text-violet-400 font-mono mt-0.5">{overallRoi.toFixed(2)}%</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-cyan-500">
          <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center text-lg">
            <i className="fas fa-gas-pump"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fuel Efficiency</span>
            <span className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
              {overallFuelEfficiency > 0 ? `${overallFuelEfficiency.toFixed(2)} km/L` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white tracking-tight">Performance & ROI Report</h2>
            <p className="text-xs text-slate-400">Profitability metrics mapped by individual active vehicle asset files</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <i className="fas fa-file-csv text-slate-500"></i> Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <i className="fas fa-file-pdf text-slate-500"></i> Export PDF
            </button>
          </div>
        </div>

        <div className="table-responsive w-full overflow-x-auto rounded-xl">
          <table className="data-table w-full border-collapse text-left text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Vehicle</th>
                <th className="p-4">Model</th>
                <th className="p-4">Acquisition Cost</th>
                <th className="p-4">Distance (km)</th>
                <th className="p-4">Fuel Used (L)</th>
                <th className="p-4">Fuel Efficiency</th>
                <th className="p-4">Op Costs</th>
                <th className="p-4">Revenue</th>
                <th className="p-4 text-right">ROI (%)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-slate-500">
                    <span className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-slate-500">
                    No matching report rows found.
                  </td>
                </tr>
              ) : (
                reports.map((row) => (
                  <tr key={row.registrationNumber} className="border-b border-slate-800 hover:bg-indigo-500/[0.02] transition-all text-xs font-medium">
                    <td className="p-4 font-bold font-mono text-white text-xs">{row.registrationNumber}</td>
                    <td className="p-4 text-slate-400 font-semibold">{row.nameModel}</td>
                    <td className="p-4 font-mono text-slate-400">{formatIndianCurrency(row.acquisitionCost)}</td>
                    <td className="p-4 font-mono">{row.distance.toLocaleString()} km</td>
                    <td className="p-4 font-mono">{row.fuelLiters > 0 ? `${row.fuelLiters.toLocaleString()} L` : '0 L'}</td>
                    <td className="p-4 font-semibold text-slate-400 font-mono">
                      {row.fuelEfficiency > 0 ? `${row.fuelEfficiency.toFixed(2)} km/L` : 'N/A'}
                    </td>
                    <td className="p-4 text-red-400 font-bold font-mono">{formatIndianCurrency(row.operationalCost)}</td>
                    <td className="p-4 text-emerald-400 font-bold font-mono">{formatIndianCurrency(row.revenue)}</td>
                    <td className={`p-4 text-right font-extrabold font-mono text-xs ${row.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {row.roi.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
