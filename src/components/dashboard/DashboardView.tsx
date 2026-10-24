import React, { useState } from 'react';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  AlertOctagon,
  RotateCcw,
  CheckCircle,
  CalendarCheck,
  ArrowUpRight,
  UserPlus,
  Receipt,
  FileText,
  Search,
  X,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/financialCalculations';
import { formatDateDisplay, getElSalvadorDate } from '../../utils/dateUtils';

export const DashboardView: React.FC = () => {
  const {
    metrics,
    recentPayments,
    setCurrentView,
    setIsAddCreditModalOpen,
    setActiveReceiptModalPayment,
    database,
    setSelectedClientIdForDossier,
  } = useApp();
  const { hasPermission } = useAuth();
  const settings = database.settings;

  const canAddCredit = hasPermission('canAddClientsAndCredits');

  const [activeKpiModal, setActiveKpiModal] = useState<'total-lent' | 'total-collected' | 'pending-balance' | 'collected-today' | null>(null);
  const [kpiSearchQuery, setKpiSearchQuery] = useState('');

  // Filtered data for KPI modals
  const filteredActiveCredits = database.credits
    .filter(c => !database.clients.find(cl => cl.id === c.clientId)?.isArchived)
    .filter(c => {
      if (!kpiSearchQuery.trim()) return true;
      const q = kpiSearchQuery.toLowerCase();
      return (
        c.clientName.toLowerCase().includes(q) ||
        (c.clientDui && c.clientDui.toLowerCase().includes(q)) ||
        c.creditNumber.toLowerCase().includes(q)
      );
    });

  const filteredAllPayments = database.payments
    .filter(p => !p.isReversed)
    .filter(p => {
      if (!kpiSearchQuery.trim()) return true;
      const q = kpiSearchQuery.toLowerCase();
      return (
        p.clientName.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q) ||
        p.collectorName.toLowerCase().includes(q)
      );
    });

  const todayStr = getElSalvadorDate();
  const filteredTodayPayments = filteredAllPayments.filter(p => p.date === todayStr);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-5 md:p-6 text-white shadow-xl border border-blue-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Sistema Financiero en Línea</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            {settings.businessName}
          </h1>
          <p className="text-xs md:text-sm text-blue-100/80 mt-1 max-w-xl">
            Control de cobros diarios, microcréditos, cartera en mora y arqueo de cobradores en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {canAddCredit && (
            <button
              onClick={() => setIsAddCreditModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-500/30 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Crédito</span>
            </button>
          )}

          <button
            onClick={() => setCurrentView('daily-collections')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-900 text-blue-200 border border-blue-400/30 font-semibold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-blue-400" />
            <span>Cobros de Hoy</span>
          </button>
        </div>
      </div>

      {/* Main Financial KPI Grid (Interactive Cards with Drill-down) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Dinero Prestado */}
        <button
          onClick={() => {
            setActiveKpiModal('total-lent');
            setKpiSearchQuery('');
          }}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/70 rounded-2xl p-4 shadow-md text-left transition transform hover:-translate-y-0.5 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          title="Clic para ver detalle de todos los préstamos otorgados"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-300 transition">Total Prestado</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-white group-hover:text-blue-200 transition">
            {formatCurrency(metrics.totalMoneyLent, settings.currencySymbol)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>En {metrics.totalActiveCredits + metrics.liquidatedCreditsCount} créditos</span>
            <span className="text-blue-400 font-semibold flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
              Ver detalle <ArrowUpRight className="w-3 h-3 inline" />
            </span>
          </div>
        </button>

        {/* Total Dinero Cobrado */}
        <button
          onClick={() => {
            setActiveKpiModal('total-collected');
            setKpiSearchQuery('');
          }}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/70 rounded-2xl p-4 shadow-md text-left transition transform hover:-translate-y-0.5 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          title="Clic para ver historial completo de cobros realizados"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-300 transition">Total Cobrado</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-emerald-400">
            {formatCurrency(metrics.totalMoneyCollected, settings.currencySymbol)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-400/80">
            <span>Efectivamente recaudado</span>
            <span className="text-emerald-300 font-semibold flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
              Ver cobros <ArrowUpRight className="w-3 h-3 inline" />
            </span>
          </div>
        </button>

        {/* Saldo Total Pendiente (Con y Sin Intereses) */}
        <button
          onClick={() => {
            setActiveKpiModal('pending-balance');
            setKpiSearchQuery('');
          }}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/70 rounded-2xl p-4 shadow-md text-left transition transform hover:-translate-y-0.5 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 relative overflow-hidden"
          title="Clic para ver desglose de saldo pendiente con y sin intereses"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-300 transition">Saldo Pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-amber-400">
            {formatCurrency(metrics.totalBalancePending, settings.currencySymbol)}
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            <div className="text-[11px] text-blue-300 font-medium bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded inline-block">
              Sin intereses: <strong className="text-white font-bold">{formatCurrency(metrics.totalPrincipalPending, settings.currencySymbol)}</strong>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Cartera activa por recuperar</span>
              <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                Desglose <ArrowUpRight className="w-3 h-3 inline" />
              </span>
            </div>
          </div>
        </button>

        {/* Total Cobrado Hoy */}
        <button
          onClick={() => {
            setActiveKpiModal('collected-today');
            setKpiSearchQuery('');
          }}
          className="bg-gradient-to-br from-blue-900/60 to-indigo-950/60 hover:from-blue-900/80 hover:to-indigo-950/80 border border-blue-500/50 hover:border-blue-400 rounded-2xl p-4 shadow-md text-left transition transform hover:-translate-y-0.5 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
          title="Clic para ver recibos cobrados el día de hoy"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200">Cobrado Hoy</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black text-white">
            {formatCurrency(metrics.totalCollectedToday, settings.currencySymbol)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-blue-300">
            <span>Recaudación del día</span>
            <span className="text-white font-semibold flex items-center gap-0.5">
              Ver recibos <ArrowUpRight className="w-3 h-3 inline" />
            </span>
          </div>
        </button>
      </div>

      {/* Secondary Operational Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Clientes */}
        <button
          onClick={() => setCurrentView('clients')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <Users className="w-4 h-4 text-blue-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-white">{metrics.totalClients}</div>
          <div className="text-[10px] text-slate-400">Clientes activos</div>
        </button>

        {/* Créditos Activos (Vigentes) */}
        <button
          onClick={() => setCurrentView('clients')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 rounded-xl p-3 text-left transition"
          title="Total de créditos activos y vigentes de la cartera"
        >
          <div className="flex items-center justify-between text-slate-400">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-white">{metrics.totalActiveCredits}</div>
          <div className="text-[10px] text-slate-400 font-medium">Créditos activos (vigentes)</div>
        </button>

        {/* Clientes a cobrar hoy */}
        <button
          onClick={() => setCurrentView('daily-collections')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-blue-700/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-blue-400">
            <CalendarCheck className="w-4 h-4 text-sky-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-sky-300">{metrics.clientsDueTodayCount}</div>
          <div className="text-[10px] text-slate-400">Deben pagar hoy</div>
        </button>

        {/* Clientes en mora */}
        <button
          onClick={() => setCurrentView('overdue')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-rose-800/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-rose-400">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-rose-400">{metrics.clientsInOverdueCount}</div>
          <div className="text-[10px] text-slate-400">Clientes en mora</div>
        </button>

        {/* Solicitudes de reversión */}
        <button
          onClick={() => setCurrentView('reversions')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-amber-800/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-amber-400">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-amber-400">{metrics.pendingReversionsCount}</div>
          <div className="text-[10px] text-slate-400">Reversiones pendientes</div>
        </button>

        {/* Créditos Liquidados */}
        <button
          onClick={() => setCurrentView('clients')}
          className="bg-slate-800/60 hover:bg-slate-800 border border-emerald-800/50 rounded-xl p-3 text-left transition"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-300">{metrics.liquidatedCreditsCount}</div>
          <div className="text-[10px] text-slate-400">Créditos liquidados</div>
        </button>
      </div>

      {/* Recent Payments Section (Prompt Section 3) */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white text-base">Últimos Pagos Registrados</h2>
          </div>
          <button
            onClick={() => setCurrentView('payments')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
          >
            <span>Ver todos los pagos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No hay pagos registrados aún en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700/60 pb-2">
                  <th className="py-2.5 px-3 font-semibold">Recibo</th>
                  <th className="py-2.5 px-3 font-semibold">Cliente</th>
                  <th className="py-2.5 px-3 font-semibold">Cuota</th>
                  <th className="py-2.5 px-3 font-semibold">Importe</th>
                  <th className="py-2.5 px-3 font-semibold">Fecha / Hora</th>
                  <th className="py-2.5 px-3 font-semibold">Cobrador</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {recentPayments.map(p => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-700/30 transition ${
                      p.isReversed ? 'opacity-50 line-through' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-medium text-blue-300">
                      {p.receiptNumber}
                      {p.isReversed && (
                        <span className="ml-1.5 inline-block text-[9px] uppercase px-1.5 py-0.2 bg-rose-900/80 text-rose-300 rounded no-underline">
                          Revertido
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate">
                      {p.clientName}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Cuota #{p.installmentNumber}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {formatCurrency(p.receivedAmount, settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {formatDateDisplay(p.date)} {p.time}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {p.collectorName}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setActiveReceiptModalPayment(p)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 px-2 py-1 rounded-lg transition"
                        title="Ver ticket de comprobante"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Ticket</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KPI Detail Breakdown Modal */}
      {activeKpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow ${
                    activeKpiModal === 'total-lent'
                      ? 'bg-blue-600'
                      : activeKpiModal === 'total-collected'
                      ? 'bg-emerald-600'
                      : activeKpiModal === 'pending-balance'
                      ? 'bg-amber-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {activeKpiModal === 'total-lent' && <DollarSign className="w-5 h-5" />}
                  {activeKpiModal === 'total-collected' && <TrendingUp className="w-5 h-5" />}
                  {activeKpiModal === 'pending-balance' && <Clock className="w-5 h-5" />}
                  {activeKpiModal === 'collected-today' && <TrendingUp className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {activeKpiModal === 'total-lent' && 'Detalle de Cartera: Total Prestado'}
                    {activeKpiModal === 'total-collected' && 'Detalle de Recaudación: Total Cobrado'}
                    {activeKpiModal === 'pending-balance' && 'Detalle de Cartera: Saldo Pendiente'}
                    {activeKpiModal === 'collected-today' && 'Detalle de Recaudación: Cobrado Hoy'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeKpiModal === 'total-lent' && 'Desglose de capital entregado por cliente y crédito'}
                    {activeKpiModal === 'total-collected' && 'Historial consolidado de cobros y recibos emitidos'}
                    {activeKpiModal === 'pending-balance' && 'Desglose con intereses y saldo neto de capital (sin intereses)'}
                    {activeKpiModal === 'collected-today' && `Recibos emitidos en la fecha (${formatDateDisplay(todayStr)})`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Highlights (especially for Saldo Pendiente) */}
            {activeKpiModal === 'pending-balance' && (
              <div className="bg-slate-800/90 border-b border-slate-700/80 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide">
                    Saldo Pendiente Total (Con Intereses)
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                    {formatCurrency(metrics.totalBalancePending, settings.currencySymbol)}
                  </div>
                  <div className="text-[10px] text-amber-300/80 mt-0.5">
                    Total exigible a cobrar según cronogramas vigentes
                  </div>
                </div>

                <div className="bg-blue-950/50 border border-blue-700/60 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-blue-300 uppercase tracking-wide">
                    Saldo Pendiente de Capital (Sin Intereses)
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">
                    {formatCurrency(metrics.totalPrincipalPending, settings.currencySymbol)}
                  </div>
                  <div className="text-[10px] text-blue-200/80 mt-0.5">
                    Capital real de la financiera aún por recuperar en calle
                  </div>
                </div>
              </div>
            )}

            {/* Filter / Search Bar */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={kpiSearchQuery}
                  onChange={e => setKpiSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, DUI, recibo o número..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              {kpiSearchQuery && (
                <button
                  onClick={() => setKpiSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Case 1: Total Lent */}
              {activeKpiModal === 'total-lent' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700 pb-2">
                        <th className="py-2 px-3 font-semibold">Crédito</th>
                        <th className="py-2 px-3 font-semibold">Cliente</th>
                        <th className="py-2 px-3 font-semibold">Capital Prestado</th>
                        <th className="py-2 px-3 font-semibold">Total con Interés</th>
                        <th className="py-2 px-3 font-semibold">Modalidad</th>
                        <th className="py-2 px-3 font-semibold">Estado</th>
                        <th className="py-2 px-3 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredActiveCredits.map(c => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-300">
                            {c.creditNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white">
                            <div>{c.clientName}</div>
                            {c.clientDui && (
                              <div className="text-[10px] text-slate-400">DUI: {c.clientDui}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {formatCurrency(c.principal, settings.currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {formatCurrency(c.totalAmountToPay, settings.currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-slate-300">
                            {c.modality} ({c.totalInstallments} cts)
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                c.status === 'liquidated'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : c.status === 'overdue'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {c.status === 'liquidated' ? 'Liquidado' : c.status === 'overdue' ? 'En Mora' : 'Activo (Vigente)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedClientIdForDossier(c.clientId);
                                setActiveKpiModal(null);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 px-2 py-1 rounded-lg transition cursor-pointer"
                            >
                              <User className="w-3 h-3" />
                              <span>Expediente</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Case 2: Total Collected */}
              {activeKpiModal === 'total-collected' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700 pb-2">
                        <th className="py-2 px-3 font-semibold">Recibo</th>
                        <th className="py-2 px-3 font-semibold">Cliente</th>
                        <th className="py-2 px-3 font-semibold">Cuota</th>
                        <th className="py-2 px-3 font-semibold">Monto Cobrado</th>
                        <th className="py-2 px-3 font-semibold">Fecha</th>
                        <th className="py-2 px-3 font-semibold">Cobrador</th>
                        <th className="py-2 px-3 font-semibold text-right">Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredAllPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-300">
                            {p.receiptNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white">{p.clientName}</td>
                          <td className="py-2.5 px-3 text-slate-300">Cuota #{p.installmentNumber}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-400">
                            {formatCurrency(p.receivedAmount, settings.currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {formatDateDisplay(p.date)} {p.time}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{p.collectorName}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setActiveReceiptModalPayment(p);
                                setActiveKpiModal(null);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 px-2 py-1 rounded-lg transition cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ticket</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Case 3: Pending Balance (Both Con y Sin Intereses) */}
              {activeKpiModal === 'pending-balance' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700 pb-2">
                        <th className="py-2 px-3 font-semibold">Crédito</th>
                        <th className="py-2 px-3 font-semibold">Cliente</th>
                        <th className="py-2 px-3 font-semibold">Capital Original</th>
                        <th className="py-2 px-3 font-semibold text-amber-400">Saldo Pendiente (Total)</th>
                        <th className="py-2 px-3 font-semibold text-blue-300">Saldo Sin Intereses (Capital)</th>
                        <th className="py-2 px-3 font-semibold">Progreso</th>
                        <th className="py-2 px-3 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredActiveCredits
                        .filter(c => c.balancePending > 0)
                        .map(c => {
                          const principalPending =
                            c.totalAmountToPay > 0
                              ? c.balancePending * (c.principal / c.totalAmountToPay)
                              : c.balancePending;
                          const progressPercent = Math.min(
                            100,
                            Math.round(((c.totalPaid || 0) / c.totalAmountToPay) * 100)
                          );

                          return (
                            <tr key={c.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-2.5 px-3 font-mono font-medium text-blue-300">
                                {c.creditNumber}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-white">
                                <div>{c.clientName}</div>
                                {c.clientDui && (
                                  <div className="text-[10px] text-slate-400">DUI: {c.clientDui}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-300">
                                {formatCurrency(c.principal, settings.currencySymbol)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-amber-400">
                                {formatCurrency(c.balancePending, settings.currencySymbol)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-blue-300">
                                {formatCurrency(principalPending, settings.currencySymbol)}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="w-24 bg-slate-700 rounded-full h-2 overflow-hidden mb-1">
                                  <div
                                    className="bg-emerald-500 h-2 rounded-full"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400">{progressPercent}% pagado</span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedClientIdForDossier(c.clientId);
                                    setActiveKpiModal(null);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 px-2 py-1 rounded-lg transition cursor-pointer"
                                >
                                  <User className="w-3 h-3" />
                                  <span>Expediente</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Case 4: Collected Today */}
              {activeKpiModal === 'collected-today' && (
                <div className="overflow-x-auto">
                  {filteredTodayPayments.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No se han registrado cobros el día de hoy ({formatDateDisplay(todayStr)}).
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700 pb-2">
                          <th className="py-2 px-3 font-semibold">Recibo</th>
                          <th className="py-2 px-3 font-semibold">Cliente</th>
                          <th className="py-2 px-3 font-semibold">Cuota</th>
                          <th className="py-2 px-3 font-semibold">Monto Cobrado</th>
                          <th className="py-2 px-3 font-semibold">Hora</th>
                          <th className="py-2 px-3 font-semibold">Cobrador</th>
                          <th className="py-2 px-3 font-semibold text-right">Ticket</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredTodayPayments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-mono font-medium text-blue-300">
                              {p.receiptNumber}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-white">{p.clientName}</td>
                            <td className="py-2.5 px-3 text-slate-300">Cuota #{p.installmentNumber}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-400">
                              {formatCurrency(p.receivedAmount, settings.currencySymbol)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{p.time}</td>
                            <td className="py-2.5 px-3 text-slate-300">{p.collectorName}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => {
                                  setActiveReceiptModalPayment(p);
                                  setActiveKpiModal(null);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800/60 px-2 py-1 rounded-lg transition cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Ticket</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {activeKpiModal === 'total-lent' && `${filteredActiveCredits.length} créditos registrados`}
                {activeKpiModal === 'total-collected' && `${filteredAllPayments.length} pagos registrados`}
                {activeKpiModal === 'pending-balance' && `${filteredActiveCredits.filter(c => c.balancePending > 0).length} créditos con saldo pendiente`}
                {activeKpiModal === 'collected-today' && `${filteredTodayPayments.length} cobros realizados hoy`}
              </span>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
