/**
 * Robust Multi-Strategy Print Engine
 * Handles printing across standard browsers, sandboxed iframes, and mobile browsers.
 */

export function executePrintJob(elementId: string, documentTitle = 'Etiquetas_Pallets_NRI') {
  const contentElement = document.getElementById(elementId);
  if (!contentElement) {
    // Fallback directly to window.print()
    window.focus();
    window.print();
    return;
  }

  // 1. Gather all CSS styles from the current document
  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const printCss = `
    <style>
      @page {
        size: A4 portrait !important;
        margin: 0 !important;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        background-color: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        font-family: 'Plus Jakarta Sans', Arial, sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-controls-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #0f172a;
        color: #ffffff;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        font-family: sans-serif;
      }

      @media screen {
        body {
          background-color: #e2e8f0 !important;
          padding-top: 55px !important;
          padding-bottom: 40px !important;
        }
        .print-content-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 10px;
        }
        .a4-print-sheet-4, .a4-print-sheet-2, .a4-print-sheet-1 {
          background: #ffffff !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
        }
      }

      @media print {
        body {
          background-color: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .print-controls-bar, .no-print {
          display: none !important;
        }
        .print-content-wrapper {
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          display: block !important;
        }
      }

      /* EXACT A4 SHEET: 210mm x 297mm - ZERO OVERFLOW, ZERO BLANK PAGES */
      .a4-print-sheet-4 {
        width: 210mm !important;
        max-width: 210mm !important;
        height: 296mm !important;
        max-height: 296mm !important;
        min-height: 296mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        gap: 1.5mm !important;
        padding: 3mm 4mm !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }
      .a4-print-sheet-4:last-child, .a4-print-sheet-4:last-of-type {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .nri-label-card-4 {
        height: 68.5mm !important;
        max-height: 68.5mm !important;
        min-height: 66mm !important;
        flex: 1 1 0 !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        border: 2px solid #000000 !important;
        padding: 1.5mm 2mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        background: #ffffff !important;
      }

      .a4-print-sheet-2 {
        width: 210mm !important;
        max-width: 210mm !important;
        height: 296mm !important;
        max-height: 296mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        gap: 3mm !important;
        padding: 4mm 5mm !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }
      .a4-print-sheet-2:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .a4-print-sheet-1 {
        width: 210mm !important;
        max-width: 210mm !important;
        height: 296mm !important;
        max-height: 296mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        padding: 5mm !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }
      .a4-print-sheet-1:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    </style>
  `;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${documentTitle}</title>
      ${stylesHtml}
      ${printCss}
    </head>
    <body>
      <div class="print-controls-bar no-print">
        <div style="font-weight:bold; font-size:13px; display:flex; align-items:center; gap:8px;">
          <span>🖨️</span>
          <span>Sistema NRI Pau Brasil Guarabira — Folha de Impressão Oficial</span>
        </div>
        <div style="display:flex; gap:10px;">
          <button onclick="window.print()" style="background:#f59e0b; color:#000; font-weight:900; border:none; padding:7px 18px; border-radius:8px; cursor:pointer; font-size:13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            IMPRIMIR AGORA
          </button>
          <button onclick="window.close()" style="background:#334155; color:#fff; font-weight:bold; border:none; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:13px;">
            Fechar
          </button>
        </div>
      </div>
      <div class="print-content-wrapper">
        ${contentElement.innerHTML}
      </div>
      <script>
        // Auto-print upon load
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.focus();
            try {
              window.print();
            } catch(e) {
              console.warn('Auto print error', e);
            }
          }, 300);
        });
      </script>
    </body>
    </html>
  `;

  // Strategy 1: Try opening a popup window (bypasses iframe sandbox print modal restrictions)
  try {
    const printWindow = window.open('', '_blank', 'width=1000,height=900,scrollbars=yes,resizable=yes');
    if (printWindow && !printWindow.closed) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn('Popup window printing blocked, falling back to hidden iframe:', err);
  }

  // Strategy 2: Hidden iframe printing
  try {
    let printIframe = document.getElementById('nri-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'nri-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        if (printIframe.contentWindow) {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        }
      }, 500);
      return;
    }
  } catch (err) {
    console.warn('Iframe print failed, calling window.print directly:', err);
  }

  // Strategy 3: Standard window.print()
  window.focus();
  window.print();
}
