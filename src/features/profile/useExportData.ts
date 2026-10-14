import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { prettyLabel } from '@/features/add/categories';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useFeedback } from '@/features/shared/useFeedback';
import { buildExportCsv } from './exportCsv';

/**
 * Should 4 · exportar mis datos: arma el CSV, lo escribe en la caché y abre
 * la hoja de compartir del teléfono (guardar en Archivos, mandarlo por mail).
 * El archivo no sale de la app sin que el usuario elija a dónde.
 */
export function useExportData() {
  const { facts, today } = usePersonalFacts();
  const feedback = useFeedback();
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      if (!(await isAvailableAsync())) {
        feedback.error('Este teléfono no permite compartir archivos');
        return;
      }
      const file = new File(Paths.cache, `radar-mis-datos-${today}.csv`);
      file.create({ overwrite: true });
      file.write(buildExportCsv(facts, { categoryLabel: prettyLabel }));
      await shareAsync(file.uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: 'Exportar mis datos',
      });
    } catch (cause) {
      feedback.error('No pudimos exportar tus datos', cause);
    } finally {
      setExporting(false);
    }
  }

  return { exportData, exporting };
}
