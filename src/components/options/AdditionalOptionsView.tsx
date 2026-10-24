import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  CreditCard,
  Receipt,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileCheck,
  FolderArchive,
  Layers,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AppDatabase } from '../../services/storage';
import { ExcelImportRow } from '../../services/storage';
import { formatCurrency } from '../../utils/financialCalculations';
import { getElSalvadorDate } from '../../utils/dateUtils';
import { PaymentModality } from '../../types';

export const AdditionalOptionsView: React.FC = () => {
  const {
    database,
    handleRestoreBackup,
    handleMergeBackup,
    handleImportExcel,
    exportDatabaseJson,
    setCurrentView,
  } = useApp();
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'backup' | 'excel'>('backup');

  // Estados para copia de seguridad detectada en el sistema (/assets/aistudio/backup_4a67c8d3.txt)
  const [detectedBackup, setDetectedBackup] = useState<AppDatabase | null>(null);
  const [isLoadingDetected, setIsLoadingDetected] = useState(false);

  // Estados para archivo subido manualmente (.txt / .json)
  const [uploadedBackup, setUploadedBackup] = useState<{
    fileName: string;
    data: Partial<AppDatabase>;
  } | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<{
    isOpen: boolean;
    data: Partial<AppDatabase>;
    sourceName: string;
    mode: 'restore' | 'merge';
  }>({
    isOpen: false,
    data: {},
    sourceName: '',
    mode: 'restore',
  });

  // Estados para importación de Excel
  const [excelFile, setExcelFile] = useState<{
    fileName: string;
    rows: ExcelImportRow[];
    rawCount: number;
  } | null>(null);
  const [excelCollectorId, setExcelCollectorId] = useState<string>('');
  const [excelError, setExcelError] = useState<string | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelSuccessResult, setExcelSuccessResult] = useState<{
    importedCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Intentar cargar la copia de seguridad adjunta por el usuario al montar
  useEffect(() => {
    let isMounted = true;
    async function checkDetectedBackup() {
      setIsLoadingDetected(true);
      try {
        const response = await fetch('/assets/aistudio/backup_4a67c8d3.txt');
        if (response.ok) {
          const text = await response.text();
          const parsed = JSON.parse(text) as AppDatabase;
          if (parsed && Array.isArray(parsed.clients) && isMounted) {
            setDetectedBackup(parsed);
          }
        }
      } catch {
        // No problem if file is not directly found
      } finally {
        if (isMounted) setIsLoadingDetected(false);
      }
    }
    checkDetectedBackup();
    return () => {
      isMounted = false;
    };
  }, []);

  // Set default collector for Excel import
  useEffect(() => {
    const collectors = database.users.filter(u => u.role === 'collector');
    if (collectors.length > 0 && !excelCollectorId) {
      setExcelCollectorId(collectors[0].id);
    }
  }, [database.users, excelCollectorId]);

  // Manejador de subida de archivo .txt / .json
  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupError(null);
    setBackupSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || (typeof parsed !== 'object')) {
          throw new Error('El archivo no contiene un formato JSON válido.');
        }

        const hasClients = Array.isArray(parsed.clients);
        const hasCredits = Array.isArray(parsed.credits);
        const hasUsers = Array.isArray(parsed.users);

        if (!hasClients && !hasCredits && !hasUsers) {
          throw new Error('El archivo no parece ser un respaldo de FINANCIERA AARON (faltan clientes o créditos).');
        }

        setUploadedBackup({
          fileName: file.name,
          data: parsed,
        });
      } catch (err: any) {
        setBackupError(`Error al leer el archivo: ${err?.message || 'Formato inválido'}`);
        setUploadedBackup(null);
      }
    };

    reader.onerror = () => {
      setBackupError('No se pudo leer el archivo seleccionado.');
      setUploadedBackup(null);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Ejecutar restablecimiento (Sobrescribir base de datos)
  const executeRestore = async (data: Partial<AppDatabase>, sourceName: string) => {
    setIsProcessingBackup(true);
    setBackupError(null);
    setBackupSuccessMessage(null);

    try {
      await handleRestoreBackup(data, sourceName);
      setBackupSuccessMessage(`✅ ¡Información restablecida exitosamente desde "${sourceName}"! Se cargaron ${data.clients?.length || 0} clientes, ${data.credits?.length || 0} créditos y ${data.payments?.length || 0} pagos oficiales.`);
      setConfirmRestoreModal({ isOpen: false, data: {}, sourceName: '', mode: 'restore' });
    } catch (err: any) {
      setBackupError(`Error al restablecer la información: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // Ejecutar recopilación / fusión (Agregar sin borrar lo actual)
  const executeMerge = async (data: Partial<AppDatabase>, sourceName: string) => {
    setIsProcessingBackup(true);
    setBackupError(null);
    setBackupSuccessMessage(null);

    try {
      const summary = await handleMergeBackup(data, sourceName);
      setBackupSuccessMessage(`✅ ¡Información recopilada y fusionada con éxito! Se integraron +${summary.addedClients} clientes nuevos, +${summary.addedCredits} créditos y +${summary.addedPayments} pagos sin afectar los registros existentes.`);
      setConfirmRestoreModal({ isOpen: false, data: {}, sourceName: '', mode: 'merge' });
    } catch (err: any) {
      setBackupError(`Error al fusionar la información: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // Manejador de subida de archivo Excel (.xlsx / .xls / .csv)
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelError(null);
    setExcelSuccessResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('El archivo Excel no contiene ninguna hoja.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          throw new Error('La primera hoja del archivo Excel está vacía.');
        }

        // Mapeo inteligente de columnas
        const mappedRows: ExcelImportRow[] = [];

        rawJson.forEach((row) => {
          // Normalizar llaves a minúsculas sin acentos
          const keys = Object.keys(row);
          const findValue = (...patterns: string[]): any => {
            for (const key of keys) {
              const cleanKey = key.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              for (const pat of patterns) {
                if (cleanKey.includes(pat)) {
                  return row[key];
                }
              }
            }
            return '';
          };

          const fullName = String(findValue('nombre', 'cliente', 'fullname') || '').trim();
          if (!fullName) return; // Ignorar filas sin nombre

          const dui = String(findValue('dui', 'identidad', 'cedula', 'documento') || '').trim();
          const phone = String(findValue('telefono', 'tel', 'celular', 'phone') || '').trim();
          const address = String(findValue('direccion', 'direccion', 'address', 'colonia', 'lugar') || '').trim();
          const personalReferences = String(findValue('referencia', 'fiador', 'conyuge') || '').trim();
          const notes = String(findValue('nota', 'observacion', 'comentario') || '').trim();

          // Datos de préstamo si existen
          const principalVal = findValue('monto', 'capital', 'prestamo', 'credito', 'cantidad');
          const principal = principalVal ? parseFloat(String(principalVal).replace(/[^0-9.]/g, '')) : undefined;

          const interestVal = findValue('tasa', 'interes', 'porcentaje', 'rate');
          const interestRate = interestVal ? parseFloat(String(interestVal).replace(/[^0-9.]/g, '')) : 20;

          const modalityVal = String(findValue('modalidad', 'frecuencia', 'periodo') || '').toLowerCase();
          let modality: PaymentModality = 'semanal';
          if (modalityVal.includes('diar')) modality = 'diario';
          else if (modalityVal.includes('quin')) modality = 'quincenal';
          else if (modalityVal.includes('mens')) modality = 'mensual';

          const installmentsVal = findValue('cuotas', 'plazo', 'semanas', 'dias', 'numero cuotas');
          const totalInstallments = installmentsVal ? parseInt(String(installmentsVal).replace(/[^0-9]/g, ''), 10) : (modality === 'diario' ? 24 : 16);

          const cuotaVal = findValue('cuota', 'valor cuota', 'pago');
          const installmentAmount = cuotaVal ? parseFloat(String(cuotaVal).replace(/[^0-9.]/g, '')) : undefined;

          const collectorName = String(findValue('cobrador', 'ruta', 'asignado') || '').trim();
          const startDate = String(findValue('fecha', 'inicio') || '').trim() || getElSalvadorDate();

          mappedRows.push({
            fullName,
            dui,
            phone,
            address,
            personalReferences,
            notes,
            principal: principal && !isNaN(principal) ? principal : undefined,
            interestRate: interestRate && !isNaN(interestRate) ? interestRate : 20,
            modality,
            totalInstallments: totalInstallments && !isNaN(totalInstallments) ? totalInstallments : 16,
            installmentAmount: installmentAmount && !isNaN(installmentAmount) ? installmentAmount : undefined,
            startDate,
            firstDueDate: startDate,
            collectorName,
          });
        });

        if (mappedRows.length === 0) {
          throw new Error('No se detectaron filas válidas con la columna de Nombre o Cliente en la hoja.');
        }

        setExcelFile({
          fileName: file.name,
          rows: mappedRows,
          rawCount: rawJson.length,
        });
      } catch (err: any) {
        setExcelError(`Error al procesar el archivo Excel: ${err?.message || 'Formato no soportado'}`);
        setExcelFile(null);
      }
    };

    reader.onerror = () => {
      setExcelError('Error al leer el archivo Excel.');
      setExcelFile(null);
    };

    reader.readAsArrayBuffer(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  // Descargar plantilla modelo de Excel (.xlsx)
  const handleDownloadExcelTemplate = () => {
    const templateRows = [
      {
        'Nombre Completo': 'Morelia Guadalupe López Iraheta',
        'DUI (00000000-0)': '05032643-0',
        'Telefono': '7260-6177',
        'Direccion': 'Berlín, frente al parque municipal',
        'Referencias': 'Venta de ropa mercado',
        'Monto Capital ($)': 600,
        'Tasa Interes (%)': 20,
        'Modalidad (diario/semanal/quincenal)': 'semanal',
        'Numero de Cuotas': 12,
        'Cuota Fija ($)': 61.11,
        'Cobrador Asignado': 'Aaron Mejia (RUTA Semanales)',
        'Notas': 'Cliente puntual',
      },
      {
        'Nombre Completo': 'Rosario del Carmen Palacio de Díaz',
        'DUI (00000000-0)': '04190514-6',
        'Telefono': '7460-9994',
        'Direccion': 'Mercado de Mercedes Umaña',
        'Referencias': 'Puesto #14',
        'Monto Capital ($)': 300,
        'Tasa Interes (%)': 20,
        'Modalidad (diario/semanal/quincenal)': 'semanal',
        'Numero de Cuotas': 12,
        'Cuota Fija ($)': 32.81,
        'Cobrador Asignado': 'Aaron Mejia (RUTA Semanales)',
        'Notas': 'Préstamo para mercadería',
      },
      {
        'Nombre Completo': 'Mauricio Leónel Quinteros',
        'DUI (00000000-0)': '02818982-8',
        'Telefono': '7208-8556',
        'Direccion': 'Desvío Estanzuela frente a cancha El Tigre',
        'Referencias': 'Taller mecánico',
        'Monto Capital ($)': 500,
        'Tasa Interes (%)': 34.2,
        'Modalidad (diario/semanal/quincenal)': 'diario',
        'Numero de Cuotas': 90,
        'Cuota Fija ($)': 7.45,
        'Cobrador Asignado': 'Aaron Mejia (RUTA Semanales)',
        'Notas': 'Cobro diario de lunes a sábado',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);

    // Configurar ancho de columnas
    worksheet['!cols'] = [
      { wch: 36 }, // Nombre
      { wch: 18 }, // DUI
      { wch: 15 }, // Tel
      { wch: 35 }, // Dirección
      { wch: 22 }, // Referencias
      { wch: 18 }, // Capital
      { wch: 18 }, // Tasa
      { wch: 25 }, // Modalidad
      { wch: 18 }, // Cuotas
      { wch: 16 }, // Cuota Fija
      { wch: 30 }, // Cobrador
      { wch: 25 }, // Notas
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PlantillaClientesCreditos');
    XLSX.writeFile(workbook, 'Plantilla_Importacion_Financiera_Aaron.xlsx');
  };

  // Confirmar e importar datos desde el Excel cargado
  const executeImportExcel = async () => {
    if (!excelFile || excelFile.rows.length === 0) return;

    setIsImportingExcel(true);
    setExcelError(null);
    setExcelSuccessResult(null);

    try {
      const result = await handleImportExcel(excelFile.rows, excelCollectorId);
      setExcelSuccessResult(result);
      setExcelFile(null);
    } catch (err: any) {
      setExcelError(`Error al integrar el archivo Excel: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsImportingExcel(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Layers className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Opciones Adicionales
                </h1>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-400/30">
                  Nuevo Menú
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Subir archivos de respaldo (.txt/.json) para recopilar y restablecer datos, o integrar hojas de cálculo Excel (.xlsx).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportDatabaseJson}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm hover:text-white"
              title="Descargar copia de seguridad de toda la base de datos actual"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Descargar Respaldo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Restablecer y Recopilar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition ${
            activeTab === 'excel'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Subir Archivos Excel</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: RESTABLECER Y RECOPILAR INFORMACIÓN (BACKUP FILES)  */}
      {/* ============================================================== */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Mensajes de éxito / error generales */}
          {backupSuccessMessage && (
            <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">{backupSuccessMessage}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('clients')}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition"
                  >
                    Ver Clientes Ahora →
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('daily-collections')}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
                  >
                    Ver Cobros del Día
                  </button>
                </div>
              </div>
            </div>
          )}

          {backupError && (
            <div className="p-4 bg-rose-950/70 border border-rose-500/40 rounded-2xl text-rose-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Error de procesamiento</p>
                <p className="mt-0.5">{backupError}</p>
              </div>
            </div>
          )}

          {/* 1. ARCHIVO DETECTADO EN EL PROYECTO (backup_4a67c8d3.txt) */}
          {detectedBackup && (
            <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-2 border-blue-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
                    <FileCheck className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">
                        Copia de Seguridad Lista Detectada
                      </h2>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold rounded-full border border-blue-400/30">
                        backup_4a67c8d3.txt
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Detectamos el archivo que enviaste con los registros reales de FINANCIERA AARON:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        {detectedBackup.clients?.length || 0} Clientes Reales
                      </span>
                      <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        {detectedBackup.credits?.length || 0} Créditos Activos (Vigentes)
                      </span>
                      <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-amber-400" />
                        {detectedBackup.payments?.length || 0} Pagos y Recibos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmRestoreModal({
                        isOpen: true,
                        data: detectedBackup,
                        sourceName: 'backup_4a67c8d3.txt',
                        mode: 'restore',
                      })
                    }
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Restablecer Ahora</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConfirmRestoreModal({
                        isOpen: true,
                        data: detectedBackup,
                        sourceName: 'backup_4a67c8d3.txt',
                        mode: 'merge',
                      })
                    }
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
                  >
                    <FolderArchive className="w-4 h-4 text-indigo-400" />
                    <span>Recopilar y Fusionar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. ZONA DE SUBIDA MANUAL DE CUALQUIER ARCHIVO .TXT / .JSON */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <span>Subir Otro Archivo de Respaldo (.txt / .json)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Selecciona cualquier archivo exportado desde tu teléfono Android, tablet o computadora para recopilar clientes o restablecer todo el sistema financiero.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/70 bg-slate-950/60 hover:bg-indigo-950/10 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">
                Toca aquí para seleccionar tu archivo de respaldo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Formatos permitidos: <span className="text-indigo-300 font-mono font-semibold">.txt</span> o <span className="text-indigo-300 font-mono font-semibold">.json</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json"
                onChange={handleBackupFileUpload}
                className="hidden"
              />
            </div>

            {/* Vista previa del archivo subido manualmente */}
            {uploadedBackup && (
              <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{uploadedBackup.fileName}</p>
                      <p className="text-[11px] text-slate-400">Archivo analizado correctamente y listo para procesar</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedBackup(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs font-bold px-2 py-1"
                  >
                    Quitar
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Clientes</p>
                    <p className="text-base font-black text-white">{uploadedBackup.data.clients?.length || 0}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Créditos Activos (Vigentes)</p>
                    <p className="text-base font-black text-emerald-400">{uploadedBackup.data.credits?.length || 0}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Pagos</p>
                    <p className="text-base font-black text-blue-400">{uploadedBackup.data.payments?.length || 0}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Cuotas</p>
                    <p className="text-base font-black text-amber-400">{uploadedBackup.data.installments?.length || 0}</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmRestoreModal({
                        isOpen: true,
                        data: uploadedBackup.data,
                        sourceName: uploadedBackup.fileName,
                        mode: 'merge',
                      })
                    }
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
                  >
                    <FolderArchive className="w-4 h-4 text-indigo-400" />
                    <span>Recopilar y Fusionar (Seguro)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConfirmRestoreModal({
                        isOpen: true,
                        data: uploadedBackup.data,
                        sourceName: uploadedBackup.fileName,
                        mode: 'restore',
                      })
                    }
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Restablecer Sistema Completo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: SUBIR ARCHIVOS EXCEL (.XLSX / .XLS / .CSV)          */}
      {/* ============================================================== */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          {/* Notificación de resultado exitoso de importación Excel */}
          {excelSuccessResult && (
            <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white text-base">
                  ¡Importación completada con éxito!
                </p>
                <p className="mt-1">
                  Se integraron <span className="font-bold text-white">{excelSuccessResult.importedCount} clientes y créditos</span> al sistema financiero con sus cronogramas de cuotas y fechas calculadas.
                </p>
                {excelSuccessResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-amber-300 bg-amber-950/40 p-2 rounded-lg">
                    <p className="font-bold">Advertencias:</p>
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                      {excelSuccessResult.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('clients')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                  >
                    Ver Directorio de Clientes →
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('daily-collections')}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
                  >
                    Ver Cobros del Día
                  </button>
                </div>
              </div>
            </div>
          )}

          {excelError && (
            <div className="p-4 bg-rose-950/70 border border-rose-500/40 rounded-2xl text-rose-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Error con el archivo Excel</p>
                <p className="mt-0.5">{excelError}</p>
              </div>
            </div>
          )}

          {/* Tarjeta de descarga de plantilla y subida */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Plantilla Excel Oficial</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Descarga nuestro formato modelo para preparar tus listas de clientes, préstamos y cuotas con columnas pre-configuradas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition shadow"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Plantilla (.xlsx)</span>
              </button>
            </div>

            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Subir Hoja de Cálculo (.xlsx / .xls / .csv)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Carga tus archivos con nombres de clientes, DUI, teléfonos, montos prestados y modalidades. La app reconocerá automáticamente las columnas.
                </p>
              </div>

              <div
                onClick={() => excelInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-slate-950/60 hover:bg-emerald-950/10 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  Toca aquí para seleccionar tu archivo Excel
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Compatible con Microsoft Excel, Google Sheets y LibreOffice (.xlsx, .xls, .csv)
                </p>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Vista previa de filas detectadas en el Excel */}
          {excelFile && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{excelFile.fileName}</h3>
                    <p className="text-xs text-slate-400">
                      Se detectaron <span className="text-emerald-300 font-bold">{excelFile.rows.length} clientes válidos</span> para integrar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                      Asignar a cobrador:
                    </label>
                    <select
                      value={excelCollectorId}
                      onChange={(e) => setExcelCollectorId(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      {database.users
                        .filter((u) => u.role === 'collector')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExcelFile(null)}
                    className="text-slate-400 hover:text-white text-xs px-2 py-1 font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* Tabla de previsualización */}
              <div className="overflow-x-auto max-h-80 rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-bold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Nombre Completo</th>
                      <th className="p-3">DUI</th>
                      <th className="p-3">Teléfono</th>
                      <th className="p-3">Monto / Capital</th>
                      <th className="p-3">Modalidad</th>
                      <th className="p-3">Cuotas</th>
                      <th className="p-3">Dirección</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {excelFile.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">{row.fullName}</td>
                        <td className="p-3 font-mono text-slate-300">{row.dui || '—'}</td>
                        <td className="p-3 font-mono text-slate-300">{row.phone || '—'}</td>
                        <td className="p-3 font-semibold text-emerald-400">
                          {row.principal ? formatCurrency(row.principal) : 'Solo Cliente'}
                        </td>
                        <td className="p-3 uppercase text-[10px] font-bold tracking-wider">
                          <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/40">
                            {row.modality || 'semanal'}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{row.totalInstallments || '—'}</td>
                        <td className="p-3 text-slate-400 truncate max-w-xs">{row.address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-xs text-slate-400">
                  Al confirmar, se crearán los clientes, créditos automáticos y sus cronogramas de amortización.
                </p>

                <button
                  type="button"
                  disabled={isImportingExcel}
                  onClick={executeImportExcel}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isImportingExcel ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Integrando registros...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Integrar {excelFile.rows.length} Registros a la App</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE RESTABLECIMIENTO / FUSIÓN */}
      {confirmRestoreModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">
                  {confirmRestoreModal.mode === 'restore'
                    ? '¿Restablecer información del sistema?'
                    : '¿Recopilar y fusionar información?'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Origen: {confirmRestoreModal.sourceName}
                </p>
              </div>
            </div>

            <div className="text-slate-300 leading-relaxed space-y-2">
              {confirmRestoreModal.mode === 'restore' ? (
                <>
                  <p>
                    Esta acción reemplazará la base de datos actual con los{' '}
                    <strong className="text-white">
                      {confirmRestoreModal.data.clients?.length || 0} clientes
                    </strong>{' '}
                    y{' '}
                    <strong className="text-white">
                      {confirmRestoreModal.data.credits?.length || 0} créditos
                    </strong>{' '}
                    contenidos en el archivo.
                  </p>
                  <p className="p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl text-rose-300 text-[11px]">
                    ⚠️ Los datos de prueba actuales serán reemplazados por los datos reales de esta copia.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Se recopilarán e integrarán los clientes, créditos y pagos que no existan actualmente, preservando íntegramente los datos que ya tienes guardados.
                  </p>
                  <p className="p-2.5 bg-blue-950/40 border border-blue-800/40 rounded-xl text-blue-300 text-[11px]">
                    ℹ️ No se sobrescribirá información existente. Es un proceso 100% seguro.
                  </p>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isProcessingBackup}
                onClick={() => setConfirmRestoreModal({ isOpen: false, data: {}, sourceName: '', mode: 'restore' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessingBackup}
                onClick={() => {
                  if (confirmRestoreModal.mode === 'restore') {
                    executeRestore(confirmRestoreModal.data, confirmRestoreModal.sourceName);
                  } else {
                    executeMerge(confirmRestoreModal.data, confirmRestoreModal.sourceName);
                  }
                }}
                className={`px-5 py-2 text-white font-bold rounded-xl shadow transition flex items-center gap-2 ${
                  confirmRestoreModal.mode === 'restore'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isProcessingBackup && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {confirmRestoreModal.mode === 'restore'
                    ? 'Sí, Restablecer Información'
                    : 'Sí, Fusionar Datos'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
