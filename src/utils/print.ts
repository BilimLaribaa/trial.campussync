export const printContent = (content: string | HTMLElement): Promise<void> => 
  new Promise((resolve) => {
    // Create a temporary div to hold the print content
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '0';
    printContainer.style.top = '0';
    printContainer.style.width = '0';
    printContainer.style.height = '0';
    printContainer.style.overflow = 'hidden';
    
    // Add the content to print
    if (typeof content === 'string') {
      printContainer.innerHTML = content;
    } else {
      printContainer.appendChild(content.cloneNode(true));
    }

    // Add print-specific styles
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-content, .print-content * {
          visibility: visible;
        }
        .print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    printContainer.appendChild(style);

    // Add to DOM temporarily
    document.body.appendChild(printContainer);

    // Print and clean up
    setTimeout(() => {
      window.print();
      document.body.removeChild(printContainer);
      resolve();
    }, 100);
  });