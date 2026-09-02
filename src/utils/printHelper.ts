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
        margin: 4mm 4mm !important;
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
      }
      .a4-print-sheet-4 {
        width: 100% !important;
        max-width: 202mm !important;
        height: 280mm !important;
        max-height: 280mm !important;
        min-height: 280mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: grid !important;
        grid-template-columns: 1fr !important;
        grid-template-rows: repeat(4, 68mm) !important;
        gap: 1.5mm !important;
        padding: 0 !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      .a4-print-sheet-4 > div {
        height: 68mm !important;
        max-height: 68mm !important;
        min-height: 68mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .a4-print-sheet-4:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .print-controls-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #1e293b;
        color: #ffffff;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 999999;
        font-family: sans-serif;
      }
      @media print {
        .print-controls-bar, .no-print {
          display: none !important;
        }
        .print-content-wrapper {
          padding-top: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
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
    <body style="background:#ffffff; margin:0; padding:0;">
      <div class="print-controls-bar no-print">
        <div style="font-weight:bold; font-size:14px;">
          🖨️ Sistema NRI - Folha de Impressão de Etiquetas (4 por Folha A4)
        </div>
        <div style="display:flex; gap:10px;">
          <button onclick="window.print()" style="background:#f59e0b; color:#000; font-weight:900; border:none; padding:8px 18px; border-radius:8px; cursor:pointer; font-size:13px;">
            CLIQUE PARA IMPRIMIR AGORA
          </button>
          <button onclick="window.close()" style="background:#475569; color:#fff; font-weight:bold; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:13px;">
            Fechar Janela
          </button>
        </div>
      </div>
      <div style="padding-top: 50px;" class="print-content-wrapper">
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
